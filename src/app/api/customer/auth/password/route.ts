import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import {
  getCustomerPrincipal,
  hashCustomerPassword,
  issueCustomerSession,
  validateCustomerPassword,
  verifyCustomerPassword,
} from "@/lib/customerAuth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function isHttps(req: NextRequest): boolean {
  return req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
}

export async function PATCH(req: NextRequest) {
  const principal = await getCustomerPrincipal();
  if (!principal) return NextResponse.json({ error: "登录已失效，请重新登录" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const passwordError = validateCustomerPassword(newPassword);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "新密码不能与当前密码相同" }, { status: 400 });
  }

  const account = await prisma.customerAccount.findUnique({ where: { id: principal.accountId } });
  if (!account || !(await verifyCustomerPassword(currentPassword, account.passwordHash))) {
    return NextResponse.json({ error: "当前密码错误" }, { status: 401 });
  }

  const updated = await prisma.customerAccount.update({
    where: { id: account.id },
    data: {
      passwordHash: await hashCustomerPassword(newPassword),
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
    },
  });
  const token = await issueCustomerSession(updated);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(req),
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
