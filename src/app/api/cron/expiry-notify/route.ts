import { NextRequest, NextResponse } from "next/server";
import { runExpiryNotify } from "@/lib/notify";

export const runtime = "nodejs";

// 到期推送触发端点。不在 middleware 的保护范围（/admin、/api/admin）内，
// 由服务器 crontab 调用，凭 CRON_SECRET 自行鉴权。
async function handle(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "未配置 CRON_SECRET，端点已禁用" }, { status: 503 });
  }

  const provided =
    req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret") ?? "";
  if (provided !== expected) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const result = await runExpiryNotify();
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
