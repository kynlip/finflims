import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isSePayApiConfigured } from '@/lib/sepay-api';
import { runSePayReconciliation } from '@/lib/sepay-reconcile';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Đối soát giao dịch với SePay REST API v2 (bank.md mục 5.5).
//
// Hai đường vào: admin bấm nút trong trang quản trị, hoặc cron gọi kèm
// `X-API-Key` để bù các webhook rơi trong lúc server offline.

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role === 'admin') return true;

  const cronKey = process.env.CRON_API_KEY?.trim();
  if (!cronKey) return false;
  const provided =
    request.headers.get('x-api-key') || new URL(request.url).searchParams.get('api_key') || '';
  return provided === cronKey;
}

async function handle(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSePayApiConfigured()) {
    return NextResponse.json(
      { error: 'Chưa cấu hình SEPAY_API_TOKEN nên không đối soát được' },
      { status: 503 },
    );
  }

  const hours = Number(new URL(request.url).searchParams.get('hours')) || 24;

  try {
    const result = await runSePayReconciliation({ hours });
    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Đối soát thất bại', result }, { status: 502 });
    }
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('[SePay Reconcile] Error:', error);
    return NextResponse.json({ error: 'Lỗi khi đối soát giao dịch' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
