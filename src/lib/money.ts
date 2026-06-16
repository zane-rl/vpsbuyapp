/** 格式化金额为两位小数（千分位） */
export function money(n: number | null | undefined): string {
  const v = typeof n === "number" ? n : 0;
  return v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 人民币 */
export function cny(n: number | null | undefined): string {
  return `¥${money(n)}`;
}

/** 美元 */
export function usd(n: number | null | undefined): string {
  return `$${money(n)}`;
}

/** 自动续费周期中文 */
export function cycleLabel(c: string | null | undefined): string {
  return c === "hourly" ? "小时" : c === "quarterly" ? "季度" : c === "yearly" ? "年" : "月";
}

/** 一次性购买周期中文（月/季度/年） */
export function periodLabel(p: string | null | undefined): string {
  return p === "quarterly" ? "季度" : p === "yearly" ? "年" : "月";
}
