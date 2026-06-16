import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { num, optStr, parseDate, str } from "@/lib/validate";

export const runtime = "nodejs";

// 新增收款记录
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const customerId = str(body.customerId);
  if (!customerId) return NextResponse.json({ error: "缺少 customerId" }, { status: 400 });

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return NextResponse.json({ error: "对应的客户不存在" }, { status: 404 });

  const created = await prisma.customerPayment.create({
    data: {
      customerId,
      amountCny: num(body.amountCny),
      payDate: parseDate(body.payDate) ?? new Date(),
      paymentProof: optStr(body.paymentProof),
      note: optStr(body.note),
    },
  });
  return NextResponse.json(created, { status: 201 });
}
