import { NextRequest, NextResponse } from 'next/server';
import type { Collection, Db, Document } from 'mongodb';
import { getUsersDb } from '@/lib/db-helpers';
import {
  getRechargeConfig,
  isReceivingAccount,
  RECHARGE_ORDER_COLLECTION,
  creditRechargeOrder,
} from '@/lib/recharge';
import {
  checkSePayIp,
  ensureSparseUniqueIndex,
  extractOrderCode,
  SEPAY_TRANSACTION_COLLECTION,
  SePayWebhookPayload,
  verifySePayApiKey,
  verifySePaySignature,
} from '@/lib/sepay';

export const dynamic = 'force-dynamic';

// SePay chỉ coi là thành công khi nhận đúng HTTP 200/201 kèm body {"success": true}.
// Mọi phản hồi khác đều kích hoạt retry theo lịch Fibonacci (tối đa 8 lần / ~33 phút).
const ACK = { success: true } as const;

function ackOk() {
  return NextResponse.json(ACK, { status: 200 });
}

function authorize(request: NextRequest, rawBody: string): { ok: true } | { ok: false; reason: string } {
  const secret = process.env.SEPAY_WEBHOOK_SECRET?.trim();
  const apiKey = process.env.SEPAY_WEBHOOK_API_KEY?.trim();

  if (secret) {
    return verifySePaySignature(
      rawBody,
      request.headers.get('x-sepay-signature') || '',
      request.headers.get('x-sepay-timestamp') || '',
      secret,
    );
  }

  if (apiKey) {
    const header = request.headers.get('authorization') || '';
    const provided = header.replace(/^Apikey\s+/i, '').replace(/^Bearer\s+/i, '').trim();
    return verifySePayApiKey(provided, apiKey)
      ? { ok: true }
      : { ok: false, reason: 'Invalid API key' };
  }

  // Không cấu hình bí mật nào = ai cũng POST được và tự cộng VIP cho mình.
  return { ok: false, reason: 'Webhook secret is not configured' };
}

export async function POST(request: NextRequest) {
  // Phải đọc raw body: JSON.parse rồi stringify lại sẽ làm sai chữ ký HMAC.
  const rawBody = await request.text();

  // Lớp 1: allowlist IP (bank.md mục 6). Đặt trước xác thực chữ ký để request
  // rác không tốn công tính HMAC.
  const ipCheck = checkSePayIp(request.headers);
  if (!ipCheck.ok) {
    console.warn('[SePay Webhook] Rejected:', ipCheck.reason);
    return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
  }

  const auth = authorize(request, rawBody);
  if (!auth.ok) {
    console.warn('[SePay Webhook] Rejected:', auth.reason);
    return NextResponse.json({ success: false, message: auth.reason }, { status: 401 });
  }

  let payload: SePayWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
  }

  const sepayId = Number(payload?.id);
  if (!Number.isFinite(sepayId)) {
    return NextResponse.json({ success: false, message: 'Missing transaction id' }, { status: 400 });
  }

  try {
    const db = await getUsersDb();
    const transactions = db.collection(SEPAY_TRANSACTION_COLLECTION);
    await ensureSparseUniqueIndex(transactions, 'sepayId');

    const now = new Date();
    const baseRecord = {
      sepayId,
      gateway: payload.gateway,
      transactionDate: payload.transactionDate,
      accountNumber: payload.accountNumber,
      subAccount: payload.subAccount,
      code: payload.code,
      content: payload.content,
      transferType: payload.transferType,
      transferAmount: Number(payload.transferAmount) || 0,
      referenceCode: payload.referenceCode,
      receivedAt: now,
      // Giữ nguyên chuỗi gốc làm bằng chứng đối soát khi có tranh chấp
      // (bank.md mục 6, biện pháp 7). Cắt bớt để một payload bất thường không
      // thổi phồng document.
      rawPayload: rawBody.slice(0, 8_000),
    };

    // Idempotency: `id` của SePay bất biến qua mọi lần retry/replay. Ghi trước,
    // trùng khoá = đã xử lý rồi thì chỉ cần ack lại.
    try {
      await transactions.insertOne({ ...baseRecord, status: 'received' });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return ackOk();
      }
      throw error;
    }

    try {
      return await processTransaction(db, transactions, payload, sepayId);
    } catch (error) {
      // Xoá bản ghi vừa chèn: nếu giữ lại, lần retry sau sẽ trúng khoá trùng và
      // được ack ngay dù giao dịch chưa hề được cộng tiền.
      await transactions.deleteOne({ sepayId }).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error('[SePay Webhook] Error:', error);
    // Trả 500 để SePay retry — giao dịch chưa được ghi nhận trọn vẹn.
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

async function processTransaction(
  db: Db,
  transactions: Collection<Document>,
  payload: SePayWebhookPayload,
  sepayId: number,
) {
    if (payload.transferType !== 'in') {
      await transactions.updateOne({ sepayId }, { $set: { status: 'ignored_outgoing' } });
      return ackOk();
    }

    const config = await getRechargeConfig(db);

    // Tiền phải vào đúng tài khoản của website, không thì chỉ ghi log cảnh báo
    // (bank.md mục 6, biện pháp 6).
    if (!isReceivingAccount(config, payload.accountNumber)) {
      await transactions.updateOne({ sepayId }, { $set: { status: 'wrong_account' } });
      return ackOk();
    }

    const orderCode = extractOrderCode(payload, config.transferPrefix);
    if (!orderCode) {
      await transactions.updateOne({ sepayId }, { $set: { status: 'unmatched_no_code' } });
      return ackOk();
    }

    const order = await db
      .collection(RECHARGE_ORDER_COLLECTION)
      .findOne({ orderCode });

    if (!order) {
      await transactions.updateOne(
        { sepayId },
        { $set: { status: 'unmatched_order_not_found', orderCode } },
      );
      return ackOk();
    }

    if (order.status !== 'pending') {
      await transactions.updateOne(
        { sepayId },
        { $set: { status: 'duplicate_order_settled', orderCode, orderId: order._id } },
      );
      return ackOk();
    }

    // Chuyển thiếu tiền thì giữ đơn chờ để admin xử lý tay, không cộng VIP.
    const paidAmount = Number(payload.transferAmount) || 0;
    const requiredAmount = Number(order.amountVnd) || 0;
    if (paidAmount < requiredAmount) {
      await transactions.updateOne(
        { sepayId },
        {
          $set: {
            status: 'underpaid',
            orderCode,
            orderId: order._id,
            requiredAmount,
          },
        },
      );
      return ackOk();
    }

    const credit = await creditRechargeOrder(db, order, {
      confirmedBy: 'sepay-webhook',
      payment: {
        provider: 'sepay',
        sepayId,
        gateway: payload.gateway,
        referenceCode: payload.referenceCode,
        transferAmount: paidAmount,
        transactionDate: payload.transactionDate,
      },
    });

    await transactions.updateOne(
      { sepayId },
      {
        $set: {
          status: credit.ok ? 'credited' : `failed_${credit.reason}`,
          orderCode,
          orderId: order._id,
          userEmail: order.userEmail,
        },
      },
    );

    return ackOk();
}
