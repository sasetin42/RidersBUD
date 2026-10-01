/**
 * recomputeMechanicEarnings.ts — Backfill & recompute mechanic earnings at the
 * corrected 70/30 commission split (70% mechanic / 30% platform).
 *
 * DRY RUN (default — shows what would change, writes nothing):
 *   RIDERSBUD_ADMIN_EMAIL=you@example.com RIDERSBUD_ADMIN_PASSWORD=... npx tsx scripts/recomputeMechanicEarnings.ts
 *
 * APPLY (writes corrections):
 *   ... npx tsx scripts/recomputeMechanicEarnings.ts --apply
 *
 * Optional: --fee 30 (override commission %, default reads settings/main)
 *
 * What it does per mechanic:
 *   1. Recomputes gross completed-job revenue and the 70% net share
 *   2. Backfills earningsReleased flags on completed bookings (prevents future double-credits)
 *   3. totalEarnings = expected net lifetime earnings
 *   4. walletBalance = net earnings − (paid + approved + pending payouts)
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
    getFirestore,
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    updateDoc,
    writeBatch,
} from 'firebase/firestore';

const APPLY = process.argv.includes('--apply');
const feeIdx = process.argv.indexOf('--fee');
const FEE_OVERRIDE = feeIdx !== -1 && process.argv[feeIdx + 1] ? Number(process.argv[feeIdx + 1]) : null;

const firebaseConfig = {
    apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || 'AIzaSyD_ot0rEnYcP0l4fseVinRPFuUFuHYFn3A',
    authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || 'ridersbud-10806.firebaseapp.com',
    projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || 'ridersbud-10806',
    storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || 'ridersbud-10806.firebasestorage.app',
    messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '492813766406',
    appId: import.meta.env?.VITE_FIREBASE_APP_ID || '1:492813766406:web:c35e8974032a01fb8f9887',
};

/** Mirror of utils/mechanicLedger getJobTotalAmount */
const getJobTotalAmount = (job: any): number => {
    if (!job) return 0;
    if (job.totalAmount != null && Number(job.totalAmount) > 0) return Number(job.totalAmount);
    if (job.price != null && Number(job.price) > 0) return Number(job.price);
    const svcs = job.services && job.services.length > 0 ? job.services : (job.service ? [job.service] : []);
    const svcsSum = svcs.reduce((s: number, svc: any) => s + (Number(svc.price) || 0), 0);
    const addCosts = (job.additionalCosts || []).reduce((s: number, c: any) => s + (Number(c.price) || 0), 0);
    return svcsSum + addCosts + (Number(job.laborFee) || 0);
};

