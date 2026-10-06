'use strict';
/**
 * functions/lib/hitpay.js
 *
 * Shared HitPay helpers for RidersBUD Cloud Functions:
 *
 *  - Credential & Webhook Salt resolution:
 *      * functions/.env -> settings/hitpaySecrets (admin-only) -> legacy settings/main.
 *      * Supports distinct HITPAY_WEBHOOK_SALT / HITPAY_SANDBOX_WEBHOOK_SALT with fallback to API salt.
 *      * Strictly isolates sandbox and production (keys, salts, hostnames, and endpoints never cross).
 *  - Keep-alive HTTPS client for the HitPay API.
 *  - Dual-format webhook signature validation:
 *      * v2     : `Hitpay-Signature` header = HMAC-SHA256(raw JSON body buffer, salt)
 *      * legacy : `hmac` header/field = HMAC-SHA256 of sorted key+value pairs (in-flight fallback)
 *      * Timing-safe equality check.
 *  - Authoritative amount calculation & validation across:
 *      * bookings
 *      * rentalBookings
 *      * liaisonBookings
 *      * serviceRequests (driver hire, towing, roadside assistance, etc.)
 *      * orders
 *  - Strict state machine & idempotent settlement:
 *      CREATED -> INITIALIZING -> CHECKOUT_OPEN -> WAITING_FOR_PAYMENT -> VERIFYING -> PAID / FAILED / CANCELLED / EXPIRED
 *      Amount / currency / reference mismatch triggers PENDING_REVIEW and adminNotifications.
 */

const admin = require('firebase-admin');
const https = require('https');
const crypto = require('crypto');

const SANDBOX_HOST = 'api.sandbox.hit-pay.com';
const LIVE_HOST = 'api.hit-pay.com';

const WEBHOOK_URL = 'https://ridersbud-10806.web.app/api/hitpay-webhook';
/** HTTPS fallback return route (App Link -> app handles it; never trusted as proof). */
const HTTPS_RETURN_URL = 'https://ridersbud-10806.web.app/payment/return';

const TRANSACTION_STATUSES = [
    'CREATED',
    'INITIALIZING',
    'CHECKOUT_OPEN',
    'WAITING_FOR_PAYMENT',
    'VERIFYING',
    'PAID',
    'FAILED',
    'CANCELLED',
    'EXPIRED',
    'PENDING_REVIEW'
];

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
// Credentials & Salts
// ---------------------------------------------------------------------------

const credentialCache = { sandbox: null, live: null, expiresAt: 0 };

