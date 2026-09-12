"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type User = { id: string; name: string; enabled: boolean };
type Node = {
  id: string;
  name: string;
  enabled: boolean;
  assignments: { managedUser: User }[];
};

export default function ServerNodeAssignments({ nodes, users, vpsActive }: { nodes: Node[]; users: User[]; vpsActive: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(url: string, method: string, body?: object) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "操作失败");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">{error}</p>}
      {nodes.map((node) => {
        const assignedIds = new Set(node.assignments.map((a) => a.managedUser.id));
        const availableUsers = users.filter((u) => u.enabled && !assignedIds.has(u.id));
        const canAssign = vpsActive && node.enabled && availableUsers.length > 0;
        return (
          <div key={node.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium text-slate-800 dark:text-slate-100">{node.name}</h3>{(!vpsActive || !node.enabled) && <span className="badge border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">当前不可分配</span>}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {node.assignments.length === 0 && <span className="text-sm text-slate-400">尚未分配用户</span>}
              {node.assignments.map(({ managedUser }) => <span key={managedUser.id} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${managedUser.enabled ? "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>{managedUser.name}{!managedUser.enabled && "（已停用）"}<button type="button" disabled={busy} onClick={() => call(`/api/customer/users/${managedUser.id}/nodes/${node.id}`, "DELETE")} aria-label={`解除 ${managedUser.name}`} className="font-bold hover:text-red-500">×</button></span>)}
            </div>
            {canAssign && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><select className="input" value={selected[node.id] ?? ""} onChange={(e) => setSelected({ ...selected, [node.id]: e.target.value })}><option value="">选择终端用户…</option>{availableUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select><button type="button" disabled={busy || !selected[node.id]} onClick={() => call(`/api/customer/users/${selected[node.id]}/nodes`, "POST", { nodeId: node.id })} className="btn-primary shrink-0">分配给用户</button></div>}
          </div>
        );
      })}
    </div>
  );
}
