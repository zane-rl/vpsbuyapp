import { test, expect } from "@playwright/test";
import { login } from "./helpers";

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
