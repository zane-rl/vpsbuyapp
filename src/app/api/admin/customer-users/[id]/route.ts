import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CustomerUserError, updateManagedUser } from "@/lib/customerUsers";
import { optStr, str } from "@/lib/validate";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.customerManagedUser.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "未找到该终端用户" }, { status: 404 });
  try {
    const body = await req.json();
    const user = await updateManagedUser(existing.customerId, params.id, {
      name: str(body.name),
      contact: optStr(body.contact),
      note: optStr(body.note),
      enabled: body.enabled === true,
    });
    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof CustomerUserError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}
