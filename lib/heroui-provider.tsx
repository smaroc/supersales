'use client';

import { HeroUIProvider as Provider } from '@heroui/react';

export function HeroUIProvider({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>;
}