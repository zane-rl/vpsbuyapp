"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddCustomer() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, note }),
    });
    setBusy(false);
    if (res.ok) {
      setName("");
      setNote("");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "添加失败");
    }
  }

  return (
    <form onSubmit={add} className="card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <label className="label">新增客户</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="客户名称" />
        </div>
        <div className="min-w-[12rem] flex-1">
          <label className="label">备注（可选）</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="如：长期合作" />
        </div>
        <button type="submit" disabled={busy} className="btn-primary">添加</button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
