"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { User, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Turnstile } from "@/components/Turnstile";

interface LoginFormProps {
  onSuccess: () => void;
  setError: (msg: string) => void;
  setSuccess: (msg: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export function LoginForm({
  onSuccess,
  setError,
  setSuccess,
  loading,
  setLoading,
}: LoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Vui lòng xác thực Cloudflare Turnstile trước khi đăng nhập!");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username: identifier,
        password,
        turnstileToken: turnstileToken || "",
        redirect: false,
      });

      if (result?.error) {
        setError("Tên đăng nhập hoặc mật khẩu không chính xác.");
      } else if (result?.ok) {
        setSuccess("Đăng nhập thành công!");
        setTimeout(() => {
          onSuccess();
          window.location.reload();
        }, 500);
      }
    } catch {
      setError("Đã có lỗi xảy ra khi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      id="auth-login-form"
      suppressHydrationWarning
      onSubmit={handleSubmit}
      className="space-y-4 animate-in fade-in duration-300 w-full text-left"
    >
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-white/70 ml-1">
          Tên đăng nhập hoặc Email
        </label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
            <User size={18} />
          </div>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoFocus
            placeholder="Username hoặc email..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pl-10 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#FFD875] focus:bg-white/10 focus:outline-none transition-all"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-white/70 ml-1">
          Mật khẩu
        </label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
            <Lock size={18} />
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pl-10 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#FFD875] focus:bg-white/10 focus:outline-none transition-all"
          />
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
            <span>Đăng Nhập</span>
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </form>
  );
}
