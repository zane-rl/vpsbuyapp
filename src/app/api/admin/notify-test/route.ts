import { NextResponse } from "next/server";
import { runExpiryNotify } from "@/lib/notify";

export const runtime = "nodejs";

// 后台「立即检查并推送」：force 忽略当天去重，便于验证配置是否可用
export async function POST() {
  const result = await runExpiryNotify({ force: true });
  return NextResponse.json(result);
}
