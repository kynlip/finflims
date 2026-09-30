/**
 * CONSOLIDATED AUTH MODULE - Google OAuth Only
 * 
 * Gộp tất cả authentication logic vào một file duy nhất.
 * Tuân thủ Vercel Best Practices & Captain Media Ecosystem Standard.
 * 
 * ⚠️ QUAN TRỌNG: Site chỉ dùng Google OAuth (NextAuth)
 * - Không có email + password authentication
 * - Không có Legacy JWT
 * - Đơn giản, bảo mật, dễ maintain
 * 
 * Sections:
 * 1. Session Helpers (NextAuth)
 * 2. Response Helpers
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";

// =============================================
// SECTION 1: Session Helpers (NextAuth)
// =============================================

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name?: string;
    image?: string;
    role?: "user" | "admin";
  };
  expires: string;
}

/**
 * Get current authenticated session
 * Returns null if not authenticated
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const session = await auth();
  if (!session?.user?.email) {
    return null;
  }
  return session as AuthSession;
}

/**
 * Check if session user is admin
 */
export function isAdmin(session: AuthSession | null): boolean {
  return session?.user?.role === "admin";
}

/**
 * Require authenticated user middleware helper
 * Usage: 
 *   const result = await requireAuth();
 *   if ("error" in result) return result.error;
 */
export async function requireAuth(): Promise<{ session: AuthSession } | { error: NextResponse }> {
  const session = await getAuthSession();
  if (!session) {
    return { error: unauthorizedResponse() };
  }
  return { session };
}

/**
 * Require admin role middleware helper
 * Usage:
 *   const result = await requireAdmin();
 *   if ("error" in result) return result.error;
 */
export async function requireAdmin(): Promise<{ session: AuthSession } | { error: NextResponse }> {
  const authResult = await requireAuth();
  if ("error" in authResult) {
    return authResult;
  }
  
  if (!isAdmin(authResult.session)) {
    return { error: forbiddenResponse() };
  }
  
  return { session: authResult.session };
}

// =============================================
// SECTION 2: Response Helpers
// =============================================

/**
 * Standard 401 Unauthorized response
 */
export function unauthorizedResponse(message = "Unauthorized - Please login") {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Standard 403 Forbidden response
 */
export function forbiddenResponse(message = "Forbidden - Admin access required") {
  return NextResponse.json({ error: message }, { status: 403 });
}
