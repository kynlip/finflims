'use server';

import { auth } from '@/auth';
import { getUsersDb } from '@/lib/db-helpers';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { isAnimeModeEnabled } from '@/lib/anime-mode';

// Helper types
type HistoryItem = {
  userEmail: string;
  movieSlug: string;
  movieName: string;
  movieThumb: string;
  episode: string;
  watchedAt: Date;
  types: string[];
  site: string;
};

type FavoriteItem = {
  userEmail: string;
  movieSlug: string;
  movieName: string;
  movieThumb: string;
  addedAt: Date;
  types: string[];
  site: string;
};

// ==================== FAVORITES ====================

export async function toggleFavorite(movie: {
  slug: string;
  name: string;
  thumb_url: string;
  types?: string[];
}) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: 'Chưa đăng nhập' };
  }

  const db = await getUsersDb();
  const userEmail = session.user.email.toLowerCase().trim();
  const collection = db.collection('yeuthich');
  
  // Check if movie exists
  const existing = await collection.findOne({ 
    userEmail: userEmail, 
    movieSlug: movie.slug 
  });

  if (existing) {
    // Remove if exists
    await collection.deleteOne({ _id: existing._id });
    return { success: true, action: 'removed' };
  } else {
    // Add if not exists
    const newItem: FavoriteItem = {
      userEmail: userEmail,
      movieSlug: movie.slug,
      movieName: movie.name,
      movieThumb: movie.thumb_url,
      addedAt: new Date(),
      types: movie.types || [(await isAnimeModeEnabled()) ? 'hoathinh' : 'all'],
      site: 'phimhayhonro.net',
    };

    await collection.insertOne(newItem);
    return { success: true, action: 'added' };
  }
}

export async function getFavorites() {
  const session = await auth();
  if (!session?.user?.email) {
    return [];
  }

  const db = await getUsersDb();
  const userEmail = session.user.email.toLowerCase().trim();

  const animeMode = await isAnimeModeEnabled();
  const favoriteQuery = animeMode
    ? {
        userEmail,
        $or: [
          { types: { $in: ['hoathinh', 'anime'] } },
          { types: { $exists: false } },
          { types: { $size: 0 } },
        ],
      }
    : { userEmail };
  const favorites = (await db.collection('yeuthich')
    .find(favoriteQuery)
    .sort({ addedAt: -1 })
    .toArray()) as unknown as FavoriteItem[];

  return favorites.map((f) => ({
    slug: f.movieSlug,
    name: f.movieName,
    thumb_url: f.movieThumb,
    addedAt: f.addedAt,
  }));
}

export async function isFavorite(movieSlug: string) {
  const session = await auth();
  if (!session?.user?.email) {
    return false;
  }

  const db = await getUsersDb();
  const userEmail = session.user.email.toLowerCase().trim();

  const existing = await db.collection('yeuthich').findOne({
    userEmail: userEmail,
    movieSlug: movieSlug,
  });

  return !!existing;
}

// ==================== WATCH HISTORY ====================

export async function addToHistory(movie: {
  slug: string;
  name: string;
  thumb_url: string;
  episode?: string;
  types?: string[];
}) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: 'Chưa đăng nhập' };
  }

  const db = await getUsersDb();
  const userEmail = session.user.email.toLowerCase().trim();
  const collection = db.collection('lichsu');

  // Upsert history item
  await collection.updateOne(
    { 
      userEmail: userEmail, 
      movieSlug: movie.slug 
    },
    {
      $set: {
        movieName: movie.name,
        movieThumb: movie.thumb_url,
        episode: movie.episode || 'Tập 1',
        watchedAt: new Date(),
        types: movie.types || [(await isAnimeModeEnabled()) ? 'hoathinh' : 'all'],
        site: 'phimhayhonro.net',
      },
      $setOnInsert: {
        userEmail: userEmail,
        movieSlug: movie.slug
      }
    },
    { upsert: true }
  );

  return { success: true };
}