/**
 * Resolve HitPay credentials and salts for an environment.
 * Priority order:
 *   1. Environment variables (functions/.env)
 *   2. Admin-only secrets document (settings/hitpaySecrets)
 *   3. Legacy settings document (settings/main)
 *
 * Returns { apiKey, salt, webhookSalt, source } or null if not provisioned.
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

    const pick = (s, ...keyLists) => {
        for (const list of keyLists) {
            for (const k of list) {
                if (s && s[k]) return s[k];
            }
        }
        return '';
    };

    let resolved = null;

    // 1. Environment variables (functions/.env)
    const envKey = isSandbox ? process.env.HITPAY_SANDBOX_API_KEY : process.env.HITPAY_LIVE_API_KEY;
    const envSalt = isSandbox ? process.env.HITPAY_SANDBOX_SALT : (process.env.HITPAY_LIVE_SALT || process.env.HITPAY_SALT);
    const envWebhookSalt = isSandbox
        ? (process.env.HITPAY_SANDBOX_WEBHOOK_SALT || envSalt)
        : (process.env.HITPAY_WEBHOOK_SALT || envSalt);

    if (envKey) {
        resolved = {
            apiKey: envKey,
            salt: envSalt || '',
            webhookSalt: envWebhookSalt || envSalt || '',
            source: 'env'
        };
    }

    // 2. Admin-only secrets document (settings/hitpaySecrets)
    if (!resolved) {
        const secrets = await readDoc('hitpaySecrets');
        const apiKey = pick(
            secrets,
            isSandbox ? ['hitpaySandboxApiKey', 'sandboxApiKey'] : ['hitpayApiKey', 'liveApiKey', 'apiKey']
        );
        const salt = pick(
            secrets,
            isSandbox ? ['hitpaySandboxSalt', 'sandboxSalt'] : ['hitpaySalt', 'liveSalt', 'salt']
        );
        const webhookSalt = pick(
            secrets,
            isSandbox ? ['hitpaySandboxWebhookSalt', 'sandboxWebhookSalt'] : ['hitpayWebhookSalt', 'webhookSalt']
        ) || salt;

        if (apiKey) {
            resolved = { apiKey, salt, webhookSalt, source: 'firestore:hitpaySecrets' };
        }
    }

    // 3. Legacy settings/main document
    if (!resolved) {
        const main = await readDoc('main');
        const apiKey = isSandbox ? (main.hitpaySandboxApiKey || main.sandboxApiKey) : (main.hitpayApiKey || main.apiKey);
        const salt = isSandbox ? (main.hitpaySandboxSalt || main.sandboxSalt) : (main.hitpaySalt || main.salt);
        const webhookSalt = isSandbox
            ? (main.hitpaySandboxWebhookSalt || main.sandboxWebhookSalt || salt)
            : (main.hitpayWebhookSalt || main.webhookSalt || salt);

        if (apiKey) {
            resolved = { apiKey, salt, webhookSalt, source: 'firestore:settings/main' };
        }
    }

    if (resolved) {
        credentialCache[cacheKey] = resolved;
        credentialCache.expiresAt = Date.now() + 5 * 60 * 1000;
    }
    return resolved;
}

/**
 * Resolve webhook salts for an environment.
 * Returns an array of candidate salts (primary webhook salt + fallback API salt).
 */
async function resolveWebhookSalts(isSandbox) {
    const creds = await resolveHitpayCredentials(isSandbox);
    if (!creds) return [];
    const list = [creds.webhookSalt, creds.salt].filter(Boolean);
    return Array.from(new Set(list));
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

/**
 * Fetch the payment request with a one-time opposite-environment fallback.
 *
 * ROOT-CAUSE GUARD: a transaction whose stored `environment` disagrees with
 * where the HitPay payment request actually lives (or a credential rotation)
 * would 404/401 forever — settlement would then NEVER complete and the client
 * would spin on "Verifying Payment" until it times out. Trying the other
 * environment once heals that mismatch and records the correction.
 *
 * Returns the fetchPaymentRequest shape plus { environmentUsed, environmentCorrected }.
 */
async function fetchPaymentRequestWithEnvFallback(isSandbox, paymentRequestId) {
    const primary = await fetchPaymentRequest(isSandbox, paymentRequestId);
    if (primary.ok) {
        return Object.assign(primary, { environmentUsed: isSandbox ? 'sandbox' : 'production', environmentCorrected: false });
    }
    const recoverable = primary.statusCode === 401 || primary.statusCode === 403 || primary.statusCode === 404;
    if (recoverable) {
        const fallback = await fetchPaymentRequest(!isSandbox, paymentRequestId);
        if (fallback.ok) {
            console.warn(
                `[HitPay] PR ${paymentRequestId} resolved via the ${!isSandbox ? 'sandbox' : 'production'} environment ` +
                `while the transaction recorded ${isSandbox ? 'sandbox' : 'production'} — healing environment mismatch.`
            );
            return Object.assign(fallback, { environmentUsed: !isSandbox ? 'sandbox' : 'production', environmentCorrected: true });
        }
    }
    return Object.assign(primary, { environmentUsed: isSandbox ? 'sandbox' : 'production', environmentCorrected: false });
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

function computeLegacyHmac(payload, salt) {
    const keys = Object.keys(payload).filter((k) => k !== 'hmac').sort();
    const message = keys.map((k) => `${k}${payload[k]}`).join('');
    return crypto.createHmac('sha256', salt).update(message).digest('hex');
}

function computeRawBodyHmac(rawBody, salt) {
    const buf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ''), 'utf8');
    return crypto.createHmac('sha256', salt).update(buf).digest('hex');
}

