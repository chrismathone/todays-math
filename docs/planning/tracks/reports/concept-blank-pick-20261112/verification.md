# 개념 백지 H2 구현 · 검증 기록

기준: `f71adecb0` · 작업 가지: `phase/9-concept-blank-pick` · 2026-11-12.

구현 커밋: `14720f3f5332a064b19fa7c715dd35419e367677`(주소·인쇄), `f71c3b1177cc5ce56b3074ab11479408d988e726`(H2·검증 자료). 보고는 후속 문서 커밋이다.

## 구현과 호환성

- A–E 형식별 자동/직접, 파란 읽기 전용 문항 수, 세 칸 고르기 창, 소단원·난이도·종류·고른 것만 필터, 답 펼치기, 오른쪽 빼기, 목표 수의 빈 칸 채우기/교체를 구현했다. 자동↔직접 왕복은 적용한 선택을 메모리에 보존한다. 취소/Escape는 창에서 고친 선택을 버린다.
- 혼합 선택은 지시서의 **(가)**다. 직접 형식이 있으면 자동 형식도 기존 `takeByLevel`을 호출해 `selection.pick`으로 펼친다. 저장 계약·DB·은행은 바꾸지 않았다. 기존 exact 합치기의 형식·소단원 묶음을 따른다.
- 저장본에는 자동 형식도 고정된 문항 ID로 남는다. 다시 열 때 모든 저장 형식은 직접 상태로 복원한다. ID·형식·소단원·문항 차례를 유지하며, 은행에 없거나 소단원/난이도가 바뀐 선택은 조용히 버리거나 바꾸지 않고 저장·인쇄를 막아 재확인을 받는다. 자동만 쓰는 옛 주소와 지면 코드는 그대로다.
- 직접 선택 URL은 ID 사전과 인덱스 튜플을 담은 v1이다. 8KiB보다 긴 값만 `z1.` 압축을 쓰고 해제 버퍼는 64KiB로 제한한다. 실제 은행 60개 소단원·622문항은 **22,972 → 5,783자**, 왕복 일치. 60개 소단원·840문항 경계 픽스처도 12KiB 안에서 왕복한다.
- D-159: 공용 `PickerDialog`에 선택적 `width="wide"`, `titleAside`를 추가했다. 기본 폭/동작은 그대로이며 H2만 1200px, 왼쪽 268px, 오른쪽 304px를 쓴다. 휴대전화에서는 한 열로 쌓고 목록·고른 문항까지 스크롤할 수 있다.
- D-30: 목록 행과 문장에는 클릭/체크 동작이 없다. 체크 칸·단추만 동작한다.

## TDD와 자동 검사

순수 함수의 미구현 RED → GREEN, RTL의 창/직접 선택/정확한 미리보기 RED → GREEN을 먼저 진행했다. 독립 검토에서 찾은 저장 순서 변경과 오래된 선택의 조용한 유실은 회귀 시험을 먼저 실패시킨 뒤 고쳤다. 긴 URL과 종류별 고른 수도 실패를 확인한 뒤 구현했다.

- 변경 모듈 최종 묶음: **9파일 · 155시험 통과**, `--maxWorkers=3`.
- 최종 `npm run type-check`, 변경 파일 ESLint, `npm run lint:affordance`: **통과**.
- 전체 시험은 커밋 전 **한 번만** 실행했다. **1,835파일 중 1,736 통과·66 실패·33 건너뜀, 44,255시험 중 43,166 통과·58 실패·1,030 건너뜀, 미처리 오류 1. 전체 관문은 미통과다.**

전체 회차에서 이번 실물 검수 항목 추가에 따라 `PrintCheck.test.tsx`의 고정 개수 검사가 156/157 불일치를 잡았다. 기대 개수를 157로 바꾸고 새 항목의 대기 상태·날짜를 명시해 위 155시험 묶음에서 통과를 확인했다.

기준 커밋 `f71adecb0`의 별도 `/tmp` 체크아웃에서 실패 파일 22개를 좁혀 비교한 첫 회차는 **19파일 통과, 3파일 실패(287 통과·3 실패·2 건너뜀, 미처리 오류 1)**였다. 같은 실패 셋은 `studioAiFigureEdit`(Gemini 기대값/현재 Claude 모델), `studentSessionSweep`(`math-ontology/actions/production.server.ts` 분류 누락), `CurriculumGraphPanel`(`getLearningInsightV2` 대역 누락)이다.

교재/PGlite 계열은 외장 볼륨 `prisma/migrations`의 `._…` 메타데이터 파일을 마이그레이션 폴더로 읽어 `ENOTDIR`가 난다. 실제로 디렉터리가 아닌 대상 90개를 확인했다. 현재 트리에서 `sourceMaterialMigration`만 다시 실행해 같은 경로의 오류를 확인했고, 메타데이터 파일이 없는 기준 체크아웃에서는 해당 파일을 포함한 교재 시험 19파일이 통과했다. 공유 DB와 무관한 로컬 하네스 문제이며 이 작업에서 마이그레이션이나 그 하네스를 바꾸지 않았다.

전체 회차에서 실패한 나머지 파일도 기준 커밋에서만 좁혀 재실행했다. 이번 개수 검사 1파일을 제외한 **65파일 전부 대조: 48파일은 기준 체크아웃에서 통과, 17파일은 기존 실패 재현**. 기준 대조 합계는 1,163시험 통과·24 실패·3 건너뜀·미처리 오류 1이다. 경로/로컬 환경의 차이를 기존 코드 결함과 구분한다. 통과한 48파일의 원인을 모두 동일하다고 단정하지 않는다.

