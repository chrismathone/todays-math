# 문항 형식 칸 — 코드 2차 (리드 검토, 2026-10-19)

1차 결과(보고서 `question-format-column-code-codex-20261019.md`): 응답 33/33 일치는 좋다. 하지만 **범위 수량 1.8→3.0초 · 출처 1.6→2.0초 · bootstrap 1.6→1.9초로 느려졌다.** 원인 표: 요청마다 «현재 입력 digest 검증 SELECT» ~950ms + SQL 집계 0.9~2.1초.

## 리드 판단 · 지시
1. **읽을 때 digest 를 다시 계산해 검증하지 않는다.** 무결성은 DB 트리거(`problem_zz_actual_format_invalidate` — 입력이 바뀌면 세 칸을 NULL 로)가 보장한다. 읽기는 `actual_format IS NOT NULL AND actual_format_version = 현재 버전`만 믿는다. digest 대조는 감사 도구(`scripts/db/verify-problem-actual-format.ts`)의 몫으로 남긴다. 트리거가 걸리지 않는 쓰기 경로(트리거 비활성 · COPY 등)가 저장소에 있는지 찾아 보고하라 — 있으면 그 경로 뒤에 백필 재실행 안내.
2. **집계 SQL 을 공유 DB 에서 EXPLAIN (ANALYZE, BUFFERS) — 읽기 전용 트랜잭션** 으로 보고 줄인다: GROUPING SETS 를 쪼개거나 합치기, distinct 대상 축소(질문 키 · 대표 행 미리 고르기), 필요한 인덱스가 있으면 **제안만**(DB 변경은 리드 승인). 목표: 첫 호출 범위 수량 · 출처 · bootstrap · 목록 1쪽 각 **≤ 700ms**(로컬 → 서울 DB 왕복 포함 기준).
3. 그래도 목표 미달이면: **DB 지문으로 검증하는 공용 캐시** — 결과를 캐시하고, 요청마다 아주 싼 지문 쿼리(예: shared 풀의 `count(*)` · `max(updated_at)` · 형식 칸 NULL 수 — 인덱스로 수 ms 인지 EXPLAIN 으로 확인)로 바뀌었는지만 본다. 지문이 같으면 인스턴스 간에도 안전하게 재사용(TTL 길게). 지문이 놓치는 쓰기(직접 SQL 적재 등)는 기존 `BANK_COUNTS_EPOCH` 로. 이 방식의 정확성 근거를 보고서에.
4. 응답 바이트 일치(기존 33건 대조) 유지. 1차의 지연 저장(읽다가 NULL 이면 채움) 유지 — 단 그 쓰기가 읽기 요청 시간을 늘리지 않게(채울 행이 없으면 비용 0).
5. 화면 · 문구 · DB 스키마 변경 없음 · 공유 DB 쓰기 금지(측정 · EXPLAIN 은 읽기 전용) · 커밋 금지 · `prisma generate` 금지. 전/후 실측 3회 표(1차 측정 스크립트 재사용). 보고서 `question-format-column-code-r2-codex-20261019.md`.
