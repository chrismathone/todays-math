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

### 리뷰 반영

- 대상: `scratch/review/review-pick.md`의 막음 1건·고칠 것 2건. 세 건 모두 재현 시험부터 실제 RED를 확인했다. 화면은 지연 은행 3경우와 접근성 1경우가 실패(4실패·7통과), 코덱은 체크섬을 남긴 ID 변조가 `null` 대신 다른 문항으로 해독되어 실패(1실패·40통과)했다. 로컬 원기록은 `scratch/review/pick-red.log`·`codec-red.log`에 남겼다.
- **미도착 문항 보존:** `ConceptBlankView`가 미도착 소단원을 창에 전달하고, 창은 해당 범위의 기존 선택을 초기화 때 보존한다. 도착 전 적용·도착 후 적용·도착한 문항만 해제하는 세 경우 모두 나머지 선택과 인쇄/미리보기가 일치한다. 은행 도착으로 사용자의 해제를 되돌리지 않는다. 도착한 은행에서 실제로 사라진 문항은 기존 저장·인쇄 차단과 창에서 재확인 후 적용하는 절차를 유지한다.
- **압축 주소 손상 거절:** `selectionCodec.ts`가 해제한 바이트의 Adler-32를 zlib 끝의 체크섬과 직접 대조하고 다르면 `null`을 반환한다. `z1.` 형식·옛 자동/짧은 v1 주소·64KiB 해제 상한은 유지한다. ID 한 바이트 변조, 체크섬의 네 바이트 각각 손상, 끝부분 1~4바이트 잘림을 거절하며 Node zlib 압축 수준 0·1·6·9와 840문항 주소의 정상 왕복도 통과했다.
- **체크 칸 본문 설명:** 문항 본문에 창별 `useId`와 문항 키로 ID를 주고 체크 칸의 `aria-describedby`로 연결했다. 답을 펼쳐도 설명에는 본문만 포함된다. 문항 행·본문은 누르는 표면으로 바꾸지 않았다(D-30).
- **검증:** 관련 Vitest **11파일·194시험 통과**(`--maxWorkers=3`), `npm run type-check`, `npm run lint:affordance`, 변경 파일 ESLint·Prettier·`git diff --check` 통과. 기존 저장·재열기, 옛 자동 주소, 정확한 선택, 지면 코드, 인쇄 페이지, 교재 인쇄, 학년 은행 로딩, 공용 PickerDialog의 회귀를 포함한다. 이번 요청의 관련 시험 범위로 검증했으며 위 보고의 전체 시험 미통과 이력을 통과로 바꾸지 않는다. 레이아웃/CSS 변경은 없고 새 브라우저·실물 인쇄 검수는 하지 않았다.
- **실행·커밋:** 코드 수정은 `a31944734`이며 이 보고는 후속 문서 커밋에 담았다. Orca 별도 작업트리 생성은 지정 경로의 `Permission denied`로 실패하여 같은 작업트리에서 코덱 파일만 Codex 작업자가 맡고 화면 수정과 합쳤다. 푸시·main 병합·공유 DB 쓰기·운영 빌드 없이 현재 `phase/9-concept-blank-pick` 가지에 커밋했다. 미병합 작업트리는 보존한다.

```sh
npx vitest run src/__tests__/unit/conceptBlankManualPick.test.ts src/__tests__/unit/conceptBlankSelectionCodec.test.ts src/__tests__/unit/conceptBlankExactPick.test.ts src/__tests__/unit/conceptBlankSheetCode.test.ts src/__tests__/unit/conceptBlankBankLoad.test.ts src/__tests__/unit/pickerDialog.test.tsx src/__tests__/unit/textbookConcepts.test.ts src/__tests__/components/ConceptBlankPick.test.tsx src/__tests__/components/ConceptBlankView.test.tsx src/__tests__/components/PrintCheck.test.tsx src/__tests__/api/conceptBlankPrintPage.test.ts --maxWorkers=3
npm run type-check
npm run lint:affordance
```

