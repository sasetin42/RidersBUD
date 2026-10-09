# Fix Mobile Header and Bottom Navigational Menu Spacing & Steady Persistence

## 1. Problem Statement
The user reported that on the mobile application:
1. **Sobrang laki ng space sa Header at Footer**:
   - The top header has excessive empty padding/space above it (up to ~60-70px padding).
   - In `CustomerHeader.tsx`, `style={{ paddingTop: 'calc(0.75rem + var(--safe-top))', paddingBottom: '0.75rem' }}` plus Capacitor's `SystemBars.insetsHandling: "css"` or Android status bar creates a huge black gap above the logo and title.
   - In `App.tsx`, the outer customer container applies `pb-20` (5rem/80px), while `BottomNav` also applies `min-h-[4rem] h-[calc(4rem+var(--safe-bottom))] pb-[var(--safe-bottom)]`, creating a huge empty gap between page content and the bottom navigation bar.
2. **Dynamic Sliding / Disappearing on Scroll ("steady nalang kahit mag swipe sa baba or sa taas")**:
   - `CustomerHeader.tsx` and `Header.tsx` use `useScrollDirection()` with `isHidden ? '-translate-y-full' : 'translate-y-0'`.
   - `BottomNav.tsx` uses `${scrollDirection === 'down' ? 'translate-y-full' : 'translate-y-0'}`.
   - When the user swipes up or down, the header and footer slide out or jump, causing visual jitter and disorienting navigation.
   - **User requirement**: Keep **BOTH the header and the bottom navigation bar steady / pinned** (no disappearing or translation when swiping/scrolling up or down).

## 2. Action Items
1. **Fix Header Steady State & Tighten Spacing**:
   - In `components/CustomerHeader.tsx`, remove the scroll direction hide logic (`-translate-y-full`). Make it permanently steady (`sticky top-0 z-50`).
   - Compact the padding to a sleek mobile app header: `paddingTop: 'calc(0.35rem + var(--safe-top))'`, `paddingBottom: '0.35rem'`.
   - In `components/Header.tsx`, also remove `-translate-y-full` so it remains steady without jumping during scrolls.
2. **Fix BottomNav Steady State & Eliminate Extra Spacer Gap**:
   - In `components/BottomNav.tsx`, remove `${scrollDirection === 'down' ? 'translate-y-full' : 'translate-y-0'}` so it stays fixed and steady at the bottom at all times.
   - Standardize height to a sleek, compact mobile navigation bar (`h-14` / `min-h-[3.5rem]`).
   - In `App.tsx`, adjust `pb-20` to `pb-16` (matching the compact bottom nav height).
3. **Verify and Build**:
   - Run `npm test` to verify test suite passes.
   - Run `npm run build` and `npx cap sync android`.
   - Run `node scripts/release-apk.mjs --skip-deploy` to produce the updated APK.
