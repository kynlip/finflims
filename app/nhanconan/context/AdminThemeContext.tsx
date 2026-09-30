"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface AdminThemeContextType {
  isDark: boolean;
  setIsDark: (val: boolean) => void;
  mounted: boolean;
}

const AdminThemeContext = createContext<AdminThemeContextType>({
  isDark: true,
  setIsDark: () => {},
  mounted: false,
});

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("adminTheme") || localStorage.getItem("theme");
    const prefersDark = storedTheme ? storedTheme === "dark" : true;
    setIsDark(prefersDark);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("adminTheme", isDark ? "dark" : "light");
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark, mounted]);

  return (
    <AdminThemeContext.Provider value={{ isDark, setIsDark, mounted }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}
