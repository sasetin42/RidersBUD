'use strict';
/**
 * functions/lib/hitpay.js
 *
 * Shared HitPay helpers for RidersBUD Cloud Functions:
 *
 *  - Credential resolution: functions/.env -> settings/hitpaySecrets (admin-only)
 *    -> legacy settings/main.  NO hardcoded API keys anywhere in source.
 *  - Keep-alive HTTPS client for the HitPay API (sandbox / production kept strictly
 *    separate — key, salt, hostname and transaction environment never cross).
 *  - Dual-format webhook signature validation:
 *      * v2     : `Hitpay-Signature` header = HMAC-SHA256(raw JSON body, salt)
 *                 (current official HitPay docs)
 *      * legacy : `hmac` header/field = HMAC-SHA256 of `key+value` pairs sorted
 *                 alphabetically (older payment-request webhooks)
 *  - `settleTransaction()`: the SINGLE idempotent path that turns a transaction
 *    into a terminal state.  It re-verifies the payment directly with the HitPay
 *    API before anything is marked PAID, and applies the related entity update
 *    exactly once inside a Firestore transaction.
 */

const admin = require('firebase-admin');
const https = require('https');
const crypto = require('crypto');

const SANDBOX_HOST = 'api.sandbox.hit-pay.com';
const LIVE_HOST = 'api.hit-pay.com';

const WEBHOOK_URL = 'https://ridersbud-10806.web.app/api/hitpay-webhook';
/** HTTPS fallback return route (App Link -> app handles it; never trusted as proof). */
const HTTPS_RETURN_URL = 'https://ridersbud-10806.web.app/payment/return';

const TERMINAL_STATUSES = ['PAID', 'FAILED', 'CANCELLED', 'EXPIRED'];

const ENTITY_COLLECTIONS = {
    booking: 'bookings',
    rental: 'rentalBookings',
    liaison: 'liaisonBookings',
    'service-request': 'serviceRequests',
    order: 'orders'
};

const COLLECTION_ENTITY_KIND = {
    bookings: 'booking',
    rentalBookings: 'rental',
    liaisonBookings: 'liaison',
    serviceRequests: 'service-request',
    orders: 'order'
};

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

const credentialCache = { sandbox: null, live: null, expiresAt: 0 };
const saltCache = { sandbox: null, live: null, expiresAt: 0 };

/**
 * Resolve HitPay credentials for an environment.
 * Order: env vars -> settings/hitpaySecrets (admin-only) -> legacy settings/main.
 * Returns { apiKey, salt, source } or null when nothing is provisioned.
 */
async function resolveHitpayCredentials(isSandbox) {
    const cacheKey = isSandbox ? 'sandbox' : 'live';
    const now = Date.now();
    if (credentialCache[cacheKey] && credentialCache.expiresAt > now) {
        return credentialCache[cacheKey];
    }

    const readDoc = async (id) => {
        try {
            const snap = await admin.firestore().collection('settings').doc(id).get();
            return snap.exists ? (snap.data() || {}) : {};
        } catch (e) {
            console.warn(`settings/${id} read failed:`, e && e.message);
            return {};
        }
    };

    const pick = (s, secretKeys, legacyKeys) => {
        for (const k of secretKeys.concat(legacyKeys)) {
            if (s && s[k]) return s[k];
        }
        return '';
    };

    let resolved = null;

    // 1. Environment variables (functions/.env) — preferred, fully server-side
    const envKey = isSandbox ? process.env.HITPAY_SANDBOX_API_KEY : process.env.HITPAY_LIVE_API_KEY;
    const envSalt = isSandbox ? process.env.HITPAY_SANDBOX_SALT : process.env.HITPAY_LIVE_SALT;
    if (envKey) {
        resolved = { apiKey: envKey, salt: envSalt || '', source: 'env' };
    }

    // 2. Admin-only secrets document
    if (!resolved) {
        const secrets = await readDoc('hitpaySecrets');
        const apiKey = pick(secrets, isSandbox ? ['hitpaySandboxApiKey'] : ['hitpayApiKey'], isSandbox ? ['sandboxApiKey'] : ['liveApiKey']);
        const salt = pick(secrets, isSandbox ? ['hitpaySandboxSalt'] : ['hitpaySalt'], isSandbox ? ['sandboxSalt'] : ['liveSalt']);
        if (apiKey) resolved = { apiKey, salt, source: 'firestore:hitpaySecrets' };
    }

    // 3. Legacy settings/main (kept for backward compatibility; migrate away)
    if (!resolved) {
        const main = await readDoc('main');
        const apiKey = isSandbox ? main.hitpaySandboxApiKey : main.hitpayApiKey;
        const salt = isSandbox ? main.hitpaySandboxSalt : main.hitpaySalt;
        if (apiKey) resolved = { apiKey, salt, source: 'firestore:settings/main' };
    }

    if (resolved) {
        credentialCache[cacheKey] = resolved;
        credentialCache.expiresAt = Date.now() + 5 * 60 * 1000;
    }
    return resolved;
}

