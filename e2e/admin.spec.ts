import { test, expect, Page } from "@playwright/test";
import { login, uniqueName } from "./helpers";

function ymd(offsetDays: number): string {
  // 用本地日期，匹配应用 parseDate/formatDate 的本地午夜约定，避免时区偏差
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 自动接受所有 confirm 对话框（删除确认等）
async function autoAcceptDialogs(page: Page) {
  page.on("dialog", (dialog) => dialog.accept());
}

// 1x1 透明 PNG，用于测试上传
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

test.describe("管理后台完整流程", () => {
  test("登录 → 财务汇总 → 新建 → 节点 → 续费 → 删续费 → 复制 → 删除", async ({ page }) => {
    await autoAcceptDialogs(page);
    await login(page);

    // 财务汇总卡片
    await expect(page.getByText("总成本", { exact: true })).toBeVisible();
    await expect(page.getByText("差额（收款 − 实付）")).toBeVisible();

    // —— 新建 VPS ——
    const name = uniqueName();
    await page.getByRole("link", { name: "+ 新增 VPS" }).click();
    await page.waitForURL("**/admin/vps/new");
    const createForm = page.locator("form", { hasText: "创建 VPS" });
    await createForm.getByPlaceholder("香港-01").fill(name);
    await createForm.getByPlaceholder("2 vCPU").fill("2 vCPU");
    await createForm.getByPlaceholder("2 GB").fill("4 GB");
    const dateInputs = createForm.locator('input[type="date"]');
    await dateInputs.nth(0).fill(ymd(0)); // 购买时间
    await dateInputs.nth(1).fill(ymd(30)); // 到期时间
    // 上传实际付款截图，等待预览出现
    await createForm.locator('input[type="file"]').setInputFiles({
      name: "proof.png",
      mimeType: "image/png",
      buffer: PNG_1x1,
    });
    await expect(createForm.locator('img[alt="付款截图"]')).toBeVisible();
    await page.getByRole("button", { name: "创建 VPS" }).click();

    // 跳转到详情页（排除 /admin/vps/new 自身）
    await page.waitForURL(
      (u) => /\/admin\/vps\/[^/]+$/.test(u.pathname) && !u.pathname.endsWith("/new")
    );
    const detailUrl = page.url();
    const vpsId = detailUrl.split("/").pop()!;
    await expect(page.getByRole("heading", { name })).toBeVisible();
    // 详情页编辑表单应显示已保存的付款截图
    await expect(page.locator('img[alt="付款截图"]')).toBeVisible();

    // —— 添加 VPN 节点 ——
    await page.getByRole("button", { name: "+ 添加节点" }).click();
    await page.getByPlaceholder("节点名 *").fill("E2E-SS-01");
    await page.getByPlaceholder("端口").fill("8388");
    await page.getByRole("button", { name: "添加", exact: true }).click();
    await expect(page.getByText("E2E-SS-01")).toBeVisible();
    await expect(page.getByText("VPN 节点（1）")).toBeVisible();

    // —— 续费（到期 +30 → +60）——
    await page.getByRole("button", { name: "续费", exact: true }).click();
    // 仅作用于续费表单内的日期输入（页面下方编辑表单也有 date 输入）
    const renewForm = page.locator("form", { hasText: "续费后到期时间" });
    await renewForm.locator('input[type="date"]').fill(ymd(60));
    await page.getByRole("button", { name: "确认续费" }).click();
    // 续费历史出现一条（到期变更含 +60 日期）
    await expect(page.getByText(`→ ${ymd(60)}`)).toBeVisible();

    // —— 删除续费记录（续费历史表格内的删除按钮）——
    await page
      .locator("table")
      .first()
      .getByRole("button", { name: "删除" })
      .first()
      .click();
    await expect(page.getByText("暂无续费记录")).toBeVisible();

    // —— 复制（从列表点击「复制」）——
    await page.getByRole("link", { name: "← 返回列表" }).click();
    await page.waitForURL("**/admin");
    await page
      .locator("tr", { hasText: name })
      .getByRole("link", { name: "复制" })
      .click();
    await expect(page.getByRole("heading", { name: "复制新增 VPS" })).toBeVisible();
    expect(page.url()).toContain(`from=${vpsId}`);
    // 名称预填带「-副本」
    await expect(page.getByPlaceholder("香港-01")).toHaveValue(`${name}-副本`);

    // —— 清理：删除创建的 VPS（编辑表单内的删除按钮）——
    await page.goto(detailUrl);
    await page
      .locator("form", { hasText: "保存修改" })
      .getByRole("button", { name: "删除" })
      .click();
    await page.waitForURL("**/admin");
    await expect(page.locator("tr", { hasText: name })).toHaveCount(0);
  });

  test("退出登录后后台被拦截", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "退出登录" }).click();
    await page.waitForURL("**/login**");
    // 直接访问后台应被重定向回登录
    await page.goto("/admin");
    await page.waitForURL("**/login**");
    await expect(page.getByRole("heading", { name: "管理员登录" })).toBeVisible();
  });
});
