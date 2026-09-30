"use client";

import React from "react";
import { useAdminTheme } from "../context/AdminThemeContext";
import KKPhimCrawler from "../components/KKPhimCrawler";

export default function AdminCrawlerPage() {
  const { isDark } = useAdminTheme();
  return <KKPhimCrawler isDark={isDark} />;
}
