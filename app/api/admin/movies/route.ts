import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { getMovieCollection } from '@/lib/crawler';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(10, Number(searchParams.get('limit')) || 20));
  const query = searchParams.get('q')?.trim() || '';
  const type = searchParams.get('type') || '';
  const category = searchParams.get('category') || '';
  const status = searchParams.get('status') || '';
  const year = searchParams.get('year') || '';

  const filter: Record<string, unknown> = {};

  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { origin_name: { $regex: escaped, $options: 'i' } },
      { slug: { $regex: escaped, $options: 'i' } },
    ];
  }

  if (type === 'manual') {
    filter.is_manual = true;
  } else if (type) {
    filter.type = type;
  }

  if (category) {
    filter['category.slug'] = category;
  }

  if (status) {
    filter.status = status;
  }

  if (year) {
    const yearNum = parseInt(year, 10);
    if (!isNaN(yearNum)) {
      filter.year = yearNum;
    }
  }

  try {
    const col = await getMovieCollection();
    const skip = (page - 1) * limit;

    const [movies, total, statsResult, manualCount] = await Promise.all([
      col
        .find(filter, {
          projection: {
            _id: 1,
            name: 1,
            origin_name: 1,
            slug: 1,
            thumb_url: 1,
            poster_url: 1,
            type: 1,
            status: 1,
            year: 1,
            quality: 1,
            lang: 1,
            episode_current: 1,
            episode_total: 1,
            episodes: 1,
            modified: 1,
            created: 1,
            is_manual: 1,
          },
        })
        .sort({ 'modified.time': -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      col.countDocuments(filter),
      col
        .aggregate([
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
            },
          },
        ])
        .toArray(),
      col.countDocuments({ is_manual: true }),
    ]);

    const statsMap: Record<string, number> = {};
    let totalAll = 0;
    statsResult.forEach((item) => {
      const k = (item._id as string) || 'other';
      statsMap[k] = item.count;
      totalAll += item.count;
    });

    return NextResponse.json({
      movies: movies.map((m) => {
        const eps = (m.episodes || []) as Array<{
          server_data?: unknown[];
          items?: unknown[];
        }>;
        return {
          ...m,
          _id: m._id.toString(),
          is_manual: Boolean(m.is_manual),
          episodesCount: eps.reduce(
            (acc: number, s) =>
              acc + (s.server_data?.length || s.items?.length || 0),
            0
          ),
          serversCount: eps.length,
        };
      }),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalAll,
        manual: manualCount,
        hoathinh: statsMap['hoathinh'] || 0,
        series: statsMap['series'] || 0,
        single: statsMap['single'] || 0,
        tvshows: statsMap['tvshows'] || 0,
      },
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

  const body = await request.json().catch(() => ({}));
  if (!body.name || !body.slug) {
    return NextResponse.json({ error: 'Tên và Slug phim là bắt buộc' }, { status: 400 });
  }

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

    const updateDoc = {
      ...fieldsToUpdate,
      is_manual: true,
      is_pinned: true,
      modified: { time: nowIso },
      updatedAt: now,
    };

    const res = await col.updateOne(
      { slug: body.slug },
      {
        $set: updateDoc,
        $setOnInsert: {
          created: created || { time: nowIso },
          crawledAt: now,
          view: typeof view === 'number' ? view : 0,
        },
      },
      { upsert: true }
    );

    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath('/', 'layout');
      revalidatePath(`/phim/${body.slug}`);
      revalidatePath('/phim-moi');
      revalidatePath('/conan');
      revalidatePath('/doraemon');
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      upsertedCount: res.upsertedCount,
      modifiedCount: res.modifiedCount,
      matchedCount: res.matchedCount,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  const body = await request.json().catch(() => ({}));
  const slugs: string[] = Array.isArray(body.slugs) ? body.slugs : body.slug ? [body.slug] : [];

  if (slugs.length === 0) {
    return NextResponse.json({ error: 'No slugs provided' }, { status: 400 });
  }

  try {
    const col = await getMovieCollection();
    const res = await col.deleteMany({ slug: { $in: slugs } });
    return NextResponse.json({ success: true, deletedCount: res.deletedCount });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
