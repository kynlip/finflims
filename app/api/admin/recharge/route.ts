import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import {
  getRechargeConfig,
  getRechargePlan,
  RECHARGE_ORDER_COLLECTION,
  RECHARGE_SETTING_TYPE,
  QR_TEMPLATES,
  serializeRechargeConfig,
  normalizePlans,
  creditRechargeOrder,
  creditUserDirectly,
} from '@/lib/recharge';
import { SEPAY_TRANSACTION_COLLECTION } from '@/lib/sepay';

export const dynamic = 'force-dynamic';

// Đơn `pending` là chỗ giữ mã chuyển khoản, tạo ra ngay khi khách bấm Thanh
// toán. Khách bỏ ngang thì đơn nằm lại mãi, nên quá mốc này coi là "quá hạn"
// để admin phân biệt với đơn khách đang thực sự chuyển tiền.
const STALE_PENDING_MINUTES = 30;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') return null;
  return session;
}

function serializeOrder(order: Record<string, unknown>) {
  return {
    id: String(order._id),
    orderCode: String(order.orderCode || ''),
    userEmail: String(order.userEmail || ''),
    planName: String(order.planName || ''),
    amountVnd: Number(order.amountVnd || 0),
    coinAmount: Number(order.coinAmount || 0),
    adFreeDays: Number(order.adFreeDays || 0),
    transferReference: String(order.transferReference || order.orderCode || ''),
    status: (order.status as string) || 'pending',
    adminNote: String(order.adminNote || ''),
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt || ''),
    confirmedAt:
      order.confirmedAt instanceof Date
        ? order.confirmedAt.toISOString()
        : order.confirmedAt
        ? String(order.confirmedAt)
        : null,
    confirmedBy: order.confirmedBy ? String(order.confirmedBy) : undefined,
  };
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'captainmedia');
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'pending';
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20));

    const config = await getRechargeConfig(db);
    const ordersCollection = db.collection(RECHARGE_ORDER_COLLECTION);

    const query: Record<string, unknown> = {};
    if (statusFilter !== 'all') {
      query.status = statusFilter;
    }

    const [orders, stats, transactions] = await Promise.all([
      ordersCollection
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray(),
      (async () => {
        const staleThreshold = new Date(Date.now() - STALE_PENDING_MINUTES * 60 * 1000);
        const [aggregateResult, payingUsersCount, staleResult] = await Promise.all([
          ordersCollection
            .aggregate([
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  amountVnd: { $sum: '$amountVnd' },
                  coinAmount: { $sum: '$coinAmount' },
                },
              },
            ])
            .toArray(),
          ordersCollection.distinct('userId', { status: 'confirmed' }),
          ordersCollection
            .aggregate([
              {
                $match: {
                  status: 'pending',
                  createdAt: { $lt: staleThreshold },
                },
              },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                  amountVnd: { $sum: '$amountVnd' },
                },
              },
            ])
            .toArray(),
        ]);

        const byStatus: Record<string, { count: number; amountVnd: number; coinAmount: number }> = {};
        for (const item of aggregateResult) {
          byStatus[String(item._id)] = {
            count: Number(item.count || 0),
            amountVnd: Number(item.amountVnd || 0),
            coinAmount: Number(item.coinAmount || 0),
          };
        }

        const topUsers = await ordersCollection
          .aggregate([
            { $match: { status: 'confirmed' } },
            {
              $group: {
                _id: '$userEmail',
                orders: { $sum: 1 },
                amountVnd: { $sum: '$amountVnd' },
                coinAmount: { $sum: '$coinAmount' },
                lastAt: { $max: '$confirmedAt' },
              },
            },
            { $sort: { amountVnd: -1 } },
            { $limit: 5 },
          ])
          .toArray();

        return {
          totalRevenueVnd: byStatus.confirmed?.amountVnd || 0,
          totalConfirmedOrders: byStatus.confirmed?.count || 0,
          totalPendingOrders: byStatus.pending?.count || 0,
          stalePendingOrders: Number(staleResult[0]?.count || 0),
          stalePendingAmountVnd: Number(staleResult[0]?.amountVnd || 0),
          stalePendingMinutes: STALE_PENDING_MINUTES,
          totalPayingUsers: payingUsersCount.length,
          byStatus,
          topUsers: topUsers.map((u) => ({
            email: String(u._id || ''),
            orders: Number(u.orders || 0),
            amountVnd: Number(u.amountVnd || 0),
            coinAmount: Number(u.coinAmount || 0),
            lastAt: u.lastAt instanceof Date ? u.lastAt.toISOString() : u.lastAt ? String(u.lastAt) : null,
          })),
        };
      })(),
      db
        .collection(SEPAY_TRANSACTION_COLLECTION)
        .find({})
        .sort({ transactionDate: -1, createdAt: -1 })
        .limit(10)
        .toArray()
        .then((items) =>
          items.map((t) => ({
            id: String(t._id),
            sepayId: Number(t.sepayId || 0),
            gateway: String(t.gateway || ''),
            transferAmount: Number(t.transferAmount || 0),
            transferType: String(t.transferType || 'in'),
            content: String(t.content || ''),
            code: t.code ? String(t.code) : null,
            orderCode: String(t.orderCode || ''),
            userEmail: String(t.userEmail || ''),
            referenceCode: String(t.referenceCode || ''),
            status: String(t.status || 'unmatched'),
            transactionDate:
              t.transactionDate instanceof Date
                ? t.transactionDate.toISOString()
                : String(t.transactionDate || ''),
            receivedAt:
              t.receivedAt instanceof Date
                ? t.receivedAt.toISOString()
                : t.receivedAt
                ? String(t.receivedAt)
                : null,
          })),
        )
        .catch(() => []),
    ]);

    const staleThreshold = Date.now() - STALE_PENDING_MINUTES * 60 * 1000;
    const serializedOrders = orders.map((order) => {
      const serialized = serializeOrder(order);
      const createdAtMs = order.createdAt instanceof Date ? order.createdAt.getTime() : new Date(order.createdAt).getTime();
      return {
        ...serialized,
        stale: order.status === 'pending' && Number.isFinite(createdAtMs) && createdAtMs < staleThreshold,
      };
    });

    return NextResponse.json({
      payment: serializeRechargeConfig(config),
      plans: config.plans,
      orders: serializedOrders,
      stats,
      transactions,
    });
  } catch (error) {
    console.error('Admin recharge GET error:', error);
    return NextResponse.json({ error: 'Không thể tải thông tin thanh toán' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    // Direct Manual Credit Action
    if (body?.action === 'credit_direct') {
      const userEmailOrId = String(body.userEmailOrId || '').trim();
      const coinAmount = Number(body.coinAmount || 0);
      const adFreeDays = Number(body.adFreeDays || 0);
      const adminNote = String(body.adminNote || 'Admin cộng trực tiếp').trim();

      if (!userEmailOrId) {
        return NextResponse.json({ error: 'Vui lòng nhập email hoặc ID người dùng' }, { status: 400 });
      }

      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB_NAME || 'captainmedia');
      const result = await creditUserDirectly(db, {
        userEmailOrId,
        coinAmount,
        adFreeDays,
        adminNote,
        confirmedBy: session.user?.email || 'admin',
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.reason || 'Không thể cộng coin' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        userEmail: result.userEmail,
        newCoins: result.newCoins,
        adFreeUntil: result.adFreeUntil,
      });
    }

    const values = {
      enabled: Boolean(body?.enabled),
      bankName: typeof body?.bankName === 'string' ? body.bankName.trim().slice(0, 80) : '',
      bankCode: typeof body?.bankCode === 'string' ? body.bankCode.trim().slice(0, 40) : '',
      accountNumber:
        typeof body?.accountNumber === 'string' ? body.accountNumber.trim().slice(0, 80) : '',
      accountHolder:
        typeof body?.accountHolder === 'string' ? body.accountHolder.trim().slice(0, 120) : '',
      qrImageUrl: typeof body?.qrImageUrl === 'string' ? body.qrImageUrl.trim().slice(0, 500) : '',
      qrTemplate: QR_TEMPLATES.includes(body?.qrTemplate) ? body.qrTemplate : 'compact',
      showAccountInfo: body?.showAccountInfo !== false,
      transferPrefix:
        typeof body?.transferPrefix === 'string'
          ? body.transferPrefix.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20)
          : 'PHH',
    };

    const normalizedPlans = Array.isArray(body?.plans) ? normalizePlans(body.plans) : undefined;

    if (values.enabled && (!values.bankName || !values.accountNumber || !values.accountHolder)) {
      return NextResponse.json(
        { error: 'Vui lòng nhập ngân hàng, số tài khoản và tên chủ tài khoản' },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'captainmedia');
    await db.collection('settings').updateOne(
      { type: RECHARGE_SETTING_TYPE },
      {
        $set: {
          ...values,
          ...(normalizedPlans ? { plans: normalizedPlans } : {}),
          type: RECHARGE_SETTING_TYPE,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    );

    const config = await getRechargeConfig(db);
    return NextResponse.json({ success: true, payment: serializeRechargeConfig(config), plans: config.plans });
  } catch (error) {
    console.error('Admin recharge config POST error:', error);
    return NextResponse.json({ error: 'Không thể lưu cấu hình thanh toán' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const orderId = typeof body?.orderId === 'string' ? body.orderId : '';
    const nextStatus = body?.status;
    const adminNote = typeof body?.adminNote === 'string' ? body.adminNote.trim().slice(0, 500) : '';

    if (!ObjectId.isValid(orderId) || !['confirmed', 'rejected'].includes(nextStatus)) {
      return NextResponse.json({ error: 'Dữ liệu xử lý đơn không hợp lệ' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'captainmedia');
    const orders = db.collection(RECHARGE_ORDER_COLLECTION);
    const order = await orders.findOne({ _id: new ObjectId(orderId), status: 'pending' });

    if (!order) {
      return NextResponse.json({ error: 'Đơn không tồn tại hoặc đã được xử lý' }, { status: 409 });
    }

    if (nextStatus === 'rejected') {
      await orders.updateOne(
        { _id: order._id, status: 'pending' },
        {
          $set: {
            status: 'rejected',
            adminNote,
            updatedAt: new Date(),
            rejectedAt: new Date(),
            rejectedBy: session.user?.email || 'admin',
          },
        },
      );
      return NextResponse.json({ success: true, status: 'rejected' });
    }

    const configured = await getRechargeConfig(db);
    const plan = getRechargePlan(order.planId, configured.plans);
    if (!plan || !configured.plans.some((configuredPlan) => configuredPlan.id === order.planId)) {
      return NextResponse.json({ error: 'Gói trong đơn không còn hợp lệ' }, { status: 400 });
    }

    // Cùng một hàm với webhook SePay: đơn được claim theo trạng thái pending nên
    // admin bấm duyệt trùng lúc webhook về cũng chỉ cộng tiền một lần.
    const credit = await creditRechargeOrder(db, order, {
      confirmedBy: session.user?.email || 'admin',
      adminNote,
    });

    if (!credit.ok) {
      if (credit.reason === 'already_processed') {
        return NextResponse.json({ error: 'Đơn vừa được xử lý bởi luồng khác' }, { status: 409 });
      }
      if (credit.reason === 'user_not_found') {
        return NextResponse.json({ error: 'Không tìm thấy tài khoản của đơn' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Gói trong đơn không còn hợp lệ' }, { status: 400 });
    }

    return NextResponse.json({ success: true, status: 'confirmed', adFreeUntil: credit.adFreeUntil });
  } catch (error) {
    console.error('Admin recharge PATCH error:', error);
    return NextResponse.json({ error: 'Không thể xử lý đơn nạp coin' }, { status: 500 });
  }
}
