import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { str } from "@/lib/validate";

export const runtime = "nodejs";

// 重命名提供商
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const name = str(body.name);
  if (!name) return NextResponse.json({ error: "请填写提供商名称" }, { status: 400 });

  const dup = await prisma.provider.findUnique({ where: { name } });
  if (dup && dup.id !== params.id) {
    return NextResponse.json({ error: "该提供商名称已存在" }, { status: 409 });
  }

  const updated = await prisma.provider.update({ where: { id: params.id }, data: { name } });
  return NextResponse.json(updated);
}

// 删除提供商（被引用的 VPS 的 providerId 置空）
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.provider.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "未找到该提供商" }, { status: 404 });
  await prisma.provider.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
