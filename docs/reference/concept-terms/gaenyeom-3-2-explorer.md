# 개념원리 중학 3-2 ↔ 탐험 개념 카드 (학년 9)

> 카드: `src/lib/math-explorers/definition-cards.ts` `definitionCards` (제품 모듈을 불러 꺼냄). 짝: `scripts/qa/concept-terms/explorer-midb.tsv`.
> match — exact(같은 용어) · alias(같은 개념 다른 이름) · related(더 넓게/좁게, 다른 말로) · none.

## 교재 용어 중 탐험에 있는 비율

| 갈래 | 용어 | exact | alias | related | none | 탐험에 있음(exact+alias) | 넓게(+related) |
|---|---:|---:|---:|---:|---:|---:|---:|
| 정의 | 25 | 10 | 0 | 3 | 12 | 10 (40%) | 13 (52%) |
| 성질 | 21 | 1 | 2 | 4 | 14 | 3 (14%) | 7 (33%) |
| 공식 | 9 | 0 | 0 | 2 | 7 | 0 (0%) | 2 (22%) |
| 기호 | 2 | 0 | 0 | 1 | 1 | 0 (0%) | 1 (50%) |
| 합계 | 57 | 11 | 2 | 10 | 34 | 13 (22%) | 23 (40%) |

## 탐험 카드마다 — 교재에 대응 용어가 있나

이 권이 맡는 탐험 단원의 카드 **15장 중 15장**(100%)이 이 권 또는 이 트랙의 다른 권에 대응 용어가 있다.

| 카드 | 단원 | 카드 정의 | 대응 용어(권 · 짝 · PDF쪽) |
|---|---|---|---|
| 빗변 (`g9-hypotenuse`) | g9-trigonometry | 직각삼각형에서 직각의 맞은편에 있는 변이며 세 변 중 가장 길다. | 2-2 «빗변» exact p21 |
| 사인 (`g9-sine`) | g9-trigonometry | 직각삼각형의 예각 A에 대하여 sin A는 A의 대변의 길이를 빗변의 길이로 나눈 값이다. | 3-2 «사인» exact p13; 3-2 «삼각비» related p13; 3-2 «sin · cos · tan» related p13 |
| 코사인 (`g9-cosine`) | g9-trigonometry | 직각삼각형의 예각 A에 대하여 cos A는 A에 붙은 밑변의 길이를 빗변의 길이로 나눈 값이다. | 3-2 «코사인» exact p13 |
| 탄젠트 (`g9-tangent`) | g9-trigonometry | 직각삼각형의 예각 A에 대하여 tan A는 A의 대변의 길이를 A에 붙은 밑변의 길이로 나눈 값이다. | 3-2 «탄젠트» exact p13 |
| 삼각비와 닮음 (`g9-trig-similarity`) | g9-trigonometry | 한 예각의 크기가 같은 직각삼각형은 닮음이므로 크기가 달라도 대응하는 변의 길이의 비는 같다. | 3-2 «직각삼각형의 크기와 삼각비의 값» alias p13 |
| 현 (`g9-chord`) | g9-circle | 원 위의 두 점을 이은 선분. | 3-2 «현의 수직이등분선의 성질» related p61; 3-2 «현의 길이의 성질» related p62 |
| 접선 (`g9-tangent-line`) | g9-circle | 원과 한 점에서만 만나는 직선. | 2-2 «접선» exact p43 |
| 반지름과 접선 (`g9-radius-tangent`) | g9-circle | 원의 접선은 접점을 지나는 반지름과 수직이다. | 2-2 «원의 접선과 반지름» alias p43; 3-2 «원의 접선과 반지름» exact p68 |
| 원주각 (`g9-inscribed-angle`) | g9-circle | 원 위의 한 점을 꼭짓점으로 하고 두 변이 원의 현을 포함하는 각이며 같은 호의 중심각의 절반이다. | 3-2 «원주각» exact p87; 3-2 «원주각과 중심각의 크기» related p87 |
| 같은 호의 원주각 (`g9-same-arc`) | g9-circle | 같은 원에서 같은 호에 대한 원주각의 크기는 같고 지름에 대한 원주각은 90°이다. | 3-2 «원주각의 성질» alias p88 |
| 편차 (`g9-deviation`) | g9-statistics | 자료의 각 값에서 평균을 뺀 값. | 3-2 «편차» exact p117 |
| 분산 (`g9-variance`) | g9-statistics | 자료의 편차의 제곱의 평균. | 3-2 «분산» exact p117 |
| 표준편차 (`g9-standard-deviation`) | g9-statistics | 분산의 음이 아닌 제곱근. | 3-2 «표준편차» exact p117 |
| 산점도 (`g9-scatterplot`) | g9-statistics | 두 변량의 순서쌍을 좌표평면 위의 점으로 나타내어 두 변량의 관계를 살피는 그림. | 3-2 «산점도» exact p135 |
| 상관관계 (`g9-correlation`) | g9-statistics | 한 변량이 커질 때 다른 변량도 커지는 경향이면 양의 상관관계, 작아지는 경향이면 음의 상관관계이다. | 3-2 «상관관계» exact p135; 3-2 «양의 상관관계» related p135; 3-2 «음의 상관관계» related p135 |

