'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Send, User } from 'lucide-react';
import DOMPurify from 'dompurify';
import {
  submitReview,
  getMovieReviews,
  getMyReview,
} from '@/app/actions/user-actions';

interface Review {
  id: string;
  userName: string;
  userImage: string | null;
  rating: number;
  comment: string;
  createdAt: Date;
}

interface ReviewSectionProps {
  movieSlug: string;
  isLoggedIn: boolean;
}

export function ReviewSection({ movieSlug, isLoggedIn }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [isPending, startTransition] = useTransition();
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    // Load reviews
    getMovieReviews(movieSlug).then(setReviews);

    // Load my review if logged in
    if (isLoggedIn) {
      getMyReview(movieSlug).then((review) => {
        if (review) {
          setMyRating(review.rating);
          setMyComment(review.comment);
          setHasReviewed(true);
        }
      });
    }
  }, [movieSlug, isLoggedIn]);

  const handleSubmit = () => {
    // If myRating is 0, it means the user hasn't selected a rating in this session.
    // We pass undefined so the backend knows not to touch the rating.
    const ratingToSubmit = myRating > 0 ? myRating : undefined;

    startTransition(async () => {
      const result = await submitReview(
        movieSlug,
        ratingToSubmit,
        myComment
      );
      if (result.success) {
        setHasReviewed(true);
        // Reload reviews
        const newReviews = await getMovieReviews(movieSlug);
        setReviews(newReviews);
      }
    });
  };
  return (
    <div className="rounded-2xl border border-white/5 bg-black/30 p-6 backdrop-blur-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="font-serif text-xl font-bold text-[#D4AF68]">
          Bình luận
        </h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              ({reviews.length} bình luận)
            </span>
          </div>
        )}
      </div>

      {/* Submit Review Form */}
      {isLoggedIn ? (
        <div className="mb-6 rounded-xl bg-white/5 p-4">
          <p className="text-muted-foreground mb-3 text-sm">
            {hasReviewed ? 'Cập nhật bình luận của bạn' : 'Viết bình luận'}
          </p>

          {/* Comment */}
          <textarea
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            placeholder="Viết bình luận của bạn..."
            className="text-foreground placeholder:text-muted-foreground w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 focus:border-[#D4AF68]/50 focus:outline-none"
            rows={3}
          />

          <button
            onClick={() => {
                 if (myRating === 0) setMyRating(10); // Default to 10 if not set
                 handleSubmit();
            }}
            disabled={isPending || !myComment.trim()} // Convert rating check to comment check
            className="mt-3 flex items-center gap-2 rounded-lg bg-[#D4AF68] px-5 py-2.5 font-bold text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {hasReviewed ? 'Cập nhật' : 'Gửi bình luận'}
          </button>
        </div>
      ) : (
        <div className="mb-6 rounded-xl bg-white/5 p-4 text-center">
          <p className="text-muted-foreground">
            <Link href="/?auth=login" className="text-[#D4AF68] hover:underline">
              Đăng nhập
            </Link>{' '}
            để bình luận
          </p>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div
              key={review.id}
              className="flex gap-3 rounded-xl bg-white/5 p-3"
            >
              <div className="shrink-0">
                {review.userImage ? (
                  <Image
                    src={review.userImage}
                    alt={review.userName}
                    width={40}
                    height={40}
                    className="rounded-full"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D4AF68]/20">
                    <User className="h-5 w-5 text-[#D4AF68]" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-bold">{review.userName}</span>
                  {review.rating > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                      <span className="text-sm font-medium">{review.rating}</span>
                    </div>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                {review.comment && (
                  <p 
                    className="text-muted-foreground text-sm"
                    dangerouslySetInnerHTML={{ 
                      __html: DOMPurify.sanitize(review.comment) 
                    }}
                  />
                )}
              </div>
            </div>
          ))
        ) : null}
      </div>
    </div>
  );
}
