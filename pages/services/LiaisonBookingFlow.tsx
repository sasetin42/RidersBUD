import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, ChevronRight, CheckCircle, Car, Calendar, MapPin, FileText, Camera, Shield, FileCheck, Check, AlertCircle, Search, Phone } from 'lucide-react';
import Spinner from '../../components/Spinner';
import { VehicleFormModal } from '../MyGarageScreen';
import { Vehicle } from '../../types';

interface DocumentFile {
    name: string;
    type: string;
    size: number;
    url: string;
}

const LiaisonBookingFlow: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { db, loading, addLiaisonBooking } = useDatabase();
    const { user, addUserVehicle } = useAuth();
    const navigate = useNavigate();

    const service = db?.appServices?.find(s => s.id === slug);
    const vehicles = user?.vehicles || [];
    
    const defaultBranches = [
        { id: 'lto-qc', name: 'LTO Quezon City District Office', address: 'East Avenue, Diliman, Quezon City', city: 'Quezon City', phone: '09171234567', isAvailable: true, lat: 14.6441, lng: 121.0483 },
        { id: 'lto-pasay', name: 'LTO Pasay District Office', address: 'Domestic Road, Pasay City', city: 'Pasay City', phone: '09172345678', isAvailable: true, lat: 14.5441, lng: 120.9942 },
        { id: 'lto-makati', name: 'LTO Makati District Office', address: 'Pililia Street, Brgy. Valenzuela, Makati City', city: 'Makati City', phone: '09173456789', isAvailable: true, lat: 14.5613, lng: 121.0180 },
        { id: 'lto-manila', name: 'LTO Manila West District Office', address: 'G. Apacible Street, Paco, Manila', city: 'Manila', phone: '09179988776', isAvailable: true, lat: 14.5896, lng: 120.9747 },
        { id: 'lto-baguio', name: 'LTO Baguio District Office', address: 'Governor Pack Road, Baguio City', city: 'Baguio City', phone: '09176789012', isAvailable: true, lat: 16.4076, lng: 120.5978 },
        { id: 'lto-pampanga', name: 'LTO San Fernando District Office', address: 'McArthur Highway, San Fernando, Pampanga', city: 'San Fernando', phone: '09177890123', isAvailable: true, lat: 15.0345, lng: 120.6798 },
        { id: 'lto-angeles', name: 'LTO Angeles District Office', address: 'McArthur Highway, Balibago, Angeles City', city: 'Angeles City', phone: '09171122334', isAvailable: true, lat: 15.1430, lng: 120.5883 },
        { id: 'lto-dagupan', name: 'LTO Dagupan District Office', address: 'Caranglaan District, Dagupan City, Pangasinan', city: 'Dagupan City', phone: '09172233445', isAvailable: true, lat: 16.0433, lng: 120.3333 },
        { id: 'lto-naga', name: 'LTO Naga District Office', address: 'Concepcion Grande, Naga City, Camarines Sur', city: 'Naga City', phone: '09173344556', isAvailable: true, lat: 13.6218, lng: 123.1948 },
        { id: 'lto-cavite', name: 'LTO Cavite District Office', address: 'National Highway, Brgy. Alapan, Imus, Cavite', city: 'Imus', phone: '09174455667', isAvailable: true, lat: 14.4791, lng: 120.8972 },
        { id: 'lto-laguna', name: 'LTO Laguna District Office', address: 'Brgy. Callios, Santa Cruz, Laguna', city: 'Santa Cruz', phone: '09175566778', isAvailable: true, lat: 14.2787, lng: 121.4147 },
        { id: 'lto-cebu', name: 'LTO Cebu City District Office', address: 'N. Bacalso Avenue, Cebu City', city: 'Cebu City', phone: '09174567890', isAvailable: true, lat: 10.3060, lng: 123.9056 },
        { id: 'lto-iloilo', name: 'LTO Iloilo District Office', address: 'El 98 Street, Jaro, Iloilo City', city: 'Iloilo City', phone: '09179123456', isAvailable: true, lat: 10.6978, lng: 122.5855 },
        { id: 'lto-bacolod', name: 'LTO Bacolod District Office', address: 'Cottage Road, Bacolod City, Negros Occidental', city: 'Bacolod City', phone: '09176677889', isAvailable: true, lat: 10.6840, lng: 122.9563 },
        { id: 'lto-tacloban', name: 'LTO Tacloban District Office', address: 'Real Street, Tacloban City, Leyte', city: 'Tacloban City', phone: '09177788990', isAvailable: true, lat: 11.2417, lng: 125.0033 },
        { id: 'lto-tagbilaran', name: 'LTO Tagbilaran District Office', address: 'Dampas District, Tagbilaran City, Bohol', city: 'Tagbilaran City', phone: '09178899001', isAvailable: true, lat: 9.6500, lng: 123.8500 },
        { id: 'lto-davao', name: 'LTO Davao City District Office', address: 'Quimpo Boulevard, Davao City', city: 'Davao City', phone: '09175678901', isAvailable: true, lat: 7.0863, lng: 125.6144 },
        { id: 'lto-cdo', name: 'LTO Cagayan de Oro District Office', address: 'M.H. Del Pilar Street, Cagayan de Oro City', city: 'Cagayan de Oro', phone: '09178901234', isAvailable: true, lat: 8.4822, lng: 124.6472 },
        { id: 'lto-zamboanga', name: 'LTO Zamboanga District Office', address: 'Veterans Avenue, Zamboanga City', city: 'Zamboanga City', phone: '09179012345', isAvailable: true, lat: 6.9080, lng: 122.0620 },
        { id: 'lto-gensan', name: 'LTO General Santos District Office', address: 'Lanao Builder Building, National Highway, General Santos City', city: 'General Santos City', phone: '09171223344', isAvailable: true, lat: 6.1167, lng: 125.1667 },
        { id: 'lto-butuan', name: 'LTO Butuan District Office', address: 'J.C. Aquino Avenue, Butuan City, Agusan del Norte', city: 'Butuan City', phone: '09172334455', isAvailable: true, lat: 8.9472, lng: 125.5428 }
    ];
    const branches = db?.liaisonBranches && db.liaisonBranches.length > 0 ? db.liaisonBranches : defaultBranches;
    const defaultStaff = [
        { id: 'liaison-juan', name: 'Juan Dela Cruz', phone: '09181234567', imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', rating: 4.8, assignedBranches: ['lto-qc', 'lto-pasay'], isAvailable: true, description: 'Experienced Liaison Officer specializing in registration and license renewals.', totalJobs: 24 },
        { id: 'liaison-maria', name: 'Maria Santos', phone: '09182345678', imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200', rating: 4.9, assignedBranches: ['lto-makati', 'lto-pasay', 'lto-manila'], isAvailable: true, description: 'Efficient and professional, handling LTO documents with care.', totalJobs: 18 },
        { id: 'liaison-ramon', name: 'Ramon Valenzuela', phone: '09183456789', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', rating: 4.7, assignedBranches: ['lto-angeles', 'lto-pampanga', 'lto-dagupan'], isAvailable: true, description: 'Dedicated officer with deep knowledge of LTO policies and procedures.', totalJobs: 15 },
        { id: 'liaison-sarah', name: 'Sarah Geronimo', phone: '09184567890', imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200', rating: 4.95, assignedBranches: ['lto-cebu', 'lto-mandaue', 'lto-lapulapu'], isAvailable: true, description: 'Visayas regional coordinator, handles all document liaisons with premium efficiency.', totalJobs: 32 },
        { id: 'liaison-michael', name: 'Michael Dinglasan', phone: '09185678901', imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', rating: 4.85, assignedBranches: ['lto-davao', 'lto-gensan'], isAvailable: true, description: 'Mindanao document handling specialist, fast processing speed and highly reliable.', totalJobs: 21 }
    ];
    const staff = db?.liaisonStaff && db.liaisonStaff.length > 0 ? db.liaisonStaff : defaultStaff;
    const accentColor = db?.settings?.accentColor || '#FE7803';

    // 8 steps
    const [currentStep, setCurrentStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // Form Wizard State
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [manualVehicle, setManualVehicle] = useState({
        plateNumber: '',
        type: 'Sedan',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        engineNumber: '',
        chassisNumber: '',
        currentOrNumber: '',
        currentCrNumber: '',
        province: 'Metro Manila'
    });
    const [isManualVehicle, setIsManualVehicle] = useState(false);

    // Step 2
    const [serviceType, setServiceType] = useState<string>('Vehicle Registration Renewal');

    // Step 3
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');

    // Step 4: Documents Upload State
    const [uploadedDocs, setUploadedDocs] = useState<Record<string, { file: DocumentFile; progress: number }>>({});

    // Step 5: Liaison Agent
    const [selectedLiaisonId, setSelectedLiaisonId] = useState<string>('');

    // Step 6: Schedule
    const [appointmentDate, setAppointmentDate] = useState<string>('');
    const [appointmentTime, setAppointmentTime] = useState<string>('');

    // Step 7: Pickup & Contact Info
    const [pickupOption, setPickupOption] = useState<'Customer brings documents' | 'Home Pickup' | 'Office Pickup'>('Customer brings documents');
    const [pickupAddress, setPickupAddress] = useState<string>('');
    const [customerPhone, setCustomerPhone] = useState<string>('');
    const [customerEmail, setCustomerEmail] = useState<string>('');
    const [preferredContact, setPreferredContact] = useState<string>('Phone');

    // Step 8: Payment
    const [paymentMethod, setPaymentMethod] = useState<'GCash' | 'Maya' | 'Credit Card' | 'Debit Card' | 'Cash' | 'Bank Transfer'>('GCash');

    // Search and Map state/refs for LTO Branch selection
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
    const mapRef = React.useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = React.useRef<any>(null);
    const markersRef = React.useRef<any[]>([]);

    // Map cleanup when step changes
    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            markersRef.current = [];
        };
    }, [currentStep]);

    // Map synchronization and pin render
    useEffect(() => {
        if (currentStep !== 3 || !mapRef.current || typeof window === 'undefined' || !(window as any).L) return;
        const L = (window as any).L;

        const selectedBranch = branches.find(b => b.id === selectedBranchId) || branches[0];
        if (!selectedBranch) return;

        const defaultLat = selectedBranch.lat || 14.5995;
        const defaultLng = selectedBranch.lng || 120.9842;

        if (!mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapRef.current, {
                zoomControl: false,
                preferCanvas: false,
                scrollWheelZoom: true,
                doubleClickZoom: true,
                touchZoom: true,
                dragging: true
            }).setView([defaultLat, defaultLng], 12);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20,
                crossOrigin: true
            }).addTo(mapInstanceRef.current);
        }

        // Clear existing markers
        markersRef.current.forEach(m => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.removeLayer(m);
            }
        });
        markersRef.current = [];

        // Filter branches matching name, address, or city
        const filteredBranches = branches.filter(b => 
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            b.address.toLowerCase().includes(searchQuery.toLowerCase()) || 
            b.city.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Add markers for all filtered branches
        filteredBranches.forEach(b => {
            const isSelected = b.id === selectedBranchId;
            const markerIcon = L.divIcon({
                html: `<div class="rb-location-pin-wrapper ${isSelected ? 'glowing-highlight' : ''}" style="${
                    isSelected 
                        ? `filter: drop-shadow(0 0 12px ${accentColor}); transform: scale(1.15); transform-origin: bottom center;` 
                        : ''
                }">
                    <div class="rb-location-circle" style="${
                        isSelected 
                            ? `border: 2.5px solid ${accentColor}; box-shadow: 0 0 12px ${accentColor};` 
                            : ''
                    }">
                        <img src="${db?.settings?.mapLogoUrl || db?.settings?.appLogoUrl || '/favicon.png'}" alt="Location" onerror="this.style.display='none'" style="width:36px;height:36px;object-fit:contain;border-radius:50%;" />
                    </div>
                    <div class="rb-location-stem" style="${isSelected ? `background-color: ${accentColor}; height: 16px;` : ''}"></div>
                    <div class="rb-location-dot" style="${isSelected ? `background-color: ${accentColor};` : ''}"></div>
                </div>`,
                className: 'rb-leaflet-icon',
                iconSize: [56, 76],
                iconAnchor: [28, 76]
            });

            const marker = L.marker([b.lat, b.lng], { icon: markerIcon })
                .addTo(mapInstanceRef.current)
                .on('click', () => {
                    setSelectedBranchId(b.id);
                });
            
            markersRef.current.push(marker);
        });

        // Center and zoom view on the selected branch
        if (selectedBranchId) {
            const activeBranch = branches.find(b => b.id === selectedBranchId);
            if (activeBranch) {
                mapInstanceRef.current.setView([activeBranch.lat, activeBranch.lng], 15);
            }
        }
    }, [currentStep, selectedBranchId, branches, db, searchQuery, accentColor]);

    // Load state from sessionStorage
    useEffect(() => {
        try {
            const cached = sessionStorage.getItem('LIAISON_WIZARD_STATE');
            if (cached) {
                const data = JSON.parse(cached);
                if (data.currentStep) setCurrentStep(data.currentStep);
                if (data.selectedVehicleId) setSelectedVehicleId(data.selectedVehicleId);
                if (data.manualVehicle) setManualVehicle(data.manualVehicle);
                if (data.isManualVehicle !== undefined) setIsManualVehicle(data.isManualVehicle);
                if (data.serviceType) setServiceType(data.serviceType);
                if (data.selectedBranchId) setSelectedBranchId(data.selectedBranchId);
                if (data.uploadedDocs) setUploadedDocs(data.uploadedDocs);
                if (data.selectedLiaisonId) setSelectedLiaisonId(data.selectedLiaisonId);
                if (data.appointmentDate) setAppointmentDate(data.appointmentDate);
                if (data.appointmentTime) setAppointmentTime(data.appointmentTime);
                if (data.pickupOption) setPickupOption(data.pickupOption);
                if (data.pickupAddress) setPickupAddress(data.pickupAddress);
                if (data.customerPhone) setCustomerPhone(data.customerPhone);
                if (data.customerEmail) setCustomerEmail(data.customerEmail);
                if (data.preferredContact) setPreferredContact(data.preferredContact);
                if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
            }
        } catch (_) {}
    }, []);

    // Save state to sessionStorage
    const saveProgress = (nextStep: number) => {
        try {
            const state = {
                currentStep: nextStep,
                selectedVehicleId,
                manualVehicle,
                isManualVehicle,
                serviceType,
                selectedBranchId,
                uploadedDocs,
                selectedLiaisonId,
                appointmentDate,
                appointmentTime,
                pickupOption,
                pickupAddress,
                customerPhone: customerPhone || user?.phone || '',
                customerEmail: customerEmail || user?.email || '',
                preferredContact,
                paymentMethod
            };
            sessionStorage.setItem('LIAISON_WIZARD_STATE', JSON.stringify(state));
        } catch (_) {}
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!service) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] text-white">
                <h1 className="text-2xl font-black">Service Not Found</h1>
                <button onClick={() => navigate('/customer-portal/app-services')} className="mt-6 font-bold" style={{ color: accentColor }}>Back</button>
            </div>
        );
    }

    // Dynamic Seeding fallback
    const selectedBranch = branches.find(b => b.id === selectedBranchId) || branches[0];
    const filteredStaff = (() => {
        const activeStaff = (db?.liaisonStaff || staff).filter(s => s.isAvailable !== false);
        const branchSpecific = activeStaff.filter(s => s.assignedBranches && s.assignedBranches.includes(selectedBranchId));
        return branchSpecific.length > 0 ? branchSpecific : activeStaff;
    })();
    const selectedLiaison = staff.find(s => s.id === selectedLiaisonId);

    // Fees calculation
    const fees = {
        serviceFee: 1500,
        governmentFee: serviceType.includes('Ownership') ? 2200 : 1200,
        pickupFee: pickupOption === 'Customer brings documents' ? 0 : 250,
        discount: 0,
        total: 0
    };
    fees.total = fees.serviceFee + fees.governmentFee + fees.pickupFee - fees.discount;

    const handleNext = () => {
        const next = currentStep + 1;
        setCurrentStep(next);
        saveProgress(next);
    };

    const handleBack = () => {
        if (currentStep > 1) {
            const prev = currentStep - 1;
            setCurrentStep(prev);
            saveProgress(prev);
        } else {
            navigate(-1);
        }
    };

    // Document mock uploading simulator
    const simulateUpload = (docKey: string, fileName: string, size: number, type: string) => {
        let currentProgress = 0;
        setUploadedDocs(prev => ({
            ...prev,
            [docKey]: {
                file: { name: fileName, size, type, url: 'data:text/plain;base64,U2ltdWxhdGVkRmlsZQ==' },
                progress: 0
            }
        }));

        const interval = setInterval(() => {
            currentProgress += 10;
            setUploadedDocs(prev => {
                if (!prev[docKey]) return prev;
                return {
                    ...prev,
                    [docKey]: {
                        ...prev[docKey],
                        progress: Math.min(currentProgress, 100)
                    }
                };
            });

            if (currentProgress >= 100) {
                clearInterval(interval);
            }
        }, 150);
    };

    const isStepValid = () => {
        if (currentStep === 1) {
            return !!selectedVehicleId;
        }
        if (currentStep === 2) return !!serviceType;
        if (currentStep === 3) return !!selectedBranchId;
        if (currentStep === 4) {
            // OR and CR are required
            return !!uploadedDocs['OR']?.progress && uploadedDocs['OR'].progress === 100 &&
                   !!uploadedDocs['CR']?.progress && uploadedDocs['CR'].progress === 100;
        }
        if (currentStep === 5) return !!selectedLiaisonId;
        if (currentStep === 6) return !!appointmentDate && !!appointmentTime;
        if (currentStep === 7) {
            const phone = customerPhone || user?.phone || '';
            const email = customerEmail || user?.email || '';
            if (pickupOption !== 'Customer brings documents' && !pickupAddress) return false;
            return !!phone && !!email;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            const docArray = Object.keys(uploadedDocs).map(key => ({
                name: uploadedDocs[key].file.name,
                type: uploadedDocs[key].file.type,
                size: uploadedDocs[key].file.size,
                url: uploadedDocs[key].file.url
            }));

            const vehicleData = (() => {
                const found = vehicles.find(v => v.id === selectedVehicleId || v.plateNumber === selectedVehicleId);
                return {
                    plateNumber: found?.plateNumber || '',
                    type: found?.type || 'Sedan',
                    brand: found?.make || '',
                    model: found?.model || '',
                    year: found?.year || new Date().getFullYear(),
                    color: found?.color || ''
                };
            })();

            const bookingPayload = {
                customerId: user.id,
                customerName: user.name,
                customerPhone: customerPhone || user.phone || '',
                customerEmail: customerEmail || user.email || '',
                serviceType,
                vehicleDetails: vehicleData,
                branchId: selectedBranchId,
                branchName: selectedBranch?.name || 'LTO Branch',
                liaisonId: selectedLiaisonId,
                liaisonName: selectedLiaison?.name || 'Assigned Liaison',
                appointmentDate,
                appointmentTime,
                pickupOption,
                pickupAddress: pickupOption === 'Customer brings documents' ? undefined : pickupAddress,
                documents: docArray,
                status: 'Booking Received' as const,
                paymentStatus: paymentMethod === 'Cash' ? 'Pending' as const : 'Paid' as const,
                paymentMethod,
                fees,
                statusHistory: [{
                    status: 'Booking Received',
                    timestamp: new Date().toISOString(),
                    officerName: 'System',
                    notes: 'Your Liaison booking request has been submitted.'
                }],
                createdAt: new Date().toISOString()
            };

            await addLiaisonBooking(bookingPayload);
            sessionStorage.removeItem('LIAISON_WIZARD_STATE');
            navigate('/customer-portal/reminders'); // Navigation fallback to customer requests/reminders history
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans">
            {/* Header */}
            <header className="px-6 py-4 border-b border-white/5 flex items-center gap-4 bg-[#111113]">
                <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors">
                    <ChevronLeft size={18} />
                </button>
                <div>
                    <h1 className="font-black uppercase text-xs tracking-wider">Registration Assistant</h1>
                    <p className="text-[9px] text-gray-500 tracking-widest uppercase">Flow Wizard • Step {currentStep} of 8</p>
                </div>
            </header>

            {/* Step indicators */}
            <div className="w-full h-[3px] bg-white/5 flex">
                <div 
                    className="h-full transition-all duration-300" 
                    style={{ width: `${(currentStep / 8) * 100}%`, backgroundColor: accentColor }}
                ></div>
            </div>

            {/* Scrollable Wizard Pane */}
            <main className="flex-1 max-w-lg mx-auto w-full px-5 py-6 pb-24 overflow-y-auto">
                
                {/* Step 1: Vehicle selection */}
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Select Vehicle</h2>
                            <p className="text-xs text-gray-400">Choose a vehicle from your garage or define one manually.</p>
                        </div>

                        <div className="space-y-3">
                            {vehicles.map(v => (
                                <div 
                                    key={v.id || v.plateNumber}
                                    onClick={() => setSelectedVehicleId(v.id || v.plateNumber || '')}
                                    className={`p-4 border transition-all rounded-xl cursor-pointer flex items-center justify-between gap-4 ${selectedVehicleId === (v.id || v.plateNumber) ? 'bg-white/5' : 'border-white/5 bg-[#111113]'}`}
                                    style={{ borderColor: selectedVehicleId === (v.id || v.plateNumber) ? accentColor : undefined }}
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="w-14 h-14 bg-white/5 rounded-lg overflow-hidden flex items-center justify-center border border-white/10 shrink-0">
                                            {v.imageUrls && v.imageUrls.length > 0 ? (
                                                <img src={v.imageUrls[0]} alt={`${v.make} ${v.model}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <Car size={24} className="text-gray-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-sm text-white truncate">{v.year} {v.make} {v.model}</h3>
                                                {v.isPrimary && (
                                                    <span className="bg-primary/10 border border-primary/20 text-[8px] font-black text-primary px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                        Primary
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{v.plateNumber}</p>
                                            <div className="flex items-center gap-2 text-[9px] text-gray-400">
                                                {v.type && <span className="bg-white/5 px-1.5 py-0.5 rounded uppercase font-bold">{v.type}</span>}
                                                {v.color && <span className="bg-white/5 px-1.5 py-0.5 rounded uppercase font-bold">{v.color}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {selectedVehicleId === (v.id || v.plateNumber) && <Check size={16} style={{ color: accentColor }} className="shrink-0" />}
                                </div>
                            ))}

                            <button 
                                onClick={() => setShowAddVehicleModal(true)}
                                className="w-full py-4 border border-dashed border-white/10 hover:border-white/20 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-all text-center rounded-xl bg-[#111113]/50"
                            >
                                + Add vehicle details manually
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Service Type */}
                {currentStep === 2 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Service Type</h2>
                            <p className="text-xs text-gray-400">Select the specific LTO Liaison process required.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                            {[
                                'Vehicle Registration Renewal',
                                'Transfer of Ownership',
                                'New Registration',
                                'Duplicate OR',
                                'Duplicate CR',
                                'Lost Plate',
                                'Replacement Plate',
                                'Change Engine',
                                'Change Color',
                                'Other'
                            ].map((type) => (
                                <div 
                                    key={type}
                                    onClick={() => setServiceType(type)}
                                    className={`p-4 border transition-all rounded-xl cursor-pointer ${serviceType === type ? 'bg-white/5' : 'border-white/5 bg-[#111113]'}`}
                                    style={{ borderColor: serviceType === type ? accentColor : undefined }}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-white uppercase tracking-wide">{type}</span>
                                        {serviceType === type && <Check size={14} style={{ color: accentColor }} />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 3: LTO Branches */}
                {currentStep === 3 && (() => {
                    const filteredBranches = branches.filter(b => 
                        b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        b.address.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        b.city.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    return (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight mb-2">LTO Branch</h2>
                                <p className="text-xs text-gray-400">Search and select the LTO office location closest to you.</p>
                            </div>

                            {/* Live Search Bar with Dropdown */}
                            <div className="relative z-30">
                                <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-500" />
                                <input
                                    id="liaison-lto-search"
                                    name="liaison-lto-search"
                                    type="text"
                                    placeholder="Search LTO Branch by name, address, or city..."
                                    value={searchQuery}
                                    onFocus={() => setShowDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowDropdown(true);
                                    }}
                                    className="w-full bg-[#111113] border border-white/5 pl-11 pr-4 py-3.5 rounded-xl text-xs focus:outline-none focus:border-primary/50 text-white"
                                />

                                {/* Dropdown Menu */}
                                {showDropdown && (
                                    <div className="absolute left-0 right-0 top-full mt-2 bg-[#16161a] border border-white/10 rounded-xl max-h-60 overflow-y-auto shadow-2xl z-50 divide-y divide-white/5">
                                        {filteredBranches.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-gray-500 uppercase tracking-wider font-bold">
                                                No LTO branches found
                                            </div>
                                        ) : (
                                            filteredBranches.map(b => (
                                                <div
                                                    key={b.id}
                                                    onClick={() => {
                                                        setSelectedBranchId(b.id);
                                                        setSearchQuery(b.name);
                                                        setShowDropdown(false);
                                                    }}
                                                    className="p-3.5 hover:bg-white/5 cursor-pointer text-left transition-colors"
                                                >
                                                    <h4 className="text-xs font-bold text-white uppercase tracking-wide">{b.name}</h4>
                                                    <p className="text-[10px] text-gray-400 mt-1">{b.address}, {b.city}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Leaflet Live Map Display */}
                            <div className="relative w-full h-[220px] rounded-2xl overflow-hidden border border-white/5 shadow-inner bg-[#1A1A1E] z-10">
                                <div ref={mapRef} className="w-full h-full" />
                            </div>

                            {/* Selected Branch Details Card */}
                            {selectedBranch && (
                                <div className="p-4 bg-[#111113] border border-white/5 rounded-xl flex justify-between items-start gap-4 animate-fadeIn">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">// Selected Branch</span>
                                        <h3 className="font-bold text-xs uppercase tracking-wide text-white">{selectedBranch.name}</h3>
                                        <p className="text-[10px] text-gray-400">{selectedBranch.address}</p>
                                        <p className="text-[9px] text-gray-500 font-mono">TEL: {selectedBranch.phone}</p>
                                    </div>
                                    <div className="bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                                        Active
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Step 4: Documents Uploads */}
                {currentStep === 4 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Upload Documents</h2>
                            <p className="text-xs text-gray-400">Provide LTO compliance files to continue. Progress is simulated.</p>
                        </div>

                        <div className="space-y-4">
                            {[
                                { key: 'OR', label: 'Official Receipt (OR) *' },
                                { key: 'CR', label: 'Certificate of Registration (CR) *' },
                                { key: 'ID', label: 'Government Issued ID *' },
                                { key: 'Deed', label: 'Deed of Sale (Required for Ownership Transfer)' },
                                { key: 'Insurance', label: 'Insurance Policy Certificate' }
                            ].map((docItem) => {
                                const uploaded = uploadedDocs[docItem.key];
                                return (
                                    <div key={docItem.key} className="bg-[#111113] border border-white/5 p-4 rounded-xl">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">{docItem.label}</span>
                                            {uploaded?.progress === 100 && <CheckCircle size={16} className="text-green-500" />}
                                        </div>

                                        {!uploaded ? (
                                            <label className="flex items-center justify-center border border-dashed border-white/10 hover:border-white/20 p-4 rounded-lg cursor-pointer transition-colors bg-black/30">
                                                <Camera size={18} className="text-gray-500 mr-2" />
                                                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Choose / Take Photo</span>
                                                <input 
                                                    id="liaison-document"
                                                    name="liaison-document"
                                                    type="file" 
                                                    accept="image/*,application/pdf"
                                                    className="hidden" 
                                                    onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            simulateUpload(docItem.key, file.name, file.size, file.type);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        ) : (
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-[10px] text-gray-400">
                                                    <span className="truncate max-w-[180px] font-mono">{uploaded.file.name}</span>
                                                    <span>{uploaded.progress}%</span>
                                                </div>
                                                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full transition-all duration-300"
                                                        style={{ width: `${uploaded.progress}%`, backgroundColor: accentColor }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Step 5: Liaison Agent */}
                {currentStep === 5 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Choose Liaison Agent</h2>
                            <p className="text-xs text-gray-400">Select a verified liaison officer to manage LTO processing.</p>
                        </div>

                        <div className="space-y-3">
                            {filteredStaff.length === 0 ? (
                                <div className="p-8 border border-white/5 text-center text-xs text-gray-500 font-medium rounded-xl">
                                    No liaison agents available at this branch.
                                </div>
                            ) : (
                                filteredStaff.map(s => {
                                    const isSelected = selectedLiaisonId === s.id;
                                    return (
                                        <div 
                                            key={s.id}
                                            onClick={() => setSelectedLiaisonId(s.id)}
                                            className="p-4 border transition-all duration-300 ease-out rounded-2xl cursor-pointer bg-[#111113] hover:bg-[#151518]/90 relative overflow-hidden flex flex-col gap-3.5 select-none"
                                            style={{ 
                                                borderColor: isSelected ? accentColor : 'rgba(255, 255, 255, 0.05)',
                                                boxShadow: isSelected ? `0 0 20px -5px ${accentColor}33` : 'none',
                                                transform: 'translate3d(0, 0, 0)',
                                                willChange: 'transform, border-color, background-color, box-shadow'
                                            }}
                                        >
                                            {/* Header Section: Avatar, Name, Rating */}
                                            <div className="flex items-center gap-3.5">
                                                {/* Avatar container with fixed width/height & aspect ratio to prevent Layout Shift (CLS) */}
                                                <div 
                                                    className="w-12 h-12 bg-white/5 rounded-full overflow-hidden flex items-center justify-center border border-white/10 shrink-0 relative"
                                                    style={{ aspectRatio: '1/1' }}
                                                >
                                                    {s.imageUrl ? (
                                                        <img 
                                                            src={s.imageUrl} 
                                                            alt={s.name} 
                                                            loading="lazy"
                                                            width="48"
                                                            height="48"
                                                            className="w-full h-full object-cover transition-opacity duration-300"
                                                            onLoad={(e) => {
                                                                (e.target as HTMLImageElement).style.opacity = '1';
                                                            }}
                                                            style={{ opacity: 0 }}
                                                        />
                                                    ) : (
                                                        <span className="text-xs font-bold text-gray-400">{s.name.substring(0, 2).toUpperCase()}</span>
                                                    )}
                                                </div>

                                                {/* Agent Identity & Rating */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-sm text-white truncate transition-colors duration-200">
                                                        {s.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5 shrink-0">
                                                            ★ {s.rating.toFixed(2)}
                                                        </span>
                                                        <span className="text-[9px] text-gray-500 font-medium shrink-0">
                                                            ({s.totalJobs || 0} jobs)
                                                        </span>
                                                        <span className="text-[8px] bg-white/5 border border-white/10 text-gray-400 font-black px-1.5 py-0.5 rounded uppercase tracking-wider scale-90 origin-left shrink-0">
                                                            Verified
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Selection Checkmark & Contact Actions */}
                                                <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                    {s.phone && (
                                                        <a 
                                                            href={`tel:${s.phone}`}
                                                            className="w-8 h-8 rounded-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 active:scale-95"
                                                            title={`Contact ${s.name}`}
                                                        >
                                                            <Phone size={14} />
                                                        </a>
                                                    )}
                                                    <div 
                                                        onClick={() => setSelectedLiaisonId(s.id)}
                                                        className="w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200"
                                                        style={{ 
                                                            backgroundColor: isSelected ? accentColor : 'transparent',
                                                            borderColor: isSelected ? accentColor : 'rgba(255, 255, 255, 0.2)'
                                                        }}
                                                    >
                                                        {isSelected && <Check size={12} className="text-white font-black" />}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Details Section: Bio & Availability */}
                                            {s.description && (
                                                <div className="text-[11px] text-gray-400 leading-relaxed border-t border-white/5 pt-2.5">
                                                    {s.description}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Step 6: Schedule */}
                {currentStep === 6 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Select Date & Time</h2>
                            <p className="text-xs text-gray-400">Coordinate the LTO submission window slot.</p>
                        </div>

                        <div className="bg-[#111113] border border-white/5 p-5 rounded-2xl space-y-4">
                            <div>
                                <label htmlFor="liaison-appointment-date" className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Preferred Appointment Date *</label>
                                <input 
                                    id="liaison-appointment-date"
                                    name="liaison-appointment-date"
                                    type="date" 
                                    value={appointmentDate}
                                    onChange={e => setAppointmentDate(e.target.value)}
                                    className="w-full bg-black border border-white/5 text-xs px-4 py-3 rounded-lg focus:outline-none focus:border-white/15"
                                />
                            </div>

                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2.5">Preferred Time Window *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        '08:00 AM - 10:00 AM',
                                        '10:00 AM - 12:00 PM',
                                        '01:00 PM - 03:00 PM',
                                        '03:00 PM - 05:00 PM'
                                    ].map(timeSlot => (
                                        <button
                                            key={timeSlot}
                                            onClick={() => setAppointmentTime(timeSlot)}
                                            className={`py-3 text-center border text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${appointmentTime === timeSlot ? 'bg-white/5 text-white' : 'border-white/5 text-gray-400 bg-black/40 hover:text-white'}`}
                                            style={{ borderColor: appointmentTime === timeSlot ? accentColor : undefined }}
                                        >
                                            {timeSlot}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 7: Pickup & Contact details */}
                {currentStep === 7 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Verification details</h2>
                            <p className="text-xs text-gray-400">Confirm document collection method and contact coordinates.</p>
                        </div>

                        <div className="bg-[#111113] border border-white/5 p-5 rounded-2xl space-y-4">
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Document Retrieval Mode *</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        'Customer brings documents',
                                        'Home Pickup',
                                        'Office Pickup'
                                    ].map((opt: any) => (
                                        <button
                                            key={opt}
                                            onClick={() => setPickupOption(opt)}
                                            className={`p-3 text-left border text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${pickupOption === opt ? 'bg-white/5 text-white' : 'border-white/5 text-gray-400 bg-black/40'}`}
                                            style={{ borderColor: pickupOption === opt ? accentColor : undefined }}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {pickupOption !== 'Customer brings documents' && (
                                <div>
                                    <label htmlFor="liaison-pickup" className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Pickup Address *</label>
                                    <input 
                                        id="liaison-pickup"
                                        name="liaison-pickup"
                                        type="text" 
                                        value={pickupAddress}
                                        onChange={e => setPickupAddress(e.target.value)}
                                        className="w-full bg-black border border-white/5 text-xs px-4 py-3 rounded-lg focus:outline-none"
                                        placeholder="Full address details"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div>
                                    <label htmlFor="liaison-phone" className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Phone Coordinates *</label>
                                    <input id="liaison-phone" name="liaison-phone" type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-black border border-white/5 text-xs px-3 py-2.5 rounded-lg focus:outline-none" placeholder={user?.phone || '09XXXXXXXXX'} />
                                </div>
                                <div>
                                    <label htmlFor="liaison-email" className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Email *</label>
                                    <input id="liaison-email" name="liaison-email" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full bg-black border border-white/5 text-xs px-3 py-2.5 rounded-lg focus:outline-none" placeholder={user?.email || 'name@domain.com'} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 8: Review & Payment Checkout */}
                {currentStep === 8 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Review & Payment</h2>
                            <p className="text-xs text-gray-400">Confirm all details are correct and proceed with checkout.</p>
                        </div>

                        {/* Breakdown summary */}
                        <div className="bg-[#111113] border border-white/5 p-5 rounded-2xl space-y-4">
                            <div className="border-b border-white/5 pb-3">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Assigned Branch & Liaison</span>
                                <h4 className="font-bold text-sm text-white">{selectedBranch?.name}</h4>
                                <p className="text-[10px] text-gray-400 mt-1">Liaison Agent: {selectedLiaison?.name || 'Unassigned'}</p>
                            </div>

                            <div className="border-b border-white/5 pb-3">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Process Action & Schedule</span>
                                <h4 className="font-bold text-xs uppercase tracking-wide text-white">{serviceType}</h4>
                                <p className="text-[10px] text-gray-400 mt-1">{appointmentDate} • {appointmentTime}</p>
                            </div>

                            {/* Payment options */}
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2.5">Select Payment Method</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['GCash', 'Maya', 'Credit Card', 'Cash'].map((method: any) => (
                                        <button
                                            key={method}
                                            onClick={() => setPaymentMethod(method)}
                                            className={`py-3 text-center border text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors ${paymentMethod === method ? 'bg-white/5 text-white' : 'border-white/5 text-gray-400 bg-black/40'}`}
                                            style={{ borderColor: paymentMethod === method ? accentColor : undefined }}
                                        >
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Total fee list */}
                            <div className="border-t border-white/5 pt-4 space-y-2">
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>Liaison Service Fee</span>
                                    <span>₱{fees.serviceFee.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>Est. Government LTO Fees</span>
                                    <span>₱{fees.governmentFee.toLocaleString()}</span>
                                </div>
                                {fees.pickupFee > 0 && (
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>Documents Courier Fee</span>
                                        <span>₱{fees.pickupFee.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/5">
                                    <span>TOTAL AMOUNT</span>
                                    <span style={{ color: accentColor }}>₱{fees.total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Sticky wizard action bottom buttons */}
            <div className="fixed bottom-0 left-0 w-full bg-[#111113] border-t border-white/5 p-4 z-50">
                <div className="max-w-lg mx-auto flex gap-4">
                    {currentStep < 8 ? (
                        <button 
                            onClick={handleNext}
                            disabled={!isStepValid()}
                            className="flex-1 hover:opacity-90 disabled:bg-white/5 disabled:text-white/30 text-black font-black uppercase tracking-widest text-[11px] py-4 flex items-center justify-center gap-2 transition-colors rounded-xl"
                            style={{ backgroundColor: isStepValid() ? accentColor : undefined, color: isStepValid() ? '#ffffff' : undefined }}
                        >
                            Next Step <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="flex-1 hover:opacity-90 disabled:opacity-50 text-white font-black uppercase tracking-widest text-[11px] py-4 flex items-center justify-center gap-2 transition-colors rounded-xl"
                            style={{ backgroundColor: accentColor }}
                        >
                            {submitting ? <Spinner size="sm" /> : 'Confirm Booking'}
                        </button>
                    )}
                </div>
            </div>
            {/* Register Vehicle Modal integration */}
            {showAddVehicleModal && (
                <VehicleFormModal
                    onClose={() => setShowAddVehicleModal(false)}
                    onSave={async (newVehicle) => {
                        await addUserVehicle(newVehicle);
                        setSelectedVehicleId(newVehicle.id);
                        setIsManualVehicle(false);
                        setShowAddVehicleModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default LiaisonBookingFlow;
