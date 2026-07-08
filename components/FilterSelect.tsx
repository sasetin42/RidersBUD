import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface FilterSelectProps {
    label: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    showSearch?: boolean;
    className?: string;
    accentColor?: string;
}

const FilterSelect: React.FC<FilterSelectProps> = ({
    label,
    options,
    value,
    onChange,
    showSearch = false,
    className = '',
    accentColor = '#FE7803',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(o => o.value === value);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && showSearch && searchInputRef.current) {
            searchInputRef.current.focus();
        }
        if (!isOpen) {
            setSearchQuery('');
        }
    }, [isOpen, showSearch]);

    const filteredOptions = showSearch && searchQuery
        ? options.filter(o => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : options;

    const handleSelect = useCallback((val: string) => {
        onChange(val);
        setIsOpen(false);
    }, [onChange]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(prev => !prev);
        }
        if (e.key === 'Escape') {
            setIsOpen(false);
        }
        if (e.key === 'ArrowDown' && isOpen) {
            e.preventDefault();
            const currentIndex = filteredOptions.findIndex(o => o.value === value);
            const nextIndex = Math.min(currentIndex + 1, filteredOptions.length - 1);
            if (filteredOptions[nextIndex]) {
                onChange(filteredOptions[nextIndex].value);
            }
        }
        if (e.key === 'ArrowUp' && isOpen) {
            e.preventDefault();
            const currentIndex = filteredOptions.findIndex(o => o.value === value);
            const prevIndex = Math.max(currentIndex - 1, 0);
            if (filteredOptions[prevIndex]) {
                onChange(filteredOptions[prevIndex].value);
            }
        }
    };

    const styleVariables = useMemo(() => {
        let rgb = '254, 120, 3'; // default #FE7803 rgb
        try {
            const cleanHex = accentColor.replace('#', '');
            if (cleanHex.length === 6) {
                const r = parseInt(cleanHex.substring(0, 2), 16);
                const g = parseInt(cleanHex.substring(2, 4), 16);
                const b = parseInt(cleanHex.substring(4, 6), 16);
                if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                    rgb = `${r}, ${g}, ${b}`;
                }
            }
        } catch (e) {
            // fallback
        }
        return {
            '--accent-rgb': rgb,
            '--accent-color': accentColor,
        } as React.CSSProperties;
    }, [accentColor]);

    return (
        <div ref={containerRef} className={`relative ${className}`} style={styleVariables}>
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                onKeyDown={handleKeyDown}
                className={`
                    w-full h-11 sm:h-12 pl-3 pr-7 sm:pl-4 sm:pr-8 flex flex-col items-start justify-center
                    rounded-xl border transition-all duration-200 cursor-pointer
                    ${isOpen
                        ? 'border-[var(--accent-color)] shadow-[0_0_0_1px_rgba(var(--accent-rgb),0.25)]'
                        : 'border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.15)]'
                    }
                    bg-[#1B2332]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--accent-rgb),0.4)]
                `}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={label}
            >
                <span className="text-[9px] min-[360px]:text-[10px] sm:text-[11px] font-medium text-[rgba(255,255,255,0.5)] leading-none mb-0.5 tracking-wide uppercase truncate w-full text-left">
                    {label}
                </span>
                <span className="text-xs min-[360px]:text-sm sm:text-[15px] font-semibold text-white leading-none truncate w-full text-left">
                    {selectedOption?.label || 'Select...'}
                </span>
            </button>

            <ChevronDown
                className={`
                    absolute right-2 sm:right-3.5 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.5)]
                    transition-transform duration-200 pointer-events-none w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]
                    ${isOpen ? 'rotate-180' : ''}
                `}
            />

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1B2332] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden animate-fadeIn origin-top">
                    {showSearch && options.length > 8 && (
                        <div className="p-2 border-b border-[rgba(255,255,255,0.06)]">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.35)]" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full h-9 pl-9 pr-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-white placeholder-[rgba(255,255,255,0.35)] outline-none focus:border-[rgba(var(--accent-rgb),0.5)] transition-colors"
                                />
                            </div>
                        </div>
                    )}
                    <div className="max-h-56 overflow-y-auto py-1">
                        {filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelect(option.value)}
                                className={`
                                    w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-3
                                    ${value === option.value
                                        ? 'text-white font-semibold bg-[rgba(var(--accent-rgb),0.12)]'
                                        : 'text-[rgba(255,255,255,0.65)] hover:bg-[rgba(var(--accent-rgb),0.08)] hover:text-white'
                                    }
                                `}
                                role="option"
                                aria-selected={value === option.value}
                            >
                                <span className="capitalize truncate">{option.label}</span>
                                {value === option.value && (
                                    <Check size={15} className="text-[var(--accent-color)] shrink-0" />
                                )}
                            </button>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="px-4 py-8 text-center text-[rgba(255,255,255,0.35)] text-sm">
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FilterSelect;
