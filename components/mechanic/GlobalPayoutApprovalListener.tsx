import React, { useState, useEffect } from 'react';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import { useDatabase } from '../../context/DatabaseContext';

export const GlobalPayoutApprovalListener: React.FC = () => {
    const { mechanic } = useMechanicAuth();
    const { db } = useDatabase();
    const [unacknowledgedPayout, setUnacknowledgedPayout] = useState<any | null>(null);

    useEffect(() => {
        if (!mechanic || !db?.payouts) return;

        // Find any approved payout for this mechanic that hasn't been acknowledged
        const acknowledgedList = JSON.parse(localStorage.getItem('ridersbud_acknowledged_payouts') || '[]');
        const approvedPayouts = db.payouts.filter(
            (p: any) => p.mechanicId === mechanic.id && 
                       p.status === 'Approved' && 
                       !acknowledgedList.includes(p.id)
        );

        if (approvedPayouts.length > 0) {
            setUnacknowledgedPayout(approvedPayouts[0]);
        } else {
            setUnacknowledgedPayout(null);
        }
    }, [db?.payouts, mechanic]);

    if (!unacknowledgedPayout) return null;

    const handleAcknowledge = () => {
        const acknowledgedList = JSON.parse(localStorage.getItem('ridersbud_acknowledged_payouts') || '[]');
        acknowledgedList.push(unacknowledgedPayout.id);
        localStorage.setItem('ridersbud_acknowledged_payouts', JSON.stringify(acknowledgedList));
        setUnacknowledgedPayout(null);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-300">
            <div className="bg-[#121212] border border-white/10 rounded-[2rem] p-6 max-w-sm w-full text-center space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200">
                {/* Visual Icon Header */}
                <div className="w-20 h-20 rounded-3xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                </div>

                <div className="space-y-2">
                    <h3 className="text-xl font-black text-white leading-tight">Payout Approved!</h3>
                    <p className="text-xs text-gray-500 font-medium">The administrator has approved your withdrawal request.</p>
                </div>

                {/* Financial Details Container */}
                <div className="bg-[#1E1E1E] rounded-2xl p-4 border border-white/5 text-left space-y-3">
                    <div>
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Amount Released</p>
                        <p className="text-2xl font-black text-green-400">₱{unacknowledgedPayout.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-3 pt-2 border-t border-white/5">
                        <div>
                            <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Payment Method</p>
                            <p className="text-xs text-white font-bold mt-0.5 truncate">{unacknowledgedPayout.paymentMethod}</p>
                        </div>
                        <div>
                            <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Account Details</p>
                            <p className="text-xs text-white font-bold mt-0.5 truncate">{unacknowledgedPayout.accountDetails}</p>
                        </div>
                    </div>

                    {unacknowledgedPayout.notes && (
                        <div className="pt-2.5 border-t border-white/5">
                            <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Notes</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-1 italic leading-relaxed">"{unacknowledgedPayout.notes}"</p>
                        </div>
                    )}
                </div>

                {/* Action button */}
                <button
                    onClick={handleAcknowledge}
                    className="w-full bg-primary text-white font-black py-3.5 rounded-2xl shadow-xl hover:bg-orange-600 active:scale-98 transition-all uppercase tracking-wider text-xs"
                >
                    Got it, Thank you!
                </button>
            </div>
        </div>
    );
};
