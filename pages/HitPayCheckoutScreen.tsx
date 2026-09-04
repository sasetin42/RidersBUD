import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Lock, CreditCard, QrCode, Smartphone, XCircle, Clock, Building2, Sparkles } from 'lucide-react';

export const HitPayCheckoutScreen: React.FC = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();

    // Parse parameters from query string or location state
    const locationState = (location.state as any) || {};
    const amount = Number(searchParams.get('amount') || locationState.amount || 0);
    const currency = searchParams.get('currency') || locationState.currency || 'PHP';
    const referenceNumber = searchParams.get('reference_number') || searchParams.get('reference') || locationState.reference_number || `REF-${Date.now()}`;
    const redirectUrl = searchParams.get('redirect_url') || locationState.redirect_url || '/customer-portal/';
    const email = searchParams.get('email') || locationState.email || 'customer@ridersbud.com';
    const name = searchParams.get('name') || locationState.name || 'Valued Customer';
    const phone = searchParams.get('phone') || locationState.phone || '09171234567';
    const purpose = searchParams.get('purpose') || locationState.purpose || 'RidersBUD Service Payment';
    const isSandbox = searchParams.get('sandbox') !== 'false' && (searchParams.get('sandbox') === 'true' || locationState.isSandbox !== false);

    const [activeMethod, setActiveMethod] = useState<'gcash' | 'maya' | 'card' | 'qrph'>('gcash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [processStep, setProcessStep] = useState<string>('');
    const [processProgress, setProcessProgress] = useState<number>(0);
    const [timeLeft, setTimeLeft] = useState(900); // 15 minutes

    // Form inputs for Card
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvc, setCardCvc] = useState('');
    const [cardName, setCardName] = useState(name);

    // Form inputs for GCash / Maya
    const [mobileNumber, setMobileNumber] = useState(phone);
    const [otpCode, setOtpCode] = useState('123456');

    // Timer countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleCancel('Transaction expired');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const autofillTestCard = () => {
        setCardNumber('4111 1111 1111 1111');
        setCardExpiry('12/28');
        setCardCvc('888');
        setCardName(name || 'HitPay Tester');
    };

    const handleSuccessPayment = async () => {
        setIsProcessing(true);
        setProcessStep('Verifying payment credentials with HitPay...');
        setProcessProgress(20);

        await new Promise(r => setTimeout(r, 600));
        setProcessStep(`Authorizing ${activeMethod.toUpperCase()} transaction...`);
        setProcessProgress(50);

        await new Promise(r => setTimeout(r, 700));
        setProcessStep('Capturing funds & confirming with merchant...');
        setProcessProgress(85);

        await new Promise(r => setTimeout(r, 600));
        setProcessStep('Payment Successful! Returning to RidersBUD...');
        setProcessProgress(100);

        await new Promise(r => setTimeout(r, 500));

        const reqId = `req_hp_${Math.random().toString(36).substring(2, 11)}`;
        const hitpayRef = `HP-${referenceNumber.replace(/^BOK-|^REF-|^RNT-/, '')}`;

        // Construct destination redirect URL
        try {
            let targetUrl: URL;
            if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
                targetUrl = new URL(redirectUrl);
            } else {
                targetUrl = new URL(redirectUrl, window.location.origin);
            }

            targetUrl.searchParams.set('status', 'completed');
            targetUrl.searchParams.set('hitpay', 'completed');
            targetUrl.searchParams.set('reference', hitpayRef);
            targetUrl.searchParams.set('payment_request_id', reqId);
            targetUrl.searchParams.set('amount', String(amount));

            window.location.href = targetUrl.toString();
        } catch (e) {
            // Fallback navigate
            navigate(`${redirectUrl}?status=completed&hitpay=completed&reference=${hitpayRef}&payment_request_id=${reqId}&amount=${amount}`, { replace: true });
        }
    };

    const handleCancel = (reason = 'Cancelled by user') => {
        try {
            let targetUrl: URL;
            if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
                targetUrl = new URL(redirectUrl);
            } else {
                targetUrl = new URL(redirectUrl, window.location.origin);
            }

            targetUrl.searchParams.set('status', 'canceled');
            targetUrl.searchParams.set('hitpay', 'canceled');
            targetUrl.searchParams.set('cancel_reason', reason);

            window.location.href = targetUrl.toString();
        } catch (e) {
            navigate(`${redirectUrl}?status=canceled&hitpay=canceled`, { replace: true });
        }
    };

    return (
        <div className="min-h-screen bg-[#0D0E12] text-white flex flex-col items-center justify-center p-3 sm:p-6 font-sans relative overflow-x-hidden select-none">
            {/* Ambient background glow */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#FE7803]/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="fixed bottom-0 right-10 w-[400px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Main Checkout Container */}
            <div className="w-full max-w-2xl bg-[#14161E] border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative z-10 flex flex-col my-auto">
                
                {/* HitPay Official Brand Header */}
                <div className="bg-[#191C26] px-6 py-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FE7803] to-orange-600 flex items-center justify-center shadow-lg shadow-[#FE7803]/25 flex-shrink-0">
                            <span className="text-white font-black text-xl tracking-tighter">HP</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                                    HitPay <span className="text-[#FE7803] text-sm font-bold">Payment Gateway</span>
                                </h1>
                                {isSandbox && (
                                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse">
                                        Sandbox Mode
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                                <Building2 size={12} className="text-gray-400" />
                                <span>Merchant: <strong className="text-gray-200 font-semibold">RidersBUD Automotive Services</strong></span>
                            </p>
                        </div>
                    </div>

                    {/* Timer & Security Badge */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="flex items-center gap-1.5 bg-[#0D0E12] border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-gray-300">
                            <Clock size={14} className="text-[#FE7803] animate-pulse" />
                            <span>{formatTime(timeLeft)}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-emerald-400">
                            <Lock size={12} />
                            <span>256-Bit SSL</span>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-5 sm:p-7 space-y-6">

                    {/* Transaction Amount & Summary Card */}
                    <div className="bg-gradient-to-br from-[#1C1F2C] to-[#141620] border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-inner">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Amount to Pay</p>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                                        ₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-sm font-bold text-[#FE7803]">{currency}</span>
                                </div>
                                <p className="text-xs text-gray-300 font-medium mt-1">{purpose}</p>
                            </div>

                            <div className="bg-[#0E1017]/80 border border-white/5 rounded-xl p-3 text-right sm:text-left self-start sm:self-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ref Number</p>
                                <p className="text-xs font-mono font-bold text-white tracking-wider select-all mt-0.5">{referenceNumber}</p>
                                <p className="text-[10px] text-gray-400 mt-1 truncate max-w-[180px]">{email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Channel Selector */}
                    <div>
                        <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center justify-between">
                            <span>Select Payment Channel</span>
                            <span className="text-[11px] text-[#FE7803] lowercase font-normal">zero convenience fees</span>
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {/* GCash */}
                            <button
                                type="button"
                                onClick={() => setActiveMethod('gcash')}
                                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                                    activeMethod === 'gcash'
                                        ? 'bg-[#005CEE]/15 border-[#005CEE] text-white shadow-lg shadow-[#005CEE]/20 scale-[1.02]'
                                        : 'bg-[#191C26] border-white/5 text-gray-400 hover:border-white/20 hover:text-white'
                                }`}
                            >
                                <div className="w-9 h-9 rounded-xl bg-[#005CEE] flex items-center justify-center text-white font-black text-sm shadow">
                                    G
                                </div>
                                <span className="text-xs font-black tracking-tight">GCash</span>
                            </button>

                            {/* Maya */}
                            <button
                                type="button"
                                onClick={() => setActiveMethod('maya')}
                                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                                    activeMethod === 'maya'
                                        ? 'bg-[#00B14F]/15 border-[#00B14F] text-white shadow-lg shadow-[#00B14F]/20 scale-[1.02]'
                                        : 'bg-[#191C26] border-white/5 text-gray-400 hover:border-white/20 hover:text-white'
                                }`}
                            >
                                <div className="w-9 h-9 rounded-xl bg-[#00B14F] flex items-center justify-center text-white font-black text-sm shadow">
                                    M
                                </div>
                                <span className="text-xs font-black tracking-tight">Maya</span>
                            </button>

                            {/* QR Ph */}
                            <button
                                type="button"
                                onClick={() => setActiveMethod('qrph')}
                                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                                    activeMethod === 'qrph'
                                        ? 'bg-purple-600/15 border-purple-500 text-white shadow-lg shadow-purple-600/20 scale-[1.02]'
                                        : 'bg-[#191C26] border-white/5 text-gray-400 hover:border-white/20 hover:text-white'
                                }`}
                            >
                                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold shadow">
                                    <QrCode size={18} />
                                </div>
                                <span className="text-xs font-black tracking-tight">QR Ph</span>
                            </button>

                            {/* Credit/Debit Cards */}
                            <button
                                type="button"
                                onClick={() => setActiveMethod('card')}
                                className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${
                                    activeMethod === 'card'
                                        ? 'bg-amber-600/15 border-amber-500 text-white shadow-lg shadow-amber-600/20 scale-[1.02]'
                                        : 'bg-[#191C26] border-white/5 text-gray-400 hover:border-white/20 hover:text-white'
                                }`}
                            >
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center text-white shadow">
                                    <CreditCard size={18} />
                                </div>
                                <span className="text-xs font-black tracking-tight">Card</span>
                            </button>
                        </div>
                    </div>

                    {/* Dynamic Channel View Content */}
                    <div className="bg-[#181B26] border border-white/10 rounded-2xl p-5">
                        
                        {/* GCash Channel */}
                        {activeMethod === 'gcash' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-[#005CEE] flex items-center justify-center font-black text-white text-xs">
                                            GCash
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white">GCash Instant Checkout</h3>
                                            <p className="text-[11px] text-gray-400">Scan QR code or confirm mobile number</p>
                                        </div>
                                    </div>
                                    <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-emerald-500/20">
                                        Online Direct
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                    {/* QR Code Simulation */}
                                    <div className="bg-white p-3.5 rounded-2xl flex flex-col items-center justify-center text-gray-900 shadow-lg">
                                        <div className="relative w-36 h-36 bg-gray-100 rounded-xl border border-gray-300 flex items-center justify-center overflow-hidden">
                                            <QrCode size={110} className="text-gray-800" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-9 h-9 rounded-full bg-[#005CEE] text-white font-black text-xs flex items-center justify-center shadow-lg border-2 border-white">
                                                    G
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 mt-2">
                                            Scan via GCash App
                                        </span>
                                    </div>

                                    {/* Mobile Direct Inputs */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[11px] font-bold text-gray-400 block mb-1">GCash Registered Number</label>
                                            <div className="relative">
                                                <input
                                                    type="tel"
                                                    value={mobileNumber}
                                                    onChange={e => setMobileNumber(e.target.value)}
                                                    placeholder="0917XXXXXXX"
                                                    className="w-full bg-[#0E1017] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:border-[#005CEE] outline-none"
                                                />
                                                <Smartphone size={16} className="absolute right-3.5 top-3 text-gray-500" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-bold text-gray-400 block mb-1">6-Digit MPIN / OTP (Sandbox)</label>
                                            <input
                                                type="password"
                                                maxLength={6}
                                                value={otpCode}
                                                onChange={e => setOtpCode(e.target.value)}
                                                className="w-full bg-[#0E1017] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono tracking-widest focus:border-[#005CEE] outline-none text-center"
                                            />
                                        </div>

                                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <ShieldCheck size={12} className="text-emerald-400" />
                                            <span>Simulated instant authorization via HitPay API</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Maya Channel */}
                        {activeMethod === 'maya' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-[#00B14F] flex items-center justify-center font-black text-white text-xs">
                                            Maya
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white">Maya Wallet / QR</h3>
                                            <p className="text-[11px] text-gray-400">Pay using Maya app or registered account</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                    <div className="bg-white p-3.5 rounded-2xl flex flex-col items-center justify-center text-gray-900 shadow-lg">
                                        <div className="relative w-36 h-36 bg-gray-100 rounded-xl border border-gray-300 flex items-center justify-center overflow-hidden">
                                            <QrCode size={110} className="text-gray-800" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-9 h-9 rounded-full bg-[#00B14F] text-white font-black text-xs flex items-center justify-center shadow-lg border-2 border-white">
                                                    M
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-700 mt-2">
                                            Scan via Maya App
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[11px] font-bold text-gray-400 block mb-1">Maya Mobile Number</label>
                                            <input
                                                type="tel"
                                                value={mobileNumber}
                                                onChange={e => setMobileNumber(e.target.value)}
                                                placeholder="0918XXXXXXX"
                                                className="w-full bg-[#0E1017] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:border-[#00B14F] outline-none"
                                            />
                                        </div>
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-[11px] text-emerald-300">
                                            Ready for instant one-click approval via HitPay gateway.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* QR Ph National Standard */}
                        {activeMethod === 'qrph' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                    <div>
                                        <h3 className="text-sm font-bold text-white">QR Ph National QR Standard</h3>
                                        <p className="text-[11px] text-gray-400">Scan with BDO, BPI, UnionBank, GCash, Maya & 40+ banks</p>
                                    </div>
                                    <span className="bg-purple-500/20 text-purple-300 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-purple-500/30">
                                        BSP Regulated
                                    </span>
                                </div>

                                <div className="flex flex-col items-center justify-center py-2">
                                    <div className="bg-white p-4 rounded-2xl shadow-xl flex flex-col items-center">
                                        <div className="w-44 h-44 bg-gray-100 rounded-xl border border-gray-300 flex items-center justify-center">
                                            <QrCode size={140} className="text-gray-900" />
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-800 mt-2 uppercase tracking-wider">
                                            <Sparkles size={12} className="text-purple-600" />
                                            <span>Official Dynamic QR Ph</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-3 text-center max-w-sm">
                                        Open any banking or e-wallet app, scan this QR, and confirm <strong>₱{amount.toLocaleString()}</strong>.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Credit / Debit Card */}
                        {activeMethod === 'card' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                                    <div>
                                        <h3 className="text-sm font-bold text-white">Credit / Debit Card</h3>
                                        <p className="text-[11px] text-gray-400">Visa, Mastercard, JCB, American Express</p>
                                    </div>
                                    {isSandbox && (
                                        <button
                                            type="button"
                                            onClick={autofillTestCard}
                                            className="text-[10px] font-black bg-[#FE7803]/20 text-[#FE7803] border border-[#FE7803]/30 px-2.5 py-1 rounded-lg hover:bg-[#FE7803]/30 transition-all flex items-center gap-1"
                                        >
                                            <Sparkles size={11} /> Fill Test Card
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-400 block mb-1">Card Number</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={cardNumber}
                                                onChange={e => setCardNumber(e.target.value)}
                                                placeholder="4111 1111 1111 1111"
                                                maxLength={19}
                                                className="w-full bg-[#0E1017] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:border-[#FE7803] outline-none"
                                            />
                                            <CreditCard size={18} className="absolute right-3.5 top-3 text-gray-500" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-bold text-gray-400 block mb-1">Expiry Date</label>
                                            <input
                                                type="text"
                                                value={cardExpiry}
                                                onChange={e => setCardExpiry(e.target.value)}
                                                placeholder="MM/YY"
                                                maxLength={5}
                                                className="w-full bg-[#0E1017] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:border-[#FE7803] outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-gray-400 block mb-1">Security Code (CVV)</label>
                                            <input
                                                type="password"
                                                value={cardCvc}
                                                onChange={e => setCardCvc(e.target.value)}
                                                placeholder="CVC"
                                                maxLength={4}
                                                className="w-full bg-[#0E1017] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:border-[#FE7803] outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-gray-400 block mb-1">Cardholder Full Name</label>
                                        <input
                                            type="text"
                                            value={cardName}
                                            onChange={e => setCardName(e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full bg-[#0E1017] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#FE7803] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Progress Loader during checkout */}
                    {isProcessing && (
                        <div className="bg-[#1C1F2E] border border-[#FE7803]/30 rounded-2xl p-4 text-center space-y-2 animate-pulse">
                            <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-[#FE7803] to-orange-500 h-full transition-all duration-300 rounded-full"
                                    style={{ width: `${processProgress}%` }}
                                />
                            </div>
                            <p className="text-xs font-bold text-[#FE7803]">{processStep}</p>
                        </div>
                    )}

                    {/* Actions & Submit Buttons */}
                    <div className="space-y-3 pt-2">
                        <button
                            type="button"
                            onClick={handleSuccessPayment}
                            disabled={isProcessing}
                            className="w-full bg-gradient-to-r from-[#FE7803] to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white font-black text-base py-4 rounded-2xl shadow-xl shadow-[#FE7803]/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                        >
                            <ShieldCheck size={20} />
                            <span>Pay ₱{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} with HitPay</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleCancel('User cancelled')}
                            disabled={isProcessing}
                            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-1.5 transition-all"
                        >
                            <XCircle size={14} />
                            <span>Cancel Payment & Return to Merchant</span>
                        </button>
                    </div>

                    {/* HitPay Trust & Security Footnote */}
                    <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[10px] text-gray-500 gap-2">
                        <div className="flex items-center gap-2">
                            <span>Powered by <strong>HitPay Payment Solutions</strong></span>
                            <span>•</span>
                            <span>PCI-DSS Level 1 Compliant</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                            <Lock size={10} className="text-emerald-400" />
                            <span>Encrypted End-to-End</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default HitPayCheckoutScreen;
