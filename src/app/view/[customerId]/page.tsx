import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, vpsValidity } from "@/lib/dates";
import { cycleLabel, money } from "@/lib/money";
import { estimateSharedBalance } from "@/lib/billing";
import BalanceEstimateLine from "@/app/BalanceEstimateLine";
import ProofThumb from "@/app/ProofThumb";
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
          renewals: { orderBy: { renewDate: "desc" } },
        },
        orderBy: { expiryDate: { sort: "asc", nulls: "last" } },
      },
      recharges: { orderBy: { rechargeDate: "desc" } },
      payments: { orderBy: { payDate: "desc" } },
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
  const totalReceivedCny = customer.payments.reduce((s, p) => s + p.amountCny, 0);
  const diffCny = totalReceivedCny - totalPaidCny;

  // 付款记录：各台 VPS 的购买 + 每次续费 + 客户充值，汇总成一张台账，按日期倒序。
  // 与顶部「总实际付款」同口径，便于和右侧收款记录逐笔对照。
  type PayRow = {
    key: string;
    date: Date;
    target: string;
    kind: string;
    costUsd: number;
    paidCny: number;
    proof: string | null;
    note: string | null;
  };
  const payRows: PayRow[] = [];
  for (const v of list) {
    payRows.push({
      key: `v-${v.id}`,
      date: v.purchaseDate,
      target: v.name,
      kind: "购买",
      costUsd: v.purchaseCostUsd,
      paidCny: v.purchasePaidCny,
      proof: v.paymentProof,
      note: null,
    });
    for (const r of v.renewals) {
      payRows.push({
        key: `r-${r.id}`,
        date: r.renewDate,
        target: v.name,
        kind: "续费",
        costUsd: r.costUsd,
        paidCny: r.paidCny,
        proof: r.paymentProof,
        note: r.notes ? r.notes : `续至 ${formatDate(r.newExpiry)}`,
      });
    }
  }
  for (const rc of customer.recharges) {
    payRows.push({
      key: `c-${rc.id}`,
      date: rc.rechargeDate,
      target: "自动续费余额",
      kind: "充值",
      costUsd: rc.amountUsd,
      paidCny: rc.paidCny,
      proof: rc.paymentProof,
      note: rc.note,
    });
  }
  payRows.sort((a, b) => b.date.getTime() - a.date.getTime());

  const kindClass = (kind: string) =>
    kind === "购买"
      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
      : kind === "续费"
        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
        : "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400";

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
        <section className={`mb-6 grid gap-4 sm:grid-cols-2 ${hasAuto ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
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
          <div className="card p-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">总收款</p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              ¥{money(totalReceivedCny)}<span className="ml-1 text-xs font-normal text-slate-400">CNY</span>
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">差额（收款 − 实付）</p>
            <p className={`mt-1.5 text-2xl font-bold tracking-tight ${diffCny >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              ¥{money(diffCny)}<span className="ml-1 text-xs font-normal text-slate-400">CNY</span>
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

        {/* 付款记录 与 收款记录：左右并排，方便逐笔对照 */}
        <section className="mb-6 grid gap-4 lg:grid-cols-2">
          {/* 付款记录（支出）*/}
          <div className="card p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">付款记录</h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">服务器购买 · 续费 · 余额充值</span>
            </div>
            {payRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">暂无付款记录</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-head">
                      <th className="py-2 pr-3">时间</th>
                      <th className="py-2 pr-3">项目</th>
                      <th className="py-2 pr-3 text-right">成本 $</th>
                      <th className="py-2 pr-3 text-right">实付 ¥</th>
                      <th className="py-2">截图</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payRows.map((r) => (
                      <tr key={r.key} className="table-row">
                        <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {formatDate(r.date)}
                        </td>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${kindClass(r.kind)}`}>
                              {r.kind}
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{r.target}</span>
                          </div>
                          {r.note && (
                            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{r.note}</p>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-slate-500 dark:text-slate-400">
                          ${money(r.costUsd)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums font-medium text-slate-700 dark:text-slate-200">
                          ¥{money(r.paidCny)}
                        </td>
                        <td className="py-2.5">
                          <ProofThumb proof={r.proof} alt={`${r.target}${r.kind}付款截图`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-3 text-xs text-slate-400 dark:text-slate-500">
                        共 {payRows.length} 笔，购买服务器总开销
                      </td>
                      <td className="pt-3 pr-3 text-right text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        ¥{money(totalPaidCny)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* 收款记录（客户已付给我方）*/}
          <div className="card p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">收款记录</h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">您已支付的款项</span>
            </div>
            {customer.payments.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">暂无收款记录</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="table-head">
                      <th className="py-2 pr-3">收款时间</th>
                      <th className="py-2 pr-3 text-right">金额 ¥</th>
                      <th className="py-2 pr-3">备注</th>
                      <th className="py-2">截图</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.payments.map((p) => (
                      <tr key={p.id} className="table-row">
                        <td className="py-2.5 pr-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {formatDate(p.payDate)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                          ¥{money(p.amountCny)}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-400 dark:text-slate-500">{p.note || "-"}</td>
                        <td className="py-2.5">
                          <ProofThumb proof={p.paymentProof} alt="收款截图" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="pt-3 text-xs text-slate-400 dark:text-slate-500">
                        共 {customer.payments.length} 笔，合计
                      </td>
                      <td className="pt-3 pr-3 text-right text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        ¥{money(totalReceivedCny)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${diffCny >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"}`}>
              收款 ¥{money(totalReceivedCny)} − 实付 ¥{money(totalPaidCny)} ={" "}
              <span className="font-bold">¥{money(diffCny)}</span>
            </p>
          </div>
        </section>

        {list.length === 0 ? (
          <div className="card border-dashed p-16 text-center text-slate-400">该客户暂无 VPS 记录</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((vps) => {
              const va = vpsValidity(vps);
              const isAuto = vps.billingType === "auto";
              const specs = [vps.cpu, vps.ram, vps.disk].filter(Boolean).join(" · ");
              const renewPaidCny = vps.renewals.reduce((s, r) => s + r.paidCny, 0);
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
                      <dt className="text-xs text-slate-400 dark:text-slate-500">
                        实际付款{vps.renewals.length > 0 ? `（含 ${vps.renewals.length} 次续费）` : ""}
                      </dt>
                      <dd className="font-medium text-slate-700 dark:text-slate-200">
                        ¥{money(vps.purchasePaidCny + renewPaidCny)}
                      </dd>
                    </div>
                  </dl>

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
