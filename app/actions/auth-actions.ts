'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function authenticate(
  email: string,
  password: string
): Promise<{ error?: string; success?: boolean }> {
  try {
    await signIn('credentials', {
      username: email,
      password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Email hoặc mật khẩu không đúng' };
        default:
          return { error: 'Đã có lỗi xảy ra' };
      }
    }
    throw error;
  }
}

export async function googleSignIn() {
  await signIn('google', { redirectTo: '/' });
}
