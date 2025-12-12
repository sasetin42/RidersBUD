import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Warranty } from '../types';
import Spinner from '../components/Spinner';
import { SupabaseDatabaseService } from '../services/supabaseDatabaseService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const AddWarrantyModal: React.FC<{
    onClose: () => void;
    onSave: (warranty: Omit<Warranty, 'id'>) => void;
}> = ({ onClose, onSave }) => {
    const [itemName, setItemName] = useState('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!itemName.trim()) newErrors.itemName = "Item name is required.";
        if (!purchaseDate) newErrors.purchaseDate = "Purchase date is required.";
        if (!expiryDate) {
            newErrors.expiryDate = "Expiry date is required.";
        } else if (purchaseDate && expiryDate < purchaseDate) {
            newErrors.expiryDate = "Expiry date cannot be before the purchase date.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave({ itemName, purchaseDate, expiryDate });
            onClose();
        }
    };

    const isSaveDisabled = !itemName || !purchaseDate || !expiryDate || Object.keys(errors).length > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="add-warranty-title">
            <div className="bg-dark-gray rounded-lg p-6 w-full max-w-sm animate-scaleUp">
                <h2 id="add-warranty-title" className="text-xl font-bold mb-4">Add New Warranty</h2>
                <form onSubmit={handleSave} noValidate>
                    <div className="space-y-4">
                        <div>
                            <input
                                type="text"
                                placeholder="Part or Service Name"
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                className={`w-full px-4 py-3 bg-field border rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-2 ${errors.itemName ? 'border-red-500 ring-red-500' : 'border-dark-gray focus:ring-primary'}`}
                                required
                                aria-label="Item Name"
                            />
                            {errors.itemName && <p className="text-red-400 text-xs mt-1">{errors.itemName}</p>}
                        </div>
                        <div>
                            <label className="text-sm text-light-gray mb-1 block">Purchase Date</label>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                className={`w-full px-4 py-3 bg-field border rounded-lg text-white focus:outline-none focus:ring-2 ${errors.purchaseDate ? 'border-red-500 ring-red-500' : 'border-dark-gray focus:ring-primary'}`}
                                required
                                aria-label="Purchase Date"
                            />
                            {errors.purchaseDate && <p className="text-red-400 text-xs mt-1">{errors.purchaseDate}</p>}
                        </div>
                        <div>
                            <label className="text-sm text-light-gray mb-1 block">Expiry Date</label>
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                className={`w-full px-4 py-3 bg-field border rounded-lg text-white focus:outline-none focus:ring-2 ${errors.expiryDate ? 'border-red-500 ring-red-500' : 'border-dark-gray focus:ring-primary'}`}
                                required
                                aria-label="Expiry Date"
                            />
                            {errors.expiryDate && <p className="text-red-400 text-xs mt-1">{errors.expiryDate}</p>}
                        </div>
                    </div>
                    <div className="mt-6 flex gap-4">
                        <button type="button" onClick={onClose} className="w-1/2 bg-field text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSaveDisabled} className="w-1/2 bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-50">
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
    const { currentUser } = useAuth();

    useEffect(() => {
        const loadWarranties = async () => {
            if (currentUser && isSupabaseConfigured()) {
                try {
                    const data = await SupabaseDatabaseService.getWarranties(currentUser.id);
                    const warranties: Warranty[] = data.map((w: any) => ({
                        id: w.id,
                        itemName: w.item_name,
                        purchaseDate: w.purchase_date,
                        expiryDate: w.expiry_date
                    }));
                    setWarranties(warranties);
                } catch (error) {
                    console.error('Failed to load warranties from Supabase:', error);
                    // Fallback to localStorage
                    try {
                        const storedWarranties = localStorage.getItem('serviceWarranties');
                        if (storedWarranties) {
                            setWarranties(JSON.parse(storedWarranties));
                        }
                    } catch (error) {
                        console.error("Failed to parse warranties from localStorage", error);
                    }
                }
            } else {
                // Fallback to localStorage
                try {
                    const storedWarranties = localStorage.getItem('serviceWarranties');
                    if (storedWarranties) {
                        setWarranties(JSON.parse(storedWarranties));
                    }
                } catch (error) {
                    console.error("Failed to parse warranties from localStorage", error);
                }
            }
            setLoading(false);
        };

        loadWarranties();
    }, [currentUser]);

    // Setup realtime subscription
    useEffect(() => {
        if (!currentUser || !isSupabaseConfigured() || !supabase) return;

        const channel = supabase
            .channel('warranty-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'service_warranties',
                    filter: `customer_id=eq.${currentUser.id}`
                },
                async () => {
                    console.log('[Warranties] Realtime update detected');
                    const data = await SupabaseDatabaseService.getWarranties(currentUser.id);
                    const warranties: Warranty[] = data.map((w: any) => ({
                        id: w.id,
                        itemName: w.item_name,
                        purchaseDate: w.purchase_date,
                        expiryDate: w.expiry_date
                    }));
                    setWarranties(warranties);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    const handleAddWarranty = async (newWarrantyData: Omit<Warranty, 'id'>) => {
        if (currentUser && isSupabaseConfigured()) {
            try {
                await SupabaseDatabaseService.addWarranty({
                    customer_id: currentUser.id,
                    item_name: newWarrantyData.itemName,
                    purchase_date: newWarrantyData.purchaseDate,
                    expiry_date: newWarrantyData.expiryDate
                });
                // Optimistic update
                const newWarranty: Warranty = {
                    id: new Date().toISOString() + Math.random(),
                    ...newWarrantyData,
                };
                setWarranties([...warranties, newWarranty]);
            } catch (error) {
                console.error('Failed to add warranty to database:', error);
                // Fallback to localStorage
                const newWarranty: Warranty = {
                    id: new Date().toISOString() + Math.random(),
                    ...newWarrantyData,
                };
                const newWarranties = [...warranties, newWarranty];
                setWarranties(newWarranties);
                localStorage.setItem('serviceWarranties', JSON.stringify(newWarranties));
            }
        } else {
            // Fallback to localStorage
            const newWarranty: Warranty = {
                id: new Date().toISOString() + Math.random(),
                ...newWarrantyData,
            };
            const newWarranties = [...warranties, newWarranty];
            setWarranties(newWarranties);
            localStorage.setItem('serviceWarranties', JSON.stringify(newWarranties));
        }
    };

    const handleDeleteWarranty = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this warranty?')) {
            if (currentUser && isSupabaseConfigured()) {
                try {
                    await SupabaseDatabaseService.deleteWarranty(id);
                    // Optimistic update
                    setWarranties(warranties.filter(w => w.id !== id));
                } catch (error) {
                    console.error('Failed to delete warranty from database:', error);
                    // Fallback to localStorage
                    const updatedWarranties = warranties.filter(w => w.id !== id);
                    setWarranties(updatedWarranties);
                    localStorage.setItem('serviceWarranties', JSON.stringify(updatedWarranties));
                }
            } else {
                // Fallback to localStorage
                const updatedWarranties = warranties.filter(w => w.id !== id);
                setWarranties(updatedWarranties);
                localStorage.setItem('serviceWarranties', JSON.stringify(updatedWarranties));
            }
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
                            const expiryDate = new Date(warranty.expiryDate.replace(/-/g, '/'));
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const thirtyDaysFromNow = new Date();
                            thirtyDaysFromNow.setDate(today.getDate() + 30);

                            let status: 'expired' | 'expiring' | 'active' = 'active';
                            let statusColor = 'text-green-400';
                            let statusText = '';
                            let statusIcon = null;

                            if (expiryDate < today) {
                                status = 'expired';
                                statusColor = 'text-red-400';
                                statusText = '(Expired)';
                                statusIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;
                            } else if (expiryDate <= thirtyDaysFromNow) {
                                status = 'expiring';
                                statusColor = 'text-yellow-400';
                                const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                statusText = `(Expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''})`;
                                statusIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
                            }

                            return (
                                <div key={warranty.id} className={`bg-dark-gray p-4 rounded-lg relative border-l-4 ${status === 'expired' ? 'border-red-500' : status === 'expiring' ? 'border-yellow-500' : 'border-green-500'}`} role="listitem">
                                    <button onClick={() => handleDeleteWarranty(warranty.id)} className="absolute top-2 right-2 text-light-gray hover:text-red-500 transition-colors" aria-label={`Delete warranty for ${warranty.itemName}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <h3 className="text-lg font-bold text-primary pr-6">{warranty.itemName}</h3>
                                    <p className="text-sm text-light-gray mt-1">Purchased: {formatDate(warranty.purchaseDate)}</p>
                                    <p className={`text-sm font-medium mt-1 flex items-center ${statusColor}`}>
                                        {statusIcon}
                                        <span>Expires: {formatDate(warranty.expiryDate)} {statusText}</span>
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