import { redirect } from "next/navigation";

// 公开客户页已关闭，客户资料统一通过客户账号登录查看。
export default function ViewIndex() {
  redirect("/customer/login");
}
