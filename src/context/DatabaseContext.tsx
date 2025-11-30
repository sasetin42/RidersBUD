import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Service, Part, Mechanic, Booking, Customer, Settings, BookingStatus, Order, CartItem, Review, Banner, FAQCategory, AdminUser, Role, Task, Database, OrderStatus, PayoutRequest, RentalCar, RentalBooking, Notification } from '../types';
import { supabase } from '../lib/supabase';
import { getSeedData } from '../data/mockData';
import { uploadMultipleBookingImages } from '../utils/imageUpload';

// This interface defines the functions that the context will provide
interface DatabaseContextType {
    db: Database | null;
    loading: boolean;
    addService: (service: Omit<Service, 'id'>) => Promise<void>;
    updateService: (updatedService: Service) => Promise<void>;
    deleteService: (serviceId: string) => Promise<void>;
    addPart: (part: Omit<Part, 'id'>) => Promise<void>;
    updatePart: (updatedPart: Part) => Promise<void>;
    deletePart: (partId: string) => Promise<void>;
    addMechanic: (mechanic: Omit<Mechanic, 'id'>) => Promise<void>;
    updateMechanic: (updatedMechanic: Mechanic) => Promise<void>;
    deleteMechanic: (mechanicId: string) => Promise<void>;
    updateMechanicStatus: (mechanicId: string, status: Mechanic['status']) => Promise<void>;
    updateMechanicOnlineStatus: (mechanicId: string, isOnline: boolean) => Promise<void>;
    updateMechanicLocation: (mechanicId: string, location: { lat: number; lng: number }) => Promise<void>;
    addBooking: (booking: Omit<Booking, 'id'>) => Promise<Booking | null>;
    updateBooking: (bookingId: string, updates: Partial<Booking>) => Promise<void>;
    updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
    cancelBooking: (bookingId: string, reason: string) => Promise<void>;
    acceptJobRequest: (bookingId: string, mechanic: Mechanic) => Promise<void>;
    updateBookingNotes: (bookingId: string, notes: string) => Promise<void>;
    updateBookingImages: (bookingId: string, beforeImages: string[], afterImages: string[]) => Promise<void>;
    markBookingAsPaid: (bookingId: string) => Promise<void>;
    requestReschedule: (bookingId: string, newDate: string, newTime: string, reason: string) => Promise<void>;
    respondToReschedule: (bookingId: string, response: 'accepted' | 'rejected') => Promise<void>;
    addCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer | null>;
    updateCustomer: (updatedCustomer: Customer) => Promise<void>;
    updateCustomerLocation: (customerId: string, location: { lat: number; lng: number }) => Promise<void>;
    deleteCustomer: (customerId: string) => Promise<void>;
    deleteVehicleFromCustomer: (customerId: string, plateNumber: string) => Promise<void>;
    addOrder: (customerName: string, items: CartItem[], total: number, paymentMethod: string) => Promise<Order | null>;
    updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
    updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
    addReviewToMechanic: (mechanicId: string, bookingId: string, reviewData: { rating: number, comment: string }, customerName: string) => Promise<void>;
    addBanner: (banner: Omit<Banner, 'id'>) => Promise<void>;
    updateBanner: (updatedBanner: Banner) => Promise<void>;
    deleteBanner: (bannerId: string) => Promise<void>;
    addAdminUser: (user: Omit<AdminUser, 'id'>) => Promise<void>;
    updateAdminUser: (updatedUser: AdminUser) => Promise<void>;
    deleteAdminUser: (userId: string) => Promise<void>;
    addRole: (role: Omit<Role, 'isEditable'>) => Promise<void>;
    updateRole: (updatedRole: Role) => Promise<void>;
    deleteRole: (roleName: string) => Promise<void>;
    addTask: (task: Omit<Task, 'id' | 'isComplete' | 'completionDate'>) => Promise<void>;
    updateTask: (updatedTask: Task) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
    deleteMultipleTasks: (taskIds: string[]) => Promise<void>;
    updateMultipleTasksStatus: (taskIds: string[], isComplete: boolean) => Promise<void>;
    addPayoutRequest: (payoutRequest: Omit<PayoutRequest, 'id' | 'status' | 'requestDate'>) => Promise<void>;
    processPayoutRequest: (payoutId: string, status: 'Approved' | 'Rejected', rejectionReason?: string) => Promise<void>;
    addRentalBooking: (booking: Omit<RentalBooking, 'id'>) => Promise<RentalBooking | null>;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Promise<void>;
    markNotificationAsRead: (notificationId: string) => Promise<void>;
    clearAllNotifications: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const useDatabase = () => {
    const context = useContext(DatabaseContext);
    if (context === undefined) {
        throw new Error('useDatabase must be used within a DatabaseProvider');
    }
    return context;
};

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [db, setDb] = useState<Database | null>(null);
    const [loading, setLoading] = useState(true);

    // Initial data loading from Supabase
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch data from Supabase tables
                const { data: services } = await supabase.from('services').select('*');
                const { data: products } = await supabase.from('products').select('*');
                // Note: Mechanics, Bookings, Customers, etc. would also be fetched here in a real app
                // For now, we might mix Supabase data with some mock data if tables are empty or not fully migrated

                // Construct the Database object
                // This is a simplified view; in a full migration, all entities would come from Supabase
                const seedData = getSeedData(); // Fallback/Base

                const newDb: Database = {
                    ...seedData,
                    services: services ? services.map((s: any) => ({
                        ...s,
                        estimatedTime: s.estimated_time,
                        imageUrl: s.image_url
                    })) : seedData.services,
                    parts: products ? products.map((p: any) => ({
                        ...p,
                        salesPrice: p.sales_price,
                        imageUrls: p.image_urls,
                        sku: p.sku || '',
                        brand: p.brand || '',
                        stock: p.stock || 0
                    })) : seedData.parts,
                    notifications: [], // Initialize empty notifications
                };

