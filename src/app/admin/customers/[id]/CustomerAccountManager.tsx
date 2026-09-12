"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Account = {
  username: string;
  enabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | Date | null;
} | null;

export default function CustomerAccountManager({ customerId, account }: { customerId: string; account: Account }) {
  const router = useRouter();
  const [username, setUsername] = useState(account?.username ?? "");
  const [password, setPassword] = useState("");
  const [enabled, setEnabled] = useState(account?.enabled ?? true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function request(url: string, method: string, body: object) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "操作失败");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const ok = account
      ? await request(`/api/admin/customers/${customerId}/account`, "PATCH", { username, enabled })
      : await request(`/api/admin/customers/${customerId}/account`, "POST", { username, password });
    if (ok) {
      setPassword("");
      setMessage(account ? "账号设置已保存，旧登录会话已失效" : "账号已创建，客户首次登录后必须修改密码");
    }
  }

  async function resetPassword() {
    if (!password) {
      setError("请先填写新的初始密码");
      return;
    }
    if (!confirm("确认重置客户密码？客户当前会话会立即失效。")) return;
    const ok = await request(`/api/admin/customers/${customerId}/account/reset-password`, "POST", { password });
    if (ok) {
      setPassword("");
      setMessage("密码已重置，客户下次登录必须修改密码");
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">客户用户名</label><input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="3–64 个字符，不含空格" /></div>
        <div><label className="label">{account ? "新的初始密码" : "初始密码"}</label><input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8–128 个字符" /></div>
      </div>
      {account && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-indigo-600" />允许登录</label>
          <span className={`badge ${account.mustChangePassword ? "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400" : "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"}`}>{account.mustChangePassword ? "等待客户修改初始密码" : "密码已由客户设置"}</span>
          <span className="text-xs text-slate-400">最后登录：{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString("zh-CN") : "尚未登录"}</span>
        </div>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="btn-primary">{busy ? "保存中…" : account ? "保存账号设置" : "创建客户账号"}</button>
        {account && <button type="button" disabled={busy} onClick={resetPassword} className="btn-secondary">重置为上方密码</button>}
        <a href="/customer/login" target="_blank" rel="noreferrer" className="btn-secondary">打开客户登录页</a>
      </div>
    </form>
  );
}
