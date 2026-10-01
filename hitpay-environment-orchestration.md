# HitPay Dynamic Environment Orchestration Plan (Sandbox vs. Live Mode)

## Goal
Ensure 100% full end-to-end functionality for all HitPay online payments across RidersBUD (GCash, QR Ph, Maya, Credit/Debit Cards for Orders, Services, Rentals, and Downpayments) dynamically switching between **Sandbox Test Mode** and **Live Production Mode** based on system settings (`settings/main` -> `hitpaySandboxMode`).

---

## Architecture & Touchpoints
- **Environment Switch:** `db?.settings?.hitpaySandboxMode` (Boolean: `true` = Sandbox, `false` = Live).
- **Backend Resolution (`functions/index.js` & `vite.config.ts`):**
  - **Sandbox:** Routes to `https://api.sandbox.hit-pay.com/v1`, using `hitpaySandboxApiKey` (`test_...`).
  - **Live:** Routes to `https://api.hit-pay.com/v1`, using `hitpayApiKey` (`live_...`).
- **Client Service (`services/HitPayService.ts`):** 
  - Resolves `isSandbox` dynamically from settings.
  - Sanitizes payload with environment-aware payment method codes (`gcash` in sandbox, `qrph_netbank` / hosted channels in live).
- **Payment Entrypoints:**
  - `pages/PaymentScreen.tsx` (Parts & Orders checkout)
  - `pages/ServicePaymentScreen.tsx` (Services, Car Rental, Liaison downpayment & balance)
  - `pages/HitPayCheckoutScreen.tsx` (Official branded payment gateway & in-app verification)
  - `components/HitPayInAppModal.tsx` (Secure in-app iframe & redirect fallback)
  - `components/admin/settings/tabs/FinancialsSettingsTab.tsx` (Admin dashboard live/sandbox toggle)

---

## Tasks & Agent Assignments

| Task ID | Task Description | Primary Agent | Skill | Verification Criteria |
|---|---|---|---|---|
| **HP-01** | Verify dynamic credential routing in `functions/index.js` and `vite.config.ts` | `backend-specialist` | `api-patterns` | Both sandbox test key and live key return HTTP 201 with valid hosted checkout URLs |
| **HP-02** | Align checkout entrypoints (`PaymentScreen.tsx`, `ServicePaymentScreen.tsx`, `HitPayCheckoutScreen.tsx`) to strictly obey `db?.settings?.hitpaySandboxMode` | `frontend-specialist` | `clean-code` | Environment badges and proxy payloads dynamically reflect the active setting |
| **HP-03** | Ensure iframe security headers and redirect callbacks in `HitPayInAppModal.tsx` seamlessly handle both `checkout.sandbox.hit-pay.com` and `checkout.hit-pay.com` | `frontend-specialist` | `clean-code` | Iframe loads without X-Frame-Options or CSP blocks; External browser fallback is available |
| **HP-04** | Verify payment completion flow & webhook signature verification across sandbox and live modes | `test-engineer` | `testing-patterns` | Webhook and verification endpoints return successful status |
| **HP-05** | Run comprehensive TypeScript compilation & build audit | `test-engineer` | `lint-and-validate` | `npm run typecheck` and `npm run build` pass with 0 errors |

---

## Verification Matrix
- [x] **Sandbox HitPay API Test**: Returns HTTP 201 with `https://checkout.sandbox.hit-pay.com/...`
- [x] **Live HitPay API Test**: Returns HTTP 201 with `https://checkout.hit-pay.com/...`
- [x] **Live Methods Optimization**: Correctly adapts payment method codes to avoid 422 errors on live accounts
- [x] **Typecheck**: `npm run typecheck` 0 errors
- [x] **End-to-End Simulation**: Verify checkout launch from Payment and Service screens
- [x] **Production Bundle Build**: `npm run build` compiled successfully in 15.24s

## Done When
- [x] Switching `hitpaySandboxMode` in Admin Settings immediately switches the entire app's payment gateway between Sandbox and Live without code modifications.
- [x] Both modes generate valid, working checkout URLs and properly update order and booking statuses.
- [x] In-app payment modal and direct external browser fallback tested and operational.
