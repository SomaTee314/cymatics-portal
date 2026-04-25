import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, DM_Sans } from 'next/font/google';

/** Avoid long-lived prerender + edge HIT on HTML for the live domain (stale “old” UI). */
export const dynamic = 'force-dynamic';
import { UserProvider } from '@/context/UserContext';
import { SITE_URL } from '@/lib/site';
import './globals.css';
import fs from 'fs';
import path from 'path';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

let hasOgImage = false;
try {
  const ogImagePath = path.join(process.cwd(), 'public', 'og-image.png');
  hasOgImage = fs.existsSync(ogImagePath);
} catch {
  hasOgImage = false;
}

const defaultDescription =
  'Experience Chladni standing-wave physics, Solfeggio healing frequencies, and sacred geometry visualisation in your browser. Free 7-day Pro trial.';

const pageTitle = 'Cymatics Portal — Visualise Sound, Feel Frequency';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: pageTitle,
  description: defaultDescription,
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: pageTitle,
    description: defaultDescription,
    type: 'website',
    url: SITE_URL,
    ...(hasOgImage
      ? {
          images: [
            {
              url: '/og-image.png',
              width: 1200,
              height: 630,
              alt: 'Cymatics Portal',
            },
          ],
        }
      : {}),
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: defaultDescription,
    ...(hasOgImage ? { images: ['/og-image.png'] } : {}),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body
        className={`${spaceGrotesk.variable} ${dmSans.variable} min-h-screen bg-black font-sans text-white antialiased`}
      >
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
