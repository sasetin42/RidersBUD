/**
 * secureHitpaySecrets.ts — Migrate HitPay credentials out of the public
 * settings/main document into the admin-only settings/hitpaySecrets document.
 *
 * WHY: firestore.rules makes settings/** publicly readable. The HitPay live
 * API key and salts currently sit in settings/main where anyone with the
 * project ID can read them. This script:
 *   1. Signs in with an ADMIN account (client SDK, same as recomputeMechanicEarnings)
 *   2. Copies the 4 credential fields from settings/main -> settings/hitpaySecrets
 *   3. Deletes the public fields from settings/main
 *
 * DRY RUN (default — shows what would change, writes nothing):
 *   RIDERSBUD_ADMIN_EMAIL=you@example.com RIDERSBUD_ADMIN_PASSWORD=... npx tsx scripts/secureHitpaySecrets.ts
 *
 * APPLY (performs the migration):
 *   RIDERSBUD_ADMIN_EMAIL=you@example.com RIDERSBUD_ADMIN_PASSWORD=... npx tsx scripts/secureHitpaySecrets.ts --apply
 *
 * The Cloud Functions read env vars first (functions/.env), then
 * settings/hitpaySecrets, then legacy settings/main — so payments keep
 * working throughout and after the migration.
 */
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import * as readline from 'readline';

const APPLY = process.argv.includes('--apply');

const firebaseConfig = {
    apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || 'AIzaSyD_ot0rEnYcP0l4fseVinRPFuUFuHYFn3A',
    authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || 'ridersbud-10806.firebaseapp.com',
    projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || 'ridersbud-10806',
    storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || 'ridersbud-10806.firebasestorage.app',
    messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '492813766406',
    appId: import.meta.env?.VITE_FIREBASE_APP_ID || '1:492813766406:web:c35e8974032a01fb8f9887',
};

const SECRET_FIELDS = [
    'hitpayApiKey',
    'hitpaySalt',
    'hitpaySandboxApiKey',
    'hitpaySandboxSalt',
] as const;

const mask = (v: string | undefined): string =>
    v ? `${String(v).slice(0, 8)}…(${String(v).length} chars)` : '(wala)';

async function main(): Promise<void> {
    const email = process.env.RIDERSBUD_ADMIN_EMAIL;
    const password = process.env.RIDERSBUD_ADMIN_PASSWORD;

    if (!email || !password) {
        console.error('\n❌ Kulang ang credentials.');
        console.error('   Gamitin: RIDERSBUD_ADMIN_EMAIL=... RIDERSBUD_ADMIN_PASSWORD=... npx tsx scripts/secureHitpaySecrets.ts');
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

    // Read current state
    const mainSnap = await getDoc(doc(fs, 'settings', 'main'));
    const secretsSnap = await getDoc(doc(fs, 'settings', 'hitpaySecrets'));

    const mainData = (mainSnap.exists() ? mainSnap.data() : {}) as Record<string, any>;
    const secretsData = (secretsSnap.exists() ? secretsSnap.data() : {}) as Record<string, any>;

    console.log('══════════════════════════════════════════════════');
    console.log(APPLY ? '  APPLY MODE — mangyayari ang migration' : '  DRY RUN — walang isusulat (--apply para tumuloy)');
    console.log('══════════════════════════════════════════════════\n');

    const toCopy: Record<string, string> = {};
    const toDelete: string[] = [];

    for (const field of SECRET_FIELDS) {
        const inMain = mainData[field];
        const inSecrets = secretsData[field];
        if (inMain && typeof inMain === 'string') {
            toCopy[field] = inMain;
            toDelete.push(field);
            const same = inSecrets === inMain;
            console.log(`  ${field}:`);
            console.log(`    settings/main        : ${mask(inMain)} ${same ? '(same na sa secrets)' : '→ ililipat'}`);
            console.log(`    settings/hitpaySecrets: ${inSecrets ? mask(inSecrets) : '(wala)'} ${same ? '' : '→ icocopyhan'}`);
        } else if (inSecrets) {
            console.log(`  ${field}: ✅ nasa hitpaySecrets na (${mask(inSecrets)})`);
        } else {
            console.log(`  ${field}: ⚠️ wala sa dalawang dok — hindi apektado`);
        }
    }

    if (Object.keys(toCopy).length === 0 && toDelete.length === 0) {
        console.log('\n✅ Walang dapat gawin — lahat ng secrets ay nasa settings/hitpaySecrets na at wala nang public.');
        console.log('   Pwede mo nang i-deploy ang mas mahigpit na rules: firebase deploy --only firestore:rules\n');
        process.exit(0);
    }

    if (!APPLY) {
        console.log('\n💡 Dry run lang ito. Para i-perform ang migration:');
        console.log('   RIDERSBUD_ADMIN_EMAIL=... RIDERSBUD_ADMIN_PASSWORD=... npx tsx scripts/secureHitpaySecrets.ts --apply\n');
        process.exit(0);
    }

    // Confirm
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>(res => rl.question('\nItuloy ang migration? (type YES): ', res));
    rl.close();
    if (answer.trim() !== 'YES') {
        console.log('❌ Kinansela.');
        process.exit(0);
    }

    // 1. Copy to secrets doc
    await setDoc(doc(fs, 'settings', 'hitpaySecrets'), toCopy, { merge: true });
    console.log(`\n✅ Na-copy ang ${Object.keys(toCopy).length} fields papunta sa settings/hitpaySecrets.`);

    // 2. Verify
    const verifySnap = await getDoc(doc(fs, 'settings', 'hitpaySecrets'));
    const verifyData = (verifySnap.data() || {}) as Record<string, any>;
    const missing = toDelete.filter(f => !verifyData[f]);
    if (missing.length) {
        console.error(`❌ VERIFY FAILED — hindi nabasa ang mga fields: ${missing.join(', ')}. HINDI magpapatuloy sa pag-delete.`);
        process.exit(1);
    }
    console.log('✅ Na-verify ang secrets doc.');

    // 3. Delete public fields from settings/main
    const updates: Record<string, any> = {};
    for (const f of toDelete) updates[f] = '';
    await updateDoc(doc(fs, 'settings', 'main'), updates);
    console.log(`✅ Binura ang ${toDelete.length} public fields mula sa settings/main (set to empty).`);

    console.log('\n🎉 Tapos! Ang mga HitPay credentials ay secured na:');
    console.log('   • settings/hitpaySecrets — admin-only read (firestore.rules)');
    console.log('   • functions/.env — primary source sa Cloud Functions');
    console.log('   • settings/main — wala na ang keys (public read ok na)');
    console.log('\n💡 Sunod: i-deploy ang rules para ma-lock: firebase deploy --only firestore:rules\n');
    process.exit(0);
}

main().catch(e => {
    console.error('❌ Error:', e?.message || e);
    process.exit(1);
});
