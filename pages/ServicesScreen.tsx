
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockServices } from '../data/mockData';
import { Service } from '../types';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';
import Spinner from '../components/Spinner';

const ServiceCard: React.FC<{ service: Service; onAddToCart: (service: Service) => void; }> = ({ service, onAddToCart }) => {
    const navigate = useNavigate();
    return (
        <div className="bg-dark-gray rounded-lg overflow-hidden flex flex-col">
            <img src={service.imageUrl} alt={service.name} className="w-full h-32 object-cover" />
            <div className="p-4 flex-grow flex flex-col">
                <h3 className="text-lg font-bold text-white">{service.name}</h3>
                <p className="text-sm text-light-gray mt-1 flex-grow">{service.description.substring(0, 50)}...</p>
                <div className="flex items-center text-xs text-light-gray mt-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Est. Time: {service.estimatedTime || 'N/A'}</span>
                </div>
                <div className="mt-4 flex justify-between items-center">
                    <span className="text-primary font-bold text-lg">${service.price.toFixed(2)}</span>
                    <button onClick={(e) => { e.stopPropagation(); onAddToCart(service); }} className="bg-primary text-white text-xs font-bold py-1 px-3 rounded-md hover:bg-orange-600 transition">
                        Add+
                    </button>
                </div>
                 <button onClick={() => navigate(`/service/${service.id}`)} className="mt-2 w-full text-center text-primary text-sm">View Details</button>
            </div>
        </div>
    );
};


const ServicesScreen: React.FC = () => {
    const { addToCart } = useCart();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('default');
    const [filterCategory, setFilterCategory] = useState('all');
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setServices(mockServices);
            setLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    const serviceCategories = useMemo(() => {
        const categories = new Set(mockServices.map(s => s.category));
        return ['all', ...Array.from(categories)];
    }, []);

    const displayedServices = useMemo(() => {
        let filteredServices = [...services];

        // Filter by search query
        if (searchQuery) {
            filteredServices = filteredServices.filter(service =>
                service.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by category
        if (filterCategory !== 'all') {
            filteredServices = filteredServices.filter(s => s.category === filterCategory);
        }

        // Sort services
        switch (sortOption) {
            case 'price-asc':
                filteredServices.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                filteredServices.sort((a, b) => b.price - a.price);
                break;
            default:
                filteredServices.sort((a, b) => parseInt(a.id) - parseInt(b.id));
                break;
        }

        return filteredServices;
    }, [searchQuery, sortOption, filterCategory, services]);

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="All Services" />
            
            <div className="p-4 border-b border-dark-gray">
                <div className="relative mb-4">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Search for a service..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary"
                        aria-label="Search services"
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
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
                    <div className="flex-1">
                        <label htmlFor="sort-order" className="block text-sm font-medium text-light-gray mb-1">Sort by</label>
                        <select
                            id="sort-order"
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="w-full px-4 py-2 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="default">Default</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                 <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            ) : (
                <div className="flex-grow p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
                    {displayedServices.length > 0 ? (
                        displayedServices.map(service => (
                            <ServiceCard key={service.id} service={service} onAddToCart={addToCart} />
                        ))
                    ) : (
                        <div className="col-span-1 md:col-span-2 flex items-center justify-center text-center h-full text-light-gray p-8">
                            <p>No services found for the selected criteria.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ServicesScreen;