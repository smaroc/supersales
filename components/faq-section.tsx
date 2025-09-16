'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Accordion, AccordionItem } from '@heroui/react';

export const FaqSection: React.FC = () => {
  const faqs = [
    {
      question: "How quickly can we get started?",
      answer: "You can be up and running in as little as 15 minutes. Our platform offers simple integration with most popular CRM and calling systems. Once connected, you'll start gathering insights immediately."
    },
    {
      question: "Is my data secure and private?",
      answer: "Absolutely. We take security and privacy very seriously. All calls are encrypted both in transit and at rest. We're GDPR and CCPA compliant, and we provide tools to help you maintain compliance with call recording laws."
    },
    {
      question: "Do you integrate with my existing tools?",
      answer: "We integrate with all major CRM platforms (Salesforce, HubSpot, etc.), calling systems (Zoom, Teams, etc.), and other sales tools. Our API also allows for custom integrations if needed."
    },
    {
      question: "How accurate are your transcriptions?",
      answer: "Our transcription technology achieves over 95% accuracy for most clear audio. We continuously train our models on sales conversations to improve accuracy for industry-specific terminology."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time. We offer monthly billing with no long-term contracts required. If you cancel, you'll have access until the end of your current billing period."
    },
    {
      question: "What kind of support do you offer?",
      answer: "All plans include email support with varying response times. Professional and Enterprise plans include priority support with faster response times. Enterprise customers also receive a dedicated account manager and 24/7 premium support."
    }
  ];

  return (
    <section id="faq" className="py-20 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50/30 to-background z-0" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-foreground-500 max-w-2xl mx-auto">
            Everything you need to know about our platform and services.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {/* Fix: Apply animation to the entire Accordion instead of individual items */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4 }}
          >
            <Accordion variant="bordered">
              {faqs.map((faq, index) => (
                <AccordionItem key={`faq-${index}`} title={faq.question}>
                  <p className="text-foreground-600">{faq.answer}</p>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
};