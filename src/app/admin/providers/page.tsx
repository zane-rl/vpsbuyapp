import { prisma } from "@/lib/db";
import ProviderManager from "./ProviderManager";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const providers = await prisma.provider.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { vpsServers: true } } },
  });

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">提供商管理</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">维护 VPS 提供商列表，新增 VPS 时从中选择。</p>
      </div>
      <ProviderManager initial={providers} />
    </div>
  );
}
