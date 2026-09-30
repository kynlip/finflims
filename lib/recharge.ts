import { randomBytes } from 'node:crypto';
import { Db, ObjectId, WithId, Document } from 'mongodb';
import { getUsersDb } from '@/lib/db-helpers';
import { getAdFreeStatusFromValue } from '@/lib/ads';

export const RECHARGE_SETTING_TYPE = 'recharge_config';
export const RECHARGE_ORDER_COLLECTION = 'recharge_orders';

export interface RechargePlan {
  id: string;
  name: string;
  priceVnd: number;
  coinAmount: number;
  adFreeDays: number;
  description: string;
}

// Mẫu gói nạp mặc định ban đầu khi database chưa có cấu hình
export const RECHARGE_PLANS: RechargePlan[] = [
  {
    id: 'ad_free_30',
    name: 'Gói 30K',
    priceVnd: 30_000,
    coinAmount: 30,
    adFreeDays: 30,
    description: 'Bỏ quảng cáo toàn website trong 30 ngày',
  },
  {
    id: 'ad_free_180',
    name: 'Gói 150K',
    priceVnd: 150_000,
    coinAmount: 150,
    adFreeDays: 180,
    description: 'Bỏ quảng cáo toàn website trong 180 ngày',
  },
  {
    id: 'ad_free_365',
    name: 'Gói 250K',
    priceVnd: 250_000,
    coinAmount: 250,
    adFreeDays: 365,
    description: 'Bỏ quảng cáo toàn website trong 365 ngày',
  },
];

export const QR_TEMPLATES = ['compact', 'qronly', 'standee'] as const;
export type QrTemplate = (typeof QR_TEMPLATES)[number];

function normalizeQrTemplate(value: unknown): QrTemplate {
  return QR_TEMPLATES.includes(value as QrTemplate) ? (value as QrTemplate) : 'compact';
}

/** Chỉ giữ chữ số để so khớp số tài khoản viết kèm dấu cách / gạch. */
function digitsOnly(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D+/g, '') : '';
}

/**
 * Kiểm tra tiền có vào đúng tài khoản của website không.
 */
export function isReceivingAccount(config: RechargeConfig, accountNumber: unknown): boolean {
  const expected = digitsOnly(config.accountNumber);
  if (!expected) return true;
  const actual = digitsOnly(accountNumber);
  if (!actual) return false;
  return actual === expected || actual.includes(expected) || expected.includes(actual);
}

export interface RechargeConfig {
  enabled: boolean;
  method: 'bank_transfer';
  bankName: string;
  /** Short name / BIN dùng cho ảnh VietQR động, vd `MBBank` hoặc `970422`. */
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  qrImageUrl: string;
  transferPrefix: string;
  /** Bố cục ảnh VietQR động (`template` của vietqr.app). */
  qrTemplate: QrTemplate;
  /** Hiện số tài khoản đầy đủ dưới ảnh QR (`showinfo` + `fullacc`). */
  showAccountInfo: boolean;
  plans: RechargePlan[];
}

const DEFAULT_RECHARGE_CONFIG: RechargeConfig = {
  enabled: true,
  method: 'bank_transfer',
  bankName: '',
  bankCode: '',
  accountNumber: '',
  accountHolder: '',
  qrImageUrl: '',
  transferPrefix: 'PHH',
  qrTemplate: 'compact',
  showAccountInfo: true,
  plans: RECHARGE_PLANS,
};

function compactPrice(priceVnd: number): string {
  return priceVnd % 1000 === 0
    ? `${priceVnd / 1000}K`
    : `${priceVnd.toLocaleString('vi-VN')}đ`;
}

/**
 * Chuẩn hóa danh sách gói nạp ĐỘNG hoàn toàn từ DB, không ép theo danh sách hardcoded.
 */
