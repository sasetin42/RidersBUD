# Plan: HitPay Checkout Screen Mobile Layout & Data Details Enhancement

## Goal
Elevate the UI/UX and visual data hierarchy of `HitPayCheckoutScreen.tsx` to provide a pixel-perfect, fully responsive mobile layout view (fixing truncated text, misaligned headers, squished badges, and cramped invoice containers) while ensuring 100% realtime live data details (invoice/reference numbers, customer contact info, booking purpose, method badges, and status confirmation) connect seamlessly to the HitPay API.

---

## Identified Visual & Responsive Flaws in Current Mobile View
1. **Header Misalignment & Clipping on Mobile:**
   - In portrait viewport (< 400px), the "Back" button, SaSe logo, title, "Verified" badge, and 15-min countdown timer cram together horizontally. The countdown timer gets pushed off-screen or clips into the title.
2. **Logo Display Fallback:**
   - The logo container displays an empty green/orange square when `/ridersbud_logo_white.png` fails or takes time to render, lacking a crisp modern gradient badge with the RidersBUD logo vector.
3. **Reference & Invoice Box Truncation:**
   - Reference numbers like `BOK-XN09L4Xjsac2BnwJ0hcr-DP-1790837899090` and emails are truncated or run against borders in narrow mobile widths. Needs copy-to-clipboard functionality and clean mono spacing.
4. **Payment Method Item Truncation:**
   - On narrow screens, payment method descriptions (e.g., "Instant direct e-wallet payment via ...", "Scan with BDO, BPI, Maya, UnionBank...") get aggressively truncated with `truncate`, cutting off critical bank names. Needs responsive sub-labels or flexible text wraps.
5. **Sticky Mobile Bottom Action Bar:**
   - When scrolling long screens on mobile, having the CTA at the bottom can get pushed down; a modern, ergonomic layout with proper safe-area padding ensures instant access to "Pay PHP X,XXX.XX" without accidental zoom or scroll friction.
6. **Realtime Live Data Connectivity:**
   - Customer details (`name`, `phone`, `email`, `purpose`, `amount`, `reference_number`) must accurately flow through to HitPay's live payment request, and return authoritative transaction details on completion.

---

## Tasks & Agent Assignments

| Task ID | Task Description | Primary Agent | Skill | Verification Criteria |
|---|---|---|---|---|
| **MOB-01** | Redesign mobile header with responsive 2-tier layout: Top navigation (Back button, live countdown pill, SSL lock) + Brand Row (RidersBUD icon, SaSe title, Verified badge) | `frontend-specialist` | `frontend-design`, `mobile-design` | No clipping or overflow on screens 320px–430px; countdown timer remains completely visible |
| **MOB-02** | Upgrade Amount Card & Reference Invoice Card with clean visual hierarchy, badge styling, and click-to-copy reference button | `frontend-specialist` | `frontend-design` | Reference numbers wrap cleanly without overflowing container; copy button gives instant visual feedback |
| **MOB-03** | Enhance Payment Method Options cards with responsive multi-line layout, clear channel badges (GCash, QR Ph, Card, Maya), and distinct radio indicators | `frontend-specialist` | `mobile-design` | Method titles and channel descriptions display clearly on small screens without harsh clipping |
| **MOB-04** | Verify realtime live HitPay data binding (amount, customer name, phone, email, purpose, reference) passed to HitPay proxy | `backend-specialist` | `api-patterns` | Proxy payload contains validated live data; API generates live hosted checkout URL matching the exact amount and reference |
| **MOB-05** | Run comprehensive verification (TypeScript typecheck, Vite build, mobile viewport audit) | `test-engineer` | `lint-and-validate` | `npm run typecheck` passes with 0 errors; `npm run build` succeeds |

---

## Verification Checklist
- [x] Mobile Viewport (360px - 414px) verified with no horizontal overflow
- [x] Brand header, Verified badge, and countdown timer align cleanly across multi-tier layout
- [x] Reference invoice number is copyable and breaks cleanly without clipping
- [x] Payment methods show full informative descriptions and unclipped badges
- [x] Live and Sandbox environment badges reflect `db?.settings?.hitpaySandboxMode`
- [x] Direct test API call verifies realtime HitPay checkout generation
- [x] `npm run typecheck` passes with 0 errors
- [x] `npm run build` succeeds in 15.02s without errors
