# 쪽 순서 2차 리뷰 검증

2026-11-12 · `phase/9-studio-page-order` · 구현 `54c5e6aec`.

리뷰 `scratch/review/review-order2.md`의 1·2·4·5를 재현 시험부터 작성해 수정했다. 3은 리드 결정대로 참고·조사만 수행했다. 아래 출력은 실제 실행 로그에서 뽑은 것이며 모든 Vitest 명령에 `--maxWorkers=3`을 사용했다. RED는 각 수정 전에 관측했다.

## RED → GREEN

| 실행 | 명령의 `vitest run` 뒤 인수 | RED 관측 |
|---|---|---|
| 차례 A·B | `src/__tests__/unit/studioCart.test.ts src/__tests__/components/UnifiedWorkspace.cart.test.tsx --maxWorkers=3` | 4 실패 / 33 통과. 순수 함수와 실제 훅을 연결한 장부 둘 다 잘못된 차례 |
| 원본 복원 | `src/__tests__/components/StudioView.pageOrder.test.tsx --maxWorkers=3` | 1 실패 / 11 통과. 제외 뒤 `[c1,c2]`가 남음 |
| 이웃 신분 저장 | `src/__tests__/unit/draftStoreRemoved.test.ts --maxWorkers=3` | 1 실패 / 7 통과. 저장 왕복에서 `previousId` 소실 |
| 칠하기·대기 제한 | `src/__tests__/unit/studioPageAnalysis.test.ts src/__tests__/unit/studioPagePreview.test.ts --maxWorkers=3` | 41 실패 / 85 통과. 칠하기를 제외하고 timeout·abort 뒤에도 미완료 |
| 추가 Type3·빈 렌더 방어 | 위의 PDF 시험 두 파일 | 4 실패 / 126 통과. Type3 본문 또는 알려진 칠하기가 있는 빈 렌더를 제외 |

PDF 두 파일 최종은 130시험 통과. 원본 복원·차례·저장과 3초 뒤 실제 화면 조작 가능 시험을 포함한 최종 관련 시험은 아래 687시험에 포함한다.

### RED 발췌

**차례 A·B** (`/tmp/studio-order2-cart-red.log`)

```text
 FAIL  src/__tests__/components/UnifiedWorkspace.cart.test.tsx > 담은 문항 장부 배선 > 2차 재현 A: 실제 장부와 훅에서 B 제외·A 직접 빼기 뒤 B와 A를 원래 차례로 되살린다
AssertionError: expected 'c,b' to be 'b,c' // Object.is equality
 FAIL  src/__tests__/components/UnifiedWorkspace.cart.test.tsx > 담은 문항 장부 배선 > 2차 재현 B: 실제 장부와 훅에서 B 제외·모두 빼기·되돌리기 뒤 B를 원래 차례로 되살린다
AssertionError: expected 'b,a,c' to be 'a,b,c' // Object.is equality
 FAIL  src/__tests__/unit/studioCart.test.ts > 쪽 제외와 담은 문항 보존 > 2차 재현 A: B쪽 제외 후 A를 직접 빼도 B 되살리기는 C 앞으로 간다
AssertionError: expected [ 'C', 'B' ] to deeply equal [ 'B', 'C' ]
 FAIL  src/__tests__/unit/studioCart.test.ts > 쪽 제외와 담은 문항 보존 > 2차 재현 B: B쪽 제외·모두 빼기·실행 취소 뒤 B 되살리기는 A와 C 사이로 간다
AssertionError: expected [ 'B', 'A', 'C' ] to deeply equal [ 'A', 'B', 'C' ]
 Test Files  2 failed (2)
      Tests  4 failed | 33 passed (37)
```

**원본 복원** (`/tmp/studio-order2-restore-red.log`)

