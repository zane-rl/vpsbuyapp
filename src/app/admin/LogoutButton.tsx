"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/login", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button onClick={logout} disabled={loading} className="btn-secondary">
      退出登录
    </button>
  );
}
