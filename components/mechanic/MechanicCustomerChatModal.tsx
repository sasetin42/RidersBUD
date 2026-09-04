import React, { useState, useEffect, useRef } from 'react';
import { Booking, Customer, Mechanic } from '../../types';
import { useChat, ChatMessage } from '../../utils/chatManager';
import { optimizeImageToWebP } from '../../utils/imageOptimizer';
import { useDatabase } from '../../context/DatabaseContext';
import { safeGetCurrentPosition } from '../../utils/locationHelper';
import { Send, MapPin, Paperclip, MoreHorizontal, X, CornerUpLeft, FileText, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MechanicCustomerChatModalProps {
    booking: Booking;
    customer: Customer;
    mechanic: Mechanic;
    onClose: () => void;
}

const MechanicCustomerChatModal: React.FC<MechanicCustomerChatModalProps> = ({ booking, customer, mechanic, onClose }) => {
    const { messages, sendMessage } = useChat(booking.id);
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<Array<{ type: 'image' | 'file'; url: string; name: string }>>([]);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const { db } = useDatabase();

    const liveCustomer = db?.customers?.find(
        (c) => c.id === customer.id || c.id === booking.customerId || c.name === booking.customerName
    ) || customer;

    useEffect(() => {
        sessionStorage.setItem(`chat_open_${booking.id}`, 'true');
        sessionStorage.removeItem(`chat_closed_${booking.id}`);
        return () => {
            sessionStorage.removeItem(`chat_open_${booking.id}`);
        };
    }, [booking.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() && attachments.length === 0) return;

        const currentReply = replyingTo;
        const currentAttachments = [...attachments];
        
        setInput('');
        setAttachments([]);
        setReplyingTo(null);

        const newMessage: ChatMessage = {
            sender: 'mechanic',
            text: input,
            timestamp: Date.now(),
            ...(currentAttachments.length > 0 && { attachments: currentAttachments }),
            ...(currentReply && { replyTo: currentReply })
        };
        sendMessage(newMessage);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        if (!files.length) return;

        const newAttachments: Array<{ type: 'image' | 'file'; url: string; name: string }> = [];

        for (const file of files) {
            if (file.size > 3 * 1024 * 1024) {
                alert(`Caution: The file "${file.name}" exceeds the maximum upload capacity of 3MB and will not be attached.`);
                continue;
            }

            if (file.type.startsWith('image/')) {
                try {
                    const webpUrl = await optimizeImageToWebP(file, 1920, 0.8);
                    newAttachments.push({ type: 'image', url: webpUrl, name: file.name.replace(/\.[^/.]+$/, "") + ".webp" });
                } catch (error) {
                    console.error("Failed to optimize image:", error);
                    const reader = new FileReader();
                    const result = await new Promise<string>((resolve) => {
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                    });
                    newAttachments.push({ type: 'image', url: result, name: file.name });
                }
            } else {
                const reader = new FileReader();
                const result = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });
                newAttachments.push({ type: 'file', url: result, name: file.name });
            }
        }

        if (newAttachments.length > 0) {
            setAttachments(prev => [...prev, ...newAttachments]);
        }
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleShareLocation = () => {
        safeGetCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const mapsLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

                const currentReply = replyingTo;
                setReplyingTo(null);

                const newMessage: ChatMessage = {
                    sender: 'mechanic',
                    text: mapsLink,
                    timestamp: Date.now(),
                    ...(currentReply && { replyTo: currentReply })
                };
                sendMessage(newMessage);
            },
            (error) => {
                console.error("Location error:", error);
            }
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-[#111111] w-full max-w-md h-[85vh] sm:h-[80vh] flex flex-col rounded-[24px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
            >
                {/* Header */}
                <header className="flex items-center p-4 bg-gradient-to-r from-[#1b1b1b] to-[#161616] border-b border-white/5 flex-shrink-0 relative">
                    <div className="relative flex items-center w-full z-10">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-[#242424] shadow-md border-2 border-[#111111]">
                                <img src={liveCustomer.picture || '/default-user.jpg'} alt={liveCustomer.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(liveCustomer.name || 'User')}&background=0D8ABC&color=fff`; }} />
                            </div>
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#111111] rounded-full"></span>
                        </div>
                        <div className="flex-1 ml-4">
                            <h2 className="font-black text-white text-lg tracking-tight leading-none mb-1">{liveCustomer.name || booking.customerName || 'Customer'}</h2>
                            <p className="text-[11px] text-green-400 font-medium tracking-wide">Online • Customer</p>
                        </div>
                        <button 
                            onClick={() => {
                                sessionStorage.setItem(`chat_closed_${booking.id}`, 'true');
                                onClose();
                            }} 
                            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </header>

                {/* Chat Area */}
                <main className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#111111]">
                    {messages.map((msg, index) => {
                        const isMe = msg.sender === 'mechanic';
                        return (
                            <div key={index} className={`flex items-end gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                {!isMe && (
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 shrink-0 border border-white/10 shadow-sm">
                                        <img src={liveCustomer.picture || '/default-user.jpg'} alt={liveCustomer.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(liveCustomer.name || 'User')}&background=0D8ABC&color=fff`; }} />
                                    </div>
                                )}
                                <div className={`max-w-[75%] relative group/msg flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                                    <button
                                        onClick={() => setReplyingTo(msg)}
                                        className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white ${isMe ? '-left-10' : '-right-10'}`}
                                        title="Reply"
                                    >
                                        <CornerUpLeft size={16} />
                                    </button>
                                    
                                    {!isMe && (
                                        <span className="text-[10px] font-bold text-gray-500 px-1 leading-none mb-1">
                                            {liveCustomer.name || booking.customerName || 'Customer'}
                                        </span>
                                    )}

                                    {msg.text && msg.text.startsWith('https://www.google.com/maps') ? (
                                        <div className="flex flex-col gap-1">
                                            {msg.replyTo && (
                                                <div className="text-xs bg-[#242424] px-3 py-2 rounded-xl border border-white/5 opacity-80 max-w-[200px]">
                                                    <div className="font-semibold text-gray-300 mb-0.5">{msg.replyTo.sender === 'customer' ? (liveCustomer.name || 'Customer') : 'You'}</div>
                                                    <div className="truncate text-gray-400">{msg.replyTo.text || '[Attachment]'}</div>
                                                </div>
                                            )}
                                            <a
                                                href={msg.text}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`group flex items-center justify-center gap-2 font-semibold px-4 py-2 text-sm rounded-[18px] transition-all hover:scale-[1.02] shadow-sm ${isMe ? 'bg-white text-orange-600 hover:bg-gray-100 rounded-br-sm' : 'bg-gradient-to-r from-[#ff6a00] to-[#ff7a18] text-white hover:shadow-[0_4px_12px_rgba(255,106,0,0.25)] rounded-bl-sm'}`}
                                            >
                                                <MapPin className="w-4 h-4 shrink-0" />
                                                Shared Location
                                            </a>
                                        </div>
                                    ) : (
                                        <div className={`px-4 py-3 rounded-[20px] shadow-sm max-w-full overflow-hidden ${isMe
                                            ? 'bg-gradient-to-br from-[#ff6a00] to-[#ff7a18] text-white rounded-br-sm'
                                            : 'bg-[#242424] text-white rounded-bl-sm border border-white/5'
                                            }`}>
                                            
                                            {msg.replyTo && (
                                                <div className={`mb-2 pb-2 text-xs border-b ${isMe ? 'border-white/20' : 'border-white/10'}`}>
                                                    <div className="font-semibold mb-0.5 opacity-80">{msg.replyTo.sender === 'customer' ? (liveCustomer.name || 'Customer') : 'You'}</div>
                                                    <div className="opacity-70 truncate max-w-[200px]">{msg.replyTo.text || '[Attachment]'}</div>
                                                </div>
                                            )}

                                            {msg.attachment && msg.attachment.type === 'image' && (
                                                <div className="rounded-xl overflow-hidden mb-2 max-w-[200px]">
                                                    <img src={msg.attachment.url} alt="attachment" className="w-full h-auto object-cover" />
                                                </div>
                                            )}
                                            {msg.attachment && msg.attachment.type !== 'image' && (
                                                <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-black/20">
                                                    <FileText size={20} />
                                                    <span className="text-sm truncate">{msg.attachment.name}</span>
                                                </div>
                                            )}

                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {msg.attachments.map((att, i) => (
                                                        att.type === 'image' ? (
                                                            <div key={i} className="rounded-xl overflow-hidden max-w-[200px]">
                                                                <img src={att.url} alt="attachment" className="w-full h-auto object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-black/20 max-w-full">
                                                                <FileText size={20} className="shrink-0" />
                                                                <span className="text-sm truncate">{att.name}</span>
                                                            </div>
                                                        )
                                                    ))}
                                                </div>
                                            )}
                                            {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>}
                                        </div>
                                    )}
                                    <span className="text-[10px] text-gray-500 px-1 font-medium">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </main>

                {/* Footer / Input */}
                <footer className="p-4 bg-[#1A1A1A] border-t border-white/5 flex-shrink-0 relative">
                    <AnimatePresence>
                        {attachments.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute bottom-full left-4 mb-4 p-2 bg-[#2a2a2a] border border-white/10 rounded-2xl shadow-xl flex gap-2 z-50 max-w-[90%] overflow-x-auto custom-scrollbar"
                            >
                                {attachments.map((att, i) => (
                                    <div key={i} className="relative flex items-center gap-2 pr-2 bg-black/20 rounded-lg shrink-0">
                                        {att.type === 'image' ? (
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0 relative group">
                                                <img src={att.url} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center shrink-0">
                                                <FileText className="w-6 h-6 text-gray-300" />
                                            </div>
                                        )}
                                        <div className="max-w-[100px] min-w-[60px]">
                                            <p className="text-xs text-gray-200 truncate">{att.name}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500/80 transition-colors shrink-0"
                                        >
                                            <Trash2 size={12} />
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
                                className="mb-3 px-4 py-3 bg-[#1f1f1f] border-l-4 border-[#ff6a00] rounded-r-xl rounded-l-sm shadow-sm relative flex items-start gap-3"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CornerUpLeft size={14} className="text-[#ff6a00]" />
                                        <span className="text-xs font-bold text-[#ff6a00]">
                                            Replying to {replyingTo.sender === 'customer' ? (liveCustomer.name || 'Customer') : 'You'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-300 truncate">
                                        {replyingTo.text || '[Attachment]'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setReplyingTo(null)}
                                    className="p-1 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
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

                        <div className="flex-1 relative flex items-center bg-[#1f1f1f] border border-white/10 rounded-full focus-within:border-[#ff6a00]/50 focus-within:ring-1 focus-within:ring-[#ff6a00]/50 transition-all shadow-inner">
                            <div className="relative" ref={menuRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className={`ml-2 w-10 h-10 rounded-full flex items-center justify-center text-[#ff6a00] hover:bg-white/5 transition-colors ${isMenuOpen ? 'bg-white/5' : ''}`}
                                >
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                                
                                <AnimatePresence>
                                    {isMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute bottom-full left-0 mb-4 w-52 bg-[#1b1b1b] border border-white/10 rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.5)] overflow-hidden z-[60]"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    fileInputRef.current?.click();
                                                    setIsMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-3.5 flex items-center gap-3 text-sm font-semibold text-white hover:bg-white/5 transition-colors border-b border-white/5"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-[#ff6a00]/10 flex items-center justify-center">
                                                    <Paperclip className="w-4 h-4 text-[#ff6a00]" />
                                                </div>
                                                Attach File
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleShareLocation();
                                                    setIsMenuOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-3.5 flex items-center gap-3 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                                                    <MapPin className="w-4 h-4 text-green-500" />
                                                </div>
                                                Share Location
                                            </button>
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
                                placeholder="Message Customer..."
                                className="flex-1 bg-transparent border-none focus:border-none focus:ring-0 focus:outline-none text-white pl-2 pr-3 py-3.5 placeholder:text-[#9ca3af] text-sm"
                            />
                            
                            <div className="pr-1.5 py-1.5">
                                <button
                                    type="submit"
                                    disabled={!input.trim() && attachments.length === 0}
                                    className="w-[38px] h-[38px] min-w-[38px] rounded-full bg-gradient-to-br from-[#ff6a00] to-[#ff7a18] text-white flex items-center justify-center hover:shadow-[0_0_15px_rgba(255,106,0,0.5)] transition-all disabled:opacity-50 disabled:hover:shadow-none"
                                >
                                    <Send size={16} className="ml-0.5" />
                                </button>
                            </div>
                        </div>
                    </form>
                </footer>
            </motion.div>
        </div>
    );
};

export default MechanicCustomerChatModal;
