import { num, optNum, parseDate, str } from "./validate";

export type BillingFields = {
  billingType: string;
  termPeriod: string | null;
  expiryDate: Date | null;
  autoCycle: string | null;
  cyclePriceUsd: number | null;
};

/** 从请求体解析计费相关字段；非法返回 { error }，合法返回 { fields } */
export function parseBilling(
  body: any
): { error: string } | { fields: BillingFields } {
  const billingType = str(body.billingType) === "auto" ? "auto" : "term";

  if (billingType === "term") {
    const expiryDate = parseDate(body.expiryDate);
    if (!expiryDate) return { error: "请填写有效的到期时间" };
    const periodIn = str(body.termPeriod);
    const termPeriod =
      periodIn === "monthly" || periodIn === "quarterly" || periodIn === "yearly" ? periodIn : null;
    return {
      fields: {
        billingType,
        termPeriod,
        expiryDate,
        autoCycle: null,
        cyclePriceUsd: null,
      },
    };
  }

  // auto
  const cycleIn = str(body.autoCycle);
  const autoCycle =
    cycleIn === "hourly" || cycleIn === "quarterly" || cycleIn === "yearly" ? cycleIn : "monthly";
  return {
    fields: {
      billingType,
      termPeriod: null,
      expiryDate: null,
      autoCycle,
      cyclePriceUsd: optNum(body.cyclePriceUsd),
    },
  };
}

/** 续费/余额金额取数（非负，默认 0） */
export { num };

// ——— 自动续费余额估算（客户级共享余额随时间按周期单价折算消耗）———

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** 周期 → 估算天数（hourly 按 1/24 天计）。用于把周期单价折算为日均消耗。 */
export function cycleDays(cycle: string | null | undefined): number {
  switch (cycle) {
    case "hourly":
      return 1 / 24;
    case "quarterly":
      return 90;
    case "yearly":
      return 365;
    default: // monthly
      return 30;
  }
}

type AutoVps = {
  billingType?: string | null;
  autoCycle?: string | null;
  cyclePriceUsd?: number | null;
  purchaseDate: Date | string;
};

type RechargeLite = {
  balanceAfter: number;
  rechargeDate: Date | string;
};

export type SharedBalanceEstimate = {
  /** 名下是否有自动续费 VPS */
  hasAuto: boolean;
  /** 是否有可用于估算的周期单价（>0） */
  hasPricing: boolean;
  /** 是否已登记过充值（决定有无 base 余额） */
  hasRecharge: boolean;
  /** 估算的当前余额（USD，已钳到 ≥0） */
  balanceUsd: number;
  /** 日均消耗（USD/天） */
  dailyBurnUsd: number;
  /** 预计耗尽日；无法估算（无单价/无充值/无消耗）时为 null */
  depletionDate: Date | null;
  /** 距耗尽还剩天数（向下取整）；无法估算为 null */
  daysRemaining: number | null;
  /** 余额是否已耗尽（base − 累计消耗 ≤ 0） */
  depleted: boolean;
};

function toDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

/**
 * 估算客户级共享余额与自动续费预计耗尽日。
 * 余额 = 最近一次充值的 balanceAfter − Σ(各 auto VPS 日均消耗 × 自 max(充值日, 购买日) 起经过的天数)。
 * 预计耗尽日 = now + 剩余余额 / 日均消耗。均为估算值。
 */
export function estimateSharedBalance(params: {
  recharges: RechargeLite[];
  vpsServers: AutoVps[];
  now: Date;
}): SharedBalanceEstimate {
  const { recharges, vpsServers, now } = params;

  const autoList = vpsServers.filter((v) => v.billingType === "auto");
  const hasAuto = autoList.length > 0;

  // 最近一条充值（recharges 约定按 rechargeDate desc；这里不依赖外部排序，自行求最新）
  let latest: RechargeLite | null = null;
  for (const r of recharges) {
    if (!latest || toDate(r.rechargeDate).getTime() > toDate(latest.rechargeDate).getTime()) {
      latest = r;
    }
  }
  const hasRecharge = latest != null;
  const base = latest?.balanceAfter ?? 0;
  const since = latest ? toDate(latest.rechargeDate) : null;

  let dailyBurnUsd = 0;
  let consumed = 0;
  for (const v of autoList) {
    const price = v.cyclePriceUsd ?? 0;
    if (price <= 0) continue;
    const perDay = price / cycleDays(v.autoCycle);
    dailyBurnUsd += perDay;
    // 自 max(充值日, 购买日) 起算消耗；无充值记录则无 base，可估耗尽但 base=0
    const start = since
      ? new Date(Math.max(since.getTime(), toDate(v.purchaseDate).getTime()))
      : toDate(v.purchaseDate);
    // 按整天累计消耗：当天登记余额不立刻扣减，每满一天扣一天（预估，避免登记当天就低于登记值）
    const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / MS_PER_DAY));
    consumed += perDay * days;
  }

  const hasPricing = dailyBurnUsd > 0;
  const remainingRaw = base - consumed;
  const depleted = hasRecharge && hasPricing && remainingRaw <= 0;
  const balanceUsd = Math.max(0, remainingRaw);

  let depletionDate: Date | null = null;
  let daysRemaining: number | null = null;
  if (hasPricing && hasRecharge) {
    const remDays = balanceUsd / dailyBurnUsd;
    daysRemaining = Math.floor(remDays);
    depletionDate = new Date(now.getTime() + remDays * MS_PER_DAY);
  }

  return { hasAuto, hasPricing, hasRecharge, balanceUsd, dailyBurnUsd, depletionDate, daysRemaining, depleted };
}
