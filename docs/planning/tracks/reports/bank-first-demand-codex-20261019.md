# 수학 S2·작업실·출처의 필요한 범위만 조회

2026-10-19. 작업 기준 `5051fea68f0abe6877a4a3001601846cb1d3a9a3`, Orca task `task_bfd2c2327290`. 원본 root의 `brief-bank-first-call-db-codex.md` 전체와 마지막 원장님 추가 지시, AGENTS.md, DESIGN.md, 메뉴 적용표, 설치된 Next 16.3.8의 Route Handlers·Client-side data fetching·use client 가이드를 읽고 구현했다. 이 보고서는 소스·테스트 결과이며 운영 배포나 실계정 검증 완료를 뜻하지 않는다.

처음에는 학년 이름만 읽는다. S2 화면이 단계를 접어 놓고도 전체 bootstrap과 735개 범위 수량을 읽던 경로를 끊었다. 후보·실제 형식·저장 ID 조회에서도 사용하지 않는 전역 요약을 생략했다. 출처 창과 자료 창도 현재 연 단계에 필요한 조회로 나눴다.

| 사용자 단계 | 새 요청 | 읽는 범위 |
| --- | --- | --- |
| 운영 홈·S2 처음 | `problems?identity=question&view=curriculum` | DB `unit GROUP BY grade`, 교육과정 순서. 문항·수량·지문 조회 없음 |
| 학년 선택 | 위 보기 + `grade` | 그 학년의 `unit GROUP BY chapter`. 차시·문항 수량 없음 |
| 단원 선택 | 위 보기 + `grade,chapter` | 그 단원의 차시 메타데이터만 |
| 차시 목록·검색·쪽 이동 | `sources` POST `view=scope-counts,unitIds,...조건` | 현재 20개 차시와 이미 담은 범위의 문항·갈래 수량만 |
| 저장 범위 복원 | `view=curriculum&unitIds` 또는 저장된 `grade,chapter` | 저장 문항의 해당 범위 라벨만. 문항 내용과 입력 수량 보존 |
| 문항 추가·형식 선택·저장 ID 확인 | `problems` GET/POST `view=page` | 같은 질문 projection·total·paging·실제 문항. 전역 단원/학년 수량 요약 없음 |
| 출처 창 | `sources` POST `view=picker-groups` | 화면에 표시하는 출처 갈래의 보유 문항 합집합만 |
| 교과서 화면 열기 | `view=picker-books` | 첫 요청은 과목 이름과 자료 종류, 이미 고른 책의 메타데이터만 |
| 교과서 과목 선택 | `picker-books`와 `picker-book-counts` + `grade,books?` | 현재 과목과 담은 책의 메타데이터·보유/출제 가능/종류 수량만. 자료별 집계 없음 |
| 자료 창·검색·쪽 이동 | `view=materials-page,books,page,pageSize=20,materials?` | 현재 20행의 상세와 그 20개+담은 자료의 수량만 |

기존 `bootstrap`, 일반 목록, 전체 `sources`, `available`, `materials` 응답은 그대로 둔다. 새 보기는 기존 인증·메뉴·개발 전용 관문 안에서만 호출한다. `view=page`는 기존 목록과 동일한 `problems,total,page,pageSize,questionReadMetadata`를 내고 사용하지 않는 `grades,chapters`는 빈 배열로 둔다. 기본 요청의 JSON snapshot과 새 보기의 문항·수량·저장 표현 대응을 별도로 확인했다.

S2는 상위 학년·단원 이동과 차시 검색·쪽 이동 때 담은 범위와 손으로 고친 구성 수를 보존한다. 최근 출제 제외와 출처·자료·갈래 규칙은 수량·후보·구성에 같은 조건을 보낸다. 갈래 규칙을 켜면 서버의 갈래 수, 끄면 문항 수를 사용하며 확인하지 못한 수를 출제 가능한 것으로 취급하지 않는다. 실패 시 입력을 보존하고 같은 범위만 재시도한다. 오래된 저장 문항은 전체 수량 bootstrap 없이 범위를 복원하며, 출력 직전 원래의 출제 자격·단원 이동·출처·실제 형식 검증을 유지한다.

자료 검색의 기존 대소문자 구분과 검색 문자열 `[grade,publisher,author].filter(Boolean).join(" · ") + title + kindRaw + unitRaw`를 유지했다. 정렬은 요청 책 순서 → chapterNo → middleNo → sectionNo(각 null 뒤) → kind 한국어 → sequence(null 뒤) → title 한국어 → id 순서다. 검색·쪽 변경으로 화면 밖으로 나간 선택은 보존하고, 서버가 실제 가용하지 않다고 확인한 선택만 걷어낸다. 여러 책·종류에 걸친 질문 수를 단순 합으로 꾸며 내지 않고 기존처럼 미확인으로 표시한다. 책 행의 자료 편수는 아직 열지 않은 자료 집계를 요구하므로 생략했다.

