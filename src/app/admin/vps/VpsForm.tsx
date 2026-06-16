"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VpsFormData } from "./vpsFormData";
import ImageUpload from "../ImageUpload";
import { addPeriod, formatDate } from "@/lib/dates";

type Option = { id: string; name: string };

const empty: VpsFormData = {
  name: "",
  customerId: "",
  providerId: "",
  billingType: "term",
  termPeriod: "monthly",
  autoCycle: "monthly",
  cyclePriceUsd: "",
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

  // 选择购买周期 / 购买时间时，按 月/季/年 自动推算到期时间（仍可手动改）
  function setPurchaseDate(value: string) {
    setForm((f) => {
      const next = { ...f, purchaseDate: value };
      if (f.billingType === "term" && value && f.termPeriod) {
        next.expiryDate = formatDate(addPeriod(value, f.termPeriod));
      }
      return next;
    });
  }
  function setTermPeriod(value: string) {
    setForm((f) => {
      const next = { ...f, termPeriod: value };
      if (f.purchaseDate) next.expiryDate = formatDate(addPeriod(f.purchaseDate, value));
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.customerId) {
      setError("请选择所属客户");
      return;
    }
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
        <Field label="所属客户 *">
          <select className={inputCls} value={form.customerId} onChange={(e) => set("customerId", e.target.value)}>
            <option value="">— 请选择 —</option>
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

      {/* 计费类型 */}
      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <span className="label">计费类型</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => set("billingType", "term")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
              form.billingType === "term"
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
                : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            固定期限（按月/季/年，有到期时间）
          </button>
          <button
            type="button"
            onClick={() => set("billingType", "auto")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
              form.billingType === "auto"
                ? "border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-950/40 dark:text-sky-300"
                : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            自动续费（按余额扣费，无固定到期）
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <Field label="购买时间 *">
            <input type="date" className={inputCls} value={form.purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </Field>

          {form.billingType === "term" ? (
            <>
              <Field label="购买周期">
                <select className={inputCls} value={form.termPeriod} onChange={(e) => setTermPeriod(e.target.value)}>
                  <option value="monthly">按月</option>
                  <option value="quarterly">按季度</option>
                  <option value="yearly">按年</option>
                </select>
              </Field>
              <Field label="到期时间 *">
                <input type="date" className={inputCls} value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
              </Field>
            </>
          ) : (
            <Field label="续费周期">
              <select className={inputCls} value={form.autoCycle} onChange={(e) => set("autoCycle", e.target.value)}>
                <option value="hourly">按小时</option>
                <option value="monthly">按月</option>
                <option value="quarterly">按季度</option>
                <option value="yearly">按年</option>
              </select>
            </Field>
          )}

          <Field label="运行状态">
            <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">运行中</option>
              <option value="stopped">已停用</option>
            </select>
          </Field>
        </div>

        {form.billingType === "term" && (
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            选择购买周期后，到期时间会按购买时间自动推算，可手动调整。
          </p>
        )}

        {form.billingType === "auto" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="周期费用 (USD)">
              <input type="number" step="0.001" min="0" className={inputCls} value={form.cyclePriceUsd} onChange={(e) => set("cyclePriceUsd", e.target.value)} placeholder="每周期单价，可选" />
            </Field>
            <div className="sm:col-span-2 flex items-end">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                自动续费余额由「所属客户」统一充值并共享，请在客户页面记录充值。
              </p>
            </div>
          </div>
        )}
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
