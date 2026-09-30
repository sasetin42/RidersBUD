import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../context/DatabaseContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { 
    ArrowLeft, Star, ShoppingBag, Heart, Check, Truck, ShieldCheck, Share2, 
    Facebook, Twitter, Send, Link as LinkIcon, X, MessageCircle, Linkedin, 
    MessageSquare, Mail, Minus, Plus, Zap, CheckCircle2, Wrench, Award,
    Layers, Cpu, RefreshCw, AlertCircle
} from 'lucide-react';
import { Button, Badge } from '../components/ui';
import AddToCartSuccessModal from '../components/AddToCartSuccessModal';
import { getPartImage } from '../utils/fallbackImages';

const PartDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { db } = useDatabase();
    const { addToCart } = useCart();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

    const part = useMemo(() => db?.parts.find(p => p.id === id), [db, id]);
    const resolvedDefaultImage = useMemo(() => part ? getPartImage(part) : '', [part]);
    const [mainImage, setMainImage] = useState(resolvedDefaultImage);
    const [selectedQty, setSelectedQty] = useState(1);
    const [isAdded, setIsAdded] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    // Ensure main image is set if it wasn't initially or defaults to resolved real image
    if (!mainImage && resolvedDefaultImage) setMainImage(resolvedDefaultImage);

    const handleShare = () => {
        setShowShareModal(true);
    };

    const isWishlisted = isInWishlist(part?.id || '');
    const effectivePrice = part?.salesPrice && part.salesPrice < (part?.price || 0) ? part.salesPrice : (part?.price || 0);
    const hasSale = !!(part?.salesPrice && part.salesPrice < (part?.price || 0));
    const discountPercent = hasSale && part?.price ? Math.round(((part.price - part.salesPrice!) / part.price) * 100) : 0;
    const stockStatus = (part?.stock ?? 0) > 10 ? 'In Stock' : (part?.stock ?? 0) > 0 ? `Only ${part?.stock} Left` : 'Out of Stock';

    const handleQtyChange = (delta: number) => {
        setSelectedQty(prev => {
            const next = prev + delta;
            if (next < 1) return 1;
            if (part && part.stock > 0 && next > part.stock) return part.stock;
            return next;
        });
    };

    const handleAddToCart = () => {
        if (part && part.stock > 0) {
            addToCart({ ...part, quantity: selectedQty });
            setIsAdded(true);
            setShowSuccessModal(true);
            setTimeout(() => setIsAdded(false), 2000);
        }
    };

    const handleBuyNow = () => {
        if (part && part.stock > 0) {
            addToCart({ ...part, quantity: selectedQty });
            navigate('/customer-portal/cart');
        }
    };

    const handleToggleWishlist = () => {
        if (!part) return;
        if (isWishlisted) removeFromWishlist(part.id);
        else addToWishlist(part);
    };

    // Category-specific specifications generator for high-grade presentation (with admin customization override)
    const technicalSpecs = useMemo(() => {
        if (!part) return [];
        if (part.technicalSpecs && part.technicalSpecs.length > 0) {
            return part.technicalSpecs;
        }

        const cat = (part.category || '').toLowerCase();
        const nm = (part.name || '').toLowerCase();

        if (cat.includes('brake') || nm.includes('brake') || nm.includes('pad')) {
            return [
                { label: 'Material', value: 'Premium Copper-Free Ceramic Composite' },
                { label: 'Position', value: 'Front Axle (Left & Right)' },
                { label: 'Friction Code', value: 'GG Rated (DOT Standard)' },
                { label: 'Thermal Tolerance', value: 'Up to 650°C (1200°F)' },
                { label: 'Hardware Included', value: 'Multi-layer Shims & Wear Clips' },
                { label: 'Certifications', value: 'ISO 9001 / ECE R90 Certified' },
            ];
        } else if (cat.includes('engine') || nm.includes('oil')) {
            return [
                { label: 'Viscosity Grade', value: 'SAE 5W-30 Full Synthetic' },
                { label: 'Volume', value: '5 Quarts (4.73 Liters)' },
                { label: 'API Standard', value: 'API SP / ILSAC GF-6A' },
                { label: 'Drain Interval', value: 'Up to 10,000 Miles / 1 Year' },
                { label: 'Engine Protection', value: 'Advanced Sludge & Thermal Breakdown' },
                { label: 'Manufacturer Approvals', value: 'Dexos1 Gen3, OEM Compliant' },
            ];
        } else if (cat.includes('filter')) {
            return [
                { label: 'Media Type', value: 'Multi-Fiber Pleated Micro-Cellulose' },
                { label: 'Filtration Rating', value: '99.2% Efficiency at 20 Microns' },
                { label: 'Seal Design', value: 'High-Temperature Polyurethane Gasket' },
                { label: 'Service Interval', value: '15,000 - 30,000 KM' },
                { label: 'Flow Resistance', value: 'Ultra-Low Airflow Restriction' },
                { label: 'Compatibility', value: 'Direct Drop-in OEM Replacement' },
            ];
        } else if (cat.includes('tool')) {
            return [
                { label: 'Material', value: 'Forged Chrome Vanadium (Cr-V) Steel' },
                { label: 'Finish', value: 'Corrosion-Resistant Mirror Polish' },
                { label: 'Drive / Size', value: 'Standard Metric & Imperial' },
                { label: 'Tolerance Standard', value: 'ANSI / DIN Precision Spec' },
                { label: 'Ergonomics', value: 'Slip-Resistant Textured Comfort Grip' },
                { label: 'Warranty Type', value: 'Lifetime Mechanics Assurance' },
            ];
        } else {
            return [
                { label: 'Build Material', value: 'Industrial OEM Grade Component' },
                { label: 'Part Category', value: part.category || 'Automotive Component' },
                { label: 'Fitment Type', value: 'Direct Replacement' },
                { label: 'SKU / Part ID', value: part.sku || part.id },
                { label: 'Quality Standard', value: 'Rigorous Road Tested QA' },
                { label: 'Warranty Support', value: '12-Month RidersBUD Protection' },
            ];
        }
    }, [part]);

    // Vehicle compatibility list (with admin customization override)
    const vehicleFitment = useMemo(() => {
        if (!part) return [];
        if (part.vehicleFitment && part.vehicleFitment.length > 0) {
            return part.vehicleFitment;
        }

        const cat = (part.category || '').toLowerCase();
        const nm = (part.name || '').toLowerCase();

        if (cat.includes('brake') || nm.includes('brake') || nm.includes('pad')) {
            return [
                { make: 'Toyota', models: 'Vios (2013-2024), Yaris, Corolla Altis' },
                { make: 'Honda', models: 'City (GM6/GN2), Civic, Jazz/Fit' },
                { make: 'Mitsubishi', models: 'Mirage G4, Xpander (Cross)' },
                { make: 'Nissan', models: 'Almera (N17/N18), Sentra' },
            ];
        } else if (cat.includes('engine') || nm.includes('oil')) {
            return [
                { make: 'Gasoline & Hybrid', models: 'All 4-Cylinder & V6 Petrol/Hybrid Engines' },
                { make: 'Toyota / Lexus', models: 'Vios, Innova, Fortuner Gas, Camry, RAV4' },
                { make: 'Honda', models: 'Civic, City, CR-V, HR-V, Accord' },
                { make: 'Mazda / Subaru', models: 'SkyActiv-G & Boxer Engines' },
            ];
        } else {
            return [
                { make: 'Universal Fit', models: 'Standard OEM mounting & dimensions' },
                { make: 'Asian Compacts', models: 'Toyota, Honda, Mitsubishi, Nissan, Suzuki' },
                { make: 'Sedans & SUVs', models: 'Compatible across popular Philippine commuter lines' },
            ];
        }
    }, [part]);

    if (!part) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white p-6">
                <AlertCircle size={48} className="text-primary mb-4 animate-pulse" />
                <h2 className="text-xl font-bold mb-2">Part Not Found</h2>
                <p className="text-gray-400 text-sm mb-6 text-center">The requested product does not exist or has been removed.</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-orange-600 transition"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#121212] text-white font-sans pb-36">
            {/* Hero Section */}
            <div className="relative w-full min-h-[280px] max-h-[360px] aspect-[4/3] sm:aspect-video bg-gradient-to-b from-[#18181D] to-[#141418] flex items-center justify-center overflow-hidden border-b border-white/5">
                <img
                    src={mainImage}
                    alt={part.name}
                    className="w-[85%] h-[85%] max-h-[280px] object-contain drop-shadow-2xl z-10 transition-transform duration-300 hover:scale-105"
                />

                {/* Subtle Brand Glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-black/40 z-20 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/10 blur-3xl rounded-full z-0" />

                {/* Header Controls */}
                <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-between z-30">
                    <button
                        onClick={() => navigate(-1)}
                        aria-label="Go back"
                        className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-primary/20 hover:border-primary/50 transition-all active:scale-95 shadow-lg"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex gap-2.5">
                        <button
                            onClick={handleToggleWishlist}
                            aria-label="Save to wishlist"
                            className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-all active:scale-95 shadow-lg ${
                                isWishlisted 
                                    ? 'bg-red-500/20 border-red-500 text-red-500' 
                                    : 'bg-black/60 border-white/10 text-white hover:bg-black/80 hover:border-white/30'
                            }`}
                        >
                            <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                        </button>
                        <button 
                            onClick={handleShare}
                            aria-label="Share product"
                            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-primary/20 hover:border-primary/50 transition-all active:scale-95 shadow-lg"
                        >
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>

                {/* Image Gallery Thumbnails */}
                {part.imageUrls.length > 1 && (
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-30 px-4 overflow-x-auto">
                        {part.imageUrls.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setMainImage(img)}
                                className={`w-11 h-11 rounded-xl overflow-hidden border-2 transition-all p-1 bg-black/50 backdrop-blur-md ${
                                    mainImage === img ? 'border-primary scale-105 shadow-lg shadow-primary/20' : 'border-white/20 opacity-60 hover:opacity-100'
                                }`}
                            >
                                <img src={img} alt={`${part.name}-${idx}`} className="w-full h-full object-contain rounded-lg" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content Container */}
            <div className="px-4 sm:px-6 relative z-10 pt-4 space-y-4">
                {/* Brand & Rating Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
                            {part.brand || 'Genuine OEM'}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">SKU: {part.sku}</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full">
                        <Star size={13} fill="currentColor" />
                        <span className="text-xs font-black">{part.rating !== undefined ? Number(part.rating).toFixed(1) : '4.9'}</span>
                        <span className="text-[10px] text-gray-400">({part.reviewCount ?? 128})</span>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                    {part.name}
                </h1>

                {/* Price & Stock Card */}
                <div className="bg-[#16161A] p-4 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Price</span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-3xl font-black text-primary tracking-tight">
                                ₱{effectivePrice.toLocaleString()}
                            </span>
                            {hasSale && (
                                <>
                                    <span className="text-sm font-semibold text-gray-500 line-through">
                                        ₱{part.price.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                        {discountPercent}% OFF
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1.5 ${
                        part.stock > 10 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                            : part.stock > 0 
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' 
                                : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${
                            part.stock > 10 ? 'bg-emerald-400 animate-pulse' : part.stock > 0 ? 'bg-amber-400' : 'bg-red-400'
                        }`} />
                        {stockStatus}
                    </div>
                </div>

                {/* Description */}
                <div className="bg-[#16161A] rounded-2xl p-5 border border-white/5 space-y-2.5">
                    <div className="flex items-center gap-2">
                        <Layers size={16} className="text-primary" />
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Product Overview</h3>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed font-normal">
                        {part.description || 'Precision engineered automotive replacement part designed for uncompromising durability, rigorous safety compliance, and maximum operational efficiency.'}
                    </p>
                </div>

                {/* Vehicle Compatibility Section */}
                <div className="bg-[#16161A] rounded-2xl p-5 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-400" />
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Guaranteed Vehicle Fitment</h3>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            100% Fitment Match
                        </span>
                    </div>

                    <div className="space-y-2 pt-1">
                        {vehicleFitment.map((item, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-xs p-2 rounded-xl bg-white/[0.02] border border-white/5">
                                <span className="font-bold text-primary whitespace-nowrap min-w-[100px]">{item.make}:</span>
                                <span className="text-gray-300">{item.models}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Technical Specifications Table */}
                <div className="bg-[#16161A] rounded-2xl p-5 border border-white/5 space-y-3">
                    <div className="flex items-center gap-2">
                        <Wrench size={16} className="text-primary" />
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">Technical Specifications</h3>
                    </div>

                    <div className="divide-y divide-white/5 text-xs">
                        {technicalSpecs.map((spec, i) => (
                            <div key={i} className="py-2.5 flex justify-between items-center">
                                <span className="text-gray-400 font-medium">{spec.label}</span>
                                <span className="font-semibold text-white text-right">{spec.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Warranty & Delivery Badges */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#16161A] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{part.warrantyInfo?.title || 'Warranty'}</p>
                            <p className="text-xs font-black text-white">{part.warrantyInfo?.coverage || '1-Year Coverage'}</p>
                            <p className="text-[10px] text-gray-500">{part.warrantyInfo?.subtitle || 'Official Factory Protection'}</p>
                        </div>
                    </div>

                    <div className="bg-[#16161A] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                            <Truck size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{part.shippingInfo?.title || 'Shipping'}</p>
                            <p className="text-xs font-black text-white">{part.shippingInfo?.eta || 'Express 2-3 Days'}</p>
                            <p className="text-[10px] text-gray-500">{part.shippingInfo?.subtitle || 'Tracked Courier Dispatch'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Action Bar with Quantity Selector & Brand CTA */}
            <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-[#121212]/95 backdrop-blur-xl border-t border-white/10 z-50 animate-slideUp shadow-2xl">
                <div className="max-w-2xl mx-auto w-full space-y-2.5">
                    {/* Quantity Selector Bar */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400">Quantity:</span>
                            <div className="flex items-center bg-[#1E1E24] rounded-xl border border-white/10 p-0.5">
                                <button
                                    onClick={() => handleQtyChange(-1)}
                                    disabled={selectedQty <= 1 || part.stock <= 0}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
                                    aria-label="Decrease quantity"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="w-9 text-center font-bold text-sm text-white font-mono">
                                    {selectedQty}
                                </span>
                                <button
                                    onClick={() => handleQtyChange(1)}
                                    disabled={part.stock <= 0 || selectedQty >= part.stock}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
                                    aria-label="Increase quantity"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Subtotal Calculation */}
                        <div className="text-right">
                            <span className="text-[10px] text-gray-500 block font-medium">Subtotal</span>
                            <span className="text-sm font-black text-primary font-mono">
                                ₱{(effectivePrice * selectedQty).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons: Add to Cart + Instant Buy Now */}
                    <div className="flex gap-2.5 items-center">
                        <button
                            onClick={handleAddToCart}
                            disabled={part.stock <= 0}
                            className={`flex-1 py-3.5 px-4 font-bold rounded-xl border transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95 ${
                                isAdded
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30'
                                    : part.stock <= 0
                                        ? 'bg-[#1E1E24] text-gray-600 border-white/5 cursor-not-allowed'
                                        : 'bg-[#1C1C22] text-white border-white/10 hover:bg-white/10 hover:border-primary/50'
                            }`}
                        >
                            {isAdded ? (
                                <>
                                    <Check size={16} className="text-white" /> Added
                                </>
                            ) : (
                                <>
                                    <ShoppingBag size={16} /> Add to Cart
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleBuyNow}
                            disabled={part.stock <= 0}
                            className={`flex-[1.2] py-3.5 px-4 font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95 ${
                                part.stock <= 0
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed shadow-none'
                                    : 'bg-gradient-to-r from-primary via-orange-500 to-amber-500 text-white hover:brightness-110 shadow-primary/30'
                            }`}
                        >
                            <Zap size={16} fill="currentColor" />
                            {part.stock <= 0 ? 'Sold Out' : 'Buy Now'}
                        </button>
                    </div>
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
                    <div className="bg-[#16161A] rounded-[2rem] p-6 max-w-sm w-full border border-white/10 shadow-2xl relative animate-slideInUp">
                        {/* Close button */}
                        <button
                            onClick={() => setShowShareModal(false)}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>

                        <h3 className="text-lg font-black text-white mb-1">Share Product</h3>
                        <p className="text-gray-400 text-xs mb-5">
                            Share this genuine automotive part with friends or copy the direct product link.
                        </p>

                        {/* Social sharing grid */}
                        <div className="grid grid-cols-4 gap-2.5 mb-5">
                            <a
                                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-[#1877F2]/10 border border-[#1877F2]/20 hover:bg-[#1877F2]/25 transition text-[#1877F2]"
                            >
                                <Facebook size={18} />
                                <span className="text-[9px] font-bold">Facebook</span>
                            </a>

                            <a
                                href={`https://x.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`Check out the ${part.name} on RidersBUD! Only ₱${effectivePrice.toLocaleString()}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/15 transition text-white"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="currentColor">
                                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                                </svg>
                                <span className="text-[9px] font-bold">X</span>
                            </a>

                            <a
                                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out the ${part.name} on RidersBUD! Only ₱${effectivePrice.toLocaleString()} ` + window.location.href)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/25 transition text-[#25D366]"
                            >
                                <MessageCircle size={18} />
                                <span className="text-[9px] font-bold">WhatsApp</span>
                            </a>

                            <a
                                href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`Check out the ${part.name} on RidersBUD! Only ₱${effectivePrice.toLocaleString()}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-[#0088cc]/10 border border-[#0088cc]/20 hover:bg-[#0088cc]/25 transition text-[#0088cc]"
                            >
                                <Send size={18} />
                                <span className="text-[9px] font-bold">Telegram</span>
                            </a>

                            <a
                                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-[#0A66C2]/10 border border-[#0A66C2]/20 hover:bg-[#0A66C2]/25 transition text-[#0A66C2]"
                            >
                                <Linkedin size={18} />
                                <span className="text-[9px] font-bold">LinkedIn</span>
                            </a>

                            <a
                                href={`sms:?&body=${encodeURIComponent(`Check out the ${part.name} on RidersBUD! Only ₱${effectivePrice.toLocaleString()} ` + window.location.href)}`}
                                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-[#00e676]/10 border border-[#00e676]/20 hover:bg-[#00e676]/25 transition text-[#00e676]"
                            >
                                <MessageSquare size={18} />
                                <span className="text-[9px] font-bold">SMS</span>
                            </a>

                            <a
                                href={`mailto:?subject=${encodeURIComponent(part.name)}&body=${encodeURIComponent(`Check out the ${part.name} on RidersBUD! Only ₱${effectivePrice.toLocaleString()}\n\n` + window.location.href)}`}
                                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-[#D44638]/10 border border-[#D44638]/20 hover:bg-[#D44638]/25 transition text-[#D44638]"
                            >
                                <Mail size={18} />
                                <span className="text-[9px] font-bold">Email</span>
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
                                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/25 transition text-primary w-full h-full"
                            >
                                <LinkIcon size={18} />
                                <span className="text-[9px] font-bold">Copy Link</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowShareModal(false)}
                            className="w-full bg-[#202026] border border-white/5 text-white font-bold py-3 rounded-xl hover:bg-[#282832] transition text-xs tracking-wider uppercase active:scale-95"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Clipboard Toast Banner */}
            {copied && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#16161A] text-white px-5 py-3 rounded-xl border border-primary/30 shadow-2xl flex items-center gap-2 animate-bounce">
                    <Check size={16} className="text-primary" />
                    <span className="text-xs font-bold">Product link copied to clipboard!</span>
                </div>
            )}
        </div>
    );
};

export default PartDetailScreen;

