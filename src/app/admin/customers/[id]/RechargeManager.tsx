"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { money } from "@/lib/money";
import ImageUpload from "../../ImageUpload";

type Recharge = {
  id: string;
  amountUsd: number;
  paidCny: number;
  balanceAfter: number;
  rechargeDate: string;
  note: string | null;
  paymentProof: string | null;
};

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

export default function RechargeManager({
  customerId,
  recharges,
}: {
  customerId: string;
  recharges: Recharge[];
}) {
  const router = useRouter();
  const [amountUsd, setAmountUsd] = useState("");
  const [paidCny, setPaidCny] = useState("");
  const [balanceAfter, setBalanceAfter] = useState("");
  const [rechargeDate, setRechargeDate] = useState(ymdToday());
  const [note, setNote] = useState("");
  const [paymentProof, setPaymentProof] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/recharges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, amountUsd, paidCny, balanceAfter, rechargeDate, note, paymentProof }),
    });
    setBusy(false);
    if (res.ok) {
      setAmountUsd("");
      setPaidCny("");
      setBalanceAfter("");
      setNote("");
      setRechargeDate(ymdToday());
      setPaymentProof("");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "添加失败");
    }
  }

  async function remove(id: string) {
    if (!confirm("确认删除该充值记录？")) return;
    const res = await fetch(`/api/admin/recharges/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert("删除失败");
  }

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
        <div className="grid gap-2 sm:grid-cols-4">
          <label className="block">
            <span className="label">充值金额 (USD) *</span>
            <input type="number" step="0.01" min="0" className="input" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} placeholder="0.00" />
          </label>
          <label className="block">
            <span className="label">实际付款 (CNY)</span>
            <input type="number" step="0.01" min="0" className="input" value={paidCny} onChange={(e) => setPaidCny(e.target.value)} placeholder="0.00" />
          </label>
          <label className="block">
            <span className="label">充值后余额 (USD)</span>
            <input type="number" step="0.01" min="0" className="input" value={balanceAfter} onChange={(e) => setBalanceAfter(e.target.value)} placeholder="服务商实际余额" />
          </label>
          <label className="block">
            <span className="label">充值时间</span>
            <input type="date" className="input" value={rechargeDate} onChange={(e) => setRechargeDate(e.target.value)} />
          </label>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="label">备注</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="如：充值渠道/覆盖哪些自动续费 VPS" />
          </label>
          <ImageUpload label="付款截图" value={paymentProof} onChange={setPaymentProof} />
        </div>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary mt-2 px-4 py-2">记一笔充值</button>
      </form>

      {recharges.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">暂无充值记录</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="py-2 pr-4">充值时间</th>
                <th className="py-2 pr-4 text-right">充值 $</th>
                <th className="py-2 pr-4 text-right">实付 ¥</th>
                <th className="py-2 pr-4 text-right">充值后余额 $</th>
                <th className="py-2 pr-4">截图</th>
                <th className="py-2 pr-4">备注</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {recharges.map((r) => (
                <tr key={r.id} className="table-row">
                  <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{fmt(r.rechargeDate)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600 dark:text-slate-300">${money(r.amountUsd)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600 dark:text-slate-300">¥{money(r.paidCny)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-slate-700 dark:text-slate-200">${money(r.balanceAfter)}</td>
                  <td className="py-2.5 pr-4">
                    {r.paymentProof ? (
                      <a href={`/api/files/${r.paymentProof}`} target="_blank" rel="noreferrer">
                        <img src={`/api/files/${r.paymentProof}`} alt="充值截图" className="h-8 w-8 rounded border border-slate-200 object-cover dark:border-slate-700" />
                      </a>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-400 dark:text-slate-500">{r.note || "-"}</td>
                  <td className="py-2.5 text-right">
                    <button onClick={() => remove(r.id)} className="text-red-500 transition hover:text-red-600 dark:text-red-400">删除</button>
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
