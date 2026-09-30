import { NextRequest, NextResponse } from 'next/server';
import { getUsersDb } from '@/lib/db-helpers';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const db = await getUsersDb();
    const result = await db.collection('kkphim').findOneAndUpdate(
      { slug },
      { $inc: { view: 1 } },
      { returnDocument: 'after', projection: { view: 1, slug: 1 } }
    );

    return NextResponse.json({
      success: true,
      view: result?.view || 1,
    });
  } catch (error) {
    console.error('Error incrementing movie view:', error);
    return NextResponse.json({ error: 'Failed to increment view' }, { status: 500 });
  }
}
