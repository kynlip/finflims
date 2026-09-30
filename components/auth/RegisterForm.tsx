"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { User, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { Turnstile } from "@/components/Turnstile";

interface RegisterFormProps {
  onSuccess: () => void;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export function RegisterForm({
  onSuccess,
  setError,
  setSuccess,
  loading,
  setLoading,
}: RegisterFormProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: username.trim(),
          username: username.trim(),
          email: email.trim(),
          password,
          turnstileToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Đăng ký thất bại. Vui lòng thử lại.");
        setLoading(false);
        return;
      }

      setSuccess("Đăng ký thành công! Đang tự động đăng nhập...");

      // Automatically log in
      const loginRes = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });

      if (loginRes?.ok) {
        setTimeout(() => {
          onSuccess();
          window.location.reload();
        }, 600);
      } else {
        setSuccess("Đăng ký thành công! Vui lòng chuyển qua tab Đăng nhập.");
        setLoading(false);
      }
    } catch {
      setError("Đã có lỗi xảy ra khi kết nối. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  return (
    <form
      suppressHydrationWarning
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-white/70 ml-1">
            Tên đăng nhập <span className="text-amber-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
              <User size={16} />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="nguyenvana"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pl-10 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#FFD875] focus:bg-white/10 focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-white/70 ml-1">
            Email <span className="text-amber-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
              <Mail size={16} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pl-10 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#FFD875] focus:bg-white/10 focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-white/70 ml-1">
            Mật khẩu <span className="text-amber-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
              <Lock size={16} />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Ít nhất 6 ký tự"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pl-10 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#FFD875] focus:bg-white/10 focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-white/70 ml-1">
            Nhập lại mật khẩu <span className="text-amber-400">*</span>
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
              <Lock size={16} />
            </div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pl-10 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#FFD875] focus:bg-white/10 focus:outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Cloudflare Turnstile Captcha */}
      <div className="my-2">
        <Turnstile
          onVerify={(token) => setTurnstileToken(token)}
          onExpire={() => setTurnstileToken(null)}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-2 bg-[#FFD875] hover:bg-[#ffe08f] text-[#0f111a] font-bold text-base py-3.5 rounded-xl shadow-lg shadow-[#FFD875]/20 hover:shadow-[#FFD875]/40 transition-all duration-300 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <>
            <span>Tạo Tài Khoản Mới</span>
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </form>
  );
}
