import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { Review, Mechanic } from '../types';
import { useAuth } from '../context/AuthContext';

declare const L: any;

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => (
    <div className="bg-dark-gray p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
            <p className="font-semibold text-white">{review.customerName}</p>
            <div className="flex items-center text-yellow-400">
                {[...Array(5)].map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${i < review.rating ? 'fill-current' : 'text-gray-600'}`} viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>
        </div>
        <p className="text-sm text-light-gray">{review.comment}</p>
        <p className="text-xs text-gray-500 mt-2">{new Date(review.date).toLocaleDateString()}</p>
    </div>
);


const MechanicProfileScreen: React.FC = () => {
    const { mechanicId } = useParams<{ mechanicId: string }>();
    const { db } = useDatabase();
    const { user, addFavoriteMechanic, removeFavoriteMechanic } = useAuth();
    const navigate = useNavigate();
    const [reviewFilter, setReviewFilter] = useState<number>(0); // 0 for All stars
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    const mechanic = db?.mechanics.find(m => m.id === mechanicId);
    
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


    const daysOfWeek: (keyof Required<Mechanic>['availability'])[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const todayKey = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Required<Mechanic>['availability'];

    const formatTime = (timeString: string) => {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const hoursNum = parseInt(hours, 10);
        const ampm = hoursNum >= 12 ? 'PM' : 'AM';
        const formattedHours = hoursNum % 12 || 12;
        return `${formattedHours}:${minutes} ${ampm}`;
    };

    useEffect(() => {
        if (!mapRef.current || mapInstance.current || typeof L === 'undefined' || !mechanic?.lat || !mechanic?.lng) return;

        mapInstance.current = L.map(mapRef.current).setView([mechanic.lat, mechanic.lng], 14);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO'
        }).addTo(mapInstance.current);

        const icon = L.divIcon({
            html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-primary" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 21l-4.95-6.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /></svg>`,
            className: 'bg-transparent border-0',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });

        const popupContent = `
            <div style="font-family: 'Poppins', sans-serif; color: #333;">
                <h3 style="font-weight: 700; margin: 0 0 4px;">${mechanic.name}</h3>
                <p style="font-size: 0.8rem; color: #f59e0b; font-weight: 600; margin: 0;">⭐ ${mechanic.rating.toFixed(1)}</p>
            </div>
        `;

        L.marker([mechanic.lat, mechanic.lng], { icon }).addTo(mapInstance.current).bindPopup(popupContent).openPopup();
        
        setTimeout(() => {
            if (mapInstance.current) {
                mapInstance.current.invalidateSize();
            }
        }, 100);

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [mechanic]);

    const filteredReviews = useMemo(() => {
        if (!mechanic?.reviewsList) return [];
        
        let reviews = reviewFilter === 0 
            ? [...mechanic.reviewsList]
            : mechanic.reviewsList.filter(r => r.rating === reviewFilter);
        
        reviews.sort((a, b) => {
            switch (sortOrder) {
                case 'highest':
                    return b.rating - a.rating;
                case 'lowest':
                    return a.rating - b.rating;
                case 'oldest':
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                case 'newest':
                default:
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
            }
        });

        return reviews;
    }, [mechanic?.reviewsList, reviewFilter, sortOrder]);

    if (!db) {
        return <div className="flex items-center justify-center h-full bg-secondary"><Spinner size="lg" /></div>;
    }

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
    
    const nextImage = () => {
        if (mechanic.portfolioImages) {
            setCurrentImageIndex((prevIndex) => (prevIndex + 1) % mechanic.portfolioImages!.length);
        }
    };

    const prevImage = () => {
        if (mechanic.portfolioImages) {
            setCurrentImageIndex((prevIndex) => (prevIndex - 1 + mechanic.portfolioImages!.length) % mechanic.portfolioImages!.length);
        }
    };

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Mechanic Profile" showBackButton />
            <div className="flex-grow p-6 space-y-6 overflow-y-auto">
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center">
                    <img src={mechanic.imageUrl} alt={mechanic.name} className="w-28 h-28 rounded-full object-cover mb-4 border-4 border-primary" />
                    <div className="flex items-center gap-3">
                         <h1 className="text-3xl font-bold text-white">{mechanic.name}</h1>
                         <button onClick={handleToggleFavorite} className="text-yellow-400" aria-label="Toggle Favorite">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 transition-transform transform hover:scale-125" viewBox="0 0 20 20" fill={isFavorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isFavorited ? 0 : 1.5}>
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex items-center text-yellow-400 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        <span className="font-bold">{mechanic.rating.toFixed(1)}</span>
                        <span className="text-sm text-light-gray ml-2">({mechanic.reviews} jobs completed)</span>
                    </div>
                </div>

                {/* Bio */}
                <div>
                    <h2 className="text-xl font-semibold mb-3 text-white">About Me</h2>
                    <div className="bg-dark-gray p-4 rounded-lg">
                        <p className="text-sm text-light-gray leading-relaxed">{mechanic.bio}</p>
                    </div>
                </div>
                
                {/* Specializations */}
                <div>
                    <h2 className="text-xl font-semibold mb-3 text-white">Specializations</h2>
                    <div className="flex flex-wrap gap-2">
                        {mechanic.specializations.map((spec, index) => (
                             <span key={index} className="bg-primary/20 text-primary text-sm font-medium px-3 py-1 rounded-full">{spec}</span>
                        ))}
                    </div>
                </div>

                {/* Credentials & Documents */}
                {(mechanic.businessLicenseUrl || (mechanic.certifications && mechanic.certifications.length > 0) || (mechanic.insurances && mechanic.insurances.length > 0)) && (
                    <div>
                        <h2 className="text-xl font-semibold mb-3 text-white">Credentials &amp; Documents</h2>
                        <div className="bg-dark-gray p-4 rounded-lg space-y-3">
                            {mechanic.businessLicenseUrl && (
                                <a href={mechanic.businessLicenseUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-sm text-blue-400 hover:text-blue-300 transition-colors">
                                    <span>View Business License</span>
                                    <span>&#x2197;</span>
                                </a>
                            )}
                            {mechanic.certifications?.map((cert, i) => (
                                <a key={i} href={cert.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between text-sm text-blue-400 hover:text-blue-300 transition-colors">
                                    <span>{cert.name}</span>
                                    <span>&#x2197;</span>
                                </a>
                            ))}
                             {mechanic.insurances?.map((ins, i) => (
                                <div key={i} className="text-sm text-light-gray">
                                    <span className="font-semibold text-white">{ins.type} Insurance:</span> {ins.provider} (Policy #{ins.policyNumber})
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Location */}
                {mechanic.lat && mechanic.lng && (
                    <div>
                        <h2 className="text-xl font-semibold mb-3 text-white">Location</h2>
                        <div ref={mapRef} className="h-48 w-full rounded-lg bg-dark-gray" />
                    </div>
                )}

                {/* Portfolio */}
                {mechanic.portfolioImages && mechanic.portfolioImages.length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-3 text-white">My Work</h2>
                        <div className="relative bg-dark-gray rounded-lg overflow-hidden group">
                            <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}>
                                {mechanic.portfolioImages.map((img, index) => (
                                    <div key={index} className="flex-shrink-0 w-full">
                                        <img src={img} alt={`Portfolio image ${index + 1}`} className="w-full h-48 object-cover" />
                                    </div>
                                ))}
                            </div>
                            {mechanic.portfolioImages.length > 1 && (
                                <>
                                    <button onClick={prevImage} className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Previous image">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <button onClick={nextImage} className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Next image">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                 {/* Working Hours */}
                <div>
                    <h2 className="text-xl font-semibold mb-3 text-white">Working Hours</h2>
                    <div className="bg-dark-gray p-4 rounded-lg space-y-1">
                        {daysOfWeek.map(day => {
                            const dayAvailability = mechanic.availability?.[day];
                            const isToday = day === todayKey;
                            return (
                                <div key={day} className={`flex justify-between items-center text-sm p-2 rounded-md ${isToday ? 'bg-primary/10' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2 w-2 rounded-full ${dayAvailability?.isAvailable ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                                        <span className={`capitalize font-medium ${isToday ? 'text-primary' : 'text-light-gray'}`}>{day}</span>
                                    </div>
                                    {dayAvailability?.isAvailable ? (
                                        <span className="font-semibold text-white">{formatTime(dayAvailability.startTime)} - {formatTime(dayAvailability.endTime)}</span>
                                    ) : (
                                        <span className="font-semibold text-gray-500">Off-duty</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Reviews */}
                <div>
                    <h2 className="text-xl font-semibold mb-3 text-white">Customer Reviews</h2>
                    {mechanic.reviewsList && mechanic.reviewsList.length > 0 ? (
                        <>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                {/* Filter Chips */}
                                <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2">
                                    {[0, 5, 4, 3, 2, 1].map(star => (
                                        <button
                                            key={star}
                                            onClick={() => setReviewFilter(star)}
                                            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                                                reviewFilter === star 
                                                ? 'bg-primary text-white' 
                                                : 'bg-field text-light-gray hover:bg-dark-gray'
                                            }`}
                                        >
                                            {star === 0 ? 'All' : `${star} ★`}
                                        </button>
                                    ))}
                                </div>
                                {/* Sort Dropdown */}
                                <div>
                                    <select
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value as any)}
                                        className="bg-field text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2"
                                        aria-label="Sort reviews"
                                    >
                                        <option value="newest">Newest First</option>
                                        <option value="oldest">Oldest First</option>
                                        <option value="highest">Highest Rating</option>
                                        <option value="lowest">Lowest Rating</option>
                                    </select>
                                </div>
                            </div>
                            {/* Reviews List */}
                            {filteredReviews.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredReviews.map(review => <ReviewCard key={review.id} review={review} />)}
                                </div>
                            ) : (
                                <div className="bg-dark-gray text-center text-light-gray p-6 rounded-lg">
                                    <p>No reviews found for this rating.</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-dark-gray text-center text-light-gray p-6 rounded-lg">
                            <p>This mechanic has no reviews yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MechanicProfileScreen;