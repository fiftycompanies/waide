import { redirect } from "next/navigation";

export default async function CampaignPlanPage() {
  redirect("/contents?tab=create");
}
