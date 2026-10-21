'use client';

import { useState } from 'react';

const ITEMS = [
  {
    q: 'Which sources does Maria use?',
    a: 'Maria only uses the company knowledge stored in Knowledge Connect. She does not use information from outside the company.',
  },
  {
    q: "What happens if Maria can't answer my question?",
    a: "Maria tells you when something isn't covered by the available knowledge and escalates your request to the right person or team.",
  },
  {
    q: 'Can I use it in Spanish?',
    a: 'Yes. Employees can ask in English or Spanish, and Maria responds in the same language.',
  },
];

export default function Faq() {
  const [open, setOpen] = useState<boolean[]>(() => ITEMS.map((_, i) => i === 0));

  return (
    <div className="faq__list">
      {ITEMS.map((item, i) => (
        <div className={open[i] ? 'faq__item is-open' : 'faq__item'} key={item.q}>
          <button className="faq__q" onClick={() => setOpen((o) => o.map((v, j) => (j === i ? !v : v)))}>
            {item.q}
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </button>
          <div className="faq__a"><div className="faq__a-inner"><p>{item.a}</p></div></div>
        </div>
      ))}
    </div>
  );
}
