import { redirect } from "next/navigation";

/** 旧免登录链接不再提供数据，统一进入客户登录流程。 */
export default function LegacyCustomerView() {
  redirect("/customer/login");
}
