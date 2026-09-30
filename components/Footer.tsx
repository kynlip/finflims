'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Film, Compass, Globe2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#080c16] pt-14 pb-10 text-slate-300">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Column 1: Brand Info & Big Logo */}
          <div className="space-y-4">
            <Link href="/" className="inline-block group">
              <div className="flex items-center gap-3 transition-transform duration-300 group-hover:translate-x-0.5">
                <Image
                  src="/images/logo/logo-mark.svg"
                  alt="Phim Hay Hơn Rổ Logo"
                  width={56}
                  height={56}
                  className="drop-shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  priority
                />
                <span className="font-serif text-lg font-black tracking-tight text-white sm:text-xl">
                  Phim Hay Hơn Rổ
                </span>
              </div>
            </Link>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-400">
              Trang xem phim hoạt hình anime vietsub online chất lượng cao, tốc độ tải nhanh và cập nhật liên tục các tập phim mới nhất.
            </p>
            <div className="text-xs text-slate-400 font-medium">
              <span>Tên miền chính thức: </span>
              <span className="text-cyan-400 font-bold font-mono">phimhayhonro.net</span>
            </div>
          </div>

          {/* Column 2: Danh Mục Khám Phá */}
          <div>
            <h4 className="mb-4 flex items-center gap-2 text-sm sm:text-base font-bold text-white uppercase tracking-wider">
              <Compass size={18} className="text-cyan-400" />
              Khám Phá
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm font-medium">
              <li>
                <Link href="/phim-moi" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Phim Mới Cập Nhật
                </Link>
              </li>
              <li>
                <Link href="/conan" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Conan
                </Link>
              </li>
              <li>
                <Link href="/doraemon" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Doraemon
                </Link>
              </li>
              <li>
                <Link href="/pho-bien" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Phim Phổ Biến
                </Link>
              </li>
              <li>
                <Link href="/top-view" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Bảng Xếp Hạng Top View
                </Link>
              </li>
              <li>
                <Link href="/top-imdb" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Bảng Xếp Hạng IMDb
                </Link>
              </li>
              <li>
                <Link href="/hoan-tat" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Phim Đã Hoàn Tất
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Quốc Gia & Mùa Phim */}
          <div>
            <h4 className="mb-4 flex items-center gap-2 text-sm sm:text-base font-bold text-white uppercase tracking-wider">
              <Globe2 size={18} className="text-amber-400" />
              Quốc Gia & Năm
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm font-medium">
              <li>
                <Link href="/quoc-gia/nhat-ban" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Hoạt Hình Nhật Bản (Anime)
                </Link>
              </li>
              <li>
                <Link href="/quoc-gia/trung-quoc" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Hoạt Hình Trung Quốc (3D)
                </Link>
              </li>
              <li>
                <Link href="/quoc-gia/au-my" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Hoạt Hình Âu Mỹ
                </Link>
              </li>
              <li>
                <Link href="/quoc-gia/han-quoc" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Hoạt Hình Hàn Quốc
                </Link>
              </li>
              <li>
                <Link href="/nam/2026" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Anime Mùa 2026 Mới Nhất
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Thể Loại Nổi Bật */}
          <div>
            <h4 className="mb-4 flex items-center gap-2 text-sm sm:text-base font-bold text-white uppercase tracking-wider">
              <Film size={18} className="text-rose-400" />
              Thể Loại Nổi Bật
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm font-medium">
              <li>
                <Link href="/the-loai/hanh-dong" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Hành Động & Phiêu Lưu
                </Link>
              </li>
              <li>
                <Link href="/the-loai/vien-tuong" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Khoa Học Viễn Tưởng
                </Link>
              </li>
              <li>
                <Link href="/the-loai/hai-huoc" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Hài Hước & Đời Thường
                </Link>
              </li>
              <li>
                <Link href="/the-loai/hoc-duong" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Học Đường & Tình Cảm
                </Link>
              </li>
              <li>
                <Link href="/the-loai/bi-an" className="text-slate-400 transition-colors hover:text-cyan-400 hover:translate-x-1 inline-block">
                  Bí Ẩn & Trinh Thám
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Disclaimer & Copyright */}
        <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-slate-500 space-y-2">
          <p className="max-w-3xl mx-auto leading-relaxed text-slate-400">
            Disclaimer: Tất cả nội dung phim được tổng hợp tự động từ các nguồn chia sẻ công khai trên internet. Chúng tôi không lưu trữ bất kỳ tập tin media nào trên máy chủ.
          </p>
          <p className="font-semibold text-slate-300">
            © {new Date().getFullYear()} Phim Hay Hơn Rổ &bull; PhimHayHonRo.net. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
