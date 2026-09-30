"use client";

import React from "react";
import { useAdminTheme } from "../context/AdminThemeContext";
import UserManager from "../components/UserManager";

export default function AdminUsersPage() {
  const { isDark } = useAdminTheme();
  return <UserManager isDark={isDark} />;
}
