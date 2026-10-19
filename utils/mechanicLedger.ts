import { Booking, Mechanic, PayoutRequest } from '../types';

/**
 * Robustly parse currency strings or numbers (e.g. "₱2,450", "2,450.00", 2450) safely into a valid number.
 */
export const parseAmount = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
};

/**
 * Get the main services base fee excluding mechanic additional costs.
 * 30% admin commission is calculated strictly on this base amount.
 */
export const getJobServicesAmount = (job: any): number => {
    if (!job) return 0;
    const svcs = job.services && job.services.length > 0 ? job.services : (job.service ? [job.service] : []);
    const svcsSum = svcs.reduce((s: number, svc: any) => s + parseAmount(svc?.price), 0);
    if (svcsSum > 0) return svcsSum + parseAmount(job.laborFee);
    
    // Fallback: if totalAmount or price is present, subtract additionalCosts
    const total = parseAmount(job.totalAmount) || parseAmount(job.price) || 0;
    const addCosts = getJobAdditionalCostsAmount(job);
    return Math.max(0, total - addCosts);
};

/**
 * Get sum of additional costs added by mechanic.
 * 100% of this goes to the mechanic (exempt from platform cut).
 */
export const getJobAdditionalCostsAmount = (job: any): number => {
    if (!job) return 0;
    return (job.additionalCosts || []).reduce((s: number, c: any) => s + parseAmount(c?.price), 0);
};

/**
 * Standardize job total amount computation across all mechanic screens and services.
 */
export const getJobTotalAmount = (job: any): number => {
    if (!job) return 0;
    const addCosts = getJobAdditionalCostsAmount(job);
    if (job.totalAmount != null && parseAmount(job.totalAmount) > 0) {
        // If totalAmount is saved, ensure it includes or is at least services + additionals
        const rawTotal = parseAmount(job.totalAmount);
        return rawTotal;
    }
    if (job.price != null && parseAmount(job.price) > 0) {
        const rawPrice = parseAmount(job.price);
        return rawPrice;
    }
    const svcs = job.services && job.services.length > 0 ? job.services : (job.service ? [job.service] : []);
    const svcsSum = svcs.reduce((s: number, svc: any) => s + parseAmount(svc?.price), 0);
    return svcsSum + addCosts + parseAmount(job.laborFee);
};

/**
 * Compute the admin platform commission cut for a job.
 * Admin cut (e.g. 30%) is based ONLY on the Main Service Price.
 * Additional Costs are strictly excluded from admin cut.
 */
export const getJobAdminShare = (job: any, serviceFeePercentage: number = 30): number => {
    const servicesFee = getJobServicesAmount(job);
    if (servicesFee <= 0) return 0;
    const feePct = typeof serviceFeePercentage === 'number' && serviceFeePercentage >= 0 ? serviceFeePercentage : 30;
    return Math.round(servicesFee * (feePct / 100));
};

/**
 * Compute the mechanic's net share for a job.
 * Rule:
 * 1. Admin commission (e.g. 30%) is deducted ONLY from the main services fee.
 * 2. Additional costs are 100% credited to the mechanic without any commission deduction.
 * Formula: (mainServicesFee - adminCommission) + additionalCosts
 */
export const getJobMechanicShare = (job: any, serviceFeePercentage: number = 30): number => {
    const totalRevenue = getJobTotalAmount(job);
    if (totalRevenue <= 0) return 0;
    const adminCut = getJobAdminShare(job, serviceFeePercentage);
    return Math.max(0, totalRevenue - adminCut);
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

    const targetMechId = String(mechanicId).trim();

    // 1. Gather all completed bookings for this mechanic/driver (case-insensitive and trimmed)
    const completedJobs = bookings.filter(b => {
        if (!b) return false;
        const bMechId = b.mechanic?.id || b.mechanicId;
        const isMatch = bMechId != null && String(bMechId).trim() === targetMechId;
        const status = (b.status || '').toString().toLowerCase().trim();
        return isMatch && status === 'completed';
    });

    const paidCompletedJobs = completedJobs.filter(b => {
        const payStatus = (b.paymentStatus || '').toString().toLowerCase().trim();
        return b.isPaid !== false && payStatus !== 'failed' && payStatus !== 'cancelled';
    });

    // Calculate gross and net earnings
    const calculatedGrossLifetime = paidCompletedJobs.reduce((sum, job) => sum + getJobTotalAmount(job), 0);
    const calculatedNetLifetime = paidCompletedJobs.reduce((sum, job) => sum + getJobMechanicShare(job, serviceFeePercentage), 0);

    // Authoritative net lifetime earnings:
    // Ground truth is strictly derived from completed jobs. When transactions are removed/empty, earnings are 0.
    const lifetimeEarnings = calculatedNetLifetime;
    const grossLifetimeEarnings = calculatedGrossLifetime;

    // 2. Filter payouts for this mechanic with safe parsing & normalized statuses
    const myPayouts = (payouts || []).filter(p => {
        if (!p || !p.mechanicId) return false;
        return String(p.mechanicId).trim() === targetMechId;
    });

    let pendingPayoutsTotal = 0;
    let approvedPayoutsTotal = 0;
    let paidPayoutsTotal = 0;

    for (const p of myPayouts) {
        const amt = parseAmount(p.amount);
        if (amt <= 0) continue;

        const st = (p.status || '').toString().toLowerCase().trim();
        if (st === 'pending') {
            pendingPayoutsTotal += amt;
        } else if (st === 'approved' || st === 'processing') {
            approvedPayoutsTotal += amt;
        } else if (st === 'paid' || st === 'completed' || st === 'settled') {
            paidPayoutsTotal += amt;
        }
        // Note: Rejected, Cancelled, and Declined payouts are intentionally excluded. They never lock or deduct funds.
    }

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
