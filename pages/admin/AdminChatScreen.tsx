import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { db as firestoreDB } from '../../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc, where } from 'firebase/firestore';
import { MapPin, ExternalLink, Paperclip, Send, Image as ImageIcon, Search, MoreVertical, Smartphone, User, FileText, X, Download, ChevronRight, Calendar, Clock, Phone, Mail, Info, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import Tooltip from '../../components/ui/Tooltip';
import { storageService } from '../../services/StorageService';
import { useOnlineStatus } from '../../hooks/usePresence';

const ChatUserAvatar: React.FC<{ userId: string; userType: string; avatarUrl?: string; userName: string }> = ({ userId, userType, avatarUrl, userName }) => {
    const collectionName = userType === 'mechanic' ? 'mechanics' : 'customers';
    const isOnline = useOnlineStatus(userId, collectionName);

    return (
        <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-gray-800">
                <img src={avatarUrl || '/riders-logo.png'} alt={userName} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }} />
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-[#121212] rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
        </div>
    );
};

interface ChatMessage {
    id: string;
    sender: 'user' | 'admin' | 'ai';
    text: string;
    timestamp: any;
    attachment?: {
        type: 'image' | 'file';
        content: string;
        name: string;
    };
}

interface ChatSession {
    id: string;
    userId: string;
    userType: 'customer' | 'mechanic';
    userName: string;
    userAvatar?: string;
    lastMessage: string;
    lastTimestamp: any;
    unread: boolean;
    status?: 'active' | 'completed';
    startedAt?: any;
    completedAt?: any;
}

