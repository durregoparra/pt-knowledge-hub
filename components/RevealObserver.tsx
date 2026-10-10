'use client';

import { useEffect } from 'react';

// Fades in every `.reveal` element the first time it scrolls into view.
export default function RevealObserver() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: .14, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
