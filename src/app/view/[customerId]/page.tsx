import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, vpsValidity } from "@/lib/dates";
import { cycleLabel, money } from "@/lib/money";
import { estimateSharedBalance } from "@/lib/billing";
import BalanceEstimateLine from "@/app/BalanceEstimateLine";
import ThemeToggle from "../../ThemeToggle";
import CopyButton from "../../CopyButton";

export const dynamic = "force-dynamic";

export default async function CustomerPublicPage({ params }: { params: { customerId: string } }) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.customerId },
    include: {
      vpsServers: {
        include: {
          provider: true,
          vpnNodes: { where: { enabled: true }, orderBy: { createdAt: "asc" } },
          renewals: { select: { costUsd: true, paidCny: true } },
        },
        orderBy: { expiryDate: { sort: "asc", nulls: "last" } },
      },
      recharges: { orderBy: { rechargeDate: "desc" } },
    },
  });

  if (!customer) notFound();

  const list = customer.vpsServers;
  const rechargeCostUsd = customer.recharges.reduce((s, r) => s + r.amountUsd, 0);
  const rechargePaidCny = customer.recharges.reduce((s, r) => s + r.paidCny, 0);
  // 当前共享余额（估算）：最近一次充值余额 − 自动续费 VPS 按周期单价折算的累计消耗
  const hasAuto = list.some((v) => v.billingType === "auto");
  const balanceEst = estimateSharedBalance({ recharges: customer.recharges, vpsServers: list, now: new Date() });
  const sharedBalanceUsd = balanceEst.balanceUsd;
  // 合计：含续费与充值的成本与实付
  const totalCostUsd =
    list.reduce((s, v) => s + v.purchaseCostUsd + v.renewals.reduce((rs, r) => rs + r.costUsd, 0), 0) +
    rechargeCostUsd;
  const totalPaidCny =
    list.reduce((s, v) => s + v.purchasePaidCny + v.renewals.reduce((rs, r) => rs + r.paidCny, 0), 0) +
    rechargePaidCny;

  return (
    <main className="app-bg min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-400">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              {customer.name}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              VPS 服务清单
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              共 <span className="font-semibold text-slate-700 dark:text-slate-200">{list.length}</span> 台服务器
            </p>
          </div>
          <ThemeToggle />
        </header>

        {/* 合计 */}
        <section className={`mb-6 grid gap-4 ${hasAuto ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <div className="card p-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">总购买成本</p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              ${money(totalCostUsd)}<span className="ml-1 text-xs font-normal text-slate-400">USD</span>
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">总实际付款</p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              ¥{money(totalPaidCny)}<span className="ml-1 text-xs font-normal text-slate-400">CNY</span>
            </p>
          </div>
          {hasAuto && (
            <div className="card p-4">
              <p className="text-xs text-slate-400 dark:text-slate-500">当前充值余额（估算）</p>
              <p className={`mt-1.5 text-2xl font-bold tracking-tight ${balanceEst.depleted ? "text-red-600 dark:text-red-400" : "text-sky-600 dark:text-sky-400"}`}>
                ${money(sharedBalanceUsd)}<span className="ml-1 text-xs font-normal text-slate-400">USD</span>
              </p>
              <BalanceEstimateLine est={balanceEst} className="mt-1" />
            </div>
          )}
        </section>

        {list.length === 0 ? (
          <div className="card border-dashed p-16 text-center text-slate-400">该客户暂无 VPS 记录</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((vps) => {
              const va = vpsValidity(vps);
              const isAuto = vps.billingType === "auto";
              const specs = [vps.cpu, vps.ram, vps.disk].filter(Boolean).join(" · ");
              return (
                <article key={vps.id} className="card card-hover animate-fade-in p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${va.dotClass}`} />
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{vps.name}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {vps.provider?.name ?? "未指定"}
                          {vps.region ? ` · ${vps.region}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${va.badgeClass}`}>{va.label}</span>
                  </div>

                  {(specs || vps.bandwidth) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[specs, vps.bandwidth].filter(Boolean).map((s, i) => (
                        <span key={i} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                      <dt className="text-xs text-slate-400 dark:text-slate-500">购买时间</dt>
                      <dd className="font-medium text-slate-700 dark:text-slate-200">{formatDate(vps.purchaseDate)}</dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                      <dt className="text-xs text-slate-400 dark:text-slate-500">{isAuto ? "续费方式 / 预估到期" : "到期时间"}</dt>
                      <dd className="font-medium text-slate-700 dark:text-slate-200">
                        {isAuto ? (
                          <>
                            <div>{`按${cycleLabel(vps.autoCycle)}自动续费${vps.cyclePriceUsd != null ? ` · $${money(vps.cyclePriceUsd)}/${cycleLabel(vps.autoCycle)}` : ""}`}</div>
                            <BalanceEstimateLine est={balanceEst} className="mt-0.5 font-normal" />
                          </>
                        ) : (
                          formatDate(vps.expiryDate)
                        )}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                      <dt className="text-xs text-slate-400 dark:text-slate-500">购买成本</dt>
                      <dd className="font-medium text-slate-700 dark:text-slate-200">${money(vps.purchaseCostUsd)}</dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                      <dt className="text-xs text-slate-400 dark:text-slate-500">实际付款</dt>
                      <dd className="font-medium text-slate-700 dark:text-slate-200">¥{money(vps.purchasePaidCny)}</dd>
                    </div>
                  </dl>

                  {vps.paymentProof && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">付款截图</p>
                      <a href={`/api/files/${vps.paymentProof}`} target="_blank" rel="noreferrer">
                        <img
                          src={`/api/files/${vps.paymentProof}`}
                          alt="付款截图"
                          className="h-24 w-full rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                        />
                      </a>
                    </div>
                  )}

                  {vps.vpnNodes.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <p className="mb-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                        VPN 节点（{vps.vpnNodes.length}）
                      </p>
                      <ul className="space-y-1.5">
                        {vps.vpnNodes.map((n) => (
                          <li key={n.id} className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                              {n.protocol}
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{n.name}</span>
                            {n.address && (
                              <span className="text-slate-400 dark:text-slate-500">
                                {n.address}{n.port ? `:${n.port}` : ""}
                              </span>
                            )}
                            {n.subscribeUrl && <CopyButton text={n.subscribeUrl} />}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
