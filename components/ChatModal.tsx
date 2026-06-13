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
import { motion, AnimatePresence } from 'framer-motion';
import { X, Paperclip, FileText, Trash2, MapPin, Phone, Search, Download, CheckCircle, RefreshCw, Star } from 'lucide-react';
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
    const [attachment, setAttachment] = useState<{ type: 'image' | 'file'; content: string; name: string } | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [chatSession, setChatSession] = useState<any>(null);
    const [isSessionLoaded, setIsSessionLoaded] = useState(false);
    
    // Satisfaction Survey States
    const [hasCheckedFeedback, setHasCheckedFeedback] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

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
            unsubscribeDoc();
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
            unsubscribeMessages();
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
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // For AI mode, we still need base64 for Gemini inlineData
            if (mode === 'ai') {
                setIsCompressing(true);
                try {
                    const base64 = await compressAndEncodeImage(file);
                    setAttachment({
                        type: file.type.startsWith('image/') ? 'image' : 'file',
                        content: base64,
                        name: file.name
                    });
                } catch (error) {
                    console.error("File processing error:", error);
                    alert("Failed to process file. Please try again.");
                } finally {
                    setIsCompressing(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            } else {
                // For Admin mode, use Base64 directly (avoids Firebase Storage permission errors)
                setIsCompressing(true);
                try {
                    const base64 = await compressAndEncodeImage(file);
                    setAttachment({
                        type: file.type.startsWith('image/') ? 'image' : 'file',
                        content: base64,
                        name: file.name
                    });
                } catch (error) {
                    console.error("Upload error:", error);
                    alert("Failed to upload file.");
                } finally {
                    setIsCompressing(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            }
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
                console.warn('Location share failed:', error.message);
            }
        );
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !attachment) || isLoading) return; 
        if (mode === 'ai' && !chat) return; 

        const userText = input;
        const currentAttachment = attachment;

        setInput('');
        setAttachment(null);

        // Optimistic update for both modes so messages appear immediately
        setMessages(prev => [...prev, {
            sender: 'user',
            text: userText,
            attachment: currentAttachment ? { ...currentAttachment } : undefined
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

                if (currentAttachment && currentAttachment.type === 'image') {
                    const base64Data = currentAttachment.content.split(',')[1];
                    const mimeType = currentAttachment.content.substring(currentAttachment.content.indexOf(':') + 1, currentAttachment.content.indexOf(';'));
                    messagePart.parts.push({
                        inlineData: { mimeType: mimeType, data: base64Data }
                    });
                } else if (currentAttachment) {
                    messagePart.parts.push({ text: `[User attached file: ${currentAttachment.name}]` });
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
                    attachment: currentAttachment,
                    timestamp: serverTimestamp()
                };

                await addDoc(collection(firestoreDB, 'support_chats', currentUser.id, 'messages'), messageData).catch(() => {});

                const isNewSession = isSessionLoaded && (!chatSession || chatSession.status !== 'active');

                await setDoc(doc(firestoreDB, 'support_chats', currentUser.id), {
                    userId: currentUser.id,
                    userName: currentUser.name || 'Unknown User',
                    userEmail: currentUser.email || 'No Email',
                    userAvatar: currentUser.photoUrl || null,
                    lastMessage: userText || (currentAttachment ? '[Attachment]' : ''),
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
                        className="max-w-[200px] max-h-[200px] object-cover"
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
    const botName = db.settings.virtualMechanicName || 'Support Agent';
    const botImage = db.settings.virtualMechanicImageUrl || "https://ui-avatars.com/api/?name=Support+Agent&background=0D8ABC&color=fff";
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
                    className="w-full max-w-lg bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden"
                >
                    {/* Header */}
                    <header className="p-4 bg-gradient-to-r from-[#2A2A2A] to-[#202020] border-b border-white/5 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border border-white/10 bg-gray-800`}>
                                    <img src={botImage} alt={botName} className="w-full h-full object-cover" />
                                </div>
                                <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#1e1e1e] rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                            </div>
                            <div>
                                <h3 className="text-white font-bold">{botName}</h3>
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                    {isOnline ? 'Online' : 'Offline'} • {mode === 'ai' ? 'AI Assistant' : 'Live Support'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {supportPhone && (
                                <Tooltip content="Call Support" position="bottom">
                                    <button
                                        onClick={() => window.open(`tel:${supportPhone}`)}
                                        className="text-gray-400 hover:text-green-500 transition-colors p-2 hover:bg-white/5 rounded-full"
                                    >
                                        <Phone className="w-5 h-5" />
                                    </button>
                                </Tooltip>
                            )}
                            <Tooltip content="Close" position="bottom">
                                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                                    <X className="w-6 h-6" />
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
                                        <label className="text-[9px] uppercase font-black tracking-widest text-gray-500">Comments</label>
                                        <textarea
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
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 shrink-0 border border-white/10">
                                                <img
                                                    src={botImage}
                                                    alt="Bot"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className={`max-w-[80%] flex flex-col gap-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                            <div className={`p-3.5 rounded-2xl ${msg.sender === 'user'
                                                ? 'bg-gradient-to-br from-orange-600 to-orange-500 text-white rounded-br-none shadow-md'
                                                : 'bg-[#2A2A2A] text-gray-100 rounded-bl-none border border-white/5'
                                                }`}>
                                                {msg.attachment && renderAttachment(msg.attachment)}

                                                {!msg.attachment && isLoading && index === messages.length - 1 && msg.sender === 'ai' && msg.text === '' ? (
                                                    <div className="flex gap-1 items-center h-6">
                                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                                    </div>
                                                ) : (
                                                    msg.text && (
                                                        msg.text.startsWith('https://www.google.com/maps') ? (
                                                            <a
                                                                href={msg.text}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={`flex items-center gap-2 font-bold underline ${msg.sender === 'user' ? 'text-white' : 'text-blue-400'}`}
                                                            >
                                                                <MapPin className="w-4 h-4" />
                                                                Shared Location
                                                            </a>
                                                        ) : (
                                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                                        )
                                                    )
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-500 px-1">
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
                            <div className="bg-[#1e1e1e] border-t border-white/5 p-4 shrink-0">
                                <AnimatePresence>
                                    {attachment && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="flex items-center gap-3 mb-3 p-2 bg-[#2A2A2A] rounded-xl border border-white/5"
                                        >
                                            {attachment.type === 'image' ? (
                                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0 relative group">
                                                    <img src={attachment.content} alt="Preview" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center shrink-0">
                                                    <FileText className="w-6 h-6 text-gray-300" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-200 truncate">{attachment.name}</p>
                                                <p className="text-xs text-gray-500">Ready to send</p>
                                            </div>
                                            <button
                                                onClick={() => setAttachment(null)}
                                                className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-red-400 transition-colors"
                                            >
                                                <div className="w-4 h-4" >
                                                    <Trash2 className="w-full h-full" />
                                                </div>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        accept="image/*,.pdf,.doc,.docx"
                                        className="hidden"
                                    />
                                    <Tooltip content="Attach File" position="top">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isLoading || isCompressing}
                                            className={`p-3 rounded-full bg-[#2A2A2A] text-gray-400 hover:text-orange-500 hover:bg-[#333] transition-colors border border-white/5 ${isCompressing ? 'animate-pulse' : ''}`}
                                        >
                                            <Paperclip className="w-5 h-5" />
                                        </button>
                                    </Tooltip>

                                    <Tooltip content="Share Location" position="top">
                                        <button
                                            type="button"
                                            onClick={handleShareLocation}
                                            disabled={isLoading || isCompressing}
                                            className={`p-3 rounded-full bg-[#2A2A2A] text-gray-400 hover:text-green-500 hover:bg-[#333] transition-colors border border-white/5`}
                                        >
                                            <MapPin className="w-5 h-5" />
                                        </button>
                                    </Tooltip>

                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder={mode === 'ai' ? (isCompressing ? "Compressing file..." : "Type a message...") : "Message Support..."}
                                            className="w-full bg-[#252525] text-white pl-4 pr-4 py-3 rounded-xl border border-white/5 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-gray-600"
                                            disabled={isLoading || isCompressing}
                                        />
                                    </div>

                                    <Tooltip content="Send Message" position="top">
                                        <button
                                            type="submit"
                                            disabled={isLoading || (!input.trim() && !attachment) || isCompressing}
                                            className="p-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-orange-500/20 hover:scale-105 transition-all group"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                            </svg>
                                        </button>
                                    </Tooltip>
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
