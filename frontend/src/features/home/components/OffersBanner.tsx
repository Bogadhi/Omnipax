'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function OffersBanner() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center"
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/80 via-purple-900/60 to-indigo-900/80" />
          <div className="absolute inset-0 opacity-40"
            style={{ background: 'radial-gradient(ellipse 60% 80% at 30% 50%, rgba(124,58,237,0.6) 0%, transparent 60%)' }}
          />
          <div className="absolute inset-0 opacity-20"
            style={{ background: 'radial-gradient(ellipse 50% 70% at 80% 30%, rgba(99,102,241,0.5) 0%, transparent 50%)' }}
          />

          {/* Border glow */}
          <div className="absolute inset-0 rounded-3xl border border-violet-400/20" />

          {/* Content */}
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-violet-200 text-xs font-semibold uppercase tracking-widest border border-white/20 mb-6">
              🎁 Limited Time Offer
            </span>

            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
              Unlock Exclusive Offers
            </h2>

            <p className="text-lg text-violet-200/80 mb-3">
              Use code{' '}
              <span className="font-mono font-bold text-white bg-white/15 px-3 py-1 rounded-lg border border-white/20">
                STAR20
              </span>{' '}
              and save on your next booking.
            </p>
            <p className="text-sm text-violet-300/60 mb-10">
              Valid on all movies &amp; live events. T&amp;C apply.
            </p>

            <Link
              href="/events"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-violet-900 font-bold text-base hover:bg-violet-50 transition-all duration-300 shadow-lg shadow-black/20 hover:-translate-y-0.5 hover:shadow-xl"
            >
              View All Events →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
