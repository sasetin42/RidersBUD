
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CustomerHeader from '../components/CustomerHeader';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { Review, Mechanic } from '../types';
import { useAuth } from '../context/AuthContext';
import HomeLiveMap from '../components/HomeLiveMap';
import { getProfileImage, getVehicleImage } from '../utils/imageConstants';
import { Wrench, X, Star } from 'lucide-react';

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => {
    const initials = review.customerName
        ? review.customerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : 'C';
    
    const formattedDate = new Date(review.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    return (
        <div className="bg-[#1A1A1E] border border-white/5 p-3.5 rounded-2xl flex gap-3.5 transition-all duration-200 hover:border-white/10 hover:bg-[#202025]">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary/20 to-orange-500/20 border border-primary/30 flex items-center justify-center text-xs font-black text-primary flex-shrink-0">
                {initials}
            </div>
            
            <div className="flex-grow min-w-0 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <h4 className="font-black text-white text-xs truncate leading-snug">
                            {review.customerName}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="flex items-center text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={10}
                                        className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'}
                                    />
                                ))}
                            </div>
                            <span className="text-[9px] text-gray-500 font-bold">{formattedDate}</span>
                        </div>
                    </div>
                    
                    <span className="flex items-center gap-0.5 bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider">
                        ✓ Verified
                    </span>
                </div>
                
                <p className="text-xs text-gray-300 font-medium leading-relaxed">
                    {review.comment}
                </p>
            </div>
        </div>
    );
};

const SkeletonLoader = () => (
    <div className="flex flex-col h-full bg-secondary">
        <CustomerHeader title="Mechanic Profile" showBackButton icon={<Wrench size={22} />} />
        <div className="flex-grow p-6 space-y-8 overflow-y-auto animate-pulse">
            {/* Profile Header Skeleton */}
            <div className="flex flex-col items-center text-center -mb-2">
                <div className="w-20 h-20 rounded-full bg-dark-gray mb-3 border-2 border-transparent"></div>
                <div className="flex items-center gap-2">
                    <div className="h-7 w-36 bg-dark-gray rounded-lg"></div>
                    <div className="h-5 w-5 bg-dark-gray rounded-full"></div>
                </div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-[#1A1A1E] border border-white/5 p-2.5 rounded-2xl h-[76px] flex flex-col items-center justify-center space-y-1.5">
                        <div className="h-5 w-5 bg-dark-gray rounded-full"></div>
                        <div className="h-4 w-10 bg-dark-gray rounded"></div>
                        <div className="h-3 w-12 bg-dark-gray rounded"></div>
                    </div>
                ))}
            </div>

            {/* Specializations Skeleton */}
            <div className="flex overflow-x-auto gap-2 py-1 px-6 -mx-6 scrollbar-hide">
                <div className="h-7 w-20 bg-dark-gray rounded-xl flex-shrink-0"></div>
                <div className="h-7 w-24 bg-dark-gray rounded-xl flex-shrink-0"></div>
                <div className="h-7 w-16 bg-dark-gray rounded-xl flex-shrink-0"></div>
            </div>

            {/* Bio Skeleton */}
            <div>
                <div className="h-6 w-24 bg-dark-gray rounded mb-3"></div>
                <div className="bg-dark-gray p-4 rounded-lg space-y-2">
                    <div className="h-4 bg-field rounded w-full"></div>
                    <div className="h-4 bg-field rounded w-5/6"></div>
                </div>
            </div>

            {/* Portfolio Skeleton */}
            <div>
                <div className="h-6 w-20 bg-dark-gray rounded mb-3"></div>
                <div className="bg-dark-gray rounded-lg h-48 w-full"></div>
            </div>

            {/* Reviews Skeleton */}
            <div>
                <div className="h-6 w-36 bg-dark-gray rounded mb-3"></div>
                <div className="flex justify-between gap-4 mb-4">
                    <div className="h-8 w-48 bg-dark-gray rounded-full"></div>
                    <div className="h-8 w-28 bg-dark-gray rounded-lg"></div>
                </div>
                <div className="space-y-4">
                    <div className="bg-[#1A1A1E] border border-white/5 p-3.5 rounded-2xl h-[78px]"></div>
                    <div className="bg-[#1A1A1E] border border-white/5 p-3.5 rounded-2xl h-[78px]"></div>
                </div>
            </div>
        </div>
        
        {/* Bottom Actions Bar Skeleton */}
        <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray flex gap-3">
            <div className="flex-1 h-12 bg-field rounded-lg"></div>
            <div className="flex-1 h-12 bg-primary/30 rounded-lg"></div>
        </div>
    </div>
);




