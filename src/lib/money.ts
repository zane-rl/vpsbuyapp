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
