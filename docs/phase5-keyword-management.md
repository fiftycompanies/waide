# Phase 5 — 키워드 관리 UI (is_primary 지정 포함)

## 목표
대시보드 플레이스 순위 카드에서 사용하는 "대표 키워드(is_primary)" 지정 기능과,
키워드 추가/삭제 관리 UI를 구현한다.

---

## ⚠️ 필수 확인 사항

```
⚠️ 현재 라이브 서비스 운영 중. 기존 키워드 관련 코드 삭제/수정 금지. 기능 추가만.
```

**시작 전 실행:**
```bash
# 기존 키워드 관련 페이지/컴포넌트 확인
grep -rn "keywords\|keyword" apps/web/app/portal/ --include="*.tsx" --include="*.ts" -l
cat apps/web/app/portal/keywords/page.tsx 2>/dev/null | head -80 || echo "키워드 페이지 없음"

# 기존 keywords Server Action 확인
grep -rn "keywords.*insert\|keywords.*update\|keywords.*delete" apps/web/ --include="*.ts" | head -20
```

---

## 화면: `/portal/keywords` (신규 또는 기존 페이지 확장)

### UI 구성

```
[헤더] 키워드 관리            [+ 키워드 추가] 버튼

[키워드 목록 테이블]
키워드 | 대표 키워드 | 추적 여부 | 등록일 | 액션
────────────────────────────────────────────────
가평 풀빌라  [★ 대표]    [추적 중]   2024-01-01  [삭제]
가평 펜션    [대표 지정] [추적 중]   2024-01-05  [삭제]
북한강 글램핑 [대표 지정] [추적 중]  2024-01-10  [삭제]
```

- "대표 키워드" 컬럼: `is_primary=true`이면 별 뱃지, 나머지는 [대표 지정] 버튼
- [대표 지정] 클릭 → 기존 is_primary를 false로, 선택 항목을 true로 업데이트 (Server Action)

### Server Actions

**① is_primary 변경**
```typescript
// apps/web/app/portal/keywords/actions.ts
'use server'

export async function setPrimaryKeyword(keywordId: string, clientId: string) {
  const supabase = createAdminClient();
  
  // 트랜잭션: 기존 primary 해제 → 새 primary 설정
  await supabase
    .from('keywords')
    .update({ is_primary: false })
    .eq('client_id', clientId);
  
  await supabase
    .from('keywords')
    .update({ is_primary: true })
    .eq('id', keywordId)
    .eq('client_id', clientId);
  
  revalidatePath('/portal/dashboard');
  revalidatePath('/portal/keywords');
}
```

**② 키워드 추가**
```typescript
export async function addKeyword(keyword: string, clientId: string) {
  const supabase = createAdminClient();
  
  // 중복 체크
  const { data: existing } = await supabase
    .from('keywords')
    .select('id')
    .eq('client_id', clientId)
    .eq('keyword', keyword)
    .single();
  
  if (existing) throw new Error('이미 등록된 키워드입니다.');
  
  // 첫 번째 키워드면 자동으로 is_primary = true
  const { count } = await supabase
    .from('keywords')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId);
  
  await supabase.from('keywords').insert({
    client_id: clientId,
    keyword,
    is_active: true,
    is_primary: count === 0, // 첫 키워드면 자동 대표
  });
  
  revalidatePath('/portal/dashboard');
  revalidatePath('/portal/keywords');
}
```

**③ 키워드 삭제 (소프트 삭제)**
```typescript
export async function deactivateKeyword(keywordId: string, clientId: string) {
  const supabase = createAdminClient();
  
  // is_primary인 키워드는 삭제 불가 (다른 키워드를 먼저 대표로 지정해야 함)
  const { data: kw } = await supabase
    .from('keywords')
    .select('is_primary')
    .eq('id', keywordId)
    .single();
  
  if (kw?.is_primary) throw new Error('대표 키워드는 삭제할 수 없습니다. 다른 키워드를 대표로 지정하세요.');
  
  await supabase
    .from('keywords')
    .update({ is_active: false })
    .eq('id', keywordId)
    .eq('client_id', clientId);
  
  revalidatePath('/portal/dashboard');
}
```

---

## 완료 조건
- [ ] 키워드 목록 테이블 렌더링
- [ ] [대표 지정] 버튼 → DB 업데이트 → 대시보드 플레이스 순위 카드 반영
- [ ] [+ 키워드 추가] 기능 (최대 5개 제한 안내)
- [ ] 키워드 삭제 (소프트 삭제, 대표 키워드 보호)
- [ ] 대시보드 `+ 키워드 관리` 링크 → 이 페이지 연결
- [ ] tsc --noEmit 통과
- [ ] git push → Vercel 빌드 성공

---

## 전체 Phase 완료 후 최종 확인
- [ ] Phase 1~5 모두 완료
- [ ] 대시보드에서 플레이스 순위 카드 → is_primary 키워드 기준 정상 표시
- [ ] 점유율 바 차트 데이터 정상
- [ ] 15일 미니차트 정상
- [ ] 키워드 필터 → 테이블 필터링 동작
- [ ] 블로그 발행 버튼 → 모달 or 페이지 이동 동작
- [ ] Vercel 프로덕션 배포 완료