const MechanicProfileScreen: React.FC = () => {
    const { mechanicId } = useParams<{ mechanicId: string }>();
    const { db, loading } = useDatabase();
    const { user, addFavoriteMechanic, removeFavoriteMechanic } = useAuth();
    const navigate = useNavigate();
    
    // State for the main profile page
    const [reviewFilter, setReviewFilter] = useState<number>(0);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);



    const isFavorited = useMemo(() => user?.favoriteMechanicIds?.includes(mechanicId!), [user, mechanicId]);

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!mechanicId) return;
        if (isFavorited) {
            removeFavoriteMechanic(mechanicId);
        } else {
            addFavoriteMechanic(mechanicId);
        }
    };

    if (loading || !db) {
        return <SkeletonLoader />;
    }

    const mechanic = db.mechanics.find(m => m.id === mechanicId);

    const filteredReviews = useMemo(() => {
        if (!mechanic?.reviewsList) return [];
        let reviews = reviewFilter === 0 ? [...mechanic.reviewsList] : mechanic.reviewsList.filter(r => r.rating === reviewFilter);
        reviews.sort((a, b) => {
            switch (sortOrder) {
                case 'highest': return b.rating - a.rating;
                case 'lowest': return a.rating - b.rating;
                case 'oldest': return new Date(a.date).getTime() - new Date(b.date).getTime();
                case 'newest': default: return new Date(b.date).getTime() - new Date(a.date).getTime();
            }
        });
        return reviews;
    }, [mechanic?.reviewsList, reviewFilter, sortOrder]);

    const paginatedReviews = useMemo(() => {
        const startIndex = (currentPage - 1) * 3;
        return filteredReviews.slice(startIndex, startIndex + 3);
    }, [filteredReviews, currentPage]);

    const totalPages = Math.ceil(filteredReviews.length / 3);



    const handleBookMechanic = (mechanicToBook: Mechanic) => {
        // Using Diagnostic (Service ID 3) as the default service for direct mechanic booking
        navigate('/booking/3', { state: { 
            serviceLocation: { lat: mechanicToBook.lat, lng: mechanicToBook.lng },
            preselectedMechanicId: mechanicToBook.id 
        }});
    };


    if (!mechanic) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <CustomerHeader title="Mechanic Not Found" showBackButton icon={<Wrench size={22} />} />
                <div className="flex-grow flex items-center justify-center">
                    <p>The requested mechanic profile could not be found.</p>
                </div>
            </div>
        );
    }
    
    const nextImage = () => { if (mechanic.portfolioImages) setCurrentImageIndex((prevIndex) => (prevIndex + 1) % mechanic.portfolioImages!.length); };
    const prevImage = () => { if (mechanic.portfolioImages) setCurrentImageIndex((prevIndex) => (prevIndex - 1 + mechanic.portfolioImages!.length) % mechanic.portfolioImages!.length); };

    const onlineStatus = mechanic.status === 'Active' ? (mechanic.isOnline ? 'Online' : 'Offline') : mechanic.status;
    const onlineStatusIconColor = mechanic.status === 'Active' 
        ? (mechanic.isOnline ? 'bg-green-500' : 'bg-gray-500') 
        : mechanic.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="flex flex-col h-full bg-secondary">
            {fullScreenImage && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-fadeIn">
                    <button 
                        onClick={() => setFullScreenImage(null)} 
                        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-[70]"
                        aria-label="Close image"
                    >
                        <X size={20} />
                    </button>
                    <img src={fullScreenImage} alt="Full screen view" className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
            )}
                <CustomerHeader title="Mechanic Profile" showBackButton icon={<Wrench size={22} />} />
            <div className="flex-grow p-6 space-y-8 overflow-y-auto">
                <div className="flex flex-col items-center text-center -mb-2">
                    <img src={getProfileImage(mechanic.imageUrl, 'mechanic')} alt={mechanic.name} className="w-20 h-20 rounded-full object-cover mb-3 border-2 border-primary" />
                    <div className="flex items-center gap-2">
                         <h1 className="text-xl font-black text-white tracking-tight">{mechanic.name}</h1>
                         <button onClick={handleToggleFavorite} className="text-yellow-400" aria-label="Toggle Favorite">
                            <Star size={20} className={`transition-transform transform hover:scale-110 ${isFavorited ? 'fill-current' : ''}`} />
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center justify-between w-full bg-[#1A1A1E] border border-white/5 rounded-2xl p-2.5 backdrop-blur-md">
                    {/* Rating Segment */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                        <div className="flex items-center gap-1 text-yellow-400">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="font-black text-white text-xs tracking-tight">{(mechanic.rating || 0).toFixed(1)}</span>
                        </div>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Rating</p>
                    </div>
                    
                    {/* Divider */}
                    <div className="w-[1px] h-8 bg-white/5"></div>
                    
                    {/* Jobs Completed Segment */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                        <div className="flex items-center gap-1 text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <span className="font-black text-white text-xs tracking-tight">{mechanic.reviews}</span>
                        </div>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Jobs Completed</p>
                    </div>
                    
                    {/* Divider */}
                    <div className="w-[1px] h-8 bg-white/5"></div>
                    
                    {/* Status Segment */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                        <div className="flex items-center justify-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${onlineStatusIconColor}`}></span>
                            <span className="font-black text-white text-xs tracking-tight">{onlineStatus}</span>
                        </div>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Status</p>
                    </div>
                </div>
                <div className="flex overflow-x-auto gap-2 py-1 px-6 -mx-6 scrollbar-hide snap-x">
                    {mechanic.specializations.map((spec, index) => (
                        <span key={index} className="snap-center flex-shrink-0 bg-primary/10 text-primary text-[10px] font-black px-3 py-1.5 rounded-xl border border-primary/20 tracking-wider uppercase">
                            {spec}
                        </span>
                    ))}
                </div>

                <div>
                    <h2 className="text-xl font-semibold mb-3 text-white">About Me</h2>
                    <div className="bg-dark-gray p-4 rounded-lg"><p className="text-sm text-light-gray leading-relaxed">{mechanic.bio}</p></div>
                </div>

                {/* Certifications Section */}
                {mechanic.certifications && mechanic.certifications.length > 0 && (
                     <div>
                        <h2 className="text-xl font-semibold mb-3 text-white">Certifications</h2>
                        <div className="grid grid-cols-1 gap-2">
                            {mechanic.certifications.map((cert, idx) => (
                                <div key={idx} className="bg-dark-gray p-3 rounded-lg flex items-center gap-3 border border-field/50">
                                    <div className="bg-green-500/20 p-2 rounded-full text-green-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    </div>
                                    <span className="text-sm text-white">{cert.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                 {/* Insurances Section */}
                 {mechanic.insurances && mechanic.insurances.length > 0 && (
                     <div>
                        <h2 className="text-xl font-semibold mb-3 text-white">Insurance & Liability</h2>
                        <div className="grid grid-cols-1 gap-2">
                            {mechanic.insurances.map((ins, idx) => (
                                <div key={idx} className="bg-dark-gray p-3 rounded-lg flex items-center gap-3 border border-field/50">
                                    <div className="bg-blue-500/20 p-2 rounded-full text-blue-400">
                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{ins.type}</p>
                                        <p className="text-xs text-light-gray">Provider: {ins.provider}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {mechanic.portfolioImages && mechanic.portfolioImages.length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-3 text-white">My Work</h2>
                        <div className="relative bg-dark-gray rounded-lg overflow-hidden group">
                            <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}>
                                {mechanic.portfolioImages.map((img, index) => (
                                    <div key={index} className="flex-shrink-0 w-full">
                                        <img src={getVehicleImage([img], 'Motorcycle')} alt={`Portfolio image ${index + 1}`} className="w-full h-48 object-cover cursor-pointer" onClick={() => setFullScreenImage(img)} />
                                    </div>
                                ))}
                            </div>
                            {mechanic.portfolioImages.length > 1 && (<>
                                <button onClick={prevImage} className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Previous image"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                                <button onClick={nextImage} className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Next image"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                            </>)}
                        </div>
                    </div>
                )}

                <div>
                    <h2 className="text-xl font-semibold mb-3 text-white">Customer Reviews</h2>
                    {mechanic.reviewsList && mechanic.reviewsList.length > 0 ? (<>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2">
                                {[0, 5, 4, 3, 2, 1].map(star => <button key={star} onClick={() => { setReviewFilter(star); setCurrentPage(1); }} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${reviewFilter === star ? 'bg-primary text-white' : 'bg-field text-light-gray hover:bg-dark-gray'}`}>{star === 0 ? 'All' : `${star} ★`}</button>)}
                            </div>
                            <div>
                                <select id="sort-reviews" name="sort-reviews" value={sortOrder} onChange={(e) => { setSortOrder(e.target.value as any); setCurrentPage(1); }} className="bg-field text-sm rounded-lg focus:outline-none block w-full p-2" aria-label="Sort reviews"><option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="highest">Highest Rating</option><option value="lowest">Lowest Rating</option></select>
                            </div>
                        </div>
                        {paginatedReviews.length > 0 ? (
                            <>
                                <div className="space-y-4">
                                    {paginatedReviews.map(review => <ReviewCard key={review.id} review={review} />)}
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex justify-center items-center gap-4 mt-6">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            className="px-4 py-2 rounded-xl bg-field text-white font-bold text-xs disabled:opacity-50 transition active:scale-95"
                                        >
                                            Prev
                                        </button>
                                        <span className="text-xs text-light-gray font-bold">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            className="px-4 py-2 rounded-xl bg-field text-white font-bold text-xs disabled:opacity-50 transition active:scale-95"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="bg-dark-gray text-center text-light-gray p-6 rounded-lg">
                                <p>No reviews found for this rating.</p>
                            </div>
                        )}
                    </>) : (<div className="bg-dark-gray text-center text-light-gray p-6 rounded-lg"><p>This mechanic has no reviews yet.</p></div>)}
                </div>



            </div>
            <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray flex gap-3">
                 <button onClick={() => navigate('/services')} className="flex-1 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">
                    View All Services
                </button>
                <button onClick={() => handleBookMechanic(mechanic)} className="flex-1 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-all duration-300 ease-in-out transform hover:scale-[1.03] hover:shadow-lg hover:shadow-primary/40 active:scale-100">
                    Book {mechanic.name.split(' ')[0]}
                </button>
            </div>
        </div>
    );
};

export default MechanicProfileScreen;
