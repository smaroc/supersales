'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardBody, Avatar } from '@heroui/react';
import { Icon } from '@iconify/react';

export const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      content: "CallInsight has transformed our sales process. We've seen a 32% increase in conversion rates and our new reps are getting up to speed twice as fast.",
      author: "Sarah Johnson",
      position: "VP of Sales, TechCorp",
      avatar: "https://img.heroui.chat/image/avatar?w=80&h=80&u=1"
    },
    {
      content: "The insights we get from analyzing our sales calls have been game-changing. We've identified exactly what differentiates our top performers and scaled those practices across the team.",
      author: "Michael Chen",
      position: "Sales Director, GrowthWave",
      avatar: "https://img.heroui.chat/image/avatar?w=80&h=80&u=2"
    },
    {
      content: "I was skeptical at first, but the ROI has been incredible. We've shortened our sales cycle by 24% and increased our average deal size by 15%.",
      author: "Jessica Rivera",
      position: "CRO, SaaS Solutions",
      avatar: "https://img.heroui.chat/image/avatar?w=80&h=80&u=3"
    }
  ];

  const logos = [
    "logos:adobe",
    "logos:airbnb",
    "logos:amazon",
    "logos:asana",
    "logos:dropbox",
    "logos:slack"
  ];

  return (
    <section id="testimonials" className="py-20 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/30 to-background z-0" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by Sales Leaders</h2>
          <p className="text-foreground-500 max-w-2xl mx-auto">
            See how companies are transforming their sales performance with our platform.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card className="border border-default-100 h-full">
                <CardBody className="p-6">
                  <div className="mb-4">
                    <Icon icon="lucide:quote" className="w-8 h-8 text-primary-200" />
                  </div>
                  <p className="text-foreground-600 mb-6">{testimonial.content}</p>
                  <div className="flex items-center gap-3">
                    <Avatar src={testimonial.avatar} size="md" />
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-foreground-500">{testimonial.position}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-foreground-500 mb-8">Trusted by leading companies worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {logos.map((logo, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="grayscale hover:grayscale-0 transition-all duration-300"
              >
                <Icon icon={logo} className="w-24 h-12" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};