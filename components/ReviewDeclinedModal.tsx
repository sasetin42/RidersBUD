import React, { useState } from 'react';

interface ReviewDeclinedModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string, details?: string) => Promise<void>;
}

const ReviewDeclinedModal: React.FC<ReviewDeclinedModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [otherReason, setOtherReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const reasons = [
        "In a hurry",
        "Prefer not to say",
        "Service wasn't good",
        "App issues",
        "Mechanic asked me not to",
        "Other"
    ];

    const handleSubmit = async () => {
        if (!selectedReason) return;
        setIsSubmitting(true);
        try {
            await onSubmit(selectedReason, otherReason);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#181818] border border-white/10 rounded-2xl w-full max-w-md p-6 relative animate-scaleUp shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h2 className="text-xl font-bold text-white mb-2 text-center">We'd love to know why</h2>
                <p className="text-gray-400 text-sm text-center mb-6">
                    Is there a reason you prefer not to leave a review? Your feedback helps us improve.
                </p>

                <div className="space-y-3 mb-6">
                    {reasons.map((reason) => (
                        <button
                            key={reason}
                            onClick={() => setSelectedReason(reason)}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${selectedReason === reason
                                ? 'bg-primary/10 border-primary text-white'
                                : 'bg-[#242424] border-white/5 text-gray-400 hover:bg-[#2a2a2a]'
                                }`}
                        >
                            <span>{reason}</span>
                            {selectedReason === reason && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>

                {selectedReason === 'Other' && (
                    <div className="mb-6 animate-slideDown">
                        <textarea
                            value={otherReason}
                            onChange={(e) => setOtherReason(e.target.value)}
                            placeholder="Please tell us more..."
                            className="w-full bg-[#242424] border border-white/5 rounded-xl p-3 text-white text-sm focus:border-primary outline-none"
                            rows={3}
                        />
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onClose}
                        className="bg-white/5 hover:bg-white/10 text-gray-300 font-bold py-3 rounded-xl transition"
                    >
                        Skip
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedReason || isSubmitting}
                        className="bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReviewDeclinedModal;
