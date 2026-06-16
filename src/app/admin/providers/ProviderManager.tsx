"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Provider = { id: string; name: string; _count: { vpsServers: number } };

export default function ProviderManager({ initial }: { initial: Provider[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (res.ok) {
      setName("");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "添加失败");
    }
  }

  async function rename(id: string) {
    const res = await fetch(`/api/admin/providers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    if (res.ok) {
      setEditingId(null);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "重命名失败");
    }
  }

  async function remove(p: Provider) {
    const hint =
      p._count.vpsServers > 0
        ? `该提供商被 ${p._count.vpsServers} 台 VPS 引用，删除后这些 VPS 的提供商将变为「未指定」。确认删除？`
        : `确认删除提供商「${p.name}」？`;
    if (!confirm(hint)) return;
    const res = await fetch(`/api/admin/providers/${p.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert("删除失败");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="card flex items-end gap-3 p-4">
        <div className="flex-1">
          <label className="label">新增提供商</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如 Vultr / DigitalOcean / 搬瓦工" />
        </div>
        <button type="submit" disabled={busy} className="btn-primary">添加</button>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="card overflow-hidden">
        {initial.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">暂无提供商</div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {initial.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3">
                {editingId === p.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input className="input max-w-xs" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                    <button onClick={() => rename(p.id)} className="btn-primary px-3 py-1.5">保存</button>
                    <button onClick={() => setEditingId(null)} className="btn-secondary">取消</button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-800 dark:text-slate-100">{p.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {p._count.vpsServers} 台 VPS
                      </span>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <button onClick={() => { setEditingId(p.id); setEditName(p.name); }} className="text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400">重命名</button>
                      <button onClick={() => remove(p)} className="text-red-500 transition hover:text-red-600 dark:text-red-400">删除</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
