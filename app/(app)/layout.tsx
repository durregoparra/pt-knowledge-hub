import type { Metadata } from 'next';
import { FONTS_HREF } from '@/lib/fonts';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Paraíso Tropical Knowledge Hub',
  robots: { index: false, follow: false },
};

// Root layout for the app pages (login, register and everything behind the session).
// They reuse the admin look, which globals.css scopes to <body class="admin">.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="stylesheet" href={FONTS_HREF} />
      </head>
      <body className="admin">{children}</body>
    </html>
  );
}