```text
 FAIL  src/__tests__/components/StudioView.pageOrder.test.tsx > Studio 쪽 차례 연결 > 2차 원본 복원: 같은 옛 쪽에서 각각 새 원본이 된 담은 문항도 제외·출력·되살리기가 연결된다
Error: expect(element).toHaveTextContent()

Expected element to have text content:
  /^c2$/
Received:
  c1,c2
 ❯ src/__tests__/components/StudioView.pageOrder.test.tsx:225:48
    223|     await excludeFirstWorkedPage();
    224|     fireEvent.click(screen.getByRole("button", { name: /2 문항 검토/ }));
    225|     expect(screen.getByLabelText("복원 시험지 목록")).toHaveTextContent(/^c2$…
       |                                                ^
    226|     fireEvent.click(screen.getByRole("button", { name: /3 양식 구성/ }));
    227|     expect(output).toHaveBeenLastCalledWith(["c2"]);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯

 Test Files  1 failed (1)
      Tests  1 failed | 11 passed (12)
```

**이웃 저장** (`/tmp/studio-order2-storage-red.log`)

```text
 FAIL  src/__tests__/unit/draftStoreRemoved.test.ts > 뺀 기억은 시험지와 같이 저장된다 > 쪽 제외로 보관한 문항은 저장 왕복에도 자동 복원 이유와 원래 자리를 보존한다
AssertionError: expected { problem: { id: 'a', …(15) }, …(2) } to match object { index: +0, pageExcluded: true, …(2) }
 Test Files  1 failed (1)
      Tests  1 failed | 7 passed (8)
```

**칠하기·시간 제한·취소** (`/tmp/studio-page-order2-red.log`)

```text
 FAIL  src/__tests__/unit/studioPageAnalysis.test.ts > mixed or unknown PDF content > retains cover and answer-key candidates when vector fill evidence is true
 FAIL  src/__tests__/unit/studioPageAnalysis.test.ts > mixed or unknown PDF content > retains cover and answer-key candidates when vector fill evidence is undefined
AssertionError: expected '표지' to be undefined
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '표지' text with vector questions > retains 'fill' paints, constructPath=false
AssertionError: fill, constructPath=false: expected '표지' to be undefined
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > bounded operator inspection > returns a '표지' candidate after 3 seconds and ignores late operators
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > bounded operator inspection > returns a '정답표' candidate after 3 seconds and ignores late operators
AssertionError: expected "vi.fn()" to be called once, but got 0 times
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > bounded operator inspection > does not auto-exclude a white page after operator timeout or leak a late rejection
AssertionError: expected "vi.fn()" to be called once, but got 0 times
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > bounded operator inspection > aborts an in-flight operator wait promptly and ignores late resolve
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > bounded operator inspection > aborts an in-flight operator wait promptly and ignores late reject
AssertionError: expected "vi.fn()" to be called once, but got 0 times
 Test Files  2 failed (2)
      Tests  41 failed | 85 passed (126)
```

**Type3·빈 렌더 추가** (`/tmp/studio-page-order2-red-glyph.log`)

```text
 FAIL  src/__tests__/unit/studioPageAnalysis.test.ts > mixed or unknown PDF content > retains any known vector fill even when the raster reports no ink
AssertionError: expected '빈 쪽' to be undefined
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '표지' text with vector questions > keeps Type3 vector glyphs whose paints live outside the page operator list
AssertionError: expected '표지' to be undefined
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > '정답표' text with vector questions > keeps Type3 vector glyphs whose paints live outside the page operator list
AssertionError: expected '정답표' to be undefined
 FAIL  src/__tests__/unit/studioPagePreview.test.ts > retains a filled vector-only page even when raster measurements are blank
AssertionError: expected '빈 쪽' to be undefined
 Test Files  2 failed (2)
      Tests  4 failed | 126 passed (130)
```

## 최종 검증

```sh
npx vitest run StudioView UnifiedWorkspace useStudioAi StudioBulkSolution StudioPageOrder studioPageAnalysis studioPagePreview studioPageOrder studioCart draftStore workspaceDraftStore workspaceExplicitResume studioExplicitResume privateWorkspacePersistence privateDocumentWorkflow PrivateLibrary StudioQueueStatus StudioStepBar PaperStrip --maxWorkers=3
```

