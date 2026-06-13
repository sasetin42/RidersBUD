import React, { useState, useEffect, useRef } from 'react';
import { db as firestore, storage, auth } from '../firebase';
import { doc, onSnapshot, updateDoc, collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useDatabase } from '../context/DatabaseContext';
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
    bookingId: string;           // Real Firestore booking or order doc ID
    totalAmount: number;
    paymentAmount?: number;
    paymentLabel?: string;
    customerName: string;
    services?: { name: string; price: number }[];
    isOrder?: boolean;
    onPaymentVerified: () => void;  // Called when admin verifies
    onClose: () => void;
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
}) => {
    const { db, updateBooking, notifyAdminGCashReceiptUploaded } = useDatabase();
    const settings = db?.settings;

    const gcashNumber = settings?.gcashNumber || '09XX-XXX-XXXX';
    const gcashName   = settings?.gcashAccountName || 'RidersBud Services';
    const paymentValue = typeof paymentAmount === 'number' ? paymentAmount : isOrder ? totalAmount : Math.ceil(totalAmount * 0.5);
    const paymentLabelText = paymentLabel || (isOrder ? 'TOTAL PAYMENT' : 'DOWN PAYMENT (50%)');

    // Use admin-uploaded QR from settings, else generate one
    const qrUrl = settings?.gcashQrCodeUrl || buildQrUrl(paymentValue, gcashName, gcashNumber);

    const [step, setStep] = useState<'qr' | 'upload' | 'waiting'>('qr');
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
    const [declineReason, setDeclineReason] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [fileError, setFileError] = useState('');
    const [copied, setCopied] = useState(false);
    const [bookingData, setBookingData] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { display: timer, expired } = useCountdown(15 * 60);

    // ── Lock body scroll ──────────────────────────────────────────────────────
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // ── Real-time Firestore listener on the booking/order doc ───────────────────────
    useEffect(() => {
        if (!bookingId) return;

        const docRef = isOrder ? doc(firestore, 'orders', bookingId) : doc(firestore, 'bookings', bookingId);
        const unsubscribe = onSnapshot(docRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            setBookingData(data);

            if (step === 'waiting') {
                // Admin or mechanic verified via isVerified flag, gcashPaymentStatus or paymentStatus
                if (data.isVerified === true || data.gcashPaymentStatus === 'verified' || data.paymentStatus === 'Paid' || data.paymentStatus === 'paid') {
                    setPaymentStatus('verified');
                    // Small delay for the success animation to show
                    setTimeout(() => onPaymentVerified(), 1800);
                } else if (data.gcashDeclineReason && data.gcashDeclineReason.trim() !== '') {
                    setPaymentStatus('declined');
                    setDeclineReason(data.gcashDeclineReason || 'Payment was declined.');
                } else if (data.gcashReceiptUrl && (data.gcashPaymentStatus === 'receipt_uploaded' || data.gcashPaymentStatus === 'balance_receipt_uploaded')) {
                    setPaymentStatus('pending_review');
                }
            }
        });

        return () => unsubscribe();
    }, [bookingId, step, onPaymentVerified, isOrder]);

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
                    gcashPaymentStatus: 'receipt_uploaded',
                    paymentStatus: 'Unpaid' // will turn to 'Paid' upon verification
                });

                // Notify admin about the order payment
                await addDoc(collection(firestore, 'notifications'), {
                    recipientId: 'all',
                    title: 'GCash Order Payment',
                    message: `GCash receipt uploaded by ${customerName} for parts order #${bookingId.slice(-6).toUpperCase()}.`,
                    type: 'info',
                    timestamp: Date.now(),
                    read: false,
                    link: '/admin-portal/orders'
                });
            } else {
                const isSecondPayment = bookingData?.paymentStatus === 'partial';

                await updateBooking(bookingId, {
                    gcashReceiptUrl: downloadUrl,
                    gcashPaymentStatus: isSecondPayment ? 'balance_receipt_uploaded' : 'receipt_uploaded',
                    paymentStatus: 'partial',
                });

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

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div
                className="relative w-full max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden bg-secondary shadow-2xl border border-dark-gray border-b-0 sm:border-b flex flex-col"
                style={{ maxHeight: 'calc(100dvh - 64px)' }}
            >
                {/* ── Header ───────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3 bg-secondary sticky top-0 z-10 shrink-0 border-b border-dark-gray/60">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#0055EE] flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <span className="text-sm font-black text-white">G</span>
                        </div>
                        <div>
                            <p className="text-xs font-black text-white tracking-tight">GCash Payment</p>
                            <p className="text-[9px] text-gray-500 font-bold tracking-widest">SECURE PORTAL</p>
                        </div>
                    </div>
                    {/* Live indicator */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                            <Wifi size={10} className="text-green-400" />
                            <span className="text-[9px] font-black text-green-400 tracking-widest">LIVE</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full bg-field hover:bg-dark-gray transition-colors"
                            aria-label="Close payment modal"
                        >
                            <svg className="w-4 h-4 text-gray-500 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── Scrollable Body ───────────────────────────────────────── */}
                <div className="p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar">

                    {/* ── Amount Banner (always visible) ── */}
                    <div className="relative rounded-2xl p-4 overflow-hidden border border-white/5 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
                        <p className="text-[9px] font-black text-gray-500 tracking-widest mb-0.5">
                            {paymentLabelText}
                        </p>
                        <p className="text-4xl font-black text-white tracking-tighter">
                            ₱{paymentValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500 font-bold mt-1">
                            {isOrder ? (
                                `₱${totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} total payment`
                            ) : (
                                `Pay ₱${paymentValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })} for ${services.length} service${services.length > 1 ? 's' : ''}`
                            )}
                        </p>
                        {/* Breakdown */}
                        {services.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                                {services.map((s, i) => (
                                    <div key={i} className="flex justify-between text-[10px]">
                                        <span className="text-gray-400 font-bold">{s.name}</span>
                                        <span className="text-white font-black">₱{s.price.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── STEP: QR Code ── */}
                    {step === 'qr' && (
                        <div className="space-y-4">
                            <p className="text-[9px] font-black text-gray-500 tracking-widest text-center">SCAN TO PAY</p>

                            {/* QR */}
                            <div className="flex flex-col items-center gap-3">
                                <div className={`p-3 rounded-2xl border-2 transition-all ${expired ? 'border-red-500/40 opacity-50' : 'border-primary/30 bg-black/40'}`}>
                                    {expired ? (
                                        <div className="w-44 h-44 flex flex-col items-center justify-center gap-3 rounded-xl bg-field">
                                            <AlertCircle className="w-8 h-8 text-red-500" />
                                            <p className="text-red-400 font-black text-xs tracking-widest">QR Expired</p>
                                            <button
                                                onClick={() => window.location.reload()}
                                                className="px-3 py-1.5 rounded-lg text-[10px] font-black text-white bg-primary"
                                            >
                                                Refresh
                                            </button>
                                        </div>
                                    ) : (
                                        <img
                                            src={qrUrl}
                                            alt={`GCash QR Code — pay ₱${paymentValue} to ${gcashName}`}
                                            className="w-44 h-44 rounded-xl"
                                            loading="eager"
                                        />
                                    )}
                                </div>

                                {!expired && (
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10">
                                        <Clock size={10} className="text-primary" />
                                        <span className="text-primary font-mono font-black text-[10px] tracking-tight">
                                            Expires: {timer}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* GCash number */}
                            <div className="rounded-2xl p-4 flex justify-between items-center border border-white/5 bg-field">
                                <div>
                                    <p className="text-[9px] font-black text-gray-500 tracking-widest">GCASH NUMBER</p>
                                    <p className="text-lg font-black text-white tracking-widest mt-0.5">{gcashNumber}</p>
                                    <p className="text-gray-400 font-bold text-[10px] tracking-wider">{gcashName}</p>
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className={`p-3 rounded-xl transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white/5 text-primary hover:bg-primary hover:text-white'}`}
                                    aria-label="Copy GCash number"
                                >
                                    {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                                </button>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                                <AlertCircle size={14} className="text-blue-400 shrink-0" />
                                <p className="text-[10px] text-blue-300 font-bold leading-snug">
                                    Scan the QR or send to the number above. After sending, tap <strong>"I've Sent the Payment"</strong> to upload your receipt.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── STEP: Upload Receipt ── */}
                    {step === 'upload' && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <h3 className="text-xl font-black text-white tracking-tight">Upload Receipt</h3>
                                <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1">
                                    Take a screenshot of your GCash transaction
                                </p>
                            </div>

                            {!receiptPreview ? (
                                <label className="flex flex-col items-center justify-center w-full min-h-[180px] border-2 border-dashed border-primary/20 rounded-2xl bg-black/40 hover:bg-black/60 hover:border-primary/40 transition-all cursor-pointer group p-6">
                                    <div className="p-4 rounded-2xl bg-primary/5 group-hover:bg-primary/10 transition-colors mb-3">
                                        <ImageIcon className="w-8 h-8 text-primary" />
                                    </div>
                                    <p className="text-sm font-black text-white tracking-tight">Select Screenshot</p>
                                    <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1">PNG, JPG, WEBP · Max 5MB</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </label>
                            ) : (
                                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 group">
                                    <img
                                        src={receiptPreview}
                                        alt="GCash receipt preview"
                                        className="w-full max-h-56 object-contain p-3"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-md rounded-xl text-white text-[10px] font-black tracking-widest border border-white/15"
                                        >
                                            <Upload size={12} /> Change
                                        </button>
                                        <button
                                            onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                                            className="p-2.5 bg-red-500/80 hover:bg-red-500 rounded-xl text-white"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                </div>
                            )}

                            {fileError && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                    <p className="text-[10px] font-black text-red-400 tracking-widest">{fileError}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STEP: Waiting for Verification ── */}
                    {step === 'waiting' && (
                        <div className="space-y-4 py-2">
                            {paymentStatus === 'pending_review' && (
                                <div className="text-center space-y-4">
                                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto relative border border-primary/30 bg-primary/5">
                                        <div className="absolute inset-0 rounded-3xl border border-primary/40 animate-ping opacity-20" />
                                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white tracking-tighter">Awaiting Review</h3>
                                        <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1">REAL-TIME SYNC ACTIVE</p>
                                    </div>
                                    <p className="text-xs text-gray-400 font-bold leading-relaxed px-4">
                                        Your receipt has been submitted. Our team will verify and confirm your {isOrder ? 'order' : 'booking'} shortly.
                                    </p>
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                        <span className="text-[10px] text-green-400 font-black tracking-widest">LISTENING FOR UPDATES</span>
                                    </div>
                                </div>
                            )}

                            {paymentStatus === 'verified' && (
                                <div className="text-center space-y-4">
                                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto relative border border-green-500/30 bg-green-500/5">
                                        <div className="absolute inset-0 rounded-3xl border border-green-400 animate-bounce opacity-20" />
                                        <CheckCircle className="w-10 h-10 text-green-500" />
                                    </div>
                                    <h3 className="text-3xl font-black text-white tracking-tighter">Payment Verified!</h3>
                                    <p className="text-green-400 font-bold text-xs tracking-widest">Redirecting to confirmation...</p>
                                </div>
                            )}

                            {paymentStatus === 'declined' && (
                                <div className="text-center space-y-4">
                                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto border border-red-500/30 bg-red-500/5">
                                        <WifiOff className="w-10 h-10 text-red-500" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white tracking-tighter">Receipt Declined</h3>
                                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-left">
                                        <p className="text-[9px] font-black text-red-400 tracking-widest mb-1">REASON</p>
                                        <p className="text-sm text-red-300 font-bold">{declineReason}</p>
                                    </div>
                                    <button
                                        onClick={() => { setPaymentStatus('idle'); setReceiptFile(null); setReceiptPreview(null); setStep('upload'); }}
                                        className="w-full py-3 rounded-xl font-black tracking-widest text-white text-xs bg-primary hover:bg-orange-600 transition-all"
                                    >
                                        Upload New Receipt
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Sticky Footer ─────────────────────────────────────────── */}
                <div className="shrink-0 px-5 pb-5 pt-3 bg-secondary border-t border-white/5 flex flex-col gap-2">
                    {step === 'qr' && (
                        <>
                            <button
                                onClick={handleIveSent}
                                disabled={expired}
                                className="w-full py-4 rounded-xl font-black tracking-widest text-white text-xs transition-all active:scale-95 disabled:opacity-40 bg-primary hover:bg-orange-600 shadow-xl shadow-primary/20"
                            >
                                I've Sent the Payment →
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full text-gray-500 hover:text-white font-black tracking-[0.2em] text-[9px] py-1 transition-all"
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
                                className="w-full py-4 rounded-xl font-black tracking-widest text-white text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 bg-primary hover:bg-orange-600 shadow-xl shadow-primary/20"
                            >
                                {paymentStatus === 'uploading' ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 text-white/50" />
                                        Submit Receipt for Verification
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
                        <p className="text-center text-[9px] text-gray-600 font-bold tracking-widest py-1">
                            You can safely close this screen. We'll notify you when verified.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GCashPaymentModal;
