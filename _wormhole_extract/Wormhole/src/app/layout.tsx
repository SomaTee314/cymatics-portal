import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Julia Wormhole',
  description:
    'A scroll-driven journey through the 360° interior of a Julia fractal wormhole.',
};

export const viewport: Viewport = {
  themeColor: '#020204',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
