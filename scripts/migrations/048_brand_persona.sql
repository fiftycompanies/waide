-- 048_brand_persona.sql
-- clients 테이블에 브랜드 페르소나 JSONB 컬럼 추가

ALTER TABLE clients ADD COLUMN IF NOT EXISTS brand_persona JSONB;
-- {
--   "one_liner": "...",
--   "core_identity": "...",
--   "positioning": "...",
--   "primary_target": "...",
--   "secondary_target": "...",
--   "target_needs": [...],
--   "strengths": [...],
--   "weaknesses": [...],
--   "tone": "...",
--   "content_angles": [...],
--   "avoid_angles": [...],
--   "competitor_position": 3,
--   "differentiation": "...",
--   "generated_at": "...",
--   "generated_by": "CMO_v1.0",
--   "manually_edited": false,
--   "manual_overrides": {}
-- }

ALTER TABLE clients ADD COLUMN IF NOT EXISTS persona_updated_at TIMESTAMPTZ;
