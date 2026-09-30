import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUsersDb } from '@/lib/db-helpers';
import {
  buildOrderCode,
  getRechargeConfig,
  getRechargePlan,
  isRechargeConfigured,
  RECHARGE_ORDER_COLLECTION,
  serializeRechargeConfig,
} from '@/lib/recharge';
import { buildVietQrUrl } from '@/lib/sepay';
import { getAdFreeStatusFromValue } from '@/lib/ads';

export const dynamic = 'force-dynamic';

function serializeOrder(order: Record<string, unknown>) {
  return {
    id: String(order._id),
    orderCode: order.orderCode,
    planId: order.planId,
    planName: order.planName,
    amountVnd: order.amountVnd,
    coinAmount: order.coinAmount,
    adFreeDays: order.adFreeDays,
    method: order.method,
    transferReference: order.transferReference || '',
    status: order.status,
    adminNote: order.adminNote || '',
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt || null,
    confirmedBy: order.confirmedBy || '',
  };
}

export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
  }

  try {
    const db = await getUsersDb();
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    }

    const [config, orders] = await Promise.all([
      getRechargeConfig(db),
      db
        .collection(RECHARGE_ORDER_COLLECTION)
        .find({ userEmail: email })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
    ]);
    const adFree = getAdFreeStatusFromValue(user.adFreeUntil);

    return NextResponse.json({
      balance: Number(user.linh_thach || 0),
      adFreeUntil: adFree.until,
      isAdFree: adFree.active,
      plans: config.plans,
      payment: serializeRechargeConfig(config),
      orders: orders.map((order) => serializeOrder(order)),
    });
  } catch (error) {
    console.error('User recharge GET error:', error);
    return NextResponse.json({ error: 'Không thể tải thông tin nạp coin' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const transferReference =
      typeof body?.transferReference === 'string'
        ? body.transferReference.trim().slice(0, 120)
        : '';

    const db = await getUsersDb();
    const config = await getRechargeConfig(db);
    const plan = getRechargePlan(body?.planId, config.plans);
    if (!plan) {
      return NextResponse.json({ error: 'Gói nạp không hợp lệ' }, { status: 400 });
    }
    if (!isRechargeConfigured(config)) {
      return NextResponse.json(
        { error: 'Admin chưa cấu hình thông tin nhận chuyển khoản' },
        { status: 503 },
      );
    }

    const user = await db.collection('users').findOne({ email }, { projection: { _id: 1 } });
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    }

    // Nội dung chuyển khoản chính là mã đơn, để SePay bóc tách vào `code`.
    const orderCode = buildOrderCode(config.transferPrefix);
    const now = new Date();

    const result = await db.collection(RECHARGE_ORDER_COLLECTION).insertOne({
      orderCode,
      userId: user._id.toString(),
      userEmail: email,
      planId: plan.id,
      planName: plan.name,
      amountVnd: plan.priceVnd,
      coinAmount: plan.coinAmount,
      adFreeDays: plan.adFreeDays,
      method: 'bank_transfer',
      transferReference,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    const qrImageUrl = config.accountNumber && config.bankCode
      ? buildVietQrUrl({
          accountNumber: config.accountNumber,
          bankCode: config.bankCode,
          amountVnd: plan.priceVnd,
          content: orderCode,
          accountHolder: config.accountHolder,
          template: config.qrTemplate,
          showInfo: config.showAccountInfo,
        })
      : config.qrImageUrl;

    return NextResponse.json(
      {
        success: true,
        order: {
          id: result.insertedId.toString(),
          orderCode,
          amountVnd: plan.priceVnd,
          transferContent: orderCode,
          qrImageUrl,
          status: 'pending',
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('User recharge POST error:', error);
    return NextResponse.json({ error: 'Không thể tạo yêu cầu nạp coin' }, { status: 500 });
  }
}
