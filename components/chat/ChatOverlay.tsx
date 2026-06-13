import React from 'react';
import { useChatNotification } from '../../context/ChatNotificationContext';
import { useDatabase } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import CustomerMechanicChatModal from '../customer/CustomerMechanicChatModal';
import MechanicCustomerChatModal from '../mechanic/MechanicCustomerChatModal';

const ChatOverlay: React.FC = () => {
    const { openChatIds, removeOpenChat } = useChatNotification();
    const { db } = useDatabase();
    const { user, isAuthenticated } = useAuth();
    const { mechanic, isMechanicAuthenticated } = useMechanicAuth();

    if (!db || openChatIds.size === 0) return null;

    return (
        <>
            {Array.from(openChatIds).map(bookingId => {
                const booking = db.bookings?.find(b => b.id === bookingId);
                if (!booking) return null;

                // Scenario 1: User is Customer
                if (isAuthenticated && user) {
                    // Start: Validate mapping
                    const assignedMechanic = booking.mechanic; // Mechanics are stored in booking object usually
                    if (!assignedMechanic) return null; // Can't chat if no mechanic

                    return (
                        <div key={bookingId} style={{ position: 'relative', zIndex: 9999 }}>
                            <CustomerMechanicChatModal
                                booking={booking}
                                customer={user}
                                mechanic={assignedMechanic}
                                onClose={() => removeOpenChat(bookingId)}
                            />
                        </div>
                    );
                }

                // Scenario 2: User is Mechanic
                if (isMechanicAuthenticated && mechanic) {
                    const customer = db.customers?.find(c => c.name === booking.customerName); // Fallback lookup
                    // Note: booking usually has customer info embedded or we lookup
                    // If booking.customer is available use it, else lookup
                    const customerData = customer || {
                        id: 'unknown',
                        name: booking.customerName,
                        email: 'N/A',
                        phone: booking.contactNumber || 'N/A'
                    };

                    return (
                        <div key={bookingId} style={{ position: 'relative', zIndex: 9999 }}>
                            <MechanicCustomerChatModal
                                booking={booking}
                                customer={customerData as any}
                                mechanic={mechanic}
                                onClose={() => removeOpenChat(bookingId)}
                            />
                        </div>
                    );
                }

                return null;
            })}
        </>
    );
};

export default ChatOverlay;