```text
RUN  v4.1.11 /Volumes/새 볼륨/today-worktrees/studio-page-order


 Test Files  34 passed (34)
      Tests  687 passed (687)
   Start at  16:26:41
   Duration  13.28s (transform 2.60s, setup 5.57s, import 3.35s, tests 20.64s, environment 7.17s)
```

- `npm run type-check` → 종료 코드 0.
- `npm run lint:affordance` → 종료 코드 0.
- 변경 TS/TSX 12파일의 `npx eslint` → 종료 코드 0.
- `git diff --check` → 종료 코드 0.
- 구현 커밋의 정상 훅: ESLint `--fix`, Prettier, affordance 모두 통과. 검사 우회 없음.
- 실제 PDF.js 렌더 검증 → 종료 코드 0. [JSON](vector-pages-verification.json)의 벡터 문항은 SVG 글자를 경로로 변환해 PDF에 검정 fill로 넣었고, 각 쪽에 실제 칠하기가 1개 이상인지도 검사했다. 페이지당 14개가 관측됐다. 표본 전체의 Type3 프로그램 11·19개는 별도 영역이므로 칠하기 부재로 간주하지 않았다.
- 이번 회차 전체 Vitest·브라우저 시각 검수·운영 성능·실제 공유 DB 왕복은 실행하지 않았다. 앞 보고의 전체 시험 실패를 이 결과로 덮지 않는다.

## 배포 판 변경 알림 조사

`src`, `public`, `next.config.ts`에서 deployment/build identity, service worker 등록, ChunkLoadError, version/refresh와 한국어 새 버전·새로 고침 문구를 검색하고 아래 실제 연결을 읽었다. 배포 판을 주기적으로 조회하거나, 열린 탭에 배포 변경을 알려 새로 고침을 권하는 자체 기능은 찾지 못했다. 지시대로 새로 구현하지 않았다.

| 읽은 곳 | 확인한 동작 |
|---|---|
| `src/app/layout.tsx`, `src/components/errorLog/ClientErrorLog.tsx` | 루트 오류 수집 설치. 알림 UI 없음 |
| `src/lib/errorLog/clientReporter.ts:281`, `src/app/api/logs/client/route.ts` | `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`를 오류의 release로 전달·기록. 배포 판 비교 없음 |
| `src/components/unified/useWorkspaceAccess.ts:14`, `:59`, `:120` | 30초·focus·visibility 때 `/api/account/access`로 권한 재조회. 배포 판 없음 |
| `src/components/unified/UnifiedWorkspace.tsx` | 내부 화면 전환은 로컬 상태와 hash/history도 사용. 계속 편집한다고 RSC 탐색이 항상 생기지는 않음 |
| `src/app/error.tsx`, `src/components/ui/RouteRecovery.tsx` | 일반 오류의 다시 시도·홈 이동. 배포 알림 아님 |
| 설치된 Next 16.3.8의 `node_modules/next/dist/client/components/router-reducer/fetch-server-response.js:175` | 실제 RSC 탐색 응답의 배포/빌드 신분 불일치 시 MPA 탐색 반환 |
| 같은 패키지의 `client/components/app-router.js:214` | MPA 상태에서 `location.assign/replace`로 전체 페이지 이동 |
| `next.config.ts` | 자체 `deploymentId`/`generateBuildId`·버전 알림 설정 없음 |

Next 탐색 시 복구와 열린 탭의 배포 알림은 구분한다. 운영 호스팅의 skew protection·실제 배포 환경 변수는 확인하지 않았다. 구버전의 손실성 재저장을 차단하는 새 reader/writer 관문은 리드 결정에 따라 만들지 않았고, 호환성 문제가 해결됐다고 주장하지 않는다.
