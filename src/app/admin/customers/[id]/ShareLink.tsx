"use client";

import { useState } from "react";

export default function ShareLink({ path }: { path: string }) {
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
    <div className="flex items-center gap-2">
      <code className="truncate rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {path}
      </code>
      <button onClick={copy} className="btn-secondary shrink-0">
        {copied ? "已复制 ✓" : "复制链接"}
      </button>
      <a href={path} target="_blank" className="btn-secondary shrink-0">
        打开 ↗
      </a>
    </div>
  );
}
