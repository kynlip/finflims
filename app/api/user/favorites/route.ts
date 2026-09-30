import { NextResponse } from 'next/server';
import { getUsersDb } from '@/lib/db-helpers';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';
import { isAnimeModeEnabled } from '@/lib/anime-mode';

const favoriteSchema = z.object({
  movieId: z.string().optional(),
  movieName: z.string(),
  movieSlug: z.string(),
  movieThumb: z.string(),
  types: z.array(z.string()).optional(),
});

export async function GET() {
  // SECURITY: Require authenticated user via NextAuth
  const authResult = await requireAuth();
  if ('error' in authResult) return authResult.error;
  const { session } = authResult;

  const db = await getUsersDb();
  const userEmail = session.user.email;
  const collection = db.collection('yeuthich');

  const favorites = await collection
    .find({ userEmail: userEmail })
    .sort({ addedAt: -1 })
    .toArray();

  const animeMode = await isAnimeModeEnabled();
  const filtered = animeMode
    ? favorites.filter((item) => {
        const types = item.types as string[] | undefined;
        if (!types || types.length === 0) return true;
        return types.some((t) => ['hoathinh', 'anime'].includes(t));
      })
    : favorites;

  return NextResponse.json(filtered.map(f => ({
    slug: f.movieSlug,
    name: f.movieName,
    thumb_url: f.movieThumb,
    addedAt: f.addedAt,
  })));
}

export async function POST(req: Request) {
  // SECURITY: Require authenticated user via NextAuth
  const authResult = await requireAuth();
  if ('error' in authResult) return authResult.error;
  const { session } = authResult;

  try {
    const body = await req.json();
    const { movieName, movieSlug, movieThumb, types } =
      favoriteSchema.parse(body);

    const db = await getUsersDb();
    const userEmail = session.user.email;
    const collection = db.collection('yeuthich');

    // Check if exists
    const existing = await collection.findOne({
      userEmail: userEmail,
      movieSlug: movieSlug,
    });

    if (existing) {
      // Remove (Toggle)
      await collection.deleteOne({ _id: existing._id });
      return NextResponse.json({
        message: 'Removed from favorites',
        isFavorite: false,
      });
    } else {
    const animeMode = await isAnimeModeEnabled();

    // Add
    await collection.insertOne({
        userEmail: userEmail,
        movieSlug: movieSlug,
        movieName: movieName,
        movieThumb: movieThumb,
        addedAt: new Date(),
        types: types || [animeMode ? 'hoathinh' : 'all'],
        site: 'phimhayhonro.net',
      });

      return NextResponse.json({
        message: 'Added to favorites',
        isFavorite: true,
      });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }
}
