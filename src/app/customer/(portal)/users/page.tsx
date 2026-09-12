import ManagedUserManager from "@/app/ManagedUserManager";
import { getCustomerPrincipal } from "@/lib/customerAuth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CustomerUsersPage() {
  const principal = await getCustomerPrincipal();
  if (!principal) return null;
  const [users, nodes] = await Promise.all([
    prisma.customerManagedUser.findMany({
      where: { customerId: principal.customerId },
      orderBy: [{ enabled: "desc" }, { createdAt: "asc" }],
      include: { assignments: { orderBy: { assignedAt: "asc" }, include: { vpnNode: { include: { vps: { select: { id: true, name: true, status: true } } } } } } },
    }),
    prisma.vpnNode.findMany({
      where: { vps: { customerId: principal.customerId } },
      orderBy: [{ vps: { name: "asc" } }, { name: "asc" }],
      include: { vps: { select: { id: true, name: true, status: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-sky-600 dark:text-sky-400">用户 → 节点 → VPS</p><h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">终端用户</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">维护实际使用 VPN 的人员，并查看每个人当前使用的节点与所属服务器。</p></div>
      <section className="card p-5"><ManagedUserManager mode="customer" customerId={principal.customerId} users={users} nodes={nodes} /></section>
    </div>
  );
}
