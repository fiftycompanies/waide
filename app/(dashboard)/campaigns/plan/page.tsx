import { redirect } from "next/navigation";

export default async function CampaignPlanPage() {
  redirect("/ops/contents?tab=create");
}
