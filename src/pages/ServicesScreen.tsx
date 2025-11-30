import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Service, Mechanic } from '../types';
import Header from '../components/Header';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { useWishlist } from '../context/WishlistContext';
import { Heart, Star, Search, X } from 'lucide-react';

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
            className="glass border border-white/10 rounded-xl overflow-hidden flex flex-col group shadow-lg hover:shadow-glow-sm transition-all duration-300 hover:-translate-y-2 cursor-pointer"
            aria-label={`Service card for ${service.name}`}
        >
            {/* Image Section */}
            <div className="relative">
                <img src={service.imageUrl} alt="" className="w-full h-40 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                <button
                    onClick={handleToggleWishlist}
                    className="absolute top-3 right-3 glass-light rounded-full p-2 transition-all duration-300 hover:scale-110 hover:shadow-glow-sm active:scale-95 z-10"
                    aria-label="Toggle Wishlist"
                >
                    <Heart className={`h-5 w-5 transition-colors ${isWishlisted ? 'text-red-500 fill-current' : 'text-white'}`} />
                </button>
                <div className="absolute bottom-3 left-3">
                    <span className="glass-light text-white text-[10px] leading-[14px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/20">
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
                                <Star className="h-4 w-4 fill-current" />
                                <span className="font-bold">{rating.toFixed(1)}</span>
                                <span className="text-light-gray text-xs">({reviewCount})</span>
                            </div>
                        )}
                    </div>

                    <p className="text-[10px] leading-[15px] text-light-gray mt-2 line-clamp-2">
                        {service.description}
                    </p>
                </div>

                <div className="mt-auto pt-4 border-t border-white/10">
                    <div className="flex justify-between items-baseline mb-3">
                        <p className="font-bold text-primary text-[15px]">
                            {service.price > 0 ? `₱${service.price.toLocaleString()}` : 'Get Quote'}
                        </p>
                        <p className="text-[8px] leading-[12px] text-light-gray">Est. {service.estimatedTime}</p>
                    </div>

                    <button
                        onClick={handleBookNow}
                        className="w-full gradient-primary text-white font-medium py-2 px-3 rounded-lg text-sm hover:shadow-glow transition-all duration-300 hover:scale-[1.02] active:scale-95"
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
                start.setHours(0, 0, 0, 0);
                const end = new Date(d.endDate.replace(/-/g, '/'));
                end.setHours(0, 0, 0, 0);
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
                        <Search className="h-5 w-5 text-light-gray" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search for any service..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 glass border border-white/10 rounded-full text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all duration-300"
                        aria-label="Search services"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                            aria-label="Clear search"
                        >
                            <X className="h-5 w-5 text-light-gray" />
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <select
                        value={priceRange}
                        onChange={e => setPriceRange(e.target.value)}
                        className="w-full px-4 py-2 glass border border-white/10 rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 h-[42px] transition-all duration-300"
                    >
                        <option value="all">All Prices</option>
                        <option value="0-1000">Under ₱1,000</option>
                        <option value="1000-2500">₱1,000 - ₱2,500</option>
                        <option value="2500-5000">₱2,500 - ₱5,000</option>
                        <option value="5000">Over ₱5,000</option>
                    </select>
                    <div className="flex items-center glass rounded-lg px-4 h-[42px] border border-white/10 hover:border-primary/30 transition-all duration-300">
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
                            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${filterCategory === category
                                ? 'gradient-primary text-white shadow-glow-sm scale-105'
                                : 'glass-light text-light-gray hover:text-white hover:border-primary/30 hover:shadow-glow-sm'
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
                            <Search className="h-20 w-20 text-gray-500 mb-4" />
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