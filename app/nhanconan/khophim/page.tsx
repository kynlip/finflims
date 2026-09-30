"use client";

import React from "react";
import { useAdminTheme } from "../context/AdminThemeContext";
import MovieManager from "../components/MovieManager";

export default function AdminKhoPhimPage() {
  const { isDark } = useAdminTheme();
  return <MovieManager isDark={isDark} />;
}
