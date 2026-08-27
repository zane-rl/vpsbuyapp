import { test, expect } from "@playwright/test";
import { login, uniqueName } from "./helpers";

test.describe("全局公开页已移除", () => {
  test("裸访问 /view 重定向到登录页", async ({ page }) => {
    await page.goto("/view");
    await page.waitForURL("**/login**");
    await expect(page.getByRole("heading", { name: "管理员登录" })).toBeVisible();
  });

  test("公开接口 /api/public/vps 已删除（404）", async ({ request }) => {
    const res = await request.get("/api/public/vps");
    expect(res.status()).toBe(404);
  });
});

test.describe("客户专属公开页 /view/<id>", () => {
  test("无需登录展示该客户 VPS、剩余时间与合计", async ({ page }) => {
    // 登录拿一个有 VPS 的客户 id（种子里的客户A 有 VPS）。page.request 复用登录 cookie。
    await login(page);
    const res = await page.request.get("/api/admin/customers");
    const customers = await res.json();
    const withVps = customers.find((c: any) => c._count.vpsServers > 0);
    expect(withVps, "应存在至少一个含 VPS 的客户").toBeTruthy();

    // 以无登录态访问（新开 context 由同一 page 即可，公开页本就不校验）
    await page.context().clearCookies();
    await page.goto(`/view/${withVps.id}`);
    await expect(page.getByRole("heading", { name: "VPS 服务清单" })).toBeVisible();
    await expect(page.getByText("总购买成本")).toBeVisible();
    await expect(page.getByText("总实际付款")).toBeVisible();
    await expect(page.getByText("总收款")).toBeVisible();
    await expect(page.getByText("差额（收款 − 实付）")).toBeVisible();
    // 剩余时间以彩色徽章呈现（仅一个，不再有重复的「剩余时间」字段）
    await expect(page.getByText(/剩 \d+ 天|今天到期|已过期/).first()).toBeVisible();
    await expect(page.getByText("剩余时间")).toHaveCount(0);

    // 付款记录与收款记录相邻展示，便于逐笔对照
    await expect(page.getByRole("heading", { name: "付款记录" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "收款记录" })).toBeVisible();
    // 付款台账至少含该客户 VPS 的「购买」一行
    await expect(page.getByText("购买", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/共 \d+ 笔，购买服务器总开销/)).toBeVisible();
  });

  test("付款记录汇总购买+续费+充值，与收款记录并排对照", async ({ page }) => {
    await login(page);
    const req = page.request;

    // 自建一整套数据，避免依赖/污染种子数据
    const cname = uniqueName("E2E对账客户");
    const cRes = await req.post("/api/admin/customers", { data: { name: cname } });
    expect(cRes.ok()).toBeTruthy();
    const customer = await cRes.json();

    const vname = uniqueName("E2E对账VPS");
    const vRes = await req.post("/api/admin/vps", {
      data: {
        name: vname,
        customerId: customer.id,
        billingType: "term",
        termPeriod: "monthly",
        purchaseDate: "2026-01-01",
        expiryDate: "2026-02-01",
        purchaseCostUsd: "6",
        purchasePaidCny: "43",
      },
    });
    expect(vRes.ok()).toBeTruthy();
    const vps = await vRes.json();

    // 续费 ¥51、充值 ¥60、收款 ¥200
    const renewRes = await req.post(`/api/admin/vps/${vps.id}/renew`, {
      data: { newExpiry: "2026-03-01", costUsd: "7", paidCny: "51", notes: "E2E续费对照" },
    });
    expect(renewRes.ok()).toBeTruthy();
    const rechargeRes = await req.post("/api/admin/recharges", {
      data: { customerId: customer.id, amountUsd: "10", paidCny: "60", balanceAfter: "10" },
    });
    expect(rechargeRes.ok()).toBeTruthy();
    const payRes = await req.post("/api/admin/payments", {
      data: { customerId: customer.id, amountCny: "200", payDate: "2026-01-05" },
    });
    expect(payRes.ok()).toBeTruthy();

    // 以未登录状态查看公开页
    await page.context().clearCookies();
    await page.goto(`/view/${customer.id}`);

    const payTable = page.locator("div.card", { hasText: "付款记录" });
    // 购买 / 续费 / 充值三类都汇总在同一张付款表里
    await expect(payTable.getByText("购买", { exact: true })).toBeVisible();
    await expect(payTable.getByText("续费", { exact: true })).toBeVisible();
    await expect(payTable.getByText("充值", { exact: true })).toBeVisible();
    await expect(payTable.getByText("¥43.00")).toBeVisible();
    await expect(payTable.getByText("¥51.00")).toBeVisible();
    await expect(payTable.getByText("¥60.00")).toBeVisible();
    // 合计实付 = 43 + 51 + 60 = 154，与顶部「总实际付款」卡片同口径
    await expect(payTable.getByText("¥154.00")).toBeVisible();
    await expect(payTable.getByText(/共 3 笔/)).toBeVisible();

    // 收款记录独立成表，合计 200
    const recvTable = page.locator("div.card", { hasText: "收款记录" });
    await expect(recvTable.getByText("收款时间")).toBeVisible();
    await expect(recvTable.getByText("¥200.00").first()).toBeVisible();
    // 差额 = 200 − 154 = 46
    await expect(recvTable.getByText(/¥46\.00/)).toBeVisible();

    // 清理：先删 VPS（客户删除不会级联删 VPS），再删客户
    await login(page);
    expect((await page.request.delete(`/api/admin/vps/${vps.id}`)).ok()).toBeTruthy();
    expect((await page.request.delete(`/api/admin/customers/${customer.id}`)).ok()).toBeTruthy();
  });
});

test.describe("默认首页 /", () => {
  test("未登录时重定向到登录页", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/login**");
    await expect(page.getByRole("heading", { name: "管理员登录" })).toBeVisible();
  });
});

test.describe("登录鉴权", () => {
  test("错误密码登录失败并提示", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("管理密码").fill("wrong-password");
    await page.getByRole("button", { name: "登录" }).click();
    await expect(page.getByText("密码错误")).toBeVisible();
  });
});
