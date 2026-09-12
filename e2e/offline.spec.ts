import { test, expect } from "@playwright/test";
import { estimateSharedBalance } from "../src/lib/billing";
import { findExpiringCustomers } from "../src/lib/notify";
import { login, uniqueName } from "./helpers";

test.describe("永久下线领域规则", () => {
  test("余额保留下线前消耗、停止未来消耗", () => {
    const estimate = estimateSharedBalance({
      recharges: [{ balanceAfter: 100, rechargeDate: new Date("2026-01-01T00:00:00") }],
      vpsServers: [{ billingType: "auto", autoCycle: "monthly", cyclePriceUsd: 30, purchaseDate: new Date("2026-01-01T00:00:00"), status: "stopped", stoppedAt: new Date("2026-01-06T00:00:00") }],
      now: new Date("2026-01-11T00:00:00"),
    });
    expect(estimate.balanceUsd).toBe(95);
    expect(estimate.dailyBurnUsd).toBe(0);
    expect(estimate.hasActiveAuto).toBe(false);
    expect(estimate.depletionDate).toBeNull();
  });

  test("下线固定期限 VPS 不再进入到期通知候选", async ({ page }) => {
    await login(page);
    const customer = await (await page.request.post("/api/admin/customers", { data: { name: uniqueName("E2E下线通知客户") } })).json();
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const vps = await (await page.request.post("/api/admin/vps", { data: { name: uniqueName("E2E下线期限"), customerId: customer.id, billingType: "term", termPeriod: "monthly", purchaseDate: ymd, expiryDate: ymd } })).json();
    expect((await page.request.post(`/api/admin/vps/${vps.id}/offline`)).ok()).toBeTruthy();
    const candidates = await findExpiringCustomers(5, new Date());
    expect(candidates.some((candidate) => candidate.customerId === customer.id)).toBe(false);
    expect((await page.request.delete(`/api/admin/vps/${vps.id}`)).ok()).toBeTruthy();
    expect((await page.request.delete(`/api/admin/customers/${customer.id}`)).ok()).toBeTruthy();
  });
});
