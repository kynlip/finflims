// SePay — mô hình Webhook biến động số dư (bank.md, mục 2 & 4).
//
// Tiền chuyển thẳng vào tài khoản ngân hàng của website, SePay chỉ bắn webhook
// báo có tiền vào. Không có bước redirect sang cổng thanh toán nào cả.

import crypto from 'node:crypto';

export const SEPAY_TRANSACTION_COLLECTION = 'sepay_transactions';

export interface SePayWebhookPayload {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount: string;
  code: string | null;
  content: string;
  transferType: 'in' | 'out';
  description: string;
  transferAmount: number;
  accumulated: number;
  referenceCode: string;
}

export type WebhookAuthResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Xác minh chữ ký HMAC-SHA256 của SePay.
 *
 * StringToSign = `${timestamp}.${rawBody}` với rawBody là chuỗi gốc chưa parse.
 * Parse rồi stringify lại sẽ đổi thứ tự key / escape unicode → sai chữ ký.
 */
export function verifySePaySignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  secret: string,
  now = Date.now(),
): WebhookAuthResult {
  if (!signature || !timestamp) {
    return { ok: false, reason: 'Missing signature headers' };
  }

  // Chống replay: lệch quá 5 phút thì từ chối.
  const requestTime = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(requestTime)) {
    return { ok: false, reason: 'Invalid timestamp' };
  }
  if (Math.abs(Math.floor(now / 1000) - requestTime) > 300) {
    return { ok: false, reason: 'Timestamp outside 5 minute window' };
  }

  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')}`;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== providedBuffer.length) {
    return { ok: false, reason: 'Signature mismatch' };
  }
  if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    return { ok: false, reason: 'Signature mismatch' };
  }

  return { ok: true };
}

/** So sánh API key theo kiểu constant-time (phương thức xác thực API Key). */
export function verifySePayApiKey(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * Lấy mã đơn từ webhook.
 *
 * SePay tự bóc tách vào trường `code` khi admin đã cấu hình mẫu mã thanh toán.
 * Nếu chưa cấu hình, `code` là null nên phải tự quét nội dung chuyển khoản —
 * ngân hàng thường viết hoa và chèn thêm chữ nên chuẩn hoá trước khi so khớp.
 */
export function extractOrderCode(
  payload: Pick<SePayWebhookPayload, 'code' | 'content' | 'description'>,
  prefix: string,
): string | null {
  const normalizedPrefix = prefix.trim().toUpperCase();
  if (!normalizedPrefix) return null;

  const candidates = [payload.code, payload.content, payload.description];
  const pattern = new RegExp(`${normalizedPrefix}[0-9A-Z]{4,30}`);

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate) continue;
    const normalized = candidate.toUpperCase().replace(/[^0-9A-Z]+/g, ' ');
    for (const token of normalized.split(' ')) {
      const match = token.match(pattern);
      if (match) return match[0];
    }
  }

  return null;
}

export interface VietQrOptions {
  accountNumber: string;
  bankCode: string;
  amountVnd: number;
  content: string;
  accountHolder?: string;
  template?: 'compact' | 'qronly' | 'standee';
  /** `showinfo` — in số tài khoản dưới ảnh QR. */
  showInfo?: boolean;
  /** `fullacc` — hiện số tài khoản đầy đủ thay vì che sao. Chỉ có tác dụng khi `showInfo`. */
  fullAccount?: boolean;
  /** `store` — tên cửa hàng, chỉ hiển thị trên mẫu `standee`. */
  storeName?: string;
}

/** Ảnh VietQR động (bank.md mục 4) — số tiền và nội dung nhúng sẵn trong mã. */
export function buildVietQrUrl(options: VietQrOptions): string {
  const params = new URLSearchParams({
    acc: options.accountNumber.trim(),
    bank: options.bankCode.trim(),
    amount: String(Math.round(options.amountVnd)),
    des: options.content.trim(),
    template: options.template || 'compact',
  });

  if (options.accountHolder?.trim()) {
    params.set('holder', options.accountHolder.trim().toUpperCase());
  }
  if (options.showInfo) {
    params.set('showinfo', 'true');
    if (options.fullAccount !== false) params.set('fullacc', 'true');
  }
  if (options.storeName?.trim()) {
    params.set('store', options.storeName.trim());
  }

  return `https://vietqr.app/img?${params.toString()}`;
}

/**
 * Dải IP mà SePay dùng để gọi Webhook & IPN (bank.md mục 6).
 *
 * Dùng cho lớp chặn ở tầng ứng dụng khi không đặt được allowlist ở Nginx /
 * Cloudflare. Danh sách này SePay có thể đổi nên chỉ bật khi thật sự cần.
 */
