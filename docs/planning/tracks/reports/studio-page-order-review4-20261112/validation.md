# 쪽 순서 4차 리뷰 검증

2026-11-12 · `phase/9-studio-page-order` · 구현 `e781225ed`.

대상: `scratch/review/review-order4.md`의 거짓 빈 쪽 제외와 실패 미리보기 재시도. 작은 그림만 흰 경우를 최종 판정으로 쓰지 않는다. 모든 Vitest 실행은 `--maxWorkers=3`을 사용했다.

## 재현 먼저 RED

| 범위 | 실제 RED | 최종 GREEN |
|---|---|---|
| `studioPageAnalysis`·`studioPagePreview` | 54 실패 / 25 통과. A의 작은 글자, B의 높은 해상도 잉크, 확인 전 빈 쪽 판정, 단계별 실패·취소·누적 시간 제한 | 추가 경계 시험을 포함해 86 통과 |
| 실제 `StudioView` 실패 재시도 | 새 재현 5 실패 / 기존 14 선택 제외. 재진입 호출 2회 대신 3회가 필요하고 카드·aside·디코딩 오류의 재시도 단추가 없음 | 관련 화면 두 파일 55 통과 |
| 실행 영역이 다른 DOMException | 1 실패 / 85 통과. AbortError인데 성공 미리보기로 resolve | 오류 이름으로 취소를 전파한 뒤 86 통과 |
| 실제 PDF A·B | 제품 함수에서 두 쪽 모두 잉크 0 → `빈 쪽`, 실행 종료 코드 1 | A는 텍스트, B는 배율 2.5로 유지, 흰 대조군만 제외. 실행 종료 코드 0 |

실제 PDF의 RED는 구현 전 기존 `renderStudioPagePreview`로 확인했다. Node 로더에 설치된 표준 글꼴 경로와 WASM 경로를 연결한 결과를 보존했다. 초기 검증 스크립트의 경로 변수 이름 충돌은 바로 고쳤으며 스크립트 실행 오류를 제품 RED로 세지 않았다.

### 단위·화면 RED 발췌

**후보 검증** (`/tmp/studio-order4-pdf-red.log`)

```text
 FAIL  src/__tests__/unit/studioPageAnalysis.test.ts > confirmed blank pages only > treats a white thumbnail as a candidate, not proof of blankness
AssertionError: expected '빈 쪽' to be undefined
AssertionError: expected '빈 쪽' to be undefined
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > blank-candidate confirmation > A: keeps a white thumbnail with extracted 0.1pt Helvetica text
AssertionError: expected '빈 쪽' to be undefined
AssertionError: expected '빈 쪽' to be undefined
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > blank-candidate confirmation > B: keeps a white thumbnail when high-resolution raster has one #fefefe pixel
AssertionError: expected '빈 쪽' to be undefined
AssertionError: expected "vi.fn()" to be called once, but got 0 times
AssertionError: expected undefined to deeply equal Any<String>
AssertionError: expected undefined to deeply equal Any<String>
AssertionError: expected undefined to deeply equal Any<String>
AssertionError: expected '빈 쪽' to be undefined // Object.is equality
AssertionError: expected '빈 쪽' to be undefined
AssertionError: expected undefined to deeply equal Any<String>
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > one 3000ms preview deadline and cancellation > abort during getPage ignores late resolve and releases owned resources
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > one 3000ms preview deadline and cancellation > abort during getPage ignores late reject and releases owned resources
AssertionError: expected 300 to be +0 // Object.is equality
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > one 3000ms preview deadline and cancellation > timeout during getPage ignores late resolve and releases owned resources
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > one 3000ms preview deadline and cancellation > timeout during getPage ignores late reject and releases owned resources
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > one 3000ms preview deadline and cancellation > timeout during thumbnail ignores late resolve and releases owned resources
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > one 3000ms preview deadline and cancellation > timeout during thumbnail ignores late reject and releases owned resources
 Test Files  2 failed (2)
      Tests  54 failed | 25 passed (79)
```

