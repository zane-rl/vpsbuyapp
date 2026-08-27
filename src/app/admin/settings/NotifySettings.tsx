"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Setting = {
  enabled: boolean;
  botToken: string;
  daysAhead: number;
  siteBaseUrl: string;
};

type RunResult = {
  ok: boolean;
  skipped?: string;
  customers: number;
  sent: number;
  failed: number;
  results: { customer: string; detail: string; sent: number; failed: number; error?: string }[];
};

export default function NotifySettings({ initial }: { initial: Setting }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [botToken, setBotToken] = useState(initial.botToken);
  const [daysAhead, setDaysAhead] = useState(String(initial.daysAhead));
  const [siteBaseUrl, setSiteBaseUrl] = useState(initial.siteBaseUrl);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setBusy(true);
    const res = await fetch("/api/admin/notify-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, botToken, daysAhead, siteBaseUrl }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "保存失败");
    }
  }

  async function runNow() {
    setTesting(true);
    setResult(null);
    const res = await fetch("/api/admin/notify-test", { method: "POST" });
    const data = await res.json().catch(() => null);
    setTesting(false);
    setResult(data);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">启用到期推送</span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Telegram Bot Token *</span>
            <input
              className="input font-mono text-xs"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456:AAH..."
            />
          </label>
          <label className="block">
            <span className="label">提前推送天数</span>
            <input
              type="number"
              min="1"
              max="365"
              className="input"
              value={daysAhead}
              onChange={(e) => setDaysAhead(e.target.value)}
            />
          </label>
        </div>

        <label className="block">
          <span className="label">站点地址 *（用于拼客户专属查看链接）</span>
          <input
            className="input"
            value={siteBaseUrl}
            onChange={(e) => setSiteBaseUrl(e.target.value)}
            placeholder="https://vps.example.com"
          />
          <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">
            定时任务从本机调用，取不到公网域名，需在此显式配置。
          </span>
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className="btn-primary px-4 py-2">
            保存设置
          </button>
          <button type="button" onClick={runNow} disabled={testing} className="btn-secondary">
            {testing ? "推送中…" : "立即检查并推送"}
          </button>
          {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">已保存 ✓</span>}
        </div>
      </form>

      {result && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50">
          {result.skipped ? (
            <p className="text-slate-500 dark:text-slate-400">未推送：{result.skipped}</p>
          ) : (
            <>
              <p className="font-medium text-slate-700 dark:text-slate-200">
                涉及 {result.customers} 个客户，成功 {result.sent} 条，失败 {result.failed} 条
              </p>
              <ul className="mt-2 space-y-1">
                {result.results.map((r, i) => (
                  <li key={i} className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{r.customer}</span>
                    ：{r.detail} — 成功 {r.sent} / 失败 {r.failed}
                    {r.error && <span className="text-red-500 dark:text-red-400">（{r.error}）</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
