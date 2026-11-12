# 지시서 — 개념 백지 «문제 고르기» (Hi-fi H2) · 2026-11-12

리드: Claude. 작업자: Codex. 작업트리: `/Volumes/새 볼륨/today-worktrees/concept-blank-pick`, 가지 `phase/9-concept-blank-pick`.
푸시하지 않는다. 가지에 커밋하고 끝에 «보고»를 채운다.

## 요청 · 결정(다시 묻지 않는다)
- 원장님 · 인재원 선생님: «개념 백지에서 모두 출제하지 않고 원하는 것만 출제할 수 있게 고르기».
- 시안: `docs/design/mockups/hifi-concept-blank-pick-20261112.html` 의 **H2** (W1 의 형식별 «자동 · 직접» + W2 의 고르기 창). 브라우저로 열어 동작을 그대로 따른다.
  - 형식 표(A ~ E) 각 칸 머리에 «자동 · 직접» 단추. «직접»이면 «문항 고르기» 단추 → 고르기 창.
  - 창은 세 칸: **왼쪽 거르기**(소단원 «고른 수 / 전체» · 난이도 · 종류(B 는 질문 · ○×, C 는 문장 · 적용) · «고른 것만») / **가운데 목록**(문장만 + «답 보기»로 펼침, 체크) / **오른쪽 «고른 문항»**(하 · 중 · 상 묶음, × 로 빼기).
  - 창 바닥: 자동으로 채울 수(하 · 중 · 상) · [빈 칸만 자동으로] · [모두 비우고 자동으로]. 머리: «고름 N» · [취소] [적용].
  - **직접이면 고른 문항만 지면에 싣는다.** 표의 칸에는 고른 수가 파란 칸(입력 아님)으로 선다.
  - «자동»으로 되돌려도 **묻지 않고 고른 것을 남겨 두었다가** «직접»으로 오면 되살린다.
  - 지면 코드: 직접 고른 형식이 하나라도 있으면 «만들 지면»의 지면 코드 자리에 **«없음 — 직접 고른 형식이 있습니다»**.
  - **줄바꿈(원장님 2026-11-12 «이상한 데서 강제로 줄바꿈되지 않게 너비를 적절하게»)**: 한글은 낱말 단위로만 꺾는다(`word-break: keep-all` · `overflow-wrap: anywhere`), 숫자 · 단추 이름은 꺾지 않는다. 창은 넓게(시안: 창 1200 · 거르기 268 · 고른 문항 304) — 소단원 이름이 한 줄에 들어가게. **낱말 가운데 줄바꿈 0** 을 시험으로 잰다(시안 검사처럼 Range 의 getClientRects 로 — 폭 1440 · 1280 · 390).
- «자동으로 채우기»의 뽑는 규칙은 main 의 `takeByLevel`(커밋 `3afa2f468` — 소단원 차례로 돌리고, 모자라는 마지막 바퀴는 범위 전체에 고르게)을 **그대로 부른다.** 따로 짜지 않는다.

## 지금 코드
- 화면: `src/components/concept-blank/ConceptBlankView.tsx`(1,150줄) · `ConceptBlankFormTable.tsx` · `concept-blank.module.css`.
- 뒷단은 이미 정확한 고르기를 받는다: `selection.pick`(`ConceptBlankPick{blankSectionKey, entryKind, entryId, form, level}` — `src/contracts/conceptBlank.contract.ts`) → `composeExactSheets`(`src/lib/concept-blank/exactPick.ts`). 내 시험지 저장(`conceptBlankDocumentSchema`)도 `pick` 을 받는다. 지면 코드는 `pick` 이면 만들지 않는다(`canonicalSheetSelection` 이 던진다).
  - 🔴 `pick` 은 지금 «선택 전체가 정확한 고르기»다. H2 는 **형식마다** 자동/직접이 섞인다(B 직접 · C 자동). 섞인 선택을 어떻게 만들지 먼저 정하라: (가) 화면에서 자동 형식도 `takeByLevel` 결과를 `pick` 으로 펼쳐 넘긴다 — 계약 무변경, 대신 은행이 바뀌어도 그 문항이 고정된다, 또는 (나) 계약에 형식별 `pick` 을 더한다. **(가)를 먼저 검토**하고, 고른 길과 까닭을 보고에 적는다. 계약을 바꾸면 저장본 · 주소(`selectionCodec`) · 인쇄 경로(`/concept-blank/print`)의 옛 값이 그대로 열리는지 시험한다.
- D-159: 긴 목록 고르기 → 공용 `src/components/picker-dialog/PickerDialog.tsx` 를 먼저 본다. 세 칸 창이 안 맞으면 부품을 넓힌다(따로 한 벌 짓지 않는다). 못 넓힌 까닭은 보고에.
- D-30: 목록 줄 전체를 누르는 표면으로 만들지 않는다 — 체크 칸 · 단추만. `npm run lint:affordance`.

