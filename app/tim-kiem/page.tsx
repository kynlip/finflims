'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Search,
  Loader2,
  Filter,
  X,
  ChevronDown,
  Check,
  Sparkles,
  Film,
  Compass,
  Globe,
  Calendar,
  Flame,
  Star,
  Tv,
  Clapperboard,
  ArrowUpRight,
  SlidersHorizontal,
} from 'lucide-react';
import { searchAnimations } from '@/app/actions';
import { Movie } from '@/lib/data';
import { MovieCard } from '@/components/MovieCard';
import {
  ANIMATION_CATEGORIES,
  ANIMATION_COUNTRIES,
  ANIMATION_YEARS,
  ANIMATION_LANGUAGES,
} from '@/lib/constants';

// --- Quick Navigation Collections Data ---
const ANIME_QUICK_COLLECTIONS = [
  {
    label: 'Phim Mới Cập Nhật',
    href: '/phim-moi',
    icon: Sparkles,
    badge: 'HOT',
    color: 'border-amber-400/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-400',
  },
  {
    label: 'Thám Tử Conan',
    href: '/conan',
    icon: Film,
    badge: 'Tuyển tập',
    color: 'border-red-400/40 text-red-300 bg-red-500/10 hover:bg-red-500/20 hover:border-red-400',
  },
  {
    label: 'Siêu Nhân & Tokusatsu',
    href: '/sieu-nhan',
    icon: Clapperboard,
    badge: 'Tuyển tập',
    color: 'border-yellow-400/40 text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 hover:border-yellow-400',
  },
  {
    label: 'Doraemon',
    href: '/doraemon',
    icon: Tv,
    badge: 'Tuyển tập',
    color: 'border-sky-400/40 text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-400',
  },
  {
    label: 'Top Xem Nhiều',
    href: '/top-view',
    icon: Flame,
    color: 'border-orange-400/40 text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 hover:border-orange-400',
  },
  {
    label: 'Top Đánh Giá IMDb',
    href: '/top-imdb',
    icon: Star,
    color: 'border-amber-400/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-400',
  },
  {
    label: 'Phổ Biến Nhất',
    href: '/pho-bien',
    icon: Compass,
    color: 'border-cyan-400/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400',
  },
  {
    label: 'Đã Hoàn Tất (Full)',
    href: '/hoan-tat',
    icon: Sparkles,
    color: 'border-emerald-400/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-400',
  },
];

const NORMAL_QUICK_COLLECTIONS = [
  {
    label: 'Phim Mới Cập Nhật',
    href: '/phim-moi',
    icon: Sparkles,
    badge: 'HOT',
    color: 'border-amber-400/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-400',
  },
  {
    label: 'Top Xem Nhiều',
    href: '/top-view',
    icon: Flame,
    color: 'border-orange-400/40 text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 hover:border-orange-400',
  },
  {
    label: 'Top Đánh Giá IMDb',
    href: '/top-imdb',
    icon: Star,
    color: 'border-amber-400/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-400',
  },
  {
    label: 'Phim Phổ Biến',
    href: '/pho-bien',
    icon: Compass,
    color: 'border-cyan-400/40 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400',
  },
  {
    label: 'Phim Hoàn Tất (Full)',
    href: '/hoan-tat',
    icon: Sparkles,
    color: 'border-emerald-400/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-400',
  },
  {
    label: 'Thám Tử Conan',
    href: '/conan',
    icon: Film,
    badge: 'Tuyển tập',
    color: 'border-red-400/40 text-red-300 bg-red-500/10 hover:bg-red-500/20 hover:border-red-400',
  },
  {
    label: 'Siêu Nhân & Tokusatsu',
    href: '/sieu-nhan',
    icon: Clapperboard,
    badge: 'Tuyển tập',
    color: 'border-yellow-400/40 text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 hover:border-yellow-400',
  },
  {
    label: 'Doraemon',
    href: '/doraemon',
    icon: Tv,
    badge: 'Tuyển tập',
    color: 'border-sky-400/40 text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-400',
  },
];

