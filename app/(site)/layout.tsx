import type { Metadata } from 'next';
import { FONTS_HREF } from '@/lib/fonts';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Knowledge Connect — Company knowledge, ready when you need it',
  description:
    'An enterprise knowledge management platform that helps organizations connect employees with reliable company knowledge — with guidance from Maria, the AI Knowledge Assistant.',
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
