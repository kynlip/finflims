// Đối soát định kỳ với SePay REST API v2 (bank.md mục 5.5).
//
// Webhook có thể không tới được server (deploy, restart, mạng lỗi, quá 8 lần
// retry ~33 phút). Job này chủ động hỏi lại SePay danh sách giao dịch và bù
// những đơn chưa được cộng.

import type { Db } from 'mongodb';
import { getUsersDb } from '@/lib/db-helpers';
import {
  getRechargeConfig,
  isReceivingAccount,
  RECHARGE_ORDER_COLLECTION,
  creditRechargeOrder,
} from '@/lib/recharge';
import {
  ensureSparseUniqueIndex,
  extractOrderCode,
  SEPAY_TRANSACTION_COLLECTION,
} from '@/lib/sepay';
import {
  listSePayTransactionsPaged,
  SePayApiRequestError,
  toNumber,
  type SePayApiTransaction,
} from '@/lib/sepay-api';

export interface ReconcileResult {
  ok: boolean;
  error?: string;
  fromDate: string;
  toDate: string;
  /** Số giao dịch API trả về trong khoảng quét. */
  scanned: number;
  /** Giao dịch tiền vào đã có trong DB (webhook nhận đủ). */
  alreadyKnown: number;
  /** Giao dịch webhook bị sót, được ghi nhận bổ sung ở lần đối soát này. */
  recovered: number;
  /** Đơn được cộng coin/VIP nhờ đối soát. */
  credited: number;
  /** Giao dịch tiền vào nhưng không khớp đơn nào (khách chuyển sai nội dung). */
  unmatched: number;
  ranAt: string;
}

