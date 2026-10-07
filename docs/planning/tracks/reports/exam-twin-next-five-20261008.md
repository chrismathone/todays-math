# 다음 5편 기출 쌍둥이 재개 준비 독립 감사 — 2026-10-08

경구·경산·경상·경신·경암 중3 2025-2 중간 수학을 읽기 전용으로 대조했다. 완료 HWP/PDF 5짝과 원본 스캔 19개 파일은 모두 존재한다. 현재 완료 PDF의 재추출 결과는 5편 모두 9월 `body.json`과 정확히 같으며, 기존 HWP 발문/보기 수식도 현재 HWP 내부에 전량 존재한다. **이는 참고 추출 재사용 근거이며, 전체 HWP/PDF 동등성·현재 DB 중복 없음·새 쌍둥이 검증 완료를 뜻하지 않는다. 검증된 쌍둥이는 0개다.**

작업 브랜치 `chrismathone/exam-twin-next-five-20261008`, 시작 HEAD `6b14920ed71baf770213bb1e6e9af8f80412bfe3`. 감사 JSON `.qa-artifacts/exam-resume-20261008/next-five-audit.json`의 SHA-256은 `42b62ec614258707ac8d8747c9784b103d34a6216842133aa1a627310024dcaf`다. 파일 원문 해시, 내부 기록/텍스트 해시, 175개 기존 산출물과 71개 그림의 경로/해시, 106문항의 교육과정 보류 행은 JSON에 있다. 부모만 이 기능 브랜치를 통합한다.

## 적용 지시와 완료 단계의 구분

부모의 최신 추가 지시서 `C:\Users\user\orca\workspaces\todays-math\exam-extraction-resume-20261008\docs\planning\tracks\brief-exam-extraction-resume-20261008-addendum-1.md`를 두 차례 갱신 후 다시 읽었다. 최종 SHA-256 `b530f1367ededa6f40e56e58641e5d7a9a3afe927b5e72788dd7cbfc61033eaa`. 최신 원 지시서 SHA-256 `076aeb1eb572fec4bd20fb07dbac15bc9c642cce1c0d363c99b9b0995eae584b`도 다시 읽었으며 추가 지시서를 최신 정본으로 지정한다. 인덱스의 옛 숫자 중심 문구보다 추가 지시서가 우선한다. 같은 개념·핵심 풀이법을 유지하면서 발문 구조·소재·대수↔기하 표현·직접 결과→입력/조건 역방향 질문을 바꾼다. 숫자/학교명만 바꾸거나 문장 순서만 뒤집은 결과는 충분한 변형으로 인정하지 않는다.

| 단계 | 이번 확인 | 해석/다음 관문 |
|---|---|---|
| 존재 | 완료 짝 5/5, 전체 29파일 | D-37 후보이며 내용 동등성 승인과 별개 |
| 기존 추출 | 5편 106문항, 초안 48, 옛 sol_ai 43 | 원문 참고 자료; 추출 파이프라인 완료/적재를 뜻하지 않음 |
| 내용 대응 | 현재 PDF 재추출 5/5 완전 객체 일치; HWP 수식 1062/1062 멤버십 일치 | 동일 위치·분수 의미·그림·배점까지 확정한 전수 동등성은 0편 |
| 학년·교육과정 | 2015 적용 시기·공식 기준 확인; 개별 106문항은 보류 | 본문부터 학생용 풀이·선수 개념까지 가장 먼저 검토 |
| 현재 DB 중복 | 접속/조회 0회, 확인 미완료 | 부모의 최신 범위 한정 읽기 결과와 연결 |
| 새 쌍둥이 | 제작 0 / 독립 검증 0 / 저장 0 | 새 ID·본문·그림·답/해설·메타데이터·검산 전량 필요 |

`readyForExtraction` 및 2026-10-03 스냅샷의 `existingExamIds=[]`·`existingQuestionCount=0`은 역사적 목록값이다. 현재 미적재/중복 없음이라는 판단에는 사용하지 않았다. 경산중과 경산여중은 다른 학교다. `drafts.directUseAllowed=true` 역시 과거 로컬 초안 값이며 현재 출제 허가가 아니다.

## 최우선 학년·적용 교육과정 관문

