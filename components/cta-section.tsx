'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';

export const CtaSection: React.FC = () => {
  return (
    <section className="py-20 bg-primary-600 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-10 right-10 w-64 h-64 rounded-full bg-primary-500 opacity-20"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <motion.div
          className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-primary-700 opacity-20"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              Ready to Transform Your Sales Conversations?
            </h2>
            <p className="text-primary-100 mb-8 text-lg">
              Join hundreds of sales teams already using Super Sales to increase revenue and improve performance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                as="a"
                href="/dashboard"
                size="lg"
                color="default"
                className="font-medium bg-white text-primary-600"
                startContent={<Icon icon="lucide:zap" className="w-4 h-4" />}
              >
                Get Started
              </Button>
              <Button
                as="a"
                href="/dashboard"
                size="lg"
                variant="flat"
                className="font-medium text-white border-white"
                startContent={<Icon icon="lucide:play" className="w-4 h-4" />}
              >
                See Demo
              </Button>
            </div>
            <p className="mt-6 text-primary-100 text-sm">
              No credit card required. 14-day free trial.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};