기준에서도 실패한 17파일: `studentSessionSweep`, `studioAiFigureEdit`, `CurriculumGraphPanel`, `conceptSentenceFixes`, `devAiResponseValidation`, `elemTiersG5`, `englishFence`, `errorLogRouteCoverage`, `examWiringAudit`, `mathInsightV2Access`, `mathOntologyModelPort`, `mathSrsQuickFence`, `mathSrsRecordIsolation`, `noRmSync`, `problemActualFormatReader`, `proxyStudentGate`, `srsStoredContractWalk`. 이번 구현에서 해당 검사나 제품 코드를 변경하지 않았다.

전체 실패 파일별 첫 실패와 기준 대조 결과: [full-test-comparison.json](full-test-comparison.json).

후속 실데이터 판정기 쓸기도 종료 코드 1이다. **37개 중 빨강 1·울타리 3**: `probe-elem-section-conditions.ts`가 소단원 조건 32건을 보고했고, `probe-middle-algebra-combo.ts`·`probe-middle-combo.ts`는 저장소 밖 말뭉치가 없어 판정하지 못했다. `probe-figure-dependent.ts`도 종료 2이며 쓸기의 사유 발췌에는 눈금 출력만 남았다. 이 기존 판정기·엔진·외부 말뭉치는 이번 변경 범위 밖이고 고치거나 새로 만들지 않았다. 전체 `npm run test` 종료 코드는 **1**이다.

```sh
npx vitest run src/__tests__/unit/conceptBlankManualPick.test.ts src/__tests__/unit/conceptBlankSelectionCodec.test.ts src/__tests__/unit/conceptBlankExactPick.test.ts src/__tests__/unit/conceptBlankSheetCode.test.ts src/__tests__/unit/pickerDialog.test.tsx src/__tests__/components/ConceptBlankPick.test.tsx src/__tests__/components/ConceptBlankView.test.tsx src/__tests__/components/PrintCheck.test.tsx src/__tests__/api/conceptBlankPrintPage.test.ts --maxWorkers=3
npm run type-check
npm run lint:affordance
AUTH_SECRET=concept-blank-pick-local-only npm run test -- --maxWorkers=3
```

## 실제 화면 측정

실제 `ConceptBlankView`·`ConceptBlankPaper`·초5 은행·`Workroom.module.css`·제품 글꼴을 Vite 하네스에서 실행했다. Chromium 인스턴스는 하나만 사용했다. `/api/**`는 모두 가로채고 저장/재열기는 메모리 대역으로 처리했다. 인증을 포함한 서버 인쇄 경로는 API 시험에서 별도로 확인했다. 운영 서비스나 공유 DB를 사용한 종단 시험은 아니다.

- **1440·1280·390px, 24장면, 한글 낱말 23,448개, 낱말 중간 줄바꿈 0, 가로 넘침 0, 브라우저 오류 0.**
- A–E, B 질문/○×/답 펼침, C 문장/적용을 측정했다. `Range.getClientRects()`로 한 낱말의 y 위치를 비교했다. KaTeX/SVG/숨긴 노드는 제외했다. 일부러 깨뜨린 낱말은 7줄로 검출되어 측정기의 감도를 확인했다. 이 수치는 해당 초5 화면 표본의 값이며 전 학년 문장 전수 판정은 아니다.
- B 직접 1문항 + C 자동 12문항을 저장하고 다시 연 뒤 인쇄 주소가 동일함을 확인했다. 같은 선택을 실제 지면 부품으로 렌더하고 학생 문항을 확인했다. RTL/API 시험은 선택 ID·순서와 합친 지면 전체를 비교한다.
- 모바일 목록 체크 칸과 오른쪽 묶음의 마지막 빼기 단추가 스크롤 후 화면 안에 들어오는 것도 확인했다.

[시안/실제 비교](comparison.png) · [나란히 보기 HTML](comparison.html) · [측정 원자료](measurements.json)

[1440px](actual-1440.png) · [1280px](actual-1280.png) · [390px](actual-390.png) · [모바일 목록](actual-390-list.png) · [모바일 고른 문항](actual-390-tray.png) · [저장 후 다시 열기](applied-and-reopened.png) · [같은 선택의 인쇄 지면](print-same-selection.png)

재현:

```sh
AUTH_SECRET=concept-blank-pick-local-only npx vite --config e2e/concept-blank-paper/vite.config.mts
node scripts/qa/concept-blank-pick.mjs
```

## 남은 실물 검수

실물 프린터 검수는 하지 않았다. 루트 `CLAUDE.md` 절대 규칙 6에 따라 `/dev/print-check`에 `concept-blank-pick-20261112`를 **대기**로 추가했다. A–E의 직접 선택 및 B 직접+C 자동 혼합을 저장·재열기한 뒤 학생지와 채점표를 A4 100%로 출력해 선택 누락/추가, 양쪽 문항 불일치, 지면 코드가 생기는지 확인해야 한다.

푸시·main 병합·공유 DB 쓰기·`.env` 복사·운영 빌드는 하지 않았다. 독립 작업은 Orca Codex worker가 URL/인쇄 호환성 구현과 읽기 전용 검토를 맡았다. 추가 최종 검토 호출은 `agent-update-prompt`로 시작하지 못해 해당 dispatch를 해제했다. 완료하지 않은 재검토를 통과로 세지 않았다.

개발 서버와 기준 대조용 임시 체크아웃을 정리했다. 전체 시험의 `m3Reinforcement20261018.test.tsx`가 재생성한 범위 밖 `m3-candidates.json`·`m3-verification.json`은 원래 버전으로 돌려 이번 커밋에 섞이지 않게 했다. 미병합 작업 가지와 그 작업트리는 보존한다.
