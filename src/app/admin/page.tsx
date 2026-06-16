import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, vpsValidity } from "@/lib/dates";
import { money } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [list, vpsAgg, renewAgg, payAgg, rechargeAgg, customers] = await Promise.all([
    prisma.vpsServer.findMany({
      orderBy: { expiryDate: { sort: "asc", nulls: "last" } },
      include: {
        provider: true,
        customer: true,
        _count: { select: { vpnNodes: true, renewals: true } },
      },
    }),
    prisma.vpsServer.aggregate({ _sum: { purchaseCostUsd: true, purchasePaidCny: true } }),
    prisma.vpsRenewal.aggregate({ _sum: { costUsd: true, paidCny: true } }),
    prisma.customerPayment.aggregate({ _sum: { amountCny: true } }),
    prisma.customerRecharge.aggregate({ _sum: { amountUsd: true, paidCny: true } }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: {
        vpsServers: { include: { renewals: { select: { costUsd: true, paidCny: true } } } },
        payments: { select: { amountCny: true } },
        recharges: { select: { amountUsd: true, paidCny: true } },
      },
    }),
  ]);

  const totalCostUsd = (vpsAgg._sum.purchaseCostUsd ?? 0) + (renewAgg._sum.costUsd ?? 0) + (rechargeAgg._sum.amountUsd ?? 0);
  const totalPaidCny = (vpsAgg._sum.purchasePaidCny ?? 0) + (renewAgg._sum.paidCny ?? 0) + (rechargeAgg._sum.paidCny ?? 0);
  const totalReceivedCny = payAgg._sum.amountCny ?? 0;
  const diffCny = totalReceivedCny - totalPaidCny;

  // 按客户区分的财务统计
  const customerStats = customers.map((c) => {
    const rechargeCostUsd = c.recharges.reduce((s, r) => s + r.amountUsd, 0);
    const rechargePaidCny = c.recharges.reduce((s, r) => s + r.paidCny, 0);
    const costUsd =
      c.vpsServers.reduce((s, v) => s + v.purchaseCostUsd + v.renewals.reduce((rs, r) => rs + r.costUsd, 0), 0) +
      rechargeCostUsd;
    const paidCny =
      c.vpsServers.reduce((s, v) => s + v.purchasePaidCny + v.renewals.reduce((rs, r) => rs + r.paidCny, 0), 0) +
      rechargePaidCny;
    const receivedCny = c.payments.reduce((s, p) => s + p.amountCny, 0);
    return { id: c.id, name: c.name, vpsCount: c.vpsServers.length, costUsd, paidCny, receivedCny, diffCny: receivedCny - paidCny };
  });

  const expiringCount = list.filter((v) => {
    const va = vpsValidity(v);
    return va.kind === "term" && va.status !== "valid";
  }).length;

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

      {/* 按客户统计 */}
      {customerStats.length > 0 && (
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">按客户统计</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {customerStats.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="table-head whitespace-nowrap">
                  <th className="px-5 py-2.5">客户</th>
                  <th className="px-3 py-2.5 text-center">VPS</th>
                  <th className="px-3 py-2.5 text-right">总成本 $</th>
                  <th className="px-3 py-2.5 text-right">总实付 ¥</th>
                  <th className="px-3 py-2.5 text-right">收款 ¥</th>
                  <th className="px-5 py-2.5 text-right">差额 ¥</th>
                </tr>
              </thead>
              <tbody>
                {customerStats.map((c) => (
                  <tr key={c.id} className="table-row even:bg-slate-50/60 dark:even:bg-slate-800/20">
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <Link href={`/admin/customers/${c.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 text-center text-slate-500">{c.vpsCount}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-slate-600 dark:text-slate-300">${money(c.costUsd)}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-slate-600 dark:text-slate-300">¥{money(c.paidCny)}</td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-slate-600 dark:text-slate-300">¥{money(c.receivedCny)}</td>
                    <td className={`px-5 py-3.5 text-right font-medium tabular-nums ${c.diffCny >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      ¥{money(c.diffCny)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="table-head whitespace-nowrap">
                  <th className="px-5 py-2.5">名称 / 提供商</th>
                  <th className="px-3 py-2.5">客户</th>
                  <th className="px-3 py-2.5">IP</th>
                  <th className="px-3 py-2.5">付费类型</th>
                  <th className="px-3 py-2.5">创建时间</th>
                  <th className="px-3 py-2.5">到期时间</th>
                  <th className="px-3 py-2.5">剩余 / 状态</th>
                  <th className="px-3 py-2.5 text-right">成本 $</th>
                  <th className="px-3 py-2.5 text-right">实付 ¥</th>
                  <th className="px-3 py-2.5 text-center">节点</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((vps) => {
                  const va = vpsValidity(vps);
                  return (
                    <tr key={vps.id} className="table-row even:bg-slate-50/60 dark:even:bg-slate-800/20">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${va.dotClass}`} />
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 dark:text-slate-100">{vps.name}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500">
                              {vps.provider?.name ?? "未指定"}
                              {vps.region ? ` · ${vps.region}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-slate-600 dark:text-slate-300">
                        {vps.customer ? (
                          <Link href={`/admin/customers/${vps.customer.id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                            {vps.customer.name}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 tabular-nums text-slate-600 dark:text-slate-300">{vps.ipAddress || <span className="text-slate-400">—</span>}</td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        {va.kind === "auto" ? (
                          <span className="badge bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/60">自动续费</span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">固定期限</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-slate-500 dark:text-slate-400">{formatDate(vps.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-slate-600 dark:text-slate-300">{vps.expiryDate ? formatDate(vps.expiryDate) : <span className="text-slate-400">自动续费</span>}</td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <span className={`badge ${va.badgeClass}`}>{va.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums text-slate-600 dark:text-slate-300">${money(vps.purchaseCostUsd)}</td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-right tabular-nums text-slate-600 dark:text-slate-300">¥{money(vps.purchasePaidCny)}</td>
                      <td className="px-3 py-3.5 text-center text-slate-500">{vps._count.vpnNodes}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
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
