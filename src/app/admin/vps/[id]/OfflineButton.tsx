"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OfflineButton({ vpsId, vpsName }: { vpsId: string; vpsName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function offline() {
    if (!confirm(`确认永久下线「${vpsName}」？\n\n下线后不能恢复，系统将停止余额消耗估算和到期提醒，但会保留历史数据。`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/vps/${vpsId}/offline`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "下线失败");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <div><button type="button" onClick={offline} disabled={busy} className="btn-danger">{busy ? "下线中…" : "永久下线服务器"}</button>{error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}</div>;
}