/** Resolve only the webhook salt for an environment (same sources as above). */
async function resolveSalt(isSandbox) {
    const creds = await resolveHitpayCredentials(isSandbox);
    return creds && creds.salt ? creds.salt : '';
}

// ---------------------------------------------------------------------------
// HTTP client
// ---------------------------------------------------------------------------

const hitpayAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000,
    keepAliveMsecs: 30000
});

function rawRequest(options, body) {
    return new Promise((resolve, reject) => {
        const opts = Object.assign({ agent: hitpayAgent }, options);
        const req = https.request(opts, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve({ statusCode: res.statusCode || 200, body: data }));
        });
        req.on('error', reject);
        req.setTimeout(25000, () => req.destroy(new Error('HitPay request timeout')));
        if (body) req.write(body);
        req.end();
    });
}

/**
 * Call the HitPay API for one environment. Never mixes sandbox/production.
 * Returns { statusCode, json } — json is null when the body is not JSON.
 */
async function hitpayApi({ isSandbox, apiKey, method = 'GET', path, body }) {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
        hostname: isSandbox ? SANDBOX_HOST : LIVE_HOST,
        port: 443,
        path,
        method,
        headers: Object.assign({
            'X-Requested-With': 'XMLHttpRequest',
            'X-BUSINESS-API-KEY': apiKey
        }, payload ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        } : {})
    };
    const result = await rawRequest(options, payload);
    let json = null;
    try { json = JSON.parse(result.body); } catch (_) { /* non-JSON */ }
    return { statusCode: result.statusCode, json, raw: result.body };
}

/** GET /v1/payment-requests/{id} — the authoritative server-side status check. */
async function fetchPaymentRequest(isSandbox, paymentRequestId) {
    const creds = await resolveHitpayCredentials(isSandbox);
    if (!creds || !creds.apiKey) return { ok: false, reason: 'credentials_missing' };
    try {
        const res = await hitpayApi({
            isSandbox,
            apiKey: creds.apiKey,
            method: 'GET',
            path: `/v1/payment-requests/${encodeURIComponent(paymentRequestId)}`
        });
        return { ok: res.statusCode >= 200 && res.statusCode < 300, statusCode: res.statusCode, data: res.json };
    } catch (e) {
        return { ok: false, reason: 'upstream_unreachable', error: e.message };
    }
}

// ---------------------------------------------------------------------------
// Webhook signatures
// ---------------------------------------------------------------------------

