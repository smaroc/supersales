'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs';
import Image from 'next/image';

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
            <div className="rounded-lg overflow-hidden">
              <Image src="/favicon.ico" alt="Super Sales" className="rounded-md" width={20} height={20} />
            </div>
            <span className="font-bold text-xl">Super Sales</span>
          </motion.div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <Button
                  variant="ghost"
                  className="font-medium rounded-lg"
                >
                  Sign In
                </Button>
              </SignInButton>
              <Button
                asChild
                className="font-medium rounded-lg"
              >
                <Link href="/sign-up">
                  <Icon icon="lucide:zap" className="w-4 h-4 mr-2" />
                  Get Started
                </Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="hidden sm:inline text-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-accent">
                Dashboard
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'w-10 h-10 rounded-full'
                  }
                }}
                afterSignOutUrl="/"
              />
            </SignedIn>
          </div>
        </div>
      </div>
    </nav>
  );
};