import { NextRequest, NextResponse } from "next/server";
import { getCustomerPrincipal } from "@/lib/customerAuth";
import { CustomerUserError, updateManagedUser } from "@/lib/customerUsers";
import { optStr, str } from "@/lib/validate";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const principal = await getCustomerPrincipal();
  if (!principal || principal.mustChangePassword) return NextResponse.json({ error: "未授权" }, { status: 401 });
  try {
    const body = await req.json();
    const user = await updateManagedUser(principal.customerId, params.id, {
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
