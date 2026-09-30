"use client";

import React from "react";
import { useAdminTheme } from "../context/AdminThemeContext";
import UnifiedAppPublisher from "../components/UnifiedAppPublisher";

export default function AdminAppsPage() {
  const { isDark } = useAdminTheme();
  return <UnifiedAppPublisher isDark={isDark} />;
}
