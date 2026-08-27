"use client";

import { useState } from "react";

type Result = {
  ok: boolean;
  error?: string;
  customer?: string;
  sent: number;
  failed: number;
  errors: string[];
};

/** 给该客户发一条测试推送，验证 Token / 站点地址 / chat_id 是否配对 */
export default function TestPushButton({ customerId }: { customerId: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function send() {
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/admin/notify-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    setResult(data);
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={send} disabled={busy} className="btn-secondary">
        {busy ? "发送中…" : "发送测试推送"}
      </button>

      {result && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            result.ok
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
          }`}
        >
          {result.error ? (
            result.error
          ) : (
            <>
              已发送 {result.sent} 条
              {result.failed > 0 ? `，失败 ${result.failed} 条` : ""}
              {result.errors?.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
