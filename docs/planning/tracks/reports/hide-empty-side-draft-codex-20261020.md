# 빈 «현재 시험지» 카드 숨기기 — 수행 보고

2026-10-20 · `fix/hide-empty-side-draft` · 기준 HEAD `560c6a0fa`

지시: [작업 브리프](../brief-hide-empty-side-draft-codex.md). `AGENTS.md`, `DESIGN.md`, 메뉴 구현표와 설치된 Next.js의 `testing/vitest.md`를 읽고 수행했다.

## 결과

- 리드가 넣어 둔 `UnifiedWorkspace.tsx`의 `(selected.length > 0 || view === "studio")` 조건을 그대로 유지했다. 실제 사용자 길이 끊기는 경우는 찾지 못했으며 조건 확장·새 버튼·새 모양은 추가하지 않았다.
- 시작 상태에서 UnifiedWorkspace 5개 파일의 **87개 중 12개 실패, 75개 통과**를 재현했다. 아래 12개는 모두 **시험 준비만 빈 카드에 의존한 경우**로 분류했다. 기존 단언을 삭제하거나 약하게 만들지 않고 진입 준비를 고쳤다.
- 신규 회귀 시험 7개를 추가했다. 최종 UnifiedWorkspace 시험은 **94개**, 관련 시험까지 **9개 파일·187개 전부 통과**했다.
- 자동 복원·저장·권한·인쇄·DB 로직은 변경하지 않았다. DB 접근, 커밋, 푸시, `git add`를 하지 않았다. `node_modules`는 기존 심볼릭 링크를 그대로 두었다.

## 최초 실패 12개 각각의 분류

파일 이름은 모두 `src/__tests__/components/` 기준이다. 표의 «준비»는 브리프의 **시험 준비만 그 길을 쓴 것**을 뜻한다. «실제 사용자 길이 끊기는 것»으로 분류한 항목은 0개다.

| 번호 | 파일 · 시험 이름 | 분류·고친 준비 | 유지한 검증 대상 |
| --- | --- | --- | --- |
| 1 | `UnifiedWorkspace.actions.test.tsx` · `rejects ineligible bank rows at the workspace selection boundary` | 준비. 잠긴 문항은 담기지 않아 빈 카드가 없다. `#export`로 직접 이동하고 실제 `hashchange` 처리로 빈 편집 화면을 연다. | 출제 불가 문항 거절, 구성 문항 비어 있음, 빈 편집 화면의 문제은행 진입 버튼 표시. |
| 2 | `UnifiedWorkspace.access.test.tsx` · `only warms worksheets from home and never saves on direct home entry` | 준비. `openWorksheet()`를 기존 Ctrl K → 빠른 실행 → 시험지 · 내보내기로 변경한다. | 홈의 메타데이터 읽기만 허용, 자동 저장·자동 복원 없음, 명시적 불러오기, 제목 변경 저장과 탭 이동 뒤 제목 보존. |
| 3 | 같은 파일 · `only warms worksheets from home and never saves on direct teaching entry` | 준비. 동일한 빠른 실행 경로를 사용한다. | 수업 직행 시 초안 저장소·클라우드 미접근, 명시적 불러오기 이후 저장 및 탭 왕복 보존. |
| 4 | 같은 파일 · `only warms worksheets from home and never saves on direct concept entry` | 준비. 동일한 빠른 실행 경로를 사용한다. | 개념 직행 시 초안 저장소·클라우드 미접근, 명시적 불러오기 이후 저장 및 탭 왕복 보존. |
| 5 | 같은 파일 · `only warms worksheets from home and never saves on direct srs entry` | 준비. 동일한 빠른 실행 경로를 사용한다. | SRS 직행 시 초안 저장소·클라우드 미접근, 명시적 불러오기 이후 저장 및 탭 왕복 보존. |
| 6 | 같은 파일 · `«시험지 · 내보내기»는 옆 메뉴에 따로 없다 — 문제 추출 · 시험지 만들기 · 내 시험지의 끝 단계(원장님 2026-10-01)` | 준비. 빈 카드 대신 기존 빠른 실행으로 편집 화면을 연다. | 출력 사이드바 메뉴 없음, 빈 편집 화면과 문제은행에서 담기 버튼 접근 가능. |
| 7 | 같은 파일 · `영어에서는 «현재 시험지» 카드 · 담기 바가 안 뜨고, 영어 뷰의 알림은 셸 알림 줄로 나온다` | 준비. 저장소에만 있던 수학 시험지를 «저장한 작업 불러오기»로 먼저 명시적으로 연다. 전환 완료 후 현재 화면의 제목을 확인한다. | 수학 카드 표시, 영어에서 수학 카드·제목 입력 숨김, 영어 알림의 셸 상태 줄 표시. 수학으로 돌아와 시험지 만들기를 열 때 카드·제목 보존도 추가 확인한다. |
| 8 | `UnifiedWorkspace.cart.test.tsx` · `작업실은 시험지 목록을 그대로 받고, ④ 에서 뺀 것을 뺀 자리와 함께 안다 (어긋남 1)` | 준비. `resume()`에서 빠른 실행으로 빈 편집 화면을 열고 저장본을 명시적으로 불러온다. | 순서·빼기 위치·추출 화면의 동일 장부·원래 자리로 다시 담기. |
| 9 | 같은 파일 · `작업실에서 빼면 ④·문제은행과 같은 길 — 알림 줄 «되돌리기»도 기억을 푼다` | 준비. 동일한 `resume()` 경로를 사용한다. | 추출 화면 빼기, 남은 목록·제거 기억, 셸 알림과 되돌리기. |
| 10 | 같은 파일 · `반영은 같은 자리에서 갈고, 문제은행에서 다시 담으면 뺀 기억이 풀린다` | 준비. 동일한 `resume()` 경로를 사용한다. | 기존 자리 반영, 문제은행 추가·제거·다시 담기, 제거 기억 해제와 원래 순서. |
| 11 | 같은 파일 · `뺀 기억은 시험지와 같이 저장된다 — 새로 고친 뒤에도 뺀 자리와 함께 남는다 (트랙 47)` | 준비. 최초 진입·재마운트 모두 빠른 실행 뒤 저장본을 명시적으로 불러온다. | 새로고침 이후 담은 목록·제거 위치 보존, 다시 담기 시 원래 자리 복구. |
| 12 | 같은 파일 · `새 시험지를 열면 담은 목록도 뺀 기억도 빈다 (어긋남 2)` | 준비. 동일한 `resume()` 경로로 기존 저장본을 먼저 연다. | 새 시험지 생성 후 담은 목록·제거 기억 초기화, 새 시험지 창 닫힘. |