async function main(): Promise<void> {
    const email = process.env.RIDERSBUD_ADMIN_EMAIL;
    const password = process.env.RIDERSBUD_ADMIN_PASSWORD;

    if (!email || !password) {
        console.error('\n❌ Kulang ang credentials.');
        console.error('   RIDERSBUD_ADMIN_EMAIL=... RIDERSBUD_ADMIN_PASSWORD=... npx tsx scripts/recomputeMechanicEarnings.ts');
        process.exit(1);
    }

    console.log(`\n🔐 Signing in as admin: ${email}`);
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const fs = getFirestore(app);

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
        console.error('❌ Admin sign-in failed:', e?.code || e?.message);
        process.exit(1);
    }
    console.log('✅ Signed in.\n');

    // Commission from settings/main (public read)
    const settingsSnap = await getDoc(doc(fs, 'settings', 'main'));
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};
    const feePct = FEE_OVERRIDE ?? (typeof settings.serviceFeePercentage === 'number' ? settings.serviceFeePercentage : 30);
    console.log(`💰 Commission: platform ${feePct}% / mechanic ${100 - feePct}%`);
    console.log(`🧪 Mode: ${APPLY ? 'APPLY (susulatin ang corrections)' : 'DRY RUN (walang isusulat)'}\n`);

    // Load all mechanics + payouts + completed bookings
    const mechanicsSnap = await getDocs(collection(fs, 'mechanics'));
    const payoutsSnap = await getDocs(collection(fs, 'payouts'));
    const payouts = payoutsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    console.log(`👥 ${mechanicsSnap.size} mechanics, ${payouts.length} payout records\n`);

    let totalDeltaWallet = 0;
    let changedCount = 0;

    for (const mechDoc of mechanicsSnap.docs) {
        const mech = { id: mechDoc.id, ...(mechDoc.data() as any) };

        // Completed, paid jobs for this mechanic
        const jobsQ = query(
            collection(fs, 'bookings'),
            where('mechanicId', '==', mech.id),
            where('status', '==', 'Completed')
        );
        const jobsSnap = await getDocs(jobsQ);
        const jobs = jobsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        const paidJobs = jobs.filter(j => j.isPaid !== false && j.paymentStatus !== 'failed');

        const gross = paidJobs.reduce((s, j) => s + getJobTotalAmount(j), 0);
        const expectedNet = paidJobs.reduce((s, j) => s + Math.max(0, Math.round(getJobTotalAmount(j) * (1 - feePct / 100))), 0);

        const myPayouts = payouts.filter(p => p.mechanicId === mech.id);
        const paidOut = myPayouts.filter(p => p.status === 'Paid' || p.status === 'Completed').reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const approved = myPayouts.filter(p => p.status === 'Approved').reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const pending = myPayouts.filter(p => p.status === 'Pending').reduce((s, p) => s + (Number(p.amount) || 0), 0);

        const targetWallet = Math.max(0, expectedNet - paidOut - approved - pending);
        const curWallet = Number(mech.walletBalance || 0);
        const curTotal = Number(mech.totalEarnings || 0);
        const dWallet = targetWallet - curWallet;
        const dTotal = expectedNet - curTotal;

        const needsFix = Math.abs(dWallet) > 0.5 || Math.abs(dTotal) > 0.5;
        const unreleased = paidJobs.filter(j => !j.earningsReleased);

        console.log(`— ${mech.name || mech.id} (${paidJobs.length} completed jobs)`);
        console.log(`   gross ₱${gross.toLocaleString()} → expected net (70%) ₱${expectedNet.toLocaleString()}`);
        console.log(`   wallet: ₱${curWallet.toLocaleString()} → ₱${targetWallet.toLocaleString()} (Δ ${dWallet >= 0 ? '+' : ''}${dWallet.toLocaleString()})`);
        console.log(`   totalEarnings: ₱${curTotal.toLocaleString()} → ₱${expectedNet.toLocaleString()} (Δ ${dTotal >= 0 ? '+' : ''}${dTotal.toLocaleString()})`);
        if (unreleased.length) console.log(`   ⚠️ ${unreleased.length} completed jobs missing earningsReleased flag`);
        if (!needsFix && unreleased.length === 0) console.log('   ✅ ok\n');

        if (needsFix) {
            changedCount++;
            totalDeltaWallet += dWallet;
        }

        if (APPLY && (needsFix || unreleased.length > 0)) {
            // Backfill earningsReleased flags (batch)
            for (let i = 0; i < unreleased.length; i += 450) {
                const batch = writeBatch(fs);
                for (const j of unreleased.slice(i, i + 450)) {
                    batch.update(doc(fs, 'bookings', j.id), {
                        earningsReleased: true,
                        earningsReleasedAt: new Date().toISOString(),
                        earningsAmount: Math.max(0, Math.round(getJobTotalAmount(j) * (1 - feePct / 100)))
                    });
                }
                await batch.commit();
            }
            // Mechanic balances
            await updateDoc(doc(fs, 'mechanics', mech.id), {
                walletBalance: targetWallet,
                totalEarnings: expectedNet,
                lockedBalance: approved,
                earningsRecomputedAt: new Date().toISOString()
            });
            console.log('   ✍️ written');
        }
    }

    console.log('\n══════════════════════════════════════════');
    console.log(`Mechanics needing correction: ${changedCount}`);
    console.log(`Net wallet delta: ${totalDeltaWallet >= 0 ? '+' : ''}₱${totalDeltaWallet.toLocaleString()}`);
    if (!APPLY) {
        console.log('\n💡 DRY RUN lang ito — walang binago.');
        console.log('   Para i-apply: ulitin with --apply');
    } else {
        console.log('\n🎉 Apply tapos. I-verify sa Admin → Mechanics at Payment Audit screen.');
    }
    console.log('');
    process.exit(0);
}

main().catch(e => {
    console.error('❌ Error:', e?.message || e);
    process.exit(1);
});
