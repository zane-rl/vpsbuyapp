"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { money } from "@/lib/money";
import ImageUpload from "../../ImageUpload";

type Payment = { id: string; amountCny: number; payDate: string; note: string | null; paymentProof: string | null };

function ymdToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmt(d: string): string {
  return d.slice(0, 10);
}

export default function PaymentManager({
  customerId,
  payments,
}: {
  customerId: string;
  payments: Payment[];
}) {
  const router = useRouter();
  const [amountCny, setAmount] = useState("");
  const [payDate, setPayDate] = useState(ymdToday());
  const [note, setNote] = useState("");
  const [paymentProof, setPaymentProof] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, amountCny, payDate, note, paymentProof }),
    });
    setBusy(false);
    if (res.ok) {
      setAmount("");
      setNote("");
      setPayDate(ymdToday());
      setPaymentProof("");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "添加失败");
    }
  }

  async function remove(id: string) {
    if (!confirm("确认删除该收款记录？")) return;
    const res = await fetch(`/api/admin/payments/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert("删除失败");
  }

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block">
            <span className="label">收款金额 (CNY) *</span>
            <input type="number" step="0.01" min="0" className="input" value={amountCny} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </label>
          <label className="block">
            <span className="label">收款时间</span>
            <input type="date" className="input" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">备注</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="如：覆盖香港-01、日本-01" />
          </label>
        </div>
        <div className="mt-2">
          <ImageUpload label="收款截图" value={paymentProof} onChange={setPaymentProof} />
        </div>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button type="submit" disabled={busy} className="btn-success mt-2 px-4 py-2">记一笔收款</button>
      </form>

      {payments.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">暂无收款记录</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="py-2 pr-4">收款时间</th>
                <th className="py-2 pr-4 text-right">金额 ¥</th>
                <th className="py-2 pr-4">截图</th>
                <th className="py-2 pr-4">备注</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{fmt(p.payDate)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-slate-700 dark:text-slate-200">¥{money(p.amountCny)}</td>
                  <td className="py-2.5 pr-4">
                    {p.paymentProof ? (
                      <a href={`/api/files/${p.paymentProof}`} target="_blank" rel="noreferrer">
                        <img src={`/api/files/${p.paymentProof}`} alt="收款截图" className="h-8 w-8 rounded border border-slate-200 object-cover dark:border-slate-700" />
                      </a>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-400 dark:text-slate-500">{p.note || "-"}</td>
                  <td className="py-2.5 text-right">
                    <button onClick={() => remove(p.id)} className="text-red-500 transition hover:text-red-600 dark:text-red-400">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
