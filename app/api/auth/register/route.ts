import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { verifyTurnstileToken } from '@/lib/turnstile';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, name, turnstileToken } = body;

    // Verify Turnstile Token if present
    if (process.env.TURNSTILE_SECRET_KEY && turnstileToken) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
      const isTurnstileValid = await verifyTurnstileToken(turnstileToken, ip);
      if (!isTurnstileValid) {
        return NextResponse.json(
          { error: 'Xác thực bảo mật Cloudflare không hợp lệ. Vui lòng thử lại.' },
          { status: 400 }
        );
      }
    }

    // Validate inputs
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { error: 'Tên đăng nhập phải có ít nhất 3 ký tự' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email không hợp lệ' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const displayName = (name && typeof name === 'string' && name.trim()) || username.trim();

    // Check username format (letters, numbers, underscore)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) {
      return NextResponse.json(
        { error: 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới (3-30 ký tự)' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB_NAME || 'captainmedia';
    const db = client.db(dbName);
    const usersCol = db.collection('users');

    // Check existing email
    const existingEmail = await usersCol.findOne({ email: cleanEmail });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email này đã được đăng ký' },
        { status: 409 }
      );
    }

    // Check existing username
    const existingUser = await usersCol.findOne({
      username: { $regex: `^${cleanUsername}$`, $options: 'i' },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Tên đăng nhập này đã được sử dụng' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const newUser = {
      username: username.trim(),
      email: cleanEmail,
      name: displayName,
      password: hashedPassword,
      role: 'user',
      isActive: true,
      authProvider: 'credentials',
      avatar: null,
      linh_thach: 0,
      rank: 'Phàm Nhân',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCol.insertOne(newUser);

    return NextResponse.json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      userId: result.insertedId.toString(),
    });
  } catch (error) {
    console.error('Registration error:', error);
    const msg = error instanceof Error ? error.message : 'Đã có lỗi xảy ra khi đăng ký';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
