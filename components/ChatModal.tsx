import React, { useState, useEffect, useRef } from 'react';
import { Service } from '../types';
import { GoogleGenAI, Chat } from '@google/genai';
import Spinner from './Spinner';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { useMechanicAuth } from '../context/MechanicAuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAdminOnlineStatus } from '../hooks/usePresence';
import { compressAndEncodeImage } from '../utils/fileUtils';
import { optimizeImageToWebP } from '../utils/imageOptimizer';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Paperclip, FileText, Trash2, MapPin, Phone, Search, Download, CheckCircle, RefreshCw, Star, Send, MoreHorizontal, CornerUpLeft, ArrowLeft, Calendar } from 'lucide-react';
import Tooltip from './ui/Tooltip';
import { db as firestoreDB } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';



interface Message {
    id?: string;
    sender: 'user' | 'ai' | 'admin';
    text: string;
    timestamp?: any;
    attachment?: {
        type: 'image' | 'file';
        content: string; // Base64 or URL
        name: string;
    };
    attachments?: Array<{
        type: 'image' | 'file';
        content: string; // Base64 or URL
        name: string;
    }>;
    senderName?: string;
    senderAvatar?: string;
    replyTo?: {
        id?: string;
        text: string;
        sender: 'user' | 'ai' | 'admin';
        senderName?: string;
    };
}

interface ChatModalProps {
    service: Service;
    onClose: () => void;
    mode?: 'ai' | 'admin'; // mode prop
}

