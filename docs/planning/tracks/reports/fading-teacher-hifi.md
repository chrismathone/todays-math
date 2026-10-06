# «오늘의 기억» 교사 학생 현황 — Hi-fi 4안

2026-10-06 · codex ⑤ · `srs` · 리드의 H2 검수 뒤 작업실 연결까지 구현

**H2 «확인과 기록»을 작업실에 연결했다.** 리드가 H2를 검수한 뒤 원장님의 «연결 가능한 hifi 수준되면 연결» 지시로 승인한 작업이다. 살펴볼 명단과 사유에는 기존 호박색 토큰, 선택된 학생과 복습 수에는 기존 코발트 토큰을 써서 확인할 자리와 읽고 있는 자리가 구분된다. 기본 작업실의 흰 면과 구분선을 유지하며, 숫자는 개수·날짜·평가 건수로 따로 읽힌다.

## 보는 주소와 네 안

- 전체: `http://localhost:3443/dev/fading-teacher-hifi`
- 추천: `http://localhost:3443/dev/fading-teacher-hifi?variant=H2`
- 한 안: `?variant=H1`부터 `H4`까지. `&class=0`(준비반 0명) · `1`(개별반 1명) · `2`(중1 정규반 30명) · `3`(상태 확인반 4명).
- 상태: `&state=loading` · `empty` · `failure` · `closed` · `forbidden`. 화면의 «상태 표본»으로도 전환한다.
- Wire B: `http://localhost:3443/dev/fading-teacher-wire?variant=B`.
- 작업실 연결 표본: `http://localhost:3443/dev/fading-teacher-hifi?product=read` — `off`·`on`도 같은 주소에서 바꾼다. 실제 API를 호출하지 않는다.

| 안                      | 표·사유                                      | 학생 상세                                              | 선택할 이유와 부담                                  |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| H1 · 작업실 기본        | 흰 표, 외곽선 알약, 익숙한 간격              | 옅은 작업 바탕, 2열 수치                               | 기존 화면과 가장 가깝다. 확인 명단의 구분이 약하다  |
| H2 · 확인과 기록 · 추천 | 호박색 확인 머리·사유, 선택 행은 옅은 코발트 | 흰 면, 복습일 된 개념·밀린 개념 두 수만 옅은 코발트 면 | 매일 살펴볼 자리와 선택한 학생을 찾기 쉽다          |
| H3 · 단정한 기록부      | 짧은 행 간격, 진한 구분선, 오른쪽 정렬 수치  | 수치를 한 줄씩 정렬한 기록부                           | 학생 여러 명의 개수를 비교하기 좋다. 상세가 더 길다 |
| H4 · 여유 있는 명단     | 넓은 행, 큰 학생 이름, 사유는 절제된 글      | 흰 면, 넓은 간격                                       | 한 학생씩 읽기 좋다. 처음 보이는 명단이 더 적다     |

네 안 모두 위 확인 명단 → 아래 전체 명단 → 오른쪽 학생 상세라는 B 구조다. 처음 상세는 현재 범위에서 `overdue` 사유가 있는 학생 하나, 없으면 첫 학생이다. 처음 반 범위는 전체이며 «미리 보기 / 저장되지 않음»은 머리 오른쪽이다. 이름·행·딱지는 클릭하지 않고 행 안의 «보기»만 누른다. 확인 명단과 전체 명단은 각각 5건부터 보이며 «더 보기»로 모두 펼친다.

## 제품 부품과 자료 경계

`src/components/fading/teacher/TeacherFadingStatus.tsx`가 연결 가능한 제품 부품이다. 기본 `variant`는 `H2`이고 네 시안도 이 부품을 사용한다. 외부에서 받는 것은 다음과 같다.

```ts
getDashboard: () => Promise<{ data: FadingTeacherDashboard }>;
getStudent: (studentId: string, classId: string)
  => Promise<{ data: FadingTeacherStudent }>;
preview: ComponentProps<typeof FadingPreview>
  | ((today: string) => Promise<ComponentProps<typeof FadingPreview>>);
initialClass?: string; // 생략하면 전체 반
variant?: "H1" | "H2" | "H3" | "H4"; // 생략하면 H2
```

두 응답은 기존 교사 계약 스키마로 확인한다. 상세의 학생·반 id가 요청과 다르면 표시하지 않는다. `(classId, studentId)`로 선택하므로 두 반에 등록된 김하윤의 두 행이 구분되고, 상세에는 두 등록 반과 현재 읽는 반을 함께 표시한다. 학생 수만 id로 한 번씩 세며 등록 건수는 명단의 행 수다. 개념 수·단계 수·사유·날짜·평가 건수는 받은 값 그대로이고, 문턱이나 학습 계산을 화면에 만들지 않았다.

