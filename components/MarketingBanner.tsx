import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Sparkles, Tag, Star, Shield, Zap, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';

const MarketingBanner = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [randomSlides, setRandomSlides] = useState<any[]>([]);

    // Pool of all possible marketing slides
    const slidePool = useMemo(() => [
        {
            id: 1,
            title: "Summer Maintenance Sale",
            subtitle: "Get 20% OFF on all oil changes this month!",
            bg: "bg-gradient-to-r from-orange-600 to-red-600",
            icon: <Tag className="text-white fill-white/20" size={32} />,
            link: "/customer-portal/services",
            cta: "Book Now",
            image: "/assets/maintenance.png"
        },
        {
            id: 2,
            title: "New Parts Arrival",
            subtitle: "Upgrade your engine with our latest genuine parts.",
            bg: "bg-gradient-to-r from-blue-700 to-indigo-800",
            icon: <Sparkles className="text-white fill-white/20" size={32} />,
            link: "/customer-portal/parts-store",
            cta: "Shop Parts",
            image: "/assets/parts.png"
        },
        {
            id: 3,
            title: "Join Premium Club",
            subtitle: "Exclusive discounts and priority booking for members.",
            bg: "bg-gradient-to-r from-emerald-600 to-teal-700",
            icon: <Star className="text-white fill-white/20" size={32} />,
            link: "/customer-portal/profile",
            cta: "Join Now",
            image: "/assets/vip.png"
        },
        {
            id: 4,
            title: "Safety First Checkup",
            subtitle: "Free 20-point safety inspection with any brake service.",
            bg: "bg-gradient-to-r from-slate-700 to-gray-800",
            icon: <Shield className="text-white fill-white/20" size={32} />,
            link: "/customer-portal/services",
            cta: "Learn More",
            image: "/assets/safety.png"
        }
    ], []);

    useEffect(() => {
        // Randomly select 3 unique slides on mount
        const shuffled = [...slidePool].sort(() => 0.5 - Math.random());
        setRandomSlides(shuffled.slice(0, 3));
    }, [slidePool]);

    useEffect(() => {
        if (randomSlides.length === 0) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % randomSlides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [randomSlides.length]);

    if (randomSlides.length === 0) return null;

    return (
        <div className="relative rounded-3xl overflow-hidden shadow-2xl mb-8 group h-64 sm:h-72 animate-slideUp">
            {randomSlides.map((slide, index) => (
                <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                    {/* Background Image with Overlay */}
                    <img
                        src={slide.image}
                        alt={slide.title}
                        className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-[2000ms]"
                        loading="eager"
                    />
                    <div className={`absolute inset-0 ${slide.bg} opacity-80 mix-blend-multiply`}></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent"></div>

                    {/* Content */}
                    <div className="relative z-20 h-full flex items-center px-8 sm:px-12">
                        <div className="max-w-[70%]">
                            <div className="flex items-center gap-3 mb-2 animate-fadeIn">
                                <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg">
                                    {slide.icon}
                                </div>
                                <span className="text-[10px] font-black  tracking-widest text-white/90 bg-white/10 px-3 py-1 rounded-full border border-white/10 backdrop-blur-sm">Featured</span>
                            </div>
                            <h3 className="text-[20px] font-black text-white leading-tight mb-2 drop-shadow-lg line-clamp-2">{slide.title}</h3>
                            <p className="text-[12px] text-gray-200 font-medium mb-5 line-clamp-2 drop-shadow-md opacity-90">{slide.subtitle}</p>

                            <Link
                                to={slide.link}
                                className="inline-flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-full text-xs font-black  tracking-wide hover:bg-primary hover:text-white transition-all duration-300 transform hover:scale-105 shadow-xl group-hover:shadow-2xl"
                            >
                                {slide.cta}
                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>
            ))}

            {/* Indicators */}
            <div className="absolute bottom-4 left-0 right-0 z-30 flex justify-center gap-2">
                {randomSlides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`h-1.5 rounded-full transition-all duration-300 backdrop-blur-sm ${index === currentSlide ? 'w-8 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default MarketingBanner;
