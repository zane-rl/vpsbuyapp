import { test, expect } from "@playwright/test";
import { formatDate } from "../src/lib/dates";
import { login, uniqueName } from "./helpers";

const subscribeUrl = "vless://11111111-1111-4111-8111-111111111111@192.0.2.10:443?security=tls&encryption=none&type=ws&path=%2Ftest#E2E-中文节点";
const scenarios = [
  { mode: "native", title: "标准剪贴板接口复制完整订阅链接" },
  { mode: "unavailable", title: "剪贴板接口不可用时仍能一键复制" },
  { mode: "rejected", title: "剪贴板接口拒绝后兼容复制成功" },
  { mode: "blocked", title: "全部复制方式失败时明确提示手动复制" },
] as const;

for (const scenario of scenarios) {
  test(scenario.title, async ({ page, context }, testInfo) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await login(page);
    const req = page.request;
    const customer = await (await req.post("/api/admin/customers", { data: { name: uniqueName("E2E复制客户") } })).json();
    let vpsId: string | undefined;
    const reader = await context.newPage();
    const dialogs: string[] = [];
    page.on("dialog", async (dialog) => {
      dialogs.push(dialog.type());
      await dialog.dismiss();
    });

    try {
      const vpsRes = await req.post("/api/admin/vps", { data: {
        name: uniqueName("E2E复制VPS"), customerId: customer.id, billingType: "auto", purchaseDate: formatDate(new Date()),
      } });
      expect(vpsRes.status()).toBe(201);
      vpsId = (await vpsRes.json()).id;
      expect((await req.post("/api/admin/nodes", { data: { vpsId, name: "E2E复制节点", protocol: "VLESS", subscribeUrl } })).status()).toBe(201);

      // 只改变待测页面的能力，另一个同源页面保留原生接口以读取真实剪贴板。
      await page.addInitScript((mode) => {
        if (mode === "unavailable") {
          Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
        } else if (mode === "rejected" || mode === "blocked") {
          Object.defineProperty(navigator.clipboard, "writeText", {
            configurable: true,
            value: async () => { throw new DOMException("测试拒绝复制", "NotAllowedError"); },
          });
        }
        if (mode === "blocked") {
          const original = document.execCommand.bind(document);
          document.execCommand = (command, showUI, value) => command === "copy" ? false : original(command, showUI, value);
        }
      }, scenario.mode);
      await page.goto(`/admin/vps/${vpsId}`);
      await reader.goto("/login");
      await reader.bringToFront();
      await reader.evaluate(() => navigator.clipboard.writeText("E2E原剪贴板内容"));
      await page.bringToFront();
      const button = page.getByRole("button", { name: "复制订阅", exact: true });
      await button.click();

      if (scenario.mode === "blocked") {
        const manual = page.getByLabel("手动复制内容");
        await expect(manual).toHaveValue(subscribeUrl);
        await expect(manual).toBeFocused();
        expect(await manual.evaluate((input: HTMLTextAreaElement) => [input.selectionStart, input.selectionEnd])).toEqual([0, subscribeUrl.length]);
        await expect(page.getByRole("button", { name: "已复制 ✓" })).toHaveCount(0);
        await reader.bringToFront();
        expect(await reader.evaluate(() => navigator.clipboard.readText())).toBe("E2E原剪贴板内容");
        await page.bringToFront();
        await page.screenshot({ path: testInfo.outputPath("clipboard-manual.png"), fullPage: true });
      } else {
        await expect(page.getByRole("button", { name: "已复制 ✓", exact: true })).toBeVisible();
        await reader.bringToFront();
        expect(await reader.evaluate(() => navigator.clipboard.readText())).toBe(subscribeUrl);
        await page.bringToFront();
      }
      expect(dialogs).toEqual([]);
    } finally {
      await reader.close();
      if (vpsId) expect((await req.delete(`/api/admin/vps/${vpsId}`)).ok()).toBeTruthy();
      expect((await req.delete(`/api/admin/customers/${customer.id}`)).ok()).toBeTruthy();
    }
  });
}
