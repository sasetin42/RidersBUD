import React from 'react';
import { TourStep } from '../components/TourOverlay';
import { Wrench, Search, Calendar, MessageSquare, CreditCard, LayoutDashboard, Briefcase, Users, BarChart3, DollarSign, Star, Bell } from 'lucide-react';

export const customerTourSteps: TourStep[] = [
    {
        title: 'Welcome to RidersBUD!',
        description: 'Your one-stop roadside assistance and vehicle service app. Let us walk you through how everything works in just a few steps.',
        icon: <Star size={32} />,
        color: 'from-orange-500 to-rose-500'
    },
    {
        title: 'Browse Services',
        description: 'Explore our wide range of services from basic repairs to emergency roadside assistance. Each service shows pricing, estimated time, and what\'s included — no surprises.',
        icon: <Search size={32} />,
        color: 'from-blue-500 to-cyan-500'
    },
    {
        title: 'Book a Mechanic',
        description: 'Pick a service, choose your preferred date and time, tell us about your vehicle, and we\'ll match you with the best available mechanic in your area.',
        icon: <Calendar size={32} />,
        color: 'from-purple-500 to-pink-500'
    },
    {
        title: 'Track in Real-Time',
        description: 'Watch your booking come to life! Get notified when a mechanic is assigned, see them en route on the map, and follow the work progress every step of the way.',
        icon: <LayoutDashboard size={32} />,
        color: 'from-green-500 to-teal-500'
    },
    {
        title: 'Chat & Communicate',
        description: 'Need to ask something? Use the built-in chat to message your mechanic directly. You can also reach our support team anytime for help.',
        icon: <MessageSquare size={32} />,
        color: 'from-indigo-500 to-violet-500'
    },
    {
        title: 'Pay & Review',
        description: 'Pay securely through GCash or cash upon completion. Rate your experience and leave a review to help other riders make informed choices.',
        icon: <CreditCard size={32} />,
        color: 'from-emerald-500 to-lime-500'
    },
    {
        title: 'You\'re All Set!',
        description: 'That\'s it! You\'re ready to use RidersBUD. Head over to the home screen to book your first service or explore the app at your own pace.',
        icon: <Bell size={32} />,
        color: 'from-amber-500 to-orange-500'
    }
];

export const mechanicTourSteps: TourStep[] = [
    {
        title: 'Welcome, Mechanic Partner!',
        description: 'Welcome to RidersBUD! This quick tour will show you how to receive jobs, communicate with customers, and manage your earnings — all in one place.',
        icon: <Wrench size={32} />,
        color: 'from-orange-500 to-rose-500'
    },
    {
        title: 'Your Dashboard',
        description: 'Your command center. See available jobs, active bookings, and quick stats at a glance. Toggle your online status to start receiving job requests.',
        icon: <LayoutDashboard size={32} />,
        color: 'from-blue-500 to-cyan-500'
    },
    {
        title: 'Receive & Manage Jobs',
        description: 'When a customer books a service, you\'ll see it on your dashboard. Accept jobs, update status (En Route, In Progress, Work Done), and keep customers informed.',
        icon: <Briefcase size={32} />,
        color: 'from-purple-500 to-pink-500'
    },
    {
        title: 'Talk to Customers',
        description: 'Use the chat feature to message customers directly. Share updates, ask questions, or send your location — all in real-time.',
        icon: <MessageSquare size={32} />,
        color: 'from-green-500 to-teal-500'
    },
    {
        title: 'Track Your Earnings',
        description: 'Keep tabs on your income. View completed jobs, track your wallet balance, and request payouts when you\'re ready. All your financials in one dashboard.',
        icon: <DollarSign size={32} />,
        color: 'from-indigo-500 to-violet-500'
    },
    {
        title: 'Profile & Ratings',
        description: 'Your reputation matters. Complete your profile with certifications and photos to attract more customers. Great ratings mean more jobs!',
        icon: <Users size={32} />,
        color: 'from-emerald-500 to-lime-500'
    },
    {
        title: 'You\'re Ready to Go!',
        description: 'That\'s all you need to know! Flip your status to Online and start receiving job requests. Our support team is always here if you need help.',
        icon: <BarChart3 size={32} />,
        color: 'from-amber-500 to-orange-500'
    }
];
