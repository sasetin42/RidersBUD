import {
    PaymentState,
    transitionPaymentState,
    TERMINAL_STATES
} from './paymentStateMachine';
import { PaymentEntityKind } from '../../utils/firestoreCollections';
import { db as firestore } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { auth } from '../../firebase';

export interface HitPayInAppPluginInterface {
    openPayment(options: {
        checkoutUrl: string;
        sessionId?: string;
        amount?: string;
        reference?: string;
    }): Promise<{ success: boolean }>;
    closePayment(): Promise<{ success: boolean }>;
    isPaymentOpen(): Promise<{ isOpen: boolean }>;
    openProviderApp(options: { url: string }): Promise<{ success: boolean }>;
    addListener(
        eventName: 'paymentRedirect' | 'paymentClosed' | 'paymentError' | 'paymentOpened' | 'paymentProviderOpened' | 'paymentProviderReturned',
        listenerFunc: (data: any) => void
    ): Promise<any>;
}

export const HitPayInApp = registerPlugin<HitPayInAppPluginInterface>('HitPayInApp');

export interface PaymentInitiationParams {
    entityKind: PaymentEntityKind;
    entityId: string;
    kind?: 'downpayment' | 'balance' | 'full';
    expectedAmount?: number;
    currency?: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    customerId?: string;
    purpose?: string;
    preferredMethod?: 'card' | 'qrph' | 'gcash';
    returnRoute?: string;
    isSandbox?: boolean;
    userConfirmedRetry?: boolean;
    onStateChange?: (state: PaymentState, message?: string, tx?: any) => void;
}

export interface PaymentControllerResult {
    success: boolean;
    state: PaymentState;
    redirected?: boolean;
    checkoutUrl?: string;
    paymentSessionId?: string;
    transactionId?: string;
    paymentRequestId?: string;
    referenceNumber?: string;
    amount?: number;
    currency?: string;
    checkoutMode?: 'card_dropin' | 'qrph_dropin' | 'qrph_native' | 'gcash_direct' | 'portal_fallback' | 'dropin';
    qrCodeData?: string;
    directLinkAppUrl?: string;
    directLinkUrl?: string;
    errorMessage?: string;
}

const STORAGE_ACTIVE_PAYMENT = 'rb_active_payment_session';
const VERIFY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes timeout -> PENDING

/**
 * PaymentController:
 * Single central orchestrator for initiating payment requests, checking active sessions,
 * listening to Firestore paymentTransactions snapshot, and managing timeouts.
 */
export class PaymentController {
    private static activePromises = new Map<string, Promise<PaymentControllerResult>>();
    private static sessionState = new Map<string, PaymentState>();
    private static snapshotUnsubscribers = new Map<string, () => void>();

    /**
     * Check if any payment is currently in an active, non-terminal state.
     */
    static isPaymentInProgress(): boolean {
        return this.activePromises.size > 0;
    }

    /**
     * Initiate or join an in-flight payment request.
     */
    static async pay(params: PaymentInitiationParams): Promise<PaymentControllerResult> {
        const {
            entityKind,
            entityId,
            kind = 'full'
        } = params;

        if (!entityKind || !entityId) {
            throw new Error('Both entityKind and entityId are required to initiate payment.');
        }

        const lockKey = `${entityKind}:${entityId}:${kind}`;
        const existingPromise = this.activePromises.get(lockKey);
        if (existingPromise) {
            // Re-entrant / double tap: join existing in-flight request
            return existingPromise;
        }

        if (this.activePromises.size > 0 && !params.userConfirmedRetry) {
            return {
                success: false,
                state: 'FAILED',
                errorMessage: 'A payment session is already active. Please wait or complete it.'
            };
        }

        const runPromise = this.executePaymentFlow(params, lockKey);
        this.activePromises.set(lockKey, runPromise);

        try {
            return await runPromise;
        } finally {
            this.activePromises.delete(lockKey);
        }
    }

    private static async getAuthToken(): Promise<string | null> {
        try {
            if (auth && auth.currentUser) {
                return await auth.currentUser.getIdToken();
            }
        } catch (e) {
            console.warn('[PaymentController] Unable to fetch Firebase ID token:', e);
        }
        return null;
    }

