'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { User, LogOut, Heart, History, Shield, Wallet } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface AuthButtonsProps {
  onOpenLogin?: () => void;
}

export function AuthButtons({ onOpenLogin }: AuthButtonsProps) {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fix hydration mismatch by ensuring initial render matches server (loading state)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || status === 'loading') {
    return (
      <div className="bg-muted/50 hidden h-9 w-24 animate-pulse rounded-full sm:block" />
    );
  }

  if (status === 'authenticated' && session.user) {
    // @ts-expect-error - role is custom field
    const isAdmin = session.user.role === 'admin';

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-full p-1 transition-all hover:bg-white/10 focus:outline-none"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#D4AF68]/50 bg-linear-to-br from-[#D4AF68] to-[#B8860B] text-black shadow-lg">
            <span className="text-sm font-bold">
              {session.user.name ? session.user.name[0].toUpperCase() : 'U'}
            </span>
          </div>
        </button>

        {/* Dropdown Menu */}
        <div
          className={`bg-background/95 border-border absolute top-full right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border py-2 shadow-2xl backdrop-blur-xl transition-all duration-200 ${
            isOpen
              ? 'visible scale-100 opacity-100'
              : 'invisible scale-95 opacity-0'
          }`}
        >
          <div className="border-b border-white/5 px-4 py-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-foreground truncate text-base font-extrabold">
                {session.user.name}
              </p>
              {isAdmin && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono font-bold shrink-0">
                  Admin
                </span>
              )}
            </div>
            <p className="text-muted-foreground truncate text-xs font-mono mt-0.5">
              {session.user.email}
            </p>
          </div>

          <div className="py-1.5 space-y-0.5">
            {isAdmin && (
              <Link
                href="/nhanconan"
                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 flex items-center gap-3 px-4 py-2.5 text-sm font-extrabold transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Shield className="h-4 w-4" />
                <span>Trang Quản Trị</span>
              </Link>
            )}
            <Link
              href="/ca-nhan"
              className="text-muted-foreground hover:text-primary hover:bg-muted/50 flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <User className="h-4 w-4" />
              <span>Trang cá nhân</span>
            </Link>
            <Link
              href="/yeu-thich"
              className="text-muted-foreground hover:text-primary hover:bg-muted/50 flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Heart className="h-4 w-4" />
              <span>Phim yêu thích</span>
            </Link>
            <Link
              href="/recharge"
              className="text-muted-foreground hover:text-primary hover:bg-muted/50 flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Wallet className="h-4 w-4" />
              <span>Nạp coin & VIP</span>
            </Link>
            <Link
              href="/lich-su"
              className="text-muted-foreground hover:text-primary hover:bg-muted/50 flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <History className="h-4 w-4" />
              <span>Lịch sử xem</span>
            </Link>
          </div>

          <div className="border-t border-white/5 py-1.5 mt-1">
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Mobile: only Login, Desktop: Login button */}
      <button
        onClick={onOpenLogin}
        className="bg-primary text-primary-foreground shadow-primary/30 hover:shadow-primary/40 hidden items-center justify-center rounded-full px-5 py-2 text-sm font-bold whitespace-nowrap shadow-lg transition-all hover:shadow-xl hover:brightness-110 active:scale-95 sm:flex"
      >
        Đăng Nhập
      </button>
      <button
        onClick={onOpenLogin}
        className="hover:bg-muted/50 rounded-full p-2 transition-colors sm:hidden"
        aria-label="Đăng nhập"
      >
        <User className="h-6 w-6" />
      </button>
    </div>
  );
}
