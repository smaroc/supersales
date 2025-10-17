'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@iconify/react';
import { StatCard } from './stat-card';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-background z-0" />

      {/* Animated circles */}
      <motion.div
        className="absolute top-20 right-20 w-64 h-64 rounded-full bg-primary-100 opacity-30 z-0"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: [0.8, 1.2, 0.8],
          opacity: [0, 0.3, 0],
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
        className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-secondary-100 opacity-20 z-0"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0, 0.2, 0],
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

      {/* Add new call-to-money animation */}
      <motion.div
        className="absolute inset-0 z-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
      >
        <CallToMoneyAnimation />
      </motion.div>

      <div className="container mx-auto px-4 py-16 lg:py-24 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left content */}
          <motion.div
            className="flex-1 max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 mb-6">
                <Icon icon="lucide:trending-up" className="w-4 h-4" />
                <span className="text-sm font-medium">Revenue Intelligence</span>
              </div>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              Transform Sales Calls Into <span className="text-primary">Revenue Growth</span>
            </motion.h1>

            <motion.p
              className="text-lg text-foreground-500 mb-8 max-w-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              Leverage AI-powered conversation analytics to uncover insights, coach your team effectively, and convert more prospects into customers.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <Button
                as="a"
                href="/dashboard"
                color="primary"
                size="lg"
                className="font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                startContent={<Icon icon="lucide:zap" className="w-4 h-4" />}
              >
                Get Started
              </Button>

              <Button
                as="a"
                href="/dashboard"
                variant="flat"
                size="lg"
                className="font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                startContent={<Icon icon="lucide:play" className="w-4 h-4" />}
              >
                See Demo
              </Button>
            </motion.div>

            <motion.div
              className="mt-12 flex items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-background bg-content1 flex items-center justify-center text-xs font-medium overflow-hidden"
                  >
                    <img
                      src={`https://img.heroui.chat/image/avatar?w=32&h=32&u=${i}`}
                      alt={`User ${i}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <div className="text-sm text-foreground-500">
                <span className="font-semibold text-foreground">500+</span> sales teams trust our platform
              </div>
            </motion.div>
          </motion.div>

          {/* Right content - Analytics visualization */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="p-6 shadow-lg border border-default-100 overflow-visible">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="mb-6 flex items-center justify-between"
              >
                <h3 className="text-lg font-semibold">Sales Performance Analytics</h3>
                <div className="flex gap-2">
                  <Button isIconOnly size="sm" variant="ghost">
                    <Icon icon="lucide:download" className="w-4 h-4" />
                  </Button>
                  <Button isIconOnly size="sm" variant="ghost">
                    <Icon icon="lucide:more-horizontal" className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatCard
                  title="Conversion Rate"
                  value="+27%"
                  trend="up"
                  description="vs. last quarter"
                  delay={0.7}
                />
                <StatCard
                  title="Deal Size"
                  value="+15%"
                  trend="up"
                  description="average increase"
                  delay={0.8}
                />
                <StatCard
                  title="Sales Cycle"
                  value="-24%"
                  trend="down"
                  description="time reduction"
                  delay={0.9}
                />
              </div>

              <motion.div
                className="relative h-64 mt-6 border-t border-default-100 pt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.6 }}
              >
                <div className="absolute inset-0 flex items-end">
                  <div className="w-full flex items-end justify-between gap-2 px-2">
                    {[35, 65, 45, 80, 55, 75, 90, 65, 85, 70, 95].map((height, i) => (
                      <motion.div
                        key={i}
                        className="bg-primary rounded-t-md w-full"
                        style={{ height: `${height * 0.5}%` }}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: `${height * 0.5}%`, opacity: 1 }}
                        transition={{
                          delay: 1.1 + (i * 0.05),
                          duration: 0.8,
                          ease: [0.16, 1, 0.3, 1]
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-foreground-400 pt-2 border-t border-default-100">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                  <span>Jul</span>
                  <span>Aug</span>
                  <span>Sep</span>
                  <span>Oct</span>
                  <span>Nov</span>
                </div>

                <div className="absolute top-8 right-4 bg-success-100 text-success-700 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                  <Icon icon="lucide:arrow-up-right" className="w-3 h-3" />
                  <span>Revenue Growth</span>
                </div>
              </motion.div>

              <motion.div
                className="mt-6 pt-4 border-t border-default-100 flex justify-between items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4, duration: 0.6 }}
              >
                <div className="text-sm text-foreground-500">
                  <span className="font-semibold text-foreground">87%</span> of teams see results within 30 days
                </div>
                <Button size="sm" variant="flat" color="primary">
                  View Full Report
                </Button>
              </motion.div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Add new CallToMoneyAnimation component
const CallToMoneyAnimation = () => {
  // Use stable predefined values to avoid hydration mismatch
  const callItems = [
    { id: 0, delay: 0.44, startY: 205.6 },
    { id: 1, delay: 1.19, startY: 239.9 },
    { id: 2, delay: 1.77, startY: 388.1 },
    { id: 3, delay: 2.52, startY: 222.7 },
    { id: 4, delay: 3.57, startY: 183.3 },
    { id: 5, delay: 4.48, startY: 110.6 },
    { id: 6, delay: 4.97, startY: 315.7 },
    { id: 7, delay: 5.97, startY: 237.5 },
  ];

  return (
    <div className="w-full h-full">
      {callItems.map((item) => (
        <CallToMoneyItem key={item.id} delay={item.delay} startY={item.startY} />
      ))}
    </div>
  );
};

const CallToMoneyItem = ({ delay, startY }: { delay: number; startY: number }) => {
  // Use stable repeatDelay based on the delay prop to avoid hydration mismatch
  const repeatDelay = (delay % 2);

  return (
    <motion.div
      className="absolute left-0"
      initial={{
        x: -50,
        y: startY,
        opacity: 0,
        scale: 0.8
      }}
      animate={{
        x: [
          -50, // Start off-screen left
          200,  // Move to left side of content
          1000, // Move to right side
          1050 // Move off-screen right
        ],
        y: [
          startY,
          startY - 20,
          startY - 40,
          startY - 60
        ],
        opacity: [0, 1, 1, 0],
        scale: [0.8, 1, 1, 0.8]
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        repeatDelay,
        ease: "easeInOut"
      }}
    >
      {/* Call icon that transforms to money */}
      <motion.div
        className="flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg"
        animate={{
          backgroundColor: ["#ffffff", "#ffffff", "#e6f7e6", "#d0f0c0"]
        }}
        transition={{
          duration: 8,
          delay,
          repeat: Infinity,
          repeatDelay,
          ease: "easeInOut",
          times: [0, 0.5, 0.7, 1]
        }}
      >
        <motion.div
          animate={{
            opacity: [1, 1, 0, 0]
          }}
          transition={{
            duration: 8,
            delay,
            repeat: Infinity,
            repeatDelay,
            ease: "easeInOut",
            times: [0, 0.45, 0.55, 1]
          }}
        >
          <Icon icon="lucide:phone" className="w-5 h-5 text-primary-500" />
        </motion.div>

        <motion.div
          className="absolute"
          animate={{
            opacity: [0, 0, 1, 1]
          }}
          transition={{
            duration: 8,
            delay,
            repeat: Infinity,
            repeatDelay,
            ease: "easeInOut",
            times: [0, 0.45, 0.55, 1]
          }}
        >
          <Icon icon="lucide:dollar-sign" className="w-5 h-5 text-success-600" />
        </motion.div>
      </motion.div>

      {/* Animated trail */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-24 h-2 -z-10 rounded-full"
        style={{
          background: "linear-gradient(90deg, rgba(0,111,238,0.2) 0%, rgba(23,201,100,0.2) 100%)",
          transform: "translate(-50%, -50%)"
        }}
        animate={{
          width: ["0px", "80px", "120px", "0px"],
          opacity: [0, 0.7, 0.7, 0]
        }}
        transition={{
          duration: 8,
          delay,
          repeat: Infinity,
          repeatDelay,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
};