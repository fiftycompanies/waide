import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { getAiMarketBrands, getSelectedClientId } from "@/lib/actions/brand-actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [brands, selectedClientId] = await Promise.all([
    getAiMarketBrands(),
    getSelectedClientId(),
  ]);

  return (
    <SidebarProvider>
      <AppSidebar brands={brands} selectedClientId={selectedClientId} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/40 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {/* Breadcrumb or page title can be added here */}
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
