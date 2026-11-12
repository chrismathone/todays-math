# 5차 리뷰 실행 근거 · 2026-11-12

대상은 `scratch/review/review-order5.md` 1~4와 리드 결정이다. 구현 커밋은 `d5347651f`이다. 각각 재현 시험이 실패하는 것을 먼저 확인한 뒤 구현했다. 최초 기준은 4차 보고 커밋 `dbf5187c6`이다.

| 범위 | RED | GREEN | 핵심 관측 |
|---|---|---|---|
| PDF 정리·초기 그림 통지 | 25 실패 / 41 통과 | 66 통과 | `cleanup` 호출 기대 1회·실제 0회, 확인 대기 전 초기 그림 미통지. 성공·실패·시간 초과·취소·늦은 getPage까지 해제하고 초기 그림 뒤 취소는 `AbortError`. |
| 상태·수동 선택·이력 | 7 실패 / 21 통과 | 후속 보강까지 33 통과 | 준비된 쪽의 조작·시작·재시도 잠금, 늦은 자동 결과가 되살리기·과거 이력을 변경. 초기 그림을 즉시 공개하고 수동 선택·이력을 보존. |
| 외부 영역 지정 전환 보강 | 1 실패 / 31 선택 제외 | 위 33건에 포함 | 외부 `stepRequest`로 시작한 뒤 재진입하면 미확인 쪽을 다시 자동 제외. 시작 단추·단계 띠와 같은 중단 처리를 적용. |
| 여러 재시도의 렌더 상한 보강 | 1 실패 / 32 선택 제외 | 위 33건에 포함 | 여러 실패 쪽의 재시도가 함께 시작됨. 최초 처리 직렬 1개＋명시적 재시도 직렬 1개로 제한. |
| 그림·오류 표시와 쪽별 조작 | 8 실패 / 16 통과 | 24 통과 | URL＋error에서 그림 없음, 확인 중 그림 없음, URL 없는 쪽의 조작 허용. 그림·안내·재시도를 함께 표시하며 준비된 쪽만 개별 조작. |

초기 PDF RED와 보유량 기준 측정은 PDF 제품 코드 수정 전에 실행했다. 실제 메모리 전후 값은 [baseline.json](baseline.json), [after.json](after.json), 측정 범위와 타입 보강은 [memory-report.json](memory-report.json)에 남긴다. 원시 로그는 작업 기계의 `/tmp/studio-order5-{pdf,state,ui}-red.log`와 `-green.log`, 외부 전환·재시도 보강은 `/tmp/studio-order5-state-red-transition.log`, `/tmp/studio-order5-state-red-bounded-retries.log`다.

## 통합 검증

```sh
npx vitest run StudioView UnifiedWorkspace useStudioAi StudioBulkSolution StudioPageOrder studioPageAnalysis studioPagePreview studioPageOrder studioCart draftStore workspaceDraftStore workspaceExplicitResume studioExplicitResume privateWorkspacePersistence privateDocumentWorkflow PrivateLibrary StudioQueueStatus StudioStepBar PaperStrip --maxWorkers=3
npm run type-check
npm run lint:affordance
npx eslint src/components/unified/studioPagePreview.ts src/components/unified/StudioView.tsx src/components/unified/StudioPageOrderStep.tsx src/__tests__/unit/studioPagePreview.test.ts src/__tests__/components/StudioView.pageOrder.test.tsx src/__tests__/components/StudioPageOrder.test.tsx
git diff --check
```

관련 **34파일·688시험 통과**, affordance·변경 TypeScript 6파일 ESLint·diff 검사와 정상 커밋 훅이 통과했다. 첫 타입 검사는 제품 helper의 제네릭 추론, 시험 `getPage` 대역 인수, 무시되는 측정 스크립트 타입에서 실패했다. 이를 고친 뒤 PDF 단위 66시험과 프로젝트의 **8GB `npm run type-check`**가 통과했다. 타입 보강 전후 helper를 변환한 JavaScript가 바이트 단위로 같음을 확인했다. 최종 확인값은 [checks.json](checks.json), Node 제품 재검증 12표본은 [product-regression.json](product-regression.json)이다.

