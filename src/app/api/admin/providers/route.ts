import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { str } from "@/lib/validate";

export const runtime = "nodejs";

// 提供商列表（含引用数量）
export async function GET() {
  const list = await prisma.provider.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { vpsServers: true } } },
  });
  return NextResponse.json(list);
}

// 新增提供商
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const name = str(body.name);
  if (!name) return NextResponse.json({ error: "请填写提供商名称" }, { status: 400 });

  const exists = await prisma.provider.findUnique({ where: { name } });
  if (exists) return NextResponse.json({ error: "该提供商已存在" }, { status: 409 });

  const created = await prisma.provider.create({ data: { name } });
  return NextResponse.json(created, { status: 201 });
}
