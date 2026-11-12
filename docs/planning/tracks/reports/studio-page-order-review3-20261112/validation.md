# 쪽 순서 3차 리뷰 검증

2026-11-12 · `phase/9-studio-page-order` · 구현 `b0b03f836`.

대상은 `scratch/review/review-order3.md`의 세 건과 리드의 빈 쪽 전용 결정이다. 모든 Vitest 실행은 `--maxWorkers=3`. 워커는 각 범위 구현 전에 재현을 RED로 실행했고, PDF 워커는 실제 StudioView의 대기 재현 RED가 저장될 때까지 구현을 보류했다.

## TDD 관측

| 범위 | 시험 파일 | 구현 전 RED | 수정 후 |
|---|---|---|---|
| 표시·복원 자리 | `unit/studioCart.test.ts`, `components/StudioView.cart.test.tsx` | 새 재현 4개 실패, 기존 39개 선택 제외 | 두 파일 전체 43개 통과 |
| 빈 쪽·대기 제거·남은 대기 제한 | `unit/studioPageAnalysis.test.ts`, `unit/studioPagePreview.test.ts` | 34 실패 / 9 통과 | 43개 통과 |
| 문구·저장 호환·화면 대기 | `unit/studioPageOrder.test.ts`, `components/StudioPageOrder.test.tsx`, `components/StudioView.pageOrder.test.tsx` | 5 실패 / 65 통과 | 워커의 UI·모델 57개 통과 후, 조정자의 아래 결합 검증에 세 파일 모두 포함해 통과 |

PDF RED 34건에는 새로운 잉크 전용 입력 계약을 옛 함수가 처리하지 못한 `textLines` 오류도 포함한다. 모든 34건을 선 벡터 거짓 제외 재현으로 세지 않는다. 직접 관측한 동작 실패는 사용하지 않아야 할 PDF API 호출, 흰 렌더의 빈 쪽 판정 누락, 252·254 픽셀 누락, 응답 없는 텍스트 API 뒤 미완료, getPage/render 취소·시간 제한 미완료다. 실제 화면 대기와 표시 자리의 RED도 별도로 확보했다.

### 구현 전 로그 발췌

**표시 자리** · `/tmp/studio-order3-cart-red.log`

```text
 FAIL  src/__tests__/components/StudioView.cart.test.tsx > 작업실 «담음»은 시험지 목록 하나에서 나온다 > 3차 재현: B쪽 제외·C 직접 빼기 뒤 B를 되살리면 C의 뺀 줄과 다시 담는 자리가 같다
AssertionError: expected [ [ 'A', 'false', '01' ], …(2) ] to deeply equal [ [ 'A', 'false', '01' ], …(2) ]
 FAIL  src/__tests__/unit/studioCart.test.ts > 쪽 제외와 담은 문항 보존 > 3차 재현: B쪽 제외·C 직접 빼기·B 되살리기 뒤 C의 표시와 복원 자리가 같다
AssertionError: expected [ [ 'A', false, 1 ], …(2) ] to deeply equal [ [ 'A', false, 1 ], …(2) ]
 FAIL  src/__tests__/unit/studioCart.test.ts > studioCartRows — 목록 줄 > 연속·반복 직접 빼기는 빠진 이웃을 따라 표시하고 담긴 문항의 차례와 번호를 보존한다
AssertionError: expected [ [ 'd', false, 1 ], …(3) ] to deeply equal [ [ 'd', false, 1 ], …(3) ]
 FAIL  src/__tests__/unit/studioCart.test.ts > studioCartRows — 목록 줄 > 맨 앞 이웃과 이미 담긴 문항의 뺀 기억도 복원과 같은 규칙으로 처리한다
AssertionError: expected [ [ 'b', false, 1 ], …(2) ] to deeply equal [ [ 'a', true, null ], …(2) ]
 Test Files  2 failed (2)
      Tests  4 failed | 39 skipped (43)
```

**PDF 판정·대기** · `/tmp/studio-order3-pdf-red.log`

