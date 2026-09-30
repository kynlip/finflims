import { Db, ObjectId, WithId, Document } from 'mongodb';
import { getAdFreeStatusFromValue } from '@/lib/ads';
import { RECHARGE_ORDER_COLLECTION } from '@/lib/recharge';

export interface CreditResult {
  ok: boolean;
  /** `already_processed` khi đơn không còn ở trạng thái pending. */
  reason?: 'invalid_order' | 'user_not_found' | 'already_processed';
  adFreeUntil?: Date;
}

interface CreditOptions {
  confirmedBy: string;
  adminNote?: string;
  /** Thông tin giao dịch ngân hàng khi đơn được xác nhận tự động qua SePay. */
  payment?: Record<string, unknown>;
}

/**
 * Cộng coin + gia hạn VIP cho một đơn nạp đang chờ.
 *
 * Dùng chung cho admin duyệt tay và webhook SePay. Đơn được "claim" bằng update
 * có điều kiện `status: 'pending'` TRƯỚC khi cộng tiền, nên hai luồng chạy song
 * song (admin bấm duyệt đúng lúc webhook về) chỉ có một bên cộng được.
 */
export async function creditRechargeOrder(
  db: Db,
  order: WithId<Document>,
  options: CreditOptions,
): Promise<CreditResult> {
  const orderCoins = Number(order.coinAmount);
  const orderDays = Number(order.adFreeDays);
  const orderAmount = Number(order.amountVnd);

  if (
    !Number.isInteger(orderCoins) ||
    !Number.isInteger(orderDays) ||
    !Number.isInteger(orderAmount) ||
    orderCoins < 1 ||
    orderDays < 1 ||
    orderDays > 3_650 ||
    orderAmount < 1_000
  ) {
    return { ok: false, reason: 'invalid_order' };
  }

  const userFilter = ObjectId.isValid(String(order.userId))
    ? { _id: new ObjectId(String(order.userId)) }
    : { email: order.userEmail };
  const user = await db.collection('users').findOne(userFilter);
  if (!user) return { ok: false, reason: 'user_not_found' };

  const now = new Date();
  const currentAdFree = getAdFreeStatusFromValue(user.adFreeUntil, now);
  // Còn hạn thì cộng dồn tiếp vào phần còn lại, hết hạn thì tính từ bây giờ.
  const currentUntil =
    currentAdFree.active && currentAdFree.until ? new Date(currentAdFree.until) : now;
  const adFreeUntil = new Date(currentUntil.getTime() + orderDays * 24 * 60 * 60 * 1000);

  const claimed = await db.collection(RECHARGE_ORDER_COLLECTION).updateOne(
    { _id: order._id, status: 'pending' },
    {
      $set: {
        status: 'confirmed',
        adminNote: options.adminNote || '',
        updatedAt: now,
        confirmedAt: now,
        confirmedBy: options.confirmedBy,
        ...(options.payment ? { payment: options.payment } : {}),
      },
    },
  );

  if (claimed.modifiedCount !== 1) {
    return { ok: false, reason: 'already_processed' };
  }

  await db.collection('users').updateOne(userFilter, {
    $inc: { linh_thach: orderCoins },
    $set: { adFreeUntil, updatedAt: now },
  });

  return { ok: true, adFreeUntil };
}
