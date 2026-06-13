import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Service, Mechanic } from '../types';
import CustomerHeader from '../components/CustomerHeader';
import { useDatabase } from '../context/DatabaseContext';
import { Search, X, Star, Clock, TrendingUp, ChevronDown, Wrench, LayoutGrid, LayoutList } from 'lucide-react';
import { Card, Badge, Skeleton, EmptyState } from '../components/ui';
import { getFallbackImageForCategory } from '../utils/fallbackImages';
import Tooltip from '../components/ui/Tooltip';
import UnifiedProductCard from '../components/ui/UnifiedProductCard';

// Enhanced Service Card Component
const EnhancedServiceCardComponent: React.FC<{
    service: Service;
    rating: number;
    reviewCount: number;
    isAvailable: boolean;
    onBook: (service: Service) => void;
    viewMode: 'grid' | 'list';
}> = ({ service, rating, reviewCount, isAvailable, onBook, viewMode }) => {
    const handleBookNow = (e: React.MouseEvent) => {
        e.stopPropagation();
        onBook(service);
    };

    const fallbackImage = getFallbackImageForCategory(service.category);
    const imageUrl = service.imageUrl || fallbackImage;
    const isGrid = viewMode === 'grid';

    const cardClasses = isGrid
        ? 'bg-[#1E1E1E] rounded-xl overflow-hidden group border border-white/5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col h-full cursor-pointer'
        : 'bg-[#1E1E1E] rounded-xl overflow-hidden group border border-white/5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 flex flex-col sm:flex-row items-stretch gap-4 cursor-pointer';

    const cardContentClasses = isGrid
        ? 'p-3 sm:p-4 flex flex-col flex-grow justify-between'
        : 'flex-1 p-4 flex flex-col justify-between gap-3';

    return (
        <Card
            variant="elevated"
            padding="none"
            hover
            onClick={() => onBook(service)}
            className={cardClasses}
        >
            {isGrid ? (
                <UnifiedProductCard
                    imageUrl={imageUrl}
                    alt={service.name}
                    aspectRatio="sixteenNine"
                    className="group relative"
                    fallbackImageUrl={fallbackImage}
                >
                    {/* Badges Overlays */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 pointer-events-auto">
                        <span className="bg-black/70 backdrop-blur-md text-white text-[9px] font-bold tracking-wider px-2 py-0.5 rounded border border-white/10 uppercase">
                            {service.category}
                        </span>
                        {isAvailable && (
                            <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                                Available
                            </span>
                        )}
                    </div>
                </UnifiedProductCard>
            ) : (
                <div className="w-full sm:w-[110px] h-[110px] overflow-hidden rounded-[16px] flex-shrink-0 relative">
                    <img
                        src={imageUrl}
                        alt={service.name}
                        loading="lazy"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== fallbackImage) {
                                target.src = fallbackImage;
                            }
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                </div>
            )}

            <div className={cardContentClasses}>
                {isGrid ? (
                    <div className="flex flex-col flex-grow justify-between gap-3">
                        <div>
                            {/* Category & Duration Row */}
                            <div className="flex items-center justify-between text-[10px] font-medium text-gray-500 mb-1">
                                <span className="capitalize text-primary font-bold">{service.category}</span>
                                <div className="flex items-center gap-1">
                                    <Clock size={11} className="text-gray-500" />
                                    <span>{service.estimatedTime}</span>
                                </div>
                            </div>

                            {/* Service Title */}
                            <h3 className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
                                {service.name}
                            </h3>

                            {/* Description snippet */}
                            {service.description && (
                                <p className="text-[10px] sm:text-[11px] text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                                    {service.description}
                                </p>
                            )}
                        </div>

                        {/* Price & Rating Section */}
                        <div className="mt-auto pt-2 border-t border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm sm:text-base font-extrabold text-[#FF7A00]">
                                    {service.price > 0 ? `₱${service.price.toLocaleString()}` : 'Get Quote'}
                                </span>
                                
                                {rating > 0 && (
                                    <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                        <span>★</span>
                                        <span>{rating.toFixed(1)}</span>
                                        <span className="text-gray-500 font-normal">({reviewCount})</span>
                                    </div>
                                )}
                            </div>

                            {/* Action Button inside card */}
                            <button
                                onClick={handleBookNow}
                                className="w-full py-2 text-[11px] font-bold text-black bg-[#FF7A00] hover:bg-orange-500 active:scale-[0.98] transition-all rounded-lg flex items-center justify-center gap-1 shadow-md shadow-primary/10"
                            >
                                <span>View Details</span>
                                <span className="text-xs font-semibold">→</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    // List Mode Price and Details
                    <div className="space-y-2">
                        <p className="text-[#FF7A00] text-lg font-bold">
                            {service.price > 0 ? `₱${service.price.toLocaleString()}` : 'Get Quote'}
                        </p>
                        <p className="text-white text-sm font-semibold capitalize">{service.category}</p>
                        <div className="flex items-center gap-2 text-gray-400 text-xs">
                            <Clock size={14} />
                            <span>{service.estimatedTime}</span>
                        </div>
                        <p className="text-gray-400 text-[13px] line-clamp-3">{service.description}</p>
                    </div>
                )}

                {!isGrid && (
                    <button
                        onClick={handleBookNow}
                        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-black transition hover:bg-orange-500"
                    >
                        View Details
                    </button>
                )}
            </div>
        </Card>
    );
};

