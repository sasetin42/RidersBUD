import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Service } from '../types';
import Header from '../components/Header';
import Spinner from '../components/Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { useWishlist } from '../context/WishlistContext';

const ServiceCard: React.FC<{ service: Service; }> = ({ service }) => {
    const navigate = useNavigate();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const isWishlisted = isInWishlist(service.id);

    const handleToggleWishlist = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent navigation when clicking the heart
        if (isWishlisted) {
            removeFromWishlist(service.id);
        } else {
            addToWishlist(service);
        }
    };

    return (
        <div 
            onClick={() => navigate(`/service/${service.id}`)} 
            className="relative rounded-xl overflow-hidden cursor-pointer group shadow-lg transition-transform duration-300 hover:-translate-y-1 aspect-[3/4]"
            role="button"
            aria-label={`View details for ${service.name}`}
        >
            <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

            <button 
                onClick={handleToggleWishlist} 
                className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm rounded-full p-2 transition-transform duration-200 hover:scale-110 active:scale-95 z-10" 
                aria-label="Toggle Wishlist"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-colors ${isWishlisted ? 'text-red-500' : 'text-white'}`} fill={isWishlisted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                </svg>
            </button>

            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{service.name}</h3>
                <div className="flex justify-between items-center mt-2 text-xs">
                    <p className="font-semibold text-primary/90">
                        {service.price > 0 ? `₱${service.price.toLocaleString()}` : 'Quote Required'}
                    </p>
                    <div className="flex items-center gap-1 text-light-gray/90">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>{service.estimatedTime}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


const ServicesScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');

    const services = db?.services || [];

    const serviceCategories = useMemo(() => {
        if (!db?.settings.serviceCategories) return ['all'];
        return ['all', ...db.settings.serviceCategories];
    }, [db]);

    const displayedServices = useMemo(() => {
        const lowercasedQuery = searchQuery.toLowerCase();
        
        let filtered = services.filter(service => {
            const searchMatch = searchQuery
                ? service.name.toLowerCase().includes(lowercasedQuery) || service.description.toLowerCase().includes(lowercasedQuery)
                : true;

            const categoryMatch = filterCategory !== 'all' ? service.category === filterCategory : true;
            
            return searchMatch && categoryMatch;
        });

        // Default sort for consistent ordering
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        
        return filtered;
    }, [searchQuery, filterCategory, services]);

    return (
        <div className="flex flex-col h-full bg-secondary">
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
                        className="w-full pl-10 pr-4 py-2 bg-field border border-dark-gray rounded-full text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary"
                        aria-label="Search services"
                    />
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
                 <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            ) : (
                <div className="flex-grow p-4 pt-0 grid grid-cols-2 gap-4 overflow-y-auto">
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
                            <p className="mt-2 text-sm">Try checking your spelling or adjusting your filters.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ServicesScreen;