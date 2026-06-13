import React, { useState, useEffect, useMemo } from 'react';
import { Review } from '../types';
import { Star, X } from 'lucide-react';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => Promise<void>;
    existingReview?: Review | null;
    isSubmitting?: boolean;
    mechanicName?: string;
    mechanicImageUrl?: string;
}

const QUICK_TAGS = ["Fast Service", "Fair Pricing", "Expert Work", "Highly Professional", "Polite & Helpful"];

const ReviewModal: React.FC<ReviewModalProps> = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    existingReview, 
    isSubmitting = false,
    mechanicName,
    mechanicImageUrl
}) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [hoverRating, setHoverRating] = useState(0);
    const [error, setError] = useState('');

    const maxChars = 500;

    useEffect(() => {
        if (isOpen) {
            if (existingReview) {
                setRating(existingReview.rating);
                setComment(existingReview.comment);
            } else {
                setRating(0);
                setComment('');
            }
            setError('');
        }
    }, [isOpen, existingReview]);

    const activeTags = useMemo(() => {
        return QUICK_TAGS.filter(tag => comment.toLowerCase().includes(tag.toLowerCase()));
    }, [comment]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (rating === 0) {
            setError('Please select a star rating.');
            return;
        }
        if (!comment.trim()) {
            setError('Please write a comment about your experience.');
            return;
        }

        try {
            await onSubmit(rating, comment);
            onClose();
        } catch (err) {
            setError('Failed to submit review. Please try again.');
        }
    };

    const handleTagToggle = (tag: string) => {
        const isSelected = comment.toLowerCase().includes(tag.toLowerCase());
        if (isSelected) {
            // Remove tag and clean up commas/whitespace
            const regex = new RegExp(`\\b${tag}\\b\\s*,?\\s*|\\s*,?\\s*\\b${tag}\\b`, 'gi');
            let newComment = comment.replace(regex, '').trim();
            // Remove trailing/leading commas if any left
            newComment = newComment.replace(/^,|,$/g, '').trim();
            setComment(newComment);
        } else {
            // Append tag
            const cleanComment = comment.trim();
            if (cleanComment.length + tag.length + 2 > maxChars) return; // Prevent exceeding limit
            if (cleanComment === '') {
                setComment(tag);
            } else if (cleanComment.endsWith(',')) {
                setComment(`${cleanComment} ${tag}`);
            } else {
                setComment(`${cleanComment}, ${tag}`);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#121212] border border-white/10 rounded-[2.5rem] w-full max-w-md p-6 sm:p-8 relative animate-scaleUp shadow-2xl overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5 active:scale-90"
                >
                    <X size={20} />
                </button>

                {/* Mechanic Header */}
                {mechanicName ? (
                    <div className="flex flex-col items-center mb-5">
                        <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-primary/20 bg-white/5 mb-3 shadow-lg relative group">
                            {mechanicImageUrl ? (
                                <img src={mechanicImageUrl} alt={mechanicName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-primary font-black text-3xl bg-gradient-to-br from-primary/10 to-orange-500/10">
                                    {mechanicName.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-500 font-black tracking-[0.2em] uppercase leading-none mb-1.5">Rate Your Service</p>
                        <h2 className="text-xl font-black text-white text-center leading-tight">{mechanicName}</h2>
                    </div>
                ) : (
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-black text-white mb-2 leading-none">
                            {existingReview ? 'Edit Review' : 'Rate Your Service'}
                        </h2>
                        <p className="text-gray-400 text-xs font-medium">
                            How was your experience? Your feedback helps us improve.
                        </p>
                    </div>
                )}

                {/* Star Rating Selector */}
                <div className="flex justify-center gap-3 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            className="transition-transform hover:scale-125 focus:outline-none active:scale-90 p-1"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        >
                            <Star
                                size={36}
                                className={`transition-all duration-200 ${
                                    star <= (hoverRating || rating)
                                        ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.55)]'
                                        : 'text-gray-600 fill-transparent hover:text-yellow-400/40'
                                }`}
                            />
                        </button>
                    ))}
                </div>

                {/* Quick Feedback Tags */}
                <div className="space-y-2.5 mb-6">
                    <p className="text-[10px] font-black text-gray-500 tracking-wider uppercase text-center">Tap to describe your experience</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {QUICK_TAGS.map((tag) => {
                            const isSelected = activeTags.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => handleTagToggle(tag)}
                                    className={`px-3 py-1.5 rounded-full border text-[11px] font-extrabold transition-all duration-200 active:scale-95 cursor-pointer ${
                                        isSelected
                                            ? 'bg-primary/20 border-primary/50 text-primary scale-[1.03]'
                                            : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Comment Text Area */}
                <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-xs font-bold text-gray-500 tracking-wider">Your Review</label>
                        <span className={`text-[10px] font-bold ${comment.length >= maxChars ? 'text-red-400' : 'text-gray-500'}`}>
                            {comment.length} / {maxChars}
                        </span>
                    </div>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value.slice(0, maxChars))}
                        placeholder="Tell us what you liked or didn't like..."
                        rows={4}
                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-2xl p-4 text-white text-sm placeholder-gray-500 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 outline-none resize-none transition-all"
                    />
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs text-center font-bold">
                        {error}
                    </div>
                )}

                {/* Submit Action Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-primary hover:bg-orange-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        existingReview ? 'Update Review' : 'Submit Review'
                    )}
                </button>
            </div>
        </div>
    );
};

export default ReviewModal;
