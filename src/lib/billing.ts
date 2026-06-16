import { num, optNum, parseDate, str } from "./validate";

export type BillingFields = {
  billingType: string;
  expiryDate: Date | null;
  autoCycle: string | null;
  cyclePriceUsd: number | null;
  balanceAmount: number | null;
};

/** 从请求体解析计费相关字段；非法返回 { error }，合法返回 { fields } */
export function parseBilling(
  body: any
): { error: string } | { fields: BillingFields } {
  const billingType = str(body.billingType) === "auto" ? "auto" : "term";

  if (billingType === "term") {
    const expiryDate = parseDate(body.expiryDate);
    if (!expiryDate) return { error: "请填写有效的到期时间" };
    return {
      fields: {
        billingType,
        expiryDate,
        autoCycle: null,
        cyclePriceUsd: null,
        balanceAmount: null,
      },
    };
  }

  // auto
  const cycleIn = str(body.autoCycle);
  const autoCycle = cycleIn === "hourly" || cycleIn === "yearly" ? cycleIn : "monthly";
  return {
    fields: {
      billingType,
      expiryDate: null,
      autoCycle,
      cyclePriceUsd: optNum(body.cyclePriceUsd),
      balanceAmount: optNum(body.balanceAmount),
    },
  };
}

/** 续费/余额金额取数（非负，默认 0） */
export { num };
