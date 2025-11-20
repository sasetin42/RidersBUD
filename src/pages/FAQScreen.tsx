import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import { useDatabase } from '../context/DatabaseContext';
import { FAQItem } from '../types';
import Spinner from '../components/Spinner';

const AccordionItem: React.FC<{ faq: FAQItem, isOpen: boolean, onToggle: () => void }> = ({ faq, isOpen, onToggle }) => {
    return (
        <div className="border-b border-dark-gray">
            <button
                onClick={onToggle}
                className="w-full flex justify-between items-center text-left p-4 focus:outline-none"
                aria-expanded={isOpen}
            >
                <span className="font-semibold text-white">{faq.question}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-primary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-screen' : 'max-h-0'}`}>
                <div className="p-4 pt-0 text-light-gray text-sm">
                    <p>{faq.answer}</p>
                </div>
            </div>
        </div>
    );
};

const FAQScreen: React.FC = () => {
    const { db, loading } = useDatabase();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [openItem, setOpenItem] = useState<string | null>(null);
    
    const categories = useMemo(() => {
        if (!db?.faqs) return [];
        return ['all', ...db.faqs.map(c => c.category)];
    }, [db]);

    const filteredFaqs = useMemo(() => {
        if (!db?.faqs) return [];
        
        let faqs = db.faqs;

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
                items: category.items.filter(
                    item =>
                        item.question.toLowerCase().includes(lowercasedQuery) ||
                        item.answer.toLowerCase().includes(lowercasedQuery)
                ),
            }))
            .filter(category => category.items.length > 0);
    }, [searchQuery, selectedCategory, db]);

    const handleToggle = (question: string) => {
        setOpenItem(prev => (prev === question ? null : question));
    };
    
    if (loading || !db) {
        return (
            <div className="flex flex-col h-full bg-secondary">
                <Header title="FAQ & Support" showBackButton />
                <div className="flex-grow flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-secondary">
            <Header title="FAQ & Support" showBackButton />
            
            <div className="p-4 border-b border-dark-gray flex-shrink-0">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="Search for questions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 bg-field border border-dark-gray rounded-lg text-white placeholder-light-gray focus:outline-none focus:ring-1 focus:ring-primary"
                        aria-label="Search FAQs"
                    />
                     {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-3" aria-label="Clear search">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-light-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex space-x-3 overflow-x-auto scrollbar-hide p-4 border-b border-dark-gray flex-shrink-0">
                {categories.map(cat => (
                    <button 
                        key={cat} 
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${selectedCategory === cat ? 'bg-primary text-white' : 'bg-field text-light-gray hover:bg-dark-gray'}`}
                    >
                        {cat === 'all' ? 'All' : cat}
                    </button>
                ))}
            </div>


            <div className="flex-grow overflow-y-auto">
                {filteredFaqs.length > 0 ? (
                    filteredFaqs.map((category) => (
                        <div key={category.category} className="mb-6">
                            {selectedCategory === 'all' && (
                                <h2 className="text-xl font-bold text-primary p-4">{category.category}</h2>
                            )}
                            <div className="bg-secondary">
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
                    <div className="text-center p-8 text-light-gray">
                        <p>No FAQs found matching your criteria.</p>
                    </div>
                )}
            </div>
            
            <div className="p-4 mt-auto border-t border-dark-gray text-center flex-shrink-0">
                <p className="text-light-gray mb-3">Can't find what you're looking for?</p>
                <a 
                    href={`mailto:${db.settings.contactEmail}`}
                    className="bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-orange-600 transition inline-block"
                >
                    Contact Us
                </a>
            </div>
        </div>
    );
};

export default FAQScreen;