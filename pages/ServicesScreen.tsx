import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Service, Mechanic } from '../types';
import Header from '../components/Header';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { useWishlist } from '../context/WishlistContext';

const ServiceCard: React.FC<{
    service: Service;
    rating: number;
    reviewCount: number;
    onBook: (service: Service) => void;
}> = React.memo(({ service, rating, reviewCount, onBook }) => {
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const isWishlisted = isInWishlist(service.id);

    const handleToggleWishlist = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isWishlisted) {
            removeFromWishlist(service.id);
        } else {
            addToWishlist(service);
        }
    };

    const handleBookNow = (e: React.MouseEvent) => {
        e.stopPropagation();
        onBook(service);
    };

    return (
        <div 
            onClick={() => onBook(service)}
            className="bg-dark-gray rounded-lg overflow-hidden flex flex-col group shadow-lg transition-all duration-300 hover:shadow-primary/20 hover:-translate-y-1 cursor-pointer"
            aria-label={`Service card for ${service.name}`}
        >
            {/* Image Section */}
            <div className="relative">
                <img src={service.imageUrl} alt="" className="w-full h-40 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                <button 
                    onClick={handleToggleWishlist} 
                    className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm rounded-full p-2 transition-all duration-200 hover:scale-110 hover:bg-black/60 active:scale-95 z-10" 
                    aria-label="Toggle Wishlist"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-colors ${isWishlisted ? 'text-red-500' : 'text-white'}`} fill={isWishlisted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                    </svg>
                </button>
                <div className="absolute bottom-3 left-3">
                     <span className="bg-black/50 text-white text-[10px] leading-[14px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                        <div className="w-4 h-4 flex items-center justify-center transition-transform duration-300 group-hover:scale-110" dangerouslySetInnerHTML={{ __html: service.icon }} />
                        {service.category}
                    </span>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-4 flex-grow flex flex-col">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[14px] leading-[18px] text-white">{service.name}</h3>
                        {reviewCount > 0 && (
                            <div className="flex items-center gap-1 text-sm text-yellow-400 flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8-2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                <span className="font-bold">{rating.toFixed(1)}</span>
                                <span className="text-light-gray text-xs">({reviewCount})</span>
                            </div>
                        )}
                    </div>
                    
                    <p className="text-[10px] leading-[15px] text-light-gray mt-2 line-clamp-2">
                        {service.description}
                    </p>
                </div>

                <div className="mt-auto pt-4 border-t border-field">
                    <div className="flex justify-between items-baseline mb-3">
                        <p className="font-bold text-primary text-[15px]">
                            {service.price > 0 ? `₱${service.price.toLocaleString()}` : 'Get Quote'}
                        </p>
                        <p className="text-[8px] leading-[12px] text-light-gray">Est. {service.estimatedTime}</p>
                    </div>
                    
                    <button 
                        onClick={handleBookNow}
                        className="w-full bg-primary text-white font-medium py-2 px-3 rounded-lg text-sm hover:bg-orange-600 transition duration-200"
                    >
                        {service.price > 0 ? 'Book Now' : 'Get Quote'}
                    </button>
                </div>
            </div>
        </div>
    );
});


const ServicesScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [priceRange, setPriceRange] = useState('all');
    const [availabilityFilter, setAvailabilityFilter] = useState(false);

    const services = db?.services || [];

    const serviceCategories = useMemo(() => {
        if (!db?.settings.serviceCategories) return ['all'];
        return ['all', ...db.settings.serviceCategories];
    }, [db]);

    const availableMechanicSpecializations = useMemo(() => {
        if (!db) return new Set<string>();
        const today = new Date();
        const todayDayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Required<Mechanic>['availability'];

        const availableMechanics = db.mechanics.filter(mechanic => {
            const daySchedule = mechanic.availability?.[todayDayOfWeek];
            if (mechanic.status !== 'Active' || !daySchedule?.isAvailable) {
                return false;
            }
            if (mechanic.unavailableDates?.some(d => {
                const start = new Date(d.startDate.replace(/-/g, '/'));
                start.setHours(0,0,0,0);
                const end = new Date(d.endDate.replace(/-/g, '/'));
                end.setHours(0,0,0,0);
                return today >= start && today <= end;
            })) {
                return false;
            }
            return true;
        });

        const specSet = new Set<string>();
        availableMechanics.forEach(m => {
            m.specializations.forEach(s => specSet.add(s.toLowerCase()));
        });
        return specSet;
    }, [db]);

    const serviceRatings = useMemo(() => {
        if (!db) return new Map();

        const categoryToMechanics = new Map<string, Mechanic[]>();
        db.mechanics.forEach(mechanic => {
            mechanic.specializations.forEach(spec => {
                const specLower = spec.toLowerCase();
                if (!categoryToMechanics.has(specLower)) {
                    categoryToMechanics.set(specLower, []);
                }
                categoryToMechanics.get(specLower)!.push(mechanic);
            });
        });

        return new Map(db.services.map(service => {
            const serviceNameLower = service.name.toLowerCase();
            const serviceCategoryLower = service.category.toLowerCase();
            
            const nameMechanics = categoryToMechanics.get(serviceNameLower) || [];
            const categoryMechanics = categoryToMechanics.get(serviceCategoryLower) || [];
            
            const relevantMechanics = [...new Set([...nameMechanics, ...categoryMechanics])];

            if (relevantMechanics.length === 0) {
                return [service.id, { avgRating: 0, totalReviews: 0 }];
            }
            
            const totalReviews = relevantMechanics.reduce((sum, m) => sum + m.reviews, 0);
            const weightedTotalRating = relevantMechanics.reduce((sum, m) => sum + (m.rating * m.reviews), 0);
            const avgRating = totalReviews > 0 ? weightedTotalRating / totalReviews : 0;

            return [service.id, { avgRating, totalReviews }];
        }));
    }, [db]);


    const displayedServices = useMemo(() => {
        const lowercasedQuery = searchQuery.toLowerCase();
        
        let filtered = services.filter(service => {
            const searchMatch = searchQuery
                ? service.name.toLowerCase().includes(lowercasedQuery) || service.description.toLowerCase().includes(lowercasedQuery)
                : true;

            const categoryMatch = filterCategory !== 'all' ? service.category === filterCategory : true;

            const priceMatch = priceRange === 'all' ? true : (() => {
                if (service.price === 0) return true; // Always include "Quote Required"
                const [min, max] = priceRange.split('-').map(Number);
                if (max) return service.price >= min && service.price <= max;
                return service.price >= min;
            })();
            
            const availabilityMatch = !availabilityFilter ? true : (
                availableMechanicSpecializations.has(service.category.toLowerCase()) ||
                availableMechanicSpecializations.has(service.name.toLowerCase())
            );
            
            return searchMatch && categoryMatch && priceMatch && availabilityMatch;
        });

        filtered.sort((a, b) => a.name.localeCompare(b.name));
        
        return filtered;
    }, [searchQuery, filterCategory, priceRange, services, availabilityFilter, availableMechanicSpecializations]);
    
    const handleBook = (service: Service) => {
        navigate(`/booking/${service.id}`);
    };

    return (
        <div className="flex flex-col bg-secondary">
            <Header title="All Services" />
            
            <div className="p-4 space-y-4 flex-shrink-0">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Search for any service..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 bg-field border border-dark-gray rounded-full text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary"
                        aria-label="Search services"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                            aria-label="Clear search"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <select
                        value={priceRange}
                        onChange={e => setPriceRange(e.target.value)}
                        className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary h-[42px]"
                    >
                        <option value="all">All Prices</option>
                        <option value="0-1000">Under ₱1,000</option>
                        <option value="1000-2500">₱1,000 - ₱2,500</option>
                        <option value="2500-5000">₱2,500 - ₱5,000</option>
                        <option value="5000">Over ₱5,000</option>
                    </select>
                    <div className="flex items-center bg-field rounded-lg px-4 h-[42px] border border-dark-gray">
                        <input 
                            id="availability-filter" 
                            type="checkbox" 
                            checked={availabilityFilter} 
                            onChange={e => setAvailabilityFilter(e.target.checked)} 
                            className="h-4 w-4 rounded border-gray-500 bg-secondary text-primary focus:ring-primary focus:ring-offset-field"
                        />
                        <label htmlFor="availability-filter" className="ml-3 text-sm font-medium text-white select-none cursor-pointer">Available Today</label>
                    </div>
                </div>

                <div className="flex space-x-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
                    {serviceCategories.map(category => (
                        <button 
                            key={category} 
                            onClick={() => setFilterCategory(category)}
                            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                                filterCategory === category 
                                ? 'bg-primary text-white shadow-md shadow-primary/30' 
                                : 'bg-dark-gray text-light-gray hover:bg-field'
                            }`}
                        >
                            {category === 'all' ? 'All' : category}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                 <div className="flex-grow flex items-center justify-center p-4">
                    <Spinner size="lg" />
                </div>
            ) : (
                <div className="p-4 pt-0 grid grid-cols-2 gap-4">
                    {displayedServices.length > 0 ? (
                        displayedServices.map(service => {
                            const ratings = serviceRatings.get(service.id) || { avgRating: 0, totalReviews: 0 };
                            return <ServiceCard key={service.id} service={service} rating={ratings.avgRating} reviewCount={ratings.totalReviews} onBook={handleBook} />;
                        })
                    ) : (
                        <div className="col-span-2 flex flex-col items-center justify-center text-center text-light-gray p-8">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <h3 className="text-xl font-semibold text-white">No Results Found</h3>
                            <p className="mt-2 text-sm">Try checking your spelling or adjusting your filters.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ServicesScreen;