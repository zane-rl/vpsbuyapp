import { test, expect } from "@playwright/test";
import { login, uniqueName } from "./helpers";
import { formatDate } from "../src/lib/dates";

test.describe("客户门户与终端用户分配", () => {
  test("VPS 有效优先、剩余时间升序、下线置后并显示 IP", async ({ page }, testInfo) => {
    await login(page);
    const req = page.request;
    const customerRes = await req.post("/api/admin/customers", { data: { name: uniqueName("E2E排序客户") } });
    expect(customerRes.status()).toBe(201);
    const customer = await customerRes.json();
    const serverIds: string[] = [];
    const dateAfter = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return formatDate(date);
    };
    const cases = [
      { name: "长期有效", days: 30, ipAddress: "" },
      { name: "已下线", days: 1, ipAddress: "192.0.2.1" },
      { name: "已过期", days: -3, ipAddress: "192.0.2.2" },
      { name: "短期有效", days: 2, ipAddress: "192.0.2.3" },
      { name: "自动续费", days: null, ipAddress: "192.0.2.4" },
      { name: "今天到期", days: 0, ipAddress: "192.0.2.5" },
      { name: "IPv6服务器", days: 10, ipAddress: "2001:db8:1234:5678:abcd:ef01:2345:6789" },
    ].map((item) => ({ ...item, label: item.name, name: uniqueName(item.name) }));
    const namesInOrder = (labels: string[]) => labels.map((label) => cases.find((item) => item.label === label)!.name);

    try {
      for (const item of cases) {
        const res = await req.post("/api/admin/vps", { data: {
          name: item.name, customerId: customer.id, purchaseDate: dateAfter(0), ipAddress: item.ipAddress,
          ...(item.days === null
            ? { billingType: "auto", autoCycle: "monthly", cyclePriceUsd: 30 }
            : { billingType: "term", expiryDate: dateAfter(item.days) }),
        } });
        expect(res.status()).toBe(201);
        const server = await res.json();
        serverIds.push(server.id);
        if (item.label === "已下线") {
          expect((await req.post(`/api/admin/vps/${server.id}/offline`)).ok()).toBeTruthy();
        }
      }
      const rechargeRes = await req.post("/api/admin/recharges", { data: {
        customerId: customer.id, amountUsd: 5, balanceAfter: 5, rechargeDate: dateAfter(0),
      } });
      expect(rechargeRes.status()).toBe(201);
      const recharge = await rechargeRes.json();

      const expectedOrder = namesInOrder(["今天到期", "短期有效", "自动续费", "IPv6服务器", "长期有效", "已过期", "已下线"]);
      await page.goto(`/admin/customers/${customer.id}`);
      const table = page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "名称 / 提供商 / IP" }) });
      await expect(table.locator("tbody tr td:first-child > div:first-child")).toHaveText(expectedOrder);
      await expect(table.getByText(`IP：${cases[6].ipAddress}`, { exact: true })).toBeVisible();
      await expect(table.getByText("IP：未填写", { exact: true })).toBeVisible();

      const username = uniqueName("sort-client");
      const password = "Sort-initial-password!";
      expect((await req.post(`/api/admin/customers/${customer.id}/account`, { data: { username, password } })).status()).toBe(201);
      expect((await req.post("/api/customer/auth/login", { data: { username, password } })).ok()).toBeTruthy();
      expect((await req.patch("/api/customer/auth/password", { data: { currentPassword: password, newPassword: "Sort-final-password!" } })).ok()).toBeTruthy();

      await page.goto("/customer");
      await expect(page.getByRole("status")).toBeHidden();
      const cards = page.locator("article");
      await expect(cards.getByRole("heading")).toHaveText(expectedOrder);
      for (const item of cases) {
        await expect(cards.filter({ has: page.getByRole("heading", { name: item.name, exact: true }) })
          .getByText(`IP：${item.ipAddress || "未填写"}`, { exact: true })).toBeVisible();
      }
      await page.screenshot({ path: testInfo.outputPath("vps-desktop.png"), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: testInfo.outputPath("vps-mobile.png"), fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      // 没有充值时无法估算，自动续费位于有效组末尾；余额耗尽时移入无效组。
      expect((await req.delete(`/api/admin/recharges/${recharge.id}`)).ok()).toBeTruthy();
      await page.reload();
      await expect(cards.getByRole("heading")).toHaveText(namesInOrder(["今天到期", "短期有效", "IPv6服务器", "长期有效", "自动续费", "已过期", "已下线"]));
      expect((await req.post("/api/admin/recharges", { data: {
        customerId: customer.id, amountUsd: 0, balanceAfter: 0, rechargeDate: dateAfter(0),
      } })).status()).toBe(201);
      await page.reload();
      await expect(cards.getByRole("heading")).toHaveText(namesInOrder(["今天到期", "短期有效", "IPv6服务器", "长期有效", "已过期", "自动续费", "已下线"]));
    } finally {
      for (const id of serverIds) {
        expect((await req.delete(`/api/admin/vps/${id}`)).ok()).toBeTruthy();
      }
      expect((await req.delete(`/api/admin/customers/${customer.id}`)).ok()).toBeTruthy();
    }
  });

  test("首次改密 → 查看对账 → 管理用户 → 分配节点 → 租户隔离 → 下线保留", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());
    await login(page);
    const req = page.request;

    const suffix = Date.now().toString().slice(-8);
    const initialPassword = `Init-${suffix}!`;
    const finalPassword = `Final-${suffix}!`;
    const username = `client-${suffix}`;

    const customer = await (await req.post("/api/admin/customers", { data: { name: uniqueName("E2E门户客户") } })).json();
    const otherCustomer = await (await req.post("/api/admin/customers", { data: { name: uniqueName("E2E隔离客户") } })).json();
    const accountRes = await req.post(`/api/admin/customers/${customer.id}/account`, { data: { username, password: initialPassword } });
    expect(accountRes.status()).toBe(201);

    const vps = await (await req.post("/api/admin/vps", { data: {
      name: uniqueName("E2E门户VPS"), customerId: customer.id, billingType: "auto", autoCycle: "monthly",
      cyclePriceUsd: 30, purchaseDate: "2026-01-01", purchaseCostUsd: 10, purchasePaidCny: 70,
    } })).json();
    const node = await (await req.post("/api/admin/nodes", { data: { vpsId: vps.id, name: "E2E-节点", protocol: "VLESS", subscribeUrl: "https://example.com/e2e-sub" } })).json();
    await req.post("/api/admin/recharges", { data: { customerId: customer.id, amountUsd: 20, paidCny: 140, balanceAfter: 20, rechargeDate: "2026-01-01" } });
    await req.post("/api/admin/payments", { data: { customerId: customer.id, amountCny: 250, payDate: "2026-01-02" } });
    const otherUser = await (await req.post(`/api/admin/customers/${otherCustomer.id}/users`, { data: { name: "其他客户用户" } })).json();

    await page.context().clearCookies();
    await page.goto("/customer/login");
    await page.getByPlaceholder("客户用户名").fill(username.toUpperCase());
    await page.getByPlaceholder("登录密码").fill(initialPassword);
    await page.getByRole("button", { name: "登录客户门户" }).click();
    await page.waitForURL("**/customer/change-password");

    await page.getByLabel("当前密码").fill(initialPassword);
    await page.getByLabel("新密码", { exact: true }).fill(finalPassword);
    await page.getByLabel("确认新密码").fill(finalPassword);
    await page.getByRole("button", { name: "保存新密码并进入" }).click();
    await page.waitForURL("**/customer");
    await expect(page.getByRole("heading", { name: "VPS 服务清单" })).toBeVisible();
    await expect(page.getByText("总实际付款")).toBeVisible();
    await expect(page.getByText("收款记录")).toBeVisible();
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "复制订阅", exact: true }).click();
    await expect(page.getByRole("button", { name: "已复制 ✓", exact: true })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("https://example.com/e2e-sub");

    // 客户令牌即使被手工复制到管理员 Cookie，也不能通过管理员鉴权。
    const customerCookie = (await page.context().cookies()).find((cookie) => cookie.name === "vps_customer_session");
    expect(customerCookie).toBeTruthy();
    await page.context().addCookies([{
      name: "vps_session",
      value: customerCookie!.value,
      domain: customerCookie!.domain,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    }]);
    expect((await page.request.get("/api/admin/vps")).status()).toBe(401);

    await page.getByRole("link", { name: "终端用户", exact: true }).click();
    await page.getByRole("button", { name: "+ 新增终端用户" }).click();
    await page.getByPlaceholder("姓名 *").fill("张三");
    await page.getByPlaceholder("联系方式").fill("telegram:zhangsan");
    await page.getByRole("button", { name: "保存用户" }).click();
    const userCard = page.locator("article", { hasText: "张三" });
    await userCard.locator("select").selectOption(node.id);
    await userCard.getByRole("button", { name: "分配节点" }).click();
    await expect(userCard.getByText(/E2E-节点/)).toBeVisible();
    await expect(userCard.getByText(new RegExp(vps.name))).toBeVisible();

    const crossTenant = await page.request.patch(`/api/customer/users/${otherUser.id}`, { data: { name: "越权修改", enabled: true } });
    expect(crossTenant.status()).toBe(404);

    await page.goto(`/customer/vps/${vps.id}`);
    await expect(page.getByRole("heading", { name: vps.name })).toBeVisible();
    await expect(page.getByText("张三")).toBeVisible();

    const sessionCheck = await page.request.get("/api/customer/auth/session");
    expect(sessionCheck.ok()).toBeTruthy();
    expect(sessionCheck.headers()["cache-control"]).toContain("no-store");

    await page.getByRole("button", { name: "退出登录" }).click();
    await page.waitForURL("**/customer/login");
    expect((await page.request.get("/api/customer/auth/session")).status()).toBe(401);
    await page.goBack();
    await page.waitForURL("**/customer/login*");
    await expect(page.getByRole("heading", { name: "客户登录" })).toBeVisible();

    // 管理员与客户会话使用不同 Cookie；管理员下线后重新登录客户账号验证只读视角。
    await login(page);
    expect((await page.request.post(`/api/admin/vps/${vps.id}/offline`)).ok()).toBeTruthy();
    expect((await page.request.post(`/api/admin/vps/${vps.id}/renew`, { data: { newExpiry: "2027-01-01" } })).status()).toBe(409);

    await page.goto("/customer/login");
    await page.getByPlaceholder("客户用户名").fill(username);
    await page.getByPlaceholder("登录密码").fill(finalPassword);
    await page.getByRole("button", { name: "登录客户门户" }).click();
    await page.waitForURL("**/customer");
    await page.goto(`/customer/vps/${vps.id}`);
    await expect(page.getByText("已下线", { exact: true })).toBeVisible();
    await expect(page.getByText("当前不可分配")).toBeVisible();
    await expect(page.getByText("张三")).toBeVisible();

    expect((await page.request.delete(`/api/admin/vps/${vps.id}`)).ok()).toBeTruthy();
    expect((await page.request.delete(`/api/admin/customers/${customer.id}`)).ok()).toBeTruthy();
    expect((await page.request.delete(`/api/admin/customers/${otherCustomer.id}`)).ok()).toBeTruthy();
  });
});
