import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CustomerUserError, unassignNode } from "@/lib/customerUsers";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: { id: string; nodeId: string } }) {
  const user = await prisma.customerManagedUser.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "未找到该终端用户" }, { status: 404 });
  try {
    await unassignNode(user.customerId, params.id, params.nodeId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CustomerUserError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
