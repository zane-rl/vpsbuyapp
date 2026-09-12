"use client";

import { useEffect, useRef } from "react";

/** 浏览器恢复历史页面时重新确认客户会话，失效期间用遮罩保护旧页面内容。 */
export default function CustomerSessionGuard() {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let validationId = 0;

    function showOverlay() {
      if (overlayRef.current) overlayRef.current.style.display = "flex";
    }

    function hideOverlay() {
      if (overlayRef.current) overlayRef.current.style.display = "none";
    }

    async function validateSession() {
      const currentId = ++validationId;
      showOverlay();
      try {
        const res = await fetch("/api/customer/auth/session", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!res.ok) {
          window.location.replace("/customer/login");
          return;
        }
        if (!disposed && currentId === validationId) hideOverlay();
      } catch {
        window.location.replace("/customer/login");
      }
    }

    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) void validateSession();
    }

    function handlePopState() {
      void validateSession();
    }

    // 页面进入历史缓存前先覆盖敏感内容；恢复后只有会话有效才移除遮罩。
    function handlePageHide() {
      showOverlay();
    }

    void validateSession();
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("popstate", handlePopState);
    return () => {
      disposed = true;
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400"
      style={{ display: "flex" }}
      role="status"
      aria-live="polite"
    >
      正在确认登录状态…
    </div>
  );
}
