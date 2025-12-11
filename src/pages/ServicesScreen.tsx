import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Service, Mechanic } from '../types';
import Header from '../components/Header';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { useWishlist } from '../context/WishlistContext';
import { Heart, Star, Search, X, Filter } from 'lucide-react';

const ServiceCard: React.FC<{
    service: Service;
    rating: number;
    reviewCount: number;
    onBook: (service: Service) => void;
    index: number;
}> = React.memo(({ service, rating, reviewCount, onBook, index }) => {
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
            className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A] border border-white/5 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 animate-fadeIn cursor-pointer"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Image & Badges */}
            <div className="relative h-40 overflow-hidden">
                <img
                    src={service.imageUrl}
                    alt={service.name}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent opacity-90" />

                <button
                    onClick={handleToggleWishlist}
                    className="absolute top-3 right-3 p-2 rounded-full glass-heavy text-white hover:text-red-500 hover:bg-white/10 transition-all active:scale-95"
                >
                    <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
                </button>

                <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                        <div className="w-3.5 h-3.5 text-primary" dangerouslySetInnerHTML={{ __html: service.icon }} />
                        {service.category}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 pt-2">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="text-white font-bold text-[15px] leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {service.name}
                    </h3>
                </div>

                <div className="flex items-center gap-2 mb-3">
                    {reviewCount > 0 ? (
                        <div className="flex items-center gap-1 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-bold text-yellow-400">{rating.toFixed(1)}</span>
                            <span className="text-[10px] text-gray-400">({reviewCount})</span>
                        </div>
                    ) : (
                        <span className="text-[10px] text-gray-500 italic">New Service</span>
                    )}
                </div>

                <p className="text-[11px] text-gray-400 line-clamp-2 mb-4 h-[33px]">
                    {service.description}
                </p>

                <div className="flex items-center justify-between mt-auto">
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Est. {service.estimatedTime}</p>
                        <p className="text-lg font-extrabold text-white">
                            {service.price > 0 ? (
                                <>
                                    <span className="text-primary">₱</span>
                                    {service.price.toLocaleString()}
                                </>
                            ) : (
                                <span className="text-sm text-primary">Get Quote</span>
                            )}
                        </p>
                    </div>

                    <button
                        onClick={handleBookNow}
                        className="bg-primary hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all active:scale-95"
                    >
                        Book
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
            if (mechanic.status !== 'Active' || !daySchedule?.isAvailable) return false;

            if (mechanic.unavailableDates?.some(d => {
                const start = new Date(d.startDate.replace(/-/g, '/'));
                start.setHours(0, 0, 0, 0);
                const end = new Date(d.endDate.replace(/-/g, '/'));
                end.setHours(0, 0, 0, 0);
                return today >= start && today <= end;
            })) return false;

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
                if (!categoryToMechanics.has(specLower)) categoryToMechanics.set(specLower, []);
                categoryToMechanics.get(specLower)!.push(mechanic);
            });
        });

        return new Map(db.services.map(service => {
            const serviceNameLower = service.name.toLowerCase();
            const serviceCategoryLower = service.category.toLowerCase();
            const relevantMechanics = [...new Set([...(categoryToMechanics.get(serviceNameLower) || []), ...(categoryToMechanics.get(serviceCategoryLower) || [])])];

            if (relevantMechanics.length === 0) return [service.id, { avgRating: 0, totalReviews: 0 }];

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
                if (service.price === 0) return true;
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
        <div className="flex flex-col min-h-screen bg-secondary pb-20">
            <Header title="All Services" />

            <div className="px-4 py-4 space-y-5 bg-secondary/95 backdrop-blur-sm border-b border-white/5">
                {/* Search Bar */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-orange-600/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                    <div className="relative flex items-center bg-[#252525] border border-white/10 rounded-xl focus-within:border-primary/50 transition-colors">
                        <Search className="ml-4 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search for any service..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent text-white p-3.5 placeholder-gray-500 focus:outline-none"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="mr-4 text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex items-center gap-3">
                    {/* Price Dropdown */}
                    <div className="relative flex-1">
                        <select
                            value={priceRange}
                            onChange={e => setPriceRange(e.target.value)}
                            className="w-full appearance-none bg-[#2A2A2A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50"
                        >
                            <option value="all">All Prices</option>
                            <option value="0-1000">Under ₱1,000</option>
                            <option value="1000-2500">₱1,000 - ₱2,500</option>
                            <option value="2500-5000">₱2,500 - ₱5,000</option>
                            <option value="5000">Over ₱5,000</option>
                        </select>
                        <Filter className="absolute right-3.5 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Availability Toggle */}
                    <div
                        onClick={() => setAvailabilityFilter(!availabilityFilter)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all duration-300 ${availabilityFilter
                            ? 'bg-primary/10 border-primary/50'
                            : 'bg-[#2A2A2A] border-white/10 hover:bg-[#333]'
                            }`}
                    >
                        <span className={`text-sm font-medium transition-colors ${availabilityFilter ? 'text-primary' : 'text-gray-400'}`}>
                            Available Today
                        </span>
                        <div className={`w-9 h-5 rounded-full relative transition-colors ${availabilityFilter ? 'bg-primary' : 'bg-gray-600'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${availabilityFilter ? 'left-5' : 'left-1'}`} />
                        </div>
                    </div>
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
                    {serviceCategories.map(category => (
                        <button
                            key={category}
                            onClick={() => setFilterCategory(category)}
                            className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-300 border ${filterCategory === category
                                ? 'bg-gradient-to-r from-primary to-orange-600 text-white border-transparent shadow-lg shadow-orange-500/30 scale-105'
                                : 'bg-[#2A2A2A] text-gray-400 border-white/5 hover:border-white/20 hover:text-white'
                                }`}
                        >
                            {category === 'all' ? 'All' : category}
                        </button>
                    ))}
                </div>
            </div>

            {/* Service Grid */}
            {loading ? (
                <div className="flex-grow flex items-center justify-center pt-20">
                    <Spinner size="lg" />
                </div>
            ) : (
                <div className="px-4 grid grid-cols-2 gap-4 pb-4">
                    {displayedServices.length > 0 ? (
                        displayedServices.map((service, index) => {
                            const ratings = serviceRatings.get(service.id) || { avgRating: 0, totalReviews: 0 };
                            return (
                                <ServiceCard
                                    key={service.id}
                                    service={service}
                                    rating={ratings.avgRating}
                                    reviewCount={ratings.totalReviews}
                                    onBook={handleBook}
                                    index={index}
                                />
                            );
                        })
                    ) : (
                        <div className="col-span-2 flex flex-col items-center justify-center text-center py-20 animate-fadeIn">
                            <div className="w-20 h-20 bg-[#2A2A2A] rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-gray-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No Services Found</h3>
                            <p className="text-gray-400 text-sm max-w-xs mx-auto">
                                We couldn't find any services matching your search or filters. Try adjusting them.
                            </p>
                            <button
                                onClick={() => { setSearchQuery(''); setFilterCategory('all'); setPriceRange('all'); setAvailabilityFilter(false); }}
                                className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium text-primary transition-colors"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ServicesScreen;