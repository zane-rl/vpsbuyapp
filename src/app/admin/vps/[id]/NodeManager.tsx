"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import CopyButton from "../../../CopyButton";

type Node = {
  id: string;
  name: string;
  protocol: string;
  address: string | null;
  port: number | null;
  config: string | null;
  subscribeUrl: string | null;
  enabled: boolean;
};

const inputCls = "input";

const PROTOCOLS = ["Shadowsocks", "V2Ray", "Trojan", "WireGuard", "VLESS", "Hysteria"];

function NodeRow({ node, onChanged }: { node: Node; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(node);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/admin/nodes/${node.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) {
      setEditing(false);
      onChanged();
    } else {
      alert("保存失败");
    }
  }

  async function remove() {
    if (!confirm(`确认删除节点「${node.name}」？`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/nodes/${node.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) onChanged();
    else alert("删除失败");
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="节点名" />
          <select className={inputCls} value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}>
            {PROTOCOLS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input className={inputCls} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="地址/域名" />
          <input className={inputCls} type="number" value={form.port ?? ""} onChange={(e) => setForm({ ...form, port: e.target.value === "" ? null : Number(e.target.value) })} placeholder="端口" />
        </div>
        <input className={`${inputCls} mt-2`} value={form.config ?? ""} onChange={(e) => setForm({ ...form, config: e.target.value })} placeholder="加密方式/密码/其他配置" />
        <input className={`${inputCls} mt-2`} value={form.subscribeUrl ?? ""} onChange={(e) => setForm({ ...form, subscribeUrl: e.target.value })} placeholder="订阅链接" />
        <label className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="accent-indigo-600" />
          启用（公开页展示）
        </label>
        <div className="mt-2 flex gap-2">
          <button onClick={save} disabled={busy} className="btn-primary px-3 py-1.5">保存</button>
          <button onClick={() => { setForm(node); setEditing(false); }} className="btn-secondary">取消</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 transition-colors hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">{node.protocol}</span>
        <span className="font-medium text-slate-800 dark:text-slate-100">{node.name}</span>
        {node.address && (
          <span className="text-slate-400 dark:text-slate-500">{node.address}{node.port ? `:${node.port}` : ""}</span>
        )}
        {node.subscribeUrl && <CopyButton text={node.subscribeUrl} />}
        {!node.enabled && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-400 dark:bg-slate-800 dark:text-slate-500">已禁用</span>}
      </div>
      <div className="flex gap-3 text-sm">
        <button onClick={() => setEditing(true)} className="text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400">编辑</button>
        <button onClick={remove} disabled={busy} className="text-red-500 transition hover:text-red-600 disabled:opacity-60 dark:text-red-400">删除</button>
      </div>
    </div>
  );
}

export default function NodeManager({ vpsId, nodes }: { vpsId: string; nodes: Node[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", protocol: "Shadowsocks", address: "", port: "", config: "", subscribeUrl: "", enabled: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function refresh() {
    router.refresh();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vpsId, ...form, port: form.port === "" ? null : Number(form.port) }),
    });
    setBusy(false);
    if (res.ok) {
      setForm({ name: "", protocol: "Shadowsocks", address: "", port: "", config: "", subscribeUrl: "", enabled: true });
      setAdding(false);
      refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "添加失败");
    }
  }

  return (
    <div className="space-y-3">
      {nodes.length === 0 && !adding && (
        <p className="text-sm text-slate-400 dark:text-slate-500">暂无节点</p>
      )}
      {nodes.map((n) => (
        <NodeRow key={n.id} node={n} onChanged={refresh} />
      ))}

      {adding ? (
        <form onSubmit={add} className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
          <div className="grid gap-2 sm:grid-cols-2">
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="节点名 *" />
            <select className={inputCls} value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}>
              {PROTOCOLS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="地址/域名（留空默认取 VPS 的 IP）" />
            <input className={inputCls} type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} placeholder="端口" />
          </div>
          <input className={`${inputCls} mt-2`} value={form.config} onChange={(e) => setForm({ ...form, config: e.target.value })} placeholder="加密方式/密码/其他配置" />
          <input className={`${inputCls} mt-2`} value={form.subscribeUrl} onChange={(e) => setForm({ ...form, subscribeUrl: e.target.value })} placeholder="订阅链接（可选）" />
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary px-3 py-1.5">添加</button>
            <button type="button" onClick={() => setAdding(false)} className="btn-secondary">取消</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="btn-ghost">
          + 添加节点
        </button>
      )}
    </div>
  );
}
