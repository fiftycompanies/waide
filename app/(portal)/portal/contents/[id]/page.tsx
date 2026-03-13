import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import PortalBlogPostDetail from "@/components/portal/portal-blog-post-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PortalContentDetailPage({ params }: Props) {
  const user = await getCurrentUser();

  if (!user || !user.client_id) {
    redirect("/login");
  }

  const { id } = await params;

  return <PortalBlogPostDetail contentId={id} clientId={user.client_id} />;
}
