import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { optNum, optStr, parseDate, str } from "@/lib/validate";

export const runtime = "nodejs";

// 其他费用只记账，不更新到期时间或自动续费共享余额。
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const expenseType = str(body?.expenseType);
  const expenseDate = parseDate(body?.expenseDate);
  const costUsd = optNum(body?.costUsd ?? 0);
  const paidCny = optNum(body?.paidCny ?? 0);
  if (!expenseType) return NextResponse.json({ error: "请填写费用类型" }, { status: 400 });
  if (!expenseDate) return NextResponse.json({ error: "请填写有效的费用时间" }, { status: 400 });
  if (costUsd === null || paidCny === null) {
    return NextResponse.json({ error: "成本和实付必须为非负金额" }, { status: 400 });
  }

  const vps = await prisma.vpsServer.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!vps) return NextResponse.json({ error: "未找到该 VPS" }, { status: 404 });

  const expense = await prisma.vpsExpense.create({ data: {
    vpsId: vps.id,
    expenseType,
    expenseDate,
    costUsd,
    paidCny,
    paymentProof: optStr(body.paymentProof),
    notes: optStr(body.notes),
  } });
  return NextResponse.json(expense, { status: 201 });
}
