# 문제은행 «처음 부를 때» 속도 — DB 단계 (원장님 2026-10-19 «속도가 빨라질 수 있다면 승인»)

현황(main `5051fea68`, 보고서 `docs/planning/tracks/reports/question-format-column-code-r2-codex-20261019.md`): 저장 형식 · SQL 집계 · DB 지문 캐시. 처음 부를 때 목록 1쪽 2.6초 · 범위 수량 2.1초 · 출처 1.4초 · bootstrap 1.2초 · 자료 안 목록 1.35초. 다시 부를 때 0.24~0.35초(지문 SELECT 자체가 ~0.24초 — 118k 행 xmin 해시).
EXPLAIN 근거 파일: `docs/planning/tracks/reports/question-format-column-code-r2-*-explain-20261019.json` (집계에서 temp spill 수천~1만 블록).

**목표: 처음 부를 때 각 ≤ 0.7초, 다시 부를 때 ≤ 0.15초.** 응답은 지금과 바이트 동일.

## 승인 범위
공유 DB 스키마 추가(인덱스 · 요약 표 · 트리거 · 함수)는 원장님 승인됨 — 단 **적용은 리드가 한다**. 너는 설계 · 마이그레이션 SQL · 로컬 PGlite 시험 · 읽기 전용 실측까지. 기존 운영 코드가 DDL 적용 뒤에도 깨지지 않아야 한다(DB 먼저 · 코드 나중).

## 후보 (근거로 고르고, 섞어도 된다)
A. **좁은 covering / partial 인덱스** — 집계가 index-only 로 돌도록(question_group_key · unit_id · actual_format · pool · 출제 자격 조건). EXPLAIN 으로 heap 접근 · temp spill 이 사라지는지.
B. **은행 판(revision) 한 줄**: problem · unit · source_material · source_book 의 INSERT/UPDATE/DELETE 에 statement-level 트리거로 `bank_revision` 표의 숫자 하나를 올린다. 지문 SELECT(0.24초)를 «한 행 읽기»(수 ms)로 바꾼다. 직접 SQL 쓰기도 트리거를 타므로 xmin 지문과 같은 범위를 잡는다(트리거 비활성 · 복원만 epoch 로).
C. **요약 표(미리 센 수)**: 공용 수량 · 출처 · 단원 메타데이터를 bank_revision 별로 저장하고, 판이 바뀌면 다음 요청이 한 번 다시 계산해 채운다(또는 쓰기 뒤 비동기). 그러면 «처음 부를 때»도 인스턴스와 관계없이 빠르다. 계정별(recent 등) 조건은 여기 넣지 않는다.
세션 설정(`SET LOCAL work_mem`)으로 spill 을 줄이는 것도 코드 쪽 후보 — 공유 DB 영구 설정은 바꾸지 않는다.

## 만들 것
- 마이그레이션 SQL + schema.prisma(손으로, `prisma format` 금지) + PGlite 시험(트리거 · 판 증가 · 동시성 · 기존 쿼리 무영향).
- 적용 도구(드라이런 기본 · `ALLOW_SHARED_IMPORT=1 --apply`, lock_timeout · 거래 제한 · 실패 시 전체 되돌림 — `scripts/db/apply-problem-actual-format-migration.ts` 방식 재사용) · 인덱스는 거래 밖 `CREATE INDEX CONCURRENTLY` 가 가능하면 그쪽(쓰기 잠금 없음).
- 코드 단계 초안(새 표/판을 읽는 reader)은 **브랜치에 같이 두되**, 리드가 DDL 적용 확인 뒤에 켜도록 — 표가 없으면 지금 경로로 동작하게(또는 플래그).
- 공유 DB 읽기 전용 EXPLAIN · 추정(인덱스는 적용 전 실측 불가 — PGlite 에 실제 분포 복제로 근거, 보고서에 한계 명시).
- 보고서 `docs/planning/tracks/reports/bank-first-call-db-codex-20261019.md`: 고른 설계 · 근거 · 리드가 칠 명령(순서) · 되돌리는 법.
금지: 공유 DB 쓰기 · `prisma generate`(공유 node_modules) · 커밋. 비밀값 출력 금지.

## 원장님 추가 지시 (위보다 우선)
1. **«쓸데없는 인덱스는 필요 없고, 정말 필요한 것만.»** 인덱스는 측정으로 효과가 증명된 것만, 최소 개수로. 각 인덱스마다 «이게 없으면 어느 경로가 몇 ms 느려지는가»를 근거로 적는다. 효과가 작거나 겹치는 것은 넣지 않는다. 이미 있는 인덱스 중 이번 설계로 쓸모없어지는 것이 있으면 보고만.
2. **«미리 로딩할 필요 없는데 로딩하지 말고.»** 화면이 지금 단계에서 쓰지 않는 데이터를 미리 읽지 않는다. 특히 시험지 만들기 1단계는 이제 S2(학년 → 단원 → 차시 차례)라서, 처음에는 학년 목록만 필요하다 — 735개 범위 전체의 수량을 처음에 세지 말고, 고른 학년(→ 단원)의 차시 수량만 그때 센다. 문제은행 · 출처 · 작업실도 같은 원칙으로 «지금 보이는 것만» 읽는지 점검하고 고친다. 요약 표(C안)처럼 미리 다 계산해 두는 방식은 이 원칙에 비춰 꼭 필요할 때만.
   → 이 «필요한 것만 읽기»를 **먼저** 하고, 그래도 느린 경로에만 DB 변경(B안 판 한 줄 · 최소 인덱스)을 쓴다.
