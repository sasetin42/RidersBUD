# Fix Available Balance Amount Computation

## Goal
Harmonize the mechanic wallet available balance calculation across `utils/mechanicLedger.ts`, `MechanicEarningsScreen.tsx`, and `MechanicProfileManagementScreen.tsx` so that available balance accurately and consistently reflects net earnings (job revenue minus platform service fee commission minus payouts/withdrawals).

## Tasks
- [x] Task 1: Update `utils/mechanicLedger.ts` to compute net job earnings with platform commission support and reconcile with document balance without static drift → Verify: Unit calculation logic returns correct net share and balances.
- [x] Task 2: Standardize `MechanicEarningsScreen.tsx` and `MechanicProfileManagementScreen.tsx` to use the unified `calculateMechanicWalletLedger` → Verify: Available Balance and Net Profit cards reflect synchronized values.
- [x] Task 3: Verify TypeScript builds with `npm run typecheck` → Verify: Zero type errors across files.
- [x] Task 4: Run verification builds (`npm run build`) → Verify: Build completes successfully with 0 errors.

## Done When
- [x] `calculateMechanicWalletLedger` supports platform service fee cut (defaulting to system settings `serviceFeePercentage` or 10%).
- [x] Available balance accurately reflects net earnings minus pending and approved/paid payouts.
- [x] Dashboard, Earnings Screen, Profile Management Screen, and Admin screen calculate the exact same available balance.
- [x] TypeScript check (`npm run typecheck`) and Vite build (`npm run build`) pass cleanly.
