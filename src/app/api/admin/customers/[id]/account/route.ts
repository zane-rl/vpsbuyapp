import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  hashCustomerPassword,
  normalizeUsername,
  validateCustomerPassword,
} from "@/lib/customerAuth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const normalized = normalizeUsername(body.username);
  if ("error" in normalized) return NextResponse.json({ error: normalized.error }, { status: 400 });
  const passwordError = validateCustomerPassword(body.password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const customer = await prisma.customer.findUnique({ where: { id: params.id }, select: { id: true, account: true } });
  if (!customer) return NextResponse.json({ error: "未找到该客户" }, { status: 404 });
  if (customer.account) return NextResponse.json({ error: "该客户已有登录账号" }, { status: 409 });

  try {
    const account = await prisma.customerAccount.create({
      data: {
        customerId: params.id,
        ...normalized,
        passwordHash: await hashCustomerPassword(body.password),
      },
      select: { id: true, username: true, enabled: true, mustChangePassword: true, lastLoginAt: true },
    });
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "该用户名已被使用" }, { status: 409 });
    }
    throw error;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
  const account = await prisma.customerAccount.findUnique({ where: { customerId: params.id } });
  if (!account) return NextResponse.json({ error: "该客户尚未创建登录账号" }, { status: 404 });

  const data: Prisma.CustomerAccountUpdateInput = { sessionVersion: { increment: 1 } };
  if (body.username !== undefined) {
    const normalized = normalizeUsername(body.username);
    if ("error" in normalized) return NextResponse.json({ error: normalized.error }, { status: 400 });
    data.username = normalized.username;
    data.usernameKey = normalized.usernameKey;
  }
  if (body.enabled !== undefined) data.enabled = body.enabled === true;

  try {
    const updated = await prisma.customerAccount.update({
      where: { id: account.id },
      data,
      select: { id: true, username: true, enabled: true, mustChangePassword: true, lastLoginAt: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "该用户名已被使用" }, { status: 409 });
    }
    throw error;
  }
}
