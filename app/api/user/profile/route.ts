import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUsersDb } from '@/lib/db-helpers';
import { ObjectId } from 'mongodb';
import { getAdFreeStatusFromValue } from '@/lib/ads';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = await getUsersDb();
    const usersCollection = db.collection('users');
    const userEmail = session.user.email.toLowerCase().trim();

    // Find user by email
    const user = await usersCollection.findOne({ 
      email: userEmail 
    });

    if (!user) {
      return NextResponse.json({
        id: 'user-default',
        username: session.user.name || 'User',
        email: session.user.email,
        avatar: session.user.image || null,
        role: 'user',
        hasPassword: false,
        authProvider: 'google',
        createdAt: new Date().toISOString(),
        favoritesCount: 0,
        watchHistoryCount: 0,
        linh_thach: 0,
        adFreeUntil: null,
        isAdFree: false,
      });
    }

    // Get favorites count
    const favoritesCollection = db.collection('yeuthich');
    const favoritesCount = await favoritesCollection.countDocuments({
      $or: [{ userEmail: userEmail }, { userId: user._id.toString() }],
    });

    // Get watch history count
    const historyCollection = db.collection('lichsu');
    const watchHistoryCount = await historyCollection.countDocuments({
      $or: [{ userEmail: userEmail }, { userId: user._id.toString() }],
    });

    // Extract createdAt
    let createdAt = user.createdAt;
    if (!createdAt && user._id instanceof ObjectId) {
      createdAt = user._id.getTimestamp();
    }

    return NextResponse.json({
      id: user._id.toString(),
      username: user.username || user.name || 'User',
      email: user.email,
      name: user.name || user.username || 'Thành viên',
      role: user.role || 'user',
      hasPassword: Boolean(user.password),
      authProvider: user.authProvider || 'credentials',
      avatar: user.avatar || user.image || session.user.image || null,
      createdAt: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
      favoritesCount,
      watchHistoryCount,
      linh_thach: Number(user.linh_thach || 0),
      adFreeUntil: getAdFreeStatusFromValue(user.adFreeUntil).until,
      isAdFree: getAdFreeStatusFromValue(user.adFreeUntil).active,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