### 2차 리뷰 반영

- 대상: `scratch/review/review-pick2.md`의 세 건. **리드의 방향 변경을 적용하여 위 1차의 창 안 미도착 선택 보존 방식을 폐기했다.** `pendingSections` 전달·보존 분기를 제거하고, 고른 소단원이 걸친 학년 은행이 모두 도착해야 고르기 창을 열도록 바꿨다. 코드 커밋은 `df15da1da`이며 이 절은 후속 문서 커밋에 담았다.
- **TDD:** 새 로딩 동작 시험 7개가 RED(7실패·8통과), 자동 형식 순서의 유효한 선택을 사용한 회귀 시험 6개가 RED(6실패)임을 수정 전에 확인했다. 이전 미도착 중 편집 시험은 새 결정의 차단 시험으로 교체했다. 원기록은 로컬 `scratch/review/pick2-loading-red.log`·`pick2-order-red.log`, 수정 후 기록은 같은 이름의 `-green.log`에 있다.
- **1번·3번 — 완전한 은행에서만 고르기:** 처음에 은행이 하나도 없거나 일부만 왔으면 «문항 고르기»를 비활성으로 보이며 바로 옆에 «은행을 불러오는 중»을 연결한다(`aria-describedby`). «직접»으로 바꾸는 경로도 창을 열지 못한다. 필요한 은행이 실패하면 «은행을 불러오지 못했습니다 · 다시 시도»를 보이고, 다시 시도는 이미 도착했거나 요청 중인 학년을 중복 요청하지 않는다. 선택하지 않고 둘러보는 학년의 로딩·실패는 고르기를 막지 않는다.
- **상한·낡은 선택 검증:** 지연을 제어한 초5·초6 각 20소단원 픽스처에서 기존 하 40문항을 유지한 빈 칸 채우기와 전체 자동 교체 목표 1문항을 확인했다. 적용 후 각각 40/1문항이며 ZodError 없이 정상 주소가 나온다. 지연 은행의 삭제·소단원 변경·난이도 변경 3경우는 모두 도착한 뒤 창을 한 번 열어 적용하면 재확인이 끝나고 저장·인쇄가 가능하다. 실패→재시도→재실패→재시도→성공에서도 선택 주소를 보존한다.
- **2번 — 자동 저장본의 형식 차례:** `draftFrom`이 `pick` 유무와 관계없이 저장된 `forms` 순서를 먼저 복원한다. C→B와 E→D→C→B→A 각각을 전부 자동으로 바꾼 뒤 주소 새로고침·저장 후 주소 새로고침·내 시험지 재열기의 6경우에서 `pick` 없음, 형식·지면·미리보기·지면 코드·주소 동일, 저장본의 «저장됨» 상태를 확인했다.
- **최종 검증:** 아래 관련 시험 **12파일·205시험 통과**(`--maxWorkers=3`), `npm run type-check`, `npm run lint:affordance`, Prettier·`git diff --check` 통과. 변경 파일 ESLint는 오류 0이며 기존 `ConceptBlankView.test.tsx`의 미사용 `docs` 경고 1개가 남는다. 1차의 체크섬·접근성 시험도 포함한다. 전체 시험은 이번에 다시 돌리지 않았으며 앞선 전체 관문 미통과 이력은 그대로다.
- **화면·작업 범위:** 실제 FormTable·Workroom 스타일을 사용하는 임시 하네스를 Orca 내장 브라우저 한 탭에서 확인했다. 대기·실패 상태 × 1440·1280·390px의 6장면에서 안내 문구의 한글 낱말 105개 중 중간 줄바꿈 0, 문서 가로 넘침 0이며 좁은 화면의 표 내부 스크롤은 유지된다. 실패→재시도 안내와 준비 후 단추 활성도 확인했다. 원자료·화면은 로컬 `scratch/review/pick2-{loading,error}-*.json`·`pick2-loading-1440.png`·`pick2-error-390.png`에 남겼다. 로딩 상태 전환은 RTL, 화면 측정은 부품 하네스 검증이며 실계정·공유 DB·실물 프린터 검수가 아니다. 임시 서버·탭·하네스를 정리했고, 푸시·main 병합·공유 DB 쓰기·`.env` 복사·운영 빌드 없이 현재 가지와 미병합 작업트리를 보존했다.

