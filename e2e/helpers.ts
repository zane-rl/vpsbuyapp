import { Page, expect } from "@playwright/test";

// 与 .env.local 中的 ADMIN_PASSWORD 保持一致（可用环境变量覆盖）
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "md@123456";

/** 通过登录页完成登录，结束后停留在 /admin */
export async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("管理密码").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL("**/admin");
  await expect(page.getByText("VPS 列表")).toBeVisible();
}

/** 生成测试用唯一名称（避免与现有数据冲突，便于清理） */
export function uniqueName(prefix = "E2E测试"): string {
  return `${prefix}-${Date.now().toString().slice(-8)}`;
}
