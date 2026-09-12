import Link from "next/link";
import { redirect } from "next/navigation";
import ThemeToggle from "@/app/ThemeToggle";
import { getCustomerPrincipal } from "@/lib/customerAuth";
import { prisma } from "@/lib/db";
import CustomerLogoutButton from "../CustomerLogoutButton";
import CustomerSessionGuard from "../CustomerSessionGuard";

export const dynamic = "force-dynamic";

export default async function CustomerPortalLayout({ children }: { children: React.ReactNode }) {
  const principal = await getCustomerPrincipal();
  if (!principal) redirect("/customer/login");
  if (principal.mustChangePassword) redirect("/customer/change-password");
  const customer = await prisma.customer.findUnique({ where: { id: principal.customerId }, select: { name: true } });
  if (!customer) redirect("/customer/login");

  return (
    <div className="app-bg min-h-screen">
      <CustomerSessionGuard />
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/75">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-5">
            <Link href="/customer" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-sky-500 text-sm font-bold text-white">V</span>
              <span><span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{customer.name}</span><span className="hidden text-[10px] uppercase tracking-[0.16em] text-sky-600 dark:text-sky-400 sm:block">客户资产台账</span></span>
            </Link>
            <nav className="flex items-center gap-1">
              <Link href="/customer" className="rounded-md px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">服务器与对账</Link>
              <Link href="/customer/users" className="rounded-md px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">终端用户</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2"><ThemeToggle /><CustomerLogoutButton /></div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