```sh
npx vitest run src/__tests__/unit/conceptBlankManualPick.test.ts src/__tests__/unit/conceptBlankSelectionCodec.test.ts src/__tests__/unit/conceptBlankExactPick.test.ts src/__tests__/unit/conceptBlankSheetCode.test.ts src/__tests__/unit/conceptBlankBankLoad.test.ts src/__tests__/unit/pickerDialog.test.tsx src/__tests__/unit/textbookConcepts.test.ts src/__tests__/components/ConceptBlankPick.test.tsx src/__tests__/components/ConceptBlankAutoOrder.test.tsx src/__tests__/components/ConceptBlankView.test.tsx src/__tests__/components/PrintCheck.test.tsx src/__tests__/api/conceptBlankPrintPage.test.ts --maxWorkers=3
npm run type-check
npm run lint:affordance
```

### 3차 리뷰 반영

- 대상: `scratch/review/review-pick3.md`의 **1·2·3번**. 코드 커밋은 `40252c3d7`이며 이 절은 후속 문서 커밋에 담았다. **4번 교차 형식 exact 순서는 지시대로 수정하지 않았다.**
- **TDD:** 문서 읽기·창 신분 회귀 7개가 모두 RED, 중복 형식·범위 밖 실패 재시도 회귀는 6개 RED·기존 순서 대조 1개 통과임을 수정 전에 확인했다. 로컬 원기록은 `scratch/review/pick3-document-red.log`·`pick3-edges-red.log`다. 수정 후 새 시험 14개를 포함한 관련 시험이 모두 통과했다.
- **1번 — 문서를 읽는 동안 차단·이전 창 무효화:** 내 시험지 열기와 주소 복원을 하나의 읽기 요청으로 관리하고, 요청 중에는 «문항 고르기»를 비활성화하여 «문서를 불러오는 중»을 연결한다. 저장·인쇄도 새 문서가 준비되어야 가능하다. 창은 **문서 id + 읽기 차례 번호**를 소유하며, 다른 문서·같은 문서 다시 열기·주소 탐색에서 즉시 닫힌다. 이전 창의 적용 콜백과 이전 요청의 늦은 응답은 신분이 다르면 무시한다. 읽기 실패 때도 차단을 유지하고 «자료 다시 불러오기» 성공 뒤 새 선택을 연다.
- **문서 회귀 검증:** 같은 학년·소단원의 서로 다른 `fx-corr`/`fx-cong-prop` 문서를 메모리 API로 읽고, 요청 지연·응답 역전·같은 id 재열기·열린 창에서 주소 변경·실패 후 재시도를 확인했다. 이전 적용 콜백을 새 문서가 도착한 뒤 직접 호출해도 새 문항이 유지되고 새 문서 id·revision으로 저장된다. `blankDoc`와 미저장 `blank`가 함께 있는 주소는 문서를 읽는 동안 차단하면서 주소의 미저장 선택을 보존한다.
- **2번 — 옛 자동 주소의 중복 형식:** `draftFrom`에서 형식의 첫 등장만 남긴다. 첫 항목의 차례·`counts`·`extras`를 모두 보존한다. B/B·C/C 주소를 직접 선택 한 문항으로 적용해도 중복 pick이나 ZodError가 발생하지 않으며, C→B의 첫 등장 순서는 직접 적용·주소 재열기에도 유지된다.
- **3번 — 표시한 실패 전부 재시도:** 재시도는 현재 펼친/선택한 학년 대신 안내에 표시한 `failed` 전체를 순회한다. 초5 선택 후 초6·중1 둘러보기가 실패하고 창을 닫은 경우, 두 실패 학년을 모두 다시 요청한다. 준비된 초5는 다시 요청하지 않고, 재실패한 초6만 다음 시도에서 요청하며 기존 선택·인쇄는 유지한다.
- **최종 검증:** 아래 관련 시험 **14파일·219시험 통과**(`--maxWorkers=3`), `npm run type-check`, `npm run lint:affordance`, 변경 4파일 ESLint(경고·오류 0)·Prettier·`git diff --check` 통과. 최종 로그는 로컬 `scratch/review/pick3-related-tests.log`·`pick3-type-check.log`·`pick3-affordance.log`·`pick3-eslint.log`다. 전체 시험은 이번에 다시 실행하지 않았으며 앞선 전체 관문 미통과 이력은 그대로다.
- **작업 범위:** 2·3번은 같은 작업트리의 Orca Codex 작업자가 재현 시험과 수정으로 맡고, 문서 전환 수정과 합쳐 검증했다. CSS·지면 구성·계약·DB 변경은 없으며 새 브라우저 측정·실물 인쇄 검수는 하지 않았다. 푸시·main 병합·공유 DB 쓰기·`.env` 복사·운영 빌드 없이 현재 가지에 커밋했고 미병합 작업트리는 보존한다.

