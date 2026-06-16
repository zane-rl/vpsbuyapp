"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/admin";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "登录失败");
        return;
      }
      router.replace(from);
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-bg flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="card animate-fade-in w-full max-w-sm p-7">
        <div className="mb-5 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-md shadow-indigo-600/30">
            V
          </span>
          <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">管理员登录</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">请输入管理密码以进入后台</p>
        </div>

        <label className="label">密码</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="input"
          placeholder="管理密码"
        />

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-5 w-full">
          {loading ? "登录中…" : "登录"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
