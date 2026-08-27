// 到期推送（Telegram）核心逻辑：被 cron 端点与后台「立即检查并推送」共用。
// 判定复用现成工具：term 用 dates.ts 的 daysUntil，auto 用 billing.ts 的 estimateSharedBalance。

import { prisma } from "./db";
import { daysUntil } from "./dates";
import { estimateSharedBalance } from "./billing";

/** 推送文案（需求指定原文，仅替换客户专属查看链接） */
export function buildMessage(viewUrl: string): string {
  return `您有服务器即将到期，详情查看${viewUrl}，请确认并及时支付账单续费处理`;
}

/** 拼客户专属查看链接的绝对 URL（去掉站点地址结尾多余的 /） */
export function customerViewUrl(siteBaseUrl: string, customerId: string): string {
  return `${siteBaseUrl.replace(/\/+$/, "")}/view/${customerId}`;
}

/** 归零到当天 00:00，作为去重键 */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export type ExpiringCustomer = {
  customerId: string;
  customerName: string;
  reason: "term" | "auto" | "both";
  /** 触发明细，如「香港-01 剩 3 天；自动续费余额约 4 天耗尽」 */
  detail: string;
};

/**
 * 找出需要提醒的客户：
 * - term：名下任一 VPS 到期剩余天数 ≤ daysAhead（已过期为负数，同样提醒）
 * - auto：该客户共享余额预估耗尽天数 ≤ daysAhead（同客户多台 auto 共享同一耗尽日，只算一次）
 */
export async function findExpiringCustomers(
  daysAhead: number,
  now: Date
): Promise<ExpiringCustomer[]> {
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      vpsServers: true,
      recharges: { select: { balanceAfter: true, rechargeDate: true } },
    },
  });

  const result: ExpiringCustomer[] = [];

  for (const c of customers) {
    const parts: string[] = [];

    // term：逐台判断剩余天数
    const termHits = c.vpsServers.filter(
      (v) => v.billingType !== "auto" && v.expiryDate != null && daysUntil(v.expiryDate) <= daysAhead
    );
    for (const v of termHits) {
      const d = daysUntil(v.expiryDate!);
      parts.push(d < 0 ? `${v.name} 已过期 ${Math.abs(d)} 天` : d === 0 ? `${v.name} 今天到期` : `${v.name} 剩 ${d} 天`);
    }

    // auto：整个客户共享一个预估耗尽日
    const est = estimateSharedBalance({ recharges: c.recharges, vpsServers: c.vpsServers, now });
    const autoHit = est.daysRemaining != null && est.daysRemaining <= daysAhead;
    if (autoHit) {
      parts.push(
        est.depleted
          ? "自动续费余额已耗尽"
          : `自动续费余额约 ${est.daysRemaining} 天后耗尽（估算）`
      );
    }

    if (parts.length === 0) continue;

    const reason: ExpiringCustomer["reason"] =
      termHits.length > 0 && autoHit ? "both" : autoHit ? "auto" : "term";

    result.push({
      customerId: c.id,
      customerName: c.name,
      reason,
      detail: parts.join("；"),
    });
  }

  return result;
}

/** 调 Telegram Bot API sendMessage。失败返回错误文本而非抛出，避免一个 chat_id 拖垮整轮推送。 */
export async function sendTelegram(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(10_000),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      return { ok: false, error: data?.description || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.name === "TimeoutError" ? "请求超时" : String(e?.message ?? e) };
  }
}

export type NotifyRunResult = {
  ok: boolean;
  /** 未执行时的原因（未启用 / 缺配置 / 无收件人 / 无到期客户） */
  skipped?: string;
  customers: number;
  sent: number;
  failed: number;
  results: { customer: string; detail: string; sent: number; failed: number; error?: string }[];
};

