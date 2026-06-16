import { redirect } from "next/navigation";

// 默认首页指向管理后台（未登录会被中间件重定向到 /login）。
// 对客户公开的只读查看页在 /view。
export default function HomePage() {
  redirect("/admin");
}
