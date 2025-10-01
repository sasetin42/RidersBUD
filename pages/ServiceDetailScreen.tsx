
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockServices } from '../data/mockData';
import Header from '../components/Header';
import { useCart } from '../context/CartContext';

const ServiceDetailScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const service = mockServices.find(s => s.id === id);

    if (!service) {
        return <div>Service not found</div>;
    }

    const handleAddToCart = () => {
        addToCart(service);
        alert(`${service.name} added to cart!`);
    };

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title={service.name} showBackButton />
            <div className="flex-grow overflow-y-auto">
                <img src={service.imageUrl} alt={service.name} className="w-full h-48 object-cover" />
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white">{service.name}</h1>
                            <div className="flex items-center text-light-gray mt-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>{service.estimatedTime || 'N/A'}</span>
                            </div>
                        </div>
                        <span className="text-2xl font-bold text-primary">${service.price.toFixed(2)}</span>
                    </div>
                    <p className="text-light-gray">{service.description}</p>
                </div>
            </div>
            <div className="p-4 bg-[#1D1D1D] border-t border-dark-gray flex gap-4">
                <button onClick={handleAddToCart} className="w-1/2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">
                    Add to Cart
                </button>
                <button onClick={() => navigate(`/booking/${service.id}`)} className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition">
                    Book Now
                </button>
            </div>
        </div>
    );
};

export default ServiceDetailScreen;