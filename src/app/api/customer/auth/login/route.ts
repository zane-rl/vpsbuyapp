import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import {
  issueCustomerSession,
  normalizeUsername,
  verifyCustomerPassword,
} from "@/lib/customerAuth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function isHttps(req: NextRequest): boolean {
  return req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const normalized = normalizeUsername(body.username);
  const password = typeof body.password === "string" ? body.password : "";
  const account = "error" in normalized
    ? null
    : await prisma.customerAccount.findUnique({ where: { usernameKey: normalized.usernameKey } });
  if (!account || !account.enabled || !(await verifyCustomerPassword(password, account.passwordHash))) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  await prisma.customerAccount.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
  const token = await issueCustomerSession(account);
  const res = NextResponse.json({ ok: true, mustChangePassword: account.mustChangePassword });
  res.cookies.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(req),
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(req),
    path: "/",
    maxAge: 0,
  });
  return res;
}
