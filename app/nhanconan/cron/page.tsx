"use client";

import React from "react";
import { useAdminTheme } from "../context/AdminThemeContext";
import CronjobSettings from "../components/CronjobSettings";

export default function AdminCronPage() {
  const { isDark } = useAdminTheme();
  return <CronjobSettings isDark={isDark} />;
}
