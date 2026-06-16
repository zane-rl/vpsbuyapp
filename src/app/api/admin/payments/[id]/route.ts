import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// 删除收款记录
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.customerPayment.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "未找到该收款记录" }, { status: 404 });
  await prisma.customerPayment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
