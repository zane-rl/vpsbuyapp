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
