import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!session?.user || (session.user as any).role !== "admin") {
    return null;
  }
  return session;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "15")));
    const q = searchParams.get("q")?.trim();
    const role = searchParams.get("role")?.trim();

    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB_NAME || "captainmedia";
    const db = client.db(dbName);
    const usersCol = db.collection("users");

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (q) {
      const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escapedQ, $options: "i" } },
        { username: { $regex: escapedQ, $options: "i" } },
        { email: { $regex: escapedQ, $options: "i" } },
      ];
    }
    if (role && role !== "all") {
      filter.role = role;
    }

    const skip = (page - 1) * limit;

    const [users, total, statsResult] = await Promise.all([
      usersCol
        .find(filter, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      usersCol.countDocuments(filter),
      usersCol
        .aggregate([
          {
            $group: {
              _id: null,
              totalAll: { $sum: 1 },
              totalAdmins: {
                $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] },
              },
              totalGoogle: {
                $sum: { $cond: [{ $eq: ["$authProvider", "google"] }, 1, 0] },
              },
              totalActive: {
                $sum: { $cond: [{ $ne: ["$isActive", false] }, 1, 0] },
              },
            },
          },
        ])
        .toArray(),
    ]);

    const stats = statsResult[0] || {
      totalAll: 0,
      totalAdmins: 0,
      totalGoogle: 0,
      totalActive: 0,
    };

    return NextResponse.json({
      users: users.map((u) => ({
        _id: u._id.toString(),
        name: u.name || u.username || "Thành viên",
        username: u.username || "",
        email: u.email || "",
        role: u.role || "user",
        isActive: u.isActive !== false,
        authProvider: u.authProvider || "credentials",
        avatar: u.avatar || null,
        rank: u.rank || "Phàm Nhân",
        linh_thach: u.linh_thach || 0,
        createdAt: u.createdAt || null,
        updatedAt: u.updatedAt || null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      stats,
    });
  } catch (error) {
    console.error("Admin users GET error:", error);
    return NextResponse.json({ error: "Lỗi tải danh sách người dùng" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { username, email, password, name, role } = body;

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ thông tin" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB_NAME || "captainmedia";
    const db = client.db(dbName);
    const usersCol = db.collection("users");

    const existing = await usersCol.findOne({
      $or: [{ email: cleanEmail }, { username: { $regex: `^${cleanUsername}$`, $options: "i" } }],
    });

    if (existing) {
      return NextResponse.json({ error: "Email hoặc Tên đăng nhập đã tồn tại" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      username: username.trim(),
      email: cleanEmail,
      name: (name && name.trim()) || username.trim(),
      password: hashedPassword,
      role: role === "admin" ? "admin" : "user",
      isActive: true,
      authProvider: "credentials",
      avatar: null,
      linh_thach: 0,
      rank: "Phàm Nhân",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCol.insertOne(newUser);

    return NextResponse.json({
      success: true,
      message: "Tạo người dùng thành công",
      userId: result.insertedId.toString(),
    });
  } catch (error) {
    console.error("Admin user POST error:", error);
    return NextResponse.json({ error: "Lỗi tạo người dùng" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, role, isActive, password, name } = body;

    if (!userId) {
      return NextResponse.json({ error: "Thiếu User ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB_NAME || "captainmedia";
    const db = client.db(dbName);
    const usersCol = db.collection("users");

    const user = await usersCol.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateDoc: Record<string, any> = { updatedAt: new Date() };

    if (role !== undefined) {
      if (user.email === session?.user?.email && role !== "admin") {
        return NextResponse.json({ error: "Bạn không thể tự hạ quyền Admin của chính mình" }, { status: 400 });
      }
      updateDoc.role = role === "admin" ? "admin" : "user";
    }

    if (isActive !== undefined) {
      if (user.email === session?.user?.email && !isActive) {
        return NextResponse.json({ error: "Bạn không thể tự khóa tài khoản của chính mình" }, { status: 400 });
      }
      updateDoc.isActive = Boolean(isActive);
    }

    if (name !== undefined && name.trim()) {
      updateDoc.name = name.trim();
    }

    if (password && password.length >= 6) {
      updateDoc.password = await bcrypt.hash(password, 10);
    }

    await usersCol.updateOne({ _id: new ObjectId(userId) }, { $set: updateDoc });

    return NextResponse.json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Admin user PATCH error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật người dùng" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Thiếu User ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB_NAME || "captainmedia";
    const db = client.db(dbName);
    const usersCol = db.collection("users");

    const user = await usersCol.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    if (user.email === session?.user?.email) {
      return NextResponse.json({ error: "Bạn không thể xóa tài khoản của chính mình" }, { status: 400 });
    }

    await usersCol.deleteOne({ _id: new ObjectId(userId) });

    return NextResponse.json({ success: true, message: "Đã xóa người dùng" });
  } catch (error) {
    console.error("Admin user DELETE error:", error);
    return NextResponse.json({ error: "Lỗi xóa người dùng" }, { status: 500 });
  }
}
