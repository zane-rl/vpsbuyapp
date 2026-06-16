import Link from "next/link";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "../ThemeToggle";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-bg min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white shadow-sm shadow-indigo-600/30">
                V
              </span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                VPS 管理后台
              </span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              <Link href="/admin" className="rounded-md px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                VPS
              </Link>
              <Link href="/admin/customers" className="rounded-md px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                客户
              </Link>
              <Link href="/admin/providers" className="rounded-md px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                提供商
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/vps/new" className="btn-primary">
              <span className="text-base leading-none">+</span> 新增 VPS
            </Link>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
    </div>
  );
}