`teacher/apiSource.ts`의 `createTeacherFadingApiSource({ branchId?, fetcher? })`는 기존 두 GET 주소와 `branchId`·`classId`를 전달하는 선택적 API 구현이다. 실제 사용은 부모가 이 구현의 두 함수를 넘길 때 시작된다. 부품은 URL을 모르며 개발 페이지는 이 API 구현을 불러오지 않는다. `teacher/fixtureSource.ts`의 `createTeacherFixtureSource(fixture, state?)`가 같은 함수 꼴로 Wire 표본을 제공한다. 표본 숫자와 사유는 변경하지 않은 `fixture.ts`와 `teacher.ts`의 계산에서 온다.

싣는 중·빈 반·학생 0·일반 실패와 다시 시도·닫혀 있음(404)·권한 없음(403)을 그렸다. 반 0과 이름 검색 결과 0도 별도로 안내한다. 상세 읽기에도 실패·다시 시도·404·403을 적용한다. 늦게 온 이전 학생의 응답은 새 선택을 덮지 않으며, 부모가 자료 제공 함수를 바꾸면 이전 범위의 명단을 즉시 숨긴다.

«미리 보기»는 기존 `FadingPreview`를 필요할 때 불러와 이 부품 안에 띄운다. 값 또는 비동기 자료 함수를 받으며, 함수를 받은 경우 누를 때만 요청하고 같은 날짜·제공 함수의 자료는 다시 쓴다. 자료 적재 실패는 미리 보기 안에서 다시 시도한다. `preview` 자료는 학생 앱용으로만 전달하고 교사 현황에는 문장·빈칸 답을 표시하지 않는다. `FadingPreview`·학생 앱·`src/lib/fading`·계약 파일은 수정하지 않았다. 실제 브라우저에서 미리 보기와 복귀를 확인했고 API 요청은 0건이었다. 닫으면 지역 미리 보기는 해제되고, 명단의 선택은 보존되며 원래 미리 보기 단추로 초점이 돌아온다.

용어만 `FadingMath`에 보낸다. 소단원·대단원 이름은 일반 글로 표시해 «1-1-1» 같은 번호가 빼기로 조판되지 않는다. `passed`는 «‘다시’ 외 평가» 건수이며 설명 문장을 함께 둔다. 뭉친 점수·기억 보존율·정답률·백분율·마스터·문장·답 표시는 없다.

## 작업실 연결

`WorkspacePage` 서버 부품이 기존 `fadingGate()`를 읽어 `UnifiedWorkspace`의 선택 prop `fadingGate`로 내려준다. 클라이언트는 환경값을 읽거나 404로 문을 떠보지 않는다. `can("srs")`가 지키던 같은 자리에 `SrsWorkspaceView`를 놓고, 기존 `CourseDashboard` JSX는 `legacy`로 그대로 넘긴다. 두 기존 파일의 연결 변경은 총 14줄 추가·1줄 교체다.

| 서버 문            | 보이는 화면과 적재                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| off 또는 prop 생략 | 부모가 넘긴 기존 `CourseDashboard`만 그대로 반환한다. 추가 틀·탭·새 요청이 없다                   |
| read               | «기존 SRS 현황» · «오늘의 기억» 두 탭. 기존 것이 기본이고 새 탭을 처음 열 때만 교사 현황을 읽는다 |
| on                 | 같은 두 탭이며 «오늘의 기억»이 기본이다. 기존 화면도 처음 열 때만 마운트한다                      |

탭은 기존 `TeachingView.module.css`의 `tabs`를 재사용한다. `tablist`·`tab`·`tabpanel` 관계, 방향키·Home·End, 초점 이동과 44px 높이를 갖춘다. 열었던 패널은 숨겨 보존하므로 새 현황을 다시 열 때 중복 요청하지 않고 기존 SRS 편집도 보존된다.

실제 새 탭은 `createTeacherFadingApiSource({ branchId: currentUser.branchId })`의 두 조회 함수를 사용한다. 학생 현황 부품도 새 탭을 열 때 `React.lazy`로 적재된다. `previewData`는 **미리 보기 클릭 뒤 `import()`**로만 불러온다. 서버 전용 `fadingCatalog`를 클라이언트에 들이지 않고 같은 `buildFadingConcepts`·`FADING_GROUPS`·`fadingTrapMap`·`fadingFigureMap` 함수와 자료를 사용해 준비한다. 날짜는 교사 명단 응답의 `today`를 넘긴다. 자료 제공 함수가 아직 현황을 읽는 동안에는 미리 보기 단추가 비활성이다.

`SrsWorkspaceView`의 `source`·`preview` 선택 props는 개발 표본 및 시험을 위한 자료 교체 자리다. 실제 작업실 연결은 이 props를 생략하고 API 구현과 클릭 시 자료 적재 함수를 사용한다. 개발 페이지의 기존 SRS 자리는 설명용 표본이며 실제 `CourseDashboard` 내부를 흉내 내거나 API를 호출하지 않는다.

