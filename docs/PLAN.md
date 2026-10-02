# Plan: Mechanic Job Detail "Payment Details" Fully Responsive Mobile Layout

## 1. Overview
The user provided a screenshot of the **Payment Details** card in the Mechanic Portal (`pages/mechanic/MechanicJobDetailScreen.tsx`). The card displays:
1. **Gateway / Reference Header**: Payment Gateway, Reference Number with copy button, Paid Timestamp.
2. **Total Amount Services (Kabuuan)**: ₱2,500 with a "100% PAID" badge (or 50% Initial DP / Remaining Balance split when not completed).
3. **Payment Terms Breakdown**:
   - Customer Total Paid (Kabuuang Bayad)
   - Admin Platform Fee (30%) (Bawas ng App)
   - Your Take-Home Pay (70%) (Pumasok na sa iyong Wallet)

### Issue / Goal
On narrow mobile screens (320px–390px, iPhone SE, standard Android devices):
- Reference number text and label can overflow or squish the copy button.
- "100% PAID" badge and amount can wrap awkwardly on smaller mobile viewports.
- The 70%/30% share pill and "Payment Terms Breakdown" title can collide or force ugly line breaks.
- Row items with parentheses `(Kabuuang Bayad)` and `(Bawas ng App)` need fluid responsive typography (`text-xs sm:text-sm`, `text-[10px] sm:text-xs`) with flexible flex wrapping so numbers never clip or wrap into illegible fragments.

---

## 2. Key Proposed Enhancements

### A. Reference Information Grid
- Allow Reference No row to adaptively wrap on extra small screens (`flex-col sm:flex-row items-start sm:items-center`).
- Keep font mono and add max-width truncation with an easily tappable copy button (min 36x36 touch target).
- Format timestamps cleanly so it never line-breaks awkwardly on narrow viewports.

### B. Total Amount Services Card
- Ensure flex container adjusts responsively: `flex-col sm:flex-row gap-3 sm:gap-4`.
- Big bold currency display: `text-2xl sm:text-3xl font-black text-white`.
- Make the "100% PAID" or "50% DP" badge self-align and scale gracefully on mobile.

### C. Payment Terms Breakdown
- Top header: Use `flex flex-col sm:flex-row sm:items-center justify-between gap-2`.
- Share badge (`70% / 30% SHARE`): Cleanly placed without clipping the title.
- Item rows: Ensure amount (`₱2,500`, `- ₱750`) has `shrink-0` and doesn't get squeezed by long Filipino/English bilingual explanatory labels.
- "Your Take-Home Pay (70%)": High visual prominence with emerald glow, responsive text sizing, and clear spacing.

---

## 3. Verification Plan
- `npm run typecheck`
- `npm run build`
- Inspect mobile responsiveness across screen widths (320px, 375px, 414px, and desktop).
