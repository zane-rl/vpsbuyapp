import { test, expect, type APIRequestContext, type Browser, type Page } from "@playwright/test";
import { unlink } from "fs/promises";
import path from "path";
import { formatDate } from "../src/lib/dates";
import { money } from "../src/lib/money";
import { login, uniqueName, PNG_1X1 } from "./helpers";

async function customerContext(browser: Browser, baseURL: string | undefined, admin: APIRequestContext, customerId: string) {
  const username = uniqueName("expense-client");
  const password = "Expense-initial-password!";
  expect((await admin.post(`/api/admin/customers/${customerId}/account`, { data: { username, password } })).status()).toBe(201);
  const context = await browser.newContext({ baseURL });
  expect((await context.request.post("/api/customer/auth/login", { data: { username, password } })).ok()).toBeTruthy();
  expect((await context.request.patch("/api/customer/auth/password", { data: { currentPassword: password, newPassword: "Expense-final-password!" } })).ok()).toBeTruthy();
  return context;
}

function summary(page: Page, label: string) {
  return page.locator(".card").filter({ has: page.getByText(label, { exact: true }) });
}

test("其他费用录入、凭证隔离、各处结算一致及删除回退", async ({ page, browser, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  page.on("dialog", (dialog) => dialog.accept());
  await login(page);
  const admin = page.request;
  const customer = await (await admin.post("/api/admin/customers", { data: { name: uniqueName("E2E费用客户") } })).json();
  const other = await (await admin.post("/api/admin/customers", { data: { name: uniqueName("E2E费用隔离") } })).json();
  const today = formatDate(new Date());
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  const renewedExpiry = new Date();
  renewedExpiry.setDate(renewedExpiry.getDate() + 60);
  const vps = await (await admin.post("/api/admin/vps", { data: {
    name: uniqueName("E2E费用VPS"), customerId: customer.id, billingType: "term", purchaseDate: today,
    expiryDate: formatDate(expiry), purchaseCostUsd: 10, purchasePaidCny: 70,
  } })).json();
  let proof: string | undefined;
  let ownContext;
  let otherContext;

  try {
    expect((await admin.post(`/api/admin/vps/${vps.id}/renew`, { data: { newExpiry: formatDate(renewedExpiry), costUsd: 2, paidCny: 14 } })).status()).toBe(201);
    expect((await admin.post("/api/admin/recharges", { data: { customerId: customer.id, amountUsd: 3, paidCny: 21, balanceAfter: 3, rechargeDate: today } })).status()).toBe(201);
    expect((await admin.post("/api/admin/payments", { data: { customerId: customer.id, amountCny: 200, payDate: today } })).status()).toBe(201);
    await page.goto("/admin");
    const readAmount = async (label: string) => Number((await summary(page, label).locator("p").last().innerText()).replace(/[^\d.-]/g, ""));
    const costBefore = await readAmount("总成本");
    const paidBefore = await readAmount("总实付成本");

    await page.goto(`/admin/vps/${vps.id}`);
    const section = page.locator("section").filter({ has: page.getByRole("heading", { name: "其他费用", exact: true }) });
    await section.getByRole("button", { name: "+ 新增费用" }).click();
    const form = section.locator("form");
    const expenseType = uniqueName("额外IP");
    await form.getByLabel("费用类型").fill(expenseType);
    await form.getByLabel("费用时间").fill(today);
    await form.getByLabel("费用成本 (USD)").fill("5");
    await form.getByLabel("费用实付 (CNY)").fill("35");
    await form.getByLabel("费用备注").fill("增加独立 IPv4 地址");
    const uploaded = page.waitForResponse((res) => res.url().endsWith("/api/admin/upload") && res.request().method() === "POST");
    await form.locator('input[type="file"]').setInputFiles({ name: "expense.png", mimeType: "image/png", buffer: PNG_1X1 });
    proof = (await (await uploaded).json()).name;
    const preview = form.locator('img[alt="付款截图"]');
    await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    // 尚未关联业务记录的文件仍不可从凭证接口读取，但本地预览和点击查看应正常。
    expect((await admin.get(`/api/files/${proof}`)).status()).toBe(404);
    const popupReady = page.waitForEvent("popup");
    await preview.locator("..").click();
    const popup = await popupReady;
    await expect(popup.locator("img")).toBeVisible();
    await expect.poll(() => popup.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await popup.close();
    const created = page.waitForResponse((res) => res.url().endsWith(`/vps/${vps.id}/expenses`) && res.request().method() === "POST");
    await form.getByRole("button", { name: "保存费用" }).click();
    const createdRes = await created;
    expect(createdRes.status()).toBe(201);
    const expense = await createdRes.json();
    proof = expense.paymentProof;
    await expect(section.getByRole("cell", { name: expenseType, exact: true })).toBeVisible();
    await expect.poll(() => section.locator(`img[alt="${expenseType}付款截图"]`).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(section.getByText("增加独立 IPv4 地址")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("vps-expenses-admin.png"), fullPage: true });
    const detail = await (await admin.get(`/api/admin/vps/${vps.id}`)).json();
    expect(formatDate(detail.expiryDate)).toBe(formatDate(renewedExpiry));
    expect(detail.expenses).toHaveLength(1);
    expect((await admin.get(`/api/files/${proof}`)).status()).toBe(200);

    await page.goto("/admin");
    await expect(summary(page, "总成本")).toContainText(`$${money(costBefore + 5)}`);
    await expect(summary(page, "总实付成本")).toContainText(`¥${money(paidBefore + 35)}`);
    const statsRow = page.getByRole("row").filter({ has: page.getByRole("link", { name: customer.name, exact: true }) }).first();
    await expect(statsRow).toContainText("$20.00");
    await expect(statsRow).toContainText("¥140.00");
    await expect(statsRow).toContainText("¥60.00");
    await page.goto("/admin/customers");
    const customerRow = page.getByRole("row").filter({ hasText: customer.name });
    await expect(customerRow).toContainText("$20.00");
    await expect(customerRow).toContainText("¥140.00");
    await expect(customerRow).toContainText("¥60.00");
    await page.goto(`/admin/customers/${customer.id}`);
    await expect(summary(page, "总成本")).toContainText("$20.00");
    await expect(summary(page, "总实付成本")).toContainText("¥140.00");
    await expect(summary(page, "差额（收款 − 实付）")).toContainText("¥60.00");

    ownContext = await customerContext(browser, baseURL, admin, customer.id);
    const ownPage = await ownContext.newPage();
    await ownPage.goto("/customer");
    await expect(ownPage.getByRole("status")).toBeHidden();
    await expect(summary(ownPage, "总购买成本")).toContainText("$20.00");
    await expect(summary(ownPage, "总实际付款")).toContainText("¥140.00");
    await expect(ownPage.locator("article")).toContainText("¥119.00");
    const paymentTable = ownPage.getByRole("table").filter({ has: ownPage.getByRole("columnheader", { name: "项目", exact: true }) });
    await expect(paymentTable.getByRole("row").filter({ hasText: expenseType })).toContainText("¥35.00");
    await expect(paymentTable.locator("tfoot")).toContainText("¥140.00");
    expect((await ownContext.request.get(`/api/files/${proof}`)).status()).toBe(200);
    expect((await ownContext.request.post(`/api/admin/vps/${vps.id}/expenses`, { data: expense })).status()).toBe(401);
    expect((await ownContext.request.delete(`/api/admin/expenses/${expense.id}`)).status()).toBe(401);
    await ownPage.goto(`/customer/vps/${vps.id}`);
    await expect(ownPage.getByRole("cell", { name: expenseType, exact: true })).toBeVisible();
    await expect(ownPage.getByRole("button", { name: "+ 新增费用" })).toHaveCount(0);

    otherContext = await customerContext(browser, baseURL, admin, other.id);
    expect((await otherContext.request.get(`/api/files/${proof}`)).status()).toBe(404);
    expect((await otherContext.request.get(`/customer/vps/${vps.id}`)).status()).toBe(404);
    expect((await admin.post(`/api/admin/vps/${vps.id}/offline`)).ok()).toBeTruthy();
    await ownPage.reload();
    await expect(ownPage.getByRole("cell", { name: expenseType, exact: true })).toBeVisible();

    await page.goto(`/admin/vps/${vps.id}`);
    await section.getByRole("row").filter({ hasText: expenseType }).getByRole("button", { name: "删除" }).click();
    await expect(section.getByText("暂无其他费用记录")).toBeVisible();
    await ownPage.goto("/customer");
    await expect(summary(ownPage, "总购买成本")).toContainText("$15.00");
    await expect(summary(ownPage, "总实际付款")).toContainText("¥105.00");
    await expect(paymentTable.locator("tfoot")).toContainText("¥105.00");
    await expect(paymentTable.getByText(expenseType, { exact: false })).toHaveCount(0);
    expect((await ownContext.request.get(`/api/files/${proof}`)).status()).toBe(404);
  } finally {
    await ownContext?.close();
    await otherContext?.close();
    expect((await admin.delete(`/api/admin/vps/${vps.id}`)).ok()).toBeTruthy();
    expect((await admin.delete(`/api/admin/customers/${customer.id}`)).ok()).toBeTruthy();
    expect((await admin.delete(`/api/admin/customers/${other.id}`)).ok()).toBeTruthy();
    if (proof) await unlink(path.join(process.cwd(), "data", "uploads", proof));
  }
});

test("自动续费与下线 VPS 可记录其他费用，校验入参并级联清理", async ({ page, request }) => {
  await login(page);
  const admin = page.request;
  const customer = await (await admin.post("/api/admin/customers", { data: { name: uniqueName("E2E自动费用") } })).json();
  const vps = await (await admin.post("/api/admin/vps", { data: { name: uniqueName("E2E自动费用VPS"), customerId: customer.id, billingType: "auto", autoCycle: "monthly", cyclePriceUsd: 30, purchaseDate: formatDate(new Date()) } })).json();
  const data = { expenseType: "流量", expenseDate: formatDate(new Date()), costUsd: 1, paidCny: 7 };
  let deleted = false;
  try {
    expect((await request.post(`/api/admin/vps/${vps.id}/expenses`, { data })).status()).toBe(401);
    expect((await admin.post(`/api/admin/vps/${vps.id}/expenses`, { data: { ...data, expenseType: " " } })).status()).toBe(400);
    expect((await admin.post(`/api/admin/vps/${vps.id}/expenses`, { data: { ...data, expenseDate: "invalid" } })).status()).toBe(400);
    expect((await admin.post(`/api/admin/vps/${vps.id}/expenses`, { data: { ...data, paidCny: -1 } })).status()).toBe(400);
    expect((await admin.post(`/api/admin/vps/${vps.id}/expenses`, { data: { ...data, costUsd: "abc" } })).status()).toBe(400);
    expect((await admin.post("/api/admin/vps/missing/expenses", { data })).status()).toBe(404);
    expect((await admin.post(`/api/admin/vps/${vps.id}/expenses`, { data })).status()).toBe(201);
    expect((await admin.post(`/api/admin/vps/${vps.id}/offline`)).ok()).toBeTruthy();
    const res = await admin.post(`/api/admin/vps/${vps.id}/expenses`, { data: { ...data, costUsd: 0, paidCny: 0 } });
    expect(res.status()).toBe(201);
    const expense = await res.json();
    const detail = await (await admin.get(`/api/admin/vps/${vps.id}`)).json();
    expect(detail.expenses).toHaveLength(2);
    expect(detail.expiryDate).toBeNull();
    expect(detail.status).toBe("stopped");
    expect(detail.cyclePriceUsd).toBe(30);
    expect((await admin.delete(`/api/admin/vps/${vps.id}`)).ok()).toBeTruthy();
    deleted = true;
    expect((await admin.delete(`/api/admin/expenses/${expense.id}`)).status()).toBe(404);
  } finally {
    if (!deleted) expect((await admin.delete(`/api/admin/vps/${vps.id}`)).ok()).toBeTruthy();
    expect((await admin.delete(`/api/admin/customers/${customer.id}`)).ok()).toBeTruthy();
  }
});
