import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUsersDb } from '@/lib/db-helpers';
import { RECHARGE_ORDER_COLLECTION } from '@/lib/recharge';
import { getAdFreeStatusFromValue } from '@/lib/ads';

export const dynamic = 'force-dynamic';

// Endpoint nhẹ để trang thanh toán dò xem tiền đã về chưa.
//
// Trang gọi lại vài giây một lần trong lúc chờ chuyển khoản nên chỉ trả đúng
// trạng thái đơn và số dư, không kèm danh sách gói / lịch sử như GET
// `/api/user/recharge`.

export async function GET(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
  }

  const orderCode = new URL(request.url).searchParams.get('orderCode')?.trim().toUpperCase() || '';
  if (!orderCode) {
    return NextResponse.json({ error: 'Thiếu mã đơn' }, { status: 400 });
  }

  try {
    const db = await getUsersDb();
    // Lọc kèm email: không cho người này dò trạng thái đơn của người khác.
    const order = await db
      .collection(RECHARGE_ORDER_COLLECTION)
      .findOne(
        { orderCode, userEmail: email },
        { projection: { status: 1, orderCode: 1, amountVnd: 1, coinAmount: 1, adFreeDays: 1, confirmedAt: 1, adminNote: 1 } },
      );

    if (!order) {
      return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 });
    }

    const user = await db
      .collection('users')
      .findOne({ email }, { projection: { linh_thach: 1, adFreeUntil: 1 } });
    const adFree = getAdFreeStatusFromValue(user?.adFreeUntil);

    return NextResponse.json({
      orderCode: order.orderCode,
      status: order.status,
      amountVnd: Number(order.amountVnd || 0),
      coinAmount: Number(order.coinAmount || 0),
      adFreeDays: Number(order.adFreeDays || 0),
      confirmedAt: order.confirmedAt || null,
      adminNote: order.adminNote || '',
      balance: Number(user?.linh_thach || 0),
      adFreeUntil: adFree.until,
      isAdFree: adFree.active,
    });
  } catch (error) {
    console.error('Recharge status error:', error);
    return NextResponse.json({ error: 'Không kiểm tra được trạng thái đơn' }, { status: 500 });
  }
}
