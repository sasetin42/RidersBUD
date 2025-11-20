import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Service, Part, Mechanic, Booking, Customer, Settings, BookingStatus, Order, CartItem, Review, Banner, FAQCategory, AdminUser, Role, Task, Database, OrderStatus } from '../types';
import { getSeedData } from '../data/mockData';

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
    updateMechanicStatus: (mechanicId: string, status: 'Active' | 'Inactive' | 'Pending') => Promise<void>;
    addBooking: (booking: Omit<Booking, 'id'>) => Promise<Booking | null>;
    updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
    cancelBooking: (bookingId: string, reason: string) => Promise<void>;
    acceptJobRequest: (bookingId: string, mechanic: Mechanic) => Promise<void>;
    updateBookingNotes: (bookingId: string, notes: string) => Promise<void>;
    updateBookingImages: (bookingId: string, beforeImages: string[], afterImages: string[]) => Promise<void>;
    addCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer | null>;
    updateCustomer: (updatedCustomer: Customer) => Promise<void>;
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
    addTask: (task: Omit<Task, 'id'>) => Promise<void>;
    updateTask: (updatedTask: Task) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
    deleteMultipleTasks: (taskIds: string[]) => Promise<void>;
    updateMultipleTasksStatus: (taskIds: string[], isComplete: boolean) => Promise<void>;
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
    useEffect(() => {
        const loadData = () => {
            try {
                const storedData = localStorage.getItem(DB_STORAGE_KEY);
                if (storedData) {
                    console.log("Loading database from localStorage...");
                    setDb(JSON.parse(storedData));
                } else {
                    console.log("Initializing database from seed data...");
                    const seedData = getSeedData();
                    setDb(seedData);
                }
            } catch (error) {
                console.error("Failed to load data from localStorage, falling back to seed data.", error);
                const seedData = getSeedData();
                setDb(seedData);
            } finally {
                setLoading(false);
            }
        };
        const timer = setTimeout(loadData, 500); // Simulate a short loading delay
        return () => clearTimeout(timer);
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

    // --- Service Operations ---
    const addService = async (service: Omit<Service, 'id'>) => {
        const newService = { ...service, id: `s-${Date.now()}` };
        setDb(prevDb => prevDb ? { ...prevDb, services: [...prevDb.services, newService] } : null);
    };
    const updateService = async (updatedService: Service) => {
        setDb(prevDb => prevDb ? { ...prevDb, services: prevDb.services.map(s => s.id === updatedService.id ? updatedService : s) } : null);
    };
    const deleteService = async (serviceId: string) => {
        setDb(prevDb => prevDb ? { ...prevDb, services: prevDb.services.filter(s => s.id !== serviceId) } : null);
    };

    // --- Part Operations ---
    const addPart = async (part: Omit<Part, 'id'>) => {
        const newPart = { ...part, id: `p-${Date.now()}` };
        setDb(prevDb => prevDb ? { ...prevDb, parts: [...prevDb.parts, newPart] } : null);
    };
    const updatePart = async (updatedPart: Part) => {
        setDb(prevDb => prevDb ? { ...prevDb, parts: prevDb.parts.map(p => p.id === updatedPart.id ? updatedPart : p) } : null);
    };
    const deletePart = async (partId: string) => {
        setDb(prevDb => prevDb ? { ...prevDb, parts: prevDb.parts.filter(p => p.id !== partId) } : null);
    };

    // --- Mechanic Operations ---
    const addMechanic = async (mechanic: Omit<Mechanic, 'id'>) => {
        const newMechanic = { ...mechanic, id: `m-${Date.now()}` };
        setDb(prevDb => prevDb ? { ...prevDb, mechanics: [...prevDb.mechanics, newMechanic] } : null);
    };
    const updateMechanic = async (updatedMechanic: Mechanic) => {
        setDb(prevDb => prevDb ? { ...prevDb, mechanics: prevDb.mechanics.map(m => m.id === updatedMechanic.id ? updatedMechanic : m) } : null);
    };
    const deleteMechanic = async (mechanicId: string) => {
        setDb(prevDb => prevDb ? { ...prevDb, mechanics: prevDb.mechanics.filter(m => m.id !== mechanicId) } : null);
    };
    const updateMechanicStatus = async (mechanicId: string, status: 'Active' | 'Inactive' | 'Pending') => {
        setDb(prevDb => prevDb ? { ...prevDb, mechanics: prevDb.mechanics.map(m => m.id === mechanicId ? { ...m, status } : m) } : null);
    };

    // --- Booking Operations ---
    const addBooking = async (booking: Omit<Booking, 'id'>): Promise<Booking | null> => {
        const newBooking = { ...booking, id: `b-${Date.now()}` } as Booking;
        setDb(prevDb => prevDb ? { ...prevDb, bookings: [...prevDb.bookings, newBooking] } : null);
        return newBooking;
    };
    const updateBookingStatus = async (bookingId: string, status: BookingStatus) => {
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
        setDb(prevDb => prevDb ? { ...prevDb, bookings: prevDb.bookings.map(b => b.id === bookingId ? { ...b, status: 'Cancelled', cancellationReason: reason } : b) } : null);
    };
    const acceptJobRequest = async (bookingId: string, mechanic: Mechanic) => {
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
        setDb(prevDb => {
            if (!prevDb) return null;
            return {
                ...prevDb,
                bookings: prevDb.bookings.map(b => b.id === bookingId ? { ...b, notes } : b)
            };
        });
    };

    const updateBookingImages = async (bookingId: string, beforeImages: string[], afterImages: string[]) => {
        setDb(prevDb => {
            if (!prevDb) return null;
            return {
                ...prevDb,
                bookings: prevDb.bookings.map(b => b.id === bookingId ? { ...b, beforeImages, afterImages } : b)
            };
        });
    };

    // --- Customer Operations ---
    const addCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer | null> => {
        const newCustomer = { ...customer, id: `c-${Date.now()}` };
        setDb(prevDb => prevDb ? { ...prevDb, customers: [...prevDb.customers, newCustomer] } : null);
        return newCustomer;
    };
    const updateCustomer = async (updatedCustomer: Customer) => {
        setDb(prevDb => prevDb ? { ...prevDb, customers: prevDb.customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c) } : null);
    };
    const deleteCustomer = async (customerId: string) => {
        setDb(prevDb => prevDb ? { ...prevDb, customers: prevDb.customers.filter(c => c.id !== customerId) } : null);
    };
    const deleteVehicleFromCustomer = async (customerId: string, plateNumber: string) => {
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
        setDb(prevDb => prevDb ? { ...prevDb, settings: { ...prevDb.settings, ...newSettings } } : null);
    };
    
    // --- Review Operations ---
    const addReviewToMechanic = async (mechanicId: string, bookingId: string, reviewData: { rating: number, comment: string }, customerName: string) => {
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
        const newBanner = { ...banner, id: `banner-${Date.now()}` };
        setDb(prevDb => prevDb ? { ...prevDb, banners: [...prevDb.banners, newBanner] } : null);
    };
    const updateBanner = async (updatedBanner: Banner) => {
        setDb(prevDb => prevDb ? { ...prevDb, banners: prevDb.banners.map(b => b.id === updatedBanner.id ? updatedBanner : b) } : null);
    };
    const deleteBanner = async (bannerId: string) => {
        setDb(prevDb => prevDb ? { ...prevDb, banners: prevDb.banners.filter(b => b.id !== bannerId) } : null);
    };

    // --- Admin User & Role Operations ---
    const addRole = async (role: Omit<Role, 'isEditable'>) => {
        const newRole: Role = { ...role, isEditable: true };
        setDb(prevDb => {
            if (!prevDb) return null;
            if (prevDb.roles.some(r => r.name.toLowerCase() === newRole.name.toLowerCase())) {
                throw new Error("A role with this name already exists.");
            }
            return { ...prevDb, roles: [...prevDb.roles, newRole] };
        });
    };
    const updateRole = async (updatedRole: Role) => {
        setDb(prevDb => {
            if (!prevDb) return null;
            return { ...prevDb, roles: prevDb.roles.map(r => r.name === updatedRole.name ? updatedRole : r) };
        });
    };
    const deleteRole = async (roleName: string) => {
        setDb(prevDb => {
            if (!prevDb) return null;
            const roleInUse = prevDb.adminUsers.some(u => u.role === roleName);
            if (roleInUse) {
                throw new Error("Cannot delete role. It is currently assigned to one or more users.");
            }
            return { ...prevDb, roles: prevDb.roles.filter(r => r.name !== roleName) };
        });
    };
    const addAdminUser = async (user: Omit<AdminUser, 'id'>) => {
        const newUser = { ...user, id: `au-${Date.now()}` };
        setDb(prevDb => prevDb ? { ...prevDb, adminUsers: [...prevDb.adminUsers, newUser] } : null);
    };
    const updateAdminUser = async (updatedUser: AdminUser) => {
        setDb(prevDb => prevDb ? { ...prevDb, adminUsers: prevDb.adminUsers.map(u => u.id === updatedUser.id ? updatedUser : u) } : null);
    };
    const deleteAdminUser = async (userId: string) => {
        setDb(prevDb => prevDb ? { ...prevDb, adminUsers: prevDb.adminUsers.filter(u => u.id !== userId) } : null);
    };

    // --- Task Operations ---
    const addTask = async (task: Omit<Task, 'id'>) => {
        const newTask = { ...task, id: `task-${Date.now()}` };
        setDb(prevDb => prevDb ? { ...prevDb, tasks: [...(prevDb.tasks || []), newTask] } : null);
    };
    const updateTask = async (updatedTask: Task) => {
        setDb(prevDb => prevDb ? { ...prevDb, tasks: (prevDb.tasks || []).map(t => t.id === updatedTask.id ? updatedTask : t) } : null);
    };
    const deleteTask = async (taskId: string) => {
        setDb(prevDb => prevDb ? { ...prevDb, tasks: (prevDb.tasks || []).filter(t => t.id !== taskId) } : null);
    };
    const deleteMultipleTasks = async (taskIds: string[]) => {
        const idSet = new Set(taskIds);
        setDb(prevDb => prevDb ? { ...prevDb, tasks: (prevDb.tasks || []).filter(t => !idSet.has(t.id)) } : null);
    };
    const updateMultipleTasksStatus = async (taskIds: string[], isComplete: boolean) => {
        const idSet = new Set(taskIds);
        setDb(prevDb => prevDb ? {
            ...prevDb,
            tasks: (prevDb.tasks || []).map(t => idSet.has(t.id) ? { ...t, isComplete } : t)
        } : null);
    };


    const value = {
        db, loading, addService, updateService, deleteService, addPart, updatePart, deletePart, addMechanic, updateMechanic, deleteMechanic,
        updateMechanicStatus, addBooking, updateBookingStatus, cancelBooking, acceptJobRequest, updateBookingNotes, updateBookingImages, addCustomer, updateCustomer, deleteCustomer, deleteVehicleFromCustomer,
        addOrder, updateOrderStatus, updateSettings, addReviewToMechanic, addBanner, updateBanner, deleteBanner,
        addAdminUser, updateAdminUser, deleteAdminUser, addRole, updateRole, deleteRole,
        addTask, updateTask, deleteTask, deleteMultipleTasks, updateMultipleTasksStatus
    };

    return (
        <DatabaseContext.Provider value={value}>
            {children}
        </DatabaseContext.Provider>
    );
};