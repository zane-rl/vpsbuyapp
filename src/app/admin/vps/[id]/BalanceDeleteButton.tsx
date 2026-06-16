"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BalanceDeleteButton({ logId }: { logId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("确认删除这条余额/充值记录？（不会改动当前余额）")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/balance-logs/${logId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      alert("删除失败");
      setBusy(false);
    }
  }

  return (
    <button onClick={remove} disabled={busy} className="text-red-500 transition hover:text-red-600 disabled:opacity-60 dark:text-red-400">
      删除
    </button>
  );
}
