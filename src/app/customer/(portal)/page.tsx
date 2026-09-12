import { CustomerBusinessView } from "@/app/CustomerBusinessView";
import { getCustomerPrincipal } from "@/lib/customerAuth";

export const dynamic = "force-dynamic";

export default async function CustomerHomePage() {
  const principal = await getCustomerPrincipal();
  if (!principal) return null;
  return <CustomerBusinessView customerId={principal.customerId} />;
}