/**
 * 主流程：读设置 → 找到期客户 → 按 (客户, 当天) 去重 → 逐个启用的 chat_id 发送 → 写 NotifyLog。
 * force=true（后台手动触发）忽略去重并覆盖当天记录，便于测试。
 */
export async function runExpiryNotify(opts?: { force?: boolean }): Promise<NotifyRunResult> {
  const force = opts?.force === true;
  const empty = (skipped: string): NotifyRunResult => ({
    ok: false,
    skipped,
    customers: 0,
    sent: 0,
    failed: 0,
    results: [],
  });

  const setting = await prisma.notifySetting.findUnique({ where: { id: "default" } });
  if (!setting || !setting.enabled) return empty("推送未启用");
  if (!setting.botToken) return empty("未配置 Bot Token");
  if (!setting.siteBaseUrl) return empty("未配置站点地址");

  // 收件人分两层：客户专属（只收自己服务器的提醒）+ 全局（customerId 为空，通常是管理员，收全部）
  const allRecipients = await prisma.notifyRecipient.findMany({ where: { enabled: true } });
  if (allRecipients.length === 0) return empty("没有启用的收件人");
  const globalRecipients = allRecipients.filter((r) => r.customerId == null);
  const byCustomer = new Map<string, typeof allRecipients>();
  for (const r of allRecipients) {
    if (r.customerId == null) continue;
    const arr = byCustomer.get(r.customerId) ?? [];
    arr.push(r);
    byCustomer.set(r.customerId, arr);
  }

  const now = new Date();
  const today = startOfDay(now);
  const candidates = await findExpiringCustomers(setting.daysAhead, now);
  if (candidates.length === 0) return { ok: true, skipped: "没有即将到期的客户", customers: 0, sent: 0, failed: 0, results: [] };

  const results: NotifyRunResult["results"] = [];
  let sentTotal = 0;
  let failedTotal = 0;

  for (const c of candidates) {
    // 去重：当天已推过则跳过（force 时忽略）
    if (!force) {
      const existed = await prisma.notifyLog.findUnique({
        where: { customerId_notifyDate: { customerId: c.customerId, notifyDate: today } },
      });
      if (existed) continue;
    }

    // 该客户专属收件人 + 全局收件人；同一 chat_id 只发一次
    const targets = [...(byCustomer.get(c.customerId) ?? []), ...globalRecipients];
    const seen = new Set<string>();
    const recipients = targets.filter((r) => (seen.has(r.chatId) ? false : (seen.add(r.chatId), true)));
    if (recipients.length === 0) continue; // 该客户没配收件人，也没有全局收件人

    const text = buildMessage(customerViewUrl(setting.siteBaseUrl, c.customerId));
    let sent = 0;
    const errors: string[] = [];

    for (const r of recipients) {
      const res = await sendTelegram(setting.botToken, r.chatId, text);
      if (res.ok) sent++;
      else errors.push(`${r.chatId}: ${res.error}`);
    }

    const failed = errors.length;
    sentTotal += sent;
    failedTotal += failed;

    const logData = {
      reason: c.reason,
      detail: c.detail,
      sentCount: sent,
      failCount: failed,
      error: errors.length > 0 ? errors.join("；").slice(0, 500) : null,
    };
    await prisma.notifyLog.upsert({
      where: { customerId_notifyDate: { customerId: c.customerId, notifyDate: today } },
      create: { customerId: c.customerId, notifyDate: today, ...logData },
      update: logData,
    });

    results.push({
      customer: c.customerName,
      detail: c.detail,
      sent,
      failed,
      error: errors.length > 0 ? errors.join("；") : undefined,
    });
  }

  if (results.length === 0) {
    return {
      ok: true,
      skipped: force ? "到期客户均未配置收件人" : "今天已推送过或到期客户未配置收件人",
      customers: candidates.length,
      sent: 0,
      failed: 0,
      results: [],
    };
  }

  return { ok: true, customers: results.length, sent: sentTotal, failed: failedTotal, results };
}
