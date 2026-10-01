# Plan: Layman's Term Payment Terms & Admin Commission Breakdown for Mechanic

## Goal
Add an intuitive, layman's-term breakdown of customer payment, admin commission (platform fee), and mechanic net take-home earnings upon service completion, within the Job Details screen and inside the Mechanic Earnings screen.

## Tasks
- [ ] Task 1: Verify and import `getJobTotalAmount`, `getJobMechanicShare`, and system fee percentage in `MechanicJobDetailScreen.tsx` → Verify: Functions available in scope.
- [ ] Task 2: Add Layman's Terms "Earnings Breakdown" (Customer Total, Admin Platform Fee, Your Take-Home) to the Payment Details section in `MechanicJobDetailScreen.tsx` → Verify: Card displays clearly with 100% calculation accuracy.
- [ ] Task 3: Add the Layman's Terms breakdown to both Completion Modals ("Job Marked as Done!" and "Payment Verified Successfully!") in `MechanicJobDetailScreen.tsx` → Verify: Modals present the clear breakdown before close.
- [ ] Task 4: Enhance `MechanicEarningsScreen.tsx` job cards (`CompactEarningItemCard`) to display the mechanic's Net Take-Home earnings along with Gross Total and Admin commission breakdown tag → Verify: Total computation aligns seamlessly with Wallet & Net Profit.
- [ ] Task 5: Run TypeScript check (`npm run typecheck`) and verification audits → Verify: Clean compile and zero regressions.

## Done When
- [ ] Mechanic can view a layman's-term breakdown ("Customer Total Paid", "Admin Platform Share / Fee", "Your Take-Home Pay") on completed jobs.
- [ ] The total computation in Mechanic Earnings and wallet reflects the exact net share.
- [ ] TypeScript typecheck passes with no errors.
