import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useDatabase } from '../context/DatabaseContext';
import Spinner from '../components/Spinner';
import ChatModal from '../components/ChatModal';
import { useWishlist } from '../context/WishlistContext';
import { Review } from '../types';
import { Star, Clock, Heart, MessageCircle } from 'lucide-react';

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => (
    <div className="bg-field p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
            <p className="font-semibold text-white text-sm">{review.customerName}</p>
            <div className="flex items-center text-yellow-400">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-gray-600'}`} />
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

    useEffect(() => {
        // Special handling for dedicated service pages to redirect immediately
        if (service) {
            if (service.id === '10') { // Rent a Car
                navigate('/rent-a-car', { replace: true });
            } else if (service.id === '7') { // Driver for Hire
                navigate('/hire-a-driver', { replace: true });
            }
        }
    }, [service, navigate]);

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

    // Show a loading spinner during the brief moment of redirection
    if (service && (service.id === '10' || service.id === '7')) {
        return <div className="flex items-center justify-center h-full bg-secondary"><Spinner size="lg" /></div>;
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

    const isWishlisted = isInWishlist(service.id);

    const handleToggleWishlist = () => {
        if (isWishlisted) {
            removeFromWishlist(service.id);
        } else {
            addToWishlist(service);
        }
    };

    const handleBookNow = () => {
        navigate(`/booking/${service.id}`);
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
                                <Clock className="h-5 w-5 mr-2" />
                                <span>{service.estimatedTime || 'N/A'}</span>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleWishlist}
                            className="bg-dark-gray/50 backdrop-blur-sm rounded-full p-3 z-10 transition-transform duration-200 hover:scale-110 flex-shrink-0"
                            aria-label="Toggle Wishlist"
                        >
                            <Heart className={`h-6 w-6 transition-colors ${isWishlisted ? 'text-red-500 fill-current' : 'text-white'}`} />
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
                                            <Star key={i} className={`h-5 w-5 ${i < Math.round(serviceReviews.averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
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
                    <MessageCircle className="h-6 w-6" />
                    Chat
                </button>
                <button
                    onClick={handleBookNow}
                    className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-all duration-300 ease-in-out transform hover:scale-[1.03] hover:shadow-lg hover:shadow-primary/40 active:scale-100"
                >
                    Book Now
                </button>
            </div>
            {isChatOpen && <ChatModal service={service} onClose={() => setIsChatOpen(false)} />}
        </div>
    );
};

export default ServiceDetailScreen;