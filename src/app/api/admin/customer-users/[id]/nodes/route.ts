import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assignNode, CustomerUserError } from "@/lib/customerUsers";
import { str } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await prisma.customerManagedUser.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "未找到该终端用户" }, { status: 404 });
  try {
    const body = await req.json();
    const nodeId = str(body.nodeId);
    if (!nodeId) return NextResponse.json({ error: "请选择 VPN 节点" }, { status: 400 });
    const assignment = await assignNode(user.customerId, params.id, nodeId);
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof CustomerUserError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}