function verifyWebhookSignature({ rawBody, payload, headers, salts }) {
    const candidates = Array.isArray(salts) ? salts.filter(Boolean) : (salts ? [salts] : []);
    if (candidates.length === 0) return { valid: false, mode: null, salt: '' };

    const v2Header = (headers && (headers['hitpay-signature'] || headers['x-hitpay-signature'])) || '';
    const legacyHeader = (headers && headers['hmac']) || (payload && payload.hmac) || '';
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
// Authoritative Amount Calculation
// ---------------------------------------------------------------------------

/**
 * Calculates authoritative amount and currency for an entity and kind.
 *
 * @param {object} entityData - Raw Firestore doc data
 * @param {string} collectionName - 'bookings' | 'rentalBookings' | 'liaisonBookings' | 'serviceRequests' | 'orders'
 * @param {string} kind - 'downpayment' | 'balance' | 'full' | ''
 * @param {string} referenceNumber - reference string (may include '-DP' or '-BAL')
 * @returns {{ amount: number, currency: string, isDeposit: boolean, totalAmount: number, paidAmount: number, remainingBalance: number }}
 */
function calculateAuthoritativeAmount(entityData, collectionName, kind, referenceNumber = '') {
    const data = entityData || {};
    const ref = String(referenceNumber || '').toUpperCase();
    const isDeposit = kind === 'downpayment' || ref.includes('-DP') || (!kind && data.paymentStatus === 'deposit');

    let totalAmount = 0;
    let downpaymentAmount = 0;
    const paidAmount = Number(data.paidAmount || 0);
    const currency = String(data.currency || 'PHP').toUpperCase();

    if (collectionName === 'bookings') {
        totalAmount = Number(data.totalAmount ?? 0);
        if (totalAmount <= 0 && Array.isArray(data.services)) {
            totalAmount = data.services.reduce((s, x) => s + Number((x && x.price) || 0), 0);
        }
        downpaymentAmount = Number(data.downpaymentAmount ?? (totalAmount * 0.5));
    } else if (collectionName === 'rentalBookings') {
        totalAmount = Number(data.totalPrice ?? data.totalAmount ?? 0);
        downpaymentAmount = Number(data.downpaymentAmount ?? (totalAmount * 0.5));
    } else if (collectionName === 'liaisonBookings') {
        const fees = data.fees || {};
        totalAmount = Number(data.totalAmount ?? fees.total ?? data.price ?? 1500);
        downpaymentAmount = Number(data.downpaymentAmount ?? (fees.downpayment ?? Math.round(totalAmount * 0.5)));
    } else if (collectionName === 'serviceRequests') {
        const details = data.details || {};
        totalAmount = Number(data.totalAmount ?? details.totalAmount ?? data.estimatedCost ?? 0);
        downpaymentAmount = Number(data.downpaymentAmount ?? details.downpaymentAmount ?? (totalAmount * 0.5));
    } else if (collectionName === 'orders') {
        totalAmount = Number(data.total ?? data.totalAmount ?? 0);
        downpaymentAmount = totalAmount; // Orders require full payment
    } else {
        totalAmount = Number(data.totalAmount ?? data.amount ?? 0);
        downpaymentAmount = totalAmount;
    }

    totalAmount = Math.max(0, totalAmount);
    downpaymentAmount = Math.max(0, downpaymentAmount);
    const remainingBalance = Math.max(0, Number((totalAmount - paidAmount).toFixed(2)));

    let finalAmount = 0;
    if (collectionName === 'orders') {
        finalAmount = totalAmount;
    } else if (isDeposit && paidAmount < (downpaymentAmount - 0.01)) {
        finalAmount = Number(downpaymentAmount.toFixed(2));
    } else if (kind === 'balance' || ref.includes('-BAL')) {
        finalAmount = remainingBalance > 0 ? remainingBalance : Number(totalAmount.toFixed(2));
    } else if (kind === 'full') {
        finalAmount = remainingBalance > 0 ? remainingBalance : Number(totalAmount.toFixed(2));
    } else {
        if (paidAmount < (downpaymentAmount - 0.01) && downpaymentAmount > 0) {
            finalAmount = Number(downpaymentAmount.toFixed(2));
        } else {
            finalAmount = remainingBalance > 0 ? remainingBalance : Number(totalAmount.toFixed(2));
        }
    }

    return {
        amount: Number(finalAmount.toFixed(2)),
        currency,
        isDeposit,
        totalAmount: Number(totalAmount.toFixed(2)),
        paidAmount: Number(paidAmount.toFixed(2)),
        remainingBalance: Number(remainingBalance.toFixed(2))
    };
}

// ---------------------------------------------------------------------------
// Reference / entity helpers
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

    if (entityId && entityId.length >= 4 && collectionName) {
        return { entityId, collectionName, isDeposit, entityKind: COLLECTION_ENTITY_KIND[collectionName] || '' };
    }
    return { entityId: '', collectionName: '', isDeposit, entityKind: '' };
}

