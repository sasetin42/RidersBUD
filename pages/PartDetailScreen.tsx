import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../context/DatabaseContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { ArrowLeft, Star, ShoppingBag, Heart, Check, Truck, ShieldCheck, Share2, Facebook, Twitter, Send, Link as LinkIcon, X } from 'lucide-react';
import { Button, Badge } from '../components/ui';
import AddToCartSuccessModal from '../components/AddToCartSuccessModal';

const PartDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { db } = useDatabase();
    const { addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

    const part = useMemo(() => db?.parts.find(p => p.id === id), [db, id]);
    const [mainImage, setMainImage] = useState(part?.imageUrls[0] || '');
    const [selectedQty, setSelectedQty] = useState(1);
    const [isAdded, setIsAdded] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    if (!part) return null; // Or loading state

    const handleShare = async () => {
        const shareData = {
            title: part.name,
            text: `Check out the ${part.name} on RidersBUD! Only ₱${part.price.toLocaleString()}`,
            url: window.location.href
        };

        // Try using Web Share API first (supported on mobile browsers)
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                return;
            } catch (err) {
                console.log('Web share failed or dismissed, opening custom share modal:', err);
            }
        }
        
        // Show custom share modal if Web Share is not available or fails
        setShowShareModal(true);
    };

    // Ensure main image is set if it wasn't initially
    if (!mainImage && part.imageUrls.length > 0) setMainImage(part.imageUrls[0]);

    const isWishlisted = isInWishlist(part.id);
    const hasSale = part.salesPrice && part.salesPrice < part.price;
    const stockStatus = part.stock > 10 ? 'Available' : part.stock > 0 ? `Only ${part.stock} Left` : 'Out of Stock';

    const handleAddToCart = () => {
        if (part.stock > 0) {
            addToCart({ ...part, quantity: selectedQty });
            setIsAdded(true);
            setShowSuccessModal(true); // Open success modal
            setTimeout(() => setIsAdded(false), 2000);
        }
    };

    const handleToggleWishlist = () => {
        if (isWishlisted) removeFromWishlist(part.id);
        else addToWishlist(part);
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#121212] text-white font-sans pb-28">
            {/* Hero Section */}
            <div className="relative w-full aspect-square bg-[#1E1E1E] flex items-center justify-center overflow-hidden">
                <img
                    src={mainImage}
                    alt={part.name}
                    className="w-[85%] h-[85%] object-contain mix-blend-normal drop-shadow-2xl z-10"
                />

                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#121212] z-20 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-white/5 blur-3xl rounded-full z-0" />

                {/* Header Controls */}
                <div className="absolute top-0 left-0 right-0 p-6 flex justify-between z-30">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={handleToggleWishlist}
                            className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-colors ${isWishlisted ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-black/40 border-white/10 text-white hover:bg-black/60'}`}
                        >
                            <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                        </button>
                        <button 
                            onClick={handleShare}
                            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition-colors"
                        >
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>

                {/* Image Gallery Thumbnails (Floating) */}
                {part.imageUrls.length > 1 && (
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-30 px-6 overflow-x-auto">
                        {part.imageUrls.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setMainImage(img)}
                                className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${mainImage === img ? 'border-primary scale-110 shadow-lg' : 'border-white/20 opacity-70'}`}
                            >
                                <img src={img} alt={part.name} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content Container */}
            <div className="px-6 relative z-10 -mt-6">
                <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className="text-gray-400 border-gray-600 mb-2">{part.brand}</Badge>
                    <div className="flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
                        <Star size={12} fill="currentColor" />
                        <span className="text-xs font-bold">4.8</span>
                    </div>
                </div>

                <h1 className="text-2xl font-black text-white leading-tight mb-2">{part.name}</h1>

                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-baseline gap-2">
                        {hasSale ? (
                            <>
                                <span className="text-3xl font-black text-primary">₱{part.salesPrice!.toLocaleString()}</span>
                                <span className="text-sm font-semibold text-gray-500 line-through">₱{part.price.toLocaleString()}</span>
                            </>
                        ) : (
                            <span className="text-3xl font-black text-primary">₱{part.price.toLocaleString()}</span>
                        )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide flex items-center ${part.stock > 0 ? 'bg-[#FACC15] text-[#FFFFFF]' : 'bg-[red] text-white'}`}>
                        {part.stock > 10 && <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />}
                        {stockStatus}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Description */}
                    <div className="bg-[#1E1E1E] rounded-2xl p-5 border border-white/5">
                        <h3 className="text-sm font-bold text-gray-400  tracking-widest mb-3">Description</h3>
                        <p className="text-gray-300 text-sm leading-relaxed">{part.description}</p>
                    </div>

                    {/* Features / Specs Mockup */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#1E1E1E] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <ShieldCheck size={16} />
                            </div>
                            <div>
                                <p className="text-[10px]  font-bold text-gray-500">Warranty</p>
                                <p className="text-xs font-bold text-white">1 Year</p>
                            </div>
                        </div>
                        <div className="bg-[#1E1E1E] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                                <Truck size={16} />
                            </div>
                            <div>
                                <p className="text-[10px]  font-bold text-gray-500">Shipping</p>
                                <p className="text-xs font-bold text-white">2-3 Days</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#121212]/90 backdrop-blur-xl border-t border-white/10 z-50 animate-slideUp">
                <div className="max-w-2xl mx-auto w-full flex gap-3 items-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex-1 py-3.5 bg-white hover:bg-gray-100 text-black font-bold rounded-xl transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAddToCart}
                        disabled={part.stock <= 0}
                        className={`flex-[2] py-3.5 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm ${isAdded
                            ? 'bg-green-600 text-white shadow-green-500/20'
                            : part.stock <= 0
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-white text-black hover:bg-gray-200'
                            }`}
                    >
                        {isAdded ? (
                            <>
                                <Check size={18} /> Added to Cart
                            </>
                        ) : (
                            <>
                                <ShoppingBag size={18} /> {part.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Success Modal */}
            <AddToCartSuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                item={part}
                quantity={selectedQty}
            />

            {/* Custom Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-[#151515] rounded-[2rem] p-6 max-w-sm w-full border border-white/5 shadow-2xl relative animate-slideInUp">
                        {/* Close button */}
                        <button
                            onClick={() => setShowShareModal(false)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>

                        <h3 className="text-lg font-black text-white mb-2">Share Product</h3>
                        <p className="text-gray-400 text-xs mb-6">
                            Share this item with friends on social media or copy the direct product link.
                        </p>

                        {/* Social sharing grid */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <a
                                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#1877F2]/10 border border-[#1877F2]/20 hover:bg-[#1877F2]/25 transition text-[#1877F2]"
                            >
                                <Facebook size={20} />
                                <span className="text-[10px] font-bold">Facebook</span>
                            </a>

                            <a
                                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`Check out the ${part.name} on RidersBUD! Only ₱${part.price.toLocaleString()}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/15 transition text-white"
                            >
                                <Twitter size={20} />
                                <span className="text-[10px] font-bold">Twitter</span>
                            </a>

                            <a
                                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out the ${part.name} on RidersBUD! Only ₱${part.price.toLocaleString()} ` + window.location.href)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/25 transition text-[#25D366]"
                            >
                                <Send size={20} />
                                <span className="text-[10px] font-bold">WhatsApp</span>
                            </a>

                            <button
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(window.location.href);
                                        setCopied(true);
                                        setShowShareModal(false);
                                        setTimeout(() => setCopied(false), 2000);
                                    } catch (err) {
                                        console.error('Failed to copy:', err);
                                    }
                                }}
                                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/25 transition text-primary"
                            >
                                <LinkIcon size={20} />
                                <span className="text-[10px] font-bold">Copy Link</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowShareModal(false)}
                            className="w-full bg-[#222] border border-white/5 text-white font-bold py-3 rounded-xl hover:bg-[#333] transition text-xs tracking-wider uppercase active:scale-95"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Clipboard Toast Banner */}
            {copied && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#1E1E1E] text-white px-5 py-3 rounded-xl border border-white/10 shadow-2xl flex items-center gap-2 animate-bounce">
                    <Check size={16} className="text-green-400" />
                    <span className="text-xs font-bold">Product link copied to clipboard!</span>
                </div>
            )}
        </div>
    );
};

export default PartDetailScreen;
