'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  trend: 'up' | 'down';
  description: string;
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  trend,
  description,
  delay = 0
}) => {
  const isPositive = trend === 'up';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              isPositive
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            )}>
              {isPositive ? (
                <Icon icon="lucide:trending-up" className="w-3 h-3" />
              ) : (
                <Icon icon="lucide:trending-down" className="w-3 h-3" />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <motion.p
              className={cn(
                "text-2xl font-bold",
                isPositive ? "text-green-600" : "text-red-600"
              )}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: delay + 0.2, duration: 0.3 }}
            >
              {value}
            </motion.p>
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          </div>

          {/* Animated background effect */}
          <motion.div
            className={cn(
              "absolute bottom-0 left-0 h-1",
              isPositive ? "bg-green-500" : "bg-red-500"
            )}
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: delay + 0.4, duration: 0.8, ease: "easeOut" }}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
};