import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, vpsValidity } from "@/lib/dates";
import VpsForm from "../VpsForm";
import { toFormData } from "../vpsFormData";
import RenewForm from "./RenewForm";
import RenewalDeleteButton from "./RenewalDeleteButton";
import BalanceForm from "./BalanceForm";
import BalanceDeleteButton from "./BalanceDeleteButton";
import NodeManager from "./NodeManager";
import { cycleLabel, money } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function VpsDetailPage({ params }: { params: { id: string } }) {
  const [vps, customers, providers] = await Promise.all([
    prisma.vpsServer.findUnique({
      where: { id: params.id },
      include: {
        provider: true,
        customer: true,
        renewals: { orderBy: { renewDate: "desc" } },
        balanceLogs: { orderBy: { logDate: "desc" } },
        vpnNodes: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.provider.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!vps) notFound();

  const validity = vpsValidity(vps);
  const isAuto = vps.billingType === "auto";

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
          ← 返回列表
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{vps.name}</h1>
          <span className={`badge ${validity.badgeClass}`}>{validity.label}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {vps.customer?.name ? `${vps.customer.name} · ` : ""}
          {vps.provider?.name ?? "未指定提供商"}
          {vps.region ? ` · ${vps.region}` : ""}
          {isAuto
            ? ` · 按${cycleLabel(vps.autoCycle)}自动续费${
                vps.cyclePriceUsd != null ? ` · $${money(vps.cyclePriceUsd)}/${cycleLabel(vps.autoCycle)}` : ""
              }${vps.balanceAmount != null ? ` · 余额 $${money(vps.balanceAmount)}` : ""}`
            : ` · 到期 ${formatDate(vps.expiryDate)}`}
        </p>
      </div>

      {/* 自动续费：更新余额/充值 */}
      {isAuto && (
        <section className="card p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              余额 / 充值{vps.balanceAmount != null && (
                <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                  当前余额 ${money(vps.balanceAmount)}
                </span>
              )}
            </h2>
            <BalanceForm vpsId={vps.id} />
          </div>
          {vps.balanceLogs.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">暂无余额/充值记录</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-head">
                    <th className="py-2 pr-4">时间</th>
                    <th className="py-2 pr-4 text-right">充值 $</th>
                    <th className="py-2 pr-4 text-right">实付 ¥</th>
                    <th className="py-2 pr-4 text-right">更新后余额 $</th>
                    <th className="py-2 pr-4">截图</th>
                    <th className="py-2 pr-4">备注</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {vps.balanceLogs.map((b) => (
                    <tr key={b.id} className="table-row">
                      <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{formatDate(b.logDate)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600 dark:text-slate-300">${money(b.topupUsd)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600 dark:text-slate-300">¥{money(b.paidCny)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-slate-700 dark:text-slate-200">${money(b.balanceAfter)}</td>
                      <td className="py-2.5 pr-4">
                        {b.paymentProof ? (
                          <a href={`/api/files/${b.paymentProof}`} target="_blank" rel="noreferrer">
                            <img src={`/api/files/${b.paymentProof}`} alt="截图" className="h-8 w-8 rounded border border-slate-200 object-cover dark:border-slate-700" />
                          </a>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-400 dark:text-slate-500">{b.note || "-"}</td>
                      <td className="py-2.5 text-right">
                        <BalanceDeleteButton logId={b.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* 固定期限：续费 */}
      {!isAuto && (
      <section className="card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">续费</h2>
          <RenewForm vpsId={vps.id} />
        </div>

        {vps.renewals.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">暂无续费记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head">
                  <th className="py-2 pr-4">续费时间</th>
                  <th className="py-2 pr-4">到期变更</th>
                  <th className="py-2 pr-4 text-right">成本 $</th>
                  <th className="py-2 pr-4 text-right">实付 ¥</th>
                  <th className="py-2 pr-4">截图</th>
                  <th className="py-2 pr-4">备注</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {vps.renewals.map((r) => (
                  <tr key={r.id} className="table-row">
                    <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{formatDate(r.renewDate)}</td>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                      {formatDate(r.previousExpiry)} → {formatDate(r.newExpiry)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600 dark:text-slate-300">${money(r.costUsd)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600 dark:text-slate-300">¥{money(r.paidCny)}</td>
                    <td className="py-2.5 pr-4">
                      {r.paymentProof ? (
                        <a href={`/api/files/${r.paymentProof}`} target="_blank" rel="noreferrer">
                          <img src={`/api/files/${r.paymentProof}`} alt="截图" className="h-8 w-8 rounded border border-slate-200 object-cover dark:border-slate-700" />
                        </a>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-400 dark:text-slate-500">{r.notes || "-"}</td>
                    <td className="py-2.5 text-right">
                      <RenewalDeleteButton renewalId={r.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {/* VPN 节点 */}
      <section className="card p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          VPN 节点（{vps.vpnNodes.length}）
        </h2>
        <NodeManager vpsId={vps.id} nodes={vps.vpnNodes} />
      </section>

      {/* 编辑 VPS */}
      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">编辑信息</h2>
        <VpsForm initial={toFormData(vps)} customers={customers} providers={providers} />
      </section>
    </div>
  );
}
