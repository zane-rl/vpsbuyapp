"use client";

import { useRef, useState } from "react";

export function fileUrl(name: string): string {
  return `/api/files/${name}`;
}

export default function ImageUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string; // 文件名（空字符串表示无）
  onChange: (name: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (res.ok) {
        const d = await res.json();
        onChange(d.name);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "上传失败");
      }
    } catch {
      setError("网络错误，上传失败");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        {value ? (
          <a href={fileUrl(value)} target="_blank" rel="noreferrer" className="shrink-0">
            <img
              src={fileUrl(value)}
              alt="付款截图"
              className="h-16 w-16 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
            />
          </a>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
            无
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFile} className="hidden" />
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="btn-secondary">
            {busy ? "上传中…" : value ? "更换截图" : "上传截图"}
          </button>
          {value && (
            <button type="button" onClick={() => onChange("")} className="text-xs text-red-500 hover:text-red-600 dark:text-red-400">
              移除
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
