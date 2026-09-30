import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, X, Check, ArrowRight } from 'lucide-react';
import { Part } from '../types';
import { getPartImage } from '../utils/fallbackImages';

interface AddToCartSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Part;
    quantity: number;
}

const AddToCartSuccessModal: React.FC<AddToCartSuccessModalProps> = ({
    isOpen,
    onClose,
    item,
    quantity
}) => {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleViewCart = () => {
        onClose();
        navigate('/customer-portal/cart');
    };

    const displayImg = getPartImage(item);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fadeIn">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            />

            {/* Modal Content */}
            <div className="relative bg-[#1E1E1E] rounded-3xl w-full max-w-sm border border-white/10 shadow-2xl transform transition-all animate-scaleIn overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <div className="flex items-center gap-2 text-green-400">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Check size={14} strokeWidth={3} />
                        </div>
                        <span className="font-bold text-sm  tracking-wide">Added to Cart</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5">
                    <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="w-20 h-20 rounded-xl bg-[#121212] border border-white/5 p-2 flex-shrink-0">
                            <img
                                src={displayImg}
                                alt={item.name}
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white text-lg truncate w-full">{item.name}</h3>
                            <p className="text-gray-400 text-xs mb-2">{item.category} • {item.brand}</p>

                            <div className="flex items-center justify-between mt-1">
                                <p className="text-primary font-black">₱{(item.salesPrice || item.price).toLocaleString()}</p>
                                <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">Qty: {quantity}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 bg-[#151515] border-t border-white/5 grid grid-cols-2 gap-3">
                    <button
                        onClick={onClose}
                        className="py-3 px-4 rounded-xl font-bold text-sm bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5 transition-colors"
                    >
                        Continue Shopping
                    </button>
                    <button
                        onClick={handleViewCart}
                        className="py-3 px-4 rounded-xl font-bold text-sm bg-primary text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        View Cart <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddToCartSuccessModal;
