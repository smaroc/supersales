'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      icon: "lucide:plug",
      title: "Connect Your System",
      description: "Integrate with your existing CRM and calling tools in minutes with our simple API or pre-built connectors."
    },
    {
      icon: "lucide:phone-call",
      title: "Record Conversations",
      description: "Automatically capture and transcribe sales calls with high accuracy and compliance with privacy regulations."
    },
    {
      icon: "lucide:search",
      title: "Analyze & Learn",
      description: "Our AI identifies patterns, objections, and opportunities across all your sales conversations."
    },
    {
      icon: "lucide:trending-up",
      title: "Improve & Grow",
      description: "Apply insights to coach your team, refine your pitch, and increase your conversion rates."
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-content1 relative">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-foreground-500 max-w-2xl mx-auto">
            Get started in minutes and see results within your first month.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <Icon icon={step.icon} className="w-8 h-8 text-primary-500" />
                </div>
                {index < steps.length - 1 && (
                  <div className="absolute top-1/2 left-full w-full h-0.5 bg-primary-100 -translate-y-1/2 hidden lg:block" style={{ width: 'calc(100% - 4rem)' }} />
                )}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-foreground-500">{step.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success-100 text-success-700 mb-2">
            <Icon icon="lucide:check-circle" className="w-4 h-4" />
            <span className="text-sm font-medium">No coding required</span>
          </div>
          <p className="text-foreground-500 max-w-lg mx-auto">
            Our platform works with all major CRM systems and calling platforms, with no technical expertise needed.
          </p>
        </motion.div>
      </div>
    </section>
  );
};