export async function getWatchHistory() {
  const session = await auth();
  if (!session?.user?.email) {
    return [];
  }

  const db = await getUsersDb();
  const userEmail = session.user.email.toLowerCase().trim();

  const animeMode = await isAnimeModeEnabled();
  const historyQuery = animeMode
    ? {
        userEmail,
        $or: [
          { types: { $in: ['hoathinh', 'anime'] } },
          { types: { $exists: false } },
          { types: { $size: 0 } },
        ],
      }
    : { userEmail };
  const history = (await db.collection('lichsu')
    .find(historyQuery)
    .sort({ watchedAt: -1 })
    .limit(50)
    .toArray()) as unknown as HistoryItem[];

  return history.map((h) => ({
    slug: h.movieSlug,
    name: h.movieName,
    thumb_url: h.movieThumb,
    episode: h.episode,
    watchedAt: h.watchedAt,
  }));
}

export async function deleteHistoryItem(slug: string) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: 'Chưa đăng nhập' };
  }

  const db = await getUsersDb();
  const userEmail = session.user.email.toLowerCase().trim();

  await db.collection('lichsu').deleteOne({
    userEmail: userEmail,
    movieSlug: slug,
  });

  revalidatePath('/lich-su');
  revalidatePath('/ca-nhan');
  return { success: true };
}

export async function clearHistory() {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: 'Chưa đăng nhập' };
  }

  const db = await getUsersDb();
  const userEmail = session.user.email.toLowerCase().trim();

  await db.collection('lichsu').deleteMany({
    userEmail: userEmail,
  });

  revalidatePath('/lich-su');
  revalidatePath('/ca-nhan');
  return { success: true };
}

// ==================== REVIEWS & COMMENTS (ANTI-SPAM PROTECTED) ====================

export async function submitReview(
  movieSlug: string,
  rating?: number,
  comment?: string
) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: 'Vui lòng đăng nhập để bình luận' };
  }

  const userEmail = session.user.email.toLowerCase().trim();
  const cleanComment = comment ? comment.trim().replace(/<[^>]*>/g, '') : '';

  if (cleanComment && cleanComment.length < 2) {
    return { error: 'Nội dung bình luận tối thiểu 2 ký tự.' };
  }
  if (cleanComment && cleanComment.length > 500) {
    return { error: 'Nội dung bình luận tối đa 500 ký tự.' };
  }

  // Validate rating
  if (rating !== undefined && rating !== 0 && (rating < 1 || rating > 10)) {
    return { error: 'Điểm đánh giá phải từ 1-10' };
  }

  const db = await getUsersDb();
  const collection = db.collection('reviews');

  // Anti-Spam: 15-second cooldown
  const lastComment = await collection.findOne(
    { userEmail },
    { sort: { createdAt: -1 } }
  );

  if (lastComment && lastComment.createdAt) {
    const diffSec = (Date.now() - new Date(lastComment.createdAt).getTime()) / 1000;
    if (diffSec < 15) {
      return { error: `Vui lòng chờ ${Math.ceil(15 - diffSec)}s trước khi gửi bình luận tiếp theo.` };
    }
  }

  // Anti-Spam: Duplicate check
  if (cleanComment && lastComment && lastComment.comment === cleanComment) {
    return { error: 'Nội dung bình luận trùng lặp với bình luận gần đây của bạn.' };
  }

  const existing = await collection.findOne({
    userEmail: userEmail,
    movieSlug,
  });
  
  const updateData = {
    updatedAt: new Date(),
    context: 'movie',
    ...(rating !== undefined && rating !== 0 ? { rating } : {}),
    ...(cleanComment ? { comment: cleanComment } : {}),
  };

  if (existing) {
    await collection.updateOne(
      { _id: existing._id },
      { $set: updateData }
    );
    return { success: true, action: 'updated' };
  } else {
    const insertData = {
      userEmail: userEmail,
      userName: session.user.name || session.user.email.split('@')[0],
      userImage: session.user.image || null,
      movieSlug,
      context: 'movie',
      createdAt: new Date(),
      rating: rating !== undefined && rating !== 0 ? rating : 10,
      comment: cleanComment || '',
    };

    await collection.insertOne(insertData);
    return { success: true, action: 'created' };
  }
}

