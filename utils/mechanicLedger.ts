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

/**
 * Compute the mechanic's net share for a job after deducting the platform service commission fee.
 * Default commission: 30% platform / 70% mechanic.
 */
export const getJobMechanicShare = (job: any, serviceFeePercentage: number = 30): number => {
    const totalRevenue = getJobTotalAmount(job);
    if (totalRevenue <= 0) return 0;
    const feePct = typeof serviceFeePercentage === 'number' && serviceFeePercentage >= 0 ? serviceFeePercentage : 30;
    const platformCut = Math.round(totalRevenue * (feePct / 100));
    return Math.max(0, totalRevenue - platformCut);
};

export interface MechanicWalletLedger {
    lifetimeEarnings: number;
    grossLifetimeEarnings: number;
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
    payouts: PayoutRequest[] = [],
    serviceFeePercentage: number = 30
): MechanicWalletLedger => {
    if (!mechanicId) {
        return {
            lifetimeEarnings: 0,
            grossLifetimeEarnings: 0,
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

    // Calculate gross and net earnings
    const calculatedGrossLifetime = paidCompletedJobs.reduce((sum, job) => sum + getJobTotalAmount(job), 0);
    const calculatedNetLifetime = paidCompletedJobs.reduce((sum, job) => sum + getJobMechanicShare(job, serviceFeePercentage), 0);

    // Authoritative net lifetime earnings:
    // Ground truth is strictly derived from completed jobs. When transactions are removed/empty, earnings are 0.
    const lifetimeEarnings = calculatedNetLifetime;
    const grossLifetimeEarnings = calculatedGrossLifetime;

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
    // Ledger Available = Lifetime Net Earnings - (Paid + Approved + Pending Payouts)
    const ledgerAvailableBalance = Math.max(0, lifetimeEarnings - paidPayoutsTotal - approvedPayoutsTotal - pendingPayoutsTotal);

    // In-transit locked balance is all pending requests + approved requests awaiting disbursement
    const lockedBalance = pendingPayoutsTotal + approvedPayoutsTotal;

    const availableBalance = ledgerAvailableBalance;

    return {
        lifetimeEarnings,
        grossLifetimeEarnings,
        availableBalance,
        lockedBalance,
        pendingPayoutsTotal,
        approvedPayoutsTotal,
        paidPayoutsTotal,
        completedJobsCount: completedJobs.length
    };
};
