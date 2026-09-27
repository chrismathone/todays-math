# 개념원리 중학 3-1 ↔ 탐험 개념 카드 (학년 9)

> 카드: `src/lib/math-explorers/definition-cards.ts` `definitionCards` (제품 모듈을 불러 꺼냄). 짝: `scripts/qa/concept-terms/explorer-midb.tsv`.
> match — exact(같은 용어) · alias(같은 개념 다른 이름) · related(더 넓게/좁게, 다른 말로) · none.

## 교재 용어 중 탐험에 있는 비율

| 갈래 | 용어 | exact | alias | related | none | 탐험에 있음(exact+alias) | 넓게(+related) |
|---|---:|---:|---:|---:|---:|---:|---:|
| 정의 | 29 | 11 | 1 | 1 | 16 | 12 (41%) | 13 (44%) |
| 성질 | 19 | 0 | 3 | 6 | 10 | 3 (15%) | 9 (47%) |
| 공식 | 19 | 3 | 2 | 4 | 10 | 5 (26%) | 9 (47%) |
| 법칙 | 1 | 1 | 0 | 0 | 0 | 1 (100%) | 1 (100%) |
| 기호 | 3 | 1 | 0 | 1 | 1 | 1 (33%) | 2 (66%) |
| 기타 | 8 | 0 | 0 | 3 | 5 | 0 (0%) | 3 (37%) |
| 합계 | 79 | 16 | 6 | 15 | 42 | 22 (27%) | 37 (46%) |

## 탐험 카드마다 — 교재에 대응 용어가 있나

이 권이 맡는 탐험 단원의 카드 **20장 중 20장**(100%)이 이 권 또는 이 트랙의 다른 권에 대응 용어가 있다.

