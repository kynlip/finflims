// SePay REST API v2 (bank.md mục 5) — tra cứu giao dịch, số dư tài khoản và
// đối soát bù các webhook bị mất.
//
// Chỉ chạy phía server: token nằm trong `SEPAY_API_TOKEN`, lộ ra client là
// người ngoài đọc được toàn bộ lịch sử giao dịch ngân hàng.

const RATE_LIMIT_DELAY_MS = 350; // API giới hạn 3 request/giây.

export interface SePayApiTransaction {
  id: string;
  bank_brand_name?: string;
  account_number?: string;
  transaction_date?: string;
  amount_in?: number | string;
  amount_out?: number | string;
  accumulated?: number | string;
  transaction_content?: string;
  reference_number?: string;
  code?: string | null;
}

export interface SePayBankAccount {
  id?: string | number;
  account_number?: string;
  account_holder_name?: string;
  bank_short_name?: string;
  bank_brand_name?: string;
  accumulated?: number | string;
  last_transaction?: string;
  active?: boolean | number;
}

export interface SePayApiError {
  status: number;
  message: string;
}

export class SePayApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SePayApiRequestError';
  }
}

export function isSePayApiConfigured(): boolean {
  return Boolean(process.env.SEPAY_API_TOKEN?.trim());
}

function apiBaseUrl(): string {
  const configured = process.env.SEPAY_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return process.env.SEPAY_ENV?.trim() === 'sandbox'
    ? 'https://userapi-sandbox.sepay.vn/v2'
    : 'https://userapi.sepay.vn/v2';
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sepayApiGet<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const token = process.env.SEPAY_API_TOKEN?.trim();
  if (!token) throw new SePayApiRequestError(0, 'Chưa cấu hình SEPAY_API_TOKEN');

  const url = new URL(`${apiBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
    // API bên ngoài có thể treo; không đặt timeout thì cả request admin treo theo.
    signal: AbortSignal.timeout(20_000),
  });

  if (response.status === 429) {
    throw new SePayApiRequestError(429, 'Vượt giới hạn 3 request/giây của SePay, thử lại sau ít giây');
  }
  if (response.status === 401 || response.status === 403) {
    throw new SePayApiRequestError(response.status, 'API token SePay không hợp lệ hoặc không đủ quyền');
  }
  if (!response.ok) {
    throw new SePayApiRequestError(response.status, `SePay API lỗi HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

interface TransactionListResponse {
  status?: number;
  messages?: string[];
  data?:
    | SePayApiTransaction[]
    | {
        transactions?: SePayApiTransaction[];
        pagination?: { page?: number; per_page?: number; total?: number };
      };
}

/** SePay trả `data.transactions` hoặc thẳng `data` là mảng tuỳ endpoint/phiên bản. */
function unwrapTransactions(payload: TransactionListResponse): SePayApiTransaction[] {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.transactions)) return data.transactions;
  return [];
}

export interface ListTransactionsOptions {
  page?: number;
  perPage?: number;
  accountNumber?: string;
  /** `YYYY-MM-DD` hoặc `YYYY-MM-DD HH:mm:ss`. */
  fromDate?: string;
  toDate?: string;
  /** Lọc theo chuỗi trong nội dung chuyển khoản, dùng để tìm theo mã đơn. */
  pattern?: string;
}

export async function listSePayTransactions(
  options: ListTransactionsOptions = {},
): Promise<{ transactions: SePayApiTransaction[]; total: number }> {
  const payload = await sepayApiGet<TransactionListResponse>('/transactions/list', {
    page: options.page || 1,
    per_page: Math.min(Math.max(options.perPage || 100, 1), 100),
    account_number: options.accountNumber,
    from_date: options.fromDate,
    to_date: options.toDate,
    transaction_date_from: options.fromDate,
    transaction_date_to: options.toDate,
    pattern: options.pattern,
  });

  const data = payload?.data;
  const total =
    !Array.isArray(data) && typeof data?.pagination?.total === 'number'
      ? data.pagination.total
      : unwrapTransactions(payload).length;

  return { transactions: unwrapTransactions(payload), total };
}

/**
 * Duyệt nhiều trang giao dịch, có nghỉ giữa mỗi trang cho khỏi dính 429.
 *
 * `maxPages` chặn trên để một lần đối soát không kéo dài vô hạn khi khoảng thời
 * gian quét quá rộng.
 */
export async function listSePayTransactionsPaged(
  options: ListTransactionsOptions & { maxPages?: number } = {},
): Promise<SePayApiTransaction[]> {
  const perPage = Math.min(Math.max(options.perPage || 100, 1), 100);
  const maxPages = Math.min(Math.max(options.maxPages || 5, 1), 20);
  const collected: SePayApiTransaction[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const { transactions } = await listSePayTransactions({ ...options, page, perPage });
    collected.push(...transactions);
    if (transactions.length < perPage) break;
    if (page < maxPages) await sleep(RATE_LIMIT_DELAY_MS);
  }

  return collected;
}

interface BankAccountListResponse {
  data?: SePayBankAccount[] | { bank_accounts?: SePayBankAccount[] };
}

export async function listSePayBankAccounts(): Promise<SePayBankAccount[]> {
  const payload = await sepayApiGet<BankAccountListResponse>('/bank-accounts/list');
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.bank_accounts)) return data.bank_accounts;
  return [];
}

export function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