- 작업실 메뉴 **«오늘의 기억 · SRS»의 첫 화면인 «학생 현황»**을 가정했다. 기존 `SRS 현황` 접근 관문·명단·지점 범위는 부모와 서버가 계속 소유한다.
- 제품 부품에는 옆 메뉴·개발 시안 머리·추가 페이지 여백이 없다. `UnifiedWorkspace`의 기존 내용 틀 안에 두면 된다. 자체 흰 면과 머리·반 선택·명단·상세를 포함한다.
- 지점이 바뀌면 `SrsWorkspaceView`가 새 API 구현을 만든다. 학생 상세 요청은 현재 선택한 등록 반의 `classId`를 함께 보낸다. API 구현은 GET만 수행한다.
- 미리 보기 자료(`concepts`, `today`, `traps`, `figures`)는 기본 지연 적재 함수가 준비한다. 부모가 교체하려면 값 또는 비동기 함수를 넘길 수 있다. `today`는 교사 응답의 한국 날짜를 쓴다. 학생 현황 응답에서 개념 내용이나 답을 얻으려 하지 않는다.
- 부품 폭이 820px 이하이면 상세를 명단 아래로 내린다. 창 폭 대신 부품 폭을 기준으로 하므로 실제 옆 메뉴를 포함한 작업실에도 적용된다.
- `UnifiedWorkspace`·`WorkspacePage`에는 연결부만 추가했다. 기존 math-srs 내부·접근 관문·교사 API·서버 문·DB를 변경하지 않았고 커밋·푸시도 하지 않았다. 공유 워크트리의 다른 작업은 보존했다.

## 검증과 증거

없는 모듈의 실패부터 출발했다. 교사 Hi-fi·제품 상태·API 구현·기존 Wire 시험 **3파일 29개**가 통과했다. 네 안, 상태 여섯, 보기 선택, 두 반 학생, 금지 표시, 계약 수치, 다시 시도, 늦은 상세, 자료 제공 함수 변경, GET 범위 전달·계약 검증·HTTP 오류 전달을 확인한다.

자기 파일 ESLint와 `node src/lint/check-affordance.mjs <자기 파일>`은 모두 0건이다. Node 8GB 한도로 검사한 작업실 연결판의 **프로젝트 전체 `tsc --noEmit`도 0건**이다. 타입 설정·서버 문·DB를 변경하지 않았다.

독립 agent-browser 세션으로 **4안 × 2폭 × 5반 범위 = 40장면**, H2의 추가 상태 10장면, 전체 시안 동시 렌더 2장면, 펼친 명단 1장면을 측정·캡처했다. 1280에서 옆 메뉴 240px, 768에서 212px를 실제로 남겼고 글꼴 적재와 상세 응답을 기다렸다.

| 측정                               | 결과 |
| ---------------------------------- | ---: |
| 총 장면                            |   53 |
| 관측 컨트롤                        |  936 |
| 문서 가로 넘침                     |  0px |
| 44px 미만 컨트롤                   |  0건 |
| 12px 미만 글자                     |  0건 |
| 숨은 넘침·화면 밖 가로 요소        |  0건 |
| 표 행 손가락 커서·컨트롤 중앙 가림 |  0건 |
| 금지 문구·오류 오버레이            |  0건 |
| 외부 리소스·실제 API 요청          |  0건 |

별도 Orca 브라우저에서 실제 행 hover 전후 배경과 커서가 같음을 확인했다. 선택 행은 `rgb(237, 242, 255)`·`auto`, 일반 행은 투명·`auto`다. 기존 3443 서버를 사용했고 새 서버를 띄우지 않았다.

캡처·원시 수치는 `.qa-artifacts/fading-screens/teacher-hifi/`에 있다.

- `measurements.json` · `summary.json` · `measure.mjs`: 측정 원본과 재현 코드.
- `H1`~~`H4`의 `1280`·`768`별 `all`·`0`~~`3` PNG, H2 추가 상태 PNG, `gallery-*.png`, `H2-768-expanded.png`.
- `four-variants.png`: 네 안의 같은 자리 비교.
- **`wire-B-vs-H2-1280.png` · `wire-B-vs-H2-768.png`**: Wire B와 추천안을 나란히 놓은 그림. `compare.py`가 기존 캡처 원본을 보존하며 만든다.
- `preview-1280.png`와 Orca 스냅샷: 기존 학생 미리 보기와 현황 복귀.
- `tests.txt` · `eslint.txt` · `affordance.txt` · `type-check.txt` · `browser-errors.txt`: 검사 기록.

