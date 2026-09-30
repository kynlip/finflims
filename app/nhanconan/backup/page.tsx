"use client";

import React from "react";
import { useAdminTheme } from "../context/AdminThemeContext";
import BackupManager from "../components/BackupManager";

export default function AdminBackupPage() {
  const { isDark } = useAdminTheme();
  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <BackupManager isDark={isDark} />
    </div>
  );
}