/** SePay nhận `YYYY-MM-DD HH:mm:ss` theo giờ Việt Nam (UTC+7). */
function formatSePayDate(date: Date): string {
  const vietnamTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vietnamTime.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Quét lại giao dịch trong `hours` giờ gần nhất và bù các webhook bị mất.
 *
 * An toàn khi chạy song song với webhook: bản ghi giao dịch dùng khoá duy nhất
 * và `creditRechargeOrder` claim đơn theo điều kiện `status: 'pending'`, nên
 * cùng lắm một bên thua cuộc chứ không cộng tiền hai lần.
 */
export async function runSePayReconciliation(
  options: { hours?: number; maxPages?: number; db?: Db } = {},
): Promise<ReconcileResult> {
  const hours = Math.min(Math.max(options.hours || 24, 1), 24 * 31);
  const now = new Date();
  const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
  const fromDate = formatSePayDate(from);
  const toDate = formatSePayDate(now);

  const result: ReconcileResult = {
    ok: false,
    fromDate,
    toDate,
    scanned: 0,
    alreadyKnown: 0,
    recovered: 0,
    credited: 0,
    unmatched: 0,
    ranAt: now.toISOString(),
  };

  const db = options.db || (await getUsersDb());
  const config = await getRechargeConfig(db);
  const transactions = db.collection(SEPAY_TRANSACTION_COLLECTION);
  await ensureSparseUniqueIndex(transactions, 'apiTransactionId');
  // Index cũ `{ sepayId: 1 }` non-sparse chặn mọi document đối soát (không có
  // `sepayId`) ngay từ document thứ hai, nên sửa luôn tại đây.
  await ensureSparseUniqueIndex(transactions, 'sepayId');

  let remoteTransactions: SePayApiTransaction[];
  try {
    remoteTransactions = await listSePayTransactionsPaged({
      fromDate,
      toDate,
      perPage: 100,
      maxPages: options.maxPages || 5,
      accountNumber: config.accountNumber || undefined,
    });
  } catch (error) {
    result.error =
      error instanceof SePayApiRequestError ? error.message : 'Không gọi được SePay API';
    return result;
  }

  result.scanned = remoteTransactions.length;

  for (const remote of remoteTransactions) {
    const amountIn = toNumber(remote.amount_in);
    if (amountIn <= 0) continue;

    const referenceCode = String(remote.reference_number || '').trim();
    const apiTransactionId = String(remote.id || '').trim();

    // Đã ghi nhận qua webhook chưa? Khớp theo mã tham chiếu ngân hàng vì webhook
    // và REST API đánh số giao dịch bằng hai hệ id khác nhau.
    const existing = referenceCode
      ? await transactions.findOne({ referenceCode })
      : await transactions.findOne({ apiTransactionId });
    if (existing) {
      result.alreadyKnown += 1;
      continue;
    }

    if (!isReceivingAccount(config, remote.account_number)) continue;

    const orderCode = extractOrderCode(
      {
        code: remote.code ?? null,
        content: remote.transaction_content || '',
        description: remote.transaction_content || '',
      },
      config.transferPrefix,
    );

    const baseRecord = {
      provider: 'sepay_api',
      apiTransactionId,
      referenceCode,
      gateway: remote.bank_brand_name || '',
      accountNumber: remote.account_number || '',
      transferType: 'in',
      transferAmount: amountIn,
      content: remote.transaction_content || '',
      code: remote.code ?? null,
      transactionDate: remote.transaction_date || '',
      receivedAt: new Date(),
      recoveredByReconciliation: true,
    };

    // Ghi trước rồi mới cộng tiền: trùng khoá nghĩa là một tiến trình khác
    // (webhook hoặc lần đối soát song song) đã nhận giao dịch này.
    try {
      await transactions.insertOne({ ...baseRecord, orderCode: orderCode || '', status: 'received' });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        result.alreadyKnown += 1;
        continue;
      }
      throw error;
    }

    result.recovered += 1;

    if (!orderCode) {
      await transactions.updateOne(
        { apiTransactionId },
        { $set: { status: 'unmatched_no_code' } },
      );
      result.unmatched += 1;
      continue;
    }

    const order = await db.collection(RECHARGE_ORDER_COLLECTION).findOne({ orderCode });
    if (!order) {
      await transactions.updateOne(
        { apiTransactionId },
        { $set: { status: 'unmatched_order_not_found' } },
      );
      result.unmatched += 1;
      continue;
    }

    if (order.status !== 'pending') {
      await transactions.updateOne(
        { apiTransactionId },
        { $set: { status: 'duplicate_order_settled', orderId: order._id } },
      );
      continue;
    }

    if (amountIn < (toNumber(order.amountVnd) || 0)) {
      await transactions.updateOne(
        { apiTransactionId },
        { $set: { status: 'underpaid', orderId: order._id, requiredAmount: toNumber(order.amountVnd) } },
      );
      continue;
    }

    const credit = await creditRechargeOrder(db, order, {
      confirmedBy: 'sepay-reconcile',
      payment: {
        provider: 'sepay_api',
        apiTransactionId,
        referenceCode,
        gateway: remote.bank_brand_name,
        transferAmount: amountIn,
        transactionDate: remote.transaction_date,
      },
    });

    await transactions.updateOne(
      { apiTransactionId },
      {
        $set: {
          status: credit.ok ? 'credited' : `failed_${credit.reason}`,
          orderId: order._id,
          userEmail: order.userEmail,
        },
      },
    );

    if (credit.ok) result.credited += 1;
  }

  result.ok = true;

  await db.collection('settings').updateOne(
    { type: 'sepay_reconcile_state' },
    { $set: { type: 'sepay_reconcile_state', ...result, updatedAt: new Date() } },
    { upsert: true },
  );

  return result;
}

export async function getLastReconcileState(db: Db): Promise<ReconcileResult | null> {
  const stored = await db.collection('settings').findOne({ type: 'sepay_reconcile_state' });
  if (!stored) return null;
  return {
    ok: Boolean(stored.ok),
    error: stored.error || undefined,
    fromDate: String(stored.fromDate || ''),
    toDate: String(stored.toDate || ''),
    scanned: Number(stored.scanned || 0),
    alreadyKnown: Number(stored.alreadyKnown || 0),
    recovered: Number(stored.recovered || 0),
    credited: Number(stored.credited || 0),
    unmatched: Number(stored.unmatched || 0),
    ranAt: String(stored.ranAt || ''),
  };
}
