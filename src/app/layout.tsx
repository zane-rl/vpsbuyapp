import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VPS 管理",
  description: "VPS 采购与 VPN 节点管理系统",
};

// 在页面绘制前根据 localStorage / 系统偏好设置主题，避免深色模式闪烁
const themeInitScript = `
(function () {
  try {
    var t = localStorage.getItem('theme');
    var dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
