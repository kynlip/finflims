import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { getUsersDb } from '@/lib/db-helpers';
import { getMovieCollection } from '@/lib/crawler';
import { DEFAULT_SITE_SETTINGS } from '@/lib/settings-types';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  try {
    const userDb = await getUsersDb();
    const settingsDoc = await userDb.collection('site_settings').findOne({ key: 'general' });
    const slugs: string[] = settingsDoc?.adminFeaturedSlugs || DEFAULT_SITE_SETTINGS.adminFeaturedSlugs || [];

    const movieCol = await getMovieCollection();
    const movies = await movieCol
      .find(
        { slug: { $in: slugs } },
        {
          projection: {
            _id: 1,
            name: 1,
            origin_name: 1,
            slug: 1,
            thumb_url: 1,
            poster_url: 1,
            type: 1,
            year: 1,
            episode_current: 1,
            is_manual: 1,
          },
        }
      )
      .toArray();

    const movieMap = new Map(movies.map((m) => [m.slug, m]));
    const orderedMovies = slugs
      .map((slug) => {
        const m = movieMap.get(slug);
        if (!m) return null;
        return {
          ...m,
          _id: m._id.toString(),
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      slugs,
      movies: orderedMovies,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { action, slug, slugs } = body;

    const userDb = await getUsersDb();
    const movieCol = await getMovieCollection();

    const settingsDoc = await userDb.collection('site_settings').findOne({ key: 'general' });
    let currentSlugs: string[] = settingsDoc?.adminFeaturedSlugs || DEFAULT_SITE_SETTINGS.adminFeaturedSlugs || [];

    const cleanSlug = slug ? String(slug).trim().toLowerCase() : '';

    if (action === 'add' && cleanSlug) {
      // Verify movie exists
      const movie = await movieCol.findOne({
        $or: [{ slug: cleanSlug }, { aliases: cleanSlug }],
      });
      if (!movie) {
        return NextResponse.json(
          { error: `Không tìm thấy phim với slug "${cleanSlug}" trong database` },
          { status: 404 }
        );
      }

      const actualSlug = String(movie.slug);
      if (!currentSlugs.includes(actualSlug)) {
        currentSlugs = [actualSlug, ...currentSlugs];
      }

      // Mark movie as manual/pinned
      await movieCol.updateOne(
        { slug: actualSlug },
        {
          $set: {
            is_manual: true,
            is_pinned: true,
            'modified.time': new Date().toISOString(),
            updatedAt: new Date(),
          },
        }
      );
    } else if (action === 'remove' && cleanSlug) {
      currentSlugs = currentSlugs.filter((s) => s !== cleanSlug);
    } else if (action === 'reorder' && Array.isArray(slugs)) {
      currentSlugs = slugs.map((s: unknown) => String(s).trim().toLowerCase()).filter(Boolean);
    } else if (action === 'toggle' && cleanSlug) {
      if (currentSlugs.includes(cleanSlug)) {
        currentSlugs = currentSlugs.filter((s) => s !== cleanSlug);
      } else {
        const movie = await movieCol.findOne({
          $or: [{ slug: cleanSlug }, { aliases: cleanSlug }],
        });
        if (!movie) {
          return NextResponse.json(
            { error: `Không tìm thấy phim với slug "${cleanSlug}"` },
            { status: 404 }
          );
        }
        const actualSlug = String(movie.slug);
        currentSlugs = [actualSlug, ...currentSlugs];
        await movieCol.updateOne(
          { slug: actualSlug },
          {
            $set: {
              is_manual: true,
              is_pinned: true,
              'modified.time': new Date().toISOString(),
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    // Save updated site settings
    await userDb.collection('site_settings').updateOne(
      { key: 'general' },
      {
        $set: {
          adminFeaturedSlugs: currentSlugs,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Invalidate site cache
    try {
      revalidatePath('/', 'layout');
      revalidatePath('/phim-moi');
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      slugs: currentSlugs,
      message: 'Cập nhật danh sách Phim Admin Upload thành công',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
