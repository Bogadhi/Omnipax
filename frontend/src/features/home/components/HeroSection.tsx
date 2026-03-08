'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, ChevronDown } from 'lucide-react';

const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'];

const QUICK_FILTERS = [
  { label: '🔥 Today', value: 'today' },
  { label: '📅 This Weekend', value: 'weekend' },
  { label: '🎬 Movies', href: '/events?type=MOVIE' },
  { label: '🎤 Concerts', href: '/events?type=CONCERT' },
];

function getWeekendDateRange() {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 6=Sat
  const daysToSat = day === 0 ? 6 : 6 - day;
  const sat = new Date(today);
  sat.setDate(today.getDate() + daysToSat);
  return sat.toISOString().split('T')[0];
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

export function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [cityOpen, setCityOpen] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  // ── CURSOR GLOW (PERFORMANCE OPTIMIZED) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId: number;
    const handleMouseMove = (e: MouseEvent) => {
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        el.style.setProperty('--mouse-x', `${x}px`);
        el.style.setProperty('--mouse-y', `${y}px`);
      });
    };

    el.addEventListener('mousemove', handleMouseMove);
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = () => setCityOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    router.push(`/events?${params.toString()}`);
  };

  const handleQuickFilter = (f: typeof QUICK_FILTERS[number]) => {
    if ('href' in f && f.href) { router.push(f.href); return; }
    const date = f.value === 'today' ? getTodayDate() : getWeekendDateRange();
    router.push(`/events?date=${date}`);
  };

  // ── ANIMATION VARIANTS ──
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <section 
      ref={containerRef}
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20 z-10"
    >
      {/* ── BACKGROUND LAYER (Z-0) ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0514] via-[#0d0a1f] to-[#070412] -z-10" />

      {/* Subtle Radial Depth Behind Headline */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] pointer-events-none opacity-[0.12] -z-10"
        style={{ background: 'radial-gradient(circle at 50% 40%, rgba(124,58,237,0.4), transparent 65%)' }}
      />

      {/* Floating glow blobs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-[700px] h-[700px] rounded-full opacity-[0.18] blur-[130px] pointer-events-none -z-10"
        style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.15, 1], x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.13] blur-[110px] pointer-events-none -z-10"
        style={{ background: 'radial-gradient(circle, #4F46E5 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.2, 1], x: [0, -20, 0], y: [0, 25, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      
      {/* Cursor Glow Effect */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-500 -z-10"
        style={{
          background: `radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), rgba(124,58,237,0.06), transparent 80%)`
        }}
      />

      <div className="absolute inset-0 opacity-[0.03] -z-10" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />

      {/* ── CONTENT LAYER (Z-10) ── */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="relative z-10 max-w-4xl mx-auto px-6 text-center"
      >
        {/* Eyebrow */}
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm font-medium mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Movies · Concerts · Live Events
        </motion.div>

        {/* Headline */}
        <div className="mb-8 md:mb-12">
          <motion.h1 variants={itemVariants} className="text-[2.5rem] leading-none sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white">
            Experience Movies
          </motion.h1>
          <motion.h1 variants={itemVariants} className="text-[2.5rem] leading-none sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            &amp; Live Events
          </motion.h1>
          <motion.h1 variants={itemVariants} className="text-[2.5rem] leading-none sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white">
            Like Never Before.
          </motion.h1>
        </div>

        <motion.p
          variants={itemVariants}
          className="text-base md:text-xl text-gray-400 max-w-xl mx-auto mb-10 md:mb-14 font-medium"
        >
          Premium ticket booking with zero convenience fees. Secure payments. Instant confirmation.
        </motion.p>

        {/* ── SEARCH BAR ── */}
        <motion.div
          variants={itemVariants}
          className="max-w-2xl mx-auto mb-8"
        >
          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row gap-0 rounded-3xl overflow-hidden border border-white/10 bg-[#120d26]/50 backdrop-blur-3xl shadow-2xl shadow-black/40 focus-within:border-violet-500/40 transition-all duration-300"
          >
            {/* City picker */}
            <div
              className="relative flex-shrink-0 md:border-r border-white/5"
              onClick={(e) => { e.stopPropagation(); setCityOpen((v) => !v); }}
            >
              <div className="flex items-center gap-2 px-6 py-5 cursor-pointer min-w-[140px] hover:bg-white/5 transition-colors">
                <MapPin className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <span className="text-white text-sm font-bold truncate tracking-wide">{city}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 ml-auto transition-transform ${cityOpen ? 'rotate-180' : ''}`} />
              </div>

              {cityOpen && (
                <div className="absolute top-full left-0 mt-2 bg-[#100c20] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden min-w-[180px]">
                  {CITIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setCity(c); setCityOpen(false); }}
                      className={`w-full text-left px-5 py-3 text-sm font-medium transition-colors ${
                        city === c
                          ? 'bg-violet-600/20 text-violet-300'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search input */}
            <div className="flex-1 flex items-center border-t border-white/5 md:border-t-0">
              <Search className="w-4 h-4 text-gray-500 ml-6 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies, concerts..."
                className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm font-medium px-4 py-5 outline-none"
              />
            </div>

            {/* Search button */}
            <button
              type="submit"
              className="m-2 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_10px_30px_rgba(124,58,237,0.4)] flex-shrink-0 active:scale-[0.97]"
            >
              Search
            </button>
          </form>
        </motion.div>

        {/* Quick filter pills */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap justify-center gap-2 mb-12"
        >
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => handleQuickFilter(f)}
              className="px-4 py-1.5 rounded-full text-sm text-gray-300 border border-white/10 bg-white/5 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200 transition-all duration-200"
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap justify-center gap-6 text-sm text-gray-500"
        >
          {['2,400+ Tickets Booked', '40+ Partner Venues', '4.8★ Rated Experience'].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-violet-500/60" />
              {item}
            </span>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#070412] to-transparent pointer-events-none -z-10" />
    </section>
  );
}
