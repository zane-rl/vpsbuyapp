import Link from "next/link";
import { prisma } from "@/lib/db";
import VpsForm from "../VpsForm";
import { toFormData, type VpsFormData } from "../vpsFormData";

export const dynamic = "force-dynamic";

export default async function NewVpsPage({
  searchParams,
}: {
  searchParams: { from?: string; customer?: string };
}) {
  const [customers, providers] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.provider.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  let initial: VpsFormData | undefined;
  let clonedFrom: string | null = null;

  // 复制已有 VPS：预填配置，清空 id/IP，名称加「-副本」便于区分
  if (searchParams.from) {
    const src = await prisma.vpsServer.findUnique({ where: { id: searchParams.from } });
    if (src) {
      const d = toFormData(src);
      initial = { ...d, id: undefined, name: `${d.name}-副本`, ipAddress: "" };
      clonedFrom = src.name;
    }
  } else if (searchParams.customer) {
    // 从客户页进入：预选该客户
    initial = { ...toFormData({}), customerId: searchParams.customer };
  }

  return (
    <div className="animate-fade-in mx-auto max-w-3xl">
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
          ← 返回列表
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {clonedFrom ? "复制新增 VPS" : "新增 VPS"}
        </h1>
        {clonedFrom && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            基于「{clonedFrom}」复制，请按需修改名称、IP、金额等信息后保存
          </p>
        )}
      </div>
      <div className="card p-6">
        <VpsForm initial={initial} customers={customers} providers={providers} />
      </div>
    </div>
  );
}
