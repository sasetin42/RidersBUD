import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { 
    ShieldCheck, 
    Lock, 
    CreditCard, 
    QrCode, 
    Smartphone, 
    XCircle, 
    Clock, 
    Building2, 
    CheckCircle2, 
    AlertCircle, 
    ArrowRight, 
    RefreshCw, 
    ChevronRight,
    ChevronLeft,
    Sparkles,
    ExternalLink,
    Copy,
    Check
} from 'lucide-react';
import { HitPayService } from '../services/HitPayService';
import { useDatabase } from '../context/DatabaseContext';
import { openPaymentUrl, PaymentEntityKind } from '../utils/paymentRedirect';
import { watchPaymentReturnVerification } from '../utils/paymentReturn';

/**
 * Resolve the Firestore entity behind a HitPay reference number
 * (BOK-/RNT-/LIA-/TOW-/DRV-/ORD- prefixes) so the return flow can watch the
 * webhook's authoritative write instead of trusting redirect parameters.
 */
const parseReferenceEntity = (ref: string): { kind: PaymentEntityKind; id: string } | null => {
    if (!ref) return null;
    const parts = ref.split('-');
    if (parts.length < 2 || !parts[1]) return null;
    const prefix = (parts[0] || '').toUpperCase();
    if (prefix === 'BOK') return { kind: 'booking', id: parts[1] };
    if (prefix === 'RNT' || prefix === 'RN') return { kind: 'rental', id: parts[1] };
    if (prefix === 'LIA') return { kind: 'liaison', id: parts[1] };
    if (prefix === 'TOW' || prefix === 'DRV') return { kind: 'service-request', id: parts[1] };
    if (prefix === 'ORD') return { kind: 'order', id: parts[1] };
    return null;
};

type PaymentMethodType = 'gcash' | 'qrph' | 'card' | 'maya';

interface PaymentMethodOption {
    id: PaymentMethodType;
    name: string;
    description: string;
    badge: string;
    badgeColor: string;
    icon: React.ReactNode;
    hitpayMethodCode: string;
}

