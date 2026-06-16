import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { optStr, str } from "@/lib/validate";

export const runtime = "nodejs";

// 客户详情（含 VPS 与收款）
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    include: {
      vpsServers: { include: { provider: true, renewals: true }, orderBy: { expiryDate: "asc" } },
      payments: { orderBy: { payDate: "desc" } },
    },
  });
  if (!customer) return NextResponse.json({ error: "未找到该客户" }, { status: 404 });
  return NextResponse.json(customer);
}

// 编辑客户
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const name = str(body.name);
  if (!name) return NextResponse.json({ error: "请填写客户名称" }, { status: 400 });

  const dup = await prisma.customer.findUnique({ where: { name } });
  if (dup && dup.id !== params.id) {
    return NextResponse.json({ error: "该客户名称已存在" }, { status: 409 });
  }

  const updated = await prisma.customer.update({
    where: { id: params.id },
    data: { name, note: optStr(body.note) },
  });
  return NextResponse.json(updated);
}

// 删除客户（收款记录级联删除，名下 VPS 的 customerId 置空）
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "未找到该客户" }, { status: 404 });
  await prisma.customer.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
