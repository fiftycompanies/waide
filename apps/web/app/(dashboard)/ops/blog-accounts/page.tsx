import { redirect } from "next/navigation";

// /ops/blog-accounts → /blog-accounts (route alias)
export default function BlogAccountsRedirectPage() {
  redirect("/blog-accounts");
}
