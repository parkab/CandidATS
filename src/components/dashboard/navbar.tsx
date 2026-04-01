'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';

type NavbarUser = {
  name: string;
};

type NavbarProps = {
  user: NavbarUser | null;
};

export default function Navbar({ user }: NavbarProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  const handleMenuItemClick = () => {
    menuRef.current?.removeAttribute('open');
  };

  return (
    <nav className="flex h-20 items-center justify-between border-b border-[#2a2a2a] bg-[#121212] pl-6 pr-6">
      <Link
        href="/dashboard"
        className="flex h-full items-center gap-3 text-[2rem] font-bold leading-none text-[#faf9f6] no-underline visited:text-[#faf9f6] hover:no-underline"
      >
        <Image
          src="/icons/polaroid-icon-white.png"
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
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-2 text-lg font-medium text-[#faf9f6] hover:bg-[#1c1c1c]">
            <Image
              src="/icons/picture-icon.png"
              alt="Profile menu"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span>{user.name}</span>
          </summary>

          <div className="absolute right-0 mt-2 w-36 rounded-md border border-[#2a2a2a] bg-[#121212] p-1 shadow-md">
            <Link
              href="/profile"
              className="block rounded px-3 py-2 text-sm text-[#faf9f6] visited:text-[#faf9f6] hover:bg-[#1c1c1c]"
              onClick={handleMenuItemClick}
            >
              Profile
            </Link>
            <Link
              href="/documents"
              className="block rounded px-3 py-2 text-sm text-[#faf9f6] visited:text-[#faf9f6] hover:bg-[#1c1c1c]"
              onClick={handleMenuItemClick}
            >
              Documents
            </Link>
            <Link
              href="/settings"
              className="block rounded px-3 py-2 text-sm text-[#faf9f6] visited:text-[#faf9f6] hover:bg-[#1c1c1c]"
              onClick={handleMenuItemClick}
            >
              Settings
            </Link>
          </div>
        </details>
      ) : (
        // Login/Register pages not created yet, WILL 404
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-md border border-[#2a2a2a] px-3 py-2 text-sm font-medium text-[#faf9f6] visited:text-[#faf9f6] hover:bg-[#1c1c1c]"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-[#faf9f6] px-3 py-2 text-sm font-medium text-[#121212] visited:text-[#121212] hover:bg-[#e8e6df]"
          >
            Sign up
          </Link>
        </div>
      )}
    </nav>
  );
}
