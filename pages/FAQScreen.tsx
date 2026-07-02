import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerHeader from '../components/CustomerHeader';
import { useDatabase } from '../context/DatabaseContext';
import { FAQItem } from '../types';
import Spinner from '../components/Spinner';
import { Search, ChevronDown, MessageCircle, Mail, Phone, HelpCircle, FileText } from 'lucide-react';

const AccordionItem: React.FC<{ faq: FAQItem, isOpen: boolean, onToggle: () => void }> = ({ faq, isOpen, onToggle }) => {
    return (
        <div className={`mb-3 rounded-2xl overflow-hidden border transition-all duration-300 ${isOpen ? 'bg-[#1E1E1E] border-primary/30 shadow-lg shadow-primary/5' : 'bg-[#1E1E1E] border-white/5 hover:border-white/10'}`}>
            <button
                onClick={onToggle}
                className="w-full flex justify-between items-center text-left p-5 focus:outline-none group"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-primary text-white' : 'bg-white/5 text-gray-500 group-hover:bg-white/10'}`}>
                        <HelpCircle size={16} />
                    </div>
                    <span className={`font-bold text-sm transition-colors ${isOpen ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{faq.question}</span>
                </div>
                <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={20} className={isOpen ? 'text-primary' : 'text-gray-600'} />
                </div>
            </button>
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-5 pt-0 pl-16 pr-8 text-gray-400 text-sm leading-relaxed">
                    {faq.answer}
                </div>
            </div>
        </div>
    );
};

const FAQScreen: React.FC = () => {
    const navigate = useNavigate();
    const { db, loading } = useDatabase();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [openItem, setOpenItem] = useState<string | null>(null);

    // Extract unique categories safely
    const categories = useMemo(() => {
        if (!db?.faqs) return [];
        const cats = Array.from(new Set(db.faqs.map(c => c.category).filter(Boolean)));
        return ['all', ...cats];
    }, [db?.faqs]);

    // Handle search input change - resets category to 'all' to ensure global search
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        if (e.target.value && selectedCategory !== 'all') {
            setSelectedCategory('all');
        }
    };

    const filteredFaqs = useMemo(() => {
        if (!db?.faqs) return [];

        // Merge duplicate categories and deduplicate items
        const mergedCategories: { [key: string]: FAQItem[] } = {};
        db.faqs.forEach(cat => {
            if (!mergedCategories[cat.category]) {
                mergedCategories[cat.category] = [];
            }
            if (cat.items) {
                // Add items only if they don't already exist in this category
                cat.items.forEach(newItem => {
                    const exists = mergedCategories[cat.category].some(
                        existingItem => existingItem.question === newItem.question
                    );
                    if (!exists) {
                        mergedCategories[cat.category].push(newItem);
                    }
                });
            }
        });

        let faqs = Object.entries(mergedCategories).map(([category, items]) => ({
            category,
            items
        }));

        // 1. Filter by category
        if (selectedCategory !== 'all') {
            faqs = faqs.filter(c => c.category === selectedCategory);
        }

        // 2. Filter by search query
        if (!searchQuery) {
            return faqs;
        }

        const lowercasedQuery = searchQuery.toLowerCase();

        return faqs
            .map(category => ({
                ...category,
                items: (category.items || []).filter(
                    item =>
                        (item.question && item.question.toLowerCase().includes(lowercasedQuery)) ||
                        (item.answer && item.answer.toLowerCase().includes(lowercasedQuery))
                ),
            }))
            .filter(category => category.items && category.items.length > 0);
    }, [searchQuery, selectedCategory, db?.faqs]);

    const handleToggle = (question: string) => {
        setOpenItem(prev => (prev === question ? null : question));
    };

    if (loading || !db) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#121212]">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#121212]">
            <CustomerHeader title="Help Center" showBackButton icon={<HelpCircle size={22} />} />

            <main className="flex-grow overflow-y-auto pb-6">
                {/* Hero Search Section */}
                <div className="relative bg-[#1E1E1E] pb-10 pt-6 px-6 rounded-b-[2rem] shadow-2xl border-b border-white/5 mb-8">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>

                    <div className="relative z-10">
                        <h2 className="text-2xl font-black text-white mb-2 text-center tracking-tight">How can we help you?</h2>
                        <p className="text-gray-500 text-sm text-center mb-6">Search for answers or browse topics below</p>

                        <div className="relative max-w-md mx-auto">
                            <input
                                type="text"
                                placeholder="Search questions..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="w-full pl-12 pr-10 py-4 bg-[#121212] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none shadow-lg transition-all"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-6 space-y-6">
                    {/* Category Pills */}
                    <div className="flex space-x-3 overflow-x-auto scrollbar-hide -mx-2 px-2 pb-2">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold  tracking-wide transition-all ${selectedCategory === cat ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-[#1E1E1E] text-gray-500 border border-white/5 hover:bg-white/5 hover:text-white'}`}
                            >
                                {cat === 'all' ? 'All Topics' : cat}
                            </button>
                        ))}
                    </div>

                    {/* FAQ List */}
                    <div className="min-h-[300px]">
                        {filteredFaqs.length > 0 ? (
                            filteredFaqs.map((category) => (
                                <div key={category.category} className="mb-8 animate-slideUp">
                                    {selectedCategory === 'all' && (
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="h-px bg-white/10 flex-grow"></div>
                                            <h3 className="text-xs font-black text-gray-500  tracking-widest">{category.category}</h3>
                                            <div className="h-px bg-white/10 flex-grow"></div>
                                        </div>
                                    )}
                                    <div>
                                        {category.items.map(faq => (
                                            <AccordionItem
                                                key={faq.question}
                                                faq={faq}
                                                isOpen={openItem === faq.question}
                                                onToggle={() => handleToggle(faq.question)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                                <FileText size={48} className="text-gray-600 mb-4" />
                                <p className="text-lg font-bold text-white">No results found</p>
                                <p className="text-sm text-gray-500">
                                    {searchQuery ? `No matches for "${searchQuery}"` : 'No FAQs available'}
                                </p>
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="mt-4 text-primary text-xs font-bold  tracking-wide hover:underline">Clear Search</button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default FAQScreen;
