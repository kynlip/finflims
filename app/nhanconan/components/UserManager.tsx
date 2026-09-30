"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  UserCheck,
  UserX,
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Globe,
  KeyRound,
  AlertCircle,
  X,
  Users,
} from "lucide-react";

interface UserItem {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: "admin" | "user";
  isActive: boolean;
  authProvider: "credentials" | "google";
  avatar: string | null;
  rank?: string;
  linh_thach?: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface UserStats {
  totalAll: number;
  totalAdmins: number;
  totalGoogle: number;
  totalActive: number;
}

interface UserManagerProps {
  isDark?: boolean;
}

export default function UserManager({ isDark = true }: UserManagerProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [stats, setStats] = useState<UserStats>({
    totalAll: 0,
    totalAdmins: 0,
    totalGoogle: 0,
    totalActive: 0,
  });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    name: "",
    password: "",
    role: "user" as "admin" | "user",
  });
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  const fetchUsers = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "15",
        });
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        if (selectedRole && selectedRole !== "all") params.set("role", selectedRole);

        const res = await fetch(`/api/admin/users?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
          setCurrentPage(data.page || 1);
          if (data.stats) setStats(data.stats);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, selectedRole],
  );

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const handleToggleActive = async (user: UserItem) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          isActive: !user.isActive,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, isActive: !u.isActive } : u)),
        );
        fetchUsers(currentPage);
      } else {
        alert(data.error || "Không thể cập nhật trạng thái");
      }
    } catch {
      alert("Đã xảy ra lỗi khi cập nhật");
    }
  };

  const handleToggleRole = async (user: UserItem) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    if (!confirm(`Bạn có chắc muốn đổi vai trò của ${user.name || user.email} sang [${newRole.toUpperCase()}]?`))
      return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, role: newRole } : u)),
        );
        fetchUsers(currentPage);
      } else {
        alert(data.error || "Không thể đổi vai trò");
      }
    } catch {
      alert("Đã xảy ra lỗi khi đổi vai trò");
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (!confirm(`Xác nhận XÓA tài khoản ${user.name || user.username} (${user.email})? Hành động này không thể hoàn tác!`))
      return;

    try {
      const res = await fetch(`/api/admin/users?userId=${user._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        fetchUsers(currentPage);
      } else {
        alert(data.error || "Không thể xóa người dùng");
      }
    } catch {
      alert("Đã xảy ra lỗi khi xóa người dùng");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSaving(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({ username: "", email: "", name: "", password: "", role: "user" });
        fetchUsers(1);
      } else {
        setFormError(data.error || "Không thể tạo tài khoản");
      }
    } catch {
      setFormError("Đã xảy ra lỗi kết nối");
    } finally {
      setFormSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError("");
    setFormSaving(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser._id,
          name: formData.name,
          password: formData.password || undefined,
          role: formData.role,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingUser(null);
        fetchUsers(currentPage);
      } else {
        setFormError(data.error || "Không thể cập nhật");
      }
    } catch {
      setFormError("Đã có lỗi xảy ra");
    } finally {
      setFormSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 📊 1. Top Stats Cards (Payflow Minimal Bento) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Tổng thành viên */}
        <div
          onClick={() => setSelectedRole("all")}
          className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all duration-150 ${
            selectedRole === "all"
              ? isDark
                ? "bg-zinc-800/90 border-zinc-500 shadow-md"
                : "bg-white border-2 border-zinc-900 shadow-md"
              : isDark
                ? "bg-[#11131a] border-zinc-800/80 hover:border-zinc-700"
                : "bg-white border-zinc-200/90 hover:border-zinc-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Tổng thành viên</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"}`}>
              <Users size={16} />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
            {stats.totalAll.toLocaleString()}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Tất cả tài khoản</div>
        </div>

        {/* Quản trị viên */}
        <div
          onClick={() => setSelectedRole("admin")}
          className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all duration-150 ${
            selectedRole === "admin"
              ? isDark
                ? "bg-zinc-800/90 border-rose-500/80 shadow-md"
                : "bg-white border-2 border-rose-600 shadow-md"
              : isDark
                ? "bg-[#11131a] border-zinc-800/80 hover:border-zinc-700"
                : "bg-white border-zinc-200/90 hover:border-zinc-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Quản trị viên</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-500">
              <Shield size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-500">
            {stats.totalAdmins.toLocaleString()}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Quyền quản trị Admin</div>
        </div>

        {/* Google OAuth */}
        <div
          onClick={() => setSelectedRole("user")}
          className={`p-4 sm:p-5 rounded-3xl border cursor-pointer transition-all duration-150 ${
            selectedRole === "user"
              ? isDark
                ? "bg-zinc-800/90 border-sky-500/80 shadow-md"
                : "bg-white border-2 border-sky-600 shadow-md"
              : isDark
                ? "bg-[#11131a] border-zinc-800/80 hover:border-zinc-700"
                : "bg-white border-zinc-200/90 hover:border-zinc-300 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-500 uppercase tracking-wider">Google Login</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-500">
              <Globe size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-500">
            {stats.totalGoogle.toLocaleString()}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Đăng nhập bằng Google</div>
        </div>

        {/* Đang hoạt động */}
        <div
          className={`p-4 sm:p-5 rounded-3xl border transition-all duration-150 ${
            isDark
              ? "bg-[#11131a] border-zinc-800/80"
              : "bg-white border-zinc-200/90 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Đang hoạt động</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-500">
            {stats.totalActive.toLocaleString()}
          </div>
          <div className={`text-[11px] mt-1 font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>Tài khoản bình thường</div>
        </div>
      </div>

      {/* 🔍 2. Filter & Action Toolbar */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 ${
          isDark
            ? "bg-[#11131a] border-zinc-800/80 shadow-md"
            : "bg-white border-zinc-200/90 shadow-sm"
        }`}
      >
        <div className="flex items-center gap-2.5 flex-1 max-w-lg">
          <div className="relative w-full">
            <Search className={`absolute left-3.5 top-3 ${isDark ? "text-zinc-400" : "text-zinc-500"}`} size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, username, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchUsers(1)}
              className={`w-full h-11 border rounded-2xl pl-11 pr-10 text-sm outline-none transition-all ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500"
                  : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:bg-white"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  fetchUsers(1);
                }}
                className="absolute right-3.5 top-3 text-zinc-400 hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => fetchUsers(1)}
            className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all shrink-0 border ${
              isDark
                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200"
            }`}
            title="Làm mới"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormData({ username: "", email: "", name: "", password: "", role: "user" });
              setFormError("");
              setIsAddModalOpen(true);
            }}
            className={`w-full md:w-auto h-11 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm ${
              isDark
                ? "bg-white text-zinc-950 hover:bg-zinc-100 shadow-md active:scale-95"
                : "bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-900/10 active:scale-95"
            }`}
          >
            <Plus size={18} />
            <span>Thêm Thành Viên</span>
          </button>
        </div>
      </div>

      {/* 👥 3. Desktop Table View (>= 768px) */}
      <div
        className={`hidden md:block rounded-3xl border overflow-hidden ${
          isDark ? "bg-[#11131a] border-zinc-800/80 shadow-xl" : "bg-white border-zinc-200/90 shadow-sm"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr
                className={`border-b font-bold text-xs uppercase tracking-wider ${
                  isDark
                    ? "border-zinc-800 bg-zinc-950/60 text-zinc-400"
                    : "border-zinc-200 bg-zinc-50/80 text-zinc-600"
                }`}
              >
                <th className="py-4 px-5">Thành viên</th>
                <th className="py-4 px-5">Email / Phương thức</th>
                <th className="py-4 px-5">Vai trò</th>
                <th className="py-4 px-5">Trạng thái</th>
                <th className="py-4 px-5">Ngày tạo</th>
                <th className="py-4 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? "divide-zinc-800/70" : "divide-zinc-100"}`}>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw size={24} className="animate-spin text-zinc-400" />
                      <span>Đang tải danh sách thành viên...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-400 text-sm">
                    Không tìm thấy thành viên nào.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user._id}
                    className={`transition-colors ${
                      isDark ? "hover:bg-zinc-800/40" : "hover:bg-zinc-50"
                    }`}
                  >
                    {/* User Info */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm shadow-sm shrink-0 border ${
                          isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-zinc-900 border-zinc-800 text-white"
                        }`}>
                          {user.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-full h-full object-cover rounded-2xl"
                            />
                          ) : (
                            (user.name || user.username || "A")[0].toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className={`font-bold text-sm ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                            {user.name}
                          </div>
                          <div className={`text-xs font-mono mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                            @{user.username || "google-user"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Email & Provider */}
                    <td className="py-4 px-5">
                      <div className={`font-semibold ${isDark ? "text-zinc-200" : "text-zinc-800"}`}>
                        {user.email}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {user.authProvider === "google" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20 flex items-center gap-1">
                            <Globe size={11} /> Google
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                            isDark ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-zinc-100 text-zinc-700 border-zinc-200"
                          }`}>
                            <KeyRound size={11} /> Mật khẩu
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-4 px-5">
                      <button
                        onClick={() => handleToggleRole(user)}
                        title="Click để chuyển đổi Admin / User"
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                          user.role === "admin"
                            ? isDark
                              ? "bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-xs"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                            : isDark
                              ? "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
                              : "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200"
                        }`}
                      >
                        {user.role === "admin" ? "🛡️ Admin" : "Thành viên"}
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5">
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                          user.isActive
                            ? isDark
                              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                              : "text-emerald-700 bg-emerald-50 border-emerald-200"
                            : isDark
                              ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
                              : "text-rose-700 bg-rose-50 border-rose-200"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            user.isActive ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {user.isActive ? "Hoạt động" : "Tạm khóa"}
                      </button>
                    </td>

                    {/* Created Date */}
                    <td className={`py-4 px-5 font-mono text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "—"}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setFormData({
                              username: user.username,
                              email: user.email,
                              name: user.name,
                              password: "",
                              role: user.role,
                            });
                            setFormError("");
                            setIsEditModalOpen(true);
                          }}
                          className={`p-2 rounded-xl transition-colors ${
                            isDark ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100"
                          }`}
                          title="Sửa thông tin / Đổi mật khẩu"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`p-2 rounded-xl transition-colors ${
                            user.isActive
                              ? "text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10"
                              : "text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10"
                          }`}
                          title={user.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                        >
                          {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user)}
                          className={`p-2 rounded-xl transition-colors ${
                            isDark ? "text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10" : "text-zinc-500 hover:text-rose-600 hover:bg-rose-50"
                          }`}
                          title="Xóa tài khoản"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination */}
        <div
          className={`px-6 py-4 border-t flex items-center justify-between ${
            isDark
              ? "border-zinc-800 bg-zinc-950/40 text-zinc-400"
              : "border-zinc-200 bg-zinc-50 text-zinc-600"
          }`}
        >
          <div className="text-sm">
            Hiển thị <strong>{users.length}</strong> / <strong>{total.toLocaleString()}</strong> thành viên (Trang {currentPage} / {totalPages})
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchUsers(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className={`h-10 px-3.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 border ${
                isDark
                  ? "bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700"
                  : "bg-white text-zinc-700 hover:bg-zinc-100 border-zinc-200 shadow-xs"
              }`}
            >
              <ChevronLeft size={16} />
              <span>Trước</span>
            </button>
            <span className={`text-sm font-mono font-bold px-3 py-1.5 rounded-xl border ${
              isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-800"
            }`}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => fetchUsers(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className={`h-10 px-3.5 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 border ${
                isDark
                  ? "bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700"
                  : "bg-white text-zinc-700 hover:bg-zinc-100 border-zinc-200 shadow-xs"
              }`}
            >
              <span>Sau</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 📱 4. Mobile Cards View (< 768px) */}
      <div className="md:hidden space-y-3.5">
        {loading && users.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 text-sm">
            <RefreshCw size={24} className="animate-spin text-zinc-400 mx-auto mb-2" />
            <span>Đang tải danh sách thành viên...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 text-sm">
            Không tìm thấy thành viên nào.
          </div>
        ) : (
          users.map((user) => (
            <div
              key={`mobile-${user._id}`}
              className={`p-4 rounded-3xl border space-y-3.5 transition-all ${
                isDark
                  ? "bg-[#11131a] border-zinc-800/80 shadow-lg"
                  : "bg-white border-zinc-200/90 shadow-sm"
              }`}
            >
              {/* Card Top: Avatar + Name + Role */}
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm shrink-0 border ${
                  isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-zinc-900 border-zinc-800 text-white"
                }`}>
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    (user.name || user.username || "A")[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className={`font-bold text-sm truncate ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                      {user.name}
                    </span>
                    <button
                      onClick={() => handleToggleRole(user)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                        user.role === "admin"
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          : isDark ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-zinc-100 text-zinc-700 border-zinc-200"
                      }`}
                    >
                      {user.role === "admin" ? "Admin" : "User"}
                    </button>
                  </div>
                  <div className={`text-xs font-mono truncate mt-0.5 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    {user.email}
                  </div>
                </div>
              </div>

              {/* Card Meta: Auth Provider + Status */}
              <div className={`flex items-center justify-between text-xs px-3 py-2 rounded-xl border ${
                isDark ? "bg-zinc-950/60 border-zinc-800" : "bg-zinc-50 border-zinc-200"
              }`}>
                <span className="flex items-center gap-1">
                  {user.authProvider === "google" ? (
                    <span className="text-sky-500 dark:text-sky-400 flex items-center gap-1 font-semibold">
                      <Globe size={13} /> Google Login
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 font-semibold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                      <KeyRound size={13} /> Password
                    </span>
                  )}
                </span>
                <span
                  className={`inline-flex items-center gap-1 font-bold ${
                    user.isActive ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      user.isActive ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  {user.isActive ? "Hoạt động" : "Tạm khóa"}
                </span>
              </div>

              {/* Card Bottom: Big 44px Touch Action Buttons */}
              <div className={`grid grid-cols-3 gap-2 pt-1 border-t ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                <button
                  onClick={() => {
                    setEditingUser(user);
                    setFormData({
                      username: user.username,
                      email: user.email,
                      name: user.name,
                      password: "",
                      role: user.role,
                    });
                    setFormError("");
                    setIsEditModalOpen(true);
                  }}
                  className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    isDark ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700" : "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200"
                  }`}
                >
                  <Edit2 size={15} />
                  <span>Sửa</span>
                </button>

                <button
                  onClick={() => handleToggleActive(user)}
                  className={`h-10 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                    user.isActive
                      ? isDark ? "bg-zinc-900 text-amber-400 border-zinc-800" : "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                  <span>{user.isActive ? "Khóa" : "Mở"}</span>
                </button>

                <button
                  onClick={() => handleDeleteUser(user)}
                  className="h-10 rounded-xl bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                >
                  <Trash2 size={15} />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        <div
          className={`p-4 rounded-3xl border flex items-center justify-between ${
            isDark ? "bg-[#11131a] border-zinc-800" : "bg-white border-zinc-200"
          }`}
        >
          <button
            onClick={() => fetchUsers(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className={`h-10 px-4 rounded-xl text-xs font-bold disabled:opacity-30 border flex items-center gap-1 ${
              isDark ? "bg-zinc-800 text-zinc-100 border-zinc-700" : "bg-zinc-100 text-zinc-900 border-zinc-200"
            }`}
          >
            <ChevronLeft size={16} />
            <span>Trước</span>
          </button>
          <span className={`text-xs font-mono font-bold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => fetchUsers(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className={`h-10 px-4 rounded-xl text-xs font-bold disabled:opacity-30 border flex items-center gap-1 ${
              isDark ? "bg-zinc-800 text-zinc-100 border-zinc-700" : "bg-zinc-100 text-zinc-900 border-zinc-200"
            }`}
          >
            <span>Sau</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 🚀 ADD USER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div
            className={`w-full max-w-md p-6 sm:p-7 rounded-3xl border shadow-2xl backdrop-blur-2xl ${
              isDark ? "bg-[#11131a]/98 border-zinc-800 text-zinc-100" : "bg-white/98 border-zinc-200 text-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                <Plus size={20} />
                <span>Thêm Thành Viên Mới</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-sm">
              <div>
                <label className={`font-bold block mb-1.5 text-xs ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Tên hiển thị</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className={`w-full h-11 px-3.5 rounded-xl border outline-none font-semibold ${
                    isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={`font-bold block mb-1.5 text-xs ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Tên đăng nhập (Username)</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="nguyenvana"
                  className={`w-full h-11 px-3.5 rounded-xl border outline-none font-mono ${
                    isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={`font-bold block mb-1.5 text-xs ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="nguyenvana@gmail.com"
                  className={`w-full h-11 px-3.5 rounded-xl border outline-none ${
                    isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={`font-bold block mb-1.5 text-xs ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Mật khẩu (ít nhất 6 ký tự)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full h-11 px-3.5 rounded-xl border outline-none ${
                    isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={`font-bold block mb-1.5 text-xs ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Vai trò</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as "admin" | "user" })}
                  className={`w-full h-11 px-3.5 rounded-xl border outline-none font-semibold ${
                    isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                  }`}
                >
                  <option value="user">Thành viên (User)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={`flex-1 h-11 rounded-2xl border font-bold transition-all ${
                    isDark ? "border-zinc-800 hover:bg-zinc-800 text-zinc-300" : "border-zinc-200 hover:bg-zinc-100 text-zinc-700"
                  }`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className={`flex-1 h-11 rounded-2xl font-bold transition-all shadow-md ${
                    isDark ? "bg-white text-zinc-950 hover:bg-zinc-100" : "bg-zinc-900 text-white hover:bg-zinc-800"
                  }`}
                >
                  {formSaving ? "Đang tạo..." : "Xác nhận tạo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 EDIT USER / RESET PASSWORD MODAL */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div
            className={`w-full max-w-md p-6 sm:p-7 rounded-3xl border shadow-2xl backdrop-blur-2xl ${
              isDark ? "bg-[#11131a]/98 border-zinc-800 text-zinc-100" : "bg-white/98 border-zinc-200 text-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                <Edit2 size={20} />
                <span>Cập Nhật Thành Viên</span>
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingUser(null);
                }}
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4 text-sm">
              <div>
                <label className={`font-bold block mb-1.5 text-xs ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Tên hiển thị</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full h-11 px-3.5 rounded-xl border outline-none font-semibold ${
                    isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={`font-bold block mb-1.5 text-xs ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Email (Cố định)</label>
                <input
                  type="email"
                  disabled
                  value={editingUser.email}
                  className={`w-full h-11 px-3.5 rounded-xl border outline-none opacity-60 cursor-not-allowed ${
                    isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-zinc-100 border-zinc-300 text-zinc-900"
                  }`}
                />
              </div>

              <div>
                <label className={`font-bold block mb-1.5 text-xs ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  Đổi mật khẩu mới <span className="text-zinc-400 font-normal">(Để trống nếu không đổi)</span>
                </label>
                <input
                  type="password"
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full h-11 px-3.5 rounded-xl border outline-none ${
                    isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                  }`}
                />
              </div>

              <div>
                <label className={`font-bold block mb-1.5 text-xs ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>Vai trò</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as "admin" | "user" })}
                  className={`w-full h-11 px-3.5 rounded-xl border outline-none font-semibold ${
                    isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-zinc-500" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-zinc-900 focus:bg-white"
                  }`}
                >
                  <option value="user">Thành viên (User)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingUser(null);
                  }}
                  className={`flex-1 h-11 rounded-2xl border font-bold transition-all ${
                    isDark ? "border-zinc-800 hover:bg-zinc-800 text-zinc-300" : "border-zinc-200 hover:bg-zinc-100 text-zinc-700"
                  }`}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className={`flex-1 h-11 rounded-2xl font-bold transition-all shadow-md ${
                    isDark ? "bg-white text-zinc-950 hover:bg-zinc-100" : "bg-zinc-900 text-white hover:bg-zinc-800"
                  }`}
                >
                  {formSaving ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
