import { redirect } from "next/navigation";

// 默认首页指向管理后台（未登录会被中间件重定向到 /login）。
// 客户通过独立账号访问 /customer。
export default function HomePage() {
  redirect("/admin");
}