const ANIME_GENRES = [
  { slug: 'hanh-dong', name: 'Hành Động' },
  { slug: 'phieu-luu', name: 'Phiêu Lưu' },
  { slug: 'hai-huoc', name: 'Hài Hước' },
  { slug: 'hoc-duong', name: 'Học Đường' },
  { slug: 'vien-tuong', name: 'Viễn Tưởng' },
  { slug: 'gia-tuong', name: 'Giả Tưởng' },
  { slug: 'than-thoai', name: 'Thần Thoại' },
  { slug: 'tinh-cam', name: 'Tình Cảm' },
  { slug: 'tre-em', name: 'Trẻ Em' },
  { slug: 'bi-an', name: 'Bí Ẩn' },
  { slug: 'kinh-di', name: 'Kinh Dị' },
  { slug: 'the-thao', name: 'Thể Thao' },
  { slug: 'am-nhac', name: 'Âm Nhạc' },
  { slug: 'co-trang', name: 'Cổ Trang' },
  { slug: 'vo-thuat', name: 'Võ Thuật' },
];

const NORMAL_GENRES = [
  { slug: 'hoat-hinh', name: 'Hoạt Hình' },
  { slug: 'hanh-dong', name: 'Hành Động' },
  { slug: 'phieu-luu', name: 'Phiêu Lưu' },
  { slug: 'tinh-cam', name: 'Tình Cảm' },
  { slug: 'hai-huoc', name: 'Hài Hước' },
  { slug: 'co-trang', name: 'Cổ Trang' },
  { slug: 'vo-thuat', name: 'Võ Thuật' },
  { slug: 'vien-tuong', name: 'Viễn Tưởng' },
  { slug: 'kinh-di', name: 'Kinh Dị' },
  { slug: 'hinh-su', name: 'Hình Sự' },
  { slug: 'tam-ly', name: 'Tâm Lý' },
  { slug: 'khoa-hoc', name: 'Khoa Học' },
  { slug: 'gia-dinh', name: 'Gia Đình' },
  { slug: 'chien-tranh', name: 'Chiến Tranh' },
  { slug: 'tai-lieu', name: 'Tài Liệu' },
];

const POPULAR_COUNTRIES = [
  { slug: 'nhat-ban', name: 'Nhật Bản' },
  { slug: 'trung-quoc', name: 'Trung Quốc' },
  { slug: 'han-quoc', name: 'Hàn Quốc' },
  { slug: 'au-my', name: 'Âu Mỹ' },
  { slug: 'hong-kong', name: 'Hồng Kông' },
  { slug: 'thai-lan', name: 'Thái Lan' },
  { slug: 'dai-loan', name: 'Đài Loan' },
  { slug: 'viet-nam', name: 'Việt Nam' },
];

const POPULAR_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019];

