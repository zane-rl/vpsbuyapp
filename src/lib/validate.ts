// 请求体校验与归一化工具

export function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** 可空字符串：空串归一为 null */
export function optStr(v: unknown): string | null {
  const s = str(v);
  return s.length > 0 ? s : null;
}

/** 非负数，非法或负数归一为 0 */
export function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!isFinite(n) || n < 0) return 0;
  return n;
}

/** 可空非负数：空/非法/负数归一为 null（区别于 num 的默认 0） */
export function optNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!isFinite(n) || n < 0) return null;
  return n;
}

/** 可空整数（端口等） */
export function optInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseInt(String(v), 10);
  if (!isFinite(n)) return null;
  return n;
}

/** 解析日期字符串（YYYY-MM-DD 或 ISO），失败返回 null */
export function parseDate(v: unknown): Date | null {
  const s = str(v);
  if (!s) return null;
  // 纯日期按本地 00:00 解析
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
