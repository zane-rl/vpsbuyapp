import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const existing = await prisma.vpsServer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "未找到该 VPS" }, { status: 404 });
  if (existing.status === "stopped") {
    return NextResponse.json({ error: "该服务器已永久下线" }, { status: 409 });
  }
  const updated = await prisma.vpsServer.update({
    where: { id: params.id },
    data: { status: "stopped", stoppedAt: new Date() },
  });
  return NextResponse.json(updated);
}