```sh
npx vitest run src/__tests__/unit/conceptBlankManualPick.test.ts src/__tests__/unit/conceptBlankSelectionCodec.test.ts src/__tests__/unit/conceptBlankExactPick.test.ts src/__tests__/unit/conceptBlankSheetCode.test.ts src/__tests__/unit/conceptBlankBankLoad.test.ts src/__tests__/unit/pickerDialog.test.tsx src/__tests__/unit/textbookConcepts.test.ts src/__tests__/components/ConceptBlankPick.test.tsx src/__tests__/components/ConceptBlankAutoOrder.test.tsx src/__tests__/components/ConceptBlankPickDocument.test.tsx src/__tests__/components/ConceptBlankPickEdges.test.tsx src/__tests__/components/ConceptBlankView.test.tsx src/__tests__/components/PrintCheck.test.tsx src/__tests__/api/conceptBlankPrintPage.test.ts --maxWorkers=3
npm run type-check
npm run lint:affordance
```

### 4차 리뷰 반영

- 대상: `scratch/review/review-pick4.md`의 세 건. 코드 커밋은 **`70e472fa0`**이며 이 절은 후속 문서 커밋에 담았다. 리드 결정대로 읽기만 별도 무효화하던 `SelectionContext`를 걷어내고 **공통 문서 세대**로 비동기 작업의 수명을 관리한다. 3차 참고 4번의 교차 형식 exact 순서는 수정하지 않았다.
- **TDD:** 새로고침·늦은 PUT·PUT 뒤 복귀 GET의 세 원래 재현을 포함한 최초 시험은 **6실패·1통과**로 RED였다(`scratch/review/pick4-generation-red.log`). 역순 GET→PUT은 대조 시험으로 처음부터 통과했다. 독립 검토에서 찾은 «충돌 재조회 revision 3이 복귀 조회 revision 4를 되돌림»도 정식 시험에 먼저 추가하여 **1실패·14통과** RED를 확인했다(`pick4-conflict-red.log`). 두 RED의 실패 원인은 각각 혼합 주소·저장 대상 역전·남은 잠금, 이후 저장의 `expectedRevision: 3`이었다.
- **공통 문서 세대:** 새 `useDocumentGeneration`이 문서 열기·같은 문서 재열기·주소 탐색·읽기 재시도에서 세대를 올린다. 읽기, PUT 및 충돌 재조회, 탭 복귀 GET, 은행 요청은 시작 세대와 작업 표지를 쥐고 완료 시 둘 다 확인한다. 고르기 적용과 저장 확인 창도 같은 세대에 묶는다. 옛 세대의 성공·실패·완료 처리는 현재 문서 상태를 바꾸지 않는다. 이미 받은 정적 학년 은행은 재사용하되, 이전 세대에서 대기하던 응답은 버리고 필요한 은행은 새 세대의 작업으로 받는다.
- **세대별 잠금:** 읽기·저장 상태는 공용 불리언 대신 현재 세대의 미완료 작업에서 계산한다. 전환은 이전 작업 목록을 비우며, 각 작업의 완료와 effect 정리는 자기 표지만 제거한다. 이전 PUT이 끝나지 않아도 새 문서는 저장할 수 있고, 옛 실패·완료가 새 저장이나 조회의 잠금을 풀지 않는다. 탭 복귀 조회는 같은 세대에 속하므로 PUT 완료가 조회 effect를 취소하지 않는다. 중도 취소된 조회도 자기 로딩 표지를 정리한다.
- **주소의 문서 일치:** `blankDoc`와 `blank`를 하나의 effect에서 한 번의 `replaceState`로 쓴다. 다른 문서를 읽는 중에는 새 문서 id만 남기고 이전 `blank`를 제거한다. 새 선택과 필요한 은행이 준비된 뒤 같은 문서의 두 값을 함께 싣는다. 이 사이 실제 unmount/remount로 새로고침을 모사한 시험에서 문서 2 revision 7에 문서 2의 `fx-cong-prop`가 저장된다. `blankDoc`와 해당 문서의 미저장 `blank`를 함께 여는 기존 기능은 유지한다.
- **같은 세대의 응답 순서:** 읽기·PUT·복귀 GET·충돌 GET의 메타데이터는 `acceptDocument` 한 곳을 거친다. 세대가 같아도 이미 받은 동일 문서의 더 높은 revision을 낮추지 않는다. PUT→GET, GET→PUT 각각에서 GET revision 1/9를 대조했고, 복귀 GET 4 뒤 충돌 GET 3이 도착해도 다음 저장이 revision 4를 사용하도록 고쳤다. 공용 `LibrarySaveDialog`에는 선택적 확인 대상 신분을 더해 문서 전환 시 옛 확인 창을 닫고, 옛 완료 콜백이 새 확인 창을 닫지 못하게 했다. 다른 호출자는 기존 기본 동작을 유지한다.

