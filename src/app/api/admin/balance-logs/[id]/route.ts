import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// 删除余额/充值记录（仅删历史，不改动 VPS 当前余额）
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.vpsBalanceLog.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "未找到该记录" }, { status: 404 });
  await prisma.vpsBalanceLog.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
