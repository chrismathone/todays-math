# 범일 쌍둥이 분류 peer 감사 r1 — q05·q10·q18

검수자 `orca-codex-exam-twin-author-geometry-20261008`. **완전한 기존 live Unit/family 배정 지원0개, 보류3개**. 현재 다른 저자의 동결 문항만 감사했다. q10은 `author-r2 / review-r5`, q05/q18은 `author-r1 / review-r2`에 바인딩했다. 실제 Unit 정의의 적정성과 하나의 family가 새 전체 절차를 지원하는지는 분리했다.

| 문항 | 주 Unit reviewer 제안 | full family | 판정 |
| --- | --- | --- | --- |
| q05 | `03097b76-d9cb-4525-a520-b70c03a45c77` · 일반형 이차함수479 | null 유지 | 08은 y절편 높이, 새 문항은 꼭짓점 높이 |
| q10 | `0bf7d13f-6e7a-490d-bf0c-ba54a76e2e54` · 삼각비 활용483 | null 유지 | 표17/활용03 어느 것도 전체 눈높이+표+역거리 절차 없음 |
| q18 | `03097b76-d9cb-4525-a520-b70c03a45c77` · 일반형 이차함수479 | null 유지 | 한 점+계수합→꼭짓점→직선 절편 조합 없음 |

q10의 주 Unit은 관측 수평거리 복구라는 실제 풀이 목적에 따른 **sidecar 제안**이다. 표 Unit `3b9f9110-2b31-4ed7-a44f-f5d2e8a1f4e7`은 입력/선수 참조로 남긴다. 동결 candidate의 Unit/family null 및 모든 기존 review/solve는 바꾸지 않았다.

## 증거 시점과 연결

은행 snapshot은 **2026-10-08 00:57:15.290971 KST**, registry snapshot은 **01:08:32.171 KST**이다. 은행의 `sourceSnapshotAt=2026-10-03T14:02:44.800Z`는 별도 이전 출처 시점이며00:57 캡처와 혼동하지 않았다. 현재 DB 조회/확인은 없다. snapshot Unit UUID/자연키와 현재 Unit seed, semester/prefix를 정확하게 조인했다. 제공 live row는 `unit_id/family_key/live_count` 집계이며 개별 Problem UUID가 제공된 것으로 주장하지 않는다.

D:/todays-math, parent, own의 관련11개 source/seed/contract 파일은 byte 동일하다. 현행 `registeredTypes()`의 관련62개 행과 snapshot을 비교하고14개 관련 rule을 씨앗101/202/303/404로 실행했다. 새 출력은 deterministic rule probe이며 원래 시험 답/해설을 읽거나 재생성한 것이 아니다. 한정 씨앗 출력은 보조 근거이고 전체 branch의 조건/목표/해설 코드로 full match를 판정했다. Unit seed writer는 실행하지 않았다.

`bindCandidate`로 정확한 candidate+assetBindings, student, asset digest를 재계산했고 `digest(independentSolve)` 및 raw/canonical review hash를 바인딩했다. raw author candidate SHA는 index-r2와 같고, package 경로 변환 뒤 학생/자산 hash도 같다. 부모의 r2method-links는 q10만 읽어 source 높이 질문과 새 거리 질문의 역관계를 확인했다. source의 답 없는 본문과 참조 그림만 사용했다. 모든 선택된 frozen hash와 이전 내61개 자산/풀이/보고서의 byte 보존을 검사했다.

## q05 — Unit은 적정, 08 full family는 보류

새 답은 A(-1,0),B(3,0),C(1,-4)에서 밑변4·높이4·넓이8,④이다. 실제08은 C=(0,상수항)을 y절편으로 지정하고 `|상수항|`을 높이로 써 넓이를 구한다(`m3Func.ts:1660`). 새 식에08을 그대로 적용하면 C=(0,-3),높이3,넓이6으로 달라진다. 꼭짓점 C를 y절편 C로 바꾸는 것은 같은 rule의 수치 변형이 아니다.

02는 완전제곱/꼭짓점만,05는 두 x절편/밑변만,01은 표준형만 지원한다.19/21은 Unit480에서 움직이는 도형/넓이의 최대를 구하므로 새 고정 삼각형 기록의 대안이 아니다. 부분 substeps를 이어 붙인 family를 새로 만들지 않았다.

새 기본·4점 제안은 작은 정수 인수분해/완전제곱과 안내된 삼중항 출력 부담으로 검토할 수 있다. 현행08의 난이도는 심화하이고 실제 probe도 심화하였다. 현재 tier 규칙은 이를 기본으로 낮추지 않는다. 새 기본 난이도가08 rule에서 자동 상속됐다는 주장은 하지 않는다.08의 단일 넓이 output과 새 밑변/높이/넓이 triple 역시 구분했다.

재개하려면 두 x절편+꼭짓점의 고정 삼각형 전체 계산과 새 목표를 포함하는 **기존 등록/승인 branch**, exact key, Unit/live row 및 난이도/형식 근거가 필요하다. 현재08을 바꾸는 별도 과제를 완료한 것으로 간주하지 않는다.

## q10 — 활용 Unit reviewer 제안, full family는 보류

새 필수 순서는12.8−1.6=11.2, 표의tan58=1.6003 선택, AB=112000/16003,GE=AB, 한 자리 소수로7.0m 반올림,③이다. 현재 두70mm 그림도 실제로 확인했다. 눈높이/수평선/벽/지면을 연결한 관계도에서58°와B직각, A/G/B/E/C가 분명하다.

