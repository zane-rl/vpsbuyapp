"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type ManagedUserView = {
  id: string;
  name: string;
  contact: string | null;
  note: string | null;
  enabled: boolean;
  assignments: {
    assignedAt: string | Date;
    vpnNode: { id: string; name: string; enabled: boolean; protocol: string; vps: { id: string; name: string; status: string } };
  }[];
};

export type AssignableNode = {
  id: string;
  name: string;
  protocol: string;
  enabled: boolean;
  vps: { id: string; name: string; status: string };
};

type Props = {
  mode: "admin" | "customer";
  customerId: string;
  users: ManagedUserView[];
  nodes: AssignableNode[];
};

const emptyForm = { name: "", contact: "", note: "", enabled: true };

export default function ManagedUserManager({ mode, customerId, users, nodes }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedNode, setSelectedNode] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const createUrl = mode === "customer" ? "/api/customer/users" : `/api/admin/customers/${customerId}/users`;
  const userUrl = (id: string) => mode === "customer" ? `/api/customer/users/${id}` : `/api/admin/customer-users/${id}`;
  const nodesUrl = (id: string) => mode === "customer" ? `/api/customer/users/${id}/nodes` : `/api/admin/customer-users/${id}/nodes`;

  async function call(url: string, method: string, body?: object) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "操作失败");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await call(createUrl, "POST", form)) {
      setForm(emptyForm);
      setAdding(false);
    }
  }

  async function save(userId: string) {
    if (await call(userUrl(userId), "PATCH", form)) setEditingId(null);
  }

  async function assign(userId: string) {
    const nodeId = selectedNode[userId];
    if (!nodeId) {
      setError("请选择要分配的 VPN 节点");
      return;
    }
    if (await call(nodesUrl(userId), "POST", { nodeId })) setSelectedNode({ ...selectedNode, [userId]: "" });
  }

  async function unassign(userId: string, nodeId: string) {
    if (!confirm("确认解除该节点分配？")) return;
    await call(`${nodesUrl(userId)}/${nodeId}`, "DELETE");
  }

  function startEdit(user: ManagedUserView) {
    setEditingId(user.id);
    setForm({ name: user.name, contact: user.contact ?? "", note: user.note ?? "", enabled: user.enabled });
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">{error}</p>}
      {users.length === 0 && !adding && <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">还没有终端用户。先建立人员档案，再为其分配 VPN 节点。</div>}
      {users.map((user) => {
        const assigned = new Set(user.assignments.map((a) => a.vpnNode.id));
        const available = nodes.filter((n) => n.enabled && n.vps.status === "active" && !assigned.has(n.id));
        return (
          <article key={user.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            {editingId === user.id ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="姓名 *" />
                <input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="联系方式" />
                <input className="input sm:col-span-2" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="备注" />
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="accent-indigo-600" />启用此用户</label>
                <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingId(null)} className="btn-secondary">取消</button><button type="button" disabled={busy} onClick={() => save(user.id)} className="btn-primary">保存</button></div>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className="flex items-center gap-2"><h3 className="font-semibold text-slate-900 dark:text-slate-100">{user.name}</h3><span className={`badge ${user.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400" : "border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"}`}>{user.enabled ? "使用中" : "已停用"}</span></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.contact || "未填写联系方式"}{user.note ? ` · ${user.note}` : ""}</p></div>
                <button type="button" onClick={() => startEdit(user)} className="btn-secondary">编辑资料</button>
              </div>
            )}

            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">当前节点分配</p>
              <div className="space-y-2">
                {user.assignments.length === 0 && <p className="text-sm text-slate-400">尚未分配节点</p>}
                {user.assignments.map(({ vpnNode }) => {
                  const unavailable = !user.enabled || !vpnNode.enabled || vpnNode.vps.status !== "active";
                  return <div key={vpnNode.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60"><div className="flex flex-wrap items-center gap-2"><span className="font-medium text-slate-700 dark:text-slate-200">{vpnNode.name}</span><span className="text-slate-400">{vpnNode.protocol}</span><span className="text-sky-600 dark:text-sky-400">→ {vpnNode.vps.name}</span>{unavailable && <span className="badge border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">当前不可用</span>}</div><button type="button" disabled={busy} onClick={() => unassign(user.id, vpnNode.id)} className="text-xs font-medium text-red-500 hover:text-red-600">解除</button></div>;
                })}
              </div>
              {user.enabled && available.length > 0 && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><select className="input" value={selectedNode[user.id] ?? ""} onChange={(e) => setSelectedNode({ ...selectedNode, [user.id]: e.target.value })}><option value="">选择节点…</option>{available.map((node) => <option key={node.id} value={node.id}>{node.vps.name} / {node.name}（{node.protocol}）</option>)}</select><button type="button" disabled={busy} onClick={() => assign(user.id)} className="btn-primary shrink-0">分配节点</button></div>}
            </div>
          </article>
        );
      })}

      {adding ? (
        <form onSubmit={add} className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900/60 dark:bg-sky-950/20">
          <div className="grid gap-3 sm:grid-cols-2"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="姓名 *" autoFocus /><input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="联系方式" /><input className="input sm:col-span-2" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="备注" /></div>
          <div className="mt-3 flex gap-2"><button type="submit" disabled={busy} className="btn-primary">保存用户</button><button type="button" onClick={() => { setAdding(false); setForm(emptyForm); }} className="btn-secondary">取消</button></div>
        </form>
      ) : <button type="button" onClick={() => { setAdding(true); setForm(emptyForm); }} className="btn-ghost">+ 新增终端用户</button>}
    </div>
  );
}
