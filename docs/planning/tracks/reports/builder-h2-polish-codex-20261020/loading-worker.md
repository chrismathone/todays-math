# Builder H2 scope count 로딩·캐시 결과

- 작업트리: `/Users/pss/orca/workspaces/today_/builder-h2-loading`
- 상위 작업트리: `/Users/pss/Desktop/creative/today-builder-width`
- 적용 patch: `/tmp/builder-h2-loading.patch` (최신 ESLint 수정 포함)
- 변경 파일: `src/components/exam-builder/ExamBuilder.tsx`, `ScopeSequencePicker.tsx`, `ExamBuilder.demand.test.tsx`.
- ExamBuilder 수정은 원본 196~401줄의 로딩 관련 부분에 한정. focus 로직·하위 markup·CSS는 수정하지 않음. 상위의 focus/markup 변경과 문맥 충돌 시 해당 로딩 hunk만 수동 통합 가능.

## 변경

- `navigation.lessons` 응답이 오면 차시 목록을 즉시 표시한다. scope count의 `loading`은 목록 전체를 가리지 않고, 아직 수가 없는 차시의 기존 로딩 문구에만 사용한다. 미확인 차시는 기존대로 선택 불가다.
- 수량 캐시는 source 객체·최근 출제 제외 여부·retry 세대별로 구분한다. 새 demand를 기다리는 동안 기존 차시 수량과 수동 배분을 유지하고 새 응답을 ID별로 합친다.
- 성공적으로 응답받은 ID와 실패한 ID를 추적한다. 새 요청에는 미수신 ID만 싣고, 실패는 같은 세대에서 자동 재요청하지 않는다. 명시적인 재시도는 새 세대에서 다시 읽는다.
- 진행 중 요청의 ID를 예약해 체크 해제·검색·페이지 이동으로 요청을 취소하거나 중복 요청하지 않는다. 응답 직후 React의 캐시 반영 전까지도 예약을 유지해 중복 요청을 방지한다. source 변경·retry·unmount 때 취소하며, 취소된 응답은 저장하지 않는다.
- 저장한 조건 적용에 쓰이는 `loaded`는 현재 demand가 확인되거나 오류가 난 뒤에만 준비된다. 캐시 일부만으로 적용을 조기 완료하지 않는다. 기존 저장 조건 시험도 통과했다.

## 검증

| 검사 | 결과 |
| --- | --- |
| ExamBuilder 컴포넌트 시험 5파일 (`ExamBuilder`, `SavedConditions`, `ExamBuilder.h2`, `ExamBuilder.demand`, `PickerDemand`) | **80/80 통과** |
| `vitest run --config src/components/exam-builder/vitest.config.mts` 전체 | **19파일, 272/275 통과 · 3실패** |
| `npm run type-check` | 통과 (exit 0) |
| 변경 3파일 ESLint | 통과 (exit 0) |
| `npm run lint:affordance` | 통과 (exit 0) |
| `git diff --check` | 통과 |

새 회귀시험은 수 응답을 의도적으로 보류해 목록 선표시·미확인 선택 차단, 체크/해제 시 추가 요청 0회, 새 페이지 요청 중 기존 수 유지, 진행 중 요청 보존, 최근 제외/포함별 캐시, source별 캐시와 복귀 재사용을 확인한다. 기존 페이지·검색·학년 이동 시험의 기대 요청도 새 ID만 포함하도록 강화했고, 오류 후 재시도의 동일 요청 및 총 2회를 확인했다.

전체 시험의 3실패는 `src/__tests__/unit/exportPerMenu.test.ts:172`의 아래 권한 기대값이다 (`textbook: expected false to be true`). 이 시험은 변경한 컴포넌트를 가져오지 않으며, 해당 시험·`src/lib/accountRouteAccess.ts`·`src/contracts/accountAccess.contract.ts`가 작업 전과 동일함을 `git diff --exit-code`로 확인했다. 허용 범위 밖 권한 코드는 수정하지 않았다.

- `POST /api/exam/practice/resolve`
- `GET /api/exam/practice`
- `POST /api/exam/practice`

시험은 기존 `envDir: false` 설정, DB 테스트 더블과 fetch fixture로 실행했다. 실제 Chrome에서 통합 patch의 지연 집계 화면을 재검증한 결과는 이 하위 결과에 포함하지 않는다.

로그:

- `/tmp/builder-h2-loading-tests.log` — 컴포넌트 시험 80개
- `/tmp/builder-h2-loading-all-tests.log` — 전체 275개와 실패 상세
- `/tmp/builder-h2-loading-eslint.log`
- `/tmp/builder-h2-loading-types.log`
- `/tmp/builder-h2-loading-affordance.log`

## 작업 상태

DB 읽기/쓰기·git add·commit·push·재위임을 수행하지 않았다. `node_modules`는 허용된 `/Users/pss/Desktop/creative/today_/node_modules` 심볼릭 링크이며 Git ignore 대상이다. 추적 파일 변경은 위 3개뿐이다. patch와 이 결과 파일은 `/tmp`에 저장했다.