`orderReset` 1개와 `loading` 2개는 최초부터 통과했다. 저장본을 명시적으로 연 뒤 문항이 있는 카드로 편집에 가는 기존 시험은 그대로 유지했다.

## 실제 사용자 길 검토

주 작업자의 소스 대조와 별도 Orca/Codex 읽기 전용 검토에서 같은 결론을 얻었다. 아래는 정적 소스 근거이며, 실계정 브라우저 검증과 구분한다.

| 기능 | 카드 없이 남아 있는 실제 경로 · 근거 |
| --- | --- |
| 현재 빈 초안의 편집 | Ctrl/⌘ K → «시험지 · 내보내기». `UnifiedWorkspace.tsx`의 `quickNav`, 단축키 처리, 빠른 실행 버튼은 카드의 문항 수 조건에 의존하지 않는다. 직접 `#export` 진입도 유지된다. |
| 새 빈 시험지 생성 | 홈·내 시험지의 기존 새 시험지 대화상자 → «빈 시험지로 시작하기». 두 메뉴가 없는 제작 계정에는 기존 사이드바 새 시험지 버튼이 남는다. |
| 출력 | 수학 시험지 만들기의 범위 → 검토 → 양식 구성·출력이 자체 `WorksheetEditor`로 연결된다. 공용 출력 본문도 카드 표시 여부와 독립적이다. 원래 0문항 인쇄·PDF·HWPX는 비활성이다. |
| JSON 가져오기 | 내 시험지의 «작업 파일 불러오기»와 빈 편집 화면의 기존 불러오기 동작. 파일 input과 `receiveDraft()`는 카드 조건 밖에 있다. |
| 지난 시험지 | 내 시험지의 수정·이어서 작업 → `openSaved()`. 저장본을 명시적으로 열며 새 방문의 자동 복원은 계속 꺼져 있다. |
| 문제 추출 | `view === "studio"` 예외를 유지한다. 카드의 `navigate("export")`는 `studioExportRequest`를 보내고, 실제 `StudioView.addProblems(true)`가 아직 담기 전 추출 문항을 담은 뒤 편집으로 보낸다. |
| 영어 | 영어는 `worksheetView`에 포함되지 않는다. 제품 전환과 영어 자체 제작·출력 흐름은 수학 카드와 독립적이다. |

