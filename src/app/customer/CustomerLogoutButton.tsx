"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CustomerLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/customer/auth/login", { method: "DELETE" });
    router.replace("/customer/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={loading} className="btn-secondary">
      {loading ? "退出中…" : "退出登录"}
    </button>
  );
}
