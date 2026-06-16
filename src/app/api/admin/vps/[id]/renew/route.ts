import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { num, optStr, parseDate } from "@/lib/validate";

export const runtime = "nodejs";

// 续费：新增一条续费记录，并更新 VPS 到期时间（同一事务）
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const vps = await prisma.vpsServer.findUnique({ where: { id: params.id } });
  if (!vps) return NextResponse.json({ error: "未找到该 VPS" }, { status: 404 });

  if (vps.billingType !== "term" || !vps.expiryDate) {
    return NextResponse.json(
      { error: "自动续费类型无固定到期，请使用「更新余额/充值」" },
      { status: 400 }
    );
  }

  const newExpiry = parseDate(body.newExpiry);
  if (!newExpiry) {
    return NextResponse.json({ error: "请填写有效的续费后到期时间" }, { status: 400 });
  }
  if (newExpiry.getTime() <= vps.expiryDate.getTime()) {
    return NextResponse.json(
      { error: "续费后到期时间应晚于当前到期时间" },
      { status: 400 }
    );
  }

  const renewDate = parseDate(body.renewDate) ?? new Date();

  const [renewal] = await prisma.$transaction([
    prisma.vpsRenewal.create({
      data: {
        vpsId: vps.id,
        renewDate,
        previousExpiry: vps.expiryDate,
        newExpiry,
        costUsd: num(body.costUsd),
        paidCny: num(body.paidCny),
        paymentProof: optStr(body.paymentProof),
        notes: optStr(body.notes),
      },
    }),
    prisma.vpsServer.update({
      where: { id: vps.id },
      data: { expiryDate: newExpiry, status: "active" },
    }),
  ]);

  return NextResponse.json(renewal, { status: 201 });
}
