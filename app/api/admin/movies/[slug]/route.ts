import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { getMovieCollection } from '@/lib/crawler';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  const { slug } = await context.params;

  try {
    const col = await getMovieCollection();
    const movie = await col.findOne({
      $or: [{ slug }, { aliases: slug }],
    });

    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    return NextResponse.json({
      movie: {
        ...movie,
        _id: movie._id.toString(),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  const { slug: oldSlug } = await context.params;
  const body = await request.json().catch(() => ({}));

  if (!body.name || !body.slug) {
    return NextResponse.json({ error: 'Tên và Slug phim là bắt buộc' }, { status: 400 });
  }

  const newSlug = body.slug.trim().toLowerCase();

  try {
    const col = await getMovieCollection();
    const {
      _id,
      created,
      crawledAt,
      updatedAt,
      episodesCount,
      serversCount,
      view,
      ...fieldsToUpdate
    } = body;
    void _id;
    void crawledAt;
    void updatedAt;
    void episodesCount;
    void serversCount;
    void view;

    const now = new Date();
    const nowIso = now.toISOString();

    const updateDoc: Record<string, unknown> = {
      ...fieldsToUpdate,
      slug: newSlug,
      is_manual: true,
      is_pinned: true,
      modified: { time: nowIso },
      updatedAt: now,
    };

    // If slug changed, remember old slug in aliases array
    const updateOperations: Record<string, unknown> = {
      $set: updateDoc,
      $setOnInsert: {
        created: created || { time: nowIso },
        crawledAt: now,
        view: typeof view === 'number' ? view : 0,
      },
    };

    if (newSlug !== oldSlug && oldSlug) {
      updateOperations.$addToSet = {
        aliases: oldSlug,
      };
    }

    const res = await col.updateOne(
      { $or: [{ slug: oldSlug }, { slug: newSlug }, { aliases: oldSlug }] },
      updateOperations,
      { upsert: true }
    );

    // Instant Cache Revalidation
    try {
      revalidatePath('/', 'layout');
      revalidatePath(`/phim/${newSlug}`);
      revalidatePath(`/phim/${oldSlug}`);
      revalidatePath(`/xem/${newSlug}`, 'layout');
      revalidatePath(`/xem/${oldSlug}`, 'layout');
      revalidatePath('/tim-kiem');
      revalidatePath('/phim-moi');
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      matchedCount: res.matchedCount,
      modifiedCount: res.modifiedCount,
      upsertedCount: res.upsertedCount,
      slug: newSlug,
    });
  } catch (error) {
    console.error('Update movie error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  const { slug } = await context.params;

  try {
    const col = await getMovieCollection();
    const res = await col.deleteOne({ slug });

    if (res.deletedCount === 0) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedCount: res.deletedCount });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
