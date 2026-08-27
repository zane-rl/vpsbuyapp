import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { optStr, str } from "@/lib/validate";

export const runtime = "nodejs";

// 收件人列表。?customerId=xxx 取该客户专属收件人；?customerId=global 取全局收件人；不传则全部。
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("customerId");
  const where =
    q === "global" ? { customerId: null } : q ? { customerId: q } : {};
  const list = await prisma.notifyRecipient.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(list);
}

// 新增收件人。带 customerId = 该客户专属；不带 = 全局（管理员收全部客户的提醒）
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const chatId = str(body.chatId);
  if (!chatId) return NextResponse.json({ error: "请填写 chat_id" }, { status: 400 });
  // Telegram chat_id 为整数，群组为负数
  if (!/^-?\d+$/.test(chatId)) {
    return NextResponse.json({ error: "chat_id 应为数字（群组为负数）" }, { status: 400 });
  }

  const customerId = optStr(body.customerId);
  if (customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return NextResponse.json({ error: "客户不存在" }, { status: 400 });
  }

  // SQLite 唯一约束中 NULL 互不相等，全局收件人的查重要在应用层做
  const existed = await prisma.notifyRecipient.findFirst({
    where: { chatId, customerId: customerId ?? null },
  });
  if (existed) return NextResponse.json({ error: "该 chat_id 已存在" }, { status: 400 });

  const created = await prisma.notifyRecipient.create({
    data: {
      chatId,
      customerId: customerId ?? null,
      label: optStr(body.label),
      enabled: body.enabled !== false,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
