import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, vpsValidity } from "@/lib/dates";
import { money } from "@/lib/money";
import PaymentManager from "./PaymentManager";
import ShareLink from "./ShareLink";
import CustomerEditor from "./CustomerEditor";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      vpsServers: {
        include: {
          provider: true,
          renewals: { select: { costUsd: true, paidCny: true } },
          balanceLogs: { select: { topupUsd: true, paidCny: true } },
        },
        orderBy: { expiryDate: { sort: "asc", nulls: "last" } },
      },
      payments: { orderBy: { payDate: "desc" } },
    },
  });

  if (!customer) notFound();

  const totalCostUsd = customer.vpsServers.reduce(
    (s, v) =>
      s +
      v.purchaseCostUsd +
      v.renewals.reduce((rs, r) => rs + r.costUsd, 0) +
      v.balanceLogs.reduce((bs, b) => bs + b.topupUsd, 0),
    0
  );
  const totalPaidCny = customer.vpsServers.reduce(
    (s, v) =>
      s +
      v.purchasePaidCny +
      v.renewals.reduce((rs, r) => rs + r.paidCny, 0) +
      v.balanceLogs.reduce((bs, b) => bs + b.paidCny, 0),
    0
  );
  const totalReceivedCny = customer.payments.reduce((s, p) => s + p.amountCny, 0);
  const diffCny = totalReceivedCny - totalPaidCny;

  const payments = customer.payments.map((p) => ({
    id: p.id,
    amountCny: p.amountCny,
    payDate: p.payDate.toISOString(),
    note: p.note,
    paymentProof: p.paymentProof,
  }));

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
    <div className="animate-fade-in mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/admin/customers" className="text-sm text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
          ← 返回客户列表
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{customer.name}</h1>
          <CustomerEditor id={customer.id} name={customer.name} note={customer.note ?? ""} />
        </div>
        {customer.note && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{customer.note}</p>}
      </div>

      {/* 结算汇总 */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">{c.label}</p>
            <p className={`mt-1.5 text-2xl font-bold tracking-tight ${c.accent}`}>
              {c.value}
              <span className="ml-1 text-xs font-normal text-slate-400">{c.hint}</span>
            </p>
          </div>
        ))}
      </section>

      {/* 对客户公开链接 */}
      <section className="card p-5">
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">客户专属查看链接</h2>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          可分享给该客户，无需登录即可查看其名下所有 VPS、购买成本/实付及合计。
        </p>
        <ShareLink path={`/view/${customer.id}`} />
      </section>

      {/* VPS 列表 */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">名下 VPS（{customer.vpsServers.length}）</h2>
          <Link href={`/admin/vps/new?customer=${customer.id}`} className="btn-primary px-3 py-1.5">+ 新增到此客户</Link>
        </div>
        {customer.vpsServers.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">该客户暂无 VPS</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-5 py-2.5">名称 / 提供商</th>
                  <th className="px-3 py-2.5">到期</th>
                  <th className="px-3 py-2.5">剩余</th>
                  <th className="px-3 py-2.5 text-right">成本 $</th>
                  <th className="px-3 py-2.5 text-right">实付 ¥</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {customer.vpsServers.map((v) => {
                  const va = vpsValidity(v);
                  return (
                    <tr key={v.id} className="table-row even:bg-slate-50/60 dark:even:bg-slate-800/20">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{v.name}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{v.provider?.name ?? "未指定"}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{v.expiryDate ? formatDate(v.expiryDate) : <span className="text-slate-400">自动续费</span>}</td>
                      <td className="px-3 py-3">
                        <span className={`badge ${va.badgeClass}`}>{va.label}</span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">${money(v.purchaseCostUsd)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">¥{money(v.purchasePaidCny)}</td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/admin/vps/${v.id}`} className="font-medium text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400">管理</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 收款台账 */}
      <section className="card p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">收款记录</h2>
        <PaymentManager customerId={customer.id} payments={payments} />
      </section>
    </div>
  );
}