| 카드 | 단원 | 카드 정의 | 대응 용어(권 · 짝 · PDF쪽) |
|---|---|---|---|
| 제곱근 (`g9-square-root`) | g9-real | 제곱하여 a가 되는 수를 a의 제곱근이라 하며 양수의 제곱근은 서로 부호가 반대인 두 개이다. | 3-1 «제곱근» exact p13; 3-1 «제곱근의 개수» related p13 |
| 근호 (`g9-root-symbol`) | g9-real | a가 0 이상일 때 √a는 a의 음이 아닌 제곱근을 나타낸다. | 3-1 «근호» exact p13; 3-1 «제곱근 a» related p13; 3-1 «양의 제곱근» related p13 |
| 무리수 (`g9-irrational`) | g9-real | 두 정수의 비인 분수로 나타낼 수 없는 수이며 소수로 나타내면 순환하지 않는 무한소수이다. | 3-1 «무리수» exact p25 |
| 실수 (`g9-real-number`) | g9-real | 유리수와 무리수를 통틀어 이르는 수. | 3-1 «실수» exact p25 |
| 제곱의 제곱근 (`g9-root-square`) | g9-real | 실수 a에 대하여 √(a²)은 a의 절댓값이며 항상 0 이상이다. | 3-1 «√a²의 성질» alias p18 |
| 다항식의 곱셈 (`g9-polynomial-multiply`) | g9-polynomial | 분배법칙으로 각 항을 곱한 뒤 동류항끼리 정리하는 계산. | 3-1 «다항식의 곱셈» exact p65 |
| 합의 제곱 공식 (`g9-square-formula`) | g9-polynomial | (a+b)²을 전개하면 a²+2ab+b²이고 가운데 항은 2ab이다. | 3-1 «합의 제곱» alias p65; 3-1 «차의 제곱» related p65; 3-1 «곱셈 공식» related p74 |
| 합과 차의 곱 (`g9-difference-squares`) | g9-polynomial | (a+b)(a−b)는 a²−b²이고 서로 반대인 두 ab 항은 합해서 0이 된다. | 3-1 «합과 차의 곱» exact p65; 3-1 «곱셈 공식» related p74; 3-1 «a²−b²의 인수분해» related p87 |
| 인수분해 (`g9-factorization`) | g9-polynomial | 하나의 다항식을 두 개 이상의 다항식의 곱으로 나타내는 것이며 전개와 반대 방향이다. | 3-1 «인수분해» exact p87 |
| 공통인수 묶기 (`g9-common-factor`) | g9-polynomial | 모든 항에 공통으로 곱해진 인수를 찾아 분배법칙을 거꾸로 적용해 묶는 것. | 3-1 «공통인 인수로 묶어 내기» alias p87 |
| 이차방정식 (`g9-quadratic-equation`) | g9-equation | 모든 항을 한쪽으로 옮겨 정리하면 ax²+bx+c=0 꼴이고 a ≠ 0인 방정식. | 3-1 «이차방정식» exact p113 |
| 곱이 0인 성질 (`g9-zero-product`) | g9-equation | 두 수 A, B에 대하여 AB=0이면 A=0 또는 B=0이며 두 수가 모두 0일 필요는 없다. | 3-1 «AB=0의 성질» alias p118; 3-1 «인수분해를 이용한 이차방정식의 풀이» related p118 |
| 이차방정식의 해 (`g9-equation-root`) | g9-equation | 이차방정식에 대입하여 등식을 참이 되게 하는 미지수의 값으로 방정식의 근이라고도 한다. | 3-1 «이차방정식의 해» exact p113 |
| 중근 (`g9-double-root`) | g9-equation | 이차방정식에서 서로 같은 두 근을 가질 때의 근으로 서로 다른 해는 한 개이고 (x−a)²=0의 해는 a이다. | 3-1 «중근» exact p118; 3-1 «이차방정식이 중근을 가질 조건» related p118 |
| 근의 공식 (`g9-root-formula`) | g9-equation | ax²+bx+c=0에서 a≠0이고 b²−4ac≥0이면 해는 x = (−b ± √(b²−4ac))/(2a)이며 분모는 2a이다. | 3-1 «근의 공식» exact p139; 3-1 «x의 계수가 짝수인 이차방정식의 근의 공식» related p139 |
| 이차함수 (`g9-quadratic-function`) | g9-function | y=ax²+bx+c 꼴로 나타나는 함수이며 a ≠ 0이고 x에 대한 이차식이다. | 3-1 «이차함수» exact p165 |
| 포물선 (`g9-parabola`) | g9-function | 이차함수 그래프처럼 한 축에 대하여 대칭인 곡선으로 a>0이면 위로 열린다. | 3-1 «이차함수 y=x²의 그래프» related p165; 3-1 «포물선» exact p166; 3-1 «이차함수 y=ax²의 그래프의 성질» related p166; 3-1 «아래로 볼록» related p166 |
| 꼭짓점 (`g9-vertex`) | g9-function | y=a(x−p)²+q 그래프에서 방향이 바뀌는 점의 좌표는 (p, q)이며 대칭축 위에 있다. | 3-1 «꼭짓점» exact p166 |
| 이차함수의 축 (`g9-axis`) | g9-function | y=a(x−p)²+q 그래프의 대칭축은 직선 x=p이며 꼭짓점을 지나는 수직선이다. | 3-1 «축» alias p166; 3-1 «축의 방정식» related p173 |
| 이차함수의 평행이동 (`g9-translation`) | g9-function | y=ax²의 그래프를 x축 방향으로 p, y축 방향으로 q만큼 옮기면 y=a(x−p)²+q이고 모양은 그대로이다. | 3-1 «이차함수 y=ax²+q의 그래프» related p173; 3-1 «이차함수 y=a(x−p)²의 그래프» related p173; 3-1 «이차함수 y=a(x−p)²+q의 그래프» alias p179 |

### 같은 학년의 다른 권 소관 카드 (15장)

이 권이 맡지 않는 단원의 카드 — 이 트랙의 다른 권(3-1 · 3-2) 또는 다른 트랙(2-1)이 맡는다. 이 트랙 세 권에서 걸린 것만 적는다.