최종 상태 시험은 정상 쪽＋실패 쪽＋확인 후보 100쪽을 사용한다. 첫 후보 확인 Promise를 끝내거나 가상 시간을 진행하지 않고 정상 쪽 이동, 실패 쪽 재시도, 시작 단추·영역 지정 탭 활성화를 확인한다. 시작 즉시 요청 신호가 취소되고 102쪽 모두 영역 지정 대상에 남는다. 별도 시험은 시작 전에 직접 뺀 쪽은 제외를 유지하고, 아직 읽지 않은 쪽과 늦은 응답이 재진입 후에도 자동 제외되지 않는지 확인한다. 기존 상자·인식·해설 객체도 보존한다.

수동 빼기→되살리기 뒤 늦은 확인/재시도 성공에서도 포함 상태가 유지되고, 되돌리기 두 번은 제외→포함의 원래 이력을 따른다. 수동 제외를 되돌린 뒤에도 권한을 기억한다. 자동 판정은 현재 값만 바꾸므로 그 전에 했던 이동을 되돌리면 당시 스냅샷이 그대로 복원된다.

## 실제 PDF 자원 측정 재현

[fixture.mts.txt](fixture.mts.txt)와 [measure.mts.txt](measure.mts.txt)를 저장소 루트의 `scratch/review/order5-memory/`에 각각 `.mts`로 복사해 사용한다. 제품의 구현 전/후 버전에서 동일 fixture를 측정했다. 실제 PDF 파일은 커밋하지 않았다.

```sh
npx tsx scratch/review/order5-memory/fixture.mts
# 구현 전 helper가 있는 기준 상태에서
npx tsx scratch/review/order5-memory/measure.mts baseline
# 구현 후 helper가 있는 상태에서
npx tsx scratch/review/order5-memory/measure.mts after
```

최종 스크립트의 네 번째 콜백 인수는 이전 helper가 무시한다. `tsx`는 이 기준 측정에서 타입 검사를 수행하지 않는다. 원시 after JSON은 타입 보강 전 소스 해시이며 최종 helper와 실행 JavaScript는 같다. 스크립트도 타입 표시만 보강했다.

서로 다른 이미지 XObject 16개를 가진 595×842pt PDF다. 각 이미지는 2480×3508 RGB 8비트 흰 스캔이다. 파일은 415,444바이트, SHA256 `edc37e05d283c279c8559002376807e0f167b5c0a5e824fa76d54c3be8ed5d21`이다. 리뷰 파일 412,130바이트와 직렬화 크기는 다르지만 쪽 수·이미지 치수·디코딩 데이터 크기는 같다. [입력값](fixture-inputs.json).

쪽 객체의 참조를 유지한 채 실제 `PDFPageProxy.objs`의 읽기 전용 반복자로 이미지 배열의 `byteLength`를 합산했다. 기준 417,592,320바이트(398.247MiB), 수정 후 0바이트이며 16번 cleanup 모두 성공했다. 이는 프로세스 RSS나 GC 추정값이 아니다. 16쪽 전체 처리 시간은 기준 25.515초, 수정 후 26.234초였다. 전체 처리 속도가 빨라졌다는 주장을 하지 않는다. 준비된 그림의 조작이 나머지 처리 완료를 기다리지 않도록 바꾼 것이다.

cleanup 후 같은 공유 PDF의 같은 쪽 객체에서 배율 1.7, 230×190 영역을 다시 렌더했다. 흰 스캔 외에도 색이 있는 대조 PDF를 사용했으며, 대조 영역의 비백색 픽셀 37,060개와 RGBA SHA256 `1cd52b349f6b21261a94812c36bc53cf7ae00182b41d50181463fd3a6f22e0cf`가 전후 일치했다. 실제 렌더를 public `RenderTask.onContinue`로 잠시 멈춘 동안 cleanup은 false를 반환했고 렌더가 끝나자 객체·디코딩 데이터가 0이 되는 지원 동작도 확인했다. 공유 문서를 destroy하거나 PDF.js 내부 상태를 수정하지 않았다.

Node 24.22.0·PDF.js 6.2.108 legacy·`@napi-rs/canvas`에서 측정했다. 브라우저 ImageBitmap·GPU·worker·할당기나 프로세스 전체 메모리는 측정 범위가 아니다. 새 브라우저 E2E, 전체 저장소 시험 재실행, 공유 DB 왕복, 운영 빌드, 푸시·main 병합은 하지 않았다.
