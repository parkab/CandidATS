'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';

type NavbarUser = {
  name: string;
};

type NavbarProps = {
  user: NavbarUser | null;
};

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLightMode = mounted && resolvedTheme === 'light';
  const brandIconSrc = isLightMode
    ? '/icons/polaroid-icon-black.png'
    : '/icons/polaroid-icon-white.png';
  const profileIconSrc = isLightMode
    ? '/icons/picture-icon-black.png'
    : '/icons/picture-icon-white.png';

  const handleMenuItemClick = () => {
    menuRef.current?.removeAttribute('open');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });

      if (!response.ok) {
        throw new Error(`Logout failed with status ${response.status}`);
      }

      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="flex h-20 items-center justify-between border-b border-(--surface-border) bg-(--background) pl-6 pr-6">
      <Link
        href="/dashboard"
        className="flex h-full items-center gap-3 text-[2rem] font-bold leading-none text-(--foreground) no-underline visited:text-(--foreground) hover:no-underline"
      >
        <Image
          src={brandIconSrc}
          alt="CandidATS logo"
          width={40}
          height={40}
          className="h-10 w-10"
          priority
        />
        <span className="inline-block bg-[linear-gradient(to_right,#ff75c3,#ffa647,#ffe83f,#9fff5b,#70e2ff,#cd93ff)] bg-clip-text text-transparent">
          CandidATS
        </span>
      </Link>

      {user ? (
        <details ref={menuRef} className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-lg font-medium text-(--foreground) hover:bg-(--action-bg)">
            <Image
              src={profileIconSrc}
              alt="Profile menu"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span>{user.name}</span>
          </summary>

          <div className="absolute right-0 mt-2 w-36 rounded-md border border-(--surface-border) bg-(--background) p-1 shadow-md">
            <Link
              href="/profile"
              className="block rounded px-3 py-2 text-sm text-(--foreground) visited:text-(--foreground) hover:bg-(--action-bg)"
              onClick={handleMenuItemClick}
            >
              Profile
            </Link>
            <Link
              href="/documents"
              className="block rounded px-3 py-2 text-sm text-(--foreground) visited:text-(--foreground) hover:bg-(--action-bg)"
              onClick={handleMenuItemClick}
            >
              Documents
            </Link>
            <Link
              href="/settings"
              className="block rounded px-3 py-2 text-sm text-(--foreground) visited:text-(--foreground) hover:bg-(--action-bg)"
              onClick={handleMenuItemClick}
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full text-left block rounded px-3 py-2 text-sm text-(--foreground) hover:bg-(--action-bg) disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </details>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-md border border-(--surface-border) px-3 py-2 text-sm font-medium text-(--foreground) visited:text-(--foreground) hover:bg-(--action-bg)"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-(--foreground) px-3 py-2 text-sm font-medium text-(--background) visited:text-(--background) hover:bg-(--inverse-hover)"
          >
            Sign up
          </Link>
        </div>
      )}
    </nav>
  );
}
