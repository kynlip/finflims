"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  Bell,
  Menu,
  X,
  Filter,
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
  Heart,
  History,
  Shield,
  Wallet,
} from "lucide-react";
import { MenuDropdown } from "@/components/MenuDropdown";
import {
  ANIMATION_CATEGORIES,
  ANIMATION_COUNTRIES,
  ANIMATION_YEARS,
} from "@/lib/constants";
import { AuthButtons } from "./AuthButtons";
import { AuthModal } from "@/components/auth/AuthModal";
import { AnimeModeToggle } from "@/components/AnimeModeToggle";

interface NavbarProps {
  simpleLinkColor?: string;
}

export function Navbar({ simpleLinkColor = "text-foreground" }: NavbarProps) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAnimeMode, setIsAnimeMode] = useState(false);

  // Accordion state for mobile drawer menu (default: all collapsed)
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>(
    {},
  );

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Set mounted state after component mounts (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll listener to smoothly transition navbar style
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 25);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const readMode = () => {
      const enabled = document.cookie
        .split(";")
        .map((value) => value.trim())
        .some((value) => value === "anime_mode=1");
      setIsAnimeMode(enabled);
    };
    const handleModeChange = (event: Event) => {
      setIsAnimeMode(Boolean((event as CustomEvent<boolean>).detail));
    };

    readMode();
    window.addEventListener("animemodechange", handleModeChange);
    return () => window.removeEventListener("animemodechange", handleModeChange);
  }, []);

  // Check URL params for auth trigger
  useEffect(() => {
    const authParam = searchParams.get("auth");
    if ((authParam === "login" || authParam === "register") && !session) {
      setIsAuthModalOpen(true);
    }
  }, [searchParams, session]);

  // Clean URL after closing modal
  const handleCloseAuthModal = () => {
    setIsAuthModalOpen(false);
    // Remove query param without refreshing
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete("auth");
    router.replace(
      pathname + (newParams.toString() ? `?${newParams.toString()}` : ""),
      { scroll: false },
    );
  };

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Function to open Auth Modal manually
  const openLogin = () => setIsAuthModalOpen(true);

  /* Search Logic */
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      _id: string;
      name: string;
      origin_name: string;
      slug: string;
      thumb_url: string;
      year: number;
      quality: string;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSort, setFilterSort] = useState("latest");

  // Debounce search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const hasFilters =
        filterCategory ||
        filterCountry ||
        filterYear ||
        filterSort !== "latest";
      const shouldSearch =
        searchQuery.length > 1 || (hasFilters && searchQuery.length >= 0);

      if (shouldSearch) {
        setIsSearching(true);
        try {
          const { searchAnimations } = await import("@/app/actions");
          const filters = {
            category: filterCategory || undefined,
            country: filterCountry || undefined,
            year: filterYear || undefined,
            sort: filterSort,
          };
          const results = await searchAnimations(searchQuery, filters);
          setSearchResults(results);
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, filterCategory, filterCountry, filterYear, filterSort]);

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-50 w-full transition-all duration-300 ${
          isScrolled
            ? "border-b border-white/10 bg-[#0b1221]/90 py-1.5 shadow-xl shadow-black/30 backdrop-blur-xl"
            : "border-none bg-linear-to-b from-[#0b1221]/80 via-[#0b1221]/25 to-transparent py-2.5 sm:py-3.5"
        }`}
      >
        <div
          suppressHydrationWarning
          className="relative container mx-auto flex min-h-12 items-center justify-between px-4 md:px-8"
        >
          {/* Left Side: Mobile Menu Button & Desktop Logo & Main Navigation */}
          <div className="flex min-w-0 items-center gap-2 xl:gap-5">
            <div className="flex shrink-0 items-center gap-1 xl:static">
              {/* Mobile Menu Button */}
              <button
                className="text-foreground hover:text-primary hover:bg-muted/50 relative z-20 -ml-2 flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 transition-colors xl:hidden"
                aria-label="Menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-navigation-drawer"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-7 w-7" />
              </button>

              {/* Desktop Logo */}
              <Link href="/" className="group hidden items-center xl:flex">
                <div className="relative h-10 w-10 transition-transform duration-200 group-hover:scale-[1.04] md:h-11 md:w-11">
                  <Image
                    src="/images/logo/logo-mark.svg"
                    alt="Phim Hay Hơn Rổ Logo"
                    width={512}
                    height={512}
                    className="h-full w-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.28)]"
                    sizes="58px"
                    loading="eager"
                  />
                </div>
              </Link>
            </div>

            {/* Mobile Logo - Absolute Center */}
            <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 xl:hidden">
              <Link href="/" className="pointer-events-auto block">
                <div className="relative h-10 w-10">
                  <Image
                    src="/images/logo/logo-mark.svg"
                    alt="Phim Hay Hơn Rổ Logo"
                    width={512}
                    height={512}
                    className="h-full w-full drop-shadow-[0_6px_14px_rgba(0,0,0,0.24)]"
                    sizes="58px"
                    loading="eager"
                  />
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            {isAnimeMode ? (
              /* Anime Mode Menu Layout:
                 Trang Chủ - Tìm Kiếm(thanh nhập) - Conan - Siêu Nhân - Doraemon - Lọc Phim - Thể Loại - Bảng Xếp Hạng */
              <div
                aria-label="Điều hướng Anime Mode"
                className={`hidden min-w-0 items-center gap-1 font-serif text-[13px] font-semibold tracking-[0.01em] transition-colors duration-300 xl:flex xl:gap-1.5 ${isScrolled ? "text-foreground/80" : simpleLinkColor}`}
              >
                <Link
                  href="/"
                  className="hover:text-primary after:bg-primary relative inline-flex h-10 items-center rounded-lg px-2.5 leading-none whitespace-nowrap transition-colors duration-200 after:absolute after:inset-x-2.5 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:transition-transform hover:after:scale-x-100 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:outline-none"
                >
                  Trang Chủ
                </Link>

                {/* Desktop search field right after Trang Chủ */}
                <div
                  suppressHydrationWarning
                  className={`relative flex h-9.5 w-40 items-center 2xl:w-48 ${isScrolled ? "text-foreground" : simpleLinkColor}`}
                >
                  <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 opacity-70 text-[#D4AF68]" />
                  <input
                    type="search"
                    autoComplete="off"
                    data-lpignore="true"
                    data-protonpass-ignore="true"
                    data-form-type="other"
                    suppressHydrationWarning
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        setIsSearchOpen(true);
                      }
                    }}
                    placeholder="Tìm kiếm..."
                    aria-label="Tìm kiếm anime"
                    className="h-full w-full rounded-full border border-[#D4AF68]/40 bg-black/25 pr-3 pl-8.5 text-xs outline-none transition-colors placeholder:text-current/55 focus:border-[#D4AF68] focus:bg-black/45"
                  />
                </div>

                <Link
                  href="/conan"
                  className="hover:text-[#ef6a65] after:bg-[#ef6a65] relative inline-flex h-10 items-center rounded-lg px-2.5 leading-none whitespace-nowrap transition-colors duration-200 after:absolute after:inset-x-2.5 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:transition-transform hover:after:scale-x-100 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:outline-none"
                >
                  Conan
                </Link>

                <Link
                  href="/sieu-nhan"
                  className="hover:text-[#ff4d4f] after:bg-[#ff4d4f] relative inline-flex h-10 items-center rounded-lg px-2.5 leading-none whitespace-nowrap transition-colors duration-200 after:absolute after:inset-x-2.5 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:transition-transform hover:after:scale-x-100 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:outline-none"
                >
                  Siêu Nhân
                </Link>

                <Link
                  href="/doraemon"
                  className="hover:text-[#36d9ef] after:bg-[#36d9ef] relative inline-flex h-10 items-center rounded-lg px-2.5 leading-none whitespace-nowrap transition-colors duration-200 after:absolute after:inset-x-2.5 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:transition-transform hover:after:scale-x-100 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:outline-none"
                >
                  Doraemon
                </Link>

                {/* Lọc Phim đặt ngay TRƯỚC Thể Loại */}
                <Link
                  href="/tim-kiem"
                  className="hover:text-primary after:bg-primary relative inline-flex h-10 items-center rounded-lg px-2.5 leading-none whitespace-nowrap transition-colors duration-200 after:absolute after:inset-x-2.5 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:transition-transform hover:after:scale-x-100 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:outline-none"
                >
                  Lọc Phim
                </Link>

                <MenuDropdown
                  title="Thể Loại"
                  items={ANIMATION_CATEGORIES.map((cat) => ({
                    label: cat.name,
                    href: `/the-loai/${cat.slug}`,
                  }))}
                  scrolled={isScrolled}
                  activeColor={simpleLinkColor}
                />

                <MenuDropdown
                  title="Bảng Xếp Hạng"
                  items={[
                    { label: "Top View", href: "/top-view" },
                    { label: "Top IMDb", href: "/top-imdb" },
                    { label: "Mới Cập Nhật", href: "/phim-moi" },
                    { label: "Phim Hoàn Tất", href: "/hoan-tat" },
                  ]}
                  scrolled={isScrolled}
                  activeColor={simpleLinkColor}
                />
              </div>
            ) : (
              /* Regular Mode Traditional Layout */
              <div
                aria-label="Điều hướng chính"
                className={`hidden min-w-0 items-center gap-1 font-serif text-[13px] font-semibold tracking-[0.01em] transition-colors duration-300 xl:flex xl:gap-1.5 ${isScrolled ? "text-foreground/80" : simpleLinkColor}`}
              >
                <Link
                  href="/"
                  className="hover:text-primary after:bg-primary relative inline-flex h-10 items-center rounded-lg px-2.5 leading-none whitespace-nowrap transition-colors duration-200 after:absolute after:inset-x-2.5 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:transition-transform hover:after:scale-x-100 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:outline-none"
                >
                  Trang Chủ
                </Link>

                <Link
                  href="/tim-kiem"
                  className="hover:text-primary after:bg-primary relative inline-flex h-10 items-center rounded-lg px-2.5 leading-none whitespace-nowrap transition-colors duration-200 after:absolute after:inset-x-2.5 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:transition-transform hover:after:scale-x-100 focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:outline-none"
                >
                  Lọc Phim
                </Link>

                <MenuDropdown
                  title="Thể Loại"
                  items={ANIMATION_CATEGORIES.map((cat) => ({
                    label: cat.name,
                    href: `/the-loai/${cat.slug}`,
                  }))}
                  scrolled={isScrolled}
                  activeColor={simpleLinkColor}
                />

                <MenuDropdown
                  title="Quốc Gia"
                  items={ANIMATION_COUNTRIES.map((country) => ({
                    label: country.name,
                    href: `/quoc-gia/${country.slug}`,
                  }))}
                  scrolled={isScrolled}
                  activeColor={simpleLinkColor}
                />

                <MenuDropdown
                  title="Năm"
                  items={ANIMATION_YEARS.map((item) => ({
                    label: String(item.year),
                    href: `/nam/${item.year}`,
                  }))}
                  scrolled={isScrolled}
                  activeColor={simpleLinkColor}
                />

                <MenuDropdown
                  title="Vũ Trụ"
                  items={[
                    { label: "🕵️ Conan", href: "/conan" },
                    { label: "🔔 Doraemon", href: "/doraemon" },
                    { label: "⚡ Siêu Nhân", href: "/sieu-nhan" },
                  ]}
                  scrolled={isScrolled}
                  activeColor={simpleLinkColor}
                />

                <MenuDropdown
                  title="BXH"
                  items={[
                    { label: "Top View", href: "/top-view" },
                    { label: "Top IMDb", href: "/top-imdb" },
                    { label: "Mới Cập Nhật", href: "/phim-moi" },
                    { label: "Phim Hoàn Tất", href: "/hoan-tat" },
                  ]}
                  scrolled={isScrolled}
                  activeColor={simpleLinkColor}
                />
              </div>
            )}
          </div>

          {/* Right Section: Mode Toggle, Search (Normal Mode), Notifications & Actions */}
          <div className="relative z-20 flex items-center gap-2 sm:gap-3 xl:gap-3.5">
            {/* Desktop only Anime Mode Toggle */}
            <div className="hidden xl:inline-flex">
              <AnimeModeToggle defaultEnabled={isAnimeMode} />
            </div>

            {/* Desktop search field (Only shown on right side in normal mode) */}
            {!isAnimeMode && (
              <div
                className={`relative hidden h-10 w-44 items-center xl:flex 2xl:w-56 ${isScrolled ? "text-foreground" : simpleLinkColor}`}
              >
                <Search className="pointer-events-none absolute left-3 h-4 w-4 opacity-70" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      setIsSearchOpen(true);
                    }
                  }}
                  placeholder="Tìm phim..."
                  aria-label="Tìm kiếm phim"
                  className="h-full w-full rounded-full border border-white/20 bg-black/20 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-current/55 focus:border-primary focus:bg-black/35"
                />
              </div>
            )}

            {/* Mobile search button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`hover:text-primary hover:bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full border p-2 transition-all xl:hidden ${isScrolled ? "text-foreground border-white/15" : `${simpleLinkColor} border-white/20`} hover:border-primary active:scale-95`}
              aria-label="Tìm kiếm"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Notification */}
            <button
              className="hover:text-primary hover:bg-muted/50 hidden rounded-full p-2 transition-all sm:block"
              aria-label="Thông báo"
            >
              <Bell className="h-5 w-5" />
            </button>

            {/* Authentication Status (Desktop Only) */}
            <div className="hidden xl:inline-flex items-center">
              <AuthButtons onOpenLogin={openLogin} />
            </div>
          </div>
        </div>
      </nav>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={handleCloseAuthModal}
        defaultMode={
          searchParams.get("auth") === "register" ? "register" : "login"
        }
      />

      {/* Search Overlay/Modal */}
      <div
        suppressHydrationWarning
        className={`bg-background/98 fixed inset-0 z-60 flex h-dvh min-h-0 flex-col overflow-hidden backdrop-blur-2xl transition-all duration-500 ${
          isSearchOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <div
          suppressHydrationWarning
          className="container mx-auto flex min-h-0 w-full flex-1 flex-col px-4 py-8 md:py-12"
        >
          {/* Search Header */}
          <div suppressHydrationWarning className="mb-8 md:mb-12">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-foreground font-serif text-xl font-bold md:text-2xl">
                Tìm kiếm phim
              </h2>
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="hover:bg-muted group rounded-full p-2 transition-colors"
                aria-label="Đóng"
              >
                <X className="text-muted-foreground group-hover:text-foreground h-6 w-6 transition-colors md:h-7 md:w-7" />
              </button>
            </div>

            {/* Search Input & Filter Toggle */}
            <div suppressHydrationWarning className="flex flex-col gap-4">
              <div suppressHydrationWarning className="relative flex items-center gap-2">
                <div suppressHydrationWarning className="relative grow">
                  <div className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2">
                    <Search className="text-primary h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <input
                    type="search"
                    autoComplete="off"
                    data-lpignore="true"
                    data-protonpass-ignore="true"
                    data-form-type="other"
                    suppressHydrationWarning
                    placeholder="Nhập tên phim..."
                    className="bg-muted/50 hover:bg-muted/70 focus:bg-muted focus:border-primary placeholder:text-muted-foreground/60 w-full rounded-2xl border-2 border-transparent py-4 pr-10 pl-12 text-lg font-medium transition-all focus:outline-none md:py-5 md:pl-14 md:text-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus={isSearchOpen}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="hover:bg-background absolute top-1/2 right-4 -translate-y-1/2 rounded-full p-1.5 transition-colors"
                      aria-label="Xóa"
                    >
                      <X className="text-muted-foreground h-4 w-4" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl border-2 p-4 transition-all md:px-6 ${
                    showFilters
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 hover:bg-muted/50 text-muted-foreground border-transparent"
                  }`}
                >
                  <Filter className="h-5 w-5" />
                  <span className="hidden font-bold md:inline">Bộ lọc</span>
                </button>
              </div>

              {/* Collapsible Filter Panel */}
              <div
                className={`grid grid-cols-2 gap-3 overflow-hidden transition-all duration-300 md:grid-cols-4 ${showFilters ? "max-h-125 opacity-100" : "max-h-0 opacity-0"}`}
              >
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-muted/50 focus:bg-muted focus:ring-primary/50 rounded-xl border-r-8 border-transparent px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
                >
                  <option value="">Tất cả thể loại</option>
                  {ANIMATION_CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                  className="bg-muted/50 focus:bg-muted focus:ring-primary/50 rounded-xl border-r-8 border-transparent px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
                >
                  <option value="">Tất cả quốc gia</option>
                  {ANIMATION_COUNTRIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="bg-muted/50 focus:bg-muted focus:ring-primary/50 rounded-xl border-r-8 border-transparent px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
                >
                  <option value="">Tất cả năm</option>
                  {ANIMATION_YEARS.map((y) => (
                    <option key={y.year} value={y.year}>
                      {y.year}
                    </option>
                  ))}
                </select>

                <select
                  value={filterSort}
                  onChange={(e) => setFilterSort(e.target.value)}
                  className="bg-muted/50 focus:bg-muted focus:ring-primary/50 rounded-xl border-r-8 border-transparent px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
                >
                  <option value="latest">Mới cập nhật</option>
                  <option value="view">Xem nhiều nhất</option>
                  <option value="popular">Phổ biến nhất</option>
                </select>
              </div>
            </div>

            {/* Search Stats */}
            {searchResults.length > 0 && (
              <p className="text-muted-foreground mt-4 text-sm">
                Tìm thấy{" "}
                <span className="text-primary font-bold">
                  {searchResults.length}
                </span>{" "}
                kết quả
              </p>
            )}
          </div>

          {/* Results Area */}
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-2 pb-8 md:max-h-[calc(100vh-320px)]">
            {isSearching ? (
              <div className="py-20 text-center">
                <div className="border-primary/30 border-t-primary mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4"></div>
                <p className="text-muted-foreground font-medium">
                  Đang tìm kiếm...
                </p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {searchResults.map((movie) => (
                  <Link
                    key={movie._id}
                    href={`/phim/${movie.slug}`}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="hover:bg-muted/70 group hover:border-primary/20 flex gap-4 rounded-xl border border-transparent p-4 transition-all"
                  >
                    <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg shadow-md md:h-32 md:w-24">
                      <Image
                        src={movie.thumb_url}
                        alt={movie.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-foreground group-hover:text-primary mb-1 line-clamp-2 text-base font-bold transition-colors md:text-lg">
                        {movie.name}
                      </h3>
                      <p className="text-muted-foreground mb-2 line-clamp-1 text-sm">
                        {movie.origin_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-primary/10 text-primary border-primary/20 rounded border px-2 py-0.5 text-xs font-bold">
                          {movie.year}
                        </span>
                        {movie.quality && (
                          <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs font-medium">
                            {movie.quality}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : searchQuery.length > 1 ? (
              <div className="py-20 text-center">
                <div className="mb-4 text-6xl opacity-20">🔍</div>
                <p className="text-muted-foreground text-lg font-medium">
                  Không tìm thấy phim nào
                </p>
                <p className="text-muted-foreground/70 mt-2 text-sm">
                  Thử tìm kiếm với từ khóa khác
                </p>
              </div>
            ) : (
              <div className="animate-fade-in flex flex-col items-center justify-center py-10 md:py-20">
                <div className="relative mb-6 h-48 w-48 md:h-64 md:w-64">
                  <Image
                    src="/images/wlc.gif"
                    alt="Welcome"
                    fill
                    className="object-contain drop-shadow-2xl"
                    unoptimized
                  />
                </div>
                <p className="text-primary mb-2 font-serif text-xl font-bold md:text-2xl">
                  Tìm kiếm phim yêu thích
                </p>
                <p className="text-muted-foreground/70 max-w-md text-center text-sm md:text-base">
                  Nhập tên phim hoặc sử dụng{" "}
                  <span className="text-foreground font-semibold">Bộ lọc</span>{" "}
                  để khám phá kho tàng anime.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <div
        id="mobile-navigation-drawer"
        className={`fixed inset-0 z-70 transition-all duration-500 xl:hidden ${
          isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Drawer Content */}
        <div
          className={`bg-background/95 border-border ease-out-expo absolute top-0 left-0 flex h-full w-[85%] max-w-sm sm:max-w-md flex-col overflow-hidden border-r p-6 shadow-2xl backdrop-blur-xl transition-transform duration-500 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Decorative background element */}
          <div className="bg-primary/5 pointer-events-none absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />

          {/* Header */}
          <div className="relative z-10 mb-6 flex shrink-0 items-center justify-between">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="group flex min-w-0 items-center gap-2.5"
            >
              <Image
                src="/images/logo/logo-mark.svg"
                alt="Phim Hay Hơn Rổ"
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.24)] transition-transform duration-200 group-hover:scale-[1.04]"
                loading="eager"
              />
              <span className="text-foreground truncate font-serif text-lg font-black tracking-tight">
                Phim Hay Hơn Rổ
              </span>
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-foreground hover:text-primary hover:bg-muted/50 flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 transition-colors"
              aria-label="Đóng menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Scrollable List Body (Collapsible Accordion Navigation) */}
          <div className="custom-scrollbar text-muted-foreground relative z-10 flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto pr-1 pb-8 font-serif text-base font-bold">
            
            {/* User Account / Avatar Panel on Mobile Drawer */}
            {session?.user ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 space-y-3 font-sans">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#D4AF68]/60 bg-linear-to-br from-[#D4AF68] to-[#B8860B] text-black font-black text-base shadow-md">
                    {session.user.name ? session.user.name[0].toUpperCase() : "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-foreground truncate text-sm font-extrabold">
                        {session.user.name}
                      </p>
                      {/* @ts-expect-error role is custom */}
                      {session.user.role === "admin" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono font-bold shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs font-mono">
                      {session.user.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                  <Link
                    href="/ca-nhan"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-2 text-xs font-bold text-foreground hover:bg-white/10 transition-colors"
                  >
                    <User className="h-3.5 w-3.5 text-[#D4AF68]" />
                    <span>Cá nhân</span>
                  </Link>

                  <Link
                    href="/recharge"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-2.5 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    <Wallet className="h-3.5 w-3.5 text-amber-400" />
                    <span>Nạp VIP</span>
                  </Link>

                  <Link
                    href="/yeu-thich"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-2 text-xs font-bold text-foreground hover:bg-white/10 transition-colors"
                  >
                    <Heart className="h-3.5 w-3.5 text-rose-400" />
                    <span>Yêu thích</span>
                  </Link>

                  <Link
                    href="/lich-su"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-2 text-xs font-bold text-foreground hover:bg-white/10 transition-colors"
                  >
                    <History className="h-3.5 w-3.5 text-sky-400" />
                    <span>Lịch sử</span>
                  </Link>
                </div>

                {/* @ts-expect-error role is custom */}
                {session.user.role === "admin" && (
                  <Link
                    href="/nhanconan"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between rounded-xl bg-cyan-500/10 border border-cyan-500/25 px-3 py-2 text-xs font-extrabold text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5" />
                      Trang Quản Trị
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 flex items-center justify-between gap-3 font-sans">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-muted-foreground">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Tài khoản</p>
                    <p className="text-xs text-muted-foreground font-normal">Đăng nhập để lưu lịch sử</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openLogin();
                  }}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground shadow-md shadow-primary/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  Đăng Nhập
                </button>
              </div>
            )}

            {/* Anime Mode Switcher Box */}
            <div className="flex items-center justify-between rounded-xl border border-[#D4AF68]/20 bg-[#D4AF68]/5 px-3.5 py-2.5">
              <div>
                <p className="text-sm font-bold text-foreground">Chế độ Anime</p>
                <p className="text-xs font-normal text-[#D4AF68]">
                  {isAnimeMode ? "Đang bật: Chỉ xem Anime" : "Đang tắt: Xem tất cả"}
                </p>
              </div>
              <AnimeModeToggle defaultEnabled={isAnimeMode} />
            </div>

            {/* Direct Links */}
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-primary group flex items-center justify-between py-1.5 transition-colors"
            >
              <span>Trang Chủ</span>
              <span className="bg-primary h-1.5 w-1.5 rounded-full opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>

            {/* Mobile Drawer Quick Search Input */}
            <div className="relative flex h-10 w-full items-center my-0.5">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 opacity-70 text-[#D4AF68]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    setIsMobileMenuOpen(false);
                    setIsSearchOpen(true);
                  }
                }}
                placeholder={isAnimeMode ? "Tìm kiếm anime..." : "Tìm kiếm phim..."}
                aria-label="Tìm kiếm phim"
                className="h-full w-full rounded-xl border border-white/15 bg-black/25 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[#D4AF68] focus:bg-black/40"
              />
            </div>

            <Link
              href="/tim-kiem"
              onClick={() => setIsMobileMenuOpen(false)}
              className="hover:text-primary group flex items-center justify-between py-1.5 transition-colors"
            >
              <span>Lọc Phim</span>
              <span className="bg-primary h-1.5 w-1.5 rounded-full opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>

            {/* Quick Franchise Universes */}
            <div className="space-y-2 py-1">
              <p className="text-xs uppercase tracking-wider font-extrabold text-[#D4AF68]">Vũ Trụ Nổi Bật</p>
              <div className="grid grid-cols-3 gap-2">
                <Link
                  href="/conan"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[#ef6a65]/30 bg-[#ef6a65]/10 py-2 text-center text-xs font-bold text-[#ffc996] hover:bg-[#ef6a65]/20 transition-colors"
                >
                  <span className="text-base">🕵️</span>
                  <span>Conan</span>
                </Link>

                <Link
                  href="/doraemon"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[#36d9ef]/30 bg-[#36d9ef]/10 py-2 text-center text-xs font-bold text-[#8de7f0] hover:bg-[#36d9ef]/20 transition-colors"
                >
                  <span className="text-base">🔔</span>
                  <span>Doraemon</span>
                </Link>

                <Link
                  href="/sieu-nhan"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 py-2 text-center text-xs font-bold text-[#ff9c6e] hover:bg-[#ff4d4f]/20 transition-colors"
                >
                  <span className="text-base">⚡</span>
                  <span>Siêu Nhân</span>
                </Link>
              </div>
            </div>

            {/* Collapsible: Thể Loại */}
            <div className="border-t border-white/5 pt-3">
              <button
                type="button"
                onClick={() => toggleSection("categories")}
                className="hover:text-primary flex w-full items-center justify-between py-1 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-foreground">Thể Loại</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 font-sans text-xs font-semibold text-muted-foreground">
                    {ANIMATION_CATEGORIES.length}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    openSections["categories"]
                      ? "rotate-180 text-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </button>

              {openSections["categories"] && (
                <div className="grid grid-cols-2 gap-2 pt-2.5 pb-1">
                  {ANIMATION_CATEGORIES.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/the-loai/${cat.slug}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="hover:text-foreground hover:bg-white/5 rounded-lg px-2.5 py-1.5 font-sans text-sm font-medium transition-colors"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Collapsible: Quốc Gia */}
            <div className="border-t border-white/5 pt-3">
              <button
                type="button"
                onClick={() => toggleSection("countries")}
                className="hover:text-primary flex w-full items-center justify-between py-1 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-foreground">Quốc Gia</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 font-sans text-xs font-semibold text-muted-foreground">
                    {ANIMATION_COUNTRIES.length}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    openSections["countries"]
                      ? "rotate-180 text-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </button>

              {openSections["countries"] && (
                <div className="grid grid-cols-2 gap-2 pt-2.5 pb-1">
                  {ANIMATION_COUNTRIES.map((country) => (
                    <Link
                      key={country.slug}
                      href={`/quoc-gia/${country.slug}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="hover:text-foreground hover:bg-white/5 rounded-lg px-2.5 py-1.5 font-sans text-sm font-medium transition-colors"
                    >
                      {country.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Collapsible: Năm Phát Hành */}
            <div className="border-t border-white/5 pt-3">
              <button
                type="button"
                onClick={() => toggleSection("years")}
                className="hover:text-primary flex w-full items-center justify-between py-1 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-foreground">Năm Phát Hành</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 font-sans text-xs font-semibold text-muted-foreground">
                    {ANIMATION_YEARS.length}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    openSections["years"]
                      ? "rotate-180 text-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </button>

              {openSections["years"] && (
                <div className="grid grid-cols-3 gap-2 pt-2.5 pb-1">
                  {ANIMATION_YEARS.map((item) => (
                    <Link
                      key={item.year}
                      href={`/nam/${item.year}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="hover:text-foreground hover:bg-white/5 rounded-lg py-1.5 text-center font-sans text-sm font-medium transition-colors"
                    >
                      {item.year}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Collapsible: Bảng Xếp Hạng */}
            <div className="border-t border-white/5 pt-3">
              <button
                type="button"
                onClick={() => toggleSection("rankings")}
                className="hover:text-primary flex w-full items-center justify-between py-1 text-left transition-colors"
              >
                <span className="text-foreground">Bảng Xếp Hạng</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${
                    openSections["rankings"]
                      ? "rotate-180 text-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </button>

              {openSections["rankings"] && (
                <div className="flex flex-col gap-1 pt-2.5 pb-1">
                  <Link
                    href="/top-view"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-foreground hover:bg-white/5 rounded-lg px-2.5 py-1.5 font-sans text-sm font-medium transition-colors"
                  >
                    Top View
                  </Link>
                  <Link
                    href="/top-imdb"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-foreground hover:bg-white/5 rounded-lg px-2.5 py-1.5 font-sans text-sm font-medium transition-colors"
                  >
                    Top IMDb Info
                  </Link>
                  <Link
                    href="/phim-moi"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-foreground hover:bg-white/5 rounded-lg px-2.5 py-1.5 font-sans text-sm font-medium transition-colors"
                  >
                    Mới Cập Nhật
                  </Link>
                </div>
              )}
            </div>

            {/* Phim Hoàn Tất */}
            <div className="border-t border-white/5 pt-3">
              <Link
                href="/hoan-tat"
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-primary group flex items-center justify-between py-1 transition-colors"
              >
                <span>Phim Hoàn Tất</span>
                <span className="bg-primary h-1.5 w-1.5 rounded-full opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </div>
          </div>

          {/* Footer User Section */}
          <div className="border-border bg-background/95 safe-area-bottom relative z-10 -mx-6 mt-auto shrink-0 space-y-4 border-t px-6 pt-4 pb-2 backdrop-blur-md">
            {mounted && session?.user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-[#D4AF68] to-[#B8860B] text-black font-bold shadow-lg">
                    {session.user.name
                      ? session.user.name[0].toUpperCase()
                      : "U"}
                  </div>
                  <div className="overflow-hidden">
                    <p className="truncate font-bold text-foreground">
                      {session.user.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/ca-nhan"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-muted/50 py-3 text-sm font-bold transition-all hover:bg-muted"
                  >
                    <User className="h-4 w-4" />
                    Cá nhân
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 text-red-400 py-3 text-sm font-bold transition-all hover:bg-red-500/20"
                  >
                    <LogOut className="h-4 w-4" />
                    Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="bg-primary text-primary-foreground block w-full rounded-xl py-3 text-center font-bold shadow-lg transition-all hover:brightness-110 active:scale-95"
              >
                Đăng nhập / Đăng ký
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
