"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ExpenseDeleteButton({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("确认删除这笔其他费用？客户总成本和总实付将同步扣除该笔金额。")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/expenses/${expenseId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("删除失败，请重试");
      }
    } catch {
      alert("网络错误，请重试");
    } finally {
      setBusy(false);
    }
  }

  return <button onClick={remove} disabled={busy} className="text-red-500 transition hover:text-red-600 disabled:opacity-60 dark:text-red-400">删除</button>;
}
