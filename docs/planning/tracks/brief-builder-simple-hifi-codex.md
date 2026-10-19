# 지시서 — 시험지 만들기 «간단하게» Hi-fi 4안 (codex · 2026-10-18)

워크트리 `/Users/pss/Desktop/creative/today-builder-wire` · 가지 `phase/12-builder-wire`. **커밋하지 않는다.** 금지: DB · `.env` · `prisma generate` · push · 외부 호출 · `git add -A`.
D-07: **원장님이 Wire A 를 고르셨다**(2026-10-18 «A로 가자. 젤 무난한 듯»). 이제 **Hi-fi 4안** — A 의 짜임(1단계: 넓은 단원 목록 + 오른쪽 조건 칸 · 출처 «전체 / 교과서만» 한 줄 · 2단계: 왼쪽 통계·순서표 + 오른쪽 문항)을 지키고, **모양 · 밀도 · 강조 · 막힘 안내의 자리**만 안마다 다르게.
시안은 `src/app/dev/exam-builder-simple-hifi/` 안에만 · 가드 `devPageVisible({ directorOnly: true })`. 제품 부품은 고치지 않는다.

## 지킬 것
- Wire A 보고서 `docs/planning/tracks/reports/builder-simple-wire-codex-20261018.md` 의 «유지한 선택» 표 전부(난이도 여섯 사다리 · 최근 14일 제외 · 교체 창 · 구성 조건 창 · 저장 조건 · 정답·해설 처음 숨김).
- 실제 제품 토큰 · 글꼴 · 색(`05-design-system.md` 의 [확정] · 지금 `ExamBuilder.module.css` 의 변수). 05 §0 금지 목록(그라데이션 · 둥근 카드 범벅 · 이모지 · 장식 아이콘). 문구 D-08.
- 실제 규모의 픽스처(범위 735 · 문항 34~50 · 긴 차시 이름). 1040px 본문 · 1440px · 폰 폭에서 깨지지 않게(가로 넘침 0).
- 원장님 «너무 따라 하진 말고 이 정도로 좋아 보이면» — 참고 서비스 모양을 베끼지 않는다.
- 막힘 안내: 다섯 까닭(확인 중 · 0문항 · 출력 권한 · 총수 불일치 · 형식별 불일치)을 각 안에서 예로 보이는 토글.
- 불러오는 중 · 실패 상태도 토글로(목록 칸 가운데 · «선택은 유지됩니다 · 다시 불러오기»).

## 만들 것
H1~H4 · 안마다 1 · 2단계 · 한 줄 설명 · 약점 한 줄 · «추천» 금지. 렌더 시험 · `devPageGuardCoverage` · type-check(🔴 공유 Prisma 클라이언트 탓 기존 오류는 보고만) · eslint · `lint:affordance`. 가로 넘침을 재는 스크립트(`scripts/qa/`)를 두되 Chromium 이 안 돌면 스크립트만.

## 끝맺음
`docs/planning/tracks/reports/builder-simple-hifi-codex-20261018.md` · 마지막 답에 요약 · 바꾼 파일 · 시험 결과.
