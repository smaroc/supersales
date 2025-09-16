'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button, Link, Navbar as HeroUINavbar, NavbarBrand, NavbarContent, NavbarItem } from '@heroui/react';
import { Icon } from '@iconify/react';

export const Navbar: React.FC = () => {
  return (
    <HeroUINavbar maxWidth="xl" className="bg-background/80 backdrop-blur-md border-b border-default-100">
      <NavbarBrand>
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
      </NavbarBrand>

      <NavbarContent className="hidden sm:flex gap-6" justify="center">
        <NavbarItem>
          <Link color="foreground" href="#features">
            Features
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Link color="foreground" href="#how-it-works">
            How It Works
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Link color="foreground" href="#testimonials">
            Testimonials
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Link color="foreground" href="#pricing">
            Pricing
          </Link>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem className="hidden sm:flex">
          <Link color="foreground" href="/dashboard">
            Dashboard
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Button
            as={Link}
            href="/dashboard"
            color="primary"
            variant="flat"
            className="font-medium"
            startContent={<Icon icon="lucide:zap" className="w-4 h-4" />}
          >
            Get Started
          </Button>
        </NavbarItem>
      </NavbarContent>
    </HeroUINavbar>
  );
};