`LegacyUnifiedWorkspace`와 옛 `BankView`·`BankSourcePicker`는 `/dev/unified`의 개발·비교 경로에서만 사용한다. 운영 `UnifiedWorkspace`의 문제은행 메뉴는 `MathExamBuilder`다. 비교용 기본 계약을 깨는 일괄 변경 대신 운영 소비자에 새 `SourcePicker`·`DemandMaterialPicker`를 연결했다. 옛 로컬 `MaterialPicker`도 기존 계약과 시험을 위해 보존했다.

검증은 공유 DB를 주입하지 않는 기존 인메모리 Prisma 대역과 컴포넌트 fixture로 수행했다. 최종 명령과 결과:

- `node node_modules/vitest/vitest.mjs run --config src/components/exam-builder/vitest.config.mts` — 19파일, 268개 통과. S2 초기 무집계·20개+선택 범위 요청·검색/쪽/학년 변경·저장 복원·실패/재시도·취소·출처 과목/선택 보존·자료 페이지와 검색·기존 선택/구성/출력/저장 조건 회귀를 포함한다.
- `node node_modules/vitest/vitest.mjs run src/__tests__/api/unifiedBankCurriculum.test.ts src/__tests__/api/unifiedBankPickerDemand.test.ts src/__tests__/api/builderSpeedParity.test.ts src/__tests__/api/unifiedBankFilters.test.ts src/__tests__/api/unifiedBankSource.test.ts src/__tests__/api/unifiedBankAvailability.test.ts src/__tests__/api/questionBankProjection.test.ts src/__tests__/components/MaterialPicker.test.tsx` — 8파일, 130개 통과. 기본 응답 snapshot·새 범위 수량/목록 대응·실제 저장 표현·인증/개발 관문·GET/POST·오류 및 조회 축을 확인했다.
- 변경 TS/TSX와 테스트, 대역, 측정 스크립트의 ESLint — 오류·경고 없음.
- `node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --incremental false` — 전체 검사 통과. 시험지 영역의 별도 `tsconfig.check.json` 검사도 통과했다. 기본 4GB 실행은 메모리 한도로 종료되어 프로젝트의 8GB 설정으로 재실행했다. 추가 export 때문에 기존 측정 스크립트가 frozen reader 전체 모양을 요구하던 타입을 실제 사용하는 세 함수의 `Pick`으로 좁혔다.
- `git diff --check` — 통과.

실계정 브라우저·실제 서버 왕복·폭별 화면 캡처·전체 경로의 실DB 지연 시간은 이 worker가 측정하지 않았다. 실DB SQL 측정과 PGlite는 리드의 별도 보고 범위다. 자료 정렬과 검색을 유지하기 위한 작은 search/sort 메타데이터는 고른 책 범위에서 읽되, 상세 응답과 문항 수량 집계는 현재 페이지와 선택으로 제한한다. DB 새 표나 인덱스가 없으면 생략되는 UI 단계가 없으며, 학생·인쇄 CSS와 출력 표현은 변경하지 않았다.

공유 DB 쓰기, Prisma generate/format, git add/commit/push를 실행하지 않았다. `node_modules`는 허용된 `/Users/pss/Desktop/creative/today_/node_modules` 심볼릭 링크이며 패치에 포함하지 않는다. 리드 소유 `bankSourceQuestions.ts`, `bankReadFingerprint.ts`, `questionHeldSourceSql.ts`는 최신본을 시험용으로 잠시 가져왔으며 전달 패치에서는 제외한다. 이 세 파일의 리드 변경을 함께 통합해야 새 route import와 API 시험을 실행할 수 있다.

통합 파일은 `/tmp/bank-first-demand.patch`, 새 파일도 포함하는 `/tmp/bank-first-demand-files.tar.gz`, 정확한 경로·SHA-256 목록 `/tmp/bank-first-demand-files.txt`로 전달한다. 이 worker가 작성한 파일은 아래 24개다.

```text
docs/design/workspace-ui-rules-20261008.md
docs/planning/tracks/reports/bank-first-demand-codex-20261019.md
scripts/qa/measure-builder-speed-live.ts
src/__tests__/api/unifiedBankCurriculum.test.ts
src/__tests__/api/unifiedBankPickerDemand.test.ts
src/__tests__/components/WorkspaceBankMetadata.test.tsx
src/__tests__/unit/mathExamBuilderSource.test.ts
src/app/api/dev/unified/problems/route.ts
src/app/api/studio/problems/route.ts
src/components/exam-builder/DemandMaterialPicker.tsx
src/components/exam-builder/ExamBuilder.demand.test.tsx
src/components/exam-builder/ExamBuilder.tsx
src/components/exam-builder/MathExamBuilder.tsx
src/components/exam-builder/PickerDemand.test.tsx
src/components/exam-builder/ScopeSequencePicker.tsx
src/components/exam-builder/SourcePicker.tsx
src/components/exam-builder/mathSource.ts
src/components/exam-builder/types.ts
src/components/exam-builder/vitest.config.mts
src/components/unified/WorkroomHome.tsx
src/contracts/unifiedBankBootstrap.contract.ts
src/lib/bankSourceRoute.ts
src/lib/unifiedPreview.ts
src/mocks/prismaTestDouble.ts
```
