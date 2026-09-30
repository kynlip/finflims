import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { getRechargeConfig, RECHARGE_ORDER_COLLECTION } from '@/lib/recharge';
import { SEPAY_TRANSACTION_COLLECTION } from '@/lib/sepay';
import { isSePayApiConfigured, listSePayBankAccounts, toNumber } from '@/lib/sepay-api';
import { getLastReconcileState } from '@/lib/sepay-reconcile';

export const dynamic = 'force-dynamic';

// Thống kê doanh thu nạp coin cho trang admin. Tách khỏi `/api/admin/recharge`
// để bộ lọc khoảng thời gian đổi được mà không phải tải lại toàn bộ danh sách
// đơn và log webhook.

const RANGE_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365,
};

/** Múi giờ dùng để gom nhóm theo ngày — báo cáo phải khớp ngày làm việc ở VN. */
const REPORT_TIMEZONE = 'Asia/Ho_Chi_Minh';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') return null;
  return session;
}

interface DailyRow {
  _id: string;
  amountVnd?: number;
  orders?: number;
  coinAmount?: number;
}

/** Bơm đủ ngày trống để biểu đồ không nhảy cóc qua những ngày không có đơn. */
function fillDailySeries(rows: DailyRow[], from: Date, days: number) {
  const byDate = new Map(rows.map((row) => [row._id, row]));
  const series: { date: string; amountVnd: number; orders: number; coinAmount: number }[] = [];

  for (let index = 0; index < days; index += 1) {
    const day = new Date(from.getTime() + index * 24 * 60 * 60 * 1000 + 60 * 60 * 1000);
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: REPORT_TIMEZONE }).format(day);
    const row = byDate.get(date);
    series.push({
      date,
      amountVnd: Number(row?.amountVnd || 0),
      orders: Number(row?.orders || 0),
      coinAmount: Number(row?.coinAmount || 0),
    });
  }

  return series;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const params = new URL(request.url).searchParams;
    const rangeKey = params.get('range') || '30d';
    const days = RANGE_DAYS[rangeKey] || 30;
    const includeBalance = params.get('balance') === '1';

    const now = new Date();
    // Mốc đầu kỳ phải là nửa đêm GIỜ VIỆT NAM, không phải giờ hệ điều hành —
    // VPS đang chạy timezone Europe/Berlin nên `setHours(0)` sẽ cắt mất các đơn
    // từ 00:00 đến 05:00 giờ VN của ngày đầu tiên.
    const vietnamOffsetMs = 7 * 60 * 60 * 1000;
    const dayMs = 24 * 60 * 60 * 1000;
    const vietnamMidnightToday =
      Math.floor((now.getTime() + vietnamOffsetMs) / dayMs) * dayMs - vietnamOffsetMs;
    const from = new Date(vietnamMidnightToday - (days - 1) * dayMs);
    // Kỳ liền trước cùng độ dài, dùng để tính mức tăng/giảm.
    const previousFrom = new Date(from.getTime() - days * dayMs);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'captainmedia');
    const orders = db.collection(RECHARGE_ORDER_COLLECTION);
    const transactions = db.collection(SEPAY_TRANSACTION_COLLECTION);

    // Đơn được tính vào doanh thu theo ngày DUYỆT (`confirmedAt`), không phải
    // ngày tạo — tiền chỉ thực sự về khi đơn được xác nhận.
    const confirmedInRange = { status: 'confirmed', confirmedAt: { $gte: from, $lte: now } };

    const [
      daily,
      byPlan,
      bySource,
      totals,
      previousTotals,
      topUsers,
      newPayers,
      webhookHealth,
      recentTransactions,
      config,
      reconcileState,
    ] = await Promise.all([
      orders
        .aggregate<DailyRow>([
          { $match: confirmedInRange },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$confirmedAt', timezone: REPORT_TIMEZONE },
              },
              amountVnd: { $sum: '$amountVnd' },
              orders: { $sum: 1 },
              coinAmount: { $sum: '$coinAmount' },
            },
          },
        ])
        .toArray(),
      orders
        .aggregate([
          { $match: confirmedInRange },
          {
            $group: {
              _id: { planId: '$planId', planName: '$planName' },
              orders: { $sum: 1 },
              amountVnd: { $sum: '$amountVnd' },
            },
          },
          { $sort: { amountVnd: -1 } },
        ])
        .toArray(),
      orders
        .aggregate([
          { $match: confirmedInRange },
          { $group: { _id: '$confirmedBy', orders: { $sum: 1 }, amountVnd: { $sum: '$amountVnd' } } },
        ])
        .toArray(),
      orders
        .aggregate([
          { $match: { createdAt: { $gte: from, $lte: now } } },
          { $group: { _id: '$status', count: { $sum: 1 }, amountVnd: { $sum: '$amountVnd' } } },
        ])
        .toArray(),
      orders
        .aggregate([
          { $match: { status: 'confirmed', confirmedAt: { $gte: previousFrom, $lt: from } } },
          { $group: { _id: null, amountVnd: { $sum: '$amountVnd' }, orders: { $sum: 1 } } },
        ])
        .toArray(),
      orders
        .aggregate([
          { $match: confirmedInRange },
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
          { $limit: 20 },
        ])
        .toArray(),
      // Người nạp lần đầu trong kỳ: đơn thành công đầu tiên của họ nằm trong kỳ.
      orders
        .aggregate([
          { $match: { status: 'confirmed' } },
          { $group: { _id: '$userEmail', firstAt: { $min: '$confirmedAt' } } },
          { $match: { firstAt: { $gte: from, $lte: now } } },
          { $count: 'count' },
        ])
        .toArray(),
      transactions
        .aggregate([
          { $match: { receivedAt: { $gte: from, $lte: now } } },
          { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$transferAmount' } } },
          { $sort: { count: -1 } },
        ])
        .toArray(),
      transactions.find({}).sort({ receivedAt: -1 }).limit(1).toArray(),
      getRechargeConfig(db),
      getLastReconcileState(db),
    ]);

    const byStatus = Object.fromEntries(
      totals.map((row) => [
        String(row._id),
        { count: Number(row.count || 0), amountVnd: Number(row.amountVnd || 0) },
      ]),
    );

    const series = fillDailySeries(daily, from, days);
    const revenueVnd = series.reduce((sum, row) => sum + row.amountVnd, 0);
    const confirmedOrders = series.reduce((sum, row) => sum + row.orders, 0);
    const previousRevenue = Number(previousTotals[0]?.amountVnd || 0);
    const previousOrders = Number(previousTotals[0]?.orders || 0);

    const createdCount = totals.reduce((sum, row) => sum + Number(row.count || 0), 0);
    const createdConfirmed = Number(byStatus.confirmed?.count || 0);

    // Số dư tài khoản ngân hàng chỉ lấy khi admin bấm — mỗi lần gọi tốn 1 request
    // trong hạn mức 3 request/giây của SePay.
    let bankAccounts: { accountNumber: string; bank: string; holder: string; balance: number }[] = [];
    let bankError = '';
    if (includeBalance && isSePayApiConfigured()) {
      try {
        const accounts = await listSePayBankAccounts();
        bankAccounts = accounts.map((account) => ({
          accountNumber: String(account.account_number || ''),
          bank: String(account.bank_short_name || account.bank_brand_name || ''),
          holder: String(account.account_holder_name || ''),
          balance: toNumber(account.accumulated),
        }));
      } catch (error) {
        bankError = error instanceof Error ? error.message : 'Không đọc được số dư';
      }
    }

    return NextResponse.json({
      range: { key: rangeKey, days, from: from.toISOString(), to: now.toISOString() },
      summary: {
        revenueVnd,
        confirmedOrders,
        coinIssued: series.reduce((sum, row) => sum + row.coinAmount, 0),
        averageOrderVnd: confirmedOrders ? Math.round(revenueVnd / confirmedOrders) : 0,
        payingUsers: topUsers.length,
        newPayers: Number(newPayers[0]?.count || 0),
        pendingOrders: Number(byStatus.pending?.count || 0),
        pendingAmountVnd: Number(byStatus.pending?.amountVnd || 0),
        rejectedOrders: Number(byStatus.rejected?.count || 0),
        // Tỉ lệ đơn tạo trong kỳ đã được thanh toán — đo mức khách bỏ dở.
        conversionRate: createdCount ? Math.round((createdConfirmed / createdCount) * 100) : 0,
        revenueChangePercent: previousRevenue
          ? Math.round(((revenueVnd - previousRevenue) / previousRevenue) * 100)
          : null,
        orderChangePercent: previousOrders
          ? Math.round(((confirmedOrders - previousOrders) / previousOrders) * 100)
          : null,
        previousRevenueVnd: previousRevenue,
      },
      series,
      byPlan: byPlan.map((row) => ({
        planId: String((row._id as { planId?: string })?.planId || ''),
        planName: String((row._id as { planName?: string })?.planName || 'Không rõ'),
        orders: Number(row.orders || 0),
        amountVnd: Number(row.amountVnd || 0),
      })),
      bySource: bySource.map((row) => ({
        source: String(row._id || 'admin'),
        orders: Number(row.orders || 0),
        amountVnd: Number(row.amountVnd || 0),
      })),
      topUsers: topUsers.map((row) => ({
        email: String(row._id || ''),
        orders: Number(row.orders || 0),
        amountVnd: Number(row.amountVnd || 0),
        coinAmount: Number(row.coinAmount || 0),
        lastAt: row.lastAt || null,
      })),
      webhook: {
        byStatus: webhookHealth.map((row) => ({
          status: String(row._id || 'unknown'),
          count: Number(row.count || 0),
          amount: Number(row.amount || 0),
        })),
        lastReceivedAt: recentTransactions[0]?.receivedAt || null,
        apiConfigured: isSePayApiConfigured(),
        reconcile: reconcileState,
      },
      bank: { accounts: bankAccounts, error: bankError, configuredAccount: config.accountNumber },
    });
  } catch (error) {
    console.error('Admin recharge stats error:', error);
    return NextResponse.json({ error: 'Không thể tải thống kê nạp coin' }, { status: 500 });
  }
}
