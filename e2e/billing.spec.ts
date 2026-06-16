import { test, expect, Page } from "@playwright/test";
import { login, uniqueName } from "./helpers";

function ymd(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function autoAcceptDialogs(page: Page) {
  page.on("dialog", (d) => d.accept());
}

test.describe("自动续费类型", () => {
  test("新建 auto VPS → 显示自动续费中 → 更新余额 → 历史出现 → 删除", async ({ page }) => {
    await autoAcceptDialogs(page);
    await login(page);

    const name = uniqueName("E2E自动");
    await page.getByRole("link", { name: "+ 新增 VPS" }).click();
    await page.waitForURL("**/admin/vps/new");

    const form = page.locator("form", { hasText: "创建 VPS" });
    await form.getByPlaceholder("香港-01").fill(name);
    // 切换到自动续费
    await page.getByRole("button", { name: /自动续费（按余额扣费/ }).click();
    // 购买时间（auto 下只有这一个 date 输入）
    await form.locator('input[type="date"]').first().fill(ymd(0));
    // 续费周期 → 按小时
    await form.locator("select").filter({ hasText: "按月" }).selectOption("hourly");
    // 周期费用 + 账户余额
    await form.getByPlaceholder("每周期单价，可选").fill("0.02");
    await form.getByPlaceholder("可选", { exact: true }).fill("20");
    await page.getByRole("button", { name: "创建 VPS" }).click();

    // 详情页：标题旁应显示「自动续费中」徽章，且有「余额 / 充值」区块
    await page.waitForURL((u) => /\/admin\/vps\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/new"));
    const detailUrl = page.url();
    await expect(page.getByText("自动续费中").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /余额 \/ 充值/ })).toBeVisible();

    // 更新余额/充值：本次充值 $5、本次实付 ¥36、更新后余额 $25
    await page.getByRole("button", { name: "更新余额 / 充值" }).click();
    const balForm = page.locator("form", { hasText: "更新后余额" });
    await balForm.locator('input[type="number"]').nth(0).fill("5"); // 本次充值 USD
    await balForm.locator('input[type="number"]').nth(1).fill("36"); // 本次实付 CNY
    await balForm.getByPlaceholder("充值后的账户余额").fill("25");
    await page.getByRole("button", { name: "确认", exact: true }).click();
    // 余额历史出现一条（更新后余额 $25.00、实付 ¥36.00）
    await expect(page.getByText("$25.00").first()).toBeVisible();
    await expect(page.getByText("¥36.00").first()).toBeVisible();

    // 续费 API 对 auto 应拒绝
    const vpsId = detailUrl.split("/").pop()!;
    const renewRes = await page.request.post(`/api/admin/vps/${vpsId}/renew`, {
      data: { newExpiry: ymd(30) },
    });
    expect(renewRes.status()).toBe(400);

    // 清理：删除 VPS
    await page.locator("form", { hasText: "保存修改" }).getByRole("button", { name: "删除" }).click();
    await page.waitForURL("**/admin");
    await expect(page.locator("tr", { hasText: name })).toHaveCount(0);
  });
});
