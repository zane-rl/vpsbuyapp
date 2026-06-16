export type ExpiryStatus = "valid" | "expiring" | "expired";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** 距离到期还剩多少天（已过期返回负数）。按自然日计算。 */
export function daysUntil(expiry: Date | string): number {
  const exp = typeof expiry === "string" ? new Date(expiry) : expiry;
  const now = new Date();
  // 归零到当天 00:00，避免小时差导致的偏差
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfExpiry = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
  return Math.round((startOfExpiry.getTime() - startOfToday.getTime()) / MS_PER_DAY);
}

/** 到期状态：valid(>7天) / expiring(0~7天) / expired(<0) */
export function expiryStatus(expiry: Date | string): ExpiryStatus {
  const days = daysUntil(expiry);
  if (days < 0) return "expired";
  if (days <= 7) return "expiring";
  return "valid";
}

/** 状态对应的中文标签 */
export function statusLabel(status: ExpiryStatus, days: number): string {
  switch (status) {
    case "expired":
      return `已过期 ${Math.abs(days)} 天`;
    case "expiring":
      return days === 0 ? "今天到期" : `剩 ${days} 天`;
    default:
      return `剩 ${days} 天`;
  }
}

/** 状态对应的 Tailwind 颜色类（徽章，含深色模式） */
export function statusBadgeClass(status: ExpiryStatus): string {
  switch (status) {
    case "expired":
      return "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900/60";
    case "expiring":
      return "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60";
    default:
      return "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60";
  }
}

/** 状态对应的文字颜色（含深色模式） */
export function statusTextClass(status: ExpiryStatus): string {
  switch (status) {
    case "expired":
      return "text-red-600 dark:text-red-400";
    case "expiring":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-emerald-600 dark:text-emerald-400";
  }
}

/** 状态对应的圆点颜色 */
export function statusDotClass(status: ExpiryStatus): string {
  switch (status) {
    case "expired":
      return "bg-red-500";
    case "expiring":
      return "bg-amber-500";
    default:
      return "bg-emerald-500";
  }
}

/** 格式化为 YYYY-MM-DD */
export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 将 <input type="date"> 的值转为 Date（按本地 00:00） */
export function parseDateInput(value: string): Date {
  // value 形如 "2026-06-15"
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// ——— 计费类型统一判定（固定期限 / 自动续费）———

export type Validity =
  | {
      kind: "auto";
      label: string;
      badgeClass: string;
      dotClass: string;
      textClass: string;
    }
  | {
      kind: "term";
      status: ExpiryStatus;
      days: number;
      label: string;
      badgeClass: string;
      dotClass: string;
      textClass: string;
    };

/** 自动续费徽章配色（蓝色系，区别于到期状态的绿/黄/红） */
const AUTO_BADGE = "bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/60";
const AUTO_DOT = "bg-sky-500";
const AUTO_TEXT = "text-sky-600 dark:text-sky-400";

/** 根据计费类型统一返回展示信息：auto→「自动续费中」，term→到期状态 */
export function vpsValidity(v: {
  billingType?: string | null;
  expiryDate: Date | string | null | undefined;
}): Validity {
  if (v.billingType === "auto" || !v.expiryDate) {
    return {
      kind: "auto",
      label: "自动续费中",
      badgeClass: AUTO_BADGE,
      dotClass: AUTO_DOT,
      textClass: AUTO_TEXT,
    };
  }
  const days = daysUntil(v.expiryDate);
  const status = expiryStatus(v.expiryDate);
  return {
    kind: "term",
    status,
    days,
    label: statusLabel(status, days),
    badgeClass: statusBadgeClass(status),
    dotClass: statusDotClass(status),
    textClass: statusTextClass(status),
  };
}
