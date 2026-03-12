import { FileQuestion, Home } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full border-border/40">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
            <FileQuestion className="h-7 w-7 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-2">
            페이지를 찾을 수 없습니다
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </p>
          <Button asChild className="gap-2">
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              대시보드로 이동
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
