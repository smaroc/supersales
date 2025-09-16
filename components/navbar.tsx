'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import Link from 'next/link';

export const Navbar: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-primary p-1 rounded-md">
              <Icon icon="lucide:phone" className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">Sales AI</span>
          </motion.div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-foreground hover:text-primary transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-foreground hover:text-primary transition-colors">
              How It Works
            </a>
            <a href="#testimonials" className="text-foreground hover:text-primary transition-colors">
              Testimonials
            </a>
            <a href="#pricing" className="text-foreground hover:text-primary transition-colors">
              Pricing
            </a>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hidden sm:inline text-foreground hover:text-primary transition-colors">
              Dashboard
            </Link>
            <Button
              as="a"
              href="/dashboard"
              color="primary"
              variant="flat"
              className="font-medium"
              startContent={<Icon icon="lucide:zap" className="w-4 h-4" />}
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};