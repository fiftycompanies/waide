"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ContentSource {
  id: string;
  title: string;
  source_type: string;
}

interface ContentSourceSelectorProps {
  sources: ContentSource[];
  onSourceChange: (sources: {
    placeData: boolean;
    librarySourceIds: string[];
    customText: string;
  }) => void;
}

export function ContentSourceSelector({ sources, onSourceChange }: ContentSourceSelectorProps) {
  const [usePlaceData, setUsePlaceData] = useState(true);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");

  function updateParent(updates: Partial<{
    placeData: boolean;
    librarySourceIds: string[];
    customText: string;
  }>) {
    const next = {
      placeData: updates.placeData ?? usePlaceData,
      librarySourceIds: updates.librarySourceIds ?? selectedSourceIds,
      customText: updates.customText ?? customText,
    };
    onSourceChange(next);
  }

  function toggleSource(id: string) {
    const next = selectedSourceIds.includes(id)
      ? selectedSourceIds.filter((s) => s !== id)
      : [...selectedSourceIds, id];
    setSelectedSourceIds(next);
    updateParent({ librarySourceIds: next });
  }

  return (
    <div className="space-y-4">
      {/* 기본 소스: 플레이스 데이터 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">기본 소스</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Checkbox
              id="place-data"
              checked={usePlaceData}
              onCheckedChange={(checked) => {
                setUsePlaceData(!!checked);
                updateParent({ placeData: !!checked });
              }}
            />
            <Label htmlFor="place-data" className="text-sm">
              네이버 플레이스 이미지/정보 (분석 결과 자동 연결)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* 소스 라이브러리 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">소스 라이브러리</CardTitle>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              소스 라이브러리에 등록된 소스가 없습니다
            </p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-auto">
              {sources.map((src) => (
                <div key={src.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`src-${src.id}`}
                    checked={selectedSourceIds.includes(src.id)}
                    onCheckedChange={() => toggleSource(src.id)}
                  />
                  <Label htmlFor={`src-${src.id}`} className="text-sm">
                    {src.title}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({src.source_type})
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 직접 텍스트 입력 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">직접 텍스트 입력</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="추가 정보, 매장 특징, 메모 등을 입력하세요..."
            value={customText}
            onChange={(e) => {
              setCustomText(e.target.value);
              updateParent({ customText: e.target.value });
            }}
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>
    </div>
  );
}
