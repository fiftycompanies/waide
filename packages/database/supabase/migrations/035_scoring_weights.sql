-- 035: scoring_weights — 모든 점수 산출 로직의 가중치 통합 설정
-- settings 테이블(022에서 생성)에 scoring_weights 키 INSERT

INSERT INTO settings (key, value, description)
VALUES (
  'scoring_weights',
  '{
    "account_grade": {
      "weighted_exposure": 0.5,
      "exposure_rate": 0.3,
      "content_volume": 0.2,
      "thresholds": { "S": 80, "A": 60, "B": 40 },
      "content_tiers": { "100": 100, "50": 75, "20": 50, "10": 25, "0": 10 }
    },
    "keyword_difficulty": {
      "search_volume": 0.4,
      "competition": 0.3,
      "serp_dominance": 0.3,
      "own_rank_bonus": -25,
      "thresholds": { "S": 80, "A": 60, "B": 40 },
      "volume_tiers": { "10000": 100, "5000": 80, "1000": 60, "500": 40, "100": 20, "0": 10 }
    },
    "publish_recommendation": {
      "block_already_exposed": true,
      "block_recent_days": 7,
      "grade_matching": 0.35,
      "publish_history": 0.25,
      "keyword_relevance": 0.25,
      "volume_weight": 0.15
    },
    "qc_scoring": {
      "char_count": 20,
      "haeyo_ratio": 15,
      "keyword_density": 15,
      "h2_structure": 10,
      "image_placeholders": 10,
      "forbidden_terms": 10,
      "comparison_table": 10,
      "cta_included": 5,
      "hashtags": 5,
      "fail_threshold": 70,
      "haeyo_minimum": 0.6
    },
    "marketing_score": {
      "review_reputation": 20,
      "naver_keyword": 25,
      "google_keyword": 15,
      "image_quality": 10,
      "online_channels": 15,
      "seo_aeo_readiness": 15
    }
  }'::jsonb,
  '계정등급/키워드난이도/발행추천/QC검수/마케팅점수 통합 가중치 설정'
)
ON CONFLICT (key)
DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();
