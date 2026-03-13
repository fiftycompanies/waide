import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PortalBlogPostPage({ params }: Props) {
  const { id } = await params;
  redirect(`/portal/contents/${id}`);
}
