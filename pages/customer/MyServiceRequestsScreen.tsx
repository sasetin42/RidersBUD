import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import { 
    ChevronLeft, Filter, Search, Calendar, MapPin, Activity, 
    CheckCircle, Clock, Car, Upload, Eye, FileText, XCircle, AlertCircle
} from 'lucide-react';
import Spinner from '../../components/Spinner';

const MyServiceRequestsScreen: React.FC = () => {
    const { db, loading, updateRentalBooking } = useDatabase();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [filter, setFilter] = useState<'All' | 'Pending' | 'In Progress' | 'Completed'>('All');
    const [activeSection, setActiveSection] = useState<'services' | 'rentals'>('services');
    const [expandedRentalId, setExpandedRentalId] = useState<string | null>(null);
    const [uploadingForId, setUploadingForId] = useState<string | null>(null);
    const [uploadType, setUploadType] = useState<'License' | 'Gov ID' | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (loading || !db) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
                <Spinner size="lg" />
            </div>
        );
    }

    const requests = db.serviceRequests?.filter(req => req.customerId === user?.id) || [];
    const rentalBookings = db.rentalBookings?.filter(rent => rent.customerId === user?.id) || [];

    const filteredRequests = requests.filter(req => {
        if (filter === 'All') return true;
        return req.status === filter;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const filteredRentals = rentalBookings.filter(rent => {
        if (filter === 'All') return true;
        const mappedStatus = rent.status === 'Approved' ? 'In Progress' : rent.status === 'Received' ? 'Pending' : rent.status;
        return mappedStatus === filter;
    }).sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10';
            case 'In Progress':
            case 'Approved': 
                return 'text-amber-500 border-amber-500/20 bg-amber-500/10';
            case 'Cancelled': return 'text-red-500 border-red-500/20 bg-red-500/10';
            default: return 'text-blue-400 border-blue-400/20 bg-blue-400/10'; // Pending / Received
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Completed': return <CheckCircle size={12} className="shrink-0" />;
            case 'In Progress':
            case 'Approved':
                return <Activity size={12} className="shrink-0" />;
            default: return <Clock size={12} className="shrink-0" />;
        }
    };

    const triggerFileInput = (bookingId: string, type: 'License' | 'Gov ID') => {
        setUploadingForId(bookingId);
        setUploadType(type);
        setTimeout(() => {
            fileInputRef.current?.click();
        }, 100);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadingForId || !uploadType) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64data = reader.result as string;
            const booking = rentalBookings.find(b => b.id === uploadingForId);
            if (!booking) return;

            const currentDocs = (booking as any).documents || [];
            const updatedDocs = [
                ...currentDocs.filter((d: any) => d.name !== uploadType),
                {
                    name: uploadType,
                    url: base64data,
                    type: file.type,
                    size: file.size,
                    uploadedAt: new Date().toISOString()
                }
            ];

            try {
                if (updateRentalBooking) {
                    await updateRentalBooking(uploadingForId, {
                        documents: updatedDocs
                    } as any);
                    alert(`${uploadType} uploaded successfully!`);
                }
            } catch (err) {
                console.error(err);
                alert("Failed to upload document.");
            } finally {
                setUploadingForId(null);
                setUploadType(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans pb-24">
            {/* Hidden File Input */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*,application/pdf"
            />

            {/* Header */}
            <header className="px-6 pt-12 pb-6 border-b border-white/5 bg-[#111] sticky top-0 z-30">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => navigate('/customer-portal')} className="w-10 h-10 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-black uppercase text-xl tracking-tight">Manage Bookings</h1>
                        <p className="text-[10px] text-gray-500 tracking-widest uppercase mt-0.5">Track your active requests & rentals</p>
                    </div>
                </div>

                {/* Section Toggle Tabs */}
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 mb-6 max-w-sm">
                    <button 
                        onClick={() => setActiveSection('services')}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeSection === 'services' ? 'bg-[#E62E00] text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Services
                    </button>
                    <button 
                        onClick={() => setActiveSection('rentals')}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeSection === 'rentals' ? 'bg-[#E62E00] text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Car Rentals
                    </button>
                </div>

                {/* Filter Pills */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                    {['All', 'Pending', 'In Progress', 'Completed'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                                filter === f 
                                ? 'bg-white/10 border-white/30 text-white' 
                                : 'bg-transparent border-white/10 text-gray-400 hover:border-white/30'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </header>

            {/* List Body */}
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6">
                {activeSection === 'services' ? (
                    filteredRequests.length === 0 ? (
                        <div className="text-center py-20 bg-[#111] border border-white/5">
                            <Activity size={32} className="mx-auto text-gray-600 mb-4" />
                            <h3 className="text-white font-bold mb-1">No requests found</h3>
                            <p className="text-xs text-gray-500">You don't have any {filter !== 'All' ? filter.toLowerCase() : ''} service requests.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredRequests.map(req => (
                                <div key={req.id} className="bg-[#111] border border-white/5 p-5 group hover:border-white/20 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-base font-black uppercase text-white mb-1">{req.serviceName}</h3>
                                            <p className="text-[10px] text-gray-500 font-mono">ID: {req.id.slice(-8).toUpperCase()}</p>
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-widest border ${getStatusColor(req.status)}`}>
                                            {getStatusIcon(req.status)}
                                            {req.status}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        {req.scheduledDate && (
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-gray-500" />
                                                <div>
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Scheduled</p>
                                                    <p className="text-xs text-gray-300 font-medium">{new Date(req.scheduledDate).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        )}
                                        {req.vehicleId && (
                                            <div className="flex items-center gap-2">
                                                <Activity size={14} className="text-gray-500" />
                                                <div>
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Vehicle</p>
                                                    <p className="text-xs text-gray-300 font-medium font-mono">{req.vehicleId}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Dynamic Details Preview */}
                                    {req.details && Object.keys(req.details).length > 0 && (
                                        <div className="bg-[#0A0A0A] border border-white/5 p-3 rounded-lg mt-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                {Object.entries(req.details).slice(0, 4).map(([key, value]) => {
                                                    if (key === 'instructions' || key === 'damageDesc') return null;
                                                    return (
                                                        <div key={key}>
                                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest truncate">{key}</p>
                                                            <p className="text-xs text-gray-300 font-medium truncate">{String(value)}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    /* CAR RENTALS TAB */
                    filteredRentals.length === 0 ? (
                        <div className="text-center py-20 bg-[#111] border border-white/5">
                            <Car size={32} className="mx-auto text-gray-600 mb-4" />
                            <h3 className="text-white font-bold mb-1">No rentals found</h3>
                            <p className="text-xs text-gray-500">You don't have any {filter !== 'All' ? filter.toLowerCase() : ''} active car rentals.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredRentals.map(rent => {
                                const carObj = db.rentalCars?.find(c => c.id === rent.carId);
                                const isExpanded = expandedRentalId === rent.id;
                                const docs = (rent as any).documents || [];
                                const hasLicense = docs.some((d: any) => d.name === 'License');
                                const hasGovId = docs.some((d: any) => d.name === 'Gov ID');
                                
                                return (
                                    <div 
                                        key={rent.id} 
                                        className="bg-[#111] border border-white/5 hover:border-white/15 transition-all p-5 rounded-2xl cursor-pointer"
                                        onClick={() => setExpandedRentalId(isExpanded ? null : rent.id)}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                                            <div className="flex gap-4 items-start">
                                                {carObj?.imageUrl ? (
                                                    <img 
                                                        src={carObj.imageUrl} 
                                                        alt={carObj.model} 
                                                        className="w-16 h-12 rounded-xl object-cover border border-white/10 shrink-0" 
                                                    />
                                                ) : (
                                                    <div className="w-16 h-12 bg-white/5 rounded-xl flex items-center justify-center text-[#FE7803] shrink-0">
                                                        <Car size={20} />
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="text-sm font-black uppercase text-white leading-tight">
                                                        {carObj ? `${carObj.year} ${carObj.make} ${carObj.model}` : 'Rental Vehicle'}
                                                    </h3>
                                                    <p className="text-[9px] text-gray-500 mt-1 font-mono">BOOKING ID: {rent.id.slice(-8).toUpperCase()}</p>
                                                </div>
                                            </div>
                                            <div className={`w-fit flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-widest border rounded-md ${getStatusColor(rent.status || 'Received')}`}>
                                                {getStatusIcon(rent.status || 'Received')}
                                                {rent.status || 'Received'}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 mb-3 text-left">
                                            <div>
                                                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Start Date</p>
                                                <p className="text-xs font-black text-white mt-0.5">{rent.startDate}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">End Date</p>
                                                <p className="text-xs font-black text-white mt-0.5">{rent.endDate}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Total Price</p>
                                                <p className="text-xs font-black text-[#FE7803] mt-0.5">₱{rent.totalPrice?.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="mt-4 pt-4 border-t border-white/5 space-y-5 animate-fadeIn" onClick={e => e.stopPropagation()}>
                                                {/* Visual Stepper */}
                                                <div>
                                                    <h4 className="text-[9px] font-black tracking-widest text-gray-500 uppercase mb-3">// Rental Fulfillment Status</h4>
                                                    <div className="grid grid-cols-5 gap-1.5 relative">
                                                        {[
                                                            { title: 'Booked', active: true },
                                                            { title: 'Documents', active: hasLicense && hasGovId },
                                                            { title: 'Approved', active: rent.status === 'Approved' || rent.status === 'Active' || rent.status === 'Completed' },
                                                            { title: 'Active', active: rent.status === 'Active' || rent.status === 'Completed' },
                                                            { title: 'Returned', active: rent.status === 'Completed' }
                                                        ].map((step, idx) => (
                                                            <div key={idx} className="flex flex-col items-center text-center">
                                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[9px] font-black ${
                                                                    step.active 
                                                                    ? 'bg-[#FE7803] border-[#FE7803] text-white' 
                                                                    : 'bg-white/5 border-white/10 text-gray-600'
                                                                }`}>
                                                                    {idx + 1}
                                                                </div>
                                                                <span className={`text-[8px] font-bold mt-1.5 ${step.active ? 'text-white' : 'text-gray-600'}`}>{step.title}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Upload Section */}
                                                <div className="bg-[#111113] p-4 rounded-xl border border-white/5 space-y-3.5">
                                                    <div>
                                                        <h4 className="text-[10px] font-black tracking-widest text-white uppercase flex items-center gap-1.5">
                                                            <FileText size={12} className="text-[#FE7803]" />
                                                            Fulfillment Documents Checklist
                                                        </h4>
                                                        <p className="text-[9px] text-gray-500 mt-1">Please upload your credentials below to get verified and finalize vehicle handover.</p>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                                        {/* Document 1: Driver License */}
                                                        <div className="bg-black/30 border border-white/5 p-3 rounded-lg flex items-center justify-between gap-3">
                                                            <div>
                                                                <p className="text-[9px] text-gray-400 font-bold">Driver's License</p>
                                                                <p className="text-[8px] text-gray-600 mt-0.5">{hasLicense ? "✅ Uploaded (Verified)" : "❌ Upload Required"}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => triggerFileInput(rent.id, 'License')}
                                                                className="h-7 px-3 bg-white/5 hover:bg-[#FE7803] hover:text-white border border-white/10 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1"
                                                            >
                                                                <Upload size={10} /> {hasLicense ? "Update" : "Upload"}
                                                            </button>
                                                        </div>

                                                        {/* Document 2: Government ID */}
                                                        <div className="bg-black/30 border border-white/5 p-3 rounded-lg flex items-center justify-between gap-3">
                                                            <div>
                                                                <p className="text-[9px] text-gray-400 font-bold">Government ID</p>
                                                                <p className="text-[8px] text-gray-600 mt-0.5">{hasGovId ? "✅ Uploaded (Verified)" : "❌ Upload Required"}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => triggerFileInput(rent.id, 'Gov ID')}
                                                                className="h-7 px-3 bg-white/5 hover:bg-[#FE7803] hover:text-white border border-white/10 rounded-md text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1"
                                                            >
                                                                <Upload size={10} /> {hasGovId ? "Update" : "Upload"}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Document preview status warning */}
                                                    {!hasLicense || !hasGovId ? (
                                                        <div className="flex items-center gap-2 text-amber-500/80 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg text-[9px]">
                                                            <AlertCircle size={12} className="shrink-0" />
                                                            <span>Uploading both documents is required to complete fulfillment check.</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-green-400 bg-green-500/5 border border-green-500/10 p-2.5 rounded-lg text-[9px]">
                                                            <CheckCircle size={12} className="shrink-0" />
                                                            <span>Documents uploaded! Our agents are verifying details for vehicle release.</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </main>
        </div>
    );
};

export default MyServiceRequestsScreen;
