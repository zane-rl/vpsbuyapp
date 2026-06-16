import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// 删除客户充值记录
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.customerRecharge.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "未找到该充值记录" }, { status: 404 });
  await prisma.customerRecharge.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
