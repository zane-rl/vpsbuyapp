import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VPS 管理",
  description: "VPS 采购与 VPN 节点管理系统",
};

// 在页面绘制前设置主题，避免深色模式闪烁。
// 默认深色：无存储偏好时用 dark；用户手动切换后按其选择。
const themeInitScript = `
(function () {
  try {
    var t = localStorage.getItem('theme');
    var dark = t ? t === 'dark' : true;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
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
