"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ImageUpload from "../../ImageUpload";

const inputCls = "input";

export default function RenewForm({ vpsId }: { vpsId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newExpiry, setNewExpiry] = useState("");
  const [costUsd, setCostUsd] = useState("0");
  const [paidCny, setPaidCny] = useState("0");
  const [paymentProof, setPaymentProof] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/vps/${vpsId}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newExpiry, costUsd, paidCny, paymentProof, notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "续费失败");
        return;
      }
      setOpen(false);
      setNewExpiry("");
      setCostUsd("0");
      setPaidCny("0");
      setPaymentProof("");
      setNotes("");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-success">
        续费
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">续费</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">续费后到期时间 *</span>
          <input type="date" className={inputCls} value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">本次成本 (USD)</span>
          <input type="number" step="0.01" min="0" className={inputCls} value={costUsd} onChange={(e) => setCostUsd(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">本次实付 (CNY)</span>
          <input type="number" step="0.01" min="0" className={inputCls} value={paidCny} onChange={(e) => setPaidCny(e.target.value)} />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="label">备注</span>
        <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="如：月付续费 1 个月" />
      </label>

      <div className="mt-3">
        <ImageUpload label="付款截图" value={paymentProof} onChange={setPaymentProof} />
      </div>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={saving} className="btn-success px-4 py-2">
          {saving ? "提交中…" : "确认续费"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary px-4 py-2">
          取消
        </button>
      </div>
    </form>
  );
}
