import React, { useState } from 'react';
import { MessageSquare, HelpCircle, Bot, Plus, Trash2, Edit2, Check, Phone, Mail } from 'lucide-react';
import { Settings, FAQItem } from '../../../../types';

interface SupportSettingsTabProps {
    settings: Settings;
    onChange: (field: keyof Settings, value: any) => void;
}

export const SupportSettingsTab: React.FC<SupportSettingsTabProps> = ({
    settings,
    onChange
}) => {
    const [newQuestion, setNewQuestion] = useState('');
    const [newAnswer, setNewAnswer] = useState('');
    const [newCategory, setNewCategory] = useState('General');

    const faqs = settings.faqs || [
        {
            id: 'faq_1',
            question: 'How do I track my assigned mechanic in real-time?',
            answer: 'Once a mechanic accepts your booking, open the Booking Detail page to view their live GPS pin moving towards your location.',
            category: 'Bookings'
        },
        {
            id: 'faq_2',
            question: 'What payment methods are supported?',
            answer: 'We support instant GCash, Maya, Debit/Credit Cards via HitPay, as well as Cash on Service Delivery.',
            category: 'Payments'
        }
    ];

    const handleAddFaq = () => {
        if (!newQuestion.trim() || !newAnswer.trim()) return;
        const newItem: FAQItem = {
            id: 'faq_' + Date.now(),
            question: newQuestion.trim(),
            answer: newAnswer.trim(),
            category: newCategory
        };
        onChange('faqs', [...faqs, newItem]);
        setNewQuestion('');
        setNewAnswer('');
    };

    const handleDeleteFaq = (id?: string) => {
        if (!id) return;
        onChange('faqs', faqs.filter(f => f.id !== id));
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Support Desk Channels */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <MessageSquare size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Customer Support & Live Concierge</h3>
                        <p className="text-xs text-gray-500">Public helpdesk parameters and automated virtual mechanics bot.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Help Center / Knowledgebase URL</label>
                        <input
                            type="url"
                            value={settings.helpCenterUrl || ''}
                            onChange={(e) => onChange('helpCenterUrl', e.target.value)}
                            placeholder="https://help.ridersbud.com"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">Virtual AI Concierge Name</label>
                        <input
                            type="text"
                            value={settings.virtualMechanicName || 'Buddy Mech'}
                            onChange={(e) => onChange('virtualMechanicName', e.target.value)}
                            placeholder="Buddy Mech"
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">SLA First Response Target (Hours)</label>
                        <input
                            type="number"
                            min={1}
                            value={settings.slaResponseTimeHours ?? 2}
                            onChange={(e) => onChange('slaResponseTimeHours', parseFloat(e.target.value) || 2)}
                            className="w-full bg-black/50 border border-white/10 focus:border-primary rounded-2xl px-4 py-3 text-xs text-white outline-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] tracking-widest font-black text-gray-400 uppercase block">In-App Live Chat Status</label>
                        <div className="pt-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.chatEnabled ?? true}
                                    onChange={(e) => onChange('chatEnabled', e.target.checked)}
                                    className="w-4 h-4 rounded text-primary accent-primary"
                                />
                                <span className="text-xs text-gray-300 font-bold">Enabled for all mobile users</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Knowledgebase FAQ Manager */}
            <div className="space-y-5 bg-[#121212]/70 border border-white/5 p-6 rounded-3xl">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                            <HelpCircle size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">FAQ Knowledgebase Items</h3>
                            <p className="text-xs text-gray-500">Live answers displayed on customer and mechanic help tabs.</p>
                        </div>
                    </div>

                    <span className="text-xs font-bold text-gray-400">{faqs.length} Active Articles</span>
                </div>

                {/* FAQ List */}
                <div className="space-y-3">
                    {faqs.map((f) => (
                        <div
                            key={f.id || f.question}
                            className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-start justify-between gap-4"
                        >
                            <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-[9px] font-black uppercase text-primary border border-primary/20">
                                        {f.category || 'General'}
                                    </span>
                                    <h4 className="text-xs font-bold text-white">{f.question}</h4>
                                </div>
                                <p className="text-[11px] text-gray-400 leading-relaxed">{f.answer}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDeleteFaq(f.id)}
                                className="p-1.5 rounded-xl text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                title="Delete FAQ"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add FAQ Form */}
                <div className="p-4 rounded-2xl bg-black/60 border border-dashed border-white/10 space-y-3">
                    <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Plus size={14} className="text-primary" />
                        <span>Add New Knowledgebase Article</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <input
                                type="text"
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                placeholder="Article Question..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                placeholder="Category (e.g. Bookings, Payments)"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary"
                            />
                        </div>
                    </div>
                    <textarea
                        rows={2}
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        placeholder="Detailed answer content..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-primary"
                    />
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleAddFaq}
                            disabled={!newQuestion.trim() || !newAnswer.trim()}
                            className="px-4 py-2 bg-primary hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                        >
                            <Plus size={13} />
                            <span>Save Article</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