### 같은 학년의 다른 권 소관 카드 (20장)

이 권이 맡지 않는 단원의 카드 — 이 트랙의 다른 권(3-1 · 3-2) 또는 다른 트랙(2-1)이 맡는다. 이 트랙 세 권에서 걸린 것만 적는다.

- 제곱근 (`g9-square-root`, g9-real) — 3-1 «제곱근» exact p13; 3-1 «제곱근의 개수» related p13
- 근호 (`g9-root-symbol`, g9-real) — 3-1 «근호» exact p13; 3-1 «제곱근 a» related p13; 3-1 «양의 제곱근» related p13
- 무리수 (`g9-irrational`, g9-real) — 3-1 «무리수» exact p25
- 실수 (`g9-real-number`, g9-real) — 3-1 «실수» exact p25
- 제곱의 제곱근 (`g9-root-square`, g9-real) — 3-1 «√a²의 성질» alias p18
- 다항식의 곱셈 (`g9-polynomial-multiply`, g9-polynomial) — 3-1 «다항식의 곱셈» exact p65
- 합의 제곱 공식 (`g9-square-formula`, g9-polynomial) — 3-1 «합의 제곱» alias p65; 3-1 «차의 제곱» related p65; 3-1 «곱셈 공식» related p74
- 합과 차의 곱 (`g9-difference-squares`, g9-polynomial) — 3-1 «합과 차의 곱» exact p65; 3-1 «곱셈 공식» related p74; 3-1 «a²−b²의 인수분해» related p87
- 인수분해 (`g9-factorization`, g9-polynomial) — 3-1 «인수분해» exact p87
- 공통인수 묶기 (`g9-common-factor`, g9-polynomial) — 3-1 «공통인 인수로 묶어 내기» alias p87
- 이차방정식 (`g9-quadratic-equation`, g9-equation) — 3-1 «이차방정식» exact p113
- 곱이 0인 성질 (`g9-zero-product`, g9-equation) — 3-1 «AB=0의 성질» alias p118; 3-1 «인수분해를 이용한 이차방정식의 풀이» related p118
- 이차방정식의 해 (`g9-equation-root`, g9-equation) — 3-1 «이차방정식의 해» exact p113
- 중근 (`g9-double-root`, g9-equation) — 3-1 «중근» exact p118; 3-1 «이차방정식이 중근을 가질 조건» related p118
- 근의 공식 (`g9-root-formula`, g9-equation) — 3-1 «근의 공식» exact p139; 3-1 «x의 계수가 짝수인 이차방정식의 근의 공식» related p139
- 이차함수 (`g9-quadratic-function`, g9-function) — 3-1 «이차함수» exact p165
- 포물선 (`g9-parabola`, g9-function) — 3-1 «이차함수 y=x²의 그래프» related p165; 3-1 «포물선» exact p166; 3-1 «이차함수 y=ax²의 그래프의 성질» related p166; 3-1 «아래로 볼록» related p166
- 꼭짓점 (`g9-vertex`, g9-function) — 3-1 «꼭짓점» exact p166
- 이차함수의 축 (`g9-axis`, g9-function) — 3-1 «축» alias p166; 3-1 «축의 방정식» related p173
- 이차함수의 평행이동 (`g9-translation`, g9-function) — 3-1 «이차함수 y=ax²+q의 그래프» related p173; 3-1 «이차함수 y=a(x−p)²의 그래프» related p173; 3-1 «이차함수 y=a(x−p)²+q의 그래프» alias p179

