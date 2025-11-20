import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { Service, Part } from '../types';
import { useNavigate } from 'react-router-dom';

const PartWishlistItem: React.FC<{ item: Part }> = ({ item }) => {
    const { removeFromWishlist } = useWishlist();
    const { addToCart } = useCart();

    const handleMoveToCart = () => {
        addToCart(item);
        removeFromWishlist(item.id);
    };

    return (
        <div className="flex items-center bg-dark-gray p-3 rounded-lg">
            <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-lg object-cover mr-4" />
            <div className="flex-grow">
                <h4 className="font-bold text-white">{item.name}</h4>
                <p className="text-primary font-semibold">₱{item.price.toFixed(2)}</p>
                <div className="mt-2 flex gap-2">
                    <button onClick={handleMoveToCart} className="bg-primary text-white text-xs font-bold py-1 px-3 rounded-md hover:bg-orange-600 transition">
                        Move to Cart
                    </button>
                     <button onClick={() => removeFromWishlist(item.id)} className="bg-field text-white text-xs font-bold py-1 px-3 rounded-md hover:bg-gray-600 transition">
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
};

const ServiceWishlistItem: React.FC<{ item: Service }> = ({ item }) => {
    const { removeFromWishlist } = useWishlist();
    const navigate = useNavigate();

    const handleBookNow = () => {
        navigate(`/booking/${item.id}`);
    };

    return (
        <div className="flex items-center bg-dark-gray p-3 rounded-lg">
            <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-lg object-cover mr-4" />
            <div className="flex-grow">
                <h4 className="font-bold text-white">{item.name}</h4>
                <p className="text-primary font-semibold">{item.price > 0 ? `₱${item.price.toLocaleString()}` : 'Request Quote'}</p>
                <div className="mt-2 flex gap-2">
                    <button onClick={handleBookNow} className="bg-primary text-white text-xs font-bold py-1 px-3 rounded-md hover:bg-orange-600 transition">
                        Book Now
                    </button>
                     <button onClick={() => removeFromWishlist(item.id)} className="bg-field text-white text-xs font-bold py-1 px-3 rounded-md hover:bg-gray-600 transition">
                        Remove
                    </button>
                </div>
            </div>
        </div>
    );
};

const EmptyState: React.FC<{ title: string, subtitle: string }> = ({ title, subtitle }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-light-gray px-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 016.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
        </svg>
        <p className="text-xl font-semibold mb-2 text-white">{title}</p>
        <p>{subtitle}</p>
    </div>
);


const WishlistScreen: React.FC = () => {
    const { wishlistItems } = useWishlist();
    const [activeTab, setActiveTab] = useState<'parts' | 'services'>('parts');

    const { parts, services } = useMemo(() => {
        const partsList = wishlistItems.filter(item => 'sku' in item) as Part[];
        const servicesList = wishlistItems.filter(item => !('sku' in item)) as Service[];
        return { parts: partsList, services: servicesList };
    }, [wishlistItems]);

    const renderContent = () => {
        if (activeTab === 'parts') {
            if (parts.length === 0) {
                 return <EmptyState title="Your Parts Wishlist is Empty" subtitle="Tap the heart icon on any part in the store to save it for later." />;
            }
            return (
                <div className="space-y-4 p-4">
                    {parts.map(item => <PartWishlistItem key={item.id} item={item} />)}
                </div>
            );
        }

        if (activeTab === 'services') {
            if (services.length === 0) {
                 return <EmptyState title="Your Services Wishlist is Empty" subtitle="Tap the heart icon on any service to save it for later." />;
            }
            return (
                <div className="space-y-4 p-4">
                    {services.map(item => <ServiceWishlistItem key={item.id} item={item} />)}
                </div>
            )
        }
    }


    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="My Wishlist" showBackButton />
             <div className="border-b border-dark-gray flex-shrink-0 px-4">
                <nav className="flex space-x-4" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('parts')}
                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'parts' ? 'border-primary text-primary' : 'border-transparent text-light-gray hover:text-white'}`}
                    >
                        Parts ({parts.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('services')}
                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'services' ? 'border-primary text-primary' : 'border-transparent text-light-gray hover:text-white'}`}
                    >
                        Services ({services.length})
                    </button>
                </nav>
            </div>
            <main className="flex-grow overflow-y-auto">
               {renderContent()}
            </main>
        </div>
    );
};

export default WishlistScreen;