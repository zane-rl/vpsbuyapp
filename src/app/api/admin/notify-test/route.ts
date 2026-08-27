import { NextRequest, NextResponse } from "next/server";
import { runExpiryNotify, sendTestNotify } from "@/lib/notify";

export const runtime = "nodejs";

// 带 customerId：给该客户发一条测试推送（不判到期、不写推送记录）
// 不带：后台「立即检查并推送」，force 忽略当天去重，验证整条链路
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const customerId = typeof body?.customerId === "string" ? body.customerId.trim() : "";

  if (customerId) {
    const result = await sendTestNotify(customerId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  const result = await runExpiryNotify({ force: true });
  return NextResponse.json(result);
}
