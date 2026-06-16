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

/** 与 lib/dates.ts 的 addPeriod 同口径：在今天基础上加 N 个月 */
function ymdAddMonths(months: number): string {
  const d = new Date();
  const t = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const day = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function autoAcceptDialogs(page: Page) {
  page.on("dialog", (d) => d.accept());
}

async function createCustomer(page: Page, cname: string) {
  await page.goto("/admin/customers");
  const addForm = page.locator("form", { hasText: "新增客户" });
  await addForm.getByPlaceholder("客户名称").fill(cname);
  await addForm.getByRole("button", { name: "添加" }).click();
  await expect(page.locator("tr", { hasText: cname })).toBeVisible();
}

test.describe("自动续费 + 客户共享充值", () => {
  test("auto VPS 显示自动续费中 + 共享余额 → 客户充值 → 余额联动 → 清理", async ({ page }) => {
    await autoAcceptDialogs(page);
    await login(page);

    const cname = uniqueName("E2E充值客户");
    await createCustomer(page, cname);

    // 新建自动续费 VPS，归属该客户
    const name = uniqueName("E2E自动");
    await page.goto("/admin/vps/new");
    const form = page.locator("form", { hasText: "创建 VPS" });
    await form.getByPlaceholder("香港-01").fill(name);
    await form.locator("select").first().selectOption({ label: cname }); // 所属客户
    await page.getByRole("button", { name: /自动续费（按余额扣费/ }).click();
    await form.locator('input[type="date"]').first().fill(ymd(0)); // 购买时间
    await form.locator("select").filter({ hasText: "按小时" }).selectOption("hourly");
    await form.getByPlaceholder("每周期单价，可选").fill("0.02");
    await page.getByRole("button", { name: "创建 VPS" }).click();

    await page.waitForURL((u) => /\/admin\/vps\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/new"));
    const detailUrl = page.url();
    const vpsId = detailUrl.split("/").pop()!;

    // 详情页：自动续费中徽章 + 余额/充值区块（共享余额初始 $0.00）
    await expect(page.getByText("自动续费中").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /余额 \/ 充值/ })).toBeVisible();
    await expect(page.getByText("所属客户共享余额（USD）")).toBeVisible();

    // 续费 API 对 auto 应拒绝
    const renewRes = await page.request.post(`/api/admin/vps/${vpsId}/renew`, { data: { newExpiry: ymd(30) } });
    expect(renewRes.status()).toBe(400);

    // 去客户页充值：充值 $10、实付 ¥72、充值后余额 $25
    await page.getByRole("link", { name: "去客户页充值 →" }).click();
    await page.waitForURL(/\/admin\/customers\/[^/]+$/);
    const rechargeForm = page.locator("form", { hasText: "记一笔充值" });
    await rechargeForm.locator('input[type="number"]').nth(0).fill("10"); // 充值 USD
    await rechargeForm.locator('input[type="number"]').nth(1).fill("72"); // 实付 CNY
    await rechargeForm.locator('input[type="number"]').nth(2).fill("25"); // 充值后余额 USD
    await page.getByRole("button", { name: "记一笔充值" }).click();

    // 当前共享余额展示 $25.00；总成本计入 $10.00，总实付计入 ¥72.00
    await expect(page.getByText("当前共享余额")).toBeVisible();
    await expect(page.getByText("$25.00").first()).toBeVisible();
    await expect(page.getByText("¥72.00").first()).toBeVisible();

    // 回到 VPS 详情，共享余额联动为 $25.00
    await page.goto(detailUrl);
    await expect(page.getByText("$25.00").first()).toBeVisible();

    // 清理：删除 VPS，再删客户（级联删除充值记录）
    await page.locator("form", { hasText: "保存修改" }).getByRole("button", { name: "删除" }).click();
    await page.waitForURL("**/admin");
    await page.goto("/admin/customers");
    await page.locator("tr", { hasText: cname }).getByRole("link", { name: "管理" }).click();
    await page.getByRole("button", { name: "编辑客户" }).click();
    await page.getByRole("button", { name: "删除客户" }).click();
    await page.waitForURL("**/admin/customers");
    await expect(page.locator("tr", { hasText: cname })).toHaveCount(0);
  });
});

test.describe("一次性购买周期自动推算到期", () => {
  test("term VPS 选「按季度」→ 到期 = 购买时间 + 3 个月", async ({ page }) => {
    await autoAcceptDialogs(page);
    await login(page);

    const cname = uniqueName("E2E周期客户");
    await createCustomer(page, cname);

    const name = uniqueName("E2E季度");
    await page.goto("/admin/vps/new");
    const form = page.locator("form", { hasText: "创建 VPS" });
    await form.getByPlaceholder("香港-01").fill(name);
    await form.locator("select").first().selectOption({ label: cname });
    // 默认 term；先填购买时间，再选购买周期=按季度，到期应自动推算
    await form.locator('input[type="date"]').first().fill(ymd(0));
    await form.locator("select").filter({ hasText: "按季度" }).selectOption("quarterly");

    const expiry = form.locator('input[type="date"]').nth(1);
    await expect(expiry).toHaveValue(ymdAddMonths(3));

    await page.getByRole("button", { name: "创建 VPS" }).click();
    await page.waitForURL((u) => /\/admin\/vps\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/new"));
    await expect(page.getByText(name).first()).toBeVisible();

    // 清理
    await page.locator("form", { hasText: "保存修改" }).getByRole("button", { name: "删除" }).click();
    await page.waitForURL("**/admin");
    await page.goto("/admin/customers");
    await page.locator("tr", { hasText: cname }).getByRole("link", { name: "管理" }).click();
    await page.getByRole("button", { name: "编辑客户" }).click();
    await page.getByRole("button", { name: "删除客户" }).click();
    await page.waitForURL("**/admin/customers");
    await expect(page.locator("tr", { hasText: cname })).toHaveCount(0);
  });
});
