import { NextRequest, NextResponse } from 'next/server';
import { getUsersDb } from '@/lib/db-helpers';
import { RECHARGE_ORDER_COLLECTION, creditRechargeOrder } from '@/lib/recharge';
import {
  checkSePayIp,
  ensureSparseUniqueIndex,
  SEPAY_TRANSACTION_COLLECTION,
  verifySePayApiKey,
} from '@/lib/sepay';

export const dynamic = 'force-dynamic';

// IPN của Cổng thanh toán SePay (mô hình 2). Khác webhook biến động số dư ở
// chỗ: xác thực bằng header `X-Secret-Key` chứ không ký HMAC, và payload lồng
// theo cấu trúc order / transaction / customer.
interface SePayIpnPayload {
  timestamp?: number;
  notification_type?: string;
  order?: {
    id?: string;
    order_id?: string;
    order_status?: string;
    order_amount?: string;
    order_currency?: string;
    order_invoice_number?: string;
    custom_data?: string;
    order_description?: string;
  };
  transaction?: {
    id?: string;
    payment_method?: string;
    transaction_id?: string;
    transaction_status?: string;
    transaction_amount?: string;
    transaction_date?: string;
  };
  customer?: {
    id?: string;
    customer_id?: string;
  };
}

function ackOk() {
  return NextResponse.json({ success: true }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const ipCheck = checkSePayIp(request.headers);
  if (!ipCheck.ok) {
    console.warn('[SePay IPN] Rejected:', ipCheck.reason);
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }

  const configuredSecret = process.env.SEPAY_MERCHANT_SECRET_KEY?.trim();
  if (!configuredSecret) {
    // Không có secret thì bất kỳ ai cũng POST được để tự cộng VIP.
    return NextResponse.json(
      { success: false, message: 'Merchant secret is not configured' },
      { status: 401 },
    );
  }

  const providedSecret = request.headers.get('x-secret-key') || '';
  if (!verifySePayApiKey(providedSecret, configuredSecret)) {
    console.warn('[SePay IPN] Rejected: invalid X-Secret-Key');
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = await request.text();
  let payload: SePayIpnPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const db = await getUsersDb();
    const transactions = db.collection(SEPAY_TRANSACTION_COLLECTION);

    // "Gửi test" từ dashboard gửi payload rỗng/không phải ORDER_PAID — vẫn phải
    // ack 200 để SePay coi endpoint là hợp lệ.
    if (payload.notification_type !== 'ORDER_PAID') {
      return ackOk();
    }

    const transactionId = payload.transaction?.id || payload.transaction?.transaction_id;
    const orderCode = payload.order?.order_invoice_number?.trim().toUpperCase();
    const paidAmount = Math.floor(Number(payload.order?.order_amount || payload.transaction?.transaction_amount || 0));

    if (!transactionId || !orderCode) {
      return ackOk();
    }

    await ensureSparseUniqueIndex(transactions, 'pgTransactionId');

    const now = new Date();
    try {
      await transactions.insertOne({
        provider: 'sepay_pg',
        pgTransactionId: transactionId,
        orderCode,
        gateway: payload.transaction?.payment_method || 'sepay_pg',
        transferType: 'in',
        transferAmount: paidAmount,
        content: payload.order?.order_description || '',
        code: orderCode,
        referenceCode: payload.order?.order_id || '',
        transactionDate: payload.transaction?.transaction_date || '',
        status: 'received',
        receivedAt: now,
        // Bằng chứng đối soát khi có tranh chấp (bank.md mục 6, biện pháp 7).
        rawPayload: rawBody.slice(0, 8_000),
      });
    } catch (error) {
      // Trùng khoá = IPN gửi lại cho giao dịch đã xử lý.
      if ((error as { code?: number }).code === 11000) return ackOk();
      throw error;
    }

    try {
      const order = await db.collection(RECHARGE_ORDER_COLLECTION).findOne({ orderCode });

      if (!order) {
        await transactions.updateOne(
          { pgTransactionId: transactionId },
          { $set: { status: 'unmatched_order_not_found' } },
        );
        return ackOk();
      }

      if (order.status !== 'pending') {
        await transactions.updateOne(
          { pgTransactionId: transactionId },
          { $set: { status: 'duplicate_order_settled', orderId: order._id } },
        );
        return ackOk();
      }

      const requiredAmount = Number(order.amountVnd) || 0;
      const captured =
        payload.order?.order_status === 'CAPTURED' ||
        payload.transaction?.transaction_status === 'APPROVED';

      if (!captured || paidAmount < requiredAmount) {
        await transactions.updateOne(
          { pgTransactionId: transactionId },
          { $set: { status: captured ? 'underpaid' : 'not_captured', requiredAmount, orderId: order._id } },
        );
        return ackOk();
      }

      const credit = await creditRechargeOrder(db, order, {
        confirmedBy: 'sepay-ipn',
        payment: {
          provider: 'sepay_pg',
          pgTransactionId: transactionId,
          orderId: payload.order?.order_id,
          paymentMethod: payload.transaction?.payment_method,
          transferAmount: paidAmount,
          transactionDate: payload.transaction?.transaction_date,
        },
      });

      await transactions.updateOne(
        { pgTransactionId: transactionId },
        {
          $set: {
            status: credit.ok ? 'credited' : `failed_${credit.reason}`,
            orderId: order._id,
            userEmail: order.userEmail,
          },
        },
      );

      return ackOk();
    } catch (error) {
      // Xoá bản ghi để lần gửi lại của SePay được xử lý lại từ đầu.
      await transactions.deleteOne({ pgTransactionId: transactionId }).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error('[SePay IPN] Error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