## 시험 · 관문
- TDD: 순수 함수(고른 것 → pick, 빈 칸만 자동 · 모두 비우고 자동, 자동↔직접 오가도 남는 것) 먼저. RTL: 직접 → 창 → 고르기 → 적용 → 표 칸 수 · 만들 지면 수 · 지면 코드 «없음» · 미리보기에 고른 문항만.
- 저장 → 다시 열기, 인쇄 화면이 같은 문항을 내는지.
- 바뀐 모듈 시험만 `--maxWorkers=3`, 전체는 커밋 직전 한 번. `npm run type-check`.
- 운영 빌드 금지 · 브라우저 Chromium 하나 · 공유 DB 쓰기 금지 · `.env` 복사 금지(`AUTH_SECRET` 임시값).
- 실제 화면 스크린샷을 시안과 나란히 남긴다.

## 보고
- 커밋 · 바뀐 파일: `14720f3f5`(직접 선택 주소·인쇄 호환성), `f71c3b117`(H2 화면·혼합 선택·검사·시안 비교 자료). 이 보고와 상세 검증 기록은 후속 문서 커밋에 담았다. 주요 변경은 `ConceptBlankView.tsx`·`ConceptBlankFormTable.tsx`·새 `ConceptBlankQuestionPicker.tsx`와 CSS, `manualPick.ts`·`selectionCodec.ts`, `/concept-blank/print/page.tsx`, 공용 `PickerDialog`, 관련 단위/RTL/API 시험, `/dev/print-check` 대기 항목이다. `e2e/concept-blank-paper/pick.*`·`scripts/qa/concept-blank-pick.mjs` 및 [화면 비교·검증 기록](reports/concept-blank-pick-20261112/verification.md)도 남겼다.
- 섞인 선택(가/나) 고른 길과 까닭: **(가)**. 자동 형식도 기존 `takeByLevel`을 그대로 호출해 `selection.pick`으로 펼친다. 계약·DB를 바꾸지 않고 저장·재열기·인쇄가 같은 문항을 유지한다. 저장된 자동 형식도 문항 ID가 고정되며, 재열기에서는 저장 형식 모두 직접으로 복원한다. 기존 exact의 형식·소단원 묶음과 저장 순서를 보존한다. 은행에서 문항이 없어지거나 소단원/난이도가 달라지면 조용히 빼지 않고 재확인을 받는다. 자동만 쓰는 옛 주소는 유지했다. 긴 직접 주소는 압축하며 실제 60소단원·622문항은 22,972자에서 5,783자로 줄고 왕복 일치했다.
- PickerDialog 를 썼나 / 넓혔나: **공용 부품을 확장했다.** 선택적 `width="wide"`·`titleAside`를 더해 H2 창만 1200px, 거르기 268px, 고른 문항 304px로 쓴다. 취소/Escape·초점 복귀는 공용 동작을 따른다. 목록 행/문장은 누르는 표면이 아니며 체크 칸·단추만 동작한다(D-30). `lint:affordance`, 변경 파일 ESLint, 최종 타입 검사 통과.
- 낱말 가운데 줄바꿈 측정값: **1440·1280·390px, 24장면, 한글 낱말 23,448개 중 0건**, 가로 넘침 0·브라우저 오류 0. 실제 초5 은행·제품 부품·Workroom CSS·제품 글꼴에서 Range로 측정했다. 일부러 꺾은 낱말은 7줄로 검출됐다. A–E·B ○×/답 펼침·C 적용, 모바일 목록/고른 문항 접근을 확인했다. [시안과 나란히](reports/concept-blank-pick-20261112/comparison.png) · [측정 원자료](reports/concept-blank-pick-20261112/measurements.json). 전 학년 문장 전수 검증이라는 뜻은 아니다.
- 남은 것 · 물을 것: 새로 정할 사항은 없다. **변경 모듈 9파일·155시험 통과**, 메모리 API로 혼합 13문항 저장→재열기→같은 인쇄 주소를 확인했다. 전체 시험은 지시대로 한 번 실행했으며 **1,835파일 중 1,736 통과·66 실패·33 건너뜀**, 시험 43,166 통과·58 실패·1,030 건너뜀·미처리 오류 1로 **미통과**다. 이번 검수 목록 개수 실패는 수정 후 위 155시험에서 통과했다. 나머지 65파일 전부를 기준 커밋 `f71adecb0`에서 대조해 48파일 통과·17파일 기존 실패 재현을 확인했다(외장 볼륨 `._…` 마이그레이션 탐색 오류 등 환경 차이 포함). 후속 실데이터 판정기도 37개 중 빨강 1·울타리 3으로 전체 명령 종료 코드 1. [파일별 대조](reports/concept-blank-pick-20261112/full-test-comparison.json)에 남겼다. **실물 프린터 검수는 대기**(`concept-blank-pick-20261112`, 루트 규칙 6)이며 완료로 표시하지 않았다. 푸시·main 병합·공유 DB 쓰기·`.env` 복사·운영 빌드 없음. 임시 기준 체크아웃과 개발 서버를 정리했고 이 미병합 작업트리는 보존했다.
