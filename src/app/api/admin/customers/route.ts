import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { optStr, str } from "@/lib/validate";

export const runtime = "nodejs";

// 客户列表（含 VPS 数量）
export async function GET() {
  const list = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { vpsServers: true, payments: true } } },
  });
  return NextResponse.json(list);
}

// 新增客户
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const name = str(body.name);
  if (!name) return NextResponse.json({ error: "请填写客户名称" }, { status: 400 });

  const exists = await prisma.customer.findUnique({ where: { name } });
  if (exists) return NextResponse.json({ error: "该客户已存在" }, { status: 409 });

  const created = await prisma.customer.create({
    data: { name, note: optStr(body.note) },
  });
  return NextResponse.json(created, { status: 201 });
}
