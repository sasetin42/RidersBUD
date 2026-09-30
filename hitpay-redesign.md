# [TASK] Redesign & Improve HitPay Payment Gateway Integration

## Goal
Create a modern, branded, secure checkout experience for HitPay with GCash, QRPh, Cards, and Maya, backed by authoritative webhook verification and zero credential storage.

## Tasks
- [x] Task 1: Extend HitPayService & types with payment_methods filtering and status queries → Verify: TypeScript types pass
- [x] Task 2: Implement server-side hitpayWebhook with HMAC-SHA256 signature verification & idempotency guards → Verify: functions/index.js and firebase.json configured
- [x] Task 3: Redesign HitPayCheckoutScreen into a modern, branded, mobile-first payment experience with all lifecycle states → Verify: Zero credential input fields, clean branding
- [x] Task 4: Connect ServicePaymentScreen and PaymentScreen to the branded checkout portal → Verify: Proper redirect parameters and session storage
- [x] Task 5: Run TypeScript build & automated security sanity checks → Verify: npm run build passes (exit 0) and security audit passes

## Done When
- [x] Branded UI renders SaSe Web Solutions merchant details, reference number, and "Pay PHP 3,250.00" CTA.
- [x] No sensitive payment credentials (card numbers, MPINs, CVVs) are captured or stored.
- [x] Backend webhook verification validates HMAC-SHA256 signature and prevents duplicate processing.