const EnhancedServiceCard = React.memo(EnhancedServiceCardComponent);
EnhancedServiceCard.displayName = 'EnhancedServiceCard';

// Loading Skeleton Component
const ServiceCardSkeleton: React.FC = () => (
    <Card variant="elevated" padding="none" className="overflow-hidden">
        <Skeleton variant="rectangular" height="176px" />
        <div className="p-4 space-y-3">
            <Skeleton width="80%" height="20px" />
            <Skeleton width="60%" height="16px" />
            <Skeleton width="100%" height="32px" />
            <div className="flex justify-between items-center pt-2">
                <Skeleton width="80px" height="24px" />
                <Skeleton width="80px" height="36px" className="rounded-lg" />
            </div>
        </div>
    </Card>
);

// Main Services Screen Component
const ServicesScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // State Management
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [filterCategory, setFilterCategory] = useState('all');
    const [priceRange, setPriceRange] = useState('all');
    const [sortBy, setSortBy] = useState<'popular' | 'price-low' | 'price-high' | 'rating'>('popular');
    const [availabilityFilter, setAvailabilityFilter] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        const saved = localStorage.getItem('ridersbud_services_viewmode');
        return (saved === 'grid' || saved === 'list') ? saved : 'grid';
    });

    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('ridersbud_services_viewmode', mode);
    };

    const services = db?.services || [];

    // Service Categories
    const serviceCategories = useMemo(() => {
        if (!db?.services) return ['all'];
        const uniqueCategories = Array.from(new Set(db.services.map(s => s.category).filter(Boolean)));
        return ['all', ...uniqueCategories];
    }, [db]);

    // Available Mechanic Specializations
    const availableMechanicSpecializations = useMemo(() => {
        if (!db) return new Set<string>();
        const today = new Date();
        const todayDayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof Required<Mechanic>['availability'];

        const availableMechanics = db.mechanics.filter(mechanic => {
            const daySchedule = mechanic.availability?.[todayDayOfWeek];
            const isAvailableToday = mechanic.isOnline || (daySchedule?.isAvailable ?? false);
            if (mechanic.status !== 'Active' || !isAvailableToday) return false;

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

    // Service Ratings Calculation
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

    // Filtered and Sorted Services
    const displayedServices = useMemo(() => {
        const lowercasedQuery = searchQuery.toLowerCase();

        let filtered = services.filter(service => {
            const searchMatch = searchQuery
                ? service.name.toLowerCase().includes(lowercasedQuery) ||
                service.description.toLowerCase().includes(lowercasedQuery)
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

        // Sorting
        filtered.sort((a, b) => {
            const ratingsA = serviceRatings.get(a.id) || { avgRating: 0, totalReviews: 0 };
            const ratingsB = serviceRatings.get(b.id) || { avgRating: 0, totalReviews: 0 };

            switch (sortBy) {
                case 'popular':
                    return ratingsB.totalReviews - ratingsA.totalReviews;
                case 'price-low':
                    return (a.price || Infinity) - (b.price || Infinity);
                case 'price-high':
                    return (b.price || 0) - (a.price || 0);
                case 'rating':
                    return ratingsB.avgRating - ratingsA.avgRating;
                default:
                    return a.name.localeCompare(b.name);
            }
        });

        return filtered;
    }, [searchQuery, filterCategory, priceRange, sortBy, services, availabilityFilter, availableMechanicSpecializations, serviceRatings]);

    const handleBook = (service: Service) => {
        navigate(`/customer-portal/service/${service.id}`);
    };

    const activeFiltersCount = [
        filterCategory !== 'all',
        priceRange !== 'all',
        availabilityFilter,
    ].filter(Boolean).length;

    return (
        <div className="flex flex-col min-h-screen bg-[#121212]">
            <CustomerHeader title="Services" showBackButton={false} icon={<Wrench size={22} />} />

            {/* Search & Category Section */}
            <div className="px-5 py-4 border-b border-white/5 bg-[#121212]/50 backdrop-blur-sm z-30">
                <div className="flex gap-3">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                        <Tooltip content="Search services" className="w-full">
                            <input
                                type="text"
                                placeholder="Search services..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-10 py-3 bg-[#1E1E1E] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all font-medium"
                            />
                        </Tooltip>
                        {searchQuery && (
                            <Tooltip content="Clear search">
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                                >
                                    <X size={16} className="text-gray-500" />
                                </button>
                            </Tooltip>
                        )}
                    </div>

                    {/* Category Dropdown */}
                    <div className="relative w-40 sm:w-48 flex-shrink-0">
                        <Tooltip content="Filter by category" className="w-full">
                            <button
                                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                                className={`w-full text-left pl-4 pr-10 py-3 bg-[#1E1E1E] border ${isCategoryOpen ? 'border-primary' : 'border-white/10'} rounded-xl text-white text-sm font-bold transition-all truncate cursor-pointer hover:bg-[#252525] flex items-center`}
                            >
                                <span className="truncate capitalize">{filterCategory === 'all' ? 'All Services' : filterCategory}</span>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 absolute right-3 ${isCategoryOpen ? 'rotate-180 text-primary' : ''}`} />
                            </button>
                        </Tooltip>
                        
                        {isCategoryOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                />
                                <div className="absolute top-full right-0 mt-2 w-48 sm:w-56 bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-fadeIn origin-top-right">
                                    <div className="max-h-60 overflow-y-auto scrollbar-hide py-1">
                                        {serviceCategories.map(category => (
                                            <Tooltip key={category} content={`Show ${category === 'all' ? 'all services' : category}`} className="w-full">
                                                <button
                                                    onClick={() => {
                                                        setFilterCategory(category);
                                                        setIsCategoryOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${filterCategory === category ? 'bg-primary/20 text-primary font-bold' : 'text-gray-300 hover:bg-white/10 hover:text-white'} capitalize`}
                                                >
                                                    {category === 'all' ? 'All Services' : category}
                                                </button>
                                            </Tooltip>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Count and View Mode */}
            <div className="px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center justify-between text-sm">
                <div>
                    <p className="text-gray-400">
                        {displayedServices.length} {displayedServices.length === 1 ? 'service' : 'services'} found
                    </p>
                    {displayedServices.length > 0 && (
                        <div className="flex items-center gap-1.5 text-primary mt-1">
                            <TrendingUp size={14} />
                            <span className="font-medium">Sorted by {sortBy.replace('-', ' ')}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Services Grid */}
            <div className="flex-1 px-5 pb-24">
                {loading ? (
                    <div className={viewMode === 'list' ? 'flex flex-col gap-4' : 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4'}>
                        {[...Array(6)].map((_, i) => (
                            <ServiceCardSkeleton key={i} />
                        ))}
                    </div>
                ) : displayedServices.length > 0 ? (
                    <div className={viewMode === 'list' ? 'flex flex-col gap-4' : 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4'}>
                        {displayedServices.map(service => {
                            const ratings = serviceRatings.get(service.id) || { avgRating: 0, totalReviews: 0 };
                            const isAvailable = availableMechanicSpecializations.has(service.category.toLowerCase()) ||
                                availableMechanicSpecializations.has(service.name.toLowerCase());

                            return (
                                <Tooltip key={service.id} content={service.name} className="w-full">
                                    <EnhancedServiceCard
                                        service={service}
                                        rating={ratings.avgRating}
                                        reviewCount={ratings.totalReviews}
                                        isAvailable={isAvailable}
                                        onBook={handleBook}
                                        viewMode={viewMode}
                                    />
                                </Tooltip>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState
                        icon={<Search size={64} strokeWidth={1.5} />}
                        title="No Services Found"
                        description="Try adjusting your search or filters to find what you're looking for."
                        action={{
                            label: "Clear All Filters",
                            onClick: () => {
                                setSearchQuery('');
                                setFilterCategory('all');
                                setPriceRange('all');
                                setAvailabilityFilter(false);
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default ServicesScreen;
