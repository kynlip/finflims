"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { signIn } from "next-auth/react";
import { AuthHeader } from "./AuthHeader";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "login" | "register";
}

export function AuthModal({
  isOpen,
  onClose,
  defaultMode = "login",
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(defaultMode);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setMode(defaultMode);
    setError("");
    setSuccess("");
  }, [defaultMode, isOpen]);

  // Set mounted state after component mounts (client-side only)
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Only render on client side after mount
  if (!mounted || !isOpen) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-1055 h-dvh"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-[#000000]/90 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={onClose}
        />

        {/* Modal Position */}
        <div className="absolute inset-0 flex h-dvh items-start justify-center overflow-y-auto p-4 sm:items-center">
          <div
            className="w-full max-w-[480px] animate-in zoom-in-95 fade-in duration-300 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glass Card */}
            <div className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-white/10 bg-[#151925]/95 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:max-h-none">
              {/* Ambient Glow */}
              <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-[#FFD875]/10 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

              {/* 1. Header */}
              <AuthHeader onClose={onClose} />

              {/* 2. Content */}
              <div className="relative flex flex-col items-center justify-center p-4 text-center sm:p-8">
                {/* Tabs switch */}
                <div className="w-full grid grid-cols-2 p-1 bg-white/5 border border-white/10 rounded-2xl mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError("");
                      setSuccess("");
                    }}
                    className={`py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      mode === "login"
                        ? "bg-[#FFD875] text-[#0f111a] shadow-md shadow-[#FFD875]/20"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Đăng Nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setError("");
                      setSuccess("");
                    }}
                    className={`py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      mode === "register"
                        ? "bg-[#FFD875] text-[#0f111a] shadow-md shadow-[#FFD875]/20"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    Đăng Ký Tài Khoản
                  </button>
                </div>

                {/* Error & Success Messages */}
                {error && (
                  <div className="w-full mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left animate-in fade-in">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="w-full mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 text-left animate-in fade-in">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                {/* Forms */}
                {mode === "login" ? (
                  <LoginForm
                    onSuccess={onClose}
                    setError={setError}
                    setSuccess={setSuccess}
                    loading={loading}
                    setLoading={setLoading}
                  />
                ) : (
                  <RegisterForm
                    onSuccess={onClose}
                    setError={setError}
                    setSuccess={setSuccess}
                    loading={loading}
                    setLoading={setLoading}
                  />
                )}

                {/* Divider */}
                <div className="w-full flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/30">
                    Hoặc đăng nhập với
                  </span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Google OAuth Button */}
                <div className="w-full relative group">
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      signIn("google", { callbackUrl: "/" });
                    }}
                    disabled={loading}
                    className="w-full relative overflow-hidden bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.99] shadow-md hover:shadow-lg disabled:opacity-60"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 4.61c1.61 0 3.09.56 4.23 1.64l3.18-3.18C17.46 1.05 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Tiếp tục với Google</span>
                  </button>
                </div>

                {/* Footer Info */}
                <p className="mt-5 text-[11px] text-white/40 leading-relaxed">
                  Bằng việc tiếp tục, bạn đồng ý với{" "}
                  <a href="#" className="hover:text-white/70 underline">
                    Điều khoản
                  </a>{" "}
                  và{" "}
                  <a href="#" className="hover:text-white/70 underline">
                    Chính sách bảo mật
                  </a>{" "}
                  của PhimHayHonRo.net.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
