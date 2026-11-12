# 쪽 순서 리뷰 · 시험 실행 기록

2026-11-12. 각 RED는 해당 구현을 고치기 전에 실행했다. 아래는 실제 로그에서 실패 이름·판정·최종 집계를 추린 것이다. 모두 `--maxWorkers=3`을 사용했다.

## 1·4 — StudioView 재현

```text
 FAIL  src/__tests__/components/StudioView.pageOrder.test.tsx > Studio 쪽 차례 연결 > 현재 쪽을 빼고 검토를 거쳐 회전해도 뺀 쪽의 상자·인식·해설을 보존한다
AssertionError: expected "bound " to be called 1 times, but got 0 times
 FAIL  src/__tests__/components/StudioView.pageOrder.test.tsx > Studio 쪽 차례 연결 > 담은 뒤 쪽을 빼면 담은 목록·출력 배지에서 빠지고 되살리면 돌아온다
 Test Files  1 failed (1)
      Tests  2 failed | 6 passed (8)
   Start at  15:46:38
   Duration  2.25s (transform 428ms, setup 297ms, import 319ms, tests 1.39s, environment 187ms)
```

## 4 — 실제 출력 목록·저장 왕복

```text
 FAIL  src/__tests__/components/UnifiedWorkspace.cart.test.tsx > 담은 문항 장부 배선 > 쪽 제외는 실제 출력 목록에서도 빠지고, 되살리면 사용자 제거 문항을 제외한 원래 자리에 복원된다
AssertionError: expected 'a,c' to be 'c' // Object.is equality
 FAIL  src/__tests__/unit/draftStoreRemoved.test.ts > 뺀 기억은 시험지와 같이 저장된다 > 쪽 제외로 보관한 문항은 저장 왕복에도 자동 복원 이유와 원래 자리를 보존한다
AssertionError: expected { problem: { id: 'a', …(15) }, …(1) } to match object { index: +0, pageExcluded: true, …(1) }
 Test Files  2 failed (2)
      Tests  2 failed | 20 passed (22)
   Start at  15:47:02
   Duration  2.24s (transform 835ms, setup 540ms, import 356ms, tests 1.55s, environment 382ms)
```

## 3 — PDF 그림 판정

```text
 FAIL  src/__tests__/unit/studioPageAnalysis.test.ts > mixed or unknown PDF content > retains cover-like text when image paint evidence is true
 FAIL  src/__tests__/unit/studioPageAnalysis.test.ts > mixed or unknown PDF content > retains cover-like text when image paint evidence is undefined
AssertionError: expected '표지' to be undefined
 FAIL  src/__tests__/unit/studioPageAnalysis.test.ts > mixed or unknown PDF content > retains answer-key text when image paint evidence is true
 FAIL  src/__tests__/unit/studioPageAnalysis.test.ts > mixed or unknown PDF content > retains answer-key text when image paint evidence is undefined
AssertionError: expected '정답표' to be undefined
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '표지' text with PDF image questions > retains the page for paintImageXObject anywhere in the operator list
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '표지' text with PDF image questions > retains the page for paintInlineImageXObject anywhere in the operator list
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '표지' text with PDF image questions > retains the page for paintInlineImageXObjectGroup anywhere in the operator list
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '표지' text with PDF image questions > retains the page for paintImageXObjectRepeat anywhere in the operator list
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '표지' text with PDF image questions > retains the page for paintImageMaskXObject anywhere in the operator list
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '표지' text with PDF image questions > retains the page for paintImageMaskXObjectGroup anywhere in the operator list
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '표지' text with PDF image questions > retains the page for paintImageMaskXObjectRepeat anywhere in the operator list
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '표지' text with PDF image questions > retains the page for paintSolidColorImageMask anywhere in the operator list
AssertionError: expected '표지' to be undefined
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '표지' text with PDF image questions > retains the page if the operator list cannot be read
AssertionError: expected '표지' to be undefined
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '표지' text with PDF image questions > still excludes an explicit text-only page after checking the operator list
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '정답표' text with PDF image questions > still excludes an explicit text-only page after checking the operator list
AssertionError: expected "vi.fn()" to be called once, but got 0 times
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '정답표' text with PDF image questions > retains the page for paintImageXObject anywhere in the operator list
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '정답표' text with PDF image questions > retains the page for paintInlineImageXObject anywhere in the operator list
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '정답표' text with PDF image questions > retains the page for paintInlineImageXObjectGroup anywhere in the operator list
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '정답표' text with PDF image questions > retains the page for paintImageXObjectRepeat anywhere in the operator list
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '정답표' text with PDF image questions > retains the page for paintImageMaskXObject anywhere in the operator list
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '정답표' text with PDF image questions > retains the page for paintImageMaskXObjectGroup anywhere in the operator list
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '정답표' text with PDF image questions > retains the page for paintImageMaskXObjectRepeat anywhere in the operator list
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '정답표' text with PDF image questions > retains the page for paintSolidColorImageMask anywhere in the operator list
AssertionError: expected '정답표' to be undefined
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '정답표' text with PDF image questions > retains the page if the operator list cannot be read
AssertionError: expected '정답표' to be undefined
 Test Files  2 failed (2)
      Tests  24 failed | 54 passed (78)
   Start at  15:52:01
   Duration  580ms (transform 348ms, setup 528ms, import 33ms, tests 103ms, environment 372ms)
```

