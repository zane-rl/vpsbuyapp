"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/customer/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "修改密码失败");
        return;
      }
      router.replace("/customer");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-md p-7">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">首次登录保护</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">设置您自己的密码</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">初始密码只能用于首次进入。完成修改后才能查看客户资料。</p>
      <label className="label mt-5" htmlFor="current-password">当前密码</label>
      <input id="current-password" type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
      <label className="label mt-4" htmlFor="new-password">新密码</label>
      <input id="new-password" type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" placeholder="8–128 个字符" />
      <label className="label mt-4" htmlFor="confirm-password">确认新密码</label>
      <input id="confirm-password" type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary mt-5 w-full">{loading ? "保存中…" : "保存新密码并进入"}</button>
    </form>
  );
}