추출 화면의 **담은 문항**은 부모 `selected`와 같은 장부다. 아직 담기 전인 추출 문항은 `pendingCrops`로 따로 계산된다. 따라서 «0문항이어도 문제 추출에서는 카드를 유지»하는 예외가 필요하며, 이 예외를 제거하지 않았다.

독립 검토 산출물은 `/tmp/hide-empty-side-draft-route-audit-20261020.md`에 남겼다. 별도 워커는 저장소 파일을 수정하지 않았다. 완료·대기와 깨끗한 작업트리, 해당 HEAD가 main에 포함된 상태를 확인한 뒤 검토용 Orca 작업트리를 제거했고 `BIGSHOL/hide-empty-side-draft-route-audit` 브랜치는 보존했다.

## 신규 회귀 시험과 시험 대역

`UnifiedWorkspace.cart.test.tsx`에 다음 **7개**를 추가했다.

1. 빈 홈에서 카드·편집 이어가기 없음.
2. 빈 시험지 만들기에서 카드·편집 이어가기 없음.
3. 빈 공용 편집 화면에서 카드·편집 이어가기 없음.
4. 빈 내 시험지에서 카드·편집 이어가기 없음.
5. 한 문항을 담으면 1문항 카드로 편집 진입 가능, 마지막 문항을 빼면 카드 재숨김.
6. 문제 추출에서는 `selected`가 비어도 0문항 카드 표시, 클릭 시 셸 출력 요청과 콜백 연결 유지. 추출 내부는 이 시험의 대역이며, 실제 추출 문항의 담기·전달은 함께 실행한 `StudioView.cart.test.tsx`의 17개가 검증한다.
7. 저장본이 있어도 빈 시험지로 시작하고, 내 시험지에서 명시적으로 열면 3문항 카드·원래 제목 복원.

`MathExamBuilder`의 직접 `#bank` 선적재와 지연 렌더가 같은 배선 대역을 사용하도록 `next/dynamic` 시험 대역을 맞췄다. 기존 access 시험의 선적재 대응 방식과 같으며 제품의 로더·문제은행 구현은 바꾸지 않았다. 저장본을 열어 제작기 key가 바뀔 때에는 언마운트 전 요소를 단언하지 않고 현재 접근 가능한 화면을 기다린다.

## 최종 검증

| 검사 | 결과 |
| --- | --- |
| 아래 `npm run test -- …` | **9개 파일·187개 통과**, 종료 0. 모은 파일과 실제 결과를 확인하는 프로젝트 게이트 사용. |
| `npm run type-check` | 통과, 종료 0. |
| 변경 TSX 4개 ESLint | 통과, 종료 0. |
| `npm run lint:affordance` | 통과, 종료 0. |
| `git diff --check` | 통과. |

```sh
npm run test -- \
  src/__tests__/components/UnifiedWorkspace.access.test.tsx \
  src/__tests__/components/UnifiedWorkspace.actions.test.tsx \
  src/__tests__/components/UnifiedWorkspace.cart.test.tsx \
  src/__tests__/components/UnifiedWorkspace.loading.test.tsx \
  src/__tests__/components/UnifiedWorkspace.orderReset.test.tsx \
  src/__tests__/components/StudioView.cart.test.tsx \
  src/__tests__/components/WorkspaceEntry.test.tsx \
  src/__tests__/components/SavedWorksheetActions.test.tsx \
  src/__tests__/components/PrivateLibrary.test.tsx

npm run type-check

npx eslint \
  src/components/unified/UnifiedWorkspace.tsx \
  src/__tests__/components/UnifiedWorkspace.access.test.tsx \
  src/__tests__/components/UnifiedWorkspace.actions.test.tsx \
  src/__tests__/components/UnifiedWorkspace.cart.test.tsx

npm run lint:affordance
git diff --check
```

테스트는 프로젝트의 Prisma 인메모리 대역과 네트워크 차단 설정을 사용했다. 실DB·실계정·개발 서버·브라우저 캡처·실물 인쇄는 수행하지 않았으며, 이번 자동 검증 결과로 그 범위까지 통과했다고 주장하지 않는다. 학생 앱·인쇄 지면·CSS 변경은 없다.
