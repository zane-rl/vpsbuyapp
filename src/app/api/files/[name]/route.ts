import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { getCustomerPrincipal } from "@/lib/customerAuth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

// 凭证按登录身份和客户归属读取；随机文件名校验同时防止路径穿越。
export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const name = params.name;
  // 仅允许 “随机串.扩展名”，防止路径穿越
  if (!/^[a-zA-Z0-9]+\.(png|jpg|jpeg|webp|gif)$/.test(name)) {
    return new Response("Not found", { status: 404 });
  }
  const ext = name.split(".").pop()!.toLowerCase();

  const admin = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const customer = admin ? null : await getCustomerPrincipal();
  if (!admin && !customer) return new Response("Not found", { status: 404 });

  const customerId = customer?.customerId;
  const ownerFilter = customerId ? { customerId } : {};
  const [vps, renewal, payment, recharge] = await Promise.all([
    prisma.vpsServer.findFirst({ where: { paymentProof: name, ...ownerFilter }, select: { id: true } }),
    prisma.vpsRenewal.findFirst({
      where: { paymentProof: name, ...(customerId ? { vps: { customerId } } : {}) },
      select: { id: true },
    }),
    prisma.customerPayment.findFirst({ where: { paymentProof: name, ...ownerFilter }, select: { id: true } }),
    prisma.customerRecharge.findFirst({ where: { paymentProof: name, ...ownerFilter }, select: { id: true } }),
  ]);
  if (!vps && !renewal && !payment && !recharge) return new Response("Not found", { status: 404 });

  try {
    const buf = await readFile(path.join(UPLOAD_DIR, name));
    return new Response(buf, {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
