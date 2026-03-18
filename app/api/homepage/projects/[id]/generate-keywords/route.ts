import { NextRequest, NextResponse } from "next/server";
import { generateHomepageKeywords } from "@/lib/actions/homepage-keyword-actions";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await generateHomepageKeywords(id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, count: result.count });
}
