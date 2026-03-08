'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const CATEGORIES = [
  { icon: '🎬', label: 'Movies', href: '/events?type=MOVIE', color: 'from-violet-600/20 to-purple-600/10' },
  { icon: '🎤', label: 'Concerts', href: '/events?type=CONCERT', color: 'from-pink-600/20 to-rose-600/10' },
  { icon: '🎭', label: 'Theater', href: '/events?type=EVENT', color: 'from-amber-600/20 to-orange-600/10' },
  { icon: '🏟', label: 'Sports Events', href: '/events?type=GENERAL_ADMISSION', color: 'from-emerald-600/20 to-teal-600/10' },
];

export function CategoryStrip() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap justify-center gap-4"
        >
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -4, scale: 1.03 }}
            >
              <Link
                href={cat.href}
                className={`flex flex-col items-center gap-3 px-8 py-5 rounded-2xl border border-white/8 bg-gradient-to-b ${cat.color} backdrop-blur-sm hover:border-violet-500/30 transition-all duration-300 group min-w-[130px]`}
              >
                <span className="text-3xl group-hover:scale-110 transition-transform duration-300">
                  {cat.icon}
                </span>
                <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">
                  {cat.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
