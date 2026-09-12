"use client";

import { useState } from "react";

export default function CustomerLogoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/customer/auth/login", {
        method: "DELETE",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("退出失败");
      // 使用整页替换，避免 Next.js 客户端路由继续持有已退出页面的数据。
      window.location.replace("/customer/login");
    } catch {
      setError("退出失败，请重试");
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      <button type="button" onClick={logout} disabled={loading} className="btn-secondary">
        {loading ? "退出中…" : "退出登录"}
      </button>
    </div>
  );
}
