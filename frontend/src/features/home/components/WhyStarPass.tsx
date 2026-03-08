'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const TRUST_CARDS = [
  {
    icon: '💸',
    title: 'Lower Convenience Fees',
    desc: 'We keep it transparent. No surprise charges at checkout.',
  },
  {
    icon: '🔐',
    title: 'Secure Razorpay Payments',
    desc: 'Bank-grade encryption. Your payment is always safe.',
  },
  {
    icon: '⚡',
    title: 'Instant Booking Confirmation',
    desc: 'QR tickets delivered immediately after payment.',
  },
  {
    icon: '🔄',
    title: 'Easy Refund Process',
    desc: 'Cancel anytime before the show. Refunds in 5–7 business days.',
  },
];

export function WhyStarPass() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-violet-400 text-sm font-semibold uppercase tracking-widest">Why StarPass</span>
          <h2 className="text-3xl md:text-4xl font-black text-white mt-3">
            Built for the Entertainment Fan
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TRUST_CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative p-6 rounded-2xl border border-violet-500/15 bg-gradient-to-b from-violet-950/30 to-transparent hover:border-violet-500/40 hover:from-violet-900/30 transition-all duration-300"
            >
              {/* Glow on hover */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ boxShadow: '0 0 40px 0 rgba(124,58,237,0.12)', pointerEvents: 'none' }} />

              <div className="text-3xl mb-4">{card.icon}</div>
              <h3 className="text-white font-bold text-base mb-2">{card.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