**재시도** (`/tmp/studio-order4-retry-red.log`)

```text
 FAIL  src/__tests__/components/StudioView.pageOrder.test.tsx > Studio 쪽 차례 연결 > 시간 초과 뒤 재진입하면 실패한 쪽만 다시 읽고 성공한 미리보기는 캐시에 남긴다
AssertionError: expected "renderStudioPagePreview" to be called 3 times, but got 2 times
 FAIL  src/__tests__/components/StudioView.pageOrder.test.tsx > Studio 쪽 차례 연결 > card의 다시 시도는 같은 쪽 번호의 다른 파일 대신 정확한 원본·회전을 회복하고 중복 호출을 막는다
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name `/다시 시도/`
 FAIL  src/__tests__/components/StudioView.pageOrder.test.tsx > Studio 쪽 차례 연결 > aside의 다시 시도는 같은 쪽 번호의 다른 파일 대신 정확한 원본·회전을 회복하고 중복 호출을 막는다
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name `/다시 시도/`
 FAIL  src/__tests__/components/StudioView.pageOrder.test.tsx > Studio 쪽 차례 연결 > 실패가 계속되어도 저절로 반복하지 않고 클릭 한 번에 한 번만 재시도한다
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name `/다시 시도/`
 FAIL  src/__tests__/components/StudioView.pageOrder.test.tsx > Studio 쪽 차례 연결 > 이미지 디코딩 실패도 다시 시도하며 같은 URL의 새 결과를 다시 보여 준다
TestingLibraryElementError: Unable to find an accessible element with the role "button" and name `/다시 시도/`
 Test Files  1 failed (1)
      Tests  5 failed | 14 skipped (19)
```

**DOMException** (`/tmp/studio-order4-pdf-abort-red.log`)

```text
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > one 3000ms preview deadline and cancellation > propagates a render AbortError rather than accepting a stale thumbnail
AssertionError: promise resolved "{ …(3) }" instead of rejecting
 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 85 passed (86)
```

## 배율·문턱

- [calibration.json](calibration.json): A·B·흰 대조군·시연 8쪽의 원본 해시, 글자·이미지 구성, 텍스트 추출, 해상도별 픽셀 수, 측정 실행 환경.
- [confirmation-policy.json](confirmation-policy.json): 최종 제품 정책. PDF 배율은 `max(2.5, thumbnailScale)`, 이미지는 native 픽셀 크기. 흰 바탕 합성 후 RGB 어느 채널이든 255 미만인 픽셀 **1개 이상이면 유지**한다.
- B의 원본866픽셀 → PDF 작은 그림0픽셀, 배율2에서는1픽셀·2.5에서는295픽셀. 워커는 지정 A/B를 만족하는 최소값2를 제안했고, 조정자는 더 많은 잉크가 드러나는 측정값2.5를 선택했다. calibration의 권고값2와 제품값2.5를 혼동하지 않는다.
- A의 추출 문장 `1. 2 + 3 = ?`는 작은 그림에 잉크가 없어도 페이지 보존 근거다. 글자가 있으면 높은 해상도 렌더를 생략한다.
- B의 배율4 결과731은 리뷰의725와 약간 다르다. 리뷰에 없는 글자 위치를 (100,200)/(100,300)으로 고정했고 원본866·작은 그림0 재현은 동일하다.
- 텍스트 읽기나 픽셀 확인이 실패하면 자동 제외를 하지 않는다. 큰 캔버스를 낮은 해상도로 대체해서 빈 쪽으로 판단하지 않으며, 3200만 픽셀 초과는 미확인 오류로 남긴다.

## 실제 제품 함수 RED → GREEN

`npx tsx scratch/review/order4-product-verification.mts`의 [수정 전 결과](product-red.json)와 [수정 후 결과](product-green.json)를 비교했다. PDF11쪽(A·B·흰 대조군·시연8쪽)과 원본 이미지B1개를 호출했다. 완전히 흰 대조군만 제외되며, A는 텍스트1회와 작은 렌더1회, B는 텍스트1회와 작은 렌더+배율2.5 확인 렌더가 기록됐다. 시연8쪽은 작은 그림에 잉크가 있으므로 텍스트·확인 렌더 호출이 없다. 연산 목록 API는 전부0회다. 독립 이미지B는 작은 그림에71픽셀이 남아 후보 검증 없이 보존된다.

