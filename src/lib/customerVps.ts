import { SharedBalanceEstimate } from "./billing";
import { vpsValidity } from "./dates";

type CustomerVps = Parameters<typeof vpsValidity>[0];

/** 客户列表优先展示有效服务器，同组按剩余天数升序，已下线的始终置后。 */
export function sortCustomerVps<T extends CustomerVps>(
  servers: T[],
  balance: Pick<SharedBalanceEstimate, "daysRemaining" | "depleted">
): T[] {
  return servers.map((server) => {
    const validity = vpsValidity(server);
    const days = validity.kind === "term"
      ? validity.days
      : validity.kind === "auto" ? balance.daysRemaining : null;
    const unavailable = validity.kind === "term"
      ? validity.status === "expired"
      : validity.kind === "auto" && balance.depleted;
    return {
      server,
      group: validity.kind === "stopped" ? 2 : unavailable ? 1 : 0,
      days: days ?? Number.POSITIVE_INFINITY,
    };
  }).sort((a, b) => a.group - b.group || (a.days === b.days ? 0 : a.days - b.days))
    .map(({ server }) => server);
}
