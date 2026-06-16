"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VpsFormData } from "./vpsFormData";
import ImageUpload from "../ImageUpload";

type Option = { id: string; name: string };

const empty: VpsFormData = {
  name: "",
  customerId: "",
  providerId: "",
  cpu: "",
  ram: "",
  disk: "",
  bandwidth: "",
  region: "",
  ipAddress: "",
  os: "",
  purchaseDate: "",
  expiryDate: "",
  purchaseCostUsd: "0",
  purchasePaidCny: "0",
  paymentProof: "",
  status: "active",
  notes: "",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "input";

export default function VpsForm({
  initial,
  customers = [],
  providers = [],
}: {
  initial?: VpsFormData;
  customers?: Option[];
  providers?: Option[];
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState<VpsFormData>(initial ?? empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof VpsFormData>(key: K, value: VpsFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/vps/${form.id}` : "/api/admin/vps";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "保存失败");
        return;
      }
      const saved = await res.json();
      router.push(`/admin/vps/${saved.id}`);
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!isEdit) return;
    if (!confirm("确认删除该 VPS？相关续费记录与节点会一并删除，且不可恢复。")) return;
    setSaving(true);
    const res = await fetch(`/api/admin/vps/${form.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setError("删除失败");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="名称 / 标识 *">
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="香港-01"
          />
        </Field>
        <Field label="所属客户">
          <select className={inputCls} value={form.customerId} onChange={(e) => set("customerId", e.target.value)}>
            <option value="">— 未指定 —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="提供商">
          <select className={inputCls} value={form.providerId} onChange={(e) => set("providerId", e.target.value)}>
            <option value="">— 未指定 —</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="CPU">
          <input className={inputCls} value={form.cpu} onChange={(e) => set("cpu", e.target.value)} placeholder="2 vCPU" />
        </Field>
        <Field label="内存">
          <input className={inputCls} value={form.ram} onChange={(e) => set("ram", e.target.value)} placeholder="2 GB" />
        </Field>
        <Field label="硬盘">
          <input className={inputCls} value={form.disk} onChange={(e) => set("disk", e.target.value)} placeholder="55 GB SSD" />
        </Field>
        <Field label="带宽/流量">
          <input className={inputCls} value={form.bandwidth} onChange={(e) => set("bandwidth", e.target.value)} placeholder="2 TB/月" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="地区">
          <input className={inputCls} value={form.region} onChange={(e) => set("region", e.target.value)} placeholder="香港" />
        </Field>
        <Field label="IP 地址">
          <input className={inputCls} value={form.ipAddress} onChange={(e) => set("ipAddress", e.target.value)} placeholder="203.0.113.10" />
        </Field>
        <Field label="操作系统">
          <input className={inputCls} value={form.os} onChange={(e) => set("os", e.target.value)} placeholder="Ubuntu 24.04" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="购买时间 *">
          <input type="date" className={inputCls} value={form.purchaseDate} onChange={(e) => set("purchaseDate", e.target.value)} />
        </Field>
        <Field label="到期时间 *">
          <input type="date" className={inputCls} value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
        </Field>
        <Field label="运行状态">
          <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">运行中</option>
            <option value="stopped">已停用</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="采购成本 (USD)">
          <input type="number" step="0.01" min="0" className={inputCls} value={form.purchaseCostUsd} onChange={(e) => set("purchaseCostUsd", e.target.value)} />
        </Field>
        <Field label="实际付款 (CNY)">
          <input type="number" step="0.01" min="0" className={inputCls} value={form.purchasePaidCny} onChange={(e) => set("purchasePaidCny", e.target.value)} />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-slate-400 dark:text-slate-500">
        客户收款不在此维护，请在「客户」页面记录收款台账。
      </p>

      <ImageUpload
        label="实际付款截图"
        value={form.paymentProof}
        onChange={(name) => set("paymentProof", name)}
      />

      <Field label="备注">
        <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "保存中…" : isEdit ? "保存修改" : "创建 VPS"}
        </button>
        {isEdit && (
          <button type="button" onClick={remove} disabled={saving} className="btn-danger">
            删除
          </button>
        )}
      </div>
    </form>
  );
}
