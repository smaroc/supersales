'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardBody } from '@heroui/react';
import { Icon } from '@iconify/react';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: "lucide:mic",
      title: "Call Recording & Transcription",
      description: "Automatically record and transcribe all sales calls with high accuracy, making conversations searchable and analyzable."
    },
    {
      icon: "lucide:brain",
      title: "AI-Powered Insights",
      description: "Identify key moments, customer sentiment, and sales opportunities with our advanced machine learning algorithms."
    },
    {
      icon: "lucide:bar-chart-2",
      title: "Performance Analytics",
      description: "Track conversion rates, objection handling success, and other key metrics to optimize your sales process."
    },
    {
      icon: "lucide:users",
      title: "Team Coaching",
      description: "Provide personalized coaching based on real conversation data to improve your team's performance."
    },
    {
      icon: "lucide:git-compare",
      title: "Competitor Analysis",
      description: "Understand how your offerings compare to competitors based on actual sales conversations."
    },
    {
      icon: "lucide:lightbulb",
      title: "Smart Recommendations",
      description: "Get actionable suggestions to improve close rates and customer satisfaction in real-time."
    }
  ];

  return (
    <section id="features" className="py-20 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary-50/50 to-background z-0" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features to Boost Your Sales</h2>
          <p className="text-foreground-500 max-w-2xl mx-auto">
            Our platform provides comprehensive tools to analyze, understand, and improve your sales conversations.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card className="border border-default-100 h-full">
                <CardBody className="p-6">
                  <div className="w-12 h-12 rounded-md bg-primary-100 flex items-center justify-center mb-4">
                    <Icon icon={feature.icon} className="w-6 h-6 text-primary-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-foreground-500">{feature.description}</p>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};