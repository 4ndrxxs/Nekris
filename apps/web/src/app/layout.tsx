import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NEKRIS — Competitive Puzzle',
  description: 'Daily challenges and 1v1 competitive path-building puzzles',
  manifest: '/manifest.json',
  icons: [
    { rel: 'icon', url: '/icon.svg', type: 'image/svg+xml' },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NEKRIS',
  },
  openGraph: {
    title: 'NEKRIS — Competitive Puzzle',
    description: 'Daily challenges and 1v1 competitive path-building puzzles',
    siteName: 'NEKRIS',
    type: 'website',
    url: 'https://nekris.online',
  },
  twitter: {
    card: 'summary',
    title: 'NEKRIS',
    description: 'Competitive path-building puzzle game',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased min-h-dvh overscroll-none`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
