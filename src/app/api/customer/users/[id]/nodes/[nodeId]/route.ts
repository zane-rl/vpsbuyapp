import { NextResponse } from "next/server";
import { getCustomerPrincipal } from "@/lib/customerAuth";
import { CustomerUserError, unassignNode } from "@/lib/customerUsers";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: { id: string; nodeId: string } }) {
  const principal = await getCustomerPrincipal();
  if (!principal || principal.mustChangePassword) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    await unassignNode(principal.customerId, params.id, params.nodeId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CustomerUserError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