export const SEPAY_IPV4_ALLOWLIST = [
  '172.236.138.20',
  '172.233.83.68',
  '171.244.35.2',
  '151.158.108.68',
  '151.158.109.79',
  '103.255.238.139',
] as const;

export const SEPAY_IPV6_ALLOWLIST = [
  '2400:8905::2000:8cff:fe98:45cd',
  '2600:3c15::2000:8aff:fedd:874b',
] as const;

/** Chuẩn hoá IPv6 rút gọn và dạng IPv4-mapped (`::ffff:1.2.3.4`) về một chuỗi so sánh được. */
function normalizeIp(value: string): string {
  const trimmed = value.trim().toLowerCase().replace(/^\[|\]$/g, '');
  const mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return mapped[1];
  if (!trimmed.includes(':')) return trimmed;

  // Bung `::` thành đủ 8 nhóm rồi bỏ số 0 thừa để `2400:8905::2000` khớp với
  // `2400:8905:0:0:0:0:0:2000` mà SePay có thể gửi ở dạng đầy đủ.
  const [head, tail] = trimmed.split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  const groups = trimmed.includes('::')
    ? [
        ...headParts,
        ...Array(Math.max(0, 8 - headParts.length - tailParts.length)).fill('0'),
        ...tailParts,
      ]
    : trimmed.split(':');

  return groups.map((group) => group.replace(/^0+(?=.)/, '')).join(':');
}

/**
 * Lấy IP thật của client từ header proxy.
 *
 * `x-forwarded-for` là chuỗi `client, proxy1, proxy2` nên phần tử đầu tiên mới
 * là IP gọi tới; các phần tử sau do proxy tự thêm.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return (
    headers.get('cf-connecting-ip') ||
    headers.get('x-real-ip') ||
    ''
  ).trim();
}

export function isSePayIp(ip: string): boolean {
  if (!ip) return false;
  const normalized = normalizeIp(ip);
  return [...SEPAY_IPV4_ALLOWLIST, ...SEPAY_IPV6_ALLOWLIST].some(
    (allowed) => normalizeIp(allowed) === normalized,
  );
}

/**
 * Kiểm tra allowlist IP ở tầng ứng dụng.
 *
 * Mặc định TẮT: sau Cloudflare/Nginx header có thể bị viết lại và bật nhầm sẽ
 * chặn sạch webhook, mất đơn. Bật bằng `SEPAY_ENFORCE_IP_WHITELIST=true` sau khi
 * đã xác minh IP đọc được là IP thật của SePay (xem log `[SePay] IP`).
 */
export function checkSePayIp(headers: Headers): WebhookAuthResult {
  if (process.env.SEPAY_ENFORCE_IP_WHITELIST?.trim().toLowerCase() !== 'true') {
    return { ok: true };
  }
  const ip = getClientIp(headers);
  return isSePayIp(ip) ? { ok: true } : { ok: false, reason: `IP not allowed: ${ip || 'unknown'}` };
}

/**
 * Tạo unique index sparse cho một khoá định danh giao dịch.
 *
 * Ba luồng ghi vào `sepay_transactions` dùng ba khoá khác nhau (`sepayId` cho
 * webhook, `pgTransactionId` cho IPN, `apiTransactionId` cho đối soát), mỗi
 * document chỉ có một trong ba. Unique index KHÔNG sparse sẽ coi trường thiếu
 * là `null` và chỉ cho phép đúng một document như vậy trong cả collection —
 * các giao dịch sau ném E11000, bị hiểu nhầm là trùng lặp và không được cộng
 * tiền. Vì vậy mọi index ở đây bắt buộc phải sparse.
 *
 * MongoDB không đổi option của index đã tồn tại, nên gặp xung đột thì phải drop
 * rồi tạo lại (index cũ `{ sepayId: 1 }` non-sparse trên production).
 */
export async function ensureSparseUniqueIndex(
  collection: {
    createIndex: (spec: Record<string, 1>, options: Record<string, boolean>) => Promise<string>;
    dropIndex: (name: string) => Promise<unknown>;
  },
  field: string,
): Promise<void> {
  const spec: Record<string, 1> = { [field]: 1 };
  const options = { unique: true, sparse: true };
  try {
    await collection.createIndex(spec, options);
  } catch (error) {
    // 85 = IndexOptionsConflict, 86 = IndexKeySpecsConflict: index cùng khoá đã
    // tồn tại với option khác.
    const code = (error as { code?: number }).code;
    if (code !== 85 && code !== 86) return;
    try {
      await collection.dropIndex(`${field}_1`);
      await collection.createIndex(spec, options);
    } catch {
      // Không drop được (quyền hạn, race với tiến trình khác) thì bỏ qua: khoá
      // trùng vẫn được xử lý ở tầng gọi.
    }
  }
}