export function normalizePlans(value: unknown): RechargePlan[] {
  if (!Array.isArray(value) || value.length === 0) return RECHARGE_PLANS;

  const validPlans: RechargePlan[] = [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (!item || typeof item !== 'object') continue;
    const p = item as Record<string, unknown>;

    const id =
      typeof p.id === 'string' && p.id.trim()
        ? p.id.trim()
        : `plan_${Date.now()}_${i}`;
    const priceVnd = Number(p.priceVnd);
    const coinAmount = Number(p.coinAmount);
    const adFreeDays = Number(p.adFreeDays ?? 0);

    const safePrice = Number.isInteger(priceVnd) && priceVnd >= 0 ? priceVnd : 10_000;
    const safeCoins = Number.isInteger(coinAmount) && coinAmount >= 0 ? coinAmount : 10;
    const safeDays = Number.isInteger(adFreeDays) && adFreeDays >= 0 ? adFreeDays : 0;

    const name =
      typeof p.name === 'string' && p.name.trim()
        ? p.name.trim()
        : `Gói ${compactPrice(safePrice)}`;
    const description =
      typeof p.description === 'string' && p.description.trim()
        ? p.description.trim()
        : safeDays > 0
        ? `Bỏ quảng cáo toàn website trong ${safeDays} ngày`
        : `Nhận ${safeCoins} coin`;

    validPlans.push({
      id,
      name,
      priceVnd: safePrice,
      coinAmount: safeCoins,
      adFreeDays: safeDays,
      description,
    });
  }

  return validPlans.length > 0 ? validPlans : RECHARGE_PLANS;
}

function envOrEmpty(name: string): string {
  return process.env[name]?.trim() || '';
}

export async function getRechargeConfig(db?: Db): Promise<RechargeConfig> {
  const database = db || (await getUsersDb());
  const stored = await database
    .collection('settings')
    .findOne({ type: RECHARGE_SETTING_TYPE });

  return {
    enabled: stored?.enabled ?? DEFAULT_RECHARGE_CONFIG.enabled,
    method: 'bank_transfer',
    bankName: stored?.bankName || envOrEmpty('TOPUP_BANK_NAME'),
    bankCode:
      stored?.bankCode ||
      envOrEmpty('TOPUP_BANK_CODE') ||
      stored?.bankName ||
      envOrEmpty('TOPUP_BANK_NAME'),
    accountNumber: stored?.accountNumber || envOrEmpty('TOPUP_BANK_ACCOUNT'),
    accountHolder: stored?.accountHolder || envOrEmpty('TOPUP_BANK_ACCOUNT_NAME'),
    qrImageUrl: stored?.qrImageUrl || envOrEmpty('TOPUP_BANK_QR_URL'),
    transferPrefix:
      stored?.transferPrefix?.trim() ||
      envOrEmpty('TOPUP_TRANSFER_PREFIX') ||
      DEFAULT_RECHARGE_CONFIG.transferPrefix,
    qrTemplate: normalizeQrTemplate(stored?.qrTemplate),
    showAccountInfo: stored?.showAccountInfo ?? DEFAULT_RECHARGE_CONFIG.showAccountInfo,
    plans: normalizePlans(stored?.plans),
  };
}

export function isRechargeConfigured(config: RechargeConfig): boolean {
  return Boolean(
    config.enabled &&
      config.bankName.trim() &&
      config.accountNumber.trim() &&
      config.accountHolder.trim(),
  );
}

export function getRechargePlan(
  planId: unknown,
  plans: RechargePlan[] = RECHARGE_PLANS,
): RechargePlan | null {
  if (typeof planId !== 'string') return null;
  return plans.find((plan) => plan.id === planId) || null;
}

/**
 * Mã đơn dùng luôn làm nội dung chuyển khoản.
 */
export function buildOrderCode(prefix: string): string {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = randomBytes(8);
  let suffix = '';
  for (const byte of bytes) {
    suffix += alphabet[byte % alphabet.length];
  }
  const normalizedPrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PHH';
  return `${normalizedPrefix}${suffix}`;
}

export function serializeRechargeConfig(config: RechargeConfig) {
  return {
    ...config,
    configured: isRechargeConfigured(config),
  };
}

/* ========================================================================== */
/* CREDIT & ENTITLEMENT LOGIC (Gộp từ recharge-credit.ts)                     */
/* ========================================================================== */

export interface CreditResult {
  ok: boolean;
  /** `already_processed` khi đơn không còn ở trạng thái pending. */
  reason?: 'invalid_order' | 'user_not_found' | 'already_processed';
  adFreeUntil?: Date;
}

export interface CreditOptions {
  confirmedBy: string;
  adminNote?: string;
  /** Thông tin giao dịch ngân hàng khi đơn được xác nhận tự động qua SePay. */
  payment?: Record<string, unknown>;
}