- 빗변 (`g9-hypotenuse`, g9-trigonometry) — 2-2 «빗변» exact p21
- 사인 (`g9-sine`, g9-trigonometry) — 3-2 «사인» exact p13; 3-2 «삼각비» related p13; 3-2 «sin · cos · tan» related p13
- 코사인 (`g9-cosine`, g9-trigonometry) — 3-2 «코사인» exact p13
- 탄젠트 (`g9-tangent`, g9-trigonometry) — 3-2 «탄젠트» exact p13
- 삼각비와 닮음 (`g9-trig-similarity`, g9-trigonometry) — 3-2 «직각삼각형의 크기와 삼각비의 값» alias p13
- 현 (`g9-chord`, g9-circle) — 3-2 «현의 수직이등분선의 성질» related p61; 3-2 «현의 길이의 성질» related p62
- 접선 (`g9-tangent-line`, g9-circle) — 2-2 «접선» exact p43
- 반지름과 접선 (`g9-radius-tangent`, g9-circle) — 2-2 «원의 접선과 반지름» alias p43; 3-2 «원의 접선과 반지름» exact p68
- 원주각 (`g9-inscribed-angle`, g9-circle) — 3-2 «원주각» exact p87; 3-2 «원주각과 중심각의 크기» related p87
- 같은 호의 원주각 (`g9-same-arc`, g9-circle) — 3-2 «원주각의 성질» alias p88
- 편차 (`g9-deviation`, g9-statistics) — 3-2 «편차» exact p117
- 분산 (`g9-variance`, g9-statistics) — 3-2 «분산» exact p117
- 표준편차 (`g9-standard-deviation`, g9-statistics) — 3-2 «표준편차» exact p117
- 산점도 (`g9-scatterplot`, g9-statistics) — 3-2 «산점도» exact p135
- 상관관계 (`g9-correlation`, g9-statistics) — 3-2 «상관관계» exact p135; 3-2 «양의 상관관계» related p135; 3-2 «음의 상관관계» related p135

## 교재 용어별 짝