    private static async executePaymentFlow(
        params: PaymentInitiationParams,
        lockKey: string
    ): Promise<PaymentControllerResult> {
        const {
            entityKind,
            entityId,
            kind = 'full',
            expectedAmount,
            currency = 'PHP',
            customerEmail,
            customerName,
            customerPhone,
            customerId,
            purpose,
            preferredMethod = 'card',
            returnRoute = window?.location?.pathname || '/customer-portal/',
            isSandbox = true,
            userConfirmedRetry = false,
            onStateChange
        } = params;

        let currentState: PaymentState = 'CREATED';
        const setState = (next: PaymentState, msg?: string, tx?: any) => {
            currentState = transitionPaymentState(currentState, next, msg);
            this.sessionState.set(lockKey, currentState);
            onStateChange?.(currentState, msg, tx);
        };

        try {
            setState('INITIALIZING', 'Contacting payment server...');

            const token = await this.getAuthToken();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const isNative = Capacitor.isNativePlatform();
            const proxyBase = isNative ? 'https://ridersbud-10806.web.app/api/hitpay-proxy' : '/api/hitpay-proxy';

            const resp = await fetch(proxyBase, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: 'create',
                    entityKind,
                    entityId,
                    kind,
                    expectedAmount,
                    currency,
                    preferredMethod,
                    customerId: customerId || auth?.currentUser?.uid || '',
                    customerEmail,
                    customerName,
                    customerPhone,
                    purpose,
                    returnRoute,
                    isSandbox,
                    userConfirmedRetry
                })
            });

            const data = await resp.json().catch(() => null);

            if (!resp.ok || !data) {
                const err = data?.error || data?.message || `Payment server error: HTTP ${resp.status}`;
                setState('FAILED', err);
                return {
                    success: false,
                    state: 'FAILED',
                    errorMessage: err
                };
            }

            // Already paid server-side
            if (data.alreadyPaid || data.status === 'PAID') {
                setState('PAID', 'Payment is already completed.');
                return {
                    success: true,
                    state: 'PAID',
                    transactionId: data.transactionId,
                    paymentSessionId: data.paymentSessionId,
                    referenceNumber: data.referenceNumber,
                    amount: data.amount,
                    currency: data.currency
                };
            }

            const {
                paymentSessionId,
                transactionId,
                paymentRequestId,
                referenceNumber,
                amount,
                checkoutMode,
                checkoutUrl,
                qrCodeData,
                directLinkAppUrl,
                directLinkUrl
            } = data;

            // Persist session to local storage for crash/background recovery
            try {
                localStorage.setItem(STORAGE_ACTIVE_PAYMENT, JSON.stringify({
                    paymentSessionId,
                    transactionId,
                    paymentRequestId,
                    referenceNumber,
                    entityKind,
                    entityId,
                    kind,
                    startedAt: Date.now()
                }));
            } catch (e) {
                // ignore storage failures
            }

            // Start listening to the authoritative paymentTransactions doc in Firestore
            if (transactionId) {
                this.listenToTransaction(transactionId, (txState, txMsg, txDoc) => {
                    if (currentState !== txState && !TERMINAL_STATES.has(currentState)) {
                        setState(txState, txMsg, txDoc);
                    }
                });
            }

            // Route presentation by checkoutMode
            if (checkoutMode === 'qrph_native' && qrCodeData) {
                setState('CHECKOUT_OPEN', 'QR Ph generated. Please scan to complete payment.');
                setState('WAITING_FOR_PAYMENT', 'Awaiting QR Ph confirmation...');
                return {
                    success: true,
                    state: currentState,
                    paymentSessionId,
                    transactionId,
                    paymentRequestId,
                    referenceNumber,
                    amount,
                    currency,
                    checkoutMode,
                    qrCodeData
                };
            }

            if (checkoutMode === 'gcash_direct') {
                setState('CHECKOUT_OPEN', 'Launching GCash...');
                const targetUrl = directLinkAppUrl || directLinkUrl;
                if (isNative && directLinkAppUrl) {
                    try {
                        await HitPayInApp.openProviderApp({ url: directLinkAppUrl });
                    } catch (e) {
                        if (directLinkUrl) {
                            window.open(directLinkUrl, '_system');
                        }
                    }
                } else if (targetUrl) {
                    window.location.href = targetUrl;
                }
                setState('WAITING_FOR_PAYMENT', 'Waiting for GCash payment confirmation...');
                return {
                    success: true,
                    state: currentState,
                    paymentSessionId,
                    transactionId,
                    paymentRequestId,
                    referenceNumber,
                    amount,
                    currency,
                    checkoutMode,
                    directLinkAppUrl,
                    directLinkUrl
                };
            }

            // Card / dropin modal or native container
            if (checkoutUrl) {
                setState('CHECKOUT_OPEN', 'Opening secure checkout...');
                if (isNative) {
                    try {
                        await HitPayInApp.openPayment({
                            checkoutUrl,
                            sessionId: paymentSessionId,
                            amount: amount ? String(amount) : undefined,
                            reference: referenceNumber
                        });
                    } catch (nativeErr: any) {
                        console.warn('[PaymentController] Native container error:', nativeErr);
                    }
                } else if (typeof window !== 'undefined') {
                    window.location.href = checkoutUrl;
                }

                return {
                    success: true,
                    redirected: true,
                    state: 'CHECKOUT_OPEN',
                    checkoutMode: 'dropin',
                    checkoutUrl,
                    paymentSessionId,
                    transactionId,
                    paymentRequestId,
                    referenceNumber,
                    amount,
                    currency
                };
            }

            setState('WAITING_FOR_PAYMENT', 'Waiting for payment...');
            return {
                success: true,
                state: currentState,
                paymentSessionId,
                transactionId,
                paymentRequestId,
                referenceNumber,
                amount,
                currency,
                checkoutMode
            };

        } catch (err: any) {
            const msg = err?.message || 'Payment initiation failed';
            setState('FAILED', msg);
            return {
                success: false,
                state: 'FAILED',
                errorMessage: msg
            };
        }
    }

    /**
     * Realtime Firestore listener for transaction settlement.
     */
    private static listenToTransaction(
        transactionId: string,
        onUpdate: (state: PaymentState, msg: string, txDoc: any) => void
    ) {
        if (!firestore || !transactionId) return;

        // Cleanup existing listener if any
        const existingUnsub = this.snapshotUnsubscribers.get(transactionId);
        if (existingUnsub) {
            existingUnsub();
            this.snapshotUnsubscribers.delete(transactionId);
        }

        const timer = setTimeout(() => {
            // 5 minute timeout -> PENDING
            onUpdate('PENDING', 'Payment confirmation is still pending after 5 minutes. We will notify you once confirmed.', null);
            this.stopListening(transactionId);
        }, VERIFY_TIMEOUT_MS);

        try {
            const txDocRef = doc(firestore, 'paymentTransactions', transactionId);
            const unsub = onSnapshot(txDocRef, (snap) => {
                if (!snap.exists()) return;
                const data = snap.data();
                const status = (data.status || '').toUpperCase();

                if (status === 'PAID') {
                    clearTimeout(timer);
                    onUpdate('PAID', 'Payment verified successfully!', data);
                    this.stopListening(transactionId);
                    this.clearStoredSession();
                } else if (status === 'FAILED') {
                    clearTimeout(timer);
                    onUpdate('FAILED', data.failureReason || 'Payment failed.', data);
                    this.stopListening(transactionId);
                    this.clearStoredSession();
                } else if (status === 'CANCELLED') {
                    clearTimeout(timer);
                    onUpdate('CANCELLED', data.cancelReason || 'Payment was cancelled.', data);
                    this.stopListening(transactionId);
                    this.clearStoredSession();
                } else if (status === 'EXPIRED') {
                    clearTimeout(timer);
                    onUpdate('EXPIRED', 'Payment session expired.', data);
                    this.stopListening(transactionId);
                    this.clearStoredSession();
                } else if (status === 'VERIFYING') {
                    onUpdate('VERIFYING', 'Verifying payment with payment network...', data);
                }
            });

            this.snapshotUnsubscribers.set(transactionId, () => {
                clearTimeout(timer);
                unsub();
            });
        } catch (e) {
            console.warn('[PaymentController] Snapshot listener failed:', e);
        }
    }

    private static stopListening(transactionId: string) {
        const unsub = this.snapshotUnsubscribers.get(transactionId);
        if (unsub) {
            unsub();
            this.snapshotUnsubscribers.delete(transactionId);
        }
    }

    private static clearStoredSession() {
        try {
            localStorage.removeItem(STORAGE_ACTIVE_PAYMENT);
        } catch {}
    }

    /**
     * Restore session if app resumes.
     */
    static getStoredActiveSession(): any | null {
        try {
            const raw = localStorage.getItem(STORAGE_ACTIVE_PAYMENT);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }
}
