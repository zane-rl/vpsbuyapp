import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { optInt, optStr, str } from "@/lib/validate";

export const runtime = "nodejs";

// 新增节点
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const vpsId = str(body.vpsId);
  const name = str(body.name);
  const protocol = str(body.protocol);

  if (!vpsId) return NextResponse.json({ error: "缺少 vpsId" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "请填写节点名" }, { status: 400 });
  if (!protocol) return NextResponse.json({ error: "请填写协议" }, { status: 400 });

  const vps = await prisma.vpsServer.findUnique({ where: { id: vpsId } });
  if (!vps) return NextResponse.json({ error: "对应的 VPS 不存在" }, { status: 404 });

  const created = await prisma.vpnNode.create({
    data: {
      vpsId,
      name,
      protocol,
      address: optStr(body.address) ?? vps.ipAddress,
      port: optInt(body.port),
      config: optStr(body.config),
      enabled: body.enabled === false ? false : true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
