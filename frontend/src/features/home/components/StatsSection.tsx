'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

// Realistic MVP-scale stats. Pull from backend when analytics endpoint is ready.
const STATS = [
  { value: 2400, suffix: '+', label: 'Tickets Booked' },
  { value: 42, suffix: '+', label: 'Events Hosted' },
  { value: 4.8, suffix: '★', label: 'Avg Rating', isDecimal: true },
  { value: 38, suffix: '+', label: 'Partner Venues' },
];

function AnimatedCounter({
  value,
  suffix,
  isDecimal,
}: {
  value: number;
  suffix: string;
  isDecimal?: boolean;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1600;
          const steps = 60;
          const increment = value / steps;
          let current = 0;
          const timer = setInterval(() => {
            current = Math.min(current + increment, value);
            setCount(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current));
            if (current >= value) clearInterval(timer);
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, isDecimal]);

  return (
    <span ref={ref} className="tabular-nums">
      {isDecimal ? count.toFixed(1) : count.toLocaleString('en-IN')}
      {suffix}
    </span>
  );
}

export function StatsSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#07050f] via-[#0a0616] to-[#07050f]" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(124,58,237,0.1) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="text-violet-400 text-sm font-semibold uppercase tracking-widest">
            Growing Every Day
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white mt-2">
            StarPass by the Numbers
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            Real numbers from real bookings — no fluff.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-2">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  isDecimal={stat.isDecimal}
                />
              </div>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
