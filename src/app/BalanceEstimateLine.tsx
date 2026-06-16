import { formatDate } from "@/lib/dates";
import type { SharedBalanceEstimate } from "@/lib/billing";

/**
 * 共享余额「预计可用至 / 约 N 天」估算提示行（服务端渲染，纯展示）。
 * 名下无自动续费 VPS 时不渲染任何内容（返回 null）。
 */
export default function BalanceEstimateLine({
  est,
  className = "",
}: {
  est: SharedBalanceEstimate;
  className?: string;
}) {
  if (!est.hasAuto) return null;

  let text: string;
  let tone = "text-slate-400 dark:text-slate-500";

  if (est.depleted) {
    text = "余额已耗尽";
    tone = "text-red-600 dark:text-red-400";
  } else if (!est.hasRecharge) {
    text = "请先登记充值余额";
  } else if (!est.hasPricing) {
    text = "未设周期单价，无法预估到期";
  } else {
    const days = est.daysRemaining ?? 0;
    const tail = days <= 7 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
    tone = tail;
    text = `预计可用至 ${formatDate(est.depletionDate)}（约 ${days} 天）`;
  }

  return <p className={`text-xs ${tone} ${className}`}>{text}</p>;
}
