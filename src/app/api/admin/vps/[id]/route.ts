import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { num, optStr, parseDate, str } from "@/lib/validate";
import { parseBilling } from "@/lib/billing";

export const runtime = "nodejs";

// 详情（含续费历史与节点）
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const vps = await prisma.vpsServer.findUnique({
    where: { id: params.id },
    include: {
      provider: true,
      customer: true,
      renewals: { orderBy: { renewDate: "desc" } },
      vpnNodes: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!vps) return NextResponse.json({ error: "未找到该 VPS" }, { status: 404 });
  return NextResponse.json(vps);
}

// 编辑
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const existing = await prisma.vpsServer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "未找到该 VPS" }, { status: 404 });

  const name = str(body.name);
  const purchaseDate = parseDate(body.purchaseDate);
  const customerId = str(body.customerId);

  if (!name) return NextResponse.json({ error: "请填写名称" }, { status: 400 });
  if (!customerId) return NextResponse.json({ error: "请选择所属客户" }, { status: 400 });
  if (!purchaseDate) return NextResponse.json({ error: "请填写有效的购买时间" }, { status: 400 });

  const billing = parseBilling(body);
  if ("error" in billing) return NextResponse.json({ error: billing.error }, { status: 400 });

  const updated = await prisma.vpsServer.update({
    where: { id: params.id },
    data: {
      name,
      customerId,
      providerId: optStr(body.providerId),
      ...billing.fields,
      cpu: optStr(body.cpu),
      ram: optStr(body.ram),
      disk: optStr(body.disk),
      bandwidth: optStr(body.bandwidth),
      region: optStr(body.region),
      ipAddress: optStr(body.ipAddress),
      os: optStr(body.os),
      purchaseDate,
      purchaseCostUsd: num(body.purchaseCostUsd),
      purchasePaidCny: num(body.purchasePaidCny),
      paymentProof: optStr(body.paymentProof),
      status: str(body.status) === "stopped" ? "stopped" : "active",
      notes: optStr(body.notes),
    },
  });

  return NextResponse.json(updated);
}

// 删除
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.vpsServer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "未找到该 VPS" }, { status: 404 });
  await prisma.vpsServer.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
