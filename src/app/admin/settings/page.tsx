import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import NotifySettings from "./NotifySettings";
import RecipientManager from "./RecipientManager";
import CopyButton from "@/app/CopyButton";

export const dynamic = "force-dynamic";

const CRON_EXAMPLE =
  '0 9 * * * curl -fsS -H "X-Cron-Secret: 你的CRON_SECRET" http://localhost:3000/api/cron/expiry-notify >> ~/vpsbuyapp-notify.log 2>&1';

const REASON_LABEL: Record<string, string> = {
  term: "到期",
  auto: "余额",
  both: "到期+余额",
};

export default async function SettingsPage() {
  const [setting, recipients, perCustomer, logs] = await Promise.all([
    prisma.notifySetting.findUnique({ where: { id: "default" } }),
    prisma.notifyRecipient.findMany({
      where: { customerId: null },
      orderBy: { createdAt: "asc" },
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, notifyTo: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.notifyLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  const initial = {
    enabled: setting?.enabled ?? false,
    botToken: setting?.botToken ?? "",
    daysAhead: setting?.daysAhead ?? 5,
    siteBaseUrl: setting?.siteBaseUrl ?? "",
  };

  return (
    <div className="animate-fade-in mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">设置</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          服务器即将到期时，自动向 Telegram 推送提醒，附上该客户的专属查看链接。
        </p>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-800 dark:text-slate-100">Telegram 到期推送</h2>
        <NotifySettings initial={initial} />
      </section>

      <section className="card p-5">
        <h2 className="mb-1 text-base font-semibold text-slate-800 dark:text-slate-100">全局收件人</h2>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          这里配置的 chat_id 会收到<strong>所有客户</strong>的到期提醒，通常是管理员自己。
          客户各自的收件人请到对应的客户详情页配置。chat_id 可向 @userinfobot 发消息获取。
        </p>
        <RecipientManager recipients={recipients} />
      </section>

      <section className="card p-5">
        <h2 className="mb-1 text-base font-semibold text-slate-800 dark:text-slate-100">各客户收件人</h2>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          每个客户单独配置自己的 chat_id，只会收到自己服务器的到期提醒。点客户名进入详情页增删。
        </p>
        {perCustomer.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">暂无客户</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head">
                  <th className="py-2 pr-4">客户</th>
                  <th className="py-2 pr-4">收件人</th>
                </tr>
              </thead>
              <tbody>
                {perCustomer.map((c) => (
                  <tr key={c.id} className="table-row">
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/admin/customers/${c.id}`}
                        className="font-medium text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">
                      {c.notifyTo.length === 0 ? (
                        <span className="text-slate-400 dark:text-slate-500">未配置（仅全局收件人会收到）</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {c.notifyTo.map((r) => (
                            <span
                              key={r.id}
                              className={`badge ${
                                r.enabled
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                              }`}
                            >
                              <span className="font-mono">{r.chatId}</span>
                              {r.label ? ` · ${r.label}` : ""}
                              {r.enabled ? "" : " · 已停用"}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="mb-1 text-base font-semibold text-slate-800 dark:text-slate-100">定时任务配置</h2>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          应用本身不含定时器，需在服务器 <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">crontab -e</code> 中加一行每日调用；
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">CRON_SECRET</code> 配在 <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.env</code> 中。
          同一客户同一天只会推送一次。
        </p>
        <div className="flex items-start gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {CRON_EXAMPLE}
          </code>
          <CopyButton text={CRON_EXAMPLE} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-800 dark:text-slate-100">推送记录</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">暂无推送记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head">
                  <th className="py-2 pr-4">日期</th>
                  <th className="py-2 pr-4">客户</th>
                  <th className="py-2 pr-4">原因</th>
                  <th className="py-2 pr-4">明细</th>
                  <th className="py-2 pr-4 text-right">成功/失败</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="table-row">
                    <td className="py-2.5 pr-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {formatDate(l.notifyDate)}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-slate-700 dark:text-slate-200">
                      {l.customer.name}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                      {REASON_LABEL[l.reason] ?? l.reason}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-400 dark:text-slate-500">
                      {l.detail}
                      {l.error && <span className="block text-red-500 dark:text-red-400">{l.error}</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      <span className="text-emerald-600 dark:text-emerald-400">{l.sentCount}</span>
                      <span className="text-slate-300 dark:text-slate-600"> / </span>
                      <span className={l.failCount > 0 ? "text-red-500 dark:text-red-400" : "text-slate-400"}>
                        {l.failCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