2022 개정은 중1 2025, 중2 2026, 중3 2027년 3월에 순차 적용된다. 2015 개정의 중3 시행은 2020년 3월이다. 이를 연결하면 **2025 중3 참고 시험의 적용 교육과정은 2015**다. 이후 2022로 재발행한다면 목표 교육과정을 따로 기록하고 다시 검토한다. 근거: [교육부 2022-33호 부칙](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0), [교육부 2015-74호·별책8](https://www.moe.go.kr/boardCnts/view.do?boardID=141&boardSeq=60747&lev=0&m=0404), [NCIC 적용 시기](https://ncic.re.kr/board/B0033.cs?act=read&bwrId=2100). 중학교 학년군 성취기준만으로 개별 학년/학기의 선수 학습까지 자동 승인하지 않는다.

교육부 공식 ZIP과 수학 PDF를 메모리에서 읽었고 원문 파일을 저장하지 않았다. 첨부 URL·ZIP/PDF SHA-256·페이지 근거는 JSON `officialMathematicsCurriculumDocument`에 보존했다. 아래 번호는 실제 PDF에서 확인한 후보 대응이며 문항별 매핑 확정값이 아니다.

| 실제 확인한 성취기준 | 개념 | 공식 PDF / 인쇄 쪽 | 로컬 연결 후보 |
|---|---|---|---|
| 9수03-09·10 | 이차함수와 그래프의 의미/성질 | 36 / 32 | 중3 4. 이차함수 |
| 9수04-17·18 | 삼각비의 뜻/값·활용 | 38 / 34 | 중3 5. 삼각비 |
| 9수04-19·20 | 현·접선·원주각 | 38 / 34 | 중3 6. 원의 성질 |
| 9수05-06·07 | 중앙값·최빈값·평균·분산·표준편차 | 40 / 36 | 중3 7. 통계 |
| 9수05-08 | 산점도와 상관관계 | 40 / 36 | 중3 7. 통계 |

공식 2015 문서 인쇄 35쪽/PDF 39쪽의 삼각비 관계·각도 범위·원과 비례 제한, 복잡한 도형 계산 및 과도한 형식 논증 제한을 함께 적용한다. 인쇄 33쪽/PDF 37쪽은 함수의 지나치게 복잡한 활용을 제한한다. 본문·보기(오답 포함)·그림/그래프/표 의미·표기·정답 형식·정답·학생용 해설·필수 풀이 절차·선수 개념을 각각 점검한다. 대상 학년의 정당한 풀이가 없거나 필수 개념/방법의 범위 위반이 확인되면 새 후보를 **제외(rejected)**한다. 적용/선수/합의 근거가 불명확하면 **보류(pending)**한다. 원본 학교 출제, 로컬 Unit 존재, 다른 학년 엔진, AI confidence, 정답 숫자 일치, 상위 학년 방식으로 푼 검산만으로 통과시키지 않는다.

연결은 **공식 원문 페이지/기준 → 실제 Unit/소단원 → live `(unitId, familyKey)` → 검토한 생성 규칙/버전 → 새 문항의 허용 풀이·선수 근거**로 남긴다. 이번 5편의 `exam.json.units`는 모두 비어 있어 live ID/family/rule을 만들어 적지 않았다. JSON의 106문항은 각 구성 요소와 교육과정 판정이 보류이며, 공식 후보 코드가 없는 경신 17문항도 불명으로 남겼다. `prisma/seed-data/units.ts`의 중3 최대·최소/상자그림 라벨은 2015 허용 근거를 대체하지 못한다.

대수식을 선분 AB의 길이·두 점 사이 거리·넓이로 나타낼 때 부호/정의역/양수 길이/좌표 위치/단위를 함께 대조한다. 선분과 길이의 수치를 구분하고, 음수 허용 변수를 양수 길이로 바꿔 동치로 처리하지 않는다. 역방향 예시 `M-m=R → m=M-R`는 `R≥0`, 실제 자료/정의역에서 M·m의 존재와 도달 가능성, 입력의 유일성을 검증해야 한다. 유한 자료의 범위와 함수의 최대·최소는 교육과정 검토가 다르다. 분모 0, 제곱/근호의 부호·무연근, 보기 중복, 자료 수, 단위, 목표 난이도/독해 부담을 새 조건에서 다시 확인한다. 이 관문은 엔진 규칙 및 벡터/이미지 템플릿의 후보 선택과 최종 채택에도 동일하게 적용한다.

## 편별 원본·기존 산출물·보류

| 시험 | 완료 PDF 쪽 | 기존 문항 / 초안 / sol_ai / 그림 | 기존 HWP 배점합 / PDF 배점합 | 증거 우선순위 / 제작 재개 순서 |
|---|---|---|---|---|
| 경구중 | 9 | 23 / 23 / 19 / 21 | 74 / 100 | P1 학년·소스 검토; 다른 관문 통과 후 1순위 |
| 경산중 | 7 | 25 / 25 / 24 / 13 | 100 / 97 | P1 학년·소스 검토; 다른 관문 통과 후 2순위 |
| 경상중 | 7 | 22 / 0 / 0 / 11 | 70 / 100 | P1 학년·소스 검토; 다른 관문 통과 후 4순위 |
| 경신중 | 7 | 17 / 0 / 0 / 17 | 45 / 95 | P0 연도/페이지 대응 보류; 제작 순서 미배정 |
| 경암중 | 7 | 19 / 0 / 0 / 9 | 65 / 100 | P1 학년·소스 검토; 다른 관문 통과 후 3순위 |

배점합 차이는 현행 원문 참고 추출의 parent/subquestion 처리 결함 후보다. 목표를 무조건 100점으로 맞추지 않는다. 아래 우선순위는 작업 준비 순서이며 즉시 제작/적재 가능 판정은 아니다.

### 경구중

- 인벤토리 ID: `personal-a8a023ad6060fb2937b8b09781b68857`. canonical key: `경구중|중3|중3|2025-2-중간`. 9월 ID: `2025-gyeonggu-3-2-mid`; 참고 번호 1–23.
- 완료 HWP: `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\워드\중3\[경구중][3][25-2-중간][신사고] (완료).hwp`
  SHA-256 `af607b1968659af53200e316ad523fd280eeb3300e9fba02319cd365821978b7` (2,228,224 bytes).
- 완료 PDF: `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\pdf\중3\[경구중][3][25-2-중간][신사고] (완료).PDF`
  SHA-256 `6ee96e82d07ff054292226199498629375eaca9a5d9236fa134f1d27d23ce821` (14,947,722 bytes).
- 기존 폴더: `C:\Users\user\orca\workspaces\todays-math\exam-twin-next-five-20261008\scripts\import\exam-paper\exams\2025-gyeonggu-3-2-mid`. `source_path.txt`는 완료 PDF 상대 경로와 일치한다. `answers/body/hwp_fixed/pieces/sol/figures`는 참고 추출·수식 수리·원본 그림 증거다.
- 현재 HWP ↔ 옛 발문/보기 수식: 205/205 정확 문자열 멤버십. 현재 PDF ↔ `body.json`: 전체 객체 동일. HWP/PDF 한글 토큰 교집합 347/364; 문항 승인 점수/확률이 아니다.
- Highest-priority grade/2015-curriculum whole-question and student-solution review remains pending; original source topic and local seed Unit are not approval evidence.
- Existing drafts (23) and sol_ai (19) are source references; no twins.
- q9 choices 4/5 fraction repairs in exam.json must be preserved in reference reading and revalidated against the page.
- HWP answer-extraction score sum 74 vs PDF body 100; q20-23 subquestion allocation is not the parent score.
- q20-23 answer/solution split repairs exist in bank-fix-review.json.
- 교육과정 위험 검토 9: Angle-bisector relationship: establish an allowed middle3 derivation rather than importing an unreviewed theorem.
- 교육과정 위험 검토 20: Quadrant/trig-expression relationships: compare actual intended geometric definition with 2015 limits.
- 교육과정 위험 검토 22: Legacy HWP vec notation on AP/AQ may denote rays; inspect rendered semantics before confusing it with vectors or approving a vector method.

기존 핵심 파일 SHA-256:

| 파일 | SHA-256 |
|---|---|
| `answers.json` | `f3db7d2731fad124e12c31c9677660c1f1943ccc5b6ea757383af864f52e16d1` |
| `body.json` | `6d5a79c1b7254bb420661b6afd3ff8f5cbb3f4ba597b426d5595fc6a9c5a60b8` |
| `drafts.json` | `595468f8082e336758595499363853864eaab68d9d8f1ac1fd3e064078523035` |
| `exam.json` | `1430db6c94be319d7023eb80f51cfff08e406494bb5680fd9cf7117ecc64e08a` |
| `figures/index.json` | `9acf660405be8c527f39a8f738a120a5cd768c9700dfbb1229bdc05359fd209b` |
| `solve-flags.json` | `f16d58f6776fae2cf414c9a3a36afa4afd4083e4d2163b5ef15ecf7801868707` |

같은 개념/풀이 유지 변형 방향은 검토 제안이며 새 문항이나 승인 결과가 아니다:

- 참고 문항 1, 3, 4, 5, 7, 9, 10, 20; 삼각비의 정의·각의 대응과 비의 비교 / 발문 구조: 그림에서 비의 값을 직접 고르는 발문을, 조건 카드의 빈 비율 또는 주장-근거 짝을 고르는 구조로 설계한다. 각·변 대응과 비교 절차는 유지한다.
- 참고 문항 2, 6, 8, 11, 12, 13, 21; 직각삼각형 삼각비를 이용한 길이·넓이 계산 / 발문 구조 또는 소재: 필요한 선분·각 조건을 별도 자료와 목표 도식으로 조직하고, 같은 계산 순서로 설계값을 판단하도록 바꾼다. 단순 숫자/학교명 치환은 부족하다.
- 참고 문항 14, 15, 16, 17, 18, 19, 22, 23; 현·접선과 원의 기본 성질 / 발문 구조/표현/질문 대상 변경: 길이를 직접 묻는 그림형 발문을 허용된 길이·접선 조건을 만족시키는 입력/조건 설계로 바꿀 수 있는지 검토한다. 원과 비례나 상위 학년 도구를 요구하면 채택하지 않는다.

### 경산중

- 인벤토리 ID: `personal-aa35a05fbaf41074c2ebcfcd6f16e876`. canonical key: `경산중|중3|중3|2025-2-중간`. 9월 ID: `2025-gyeongsan-3-2-mid`; 참고 번호 1–25.
- 완료 HWP: `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\워드\중3\[경산중][3][25-2-중간][동아강] (완료).hwp`
  SHA-256 `87990ec925d1ef8f19e7364099a8285a6d525d22facbc6bd8fe3e7804c600a98` (1,562,624 bytes).
- 완료 PDF: `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\pdf\중3\[경산중][3][25-2-중간][동아강] (완료).PDF`
  SHA-256 `2db4e2abc14cc8f1f2f044110d4c7fe3d79a70475711770c52f0526be9337553` (14,808,591 bytes).
- 기존 폴더: `C:\Users\user\orca\workspaces\todays-math\exam-twin-next-five-20261008\scripts\import\exam-paper\exams\2025-gyeongsan-3-2-mid`. `source_path.txt`는 완료 PDF 상대 경로와 일치한다. `answers/body/hwp_fixed/pieces/sol/figures`는 참고 추출·수식 수리·원본 그림 증거다.
- 현재 HWP ↔ 옛 발문/보기 수식: 222/222 정확 문자열 멤버십. 현재 PDF ↔ `body.json`: 전체 객체 동일. HWP/PDF 한글 토큰 교집합 394/408; 문항 승인 점수/확률이 아니다.
- Highest-priority grade/2015-curriculum whole-question and student-solution review remains pending; original source topic and local seed Unit are not approval evidence.
- Existing drafts (25) and sol_ai (24) are source references; no twins.
- solve-flags.json records q23: solver ② vs historical answer ①; do not resolve by adopting the key. Independently solve after confirming stem/figure.
- PDF body q13 has no score (body total 97); HWP reference gives 3 (total 100). Check printed score.
- 교육과정 위험 검토 1-12: Any changed function extrema/inverse-coefficient/geometry representation must have an allowed 2015 middle3 graph/algebra solution; source label and seed maximum/minimum section alone are insufficient.

기존 핵심 파일 SHA-256:

| 파일 | SHA-256 |
|---|---|
| `answers.json` | `1f9b3ffb0e04738da227d4aaa69670a4a83f5611262f08637f2422abf8ccbfef` |
| `body.json` | `45843eafdbe010f6b0850bb46b878b02a641a7402924f79cf4bcc469f96acd0c` |
| `drafts.json` | `a4b8b6e374f3d4e5d6f1516d4c5d2a53ac7ac30afeed9b6512e19f63a462030a` |
| `exam.json` | `a054100aa027438fe1d6720476a446b2643f9c5b09b4eda7c9a0e6e85183da40` |
| `figures/index.json` | `e686743d919c90c8b5f88fe1659b152f22eb839cab4b29e0e62813b20a33ac25` |
| `solve-flags.json` | `3c4092b14ce7335de44248042338a6f6b9819b55dd6b9fcd4b0dac5a833ac67e` |

같은 개념/풀이 유지 변형 방향은 검토 제안이며 새 문항이나 승인 결과가 아니다:

- 참고 문항 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12; 이차함수의 그래프·평행이동·계수와 교점의 관계 / 발문 구조: 함수식을 먼저 제시해 성질을 묻는 형식을 그래프 설계 조건/비교 자료로 바꾸고 알맞은 설명·계수 관계를 판단하게 한다. 역문제 전환으로 풀이 난도가 달라지면 채택하지 않는다.
- 참고 문항 23; 원문 q23의 삼각비 관계와 핵심 풀이 — 독립 원문 재검토 후 확정 / 보류 후 발문 구조/소재 선택: 옛 정답 불일치와 그림 조건을 먼저 해결한다. 확인 전 원문 정답 또는 의미를 기준으로 새 문제를 만들지 않는다.

### 경상중

- 인벤토리 ID: `personal-5ac2088d148a02d086d0ce69d38aa646`. canonical key: `경상중|중3|중3|2025-2-중간`. 9월 ID: `2025-gyeongsang-3-2-mid`; 참고 번호 1–22.
- 완료 HWP: `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\워드\중3\[경상중][3][25-2-중간][동아강] (완료).hwp`
  SHA-256 `bc0bb8c93f2e246b234c80c7fb89fcbdf8eda24536435e2fbe551ad916c1d4a1` (1,635,840 bytes).
- 완료 PDF: `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\pdf\중3\[경상중][3][25-2-중간][동아강] (완료).PDF`
  SHA-256 `08917520000308226e93d261861ee419d2cc0b3b61658271e78462da12da8af4` (14,846,744 bytes).
- 기존 폴더: `C:\Users\user\orca\workspaces\todays-math\exam-twin-next-five-20261008\scripts\import\exam-paper\exams\2025-gyeongsang-3-2-mid`. `source_path.txt`는 완료 PDF 상대 경로와 일치한다. `answers/body/hwp_fixed/pieces/sol/figures`는 참고 추출·수식 수리·원본 그림 증거다.
- 현재 HWP ↔ 옛 발문/보기 수식: 240/240 정확 문자열 멤버십. 현재 PDF ↔ `body.json`: 전체 객체 동일. HWP/PDF 한글 토큰 교집합 406/414; 문항 승인 점수/확률이 아니다.
- Highest-priority grade/2015-curriculum whole-question and student-solution review remains pending; original source topic and local seed Unit are not approval evidence.
- No drafts.json, classify.md, sol_ai, load ledger or regeneration result found in this audited worktree folder.
- exam.json declares tables q12/13/15/22 but figures/index.json has no table-kind entries at those numbers. Reconcile before drafting.
- HWP extraction q19-22 lacks parent scores (sum 70), PDF body gives 8/8/8/6 (sum 100).
- 교육과정 위험 검토 all transformed stats/trig questions: New inverse/geometry expression must retain data counts/units and a permitted method; do not add high-school trig or unreviewed statistical notation.

기존 핵심 파일 SHA-256:

| 파일 | SHA-256 |
|---|---|
| `answers.json` | `039494ab267bc4e025e2865df4f98b7cd90a361037e244991bd66e3ee96fc80e` |
| `body.json` | `bd135007d464e747740a3d6250779965c3dca8621a3883b0e90ee7178a423710` |
| `exam.json` | `7a310b64d44fe72349a3c0b5775b041ce9147b1dd70d5b81a2ac4c1473e02ded` |
| `figures/index.json` | `6256568e3aaaef22c141e6aaee0c60366af573c8e44f0ee4aff04d7db9054a5e` |

같은 개념/풀이 유지 변형 방향은 검토 제안이며 새 문항이나 승인 결과가 아니다:

- 참고 문항 12, 13, 15, 22; 대푯값·산포도의 자료 조직과 계산 — 문항별 확인 필요 / 자료 제시 구조 또는 소재: 표에서 필요한 자료를 읽는 절차는 유지하되 새 상황에 맞는 자료 카드/표 구성을 만든다. 줄기·잎/도수/원자료 여부와 자료 수를 먼저 복원한다.
- 참고 문항 1, 2, 3, 4, 5, 6, 7, 8, 9, 20, 16, 17, 18, 19, 21; 삼각비에 따른 각·변 관계 — 문항별 범위 확인 필요 / 발문 구조: 원문의 그림+단문 질의를 조건·목표를 분리한 수학 자료형 발문으로 바꾼다. 모든 새 도형 관계를 수치 데이터로 검증한다.

### 경신중

- 인벤토리 ID: `personal-57fc57dc583e9f120f45ebc6abedfee4`. canonical key: `경신중|중3|중3|2025-2-중간`. 9월 ID: `2025-gyeongsin-3-2-mid`; 참고 번호 1–17.
- 완료 HWP: `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\워드\중3\[경신중][3][25-2-중간][미래엔] (완료).hwp`
  SHA-256 `f1e37fcda20e7021fbf1d4ab331ea6d131e4ffe9e844a455c0bd1f9a3f825156` (820,224 bytes).
- 완료 PDF: `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\pdf\중3\[경신중][3][25-2-중간][미래엔] (완료).PDF`
  SHA-256 `52672e8a1c386dd3d26180f6cd846a650bbc084ef6cbda99d7fdaabae279d12f` (22,372,459 bytes).
- 기존 폴더: `C:\Users\user\orca\workspaces\todays-math\exam-twin-next-five-20261008\scripts\import\exam-paper\exams\2025-gyeongsin-3-2-mid`. `source_path.txt`는 완료 PDF 상대 경로와 일치한다. `answers/body/hwp_fixed/pieces/sol/figures`는 참고 추출·수식 수리·원본 그림 증거다.
- 현재 HWP ↔ 옛 발문/보기 수식: 207/207 정확 문자열 멤버십. 현재 PDF ↔ `body.json`: 전체 객체 동일. HWP/PDF 한글 토큰 교집합 325/332; 문항 승인 점수/확률이 아니다.
- Highest-priority grade/2015-curriculum whole-question and student-solution review remains pending; original source topic and local seed Unit are not approval evidence.
- HOLD year provenance: completed PDF p1 says 2025; p2-7 say 2024. HWP has both; 2026 preparation footer is separate evidence.
- One original scan (삼동), p1 top, visibly prints 2025.09.19.(금요일). This supports the nominal source date but does not settle every page/question correspondence.
- PDF body score total is 95. Confirm parent/subquestion coverage and missing five points; do not force 100.
- All 17 topics and 16/17 difficulty labels missing in answers.json; no live unit/family assignment.
- No drafts/classify/sol_ai found. Resolve identity before twin production; do not silently treat the paper as eligible 2025 or exclude it permanently as 2024.
- 교육과정 위험 검토 3: Tangent/secant length arrangement may invite a circle-proportion/power-of-point shortcut; source statement alone is insufficient. Require target-grade permissible derivation or reject the new candidate if none exists.
- 교육과정 위험 검토 all 17: Missing topic metadata, mixed year headers and circle geometry: establish item-specific official concept/prerequisite map before any variation.

기존 핵심 파일 SHA-256:

| 파일 | SHA-256 |
|---|---|
| `answers.json` | `98ab0d158dc32fcea3b92009740b14d8328d3e62ec7a011d6d8641593d6e4d27` |
| `body.json` | `ba3f6fe4461186c830842c20f621ddf68ae8bb6066100ae4d36884913e02b19c` |
| `exam.json` | `28c82d94a45b2467152213edc19eb1004581bb86ea8bc7116aa8b5caa0e891da` |
| `figures/index.json` | `351c74fccf0473034c81187c93978decb0c6d87fd76829febbd0e2532c92e8ae` |

같은 개념/풀이 유지 변형 방향은 검토 제안이며 새 문항이나 승인 결과가 아니다:

- 참고 문항 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17; 원의 현·접선·원주각 관련 관계 — 교육과정/단원 확정 전 제안 / 연도 해결 전 보류: 같은 현/접선/각 관계를 쓰는 조건 순서·묻는 대상/자료 배치의 변경을 설계할 수 있으나, 2025 원본 문항 대응과 배점 확인 전 제작하지 않는다. 순수 기하에 부자연스러운 생활 소재를 강제하지 않는다.

메모리에서 완료 PDF 1·2쪽 머리말과 원본 `(삼동)` 1쪽 상단을 렌더해 확인했다. 2025/2024 표기는 화면에서도 보이며 원본 날짜는 2025.09.19.(금요일)이다. 이를 단순 오타로 확정하거나 원본 사진의 날짜만으로 완료본 전체가 2025라고 확정하지 않는다. 원본 스캔 12개 중 `(데부)`, `(데부) (1)`, `(데부) (2)`는 SHA-256이 같아 **바이트 동일 파일** 그룹이다. 다른 스캔과 완료본의 전량 대응은 보류이며 삭제하지 않았다.

### 경암중

- 인벤토리 ID: `personal-5eb35ea19488aaf195e724ed05fe8806`. canonical key: `경암중|중3|중3|2025-2-중간`. 9월 ID: `2025-gyeongam-3-2-mid`; 참고 번호 1–19.
- 완료 HWP: `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\워드\중3\[경암중][3][25-2-중간][신사고] (완료).hwp`
  SHA-256 `fd369f81b28459519d4d2d6dd9fafb54e0545d44b83260a906d498433b385dad` (1,198,080 bytes).
- 완료 PDF: `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\pdf\중3\[경암중][3][25-2-중간][신사고] (완료).PDF`
  SHA-256 `9b1de5d1d8fc0bcea9f2c6555da3720a4089289ab53f712929f9065563d0baca` (14,895,501 bytes).
- 기존 폴더: `C:\Users\user\orca\workspaces\todays-math\exam-twin-next-five-20261008\scripts\import\exam-paper\exams\2025-gyeongam-3-2-mid`. `source_path.txt`는 완료 PDF 상대 경로와 일치한다. `answers/body/hwp_fixed/pieces/sol/figures`는 참고 추출·수식 수리·원본 그림 증거다.
- 현재 HWP ↔ 옛 발문/보기 수식: 188/188 정확 문자열 멤버십. 현재 PDF ↔ `body.json`: 전체 객체 동일. HWP/PDF 한글 토큰 교집합 449/457; 문항 승인 점수/확률이 아니다.
- Highest-priority grade/2015-curriculum whole-question and student-solution review remains pending; original source topic and local seed Unit are not approval evidence.
- No drafts/classify/sol_ai/load ledger/regeneration result found.
- Preserve q10 90^{}°→90° reference repair and q19 overline/mathrm acceptFix evidence.
- HWP score sum 65 vs PDF 100; q16/18/19 missing parents and q17 HWP 5 vs PDF 10. Check subquestion totals.
- 교육과정 위험 검토 15: Radicals of sin/cos expressions require sign/domain checks and review against the 2015 restriction on trig relationships; correct answer alone cannot approve the student method.

기존 핵심 파일 SHA-256:

| 파일 | SHA-256 |
|---|---|
| `answers.json` | `2265654ffe0ccbff1d0147bd3495304d395021a6ce16e9d11885e1ca5132bd99` |
| `body.json` | `22ae8876a10ea6431657cebdcc6f8397a939b012dbf7fc34eafc9b1b6afe0933` |
| `exam.json` | `0167aff13d9c0e289a9bd12f033a6be8a3a05f1209d282512dabe26c377e90a4` |
| `figures/index.json` | `f10db58ad99fadbbfdc1bc72ee7c08b6419ca66e4e0671c5c6916bbad93ea0c2` |

같은 개념/풀이 유지 변형 방향은 검토 제안이며 새 문항이나 승인 결과가 아니다:

- 참고 문항 1, 2, 3, 4, 5, 6, 7, 8, 16, 17, 9; 대푯값·산포도·상관관계의 자료 읽기/계산 / 소재+자료 제시 구조: 음료 선호 조사나 원자료 상황을 새 자연스러운 관측 상황으로 전환하고, 관측 단위·자료 수·표/산점도 조직을 새로 정한다. 같은 통계 개념과 계산 절차를 유지한다.
- 참고 문항 10, 11, 12, 14, 13, 15, 18, 19; 삼각비와 도형의 길이/넓이 관계 / 발문 구조: 필요한 각·길이의 조건을 도식과 자료 카드로 다시 조직한다. 새 질문이 추가 선수 개념을 요구하면 원문 핵심 풀이에 맞게 수정한다.

## 재사용할 참고 단계와 새로 만들어야 할 산출물

| 단계/자산 | 재사용할 것 | 새로 필요하거나 보류할 것 |
|---|---|---|
| 소스 선택/신원 | 완료 짝 경로·해시·기존 source_path, HWP 내부 글/수식, 기존 PDF body | 경신 연도 충돌 및 스캔별 문항 대응; 파일명만으로 내용 병합 금지 |
| 원문 참고 추출 | 기존 answers/body/pieces/hwp_fixed·손 수리·그림 색인, 현재 바이트 연결 | 수식/소문항 경계/보기/배점/표 값/개인정보·연구회 꼬리말 전수 확인 |
| 쌍둥이 본문 | 같은 평가 개념·교육과정·핵심 풀이를 이해하는 참고 | 별도 ID/해시로 구조·소재·표현·질문 대상 변경; 실제 변경표와 난이도/자연스러움 근거 |
| 도형·표·산점도·이미지 | 원본 그림은 조건 파악 증거; 기존 엔진/spec/render/sanitize 경로 | 71개 참고 그림을 완성품으로 재사용하지 않음. 필요한 모든 새 그림/표/데이터/스펙·라벨·인쇄 크기 검수; 코드 곤란 이미지에는 내장 imagegen 제작과 검수 기록 |
| 답·학생용 해설 | 옛 답/풀이/sol_ai/불일치 플래그는 대조 기록 | 변형된 본문/도형 기준 전량 새 풀이·독립 검산; 정답을 감춘 풀이자와 분리된 검수, 실제 학년 허용 풀이 |
| 문항 메타데이터 | 현재 source/origin/problem/family/figure 계약과 provenance 필드 | 실제/목표 교육과정·근거·live Unit/family·type/format/difficulty/배점·새 ID/버전·학교 치환·그림해시·학년/수학/권리 검수·보류 |
| 중복/적재/생성기 | 서로 다른 historical/inventory IDs 및 필터 계약을 조회 키로 | 부모 scoped bank read 이후 판단; twin은 original externalId/problemCode와 분리, 없는 originProblemId 금지; 생성 규칙/템플릿 개선은 별도 후속 구현 |

`REGENERATION.md`의 prepare→독립 풀이→verify-pack→독립 검수→collect/check는 재사용할 검증 절차 참고다. 기존 21개 범일중 검증, 43개 sol_ai, 기존 답 일치 또는 파일 해시는 새 쌍둥이 통과 기록으로 복사하지 않는다. prepare/build/convert를 기존 폴더에 재실행하지 않았다. `load-exam-paper.ts`의 past_exam/원본 그림 적재 경로 또는 `--regenerate-all`만으로 최신 요구가 충족되지 않는다.

`src/lib/ai/prompts/transform.ts`는 현재 numbers/conditions 모드와 원본 재현값을 요청한다. `TransformPromptInput`에는 실제 학년/적용 교육과정/공식 기준/선수 근거가 없다. `src/lib/ai/transformer.ts`는 분류·출처를 저장 시점 원본에서 상속한다고 설명한다. 이를 새 독립 원문 참고 배치에 그대로 쓰면 새 학년 관문·메타데이터·출처 없는 origin·답 검증 요구가 빠질 수 있다. `solver_rules.json`과 제품 렌더러는 유지할 가드지만 전체 학년 허용 근거는 아니다. engine/image 템플릿별 공식 근거·rule version과 부호/정의역/역문제의 존재·유일성 검증 연결을 후속 구현해야 한다. 이번 감사에서 엔진 수정이나 AI/TypeSafe 호출을 수행하지 않았다.

## 별도 원본 스캔 경로·해시

완료본이 존재하므로 아래는 D-37의 제작 입력을 바꾸는 근거가 아니라 연도/문항 대응의 참조다. 첫 쪽 텍스트층은 전부 0자였고, `(삼동)` 날짜 표본 외의 내용·연도·동등성은 확정하지 않았다. 모든 파일을 보존했다.

| 시험 | 경로 | SHA-256 | 쪽 |
|---|---|---|---|
| 경구중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\[경구중][3][25-2-중간](원본+답)(어수마러).pdf` | `4fd0826f8630ac82b8d54cf3730b715fcb23d7af760a3173657b5ddee4ddbc4d` | 6 |
| 경구중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\중3\[경구중][3][25-2-중간](원본)(마쑤).pdf` | `b411899a7ccab9196d3832f8fe827b6a692798abe8dff23c86209a6f3b967ba6` | 4 |
| 경구중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\중3\[경구중][3][25-2-중간](원본)(준희T).pdf` | `dfb546f163728fc59e84d5a6357e5a7a9385d0b68fe26b82ab639dea8ba182a4` | 4 |
| 경산중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\[경산중][3][25-2-중간] (원본) (밍코).pdf` | `baf527452728fecc0a35ec591f71a7ec61028acd5bd79edbc28dd3b9884391a7` | 4 |
| 경산중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\[경산중][3][25-2-중간](원본)(맥스).pdf` | `e13a4c7da5ae380a272355e11ee745aed660348beb2a3c6f943c3f2481f22973` | 4 |
| 경상중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\[경상중][3][25-2-중간](원본)(어수마러).pdf` | `9be13943d8db86b682657b7a6976f4b2f7664500dfb37c1907be87a583d9c107` | 4 |
| 경신중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\[경신중][3][25-2-중간](원본)(삼동).pdf` | `67f123357be4642fed8bee980efb12d807320d5b1c1a2f6981d0856556b467db` | 5 |
| 경신중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\[경신중][3][25-2-중간](원본+답안)(H).pdf` | `20548b51ae6bfea33f580b4cf8934889d5be5bf48e5491aa84d58ce792b5f5c9` | 6 |
| 경신중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\중3\[경신중][3] [25-2-중간](원본) (열정남).pdf` | `75405ef9790e5419f97bfcbb7071552cc259312d485c91bdaa1054535b7d3b0c` | 5 |
| 경신중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\중3\[경신중][3][25-2-중간] (원본) (데부) (1).pdf` | `5730290da1d00c34f3f49b25735d946a840c93ce26c6f5ca120f71c82913dffd` | 6 |
| 경신중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\중3\[경신중][3][25-2-중간] (원본) (데부) (2).pdf` | `5730290da1d00c34f3f49b25735d946a840c93ce26c6f5ca120f71c82913dffd` | 6 |
| 경신중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\중3\[경신중][3][25-2-중간] (원본) (데부).pdf` | `5730290da1d00c34f3f49b25735d946a840c93ce26c6f5ca120f71c82913dffd` | 6 |
| 경신중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\중3\[경신중][3][25-2-중간] (원본) (뿌라스).pdf` | `b53b549cbccaad11571c5334f0dfc7e975e6a237b686d28318e6df65fac7d70f` | 8 |
| 경신중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\중3\[경신중][3][25-2-중간] (원본) (오티스).pdf` | `1730b9b4261a9bfcb842244870e8357126913e4be8c3c43e1369bb83b98f6198` | 5 |
| 경신중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\중3\[경신중][3][25-2-중간](원본)(마쑤).pdf` | `ede3dd4aeae45b9e2e8f2060ce93edb14afc2f7d81baf0ba705b1f5d6619d638` | 8 |
| 경신중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\중3\[경신중][3][25-2-중간](원본)(멍문대).pdf` | `fe4c16012accfd7af43aa1607cd23155a0a8601f6738034ff0303ac49a66248b` | 6 |
| 경신중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\중3\[경신중][3][25-2-중간](원본)(인사하는).pdf` | `ddc1385fc2be7c9d7d0da2d13c465d062f7ddd3bc7f148103bd2caa7f5facef0` | 8 |
| 경신중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\중3\[경신중][3][25-2-중간](원본)(초롱초롱무지).pdf` | `20791613da76926b7c2f6f993fffe78ad72067003cadc703a97dd056444384bc` | 5 |
| 경암중 | `N:\개인\기출\2025 기출모음\2025년 2학기 중간고사 모음\원본\[경암중][3][25-2-중간] (원본) (쭌쭌).pdf` | `28de3f9332a73998eff599dccd77871ce5951c77ba68bcb78ef00ce14a6bac85` | 4 |

## 세 원장과 경산여 19번 보존

| 원장 | 행 | 현재 worktree SHA-256 | 옛 보존 사본 SHA-256 |
|---|---|---|---|
| `scripts/qa/reports/refresh-engine-content/exam-hold-pilot81-20261003.json` | 81 | `fefc5a7a9dfda0a93324ad07b7a0e6b4b714f37671008c98f27c75ac432f6f9f` | `c41bdd6fe3fb2490e4d50052454931c70ec1c31319125f3f7ab20a070ef051f5` |
| `scripts/qa/reports/refresh-engine-content/exam-lock-gyeongsanyeo19-20261003.json` | 1 | `5f2f125164784ebc7818e6845283f2136b5145a9597bf68f9fa26f90177589f8` | `631847eafffbde75b8a8bdd086ddb590f94d794f6102153b4849943200b70d39` |
| `scripts/qa/reports/refresh-engine-content/exam-draft-review-bank-decide-20261003.json` | 2 | `f3b8f3bbd3426933dfc88baa28d4658830176fb871fc5c7badaf40d5f080a105` | `425f83150834a0882134b10f6e3a046414127a209823f2db7ed85490ce16b276` |

세 원장은 현재 파일과 10-04 보존 사본이 JSON 의미상 동일하고, 줄바꿈을 정규화한 텍스트도 동일하다. 원시 SHA 차이는 줄바꿈 표현 차이이며 이 감사에서 변경하지 않았다. 81행 hold, 경산여중 19번 영구 제외, 동도16 분모 보정·강동17 퍼센트 이스케이프 보정을 함께 유지한다. `scripts/import/exam-paper/exams/2025-gyeongsanyeo-3-2-mid/exam.json`의 `excludeFromLoad[19]`를 확인했다. 원장의 `before=true`를 잠금 해제/재적재 기본값으로 사용하지 않는다. 현재 DB 상태에 관한 주장은 하지 않는다.

## 증거 한계·부모 인계·검증

HWP는 OLE FileHeader, PrvText, 압축된 BodyText 기록과 기존 수식 문자열을 읽었고 변환/COM/한글 앱을 실행하지 않았다. PrvText는 1022자여서 전체 내용 증거로 사용하지 않았다. 한글 토큰 비교는 헤더/답쪽도 포함하는 전역 멀티셋이며, 수식 비교도 위치·빈도·그래픽 의미가 빠진 전역 멤버십이다. PDF 추출 객체 일치는 옛 parser 결과의 재현성을 입증하지만 parser가 분수·호·표 값을 올바르게 읽었다는 독립 검증은 아니다. PDF 학교 머리말의 KG/KSAD/KSA/KSI/KYA 약칭과 HWP 실명 차이는 기록했고 실제 출처 학교를 가상 치환명과 혼동하지 않았다.

기존 Oct03 외부 `processing/`에서 찾은 것은 범일중 표본 한 폴더다. 이 감사의 5개 로컬 폴더에는 src/HWPX/batch-state/log/load ledger/regeneration result가 없었다. 다른 컴퓨터나 세션에도 없다고 일반화하지 않는다. 각 기존 파일의 경로/해시를 재사용 기준으로 삼고, 증거가 불충분하면 기존 산출물을 보존한 별도 작업 사본에서 후속 검토한다.

부모가 할 일: 최신 scoped bank read와 이 보고서의 sourceFile/canonical/legacy/inventory/externalId 키를 연결하고, 먼저 학년/2015 근거·허용 풀이·선수 개념을 확정한다. 경신은 P0 연도/페이지 대응, 경산23은 답 불일치, 경상은 표 네 개, 각 편은 배점/소문항/그림을 해결한다. 다른 관문 통과 시 경구→경산→경암→경상 순으로 새 구조/표현/역방향 후보를 제작할 수 있다. 경신 순서는 신원 해결 후 지정한다. 새 문항별 curriculum/mathematical/figure/metadata/rights 검수를 각각 연결하고, 확정되지 않은 항목은 보류한다.

29개 원본, 175개 기존 폴더 파일, 입력 문서/목록, 세 원장과 보존 사본을 읽은 해시로 다시 대조했다. 공식 문서 번호는 실제 첨부 PDF에서 확인했다. 현재 DB 접속, 쓰기/apply/unlock/delete/reload/deploy/push, 원본 변환/desktop control, 설치/prisma generate, 유료 호출, 다른 세션 수정/worker 생성은 없었다. 커밋 대상은 이 보고서와 감사 JSON 두 파일뿐이다. 모든 학년 관문/새 제작 검증은 아직 pending이며 **verified twins = 0**이다.
