'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function isValidInternalPath(path: string): boolean {
  // Ensure path starts with / and doesn't contain protocol/domain
  if (!path.startsWith('/')) return false;
  if (path.includes('://')) return false;
  if (path.includes('//')) return false; // Prevent // protocol tricks
  return true;
}

export default function RedirectHandler() {
  const router = useRouter();

  useEffect(() => {
    // Access search params directly from window.location
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const next = url.searchParams.get('next');

      // URLSearchParams.get() already returns a decoded string
      // Validate the path before redirecting
      if (next && next !== '/dashboard' && isValidInternalPath(next)) {
        try {
          router.push(next);
        } catch (error) {
          console.error('Redirect failed:', error);
        }
      }
    }
  }, [router]);

  return null;
}
