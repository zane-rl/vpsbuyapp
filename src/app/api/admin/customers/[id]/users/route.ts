import { NextRequest, NextResponse } from "next/server";
import { createManagedUser, CustomerUserError } from "@/lib/customerUsers";
import { optStr, str } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const user = await createManagedUser(params.id, {
      name: str(body.name),
      contact: optStr(body.contact),
      note: optStr(body.note),
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof CustomerUserError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}
