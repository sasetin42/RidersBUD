import React, { useState, useEffect, useRef } from 'react';
import { db as firestore, storage, auth } from '../firebase';
import { doc, onSnapshot, updateDoc, collection, addDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useDatabase } from '../context/DatabaseContext';
import { useNavigate } from 'react-router-dom';
import {
    Upload, Image as ImageIcon, CheckCircle, Trash2,
    AlertCircle, Clock, Wifi, WifiOff, Copy
} from 'lucide-react';

// ─── QR Code via goqr.me (no install needed) ─────────────────────────────────
const buildQrUrl = (amount: number, name: string, number: string) => {
    const payload = encodeURIComponent(
        `GCash Payment\nPay to: ${name}\nNumber: ${number}\nAmount: PHP ${amount.toFixed(2)}\nRef: RIDERSBUD`
    );
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${payload}&bgcolor=0D0D0D&color=00C2FF&margin=12&qzone=1`;
};

// ─── Countdown timer ─────────────────────────────────────────────────────────
const useCountdown = (seconds: number) => {
    const [timeLeft, setTimeLeft] = useState(seconds);
    useEffect(() => {
        if (timeLeft <= 0) return;
        const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
        return () => clearTimeout(id);
    }, [timeLeft]);
    const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const s = String(timeLeft % 60).padStart(2, '0');
    return { display: `${m}:${s}`, expired: timeLeft <= 0 };
};

// ─── Payment Status types ─────────────────────────────────────────────────────
type PaymentStatus = 'idle' | 'uploading' | 'pending_review' | 'verified' | 'declined';

interface Props {
    bookingId: string;
    totalAmount: number;
    paymentAmount?: number;
    paymentLabel?: string;
    customerName: string;
    services?: { name: string; price: number }[];
    isOrder?: boolean;
    onPaymentVerified: () => void;
    onClose: () => void;
    newBookingData?: any;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const GCashPaymentModal: React.FC<Props> = ({
    bookingId,
    totalAmount,
    paymentAmount,
    paymentLabel,
    customerName,
    services = [],
    isOrder = false,
    onPaymentVerified,
    onClose,
    newBookingData,
}) => {
    const { db, updateBooking, notifyAdminGCashReceiptUploaded, setDb } = useDatabase();
    const settings = db?.settings;

    const [qrLoadError, setQrLoadError] = useState(false);

    useEffect(() => {
        setQrLoadError(false);
    }, [settings?.gcashQrCodeUrl]);

    const gcashNumber = settings?.gcashNumber || '09XX-XXX-XXXX';
    const gcashName   = settings?.gcashAccountName || 'RidersBud Services';
    const paymentValue = typeof paymentAmount === 'number' ? paymentAmount : isOrder ? totalAmount : Math.ceil(totalAmount * 0.5);
    const paymentLabelText = paymentLabel || (isOrder ? 'TOTAL PAYMENT' : 'DOWN PAYMENT (50%)');

    const qrUrl = (!qrLoadError && settings?.gcashQrCodeUrl)
        ? settings.gcashQrCodeUrl
        : buildQrUrl(paymentValue, gcashName, gcashNumber);

    const [step, setStep] = useState<'qr' | 'upload' | 'waiting'>('qr');
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
    const [declineReason, setDeclineReason] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [fileError, setFileError] = useState('');
    const [copied, setCopied] = useState(false);
    const [bookingData, setBookingData] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const [showCancelCaution, setShowCancelCaution] = useState(false);
    const [referenceNumber, setReferenceNumber] = useState('');

    // Use a ref for the callback to avoid tearing down the listener on every render
    const onPaymentVerifiedRef = useRef<() => void>(onPaymentVerified);
    onPaymentVerifiedRef.current = onPaymentVerified;

    const stepRef = useRef(step);
    stepRef.current = step;

    const { display: timer, expired } = useCountdown(15 * 60);

    // ── Lock body scroll ──────────────────────────────────────────────────────
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // ── Real-time Firestore listener on the booking/order doc ───────────────────────
    useEffect(() => {
        if (!bookingId || !auth.currentUser) return;

        // WORKAROUND FOR FIRESTORE SDK BUG:
        // Do not listen to a single document that doesn't exist yet.
        // If this is a new booking, wait until the user has submitted the receipt and the doc is created.
        if (newBookingData && step !== 'waiting') return;

        const docRef = isOrder ? doc(firestore, 'orders', bookingId) : doc(firestore, 'bookings', bookingId);
        const unsubscribe = onSnapshot(docRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            setBookingData(data);

            if (stepRef.current === 'waiting') {
                if (data.isVerified === true || data.gcashPaymentStatus === 'verified' || data.paymentStatus === 'Paid' || data.paymentStatus === 'paid') {
                    setPaymentStatus('verified');
                    setTimeout(() => onPaymentVerifiedRef.current(), 1800);
                } else if (data.gcashDeclineReason && data.gcashDeclineReason.trim() !== '') {
                    setPaymentStatus('declined');
                    setDeclineReason(data.gcashDeclineReason || 'Payment was declined.');
                } else if (data.gcashReceiptUrl && (data.gcashPaymentStatus === 'receipt_uploaded' || data.gcashPaymentStatus === 'balance_receipt_uploaded')) {
                    setPaymentStatus('pending_review');
                }
            }
        });

        return () => { try { unsubscribe(); } catch (_) {} };
    }, [bookingId, isOrder, step, newBookingData]);

    // ── File handling ─────────────────────────────────────────────────────────
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setFileError('');
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setFileError('Please upload an image file (PNG, JPG, WEBP).');
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setFileError('File too large. Maximum 5MB allowed.');
            return;
        }
        setReceiptFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setReceiptPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    // ── Upload receipt and update Firestore ───────────────────────────────────
    const handleSubmitReceipt = async () => {
        if (!receiptFile) {
            setFileError('Please select your GCash payment screenshot.');
            return;
        }
        setPaymentStatus('uploading');
        setFileError('');

        if (!auth.currentUser) {
            console.info("[GCashPaymentModal] Bypassing upload since user is signed in via local bypass mode.");
            // Simulate upload delay and verify instantly
            setTimeout(async () => {
                if (newBookingData && !bookingData) {
                    const bookingToSave = {
                        ...newBookingData,
                        id: bookingId,
                        gcashReceiptUrl: 'bypass_mock_url',
                        gcashPaymentStatus: 'receipt_uploaded',
                        paymentStatus: 'partial',
                        gcashReference: referenceNumber,
                        gcashDownpaymentReference: referenceNumber,
                        createdAt: new Date().toISOString(),
                        statusHistory: [
                            { status: newBookingData.status, timestamp: new Date().toISOString() },
                            { status: 'Receipt Uploaded', timestamp: new Date().toISOString() }
                        ]
                    };
                    await setDoc(doc(firestore, 'bookings', bookingId), bookingToSave);
                    setDb(prev => prev ? { ...prev, bookings: [bookingToSave, ...prev.bookings] } : null);
                }
                setPaymentStatus('verified');
                setTimeout(() => onPaymentVerified(), 1200);
            }, 1200);
            return;
        }

        try {
            const uid = auth.currentUser?.uid;
            if (!uid) throw new Error("You must be logged in to upload a receipt.");
            const filename = `${Date.now()}_${bookingId}_${receiptFile.name.replace(/\s+/g, '_')}`;
            const storageRef = ref(storage, `receipts/${uid}/${filename}`);
            await uploadBytes(storageRef, receiptFile);
            const downloadUrl = await getDownloadURL(storageRef);

            // Update the booking/order doc with receipt URL and payment status
            if (isOrder) {
                await updateDoc(doc(firestore, 'orders', bookingId), {
                    gcashReceiptUrl: downloadUrl,
                    gcashReference: referenceNumber,
                    gcashPaymentStatus: 'receipt_uploaded',
                    paymentStatus: 'Unpaid' // will turn to 'Paid' upon verification
                });

                // Notify admin about the order payment
                await addDoc(collection(firestore, 'notifications'), {
                    recipientId: 'admin',
                    title: 'GCash Order Payment',
                    message: `GCash receipt uploaded by ${customerName} for parts order #${bookingId.slice(-6).toUpperCase()}.`,
                    type: 'info',
                    timestamp: Date.now(),
                    read: false,
                    link: '/admin-portal/orders'
                });
            } else {
                const isSecondPayment = bookingData?.paymentStatus === 'partial';

                if (newBookingData && !bookingData) {
                    // Create a brand new booking document with downpayment receipt uploaded
                    const bookingToSave = {
                        ...newBookingData,
                        id: bookingId,
                        gcashReceiptUrl: downloadUrl,
                        gcashDownpaymentReceiptUrl: downloadUrl,
                        gcashReference: referenceNumber,
                        gcashDownpaymentReference: referenceNumber,
                        gcashPaymentStatus: 'receipt_uploaded',
                        paymentStatus: 'partial',
                        createdAt: new Date().toISOString(),
                        statusHistory: [
                            { status: newBookingData.status, timestamp: new Date().toISOString() },
                            { status: 'Receipt Uploaded', timestamp: new Date().toISOString() }
                        ]
                    };

                    await setDoc(doc(firestore, 'bookings', bookingId), bookingToSave);

                    // Add to admin notifications
                    await addDoc(collection(firestore, 'notifications'), {
                        recipientId: 'admin',
                        title: '📅 New Booking Created',
                        message: `New booking for ${services.map(s => s.name).join(', ') || 'Service'} by ${customerName}.`,
                        type: 'info',
                        timestamp: Date.now(),
                        read: false,
                        link: '/admin-portal/bookings'
                    });

                } else {
                    // Update existing booking payment
                    await updateBooking(bookingId, {
                        gcashReceiptUrl: downloadUrl,
                        ...(isSecondPayment 
                            ? { gcashBalanceReceiptUrl: downloadUrl, gcashBalanceReference: referenceNumber } 
                            : { gcashDownpaymentReceiptUrl: downloadUrl, gcashReference: referenceNumber, gcashDownpaymentReference: referenceNumber }
                        ),
                        gcashPaymentStatus: isSecondPayment ? 'balance_receipt_uploaded' : 'receipt_uploaded',
                        paymentStatus: 'partial',
                    });
                }

                // Ping admin in real-time so they know to review
                await notifyAdminGCashReceiptUploaded(
                    bookingId,
                    customerName,
                    services[0]?.name || 'Service'
                );
            }

            setPaymentStatus('pending_review');
            setStep('waiting');
        } catch (err: any) {
            console.error('Receipt upload failed:', err);
            setFileError(err.message || 'Upload failed. Please try again.');
            setPaymentStatus('idle');
        }
    };

    // ── Copy to clipboard ─────────────────────────────────────────────────────
    const handleCopy = () => {
        navigator.clipboard?.writeText(gcashNumber.replace(/-/g, ''));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Mark as sent (move to upload receipt step) ────────────────────────────
    const handleIveSent = () => {
        setStep('upload');
    };

    const handleCloseAttempt = () => {
        if (newBookingData && paymentStatus !== 'verified') {
            setShowCancelCaution(true);
        } else {
            onClose();
        }
    };

    const handleConfirmCancelBooking = async () => {
        setShowCancelCaution(false);
        if (newBookingData && !bookingData && bookingId) {
            try {
                await deleteDoc(doc(firestore, 'bookings', bookingId));
                console.log("Successfully deleted cancelled booking:", bookingId);
            } catch (err) {
                console.error("Failed to delete booking document on cancel:", err);
            }
        }
        onClose();
        navigate('/customer-portal/', { replace: true });
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div
                className="relative w-full max-w-sm sm:rounded-2xl rounded-t-2xl overflow-hidden bg-[#15151A]/85 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col"
                style={{ maxHeight: 'calc(100dvh - 48px)' }}
            >
                {/* ── Header ───────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-4 py-3 bg-transparent sticky top-0 z-10 shrink-0 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#0055EE] flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <span className="text-xs font-black text-white">G</span>
                        </div>
                        <div>
                            <p className="text-xs font-black text-white tracking-tight">GCash Payment</p>
                            <p className="text-[8px] text-white/40 font-bold tracking-wider">SECURE PORTAL</p>
                        </div>
                    </div>
                    {/* Live indicator */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                            <Wifi size={8} className="text-green-400" />
                            <span className="text-[8px] font-black text-green-400 tracking-wider">LIVE</span>
                        </div>
                        <button
                            onClick={handleCloseAttempt}
                            className="p-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                            aria-label="Close payment modal"
                        >
                            <svg className="w-4 h-4 text-white/50 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── Scrollable Body ───────────────────────────────────────── */}
                <div className="px-4 py-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">

                    {/* ── Amount Banner (always visible) ── */}
                    <div className="relative rounded-xl p-3 overflow-hidden border border-white/5 bg-white/[0.02] backdrop-blur-md">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-[8px] font-bold text-white/40 tracking-wider uppercase">
                                    {paymentLabelText}
                                </p>
                                <p className="text-2xl font-black text-primary tracking-tight">
                                    ₱{paymentValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] text-white/40 font-bold uppercase">Total Amount</p>
                                <p className="text-sm font-bold text-white/90">
                                    ₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                        {services.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-white/5">
                                <p className="text-[9px] text-white/40 font-bold truncate">
                                    Services: {services.map(s => s.name).join(', ')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ── STEP: QR Code ── */}
                    {step === 'qr' && (
                        <div className="space-y-3">
                            {/* QR */}
                            <div className="flex flex-col items-center gap-2">
                                <div className={`p-2 rounded-xl border transition-all ${expired ? 'border-red-500/40 opacity-50' : 'border-primary/20 bg-black/40'}`}>
                                    {expired ? (
                                        <div className="w-36 h-36 flex flex-col items-center justify-center gap-2 rounded-lg bg-white/5">
                                            <AlertCircle className="w-6 h-6 text-red-500" />
                                            <p className="text-red-400 font-bold text-[10px] tracking-wider">Expired</p>
                                            <button
                                                onClick={() => window.location.reload()}
                                                className="px-2 py-1 rounded text-[9px] font-black text-white bg-primary hover:bg-orange-600"
                                            >
                                                Refresh
                                            </button>
                                        </div>
                                    ) : (
                                        <img
                                            src={qrUrl}
                                            onError={() => setQrLoadError(true)}
                                            alt={`GCash QR Code — pay ₱${paymentValue} to ${gcashName}`}
                                            className="w-36 h-36 rounded-lg object-cover"
                                            loading="eager"
                                        />
                                    )}
                                </div>

                                {!expired && (
                                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-primary/20 bg-primary/5">
                                        <Clock size={8} className="text-primary animate-pulse" />
                                        <span className="text-primary font-mono font-bold text-[9px] tracking-tight">
                                            Expires: {timer}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* GCash number */}
                            <div className="rounded-xl p-3 flex justify-between items-center border border-white/5 bg-white/[0.02] backdrop-blur-md">
                                <div>
                                    <p className="text-[8px] font-bold text-white/40 tracking-wider">GCASH CREDENTIALS</p>
                                    <p className="text-base font-black text-white tracking-widest mt-0.5">{gcashNumber}</p>
                                    <p className="text-white/60 font-bold text-[10px] truncate max-w-[180px]">{gcashName}</p>
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className={`p-2.5 rounded-lg transition-all ${copied ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-white/5 text-primary hover:bg-primary hover:text-white border border-white/10'}`}
                                    aria-label="Copy GCash number"
                                >
                                    {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                                </button>
                            </div>

                            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                                <AlertCircle size={12} className="text-primary shrink-0 mt-0.5" />
                                <p className="text-[9px] text-white/70 font-bold leading-normal">
                                    Scan QR or send to GCash number. Next, tap <strong>"I've Sent the Payment"</strong> to upload the screenshot.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── STEP: Upload Receipt ── */}
                    {step === 'upload' && (
                        <div className="space-y-3">
                            <div className="text-center">
                                <h3 className="text-lg font-black text-white tracking-tight">Upload Receipt</h3>
                                <p className="text-[9px] text-white/55 font-bold tracking-wider mt-0.5">
                                    Screenshot of your GCash transaction
                                </p>
                            </div>



                            {!receiptPreview ? (
                                <label className="flex flex-col items-center justify-center w-full min-h-[110px] border border-dashed border-white/15 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] hover:border-primary/40 transition-all cursor-pointer group p-3">
                                    <div className="p-1.5 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors mb-1">
                                        <ImageIcon className="w-5 h-5 text-primary" />
                                    </div>
                                    <p className="text-xs font-black text-white tracking-tight">Select Screenshot</p>
                                    <p className="text-[9px] text-white/40 font-bold tracking-widest mt-0.5 font-mono">PNG, JPG · Max 5MB</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            ) : (
                                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 group">
                                    <img
                                        src={receiptPreview}
                                        alt="GCash receipt preview"
                                        className="w-full max-h-32 object-contain p-2"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-lg text-white text-[9px] font-black tracking-widest border border-white/15"
                                        >
                                            <Upload size={10} /> Change
                                        </button>
                                        <button
                                            onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                                            className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-white"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <input ref={fileInputRef} id="gcash-proof" name="gcash-proof" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                </div>
                            )}

                            {fileError && (
                                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                    <p className="text-[9px] font-black text-red-400 tracking-wider">{fileError}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP: Waiting for Verification ── */}
                    {step === 'waiting' && (
                        <div className="space-y-3 py-1">
                            {paymentStatus === 'pending_review' && (
                                <div className="text-center space-y-3">
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto relative border border-primary/20 bg-primary/5">
                                        <div className="absolute inset-0 rounded-2xl border border-primary/30 animate-ping opacity-20" />
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white tracking-tight">Awaiting Review</h3>
                                        <p className="text-[8px] text-white/40 font-bold tracking-widest mt-0.5">REAL-TIME SYNC ACTIVE</p>
                                    </div>
                                    <p className="text-[11px] text-white/70 font-bold leading-relaxed px-2">
                                        Your receipt is uploaded. We will verify and confirm your {isOrder ? 'order' : 'booking'} shortly.
                                    </p>
                                    <div className="flex items-center justify-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                        <span className="text-[9px] text-green-400 font-black tracking-wider uppercase">Listening for verification</span>
                                    </div>
                                </div>
                            )}

                            {paymentStatus === 'verified' && (
                                <div className="text-center space-y-3">
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto relative border border-green-500/20 bg-green-500/5">
                                        <div className="absolute inset-0 rounded-2xl border border-green-400 animate-bounce opacity-25" />
                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                    </div>
                                    <h3 className="text-xl font-black text-white tracking-tight">Payment Verified!</h3>
                                    <p className="text-green-400 font-bold text-[10px] tracking-widest">Redirecting to confirmation...</p>
                                </div>
                            )}

                            {paymentStatus === 'declined' && (
                                <div className="text-center space-y-3">
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20 bg-red-500/5">
                                        <WifiOff className="w-8 h-8 text-red-500" />
                                    </div>
                                    <h3 className="text-lg font-black text-white tracking-tight">Receipt Declined</h3>
                                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/25 text-left">
                                        <p className="text-[8px] font-black text-red-400 tracking-wider mb-0.5">REASON</p>
                                        <p className="text-xs text-red-300 font-bold leading-snug">{declineReason}</p>
                                    </div>
                                    <button
                                        onClick={() => { setPaymentStatus('idle'); setReceiptFile(null); setReceiptPreview(null); setStep('upload'); }}
                                        className="w-full py-2.5 rounded-lg font-black tracking-widest text-white text-[10px] bg-primary hover:bg-orange-600 transition-all uppercase"
                                    >
                                        Upload New Receipt
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Sticky Footer ─────────────────────────────────────────── */}
                <div className="shrink-0 px-4 pb-4 pt-2 bg-transparent border-t border-white/10 flex flex-col gap-1.5">
                    {step === 'qr' && (
                        <>
                            <button
                                onClick={handleIveSent}
                                disabled={expired}
                                className="w-full py-3 rounded-xl font-black tracking-widest text-white text-xs transition-all active:scale-95 disabled:opacity-40 bg-primary hover:bg-orange-600 shadow-xl shadow-primary/20"
                            >
                                I've Sent the Payment →
                            </button>
                            <button
                                onClick={handleCloseAttempt}
                                className="w-full text-gray-500 hover:text-white font-black tracking-[0.2em] text-[9px] py-1 transition-all animate-pulse"
                            >
                                ← Cancel
                            </button>
                        </>
                    )}

                    {step === 'upload' && (
                        <>
                            <button
                                onClick={handleSubmitReceipt}
                                disabled={paymentStatus === 'uploading' || !receiptFile}
                                className="w-full py-3 rounded-xl font-black tracking-widest text-white text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 bg-primary hover:bg-orange-600 shadow-xl shadow-primary/20"
                            >
                                {paymentStatus === 'uploading' ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 text-white/50" />
                                        Submit Receipt
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => setStep('qr')}
                                disabled={paymentStatus === 'uploading'}
                                className="w-full text-gray-500 hover:text-white font-black tracking-[0.2em] text-[9px] py-1 transition-all"
                            >
                                ← Back to QR
                            </button>
                        </>
                    )}

                    {step === 'waiting' && paymentStatus === 'pending_review' && (
                        <p className="text-center text-[9px] text-red-400 font-black tracking-widest py-1 uppercase">
                            Keep this screen open. Closing will cancel your booking request.
                        </p>
                    )}
                </div>
            </div>

            {/* Caution Cancel Booking Modal */}
            {showCancelCaution && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn text-center">
                    <div className="bg-[#1C1C1E] border border-red-500/30 rounded-3xl p-6 max-w-sm w-full space-y-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute -top-12 -right-12 w-28 h-28 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>
                        <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto relative animate-bounce">
                            <AlertCircle className="w-7 h-7" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-white font-black text-lg tracking-tight">Cancel Booking?</h4>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Closing this payment screen will cancel your booking request. Are you sure you want to cancel?
                            </p>
                        </div>
                        <div className="flex flex-col gap-2.5">
                            <button
                                onClick={handleConfirmCancelBooking}
                                className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-900/20"
                            >
                                Yes, Cancel Booking
                            </button>
                            <button
                                onClick={() => setShowCancelCaution(false)}
                                className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 font-black rounded-xl text-xs uppercase tracking-widest border border-white/5 transition-all active:scale-95"
                            >
                                No, Continue Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GCashPaymentModal;
