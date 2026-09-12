export type SettlementSource = {
  vpsServers: {
    purchaseCostUsd: number;
    purchasePaidCny: number;
    renewals: { costUsd: number; paidCny: number }[];
  }[];
  recharges: { amountUsd: number; paidCny: number }[];
  payments: { amountCny: number }[];
};

/** 客户结算唯一口径；下线只影响可用性，不删除或排除历史财务。 */
export function calculateCustomerSettlement(source: SettlementSource) {
  const rechargeCostUsd = source.recharges.reduce((sum, recharge) => sum + recharge.amountUsd, 0);
  const rechargePaidCny = source.recharges.reduce((sum, recharge) => sum + recharge.paidCny, 0);
  const totalCostUsd = source.vpsServers.reduce(
    (sum, vps) => sum + vps.purchaseCostUsd + vps.renewals.reduce((renewalSum, renewal) => renewalSum + renewal.costUsd, 0),
    rechargeCostUsd
  );
  const totalPaidCny = source.vpsServers.reduce(
    (sum, vps) => sum + vps.purchasePaidCny + vps.renewals.reduce((renewalSum, renewal) => renewalSum + renewal.paidCny, 0),
    rechargePaidCny
  );
  const totalReceivedCny = source.payments.reduce((sum, payment) => sum + payment.amountCny, 0);
  return { totalCostUsd, totalPaidCny, totalReceivedCny, diffCny: totalReceivedCny - totalPaidCny };
}
