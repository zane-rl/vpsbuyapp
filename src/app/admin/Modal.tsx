"use client";

import { useEffect } from "react";

// 居中对话框 + 半透明遮罩。点击遮罩或按 ESC 关闭。
export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm dark:bg-black/60"
      onClick={onClose}
    >
      <div
        className="card my-8 w-full max-w-lg p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="关闭"
            >
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