`main` 기준 **`78eedb0ed33df573c190a1e1f9bfe22eb38ec2d8`** 대조는 Orca Codex 작업자가 `git show`로 필요한 33파일을 격리 추출하여 수행했다. 현재 제품 소스를 읽으면 실패하는 하네스와 파일 해시/원본 바이트 대조를 사용했다.

| 재현 | 기준 커밋에도 있었나 | 실행 근거와 구분 |
| --- | --- | --- |
| 1. 전환 중 새로고침의 혼합 주소 | **없음 — 새 회귀** | 문서 2 GET 대기 중 주소는 문서 1 id + 문서 1 선택을 유지했다. 새로고침 후 PUT도 문서 1 id·revision 1·내용이었다. 외부에서 혼합 주소를 직접 공급하면 미저장 편집으로 읽는 기존 메커니즘은 있지만, 전환 중 그 주소를 생성하는 결함은 없었다. |
| 2. 이전 저장의 늦은 PUT | **있음 — 기존 결함** | 기준의 내 시험지 `openDocument` 경로로 문서 2를 연 뒤 옛 PUT을 완료하면, 다음 PUT이 문서 1 id·revision 2에 문서 2 내용을 보냈다. 기준에는 `popstate` 주소 탐색과 고르기 UI가 없으므로 원문의 주소 탐색 단계를 그대로 재현했다는 뜻은 아니다. 기존 저장·열기 경로에서 같은 교차 저장을 확인했다. |
| 3. PUT과 복귀 GET 겹침의 영구 잠금 | **없음 — 새 회귀** | 기준도 PUT이 먼저 끝나면 복귀 GET은 cleanup으로 무시했다. 그러나 이 경로에 읽기 잠금을 세우지 않아 미완료 요청 0개에서 저장 활성·인쇄 링크 존재·로딩 안내 없음, 추가 저장 성공이었다. 기준에는 고르기 UI가 없어 공통 저장·인쇄 동작으로 대조했다. |