export const HitPayCheckoutScreen: React.FC = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { db } = useDatabase();

    // Parse parameters from query string or location state
    const locationState = (location.state as any) || {};
    const amount = Number(searchParams.get('amount') || locationState.amount || 3250);
    const currency = searchParams.get('currency') || locationState.currency || 'PHP';
    const referenceNumber = searchParams.get('reference_number') || searchParams.get('reference') || locationState.reference_number || `REF-${Date.now()}`;
    const redirectUrl = searchParams.get('redirect_url') || locationState.redirect_url || '/customer-portal/';
    const email = searchParams.get('email') || locationState.email || 'customer@ridersbud.com';
    const name = searchParams.get('name') || locationState.name || 'Valued Customer';
    const phone = searchParams.get('phone') || locationState.phone || '09171234567';
    const purpose = searchParams.get('purpose') || locationState.purpose || 'RidersBUD Service Payment';
    // Prioritize authoritative system settings: default to LIVE unless explicitly requested sandbox
    const isSandbox = searchParams.get('sandbox') === 'true' || 
        (searchParams.get('sandbox') !== 'false' && locationState.isSandbox === true) || 
        (db?.settings?.hitpaySandboxMode === true && searchParams.get('sandbox') !== 'false' && locationState.isSandbox !== false);
    const preselectedMethod = searchParams.get('method') as PaymentMethodType | null;

    // Checkout Lifecycle States: 'idle' | 'processing' | 'redirecting' | 'verifying' | 'completed' | 'failed' | 'cancelled' | 'expired'
    const [checkoutState, setCheckoutState] = useState<
        'idle' | 'processing' | 'redirecting' | 'verifying' | 'pending' | 'completed' | 'failed' | 'cancelled' | 'expired'
    >(() => {
        const status = searchParams.get('status') || searchParams.get('hitpay');
        if (status === 'completed' || status === 'success') return 'verifying';
        if (status === 'canceled' || status === 'cancelled') return 'cancelled';
        if (status === 'failed') return 'failed';
        return 'idle';
    });

    const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>(preselectedMethod || 'gcash');
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [timeLeft, setTimeLeft] = useState(900); // 15 minutes session timer
    const [verifiedTx, setVerifiedTx] = useState<{
        paymentRequestId?: string;
        reference?: string;
        amount?: number;
        method?: string;
        paidAt?: string;
    } | null>(null);
    const [copiedRef, setCopiedRef] = useState<boolean>(false);

    const handleCopyReference = (refText: string) => {
        try {
            navigator.clipboard.writeText(refText);
            setCopiedRef(true);
            setTimeout(() => setCopiedRef(false), 2000);
        } catch (e) {
            console.warn('Clipboard write error:', e);
        }
    };

    // High-Performance Pre-warming Cache: silences network latency by pre-creating session in background
    const prewarmedSessions = useRef<Map<string, { url: string; id: string }>>(new Map());
    const isPrewarmingRef = useRef<boolean>(false);

    // NOTE: mount-time pre-warming was removed — it created a HitPay payment
    // request per payment method before the customer ever tapped Pay (duplicate
    // sessions). The backend now reuses a pending session per reference, so the
    // on-click path is both fast and duplicate-safe.

    // Dynamic Payment Methods list adhering to branding and high mobile clarity
    const paymentMethods: PaymentMethodOption[] = useMemo(() => [
        {
            id: 'gcash',
            name: 'GCash',
            description: 'Instant mobile e-wallet & QR Ph scan via GCash App',
            badge: 'Most Popular',
            badgeColor: 'bg-[#005CEE]/20 text-[#2B7FFF] border-[#005CEE]/40',
            hitpayMethodCode: 'gcash',
            icon: (
                <div className="w-11 h-11 rounded-2xl bg-[#005CEE] flex items-center justify-center text-white font-black text-lg shadow-lg shadow-[#005CEE]/30 shrink-0 border border-white/10">
                    G
                </div>
            )
        },
        {
            id: 'qrph',
            name: 'QR Ph National QR',
            description: 'Scan with BDO, BPI, Maya, UnionBank, RCBC & 40+ banks',
            badge: 'BSP Standard',
            badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
            hitpayMethodCode: 'qrph',
            icon: (
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/30 shrink-0 border border-white/10">
                    <QrCode size={22} />
                </div>
            )
        },
        {
            id: 'card',
            name: 'Credit / Debit Card',
            description: 'Visa, Mastercard, JCB with 3D Secure bank OTP protection',
            badge: 'Zero Surcharge',
            badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
            hitpayMethodCode: 'card',
            icon: (
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 shrink-0 border border-white/10">
                    <CreditCard size={22} />
                </div>
            )
        },
        {
            id: 'maya',
            name: 'Maya Wallet',
            description: 'Fast digital payment using your verified Maya balance',
            badge: 'Instant',
            badgeColor: 'bg-[#00B14F]/20 text-[#00E676] border-[#00B14F]/40',
            hitpayMethodCode: 'paymaya',
            icon: (
                <div className="w-11 h-11 rounded-2xl bg-[#00B14F] flex items-center justify-center text-white font-black text-lg shadow-lg shadow-[#00B14F]/30 shrink-0 border border-white/10">
                    M
                </div>
            )
        }
    ], []);

    // Session Timer Countdown
    useEffect(() => {
        if (checkoutState !== 'idle') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setCheckoutState('expired');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [checkoutState]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Auto-verify if returning from HitPay with query status
    useEffect(() => {
        const queryStatus = searchParams.get('status') || searchParams.get('hitpay');
        const reqId = searchParams.get('payment_request_id') || searchParams.get('id');
        const ref = searchParams.get('reference') || referenceNumber;

        if ((queryStatus === 'completed' || queryStatus === 'success') && checkoutState === 'verifying') {
            setStatusMessage('Verifying your payment with HitPay...');

            // The redirect is NOT proof of payment (requirement #8): verify through
            // the backend status endpoint and the webhook's Firestore write only.
            const entity = parseReferenceEntity(ref);

            if (entity && reqId) {
                const stop = watchPaymentReturnVerification({
                    entityKind: entity.kind,
                    entityId: entity.id,
                    paymentRequestId: reqId,
                    isSandbox,
                    timeoutMs: 90 * 1000,
                    onState: (state, message) => {
                        setStatusMessage(message);
                        if (state === 'PAID') {
                            setVerifiedTx({
                                paymentRequestId: reqId,
                                reference: ref,
                                amount,
                                method: 'HitPay (Online)',
                                paidAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            });
                            setCheckoutState('completed');
                        } else if (state === 'FAILED') {
                            setErrorMessage(message);
                            setCheckoutState('failed');
                        } else if (state === 'CANCELLED') {
                            setCheckoutState('cancelled');
                        } else if (state === 'PENDING') {
                            setCheckoutState('pending');
                        }
                        // VERIFYING keeps the spinner with an honest message
                    },
                    onVerified: () => {}
                });
                return stop;
            }

            // No watchable entity — poll the backend status endpoint directly
            // (server → HitPay API). Never trust the redirect parameters.
            const hitpay = HitPayService.fromSettings(db?.settings, isSandbox);
            let attempts = 0;
            let disposed = false;
            let pollTimer: any = null;

            const verifyTransaction = async () => {
                if (disposed) return;
                try {
                    const statusData = reqId ? await hitpay.getPaymentStatus(reqId) : null;
                    if (statusData && (statusData.status === 'completed' || statusData.status === 'succeeded')) {
                        setVerifiedTx({
                            paymentRequestId: reqId || `req_${Date.now()}`,
                            reference: ref,
                            amount,
                            method: statusData.payment_type || statusData.payment_method || 'HitPay',
                            paidAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        });
                        setCheckoutState('completed');
                        return;
                    }
                } catch (e: any) {
                    console.warn('Verification check notice:', e?.message);
                }

                if (disposed) return;
                attempts += 1;
                if (attempts >= 6) {
                    setStatusMessage('We have not received a confirmation from HitPay yet. If your payment went through, we will notify you automatically once it is confirmed.');
                    setCheckoutState('pending');
                    return;
                }
                setStatusMessage('Verifying your payment with HitPay...');
                pollTimer = setTimeout(verifyTransaction, 4000);
            };

            pollTimer = setTimeout(verifyTransaction, 1500);
            return () => {
                disposed = true;
                clearTimeout(pollTimer);
            };
        }
    }, [searchParams, checkoutState, db?.settings, isSandbox, referenceNumber, amount]);

    // Handle primary action: Create official HitPay payment session
    const handleInitiatePayment = async () => {
        const selectedOption = paymentMethods.find(m => m.id === selectedMethod);
        const channelMethodCode = selectedOption ? selectedOption.hitpayMethodCode : 'gcash';

        // Check if session was already pre-warmed in the background for 0ms instant launch
        const cachedSession = prewarmedSessions.current.get(channelMethodCode);
        if (cachedSession && cachedSession.url) {
            if (cachedSession.url.startsWith('https://') || cachedSession.url.startsWith('http://')) {
                setCheckoutState('redirecting');
                setStatusMessage('Opening HitPay checkout...');
                try {
                    await openPaymentUrl(cachedSession.url);
                } catch (error: any) {
                    console.error('Unable to open prewarmed HitPay checkout:', error);
                    setErrorMessage(error?.message || 'Unable to open HitPay checkout. Please try again.');
                    setCheckoutState('failed');
                }
                return;
            }
        }

        setCheckoutState('processing');
        setStatusMessage('Connecting to HitPay Secure Gateway...');
        setErrorMessage('');

        try {
            const hitpay = HitPayService.fromSettings(db?.settings, isSandbox);
            const channelMethod = [channelMethodCode];

            setStatusMessage(`Creating secure ${selectedOption?.name || 'HitPay'} checkout session...`);

            // Return URL after user completes or cancels in HitPay
            let returnRedirectUrl = redirectUrl;
            try {
                const urlObj = new URL(redirectUrl.startsWith('http') ? redirectUrl : `${window.location.origin}${redirectUrl}`);
                urlObj.searchParams.set('reference', referenceNumber);
                urlObj.searchParams.set('amount', String(amount));
                returnRedirectUrl = urlObj.toString();
            } catch (e) {
                returnRedirectUrl = `${window.location.origin}${redirectUrl}`;
            }

            const paymentRequest = {
                amount,
                currency,
                reference_number: referenceNumber,
                webhook: 'https://ridersbud-10806.web.app/api/hitpay-webhook',
                redirect_url: returnRedirectUrl,
                email,
                name,
                phone,
                purpose,
                payment_methods: channelMethod,
                entityKind: locationState.entityKind || searchParams.get('entityKind') || undefined,
                entityId: locationState.entityId || searchParams.get('entityId') || searchParams.get('bookingId') || undefined,
                customerId: locationState.customerId || searchParams.get('customerId') || undefined,
                kind: locationState.kind || searchParams.get('kind') || undefined
            };

            const { url, id } = await hitpay.createPaymentRequest(paymentRequest);

            // Store in prewarm cache for subsequent re-clicks
            if (url) {
                prewarmedSessions.current.set(channelMethodCode, { url, id });
            }

            setCheckoutState('redirecting');
            setStatusMessage('Opening HitPay checkout...');

            // Official HitPay checkout URLs send 'frame-ancestors self ecwid.com' which prohibits iframe framing.
            // Launch via openPaymentUrl (Chrome Custom Tab on native Android, top-level window redirect on web)
            if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
                await openPaymentUrl(url);
                return;
            }

            // If proxy returned an in-app fallback portal route (gateway unreachable):
            // NEVER fabricate a successful payment. Sandbox keeps its local simulation
            // (no real money); live mode reports the failure honestly.
            if (url && url.startsWith('/')) {
                // NEVER fabricate a success state — sandbox included. The gateway is
                // unreachable: report honestly and let the customer retry.
                throw new Error('The HitPay gateway is currently unreachable. Please try again in a moment.');
            }

            throw new Error('Unable to obtain payment session URL from HitPay gateway.');
        } catch (err: any) {
            console.error('HitPay Initiation Error:', err);
            setErrorMessage(err?.message || 'Failed to connect to HitPay. Please try again or choose another method.');
            setCheckoutState('failed');
        }
    };

    // Return to merchant app
    const handleReturnToApp = (statusType: 'completed' | 'canceled' | 'failed') => {
        try {
            const hasProtocol = redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://');
            const targetUrl = hasProtocol ? new URL(redirectUrl) : new URL(redirectUrl, window.location.origin);

            targetUrl.searchParams.set('status', statusType);
            targetUrl.searchParams.set('hitpay', statusType);
            targetUrl.searchParams.set('reference', referenceNumber);
            targetUrl.searchParams.set('amount', String(amount));

            if (verifiedTx?.paymentRequestId) {
                targetUrl.searchParams.set('payment_request_id', verifiedTx.paymentRequestId);
            }

            // If the target URL is on the same origin, navigate via react-router to keep SPA state intact
            if (!hasProtocol || targetUrl.origin === window.location.origin) {
                const relativePath = targetUrl.pathname + targetUrl.search + targetUrl.hash;
                navigate(relativePath, { replace: true });
                return;
            }

            window.location.href = targetUrl.toString();
        } catch (e) {
            navigate(`${redirectUrl}?status=${statusType}&hitpay=${statusType}&reference=${referenceNumber}&amount=${amount}`, { replace: true });
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0C10] text-white flex flex-col items-center justify-center p-3 sm:p-6 font-sans relative overflow-x-hidden selection:bg-[#FE7803] selection:text-white">
            {/* Ambient Brand Glow */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[380px] bg-[#FE7803]/10 blur-[140px] rounded-full pointer-events-none" />
            <div className="fixed bottom-0 right-10 w-[500px] h-[350px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />

            {/* Main Checkout Container */}
            <div className="w-full max-w-xl bg-[#13141B] border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col my-auto animate-fade-in backdrop-blur-xl">
                
                {/* 1. Header: SaSe Web Solutions & RidersBUD Branded Bar (Responsive Multi-tier Layout) */}
                <div className="bg-[#181A24] px-4 sm:px-6 py-4 border-b border-white/10 flex flex-col gap-3.5">
                    {/* Top Utility Row: Back Button + Timer + SSL Badge */}
                    <div className="flex items-center justify-between w-full">
                        <button
                            type="button"
                            onClick={() => handleReturnToApp('canceled')}
                            className="inline-flex items-center gap-1.5 text-gray-300 hover:text-white text-xs font-semibold py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 transition-all"
                            title="Cancel payment and return to app"
                        >
                            <ChevronLeft size={16} />
                            <span>Back</span>
                        </button>

                        <div className="flex items-center gap-2">
                            {checkoutState === 'idle' && (
                                <div className="flex items-center gap-1.5 bg-[#0D0E14] border border-white/10 px-2.5 py-1 rounded-xl text-xs font-mono font-bold text-gray-200 shadow-inner">
                                    <Clock size={13} className="text-[#FE7803] animate-pulse" />
                                    <span>{formatTime(timeLeft)}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                <Lock size={11} />
                                <span>256-Bit SSL</span>
                            </div>
                        </div>
                    </div>

                    {/* Brand Row: SaSe Logo + Title + Verified Badge */}
                    <div className="flex items-center gap-3 pt-0.5">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#FE7803] via-orange-600 to-amber-700 flex items-center justify-center shadow-lg shadow-[#FE7803]/25 shrink-0 p-2 border border-white/15">
                            <img 
                                src="/ridersbud_logo_white.png" 
                                alt="RidersBUD" 
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                    if (e.currentTarget.parentElement) {
                                        e.currentTarget.parentElement.innerHTML = '<span class="text-white font-black text-xl tracking-tighter">RB</span>';
                                    }
                                }}
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                                    SaSe Web Solutions
                                </h1>
                                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                    <CheckCircle2 size={10} /> Verified
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5 truncate">
                                <Building2 size={12} className="text-[#FE7803] shrink-0" />
                                <span className="truncate">RidersBUD Automotive Official Payment</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. BODY CONTENT (Conditional based on Lifecycle State) */}
                <div className="p-4 sm:p-7 space-y-5 sm:space-y-6">

                    {/* STATE: IDLE (Standard Checkout UI) */}
                    {checkoutState === 'idle' && (
                        <>
                            {/* Summary Card with Realtime Details */}
                            <div className="bg-gradient-to-br from-[#1B1D29] via-[#161722] to-[#12131D] border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl space-y-4">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
                                            Amount to Pay
                                        </span>
                                        {isSandbox ? (
                                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                                <AlertCircle size={10} /> HitPay Sandbox
                                            </span>
                                        ) : (
                                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                                <CheckCircle2 size={10} /> HitPay Live
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                                            ₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-sm font-bold text-[#FE7803]">{currency}</span>
                                    </div>

                                    <div className="text-xs text-gray-300 font-medium leading-relaxed bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2">
                                        {purpose}
                                    </div>
                                </div>

                                {/* Order / Reference Details Card */}
                                <div className="bg-[#0D0E14]/90 border border-white/10 rounded-xl p-3.5 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            Invoice / Reference No.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => handleCopyReference(referenceNumber)}
                                            className="text-[10px] text-gray-300 hover:text-white flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-lg border border-white/10 transition-colors"
                                            title="Copy invoice reference"
                                        >
                                            {copiedRef ? (
                                                <>
                                                    <Check size={11} className="text-emerald-400" />
                                                    <span className="text-emerald-400 font-bold">Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={11} />
                                                    <span>Copy</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <p className="text-xs font-mono font-bold text-amber-300 tracking-wide break-all select-all">
                                        {referenceNumber}
                                    </p>

                                    {/* Realtime Customer Live Details */}
                                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400 flex-wrap gap-2">
                                        <span className="truncate max-w-[180px] sm:max-w-none text-gray-300">
                                            👤 {name}
                                        </span>
                                        <span className="truncate text-gray-400">
                                            ✉️ {email}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method Selector */}
                            <div>
                                <div className="flex items-center justify-between mb-3 px-0.5">
                                    <span className="text-xs font-black uppercase tracking-wider text-gray-300">
                                        Select HitPay Payment Method
                                    </span>
                                    <span className="text-[11px] text-[#FE7803] font-medium flex items-center gap-1">
                                        <Sparkles size={12} /> Official Gateways
                                    </span>
                                </div>

                                <div className="space-y-2.5">
                                    {paymentMethods.map(method => {
                                        const isSelected = selectedMethod === method.id;
                                        return (
                                            <button
                                                key={method.id}
                                                type="button"
                                                onClick={() => setSelectedMethod(method.id)}
                                                className={`w-full p-3.5 sm:p-4 rounded-2xl border transition-all text-left flex items-start sm:items-center justify-between gap-3 ${
                                                    isSelected
                                                        ? 'bg-gradient-to-r from-white/[0.08] to-white/[0.03] border-[#FE7803] shadow-lg shadow-[#FE7803]/15 ring-1 ring-[#FE7803]'
                                                        : 'bg-[#181A24] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                                                }`}
                                            >
                                                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                                                    {method.icon}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-sm sm:text-base text-white">{method.name}</span>
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${method.badgeColor}`}>
                                                                {method.badge}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-1 leading-snug">
                                                            {method.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 sm:mt-0 ${
                                                    isSelected ? 'border-[#FE7803] bg-[#FE7803]' : 'border-white/20'
                                                }`}>
                                                    {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Security Notice */}
                            <div className="bg-[#0D0E14] border border-white/5 rounded-2xl p-3.5 flex items-start gap-3">
                                <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                                <div className="text-xs text-gray-400 leading-relaxed">
                                    <p className="text-gray-300 font-semibold">End-to-End Encrypted Checkout</p>
                                    <p className="text-[11px] mt-0.5">
                                        Your payment is securely processed directly with HitPay. RidersBUD never stores confidential card credentials, MPINs, or OTPs.
                                    </p>
                                </div>
                            </div>

                            {/* Main CTA */}
                            <div className="space-y-3 pt-1">
                                <button
                                    type="button"
                                    onClick={handleInitiatePayment}
                                    className="w-full bg-gradient-to-r from-[#FE7803] via-orange-500 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white font-black text-base py-4 rounded-2xl shadow-xl shadow-[#FE7803]/25 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.99]"
                                >
                                    <Lock size={18} />
                                    <span>Pay PHP {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    <ArrowRight size={18} />
                                </button>

                                <div className="text-center">
                                    <span className="text-[11px] text-gray-400 font-medium">
                                        Secure payment powered by <strong className="text-gray-200">HitPay</strong>
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleReturnToApp('canceled')}
                                    className="w-full bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-semibold text-xs py-2.5 rounded-xl transition-all"
                                >
                                    Cancel and return to RidersBUD
                                </button>
                            </div>
                        </>
                    )}

                    {/* STATE: PROCESSING / REDIRECTING */}
                    {(checkoutState === 'processing' || checkoutState === 'redirecting') && (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-[#FE7803] animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Lock size={20} className="text-[#FE7803]" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{statusMessage || 'Connecting to HitPay...'}</h3>
                                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                                    Please do not refresh or close this tab while we establish a secure session with HitPay.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STATE: VERIFYING */}
                    {checkoutState === 'verifying' && (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin flex items-center justify-center">
                                <RefreshCw size={22} className="text-emerald-400 animate-spin" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Verifying your payment...</h3>
                                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                                    {statusMessage || 'Confirming your transaction with HitPay. This only takes a moment.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STATE: PENDING (no confirmation received yet) */}
                    {checkoutState === 'pending' && (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border-2 border-amber-500/30 text-amber-400 flex items-center justify-center">
                                <Clock size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Payment Pending</h3>
                                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                                    {statusMessage || 'We have not received a confirmation yet. We will notify you once HitPay confirms your payment.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/customer-portal/', { replace: true })}
                                className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold text-sm py-3 rounded-xl transition-all"
                            >
                                Return to RidersBUD
                            </button>
                        </div>
                    )}

                    {/* STATE: COMPLETED (Verified Success Screen) */}
                    {checkoutState === 'completed' && (
                        <div className="py-6 flex flex-col items-center text-center space-y-5">
                            <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-2xl shadow-emerald-500/20 animate-bounce">
                                <CheckCircle2 size={44} />
                            </div>

                            <div>
                                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-500/30">
                                    Authoritative HitPay Confirmation
                                </span>
                                <h2 className="text-2xl font-black text-white mt-2">Payment Successful!</h2>
                                <p className="text-xs text-gray-400 mt-1">
                                    Your transaction has been securely captured and confirmed by HitPay.
                                </p>
                            </div>

                            {/* Verified Receipt Card */}
                            <div className="w-full bg-[#181A24] border border-white/10 rounded-2xl p-4 text-left space-y-2.5 font-mono text-xs">
                                <div className="flex justify-between text-gray-400">
                                    <span>Merchant</span>
                                    <span className="text-white font-bold">SaSe Web Solutions</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Description</span>
                                    <span className="text-gray-200">{purpose}</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Amount Paid</span>
                                    <span className="text-emerald-400 font-bold text-sm">
                                        ₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                                    </span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Reference</span>
                                    <span className="text-white select-all">{verifiedTx?.reference || referenceNumber}</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Payment Method</span>
                                    <span className="text-gray-200 capitalize">{verifiedTx?.method || selectedMethod}</span>
                                </div>
                                <div className="flex justify-between text-gray-400">
                                    <span>Status</span>
                                    <span className="text-emerald-400 font-bold uppercase">PAID & VERIFIED</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleReturnToApp('completed')}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-base py-4 rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                            >
                                <span>Continue to Booking Receipt</span>
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {/* STATE: FAILED */}
                    {checkoutState === 'failed' && (
                        <div className="py-6 flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-400 flex items-center justify-center shadow-xl shadow-rose-500/20">
                                <AlertCircle size={36} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Payment Unsuccessful</h3>
                                <p className="text-xs text-rose-300 mt-1 max-w-sm">
                                    {errorMessage || 'Your payment was not completed or could not be verified by HitPay.'}
                                </p>
                            </div>

                            <div className="w-full space-y-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setCheckoutState('idle')}
                                    className="w-full bg-[#FE7803] hover:bg-orange-600 text-white font-bold text-sm py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all"
                                >
                                    <RefreshCw size={16} />
                                    <span>Try Again with HitPay</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleReturnToApp('failed')}
                                    className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-semibold text-xs py-3 rounded-xl transition-all"
                                >
                                    Cancel & Return
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STATE: CANCELLED */}
                    {checkoutState === 'cancelled' && (
                        <div className="py-6 flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center">
                                <XCircle size={36} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Payment Cancelled</h3>
                                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                                    You cancelled the checkout session. No funds were debited.
                                </p>
                            </div>

                            <div className="w-full space-y-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setCheckoutState('idle')}
                                    className="w-full bg-[#FE7803] hover:bg-orange-600 text-white font-bold text-sm py-3.5 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all"
                                >
                                    <span>Restart Payment</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleReturnToApp('canceled')}
                                    className="w-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-semibold text-xs py-3 rounded-xl transition-all"
                                >
                                    Return to RidersBUD
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STATE: EXPIRED */}
                    {checkoutState === 'expired' && (
                        <div className="py-6 flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                                <Clock size={36} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Session Expired</h3>
                                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                                    For your security, this payment session has expired after 15 minutes.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setTimeLeft(900);
                                    setCheckoutState('idle');
                                }}
                                className="w-full bg-[#FE7803] hover:bg-orange-600 text-white font-bold text-sm py-3.5 rounded-2xl shadow-lg transition-all"
                            >
                                Start New Session
                            </button>
                        </div>
                    )}

                </div>

                {/* 3. Footer: Official HitPay Branding & PCI Compliance */}
                <div className="px-6 py-4 bg-[#10121A] border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-2">
                    <div className="flex items-center gap-2">
                        <span>Powered by <strong>HitPay Payment Solutions</strong></span>
                        <span>•</span>
                        <span>PCI-DSS Level 1</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400">
                        <Lock size={12} className="text-emerald-400" />
                        <span>Official Payment Partner</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default HitPayCheckoutScreen;
