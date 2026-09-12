import { NextRequest, NextResponse } from "next/server";
import { hashCustomerPassword, validateCustomerPassword } from "@/lib/customerAuth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const passwordError = validateCustomerPassword(body.password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
  const account = await prisma.customerAccount.findUnique({ where: { customerId: params.id } });
  if (!account) return NextResponse.json({ error: "该客户尚未创建登录账号" }, { status: 404 });

  await prisma.customerAccount.update({
    where: { id: account.id },
    data: {
      passwordHash: await hashCustomerPassword(body.password),
      mustChangePassword: true,
      sessionVersion: { increment: 1 },
    },
  });
  return NextResponse.json({ ok: true });
}
