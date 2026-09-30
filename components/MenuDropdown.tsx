'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

interface MenuDropdownProps {
  title: string;
  items: { label: string; href: string }[];
  scrolled?: boolean;
  activeColor?: string;
}

export function MenuDropdown({
  title,
  items,
  scrolled,
  activeColor,
}: MenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleMouseEnter = () => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutIdRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div
      className="group relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={dropdownRef}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`hover:text-primary relative inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 leading-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:outline-none ${scrolled ? 'text-foreground/80' : activeColor}`}
      >
        {title}
        <ChevronDown
          className={`h-3.5 w-3.5 text-current/65 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`absolute top-full left-0 origin-top-left overflow-hidden rounded-2xl border border-white/10 bg-[#111b2e]/95 shadow-[0_18px_48px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-200 ${isOpen ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-2 scale-[.98] opacity-0'} ${items.length > 12 ? 'w-[480px]' : 'w-48'} `}
      >
        <div
          className={`p-1.5 ${items.length > 12 ? 'grid max-h-[400px] grid-cols-3 gap-1 overflow-y-auto' : 'flex flex-col'}`}
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:bg-white/8 hover:text-primary rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:outline-none"
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
