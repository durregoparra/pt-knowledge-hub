'use client';

import { useEffect, useState } from 'react';

export default function Nav() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={stuck ? 'nav is-stuck' : 'nav'} id="nav">
      <div className="container pad-x nav__inner">
        <a href="#" className="nav__logo">
          <span className="mark" aria-hidden="true"></span>
          <span>Knowledge Connect<small>with Maria</small></span>
        </a>
        <nav className="nav__menu">
          <a className="nav__link" href="#library">Knowledge Library</a>
          <a className="nav__link" href="#add">Add Knowledge</a>
          <a className="nav__link" href="#manage">Manage Knowledge</a>
          <a className="nav__link" href="#faq">Help</a>
        </nav>
        <div className="nav__actions">
          <a href="#ask" className="btn btn--primary">Ask Maria</a>
          <span className="nav__lang"><b>EN</b> · ES</span>
          <a href="/login" className="nav__login" aria-label="Sign in" title="Sign in">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" /><path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </a>
          <button className="nav__burger" aria-label="Menu"><span></span><span></span><span></span></button>
        </div>
      </div>
    </header>
  );
}
