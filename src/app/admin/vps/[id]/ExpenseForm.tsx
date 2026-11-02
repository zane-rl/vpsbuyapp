"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate } from "@/lib/dates";
import ImageUpload from "../../ImageUpload";

export default function ExpenseForm({ vpsId }: { vpsId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [expenseType, setExpenseType] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => formatDate(new Date()));
  const [costUsd, setCostUsd] = useState("0");
  const [paidCny, setPaidCny] = useState("0");
  const [paymentProof, setPaymentProof] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/vps/${vpsId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenseType, expenseDate, costUsd, paidCny, paymentProof, notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "保存费用失败");
        return;
      }
      setOpen(false);
      setExpenseType("");
      setExpenseDate(formatDate(new Date()));
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

  if (!open) return <button onClick={() => setOpen(true)} className="btn-primary">+ 新增费用</button>;

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">新增其他费用</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">费用类型 *</span>
          <input required className="input" value={expenseType} onChange={(event) => setExpenseType(event.target.value)} placeholder="如：额外 IP、流量、维护" />
        </label>
        <label className="block">
          <span className="label">费用时间 *</span>
          <input required type="date" className="input" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} />
        </label>
        <label className="block">
          <span className="label">费用成本 (USD)</span>
          <input required type="number" min="0" step="0.01" className="input" value={costUsd} onChange={(event) => setCostUsd(event.target.value)} />
        </label>
        <label className="block">
          <span className="label">费用实付 (CNY)</span>
          <input required type="number" min="0" step="0.01" className="input" value={paidCny} onChange={(event) => setPaidCny(event.target.value)} />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="label">费用备注</span>
        <input className="input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="说明本次费用的用途" />
      </label>
      <div className="mt-3"><ImageUpload label="付款截图" value={paymentProof} onChange={setPaymentProof} /></div>
      {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary">{saving ? "保存中…" : "保存费用"}</button>
        <button type="button" disabled={saving} onClick={() => { setOpen(false); setError(""); }} className="btn-secondary">取消</button>
      </div>
    </form>
  );
}