/**
 * Cộng coin + gia hạn VIP cho một đơn nạp đang chờ.
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
    orderCoins < 0 ||
    orderDays < 0 ||
    orderDays > 3_650
  ) {
    return { ok: false, reason: 'invalid_order' };
  }

  const userFilter = ObjectId.isValid(String(order.userId))
    ? { _id: new ObjectId(String(order.userId)) }
    : { email: order.userEmail };
  const user = await db.collection('users').findOne(userFilter);
  if (!user) return { ok: false, reason: 'user_not_found' };

  const now = new Date();
  let adFreeUntil = user.adFreeUntil ? new Date(user.adFreeUntil) : undefined;

  if (orderDays > 0) {
    const currentAdFree = getAdFreeStatusFromValue(user.adFreeUntil, now);
    const currentUntil =
      currentAdFree.active && currentAdFree.until ? new Date(currentAdFree.until) : now;
    adFreeUntil = new Date(currentUntil.getTime() + orderDays * 24 * 60 * 60 * 1000);
  }

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

  const userUpdates: Record<string, unknown> = {
    updatedAt: now,
  };
  if (adFreeUntil) {
    userUpdates.adFreeUntil = adFreeUntil;
  }

  await db.collection('users').updateOne(userFilter, {
    ...(orderCoins > 0 ? { $inc: { linh_thach: orderCoins } } : {}),
    $set: userUpdates,
  });

  return { ok: true, adFreeUntil };
}

export interface DirectCreditOptions {
  userEmailOrId: string;
  coinAmount: number;
  adFreeDays?: number;
  adminNote?: string;
  confirmedBy: string;
}

/**
 * Admin tự cộng coin / VIP trực tiếp cho khách hàng (không cần đơn SePay).
 * Tự tạo 1 bản ghi đơn nạp với status 'confirmed' để lưu vết và thống kê đầy đủ.
 */
export async function creditUserDirectly(
  db: Db,
  options: DirectCreditOptions,
): Promise<{ ok: boolean; reason?: string; userEmail?: string; newCoins?: number; adFreeUntil?: Date }> {
  const coins = Math.max(0, Math.floor(Number(options.coinAmount) || 0));
  const days = Math.max(0, Math.floor(Number(options.adFreeDays) || 0));

  if (coins <= 0 && days <= 0) {
    return { ok: false, reason: 'Số coin hoặc số ngày VIP phải lớn hơn 0' };
  }

  const query = options.userEmailOrId.trim();
  const userFilter = ObjectId.isValid(query)
    ? { _id: new ObjectId(query) }
    : { $or: [{ email: query }, { username: query }] };

  const user = await db.collection('users').findOne(userFilter);
  if (!user) {
    return { ok: false, reason: 'Không tìm thấy tài khoản người dùng' };
  }

  const now = new Date();
  let adFreeUntil: Date | undefined = undefined;

  if (days > 0) {
    const currentAdFree = getAdFreeStatusFromValue(user.adFreeUntil, now);
    const currentUntil =
      currentAdFree.active && currentAdFree.until ? new Date(currentAdFree.until) : now;
    adFreeUntil = new Date(currentUntil.getTime() + days * 24 * 60 * 60 * 1000);
  }

  // 1. Cập nhật user
  const userUpdates: Record<string, unknown> = {
    updatedAt: now,
  };
  if (adFreeUntil) {
    userUpdates.adFreeUntil = adFreeUntil;
  }

  await db.collection('users').updateOne(
    { _id: user._id },
    {
      ...(coins > 0 ? { $inc: { linh_thach: coins } } : {}),
      $set: userUpdates,
    },
  );

  // 2. Tạo đơn nạp thủ công để lưu lịch sử
  const orderCode = `MANUAL${randomBytes(4).toString('hex').toUpperCase()}`;
  await db.collection(RECHARGE_ORDER_COLLECTION).insertOne({
    orderCode,
    userId: String(user._id),
    userEmail: user.email,
    planId: 'manual_admin',
    planName: `Admin cộng tay (+${coins} coin${days > 0 ? `, ${days} ngày VIP` : ''})`,
    amountVnd: 0,
    coinAmount: coins,
    adFreeDays: days,
    transferReference: orderCode,
    status: 'confirmed',
    adminNote: options.adminNote || 'Admin cộng trực tiếp',
    createdAt: now,
    confirmedAt: now,
    confirmedBy: options.confirmedBy,
  });

  const updatedUser = await db.collection('users').findOne({ _id: user._id });
  return {
    ok: true,
    userEmail: user.email,
    newCoins: updatedUser?.linh_thach || 0,
    adFreeUntil,
  };
}