```text
AssertionError: expected +0 to be 0.0001 // Object.is equality
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > raster-only automatic exclusion > retains a nonblank 'cover'
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > raster-only automatic exclusion > retains a nonblank 'answer key'
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > raster-only automatic exclusion > retains a 'cover' with stroke-only vector questions
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > raster-only automatic exclusion > retains a 'answer key' with stroke-only vector questions
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > raster-only automatic exclusion > excludes rendered white pixels regardless of extractable metadata
AssertionError: expected undefined to be '빈 쪽' // Object.is equality
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > raster-only automatic exclusion > retains faint rendered ink
AssertionError: expected +0 to be 1 // Object.is equality
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > raster-only automatic exclusion > completes promptly without calling never-settling text APIs
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > raster-only automatic exclusion > completes promptly without calling never-settling both APIs
AssertionError: expected "vi.fn()" to be called once, but got 0 times
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > raster-only automatic exclusion > completes promptly without calling never-settling operators APIs
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > raster-only automatic exclusion > uses the same raster rule for an image with channel 254
AssertionError: expected '빈 쪽' to be undefined // Object.is equality
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > bounded PDF preview waits > aborts a never-settling getPage without destroying the shared PDF, ignoring late resolve
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > bounded PDF preview waits > aborts a never-settling getPage without destroying the shared PDF, ignoring late reject
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > bounded PDF preview waits > timeouts a never-settling getPage without destroying the shared PDF, ignoring late resolve
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > bounded PDF preview waits > timeouts a never-settling getPage without destroying the shared PDF, ignoring late reject
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > bounded PDF preview waits > aborts a never-settling render without destroying the shared PDF, ignoring late resolve
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > bounded PDF preview waits > aborts a never-settling render without destroying the shared PDF, ignoring late reject
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > bounded PDF preview waits > timeouts a never-settling render without destroying the shared PDF, ignoring late resolve
 Test Files  2 failed (2)
      Tests  34 failed | 9 passed (43)
```

**문구·실제 화면 대기** · `scratch/review/order3-ui-evidence/red.log`

```text
 FAIL  src/__tests__/components/StudioPageOrder.test.tsx > H3-B 쪽 순서 > 파일 딱지·활성 수·원본 신분을 표시하며 이전 작업에서 뺀 쪽을 제자리에 남긴다
 FAIL  src/__tests__/components/StudioPageOrder.test.tsx > H3-B 쪽 순서 > 저장된 표지 제외는 이전 작업으로 알리고 새 판정 근거를 주장하지 않는다
 FAIL  src/__tests__/components/StudioPageOrder.test.tsx > H3-B 쪽 순서 > 저장된 정답표 제외는 이전 작업으로 알리고 새 판정 근거를 주장하지 않는다
 FAIL  src/__tests__/components/StudioPageOrder.test.tsx > H3-B 쪽 순서 > 새 자동 제외의 빈 쪽 표시와 이전 작업의 제외를 구분하며 되살린 쪽에는 안내를 남기지 않는다
 FAIL  src/__tests__/components/StudioView.pageOrder.test.tsx > Studio 쪽 차례 연결 > 텍스트·연산 목록 응답이 영원히 없어도 두 API를 부르지 않고 렌더의 빈 쪽만 빼고 즉시 조작·시작을 연다
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
 Test Files  2 failed | 1 passed (3)
      Tests  5 failed | 65 passed (70)
```

## 最終 검증

```sh
npx vitest run StudioView UnifiedWorkspace useStudioAi StudioBulkSolution StudioPageOrder studioPageAnalysis studioPagePreview studioPageOrder studioCart draftStore workspaceDraftStore workspaceExplicitResume studioExplicitResume privateWorkspacePersistence privateDocumentWorkflow PrivateLibrary StudioQueueStatus StudioStepBar PaperStrip --maxWorkers=3
```

