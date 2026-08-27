import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { optStr, num } from "@/lib/validate";

export const runtime = "nodejs";
// GET 不读请求参数，不声明的话会被 Next 静态化，返回构建时的旧设置
export const dynamic = "force-dynamic";

const ID = "default";

// 读取推送设置（不存在则返回默认值，不落库）
export async function GET() {
  const s = await prisma.notifySetting.findUnique({ where: { id: ID } });
  return NextResponse.json(
    s ?? { id: ID, enabled: false, botToken: null, daysAhead: 5, siteBaseUrl: null }
  );
}

// 保存推送设置（单例 upsert）
export async function PUT(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const enabled = body.enabled === true || body.enabled === "true";
  const botToken = optStr(body.botToken);
  const siteBaseUrl = optStr(body.siteBaseUrl);
  const daysAhead = Math.round(num(body.daysAhead));

  if (daysAhead < 1 || daysAhead > 365) {
    return NextResponse.json({ error: "提前天数需在 1~365 之间" }, { status: 400 });
  }
  if (siteBaseUrl && !/^https?:\/\/.+/.test(siteBaseUrl)) {
    return NextResponse.json({ error: "站点地址需以 http:// 或 https:// 开头" }, { status: 400 });
  }
  // 启用时必须有完整配置，否则 cron 跑起来只会静默跳过
  if (enabled && (!botToken || !siteBaseUrl)) {
    return NextResponse.json({ error: "启用推送前请先填写 Bot Token 与站点地址" }, { status: 400 });
  }

  const data = { enabled, botToken, siteBaseUrl, daysAhead };
  const saved = await prisma.notifySetting.upsert({
    where: { id: ID },
    create: { id: ID, ...data },
    update: data,
  });

  return NextResponse.json(saved);
}