## 5·6 — 보관함·초점 손잡이

```text
 FAIL  src/__tests__/api/privateDocumentWorkflow.test.ts > bounded authorized workflow projection > includes the saved page-order stage in the private library list
AssertionError: expected undefined to deeply equal { source: 'extraction', step: 'order' }
 FAIL  src/__tests__/components/PrivateLibrary.test.tsx > private library board > keeps a saved page-order extraction in my working documents and resumes that stage
AssertionError: expected '내 작업 중만 (0)' to be '내 작업 중만 (1)' // Object.is equality
 FAIL  src/__tests__/components/StudioPageOrder.test.tsx > H3-B 쪽 순서 > Alt+ArrowRight moves the focused second handle instead of the previously selected first page
AssertionError: expected [ 2, 1, 3 ] to deeply equal [ 1, 3, 2 ]
 FAIL  src/__tests__/components/StudioPageOrder.test.tsx > H3-B 쪽 순서 > Alt+ArrowLeft moves the focused second handle instead of the previously selected first page
AssertionError: expected [ 1, 2, 3 ] to deeply equal [ 2, 1, 3 ]
 FAIL  src/__tests__/unit/workspaceExplicitResume.test.ts > legacy progress metadata > uses the actual saved extraction order stage
AssertionError: expected undefined to deeply equal { source: 'extraction', step: 'order' }
 Test Files  4 failed (4)
      Tests  5 failed | 83 passed (88)
   Start at  15:46:45
   Duration  2.37s (transform 1.25s, setup 1.17s, import 952ms, tests 2.00s, environment 871ms)
```

## 최종 관련 시험

```text
 Test Files  34 passed (34)
      Tests  629 passed (629)
   Start at  15:54:31
   Duration  13.49s (transform 2.48s, setup 5.75s, import 3.13s, tests 20.90s, environment 7.42s)
```

## 2 — 실패 재시도

Codex 워커가 구현 전에 아래 명령으로 RED를 확인했다.

```sh
npx vitest run src/__tests__/components/useStudioAi.test.tsx --maxWorkers=3 -t "latest active pages|no pages are active"
```

- RED: 종료 코드 1, 3실패·78건너뜀. `retryPages`와 `retry` 모두 제외된 로더까지 다시 호출하여 횟수가 기대 `[1,2]` 대신 `[2,2]`. 활성 쪽 0개에서도 로더가 1회 대신 2회 실행됨.
- GREEN: `npx vitest run src/__tests__/components/useStudioAi.test.tsx --maxWorkers=3` 종료 코드 0, 81시험 통과.

## 기타 관문

- `npm run type-check`: 종료 코드 0.
- `npm run lint:affordance`: 종료 코드 0.
- 변경한 TypeScript/TSX 22파일 ESLint: 종료 코드 0.
- `git diff --check`: 통과. 구현 커밋의 정상 pre-commit 훅(ESLint·Prettier·affordance)도 통과.
- 전체 저장소 시험은 이번 요청의 관련 시험 범위에 포함하지 않았다. 기존 보고의 전체 시험 결과를 이번 결과로 덮어쓰지 않는다.
