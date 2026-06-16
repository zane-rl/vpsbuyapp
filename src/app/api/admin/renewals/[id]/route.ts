import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// 删除续费记录（仅删除历史记录，不改动 VPS 当前到期时间；如需调整请在编辑 VPS 中修改）
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.vpsRenewal.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "未找到该续费记录" }, { status: 404 });
  await prisma.vpsRenewal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