- **기준점·독립 검토 증거:** 기준 하네스는 **4통과·기존 결함 안전성 단언 1실패(exit 1)**로, 2번이 기존에도 있었음을 확인한 의도된 결과다. 세부 보고는 로컬 `scratch/review/pick4-baseline-report.md`, 원본·실행 기록·요청/주소 증거는 `pick4-baseline-harness.tar.gz`에 보존했다. 수정본 독립 검토의 3통과·1실패는 `pick4-generation-review.md`·`pick4-generation-harness.tar.gz`에 있으며, 그 한 건을 위 정식 RED→GREEN으로 반영했다. 하네스는 `scratch/rescued/`에 풀어 재실행할 수 있다. 임시 스냅샷이 타입 검사에 섞인 두 번의 실패는 하네스를 제품 밖의 검사 제외 경로로 분리하고 보관한 뒤 재검증했다. 제품 `tsconfig`는 바꾸지 않았다.
- **최종 검증:** 아래 관련 시험 **16파일·237시험 통과**(`--maxWorkers=3`), `npm run type-check`, `npm run lint:affordance`, 변경 4파일 ESLint(경고·오류 0)·Prettier·`git diff --check` 통과. 새 세대 시험 15개, 기존 문서/고르기/자동 순서/은행/코덱/인쇄와 공용 저장 확인 창 시험을 포함한다. 최종 로그는 로컬 `scratch/review/pick4-related-tests.log`·`pick4-type-check.log`·`pick4-affordance.log`·`pick4-eslint.log`다. 전체 시험은 이번에 다시 실행하지 않았으며 앞선 전체 관문 미통과 이력은 그대로다.
- **작업 범위:** 메모리 fetch와 RTL/jsdom에서 응답 시점·순서를 제어했다. 새 브라우저 측정·실물 인쇄 검수는 하지 않았다. CSS·지면 구성·저장 계약·DB 변경, 푸시·main 병합·공유 DB 쓰기·`.env` 복사·운영 빌드 없이 현재 가지에 커밋했다. 독립 작업자는 모두 보고를 마쳤고 미병합 작업트리는 보존한다.

```sh
npx vitest run src/__tests__/unit/conceptBlankManualPick.test.ts src/__tests__/unit/conceptBlankSelectionCodec.test.ts src/__tests__/unit/conceptBlankExactPick.test.ts src/__tests__/unit/conceptBlankSheetCode.test.ts src/__tests__/unit/conceptBlankBankLoad.test.ts src/__tests__/unit/pickerDialog.test.tsx src/__tests__/unit/textbookConcepts.test.ts src/__tests__/components/ConceptBlankPick.test.tsx src/__tests__/components/ConceptBlankAutoOrder.test.tsx src/__tests__/components/ConceptBlankPickDocument.test.tsx src/__tests__/components/ConceptBlankPickEdges.test.tsx src/__tests__/components/ConceptBlankDocumentGeneration.test.tsx src/__tests__/components/LibrarySaveDialog.test.tsx src/__tests__/components/ConceptBlankView.test.tsx src/__tests__/components/PrintCheck.test.tsx src/__tests__/api/conceptBlankPrintPage.test.ts --maxWorkers=3
npm run type-check
npm run lint:affordance
```

### 5차 리뷰 반영

