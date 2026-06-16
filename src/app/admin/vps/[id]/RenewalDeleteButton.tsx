"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RenewalDeleteButton({ renewalId }: { renewalId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("确认删除这条续费记录？（不会改动当前到期时间）")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/renewals/${renewalId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      alert("删除失败");
      setBusy(false);
    }
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="text-red-500 transition hover:text-red-600 disabled:opacity-60 dark:text-red-400"
    >
      删除
    </button>
  );
}
