# 병목 두 곳 — 문제은행 목록 캐시 · 반 전체 성적표 동시 렌더 (원장님 2026-10-19 승인 «1번 진행»)

리드 감사(공유 DB 읽기만, 로컬 왕복 ~70ms):
- 문제은행 검색 목록 `GET /api/studio/problems?identity=question` (`loadUnifiedBank` → `loadQuestionBank`, `src/lib/unifiedPreview.ts`): 쪽 넘김 · 필터 바꿀 때마다 문항 후보 118,166행 전수 읽기 → 묶기 → 12개 자름. p1 3,804/2,186/2,200ms(157KB), 중2 p5 2,345/1,234/713ms. 캐시 없음.
- 반 전체 성적표 인쇄 `/api/exam-reports/[testId]/print` (`src/lib/examReport/server.ts:396` 부근): 학생마다 Chromium PDF 를 순차 렌더 — 20명이면 20~60초 추정, 함수 한도 300초 위험. 운영 기록 0행이라 아직 안 드러남.

## 1. 문제은행 목록 캐시
- 같은 조건(필터 · 정렬 · 보기)의 «묶은 전체 결과(쪽 자르기 전)»를 `src/lib/bankReadCache.ts` 에 넣어, 같은 조건의 쪽 넘김은 전수 읽기 없이 자른다. 계정 · 지점 · 최근 출제 등 **사람마다 달라지는 조건이 들어간 요청은 캐시하지 않거나 열쇠에 넣는다** — 섞이면 안 된다(먼저 그 조건이 무엇인지 코드에서 확인하고 보고).
- 무효화는 bankReadCache 의 기존 규칙(TTL · epoch · 앱 Prisma 변경 시 비움)을 따른다. 메모리 상한을 둔다(큰 결과 몇 개만).
- 응답은 바뀌기 전과 바이트 단위로 같아야 한다 — 기존 parity 시험 방식으로 잠근다.
- 공유 DB 읽기만으로 전/후 측정(첫 호출 · 같은 조건 2쪽 · 다른 필터) 3회. `npx tsx --conditions=react-server --env-file=/Users/pss/Desktop/creative/today_/.env …`.

## 2. 반 전체 성적표 동시 렌더
- 학생별 PDF 렌더를 동시 2~4개(상수, 기본 3)로 돌린다. 결과 순서 · 확정/미확정 처리 · 실패 시 동작(한 명 실패가 전체를 어떻게 하는지)은 지금과 같게. Chromium 인스턴스를 공유할 수 있으면 공유(브라우저 하나 · 페이지 여러 개).
- 시험: 순서 보존 · 동시 수 상한 · 실패 처리. Chromium 은 모킹.

## 지킬 것
화면 모양 · 문구 변경 없음. DB 쓰기 · 스키마 · `prisma generate` · 커밋 금지. 관련 시험 · `npm run type-check` · 변경 파일 eslint 통과. 보고서 `docs/planning/tracks/reports/bank-cache-report-parallel-codex-20261019.md`(실측 표 포함).
