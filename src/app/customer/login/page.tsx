"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function safeFrom(value: string | null): string {
  return value?.startsWith("/customer") && !value.startsWith("//") ? value : "/customer";
}

function CustomerLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/customer/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "登录失败");
        return;
      }
      router.replace(data.mustChangePassword ? "/customer/change-password" : safeFrom(params.get("from")));
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-bg flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card animate-fade-in w-full max-w-sm p-7">
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 text-lg font-bold text-white shadow-md shadow-indigo-600/25">V</span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-600 dark:text-sky-400">客户资产台账</p>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">客户登录</h1>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">查看服务器、资金记录，并管理 VPN 使用人员。</p>
        </div>

        <label className="label" htmlFor="customer-username">用户名</label>
        <input id="customer-username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus placeholder="客户用户名" />
        <label className="label mt-4" htmlFor="customer-password">密码</label>
        <input id="customer-password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="登录密码" />

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary mt-5 w-full">{loading ? "登录中…" : "登录客户门户"}</button>
        <p className="mt-5 text-center text-xs text-slate-400">管理员请前往 <Link href="/login" className="text-indigo-600 hover:underline dark:text-indigo-400">管理后台登录</Link></p>
      </form>
    </main>
  );
}

export default function CustomerLoginPage() {
  return <Suspense fallback={null}><CustomerLoginForm /></Suspense>;
}