const AdminChatScreen: React.FC = () => {
    const { isAdminAuthenticated, adminUser } = useAdminAuth();
    const { db } = useDatabase();
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [showProfile, setShowProfile] = useState(false);
    const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');

    // Profile Data States
    const [customerDetails, setCustomerDetails] = useState<any>(null);
    const [customerBookings, setCustomerBookings] = useState<any[]>([]);
    const [customerOrders, setCustomerOrders] = useState<any[]>([]);

    const [isUploading, setIsUploading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const selectedChat = chats.find(c => c.id === selectedChatId);
    const selectedUserId = selectedChat?.userId || null;
    const selectedUserType = selectedChat?.userType || 'customer';
    const selectedUserCollection = selectedUserType === 'mechanic' ? 'mechanics' : 'customers';
    const selectedUserOnline = useOnlineStatus(selectedUserId, selectedUserCollection);

    // Load Chats List from Firestore
    useEffect(() => {
        const chatsRef = collection(firestoreDB, 'support_chats');
        const q = query(chatsRef, orderBy('lastTimestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sessions: ChatSession[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatSession));
            setChats(sessions);
        });

        return () => { try { unsubscribe(); } catch (_) {} };
    }, []);

    // Load Messages and Profile Data (Realtime)
    useEffect(() => {
        if (!selectedChatId) {
            setMessages([]);
            return;
        }

        // 1. Mark as read immediately
        const chatDocRef = doc(firestoreDB, 'support_chats', selectedChatId);
        updateDoc(chatDocRef, { unread: false }).catch(err => console.error("Error marking read:", err));

        // 2. Listen for Messages
        const messagesRef = collection(firestoreDB, 'support_chats', selectedChatId, 'messages');
        const qMessages = query(messagesRef, orderBy('timestamp', 'asc'));

        const currentChat = chats.find(c => c.id === selectedChatId);
        const startedAt = currentChat?.startedAt;

        const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
            let msgs: ChatMessage[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatMessage));

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
        });

        // 3. Real-time Profile Data Fetching
        let unsubscribeCustomer: () => void = () => { };
        let unsubscribeBookings: () => void = () => { };
        let unsubscribeOrders: () => void = () => { };

        const setupProfileListeners = () => {
            const chat = chats.find(c => c.id === selectedChatId);
            if (chat && chat.userId) {
                const collectionName = chat.userType === 'mechanic' ? 'mechanics' : 'customers';

                unsubscribeCustomer = onSnapshot(doc(firestoreDB, collectionName, chat.userId), (docSnap) => {
                    if (docSnap.exists()) {
                        setCustomerDetails({ id: docSnap.id, ...docSnap.data() });
                    } else {
                        setCustomerDetails({
                            name: chat.userName,
                            email: 'N/A',
                            phone: 'N/A',
                            picture: chat.userAvatar
                        });

                        getDoc(doc(firestoreDB, 'users', chat.userId)).then(userSnap => {
                            if (userSnap.exists()) {
                                setCustomerDetails({ id: userSnap.id, ...userSnap.data() });
                            }
                        });
                    }
                });

                const bookingsQ = query(collection(firestoreDB, 'bookings'), where('customerId', '==', chat.userId), orderBy('date', 'desc'));
                unsubscribeBookings = onSnapshot(bookingsQ, (snapshot) => {
                    const bookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    setCustomerBookings(bookings);
                });

                const ordersQ = query(collection(firestoreDB, 'orders'), where('customerId', '==', chat.userId), orderBy('date', 'desc'));
                unsubscribeOrders = onSnapshot(ordersQ, (snapshot) => {
                    const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    setCustomerOrders(orders);
                });
            }
        };

        setupProfileListeners();

        return () => {
            try { unsubscribeMessages(); } catch (_) {}
            try { if (unsubscribeCustomer) unsubscribeCustomer(); } catch (_) {}
            try { if (unsubscribeBookings) unsubscribeBookings(); } catch (_) {}
            try { if (unsubscribeOrders) unsubscribeOrders(); } catch (_) {}
        };
    }, [selectedChatId, chats]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleResolveChat = async () => {
        if (!selectedChatId) return;
        try {
            const chatDocRef = doc(firestoreDB, 'support_chats', selectedChatId);
            await updateDoc(chatDocRef, {
                status: 'completed',
                completedAt: serverTimestamp(),
                unread: false
            });

            // Send a system message that the chat is completed
            await addDoc(collection(firestoreDB, 'support_chats', selectedChatId, 'messages'), {
                sender: 'admin',
                senderName: 'System',
                text: 'This support session has been completed and marked as resolved.',
                timestamp: serverTimestamp()
            });

            // Also update the lastMessage in main doc
            await updateDoc(chatDocRef, {
                lastMessage: '✓ Support Session Completed',
                lastTimestamp: serverTimestamp()
            });

        } catch (error) {
            console.error("Error resolving chat:", error);
            alert("Failed to resolve chat.");
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() || !selectedChatId) return;

        const textToSend = inputText;
        setInputText('');

        try {
            await addDoc(collection(firestoreDB, 'support_chats', selectedChatId, 'messages'), {
                sender: 'admin',
                senderName: adminUser?.name || 'Support Agent',
                senderAvatar: adminUser?.avatarUrl || adminUser?.avatar || null,
                text: textToSend,
                timestamp: serverTimestamp()
            });

            await updateDoc(doc(firestoreDB, 'support_chats', selectedChatId), {
                lastMessage: textToSend,
                lastTimestamp: serverTimestamp(),
                unread: false,
                unreadByUser: true,
                adminId: adminUser?.id || null,
                adminName: adminUser?.name || 'Support Agent',
                adminAvatar: adminUser?.avatarUrl || adminUser?.avatar || null
            });
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message.");
            setInputText(textToSend);
        }
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessageContent = (text: string, isSenderAdmin: boolean) => {
        if (text.includes('google.com/maps')) {
            return (
                <div className="flex flex-col gap-2">
                    <a
                        href={text}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isSenderAdmin
                            ? 'bg-white/10 hover:bg-white/20 text-white'
                            : 'bg-[#1E1E1E] hover:bg-[#252525] text-blue-400'
                            } border border-white/5 group`}
                    >
                        <div className={`p-2 rounded-full ${isSenderAdmin ? 'bg-white/20' : 'bg-blue-500/10'}`}>
                            <MapPin size={18} className={isSenderAdmin ? 'text-white' : 'text-blue-500'} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs tracking-wide">Shared Location</p>
                            <p className="text-[10px] opacity-70 truncate underline">Open in Google Maps</p>
                        </div>
                    </a>
                </div>
            );
        }

        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);

        if (parts.length > 1) {
            return (
                <span>
                    {parts.map((part, i) => {
                        if (part.match(urlRegex)) {
                            return (
                                <a
                                    key={i}
                                    href={part}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:opacity-80 break-all font-medium"
                                >
                                    {part}
                                </a>
                            );
                        }
                        return part;
                    })}
                </span>
            );
        }

        return <span className="whitespace-pre-wrap leading-relaxed">{text}</span>;
    };

    const renderAttachment = (attachment: { type: 'image' | 'file'; content: string; name: string }) => {
        if (attachment.type === 'image') {
            return (
                <button
                    onClick={() => setPreviewImage(attachment.content)}
                    className="group relative rounded-xl overflow-hidden border border-white/10 my-2 transition-transform hover:scale-[1.02]"
                >
                    <img
                        src={attachment.content}
                        alt="Attachment"
                        className="max-w-[250px] max-h-[250px] object-cover"
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
                        <p className="text-[10px] text-gray-500 tracking-widest">Document</p>
                    </div>
                    <Download size={16} className="text-gray-500 group-hover:text-white transition-colors" />
                </a>
            );
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && selectedChatId) {
            const file = e.target.files[0];
            setIsUploading(true);
            try {
                const isImage = file.type.startsWith('image/');
                const path = `chats/${selectedChatId}/attachments/${Date.now()}_${file.name}`;
                const downloadUrl = await storageService.uploadFile(path, file);

                const attachment = {
                    type: isImage ? 'image' : 'file' as 'image' | 'file',
                    content: downloadUrl,
                    name: file.name
                };

                await addDoc(collection(firestoreDB, 'support_chats', selectedChatId, 'messages'), {
                    sender: 'admin',
                    senderName: adminUser?.name || 'Support Agent',
                    senderAvatar: adminUser?.avatarUrl || adminUser?.avatar || null,
                    text: '',
                    attachment: attachment,
                    timestamp: serverTimestamp()
                });

                await updateDoc(doc(firestoreDB, 'support_chats', selectedChatId), {
                    lastMessage: attachment.type === 'image' ? '[Image]' : '[File]',
                    lastTimestamp: serverTimestamp(),
                    unread: false,
                    unreadByUser: true,
                    adminId: adminUser?.id || null,
                    adminName: adminUser?.name || 'Support Agent',
                    adminAvatar: adminUser?.avatarUrl || adminUser?.avatar || null
                });

            } catch (error) {
                console.error("File processing error:", error);
                alert("Failed to process file.");
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const filteredChats = chats.filter(chat => {
        if (activeTab === 'active') {
            return chat.status !== 'completed';
        } else {
            return chat.status === 'completed';
        }
    });

    return (
        <div className="flex h-screen bg-[#0F0F0F] text-white overflow-hidden font-sans">
            {/* Sidebar: Chat List */}
            <div className={`w-80 border-r border-white/5 bg-[#121212] flex flex-col shrink-0 ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-6 border-b border-white/5 bg-gradient-to-b from-[#1A1A1A] to-[#121212]">
                    <h2 className="text-xl font-black tracking-tighter flex items-center gap-2">
                        <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
                        SUPPORT CHATS
                    </h2>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-[0.2em] font-bold">Manage Customer Queries</p>
                </div>

                {/* HSL Premium Dark/Orange Tab Switcher */}
                <div className="px-4 py-3 flex gap-2 border-b border-white/5 bg-[#141414]">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 py-2 text-[10px] uppercase font-black tracking-wider rounded-xl transition-all ${
                            activeTab === 'active'
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 font-black'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        Active ({chats.filter(c => c.status !== 'completed').length})
                    </button>
                    <button
                        onClick={() => setActiveTab('resolved')}
                        className={`flex-1 py-2 text-[10px] uppercase font-black tracking-wider rounded-xl transition-all ${
                            activeTab === 'resolved'
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 font-black'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        Resolved ({chats.filter(c => c.status === 'completed').length})
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredChats.length === 0 ? (
                        <div className="p-8 text-center text-gray-600">
                            <Info className="mx-auto mb-2 opacity-20" size={32} />
                            <p className="text-xs">No {activeTab} support chats</p>
                        </div>
                    ) : (
                        filteredChats.map(chat => (
                            <button
                                key={chat.id}
                                onClick={() => setSelectedChatId(chat.id)}
                                className={`w-full p-4 flex items-center gap-4 transition-all border-b border-white/[0.02] hover:bg-white/[0.03] relative group ${selectedChatId === chat.id ? 'bg-orange-500/10' : ''}`}
                            >
                                {selectedChatId === chat.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
                                <div className="relative shrink-0">
                                    <ChatUserAvatar userId={chat.userId} userType={chat.userType} avatarUrl={chat.userAvatar} userName={chat.userName} />
                                    {chat.unread && <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-600 rounded-full border-2 border-[#121212] animate-pulse"></div>}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-bold text-sm truncate group-hover:text-orange-400 transition-colors">{chat.userName}</h4>
                                        <span className="text-[10px] text-gray-600">{formatTime(chat.lastTimestamp)}</span>
                                    </div>
                                    <p className={`text-xs truncate ${chat.unread ? 'text-gray-200 font-bold' : 'text-gray-500'}`}>
                                        {chat.lastMessage}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full uppercase font-black tracking-widest ${chat.userType === 'mechanic' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {chat.userType}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className={`flex-1 flex flex-col bg-[#0A0A0A] relative ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
                {selectedChatId ? (
                    <>
                        {/* Chat Header */}
                        <header className="p-4 bg-[#121212] border-b border-white/5 flex items-center justify-between z-10 shadow-xl">
                            <div className="flex items-center gap-3">
                                <Tooltip content="Back to Chats" position="bottom">
                                    <button onClick={() => setSelectedChatId(null)} className="md:hidden p-2 text-gray-400">
                                        <ChevronRight className="rotate-180" />
                                    </button>
                                </Tooltip>
                                <div className="relative shrink-0">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                                        <img 
                                            src={selectedChat?.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat?.userName || '')}&background=random`} 
                                            alt="User" 
                                            className="w-full h-full object-cover" 
                                        />
                                    </div>
                                    {selectedChat?.status !== 'completed' && (
                                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[#121212] rounded-full ${selectedUserOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white leading-none mb-1">{selectedChat?.userName}</h3>
                                    <div className="flex items-center gap-2">
                                        {selectedChat?.status === 'completed' ? (
                                            <>
                                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Resolved Session</p>
                                            </>
                                        ) : (
                                            <>
                                                <span className={`w-1.5 h-1.5 rounded-full ${selectedUserOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                                                <p className="text-[10px] uppercase tracking-widest font-black flex items-center gap-1">
                                                    {selectedUserOnline ? (
                                                        <><Wifi size={10} className="text-green-500" /> Online</>
                                                    ) : (
                                                        <><WifiOff size={10} className="text-gray-400" /> Offline</>
                                                    )}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {chats.find(c => c.id === selectedChatId)?.status !== 'completed' && (
                                    <Tooltip content="Resolve Chat" position="bottom">
                                        <button 
                                            onClick={handleResolveChat}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 hover:bg-green-500 border border-green-500/20 hover:border-green-600 text-green-400 hover:text-white rounded-xl transition-all text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95"
                                        >
                                            <CheckCircle size={12} />
                                            Resolve Chat
                                        </button>
                                    </Tooltip>
                                )}
                                <Tooltip content="User Profile" position="bottom">
                                    <button 
                                        onClick={() => setShowProfile(!showProfile)}
                                        className={`p-2 rounded-full transition-all ${showProfile ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:bg-white/5'}`}
                                    >
                                        <User size={20} />
                                    </button>
                                </Tooltip>
                                <Tooltip content="More Options" position="bottom">
                                    <button className="p-2 text-gray-400 hover:bg-white/5 rounded-full transition-colors">
                                        <MoreVertical size={20} />
                                    </button>
                                </Tooltip>
                            </div>
                        </header>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed">
                            {messages.map((msg, idx) => {
                                const isNextSame = messages[idx + 1]?.sender === msg.sender;
                                return (
                                    <div key={msg.id || idx} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'} group animate-fadeIn`}>
                                        <div className={`flex flex-col ${msg.sender === 'admin' ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                            <div className={`
                                                relative p-4 rounded-2xl text-sm
                                                ${msg.sender === 'admin' 
                                                    ? 'bg-gradient-to-br from-orange-600 to-orange-500 text-white rounded-br-none shadow-lg shadow-orange-900/10' 
                                                    : 'bg-[#1E1E1E] text-gray-200 border border-white/5 rounded-bl-none shadow-xl'
                                                }
                                            `}>
                                                {msg.attachment && renderAttachment(msg.attachment)}
                                                {msg.text && renderMessageContent(msg.text, msg.sender === 'admin')}
                                            </div>
                                            {!isNextSame && (
                                                <span className="text-[9px] text-gray-600 mt-1 uppercase font-black tracking-widest px-1">
                                                    {msg.sender === 'admin' ? 'You' : (chats.find(c => c.id === selectedChatId)?.userName || 'User')} • {formatTime(msg.timestamp)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <footer className="p-4 bg-[#121212] border-t border-white/5 shrink-0">
                            {chats.find(c => c.id === selectedChatId)?.status === 'completed' ? (
                                <div className="flex items-center justify-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                    <div className="p-2 bg-green-500/10 rounded-full text-green-400">
                                        <CheckCircle size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-gray-200">Conversation Resolved</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-0.5">This query has been marked complete. Waiting for the customer to start a new chat if needed.</p>
                                    </div>
                                </div>
                            ) : (
                                <form 
                                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                    className="flex items-center gap-3 bg-[#1A1A1A] p-2 rounded-2xl border border-white/5 focus-within:border-orange-500/30 transition-all shadow-inner"
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept="image/*,.pdf,.doc,.docx"
                                    />
                                    <Tooltip content="Attach File" position="top">
                                        <button 
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className={`p-3 text-gray-400 hover:text-orange-500 hover:bg-white/5 rounded-xl transition-all ${isUploading ? 'animate-pulse' : ''}`}
                                        >
                                            <Paperclip size={20} />
                                        </button>
                                    </Tooltip>
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder={isUploading ? "Uploading file..." : "Type a message..."}
                                        disabled={isUploading}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 placeholder:text-gray-600"
                                    />
                                    <Tooltip content="Send Message" position="top">
                                        <button 
                                            type="submit"
                                            disabled={(!inputText.trim() && !isUploading) || isUploading}
                                            className="bg-orange-500 text-white p-3 rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                        >
                                            <Send size={20} />
                                        </button>
                                    </Tooltip>
                                </form>
                            )}
                        </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                        <div className="w-32 h-32 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full flex items-center justify-center mb-8 border border-orange-500/10">
                            <Smartphone size={64} className="text-orange-500" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tighter mb-2">SELECT A CONVERSATION</h2>
                        <p className="max-w-xs text-sm text-gray-400">Choose a chat from the sidebar to start supporting our riders and mechanics.</p>
                    </div>
                )}

                {/* Profile Sidebar */}
                {showProfile && selectedChatId && (
                    <div className="absolute inset-y-0 right-0 w-80 bg-[#121212] border-l border-white/5 z-20 shadow-2xl flex flex-col animate-slideInRight">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                            <h3 className="font-black text-sm uppercase tracking-widest">User Profile</h3>
                            <Tooltip content="Close Profile" position="bottom">
                                <button onClick={() => setShowProfile(false)} className="text-gray-500 hover:text-white">
                                    <X size={20} />
                                </button>
                            </Tooltip>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
                            {/* Basic Info */}
                            <div className="text-center">
                                <div className="w-24 h-24 rounded-2xl overflow-hidden mx-auto mb-4 border-2 border-orange-500/20 shadow-2xl relative group">
                                    <img 
                                        src={customerDetails?.picture || chats.find(c => c.id === selectedChatId)?.userAvatar || '/riders-logo.png'} 
                                        alt="User" 
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                                        onError={(e) => { (e.target as HTMLImageElement).src = '/riders-logo.png'; }}
                                    />
                                    <div className="absolute inset-0 bg-orange-500/10 mix-blend-overlay"></div>
                                </div>
                                <h4 className="text-lg font-black tracking-tight">{customerDetails?.name || 'Loading...'}</h4>
                                <div className="flex items-center justify-center gap-1.5 mb-4">
                                    <span className={`w-2 h-2 rounded-full ${selectedUserOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                    <p className="text-[10px] uppercase tracking-widest font-black">
                                        {selectedUserOnline ? 'Online' : 'Offline'}
                                    </p>
                                </div>
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-4">
                                    {selectedChat?.userType || 'Customer'}
                                </p>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-[#1A1A1A] p-3 rounded-xl border border-white/[0.03]">
                                        <p className="text-[8px] text-gray-600 uppercase font-black mb-1 tracking-tighter">Phone</p>
                                        <p className="text-xs font-bold text-gray-300 truncate">{customerDetails?.phone || 'N/A'}</p>
                                    </div>
                                    <div className="bg-[#1A1A1A] p-3 rounded-xl border border-white/[0.03]">
                                        <p className="text-[8px] text-gray-600 uppercase font-black mb-1 tracking-tighter">Email</p>
                                        <p className="text-xs font-bold text-gray-300 truncate">{customerDetails?.email || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Bookings */}
                            <div className="space-y-4">
                                <h5 className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                                    <Calendar size={12} className="text-orange-500" />
                                    Recent Bookings
                                </h5>
                                <div className="space-y-2">
                                    {customerBookings.length > 0 ? (
                                        customerBookings.slice(0, 3).map(booking => (
                                            <div key={booking.id} className="bg-[#1A1A1A] p-3 rounded-xl border border-white/[0.03] hover:border-orange-500/20 transition-all group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="text-xs font-bold truncate flex-1 pr-2">{booking.serviceName || 'Service'}</p>
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full uppercase font-black ${booking.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                        {booking.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[9px] text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        {booking.date}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {booking.time}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-gray-600 italic">No bookings found</p>
                                    )}
                                </div>
                            </div>

                            {/* Recent Orders */}
                            <div className="space-y-4">
                                <h5 className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] flex items-center gap-2">
                                    <ImageIcon size={12} className="text-orange-500" />
                                    Recent Orders
                                </h5>
                                <div className="space-y-2">
                                    {customerOrders.length > 0 ? (
                                        customerOrders.slice(0, 3).map(order => (
                                            <div key={order.id} className="bg-[#1A1A1A] p-3 rounded-xl border border-white/[0.03] group">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-xs font-bold text-gray-300">Order #{order.id?.slice(-6).toUpperCase()}</p>
                                                    <p className="text-xs font-black text-orange-500">₱{order.totalPrice || order.total}</p>
                                                </div>
                                                <p className="text-[9px] text-gray-600 mb-2 truncate">{order.items?.map((i: any) => i.name).join(', ')}</p>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[8px] text-gray-500">{order.date}</span>
                                                    <span className="text-[8px] px-1.5 py-0.5 bg-white/5 rounded-full uppercase text-gray-400">{order.status}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-gray-600 italic">No orders found</p>
                                    )}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="pt-4 border-t border-white/5 space-y-2">
                                <button 
                                    onClick={() => navigate(`/admin/bookings?customerId=${customerDetails?.id}`)}
                                    className="w-full bg-white/5 hover:bg-orange-500 text-white py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all hover:shadow-lg hover:shadow-orange-500/20"
                                >
                                    View All History
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button className="bg-[#1A1A1A] hover:bg-white/5 text-gray-400 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all flex items-center justify-center gap-2">
                                        <Phone size={12} />
                                        Call
                                    </button>
                                    <button className="bg-[#1A1A1A] hover:bg-white/5 text-gray-400 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all flex items-center justify-center gap-2">
                                        <Mail size={12} />
                                        Email
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Image Preview Overlay */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 animate-fadeIn"
                    onClick={() => setPreviewImage(null)}
                >
                    <button 
                        className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
                        onClick={() => setPreviewImage(null)}
                    >
                        <X size={32} />
                    </button>
                    <img 
                        src={previewImage} 
                        alt="Preview" 
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-scaleIn" 
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};

export default AdminChatScreen;
