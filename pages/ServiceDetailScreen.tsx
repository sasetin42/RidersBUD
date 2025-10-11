

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import ChatModal from '../components/ChatModal';
import { useWishlist } from '../context/WishlistContext';

const ServiceDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { db } = useDatabase();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isAdded, setIsAdded] = useState(false);

    const service = db?.services.find(s => s.id === id);

    if (!db) {
        return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;
    }

    if (!service) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <Header title="Not Found" showBackButton />
                <div className="flex-grow flex items-center justify-center">
                    <p>Service not found.</p>
                </div>
            </div>
        );
    }
    
    const virtualMechanicName = db?.settings.virtualMechanicName || 'an Assistant';
    const isWishlisted = isInWishlist(service.id);

    const handleAddToCart = () => {
        addToCart(service);
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 2000);
    };

    const handleToggleWishlist = () => {
        if (isWishlisted) {
            removeFromWishlist(service.id);
        } else {
            addToWishlist(service);
        }
    };


    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title={service.name} showBackButton />
            <div className="flex-grow overflow-y-auto">
                <img src={service.imageUrl} alt={service.name} className="w-full h-48 object-cover" />
                <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h1 className="text-2xl font-bold text-white">{service.name}</h1>
                            <div className="flex items-center text-light-gray mt-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>{service.estimatedTime || 'N/A'}</span>
                            </div>
                        </div>
                        <button 
                            onClick={handleToggleWishlist} 
                            className="bg-dark-gray/50 backdrop-blur-sm rounded-full p-3 z-10 transition-transform duration-200 hover:scale-110 flex-shrink-0" 
                            aria-label="Toggle Wishlist"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-colors ${isWishlisted ? 'text-red-500' : 'text-white'}`} fill={isWishlisted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                            </svg>
                        </button>
                    </div>
                     <span className="text-2xl font-bold text-primary mb-4 block">{service.price > 0 ? `₱${service.price.toLocaleString()}` : 'Quote Required'}</span>

                    <p className="text-light-gray">{service.description}</p>
                    
                    <button 
                        onClick={() => setIsChatOpen(true)}
                        className="w-full mt-6 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition flex items-center justify-center gap-2"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Chat with {virtualMechanicName}
                    </button>
                </div>
            </div>
            <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray flex gap-4">
                <button 
                    onClick={handleAddToCart}
                    disabled={isAdded}
                    className={`w-1/2 font-bold py-3 rounded-lg transition-all duration-300 ease-in-out transform active:scale-100 ${
                        isAdded 
                        ? 'bg-green-600 text-white' 
                        : 'bg-field text-white hover:bg-gray-700 hover:scale-[1.03] hover:shadow-lg hover:shadow-gray-900/50'
                    }`}
                >
                    {isAdded ? 'Added ✓' : 'Add to Cart'}
                </button>
                <button onClick={() => navigate(`/booking/${service.id}`)} className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-all duration-300 ease-in-out transform hover:scale-[1.03] hover:shadow-lg hover:shadow-primary/40 active:scale-100">
                    Book Now
                </button>
            </div>
             {isChatOpen && <ChatModal service={service} onClose={() => setIsChatOpen(false)} />}
        </div>
    );
};

export default ServiceDetailScreen;