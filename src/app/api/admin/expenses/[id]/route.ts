import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// 删除后各处财务汇总和付款明细自动排除该笔费用。
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const expense = await prisma.vpsExpense.findUnique({ where: { id: params.id } });
  if (!expense) return NextResponse.json({ error: "未找到该费用记录" }, { status: 404 });
  await prisma.vpsExpense.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
