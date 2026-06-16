import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { num, optStr, parseDate } from "@/lib/validate";

export const runtime = "nodejs";

// 编辑客户充值记录
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.customerRecharge.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "未找到该充值记录" }, { status: 404 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const updated = await prisma.customerRecharge.update({
    where: { id: params.id },
    data: {
      amountUsd: num(body.amountUsd),
      paidCny: num(body.paidCny),
      balanceAfter: num(body.balanceAfter),
      rechargeDate: parseDate(body.rechargeDate) ?? existing.rechargeDate,
      paymentProof: optStr(body.paymentProof),
      note: optStr(body.note),
    },
  });
  return NextResponse.json(updated);
}

// 删除客户充值记录
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.customerRecharge.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "未找到该充值记录" }, { status: 404 });
  await prisma.customerRecharge.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
