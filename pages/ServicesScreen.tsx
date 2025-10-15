import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Service } from '../types';
import Header from '../components/Header';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { useWishlist } from '../context/WishlistContext';

const parseEstimatedTime = (timeStr: string): number => {
    if (!timeStr || timeStr.toLowerCase() === 'n/a' || timeStr.toLowerCase() === 'quote required') {
        return Infinity;
    }
    const lowerTimeStr = timeStr.toLowerCase();
    let totalMinutes = 0;
    
    const hourMatch = lowerTimeStr.match(/([\d.]+)\s*hour/);
    if (hourMatch) {
        totalMinutes += parseFloat(hourMatch[1]) * 60;
    }

    const minMatch = lowerTimeStr.match(/([\d.]+)\s*min/);
    if (minMatch) {
        totalMinutes += parseFloat(minMatch[1]);
    }

    if (totalMinutes === 0 && /^\d+$/.test(lowerTimeStr)) {
        return parseInt(lowerTimeStr, 10);
    }
    
    return totalMinutes;
};


const ServiceCard: React.FC<{ service: Service; }> = ({ service }) => {
    const navigate = useNavigate();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const isWishlisted = isInWishlist(service.id);

    const handleBookNow = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/booking/${service.id}`);
    };
    
    const handleToggleWishlist = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isWishlisted) {
            removeFromWishlist(service.id);
        } else {
            addToWishlist(service);
        }
    };

    return (
        <div 
            onClick={() => navigate(`/service/${service.id}`)} 
            className="bg-dark-gray rounded-xl overflow-hidden cursor-pointer group flex flex-col shadow-lg transition-transform duration-300 hover:-translate-y-1"
        >
            <div className="relative">
                <img src={service.imageUrl} alt={service.name} className="w-full h-28 object-cover" />
            </div>
            
            <div className="p-3 flex flex-col flex-grow">
                 <h3 className="text-[12px] font-medium text-white leading-tight flex-grow">{service.name}</h3>
                 <p className="text-sm text-primary font-semibold mt-1">
                    {service.price > 0 ? `₱${service.price.toLocaleString()}` : 'Request Quote'}
                </p>
                <div className="mt-3 pt-3 border-t border-field flex gap-2 items-center">
                    <button 
                        onClick={handleBookNow} 
                        className="flex-grow bg-primary text-white font-medium py-1.5 px-3 rounded-md hover:bg-orange-600 transition-colors duration-200 text-xs"
                        aria-label={`Book ${service.name} now`}
                    >
                        Book Now
                    </button>
                    <button 
                        onClick={handleToggleWishlist} 
                        className="flex-shrink-0 bg-field rounded-md p-2 transition-transform duration-200 hover:scale-110" 
                        aria-label="Toggle Wishlist"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-colors ${isWishlisted ? 'text-red-500' : 'text-white'}`} fill={isWishlisted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};


const ServicesScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('default');
    const [filterCategory, setFilterCategory] = useState('all');
    const [timeFilter, setTimeFilter] = useState('all');

    const services = db?.services || [];

    const serviceCategories = useMemo(() => {
        if (!services) return ['all'];
        const categories = new Set(services.map(s => s.category));
        return ['all', ...Array.from(categories)];
    }, [services]);

    const displayedServices = useMemo(() => {
        const lowercasedQuery = searchQuery.toLowerCase();
        
        // 1. Apply all filters first
        let filtered = services.filter(service => {
            const searchMatch = searchQuery
                ? service.name.toLowerCase().includes(lowercasedQuery) || service.description.toLowerCase().includes(lowercasedQuery)
                : true;

            const categoryMatch = filterCategory !== 'all' ? service.category === filterCategory : true;
            
            let timeMatch = true;
            if (timeFilter !== 'all') {
                const timeInMinutes = parseEstimatedTime(service.estimatedTime);
                if (timeInMinutes === Infinity) {
                    timeMatch = false;
                } else {
                    switch (timeFilter) {
                        case 'under30': timeMatch = timeInMinutes > 0 && timeInMinutes < 30; break;
                        case '30to60': timeMatch = timeInMinutes >= 30 && timeInMinutes <= 60; break;
                        case '60to120': timeMatch = timeInMinutes > 60 && timeInMinutes <= 120; break;
                        case 'over120': timeMatch = timeInMinutes > 120; break;
                    }
                }
            }
            return searchMatch && categoryMatch && timeMatch;
        });

        // 2. Apply sorting with search prioritization
        filtered.sort((a, b) => {
            // Primary sort: Search relevance if there is a query
            if (searchQuery) {
                const aIsNameMatch = a.name.toLowerCase().includes(lowercasedQuery);
                const bIsNameMatch = b.name.toLowerCase().includes(lowercasedQuery);
                if (aIsNameMatch && !bIsNameMatch) return -1; // a comes first
                if (!aIsNameMatch && bIsNameMatch) return 1;  // b comes first
            }

            // Secondary sort: User's selected option
            switch (sortOption) {
                case 'price-asc': return a.price - b.price;
                case 'price-desc': return b.price - a.price;
                case 'name-asc': return a.name.localeCompare(b.name);
                case 'time-asc': return parseEstimatedTime(a.estimatedTime) - parseEstimatedTime(b.estimatedTime);
                default: return 0;
            }
        });

        // Handle default sort (by ID) only when there's no search query
        if (sortOption === 'default' && !searchQuery) {
            filtered.sort((a, b) => a.id.localeCompare(b.id));
        }
        
        return filtered;
    }, [searchQuery, sortOption, filterCategory, timeFilter, services]);

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="All Services" />
            
            <div className="p-4 border-b border-dark-gray space-y-4">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Search by name or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary"
                        aria-label="Search services"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="category-filter" className="block text-sm font-medium text-light-gray mb-1">Category</label>
                        <select
                            id="category-filter"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            {serviceCategories.map(category => (
                                <option key={category} value={category} className="capitalize">
                                    {category === 'all' ? 'All Categories' : category}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="time-filter" className="block text-sm font-medium text-light-gray mb-1">Duration</label>
                        <select
                            id="time-filter"
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="all">All Durations</option>
                            <option value="under30">Under 30 mins</option>
                            <option value="30to60">30 - 60 mins</option>
                            <option value="60to120">1 - 2 hours</option>
                            <option value="over120">Over 2 hours</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="sort-order" className="block text-sm font-medium text-light-gray mb-1">Sort by</label>
                        <select
                            id="sort-order"
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="default">Default</option>
                            <option value="name-asc">Name</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                            <option value="time-asc">Time: Shortest to Longest</option>
                        </select>
                    </div>
                </div>
                <button onClick={() => navigate('/wishlist')} className="w-full flex items-center justify-center gap-2 bg-dark-gray text-white font-bold py-2 rounded-lg hover:bg-field transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                    </svg>
                    My Wishlist
                </button>
            </div>

            {loading ? (
                 <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            ) : (
                <div className="flex-grow p-4 grid grid-cols-2 gap-4 overflow-y-auto">
                    {displayedServices.length > 0 ? (
                        displayedServices.map(service => (
                            <ServiceCard key={service.id} service={service} />
                        ))
                    ) : (
                        <div className="col-span-2 flex flex-col items-center justify-center text-center h-full text-light-gray p-8">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <h3 className="text-xl font-semibold text-white">No Results Found</h3>
                            <p className="mt-2 text-sm">Try checking your spelling or using fewer keywords.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ServicesScreen;