'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RedirectHandler() {
  const router = useRouter();

  useEffect(() => {
    // Access search params directly from window.location
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const next = url.searchParams.get('next');
      
      if (next && next !== '/dashboard') {
        try {
          router.push(decodeURIComponent(next));
        } catch (error) {
          console.error('Redirect failed:', error);
        }
      }
    }
  }, [router]);

  return null;
}
