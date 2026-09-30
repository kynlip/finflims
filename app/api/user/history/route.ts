import { NextResponse } from 'next/server';
import { getUsersDb } from '@/lib/db-helpers';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';
import { isAnimeModeEnabled } from '@/lib/anime-mode';

const historySchema = z.object({
  movieId: z.string().optional(),
  movieName: z.string(),
  movieSlug: z.string(),
  movieThumb: z.string(),
  episode: z.string().optional(),
  progress: z.number().optional(),
  types: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  // SECURITY: Require authenticated user via NextAuth
  const authResult = await requireAuth();
  if ('error' in authResult) return authResult.error;
  const { session } = authResult;

  const { searchParams } = new URL(request.url);
  const typeFilter = searchParams.get('type'); // e.g., 'hoathinh'

  const db = await getUsersDb();
  const userEmail = session.user.email;
  const collection = db.collection('lichsu');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = { userEmail: userEmail };

  // Apply type filter if present
  if (typeFilter) {
    query.$or = [
      { types: { $in: [typeFilter] } }, // Explicit filter
      { types: { $exists: false } }, // Legacy support
      { types: { $size: 0 } }
    ];
  } else if (await isAnimeModeEnabled()) {
    // Anime mode keeps the historical animation-only view. Normal mode shows
    // every saved title, including legacy records without a type field.
    query.$or = [
      { types: { $in: ['hoathinh', 'anime'] } },
      { types: { $exists: false } },
      { types: { $size: 0 } }
    ];
  }

  const history = await collection
    .find(query)
    .sort({ watchedAt: -1 })
    .limit(50)
    .toArray();

  return NextResponse.json(history.map(h => ({
    slug: h.movieSlug,
    name: h.movieName,
    thumb_url: h.movieThumb,
    episode: h.episode,
    watchedAt: h.watchedAt,
  })));
}

export async function POST(req: Request) {
  // SECURITY: Require authenticated user via NextAuth
  const authResult = await requireAuth();
  if ('error' in authResult) return authResult.error;
  const { session } = authResult;

  try {
    const body = await req.json();
    const data = historySchema.parse(body);

    const db = await getUsersDb();
    const userEmail = session.user.email;
    const collection = db.collection('lichsu');

    // Upsert
    await collection.updateOne(
      { userEmail: userEmail, movieSlug: data.movieSlug },
      {
        $set: {
          movieName: data.movieName,
          movieThumb: data.movieThumb,
          episode: data.episode || 'Tập 1',
          watchedAt: new Date(),
          types: data.types || [(await isAnimeModeEnabled()) ? 'hoathinh' : 'all'],
          site: 'phimhayhonro.net',
          // progress: data.progress, 
        },
        $setOnInsert: {
          userEmail: userEmail,
          movieSlug: data.movieSlug
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ message: 'History updated' });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const authResult = await requireAuth();
  if ('error' in authResult) return authResult.error;
  const { session } = authResult;

  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    const db = await getUsersDb();
    const userEmail = session.user.email;
    const collection = db.collection('lichsu');

    if (slug) {
      await collection.deleteOne({
        userEmail: userEmail,
        movieSlug: slug,
      });
      return NextResponse.json({ success: true, message: 'Đã xóa phim khỏi lịch sử xem', slug });
    } else {
      await collection.deleteMany({
        userEmail: userEmail,
      });
      return NextResponse.json({ success: true, message: 'Đã xóa toàn bộ lịch sử xem' });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Lỗi khi xóa lịch sử' }, { status: 500 });
  }
}
