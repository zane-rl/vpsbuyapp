"use client";

import { useEffect, useRef, useState } from "react";

/** 标准剪贴板接口不可用或被拒绝时，通过文本选区兼容复制。 */
function copyWithSelection(text: string): boolean {
  const activeElement = document.activeElement;
  const selection = window.getSelection();
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
    : [];
  const input = document.createElement("textarea");
  input.value = text;
  input.readOnly = true;
  input.tabIndex = -1;
  input.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0;";
  document.body.appendChild(input);

  try {
    input.focus({ preventScroll: true });
    input.select();
    input.setSelectionRange(0, input.value.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    input.remove();
    if (activeElement instanceof HTMLElement && activeElement.isConnected) {
      activeElement.focus({ preventScroll: true });
    }
    if (selection) {
      selection.removeAllRanges();
      ranges.forEach((range) => selection.addRange(range));
    }
  }
}

/** 复制订阅链接等文本，自动复制失败时展示可选中的完整内容。 */
export default function CopyButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);
  const manualInput = useRef<HTMLTextAreaElement>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  useEffect(() => {
    if (manualCopy) {
      manualInput.current?.focus();
      manualInput.current?.select();
    }
  }, [manualCopy]);

  async function copy() {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setCopied(false);
    setManualCopy(false);
    let success = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        success = true;
      } catch {
        // 浏览器权限或页面环境受限时，继续尝试兼容复制。
      }
    }
    if (!success) success = copyWithSelection(text);
    if (!success) {
      setManualCopy(true);
      return;
    }
    setCopied(true);
    resetTimer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span className="inline-flex min-w-0 max-w-full flex-col items-start">
      <button
        type="button"
        onClick={copy}
        title={text}
        className={`inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-0.5 text-xs text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 ${className}`}
      >
        {copied ? "已复制 ✓" : "复制订阅"}
      </button>
      {manualCopy && (
        <span className="mt-2 block w-72 max-w-full text-xs text-amber-700 dark:text-amber-400">
          <span role="status">自动复制未成功，请手动复制下方内容。</span>
          <textarea
            ref={manualInput}
            aria-label="手动复制内容"
            readOnly
            value={text}
            rows={3}
            onFocus={(event) => event.currentTarget.select()}
            className="input mt-1 font-mono text-xs"
          />
        </span>
      )}
    </span>
  );
}