```text
RUN  v4.1.11 /Volumes/새 볼륨/today-worktrees/studio-page-order


 Test Files  34 passed (34)
      Tests  609 passed (609)
   Start at  17:01:11
   Duration  13.75s (transform 2.73s, setup 5.76s, import 3.50s, tests 22.05s, environment 7.19s)
```

- `npm run type-check` → 최종 종료 코드 0. 최초 실행에서 임시 `scratch/review/verify-order3-pages.ts`의 부분 PDF 대역을 전체 타입으로 단언한 곳 한 군데가 TS2352였고, 대역임을 명시한 뒤 재실행해 통과했다.
- `npm run lint:affordance` → 종료 코드 0.
- 변경 TS/TSX 12파일 `npx eslint` → 종료 코드 0.
- `git diff --check` → 종료 코드 0.
- 정상 커밋 훅의 ESLint `--fix`·Prettier·affordance → 모두 통과, 검사 우회 없음.
- 최종 609개는 삭제한 표지·정답표·연산 목록 기능 시험을 새 계약 시험으로 대체한 결과다. 2차의 687개 중 일부를 실행하지 않고 통과로 친 것이 아니다. 전체 저장소 Vitest는 이번에 실행하지 않았다.

## 실제 PDF

`npx tsx scratch/review/verify-order3-pages.ts` → 종료 코드 0. [측정 JSON](pages-verification.json).

기존 표지·정답표에 SVG 글자 윤곽으로 된 `1. 2 + 3 = ?`, `2. 6 - 2 = ?`를 넣었다. 채운 경로와 선 경로를 별도로 만들고 선 경로는 실제 PDF.js 목록에서 stroke 14개·fill 0개인지 확인했다. 래스터 문항, 흰 쪽·희미한 선·한 줄 문항, 시연 스캔 8쪽까지 모두 20쪽이다. 제품에는 getTextContent/getOperatorList가 영원히 응답하지 않는 페이지 대역을 넘겼고, 제품의 해당 API 호출은 20쪽 모두 0회다. 연산 계측은 제품 실행 밖의 검증 코드에서만 했다.

Node의 PDF.js legacy 로더와 `@napi-rs/canvas`가 제품 `renderStudioPagePreview`를 호출했다. 20쪽 중 완전히 흰 1쪽만 `빈 쪽`, 나머지 19쪽은 유지됐다. 표본의 일반 텍스트 쪽은 이전 합성본의 Type3 글꼴을 유지하지만, 이번 제품 판정은 글꼴·텍스트·연산 정보를 전혀 사용하지 않는다. 이는 새 브라우저 시각 검수나 운영 성능 수치가 아니다. PDF와 스크립트는 무시되는 scratch에만 두고 측정 JSON을 보존했다.

## 확정한 경계

- 새 `StudioAutoOut`은 `빈 쪽`만. 저장용 쪽 모델은 옛 표지·정답표 값을 계속 읽고 그대로 저장한다. 복원된 작업과 사용자가 되살린 쪽에 새 미리보기 판정을 덮지 않는다.
- 흰 바탕에 합성한 RGB 중 하나라도 255 미만이면 잉크다. 잉크 비율이 정확히 0일 때만 빈 쪽이다. 노이즈·비백색 종이 바탕은 남는다.
- 텍스트 정규식·정규화·답표 검사·PDF 텍스트 줄 분리·operator 검사·그 검사 전용 타이머·런타임 pdfjs import를 제거했다.
- 표시와 복원은 같은 이웃 재구성 함수. 새 제거 기록은 previousId, 옛 기록은 숫자 위치 대체 경로. 담긴 줄의 순서와 번호를 유지한다.
- 남은 페이지 로드와 렌더는 각각 10초까지 기다린다. 이미 abort된 요청은 시작하지 않고, 진행 중 abort는 즉시 종료한다. 렌더만 cancel하며 공유 PDF를 destroy하지 않는다. 9,999ms/10,000ms 경계, late resolve/reject, 정상/실패 뒤 타이머·리스너 정리를 시험했다. 파일 전체 시간 제한으로 해석하지 않는다.
