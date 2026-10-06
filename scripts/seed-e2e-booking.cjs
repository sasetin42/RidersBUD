/* Seeds a dedicated E2E booking (owner auth session + bookings/{id} doc) so
 * scripts/e2e-hitpay.cjs can run full create -> checkout -> settle cycles from
 * scratch on every run.
 *
 * Access pattern (no service account / ADC required):
 *   1. Identity Toolkit  — signUp (first run) / signInWithPassword (later runs)
 *      for a THROWAWAY test customer (public web API key, same one used by
 *      scripts/fetchLiveData.ts).
 *   2. Firestore REST    — create bookings/{id} as that signed-in customer.
 *      firestore.rules allows booking create when `customerId == request.auth.uid`
 *      and all payment fields are unpaid — exactly how this doc is written, so
 *      NO rules changes and NO admin privileges are needed.
 *
 * The seeded booking satisfies calculateAuthoritativeAmount():
 *   totalAmount 1000, downpaymentAmount 500, paidAmount 0
 *   -> downpayment checkout amount = 500 PHP.
 *
 * Usage:  node scripts/seed-e2e-booking.cjs        (prints the seed as JSON)
 *   or    require('./seed-e2e-booking.cjs').seedBooking()  from the harness.
 */

const PROJECT = 'ridersbud-10806';
// Public web API key (safe to expose — identical to scripts/fetchLiveData.ts).
const API_KEY = 'AIzaSyD_ot0rEnYcP0l4fseVinRPFuUFuHYFn3A';
const EMAIL = process.env.E2E_SEED_EMAIL || 'e2e-seed@ridersbud.test';
const PASSWORD = process.env.E2E_SEED_PASSWORD || 'E2eSeed!2026';

const TOTAL_AMOUNT = 1000;
const DOWNPAYMENT = 500;

const postJson = async (url, body) => {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await resp.text();
  let json = null; try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: resp.status, json, text };
};

/** Sign in (or create) the throwaway E2E customer and return { idToken, uid }. */
async function authenticate() {
  const signUp = await postJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    { email: EMAIL, password: PASSWORD, returnSecureToken: true }
  );
  if (signUp.json && signUp.json.idToken) {
    return { idToken: signUp.json.idToken, uid: signUp.json.localId, created: true };
  }
  const signIn = await postJson(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { email: EMAIL, password: PASSWORD, returnSecureToken: true }
  );
  if (!(signIn.json && signIn.json.idToken)) {
    throw new Error(
      `E2E seed auth failed: signUp=${signUp.status} ${signUp.text.slice(0, 200)} | ` +
      `signIn=${signIn.status} ${signIn.text.slice(0, 200)}`
    );
  }
  return { idToken: signIn.json.idToken, uid: signIn.json.localId, created: false };
}

const str = (v) => ({ stringValue: String(v) });
const num = (v) => ({ doubleValue: Number(v) });
const bool = (v) => ({ booleanValue: Boolean(v) });

/**
 * Create a fresh booking owned by the throwaway E2E customer.
 * Returns { entityId, uid, idToken, email, totalAmount, downpaymentAmount }.
 */
async function seedBooking() {
  const { idToken, uid, created } = await authenticate();
  const entityId = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const docUrl =
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/bookings/${entityId}` +
    `?currentDocument.exists=false`;

  const resp = await fetch(docUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({
      fields: {
        bookingId: str(entityId),
        customerId: str(uid),
        customerEmail: str(EMAIL),
        customerName: str('RidersBUD E2E Seed'),
        status: str('Pending'),
        paymentStatus: str('pending'),
        isPaid: bool(false),
        totalAmount: num(TOTAL_AMOUNT),
        downpaymentAmount: num(DOWNPAYMENT),
        paidAmount: num(0),
        remainingBalance: num(TOTAL_AMOUNT),
        currency: str('PHP'),
        source: str('e2e-seed'),
        createdAt: str(new Date().toISOString())
      }
    })
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`E2E seed booking create failed: HTTP ${resp.status} ${text.slice(0, 300)}`);
  }

  return {
    entityId,
    uid,
    idToken,
    email: EMAIL,
    totalAmount: TOTAL_AMOUNT,
    downpaymentAmount: DOWNPAYMENT,
    accountCreated: created
  };
}

module.exports = { seedBooking, EMAIL, PASSWORD, PROJECT, TOTAL_AMOUNT, DOWNPAYMENT };

if (require.main === module) {
  seedBooking()
    .then((seed) => console.log(JSON.stringify(seed, null, 2)))
    .catch((e) => { console.error('SEED FAILED:', e.message); process.exit(1); });
}
