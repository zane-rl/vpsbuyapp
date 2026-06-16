import Link from "next/link";
import { prisma } from "@/lib/db";
import { money } from "@/lib/money";
import AddCustomer from "./AddCustomer";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      vpsServers: {
        include: {
          renewals: { select: { paidCny: true } },
          balanceLogs: { select: { paidCny: true } },
        },
      },
      payments: { select: { amountCny: true } },
    },
  });

  const rows = customers.map((c) => {
    const paid = c.vpsServers.reduce(
      (s, v) =>
        s +
        v.purchasePaidCny +
        v.renewals.reduce((rs, r) => rs + r.paidCny, 0) +
        v.balanceLogs.reduce((bs, b) => bs + b.paidCny, 0),
      0
    );
    const received = c.payments.reduce((s, p) => s + p.amountCny, 0);
    return { ...c, vpsCount: c.vpsServers.length, paid, received, diff: received - paid };
  });

  return (
    <div className="animate-fade-in mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">客户</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          每个客户独立结算：汇总名下所有 VPS 的实付成本与收款，计算差额。
        </p>
      </div>

      <AddCustomer />

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">暂无客户</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-5 py-2.5">客户</th>
                  <th className="px-3 py-2.5 text-center">VPS</th>
                  <th className="px-3 py-2.5 text-right">实付成本 ¥</th>
                  <th className="px-3 py-2.5 text-right">收款 ¥</th>
                  <th className="px-3 py-2.5 text-right">差额 ¥</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="table-row even:bg-slate-50/60 dark:even:bg-slate-800/20">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-100">{c.name}</div>
                      {c.note && <div className="text-xs text-slate-400 dark:text-slate-500">{c.note}</div>}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-500">{c.vpsCount}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">¥{money(c.paid)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">¥{money(c.received)}</td>
                    <td className={`px-3 py-3 text-right font-medium tabular-nums ${c.diff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      ¥{money(c.diff)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/admin/customers/${c.id}`} className="font-medium text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400">
                        管理
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