측정은 Node의 PDF.js legacy·@napi-rs/canvas 환경이다. JSON의 elapsed 값은 브라우저 지연 보장이 아니다. 원본 PDF·PNG와 생성/검증 스크립트는 무시되는 scratch에만 두고 JSON과 명시한 입력 구성·정책을 이 보고에 보존했다.

## 결합 검증

```sh
npx vitest run StudioView UnifiedWorkspace useStudioAi StudioBulkSolution StudioPageOrder studioPageAnalysis studioPagePreview studioPageOrder studioCart draftStore workspaceDraftStore workspaceExplicitResume studioExplicitResume privateWorkspacePersistence privateDocumentWorkflow PrivateLibrary StudioQueueStatus StudioStepBar PaperStrip --maxWorkers=3
```

```text
RUN  v4.1.11 /Volumes/새 볼륨/today-worktrees/studio-page-order


 Test Files  34 passed (34)
      Tests  662 passed (662)
   Start at  17:40:46
   Duration  13.20s (transform 2.46s, setup 5.30s, import 3.15s, tests 21.87s, environment 6.70s)
```

- `npm run type-check` → 종료 코드0. 프로젝트 명령의 8GB 설정을 사용했다.
- `npm run lint:affordance` → 종료 코드0.
- 변경 TS/TSX9파일 ESLint → 종료 코드0.
- `git diff --check` → 종료 코드0.
- 정상 커밋 훅의 ESLint·Prettier·affordance 통과, 우회 없음.

첫 결합 실행은 661통과/1실패였다. 기존 장부 시험이 재진입 직후 아직 다시 불러오는 중인 되살리기 단추를 눌렀기 때문이다. 실패 캐시를 없앤 새 동작에 맞춰 단추가 활성화되기를 기다리게 했고, 같은 차례·복원 단언을 유지했다. 첫 프로젝트 type-check의 TS2349 오류는 새 테스트의 넓게 잡힌 vi.fn 타입이었으며 픽셀 읽기 함수 서명을 명시해 고쳤다. 워커가 별도로 실행한 기본4GB raw tsc는 메모리 부족으로 끝났고 검증 성공으로 세지 않았다. 최종 두 명령은 모두 통과했다.

## 완료한 경계

- 하나의 3000ms 시계로 getPage·작은 렌더·텍스트·확인 렌더·픽셀 읽기·인코딩을 제한한다. 동기 연산은 선점하지 못하므로 그 직후 시간 확인으로 한도를 넘긴 판정을 버린다. 파일 전체 제한은 아니다.
- 작은 그림 생성 후 검증 실패는 URL+error, autoOut 없음. 사용자 취소는 AbortError를 전파하며 지난 화면의 요청 결과를 반영하지 않는다. 임시 캔버스·타이머·리스너 정리와 늦은 성공/실패 소비를 시험했다.
- URL이 있고 error가 없는 성공만 캐시한다. 실패한 페이지만 재진입·명시적 단추로 다시 읽고, 성공한 다른 쪽은 그대로 쓴다. 오류를 자동 반복하지 않는다.
- 카드와 오른쪽 칸 모두 버튼만 클릭 표면으로 사용한다. 원본·쪽·현재 회전으로 요청하고, 중복 클릭과 취소된 이전 요청이 새 결과를 덮는 것을 막는다. 같은 URL의 새 결과도 디코딩을 다시 시도한다.
- 기존 제외·되살리기·출력·장부 차례·옛 저장값 호환 시험을 함께 통과했다.
- 전체 저장소 Vitest, 새 브라우저 시각 검수, 실제 공유 DB 왕복, 운영 빌드는 수행하지 않았다. 푸시·main 병합·시연 녹화본 변경도 없다.
