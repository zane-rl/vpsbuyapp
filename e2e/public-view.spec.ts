import { test, expect } from "@playwright/test";

test.describe("公开客户页已关闭", () => {
  test("裸 /view 与旧客户链接都转到客户登录", async ({ page }) => {
    await page.goto("/view");
    await page.waitForURL("**/customer/login");
    await expect(page.getByRole("heading", { name: "客户登录" })).toBeVisible();

    await page.goto("/view/legacy-customer-id");
    await page.waitForURL("**/customer/login");
  });

  test("旧公开接口仍为 404", async ({ request }) => {
    expect((await request.get("/api/public/vps")).status()).toBe(404);
  });
});

test.describe("默认首页与管理员登录", () => {
  test("默认首页仍进入管理员登录", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/login**");
    await expect(page.getByRole("heading", { name: "管理员登录" })).toBeVisible();
  });

  test("错误管理员密码登录失败", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("管理密码").fill("wrong-password");
    await page.getByRole("button", { name: "登录" }).click();
    await expect(page.getByText("密码错误")).toBeVisible();
  });
});
