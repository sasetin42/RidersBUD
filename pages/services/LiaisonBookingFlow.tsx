import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, ChevronRight, ChevronDown, CheckCircle, Car, Calendar, MapPin, FileText, Camera, Shield, FileCheck, Check, AlertCircle, Search, Phone, Home, Briefcase, Mail, Wallet, CreditCard, Banknote, Info } from 'lucide-react';
import Spinner from '../../components/Spinner';
import { VehicleFormModal } from '../MyGarageScreen';
import { Vehicle } from '../../types';
import { HitPayService } from '../../services/HitPayService';

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

    const service = db?.appServices?.find(s => s.id === slug || s.slug === slug);
    const vehicles = user?.vehicles || [];
    
    // Check if the service is Registration Assistance
    const isRegAssist = slug === 'registration-assistance' || service?.slug === 'registration-assistance';
    const totalSteps = isRegAssist ? 5 : 8;

    // Registration Assistance specific state variables
    const [regVehicleType, setRegVehicleType] = useState<string>('Sedan');
    const [regPlateNumber, setRegPlateNumber] = useState<string>('');
    const [regStatus, setRegStatus] = useState<string>('Active');
    const [regAssistanceType, setRegAssistanceType] = useState<string>('Registration Renewal');
    const [regLocation, setRegLocation] = useState<string>('');
    const [regNotes, setRegNotes] = useState<string>('');
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
    const [branchSearchQuery, setBranchSearchQuery] = useState('');
    const branchDropdownRef = useRef<HTMLDivElement>(null);

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
        { id: 'liaison-juan', name: 'Juan Dela Cruz', phone: '09181234567', imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', rating: 4.8, assignedBranches: ['lto-qc', 'lto-pasay'], assignedServices: ['Vehicle Registration Renewal', 'Transfer of Ownership'], isAvailable: true, description: 'Experienced Liaison Officer specializing in registration and license renewals.', totalJobs: 24 },
        { id: 'liaison-maria', name: 'Maria Santos', phone: '09182345678', imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200', rating: 4.9, assignedBranches: ['lto-makati', 'lto-pasay', 'lto-manila'], assignedServices: ['Vehicle Registration Renewal', 'Duplicate OR', 'Duplicate CR'], isAvailable: true, description: 'Efficient and professional, handling LTO documents with care.', totalJobs: 18 },
        { id: 'liaison-ramon', name: 'Ramon Valenzuela', phone: '09183456789', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', rating: 4.7, assignedBranches: ['lto-angeles', 'lto-pampanga', 'lto-dagupan'], assignedServices: ['Vehicle Registration Renewal', 'Lost Plate', 'Replacement Plate'], isAvailable: true, description: 'Dedicated officer with deep knowledge of LTO policies and procedures.', totalJobs: 15 },
        { id: 'liaison-sarah', name: 'Sarah Geronimo', phone: '09184567890', imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200', rating: 4.95, assignedBranches: ['lto-cebu', 'lto-mandaue', 'lto-lapulapu'], assignedServices: ['Vehicle Registration Renewal', 'Transfer of Ownership', 'Change Engine', 'Change Color'], isAvailable: true, description: 'Visayas regional coordinator, handles all document liaisons with premium efficiency.', totalJobs: 32 },
        { id: 'liaison-michael', name: 'Michael Dinglasan', phone: '09185678901', imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', rating: 4.85, assignedBranches: ['lto-davao', 'lto-gensan'], assignedServices: ['Vehicle Registration Renewal', 'New Registration', 'Other'], isAvailable: true, description: 'Mindanao document handling specialist, fast processing speed and highly reliable.', totalJobs: 21 }
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
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [calendarViewDate, setCalendarViewDate] = useState(new Date());
    const calendarRef = useRef<HTMLDivElement>(null);

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
    const dateInputRef = useRef<HTMLInputElement | null>(null);

    // Close branch dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
                setIsBranchDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close calendar on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19,
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
                
                // Registration Assistance loads
                if (data.regVehicleType) setRegVehicleType(data.regVehicleType);
                if (data.regPlateNumber) setRegPlateNumber(data.regPlateNumber);
                if (data.regStatus) setRegStatus(data.regStatus);
                if (data.regAssistanceType) setRegAssistanceType(data.regAssistanceType);
                if (data.regLocation) setRegLocation(data.regLocation);
                if (data.regNotes) setRegNotes(data.regNotes);
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
                paymentMethod,

                // Registration Assistance saves
                regVehicleType,
                regPlateNumber,
                regStatus,
                regAssistanceType,
                regLocation,
                regNotes
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

    // Auto-deselect liaison agent if they become unavailable in real-time
    useEffect(() => {
        if (selectedLiaisonId) {
            const currentAgent = staff.find(s => s.id === selectedLiaisonId);
            if (currentAgent && currentAgent.isAvailable === false) {
                setSelectedLiaisonId('');
            }
        }
    }, [staff, selectedLiaisonId]);

    // Dynamic Seeding fallback
    const selectedBranch = branches.find(b => b.id === selectedBranchId) || branches[0];
    const filteredStaff = (() => {
        const branchSpecific = staff.filter(s => s.assignedBranches && s.assignedBranches.includes(selectedBranchId));
        const serviceAndBranchSpecific = branchSpecific.filter(s => s.assignedServices && s.assignedServices.includes(serviceType));
        
        let result = staff;
        if (serviceAndBranchSpecific.length > 0) {
            result = serviceAndBranchSpecific;
        } else if (branchSpecific.length > 0) {
            result = branchSpecific;
        }
        
        return [...result].sort((a, b) => {
            const aAvail = a.isAvailable !== false ? 1 : 0;
            const bAvail = b.isAvailable !== false ? 1 : 0;
            return bAvail - aAvail;
        });
    })();
    const selectedLiaison = staff.find(s => s.id === selectedLiaisonId);

    // Fees calculation
    const fees = isRegAssist ? {
        serviceFee: 1500,
        governmentFee: 0,
        pickupFee: 0,
        discount: 0,
        total: 1500
    } : {
        serviceFee: 1500,
        governmentFee: serviceType.includes('Ownership') ? 2200 : 1200,
        pickupFee: pickupOption === 'Customer brings documents' ? 0 : 250,
        discount: 0,
        total: 0
    };
    if (!isRegAssist) {
        fees.total = fees.serviceFee + fees.governmentFee + fees.pickupFee - fees.discount;
    }

    const getFormattedDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const selected = new Date(dateStr.replace(/-/g, '/'));
            if (isNaN(selected.getTime())) return '';
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const normalizedSelected = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
            const diffTime = normalizedSelected.getTime() - today.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            const formatOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const formattedSelected = selected.toLocaleDateString('en-US', formatOptions);
            const formattedToday = new Date().toLocaleDateString('en-US', formatOptions);
            
            if (diffDays === 1) {
                return `${formattedToday} (Today) to ${formattedSelected} (Tomorrow)`;
            } else if (diffDays === 2) {
                return `${formattedToday} (Today) to ${formattedSelected} (In 2 Days)`;
            } else if (diffDays === 3) {
                return `${formattedToday} (Today) to ${formattedSelected} (In 3 Days)`;
            }
            
            return formattedSelected;
        } catch (_) {
            return '';
        }
    };

    const handleQuickDateSelect = (daysOffset: number) => {
        const target = new Date();
        target.setDate(target.getDate() + daysOffset);
        const yyyy = target.getFullYear();
        const mm = String(target.getMonth() + 1).padStart(2, '0');
        const dd = String(target.getDate()).padStart(2, '0');
        setAppointmentDate(`${yyyy}-${mm}-${dd}`);
    };

    const handleInputContainerClick = () => {
        if (dateInputRef.current) {
            try {
                dateInputRef.current.showPicker();
            } catch (_) {
                dateInputRef.current.focus();
            }
        }
    };

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

    const simulateUpload = (docKey: string, fileName: string, size: number, type: string, fileUrl?: string) => {
        let currentProgress = 0;
        setUploadedDocs(prev => ({
            ...prev,
            [docKey]: {
                file: { name: fileName, size, type, url: fileUrl || 'data:text/plain;base64,U2ltdWxhdGVkRmlsZQ==' },
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
        if (isRegAssist) {
            if (currentStep === 1) return true; // Description step
            if (currentStep === 2) {
                // Form step: vehicle type, plate number, location, contact
                return !!regVehicleType && !!regPlateNumber && !!regLocation && (!!customerPhone || !!user?.phone);
            }
            if (currentStep === 3) {
                // Documents step - verify uploaded OR, CR, ID and Previous Registration if applicable
                // Since this is documents, check if at least one file is uploaded to progress
                return Object.keys(uploadedDocs).length > 0;
            }
            if (currentStep === 4) {
                // Preferred schedule step
                return !!appointmentDate && !!appointmentTime;
            }
            if (currentStep === 5) return true; // Review step
            return true;
        }

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

            const vehicleData = isRegAssist ? {
                plateNumber: regPlateNumber,
                type: regVehicleType,
                brand: 'Registration Assistance',
                model: regAssistanceType,
                year: new Date().getFullYear(),
                color: regStatus
            } : (() => {
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
                serviceType: isRegAssist ? 'Registration Assistance' : serviceType,
                vehicleDetails: vehicleData,
                branchId: isRegAssist ? 'registration-assistance' : selectedBranchId,
                branchName: isRegAssist ? regLocation : (selectedBranch?.name || 'LTO Branch'),
                liaisonId: isRegAssist ? 'unassigned' : selectedLiaisonId,
                liaisonName: isRegAssist ? 'Pending Assignment' : (selectedLiaison?.name || 'Assigned Liaison'),
                appointmentDate,
                appointmentTime,
                pickupOption: isRegAssist ? 'Customer brings documents' as const : pickupOption,
                pickupAddress: isRegAssist ? undefined : (pickupOption === 'Customer brings documents' ? undefined : pickupAddress),
                documents: docArray,
                status: isRegAssist ? 'Pending Admin Review' as const : 'Booking Received' as const,
                paymentStatus: isRegAssist ? 'Pending' as const : 'partial' as const,
                paymentMethod: isRegAssist ? 'Cash / Verification' as const : 'Online (HitPay)',
                totalAmount: fees.total,
                paidAmount: isRegAssist ? 0 : fees.total * 0.5,
                fees,
                notes: isRegAssist ? regNotes : '',
                statusHistory: [{
                    status: isRegAssist ? 'Pending Admin Review' : 'Booking Received',
                    timestamp: new Date().toISOString(),
                    officerName: 'System',
                    notes: isRegAssist ? 'Your Registration Assistance request has been submitted and is pending admin review.' : 'Your Liaison booking request has been submitted.'
                }],
                createdAt: new Date().toISOString()
            };

            const isHitPayActive = HitPayService.isGatewayActive(db?.settings);
            if (!isRegAssist && !isHitPayActive) {
                throw new Error("Online Payment Gateway (HitPay) is required for Liaison bookings but currently inactive in system settings. Please contact the administrator.");
            }

            const createdLiaison = await addLiaisonBooking(bookingPayload);
            sessionStorage.removeItem('LIAISON_WIZARD_STATE');

            if (isRegAssist) {
                navigate('/');
                return;
            }

            if (createdLiaison && isHitPayActive) {
                const downpayment = fees.total * 0.5;
                const hitPay = HitPayService.fromSettings(db?.settings);
                const returnUrl = `${window.location.origin}/customer-portal/reminders?liaisonId=${createdLiaison.id || ''}`;

                const { url } = await hitPay.createPaymentRequest({
                    amount: downpayment,
                    currency: db?.settings?.currency || 'PHP',
                    reference_number: `LIA-${createdLiaison.id || Date.now()}`,
                    webhook: 'https://ridersbud-10806.web.app/payment/webhook',
                    redirect_url: returnUrl,
                    email: user.email || customerEmail || 'customer@example.com',
                    name: user.name || 'Customer',
                    phone: customerPhone || user.phone || undefined,
                    purpose: `RidersBUD — Liaison Service 50% Downpayment (${serviceType})`
                });

                window.location.href = url;
                return;
            }

            navigate('/customer-portal/reminders');
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : 'Failed to submit booking.');
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
                    <h1 className="font-black uppercase text-xs tracking-wider">{isRegAssist ? 'Registration Assistance' : 'LTO Liaison'}</h1>
                    <p className="text-[9px] text-gray-500 tracking-widest uppercase">Flow Wizard • Step {currentStep} of {totalSteps}</p>
                </div>
            </header>

            {/* Step indicators */}
            <div className="w-full h-[3px] bg-white/5 flex">
                <div 
                    className="h-full transition-all duration-300" 
                    style={{ width: `${(currentStep / totalSteps) * 100}%`, backgroundColor: accentColor }}
                ></div>
            </div>

            {/* Scrollable Wizard Pane */}
            <main className="flex-1 max-w-lg mx-auto w-full px-5 py-6 pb-24 overflow-y-auto">
                
                {/* Step 1: Vehicle selection */}
                {currentStep === 1 && !isRegAssist && (
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

                {currentStep === 1 && isRegAssist && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Registration Assistance</h2>
                            <p className="text-xs text-gray-400">Hassle-free vehicle registration, renewal, and LTO compliance documentation support.</p>
                        </div>

                        <div className="p-5 bg-[#111113] border border-white/5 rounded-2xl space-y-4">
                            <div className="flex items-center gap-3 text-emerald-400">
                                <FileText size={20} />
                                <h3 className="font-bold text-sm">About this Service</h3>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Avoid long queues and stressful LTO trips. Our professional liaison team reviews your documents, coordinates requirements, submits applications, and handles LTO processing on your behalf.
                            </p>
                            <div className="pt-2 border-t border-white/5">
                                <h4 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2">How it works:</h4>
                                <ul className="space-y-2 text-xs text-gray-400 list-disc list-inside">
                                    <li>Provide vehicle and contact coordinates.</li>
                                    <li>Upload OR/CR and required identification.</li>
                                    <li>Schedule a processing window.</li>
                                    <li>Track live verification and completion in real-time.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Service Type */}
                {currentStep === 2 && !isRegAssist && (
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

                {currentStep === 2 && isRegAssist && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Request Details</h2>
                            <p className="text-xs text-gray-400">Please provide all necessary details regarding your vehicle and registration request.</p>
                        </div>

                        <div className="space-y-4">
                            {/* Vehicle Type */}
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Vehicle Type *</label>
                                <select 
                                    value={regVehicleType}
                                    onChange={(e) => setRegVehicleType(e.target.value)}
                                    className="w-full bg-[#111113] border border-white/5 p-4 rounded-xl text-xs text-white focus:outline-none focus:border-primary/50"
                                >
                                    <option value="Sedan">Sedan</option>
                                    <option value="SUV">SUV</option>
                                    <option value="Hatchback">Hatchback</option>
                                    <option value="Pickup Truck">Pickup Truck</option>
                                    <option value="Motorcycle">Motorcycle</option>
                                    <option value="Van">Van / MPV</option>
                                </select>
                            </div>

                            {/* Plate Number */}
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Plate Number *</label>
                                <input 
                                    type="text"
                                    value={regPlateNumber}
                                    onChange={(e) => setRegPlateNumber(e.target.value.toUpperCase())}
                                    placeholder="e.g. ABC 1234"
                                    className="w-full bg-[#111113] border border-white/5 p-4 rounded-xl text-xs text-white focus:outline-none focus:border-primary/50 font-mono uppercase"
                                />
                            </div>

                            {/* Registration Status */}
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Current Registration Status *</label>
                                <select 
                                    value={regStatus}
                                    onChange={(e) => setRegStatus(e.target.value)}
                                    className="w-full bg-[#111113] border border-white/5 p-4 rounded-xl text-xs text-white focus:outline-none focus:border-primary/50"
                                >
                                    <option value="Active">Active / Pending Renewal</option>
                                    <option value="Expired">Expired</option>
                                    <option value="For Transfer">For Transfer of Ownership</option>
                                    <option value="No Plate Issued">No Plate Issued Yet</option>
                                </select>
                            </div>

                            {/* Preferred Assistance Type */}
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Preferred Assistance Type *</label>
                                <select 
                                    value={regAssistanceType}
                                    onChange={(e) => setRegAssistanceType(e.target.value)}
                                    className="w-full bg-[#111113] border border-white/5 p-4 rounded-xl text-xs text-white focus:outline-none focus:border-primary/50"
                                >
                                    <option value="Registration Renewal">Vehicle Registration Renewal</option>
                                    <option value="Transfer of Ownership">Transfer of Ownership</option>
                                    <option value="Lost Plate Replacement">Lost Plate / Replacement Plate</option>
                                    <option value="New Registration">New Vehicle Registration</option>
                                    <option value="Other Concerns">Other Registration Concern</option>
                                </select>
                            </div>

                            {/* Location / Preferred Branch */}
                            <div className="relative" ref={branchDropdownRef}>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Location or Preferred Branch/Area *</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        readOnly
                                        value={regLocation}
                                        onClick={() => {
                                            setIsBranchDropdownOpen(!isBranchDropdownOpen);
                                            setBranchSearchQuery('');
                                        }}
                                        placeholder="Select or Search LTO Branch..."
                                        className="w-full bg-[#111113] border border-white/5 p-4 pr-12 rounded-xl text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer placeholder-gray-600"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                        <MapPin size={16} className="text-primary/70" />
                                        <ChevronDown size={14} className="text-gray-500" />
                                    </div>
                                </div>

                                {isBranchDropdownOpen && (
                                    <div className="absolute left-0 right-0 z-50 mt-2 bg-[#141416]/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl max-h-[320px] flex flex-col overflow-hidden">
                                        {/* Search Widget */}
                                        <div className="p-3 border-b border-white/5 flex items-center gap-2 bg-white/[0.02]">
                                            <Search size={14} className="text-gray-500 shrink-0" />
                                            <input 
                                                type="text"
                                                autoFocus
                                                value={branchSearchQuery}
                                                onChange={(e) => setBranchSearchQuery(e.target.value)}
                                                placeholder="Type to search LTO branches..."
                                                className="w-full bg-transparent border-none text-xs text-white focus:outline-none placeholder-gray-600 py-1"
                                            />
                                            {branchSearchQuery && (
                                                <button 
                                                    onClick={() => setBranchSearchQuery('')}
                                                    className="text-[10px] uppercase font-black text-gray-500 hover:text-white transition-colors tracking-widest"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>

                                        {/* Branches List */}
                                        <div className="overflow-y-auto flex-1 divide-y divide-white/5 py-1">
                                            {/* Option for Custom Typed Value */}
                                            {branchSearchQuery.trim() !== '' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setRegLocation(branchSearchQuery.trim());
                                                        setIsBranchDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left p-3 hover:bg-white/[0.04] transition-all flex items-center gap-3 group text-primary"
                                                >
                                                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
                                                        <Check size={13} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-black leading-tight">Use Custom Location</p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">"{branchSearchQuery}"</p>
                                                    </div>
                                                </button>
                                            )}

                                            {/* Filtered LTO Branches */}
                                            {(() => {
                                                const filtered = branches.filter((b: any) => 
                                                    b.name.toLowerCase().includes(branchSearchQuery.toLowerCase()) ||
                                                    b.address.toLowerCase().includes(branchSearchQuery.toLowerCase()) ||
                                                    b.city.toLowerCase().includes(branchSearchQuery.toLowerCase())
                                                );

                                                if (filtered.length === 0) {
                                                    if (branchSearchQuery.trim() === '') {
                                                        return <p className="text-[10px] text-gray-500 italic p-4 text-center">No branches found.</p>;
                                                    }
                                                    return null; // The Custom location button at the top handles this query
                                                }

                                                return filtered.map((b: any) => (
                                                    <button
                                                        key={b.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setRegLocation(b.name);
                                                            setIsBranchDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left p-3 hover:bg-white/[0.04] transition-all flex items-center gap-3 group"
                                                    >
                                                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-primary group-hover:bg-primary/10 group-hover:scale-105 transition-all shrink-0">
                                                            <MapPin size={13} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-black text-white group-hover:text-primary transition-colors leading-tight truncate">{b.name}</p>
                                                            <p className="text-[9px] text-gray-400 mt-0.5 truncate">{b.address}</p>
                                                            {b.phone && <p className="text-[8px] text-gray-600 mt-0.5 font-mono">{b.phone}</p>}
                                                        </div>
                                                    </button>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Contact Number */}
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Contact Number *</label>
                                <input 
                                    type="tel"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder={user?.phone || 'e.g. 09171234567'}
                                    className="w-full bg-[#111113] border border-white/5 p-4 rounded-xl text-xs text-white focus:outline-none focus:border-primary/50 font-mono"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Additional Notes or Concerns</label>
                                <textarea 
                                    value={regNotes}
                                    onChange={(e) => setRegNotes(e.target.value)}
                                    placeholder="Provide any additional specifications or remarks..."
                                    rows={4}
                                    className="w-full bg-[#111113] border border-white/5 p-4 rounded-xl text-xs text-white focus:outline-none focus:border-primary/50 resize-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: LTO Branches */}
                {currentStep === 3 && !isRegAssist && (() => {
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

                {/* Step 4 (or 3 for RegAssist): Documents Uploads */}
                {((currentStep === 4 && !isRegAssist) || (currentStep === 3 && isRegAssist)) && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Upload Documents</h2>
                            <p className="text-xs text-gray-400">Provide required files to process your request. Progress is simulated.</p>
                        </div>

                        <div className="space-y-4">
                            {(isRegAssist ? [
                                { key: 'OR', label: 'OR/CR (Official Receipt / Certificate of Registration) *' },
                                { key: 'ID', label: 'Valid Government Issued ID *' },
                                { key: 'PrevReg', label: 'Previous Registration Document (if applicable)' },
                                { key: 'Other', label: 'Other Supporting Files' }
                            ] : [
                                { key: 'OR', label: 'Official Receipt (OR) *' },
                                { key: 'CR', label: 'Certificate of Registration (CR) *' },
                                { key: 'ID', label: 'Government Issued ID *' },
                                { key: 'Deed', label: 'Deed of Sale (Required for Ownership Transfer)' },
                                { key: 'Insurance', label: 'Insurance Policy Certificate' }
                            ]).map((docItem) => {
                                const uploaded = uploadedDocs[docItem.key];
                                return (
                                    <div key={docItem.key} className="bg-[#111113] border border-white/5 p-4 rounded-xl">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">{docItem.label}</span>
                                            {uploaded?.progress === 100 && <CheckCircle size={16} className="text-green-500" />}
                                        </div>

                                        {!uploaded ? (
                                            <label htmlFor={`liaison-document-${docItem.key}`} className="flex items-center justify-center border border-dashed border-white/10 hover:border-white/20 p-4 rounded-lg cursor-pointer transition-colors bg-black/30">
                                                <Camera size={18} className="text-gray-500 mr-2" />
                                                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Choose / Take Photo</span>
                                                <input 
                                                    id={`liaison-document-${docItem.key}`}
                                                    name={`liaison-document-${docItem.key}`}
                                                    type="file" 
                                                    accept="image/*,application/pdf"
                                                    className="hidden" 
                                                    onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                simulateUpload(docItem.key, file.name, file.size, file.type, reader.result as string);
                                                            };
                                                            reader.readAsDataURL(file);
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
                {currentStep === 5 && !isRegAssist && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Choose Liaison Agent</h2>
                            <p className="text-xs text-gray-400">Select a liaison officer to manage LTO processing.</p>
                        </div>

                        <div className="space-y-3">
                            {filteredStaff.length === 0 ? (
                                <div className="p-8 border border-white/5 text-center text-xs text-gray-500 font-medium rounded-xl">
                                    No liaison agents available at this branch.
                                </div>
                            ) : (
                                filteredStaff.map(s => {
                                    const isSelected = selectedLiaisonId === s.id;
                                    const isAgentAvailable = s.isAvailable !== false;
                                    return (
                                        <div 
                                            key={s.id}
                                            onClick={() => {
                                                if (isAgentAvailable) {
                                                    setSelectedLiaisonId(s.id);
                                                }
                                            }}
                                            className={`p-4 border transition-all duration-300 ease-out rounded-2xl relative overflow-hidden flex flex-col gap-3.5 select-none ${isAgentAvailable ? 'cursor-pointer bg-[#111113] hover:bg-[#151518]/90' : 'cursor-not-allowed bg-[#111113]/40 opacity-50'}`}
                                            style={{ 
                                                borderColor: isSelected && isAgentAvailable ? accentColor : 'rgba(255, 255, 255, 0.05)',
                                                boxShadow: isSelected && isAgentAvailable ? `0 0 20px -5px ${accentColor}33` : 'none',
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
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-sm text-white truncate transition-colors duration-200">
                                                            {s.name}
                                                        </h3>
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${isAgentAvailable ? 'bg-green-500/10 text-green-400 border border-green-500/25' : 'bg-red-500/10 text-red-400 border border-red-500/25'}`}>
                                                            {isAgentAvailable ? 'Available' : 'Unavailable'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5 shrink-0">
                                                            ★ {Number(s.rating || 5.0).toFixed(1)}
                                                        </span>
                                                        <span className="text-[9px] text-gray-500 font-medium shrink-0">
                                                            ({s.totalJobs || 0} jobs)
                                                        </span>
                                                    </div>
                                                </div>
 
                                                {/* Selection Checkmark & Contact Actions */}
                                                <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                    {s.phone && isAgentAvailable && (
                                                        <a 
                                                            href={`tel:${s.phone}`}
                                                            className="w-8 h-8 rounded-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-200 active:scale-95"
                                                            title={`Contact ${s.name}`}
                                                        >
                                                            <Phone size={14} />
                                                        </a>
                                                    )}
                                                    <div 
                                                        onClick={() => {
                                                            if (isAgentAvailable) {
                                                                setSelectedLiaisonId(s.id);
                                                            }
                                                        }}
                                                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 ${isAgentAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-30'}`}
                                                        style={{ 
                                                            backgroundColor: isSelected && isAgentAvailable ? accentColor : 'transparent',
                                                            borderColor: isSelected && isAgentAvailable ? accentColor : 'rgba(255, 255, 255, 0.2)'
                                                        }}
                                                    >
                                                        {isSelected && isAgentAvailable && <Check size={12} className="text-white font-black" />}
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
                {((currentStep === 6 && !isRegAssist) || (currentStep === 4 && isRegAssist)) && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Select Date & Time</h2>
                            <p className="text-xs text-gray-400">Coordinate the LTO submission window slot.</p>
                        </div>

                        <div className="bg-[#111113] border border-white/5 p-5 rounded-2xl space-y-5">
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Preferred Appointment Date *</label>
                                <div className="relative" ref={calendarRef}>
                                    <div 
                                        className="relative flex items-center cursor-pointer"
                                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                                    >
                                        <Calendar 
                                            className="absolute left-4 pointer-events-none" 
                                            size={16} 
                                            style={{ color: accentColor }} 
                                        />
                                        <div className="w-full bg-black border border-white/5 text-xs pl-11 pr-4 py-3.5 rounded-xl text-white focus:outline-none focus:border-white/15 transition-colors duration-200 min-h-[46px] flex items-center">
                                            {appointmentDate ? getFormattedDate(appointmentDate) : <span className="text-gray-600">Select Date...</span>}
                                        </div>
                                    </div>

                                    {isCalendarOpen && (
                                        <div className="absolute left-0 right-0 z-50 mt-2 bg-[#141416]/95 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-xl animate-fadeIn">
                                            {/* Calendar Header */}
                                            <div className="flex justify-between items-center mb-4">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const prevMonth = new Date(calendarViewDate);
                                                        prevMonth.setMonth(prevMonth.getMonth() - 1);
                                                        setCalendarViewDate(prevMonth);
                                                    }}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-white"
                                                >
                                                    <ChevronLeft size={14} />
                                                </button>
                                                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                                                    {calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const nextMonth = new Date(calendarViewDate);
                                                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                                                        setCalendarViewDate(nextMonth);
                                                    }}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-white"
                                                >
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>

                                            {/* Weekdays Labels */}
                                            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                                    <span key={day} className="text-[9px] font-black text-gray-500 uppercase tracking-wider py-1">{day}</span>
                                                ))}
                                            </div>

                                            {/* Days Grid */}
                                            <div className="grid grid-cols-7 gap-1">
                                                {(() => {
                                                    const year = calendarViewDate.getFullYear();
                                                    const month = calendarViewDate.getMonth();
                                                    const firstDayIndex = new Date(year, month, 1).getDay();
                                                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                                                    const prevMonthDays = new Date(year, month, 0).getDate();
                                                    
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);

                                                    const days = [];

                                                    // Fill prefix empty spaces
                                                    for (let i = firstDayIndex - 1; i >= 0; i--) {
                                                        days.push({
                                                            day: prevMonthDays - i,
                                                            isCurrentMonth: false,
                                                            date: new Date(year, month - 1, prevMonthDays - i)
                                                        });
                                                    }

                                                    // Current month days
                                                    for (let i = 1; i <= daysInMonth; i++) {
                                                        days.push({
                                                            day: i,
                                                            isCurrentMonth: true,
                                                            date: new Date(year, month, i)
                                                        });
                                                    }

                                                    // Fill suffix empty spaces
                                                    const remainingCells = 42 - days.length;
                                                    for (let i = 1; i <= remainingCells; i++) {
                                                        days.push({
                                                            day: i,
                                                            isCurrentMonth: false,
                                                            date: new Date(year, month + 1, i)
                                                        });
                                                    }

                                                    return days.map((cell, idx) => {
                                                        const isSelected = appointmentDate === `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, '0')}-${String(cell.date.getDate()).padStart(2, '0')}`;
                                                        const isToday = cell.date.getTime() === today.getTime();
                                                        
                                                        // Disable past dates and weekends (LTO is closed)
                                                        const isPast = cell.date.getTime() < today.getTime();
                                                        const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6;
                                                        const isDisabled = !cell.isCurrentMonth || isPast || isWeekend;

                                                        return (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                disabled={isDisabled}
                                                                onClick={() => {
                                                                    const yyyy = cell.date.getFullYear();
                                                                    const mm = String(cell.date.getMonth() + 1).padStart(2, '0');
                                                                    const dd = String(cell.date.getDate()).padStart(2, '0');
                                                                    setAppointmentDate(`${yyyy}-${mm}-${dd}`);
                                                                    setIsCalendarOpen(false);
                                                                }}
                                                                className={`h-8 w-full rounded-lg text-xs font-black transition-all flex items-center justify-center relative ${
                                                                    !cell.isCurrentMonth ? 'text-gray-800/40 pointer-events-none' :
                                                                    isDisabled ? 'text-gray-700 hover:bg-transparent cursor-not-allowed' :
                                                                    isSelected ? 'bg-primary text-black scale-105 shadow-md shadow-primary/20' :
                                                                    isToday ? 'border border-primary text-primary hover:bg-primary/10' :
                                                                    'text-white hover:bg-white/5'
                                                                }`}
                                                            >
                                                                {cell.day}
                                                                {isToday && !isSelected && (
                                                                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                                                                )}
                                                            </button>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Select Buttons */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Quick Select Date</label>
                                <div className="flex gap-2">
                                    {[
                                        { label: 'Tomorrow', offset: 1 },
                                        { label: 'In 2 Days', offset: 2 },
                                        { label: 'In 3 Days', offset: 3 }
                                    ].map(opt => {
                                        // Compute date string for comparison to highlight active chip
                                        const d = new Date();
                                        d.setDate(d.getDate() + opt.offset);
                                        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                        const isQuickSelected = appointmentDate === dateStr;
                                        return (
                                            <button
                                                key={opt.label}
                                                type="button"
                                                onClick={() => handleQuickDateSelect(opt.offset)}
                                                className={`flex-1 py-2 text-center border text-[9px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${isQuickSelected ? 'text-white' : 'border-white/5 text-gray-400 bg-black/40 hover:text-white'}`}
                                                style={{ 
                                                    borderColor: isQuickSelected ? accentColor : 'rgba(255, 255, 255, 0.05)',
                                                    backgroundColor: isQuickSelected ? `${accentColor}15` : undefined
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="border-t border-white/5 pt-4">
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
                                            className={`py-3 text-center border text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors ${appointmentTime === timeSlot ? 'bg-white/5 text-white' : 'border-white/5 text-gray-400 bg-black/40 hover:text-white'}`}
                                            style={{ borderColor: appointmentTime === timeSlot ? accentColor : undefined }}
                                        >
                                            {timeSlot}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Alert/Info Note */}
                            <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl flex gap-3 text-left">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: accentColor }} />
                                <div className="space-y-0.5">
                                    <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Submission cutoff notice</h4>
                                    <p className="text-[9px] text-gray-400 leading-normal">
                                        LTO submissions are processed on business days (Monday to Friday, 8:00 AM - 5:00 PM). Same-day slots must be coordinated at least 4 hours in advance.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 7: Pickup & Contact coordinates */}
                {currentStep === 7 && !isRegAssist && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Verification details</h2>
                            <p className="text-xs text-gray-400">Confirm document collection method and contact coordinates.</p>
                        </div>

                        <div className="bg-[#111113] border border-white/5 p-5 rounded-2xl space-y-5">
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Document Retrieval Mode *</label>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {[
                                        {
                                            opt: 'Customer brings documents',
                                            title: 'Customer brings documents',
                                            subtitle: 'Deliver documents directly to the LTO branch office (Free)',
                                            icon: FileCheck
                                        },
                                        {
                                            opt: 'Home Pickup',
                                            title: 'Home Pickup',
                                            subtitle: 'Rider collects the documents from your home address (+₱250)',
                                            icon: Home
                                        },
                                        {
                                            opt: 'Office Pickup',
                                            title: 'Office Pickup',
                                            subtitle: 'Rider collects the documents from your office address (+₱250)',
                                            icon: Briefcase
                                        }
                                    ].map((item) => {
                                        const isSelected = pickupOption === item.opt;
                                        const IconComp = item.icon;
                                        return (
                                            <div
                                                key={item.opt}
                                                onClick={() => setPickupOption(item.opt as any)}
                                                className="p-3.5 border transition-all duration-300 ease-out rounded-xl cursor-pointer bg-black/40 hover:bg-[#151518]/90 flex items-start gap-3.5 select-none"
                                                style={{ 
                                                    borderColor: isSelected ? accentColor : 'rgba(255, 255, 255, 0.05)',
                                                    boxShadow: isSelected ? `0 0 16px -4px ${accentColor}25` : 'none',
                                                    willChange: 'border-color, background-color, box-shadow'
                                                }}
                                            >
                                                <div 
                                                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5"
                                                >
                                                    <IconComp size={16} style={{ color: isSelected ? accentColor : 'rgba(255, 255, 255, 0.6)' }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-[11px] text-white uppercase tracking-wider">{item.title}</h4>
                                                    <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">{item.subtitle}</p>
                                                </div>
                                                <div 
                                                    className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-200"
                                                    style={{ 
                                                        backgroundColor: isSelected ? accentColor : 'transparent',
                                                        borderColor: isSelected ? accentColor : 'rgba(255, 255, 255, 0.2)'
                                                    }}
                                                >
                                                    {isSelected && <Check size={10} className="text-white font-black" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {pickupOption !== 'Customer brings documents' && (
                                <div className="space-y-1.5 animate-fadeIn">
                                    <label htmlFor="liaison-pickup" className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Pickup Address *</label>
                                    <div className="relative flex items-center">
                                        <MapPin className="absolute left-4 pointer-events-none text-gray-500" size={14} style={{ color: accentColor }} />
                                        <input 
                                            id="liaison-pickup"
                                            name="liaison-pickup"
                                            type="text" 
                                            value={pickupAddress}
                                            onChange={e => setPickupAddress(e.target.value)}
                                            className="w-full bg-black border border-white/5 text-xs pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-white/15 transition-colors"
                                            placeholder="Enter complete pickup address details"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1.5">
                                    <label htmlFor="liaison-phone" className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Phone Coordinates *</label>
                                    <div className="relative flex items-center">
                                        <Phone className="absolute left-3.5 pointer-events-none text-gray-500" size={13} style={{ color: accentColor }} />
                                        <input 
                                            id="liaison-phone" 
                                            name="liaison-phone" 
                                            type="text" 
                                            value={customerPhone} 
                                            onChange={e => setCustomerPhone(e.target.value)} 
                                            className="w-full bg-black border border-white/5 text-xs pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-white/15 transition-colors" 
                                            placeholder={user?.phone || '09XXXXXXXXX'} 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="liaison-email" className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Email *</label>
                                    <div className="relative flex items-center">
                                        <Mail className="absolute left-3.5 pointer-events-none text-gray-500" size={13} style={{ color: accentColor }} />
                                        <input 
                                            id="liaison-email" 
                                            name="liaison-email" 
                                            type="email" 
                                            value={customerEmail} 
                                            onChange={e => setCustomerEmail(e.target.value)} 
                                            className="w-full bg-black border border-white/5 text-xs pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-white/15 transition-colors" 
                                            placeholder={user?.email || 'name@domain.com'} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 8 (or 5 for RegAssist): Review & Summary / Checkout */}
                {((currentStep === 8 && !isRegAssist) || (currentStep === 5 && isRegAssist)) && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Review Summary</h2>
                            <p className="text-xs text-gray-400">Confirm all details are correct before final submission.</p>
                        </div>

                        {/* Breakdown summary */}
                        <div className="bg-[#111113] border border-white/5 p-5 rounded-2xl space-y-5">
                            {/* Summary Card List */}
                            <div className="space-y-3.5">
                                {isRegAssist ? (
                                    <>
                                        {/* Service Type */}
                                        <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <FileText size={15} style={{ color: accentColor }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Selected Service</span>
                                                <h4 className="font-bold text-[12px] text-white leading-tight">Registration Assistance</h4>
                                                <p className="text-[10px] text-gray-500 mt-1">Assistance Type: <span className="text-white font-medium">{regAssistanceType}</span></p>
                                            </div>
                                        </div>

                                        {/* Vehicle Details */}
                                        <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <Car size={15} style={{ color: accentColor }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Vehicle Details</span>
                                                <h4 className="font-bold text-[12px] text-white leading-tight">{regVehicleType} • {regPlateNumber}</h4>
                                                <p className="text-[10px] text-gray-500 mt-1">Status: <span className="text-amber-400 font-medium">{regStatus}</span></p>
                                            </div>
                                        </div>

                                        {/* Customer Contact Details */}
                                        <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <Phone size={15} style={{ color: accentColor }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Customer Contact Details</span>
                                                <h4 className="font-bold text-[12px] text-white leading-tight">{user.name}</h4>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{customerPhone || user.phone || 'No phone provided'}</p>
                                                <p className="text-[10px] text-gray-500">{customerEmail || user.email || 'No email provided'}</p>
                                            </div>
                                        </div>

                                        {/* Uploaded Documents */}
                                        <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <FileCheck size={15} style={{ color: accentColor }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Uploaded Documents</span>
                                                {Object.keys(uploadedDocs).length === 0 ? (
                                                    <p className="text-[10px] text-gray-500 mt-1">No documents uploaded.</p>
                                                ) : (
                                                    <div className="mt-1.5 space-y-1.5">
                                                        {Object.keys(uploadedDocs).map(key => (
                                                            <div key={key} className="flex items-center gap-1.5 text-[10px] text-gray-300">
                                                                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                                                <span className="font-mono truncate max-w-[200px]">{uploadedDocs[key].file.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Preferred Schedule */}
                                        <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <Calendar size={15} style={{ color: accentColor }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Preferred Schedule</span>
                                                <h4 className="font-bold text-[12px] text-white leading-tight">
                                                    {appointmentDate ? getFormattedDate(appointmentDate) : 'Not selected'}
                                                </h4>
                                                <p className="text-[10px] text-gray-400 mt-1">Time: {appointmentTime || 'Not selected'}</p>
                                            </div>
                                        </div>

                                        {/* Preferred branch location */}
                                        <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <MapPin size={15} style={{ color: accentColor }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Location / Branch Area</span>
                                                <h4 className="font-bold text-[12px] text-white leading-tight">{regLocation}</h4>
                                            </div>
                                        </div>

                                        {/* Notes or remarks */}
                                        {regNotes && (
                                            <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                                    <Info size={15} style={{ color: accentColor }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Notes or Remarks</span>
                                                    <p className="text-[10px] text-gray-400 leading-normal mt-1" style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>{regNotes}</p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <MapPin size={15} style={{ color: accentColor }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Assigned LTO Branch</span>
                                                <h4 className="font-bold text-[12px] text-white leading-tight">{selectedBranch?.name}</h4>
                                                <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1.5">
                                                    <span>Liaison Agent:</span> 
                                                    <span className="font-semibold text-white">{selectedLiaison?.name || 'Unassigned'}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <Calendar size={15} style={{ color: accentColor }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Process Action & Schedule</span>
                                                <h4 className="font-bold text-[12px] text-white uppercase tracking-wider leading-tight">{serviceType}</h4>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {appointmentDate ? getFormattedDate(appointmentDate) : ''} • {appointmentTime}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-black/30 border border-white/5 rounded-xl flex items-start gap-3.5">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                                {pickupOption.includes('Home') ? (
                                                    <Home size={15} style={{ color: accentColor }} />
                                                ) : pickupOption.includes('Office') ? (
                                                    <Briefcase size={15} style={{ color: accentColor }} />
                                                ) : (
                                                    <FileCheck size={15} style={{ color: accentColor }} />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Document Retrieval Mode</span>
                                                <h4 className="font-bold text-[12px] text-white uppercase tracking-wider leading-tight">{pickupOption}</h4>
                                                {pickupOption !== 'Customer brings documents' && pickupAddress && (
                                                    <p className="text-[10px] text-gray-400 mt-1 truncate">{pickupAddress}</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Payment options (Standard Liaison only) */}
                            {!isRegAssist && (() => {
                                const isManualGcashEnabled = db?.settings?.gcashEnabled ?? false;
                                const isHitPayActive = HitPayService.isGatewayActive(db?.settings);

                                const methods: { name: string; icon: any }[] = [];
                                if (isHitPayActive) {
                                    methods.push({ name: 'HitPay (Cards / GCash / Maya)', icon: CreditCard });
                                }
                                if (isManualGcashEnabled) {
                                    methods.push({ name: 'Manual GCash', icon: Wallet });
                                }
                                methods.push({ name: 'Cash on Delivery / Meetup', icon: Banknote });

                                return (
                                    <div className="border-t border-white/5 pt-4">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Select Payment Method</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {methods.map((method) => {
                                                const isSelected = paymentMethod === method.name || (methods.length === 1);
                                                const IconComp = method.icon;
                                                return (
                                                    <button
                                                        key={method.name}
                                                        type="button"
                                                        onClick={() => setPaymentMethod(method.name as any)}
                                                        className="p-3 border transition-all duration-300 ease-out rounded-xl flex items-center gap-3 bg-black/40 hover:bg-[#151518]/90 text-left select-none"
                                                        style={{ 
                                                            borderColor: isSelected ? accentColor : 'rgba(255, 255, 255, 0.05)',
                                                            boxShadow: isSelected ? `0 0 12px -2px ${accentColor}20` : 'none',
                                                            willChange: 'border-color, background-color, box-shadow'
                                                        }}
                                                    >
                                                        <div 
                                                            className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0"
                                                        >
                                                            <IconComp size={13} style={{ color: isSelected ? accentColor : 'rgba(255, 255, 255, 0.6)' }} />
                                                        </div>
                                                        <span className="flex-1 text-[10px] font-black uppercase tracking-wider text-white truncate">{method.name}</span>
                                                        <div 
                                                            className="w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0"
                                                            style={{ 
                                                                backgroundColor: isSelected ? accentColor : 'transparent',
                                                                borderColor: isSelected ? accentColor : 'rgba(255, 255, 255, 0.2)'
                                                            }}
                                                        >
                                                            {isSelected && <Check size={8} className="text-white font-black" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                            {/* Total fee list */}
                            <div className="border-t border-white/5 pt-4 space-y-2.5">
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>Liaison Service Fee</span>
                                    <span className="font-medium text-white">₱{fees.serviceFee.toLocaleString()}</span>
                                </div>
                                {!isRegAssist && (
                                    <>
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span>Est. Government LTO Fees</span>
                                            <span className="font-medium text-white">₱{fees.governmentFee.toLocaleString()}</span>
                                        </div>
                                        {fees.pickupFee > 0 && (
                                            <div className="flex justify-between text-xs text-gray-400">
                                                <span>Documents Courier Fee</span>
                                                <span className="font-medium text-white">₱{fees.pickupFee.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                                <div 
                                    className="p-3.5 bg-white/5 rounded-xl flex justify-between items-center pt-2 border-t border-white/10"
                                    style={{
                                        borderLeft: `3px solid ${accentColor}`
                                    }}
                                >
                                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">TOTAL AMOUNT</span>
                                    <span className="text-base font-black" style={{ color: accentColor }}>₱{fees.total.toLocaleString()}</span>
                                </div>

                                {/* Downpayment / Final Payment Breakdown (Standard only) */}
                                {!isRegAssist ? (
                                    <div className="p-3.5 bg-white/[0.02] border border-dashed border-white/10 rounded-xl space-y-2">
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                Downpayment (50%)
                                            </span>
                                            <span className="font-bold text-white">₱{(fees.total * 0.5).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                                Final Payment (50%)
                                            </span>
                                            <span className="font-bold text-gray-400">₱{(fees.total * 0.5).toLocaleString()}</span>
                                        </div>
                                        <p className="text-[9px] text-gray-500 leading-normal pt-1 border-t border-white/5">
                                            * You will pay the 50% downpayment now to process your order. The remaining 50% final payment will be settled upon LTO document handling completion.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                        <p className="text-[10px] text-emerald-400 leading-normal text-center font-medium">
                                            No immediate payment is required. Your request will be reviewed by our admin, who will verify documents and update your status in real-time.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Sticky wizard action bottom buttons */}
            <div className="fixed bottom-0 left-0 w-full bg-[#111113] border-t border-white/5 p-4 z-50">
                <div className="max-w-lg mx-auto flex gap-4">
                    {currentStep < totalSteps ? (
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
