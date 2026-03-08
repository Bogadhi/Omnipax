'use client';

import Link from 'next/link';

const FOOTER_LINKS = {
  Discover: [
    { label: 'Movies', href: '/events?type=MOVIE' },
    { label: 'Concerts', href: '/events?type=CONCERT' },
    { label: 'Theater', href: '/events?type=EVENT' },
    { label: 'Sports Events', href: '/events?type=GENERAL_ADMISSION' },
  ],
  Account: [
    { label: 'My Bookings', href: '/profile/bookings' },
    { label: 'Offers & Coupons', href: '/events' },
    { label: 'Wishlist', href: '/profile/wishlist' },
  ],
  Support: [
    { label: 'Refund Policy', href: '#' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Contact Us', href: 'mailto:support@starpass.app' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-[#070412] border-t border-white/5 pt-16 pb-8 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-16">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-black text-white">
                S
              </div>
              <span className="font-black text-white text-lg">StarPass</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Premium ticketing for movies, concerts, and live experiences. Book with confidence.
            </p>
            <div className="flex gap-3">
              {['𝕏', 'IG', 'YT'].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-xs font-bold text-gray-400 hover:border-violet-500/40 hover:text-violet-300 transition-all duration-200"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">{heading}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-gray-500 hover:text-violet-300 text-sm transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600">
          <span>© {new Date().getFullYear()} StarPass. All rights reserved.</span>
          <div className="flex items-center gap-2">
            <span>Payments secured by</span>
            <span className="font-bold text-gray-400">Razorpay</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
