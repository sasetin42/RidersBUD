import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface NativeQrPaymentProps {
    qrCodeData: string;
    amount: number;
    currency?: string;
    referenceNumber?: string;
    expiryMinutes?: number;
    onExpire?: () => void;
}

export const NativeQrPayment: React.FC<NativeQrPaymentProps> = ({
    qrCodeData,
    amount,
    currency = 'PHP',
    referenceNumber,
    expiryMinutes = 15,
    onExpire
}) => {
    const [qrImageUrl, setQrImageUrl] = useState<string>('');
    const [timeLeftSeconds, setTimeLeftSeconds] = useState(expiryMinutes * 60);

    useEffect(() => {
        let isMounted = true;
        // Generate QR code data URL using qrcode
        QRCode.toDataURL(qrCodeData, {
            width: 280,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        })
            .then((url) => {
                if (isMounted) setQrImageUrl(url);
            })
            .catch((err) => {
                console.error('[NativeQrPayment] QR code generation failed:', err);
            });

        return () => {
            isMounted = false;
        };
    }, [qrCodeData]);

    useEffect(() => {
        if (timeLeftSeconds <= 0) {
            onExpire?.();
            return;
        }

        const interval = setInterval(() => {
            setTimeLeftSeconds((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [timeLeftSeconds, onExpire]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleDownloadQr = () => {
        if (!qrImageUrl) return;
        const link = document.createElement('a');
        link.href = qrImageUrl;
        link.download = `QRPH_${referenceNumber || Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-[#18181B] border border-white/10 rounded-3xl p-6 text-center shadow-2xl max-w-sm mx-auto animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#FE7803]/10 border border-[#FE7803]/30 flex items-center justify-center text-[#FE7803]">
                        <QrCode size={18} />
                    </div>
                    <div className="text-left">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#FE7803] block">
                            National QR Standard
                        </span>
                        <h3 className="text-sm font-bold text-white">QR Ph Pay</h3>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-semibold text-gray-300">
                    <Clock size={12} className="text-[#FE7803]" />
                    <span>{formatTime(timeLeftSeconds)}</span>
                </div>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mb-4">
                {qrImageUrl ? (
                    <img
                        src={qrImageUrl}
                        alt="QR Ph Payment Code"
                        className="w-56 h-56 mx-auto object-contain"
                    />
                ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-gray-500 text-xs">
                        Generating QR code...
                    </div>
                )}
            </div>

            {/* Amount details */}
            <div className="mb-4">
                <span className="text-[11px] font-medium text-gray-400 block uppercase tracking-wider">
                    Amount to Pay
                </span>
                <span className="text-2xl font-black text-white">
                    ₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {referenceNumber && (
                    <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                        Ref: #{referenceNumber}
                    </span>
                )}
            </div>

            {/* Instructions */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-left mb-4 space-y-1.5 text-[11px] text-gray-300">
                <div className="flex items-center gap-2 text-white font-semibold">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>Compatible with any PH banking app / e-wallet</span>
                </div>
                <p className="text-gray-400 pl-5 leading-relaxed">
                    Open GCash, Maya, BDO, BPI, or any QR Ph enabled bank and scan this QR code to complete your payment.
                </p>
            </div>

            {/* Action Button */}
            <button
                type="button"
                onClick={handleDownloadQr}
                disabled={!qrImageUrl}
                className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-white/10 cursor-pointer"
            >
                <Download size={14} />
                Save QR to Photos
            </button>
        </div>
    );
};
