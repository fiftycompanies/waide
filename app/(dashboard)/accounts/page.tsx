import { redirect } from "next/navigation";

// /accounts → /ops/accounts-management (route alias)
export default function AccountsPage() {
  redirect("/ops/accounts-management");
}