function deriveTransactionId(referenceNumber, paymentRequestId) {
    const base = referenceNumber || paymentRequestId || '';
    const clean = String(base).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
    if (clean) return `tx_${clean}`;
    return `tx_${crypto.createHash('sha1').update(String(base) + Date.now()).digest('hex').slice(0, 16)}`;
}

async function locateTransaction({ transactionId, paymentRequestId, referenceNumber, paymentSessionId }) {
    const col = admin.firestore().collection('paymentTransactions');
    if (transactionId) {
        const snap = await col.doc(transactionId).get();
        if (snap.exists) return { id: snap.id, ref: snap.ref, data: snap.data() };
    }
    if (paymentSessionId) {
        const q = await col.where('paymentSessionId', '==', paymentSessionId).limit(1).get();
        if (!q.empty) return { id: q.docs[0].id, ref: q.docs[0].ref, data: q.docs[0].data() };
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

function computeEntityPaymentUpdate(entityData, { amount, reference, transactionId, kind, paymentMethod, paymentRequestId, collectionName }) {
    const currentPaid = Number(entityData.paidAmount || 0);
    const totalAmount = Number(entityData.totalAmount || entityData.totalPrice || (entityData.fees && entityData.fees.total) || entityData.total || 0);
    const existingTxs = Array.isArray(entityData.paymentTransactions) ? entityData.paymentTransactions : [];

    const isDuplicateRecord = (t) => !!t && (
        (transactionId && t.transactionId === transactionId) ||
        (reference && t.reference === reference)
    );
    const alreadyApplied = existingTxs.some(isDuplicateRecord);

    const newPaidAmount = alreadyApplied ? currentPaid : Number((currentPaid + amount).toFixed(2));
    const isFullyPaid = totalAmount > 0 ? newPaidAmount >= (totalAmount - 0.5) : true;
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
        remainingBalance: Math.max(0, Number((totalAmount - newPaidAmount).toFixed(2))),
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
        update.paymentMethod = 'Online (HitPay)';
        update.paymentGateway = 'hitpay';
        update.gcashPaymentStatus = admin.firestore.FieldValue.delete();

        if (isFullyPaid || kind === 'full') {
            update.paymentStatus = 'paid';
            update.isPaid = true;
            if (entityData.status === 'Work Done') {
                update.status = 'Completed';
            } else if (!entityData.status || entityData.status === 'Pending' || entityData.status === 'Upcoming') {
                update.status = 'Confirmed';
            }
        }
    } else if (collectionName === 'orders') {
        update.paymentStatus = 'paid';
        update.isPaid = true;
        if (!entityData.status || entityData.status === 'Pending') update.status = 'Processing';
    } else if (collectionName === 'rentalBookings') {
        if (isFullyPaid && entityData.status === 'Pending') update.status = 'Confirmed';
    } else if (collectionName === 'liaisonBookings') {
        if (!entityData.status || entityData.status === 'Booking Received') {
            update.status = isFullyPaid ? 'Confirmed' : 'Deposit Received';
        }
    } else if (collectionName === 'serviceRequests') {
        if (!entityData.status || entityData.status === 'Pending Admin Review') {
            update.status = isFullyPaid ? 'Confirmed' : 'Deposit Received';
        }
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
// Settlement — the single authoritative path to a terminal transaction state
// ---------------------------------------------------------------------------

function normalizeHitPayStatus(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'completed' || s === 'succeeded' || s === 'paid') return 'completed';
    if (s === 'failed') return 'failed';
    if (s === 'canceled' || s === 'cancelled') return 'canceled';
    if (s === 'expired') return 'expired';
    return s || 'pending';
}

async function writeTerminalStatus(txRef, terminal, fields) {
    const result = { status: terminal, changed: false };
    await admin.firestore().runTransaction(async (t) => {
        const snap = await t.get(txRef);
        if (!snap.exists) return;
        const data = snap.data();
        if (TERMINAL_STATUSES.includes(data.status)) {
            result.status = data.status;
            return;
        }
        const stateHistory = Array.isArray(data.stateHistory) ? [...data.stateHistory] : [];
        stateHistory.push({
            status: terminal,
            timestamp: new Date().toISOString(),
            reason: fields.failureReason || fields.cancelReason || ''
        });

        t.update(txRef, Object.assign({}, fields, {
            status: terminal,
            stateHistory,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }));
        result.changed = true;
    });
    return result;
}

/**
 * Read the gateway amount from a HitPay payment-request payload.
 *
 * ROOT-CAUSE FIX: HitPay returns amounts as COMMA-FORMATTED STRINGS
 * (e.g. `"1,750.00"`). `Number("1,750.00")` is NaN, so every completed
 * payment was blocked as `amount mismatch: gateway=NaN` and pushed into
 * PENDING_REVIEW — real payments never settled to PAID and the customer
 * stayed on "Verifying Payment" forever.
 *
 * Tolerates comma/thousands separators, string or numeric values, and
 * payloads where only payments[0].amount carries the amount.
 * Returns a finite number, or NaN when no readable amount exists.
 */
function parseGatewayAmount(pr) {
    if (!pr || typeof pr !== 'object') return NaN;
    const payments = Array.isArray(pr.payments) ? pr.payments : [];
    const candidates = [
        pr.amount,
        pr.payment_amount,
        pr.total_amount,
        payments[0] && payments[0].amount
    ];
    for (const raw of candidates) {
        if (raw === undefined || raw === null || raw === '') continue;
        const cleaned = String(raw).replace(/,/g, '').trim();
        const n = Number(cleaned);
        if (Number.isFinite(n)) return n;
    }
    return NaN;
}

/**
 * Idempotent settlement.
 *
 * params: { transactionId?, paymentRequestId?, referenceNumber?, webhookPayload?, trigger }
 */
async function settleTransaction(params) {
    const {
        transactionId = '',
        paymentRequestId = '',
        referenceNumber = '',
        paymentSessionId = '',
        webhookPayload = null,
        trigger = 'verify'
    } = params;

    const db = admin.firestore();
    const isFromWebhook = trigger === 'webhook';
    const webhookStatus = webhookPayload ? normalizeHitPayStatus(webhookPayload.status) : '';

    let located = await locateTransaction({ transactionId, paymentRequestId, referenceNumber, paymentSessionId });

    // --- Legacy / signed webhook retro creation fallback ---
    if (!located && webhookPayload) {
        const ref = referenceNumber || webhookPayload.reference_number || '';
        const parsed = parseReferenceEntity(ref);
        if (!parsed.entityId) {
            return { status: 'UNMATCHED', reason: `unrecognized reference: ${ref}` };
        }
        const prId = paymentRequestId || webhookPayload.payment_request_id || '';
        const docId = deriveTransactionId(ref, prId);
        const refDoc = db.collection('paymentTransactions').doc(docId);
        // Webhook amounts can be comma-formatted strings ("1,750.00") — parse
        // defensively so a NaN never lands in the stored transaction record.
        const retroParsedAmount = parseGatewayAmount({ amount: webhookPayload.amount });
        const amount = Number.isFinite(retroParsedAmount) ? retroParsedAmount : 0;
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
                status: 'WAITING_FOR_PAYMENT',
                verificationStatus: 'UNVERIFIED',
                hitpayStatus: webhookStatus || 'pending',
                retro: true,
                stateHistory: [{ status: 'WAITING_FOR_PAYMENT', timestamp: new Date().toISOString() }],
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

    // --- Idempotency check: terminal state is absorbing ---
    if (TERMINAL_STATUSES.includes(tx.status)) {
        return {
            status: tx.status,
            verificationStatus: tx.verificationStatus || '',
            transactionId: txId,
            alreadySettled: true
        };
    }

    const prId = paymentRequestId || tx.paymentRequestId || '';
    const ref = referenceNumber || tx.referenceNumber || '';
    let isSandbox = tx.environment === 'sandbox';

    /**
     * Non-fatal observability write: records WHY a verification attempt did
     * not settle, so a stuck "Verifying/Pending" transaction can be diagnosed
     * from Firestore without server logs.
     */
    const recordVerification = async (status, reason) => {
        try {
            await txRef.update({
                lastVerificationAt: admin.firestore.FieldValue.serverTimestamp(),
                lastVerificationTrigger: trigger,
                lastVerificationStatus: String(status || '').slice(0, 60),
                ...(reason ? { lastVerificationReason: String(reason).slice(0, 300) } : {})
            });
        } catch (_) { /* observability only — never block settlement */ }
    };

    // --- Terminal negative webhooks (failed / canceled) ---
    if (webhookStatus === 'failed' || webhookStatus === 'canceled') {
        const terminal = webhookStatus === 'failed' ? 'FAILED' : 'CANCELLED';
        const res = await writeTerminalStatus(txRef, terminal, {
            hitpayStatus: webhookStatus,
            failureReason: webhookPayload && (webhookPayload.message || webhookPayload.failure_reason) || 'Payment failed at gateway',
            webhookReceivedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { status: res.status, transactionId: txId, changed: res.changed };
    }

    // --- Direct HitPay status check (server-side verification) ---
    if (!prId) {
        await recordVerification('AWAITING_GATEWAY_VERIFICATION', 'missing payment_request_id');
        return {
            status: tx.status,
            verificationStatus: 'AWAITING_GATEWAY_VERIFICATION',
            transactionId: txId,
            reason: 'missing payment_request_id'
        };
    }

    const prResult = await fetchPaymentRequestWithEnvFallback(isSandbox, prId);
    if (prResult.environmentCorrected) {
        // Persist the healed environment so every future verification hits the
        // right credentials on the first try.
        await txRef.update({
            environment: prResult.environmentUsed,
            environmentCorrectedAt: admin.firestore.FieldValue.serverTimestamp()
        }).catch(() => { });
        isSandbox = prResult.environmentUsed === 'sandbox';
    }
    if (!prResult.ok) {
        await recordVerification('GATEWAY_UNAVAILABLE', prResult.reason || `http_${prResult.statusCode}`);
        return {
            status: tx.status,
            verificationStatus: 'GATEWAY_UNAVAILABLE',
            transactionId: txId,
            reason: prResult.reason || `http_${prResult.statusCode}`
        };
    }

    const pr = prResult.data || {};
    const prStatus = normalizeHitPayStatus(pr.status);

    // WEBHOOK RACE GUARD: HitPay can deliver a "payment completed" webhook a
    // moment BEFORE the payment request status flips to completed. If a
    // completed payment object already exists on the request, the money HAS
    // moved — treat the request as effectively completed instead of dropping
    // the settlement (which previously left transactions stuck in VERIFYING).
    const prPayments = Array.isArray(pr.payments) ? pr.payments : [];
    const hasCompletedPayment = prPayments.some((p) =>
        ['completed', 'succeeded', 'paid'].includes(String((p && p.status) || '').toLowerCase())
    );
    const effectivelyCompleted = prStatus === 'completed' || hasCompletedPayment;

    if (prStatus === 'failed' || prStatus === 'canceled' || prStatus === 'expired') {
        const terminal = prStatus === 'failed' ? 'FAILED' : prStatus === 'canceled' ? 'CANCELLED' : 'EXPIRED';
        const res = await writeTerminalStatus(txRef, terminal, {
            hitpayStatus: prStatus,
            failureReason: terminal === 'EXPIRED' ? 'Payment request expired' : 'Payment failed at gateway',
            ...(isFromWebhook ? { webhookReceivedAt: admin.firestore.FieldValue.serverTimestamp() } : {})
        });
        return { status: res.status, transactionId: txId, changed: res.changed };
    }

    if (!effectivelyCompleted) {
        await recordVerification('GATEWAY_PENDING', `gateway_status_${prStatus}`);
        return {
            status: tx.status,
            // Explicit marker so the client can distinguish "gateway has not
            // confirmed yet" from "server unreachable" and render honest copy
            // instead of spinning with "this usually takes a few seconds".
            verificationStatus: 'GATEWAY_PENDING',
            gatewayStatus: prStatus,
            transactionId: txId,
            reason: `gateway_status_${prStatus}`
        };
    }

    // --- Amount, currency, and reference match checks ---
    const prAmount = parseGatewayAmount(pr);
    const txAmount = Number(tx.amount);
    const amountOk = Number.isFinite(prAmount) && (txAmount > 0 ? Math.abs(prAmount - txAmount) <= 0.01 : true);
    const currencyOk = !tx.currency || !pr.currency || String(pr.currency).toUpperCase() === String(tx.currency).toUpperCase();
    const refOk = !tx.referenceNumber || !pr.reference_number || String(pr.reference_number) === String(tx.referenceNumber);

    if (!Number.isFinite(prAmount)) {
        // Money may have moved, but WE cannot read the gateway amount. That is
        // a verification failure on our side — never label it AMOUNT_MISMATCH
        // (old behaviour mislabelled real payments as suspicious and spammed a
        // new admin notification on every single client poll). Return a
        // retryable outcome instead so the webhook keeps redelivering and the
        // sweep keeps escalating until the payload shape is corrected.
        await recordVerification('GATEWAY_AMOUNT_UNREADABLE', `keys=${Object.keys(pr).slice(0, 30).join(',')}`);
        console.error(
            `[HitPay] Unreadable gateway amount [${txId}] pr=${prId}: ` +
            `amount=${JSON.stringify(pr.amount)} ` +
            `payment_amount=${JSON.stringify(pr.payment_amount)} ` +
            `payments[0].amount=${JSON.stringify(pr.payments && pr.payments[0] && pr.payments[0].amount)} ` +
            `keys=${Object.keys(pr).join(',')}`
        );
        return {
            status: tx.status,
            verificationStatus: 'GATEWAY_UNAVAILABLE',
            transactionId: txId,
            reason: 'gateway_amount_unreadable'
        };
    }

    if (!amountOk || !currencyOk || !refOk) {
        const reason = !amountOk ? `amount mismatch: gateway=${prAmount} expected=${txAmount}`
            : !currencyOk ? `currency mismatch: gateway=${pr.currency} expected=${tx.currency}`
                : `reference mismatch: gateway=${pr.reference_number} expected=${tx.referenceNumber}`;

        await txRef.update({
            status: 'PENDING_REVIEW',
            verificationStatus: !amountOk ? 'AMOUNT_MISMATCH' : !currencyOk ? 'CURRENCY_MISMATCH' : 'REFERENCE_MISMATCH',
            failureReason: reason,
            gatewayAmount: prAmount,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }).catch(() => { });

        // Alert admin for manual audit. Deduped per transaction: the client
        // polls every few seconds and the old `.add()` created one notification
        // PER POLL for a single mismatch.
        await db.collection('adminNotifications').doc(`PAYMENT_MISMATCH_${txId}`).set({
            type: 'PAYMENT_MISMATCH_REVIEW',
            transactionId: txId,
            paymentRequestId: prId,
            referenceNumber: ref,
            reason,
            gatewayAmount: prAmount,
            expectedAmount: txAmount,
            timesBlocked: admin.firestore.FieldValue.increment(1),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSeenAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch((e) => console.warn('adminNotifications create failed:', e.message));

        console.error(`[HitPay] Settlement blocked [${txId}]: ${reason}`);
        return { status: 'PENDING_REVIEW', verificationStatus: 'MISMATCH', transactionId: txId, reason };
    }

    // --- Atomic terminal transition to PAID + Entity update ---
    const entityKind = tx.entityKind;
    const entityId = tx.entityId;
    const collectionName = ENTITY_COLLECTIONS[entityKind] || '';
    const paymentMethod = tx.paymentMethod || pr.payment_type || 'HitPay (Online)';
    let entityUpdated = false;
    let finalStatus = 'PAID';

    await db.runTransaction(async (t) => {
        // 1. ALL READS FIRST
        const snap = await t.get(txRef);
        if (!snap.exists) throw new Error('transaction disappeared');
        const fresh = snap.data();
        if (TERMINAL_STATUSES.includes(fresh.status)) {
            finalStatus = fresh.status;
            return;
        }

        let eRef = null;
        let eSnap = null;
        if (collectionName && entityId) {
            eRef = db.collection(collectionName).doc(entityId);
            eSnap = await t.get(eRef);
        }

        // 2. ALL WRITES AFTER
        const nowIso = new Date().toISOString();
        const stateHistory = Array.isArray(fresh.stateHistory) ? [...fresh.stateHistory] : [];
        stateHistory.push({ status: 'PAID', timestamp: nowIso });

        t.update(txRef, {
            status: 'PAID',
            verificationStatus: 'VERIFIED',
            webhookVerified: isFromWebhook ? true : (fresh.webhookVerified || false),
            hitpayStatus: 'completed',
            hitpayPaymentId: (pr.payments && pr.payments[0] && pr.payments[0].id) || fresh.hitpayPaymentId || '',
            amount: txAmount > 0 ? txAmount : prAmount,
            paidAt: nowIso,
            verifiedAt: nowIso,
            stateHistory,
            ...(isFromWebhook ? { webhookReceivedAt: admin.firestore.FieldValue.serverTimestamp() } : {}),
            failureReason: '',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        if (eRef && eSnap && eSnap.exists) {
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
        } else if (collectionName && entityId) {
            console.error(`[HitPay] Settlement: entity ${collectionName}/${entityId} not found for tx ${txId}`);
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
    TRANSACTION_STATUSES,
    TERMINAL_STATUSES,
    ENTITY_COLLECTIONS,
    COLLECTION_ENTITY_KIND,
    resolveHitpayCredentials,
    resolveWebhookSalts,
    hitpayApi,
    fetchPaymentRequest,
    fetchPaymentRequestWithEnvFallback,
    computeLegacyHmac,
    computeRawBodyHmac,
    verifyWebhookSignature,
    timingSafeEqualString,
    calculateAuthoritativeAmount,
    parseReferenceEntity,
    parseGatewayAmount,
    deriveTransactionId,
    locateTransaction,
    computeEntityPaymentUpdate,
    normalizeHitPayStatus,
    settleTransaction
};