const ChatModal: React.FC<ChatModalProps> = ({ service, onClose, mode = 'ai' }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(mode === 'ai'); // Only load initially if AI
    const [chat, setChat] = useState<Chat | null>(null);
    const [attachments, setAttachments] = useState<Array<{ type: 'image' | 'file'; content: string; name: string }>>([]);
    const [isCompressing, setIsCompressing] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [chatSession, setChatSession] = useState<any>(null);
    const [isSessionLoaded, setIsSessionLoaded] = useState(false);
    
    // UI states
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showServiceSelection, setShowServiceSelection] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    
    // Satisfaction Survey States
    const [hasCheckedFeedback, setHasCheckedFeedback] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
                setShowServiceSelection(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { db } = useDatabase();
    const { user } = useAuth(); // Need user for admin chat
    const { mechanic } = useMechanicAuth();
    const { adminUser } = useAdminAuth();

    const adminsOnline = useAdminOnlineStatus();

    const currentUser = user ? {
        id: user.id,
        name: user.name,
        email: user.email || 'No Email',
        photoUrl: user.picture || user.photoUrl || null,
        userType: 'customer' as const
    } : mechanic ? {
        id: mechanic.id,
        name: mechanic.name,
        email: mechanic.email || 'No Email',
        photoUrl: mechanic.profilePicture || mechanic.picture || null,
        userType: 'mechanic' as const
    } : adminUser ? {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email || 'No Email',
        photoUrl: adminUser.avatar || null,
        userType: 'admin' as const
    } : null;

    const userSpecialServices = React.useMemo(() => {
        const list: any[] = [];
        if (!db || !currentUser) return list;

        // 1. Liaison Bookings
        const liaisonBookings = db.liaisonBookings?.filter(b => b.customerId === currentUser.id && ['Booking Received', 'Processing', 'Assigned'].includes(b.status)) || [];
        liaisonBookings.forEach(b => {
            list.push({
                id: b.id,
                title: `LTO Liaison (${b.serviceType})`,
                details: `Date: ${b.appointmentDate} · Time: ${b.appointmentTime}\nVehicle: ${b.vehicleDetails ? `${b.vehicleDetails.year} ${b.vehicleDetails.brand} ${b.vehicleDetails.model} (${b.vehicleDetails.plateNumber})` : 'Unprovided'}\nAgent: ${b.liaisonName || 'Unassigned'}\nBranch: ${b.branchName || 'Unprovided'}\nPayment: ${b.paymentStatus || 'Pending'}`
            });
        });

        // 2. Rent a Car Bookings
        const rentalBookings = db.rentalBookings?.filter(b => b.customerId === currentUser.id && ['Approved', 'Pending', 'Received'].includes(b.status || '')) || [];
        rentalBookings.forEach(b => {
            const car = db.rentalCars?.find(c => c.id === b.carId);
            const carName = car ? `${car.brand} ${car.model}` : 'Car Rental';
            list.push({
                id: b.id,
                title: `Rent a Car: ${carName}`,
                details: `Period: ${b.startDate} to ${b.endDate}\nTotal: ₱${b.totalPrice.toLocaleString()}\nStatus: ${b.status || 'Received'}`
            });
        });

        // 3. Driver & Towing Requests
        const serviceRequests = db.serviceRequests?.filter(req => req.customerId === currentUser.id && ['Pending', 'In Progress', 'Assigned'].includes(req.status)) || [];
        serviceRequests.forEach(req => {
            const name = req.serviceName || 'Special Service';
            const isTarget = ['Towing', 'Driver for Hire', 'Driver for hire'].some(t => name.toLowerCase().includes(t.toLowerCase()));
            if (isTarget) {
                list.push({
                    id: req.id,
                    title: name,
                    details: `Date: ${req.scheduledDate || req.createdAt.split('T')[0]}\nNotes: ${req.notes || 'No notes'}\nStatus: ${req.status}`
                });
            }
        });

        return list;
    }, [db, currentUser]);

    // --- AI Logic ---
    useEffect(() => {
        if (!db || mode !== 'ai') return;

        const allServicesInfo = db.services
            .map(s => `- ${s.name}: ${s.description} (Price: ₱${s.price}, Time: ${s.estimatedTime})`)
            .join('\n');

        const initializeChat = async () => {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                const newChat = ai.chats.create({
                    model: 'gemini-2.0-flash-exp',
                    config: {
                        systemInstruction: `You are ${db.settings.virtualMechanicName || 'RiderAI'}, an expert and friendly AI mechanic for Riders. 
                        Your knowledge base consists of all the services we offer. Here is the full list:
                        ${allServicesInfo}
                        
                        A customer is currently looking at the "${service.name}" service.
                        - Initial Service Details:
                        - Name: ${service.name}
                        - Description: ${service.description}
                        - Price: ₱${service.price.toFixed(2)}
                        - Estimated Time: ${service.estimatedTime}

                        Your primary role is to answer their questions about this specific service, but you must also be prepared to answer questions about any other service from the list. Be helpful, professional, and keep your answers precise and easy to understand.
                        
                        Start the conversation by greeting the user and asking how you can help them with the "${service.name}" service.`,
                    }
                });

                setChat(newChat);

                const initialResponseStream = await newChat.sendMessageStream({ message: "Hello" });

                let fullText = "";
                setMessages([{ sender: 'ai', text: "" }]);

                for await (const chunk of initialResponseStream) {
                    fullText += chunk.text;
                    setMessages([{ sender: 'ai', text: fullText }]);
                }
            } catch (error) {
                console.error("Failed to initialize chat:", error);
                setMessages([{ sender: 'ai', text: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
            } finally {
                setIsLoading(false);
            }
        };

        initializeChat();
    }, [service, db, mode]);

    // --- Admin/Realtime Logic ---
    // 1. Listen to Chat Session Document
    useEffect(() => {
        if (mode !== 'admin' || !currentUser) return;

        // Mark as read by user when opening chat
        setDoc(doc(firestoreDB, 'support_chats', currentUser.id), { unreadByUser: false }, { merge: true }).catch(() => {});

        const chatDocRef = doc(firestoreDB, 'support_chats', currentUser.id);
        const unsubscribeDoc = onSnapshot(chatDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setChatSession(data);
            } else {
                setChatSession(null);
            }
            setIsSessionLoaded(true);
        });

        return () => {
            try { unsubscribeDoc(); } catch (_) {}
        };
    }, [mode, currentUser?.id]);

    // 2. Listen to Chat Messages with startedAt dependency
    useEffect(() => {
        if (mode !== 'admin' || !currentUser) return;

        const messagesRef = collection(firestoreDB, 'support_chats', currentUser.id, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const startedAt = chatSession?.startedAt;

        const unsubscribeMessages = onSnapshot(q, (snapshot) => {
            let msgs: Message[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));

            // Client-side filtering to achieve a clean slate "fresh start"
            if (startedAt) {
                let startLimit = startedAt.seconds 
                    ? startedAt.seconds * 1000 
                    : (typeof startedAt.toDate === 'function' ? startedAt.toDate().getTime() : new Date(startedAt).getTime());
                
                if (isNaN(startLimit)) {
                    startLimit = 0; // Fallback to 0 (no filtering) if timestamp is pending server resolution
                }

                msgs = msgs.filter(m => {
                    if (!m.timestamp) return true; // keep optimistic/sending messages
                    let mTime = m.timestamp.seconds 
                        ? m.timestamp.seconds * 1000 
                        : (typeof m.timestamp.toDate === 'function' ? m.timestamp.toDate().getTime() : new Date(m.timestamp).getTime());
                    
                    if (isNaN(mTime)) return true; // Keep message if timestamp is pending
                    return mTime >= startLimit;
                });
            }

            setMessages(msgs);
            setIsLoading(false);

            // Also mark as read when new messages arrive if chat is open
            if (msgs.length > 0) {
                setDoc(doc(firestoreDB, 'support_chats', currentUser.id), { unreadByUser: false }, { merge: true }).catch(() => {});
            }
        });

        return () => {
            try { unsubscribeMessages(); } catch (_) {}
        };
    }, [mode, currentUser?.id, chatSession?.startedAt]);

    const handleStartNewChat = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const now = new Date();
            const chatDocRef = doc(firestoreDB, 'support_chats', currentUser.id);

            // Set startedAt and status to active
            await setDoc(chatDocRef, {
                userId: currentUser.id,
                userName: currentUser.name || 'Unknown User',
                userEmail: currentUser.email || 'No Email',
                userAvatar: currentUser.photoUrl || null,
                userType: currentUser.userType,
                status: 'active',
                startedAt: serverTimestamp(),
                completedAt: null,
                lastMessage: 'Hello! How can we assist you today?',
                lastTimestamp: serverTimestamp(),
                unread: true,
                unreadByUser: false
            }, { merge: true });

            // Add the welcome message from the support assistant
            await addDoc(collection(firestoreDB, 'support_chats', currentUser.id, 'messages'), {
                sender: 'admin',
                text: 'Hello! How can we assist you today?',
                timestamp: serverTimestamp()
            });

            // Set state immediately to show a fresh, active screen
            setChatSession({
                status: 'active',
                startedAt: now
            });
            setMessages([]);

        } catch (error) {
            console.error("Error starting new chat:", error);
            alert("Failed to start a new chat. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Check if feedback is already submitted for this specific completed session
    useEffect(() => {
        if (chatSession?.status === 'completed' && chatSession?.startedAt && currentUser) {
            const startedAtTime = chatSession.startedAt.seconds 
                ? chatSession.startedAt.seconds * 1000 
                : (typeof chatSession.startedAt.toDate === 'function' ? chatSession.startedAt.toDate().getTime() : new Date(chatSession.startedAt).getTime());
            
            if (!isNaN(startedAtTime) && startedAtTime > 0) {
                const feedbackId = `${currentUser.id}_${startedAtTime}`;
                getDoc(doc(firestoreDB, 'support_satisfaction', feedbackId)).then(docSnap => {
                    if (docSnap.exists()) {
                        setFeedbackSubmitted(true);
                    } else {
                        setFeedbackSubmitted(false);
                    }
                    setHasCheckedFeedback(true);
                }).catch(() => {
                    setHasCheckedFeedback(true);
                });
            } else {
                setHasCheckedFeedback(true);
            }
        } else {
            setFeedbackSubmitted(false);
            setHasCheckedFeedback(false);
            setRating(0);
            setComment('');
        }
    }, [chatSession?.status, chatSession?.startedAt, currentUser?.id]);

    const handleSubmitFeedback = async () => {
        if (rating === 0 || !currentUser || !chatSession?.startedAt) return;
        setIsSubmittingFeedback(true);
        try {
            const startedAtTime = chatSession.startedAt.seconds 
                ? chatSession.startedAt.seconds * 1000 
                : (typeof chatSession.startedAt.toDate === 'function' ? chatSession.startedAt.toDate().getTime() : new Date(chatSession.startedAt).getTime());
            
            const feedbackId = `${currentUser.id}_${startedAtTime}`;
            
            await setDoc(doc(firestoreDB, 'support_satisfaction', feedbackId), {
                feedbackId,
                userId: currentUser.id,
                userName: currentUser.name,
                userType: currentUser.userType,
                userEmail: currentUser.email,
                userAvatar: currentUser.photoUrl,
                rating,
                comment,
                chatSessionId: currentUser.id,
                chatStartedAt: chatSession.startedAt,
                chatCompletedAt: chatSession.completedAt || serverTimestamp(),
                submittedAt: serverTimestamp()
            });

            setFeedbackSubmitted(true);
        } catch (error: any) {
            console.error("Error submitting feedback:", error);
            const errorStr = String(error).toLowerCase();
            if (errorStr.includes('blocked') || errorStr.includes('extension') || errorStr.includes('network') || !navigator.onLine) {
                alert("Failed to submit feedback. An ad blocker, Brave Shield, or privacy extension appears to be blocking the connection to the database. Please temporarily disable it to confirm your feedback.");
            } else {
                alert("Failed to submit feedback. Please check your internet connection and try again.");
            }
        } finally {
            setIsSubmittingFeedback(false);
        }
    };


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        if (!files.length) return;

        setIsCompressing(true);
        const newAttachments: Array<{ type: 'image' | 'file'; content: string; name: string }> = [];

        try {
            for (const file of files) {
                if (file.size > 3 * 1024 * 1024) {
                    alert(`Caution: The file "${file.name}" exceeds the maximum upload capacity of 3MB and will not be attached.`);
                    continue;
                }

                if (file.type.startsWith('image/')) {
                    const base64 = await optimizeImageToWebP(file, 1920, 0.8);
                    newAttachments.push({
                        type: 'image',
                        content: base64,
                        name: file.name.replace(/\.[^/.]+$/, "") + ".webp"
                    });
                } else {
                    const reader = new FileReader();
                    const base64 = await new Promise<string>((resolve, reject) => {
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = () => reject(new Error('Failed to read file'));
                        reader.readAsDataURL(file);
                    });
                    newAttachments.push({
                        type: 'file',
                        content: base64,
                        name: file.name
                    });
                }
            }
            if (newAttachments.length > 0) {
                setAttachments(prev => [...prev, ...newAttachments]);
            }
        } catch (error) {
            console.error("File processing error:", error);
            alert("Failed to process one or more files. Please try again.");
        } finally {
            setIsCompressing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleShareLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Create a standard Google Maps link
                const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

                // Directly send the message as text
                const userText = mapsLink;

                // Optimistic update so location appears immediately in both modes
                setMessages(prev => [...prev, { sender: 'user', text: userText }]);
                if (mode === 'ai') {
                    setIsLoading(true);
                    setMessages(prev => [...prev, { sender: 'ai', text: "" }]);
                }

                if (mode === 'admin' && currentUser) {
                    const messageData = {
                        sender: 'user',
                        text: userText,
                        attachment: null,
                        timestamp: serverTimestamp()
                    };

                    addDoc(collection(firestoreDB, 'support_chats', currentUser.id, 'messages'), messageData).catch(() => {});

                    const isNewSession = isSessionLoaded && (!chatSession || chatSession.status !== 'active');

                    setDoc(doc(firestoreDB, 'support_chats', currentUser.id), {
                        userId: currentUser.id,
                        userName: currentUser.name || 'Unknown User',
                        userEmail: currentUser.email || 'No Email',
                        userAvatar: currentUser.photoUrl || null,
                        lastMessage: '📍 Shared Location',
                        lastTimestamp: serverTimestamp(),
                        unread: true,
                        userType: currentUser.userType || 'customer',
                        ...(isNewSession ? {
                            status: 'active',
                            startedAt: serverTimestamp(),
                            completedAt: null
                        } : {
                            status: chatSession?.status || 'active',
                            lastUpdatedAt: serverTimestamp()
                        })
                    }, { merge: true }).catch(() => {});
                }
            },
            (error) => {
            }
        );
    };

    const shareSpecialServiceToChat = async (bookingText: string) => {
        if (!currentUser) return;

        // Optimistic update so message appears immediately in both modes
        setMessages(prev => [...prev, { sender: 'user', text: bookingText }]);
        if (mode === 'ai') {
            setIsLoading(true);
            setMessages(prev => [...prev, { sender: 'ai', text: "" }]);
        }

        try {
            if (mode === 'admin') {
                const messageData = {
                    sender: 'user',
                    text: bookingText,
                    timestamp: serverTimestamp()
                };

                await addDoc(collection(firestoreDB, 'support_chats', currentUser.id, 'messages'), messageData).catch(() => {});

                const isNewSession = isSessionLoaded && (!chatSession || chatSession.status !== 'active');

                await setDoc(doc(firestoreDB, 'support_chats', currentUser.id), {
                    userId: currentUser.id,
                    userName: currentUser.name || 'Unknown User',
                    userEmail: currentUser.email || 'No Email',
                    userAvatar: currentUser.photoUrl || null,
                    lastMessage: bookingText,
                    lastTimestamp: serverTimestamp(),
                    unread: true,
                    userType: currentUser.userType || 'customer',
                    ...(isNewSession ? {
                        status: 'active',
                        startedAt: serverTimestamp(),
                        completedAt: null
                    } : {
                        status: chatSession?.status || 'active',
                        lastUpdatedAt: serverTimestamp()
                    })
                }, { merge: true }).catch(() => {});
            } else if (mode === 'ai' && chat) {
                const responseStream = await chat.sendMessageStream([{ text: bookingText }]);

                let fullText = "";
                for await (const chunk of responseStream) {
                    fullText += chunk.text;
                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1] = { sender: 'ai', text: fullText };
                        return newMessages;
                    });
                }
            }
        } catch (error) {
            console.error("Error sharing service details:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && attachments.length === 0) || isLoading) return; 
        if (mode === 'ai' && !chat) return; 

        const userText = input;
        const currentAttachments = [...attachments];
        const currentReply = replyingTo;

        setInput('');
        setAttachments([]);
        setReplyingTo(null);

        // Optimistic update for both modes so messages appear immediately
        setMessages(prev => [...prev, {
            sender: 'user',
            text: userText,
            ...(currentAttachments.length > 0 && { attachments: currentAttachments }),
            ...(currentReply && { replyTo: currentReply })
        }]);
        if (mode === 'ai') {
            setIsLoading(true);
            setMessages(prev => [...prev, { sender: 'ai', text: "" }]);
        }

        try {
            if (mode === 'ai' && chat) {
                let messagePart: any = { role: 'user', parts: [] };

                if (userText) {
                    messagePart.parts.push({ text: userText });
                }

                if (currentAttachments.length > 0) {
                    currentAttachments.forEach(att => {
                        if (att.type === 'image') {
                            const base64Data = att.content.split(',')[1];
                            const mimeType = att.content.substring(att.content.indexOf(':') + 1, att.content.indexOf(';'));
                            messagePart.parts.push({
                                inlineData: { mimeType: mimeType, data: base64Data }
                            });
                        } else {
                            messagePart.parts.push({ text: `[User attached file: ${att.name}]` });
                        }
                    });
                }

                const responseStream = await chat.sendMessageStream(messagePart.parts);

                let fullText = "";
                for await (const chunk of responseStream) {
                    fullText += chunk.text;
                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1] = { sender: 'ai', text: fullText };
                        return newMessages;
                    });
                }
            } else if (mode === 'admin' && currentUser) {
                const messageData = {
                    sender: 'user',
                    text: userText,
                    attachments: currentAttachments.length > 0 ? currentAttachments : null,
                    ...(currentReply && { replyTo: currentReply }),
                    timestamp: serverTimestamp()
                };

                await addDoc(collection(firestoreDB, 'support_chats', currentUser.id, 'messages'), messageData).catch(() => {});

                const isNewSession = isSessionLoaded && (!chatSession || chatSession.status !== 'active');

                await setDoc(doc(firestoreDB, 'support_chats', currentUser.id), {
                    userId: currentUser.id,
                    userName: currentUser.name || 'Unknown User',
                    userEmail: currentUser.email || 'No Email',
                    userAvatar: currentUser.photoUrl || null,
                    lastMessage: userText || (currentAttachments.length > 0 ? '[Attachments]' : ''),
                    lastTimestamp: serverTimestamp(),
                    unread: true,
                    userType: currentUser.userType,
                    ...(isNewSession && {
                        status: 'active',
                        startedAt: serverTimestamp(),
                        completedAt: null
                    })
                }, { merge: true }).catch(() => {});
            }

        } catch (error) {
            if (mode === 'ai') {
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { sender: 'ai', text: "I'm sorry, I encountered an issue processing that. Please try again." };
                    return newMessages;
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const renderAttachment = (attachment: { type: 'image' | 'file'; content: string; name: string }) => {
        if (attachment.type === 'image') {
            return (
                <button
                    onClick={() => setPreviewImage(attachment.content)}
                    className="group relative rounded-xl overflow-hidden border border-white/10 my-2 transition-transform hover:scale-[1.02] block"
                >
                    <img
                        src={attachment.content}
                        alt="Attachment"
                        className="max-w-[150px] max-h-[150px] object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <Search className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={24} />
                    </div>
                </button>
            );
        } else {
            return (
                <a
                    href={attachment.content}
                    download={attachment.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-[#1A1A1A] hover:bg-[#252525] rounded-xl border border-white/5 my-2 group transition-colors min-w-[200px]"
                >
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:text-blue-300 transition-colors">
                        <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-bold text-gray-200 truncate group-hover:text-white">{attachment.name}</p>
                        <p className="text-[10px] text-gray-500  tracking-widest">Document</p>
                    </div>
                    <Download size={16} className="text-gray-500 group-hover:text-white transition-colors" />
                </a>
            );
        }
    };

    if (!db) return null;

    // Use "Support Agent" name/image for Admin mode, but sync with settings if possible for "Live" feel
    // If it's AI, we use virtual mechanic name. If it's admin, we use the settings too as "Official Support"
    const botName = mode === 'ai' 
        ? (db.settings.virtualMechanicName || 'RiderAI') 
        : (chatSession?.adminName || db.settings.supportChatTitle || 'RidersBud Support');
        
    const botImage = mode === 'ai'
        ? (db.settings.virtualMechanicImageUrl || "https://ui-avatars.com/api/?name=RiderAI&background=FE7803&color=fff")
        : (chatSession?.adminAvatar || db.settings.appLogoUrl || "https://ui-avatars.com/api/?name=Support+Agent&background=0D8ABC&color=fff");
    const isOnline = mode === 'admin' ? adminsOnline : db.settings.chatEnabled;
    const supportPhone = db.settings.supportPhone;

    return (
        <AnimatePresence>
            {previewImage && (
                <div
                    className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 animate-fadeIn"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        onClick={() => setPreviewImage(null)}
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={previewImage}
                        alt="Full Preview"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="w-full max-w-lg bg-[#111111] border border-white/10 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col h-[85vh] sm:h-[80vh] overflow-hidden"
                >
                    {/* Header */}
                    <header className="h-[68px] px-4 bg-gradient-to-r from-[#1b1b1b] to-[#161616] border-b border-white/5 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-white/10 bg-[#242424] shadow-sm">
                                    <img 
                                        src={botImage} 
                                        alt={botName} 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(botName)}&background=0D8ABC&color=fff`;
                                        }}
                                    />
                                </div>
                                <span className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 border-[2px] border-[#111111] rounded-full shadow-sm ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                            </div>
                            <div>
                                <h3 className="text-white font-black text-sm tracking-tight leading-tight">{botName}</h3>
                                <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase mt-0.5">
                                    {isOnline ? <span className="text-green-500">Online</span> : 'Offline'} • {mode === 'ai' ? 'AI' : 'Live'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {supportPhone && (
                                <Tooltip content="Call Support" position="bottom">
                                    <button
                                        onClick={() => window.open(`tel:${supportPhone}`)}
                                        className="text-gray-400 hover:text-green-500 transition-colors p-2 hover:bg-white/5 rounded-full"
                                    >
                                        <Phone className="w-4 h-4" />
                                    </button>
                                </Tooltip>
                            )}
                            <Tooltip content="Close" position="bottom">
                                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                                    <X className="w-4.5 h-4.5" />
                                </button>
                            </Tooltip>
                        </div>
                    </header>

                    {chatSession?.status === 'completed' ? (
                        hasCheckedFeedback && !feedbackSubmitted ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#121212] overflow-y-auto w-full">
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="w-full max-w-sm bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center space-y-5"
                                >
                                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0 relative">
                                        <span className="absolute inset-0 rounded-full bg-primary/5 animate-ping"></span>
                                        <Star className="w-7 h-7 fill-current" />
                                    </div>

                                    <div className="space-y-1">
                                        <h4 className="text-white font-black text-lg tracking-tight">Support Satisfaction Survey</h4>
                                        <p className="text-gray-400 text-xs leading-relaxed">
                                            How satisfied are you with the support you received? Rate from 1 to 5 stars.
                                        </p>
                                    </div>

                                    {/* Star Rating Selector */}
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((starValue) => {
                                            const isActive = starValue <= (hoverRating || rating);
                                            return (
                                                <button
                                                    key={starValue}
                                                    type="button"
                                                    onClick={() => setRating(starValue)}
                                                    onMouseEnter={() => setHoverRating(starValue)}
                                                    onMouseLeave={() => setHoverRating(0)}
                                                    className="p-1 transition-all duration-200 transform hover:scale-125 focus:outline-none"
                                                >
                                                    <Star 
                                                        className={`w-8 h-8 ${isActive ? 'text-primary fill-primary filter drop-shadow-[0_0_8px_rgba(255,107,0,0.5)]' : 'text-gray-600'}`} 
                                                    />
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Subtitle helper description */}
                                    { (hoverRating || rating) > 0 && (
                                        <p className="text-[10px] uppercase font-black tracking-widest text-primary animate-fadeIn leading-none">
                                            {
                                                (hoverRating || rating) === 1 ? 'Poor' :
                                                (hoverRating || rating) === 2 ? 'Fair' :
                                                (hoverRating || rating) === 3 ? 'Good' :
                                                (hoverRating || rating) === 4 ? 'Very Good' : 'Excellent / Highly Trusted'
                                            }
                                        </p>
                                    )}

                                    {/* Feedback Comment Box */}
                                    <div className="w-full text-left space-y-1">
                                        <label htmlFor="chat-comment" className="text-[9px] uppercase font-black tracking-widest text-gray-500">Comments</label>
                                        <textarea
                                            id="chat-comment" name="chat-comment"
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Write a message of satisfaction or comments..."
                                            rows={3}
                                            className="w-full bg-[#0A0A0A]/50 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 resize-none transition-all"
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        onClick={handleSubmitFeedback}
                                        disabled={rating === 0 || isSubmittingFeedback}
                                        className="w-full bg-gradient-to-r from-primary to-orange-600 hover:shadow-lg hover:shadow-primary/20 text-white font-black py-3.5 rounded-xl uppercase tracking-widest text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingFeedback ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            'Confirm Feedback'
                                        )}
                                    </button>
                                </motion.div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#121212] overflow-y-auto">
                                {/* Premium checkmark illustration with micro-animations */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 100 }}
                                    className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mb-6 relative shrink-0"
                                >
                                    <span className="absolute inset-0 rounded-full bg-green-500/5 animate-ping"></span>
                                    <CheckCircle className="w-10 h-10 text-green-500" />
                                </motion.div>
                                
                                <h4 className="text-white font-black text-lg tracking-tight mb-2">Support Session Resolved</h4>
                                <p className="text-gray-400 text-xs max-w-xs mb-8 leading-relaxed">
                                    This support conversation has been successfully marked as resolved by our team. Thank you for rating our support! If you have any further questions or new issues, you can start a fresh support ticket instantly.
                                </p>
                                
                                <button
                                    onClick={handleStartNewChat}
                                    className="px-6 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-black tracking-widest text-xs uppercase rounded-xl transition-all shadow-lg hover:shadow-orange-500/20 hover:scale-[1.03] active:scale-95 flex items-center gap-2"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Start a New Chat
                                </button>
                            </div>
                        )
                    ) : (
                        <>
                            {/* Chat Area */}
                            <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#121212]">
                                {messages.length === 0 && mode === 'admin' && (
                                    <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                                        <p>Start a conversation with our support team.</p>
                                    </div>
                                )}
                                {messages.map((msg, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {msg.sender !== 'user' && ( // Handle 'ai' or 'admin' sender
                                            <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 shrink-0 border border-white/10 shadow-sm mb-1">
                                                <img
                                                    src={msg.sender === 'admin' ? (msg.senderAvatar || chatSession?.adminAvatar || botImage) : botImage}
                                                    alt={msg.sender === 'admin' ? (msg.senderName || chatSession?.adminName || botName) : botName}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        const name = msg.sender === 'admin' ? (msg.senderName || chatSession?.adminName || botName) : botName;
                                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <div className={`max-w-[75%] relative group/msg flex flex-col gap-0.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                            <button
                                                onClick={() => setReplyingTo(msg)}
                                                className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white ${msg.sender === 'user' ? '-left-8' : '-right-8'}`}
                                                title="Reply"
                                            >
                                                <CornerUpLeft size={14} />
                                            </button>

                                            {mode === 'admin' && msg.sender === 'admin' && (
                                                <span className="text-[9px] font-black tracking-widest uppercase text-gray-500 px-1 leading-none mb-0.5">
                                                    {msg.senderName || chatSession?.adminName || 'Support'}
                                                </span>
                                            )}
                                            
                                            {msg.text && msg.text.startsWith('https://www.google.com/maps') ? (
                                                <div className="flex flex-col gap-1">
                                                    {msg.replyTo && (
                                                        <div className="text-[10px] bg-[#242424] px-2 py-1.5 rounded-lg border border-white/5 opacity-80 max-w-[180px]">
                                                            <div className="font-bold text-gray-300 mb-0.5">{msg.replyTo.senderName || (msg.replyTo.sender === 'user' ? 'User' : 'Support')}</div>
                                                            <div className="truncate text-gray-400">{msg.replyTo.text || '[Attachment]'}</div>
                                                        </div>
                                                    )}
                                                    <a
                                                        href={msg.text}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`group flex items-center justify-center gap-1.5 font-bold px-3 py-1.5 text-xs rounded-2xl transition-all hover:scale-[1.02] shadow-sm ${msg.sender === 'user' ? 'bg-white text-orange-600 hover:bg-gray-100 rounded-br-sm' : 'bg-gradient-to-r from-[#ff6a00] to-[#ff7a18] text-white hover:shadow-[0_4px_12px_rgba(255,106,0,0.25)] rounded-bl-sm'}`}
                                                    >
                                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                        Shared Location
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className={`px-3 py-2 rounded-2xl shadow-sm max-w-full overflow-hidden ${msg.sender === 'user'
                                                    ? 'bg-gradient-to-br from-[#ff6a00] to-[#ff7a18] text-white rounded-br-sm'
                                                    : 'bg-[#242424] text-gray-100 rounded-bl-sm border border-white/5'
                                                    }`}>
                                                    
                                                    {msg.replyTo && (
                                                        <div className={`mb-1.5 pb-1.5 text-[10px] border-b ${msg.sender === 'user' ? 'border-white/20' : 'border-white/10'}`}>
                                                            <div className="font-bold mb-0.5 opacity-80">{msg.replyTo.senderName || (msg.replyTo.sender === 'user' ? 'User' : 'Support')}</div>
                                                            <div className="opacity-70 truncate max-w-[180px]">{msg.replyTo.text || '[Attachment]'}</div>
                                                        </div>
                                                    )}

                                                    {/* Legacy single attachment support */}
                                                    {msg.attachment && renderAttachment(msg.attachment)}
                                                    
                                                    {/* New multiple attachments support */}
                                                    {msg.attachments && msg.attachments.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                                            {msg.attachments.map((att, i) => (
                                                                <div key={i} className="max-w-[150px]">
                                                                    {renderAttachment(att)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {!msg.attachment && isLoading && index === messages.length - 1 && msg.sender === 'ai' && msg.text === '' ? (
                                                        <div className="flex gap-1 items-center h-4">
                                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                                        </div>
                                                    ) : (
                                                        msg.text && <p className="text-xs leading-relaxed whitespace-pre-wrap break-all">{msg.text}</p>
                                                    )}
                                                </div>
                                            )}
                                            <span className="text-[9px] text-gray-500 px-1 font-bold">
                                                {msg.timestamp?.seconds
                                                    ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                                <div ref={messagesEndRef} />
                            </main>
 
                            {/* Footer / Preview */}
                            <div className="bg-[#1e1e1e] border-t border-white/5 p-3 shrink-0 flex flex-col justify-center">
                                <AnimatePresence>
                                        {attachments.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                className="absolute bottom-full left-3 mb-2 p-1.5 bg-[#2a2a2a] border border-white/10 rounded-xl shadow-xl flex gap-1.5 z-50 max-w-[90%] overflow-x-auto custom-scrollbar"
                                            >
                                                {attachments.map((att, i) => (
                                                    <div key={i} className="relative flex items-center gap-1.5 pr-2 bg-black/20 rounded-lg shrink-0">
                                                        {att.type === 'image' ? (
                                                            <div className="w-8 h-8 rounded-md overflow-hidden bg-black shrink-0 relative group">
                                                                <img src={att.content} alt="Preview" className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-md bg-gray-700 flex items-center justify-center shrink-0">
                                                                <FileText className="w-4 h-4 text-gray-300" />
                                                            </div>
                                                        )}
                                                        <div className="max-w-[80px] min-w-[50px]">
                                                            <p className="text-[10px] font-bold text-gray-200 truncate">{att.name}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                                            className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500/80 transition-colors shrink-0"
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
 
                                <AnimatePresence>
                                    {replyingTo && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, height: 0 }}
                                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                                            exit={{ opacity: 0, y: 10, height: 0 }}
                                            className="mb-2 px-3 py-2 bg-[#1f1f1f] border-l-[3px] border-[#ff6a00] rounded-r-xl rounded-l-sm shadow-sm relative flex items-start gap-2"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <CornerUpLeft size={12} className="text-[#ff6a00]" />
                                                    <span className="text-[10px] font-black text-[#ff6a00]">
                                                        Replying to {replyingTo.senderName || (replyingTo.sender === 'user' ? 'User' : 'Support')}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-300 truncate">
                                                    {replyingTo.text || '[Attachment]'}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setReplyingTo(null)}
                                                className="p-1 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors shrink-0"
                                            >
                                                <X size={14} />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
 
                                <form onSubmit={handleSendMessage} className="flex gap-1.5 items-center">
                                    <label htmlFor="chatFileInput" className="sr-only">Attach file</label>
                                    <input
                                        id="chatFileInput"
                                        name="chatFileInput"
                                        type="file"
                                        multiple
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        accept="image/*,.pdf,.doc,.docx"
                                        className="hidden"
                                    />

                                    <div className="flex-1 h-11 relative flex items-center bg-[#1f1f1f] border border-white/10 rounded-full focus-within:border-[#ff6a00]/50 focus-within:ring-1 focus-within:ring-[#ff6a00]/50 transition-all shadow-inner">
                                        <div className="relative" ref={menuRef}>
                                            <button
                                                type="button"
                                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                                disabled={isLoading || isCompressing}
                                                className={`ml-1 w-8 h-8 rounded-full flex items-center justify-center text-[#ff6a00] hover:bg-white/5 transition-colors ${isCompressing ? 'animate-pulse' : ''} ${isMenuOpen ? 'bg-white/5' : ''}`}
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                            
                                            <AnimatePresence>
                                                {isMenuOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        className="absolute bottom-full left-0 mb-3 w-56 bg-[#1b1b1b] border border-white/10 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden z-[60]"
                                                    >
                                                        {showServiceSelection ? (
                                                            <div className="flex flex-col">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowServiceSelection(false)}
                                                                    className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-xs font-bold text-primary hover:bg-white/5 transition-colors border-b border-white/5"
                                                                >
                                                                    <ArrowLeft size={13} className="text-primary" />
                                                                    <span>Back</span>
                                                                </button>
                                                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                                    {userSpecialServices.length > 0 ? (
                                                                        userSpecialServices.map((service) => (
                                                                            <button
                                                                                key={service.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const detailsText = `📋 Service Booking Details:\n• Service: ${service.title}\n• ID: ${service.id}\n${service.details}`;
                                                                                    shareSpecialServiceToChat(detailsText);
                                                                                    setIsMenuOpen(false);
                                                                                    setShowServiceSelection(false);
                                                                                }}
                                                                                className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 flex flex-col gap-0.5"
                                                                            >
                                                                                <span className="text-[11px] font-bold text-white truncate w-full">{service.title}</span>
                                                                                <span className="text-[9px] text-gray-500 font-mono">#{service.id.slice(-6).toUpperCase()}</span>
                                                                            </button>
                                                                        ))
                                                                    ) : (
                                                                        <p className="p-3 text-[11px] text-gray-500 font-bold text-center">No active special services</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        fileInputRef.current?.click();
                                                                        setIsMenuOpen(false);
                                                                    }}
                                                                    className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-xs font-bold text-white hover:bg-white/5 transition-colors border-b border-white/5"
                                                                >
                                                                    <div className="w-6 h-6 rounded-full bg-[#ff6a00]/10 flex items-center justify-center">
                                                                        <Paperclip className="w-3.5 h-3.5 text-[#ff6a00]" />
                                                                    </div>
                                                                    Attach File
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        handleShareLocation();
                                                                        setIsMenuOpen(false);
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2.5 flex items-center gap-2 text-xs font-bold text-white hover:bg-white/5 transition-colors ${userSpecialServices.length > 0 ? 'border-b border-white/5' : ''}`}
                                                                >
                                                                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                                                                        <MapPin className="w-3.5 h-3.5 text-green-500" />
                                                                    </div>
                                                                    Share Location
                                                                </button>
                                                                {userSpecialServices.length > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowServiceSelection(true)}
                                                                        className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-xs font-bold text-white hover:bg-white/5 transition-colors"
                                                                    >
                                                                        <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                                                                            <Calendar className="w-3.5 h-3.5 text-blue-400" />
                                                                        </div>
                                                                        Share Booking Info
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        
                                        <label htmlFor="chatMessageInput" className="sr-only">Type a message</label>
                                        <input
                                            id="chatMessageInput"
                                            name="chatMessageInput"
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder={mode === 'ai' ? (isCompressing ? "Compressing..." : "Type message...") : "Message Support..."}
                                            className="flex-1 bg-transparent border-none focus:border-none focus:ring-0 focus:outline-none text-white pl-1.5 pr-2 py-2 placeholder:text-[#9ca3af] text-xs font-medium"
                                            disabled={isLoading || isCompressing}
                                        />
                                        
                                        <Tooltip content="Send Message" position="top">
                                            <button
                                                type="submit"
                                                disabled={isLoading || (!input.trim() && attachments.length === 0) || isCompressing}
                                                className="w-8 h-8 min-w-[32px] min-h-[32px] mr-1 rounded-full border-none bg-gradient-to-br from-[#ff7a18] to-[#ff4d00] text-white flex items-center justify-center cursor-pointer transition-all duration-250 ease-out disabled:opacity-45 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none hover:scale-105 hover:shadow-[0_8px_20px_rgba(255,106,0,0.35)]"
                                            >
                                                <Send size={14} className="ml-0.5" />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </form>
                            </div>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ChatModal;
