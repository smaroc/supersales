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
        { name: "About Us", href: "#" },
        { name: "Careers", href: "#" },
        { name: "Contact", href: "#" },
        { name: "Privacy Policy", href: "#" },
      ]
    }
  ];

  const socialLinks = [
    { icon: "lucide:twitter", href: "#" },
    { icon: "lucide:linkedin", href: "#" },
    { icon: "lucide:facebook", href: "#" },
    { icon: "lucide:instagram", href: "#" }
  ];

  return (
    <footer className="bg-content2 py-12 border-t border-default-100">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-primary p-1 rounded-md">
                <Icon icon="lucide:phone" className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">Sales AI</span>
            </div>
            <p className="text-foreground-500 mb-6 max-w-md">
              Transforming sales conversations into revenue growth with AI-powered analytics and coaching.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <Link key={index} href={social.href} className="text-foreground-400 hover:text-primary-500 transition-colors">
                  <Icon icon={social.icon} className="w-5 h-5" />
                </Link>
              ))}
            </div>
          </div>

          {footerLinks.map((column, index) => (
            <div key={index}>
              <h3 className="font-semibold mb-4">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link href={link.href} className="text-foreground-500 hover:text-primary-500 transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-default-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-foreground-500 text-sm">
            © {currentYear} Super Sales. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-sm text-foreground-500">
              Terms of Service
            </Link>
            <Link href="#" className="text-sm text-foreground-500">
              Privacy Policy
            </Link>
            <Link href="#" className="text-sm text-foreground-500">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};