작업실 연결 후에는 추가로 **8개 진입·탭 상태와 미리 보기 4회**를 두 폭에서 측정했다. 문서·숨은 가로 넘침, 44px 미만 컨트롤, 12px 미만 글자, 화면 밖 요소, 잘못된 커서, 오류 오버레이, 외부 리소스·API 요청은 모두 0건이다. 새 탭을 연 뒤에도 미리 보기 전의 은행·묶음·미리 보기 자료 청크 요청은 0건이며 클릭한 뒤에만 은행과 `previewData` 청크가 적재됨을 네 번 확인했다. 복귀 초점도 네 번 모두 원래 단추다.

증거는 같은 폴더의 `measure-workspace.mjs`·`measurements-workspace.json`·`summary-workspace.json`·`preview-workspace.json` 및 `product-*.png`에 있다. 실제 명단으로 보는 단계는 리드가 3443 서버를 `MATH_FADING=read`로 다시 띄운 뒤 진행한다. 실제 API·관문·운영 데이터는 이 표본 개발 화면의 검증 범위에 포함하지 않았다.

연결부·기존 `UnifiedWorkspace`의 접근·작업·담기·초기화·진입 시험과 지정된 영어 울타리·오류 로그 전수 가드를 묶은 **11파일 137개**가 통과했다(`tests-workspace-focused.txt`). 이후 첫 요청의 StrictMode 중복 방지를 보강한 최종 교사 시험은 **4파일 35개**가 통과했다(`tests-workspace-own.txt`). 이 두 묶음에는 같은 시험이 포함되므로 합산하지 않는다. StrictMode가 적재 effect를 재실행해도 취소된 읽기는 시작하지 않아 명단 요청이 하나뿐임을 확인한다.

자기 파일 품질 검사 원본은 `eslint-workspace.txt`·`affordance-workspace.txt`·`type-check-workspace.txt`다. 지정된 전체 컴포넌트 검사(`--maxWorkers=2`로 병렬 수만 제한)는 `tests-workspace.txt`에 기록하며, 교사 연결부를 읽지 않는 범위 밖 시험 실패가 확인되었다. 해당 화면과 시험 파일은 변경하지 않았다. 전체 결과가 아래에 정리된다.

전체 검사는 **243파일 중 234파일 통과·9파일 실패, 3,144개 중 3,120개 통과·24개 실패**로 끝났다. 작업실 SRS 연결 관련 시험과 두 전수 가드는 통과했다. 따라서 전체 컴포넌트 검사가 모두 초록이라는 주장은 하지 않는다.

| 변경하지 않은 실패 파일         | 실패 수 | 관찰한 항목                                                   |
| ------------------------------- | ------: | ------------------------------------------------------------- |
| `DailyReviewSection.test.tsx`   |       1 | 자동 출제 표지                                                |
| `EnglishResourceBank.test.tsx`  |      11 | 폐기된 EBS 화면·참조 항목을 찾는 시험                         |
| `PrintCheck.test.tsx`           |       1 | 항목 수 변경 감지                                             |
| `BranchAdmin.test.tsx`          |       2 | 계정 링크의 returnTo·현재 교직원/학생 계정 이름과 기대의 차이 |
| `classOwnerTag.test.tsx`        |       2 | 반 이름·담당 표시와 title                                     |
| `ProgressPlanScreen.test.tsx`   |       2 | 계획 선택·거절 안내                                           |
| `Main.test.tsx`                 |       2 | 진도 장애·목록 재시도 안내                                    |
| `TodaysExam.test.tsx`           |       1 | 제품 워드마크의 현재 위치 표시                                |
| `StudentProgressBoard.test.tsx` |       2 | 단원 표지·오답 회차의 설명 표시                               |

이 파일들의 수정은 하지 않았다. 위 실패의 원인을 모두 조사하거나 변경 전 전체 검사를 다시 실행한 것은 아니므로, 24개 전체에 대해 기존 실패가 재현됐다는 주장도 하지 않는다. 수정한 연결부·기존 `UnifiedWorkspace`·두 전수 가드의 별도 통과와 전체 검사의 범위 밖 실패를 각각 보고한다.

이번 연결에서 바꾼 코드는 `WorkspacePage.tsx`·`UnifiedWorkspace.tsx`의 연결부, `teacher/SrsWorkspaceView.tsx`·`previewData.ts`, `TeacherFadingStatus.tsx`·CSS의 비동기 미리 보기와 읽기 취소 처리, 개발 페이지와 `SrsWorkspaceDevClient.tsx`, 새 `fadingTeacherWorkspace*.test.tsx` 두 파일이다. `CourseDashboard`의 안·교사 API·접근 관문·`src/lib/fading`·계약·학생 앱은 변경하지 않았다.

리드에게 남기는 것은 실제 명단 확인과 위 범위 밖 실패 목록이다. 커밋·푸시·서버 재시작·서버 문 변경·DB 변경은 하지 않았다.
