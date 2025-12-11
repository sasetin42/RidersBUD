import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Service, Part, Mechanic, Booking, Customer, Settings, BookingStatus, Order, CartItem, Review, Banner, FAQCategory, AdminUser, Role, Task, Database, OrderStatus, PayoutRequest, RentalCar, RentalBooking } from '../types';
import { getSeedData } from '../data/mockData';
import { SupabaseDatabaseService } from '../services/supabaseDatabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

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
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const useDatabase = () => {
    const context = useContext(DatabaseContext);
    if (context === undefined) {
        throw new Error('useDatabase must be used within a DatabaseProvider');
    }
    return context;
};

const DB_STORAGE_KEY = 'ridersbud_database';

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [db, setDb] = useState<Database | null>(null);
    const [loading, setLoading] = useState(true);

    // Effect for initial data loading from localStorage or seed
    // Effect for initial data loading from localStorage, seed, or Supabase
    useEffect(() => {
        const loadData = async () => {
            try {
                if (isSupabaseConfigured()) {
                    console.log("Loading database from Supabase...");
                    const supabaseData = await SupabaseDatabaseService.getDatabase();
                    if (supabaseData) {
                        setDb(supabaseData as Database);
                        setLoading(false);
                        return;
                    } else {
                        console.warn("Supabase returned empty data, falling back to local storage/seed.");
                    }
                }

                const storedData = localStorage.getItem(DB_STORAGE_KEY);
                if (storedData) {
                    console.log("Loading database from localStorage...");
                    const parsedData = JSON.parse(storedData);
                    // Simple validation: check if critical 'settings' exist
                    if (!parsedData || !parsedData.settings) {
                        console.warn("Stored data is corrupt or missing settings. Falling back to seed data.");
                        const seedData = getSeedData();
                        setDb(seedData);
                        // Optionally overwrite corrupt data immediately
                        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(seedData));
                    } else {
                        setDb(parsedData);
                    }
                } else {
                    console.log("Initializing database from seed data...");
                    const seedData = getSeedData();
                    setDb(seedData);
                }
            } catch (error) {
                console.error("Failed to load data, falling back to seed data.", error);
                const seedData = getSeedData();
                setDb(seedData);
            } finally {
                setLoading(false);
            }
        };
        // No delay needed if fetching
        loadData();
    }, []); // Runs only once on mount

    // Effect for persisting any changes to the DB state into localStorage
    useEffect(() => {
        // Don't save during initial load or if db is null
        if (!loading && db) {
            try {
                localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
            } catch (error) {
                console.error("Failed to save database to localStorage:", error);
            }
        }
    }, [db, loading]); // Runs whenever 'db' or 'loading' state changes

    // Effect for real-time updates across tabs
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === DB_STORAGE_KEY && event.newValue) {
                try {
                    console.log("Real-time update received from another tab. Syncing state.");
                    const updatedDb = JSON.parse(event.newValue);
                    setDb(updatedDb);
                } catch (error) {
                    console.error("Failed to sync database from storage event:", error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Effect for simulating mechanic movement and calculating ETA
    useEffect(() => {
        const simulationInterval = setInterval(() => {
            setDb(prevDb => {
                if (!prevDb) return null;

                let dbChanged = false;
                const newMechanics = [...prevDb.mechanics];
                const newBookings = [...prevDb.bookings];

                const enRouteBookings = newBookings.filter(b => b.status === 'En Route' && b.mechanic && b.location);

                if (enRouteBookings.length === 0) {
                    return prevDb;
                }

                const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
                    const R = 6371; // Radius of the Earth in km
                    const dLat = (lat2 - lat1) * Math.PI / 180;
                    const dLon = (lon2 - lon1) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    return R * c;
                };

                enRouteBookings.forEach(booking => {
                    const mechanicIndex = newMechanics.findIndex(m => m.id === booking.mechanic!.id);
                    if (mechanicIndex === -1) return;

                    const mechanic = newMechanics[mechanicIndex];
                    const customerLocation = booking.location!;
                    const currentDistance = getDistanceInKm(mechanic.lat, mechanic.lng, customerLocation.lat, customerLocation.lng);

                    if (currentDistance < 0.1) {
                        const bookingIndex = newBookings.findIndex(b => b.id === booking.id);
                        if (bookingIndex !== -1 && newBookings[bookingIndex].eta) {
                            newBookings[bookingIndex] = { ...newBookings[bookingIndex], eta: undefined };
                            dbChanged = true;
                        }
                        return;
                    }

                    const step = 0.1;
                    const newLat = mechanic.lat + (customerLocation.lat - mechanic.lat) * step;
                    const newLng = mechanic.lng + (customerLocation.lng - mechanic.lng) * step;

                    newMechanics[mechanicIndex] = { ...mechanic, lat: newLat, lng: newLng };

                    const newDistance = getDistanceInKm(newLat, newLng, customerLocation.lat, customerLocation.lng);
                    const etaMins = Math.ceil((newDistance / 40) * 60);

                    const bookingIndex = newBookings.findIndex(b => b.id === booking.id);
                    if (bookingIndex !== -1) {
                        newBookings[bookingIndex] = { ...newBookings[bookingIndex], eta: etaMins > 0 ? etaMins : 1 };
                    }
                    dbChanged = true;
                });

                if (dbChanged) {
                    return { ...prevDb, mechanics: newMechanics, bookings: newBookings };
                }

                return prevDb;
            });
        }, 5000);

        return () => clearInterval(simulationInterval);
    }, []);

    // --- Service Operations ---
    const addService = async (service: Omit<Service, 'id'>) => {
        await delay(300);
        const newService = { ...service, id: `s-${Date.now()}` };
        setDb(prevDb => prevDb ? { ...prevDb, services: [...prevDb.services, newService] } : null);
    };
    const updateService = async (updatedService: Service) => {
        await delay(300);
        setDb(prevDb => prevDb ? { ...prevDb, services: prevDb.services.map(s => s.id === updatedService.id ? updatedService : s) } : null);
    };
    const deleteService = async (serviceId: string) => {
        await delay(300);
        setDb(prevDb => prevDb ? { ...prevDb, services: prevDb.services.filter(s => s.id !== serviceId) } : null);
    };

    // --- Part Operations ---
    const addPart = async (part: Omit<Part, 'id'>) => {
        await delay(300);
        const newPart = { ...part, id: `p-${Date.now()}` };
        setDb(prevDb => prevDb ? { ...prevDb, parts: [...prevDb.parts, newPart] } : null);
    };
    const updatePart = async (updatedPart: Part) => {
        await delay(300);
        setDb(prevDb => prevDb ? { ...prevDb, parts: prevDb.parts.map(p => p.id === updatedPart.id ? updatedPart : p) } : null);
    };
    const deletePart = async (partId: string) => {
        await delay(300);
        setDb(prevDb => prevDb ? { ...prevDb, parts: prevDb.parts.filter(p => p.id !== partId) } : null);
    };

    // --- Mechanic Operations ---
    const addMechanic = async (mechanic: Omit<Mechanic, 'id'>) => {
        await delay(500);
        const newMechanic = { ...mechanic, id: `m-${Date.now()}` };
        setDb(prevDb => prevDb ? { ...prevDb, mechanics: [...prevDb.mechanics, newMechanic] } : null);
    };
    const updateMechanic = async (updatedMechanic: Mechanic) => {
        await delay(500);
        setDb(prevDb => prevDb ? { ...prevDb, mechanics: prevDb.mechanics.map(m => m.id === updatedMechanic.id ? updatedMechanic : m) } : null);
    };
    const deleteMechanic = async (mechanicId: string) => {
        await delay(500);
        setDb(prevDb => prevDb ? { ...prevDb, mechanics: prevDb.mechanics.filter(m => m.id !== mechanicId) } : null);
    };
    const updateMechanicStatus = async (mechanicId: string, status: Mechanic['status']) => {
        await delay(300);
        setDb(prevDb => prevDb ? { ...prevDb, mechanics: prevDb.mechanics.map(m => m.id === mechanicId ? { ...m, status } : m) } : null);
    };
    const updateMechanicOnlineStatus = async (mechanicId: string, isOnline: boolean) => {
        // No delay for this one as it should feel instant
        setDb(prevDb => prevDb ? { ...prevDb, mechanics: prevDb.mechanics.map(m => m.id === mechanicId ? { ...m, isOnline } : m) } : null);
    };
    const updateMechanicLocation = async (mechanicId: string, location: { lat: number; lng: number }) => {
        // No delay for this one as it's a real-time update
        setDb(prevDb => {
            if (!prevDb) return null;
            const newMechanics = prevDb.mechanics.map(m =>
                m.id === mechanicId ? { ...m, lat: location.lat, lng: location.lng } : m
            );
            return { ...prevDb, mechanics: newMechanics };
        });
    };

    // --- Booking Operations ---
    const addBooking = async (booking: Omit<Booking, 'id'>): Promise<Booking | null> => {
        await delay(500);
        const newBooking = { ...booking, id: `b-${Date.now()}` } as Booking;
        setDb(prevDb => prevDb ? { ...prevDb, bookings: [...prevDb.bookings, newBooking] } : null);
        return newBooking;
    };
    const updateBooking = async (bookingId: string, updates: Partial<Booking>) => {
        await delay(300);
        setDb(prevDb => {
            if (!prevDb) return null;
            const updatedBookings = prevDb.bookings.map(b =>
                b.id === bookingId ? { ...b, ...updates } : b
            );
            return { ...prevDb, bookings: updatedBookings };
        });
    };
    const updateBookingStatus = async (bookingId: string, status: BookingStatus) => {
        await delay(300);
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
    };
    const cancelBooking = async (bookingId: string, reason: string) => {
        await delay(300);
        setDb(prevDb => prevDb ? { ...prevDb, bookings: prevDb.bookings.map(b => b.id === bookingId ? { ...b, status: 'Cancelled', cancellationReason: reason } : b) } : null);
    };
    const acceptJobRequest = async (bookingId: string, mechanic: Mechanic) => {
        await delay(300);
        setDb(prevDb => {
            if (!prevDb) return null;
            const newBookings = prevDb.bookings.map(b =>
                b.id === bookingId
                    ? { ...b, mechanic: mechanic, status: 'En Route' as BookingStatus }
                    : b
            );
            return { ...prevDb, bookings: newBookings };
        });
    };
    const updateBookingNotes = async (bookingId: string, notes: string) => {
        await delay(300);
        setDb(prevDb => {
            if (!prevDb) return null;
            return {
                ...prevDb,
                bookings: prevDb.bookings.map(b => b.id === bookingId ? { ...b, notes } : b)
            };
        });
    };

    const updateBookingImages = async (bookingId: string, beforeImages: string[], afterImages: string[]) => {
        await delay(500);
        setDb(prevDb => {
            if (!prevDb) return null;
            return {
                ...prevDb,
                bookings: prevDb.bookings.map(b => b.id === bookingId ? { ...b, beforeImages, afterImages } : b)
            };
        });
    };

    const markBookingAsPaid = async (bookingId: string) => {
        await delay(300);
        setDb(prevDb => {
            if (!prevDb) return null;
            return {
                ...prevDb,
                bookings: prevDb.bookings.map(b => b.id === bookingId ? { ...b, isPaid: true } : b)
            };
        });
    };

    const requestReschedule = async (bookingId: string, newDate: string, newTime: string, reason: string) => {
        await delay(300);
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
    };

    const respondToReschedule = async (bookingId: string, response: 'accepted' | 'rejected') => {
        await delay(300);
        setDb(prevDb => {
            if (!prevDb) return null;
            return {
                ...prevDb,
                bookings: prevDb.bookings.map(b => {
                    if (b.id === bookingId) {
                        const originalStatusBeforeRequest = b.statusHistory?.slice().reverse().find(h => h.status !== 'Reschedule Requested')?.status as BookingStatus || 'Booking Confirmed';

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
                        } else { // rejected
                            const newHistoryEntry = { status: originalStatusBeforeRequest, timestamp: new Date().toISOString() };
                            const updatedHistory = [...(b.statusHistory || []), newHistoryEntry];
                            return {
                                ...b,
                                status: originalStatusBeforeRequest,
                                statusHistory: updatedHistory,
                                rescheduleDetails: undefined
                            };
                        }
                    }
                    return b;
                })
            };
        });
    };

    // --- Customer Operations ---
    const addCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer | null> => {
        await delay(500);
        const newCustomer = { ...customer, id: `c-${Date.now()}` };
        setDb(prevDb => prevDb ? { ...prevDb, customers: [...prevDb.customers, newCustomer] } : null);
        return newCustomer;
    };
    const updateCustomer = async (updatedCustomer: Customer) => {
        await delay(500);
        setDb(prevDb => prevDb ? { ...prevDb, customers: prevDb.customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c) } : null);
    };
    const updateCustomerLocation = async (customerId: string, location: { lat: number; lng: number }) => {
        // No delay for real-time updates
        setDb(prevDb => {
            if (!prevDb) return null;
            const newCustomers = prevDb.customers.map(c =>
                c.id === customerId ? { ...c, lat: location.lat, lng: location.lng } : c
            );
            return { ...prevDb, customers: newCustomers };
        });
    };
    const deleteCustomer = async (customerId: string) => {
        await delay(500);
        setDb(prevDb => prevDb ? { ...prevDb, customers: prevDb.customers.filter(c => c.id !== customerId) } : null);
    };
    const deleteVehicleFromCustomer = async (customerId: string, plateNumber: string) => {
        await delay(300);
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
    };

    // --- Order Operations ---
    const addOrder = async (customerName: string, items: CartItem[], total: number, paymentMethod: string): Promise<Order | null> => {
        await delay(500);
        const newOrder: Order = {
            id: `o-${Date.now()}`,
            customerName,
            items,
            total,
            paymentMethod,
            date: new Date().toISOString(),
            status: 'Processing',
        };
        setDb(prevDb => prevDb ? { ...prevDb, orders: [...prevDb.orders, newOrder] } : null);
        return newOrder;
    };

    const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
        await delay(300);
        setDb(prevDb => {
            if (!prevDb) return null;
            return {
                ...prevDb,
                orders: prevDb.orders.map(o => {
                    if (o.id === orderId) {
                        const newHistoryEntry = { status, timestamp: new Date().toISOString() };
                        // Add new entry, ensuring history exists
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
    };

    // --- Settings Operations ---
    const updateSettings = async (newSettings: Partial<Settings>) => {
        await delay(500);
        setDb(prevDb => prevDb ? { ...prevDb, settings: { ...prevDb.settings, ...newSettings } } : null);
    };

    // --- Review Operations ---
    const addReviewToMechanic = async (mechanicId: string, bookingId: string, reviewData: { rating: number, comment: string }, customerName: string) => {
        await delay(300);
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
    };

    // --- Banner Operations ---
    const addBanner = async (banner: Omit<Banner, 'id'>) => {
        await delay(300);
        const newBanner = { ...banner, id: `banner-${Date.now()}` };
        setDb(prevDb => prevDb ? { ...prevDb, banners: [...prevDb.banners, newBanner] } : null);
    };

    const updateBanner = async (updatedBanner: Banner) => {
        await delay(300);
        setDb(prevDb => prevDb ? { ...prevDb, banners: prevDb.banners.map(b => b.id === updatedBanner.id ? updatedBanner : b) } : null);
    };

    const deleteBanner = async (bannerId: string) => {
        await delay(300);
        setDb(prevDb => prevDb ? { ...prevDb, banners: prevDb.banners.filter(b => b.id !== bannerId) } : null);
    };

    // --- Admin User & Role Operations ---
    const addAdminUser = async (user: Omit<AdminUser, 'id'>) => {
        await delay(300);
        const newUser = { ...user, id: `au-${Date.now()}` };
        setDb(prevDb => prevDb ? { ...prevDb, adminUsers: [...prevDb.adminUsers, newUser] } : null);
    };
    const updateAdminUser = async (updatedUser: AdminUser) => {
        await delay(300);
        setDb(prevDb => prevDb ? { ...prevDb, adminUsers: prevDb.adminUsers.map(u => u.id === updatedUser.id ? updatedUser : u) } : null);
    };
    const deleteAdminUser = async (userId: string) => {
        await delay(300);
        setDb(prevDb => prevDb ? { ...prevDb, adminUsers: prevDb.adminUsers.filter(u => u.id !== userId) } : null);
    };
    const addRole = async (role: Omit<Role, 'isEditable'>) => {
        await delay(300);
        const newRole = { ...role, isEditable: true }; // Custom roles are always editable
        setDb(prevDb => prevDb ? { ...prevDb, roles: [...prevDb.roles, newRole] } : null);
    };
    const updateRole = async (updatedRole: Role) => {
        await delay(300);
        setDb(prevDb => prevDb ? { ...prevDb, roles: prevDb.roles.map(r => r.name === updatedRole.name ? updatedRole : r) } : null);
    };
    const deleteRole = async (roleName: string) => {
        await delay(300);
        setDb(prevDb => {
            if (!prevDb) return null;
            // Prevent deleting the role if it's in use
            const isRoleInUse = prevDb.adminUsers.some(u => u.role === roleName);
            if (isRoleInUse) {
                throw new Error("Cannot delete role: it is currently assigned to one or more users.");
            }
            return { ...prevDb, roles: prevDb.roles.filter(r => r.name !== roleName) };
        });
    };

    // --- Task Operations ---
    const addTask = async (task: Omit<Task, 'id' | 'isComplete' | 'completionDate'>) => {
        await delay(100);
        const newTask: Task = { ...task, id: `t-${Date.now()}`, isComplete: false };
        setDb(prevDb => prevDb ? { ...prevDb, tasks: [...prevDb.tasks, newTask] } : null);
    };
    const updateTask = async (updatedTask: Task) => {
        await delay(100);
        setDb(prevDb => prevDb ? { ...prevDb, tasks: prevDb.tasks.map(t => t.id === updatedTask.id ? updatedTask : t) } : null);
    };
    const deleteTask = async (taskId: string) => {
        await delay(100);
        setDb(prevDb => prevDb ? { ...prevDb, tasks: prevDb.tasks.filter(t => t.id !== taskId) } : null);
    };

    const deleteMultipleTasks = async (taskIds: string[]) => {
        await delay(300);
        setDb(prevDb => {
            if (!prevDb) return null;
            const idSet = new Set(taskIds);
            return { ...prevDb, tasks: prevDb.tasks.filter(t => !idSet.has(t.id)) };
        });
    };

    const updateMultipleTasksStatus = async (taskIds: string[], isComplete: boolean) => {
        await delay(300);
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
    };

    // --- Payout Operations ---
    const addPayoutRequest = async (payoutRequest: Omit<PayoutRequest, 'id' | 'status' | 'requestDate'>) => {
        await delay(300);
        const newRequest: PayoutRequest = {
            ...payoutRequest,
            id: `po-${Date.now()}`,
            status: 'Pending',
            requestDate: new Date().toISOString(),
        };
        setDb(prevDb => prevDb ? { ...prevDb, payouts: [...prevDb.payouts, newRequest] } : null);
    };

    const processPayoutRequest = async (payoutId: string, status: 'Approved' | 'Rejected', rejectionReason?: string) => {
        await delay(500);
        setDb(prevDb => prevDb ? {
            ...prevDb,
            payouts: prevDb.payouts.map(p =>
                p.id === payoutId
                    ? { ...p, status, processDate: new Date().toISOString(), rejectionReason: status === 'Rejected' ? rejectionReason : undefined }
                    : p
            )
        } : null);
    };

    // --- Rental Operations ---
    const addRentalBooking = async (booking: Omit<RentalBooking, 'id'>): Promise<RentalBooking | null> => {
        await delay(500);
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
    };


    // --- Context Provider Value ---
    const value: DatabaseContextType = {
        db,
        loading,
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