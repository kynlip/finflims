'use client';

import { useState, useEffect, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { toggleFavorite, isFavorite } from '@/app/actions/user-actions';

interface FavoriteButtonProps {
  movie: {
    slug: string;
    name: string;
    thumb_url: string;
    types?: string[];
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function FavoriteButton({
  movie,
  className = '',
  size = 'md',
}: FavoriteButtonProps) {
  const [isFav, setIsFav] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    isFavorite(movie.slug).then(setIsFav);
  }, [movie.slug]);

  const handleClick = () => {
    startTransition(async () => {
      const result = await toggleFavorite(movie);
      if (result.success) {
        setIsFav(result.action === 'added');
      }
    });
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full transition-all active:scale-90 ${
        isFav
          ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
          : 'bg-black/50 text-white/70 backdrop-blur-sm hover:bg-black/70 hover:text-white'
      } ${isPending ? 'opacity-50' : ''} ${className}`}
      title={isFav ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
    >
      <Heart className={`${iconSizes[size]} ${isFav ? 'fill-current' : ''}`} />
    </button>
  );
}
