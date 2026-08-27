import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { optStr } from "@/lib/validate";

export const runtime = "nodejs";

// 修改收件人（备注 / 启用开关）
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const data: { label?: string | null; enabled?: boolean } = {};
  if ("label" in body) data.label = optStr(body.label);
  if ("enabled" in body) data.enabled = body.enabled === true || body.enabled === "true";

  try {
    const updated = await prisma.notifyRecipient.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "收件人不存在" }, { status: 404 });
  }
}

// 删除收件人
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.notifyRecipient.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "收件人不存在" }, { status: 404 });
  }
}