| 용어 | 갈래 | 쪽 | 짝 | 카드 | 까닭 |
|---|---|---|---|---|---|
| 제곱근 | 정의 | 13 | exact | 제곱근 (`g9-square-root`) |  |
| 제곱근의 개수 | 성질 | 13 | related | 제곱근 (`g9-square-root`) | 카드 뜻에 «양수의 제곱근은 부호가 반대인 두 개»가 들어 있음 |
| 근호 | 기호 | 13 | exact | 근호 (`g9-root-symbol`) | 카드는 기호의 이름보다 √a 의 뜻(음이 아닌 제곱근)을 적음 |
| 제곱근 a | 기호 | 13 | related | 근호 (`g9-root-symbol`) | √a 를 읽는 이름 |
| 양의 제곱근 | 정의 | 13 | related | 근호 (`g9-root-symbol`) | √a 는 양의 제곱근 |
| 음의 제곱근 | 정의 | 13 | none |  |  |
| ± | 기호 | 13 | none |  |  |
| 제곱근의 성질 | 성질 | 18 | none |  |  |
| √a²의 성질 | 성질 | 18 | alias | 제곱의 제곱근 (`g9-root-square`) | 카드 이름 «제곱의 제곱근» |
| 제곱근의 대소 관계 | 성질 | 18 | none |  |  |
| 무리수 | 정의 | 25 | exact | 무리수 (`g9-irrational`) |  |
| 유리수 | 정의 | 25 | exact | 유리수 (`rational`) | 중1 카드 — 3-1 은 복습 |
| 소수의 분류 | 기타 | 25 | none |  |  |
| 실수 | 정의 | 25 | exact | 실수 (`g9-real-number`) |  |
| 실수의 분류 | 기타 | 25 | none |  |  |
| 실수와 수직선 | 성질 | 26 | none |  |  |
| 양의 실수 | 정의 | 26 | none |  |  |
| 음의 실수 | 정의 | 26 | none |  |  |
| 실수의 대소 관계 | 성질 | 26 | none |  |  |
| 제곱근표 | 정의 | 26 | none |  |  |
| 제곱근의 곱셈 | 공식 | 41 | none |  |  |
| 제곱근의 나눗셈 | 공식 | 41 | none |  |  |
| 근호가 있는 식의 변형 | 성질 | 41 | none |  |  |
| 분모의 유리화 | 정의 | 41 | none |  |  |
| 제곱근의 덧셈과 뺄셈 | 공식 | 49 | none |  |  |
| 분배법칙 | 법칙 | 49 | exact | 분배법칙 (`g8-distribution`) | 중2(2-1) 카드 — 3-1 은 복습 |
| 합의 제곱 | 공식 | 65 | alias | 합의 제곱 공식 (`g9-square-formula`) | 카드 이름 «합의 제곱 공식» |
| 차의 제곱 | 공식 | 65 | related | 합의 제곱 공식 (`g9-square-formula`) | 카드는 합의 제곱만 |
| 합과 차의 곱 | 공식 | 65 | exact | 합과 차의 곱 (`g9-difference-squares`) |  |
| (x+a)(x+b)의 전개 | 공식 | 66 | none |  |  |
| (ax+b)(cx+d)의 전개 | 공식 | 66 | none |  |  |
| 곱셈 공식 | 공식 | 74 | related | 합의 제곱 공식 (`g9-square-formula`) | 곱셈 공식 가운데 하나 |
| 곱셈 공식 | 공식 | 74 | related | 합과 차의 곱 (`g9-difference-squares`) | 곱셈 공식 가운데 하나 |
| 분모의 유리화 | 정의 | 74 | none |  |  |
| 곱셈 공식의 변형 | 공식 | 74 | none |  |  |
| 인수 | 정의 | 87 | none |  |  |
| 인수분해 | 정의 | 87 | exact | 인수분해 (`g9-factorization`) |  |
| 공통인 인수로 묶어 내기 | 공식 | 87 | alias | 공통인수 묶기 (`g9-common-factor`) | 카드 이름 «공통인수 묶기» — 교재 낱말은 «공통인 인수» |
| a²+2ab+b², a²−2ab+b²의 인수분해 | 공식 | 87 | none |  |  |
| 완전제곱식 | 정의 | 87 | none |  |  |
| 완전제곱식이 되기 위한 조건 | 성질 | 87 | none |  |  |
| a²−b²의 인수분해 | 공식 | 87 | related | 합과 차의 곱 (`g9-difference-squares`) | 합과 차의 곱을 거꾸로(인수분해) |
| x²+(a+b)x+ab의 인수분해 | 공식 | 92 | none |  |  |
| acx²+(ad+bc)x+bd의 인수분해 | 공식 | 92 | none |  |  |
| 내림차순 | 정의 | 99 | none |  |  |
| 이차방정식 | 정의 | 113 | exact | 이차방정식 (`g9-quadratic-equation`) |  |
| 이차방정식의 해 | 정의 | 113 | exact | 이차방정식의 해 (`g9-equation-root`) |  |
| 이차방정식을 푼다 | 정의 | 113 | none |  |  |
| AB=0의 성질 | 성질 | 118 | alias | 곱이 0인 성질 (`g9-zero-product`) | 카드 이름 «곱이 0인 성질» |
| 인수분해를 이용한 이차방정식의 풀이 | 기타 | 118 | related | 곱이 0인 성질 (`g9-zero-product`) | AB=0의 성질을 쓰는 풀이 |
| 중근 | 정의 | 118 | exact | 중근 (`g9-double-root`) |  |
| 이차방정식이 중근을 가질 조건 | 성질 | 118 | related | 중근 (`g9-double-root`) |  |
| 제곱근을 이용한 이차방정식의 풀이 | 기타 | 125 | none |  |  |
| 완전제곱식을 이용한 이차방정식의 풀이 | 기타 | 125 | none |  |  |
| 근의 공식 | 공식 | 139 | exact | 근의 공식 (`g9-root-formula`) |  |
| x의 계수가 짝수인 이차방정식의 근의 공식 | 공식 | 139 | related | 근의 공식 (`g9-root-formula`) |  |
| 이차방정식의 근의 개수 | 성질 | 145 | none |  |  |
| 두 근이 주어진 이차방정식 | 공식 | 145 | none |  |  |
| 이차함수 | 정의 | 165 | exact | 이차함수 (`g9-quadratic-function`) |  |
| 이차함수 y=x²의 그래프 | 성질 | 165 | related | 포물선 (`g9-parabola`) |  |
| 이차함수 y=−x²의 그래프 | 성질 | 165 | none |  |  |
| y축에 대하여 대칭 | 정의 | 165 | none |  |  |
| 포물선 | 정의 | 166 | exact | 포물선 (`g9-parabola`) | 어긋남(낱말): 카드 «a>0이면 위로 열린다» — 교재는 a>0 이면 «아래로 볼록», a<0 이면 «위로 볼록». «위로 열린다»와 «위로 볼록»은 반대 모양이라 헷갈린다 |
| 축 | 정의 | 166 | alias | 이차함수의 축 (`g9-axis`) | 어긋남(낱말): 카드 «꼭짓점을 지나는 수직선» — 교재에서 «수직선»은 수를 나타내는 직선(3-1 p26 «실수와 수직선»). 세로 직선 뜻으로 쓰면 헷갈린다 · 카드 이름 «이차함수의 축»(교재 «포물선의 축») |
| 꼭짓점 | 정의 | 166 | exact | 꼭짓점 (`g9-vertex`) | 카드는 «방향이 바뀌는 점»으로 적음 — 교재는 포물선이 축과 만나는 점으로 뜻을 정한다 |
| 이차함수 y=ax²의 그래프의 성질 | 성질 | 166 | related | 포물선 (`g9-parabola`) |  |
| 아래로 볼록 | 기타 | 166 | related | 포물선 (`g9-parabola`) | 카드는 같은 모양을 «위로 열린다»로 적는다(포물선 줄의 어긋남 참고) |
| 위로 볼록 | 기타 | 166 | none |  |  |
| 이차함수 y=ax²+q의 그래프 | 성질 | 173 | related | 이차함수의 평행이동 (`g9-translation`) |  |
| 축의 방정식 | 기타 | 173 | related | 이차함수의 축 (`g9-axis`) |  |
| 이차함수 y=a(x−p)²의 그래프 | 성질 | 173 | related | 이차함수의 평행이동 (`g9-translation`) |  |
| 이차함수 y=a(x−p)²+q의 그래프 | 성질 | 179 | alias | 이차함수의 평행이동 (`g9-translation`) | 카드 뜻(x축 방향 p, y축 방향 q 평행이동 → y=a(x−p)²+q)과 같은 내용 |
| 이차함수의 표준형 | 정의 | 179 | none |  |  |
| 이차함수 y=ax²+bx+c의 그래프 | 성질 | 193 | none |  |  |
| 이차함수의 일반형 | 정의 | 193 | none |  |  |
| 최댓값 | 정의 | 207 | none |  |  |
| 최솟값 | 정의 | 207 | none |  |  |
| 이차함수의 최댓값과 최솟값 | 성질 | 207 | none |  |  |
| 다항식의 곱셈 | 공식 | 65 | exact | 다항식의 곱셈 (`g9-polynomial-multiply`) |  |
| 이차함수의 표준형 | 정의 | 193 | none |  |  |

## 뜻이 어긋나는 것 (카드 정의 ↔ 교재)

교재 문장은 싣지 않는다(저장소 밖) — 어긋남은 우리 말로 적는다.

- **포물선** (p166) ↔ `g9-parabola` «포물선»
  - 카드: 이차함수 그래프처럼 한 축에 대하여 대칭인 곡선으로 a>0이면 위로 열린다.
  - 어긋남(낱말): 카드 «a>0이면 위로 열린다» — 교재는 a>0 이면 «아래로 볼록», a<0 이면 «위로 볼록». «위로 열린다»와 «위로 볼록»은 반대 모양이라 헷갈린다
- **축** (p166) ↔ `g9-axis` «이차함수의 축»
  - 카드: y=a(x−p)²+q 그래프의 대칭축은 직선 x=p이며 꼭짓점을 지나는 수직선이다.
  - 어긋남(낱말): 카드 «꼭짓점을 지나는 수직선» — 교재에서 «수직선»은 수를 나타내는 직선(3-1 p26 «실수와 수직선»). 세로 직선 뜻으로 쓰면 헷갈린다 · 카드 이름 «이차함수의 축»(교재 «포물선의 축»)
