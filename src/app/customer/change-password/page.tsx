import { redirect } from "next/navigation";
import { getCustomerPrincipal } from "@/lib/customerAuth";
import ChangePasswordForm from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function CustomerChangePasswordPage() {
  const principal = await getCustomerPrincipal();
  if (!principal) redirect("/customer/login");
  if (!principal.mustChangePassword) redirect("/customer");
  return <main className="app-bg flex min-h-screen items-center justify-center px-4"><ChangePasswordForm /></main>;
}