export async function getMovieReviews(movieSlug: string) {
  const db = await getUsersDb();
  const reviews = await db
    .collection('reviews')
    .find({ 
        movieSlug,
        // Filter: match 'movie' OR missing context (legacy)
        $or: [{ context: 'movie' }, { context: { $exists: false } }]
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();

  return reviews.map((r) => ({
    id: r._id.toString(),
    userName: r.userName,
    userImage: r.userImage,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
  }));
}

export async function getMyReview(movieSlug: string) {
  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }

  const db = await getUsersDb();
  const userEmail = session.user.email.toLowerCase().trim();
  const review = await db.collection('reviews').findOne({
    userEmail: userEmail,
    movieSlug,
  });

  if (!review) return null;

  return {
    rating: review.rating,
    comment: review.comment,
  };
}

export async function getRecentCommunityReviews(limit = 10) {
  try {
    const db = await getUsersDb();
    const reviews = await db
      .collection('reviews')
      .find({
        comment: { $exists: true, $ne: '' },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    if (!reviews || reviews.length === 0) {
      return [];
    }

    // Lookup movie names for the reviews
    const kkphimDb = db.collection('kkphim');
    const movieSlugs = Array.from(new Set(reviews.map((r) => r.movieSlug).filter(Boolean)));
    const movies = await kkphimDb
      .find({ slug: { $in: movieSlugs } }, { projection: { slug: 1, name: 1, thumb_url: 1, poster_url: 1 } })
      .toArray();

    const movieMap = new Map(movies.map((m) => [m.slug, m]));

    return reviews.map((r) => {
      const movie = movieMap.get(r.movieSlug);
      return {
        id: r._id.toString(),
        userName: r.userName || 'Thành viên',
        userImage: r.userImage || null,
        rating: r.rating || 10,
        comment: r.comment,
        movieSlug: r.movieSlug || 'thuong-nguyen-do',
        movieName: movie?.name || (r.movieSlug ? r.movieSlug.replace(/-/g, ' ') : 'Phim Hoạt Hình'),
        movieThumb: movie?.thumb_url || movie?.poster_url || null,
        createdAt: r.createdAt || new Date(),
      };
    });
  } catch (error) {
    console.error('Error fetching recent community reviews:', error);
    return [];
  }
}

export async function submitHomeComment(comment: string, movieSlug = 'thuong-nguyen-do') {
  return await submitReview(movieSlug, 10, comment);
}

export async function changeUserPassword(data: { currentPassword?: string; newPassword?: string }) {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: 'Vui lòng đăng nhập để đổi mật khẩu' };
  }

  const { currentPassword, newPassword } = data;
  if (!newPassword || newPassword.length < 6) {
    return { error: 'Mật khẩu mới phải có ít nhất 6 ký tự' };
  }

  try {
    const db = await getUsersDb();
    const userEmail = session.user.email.toLowerCase().trim();
    const usersCol = db.collection('users');
    const user = await usersCol.findOne({ email: userEmail });

    if (!user) {
      return { error: 'Không tìm thấy thông tin tài khoản' };
    }

    // Google accounts do not have a site password and must keep using Google login.
    if (user.authProvider === 'google') {
      return { error: 'Tài khoản đăng nhập bằng Google không hỗ trợ đổi mật khẩu trên website' };
    }

    if (!user.password) {
      return { error: 'Tài khoản này chưa có mật khẩu đăng ký' };
    }

    if (!currentPassword) {
      return { error: 'Vui lòng nhập mật khẩu hiện tại' };
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return { error: 'Mật khẩu hiện tại không chính xác' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await usersCol.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );

    return { success: true, message: 'Đổi mật khẩu thành công!' };
  } catch (err) {
    console.error('changeUserPassword error:', err);
    return { error: 'Đã có lỗi xảy ra khi đổi mật khẩu' };
  }
}
