import { Booking, Mechanic, PayoutRequest } from '../types';

/**
 * Standardize job total amount computation across all mechanic screens and services.
 */
export const getJobTotalAmount = (job: any): number => {
    if (!job) return 0;
    if (job.totalAmount != null && Number(job.totalAmount) > 0) return Number(job.totalAmount);
    if (job.price != null && Number(job.price) > 0) return Number(job.price);
    const svcs = job.services && job.services.length > 0 ? job.services : (job.service ? [job.service] : []);
    const svcsSum = svcs.reduce((s: number, svc: any) => s + (Number(svc.price) || 0), 0);
    const addCosts = (job.additionalCosts || []).reduce((s: number, c: any) => s + (Number(c.price) || 0), 0);
    return svcsSum + addCosts + (Number(job.laborFee) || 0);
};

export interface MechanicWalletLedger {
    lifetimeEarnings: number;
    availableBalance: number;
    lockedBalance: number;
    pendingPayoutsTotal: number;
    approvedPayoutsTotal: number;
    paidPayoutsTotal: number;
    completedJobsCount: number;
}

/**
 * Compute the single authoritative real-time ledger wallet balances for a mechanic.
 * Synchronizes Dashboard, Earnings, Profile, and Admin views.
 */
export const calculateMechanicWalletLedger = (
    mechanicId: string,
    mechanic: Partial<Mechanic> | null | undefined,
    bookings: Booking[] = [],
    payouts: PayoutRequest[] = []
): MechanicWalletLedger => {
    if (!mechanicId) {
        return {
            lifetimeEarnings: 0,
            availableBalance: 0,
            lockedBalance: 0,
            pendingPayoutsTotal: 0,
            approvedPayoutsTotal: 0,
            paidPayoutsTotal: 0,
            completedJobsCount: 0
        };
    }

    // 1. Gather all completed bookings for this mechanic/driver
    const completedJobs = bookings.filter(b => {
        const isMatch = (b.mechanic?.id === mechanicId) || (b.mechanicId === mechanicId);
        return isMatch && b.status === 'Completed';
    });

    const paidCompletedJobs = completedJobs.filter(b => b.isPaid !== false && b.paymentStatus !== 'failed');

    const calculatedLifetimeEarnings = paidCompletedJobs.reduce((sum, job) => sum + getJobTotalAmount(job), 0);
    const lifetimeEarnings = (mechanic as any)?.totalEarnings && (mechanic as any).totalEarnings > calculatedLifetimeEarnings
        ? (mechanic as any).totalEarnings
        : calculatedLifetimeEarnings;

    // 2. Filter payouts for this mechanic
    const myPayouts = payouts.filter(p => p.mechanicId === mechanicId);

    const pendingPayoutsTotal = myPayouts
        .filter(p => p.status === 'Pending')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const approvedPayoutsTotal = myPayouts
        .filter(p => p.status === 'Approved')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const paidPayoutsTotal = myPayouts
        .filter(p => p.status === 'Paid' || (p.status as string) === 'Completed')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // 3. Authoritative ledger calculation:
    // Ledger Available = Lifetime Earnings - (Paid + Approved + Pending Payouts)
    const ledgerAvailableBalance = Math.max(0, lifetimeEarnings - paidPayoutsTotal - approvedPayoutsTotal - pendingPayoutsTotal);

    // In-transit locked balance is all pending requests + approved requests awaiting disbursement
    const lockedBalance = pendingPayoutsTotal + approvedPayoutsTotal;

    // Harmonize with mechanic.walletBalance if specified on the document (fallback reconcile)
    let availableBalance = ledgerAvailableBalance;
    if (mechanic?.walletBalance != null && mechanic.walletBalance >= 0) {
        // If document balance is provided, deduct pending requests so it never over-reports
        const adjustedDocBalance = Math.max(0, mechanic.walletBalance - pendingPayoutsTotal);
        // Take the authoritative maximum to protect mechanic earnings against static drift
        availableBalance = Math.max(ledgerAvailableBalance, adjustedDocBalance);
    }

    return {
        lifetimeEarnings,
        availableBalance,
        lockedBalance,
        pendingPayoutsTotal,
        approvedPayoutsTotal,
        paidPayoutsTotal,
        completedJobsCount: completedJobs.length
    };
};
