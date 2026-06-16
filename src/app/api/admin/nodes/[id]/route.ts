import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { optInt, optStr, str } from "@/lib/validate";

export const runtime = "nodejs";

// 编辑节点
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const existing = await prisma.vpnNode.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "未找到该节点" }, { status: 404 });

  const name = str(body.name);
  const protocol = str(body.protocol);
  if (!name) return NextResponse.json({ error: "请填写节点名" }, { status: 400 });
  if (!protocol) return NextResponse.json({ error: "请填写协议" }, { status: 400 });

  const updated = await prisma.vpnNode.update({
    where: { id: params.id },
    data: {
      name,
      protocol,
      address: optStr(body.address),
      port: optInt(body.port),
      config: optStr(body.config),
      enabled: body.enabled === false ? false : true,
    },
  });

  return NextResponse.json(updated);
}

// 删除节点
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.vpnNode.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "未找到该节点" }, { status: 404 });
  await prisma.vpnNode.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