                setDb(newDb);
            } catch (error) {
                console.error("Failed to load data from Supabase:", error);
                // Fallback to seed data on error
                setDb(getSeedData());
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Real-time subscriptions
    useEffect(() => {
        const channel = supabase.channel('db_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bookings' },
                (payload) => {
                    console.log('Booking change received!', payload);
                    setDb(prevDb => {
                        if (!prevDb) return null;
                        const { eventType, new: newRecord, old: oldRecord } = payload;
                        let updatedBookings = [...prevDb.bookings];

                        if (eventType === 'INSERT') {
                            // Need to ensure we match the Booking type structure. 
                            // In a real app, we might need to fetch relations (service, mechanic) 
                            // or just insert the raw data and let the UI handle missing relations gracefully.
                            // For now, we'll try to map what we can.
                            const booking = newRecord as any;
                            updatedBookings.push({
                                id: booking.id,
                                customerId: booking.customer_id,
                                customerName: 'Loading...', // Placeholder
                                service: { id: booking.service_id, name: 'Loading...', price: 0, description: '', estimatedTime: '', category: 'Maintenance', icon: 'Wrench', imageUrl: '' }, // Placeholder
                                mechanic: booking.mechanic_id ? {
                                    id: booking.mechanic_id,
                                    name: 'Loading...',
                                    rating: 0,
                                    reviews: 0,
                                    imageUrl: '',
                                    specializations: [],
                                    isOnline: false,
                                    lat: 0,
                                    lng: 0,
                                    status: 'Active',
                                    email: '',
                                    password: '',
                                    phone: '',
                                    bio: '',
                                    registrationDate: '',
                                    birthday: '',
                                    reviewsList: [],
                                    availability: {
                                        monday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
                                        tuesday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
                                        wednesday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
                                        thursday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
                                        friday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
                                        saturday: { isAvailable: false, startTime: '09:00', endTime: '17:00' },
                                        sunday: { isAvailable: false, startTime: '09:00', endTime: '17:00' }
                                    }
                                } : undefined,
                                vehicle: { id: booking.vehicle_id, make: 'Loading...', model: '', year: 0, plateNumber: '', imageUrls: [] }, // Placeholder
                                date: booking.booking_date,
                                time: booking.booking_time,
                                status: booking.status,
                                location: { lat: booking.location_lat, lng: booking.location_lng },
                                notes: booking.notes,
                                isPaid: booking.is_paid,
                                isReviewed: booking.is_reviewed,
                                statusHistory: booking.status_history,
                                cancellationReason: booking.cancellation_reason,
                                beforeImages: booking.before_images,
                                afterImages: booking.after_images
                            } as Booking);
                        } else if (eventType === 'UPDATE') {
                            updatedBookings = updatedBookings.map(b =>
                                b.id === newRecord.id ? {
                                    ...b,
                                    status: newRecord.status,
                                    date: newRecord.booking_date,
                                    time: newRecord.booking_time,
                                    notes: newRecord.notes,
                                    isPaid: newRecord.is_paid,
                                    isReviewed: newRecord.is_reviewed,
                                    statusHistory: newRecord.status_history,
                                    cancellationReason: newRecord.cancellation_reason,
                                    beforeImages: newRecord.before_images,
                                    afterImages: newRecord.after_images
                                    // Keep existing relations (service, mechanic) as they likely didn't change or we can't easily fetch them here without a query
                                } : b
                            );
                        } else if (eventType === 'DELETE') {
                            updatedBookings = updatedBookings.filter(b => b.id !== oldRecord.id);
                        }
                        return { ...prevDb, bookings: updatedBookings };
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'services' },
                (payload) => {
                    setDb(prevDb => {
                        if (!prevDb) return null;
                        const { eventType, new: newRecord, old: oldRecord } = payload;
                        let updatedServices = [...prevDb.services];

                        if (eventType === 'INSERT') {
                            updatedServices.push({
                                id: newRecord.id,
                                name: newRecord.name,
                                description: newRecord.description,
                                price: newRecord.price,
                                estimatedTime: newRecord.estimated_time,
                                imageUrl: newRecord.image_url,
                                category: newRecord.category,
                                icon: newRecord.icon
                            });
                        } else if (eventType === 'UPDATE') {
                            updatedServices = updatedServices.map(s => s.id === newRecord.id ? {
                                ...s,
                                name: newRecord.name,
                                description: newRecord.description,
                                price: newRecord.price,
                                estimatedTime: newRecord.estimated_time,
                                imageUrl: newRecord.image_url,
                                category: newRecord.category,
                                icon: newRecord.icon
                            } : s);
                        } else if (eventType === 'DELETE') {
                            updatedServices = updatedServices.filter(s => s.id !== oldRecord.id);
                        }
                        return { ...prevDb, services: updatedServices };
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'products' },
                (payload) => {
                    setDb(prevDb => {
                        if (!prevDb) return null;
                        const { eventType, new: newRecord, old: oldRecord } = payload;
                        let updatedParts = [...prevDb.parts];

                        if (eventType === 'INSERT') {
                            updatedParts.push({
                                id: newRecord.id,
                                name: newRecord.name,
                                description: newRecord.description,
                                price: newRecord.price,
                                salesPrice: newRecord.sales_price,
                                imageUrls: newRecord.image_urls,
                                category: newRecord.category,
                                sku: newRecord.sku,
                                brand: newRecord.brand,
                                stock: newRecord.stock
                            });
                        } else if (eventType === 'UPDATE') {
                            updatedParts = updatedParts.map(p => p.id === newRecord.id ? {
                                ...p,
                                name: newRecord.name,
                                description: newRecord.description,
                                price: newRecord.price,
                                salesPrice: newRecord.sales_price,
                                imageUrls: newRecord.image_urls,
                                category: newRecord.category,
                                sku: newRecord.sku,
                                brand: newRecord.brand,
                                stock: newRecord.stock
                            } : p);
                        } else if (eventType === 'DELETE') {
                            updatedParts = updatedParts.filter(p => p.id !== oldRecord.id);
                        }
                        return { ...prevDb, parts: updatedParts };
                    });
                }
            )
            .subscribe()
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'mechanics' },
                (payload) => {
                    setDb(prevDb => {
                        if (!prevDb) return null;
                        const { new: newRecord } = payload;

                        // Update mechanic location in local state
                        const updatedMechanics = prevDb.mechanics.map(m =>
                            m.id === newRecord.id ? { ...m, lat: newRecord.latitude, lng: newRecord.longitude } : m
                        );

                        // Recalculate ETA for any active bookings with this mechanic
                        // This logic mirrors the previous simulation but reacts to real updates
                        const updatedBookings = prevDb.bookings.map(b => {
                            if (b.mechanic?.id === newRecord.id && b.status === 'En Route' && b.location) {
                                // Simple ETA calculation
                                const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
                                    const R = 6371;
                                    const dLat = (lat2 - lat1) * Math.PI / 180;
                                    const dLon = (lon2 - lon1) * Math.PI / 180;
                                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                    return R * c;
                                };

                                const distance = getDistanceInKm(newRecord.latitude, newRecord.longitude, b.location.lat, b.location.lng);
                                const etaMins = Math.ceil((distance / 40) * 60); // Assuming 40km/h avg speed

                                return { ...b, eta: etaMins > 0 ? etaMins : 1 };
                            }
                            return b;
                        });

                        return { ...prevDb, mechanics: updatedMechanics, bookings: updatedBookings };
                    });
                }
            );

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);




    // --- Service Operations ---
    // --- Service Operations ---
    const addService = async (service: Omit<Service, 'id'>) => {
        try {
            const { data, error } = await supabase.from('services').insert([{
                name: service.name,
                description: service.description,
                price: service.price,
                estimated_time: service.estimatedTime,
                image_url: service.imageUrl,
                category: service.category,
                icon: service.icon
            }]).select().single();

            if (error) throw error;

            if (data) {
                const newService: Service = {
                    ...service,
                    id: data.id,
                    estimatedTime: data.estimated_time,
                    imageUrl: data.image_url
                };
                setDb(prevDb => prevDb ? { ...prevDb, services: [...prevDb.services, newService] } : null);
            }
        } catch (error) {
            console.error("Error adding service:", error);
            throw error;
        }
    };

    const updateService = async (updatedService: Service) => {
        try {
            const { error } = await supabase.from('services').update({
                name: updatedService.name,
                description: updatedService.description,
                price: updatedService.price,
                estimated_time: updatedService.estimatedTime,
                image_url: updatedService.imageUrl,
                category: updatedService.category,
                icon: updatedService.icon
            }).eq('id', updatedService.id);

            if (error) throw error;

            setDb(prevDb => prevDb ? { ...prevDb, services: prevDb.services.map(s => s.id === updatedService.id ? updatedService : s) } : null);
        } catch (error) {
            console.error("Error updating service:", error);
            throw error;
        }
    };

    const deleteService = async (serviceId: string) => {
        try {
            const { error } = await supabase.from('services').delete().eq('id', serviceId);
            if (error) throw error;
            setDb(prevDb => prevDb ? { ...prevDb, services: prevDb.services.filter(s => s.id !== serviceId) } : null);
        } catch (error) {
            console.error("Error deleting service:", error);
            throw error;
        }
    };

    // --- Part Operations ---
    // --- Part Operations ---
    const addPart = async (part: Omit<Part, 'id'>) => {
        try {
            const { data, error } = await supabase.from('products').insert([{
                name: part.name,
                description: part.description,
                price: part.price,
                sales_price: part.salesPrice,
                image_urls: part.imageUrls,
                category: part.category,
                sku: part.sku,
                brand: part.brand,
                stock: part.stock
            }]).select().single();

            if (error) throw error;

            if (data) {
                const newPart: Part = {
                    ...part,
                    id: data.id,
                    salesPrice: data.sales_price,
                    imageUrls: data.image_urls
                };
                setDb(prevDb => prevDb ? { ...prevDb, parts: [...prevDb.parts, newPart] } : null);
            }
        } catch (error) {
            console.error("Error adding part:", error);
            throw error;
        }
    };

    const updatePart = async (updatedPart: Part) => {
        try {
            const { error } = await supabase.from('products').update({
                name: updatedPart.name,
                description: updatedPart.description,
                price: updatedPart.price,
                sales_price: updatedPart.salesPrice,
                image_urls: updatedPart.imageUrls,
                category: updatedPart.category,
                sku: updatedPart.sku,
                brand: updatedPart.brand,
                stock: updatedPart.stock
            }).eq('id', updatedPart.id);

            if (error) throw error;

            setDb(prevDb => prevDb ? { ...prevDb, parts: prevDb.parts.map(p => p.id === updatedPart.id ? updatedPart : p) } : null);
        } catch (error) {
            console.error("Error updating part:", error);
            throw error;
        }
    };

    const deletePart = async (partId: string) => {
        try {
            const { error } = await supabase.from('products').delete().eq('id', partId);
            if (error) throw error;
            setDb(prevDb => prevDb ? { ...prevDb, parts: prevDb.parts.filter(p => p.id !== partId) } : null);
        } catch (error) {
            console.error("Error deleting part:", error);
            throw error;
        }
    };

    // --- Mechanic Operations ---
    // --- Mechanic Operations ---
    // Note: In a real app, adding a mechanic would involve creating a user account in auth.users
    // For now, we'll just insert into the profiles table with a 'Mechanic' role if we were doing full admin management
    // But since we don't have an admin API for creating users, we'll simulate it or skip it for now
    // and just update the local state for the UI, assuming mechanics sign up themselves.

    const addMechanic = async (mechanic: Omit<Mechanic, 'id'>) => {
        // This is tricky without an admin API to create auth users.
        // We'll simulate it by just updating the local state for now, 
        // but in a real scenario, this would likely trigger an invitation email.
        console.warn("addMechanic: Cannot create auth users from client. Simulating update.");
        const newMechanic = { ...mechanic, id: `m-${Date.now()}` };
        setDb(prevDb => prevDb ? { ...prevDb, mechanics: [...prevDb.mechanics, newMechanic] } : null);
    };

    const updateMechanic = async (updatedMechanic: Mechanic) => {
        try {
            // Update profile data
            const { error } = await supabase.from('profiles').update({
                full_name: updatedMechanic.name,
                phone_number: updatedMechanic.phone,
                bio: updatedMechanic.bio,
                specializations: updatedMechanic.specializations,
                availability: updatedMechanic.availability,
                avatar_url: updatedMechanic.imageUrl,
                // ... other fields mapping
            }).eq('id', updatedMechanic.id);

            if (error) throw error;

            setDb(prevDb => prevDb ? { ...prevDb, mechanics: prevDb.mechanics.map(m => m.id === updatedMechanic.id ? updatedMechanic : m) } : null);
        } catch (error) {
            console.error("Error updating mechanic:", error);
            // alert("Failed to update mechanic."); // Suppress for now as we might be updating mock data
        }
    };

    const deleteMechanic = async (mechanicId: string) => {
        // Again, deleting a user usually requires admin privileges or an edge function
        console.warn("deleteMechanic: Cannot delete auth users from client. Simulating update.");
        setDb(prevDb => prevDb ? { ...prevDb, mechanics: prevDb.mechanics.filter(m => m.id !== mechanicId) } : null);
    };

    const updateMechanicStatus = async (mechanicId: string, status: Mechanic['status']) => {
        try {
            const { error } = await supabase.from('profiles').update({
                status: status
            }).eq('id', mechanicId);

            if (error) throw error;

            setDb(prevDb => prevDb ? { ...prevDb, mechanics: prevDb.mechanics.map(m => m.id === mechanicId ? { ...m, status } : m) } : null);
        } catch (error) {
            console.error("Error updating mechanic status:", error);
        }
    };

    const updateMechanicOnlineStatus = async (mechanicId: string, isOnline: boolean) => {
        try {
            const { error } = await supabase.from('profiles').update({
                is_online: isOnline
            }).eq('id', mechanicId);

            if (error) throw error;

            setDb(prevDb => prevDb ? { ...prevDb, mechanics: prevDb.mechanics.map(m => m.id === mechanicId ? { ...m, isOnline } : m) } : null);
        } catch (error) {
            console.error("Error updating mechanic online status:", error);
        }
    };

    const updateMechanicLocation = async (mechanicId: string, location: { lat: number; lng: number }) => {
        try {
            const { error } = await supabase.from('mechanics').update({
                latitude: location.lat,
                longitude: location.lng
            }).eq('id', mechanicId);

            if (error) throw error;

            setDb(prevDb => {
                if (!prevDb) return null;
                const newMechanics = prevDb.mechanics.map(m =>
                    m.id === mechanicId ? { ...m, lat: location.lat, lng: location.lng } : m
                );
                return { ...prevDb, mechanics: newMechanics };
            });
        } catch (error) {
            console.error("Error updating mechanic location:", error);
        }
    };

    // --- Booking Operations ---
    const addBooking = async (booking: Omit<Booking, 'id'>): Promise<Booking | null> => {
        try {
            const { data, error } = await supabase.from('bookings').insert([{
                customer_id: (booking as any).customerId, // Assuming customerId is passed or derived
                service_id: booking.service.id,
                mechanic_id: booking.mechanic?.id,
                vehicle_id: (booking as any).vehicleId, // Assuming vehicleId is passed
                booking_date: booking.date,
                booking_time: booking.time,
                status: booking.status,
                location_lat: booking.location?.lat,
                location_lng: booking.location?.lng,
                notes: booking.notes
            }]).select().single();

            if (error) throw error;

            if (data) {
                const newBooking = { ...booking, id: data.id } as Booking;
                setDb(prevDb => prevDb ? { ...prevDb, bookings: [...prevDb.bookings, newBooking] } : null);
                return newBooking;
            }
            return null;
        } catch (error) {
            console.error("Error adding booking:", error);
            return null;
        }
    };

    const updateBooking = async (bookingId: string, updates: Partial<Booking>) => {
        try {
            // Map updates to DB columns
            const dbUpdates: any = {};
            if (updates.status) dbUpdates.status = updates.status;
            if (updates.date) dbUpdates.booking_date = updates.date;
            if (updates.time) dbUpdates.booking_time = updates.time;
            if (updates.notes) dbUpdates.notes = updates.notes;
            // ... map other fields



            const { error } = await supabase.from('bookings').update(dbUpdates).eq('id', bookingId);
            if (error) throw error;

            setDb(prevDb => {
                if (!prevDb) return null;
                const updatedBookings = prevDb.bookings.map(b =>
                    b.id === bookingId ? { ...b, ...updates } : b
                );
                return { ...prevDb, bookings: updatedBookings };
            });
        } catch (error) {
            console.error("Error updating booking:", error);
        }
    };

    // --- Notification Operations ---
    const addNotification = async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const newNotification: Notification = {
            ...notification,
            id: `notif-${Date.now()}`,
            timestamp: Date.now(),
            read: false
        };
        setDb(prevDb => prevDb ? { ...prevDb, notifications: [newNotification, ...prevDb.notifications] } : null);
    };

    const markNotificationAsRead = async (notificationId: string) => {
        setDb(prevDb => prevDb ? {
            ...prevDb,
            notifications: prevDb.notifications.map(n => n.id === notificationId ? { ...n, read: true } : n)
        } : null);
    };

    const clearAllNotifications = async () => {
        setDb(prevDb => prevDb ? { ...prevDb, notifications: [] } : null);
    };

    const updateBookingStatus = async (bookingId: string, status: BookingStatus) => {
        try {
            const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
            if (error) throw error;

            setDb(prevDb => {
                if (!prevDb) return null;
                return {
                    ...prevDb,
                    bookings: prevDb.bookings.map(b => {
                        if (b.id === bookingId && b.status !== status) {
                            const newHistoryEntry = { status, timestamp: new Date().toISOString() };
                            const updatedHistory = [...(b.statusHistory || [{ status: b.status, timestamp: b.date }]), newHistoryEntry];
                            return { ...b, status, statusHistory: updatedHistory };
                        }
                        return b;
                    })
                };
            });
        } catch (error) {
            console.error("Error updating booking status:", error);
        }
    };

    const cancelBooking = async (bookingId: string, reason: string) => {
        try {
            const { error } = await supabase.from('bookings').update({
                status: 'Cancelled',
                cancellation_reason: reason
            }).eq('id', bookingId);

            if (error) throw error;

            setDb(prevDb => prevDb ? { ...prevDb, bookings: prevDb.bookings.map(b => b.id === bookingId ? { ...b, status: 'Cancelled', cancellationReason: reason } : b) } : null);
        } catch (error) {
            console.error("Error cancelling booking:", error);
        }
    };

    const acceptJobRequest = async (bookingId: string, mechanic: Mechanic) => {
        try {
            const { error } = await supabase.from('bookings').update({
                mechanic_id: mechanic.id,
                status: 'En Route'
            }).eq('id', bookingId);

            if (error) throw error;

            setDb(prevDb => {
                if (!prevDb) return null;
                const newBookings = prevDb.bookings.map(b =>
                    b.id === bookingId
                        ? { ...b, mechanic: mechanic, status: 'En Route' as BookingStatus }
                        : b
                );
                return { ...prevDb, bookings: newBookings };
            });
        } catch (error) {
            console.error("Error accepting job request:", error);
        }
    };

    const updateBookingNotes = async (bookingId: string, notes: string) => {
        try {
            const { error } = await supabase.from('bookings').update({ notes }).eq('id', bookingId);
            if (error) throw error;

            setDb(prevDb => {
                if (!prevDb) return null;
                return {
                    ...prevDb,
                    bookings: prevDb.bookings.map(b => b.id === bookingId ? { ...b, notes } : b)
                };
            });
        } catch (error) {
            console.error("Error updating booking notes:", error);
        }
    };

    const updateBookingImages = async (bookingId: string, beforeImages: File[] | string[], afterImages: File[] | string[]) => {
        try {
            let beforeImageUrls: string[] = [];
            let afterImageUrls: string[] = [];

            // Handle before images
            if (beforeImages.length > 0 && beforeImages[0] instanceof File) {
                beforeImageUrls = await uploadMultipleBookingImages(beforeImages as File[], bookingId, 'before');
            } else {
                beforeImageUrls = beforeImages as string[];
            }

            // Handle after images
            if (afterImages.length > 0 && afterImages[0] instanceof File) {
                afterImageUrls = await uploadMultipleBookingImages(afterImages as File[], bookingId, 'after');
            } else {
                afterImageUrls = afterImages as string[];
            }

            // Update database with image URLs
            const { error } = await supabase.from('bookings').update({
                before_images: beforeImageUrls,
                after_images: afterImageUrls
            }).eq('id', bookingId);

            if (error) throw error;

            // Update local state
            setDb(prevDb => {
                if (!prevDb) return null;
                return {
                    ...prevDb,
                    bookings: prevDb.bookings.map(b =>
                        b.id === bookingId ? { ...b, beforeImages: beforeImageUrls, afterImages: afterImageUrls } : b
                    )
                };
            });
        } catch (error) {
            console.error("Error updating booking images:", error);
            throw error;
        }
    };

    const markBookingAsPaid = async (bookingId: string) => {
        try {
            const { error } = await supabase.from('bookings').update({ is_paid: true }).eq('id', bookingId);
            if (error) throw error;

            setDb(prevDb => {
                if (!prevDb) return null;
                return {
                    ...prevDb,
                    bookings: prevDb.bookings.map(b => b.id === bookingId ? { ...b, isPaid: true } : b)
                };
            });
        } catch (error) {
            console.error("Error marking booking as paid:", error);
        }
    };

    const requestReschedule = async (bookingId: string, newDate: string, newTime: string, reason: string) => {
        try {
            const { error } = await supabase.from('bookings').update({
                status: 'Reschedule Requested',
                reschedule_details: { newDate, newTime, reason }
            }).eq('id', bookingId);

            if (error) throw error;

            setDb(prevDb => {
                if (!prevDb) return null;
                return {
                    ...prevDb,
                    bookings: prevDb.bookings.map(b => {
                        if (b.id === bookingId) {
                            const newStatus: BookingStatus = 'Reschedule Requested';
                            const newHistoryEntry = { status: newStatus, timestamp: new Date().toISOString() };
                            const updatedHistory = [...(b.statusHistory || []), newHistoryEntry];
                            return {
                                ...b,
                                status: newStatus,
                                statusHistory: updatedHistory,
                                rescheduleDetails: { newDate, newTime, reason }
                            };
                        }
                        return b;
                    })
                };
            });
        } catch (error) {
            console.error("Error requesting reschedule:", error);
        }
    };

    const respondToReschedule = async (bookingId: string, response: 'accepted' | 'rejected') => {
        try {
            // Fetch current booking to get reschedule details and original status
            const { data: booking, error: fetchError } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
            if (fetchError) throw fetchError;

            let updates: any = {};
            let newStatus: BookingStatus = 'Booking Confirmed'; // Default fallback

            if (response === 'accepted' && booking.reschedule_details) {
                updates = {
                    status: 'Booking Confirmed',
                    booking_date: booking.reschedule_details.newDate,
                    booking_time: booking.reschedule_details.newTime,
                    reschedule_details: null // Clear details
                };
                newStatus = 'Booking Confirmed';
            } else { // rejected
                // Revert to previous status (simplified logic: assume it was Confirmed or similar)
                // In a real app, we'd query status history or store 'previous_status'
                updates = {
                    status: 'Booking Confirmed', // Or whatever logic to revert
                    reschedule_details: null
                };
                newStatus = 'Booking Confirmed';
            }

            const { error } = await supabase.from('bookings').update(updates).eq('id', bookingId);
            if (error) throw error;

            setDb(prevDb => {
                if (!prevDb) return null;
                return {
                    ...prevDb,
                    bookings: prevDb.bookings.map(b => {
                        if (b.id === bookingId) {
                            // Update local state similarly
                            if (response === 'accepted' && b.rescheduleDetails) {
                                const newHistoryEntry = { status: 'Booking Confirmed', timestamp: new Date().toISOString() };
                                const updatedHistory = [...(b.statusHistory || []), newHistoryEntry];
                                return {
                                    ...b,
                                    status: 'Booking Confirmed',
                                    statusHistory: updatedHistory,
                                    date: b.rescheduleDetails.newDate,
                                    time: b.rescheduleDetails.newTime,
                                    rescheduleDetails: undefined
                                };
                            } else {
                                // Revert logic
                                return {
                                    ...b,
                                    status: 'Booking Confirmed', // Simplified
                                    rescheduleDetails: undefined
                                };
                            }
                        }
                        return b;
                    })
                };
            });
        } catch (error) {
            console.error("Error responding to reschedule:", error);
        }
    };

    // --- Customer Operations ---
    const addCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer | null> => {
        // Similar to mechanics, adding a customer usually means sign up.
        // We'll simulate by updating local state.
        console.warn("addCustomer: Cannot create auth users from client. Simulating update.");
        const newCustomer = { ...customer, id: `c-${Date.now()}` };
        setDb(prevDb => prevDb ? { ...prevDb, customers: [...prevDb.customers, newCustomer] } : null);
        return newCustomer;
    };

    const updateCustomer = async (updatedCustomer: Customer) => {
        try {
            const { error } = await supabase.from('profiles').update({
                full_name: updatedCustomer.name,
                phone_number: updatedCustomer.phone,
                avatar_url: updatedCustomer.picture,
                // ... other fields
            }).eq('id', updatedCustomer.id);

            if (error) throw error;

            setDb(prevDb => prevDb ? { ...prevDb, customers: prevDb.customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c) } : null);
        } catch (error) {
            console.error("Error updating customer:", error);
        }
    };

    const updateCustomerLocation = async (customerId: string, location: { lat: number; lng: number }) => {
        try {
            const { error } = await supabase.from('profiles').update({
                latitude: location.lat,
                longitude: location.lng
            }).eq('id', customerId);

            if (error) throw error;

            setDb(prevDb => {
                if (!prevDb) return null;
                const newCustomers = prevDb.customers.map(c =>
                    c.id === customerId ? { ...c, lat: location.lat, lng: location.lng } : c
                );
                return { ...prevDb, customers: newCustomers };
            });
        } catch (error) {
            console.error("Error updating customer location:", error);
        }
    };

    const deleteCustomer = async (customerId: string) => {
        console.warn("deleteCustomer: Cannot delete auth users from client. Simulating update.");
        setDb(prevDb => prevDb ? { ...prevDb, customers: prevDb.customers.filter(c => c.id !== customerId) } : null);
    };

    const deleteVehicleFromCustomer = async (customerId: string, plateNumber: string) => {
        try {
            // Assuming we have a 'vehicles' table and we can delete by plate number and owner_id
            const { error } = await supabase.from('vehicles').delete().match({ plate_number: plateNumber, owner_id: customerId });

            if (error) throw error;

            setDb(prevDb => {
                if (!prevDb) return null;
                return {
                    ...prevDb,
                    customers: prevDb.customers.map(c => {
                        if (c.id === customerId) {
                            return { ...c, vehicles: c.vehicles.filter(v => v.plateNumber !== plateNumber) };
                        }
                        return c;
                    })
                };
            });
        } catch (error) {
            console.error("Error deleting vehicle:", error);
        }
    };

    // --- Order Operations ---
    const addOrder = async (customerName: string, items: CartItem[], total: number, paymentMethod: string): Promise<Order | null> => {
        try {
            const { data, error } = await supabase.from('orders').insert([{
                customer_name: customerName,
                items: items, // Assuming JSONB column
                total_amount: total,
                payment_method: paymentMethod,
                status: 'Processing',
                order_date: new Date().toISOString()
            }]).select().single();

            if (error) throw error;

            if (data) {
                const newOrder: Order = {
                    id: data.id,
                    customerName: data.customer_name,
                    items: data.items,
                    total: data.total_amount,
                    paymentMethod: data.payment_method,
                    date: data.order_date,
                    status: data.status,
                };
                setDb(prevDb => prevDb ? { ...prevDb, orders: [...prevDb.orders, newOrder] } : null);
                return newOrder;
            }
            return null;
        } catch (error) {
            console.error("Error adding order:", error);
            return null;
        }
    };

    const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
        try {
            const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
            if (error) throw error;

            setDb(prevDb => {
                if (!prevDb) return null;
                return {
                    ...prevDb,
                    orders: prevDb.orders.map(o => {
                        if (o.id === orderId) {
                            const newHistoryEntry = { status, timestamp: new Date().toISOString() };
                            const updatedHistory = [...(o.statusHistory || [{ status: o.status, timestamp: o.date }]), newHistoryEntry];
                            return {
                                ...o,
                                status,
                                statusHistory: updatedHistory,
                            };
                        }
                        return o;
                    })
                };
            });
        } catch (error) {
            console.error("Error updating order status:", error);
        }
    };

    // --- Settings Operations ---
    const updateSettings = async (newSettings: Partial<Settings>) => {
        try {
            // Assuming a single row for settings or a specific ID
            // For simplicity, let's assume we update a 'global_settings' table or similar
            // Or just update local state if no backend table yet
            setDb(prevDb => prevDb ? { ...prevDb, settings: { ...prevDb.settings, ...newSettings } } : null);
        } catch (error) {
            console.error("Error updating settings:", error);
        }
    };

    // --- Review Operations ---
    const addReviewToMechanic = async (mechanicId: string, bookingId: string, reviewData: { rating: number, comment: string }, customerName: string) => {
        try {
            // 1. Insert review into 'reviews' table (assuming it exists)
            // 2. Update booking 'is_reviewed' status
            // 3. Recalculate mechanic rating (or let a trigger do it)

            // For now, we'll simulate the complex logic by updating local state
            // In a real app, this would be a transaction or multiple calls

            setDb(prevDb => {
                if (!prevDb) return null;

                const newMechanics = prevDb.mechanics.map(mechanic => {
                    if (mechanic.id === mechanicId) {
                        const newReview: Review = {
                            id: `r-${Date.now()}`,
                            customerName,
                            date: new Date().toISOString(),
                            ...reviewData
                        };

                        const updatedReviewsList = [newReview, ...(mechanic.reviewsList || [])];
                        const newAverageRating = updatedReviewsList.reduce((sum, r) => sum + r.rating, 0) / updatedReviewsList.length;

                        return {
                            ...mechanic,
                            reviewsList: updatedReviewsList,
                            rating: newAverageRating,
                            reviews: updatedReviewsList.length,
                        };
                    }
                    return mechanic;
                });

                const newBookings = prevDb.bookings.map(booking => {
                    if (booking.id === bookingId) {
                        return { ...booking, isReviewed: true };
                    }
                    return booking;
                });

                return { ...prevDb, mechanics: newMechanics, bookings: newBookings };
            });
        } catch (error) {
            console.error("Error adding review:", error);
        }
    };

    // --- Banner Operations ---
    const addBanner = async (banner: Omit<Banner, 'id'>) => {
        try {
            // Assuming 'banners' table exists
            // const { data, error } = await supabase.from('banners').insert([banner]).select().single();
            // For now, update local state
            const newBanner = { ...banner, id: `banner-${Date.now()}` };
            setDb(prevDb => prevDb ? { ...prevDb, banners: [...prevDb.banners, newBanner] } : null);
        } catch (error) {
            console.error("Error adding banner:", error);
        }
    };

    const updateBanner = async (updatedBanner: Banner) => {
        try {
            // await supabase.from('banners').update(updatedBanner).eq('id', updatedBanner.id);
            setDb(prevDb => prevDb ? { ...prevDb, banners: prevDb.banners.map(b => b.id === updatedBanner.id ? updatedBanner : b) } : null);
        } catch (error) {
            console.error("Error updating banner:", error);
        }
    };

    const deleteBanner = async (bannerId: string) => {
        try {
            // await supabase.from('banners').delete().eq('id', bannerId);
            setDb(prevDb => prevDb ? { ...prevDb, banners: prevDb.banners.filter(b => b.id !== bannerId) } : null);
        } catch (error) {
            console.error("Error deleting banner:", error);
        }
    };

    // --- Admin User & Role Operations ---
    const addAdminUser = async (user: Omit<AdminUser, 'id'>) => {
        try {
            // Creating an admin user would typically involve creating an auth user with metadata
            // For now, we update local state
            const newUser = { ...user, id: `au-${Date.now()}` };
            setDb(prevDb => prevDb ? { ...prevDb, adminUsers: [...prevDb.adminUsers, newUser] } : null);
        } catch (error) {
            console.error("Error adding admin user:", error);
        }
    };

    const updateAdminUser = async (updatedUser: AdminUser) => {
        try {
            // Update logic here
            setDb(prevDb => prevDb ? { ...prevDb, adminUsers: prevDb.adminUsers.map(u => u.id === updatedUser.id ? updatedUser : u) } : null);
        } catch (error) {
            console.error("Error updating admin user:", error);
        }
    };

    const deleteAdminUser = async (userId: string) => {
        try {
            // Delete logic here
            setDb(prevDb => prevDb ? { ...prevDb, adminUsers: prevDb.adminUsers.filter(u => u.id !== userId) } : null);
        } catch (error) {
            console.error("Error deleting admin user:", error);
        }
    };

    const addRole = async (role: Omit<Role, 'isEditable'>) => {
        try {
            // Role management logic
            const newRole = { ...role, isEditable: true }; // Custom roles are always editable
            setDb(prevDb => prevDb ? { ...prevDb, roles: [...prevDb.roles, newRole] } : null);
        } catch (error) {
            console.error("Error adding role:", error);
        }
    };

    const updateRole = async (updatedRole: Role) => {
        try {
            // Role update logic
            setDb(prevDb => prevDb ? { ...prevDb, roles: prevDb.roles.map(r => r.name === updatedRole.name ? updatedRole : r) } : null);
        } catch (error) {
            console.error("Error updating role:", error);
        }
    };

    const deleteRole = async (roleName: string) => {
        try {
            setDb(prevDb => {
                if (!prevDb) return null;
                // Prevent deleting the role if it's in use
                const isRoleInUse = prevDb.adminUsers.some(u => u.role === roleName);
                if (isRoleInUse) {
                    throw new Error("Cannot delete role: it is currently assigned to one or more users.");
                }
                return { ...prevDb, roles: prevDb.roles.filter(r => r.name !== roleName) };
            });
        } catch (error) {
            console.error("Error deleting role:", error);
            alert(error instanceof Error ? error.message : "Failed to delete role");
        }
    };

    // --- Task Operations ---
    const addTask = async (task: Omit<Task, 'id' | 'isComplete' | 'completionDate'>) => {
        try {
            const newTask: Task = { ...task, id: `t-${Date.now()}`, isComplete: false };
            setDb(prevDb => prevDb ? { ...prevDb, tasks: [...prevDb.tasks, newTask] } : null);
        } catch (error) {
            console.error("Error adding task:", error);
        }
    };

    const updateTask = async (updatedTask: Task) => {
        try {
            setDb(prevDb => prevDb ? { ...prevDb, tasks: prevDb.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) } : null);
        } catch (error) {
            console.error("Error updating task:", error);
        }
    };

    const deleteTask = async (taskId: string) => {
        try {
            setDb(prevDb => prevDb ? { ...prevDb, tasks: prevDb.tasks.filter(t => t.id !== taskId) } : null);
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    const deleteMultipleTasks = async (taskIds: string[]) => {
        try {
            setDb(prevDb => {
                if (!prevDb) return null;
                const idSet = new Set(taskIds);
                return { ...prevDb, tasks: prevDb.tasks.filter(t => !idSet.has(t.id)) };
            });
        } catch (error) {
            console.error("Error deleting multiple tasks:", error);
        }
    };

    const updateMultipleTasksStatus = async (taskIds: string[], isComplete: boolean) => {
        try {
            setDb(prevDb => {
                if (!prevDb) return null;
                const idSet = new Set(taskIds);
                const completionDate = isComplete ? new Date().toISOString().split('T')[0] : undefined;
                return {
                    ...prevDb,
                    tasks: prevDb.tasks.map(t =>
                        idSet.has(t.id) ? { ...t, isComplete, completionDate } : t
                    )
                };
            });
        } catch (error) {
            console.error("Error updating multiple tasks status:", error);
        }
    };

    // --- Payout Operations ---
    const addPayoutRequest = async (payoutRequest: Omit<PayoutRequest, 'id' | 'status' | 'requestDate'>) => {
        try {
            const newRequest: PayoutRequest = {
                ...payoutRequest,
                id: `po-${Date.now()}`,
                status: 'Pending',
                requestDate: new Date().toISOString(),
            };
            setDb(prevDb => prevDb ? { ...prevDb, payouts: [...prevDb.payouts, newRequest] } : null);
        } catch (error) {
            console.error("Error adding payout request:", error);
        }
    };

    const processPayoutRequest = async (payoutId: string, status: 'Approved' | 'Rejected', rejectionReason?: string) => {
        try {
            setDb(prevDb => prevDb ? {
                ...prevDb,
                payouts: prevDb.payouts.map(p =>
                    p.id === payoutId
                        ? { ...p, status, processDate: new Date().toISOString(), rejectionReason: status === 'Rejected' ? rejectionReason : undefined }
                        : p
                )
            } : null);
        } catch (error) {
            console.error("Error processing payout request:", error);
        }
    };

    // --- Rental Operations ---
    const addRentalBooking = async (booking: Omit<RentalBooking, 'id'>): Promise<RentalBooking | null> => {
        try {
            const newBooking: RentalBooking = { ...booking, id: `rb-${Date.now()}` };
            setDb(prevDb => {
                if (!prevDb) return null;
                const updatedCars = prevDb.rentalCars.map(car =>
                    car.id === newBooking.carId ? { ...car, isAvailable: false } : car
                );
                return {
                    ...prevDb,
                    rentalCars: updatedCars,
                    rentalBookings: [...(prevDb.rentalBookings || []), newBooking]
                };
            });
            return newBooking;
        } catch (error) {
            console.error("Error adding rental booking:", error);
            return null;
        }
    };


    // --- Context Provider Value ---
    const value: DatabaseContextType = {
        db,
        loading,
        addNotification,
        markNotificationAsRead,
        clearAllNotifications,
        addService,
        updateService,
        deleteService,
        addPart,
        updatePart,
        deletePart,
        addMechanic,
        updateMechanic,
        deleteMechanic,
        updateMechanicStatus,
        updateMechanicOnlineStatus,
        updateMechanicLocation,
        addBooking,
        updateBooking,
        updateBookingStatus,
        cancelBooking,
        acceptJobRequest,
        updateBookingNotes,
        updateBookingImages,
        markBookingAsPaid,
        requestReschedule,
        respondToReschedule,
        addCustomer,
        updateCustomer,
        updateCustomerLocation,
        deleteCustomer,
        deleteVehicleFromCustomer,
        addOrder,
        updateOrderStatus,
        updateSettings,
        addReviewToMechanic,
        addBanner,
        updateBanner,
        deleteBanner,
        addAdminUser,
        updateAdminUser,
        deleteAdminUser,
        addRole,
        updateRole,
        deleteRole,
        addTask,
        updateTask,
        deleteTask,
        deleteMultipleTasks,
        updateMultipleTasksStatus,
        addPayoutRequest,
        processPayoutRequest,
        addRentalBooking,
    };

    return (
        <DatabaseContext.Provider value={value}>
            {children}
        </DatabaseContext.Provider>
    );
};