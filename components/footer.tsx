'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: "Product",
      links: [
        { name: "Features", href: "#features" },
        { name: "Pricing", href: "#pricing" },
        { name: "Integrations", href: "#" },
        { name: "Roadmap", href: "#" },
      ]
    },
    {
      title: "Resources",
      links: [
        { name: "Blog", href: "#" },
        { name: "Case Studies", href: "#" },
        { name: "Documentation", href: "#" },
        { name: "Help Center", href: "#" },
      ]
    },
    {
      title: "Company",
      links: [
        { name: "Terms of Service", href: "/legal/terms-of-service" },
        { name: "Privacy Policy", href: "/legal/privacy-policy" },
        { name: "AI Usage Policy", href: "/legal/ai-usage" },
        { name: "Cookie Policy", href: "/legal/cookie-policy" },
      ]
    }
  ];

  const socialLinks = [
    { icon: "lucide:twitter", href: "#", label: "Twitter" },
    { icon: "lucide:linkedin", href: "#", label: "LinkedIn" },
    { icon: "lucide:facebook", href: "#", label: "Facebook" },
    { icon: "lucide:instagram", href: "#", label: "Instagram" }
  ];

  return (
    <footer className="bg-gray-50 dark:bg-zinc-950 py-16 border-t border-gray-200 dark:border-zinc-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-600/20">
                <Icon icon="lucide:phone" className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-white">Super Sales</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md leading-relaxed">
              Transforming sales conversations into revenue growth with AI-powered analytics and coaching.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <Link
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all duration-200"
                >
                  <Icon icon={social.icon} className="w-5 h-5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {footerLinks.map((column, index) => (
            <div key={index}>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link
                      href={link.href}
                      className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-200 dark:border-zinc-800">
          <p className="text-gray-500 dark:text-gray-500 text-sm text-center md:text-left">
            {currentYear} Super Sales. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
