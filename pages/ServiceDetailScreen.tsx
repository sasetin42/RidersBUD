import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import ChatModal from '../components/ChatModal';
import { useWishlist } from '../context/WishlistContext';
import { Review } from '../types';

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => (
    <div className="bg-field p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
            <p className="font-semibold text-white text-sm">{review.customerName}</p>
            <div className="flex items-center text-yellow-400">
                {[...Array(5)].map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-gray-600'}`} viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>
        </div>
        <p className="text-xs text-light-gray">{review.comment}</p>
        <p className="text-[10px] text-gray-500 mt-2">{new Date(review.date).toLocaleDateString()}</p>
    </div>
);

const ServiceDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { db } = useDatabase();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const [isChatOpen, setIsChatOpen] = useState(false);

    const service = db?.services.find(s => s.id === id);

    const serviceReviews = useMemo(() => {
        if (!service || !db) return { reviews: [], averageRating: 0, totalReviews: 0 };
        
        const serviceNameLower = service.name.toLowerCase();
        const serviceCategoryLower = service.category.toLowerCase();

        const relevantMechanics = db.mechanics.filter(mechanic => 
            mechanic.specializations.some(spec => {
                const specLower = spec.toLowerCase();
                return specLower.includes(serviceNameLower) || specLower.includes(serviceCategoryLower);
            })
        );

        const allReviews = relevantMechanics.flatMap(mechanic => mechanic.reviewsList || []);
        
        if (allReviews.length === 0) {
            return { reviews: [], averageRating: 0, totalReviews: 0 };
        }

        const totalReviews = allReviews.length;
        const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / totalReviews;

        const sortedReviews = allReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);

        return { reviews: sortedReviews, averageRating, totalReviews };
    }, [service, db]);

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

    const handleToggleWishlist = () => {
        if (isWishlisted) {
            removeFromWishlist(service.id);
        } else {
            addToWishlist(service);
        }
    };

    const buttonText = service.price > 0 ? 'Book Now' : 'Request a Quote';
    const handlePrimaryAction = () => {
        if (service.price > 0) {
            navigate(`/booking/${service.id}`);
        } else {
            setIsChatOpen(true);
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
                </div>
                
                <div className="px-6 pb-6">
                    <h2 className="text-xl font-bold text-white mt-6 mb-4">Customer Reviews</h2>
                    {serviceReviews.totalReviews > 0 ? (
                        <div className="bg-dark-gray p-4 rounded-lg">
                            <div className="flex items-center gap-3 mb-4 border-b border-field pb-3">
                                <span className="text-4xl font-bold text-yellow-400">{serviceReviews.averageRating.toFixed(1)}</span>
                                <div>
                                    <div className="flex items-center">
                                         {[...Array(5)].map((_, i) => (
                                            <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${i < Math.round(serviceReviews.averageRating) ? 'text-yellow-400' : 'text-gray-600'}`} viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <p className="text-xs text-light-gray">Based on {serviceReviews.totalReviews} total reviews</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {serviceReviews.reviews.map(review => <ReviewCard key={review.id} review={review} />)}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-dark-gray p-6 rounded-lg text-center">
                            <p className="text-sm text-light-gray">No reviews yet for services like this.</p>
                        </div>
                    )}
                </div>

            </div>
            <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray flex gap-4">
                 <button 
                    onClick={() => setIsChatOpen(true)}
                    className="w-1/2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition flex items-center justify-center gap-2"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat
                </button>
                <button 
                    onClick={handlePrimaryAction} 
                    className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-all duration-300 ease-in-out transform hover:scale-[1.03] hover:shadow-lg hover:shadow-primary/40 active:scale-100"
                >
                    {buttonText}
                </button>
            </div>
             {isChatOpen && <ChatModal service={service} onClose={() => setIsChatOpen(false)} />}
        </div>
    );
};

export default ServiceDetailScreen;