import { test, expect, Page } from "@playwright/test";
import { login, uniqueName } from "./helpers";

async function autoAcceptDialogs(page: Page) {
  page.on("dialog", (d) => d.accept());
}

// 注意：这些用例不会真的调用 Telegram —— 收件人用假 chat_id，且推送保持「未启用」状态，
// 手动触发只验证配置校验路径，避免 E2E 依赖外网。
test.describe("到期推送设置", () => {
  test("保存设置 → 新增收件人 → 停用/启用 → 删除", async ({ page }) => {
    await autoAcceptDialogs(page);
    await login(page);

    await page.getByRole("link", { name: "设置", exact: true }).click();
    await page.waitForURL("**/admin/settings");
    await expect(page.getByRole("heading", { name: "Telegram 到期推送" })).toBeVisible();

    // 保存设置（保持未启用，避免真发消息）
    await page.getByPlaceholder("123456:AAH...").fill("111111:E2E-FAKE-TOKEN");
    await page.getByPlaceholder("https://vps.example.com").fill("http://localhost:3000");
    await page.locator('input[type="number"]').first().fill("5");
    await page.getByRole("button", { name: "保存设置" }).click();
    await expect(page.getByText("已保存 ✓")).toBeVisible();

    // 新增收件人
    const chatId = String(Date.now()).slice(-9);
    const label = uniqueName("E2E收件人");
    const form = page.locator("form", { hasText: "新增收件人" });
    await form.getByPlaceholder(/8626161517/).fill(chatId);
    await form.getByPlaceholder(/张三/).fill(label);
    await form.getByRole("button", { name: "新增收件人" }).click();

    const row = page.locator("tr", { hasText: chatId });
    await expect(row).toBeVisible();
    await expect(row.getByText("已启用")).toBeVisible();

    // 停用 → 启用
    await row.getByRole("button", { name: "停用" }).click();
    await expect(page.locator("tr", { hasText: chatId }).getByText("已停用")).toBeVisible();
    await page.locator("tr", { hasText: chatId }).getByRole("button", { name: "启用" }).click();
    await expect(page.locator("tr", { hasText: chatId }).getByText("已启用")).toBeVisible();

    // 未启用推送时手动触发应提示未推送，而不是真发消息
    await page.getByRole("button", { name: "立即检查并推送" }).click();
    await expect(page.getByText(/未推送：推送未启用/)).toBeVisible();

    // 清理
    await page.locator("tr", { hasText: chatId }).getByRole("button", { name: "删除" }).click();
    await expect(page.locator("tr", { hasText: chatId })).toHaveCount(0);
  });

  test("chat_id 必须是数字且不可重复", async ({ page }) => {
    await autoAcceptDialogs(page);
    await login(page);
    await page.goto("/admin/settings");

    const form = page.locator("form", { hasText: "新增收件人" });
    await form.getByPlaceholder(/8626161517/).fill("not-a-number");
    await form.getByRole("button", { name: "新增收件人" }).click();
    await expect(page.getByText("chat_id 应为数字（群组为负数）")).toBeVisible();

    // 重复添加同一个 chat_id 应被拒绝
    const chatId = String(Date.now()).slice(-9);
    await form.getByPlaceholder(/8626161517/).fill(chatId);
    await form.getByRole("button", { name: "新增收件人" }).click();
    await expect(page.locator("tr", { hasText: chatId })).toBeVisible();

    await form.getByPlaceholder(/8626161517/).fill(chatId);
    await form.getByRole("button", { name: "新增收件人" }).click();
    await expect(page.getByText("该 chat_id 已存在")).toBeVisible();

    // 清理
    await page.locator("tr", { hasText: chatId }).getByRole("button", { name: "删除" }).click();
    await expect(page.locator("tr", { hasText: chatId })).toHaveCount(0);
  });
});

test.describe("客户专属收件人", () => {
  test("在客户详情页配置该客户的 chat_id → 设置页概览可见 → 删除", async ({ page }) => {
    await autoAcceptDialogs(page);
    await login(page);

    // 建一个临时客户
    const cname = uniqueName("E2E推送客户");
    const cRes = await page.request.post("/api/admin/customers", { data: { name: cname } });
    expect(cRes.ok()).toBeTruthy();
    const customer = await cRes.json();

    await page.goto(`/admin/customers/${customer.id}`);
    await expect(page.getByRole("heading", { name: "到期提醒收件人" })).toBeVisible();

    const chatId = String(Date.now()).slice(-9);
    const form = page.locator("form", { hasText: "新增收件人" });
    await form.getByPlaceholder(/8626161517/).fill(chatId);
    await form.getByPlaceholder(/张三/).fill("客户本人");
    await form.getByRole("button", { name: "新增收件人" }).click();
    await expect(page.locator("tr", { hasText: chatId })).toBeVisible();

    // 该收件人归属这个客户，而非全局
    const globalRes = await page.request.get("/api/admin/notify-recipients?customerId=global");
    const globals = await globalRes.json();
    expect(globals.some((r: any) => r.chatId === chatId)).toBe(false);
    const mineRes = await page.request.get(`/api/admin/notify-recipients?customerId=${customer.id}`);
    const mine = await mineRes.json();
    expect(mine.some((r: any) => r.chatId === chatId)).toBe(true);

    // 设置页「各客户收件人」概览能看到
    await page.goto("/admin/settings");
    const overview = page.locator("tr", { hasText: cname });
    await expect(overview.getByText(chatId)).toBeVisible();

    // 清理（删客户会级联删其收件人）
    expect((await page.request.delete(`/api/admin/customers/${customer.id}`)).ok()).toBeTruthy();
    const after = await (await page.request.get(`/api/admin/notify-recipients?customerId=${customer.id}`)).json();
    expect(after).toHaveLength(0);
  });
});

test.describe("cron 推送端点鉴权", () => {
  test("无 secret 返回 401，带 secret 返回执行结果", async ({ request }) => {
    const bad = await request.get("/api/cron/expiry-notify");
    expect(bad.status()).toBe(401);

    const secret = process.env.CRON_SECRET || "dev-cron-secret";
    const ok = await request.get(`/api/cron/expiry-notify?secret=${secret}`);
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    // 未启用推送时应被跳过，不会真的调用 Telegram
    expect(body).toHaveProperty("skipped");
  });
});