function timingSafeEqualString(a, b) {
    const bufA = Buffer.from(String(a || ''), 'utf8');
    const bufB = Buffer.from(String(b || ''), 'utf8');
    if (bufA.length !== bufB.length || bufA.length === 0) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

/** Legacy HitPay HMAC: `key+value` pairs, keys sorted alphabetically, hmac excluded. */
function computeLegacyHmac(payload, salt) {
    const keys = Object.keys(payload).filter((k) => k !== 'hmac').sort();
    const message = keys.map((k) => `${k}${payload[k]}`).join('');
    return crypto.createHmac('sha256', salt).update(message).digest('hex');
}

/** v2 HitPay HMAC: HMAC-SHA256 of the raw request body, hex. */
function computeRawBodyHmac(rawBody, salt) {
    return crypto.createHmac('sha256', salt).update(rawBody).digest('hex');
}

/**
 * Validate a webhook against every candidate salt, either scheme.
 * Returns { valid, mode: 'v2'|'legacy'|null, salt } — `valid` is false when no
 * salt or no signature matches; processing must NEVER continue on false.
 */
function verifyWebhookSignature({ rawBody, payload, headers, salts }) {
    const candidates = Array.isArray(salts) ? salts.filter((s) => !!s) : (salts ? [salts] : []);
    if (candidates.length === 0) return { valid: false, mode: null, salt: '' };

    const v2Header = headers['hitpay-signature'] || headers['x-hitpay-signature'] || '';
    const legacyHeader = headers['hmac'] || (payload && payload.hmac) || '';
    const hasV2 = !!v2Header;
    const hasLegacy = !!legacyHeader;

    if (!hasV2 && !hasLegacy) return { valid: false, mode: null, salt: '' };

    for (const salt of candidates) {
        if (hasV2 && rawBody && rawBody.length) {
            if (timingSafeEqualString(computeRawBodyHmac(rawBody, salt), v2Header)) {
                return { valid: true, mode: 'v2', salt };
            }
        }
        if (hasLegacy && payload && typeof payload === 'object') {
            if (timingSafeEqualString(computeLegacyHmac(payload, salt), legacyHeader)) {
                return { valid: true, mode: 'legacy', salt };
            }
        }
    }
    return { valid: false, mode: null, salt: '' };
}

// ---------------------------------------------------------------------------
// Reference / entity helpers (legacy parsing — transaction record is primary)
// ---------------------------------------------------------------------------

function parseReferenceEntity(referenceNumber) {
    const ref = String(referenceNumber || '');
    let entityId = '';
    let collectionName = '';
    const isDeposit = ref.includes('-DP');

    if (ref.startsWith('BOK-')) { entityId = ref.split('-')[1] || ''; collectionName = 'bookings'; }
    else if (ref.startsWith('RNT-')) { entityId = ref.split('-')[1] || ''; collectionName = 'rentalBookings'; }
    else if (ref.startsWith('LIA-')) { entityId = ref.split('-')[1] || ''; collectionName = 'liaisonBookings'; }
    else if (ref.startsWith('TOW-') || ref.startsWith('DRV-')) { entityId = ref.split('-')[1] || ''; collectionName = 'serviceRequests'; }
    else if (ref.startsWith('ORD-')) { entityId = ref.split('-')[1] || ''; collectionName = 'orders'; }

    if (entityId && entityId.length >= 6 && collectionName) {
        return { entityId, collectionName, isDeposit, entityKind: COLLECTION_ENTITY_KIND[collectionName] || '' };
    }
    return { entityId: '', collectionName: '', isDeposit, entityKind: '' };
}

/** Deterministic transaction document id from the reference (idempotency key). */
function deriveTransactionId(referenceNumber, paymentRequestId) {
    const base = referenceNumber || paymentRequestId || '';
    const clean = String(base).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
    if (clean) return `tx_${clean}`;
    return `tx_${crypto.createHash('sha1').update(String(base) + Date.now()).digest('hex').slice(0, 16)}`;
}

async function locateTransaction({ transactionId, paymentRequestId, referenceNumber }) {
    const col = admin.firestore().collection('paymentTransactions');
    if (transactionId) {
        const snap = await col.doc(transactionId).get();
        if (snap.exists) return { id: snap.id, ref: snap.ref, data: snap.data() };
    }
    if (paymentRequestId) {
        const q = await col.where('paymentRequestId', '==', paymentRequestId).limit(1).get();
        if (!q.empty) return { id: q.docs[0].id, ref: q.docs[0].ref, data: q.docs[0].data() };
    }
    if (referenceNumber) {
        const q = await col.where('referenceNumber', '==', referenceNumber).limit(5).get();
        if (!q.empty) {
            const docs = q.docs.slice().sort((a, b) => {
                const ta = (a.data().createdAt && a.data().createdAt.toMillis) ? a.data().createdAt.toMillis() : 0;
                const tb = (b.data().createdAt && b.data().createdAt.toMillis) ? b.data().createdAt.toMillis() : 0;
                return tb - ta;
            });
            return { id: docs[0].id, ref: docs[0].ref, data: docs[0].data() };
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Entity update computation (pure)
// ---------------------------------------------------------------------------

/**
 * Build the field-scoped entity update for a verified payment.
 * Never touches unrelated fields; merges the paymentTransactions array with
 * de-duplication by transactionId/reference so replays cannot double-apply.
 */
function computeEntityPaymentUpdate(entityData, { amount, reference, transactionId, kind, paymentMethod, paymentRequestId, collectionName }) {
    const currentPaid = Number(entityData.paidAmount || 0);
    const totalAmount = Number(entityData.totalAmount || entityData.totalPrice || entityData.total || 0);
    const existingTxs = Array.isArray(entityData.paymentTransactions) ? entityData.paymentTransactions : [];

    const isDuplicateRecord = (t) => !!t && (
        (transactionId && t.transactionId === transactionId) ||
        (reference && t.reference === reference)
    );
    const alreadyApplied = existingTxs.some(isDuplicateRecord);

    const newPaidAmount = alreadyApplied ? currentPaid : currentPaid + amount;
    const isFullyPaid = totalAmount > 0 ? newPaidAmount >= (totalAmount - 1) : true;
    const isDeposit = kind === 'downpayment' || (!!reference && String(reference).includes('-DP'));
    const paidAtIso = new Date().toISOString();

    const txRecord = {
        id: `tx_${Date.now()}_${String(paymentRequestId || reference || 'hp').slice(0, 12)}`,
        transactionId: transactionId || '',
        type: isFullyPaid ? 'balance' : (isDeposit ? 'downpayment' : 'payment'),
        amount,
        method: paymentMethod || 'HitPay (Online)',
        reference: reference || '',
        paidAt: paidAtIso,
        status: 'completed',
        gatewayResponse: {
            hitpayPaymentRequestId: paymentRequestId || '',
            hitpayReference: reference || ''
        }
    };

    const update = {
        paidAmount: newPaidAmount,
        remainingBalance: Math.max(0, totalAmount - newPaidAmount),
        paymentStatus: isFullyPaid ? 'paid' : 'partial',
        isPaid: isFullyPaid,
        isVerified: true,
        paymentMethod: paymentMethod || entityData.paymentMethod || 'HitPay (Online)',
        hitpayPaymentRequestId: paymentRequestId || '',
        hitpayReference: reference || '',
        hitpayStatus: 'completed',
        paymentTransactions: [...existingTxs.filter((t) => !isDuplicateRecord(t)), txRecord],
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (collectionName === 'bookings') {
        // Existing business rule: only advance Work Done -> Completed when fully paid.
        if (isFullyPaid && entityData.status === 'Work Done') update.status = 'Completed';
    } else if (collectionName === 'orders') {
        // Existing business rule (AdminOrdersScreen): Pending -> Processing, later states preserved.
        update.paymentStatus = 'paid';
        update.isPaid = true;
        if (!entityData.status || entityData.status === 'Pending') update.status = 'Processing';
    }

    if (isFullyPaid) {
        update.balancePaymentRef = reference || '';
        update.balancePaidAt = paidAtIso;
        update.balancePaid = true;
    } else {
        update.downpaymentRef = reference || '';
        update.downpaymentPaidAt = paidAtIso;
        update.downpaymentAmount = amount;
    }

    return { update, isFullyPaid, alreadyApplied };
}

// ---------------------------------------------------------------------------
// Settlement — the ONLY path to a terminal transaction state
// ---------------------------------------------------------------------------

function normalizeHitPayStatus(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'completed' || s === 'succeeded' || s === 'paid') return 'completed';
    if (s === 'failed') return 'failed';
    if (s === 'canceled' || s === 'cancelled') return 'canceled';
    if (s === 'expired') return 'expired';
    return s || 'pending';
}

async function writeTerminalStatus(txRef, before, terminal, fields) {
    const result = { status: terminal, changed: false };
    await admin.firestore().runTransaction(async (t) => {
        const snap = await t.get(txRef);
        if (!snap.exists) return;
        const data = snap.data();
        if (TERMINAL_STATUSES.includes(data.status)) {
            result.status = data.status;
            return;
        }
        t.update(txRef, Object.assign({}, fields, {
            status: terminal,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }));
        result.changed = true;
    });
    void before;
    return result;
}

/**
 * Idempotent settlement.
 *
 * params: { transactionId?, paymentRequestId?, referenceNumber?, webhookPayload?, trigger }
 *
 * - Locates (or, for signed legacy webhooks, retro-creates) the transaction record.
 * - Short-circuits when already terminal (duplicate webhook / duplicate callback).
 * - Re-verifies directly against the HitPay API before any PAID transition.
 * - Applies the entity update exactly once, inside a Firestore transaction.
 *
 * Returns { status, verificationStatus, transactionId, entityUpdated?, reason? }.
 */
async function settleTransaction(params) {
    const {
        transactionId = '',
        paymentRequestId = '',
        referenceNumber = '',
        webhookPayload = null,
        trigger = 'verify'
    } = params;

    const db = admin.firestore();
    const isFromWebhook = trigger === 'webhook';
    const webhookStatus = webhookPayload ? normalizeHitPayStatus(webhookPayload.status) : '';

    let located = await locateTransaction({ transactionId, paymentRequestId, referenceNumber });

    // --- Legacy/retro fallback: signed webhook but no transaction record yet ---
    if (!located && webhookPayload) {
        const ref = referenceNumber || webhookPayload.reference_number || '';
        const parsed = parseReferenceEntity(ref);
        if (!parsed.entityId) {
            return { status: 'UNMATCHED', reason: `unrecognized reference: ${ref}` };
        }
        const prId = paymentRequestId || webhookPayload.payment_request_id || '';
        const docId = deriveTransactionId(ref, prId);
        const refDoc = db.collection('paymentTransactions').doc(docId);
        const amount = Number(webhookPayload.amount || 0);
        const envFromPayload = webhookPayload.environment;
        await db.runTransaction(async (t) => {
            const snap = await t.get(refDoc);
            if (snap.exists) return;
            t.create(refDoc, {
                transactionId: docId,
                entityKind: parsed.entityKind,
                entityId: parsed.entityId,
                referenceNumber: ref,
                paymentRequestId: prId,
                amount,
                currency: String(webhookPayload.currency || 'PHP').toUpperCase(),
                paymentMethod: webhookPayload.payment_type || webhookPayload.payment_method || 'HitPay (Online)',
                environment: envFromPayload === 'sandbox' || envFromPayload === 'production' ? envFromPayload : 'production',
                status: 'PENDING',
                verificationStatus: 'UNVERIFIED',
                hitpayStatus: webhookStatus || 'pending',
                retro: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                webhookReceivedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });
        located = await locateTransaction({ transactionId: docId });
        if (!located) return { status: 'ERROR', reason: 'retro_transaction_create_failed' };
    }

    if (!located) return { status: 'NOT_FOUND', reason: 'no matching payment transaction' };

    const txRef = located.ref;
    const tx = located.data;
    const txId = located.id;

    // --- Idempotency: terminal states are immutable ---
    if (TERMINAL_STATUSES.includes(tx.status)) {
        return { status: tx.status, verificationStatus: tx.verificationStatus || '', transactionId: txId, alreadySettled: true };
    }

    const prId = paymentRequestId || tx.paymentRequestId || '';
    const ref = referenceNumber || tx.referenceNumber || '';
    const isSandbox = tx.environment === 'sandbox';

    // --- Failed / cancelled webhooks are terminal without a PAID path ---
    if (webhookStatus === 'failed' || webhookStatus === 'canceled') {
        const terminal = webhookStatus === 'failed' ? 'FAILED' : 'CANCELLED';
        const res = await writeTerminalStatus(txRef, tx, terminal, {
            hitpayStatus: webhookStatus,
            failureReason: webhookPayload && (webhookPayload.message || webhookPayload.failure_reason) || 'Payment failed at gateway',
            webhookReceivedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(isFromWebhook ? {} : {})
        });
        return { status: res.status, transactionId: txId, changed: res.changed };
    }

    // --- Server-side verification with HitPay (authoritative) ---
    if (!prId) {
        return {
            status: tx.status,
            verificationStatus: 'AWAITING_GATEWAY_VERIFICATION',
            transactionId: txId,
            reason: 'missing payment_request_id'
        };
    }

    const prResult = await fetchPaymentRequest(isSandbox, prId);
    if (!prResult.ok) {
        // Gateway unreachable — keep PENDING; client polling / HitPay retry re-runs this.
        return {
            status: tx.status,
            verificationStatus: 'GATEWAY_UNAVAILABLE',
            transactionId: txId,
            reason: prResult.reason || `http_${prResult.statusCode}`
        };
    }

    const pr = prResult.data || {};
    const prStatus = normalizeHitPayStatus(pr.status);

    if (prStatus === 'failed' || prStatus === 'canceled' || prStatus === 'expired') {
        const terminal = prStatus === 'failed' ? 'FAILED' : prStatus === 'canceled' ? 'CANCELLED' : 'EXPIRED';
        const res = await writeTerminalStatus(txRef, tx, terminal, {
            hitpayStatus: prStatus,
            failureReason: terminal === 'EXPIRED' ? 'Payment request expired' : 'Payment failed at gateway',
            ...(isFromWebhook ? { webhookReceivedAt: admin.firestore.FieldValue.serverTimestamp() } : {})
        });
        return { status: res.status, transactionId: txId, changed: res.changed };
    }

    if (prStatus !== 'completed') {
        // Still pending at the gateway — the redirect/callback proves nothing.
        return { status: tx.status, verificationStatus: tx.verificationStatus || 'UNVERIFIED', transactionId: txId, reason: `gateway_status_${prStatus}` };
    }

    // --- Match checks: amount / currency / reference / entity association ---
    const prAmount = Number(pr.amount);
    const txAmount = Number(tx.amount);
    const amountOk = Number.isFinite(prAmount) && (txAmount > 0 ? Math.abs(prAmount - txAmount) <= 0.01 : true);
    const currencyOk = !tx.currency || !pr.currency || String(pr.currency).toUpperCase() === String(tx.currency).toUpperCase();
    const refOk = !tx.referenceNumber || !pr.reference_number || String(pr.reference_number) === String(tx.referenceNumber);

    if (!amountOk || !currencyOk || !refOk) {
        const reason = !amountOk ? `amount mismatch: gateway=${prAmount} expected=${txAmount}`
            : !currencyOk ? `currency mismatch: gateway=${pr.currency} expected=${tx.currency}`
                : `reference mismatch: gateway=${pr.reference_number} expected=${tx.referenceNumber}`;
        await txRef.update({
            verificationStatus: !amountOk ? 'AMOUNT_MISMATCH' : !currencyOk ? 'CURRENCY_MISMATCH' : 'REFERENCE_MISMATCH',
            failureReason: reason,
            gatewayAmount: prAmount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }).catch(() => { });
        console.error(`HitPay settlement blocked [${txId}]: ${reason}`);
        return { status: tx.status, verificationStatus: 'MISMATCH', transactionId: txId, reason };
    }

    // --- Atomic terminal transition + single entity update ---
    const entityKind = tx.entityKind;
    const entityId = tx.entityId;
    const collectionName = ENTITY_COLLECTIONS[entityKind] || '';
    const paymentMethod = tx.paymentMethod || pr.payment_type || 'HitPay (Online)';
    let entityUpdated = false;
    let finalStatus = 'PAID';

    await db.runTransaction(async (t) => {
        const snap = await t.get(txRef);
        if (!snap.exists) throw new Error('transaction disappeared');
        const fresh = snap.data();
        if (TERMINAL_STATUSES.includes(fresh.status)) {
            finalStatus = fresh.status;
            return; // another caller settled first — no double apply
        }

        const nowIso = new Date().toISOString();
        t.update(txRef, {
            status: 'PAID',
            verificationStatus: 'VERIFIED',
            hitpayStatus: 'completed',
            hitpayPaymentId: (pr.payments && pr.payments[0] && pr.payments[0].id) || fresh.hitpayPaymentId || '',
            amount: txAmount > 0 ? txAmount : prAmount,
            paidAt: nowIso,
            verifiedAt: nowIso,
            ...(isFromWebhook ? { webhookReceivedAt: admin.firestore.FieldValue.serverTimestamp() } : {}),
            failureReason: '',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        if (collectionName && entityId) {
            const eRef = db.collection(collectionName).doc(entityId);
            const eSnap = await t.get(eRef);
            if (eSnap.exists) {
                const { update } = computeEntityPaymentUpdate(eSnap.data(), {
                    amount: txAmount > 0 ? txAmount : prAmount,
                    reference: fresh.referenceNumber || ref,
                    transactionId: txId,
                    kind: fresh.kind || '',
                    paymentMethod,
                    paymentRequestId: prId,
                    collectionName
                });
                t.update(eRef, update);
                entityUpdated = true;
            } else {
                console.error(`HitPay settlement: entity ${collectionName}/${entityId} not found for tx ${txId}`);
            }
        }
    });

    return {
        status: finalStatus,
        verificationStatus: finalStatus === 'PAID' ? 'VERIFIED' : '',
        transactionId: txId,
        changed: finalStatus === 'PAID',
        entityUpdated
    };
}

module.exports = {
    SANDBOX_HOST,
    LIVE_HOST,
    WEBHOOK_URL,
    HTTPS_RETURN_URL,
    TERMINAL_STATUSES,
    ENTITY_COLLECTIONS,
    COLLECTION_ENTITY_KIND,
    resolveHitpayCredentials,
    resolveSalt,
    hitpayApi,
    fetchPaymentRequest,
    computeLegacyHmac,
    computeRawBodyHmac,
    verifyWebhookSignature,
    timingSafeEqualString,
    parseReferenceEntity,
    deriveTransactionId,
    locateTransaction,
    computeEntityPaymentUpdate,
    normalizeHitPayStatus,
    settleTransaction
};
