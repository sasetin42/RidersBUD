
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Warranty } from '../types';
import Spinner from '../components/Spinner';

const AddWarrantyModal: React.FC<{
    onClose: () => void;
    onSave: (warranty: Omit<Warranty, 'id'>) => void;
}> = ({ onClose, onSave }) => {
    const [itemName, setItemName] = useState('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName || !purchaseDate || !expiryDate) {
            alert('Please fill in all fields.');
            return;
        }
        onSave({ itemName, purchaseDate, expiryDate });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-warranty-title">
            <div className="bg-dark-gray rounded-lg p-6 w-full max-w-sm">
                <h2 id="add-warranty-title" className="text-xl font-bold mb-4">Add New Warranty</h2>
                <form onSubmit={handleSave}>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Part or Service Name"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 focus:ring-primary"
                            required
                            aria-label="Item Name"
                        />
                        <div>
                            <label className="text-sm text-light-gray mb-1 block">Purchase Date</label>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                                aria-label="Purchase Date"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-light-gray mb-1 block">Expiry Date</label>
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                className="w-full px-4 py-3 bg-field border border-dark-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                required
                                aria-label="Expiry Date"
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex gap-4">
                        <button type="button" onClick={onClose} className="w-1/2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">
                            Cancel
                        </button>
                        <button type="submit" className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition">
                            Save Warranty
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const WarrantyScreen: React.FC = () => {
    const [warranties, setWarranties] = useState<Warranty[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                const storedWarranties = localStorage.getItem('serviceWarranties');
                if (storedWarranties) {
                    setWarranties(JSON.parse(storedWarranties));
                }
            } catch (error) {
                console.error("Failed to parse warranties from localStorage", error);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const saveWarranties = (newWarranties: Warranty[]) => {
        setWarranties(newWarranties);
        localStorage.setItem('serviceWarranties', JSON.stringify(newWarranties));
    };

    const handleAddWarranty = (newWarrantyData: Omit<Warranty, 'id'>) => {
        const newWarranty: Warranty = {
            id: new Date().toISOString() + Math.random(),
            ...newWarrantyData,
        };
        saveWarranties([...warranties, newWarranty]);
    };

    const handleDeleteWarranty = (id: string) => {
        if (window.confirm('Are you sure you want to delete this warranty?')) {
            const updatedWarranties = warranties.filter(w => w.id !== id);
            saveWarranties(updatedWarranties);
        }
    };

    const sortedWarranties = [...warranties].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    const formatDate = (dateString: string) => {
        const dateParts = dateString.split('-');
        const localDate = new Date(
            parseInt(dateParts[0]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[2])
        );
        return localDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Warranty Tracking" showBackButton />
            
            <main className="flex-grow overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Spinner size="lg" />
                    </div>
                ) : sortedWarranties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-light-gray px-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <p className="text-xl font-semibold mb-2">No Warranties Logged</p>
                        <p>Tap the '+' button to add a warranty for a part or service.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedWarranties.map(warranty => {
                            const isExpired = new Date(warranty.expiryDate) < new Date();
                            return (
                                <div key={warranty.id} className="bg-dark-gray p-4 rounded-lg relative" role="listitem">
                                    <button onClick={() => handleDeleteWarranty(warranty.id)} className="absolute top-2 right-2 text-light-gray hover:text-red-500 transition-colors" aria-label={`Delete warranty for ${warranty.itemName}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <h3 className="text-lg font-bold text-primary pr-6">{warranty.itemName}</h3>
                                    <p className="text-sm text-light-gray mt-1">Purchased: {formatDate(warranty.purchaseDate)}</p>
                                    <p className={`text-sm font-medium mt-1 ${isExpired ? 'text-red-400' : 'text-green-400'}`}>
                                        Expires: {formatDate(warranty.expiryDate)} {isExpired && "(Expired)"}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
            
            <button
                onClick={() => setIsModalOpen(true)}
                className="absolute bottom-20 right-6 bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition"
                aria-label="Add new warranty"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>

            {isModalOpen && <AddWarrantyModal onClose={() => setIsModalOpen(false)} onSave={handleAddWarranty} />}
        </div>
    );
};

export default WarrantyScreen;