- 대상: `scratch/review/review-pick5.md`의 홈 뒤로가기 초안 유실. 코드 커밋은 **`9f927d71e`**이며 이 절은 후속 문서 커밋에 담았다.
- **TDD:** 제품 코드 수정 전에 실제 `history.back()` 재현을 추가하여 **2실패·6통과** RED를 확인했다(`scratch/review/pick5-history-red.log`). `/`와 `/?other=1`로 뒤로 갔다 메뉴로 돌아오면 미저장 제목이 빈 문자열이 되어 실패했다. `/#library` 왕복과 개념 백지 주소 탐색 6개는 대조 시험으로 처음부터 통과했다.
- **주소 탐색 범위:** `popstate`는 `#conceptBlank` 해시, `blank` 인수, `blankDoc` 인수 중 하나가 있는 주소만 개념 백지의 새 선택으로 읽는다. 나머지 주소에서는 주소 관측값·초안·저장 문서·문서 세대를 바꾸는 처리에 들어가기 전에 반환한다. 다른 작업실 화면으로의 이동은 숨겨 둔 초안을 유지하고, 명시적 개념 백지 주소의 복원 동작은 유지한다.
- **왕복 검증:** 실제 제품 고르기 창에서 체크한 2문항을 적용하고 제목을 고친 뒤, 홈·내 시험지·일반 쿼리 주소로 `history.back()` → 메뉴의 `pushState`/화면 활성으로 돌아왔다. 세 경우 모두 미저장 직접 모드·문항 2개·제목·인쇄 선택·다시 싣는 주소가 동일하다. 별도로 `blank` 주소 두 개와 `blankDoc` 주소 두 개 사이의 실제 뒤로/앞으로를 해시 있음/없음 각각 확인했으며, 저장본은 해당 문서 id를 다시 읽는다. 인수 없는 `/#conceptBlank`로의 명시적 탐색은 빈 선택으로 열리고 앞으로 가면 이전 선택을 복원한다. 새 회귀 시험은 총 **8개**다.
- **최종 검증:** 아래 관련 시험 **17파일·245시험 통과**(`--maxWorkers=3`), `npm run type-check`, `npm run lint:affordance`, 변경 2파일 ESLint(경고·오류 0)·Prettier·`git diff --check` 통과. 최종 로그는 로컬 `scratch/review/pick5-related-tests.log`·`pick5-type-check.log`·`pick5-affordance.log`·`pick5-eslint.log`다. 전체 시험은 이번에 다시 실행하지 않았으며 앞선 전체 관문 미통과 이력은 그대로다.
- **검증 범위:** RTL/jsdom의 실제 history 이벤트와 제품 View를 유지하는 숨김/활성 호스트, 저장본의 메모리 fetch로 검증했다. 작업실 전체 브라우저·실계정·실물 인쇄 검수는 하지 않았다. CSS·저장 계약·DB와 3차 참고 4번은 수정하지 않았다. 푸시·main 병합·공유 DB 쓰기·`.env` 복사·운영 빌드 없이 현재 가지에 커밋하고 미병합 작업트리는 보존한다.

```sh
npx vitest run src/__tests__/unit/conceptBlankManualPick.test.ts src/__tests__/unit/conceptBlankSelectionCodec.test.ts src/__tests__/unit/conceptBlankExactPick.test.ts src/__tests__/unit/conceptBlankSheetCode.test.ts src/__tests__/unit/conceptBlankBankLoad.test.ts src/__tests__/unit/pickerDialog.test.tsx src/__tests__/unit/textbookConcepts.test.ts src/__tests__/components/ConceptBlankPick.test.tsx src/__tests__/components/ConceptBlankAutoOrder.test.tsx src/__tests__/components/ConceptBlankPickDocument.test.tsx src/__tests__/components/ConceptBlankPickEdges.test.tsx src/__tests__/components/ConceptBlankDocumentGeneration.test.tsx src/__tests__/components/ConceptBlankHistory.test.tsx src/__tests__/components/LibrarySaveDialog.test.tsx src/__tests__/components/ConceptBlankView.test.tsx src/__tests__/components/PrintCheck.test.tsx src/__tests__/api/conceptBlankPrintPage.test.ts --maxWorkers=3
npm run type-check
npm run lint:affordance
```
