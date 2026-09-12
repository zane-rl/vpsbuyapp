import Link from "next/link";
import { notFound } from "next/navigation";
import BalanceEstimateLine from "@/app/BalanceEstimateLine";
import CopyButton from "@/app/CopyButton";
import ProofThumb from "@/app/ProofThumb";
import { estimateSharedBalance } from "@/lib/billing";
import { getCustomerPrincipal } from "@/lib/customerAuth";
import { formatDate, vpsValidity } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { cycleLabel, money } from "@/lib/money";
import ServerNodeAssignments from "./ServerNodeAssignments";

export const dynamic = "force-dynamic";

export default async function CustomerVpsPage({ params }: { params: { id: string } }) {
  const principal = await getCustomerPrincipal();
  if (!principal) return null;
  const vps = await prisma.vpsServer.findFirst({
    where: { id: params.id, customerId: principal.customerId },
    include: {
      provider: true,
      renewals: { orderBy: { renewDate: "desc" } },
      vpnNodes: { where: { OR: [{ enabled: true }, { assignments: { some: {} } }] }, orderBy: { createdAt: "asc" }, include: { assignments: { include: { managedUser: { select: { id: true, name: true, enabled: true } } } } } },
      customer: { include: { recharges: true, vpsServers: { select: { billingType: true, autoCycle: true, cyclePriceUsd: true, purchaseDate: true, status: true, stoppedAt: true } }, managedUsers: { orderBy: { name: "asc" }, select: { id: true, name: true, enabled: true } } } },
    },
  });
  if (!vps || !vps.customer) notFound();

  const validity = vpsValidity(vps);
  const isAuto = vps.billingType === "auto";
  const estimate = estimateSharedBalance({ recharges: vps.customer.recharges, vpsServers: vps.customer.vpsServers, now: new Date() });
  const specs = [vps.cpu, vps.ram, vps.disk, vps.bandwidth, vps.region, vps.os].filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><Link href="/customer" className="text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400">← 返回服务器与对账</Link><div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{vps.name}</h1><span className={`badge ${validity.badgeClass}`}>{validity.label}</span></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{vps.provider?.name ?? "未指定提供商"}{vps.ipAddress ? ` · ${vps.ipAddress}` : ""}</p></div>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">服务器信息</h2>
        <div className="mt-3 flex flex-wrap gap-2">{specs.map((value) => <span key={value} className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{value}</span>)}</div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-xs text-slate-400">购买时间</dt><dd className="mt-1 font-medium">{formatDate(vps.purchaseDate)}</dd></div>
          <div><dt className="text-xs text-slate-400">计费与有效期</dt><dd className="mt-1 font-medium">{isAuto ? `按${cycleLabel(vps.autoCycle)}自动续费` : formatDate(vps.expiryDate)}</dd></div>
          <div><dt className="text-xs text-slate-400">采购成本</dt><dd className="mt-1 font-medium">${money(vps.purchaseCostUsd)}</dd></div>
          <div><dt className="text-xs text-slate-400">实际付款</dt><dd className="mt-1 font-medium">¥{money(vps.purchasePaidCny)}</dd></div>
        </dl>
        {vps.stoppedAt && <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">永久下线时间：{formatDate(vps.stoppedAt)}</p>}
        {isAuto && <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-950/20"><p className="text-sm">客户共享余额（估算）：<strong>${money(estimate.balanceUsd)}</strong></p><BalanceEstimateLine est={estimate} className="mt-1" /></div>}
        {vps.paymentProof && <div className="mt-4"><span className="mr-2 text-xs text-slate-400">购买付款凭证</span><ProofThumb proof={vps.paymentProof} alt="购买付款凭证" /></div>}
      </section>

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">VPN 节点与用户分配</h2><Link href="/customer/users" className="text-xs font-medium text-indigo-600 dark:text-indigo-400">管理全部用户 →</Link></div>
        {vps.vpnNodes.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">此服务器暂无 VPN 节点</p> : <div className="space-y-4">{vps.vpnNodes.map((node) => <div key={node.id}><div className="mb-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50"><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">{node.protocol}</span><strong>{node.name}</strong>{!node.enabled && <span className="text-xs text-amber-600">已禁用</span>}</div><p className="mt-1 text-slate-500">{node.address || vps.ipAddress || "未填写地址"}{node.port ? `:${node.port}` : ""}</p>{node.config && <pre className="mt-2 whitespace-pre-wrap break-all rounded-lg bg-white p-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">{node.config}</pre>}{node.subscribeUrl && <div className="mt-2"><CopyButton text={node.subscribeUrl} /></div>}</div><ServerNodeAssignments nodes={[node]} users={vps.customer!.managedUsers} vpsActive={vps.status === "active"} /></div>)}</div>}
      </section>

      {!isAuto && <section className="card p-5"><h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">续费记录</h2>{vps.renewals.length === 0 ? <p className="text-sm text-slate-400">暂无续费记录</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="table-head"><th className="py-2">续费时间</th><th>到期变更</th><th className="text-right">成本 $</th><th className="text-right">实付 ¥</th><th>凭证</th></tr></thead><tbody>{vps.renewals.map((r) => <tr key={r.id} className="table-row"><td className="py-2.5">{formatDate(r.renewDate)}</td><td>{formatDate(r.previousExpiry)} → {formatDate(r.newExpiry)}</td><td className="text-right">${money(r.costUsd)}</td><td className="text-right">¥{money(r.paidCny)}</td><td><ProofThumb proof={r.paymentProof} alt="续费凭证" /></td></tr>)}</tbody></table></div>}</section>}
    </div>
  );
}
