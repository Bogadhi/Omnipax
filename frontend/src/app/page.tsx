'use client';

import { HeroSection } from '@/features/home/components/HeroSection';
import { CategoryStrip } from '@/features/home/components/CategoryStrip';
import { FeaturedMovies } from '@/features/home/components/FeaturedMovies';
import { ThisWeekend } from '@/features/home/components/ThisWeekend';
import { TrendingEvents } from '@/features/home/components/TrendingEvents';
import { WhyStarPass } from '@/features/home/components/WhyStarPass';
import { OffersBanner } from '@/features/home/components/OffersBanner';
import { StatsSection } from '@/features/home/components/StatsSection';
import { Footer } from '@/features/home/components/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#070412] text-gray-100" style={{ fontFamily: "'Inter', sans-serif" }}>
      <HeroSection />
      <CategoryStrip />
      <FeaturedMovies />
      <ThisWeekend />
      <TrendingEvents />
      <WhyStarPass />
      <OffersBanner />
      <StatsSection />
      <Footer />
    </div>
  );
}
