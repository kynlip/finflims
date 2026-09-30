'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Play,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import {
  ContinueWatchingItem,
  getContinueWatchingList,
  removeContinueWatchingItem,
} from '@/lib/continue-watching';

export function ContinueWatchingSection() {
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const loadItems = () => {
    const list = getContinueWatchingList();
    setItems(list);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      loadItems();
    }, 0);

    const handleUpdate = () => {
      loadItems();
    };

    window.addEventListener('continue_watching_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('continue_watching_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 10);
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [items]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleRemove = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = removeContinueWatchingItem(slug);
    setItems(updated);
  };

  const formatEpisodeLabel = (ep?: string, epName?: string) => {
    const raw = (epName || ep || '').trim();
    if (!raw) return '';
    const low = raw.toLowerCase();
    if (low === 'full' || low === 'tap-full' || low.includes('full') || low.includes('hoàn tất')) {
      return '';
    }
    const clean = raw.replace(/^tap-|^ep-|^tập\s*/i, '');
    return `Tập ${clean}`;
  };

  if (!mounted || items.length === 0) {
    return null;
  }

  return (
    <section className="relative my-8 transition-all duration-300">
      {/* Header - Không hiển thị đếm phim */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#ffd875] to-amber-600 text-black shadow-md shadow-amber-500/20">
            <RotateCcw size={18} className="font-bold" />
          </div>
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Đang Xem Tiếp</span>
            </h2>
            <p className="text-xs text-white/60 font-medium hidden sm:block">
              Tiếp tục theo dõi các tập phim dang dở của bạn
            </p>
          </div>
        </div>

        {/* Scroll navigation arrows for Desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => handleScroll('left')}
            disabled={!showLeftArrow}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#ffd875]/40"
            aria-label="Cuộn sang trái"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => handleScroll('right')}
            disabled={!showRightArrow}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#ffd875]/40"
            aria-label="Cuộn sang phải"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Carousel Container */}
      <div className="relative group/carousel">
        <div
          ref={scrollContainerRef}
          className="scrollbar-hide flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth"
        >
          {items.map((item, index) => {
            const watchHref = `/xem/${item.slug}/${item.server || 'server-1'}/${item.episode || 'tap-1'}${
              item.currentTime > 5 ? `?t=${item.currentTime}` : ''
            }`;
            const imageSrc = item.thumb_url || item.poster_url || '/images/default-thumb.jpg';
            const epLabel = formatEpisodeLabel(item.episode, item.episodeName);

            return (
              <div
                key={item.slug}
                className="group relative w-[240px] sm:w-[300px] md:w-[320px] shrink-0 snap-start transition-transform duration-300 hover:-translate-y-1"
              >
                {/* Toàn bộ Card có thể bấm để tiếp tục xem ngay */}
                <Link href={watchHref} className="block relative">
                  {/* Thumbnail Video 16:9 sắc nét, bo góc 16px, đổ bóng cinematic */}
                  <div className="relative aspect-video w-full overflow-hidden rounded-[16px] border border-white/10 bg-[#0d1424] shadow-[0_8px_25px_rgba(0,0,0,0.45)]">
                    <Image
                      src={imageSrc}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 70vw, 300px"
                      quality={80}
                      priority={index < 2}
                      loading={index < 2 ? 'eager' : 'lazy'}
                    />

                    {/* Gradient tối nhẹ ở đáy ảnh */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Nút Play tiếp luôn hiển thị ở trung tâm (Center Play Button) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-xs border-[1.5px] border-white/60 text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:bg-[#ffd875] group-hover:text-black group-hover:border-[#ffd875] group-hover:shadow-[0_0_20px_rgba(255,216,117,0.5)]">
                        <Play className="ml-0.5 sm:ml-1 h-4 w-4 sm:h-6 sm:w-6 fill-current transition-colors" />
                      </div>
                    </div>

                    {/* Nút X góc trên để xóa nhanh phim khỏi danh sách xem dở */}
                    <button
                      type="button"
                      onClick={(e) => handleRemove(e, item.slug)}
                      className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white/90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-rose-600 hover:text-white hover:border-rose-500 transition-all shadow-md"
                      title="Xóa khỏi danh sách xem dở"
                    >
                      <X size={14} />
                    </button>

                    {/* Thanh tiến độ xem dở trong ảnh (In-Image Progress Bar) */}
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/28">
                      <div
                        className="h-full bg-[#ffd875] shadow-[0_0_8px_rgba(255,216,117,0.7)] transition-all duration-300"
                        style={{ width: `${Math.max(4, item.progressPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Tên phim & Nhãn tập bên dưới ảnh */}
                  <div className="mt-2.5 px-0.5">
                    <h3 className="truncate text-sm font-bold text-white group-hover:text-[#ffd875] transition-colors">
                      {item.name}
                    </h3>
                    <p className="mt-0.5 text-xs font-medium text-white/60 truncate">
                      {epLabel ? `${epLabel} • ` : ''}Đã xem {item.progressPercent}%
                    </p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
