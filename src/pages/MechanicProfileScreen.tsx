
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { Review, Mechanic } from '../types';
import { useAuth } from '../context/AuthContext';
import HomeLiveMap from '../components/HomeLiveMap';

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => (
    <div className="bg-dark-gray p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
            <p className="font-semibold text-white">{review.customerName}</p>
            <div className="flex items-center text-yellow-400">
                {[...Array(5)].map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-gray-600'}`} viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8-2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>
        </div>
        <p className="text-sm text-light-gray">{review.comment}</p>
        <p className="text-xs text-gray-500 mt-2">{new Date(review.date).toLocaleDateString()}</p>
    </div>
);

const SkeletonLoader = () => (
    <div className="flex flex-col h-full bg-secondary">
        <Header title="Mechanic Profile" showBackButton />
        <div className="flex-grow p-6 space-y-6 overflow-y-auto animate-pulse">
            {/* Profile Header Skeleton */}
            <div className="flex flex-col items-center text-center">
                <div className="w-28 h-28 rounded-full bg-dark-gray mb-4"></div>
                <div className="h-8 w-48 bg-dark-gray rounded mb-2"></div>
                <div className="h-5 w-32 bg-dark-gray rounded"></div>
                {/* Specializations skeleton moved here */}
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    <div className="h-8 w-24 bg-dark-gray rounded-full"></div>
                    <div className="h-8 w-28 bg-dark-gray rounded-full"></div>
                    <div className="h-8 w-20 bg-dark-gray rounded-full"></div>
                </div>
            </div>

            {/* Bio Skeleton */}
            <div>
                <div className="h-6 w-32 bg-dark-gray rounded mb-3"></div>
                <div className="bg-dark-gray p-4 rounded-lg space-y-2">
                    <div className="h-4 bg-field rounded w-full"></div>
                    <div className="h-4 bg-field rounded w-5/6"></div>
                </div>
            </div>

            {/* Portfolio Skeleton */}
            <div>
                <div className="h-6 w-24 bg-dark-gray rounded mb-3"></div>
                <div className="bg-dark-gray rounded-lg h-48 w-full"></div>
            </div>

            {/* Reviews Skeleton */}
            <div>
                <div className="h-6 w-44 bg-dark-gray rounded mb-3"></div>
                <div className="space-y-4">
                    <div className="bg-dark-gray p-4 rounded-lg h-20"></div>
                    <div className="bg-dark-gray p-4 rounded-lg h-20"></div>
                </div>
            </div>
        </div>
    </div>
);

const StatCard: React.FC<{ title: string, value: React.ReactNode, icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-dark-gray p-3 rounded-lg flex flex-col items-center justify-center text-center h-full">
        <div className="text-primary h-6 w-6 mb-1">{icon}</div>
        <div className="font-bold text-white">{value}</div>
        <p className="text-xs text-light-gray mt-1">{title}</p>
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

    // State for the "Find Other Mechanics" section
    const [specFilterOpen, setSpecFilterOpen] = useState(false);
    const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
    const [nearbyRatingFilter, setNearbyRatingFilter] = useState(0);
    const [mechanicSearch, setMechanicSearch] = useState('');
    const [nearbySortOption, setNearbySortOption] = useState('rating');
    const [selectedMechanicId, setSelectedMechanicId] = useState<string | null>(null);

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

    // --- Logic for "Find Other Mechanics Nearby" ---
    const allSpecializations = useMemo(() => {
        const specSet = new Set<string>();
        db.mechanics.forEach(m => { if (m.status === 'Active') m.specializations.forEach(spec => specSet.add(spec)) });
        return Array.from(specSet).sort();
    }, [db.mechanics]);

    const handleSpecToggle = (spec: string) => {
        setSelectedSpecs(prev => prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]);
    };

    const filteredNearbyMechanics = useMemo(() => {
        if (!db) return [];
        const { bookings, mechanics } = db;
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const todayDayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Required<Mechanic>['availability'];
        const busyMechanicIds = new Set(bookings.filter(b => (b.status === 'Upcoming' || b.status === 'En Route' || b.status === 'In Progress') && b.mechanic && b.date === todayStr).map(b => b.mechanic!.id));

        let filtered = mechanics.filter(m => {
            if (m.id === mechanicId) return false; // Exclude current mechanic
            const isActive = m.status === 'Active';
            const hasSelectedSpec = selectedSpecs.length === 0 || selectedSpecs.some(spec => m.specializations.includes(spec));
            const meetsRating = m.rating >= nearbyRatingFilter;
            const searchMatch = mechanicSearch.trim() === '' || m.name.toLowerCase().includes(mechanicSearch.toLowerCase().trim()) || m.specializations.some(spec => spec.toLowerCase().includes(mechanicSearch.toLowerCase().trim()));
            return isActive && hasSelectedSpec && meetsRating && searchMatch;
        });
        
        filtered.sort((a, b) => {
            if (nearbySortOption === 'jobs') return b.reviews - a.reviews;
            return b.rating - a.rating; // Default to rating
        });

        return filtered.map(m => ({ ...m, isAvailable: (m.isOnline ?? false) && (m.availability?.[todayDayOfWeek]?.isAvailable ?? false) && !busyMechanicIds.has(m.id) }));
    }, [db, selectedSpecs, nearbyRatingFilter, mechanicSearch, nearbySortOption, mechanicId]);

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
                <Header title="Mechanic Not Found" showBackButton />
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
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-fadeIn cursor-pointer" onClick={() => setFullScreenImage(null)}>
                    <img src={fullScreenImage} alt="Full screen view" className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
            )}
            <Header title="Mechanic Profile" showBackButton />
            <div className="flex-grow p-6 space-y-8 overflow-y-auto">
                <div className="flex flex-col items-center text-center">
                    <img src={mechanic.imageUrl} alt={mechanic.name} className="w-28 h-28 rounded-full object-cover mb-4 border-4 border-primary" />
                    <div className="flex items-center gap-3">
                         <h1 className="text-3xl font-bold text-white">{mechanic.name}</h1>
                         <button onClick={handleToggleFavorite} className="text-yellow-400" aria-label="Toggle Favorite">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 transition-transform transform hover:scale-125" viewBox="0 0 20 20" fill={isFavorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isFavorited ? 0 : 1.5}>
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8-2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                    <StatCard title="Rating" value={<span className="text-xl">{mechanic.rating.toFixed(1)}</span>} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8-2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>} />
                    <StatCard title="Jobs Completed" value={<span className="text-xl">{mechanic.reviews}</span>} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} />
                    <StatCard 
                        title="Status" 
                        value={
                            <div className="flex items-center justify-center gap-1.5 text-lg">
                                <span className={`h-2.5 w-2.5 rounded-full ${onlineStatusIconColor}`}></span>
                                <span>{onlineStatus}</span>
                            </div>
                        } 
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" /></svg>}
                    />
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                    {mechanic.specializations.map((spec, index) => <span key={index} className="bg-primary/20 text-primary text-sm font-medium px-3 py-1 rounded-full">{spec}</span>)}
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
                                        <img src={img} alt={`Portfolio image ${index + 1}`} className="w-full h-48 object-cover cursor-pointer" onClick={() => setFullScreenImage(img)} />
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
                                {[0, 5, 4, 3, 2, 1].map(star => <button key={star} onClick={() => setReviewFilter(star)} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${reviewFilter === star ? 'bg-primary text-white' : 'bg-field text-light-gray hover:bg-dark-gray'}`}>{star === 0 ? 'All' : `${star} ★`}</button>)}
                            </div>
                            <div>
                                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="bg-field text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2" aria-label="Sort reviews"><option value="newest">Newest First</option><option value="oldest">Oldest First</option><option value="highest">Highest Rating</option><option value="lowest">Lowest Rating</option></select>
                            </div>
                        </div>
                        {filteredReviews.length > 0 ? (<div className="space-y-4">{filteredReviews.map(review => <ReviewCard key={review.id} review={review} />)}</div>) : (<div className="bg-dark-gray text-center text-light-gray p-6 rounded-lg"><p>No reviews found for this rating.</p></div>)}
                    </>) : (<div className="bg-dark-gray text-center text-light-gray p-6 rounded-lg"><p>This mechanic has no reviews yet.</p></div>)}
                </div>

                <div className="border-t border-field pt-8">
                    <h2 className="text-2xl font-semibold mb-4 text-white">Find Other Mechanics Nearby</h2>
                     <div className="mb-4 space-y-3">
                        <input type="text" value={mechanicSearch} onChange={e => setMechanicSearch(e.target.value)} placeholder="Search name or specialty..." className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white" />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-light-gray mb-1">Specialization</label>
                                <div className="relative">
                                    <button onClick={() => setSpecFilterOpen(!specFilterOpen)} className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white text-left flex justify-between items-center h-[42px]"><span className="truncate">{selectedSpecs.length > 0 ? `${selectedSpecs.length} spec${selectedSpecs.length > 1 ? 's' : ''} selected` : 'All'}</span><svg className={`w-4 h-4 transition-transform ${specFilterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
                                    {specFilterOpen && (<div className="absolute top-full left-0 w-full mt-1 bg-field border border-dark-gray rounded-lg z-10 max-h-48 overflow-y-auto">{allSpecializations.map(spec => (<label key={spec} className="flex items-center gap-2 p-2 hover:bg-dark-gray cursor-pointer"><input type="checkbox" checked={selectedSpecs.includes(spec)} onChange={() => handleSpecToggle(spec)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" /><span>{spec}</span></label>))}</div>)}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-light-gray mb-1">Minimum Rating</label>
                                <select value={nearbyRatingFilter} onChange={(e) => setNearbyRatingFilter(Number(e.target.value))} className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white h-[42px]"><option value={0}>All Ratings</option><option value={4}>4 ★ & Up</option><option value={3}>3 ★ & Up</option></select>
                            </div>
                        </div>
                        <select value={nearbySortOption} onChange={e => setNearbySortOption(e.target.value)} className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white"><option value="rating">Sort: By Rating</option><option value="jobs">Sort: By Jobs Done</option></select>
                    </div>
                    <div className="h-80 w-full rounded-xl shadow-lg overflow-hidden relative z-0">
                        <HomeLiveMap 
                            mechanics={filteredNearbyMechanics} 
                            customerLocation={{ lat: mechanic.lat, lng: mechanic.lng }} 
                            selectedMechanicId={selectedMechanicId} 
                            onMarkerClick={setSelectedMechanicId} 
                            onMapClickToBook={(latlng) => { /* Do nothing on this map */ }}
                            onBookMechanic={handleBookMechanic}
                        />
                    </div>
                    <div className="flex overflow-x-auto scrollbar-hide gap-3 p-2 -mx-2 mt-4">
                        {filteredNearbyMechanics.map(m => (
                            <div key={m.id} onClick={() => setSelectedMechanicId(m.id)} onDoubleClick={() => navigate(`/mechanic-profile/${m.id}`)} className={`flex-shrink-0 w-64 bg-dark-gray p-3 rounded-lg cursor-pointer border-2 transition-all ${selectedMechanicId === m.id ? 'border-primary' : 'border-transparent'}`}>
                                <div className="flex items-center gap-3">
                                    <img src={m.imageUrl} alt={m.name} className="w-12 h-12 rounded-full object-cover"/>
                                    <div className="flex-grow overflow-hidden">
                                        <p className="font-bold text-white text-sm truncate">{m.name}</p>
                                        <p className="text-xs text-yellow-400">★ {m.rating} ({m.reviews} jobs)</p>
                                        {m.isAvailable ? <p className="text-xs text-green-400 font-semibold">Available Today</p> : <p className="text-xs text-gray-500">Unavailable</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
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
