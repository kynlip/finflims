"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import {
  MessageSquare,
  Send,
  User,
  Star,
  Film,
  Loader2,
  Sparkles,
} from "lucide-react";
import { submitHomeComment } from "@/app/actions/user-actions";

export interface CommunityComment {
  id: string;
  userName: string;
  userImage: string | null;
  rating: number;
  comment: string;
  movieSlug: string;
  movieName: string;
  movieThumb?: string | null;
  createdAt: Date | string;
}

interface HomeCommentsSectionProps {
  initialComments: CommunityComment[];
}

export function HomeCommentsSection({
  initialComments,
}: HomeCommentsSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<CommunityComment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const [currentTime] = useState(() => Date.now());

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setError("");
    setSuccess("");

    startTransition(async () => {
      const res = await submitHomeComment(newComment);
      if (res.error) {
        setError(res.error);
      } else {
        const added: CommunityComment = {
          id: `comment-${Date.now()}`,
          userName: session?.user?.name || "Bạn",
          userImage: session?.user?.image || null,
          rating: 10,
          comment: newComment.trim(),
          movieSlug: "thuong-nguyen-do",
          movieName: "Thương Nguyên Đồ",
          createdAt: new Date(),
        };
        setComments([added, ...comments]);
        setNewComment("");
        setSuccess("Đã gửi bình luận của bạn thành công!");
        setTimeout(() => setSuccess(""), 4000);
      }
    });
  };

  const formatTime = (dateInput: Date | string) => {
    try {
      const d = new Date(dateInput);
      const diffMs = currentTime - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Vừa xong";
      if (diffMins < 60) return `${diffMins} phút trước`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return d.toLocaleDateString("vi-VN");
    } catch {
      return "Vừa xong";
    }
  };

  return (
    <section className="py-8 sm:py-10 md:py-12 border-t border-white/5 bg-[#080d1a]/50 rounded-3xl my-6">
      <div className="container mx-auto px-4 md:px-8">
        {/* Section Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(14,165,233,0.6)]" />
            <div>
              <h2 className="text-foreground font-sans text-xl sm:text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                <span>Bình Luận & Thảo Luận</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  Cộng Đồng
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Cùng chia sẻ cảm nhận và thảo luận về các bộ phim hoạt hình hot
                nhất
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Comment Form (4 cols on Desktop) */}
          <div className="lg:col-span-4 bg-[#0d1322] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl">
            <h3 className="text-sm sm:text-base font-bold text-white mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span>Gửi bình luận của bạn</span>
            </h3>

            {session?.user ? (
              <form onSubmit={handlePostComment} className="space-y-3">
                <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                    {session.user.image ? (
                      <Image
                        src={session.user.image}
                        alt="User"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {session.user.name}
                    </p>
                    <p className="text-[10px] text-emerald-400 font-medium">
                      ● Đang hoạt động
                    </p>
                  </div>
                </div>

                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Chia sẻ suy nghĩ của bạn về phim hoạt hình đang xem..."
                  required
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white placeholder:text-white/30 focus:border-primary focus:bg-white/10 focus:outline-none resize-none transition-all"
                />

                {error && (
                  <p className="text-xs text-rose-400 font-medium">{error}</p>
                )}
                {success && (
                  <p className="text-xs text-emerald-400 font-medium">
                    {success}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isPending || !newComment.trim()}
                  className="w-full bg-primary hover:bg-sky-400 text-white font-bold text-xs sm:text-sm py-2.5 rounded-xl shadow-md shadow-primary/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Đăng Bình Luận</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center py-6 px-3 space-y-3 bg-white/5 rounded-xl border border-white/5">
                <Sparkles className="w-7 h-7 text-[#FFD875] mx-auto animate-pulse" />
                <p className="text-xs sm:text-sm text-slate-300">
                  Đăng nhập để tham gia bình luận cùng cộng đồng yêu phim!
                </p>
                <Link
                  href="/?auth=login"
                  className="inline-block bg-[#FFD875] hover:bg-[#ffe08f] text-[#0f111a] font-bold text-xs sm:text-sm px-5 py-2 rounded-xl shadow-md transition-all active:scale-95"
                >
                  Đăng nhập ngay
                </Link>
              </div>
            )}
          </div>

          {/* Right Column: Comments Feed Grid (8 cols on Desktop) */}
          <div className="lg:col-span-8">
            {comments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {comments.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#0d1322]/80 hover:bg-[#0d1322] border border-white/10 hover:border-primary/40 rounded-2xl p-4 transition-all duration-300 shadow-md flex flex-col justify-between space-y-3 group"
                  >
                    {/* Top: User info + Star rating */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          {item.userImage ? (
                            <Image
                              src={item.userImage}
                              alt={item.userName}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <span className="font-black text-xs text-primary uppercase">
                              {item.userName?.[0] || "U"}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                            {item.userName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatTime(item.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Star Rating Badge */}
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-[#FFD875] shrink-0 text-xs font-bold">
                        <Star className="w-3 h-3 fill-[#FFD875]" />
                        <span>{item.rating || 10}/10</span>
                      </div>
                    </div>

                    {/* Comment Text */}
                    <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed line-clamp-3">
                      &ldquo;{item.comment}&rdquo;
                    </p>

                    {/* Bottom: Related Movie Link */}
                    {item.movieSlug && (
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                        <Link
                          href={`/phim/${item.movieSlug}`}
                          className="inline-flex items-center gap-1.5 text-primary hover:text-sky-300 font-medium truncate max-w-[240px] transition-colors"
                        >
                          <Film className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{item.movieName}</span>
                        </Link>
                        <Link
                          href={`/phim/${item.movieSlug}`}
                          className="text-[11px] text-slate-400 hover:text-white transition-colors shrink-0"
                        >
                          Xem phim →
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#0d1322]/40 border border-white/5 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[220px]">
                <MessageSquare className="w-10 h-10 text-white/20 mb-3" />
                <p className="text-sm font-bold text-white/90">
                  Chưa có bình luận nào
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Hãy là người đầu tiên chia sẻ cảm nhận và thảo luận về bộ phim
                  hoạt hình bạn yêu thích!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
