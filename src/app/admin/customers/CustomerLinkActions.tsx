"use client";

import { useState } from "react";

/** 客户列表行内的「专属查看链接」操作：复制 + 打开（新标签页） */
export default function CustomerLinkActions({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert(url);
    }
  }

  return (
    <>
      <button
        onClick={copy}
        title="复制客户专属查看链接"
        className="text-slate-400 transition hover:text-indigo-600 dark:hover:text-indigo-400"
      >
        {copied ? "已复制 ✓" : "复制"}
      </button>
      <a
        href={path}
        target="_blank"
        rel="noreferrer"
        title="在新标签页打开客户专属查看页"
        className="text-slate-400 transition hover:text-indigo-600 dark:hover:text-indigo-400"
      >
        打开 ↗
      </a>
    </>
  );
}
