import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

// 公开读取上传的截图（文件名为不可猜的随机串，无需登录即可访问）
export async function GET(_req: NextRequest, { params }: { params: { name: string } }) {
  const name = params.name;
  // 仅允许 “随机串.扩展名”，防止路径穿越
  if (!/^[a-zA-Z0-9]+\.(png|jpg|jpeg|webp|gif)$/.test(name)) {
    return new Response("Not found", { status: 404 });
  }
  const ext = name.split(".").pop()!.toLowerCase();
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
