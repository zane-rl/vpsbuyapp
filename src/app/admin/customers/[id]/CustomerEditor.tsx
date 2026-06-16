"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CustomerEditor({
  id,
  name,
  note,
}: {
  id: string;
  name: string;
  note: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(name);
  const [nt, setNt] = useState(note);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setError("");
    setBusy(true);
    const res = await fetch(`/api/admin/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: n, note: nt }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "保存失败");
    }
  }

  async function remove() {
    if (!confirm("确认删除该客户？其收款记录会一并删除，名下 VPS 将变为「未指定客户」。")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/customers/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/customers");
      router.refresh();
    } else {
      alert("删除失败");
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn-secondary">
        编辑客户
      </button>
      {open && (
        <div className="card absolute right-0 top-full z-10 mt-2 w-80 p-4 shadow-lg">
          <label className="label">客户名称</label>
          <input className="input" value={n} onChange={(e) => setN(e.target.value)} />
          <label className="label mt-3">备注</label>
          <input className="input" value={nt} onChange={(e) => setNt(e.target.value)} />
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-2">
              <button onClick={save} disabled={busy} className="btn-primary px-3 py-1.5">保存</button>
              <button onClick={() => setOpen(false)} className="btn-secondary">取消</button>
            </div>
            <button onClick={remove} disabled={busy} className="text-sm text-red-500 hover:text-red-600 dark:text-red-400">删除客户</button>
          </div>
        </div>
      )}
    </div>
  );
}
