import { redirect } from "next/navigation";

// 全局公开页已移除（避免一次性暴露所有客户数据）。
// 裸访问 /view 重定向到登录；按客户分享请用 /view/<客户ID>。
export default function ViewIndex() {
  redirect("/login");
}
