import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// /ops/blog-accounts → /blog-accounts (route alias)
export default function BlogAccountsRedirectPage() {
  redirect("/blog-accounts");
}
