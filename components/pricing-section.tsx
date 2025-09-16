'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Icon } from '@iconify/react';

export const PricingSection: React.FC = () => {
  const useCases = [
    {
      name: "Small Teams",
      description: "For sales teams with 5-10 members looking to improve performance",
      features: [
        "Customized call evaluation criteria",
        "Team-specific analytics dashboard",
        "Performance benchmarking",
        "Personalized coaching recommendations",
        "Integration with your existing tools"
      ],
      cta: "Schedule Onboarding Call",
      popular: false
    },
    {
      name: "Growing Teams",
      description: "For sales organizations with 10-50 members seeking data-driven improvements",
      features: [
        "Advanced evaluation frameworks",
        "Custom KPI tracking and reporting",
        "Team and individual performance analytics",
        "Tailored coaching programs",
        "Multi-level management dashboards",
        "CRM and sales tool integration"
      ],
      cta: "Schedule Onboarding Call",
      popular: true
    },
    {
      name: "Enterprise",
      description: "For large sales organizations with complex requirements",
      features: [
        "Multi-team evaluation frameworks",
        "Custom analytics and reporting",
        "Advanced security and compliance features",
        "Cross-team benchmarking",
        "Executive dashboards",
        "Global team management",
        "Enterprise system integration"
      ],
      cta: "Schedule Onboarding Call",
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-content1 relative">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Tailored Solutions for Your Team</h2>
          <p className="text-foreground-500 max-w-2xl mx-auto">
            We customize our platform to your specific sales evaluation criteria. Pricing is determined during your onboarding consultation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {useCases.map((useCase, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className={useCase.popular ? "md:-mt-4 md:mb-4" : ""}
            >
              <Card className={`border ${useCase.popular ? 'border-primary' : 'border-default-100'} h-full overflow-visible`}>
                <CardHeader className="flex flex-col gap-2 pb-0">
                  {useCase.popular && (
                    <div className="self-end">
                      <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium">Most Common</span>
                    </div>
                  )}
                  <h3 className="text-xl font-semibold">{useCase.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-medium text-foreground-500">Custom Pricing</span>
                  </div>
                  <p className="text-sm text-foreground-500">{useCase.description}</p>
                </CardHeader>
                <CardContent className="py-6">
                  <ul className="space-y-3">
                    {useCase.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Icon icon="lucide:check" className="w-5 h-5 text-success-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    as="a"
                    href="/dashboard"
                    color={useCase.popular ? "primary" : "default"}
                    variant={useCase.popular ? "default" : "flat"}
                    className="font-medium w-full"
                    startContent={<Icon icon="lucide:zap" className="w-4 h-4" />}
                  >
                    Get Started
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-16 text-center bg-content2 p-8 rounded-large max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Icon icon="lucide:headphones" className="w-8 h-8 text-primary-500" />
            </div>
            <div className="text-left">
              <h3 className="text-xl font-semibold mb-2">Our Onboarding Process</h3>
              <p className="text-foreground-500 mb-4">
                During your onboarding call, we&apos;ll work with your sales leadership to understand your evaluation criteria,
                team structure, and specific needs. We&apos;ll then create a custom implementation plan and pricing proposal
                tailored to your organization.
              </p>
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
        </motion.div>
      </div>
    </section>
  );
};