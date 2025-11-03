import React from 'react';
import { Navbar } from '@/components/navbar';
import { HeroSection } from '@/components/hero-section';
import { FeaturesSection } from '@/components/features-section';
import { HowItWorksSection } from '@/components/how-it-works-section';
import { TestimonialsSection } from '@/components/testimonials-section';
import { PricingSection } from '@/components/pricing-section';
import { FaqSection } from '@/components/faq-section';
import { CtaSection } from '@/components/cta-section';
import { Footer } from '@/components/footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <HeroSection />
          <FeaturesSection />
          <HowItWorksSection />
          <TestimonialsSection />
          <PricingSection />
          <FaqSection />
          <CtaSection />
        </div>
        <Footer />
      </div>
    </div>
  );
}