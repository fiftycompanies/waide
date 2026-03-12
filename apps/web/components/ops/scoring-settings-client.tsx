"use client";

import { useState, useTransition } from "react";
import { Save, RotateCcw, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  updateScoringWeights,
  getDefaultScoringWeights,
  updateAnalysisOptions,
  type ScoringWeights,
  type AnalysisOptions,
} from "@/lib/actions/settings-actions";

interface Props {
  settings: ScoringWeights;
  analysisOptions?: AnalysisOptions;
}

function pct(v: number) {
  return Math.round(v * 100);
}
function fromPct(v: number) {
  return v / 100;
}

export function ScoringSettingsClient({ settings: initial, analysisOptions: initialOpts }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ScoringWeights>(structuredClone(initial));
  const [aoForm, setAoForm] = useState<AnalysisOptions>(initialOpts ?? { image_analysis_enabled: false, image_analysis_count: 5 });

  // ── helpers ──
  function setNested<T>(path: string[], value: T) {
    setForm((prev) => {
      const next = structuredClone(prev);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const [scoreResult, aoResult] = await Promise.all([
        updateScoringWeights(form),
        updateAnalysisOptions(aoForm),
      ]);
      if (scoreResult.success && aoResult.success) {
        toast.success("점수 설정이 저장되었습니다. 다음 산출부터 반영됩니다.");
      } else {
        setError(scoreResult.error ?? aoResult.error ?? "저장 실패");
      }
    });
  }

  async function handleReset() {
    const defaults = await getDefaultScoringWeights();
    setForm(structuredClone(defaults));
    toast.info("기본값으로 복원되었습니다. 저장을 눌러야 반영됩니다.");
  }

  // ── validation helpers ──
  const agSum = pct(form.account_grade.weighted_exposure) + pct(form.account_grade.exposure_rate) + pct(form.account_grade.content_volume);
  const kdSum = pct(form.keyword_difficulty.search_volume) + pct(form.keyword_difficulty.competition) + pct(form.keyword_difficulty.serp_dominance);
  const prSum = pct(form.publish_recommendation.grade_matching) + pct(form.publish_recommendation.publish_history) + pct(form.publish_recommendation.keyword_relevance) + pct(form.publish_recommendation.volume_weight);
  const qcSum = form.qc_scoring.char_count + form.qc_scoring.haeyo_ratio + form.qc_scoring.keyword_density + form.qc_scoring.h2_structure + form.qc_scoring.image_placeholders + form.qc_scoring.forbidden_terms + form.qc_scoring.comparison_table + form.qc_scoring.cta_included + form.qc_scoring.hashtags;
  const msSum = form.marketing_score.review_reputation + form.marketing_score.naver_keyword + form.marketing_score.google_keyword + form.marketing_score.image_quality + form.marketing_score.online_channels + form.marketing_score.seo_aeo_readiness;

  function SumBadge({ sum, target }: { sum: number; target: number }) {
    const ok = sum === target;
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
        {ok ? `합계: ${sum}${target === 100 ? (target > 99 ? "점" : "%") : "%"} ` : `합계: ${sum} (${target} 필요)`}
        {!ok && <AlertTriangle className="inline h-3 w-3 ml-0.5" />}
      </span>
    );
  }

  function NumInput({ label, value, onChange, min, max, step, suffix, desc }: {
    label: string; value: number; onChange: (v: number) => void;
    min?: number; max?: number; step?: number; suffix?: string; desc?: string;
  }) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={min ?? 0}
            max={max ?? 100}
            step={step ?? 1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="h-8 w-20 text-sm"
          />
          {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
        </div>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* ── 섹션 1: 계정 등급 ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span>📊</span> 계정 등급 산출 가중치
          </CardTitle>
          <CardDescription>노출 성과 기반 블로그 계정 등급 산출 공식</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium">가중치</span>
            <SumBadge sum={agSum} target={100} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <NumInput label="검색량 가중 노출" value={pct(form.account_grade.weighted_exposure)} onChange={(v) => setNested(["account_grade", "weighted_exposure"], fromPct(v))} suffix="%" />
            <NumInput label="노출률" value={pct(form.account_grade.exposure_rate)} onChange={(v) => setNested(["account_grade", "exposure_rate"], fromPct(v))} suffix="%" />
            <NumInput label="콘텐츠 보유량" value={pct(form.account_grade.content_volume)} onChange={(v) => setNested(["account_grade", "content_volume"], fromPct(v))} suffix="%" />
          </div>

          <div className="pt-2">
            <p className="text-xs font-medium mb-2">등급 기준 (점수 이상)</p>
            <div className="grid grid-cols-3 gap-4">
              <NumInput label="S등급" value={form.account_grade.thresholds.S} onChange={(v) => setNested(["account_grade", "thresholds", "S"], v)} suffix="점+" />
              <NumInput label="A등급" value={form.account_grade.thresholds.A} onChange={(v) => setNested(["account_grade", "thresholds", "A"], v)} suffix="점+" />
              <NumInput label="B등급" value={form.account_grade.thresholds.B} onChange={(v) => setNested(["account_grade", "thresholds", "B"], v)} suffix="점+" />
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs font-medium mb-2">콘텐츠 보유량 기준 (콘텐츠 수 → 환산 점수)</p>
            <div className="grid grid-cols-5 gap-3">
              {Object.entries(form.account_grade.content_tiers)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([key, val]) => (
                  <NumInput key={key} label={`${key}개+`} value={val} onChange={(v) => setNested(["account_grade", "content_tiers", key], v)} suffix="점" />
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 섹션 2: 키워드 난이도 ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span>📊</span> 키워드 난이도 산출 가중치
          </CardTitle>
          <CardDescription>키워드 공략 난이도 산출 공식</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium">가중치</span>
            <SumBadge sum={kdSum} target={100} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <NumInput label="검색량 규모" value={pct(form.keyword_difficulty.search_volume)} onChange={(v) => setNested(["keyword_difficulty", "search_volume"], fromPct(v))} suffix="%" />
            <NumInput label="경쟁도 (compIdx)" value={pct(form.keyword_difficulty.competition)} onChange={(v) => setNested(["keyword_difficulty", "competition"], fromPct(v))} suffix="%" />
            <NumInput label="SERP 상위 점유" value={pct(form.keyword_difficulty.serp_dominance)} onChange={(v) => setNested(["keyword_difficulty", "serp_dominance"], fromPct(v))} suffix="%" />
          </div>

          <NumInput label="자사 상위노출 보정" value={form.keyword_difficulty.own_rank_bonus} onChange={(v) => setNested(["keyword_difficulty", "own_rank_bonus"], v)} min={-100} max={0} suffix="점" desc="TOP10 노출 중이면 난이도 하향 (음수)" />

          <div className="pt-2">
            <p className="text-xs font-medium mb-2">등급 기준 (점수 이상)</p>
            <div className="grid grid-cols-3 gap-4">
              <NumInput label="S (최고난이도)" value={form.keyword_difficulty.thresholds.S} onChange={(v) => setNested(["keyword_difficulty", "thresholds", "S"], v)} suffix="점+" />
              <NumInput label="A등급" value={form.keyword_difficulty.thresholds.A} onChange={(v) => setNested(["keyword_difficulty", "thresholds", "A"], v)} suffix="점+" />
              <NumInput label="B등급" value={form.keyword_difficulty.thresholds.B} onChange={(v) => setNested(["keyword_difficulty", "thresholds", "B"], v)} suffix="점+" />
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs font-medium mb-2">검색량 구간별 점수</p>
            <div className="grid grid-cols-6 gap-3">
              {Object.entries(form.keyword_difficulty.volume_tiers)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([key, val]) => (
                  <NumInput key={key} label={Number(key) > 0 ? `${Number(key).toLocaleString()}+` : "~99"} value={val} onChange={(v) => setNested(["keyword_difficulty", "volume_tiers", key], v)} suffix="점" />
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 섹션 3: 발행 추천 ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span>📊</span> 발행 추천 매칭 가중치
          </CardTitle>
          <CardDescription>계정-키워드 매칭 알고리즘 설정</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.publish_recommendation.block_already_exposed}
                onChange={(e) => setNested(["publish_recommendation", "block_already_exposed"], e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm font-medium">이미 노출 중인 계정 제외</span>
            </label>
          </div>
          <NumInput label="중복 방지 기간" value={form.publish_recommendation.block_recent_days} onChange={(v) => setNested(["publish_recommendation", "block_recent_days"], v)} min={1} max={30} suffix="일" />

          <div className="flex items-center gap-2 mt-3 mb-2">
            <span className="text-xs font-medium">점수 가중치</span>
            <SumBadge sum={prSum} target={100} />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <NumInput label="등급 매칭" value={pct(form.publish_recommendation.grade_matching)} onChange={(v) => setNested(["publish_recommendation", "grade_matching"], fromPct(v))} suffix="%" />
            <NumInput label="발행 이력 여유" value={pct(form.publish_recommendation.publish_history)} onChange={(v) => setNested(["publish_recommendation", "publish_history"], fromPct(v))} suffix="%" />
            <NumInput label="키워드 관련성" value={pct(form.publish_recommendation.keyword_relevance)} onChange={(v) => setNested(["publish_recommendation", "keyword_relevance"], fromPct(v))} suffix="%" />
            <NumInput label="검색량 가중" value={pct(form.publish_recommendation.volume_weight)} onChange={(v) => setNested(["publish_recommendation", "volume_weight"], fromPct(v))} suffix="%" />
          </div>
        </CardContent>
      </Card>

      {/* ── 섹션 4: QC 검수 ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span>📊</span> QC 검수 배점 (100점 만점)
          </CardTitle>
          <CardDescription>콘텐츠 품질 검수 항목별 배점</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium">배점</span>
            <SumBadge sum={qcSum} target={100} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <NumInput label="글자수" value={form.qc_scoring.char_count} onChange={(v) => setNested(["qc_scoring", "char_count"], v)} suffix="점" />
            <NumInput label="해요체 비율" value={form.qc_scoring.haeyo_ratio} onChange={(v) => setNested(["qc_scoring", "haeyo_ratio"], v)} suffix="점" />
            <NumInput label="키워드 밀도" value={form.qc_scoring.keyword_density} onChange={(v) => setNested(["qc_scoring", "keyword_density"], v)} suffix="점" />
            <NumInput label="H2 구조" value={form.qc_scoring.h2_structure} onChange={(v) => setNested(["qc_scoring", "h2_structure"], v)} suffix="점" />
            <NumInput label="이미지 개수" value={form.qc_scoring.image_placeholders} onChange={(v) => setNested(["qc_scoring", "image_placeholders"], v)} suffix="점" />
            <NumInput label="금지표현 없음" value={form.qc_scoring.forbidden_terms} onChange={(v) => setNested(["qc_scoring", "forbidden_terms"], v)} suffix="점" />
            <NumInput label="비교표 (추천형)" value={form.qc_scoring.comparison_table} onChange={(v) => setNested(["qc_scoring", "comparison_table"], v)} suffix="점" />
            <NumInput label="CTA 포함" value={form.qc_scoring.cta_included} onChange={(v) => setNested(["qc_scoring", "cta_included"], v)} suffix="점" />
            <NumInput label="해시태그" value={form.qc_scoring.hashtags} onChange={(v) => setNested(["qc_scoring", "hashtags"], v)} suffix="점" />
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs font-medium mb-2">판정 기준</p>
            <div className="grid grid-cols-2 gap-4">
              <NumInput label="FAIL 기준 (미만)" value={form.qc_scoring.fail_threshold} onChange={(v) => setNested(["qc_scoring", "fail_threshold"], v)} suffix="점" />
              <NumInput label="해요체 최소 비율" value={Math.round(form.qc_scoring.haeyo_minimum * 100)} onChange={(v) => setNested(["qc_scoring", "haeyo_minimum"], v / 100)} suffix="% 미만 FAIL" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 섹션 5: 마케팅 점수 ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span>📊</span> 마케팅 종합 점수 배점
          </CardTitle>
          <CardDescription>브랜드 분석 시 6개 영역 배점</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium">배점</span>
            <SumBadge sum={msSum} target={100} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <NumInput label="① 네이버 리뷰/평판" value={form.marketing_score.review_reputation} onChange={(v) => setNested(["marketing_score", "review_reputation"], v)} suffix="점" />
            <NumInput label="② 네이버 키워드 노출" value={form.marketing_score.naver_keyword} onChange={(v) => setNested(["marketing_score", "naver_keyword"], v)} suffix="점" />
            <NumInput label="③ 구글 키워드 노출" value={form.marketing_score.google_keyword} onChange={(v) => setNested(["marketing_score", "google_keyword"], v)} suffix="점" desc="현재: 측정 예정" />
            <NumInput label="④ 이미지 품질" value={form.marketing_score.image_quality} onChange={(v) => setNested(["marketing_score", "image_quality"], v)} suffix="점" />
            <NumInput label="⑤ 온라인 채널 완성도" value={form.marketing_score.online_channels} onChange={(v) => setNested(["marketing_score", "online_channels"], v)} suffix="점" />
            <NumInput label="⑥ SEO/AEO 준비도" value={form.marketing_score.seo_aeo_readiness} onChange={(v) => setNested(["marketing_score", "seo_aeo_readiness"], v)} suffix="점" />
          </div>
        </CardContent>
      </Card>

      {/* ── 섹션 6: 분석 옵션 ── */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span>🖼️</span> 분석 옵션
          </CardTitle>
          <CardDescription>이미지 Vision AI 분석 설정 (비용: 이미지 5장당 약 100원)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={aoForm.image_analysis_enabled}
              onChange={(e) => setAoForm({ ...aoForm, image_analysis_enabled: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <div>
              <span className="text-sm font-medium">이미지 AI 분석 활성화</span>
              <p className="text-xs text-muted-foreground">활성화 시 Claude Vision으로 이미지 품질/분위기/활용도를 분석합니다</p>
            </div>
          </label>
          {aoForm.image_analysis_enabled && (
            <NumInput
              label="분석 이미지 수"
              value={aoForm.image_analysis_count}
              onChange={(v) => setAoForm({ ...aoForm, image_analysis_count: Math.max(1, Math.min(10, v)) })}
              min={1}
              max={10}
              suffix="장"
              desc="비용 절약: 이미지 수를 줄이면 분석 비용이 절감됩니다 (1장 ≈ 20원)"
            />
          )}
        </CardContent>
      </Card>

      {/* ── 버튼 ── */}
      <div className="flex items-center gap-3 sticky bottom-4 bg-background/80 backdrop-blur-sm p-3 rounded-lg border">
        <Button type="submit" disabled={isPending} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold">
          <Save className="h-4 w-4 mr-2" />
          {isPending ? "저장 중..." : "설정 저장"}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          기본값 복원
        </Button>
        {(agSum !== 100 || kdSum !== 100 || prSum !== 100 || qcSum !== 100 || msSum !== 100) && (
          <span className="text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            가중치 합계가 맞지 않는 섹션이 있습니다
          </span>
        )}
      </div>
    </form>
  );
}
