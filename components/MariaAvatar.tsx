'use client';

import { useEffect, useRef, useState } from 'react';

// Maria's portrait; falls back to the letter "M" if the image can't load.
export default function MariaAvatar() {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Catch a load error that happened before hydration.
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return 'M';
  return <img ref={ref} src="/assets/maria-avatar.png" alt="Maria" onError={() => setFailed(true)} />;
}
