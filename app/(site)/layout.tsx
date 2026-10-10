import type { Metadata } from 'next';
import { FONTS_HREF } from '@/lib/fonts';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Paraíso Tropical Knowledge Hub — Company knowledge, ready when you need it',
  description:
    "A centralized knowledge management platform that captures, organizes, and makes Paraíso Tropical's company knowledge accessible and actionable — with guidance from Maria, the Hub's virtual assistant.",
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="stylesheet" href={FONTS_HREF} />
      </head>
      <body>{children}</body>
    </html>
  );
}
