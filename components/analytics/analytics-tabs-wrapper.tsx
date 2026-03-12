"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AEOTrackingSection } from "./aeo-tracking-section";
import { AEOCompetitionSection } from "./aeo-competition-section";
import { AEOCitationSection } from "./aeo-citation-section";
import type {
  AEOAnalyticsData,
  AEOCompetitionData,
  AEOCitationData,
} from "@/lib/actions/aeo-tracking-actions";

interface AnalyticsTabsWrapperProps {
  clientId: string;
  aeoData: AEOAnalyticsData;
  competitionData: AEOCompetitionData;
  citationData: AEOCitationData;
  seoContent: React.ReactNode;
  initialTab?: string;
}

export function AnalyticsTabsWrapper({
  clientId,
  aeoData,
  competitionData,
  citationData,
  seoContent,
  initialTab = "seo",
}: AnalyticsTabsWrapperProps) {
  const [tab, setTab] = useState(initialTab);

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <TabsList>
        <TabsTrigger value="seo">SEO 분석</TabsTrigger>
        <TabsTrigger value="aeo">AEO 노출</TabsTrigger>
        <TabsTrigger value="competition">경쟁 분석</TabsTrigger>
        <TabsTrigger value="citation">Citation 분석</TabsTrigger>
      </TabsList>

      <TabsContent value="seo">{seoContent}</TabsContent>

      <TabsContent value="aeo">
        <AEOTrackingSection clientId={clientId} data={aeoData} daysFilter={30} />
      </TabsContent>

      <TabsContent value="competition">
        <AEOCompetitionSection data={competitionData} />
      </TabsContent>

      <TabsContent value="citation">
        <AEOCitationSection data={citationData} />
      </TabsContent>
    </Tabs>
  );
}