// --- MultiSelect Component ---
function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { slug?: string; year?: number; name: string | number }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  return (
    <div className="group/multiselect relative">
      <label className="mb-1 ml-1 block text-xs font-semibold text-gray-400">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="flex w-full items-center justify-between rounded-lg border border-[#D4AF68]/30 bg-[#0B1221] px-3 py-2 text-left text-sm transition-colors hover:border-[#D4AF68]"
      >
        <span className="block max-w-[80%] truncate text-gray-200">
          {selected.length > 0 ? `${selected.length} đã chọn` : 'Tất cả'}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Panel */}
      <div
        className={`custom-scrollbar absolute top-full left-0 z-50 mt-1 max-h-60 w-full origin-top overflow-y-auto rounded-lg border border-[#D4AF68]/30 bg-[#151f32] shadow-xl transition-all duration-200 ${isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'}`}
      >
        {options.map((opt) => {
          const val = String(opt.slug || opt.year);
          const isSelected = selected.includes(val);
          return (
            <div
              key={val}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleOption(val);
              }}
              className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[#D4AF68]/20 ${isSelected ? 'bg-[#D4AF68]/10 font-medium text-[#D4AF68]' : 'text-gray-300'}`}
            >
              <span>{opt.name}</span>
              {isSelected && <Check className="h-3 w-3" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [isPending, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);

  // Filter states (Arrays for Multi-Select)
  const [categories, setCategories] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>([]);
  const [sort, setSort] = useState<string>('latest');
  const [showFilters, setShowFilters] = useState(false);
  const [isAnimeMode, setIsAnimeMode] = useState(false);

  useEffect(() => {
    const readMode = () => {
      setIsAnimeMode(
        document.cookie
          .split(';')
          .map((value) => value.trim())
          .some((value) => value === 'anime_mode=1'),
      );
    };
    const handleModeChange = (event: Event) => {
      setIsAnimeMode(Boolean((event as CustomEvent<boolean>).detail));
      setResults([]);
      setHasSearched(false);
    };

    readMode();
    window.addEventListener('animemodechange', handleModeChange);
    return () => window.removeEventListener('animemodechange', handleModeChange);
  }, []);

  const handleSearch = (term: string) => {
    setQuery(term);
    performSearch(term, categories, countries, years, langs, sort);
  };

  const clearFilters = () => {
    setCategories([]);
    setCountries([]);
    setYears([]);
    setLangs([]);
    setSort('latest');
    performSearch(query, [], [], [], [], 'latest');
  };

  const performSearch = (
    searchTerm: string,
    cats: string[],
    ctrs: string[],
    yrs: string[],
    lngs: string[],
    srt: string
  ) => {
    if (
      !searchTerm.trim() &&
      cats.length === 0 &&
      ctrs.length === 0 &&
      yrs.length === 0 &&
      lngs.length === 0
    ) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    startTransition(async () => {
      const filters = {
        category: cats.join(','),
        country: ctrs.join(','),
        year: yrs.join(','),
        lang: lngs.join(','),
        sort: srt,
      };
      const data = await searchAnimations(searchTerm, filters);
      setResults(data);
      setHasSearched(true);
    });
  };

  const quickCollections = isAnimeMode ? ANIME_QUICK_COLLECTIONS : NORMAL_QUICK_COLLECTIONS;
  const quickGenres = isAnimeMode ? ANIME_GENRES : NORMAL_GENRES;

  return (
    <main className="min-h-screen bg-[#0B1221] pt-16 sm:pt-20 text-[#F3F0E6]">
      <div className="container mx-auto min-h-screen px-3 sm:px-4 py-8 sm:py-12 md:py-16">
        
        {/* Header Area */}
        <div className="animate-fade-in mx-auto mb-8 sm:mb-12 max-w-4xl">
          <div className="mb-6 sm:mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF68]/40 bg-[#D4AF68]/10 px-3.5 py-1 text-xs font-bold text-[#D4AF68] uppercase tracking-wider mb-3">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {isAnimeMode ? 'Trung Tâm Lọc Anime' : 'Trung Tâm Lọc Phim'}
            </div>
            <h1 className="mb-2 sm:mb-4 font-serif text-2xl sm:text-4xl font-bold text-[#D4AF68] drop-shadow-[0_0_15px_rgba(212,175,104,0.3)] md:text-5xl">
              Tìm Kiếm & Lọc Phim
            </h1>
            <p className="text-xs sm:text-base text-gray-400">
              {isAnimeMode ? 'Khám phá kho tàng anime vietsub chất lượng cao' : 'Khám phá kho phim đa dạng, cập nhật liên tục'}
            </p>
          </div>

          {/* Search Input & Filter Toggle */}
          <div className="relative mx-auto max-w-2xl space-y-4">
            <div className="group relative">
              <div className="absolute -inset-1 animate-pulse rounded-full bg-linear-to-r from-[#D4AF68] via-[#00F0FF] to-[#D4AF68] opacity-30 blur transition duration-1000 group-hover:opacity-60 group-hover:duration-200"></div>
              <div className="relative flex items-center rounded-full border-2 border-[#D4AF68]/50 bg-[#1A243B] p-1.5 sm:p-2 shadow-2xl">
                <span className="pl-3 sm:pl-4 text-[#D4AF68]">
                  {isPending ? (
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5 sm:h-6 sm:w-6" />
                  )}
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={isAnimeMode ? 'Nhập tên anime bạn muốn tìm kiếm...' : 'Nhập tên phim bạn muốn tìm kiếm...'}
                  className="font-nunito grow bg-transparent px-3 sm:px-4 py-1.5 sm:py-2 text-base sm:text-lg font-medium text-[#F3F0E6] placeholder-gray-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 sm:gap-2 rounded-full border px-3 sm:px-4 py-1.5 sm:py-2 transition-colors ${showFilters ? 'border-[#D4AF68] bg-[#D4AF68] text-[#0B1221]' : 'border-[#D4AF68]/30 text-[#D4AF68] hover:bg-[#D4AF68]/10'}`}
                  title="Bộ lọc nâng cao"
                >
                  <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden font-medium sm:inline">Bộ lọc</span>
                </button>
              </div>
            </div>

            {/* Advanced Filters Panel - Responsive Grid */}
            {showFilters && (
              <div className="animate-fade-in-up rounded-2xl border border-[#D4AF68]/30 bg-[#1A243B]/90 p-4 sm:p-6 backdrop-blur-md">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-serif font-semibold text-[#D4AF68]">
                    Bộ Lọc Nâng Cao
                  </h3>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                  >
                    <X className="h-3 w-3" /> Xóa bộ lọc
                  </button>
                </div>

                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
                  <MultiSelect
                    label="Thể loại"
                    options={ANIMATION_CATEGORIES}
                    selected={categories}
                    onChange={(vals) => {
                      setCategories(vals);
                      performSearch(query, vals, countries, years, langs, sort);
                    }}
                  />

                  <MultiSelect
                    label="Quốc gia"
                    options={ANIMATION_COUNTRIES}
                    selected={countries}
                    onChange={(vals) => {
                      setCountries(vals);
                      performSearch(query, categories, vals, years, langs, sort);
                    }}
                  />

                  <MultiSelect
                    label="Năm"
                    options={ANIMATION_YEARS.map((y) => ({
                      ...y,
                      name: y.year,
                    }))}
                    selected={years}
                    onChange={(vals) => {
                      setYears(vals);
                      performSearch(query, categories, countries, vals, langs, sort);
                    }}
                  />

                  <MultiSelect
                    label="Ngôn ngữ"
                    options={ANIMATION_LANGUAGES}
                    selected={langs}
                    onChange={(vals) => {
                      setLangs(vals);
                      performSearch(query, categories, countries, years, vals, sort);
                    }}
                  />

                  {/* Sort Filter */}
                  <div className="space-y-1">
                    <label className="mb-1 ml-1 block text-xs font-semibold text-gray-400">
                      Sắp xếp
                    </label>
                    <div className="relative">
                      <select
                        value={sort}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSort(val);
                          performSearch(query, categories, countries, years, langs, val);
                        }}
                        className="w-full appearance-none rounded-lg border border-[#D4AF68]/30 bg-[#0B1221] px-3 py-2 text-sm text-gray-200 focus:border-[#D4AF68] focus:outline-none"
                      >
                        <option value="latest">Mới cập nhật</option>
                        <option value="view">Lượt xem cao nhất</option>
                        <option value="popular">Phổ biến nhất</option>
                        <option value="rating">Đánh giá cao nhất</option>
                        <option value="oldest">Cũ nhất</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🎬 MENU LỌC PHIM DẪN TRỰC TIẾP TỚI CÁC TRANG PHIM */}
        <section className="mx-auto mb-12 max-w-6xl space-y-8 rounded-3xl border border-white/10 bg-[#121929]/70 p-5 sm:p-8 backdrop-blur-md shadow-2xl">
          
          {/* Section 1: Tuyển tập & Danh mục chính */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wider text-[#D4AF68] uppercase">
                <Film className="h-4 w-4" />
                {isAnimeMode ? 'Danh Mục & Tuyển Tập Anime' : 'Danh Mục Phim Nổi Bật'}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 sm:gap-3.5">
              {quickCollections.map((col) => {
                const IconComponent = col.icon;
                return (
                  <Link
                    key={col.href}
                    href={col.href}
                    className={`group relative flex items-center justify-between overflow-hidden rounded-2xl border p-3 sm:p-4 text-xs sm:text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${col.color}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/10 shadow-inner">
                        <IconComponent className="h-4 w-4" />
                      </span>
                      <span className="truncate">{col.label}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {col.badge && (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase">
                          {col.badge}
                        </span>
                      )}
                      <ArrowUpRight className="h-4 w-4 shrink-0 opacity-40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Section 2: Khám Phá Theo Thể Loại */}
          <div className="border-t border-white/10 pt-6">
            <div className="mb-3.5 flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wider text-white/70 uppercase">
              <Compass className="h-4 w-4 text-[#D4AF68]" />
              Khám Phá Theo Thể Loại
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-2.5">
              {quickGenres.map((genre) => (
                <Link
                  key={genre.slug}
                  href={`/the-loai/${genre.slug}`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs sm:text-sm font-bold text-white/80 transition-all hover:border-[#D4AF68] hover:bg-[#D4AF68]/15 hover:text-[#FFD875] active:scale-[0.98]"
                >
                  <span>{genre.name}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-30 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>

          {/* Section 3: Khám Phá Theo Quốc Gia & Năm */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/10 pt-6">
            {/* Quốc Gia */}
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wider text-white/70 uppercase">
                <Globe className="h-4 w-4 text-cyan-400" />
                Khám Phá Theo Quốc Gia
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_COUNTRIES.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/quoc-gia/${c.slug}`}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/75 transition-all hover:border-cyan-400 hover:bg-cyan-500/15 hover:text-cyan-200 active:scale-[0.98]"
                  >
                    <span>{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Năm Phát Hành */}
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wider text-white/70 uppercase">
                <Calendar className="h-4 w-4 text-amber-400" />
                Khám Phá Theo Năm
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_YEARS.map((yr) => (
                  <Link
                    key={yr}
                    href={`/nam/${yr}`}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/75 transition-all hover:border-amber-400 hover:bg-amber-500/15 hover:text-amber-200 active:scale-[0.98]"
                  >
                    <span>{yr}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Results Grid - Responsive Columns */}
        <div className="animate-fade-in-up">
          {results.length > 0 ? (
            <div>
              <div className="mb-6 flex items-center justify-between border-b border-[#D4AF68]/20 pb-3">
                <h2 className="font-serif text-lg sm:text-2xl font-bold text-[#D4AF68]">
                  Kết Quả Tìm Kiếm ({results.length} phim)
                </h2>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-gray-400 hover:text-white"
                >
                  Xóa kết quả
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 md:gap-x-5 lg:grid-cols-5 xl:grid-cols-6">
                {results.map((movie, index) => (
                  <MovieCard key={movie._id} movie={movie} priority={index < 5} />
                ))}
              </div>
            </div>
          ) : (
            hasSearched && (
              <div className="border-t border-[#D4AF68]/20 py-16 text-center">
                <p className="mb-2 text-xl font-bold text-gray-400">
                  Không tìm thấy kết quả nào.
                </p>
                <p className="text-gray-500 italic">
                  Thử thay đổi từ khóa hoặc chọn các mục khám phá phim ở trên!
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
}
