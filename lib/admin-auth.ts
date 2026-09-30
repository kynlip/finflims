import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export interface AdminAuthResult {
  isAuthorized: boolean;
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
  errorResponse?: NextResponse;
}

/**
 * Kiểm tra quyền Admin chặt chẽ cho toàn bộ API routes quản trị.
 * Trả về `isAuthorized: false` và `errorResponse` (401 hoặc 403) nếu người dùng
 * chưa đăng nhập hoặc không có quyền `role === 'admin'`.
 */
export async function verifyAdminAuth(): Promise<AdminAuthResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      isAuthorized: false,
      errorResponse: NextResponse.json(
        { success: false, error: 'Unauthorized: Bạn cần đăng nhập để truy cập' },
        { status: 401 }
      ),
    };
  }

  // @ts-expect-error - role is custom field on session.user
  const userRole = session.user.role;
  if (userRole !== 'admin') {
    return {
      isAuthorized: false,
      errorResponse: NextResponse.json(
        { success: false, error: 'Forbidden: Bạn không có quyền Quản trị viên (Admin)' },
        { status: 403 }
      ),
    };
  }

  return {
    isAuthorized: true,
    user: session.user,
  };
}
