"use client";

import { useState, useEffect } from "react";
import { Loader2, Microscope } from "lucide-react";
import { getBrandAnalysisPageData, type BrandAnalysisPageData } from "@/lib/actions/persona-actions";
import BrandAnalysisClient from "./brand-analysis-client";

interface Props {
  clientId: string;
}

/**
 * 클라이언트 사이드에서 데이터를 로딩하여 BrandAnalysisClient에 전달하는 래퍼.
 * 어드민 클라이언트 상세 페이지의 "브랜드 분석" 탭에서 사용.
 */
export default function BrandAnalysisLoader({ clientId }: Props) {
  const [data, setData] = useState<BrandAnalysisPageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getBrandAnalysisPageData(clientId).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Microscope className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">브랜드 분석 데이터가 없습니다.</p>
      </div>
    );
  }

  return <BrandAnalysisClient data={data} />;
}
