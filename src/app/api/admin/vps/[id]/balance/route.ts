import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { num, optStr, parseDate } from "@/lib/validate";

export const runtime = "nodejs";

// 更新余额/充值（仅自动续费类型）：新增一条记录并把 VPS 当前余额更新为 balanceAfter
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const vps = await prisma.vpsServer.findUnique({ where: { id: params.id } });
  if (!vps) return NextResponse.json({ error: "未找到该 VPS" }, { status: 404 });
  if (vps.billingType !== "auto") {
    return NextResponse.json({ error: "仅自动续费类型可更新余额" }, { status: 400 });
  }

  const balanceAfter = num(body.balanceAfter);
  const logDate = parseDate(body.logDate) ?? new Date();

  const [log] = await prisma.$transaction([
    prisma.vpsBalanceLog.create({
      data: {
        vpsId: vps.id,
        logDate,
        topupUsd: num(body.topupUsd),
        paidCny: num(body.paidCny),
        balanceAfter,
        paymentProof: optStr(body.paymentProof),
        note: optStr(body.note),
      },
    }),
    prisma.vpsServer.update({
      where: { id: vps.id },
      data: { balanceAmount: balanceAfter },
    }),
  ]);

  return NextResponse.json(log, { status: 201 });
}
