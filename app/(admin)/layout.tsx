import type { Metadata } from 'next';
import { FONTS_HREF } from '@/lib/fonts';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Admin — Paraíso Tropical Knowledge Hub',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="stylesheet" href={FONTS_HREF} />
      </head>
      <body className="admin">{children}</body>
    </html>
  );
}
