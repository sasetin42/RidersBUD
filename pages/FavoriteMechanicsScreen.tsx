import React from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useDatabase } from '../context/DatabaseContext';
import { useNavigate } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { Mechanic } from '../types';

const MechanicCard: React.FC<{ mechanic: Mechanic }> = ({ mechanic }) => {
    const navigate = useNavigate();
    return (
        <div onClick={() => navigate(`/mechanic-profile/${mechanic.id}`)} className="bg-dark-gray p-4 rounded-lg flex items-center gap-4 cursor-pointer hover:bg-field transition-colors">
            <img src={mechanic.imageUrl} alt={mechanic.name} className="w-16 h-16 rounded-full object-cover" />
            <div>
                <h3 className="font-bold text-white">{mechanic.name}</h3>
                <p className="text-sm text-yellow-400">⭐ {mechanic.rating.toFixed(1)} ({mechanic.reviews} jobs)</p>
                <p className="text-xs text-light-gray mt-1">{mechanic.specializations.slice(0, 3).join(', ')}</p>
            </div>
        </div>
    );
};

const FavoriteMechanicsScreen: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const { db, loading: dbLoading } = useDatabase();

    const favoriteMechanics = React.useMemo(() => {
        if (!user || !db || !user.favoriteMechanicIds) {
            return [];
        }
        return db.mechanics.filter(m => user.favoriteMechanicIds!.includes(m.id));
    }, [user, db]);

    if (authLoading || dbLoading) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <Header title="Favorite Mechanics" showBackButton />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="Favorite Mechanics" showBackButton />
            <main className="flex-grow overflow-y-auto p-4">
                {favoriteMechanics.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-light-gray px-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                        <p className="text-xl font-semibold mb-2 text-white">No Favorites Yet</p>
                        <p>Tap the star icon on a mechanic's profile to add them here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {favoriteMechanics.map(mechanic => (
                            <MechanicCard key={mechanic.id} mechanic={mechanic} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default FavoriteMechanicsScreen;