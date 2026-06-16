import { test, expect, Page } from "@playwright/test";
import { login, uniqueName } from "./helpers";

async function autoAcceptDialogs(page: Page) {
  page.on("dialog", (d) => d.accept());
}

test.describe("提供商管理", () => {
  test("新增 → 列表可见 → 删除", async ({ page }) => {
    await autoAcceptDialogs(page);
    await login(page);
    await page.getByRole("link", { name: "提供商", exact: true }).click();
    await page.waitForURL("**/admin/providers");

    const pname = uniqueName("E2E提供商");
    const form = page.locator("form", { hasText: "新增提供商" });
    await form.getByPlaceholder(/Vultr/).fill(pname);
    await form.getByRole("button", { name: "添加" }).click();

    const row = page.locator("li", { hasText: pname });
    await expect(row).toBeVisible();

    // 清理
    await row.getByRole("button", { name: "删除" }).click();
    await expect(page.locator("li", { hasText: pname })).toHaveCount(0);
  });
});

test.describe("客户结算 + 公开页", () => {
  test("新增客户 → 记收款 → 差额更新 → 公开页显示合计 → 删除", async ({ page }) => {
    await autoAcceptDialogs(page);
    await login(page);

    // 新增客户
    await page.getByRole("link", { name: "客户", exact: true }).click();
    await page.waitForURL("**/admin/customers");
    const cname = uniqueName("E2E客户");
    const addForm = page.locator("form", { hasText: "新增客户" });
    await addForm.getByPlaceholder("客户名称").fill(cname);
    await addForm.getByRole("button", { name: "添加" }).click();

    // 客户列表行内应有「复制 / 打开」专属链接按钮
    const row = page.locator("tr", { hasText: cname });
    await expect(row.getByRole("button", { name: "复制" })).toBeVisible();
    await expect(row.getByRole("link", { name: /打开/ })).toBeVisible();

    // 进入客户详情
    await row.getByRole("link", { name: "管理" }).click();
    await page.waitForURL(/\/admin\/customers\/[^/]+$/);
    const customerUrl = page.url();
    const customerId = customerUrl.split("/").pop()!;
    await expect(page.getByRole("heading", { name: cname })).toBeVisible();

    // 记一笔收款 188.00
    const payForm = page.locator("form", { hasText: "记一笔收款" });
    await payForm.getByPlaceholder("0.00").first().fill("188");
    await payForm.getByRole("button", { name: "记一笔收款" }).click();

    // 收款台账出现该金额，差额卡片显示 ¥188.00（无 VPS 时实付为 0）
    await expect(page.getByText("¥188.00").first()).toBeVisible();

    // 记一笔充值：$10 / ¥50 / 充值后余额 $10 → 计入总成本与总实付
    const rechargeForm = page.locator("form", { hasText: "记一笔充值" });
    await rechargeForm.locator('input[type="number"]').nth(0).fill("10");
    await rechargeForm.locator('input[type="number"]').nth(1).fill("50");
    await rechargeForm.locator('input[type="number"]').nth(2).fill("10");
    await rechargeForm.getByRole("button", { name: "记一笔充值" }).click();

    // 总成本计入 $10.00；差额 = 收款188 − 实付50 = ¥138.00
    await expect(page.getByText("$10.00").first()).toBeVisible();
    await expect(page.getByText("¥138.00").first()).toBeVisible();

    // 公开客户页显示合计标题
    await page.goto(`/view/${customerId}`);
    await expect(page.getByRole("heading", { name: "VPS 服务清单" })).toBeVisible();
    await expect(page.getByText("总购买成本")).toBeVisible();
    await expect(page.getByText("总实际付款")).toBeVisible();

    // 清理：删除客户
    await page.goto(customerUrl);
    await page.getByRole("button", { name: "编辑客户" }).click();
    await page.getByRole("button", { name: "删除客户" }).click();
    await page.waitForURL("**/admin/customers");
    await expect(page.locator("tr", { hasText: cname })).toHaveCount(0);
  });
});