표17(`m3Trig.ts:1575`)은20~70° 표를 쓰지만 알려진 한 변을100cm로 두고 비를 곱해 다른 변을 구한다. tan branch는 AB→BC이며 새 반대 방향 BC→AB 나눗셈, 두 높이 차,GE 전달 및 한 자리 반올림이 없다. 활용03(`m3Trig.ts:1968`)은30/45/60°의 정확한 값으로 지면 관측 나무/사다리/연의 직접 길이를 구한다.58° 표/양의 눈높이/역거리 질문을 지원하지 않는다. 활용13은 두 위치·두 특수각으로 건물 높이를 찾으므로 대안이 아니다.

응용·4점은 비 선택과 높이 보정/역산/반올림 부담에 적정한 reviewer 제안이며17/03의 난이도 label도 응용이다. 이것으로 full family가 맞는 것은 아니다.17의 소수cm 스칼라와03의 정확한 근호m 길이 output을 새7.0m 객관식과 구분했다. 재개에는 H/h/표/거리 역산의 전체 branch와 exact live Unit/family 근거가 필요하다.

## q18 — Unit은 적정, 복합 family는 보류

점 조건3a+b=14와a+b=10으로a2,b8을 구하고, 완전제곱의 꼭짓점(1,6)을y=-2x+c에 대입하면c8,③이다. 해는 유일하고a≠0이다.02는 이미 알려진 수치 계수에서 꼭짓점을 계산하고10은 완전히 알려진 꼭짓점+한 점으로 이차함수 식을 구한다.11은 축+두 명시된 정수 좌표 점,12는 y절편을 포함한 세 점,13은 두 실수 x절편+다른 점을 준다. 새 함수2(x−1)²+6은 실수 x절편 자체가 없다.22T는 한 parameter의 두 근을 꼭짓점 사분면으로 가려내는데 새 문항에는 그 ambiguity/filter가 없다.

어느 rule도 한 점+계수합을 먼저 푼 뒤 꼭짓점의 직선 소속으로 **직선 절편 c**를 구하는 전체 순서를 지원하지 않는다. 기본 상단·객관식4점 및 활용 problemType는 reviewer 제안으로 남긴다.02의기본,10~13의응용,22T의심화중을 평균하거나 가까운 것으로 채택하지 않았다. 기존 식 구하기 output과 새c 숫자 목표를 구분했다. 재개에는 이 전체 조합을 지원하는 기존 exact branch의 Unit/live/형식 근거가 필요하다.

## 판정 경계와 산출물

프로젝트 [TypeSafe skill](../../../../.agents/skills/typesafe-ai/SKILL.md)과 live [설계 문서](https://docs.typesafe.ai/concepts/how-to-build-with-system-one), [분류 cookbook](https://docs.typesafe.ai/cookbooks/hierarchical_classification), [confidence 문서](https://docs.typesafe.ai/confidence)를 먼저 읽었다. code로 키/UUID 조인, source/hash, exact arithmetic을 수행하고 givens/target/full sequence 및 난이도/형식을 별도로 기록했다. nearest/fuzzy/confidence 배정, 만들어 낸 key/rule, model/API 추론 호출은 없다. 세 문항 모두 no-match/pending을 유지한다.

산출물은 [peer sidecars](../../../../.qa-artifacts/exam-resume-20261008/bumil-taxonomy-audit-r1/geometry-peer/AUDIT-NOTES.md)와 그 폴더의 q05/q10/q18.classification.json, input-bindings, repository/rule evidence, exact calculations, preservation manifest이다. 기존 independent review의 수학/교육과정 통과 차원은 덮어쓰지 않았고 새 blind solve를 주장하지 않는다. 부모가 별도 분류 제안을 집계한다. final approval, rights/native clearing, DB/load/apply/unlock/install/main/source/N/other-session 수정 및 push 없음. q07 hold와 다른 peer q11/q14/q15/q17/q20 범위는 그대로 유지한다.

Historical source/taxonomy snapshot bumil-twin-v2/metadata-review.json was read only for q05/q10/q18 and source external IDs/content hashes were matched exactly. Its selected proposals and source-only procedure plans are retained in source-taxonomy-links.json with a raw snapshot SHA. Pending legacy statuses and confidence hints do not approve current full-rule membership. For q10 the source-only method adds eye height; the current r2 method instead subtracts it and divides by tan.

The current raw MidProblem contract has no score or questionType field. Four-point MC appropriateness is therefore a separate authored-candidate reviewer proposal; it is not a handler-derived score/profile. Raw rule target/answer and declared difficulty were compared explicitly. No missing score field was filled as if it were measured evidence.

Owner update incorporated before this commit: parent bank-read-fresh-r2-20261008.json was captured at2026-10-08 04:53:45.769124+00 /13:53:45.769124 KST in read-only RepeatableRead. Exact comparison confirms22 Unit rows and all302 unit-family rows/counts identical to the retained00:57 snapshot. Parent scope records4 old exams,82 protected rows, unlocked0, identity/correction mismatches0 and productionWrites0. This is timestamped parent file evidence, not a new DB query by this peer; no previous frozen reference was replaced and the0-supported/3-held conclusion is unchanged. Addendum3 was read; parent continuation automation/gates were untouched. Owner-reported current20 proof59c827e42 and origin/main6ecf0ee99 integrated7e1e8080a with19 tests/all packs passing are recorded as parent-reported, not independently rerun by this peer.
