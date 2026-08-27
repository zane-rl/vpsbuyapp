"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Recipient = { id: string; chatId: string; label: string | null; enabled: boolean };

/**
 * 收件人管理。传 customerId = 管理该客户专属收件人（只收自己服务器的到期提醒）；
 * 不传 = 管理全局收件人（通常是管理员，所有客户的提醒都会收到）。
 */
export default function RecipientManager({
  recipients,
  customerId,
}: {
  recipients: Recipient[];
  customerId?: string;
}) {
  const router = useRouter();
  const [chatId, setChatId] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/notify-recipients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, label, customerId }),
    });
    setBusy(false);
    if (res.ok) {
      setChatId("");
      setLabel("");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "添加失败");
    }
  }

  async function toggle(r: Recipient) {
    const res = await fetch(`/api/admin/notify-recipients/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !r.enabled }),
    });
    if (res.ok) router.refresh();
    else alert("操作失败");
  }

  async function remove(id: string) {
    if (!confirm("确认删除该收件人？")) return;
    const res = await fetch(`/api/admin/notify-recipients/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert("删除失败");
  }

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="label">chat_id *</span>
            <input
              className="input font-mono"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="8626161517（群组为负数）"
            />
          </label>
          <label className="block">
            <span className="label">备注</span>
            <input
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="如：张三、运维群"
            />
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button type="submit" disabled={busy} className="btn-success mt-2 px-4 py-2">
          新增收件人
        </button>
      </form>

      {recipients.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          {customerId ? "该客户暂未配置收件人，到期提醒只会发给全局收件人" : "暂无全局收件人"}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="py-2 pr-4">chat_id</th>
                <th className="py-2 pr-4">备注</th>
                <th className="py-2 pr-4">状态</th>
                <th className="py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r) => (
                <tr key={r.id} className="table-row">
                  <td className="py-2.5 pr-4 font-mono text-slate-700 dark:text-slate-200">{r.chatId}</td>
                  <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">{r.label || "-"}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`badge ${
                        r.enabled
                          ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {r.enabled ? "已启用" : "已停用"}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => toggle(r)}
                        className="font-medium text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400"
                      >
                        {r.enabled ? "停用" : "启用"}
                      </button>
                      <button
                        onClick={() => remove(r.id)}
                        className="text-red-500 transition hover:text-red-600 dark:text-red-400"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
