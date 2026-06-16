"use client";

import { useState } from "react";

/** 截断展示一段文本 + 复制按钮（用于订阅链接等） */
export default function CopyButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 退化：弹出让用户手动复制
      window.prompt("复制订阅链接", text);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={text}
      className={`inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-0.5 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 ${className}`}
    >
      {copied ? "已复制 ✓" : "复制订阅"}
    </button>
  );
}