## 교재 용어별 짝

| 용어 | 갈래 | 쪽 | 짝 | 카드 | 까닭 |
|---|---|---|---|---|---|
| 사인 | 정의 | 13 | exact | 사인 (`g9-sine`) |  |
| 코사인 | 정의 | 13 | exact | 코사인 (`g9-cosine`) |  |
| 탄젠트 | 정의 | 13 | exact | 탄젠트 (`g9-tangent`) |  |
| 삼각비 | 정의 | 13 | related | 사인 (`g9-sine`) | 사인·코사인·탄젠트를 통틀은 이름 — «삼각비» 카드는 따로 없음(단원 이름) |
| sin · cos · tan | 기호 | 13 | related | 사인 (`g9-sine`) |  |
| 직각삼각형의 크기와 삼각비의 값 | 성질 | 13 | alias | 삼각비와 닮음 (`g9-trig-similarity`) | 카드 이름 «삼각비와 닮음» |
| 30°, 45°, 60°의 삼각비의 값 | 공식 | 19 | none |  |  |
| sin²A | 기호 | 19 | none |  |  |
| 임의의 예각의 삼각비의 값 | 성질 | 24 | none |  |  |
| 0°, 90°의 삼각비의 값 | 공식 | 24 | none |  |  |
| 각의 크기에 따른 삼각비의 값의 변화 | 성질 | 24 | none |  |  |
| 삼각비의 표 | 정의 | 24 | none |  |  |
| 직각삼각형의 변의 길이 구하기 | 공식 | 39 | none |  |  |
| 일반 삼각형의 변의 길이 구하기 | 공식 | 39 | none |  |  |
| 삼각형의 높이 구하기 | 공식 | 40 | none |  |  |
| 삼각형의 넓이 | 공식 | 47 | related | 삼각형의 넓이 (`g5-triangle-area`) | 같은 이름(초5 카드: 밑변×높이÷2) — 3-2 는 두 변과 끼인각으로 ½ac sin B |
| 평행사변형의 넓이 | 공식 | 48 | related | 평행사변형의 넓이 (`g5-parallelogram-area`) | 같은 이름(초5 카드: 밑변×높이) — 3-2 는 ab sin B |
| 사각형의 넓이 | 공식 | 48 | none |  |  |
| 평행사변형의 성질 | 성질 | 48 | related | 평행사변형의 대각선 (`g8-parallelogram-diagonal`) | 참고 상자(2-2 복습) — 카드는 대각선에 관한 성질 하나만 |
| 현의 수직이등분선의 성질 | 성질 | 61 | related | 현 (`g9-chord`) | 카드는 «현»의 뜻(중1 낱말) — 3-2 는 현을 뜻매김하지 않고 성질에서 씀 |
| 직각삼각형의 합동 조건 | 성질 | 61 | none |  |  |
| 현의 길이의 성질 | 성질 | 62 | related | 현 (`g9-chord`) | 카드는 «현»의 뜻(중1 낱말) |
| 원의 접선과 반지름 | 성질 | 68 | exact | 반지름과 접선 (`g9-radius-tangent`) | 카드 이름 «반지름과 접선» |
| 접선의 길이 | 정의 | 68 | none |  |  |
| 원의 접선의 성질 | 성질 | 68 | none |  |  |
| 삼각형의 내접원의 성질 | 성질 | 74 | none |  |  |
| 원에 외접하는 사각형의 성질 | 성질 | 74 | none |  |  |
| 원주각 | 정의 | 87 | exact | 원주각 (`g9-inscribed-angle`) |  |
| 원주각에 대한 호 | 정의 | 87 | none |  |  |
| 원주각과 중심각의 크기 | 성질 | 87 | related | 원주각 (`g9-inscribed-angle`) | 카드 뜻에 «같은 호의 중심각의 절반»이 들어 있음 |
| 원주각의 성질 | 성질 | 88 | alias | 같은 호의 원주각 (`g9-same-arc`) | 카드 이름 «같은 호의 원주각» — 반원(지름)에 대한 원주각 90° 도 같이 |
| 원주각의 크기와 호의 길이 | 성질 | 88 | none |  |  |
| 네 점이 한 원 위에 있을 조건 | 성질 | 96 | none |  |  |
| 원에 내접하는 사각형의 성질 | 성질 | 96 | none |  |  |
| 사각형이 원에 내접하기 위한 조건 | 성질 | 96 | none |  |  |
| 접선과 현이 이루는 각 | 성질 | 103 | none |  |  |
| 두 원에서 접선과 현이 이루는 각 | 성질 | 103 | none |  |  |
| 산포도 | 정의 | 117 | none |  |  |
| 편차 | 정의 | 117 | exact | 편차 (`g9-deviation`) |  |
| 분산 | 정의 | 117 | exact | 분산 (`g9-variance`) |  |
| 표준편차 | 정의 | 117 | exact | 표준편차 (`g9-standard-deviation`) |  |
| 분산과 표준편차를 이용한 자료의 분석 | 성질 | 117 | none |  |  |
| 변화된 변량에 대한 평균, 분산, 표준편차의 변화 | 공식 | 117 | none |  |  |
| 사분위수 | 정의 | 129 | none |  |  |
| 제1사분위수 | 정의 | 129 | none |  |  |
| 제2사분위수 | 정의 | 129 | none |  |  |
| 제3사분위수 | 정의 | 129 | none |  |  |
| 중앙값 | 정의 | 129 | exact | 중앙값 (`g7-median`) | 중1 카드 — 3-2 는 복습 |
| 사분위수 범위 | 정의 | 129 | none |  |  |
| 상자그림 | 정의 | 129 | none |  |  |
| 상자그림의 특징 | 성질 | 129 | none |  |  |
| 산점도 | 정의 | 135 | exact | 산점도 (`g9-scatterplot`) |  |
| 상관관계 | 정의 | 135 | exact | 상관관계 (`g9-correlation`) | 어긋남(범위): 카드는 양·음의 상관관계만 적는다 — 교재는 두 변량이 함께 변하는 경향이 있는지로 뜻을 세우고, 대략적인 경향의 양·음과 «상관관계가 없다»까지 나눈다 |
| 양의 상관관계 | 정의 | 135 | related | 상관관계 (`g9-correlation`) |  |
| 음의 상관관계 | 정의 | 135 | related | 상관관계 (`g9-correlation`) |  |
| 상관관계가 없다 | 정의 | 135 | none |  |  |
| 상관관계의 강약 | 정의 | 135 | none |  |  |

## 뜻이 어긋나는 것 (카드 정의 ↔ 교재)

교재 문장은 싣지 않는다(저장소 밖) — 어긋남은 우리 말로 적는다.

- **상관관계** (p135) ↔ `g9-correlation` «상관관계»
  - 카드: 한 변량이 커질 때 다른 변량도 커지는 경향이면 양의 상관관계, 작아지는 경향이면 음의 상관관계이다.
  - 어긋남(범위): 카드는 양·음의 상관관계만 적는다 — 교재는 두 변량이 함께 변하는 경향이 있는지로 뜻을 세우고, 대략적인 경향의 양·음과 «상관관계가 없다»까지 나눈다
