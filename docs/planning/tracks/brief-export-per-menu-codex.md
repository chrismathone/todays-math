# 출력 권한을 메뉴마다 붙인다 — «시험지 · 내보내기» 따로 두지 않기 (원장님 2026-10-19)

원장님: «시험지 내보내기를 분리할 게 아니라 **각 권한마다 배속시켜서** 분리해야지. 그게 합리적.»
계기: 연산대장 2단계에서 3단계(양식 구성·출력)로 못 넘어감 — 계정에 `export` 메뉴가 없어서(`UnifiedWorkspace.tsx` `canOutput={can("export")}`). 지점 메뉴 상한에서도 export 가 꺼져 있었다.

## 원칙
- **각 메뉴가 자기 화면의 출력(양식 구성 · 인쇄 · PDF · HWPX · 내 양식)을 가진다.** 연산대장 → 연산대장 학습지 출력, 시험지 만들기(`bank`) → 그 시험지 출력, 문제 추출(`studio`) → 그 출력, 내 시험지(`library`) → 저장된 시험지 인쇄, 교재 제작 등 출력 단계가 있는 메뉴는 모두 같은 원칙.
- 출력만 따로 켜고 끄는 메뉴 `export` 는 **관리 화면에서 더 고르지 않는다**(관리 콘솔 · 지점 관리의 체크 칸에서 뺀다).
- **아무도 지금 쓰던 것을 잃지 않는다.** 지금 `export` 로 열리던 것은 «출력 단계가 있는 메뉴 중 하나라도 있으면» 열린다. 예전에 export 만 가졌던 계정이 있으면(그것만으로 좌측에 내보내기 메뉴가 떴다 — `workspaceMenuInSidebar`) 그 계정이 무엇을 잃는지 공유 DB 를 **읽기만** 해서 세고 보고하라. 잃는 계정이 있으면 그 경우만 지금처럼 동작하게 남긴다.
- DB 의 `export` 값 · CHECK 제약 · 계정 행은 **건드리지 않는다**(스키마 · 데이터 변경 금지). 값은 남아 있어도 해가 없게 — 읽는 쪽에서 무시하거나 호환으로만 쓴다.

## 바꿀 곳 (전수로 찾을 것 — 아래는 리드가 본 일부)
- `src/components/unified/UnifiedWorkspace.tsx` 의 `can("export")` 전부(연산대장 1868 · 1893 · 인쇄 프리셋 524 · 1207 · 1265 · 1286 · 1407 · 1627 · 1756 · 1785 · 1924 등) — 화면 출처 메뉴로 판정.
- `src/lib/accountRouteAccess.ts` 200 · 262 · 264 · 265~ — `/api/library` · `/api/studio/print-presets` · `/api/exports/**` 등 API 관문. 서버 관문과 화면 판정이 **한 함수**를 쓰게(예: `canOutputFrom(menus, source)` 를 계약 파일에).
- `src/app/(main)/tests/[id]/print/page.tsx:19` · `src/app/(main)/exam-reports/[testId]/page.tsx:16` · `src/components/test/SavedRetryPanel.tsx:241`.
- `src/contracts/accountAccess.contract.ts` 의 `workspaceMenuInSidebar` 와 메뉴 목록 · 관리 콘솔/지점 관리의 메뉴 체크 칸(«추가 기능 권한» 절 — 지금은 export 하나뿐이면 절째 뺀다).
- 지점 메뉴 상한 · 개인 메뉴의 «사용 메뉴 N개» 같은 세기에서 export 를 빼는지 확인.
- 영어 쪽 출력은 이미 자기 메뉴를 따르는지 확인만(바꾸지 않아도 되면 그대로).

## 확인
- 시험: 연산대장만 가진 계정이 3단계 · 인쇄 · PDF 가능 / 메뉴 없는 계정은 여전히 막힘 / 다른 메뉴의 출력 API 를 자기 메뉴 없이 못 부름 / 관리 화면에 export 체크 칸이 없음 / 예전 export 만 가진 계정 처리. 전수 가드 시험(경로 · 메뉴 관련) 포함 관련 시험 · `npm run type-check` · eslint · `npm run lint:affordance` 통과.
- 화면 모양은 체크 칸 하나(절) 빠지는 것 말고 바꾸지 않는다. 문구 추가 최소(D-08).
- DB 쓰기 · 스키마 · `prisma generate` · 커밋 금지. 공유 DB 읽기는 `npx tsx --conditions=react-server --env-file=/Users/pss/Desktop/creative/today_/.env …`, 비밀값 · 개인 이메일 출력 금지(수만). 보고서 `docs/planning/tracks/reports/export-per-menu-codex-20261019.md`.
