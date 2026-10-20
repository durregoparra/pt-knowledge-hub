'use client';

import { useState } from 'react';

export default function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    // Full navigation so nothing rendered for the old session stays on screen.
    window.location.assign('/login');
  }

  return (
    <button className="btn btn--outline" id="sign-out" type="button" disabled={pending} onClick={onClick}>Sign out</button>
  );
}
