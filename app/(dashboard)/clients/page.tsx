import { redirect } from "next/navigation";

// /clients → /ops/clients (route alias)
export default function ClientsPage() {
  redirect("/ops/clients");
}
