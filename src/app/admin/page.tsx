import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  daysUntil,
  expiryStatus,
  formatDate,
  statusBadgeClass,
  statusDotClass,
  statusLabel,
} from "@/lib/dates";
import { money } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [list, vpsAgg, renewAgg, payAgg] = await Promise.all([
    prisma.vpsServer.findMany({
      orderBy: { expiryDate: "asc" },
      include: {
        provider: true,
        customer: true,
        _count: { select: { vpnNodes: true, renewals: true } },
      },
    }),
    prisma.vpsServer.aggregate({ _sum: { purchaseCostUsd: true, purchasePaidCny: true } }),
    prisma.vpsRenewal.aggregate({ _sum: { costUsd: true, paidCny: true } }),
    prisma.customerPayment.aggregate({ _sum: { amountCny: true } }),
  ]);

  const totalCostUsd = (vpsAgg._sum.purchaseCostUsd ?? 0) + (renewAgg._sum.costUsd ?? 0);
  const totalPaidCny = (vpsAgg._sum.purchasePaidCny ?? 0) + (renewAgg._sum.paidCny ?? 0);
  const totalReceivedCny = payAgg._sum.amountCny ?? 0;
  const diffCny = totalReceivedCny - totalPaidCny;

  const expiringCount = list.filter((v) => expiryStatus(v.expiryDate) !== "valid").length;

  const cards = [
    { label: "总成本", value: `$${money(totalCostUsd)}`, hint: "USD", accent: "text-slate-900 dark:text-slate-100" },
    { label: "总实付成本", value: `¥${money(totalPaidCny)}`, hint: "CNY", accent: "text-slate-900 dark:text-slate-100" },
    { label: "总收款", value: `¥${money(totalReceivedCny)}`, hint: "CNY", accent: "text-slate-900 dark:text-slate-100" },
    {
      label: "差额（收款 − 实付）",
      value: `¥${money(diffCny)}`,
      hint: "CNY",
      accent: diffCny >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">概览</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            共 {list.length} 台 VPS
            {expiringCount > 0 && (
              <span className="ml-1 text-amber-600 dark:text-amber-400">· {expiringCount} 台需关注续费</span>
            )}
          </p>
        </div>
      </div>

      {/* 财务汇总 */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card card-hover p-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">{c.label}</p>
            <p className={`mt-1.5 text-2xl font-bold tracking-tight ${c.accent}`}>
              {c.value}
              <span className="ml-1 text-xs font-normal text-slate-400">{c.hint}</span>
            </p>
          </div>
        ))}
      </section>

      {/* VPS 列表 */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">VPS 列表</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {list.length}
          </span>
        </div>
        {list.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            暂无记录，点击右上角「+ 新增 VPS」开始添加
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-5 py-2.5">名称 / 提供商</th>
                  <th className="px-3 py-2.5">客户</th>
                  <th className="px-3 py-2.5">到期时间</th>
                  <th className="px-3 py-2.5">剩余</th>
                  <th className="px-3 py-2.5 text-right">成本 $</th>
                  <th className="px-3 py-2.5 text-right">实付 ¥</th>
                  <th className="px-3 py-2.5 text-center">节点</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((vps) => {
                  const days = daysUntil(vps.expiryDate);
                  const status = expiryStatus(vps.expiryDate);
                  return (
                    <tr key={vps.id} className="table-row even:bg-slate-50/60 dark:even:bg-slate-800/20">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(status)}`} />
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-100">{vps.name}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500">
                              {vps.provider?.name ?? "未指定"}
                              {vps.region ? ` · ${vps.region}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                        {vps.customer ? (
                          <Link href={`/admin/customers/${vps.customer.id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                            {vps.customer.name}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{formatDate(vps.expiryDate)}</td>
                      <td className="px-3 py-3">
                        <span className={`badge ${statusBadgeClass(status)}`}>{statusLabel(status, days)}</span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">${money(vps.purchaseCostUsd)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">¥{money(vps.purchasePaidCny)}</td>
                      <td className="px-3 py-3 text-center text-slate-500">{vps._count.vpnNodes}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <Link href={`/admin/vps/new?from=${vps.id}`} className="text-slate-400 transition hover:text-indigo-600 dark:hover:text-indigo-400" title="基于此 VPS 复制新增">
                            复制
                          </Link>
                          <Link href={`/admin/vps/${vps.id}`} className="font-medium text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400">
                            管理
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
