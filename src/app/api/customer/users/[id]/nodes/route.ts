import { NextRequest, NextResponse } from "next/server";
import { getCustomerPrincipal } from "@/lib/customerAuth";
import { assignNode, CustomerUserError } from "@/lib/customerUsers";
import { str } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const principal = await getCustomerPrincipal();
  if (!principal || principal.mustChangePassword) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const body = await req.json();
    const nodeId = str(body.nodeId);
    if (!nodeId) return NextResponse.json({ error: "请选择 VPN 节点" }, { status: 400 });
    const assignment = await assignNode(principal.customerId, params.id, nodeId);
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof CustomerUserError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}
