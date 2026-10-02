import React, { useEffect, useState, useCallback } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { useMechanicAuth } from '../../context/MechanicAuthContext';
import { Booking } from '../../types';
import AssignedJobNotificationModal from './AssignedJobNotificationModal';

export const GlobalMechanicJobListener: React.FC = () => {
    const { db } = useDatabase();
    const { mechanic } = useMechanicAuth();
    const [newAssignedJob, setNewAssignedJob] = useState<Booking | null>(null);

    const isBookingApprovedForMechanicView = useCallback((booking: Booking) => {
        const modules = db?.settings?.modules;
        if (modules) {
            const services = booking.services || (booking.service ? [booking.service] : []);
            for (const s of services) {
                const nameLower = (s.name || '').toLowerCase();
                const catLower = (s.category || '').toLowerCase();
                
                if (nameLower.includes('rent a car') || catLower.includes('rentals') || catLower.includes('rent a car')) {
                    if (modules.find(m => m.id === 'rent-a-car')?.enabled === false) return false;
                }
                if (nameLower.includes('driver for hire') || catLower.includes('driver')) {
                    if (modules.find(m => m.id === 'driver-for-hire')?.enabled === false) return false;
                }
                if (nameLower.includes('registration') || nameLower.includes('liaison') || catLower.includes('liaison') || catLower.includes('registration')) {
                    if (modules.find(m => m.id === 'liaison-assistance')?.enabled === false) return false;
                }
                if (nameLower.includes('towing') || catLower.includes('towing')) {
                    if (modules.find(m => m.id === 'towing')?.enabled === false) return false;
                }
            }
        }

        const paymentMethod = (booking.paymentMethod || '').toLowerCase();
        const isGCashBooking = paymentMethod === 'gcash' || !!booking.gcashReceiptUrl || !!booking.gcashPaymentStatus;
        const isHitPayBooking = paymentMethod.includes('hitpay') || paymentMethod.includes('online') || !!booking.hitpayReference || !!booking.hitpayPaymentRequestId;

        if (isGCashBooking) {
            return booking.isVerified === true || booking.gcashPaymentStatus === 'verified';
        }

        if (isHitPayBooking) {
            return booking.isVerified === true || booking.hitpayStatus === 'completed' || booking.paymentStatus === 'downpayment_paid' || booking.paymentStatus === 'partial' || booking.isPaid === true || ((booking.paidAmount || 0) > 0);
        }

        return booking.isVerified === true || booking.isPaid === true || booking.paymentStatus === 'paid' || booking.paymentStatus === 'downpayment_paid' || booking.paymentStatus === 'partial';
    }, [db?.settings?.modules]);

    useEffect(() => {
        if (!mechanic || !db?.bookings) return;

        const sessionNotifiedKey = `notifiedBookings_${mechanic.id}`;
        const notifiedBookingIds: Set<string> = new Set(
            JSON.parse(sessionStorage.getItem(sessionNotifiedKey) || '[]')
        );

        const myUnseenBookings = db.bookings.filter(b =>
            (b.mechanic?.id === mechanic.id || b.mechanicId === mechanic.id) &&
            isBookingApprovedForMechanicView(b) &&
            b.status !== 'Completed' &&
            b.status !== 'Cancelled' &&
            b.status !== 'Work Done' &&
            !notifiedBookingIds.has(b.id)
        );

        if (myUnseenBookings.length > 0) {
            const newestUnseenBooking = myUnseenBookings.sort((a, b) => b.id.localeCompare(a.id))[0];
            if (newestUnseenBooking.id !== newAssignedJob?.id) {
                setNewAssignedJob(newestUnseenBooking);
                
                // Play subtle chime sound & vibrate for mobile mechanic awareness
                try {
                    if (typeof window !== 'undefined' && 'AudioContext' in window) {
                        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                        const ctx = new AudioCtx();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
                        gain.gain.setValueAtTime(0.2, ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.4);
                    }
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                        navigator.vibrate([100, 50, 100]);
                    }
                } catch (_) {
                    // Audio context might be restricted before interaction; safe fallback
                }
            }

            myUnseenBookings.forEach(b => notifiedBookingIds.add(b.id));
            sessionStorage.setItem(sessionNotifiedKey, JSON.stringify(Array.from(notifiedBookingIds)));
        }
    }, [db?.bookings, mechanic, newAssignedJob, isBookingApprovedForMechanicView]);

    // Keep the displayed booking updated in REAL-TIME with live data details (payment status, notes, timestamps, etc.)
    const liveBooking = React.useMemo(() => {
        if (!newAssignedJob || !db?.bookings) return newAssignedJob;
        const fresh = db.bookings.find(b => b.id === newAssignedJob.id);
        return fresh || newAssignedJob;
    }, [db?.bookings, newAssignedJob]);

    if (!liveBooking) return null;

    return (
        <AssignedJobNotificationModal
            booking={liveBooking}
            onClose={() => setNewAssignedJob(null)}
        />
    );
};

export default GlobalMechanicJobListener;
