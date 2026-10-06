독립 최종 원고 검토다. 모든 항목의 현재 after 원문, 완성 정의, 실제 학생 문장, 기대 답, 이전 가림 풀이, 원 감사 지적을 함께 제공한다. 답의 맞음은 문자열이 아니라 의미로 판단하라. 동의어·동치식·같은 수량의 표기 차이는 허용하고 별개의 참인 완성, 순서를 바꿔도 다른 뜻으로 참인 답, 조건·대상·연산이 사라진 빈칸, 0·1·부호·정의역·포함 관계, 정답 글자 직접 반복, 긴 절 전체 가리기, 수식과 학년 용어를 검토하라. 기대 답이나 가림 검토자에게 맞추지 말고 유효한 반례가 있으면 반드시 revise로 판정하라. 다음 제약을 확인하라: 같은 의미 표현은 허용하며 추론을 위한 조건·수치 노출 자체는 결함이 아니다; 이유 설명은 완성 정의에 보존해야 한다; 기존 은행의 학년·개념·기존 용어를 유지하는 교정이며 교육과정 전수 검증은 이번 범위가 아니다; 계급값 등 새 용어는 도입하지 않았다. 기존 반례·최댓값·최솟값·다문자 인수분해 용어의 수록 학년은 이번에 변경하지 않는다. 도구 없이 각 항목을 읽고 JSON {"cases":[{"id":"...","verdict":"pass" 또는 "revise","reason":"...","proposal":"수정 필요 시 구체적 after 제안"}]}만 반환하라.

{
  "cases": [
    {
      "id": "m1-01-03-c4",
      "grade": "m1",
      "chapter": "1. 소인수분해",
      "after": "두 자연수의 최대공약수가 $1$일 때 두 수는 {서로소}이다. 이때 두 수의 공약수는 $1$뿐이다.",
      "completedDefinition": "두 자연수의 최대공약수가 $1$일 때 두 수는 서로소이다. 이때 두 수의 공약수는 $1$뿐이다.",
      "studentSentence": "두 자연수의 최대공약수가 $1$일 때 두 수는 □이다. 이때 두 수의 공약수는 $1$뿐이다.",
      "expectedAnswers": [
        "서로소"
      ],
      "blindResponse": {
        "id": "m1-01-03-c4",
        "answers": [
          "서로소"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다. 수학적으로 정확하고 중1 용어에 맞다."
      },
      "originalFinding": {
        "id": "m1-01-03-c4",
        "grade": "m1",
        "section": "중1::1. 소인수분해::공약수와 최대공약수",
        "sourceHash": "9db1657129c0dfa4046077dc61673b618781a70d17aeb288062dd261819f52e6",
        "status": "not_issue",
        "initialStatus": "confirmed",
        "category": "answer-leak",
        "student": "두 자연수의 공약수가 □뿐일 때, 곧 최대공약수가 $1$일 때 두 수는 □이다.",
        "expected": [
          "$1$",
          "서로소"
        ],
        "reason": "첫 빈칸은 '최대공약수가 1'과 동치인 조건에서 자연스럽게 1로 정해지고, 둘째 빈칸 '서로소'도 유일하다. 답 노출은 명료성 결함이 아니며 여기서는 동치 조건을 잇는 정상적인 단서다.",
        "proposal": "유지. 회상 강도를 높이려면 '곧 최대공약수가 1일 때'를 빈칸 쪽으로 옮기는 정도만 선택 사항.",
        "primaryReason": "첫 빈칸의 기대답 1이 같은 문장 뒤의 '최대공약수가 $1$일 때'에 그대로 남아 있다. 서로소의 공약수 조건을 회상하지 않고 수를 옮겨 적을 수 있다.",
        "primaryProposal": "공약수 조건과 최대공약수 조건 중 한 가지만 남기거나, 두 설명을 함께 빈칸 처리하는 방향을 검토한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "최대공약수 1이라는 조건과 공약수 설명을 노출하고 개념명 서로소만 묻는다. 답 숫자 1을 같은 문장에서 그대로 복사하던 빈칸을 없애며 두 동치 조건의 설명은 보존했다."
    },
    {
      "id": "m1-04-04-c5",
      "grade": "m1",
      "chapter": "4. 그래프와 비례",
      "after": "정비례 관계 $y=ax$에서 $a>0$이면 그래프는 오른쪽 {위}로 향해 제$1$, $3$사분면을, $a<0$이면 오른쪽 {아래}로 향해 제{$2$, $4$}사분면을 지난다.",
      "completedDefinition": "정비례 관계 $y=ax$에서 $a>0$이면 그래프는 오른쪽 위로 향해 제$1$, $3$사분면을, $a<0$이면 오른쪽 아래로 향해 제$2$, $4$사분면을 지난다.",
      "studentSentence": "정비례 관계 $y=ax$에서 $a>0$이면 그래프는 오른쪽 □로 향해 제$1$, $3$사분면을, $a<0$이면 오른쪽 □로 향해 제□사분면을 지난다.",
      "expectedAnswers": [
        "위",
        "아래",
        "$2$, $4$"
      ],
      "blindResponse": {
        "id": "m1-04-04-c5",
        "answers": [
          "위",
          "아래",
          "2, 4"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다. 셋째 빈칸은 한 칸에 두 수(2, 4)를 써야 하므로 채점 형식만 확인하면 된다."
      },
      "originalFinding": {
        "id": "m1-04-04-c5",
        "grade": "m1",
        "section": "중1::4. 그래프와 비례::정비례 관계 y=ax의 그래프",
        "sourceHash": "35e06cbbf2d1361142ed480fe58e2f60d1ac0a19b4be1447542228ad1ff6b045",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "$a>0$이면 그래프는 오른쪽 □로 향해 제$1$, $3$사분면을, $a<0$이면 오른쪽 □로 향해 제□사분면을 지난다.",
        "expected": [
          "위",
          "아래",
          "$2$, $4$"
        ],
        "reason": "대단원 '그래프와 비례'에는 정비례와 반비례가 함께 있는데 문장에 관계식이 없다. 반비례 y=a/x로 읽으면 '아래/위/2, 4'도 참인 서술이 되어 앞 두 빈칸의 답이 뒤바뀐다. prior의 y=-ax 반례는 근거로 부적절하고, 결함의 실제 근거는 이 반비례 해석이다.",
        "proposal": "문장 앞에 '정비례 관계 y=ax에서' 또는 '직선'이라는 대상을 명시한다.",
        "primaryReason": "학생 문장에 그래프의 관계식이나 정비례·반비례라는 이름이 전혀 없고 매개변수 a만 제시된다. a의 부호만으로 그래프의 방향 또는 지나는 사분면을 결정할 수 없으며, 단원 제목이나 앞 문항을 임의로 보충해야 기대답을 알 수 있다.",
        "primaryProposal": "문장에 정비례 관계식 y=ax를 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "a>0이어도 y=ax와 y=-ax는 서로 다른 사분면을 지나므로 a의 부호만으로 답을 정할 수 없다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "관계식 y=ax를 명시하여 반비례 y=a/x의 증감과 혼동할 수 없게 했다. 부호별 방향과 사분면 설명은 유지했다."
    },
    {
      "id": "m1-01-03-c5",
      "grade": "m1",
      "chapter": "1. 소인수분해",
      "after": "두 수가 모두 $1$보다 큰 자연수일 때, 최대공약수는 소인수분해한 뒤 {공통인 소인수}만 골라, 지수가 같으면 그 지수, 다르면 {작은} 지수로 거듭제곱하여 곱한다. 서로소이거나 한 수가 $1$이면 최대공약수는 $1$이다.",
      "completedDefinition": "두 수가 모두 $1$보다 큰 자연수일 때, 최대공약수는 소인수분해한 뒤 공통인 소인수만 골라, 지수가 같으면 그 지수, 다르면 작은 지수로 거듭제곱하여 곱한다. 서로소이거나 한 수가 $1$이면 최대공약수는 $1$이다.",
      "studentSentence": "두 수가 모두 $1$보다 큰 자연수일 때, 최대공약수는 소인수분해한 뒤 □만 골라, 지수가 같으면 그 지수, 다르면 □ 지수로 거듭제곱하여 곱한다. 서로소이거나 한 수가 $1$이면 최대공약수는 $1$이다.",
      "expectedAnswers": [
        "공통인 소인수",
        "작은"
      ],
      "blindResponse": {
        "id": "m1-01-03-c5",
        "answers": [
          "공통인 소인수",
          "작은"
        ],
        "alternativeAnswers": [],
        "reason": "최대공약수는 공통인 소인수만 골라 지수가 다르면 작은 쪽 지수를 택하므로 두 빈칸이 유일하게 정해진다. '공통 소인수', '더 작은'은 동의 표현일 뿐이다. 답 노출은 없고, 공통인 소인수가 없는 경우(서로소)와 한 수가 1인 경우를 마지막 문장이 보완해 수학적으로 정확하다. 소인수, 지수, 거듭제곱, 서로소는 모두 중1 용어이다."
      },
      "originalFinding": {
        "id": "m1-01-03-c5",
        "grade": "m1",
        "section": "중1::1. 소인수분해::공약수와 최대공약수",
        "sourceHash": "daf175c1ac9c73a0555e01857ef13ec55be4a12de817263e2b0d89f3e17048fd",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "missing-referent",
        "student": "소인수분해한 뒤 □만 골라, 지수가 같으면 그대로, 다르면 □ 쪽을 택해 곱한다.",
        "expected": [
          "공통인 소인수",
          "작은"
        ],
        "reason": "구하려는 양(최대공약수)이 문장에 없고, 같은 대단원에 지수 '큰 쪽'을 택하는 최소공배수 절차가 병렬로 있다. '□만 골라'에서 추론은 가능하나 대상어와 판별 단서가 함께 가려져 있다.",
        "proposal": "'두 수의 최대공약수는'을 문두에 넣거나 첫 빈칸 '공통인 소인수'를 노출한다.",
        "primaryReason": "소인수분해의 대상인 두 수와 구하려는 양의 이름이 학생 문장에 없다. 작은 지수를 택한다는 절차로 최대공약수를 추측할 수는 있으나, 공통 소인수 선택을 왜 하는지 독립 문항의 목표가 불명확하다.",
        "primaryProposal": "두 자연수의 최대공약수를 구하는 절차라는 목적을 문장 앞에 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "최대공약수라는 계산 목표를 노출하고 작은 쪽이 지수임을 명시했다. 서로소나 1이 포함되어 공통 소인수가 없는 경우의 값 1도 보완했다. 서로소의 보완 문장은 개념명 반복을 피하여 공통 소인수 답을 노출하지 않는다. 각 소인수 자체가 아니라 선택한 지수의 거듭제곱을 곱함을 명시했다. 0 또는 1의 경계와 퇴화 도형을 점검하여 해당 조건과 예외를 문장에 명시했다."
    },
    {
      "id": "m1-03-02-c9",
      "grade": "m1",
      "chapter": "3. 방정식",
      "after": "$\\frac{1}{x}$처럼 {분모}에 문자가 있는 식은 다항식이 아니다. 따라서 차수가 $1$인 다항식인 {일차식}도 아니다.",
      "completedDefinition": "$\\frac{1}{x}$처럼 분모에 문자가 있는 식은 다항식이 아니다. 따라서 차수가 $1$인 다항식인 일차식도 아니다.",
      "studentSentence": "$\\frac{1}{x}$처럼 □에 문자가 있는 식은 다항식이 아니다. 따라서 차수가 $1$인 다항식인 □도 아니다.",
      "expectedAnswers": [
        "분모",
        "일차식"
      ],
      "blindResponse": {
        "id": "m1-03-02-c9",
        "answers": [
          "분모",
          "일차식"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다. 수학적으로 문제없다."
      },
      "originalFinding": {
        "id": "m1-03-02-c9",
        "grade": "m1",
        "section": "중1::3. 방정식::일차식의 뜻Ⅰ",
        "sourceHash": "2a124a3543339b130f1dfb5c7363bb614fa437d64618605d7f3d1e35e0f00bf8",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "open-answer",
        "student": "$\\frac{1}{x}$처럼 □에 문자가 있는 식은 다항식이 아니므로 □도 아니다.",
        "expected": [
          "분모",
          "일차식"
        ],
        "reason": "첫 빈칸 '분모'는 명확하다. 둘째 빈칸은 '일차식'이 의도이나, 단항식도 다항식의 일종이라 '단항식도 아니다'가 같은 단원의 자연스러운 참 답이다. 다만 이차식까지 드는 것은 형식 논리이고 답의 종류(다항식의 하위 개념)는 알 수 있어 확정 결함은 아니다.",
        "proposal": "'차수가 1인 다항식인 □도 아니다'처럼 단서를 넣거나 채점에서 '단항식'을 허용한다.",
        "primaryReason": "'다항식이 아니므로 □도 아니다'에서 다항식의 어떤 하위 종류를 쓰라는지 단서가 없다. 일차식뿐 아니라 단항식 또는 이차식도 뜻이 다른 참인 답으로 성립하여 수학적 이해만으로 기대 범위를 정할 수 없다.",
        "primaryProposal": "일차식 판별을 묻는다는 단서를 남기거나 차수가 1인 다항식의 명칭을 묻도록 질문 범위를 한정한다.",
        "initialAlternativeAnswers": [
          "단항식",
          "이차식"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "일차식의 차수 조건을 드러내어 단항식·다른 차수의 식을 쓰는 대안을 배제했다. 분모에 문자가 있어 다항식이 아니라는 설명을 보존했다."
    },
    {
      "id": "m1-02-04-xc9",
      "grade": "m1",
      "chapter": "2. 정수와 유리수",
      "after": "곱셈에서 수의 순서를 바꿀 수 있는 {교환법칙}과 묶음을 바꿀 수 있는 {결합법칙}이 성립하므로, 곱하기 쉬운 수끼리 먼저 묶어 곱해도 된다.",
      "completedDefinition": "곱셈에서 수의 순서를 바꿀 수 있는 교환법칙과 묶음을 바꿀 수 있는 결합법칙이 성립하므로, 곱하기 쉬운 수끼리 먼저 묶어 곱해도 된다.",
      "studentSentence": "곱셈에서 수의 순서를 바꿀 수 있는 □과 묶음을 바꿀 수 있는 □이 성립하므로, 곱하기 쉬운 수끼리 먼저 묶어 곱해도 된다.",
      "expectedAnswers": [
        "교환법칙",
        "결합법칙"
      ],
      "blindResponse": {
        "id": "m1-02-04-xc9",
        "answers": [
          "교환법칙",
          "결합법칙"
        ],
        "alternativeAnswers": [],
        "reason": "설명(순서/묶음)으로 순서까지 유일하게 정해진다. '곱셈의 교환법칙·결합법칙'은 같은 답이다."
      },
      "originalFinding": {
        "id": "m1-02-04-xc9",
        "grade": "m1",
        "section": "중1::2. 정수와 유리수::유리수의 곱셈",
        "sourceHash": "35b4d2825173a8b6607c47e9eeb8d774114623caeb119efcc235bfc5d47e5426",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "grammar-blank",
        "student": "곱셈은 교환법칙과 결합법칙이 성립하므로, 곱하기 쉬운 수끼리 □ 묶어 곱해도 □.",
        "expected": [
          "먼저",
          "된다"
        ],
        "reason": "'먼저'와 '된다'는 수학 개념이 아닌 부사·서술어다. '순서를 바꾸어', '따로' 등도 문장을 참으로 완성해 무엇을 써야 하는지 기준이 약하다.",
        "proposal": "빈칸을 '교환법칙', '결합법칙'으로 옮기고 '먼저 묶어 곱해도 된다'는 노출한다.",
        "primaryReason": "교환법칙과 결합법칙 및 쉬운 수끼리 묶는 방법이 모두 주어진 뒤 '□ 묶어 곱해도 □'만 묻는다. 첫 답 '먼저'는 단순 부사이며, 함께·적절히 등 계산 원리를 바꾸지 않는 표현도 들어가므로 확인하려는 수학 개념이 약하다.",
        "primaryProposal": "계산 순서를 바꿀 수 있게 하는 법칙 또는 묶을 수의 선택을 묻도록 빈칸 위치를 검토한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "먼저·된다 같은 범용 표현 대신 순서와 묶음에 대응하는 두 법칙을 각각 묻는다. 쉬운 수끼리 묶는 계산 절차와 이유를 유지했다."
    },
    {
      "id": "m1-06-05-xc18",
      "grade": "m1",
      "chapter": "6. 평면도형",
      "after": "호의 길이가 $0$보다 큰 부채꼴의 호의 길이를 $\\mathrm{cm}$로, 넓이를 $\\mathrm{cm}^2$로 나타낸 수가 같으면 $\\frac{1}{2}rl=l$에서 반지름은 {$2$}$\\,\\mathrm{cm}$이다. 여기서 $r$, $l$은 각각 반지름과 호의 길이를 $\\mathrm{cm}$로 나타낸 수이다.",
      "completedDefinition": "호의 길이가 $0$보다 큰 부채꼴의 호의 길이를 $\\mathrm{cm}$로, 넓이를 $\\mathrm{cm}^2$로 나타낸 수가 같으면 $\\frac{1}{2}rl=l$에서 반지름은 $2$$\\,\\mathrm{cm}$이다. 여기서 $r$, $l$은 각각 반지름과 호의 길이를 $\\mathrm{cm}$로 나타낸 수이다.",
      "studentSentence": "호의 길이가 $0$보다 큰 부채꼴의 호의 길이를 $\\mathrm{cm}$로, 넓이를 $\\mathrm{cm}^2$로 나타낸 수가 같으면 $\\frac{1}{2}rl=l$에서 반지름은 □$\\,\\mathrm{cm}$이다. 여기서 $r$, $l$은 각각 반지름과 호의 길이를 $\\mathrm{cm}$로 나타낸 수이다.",
      "expectedAnswers": [
        "$2$"
      ],
      "blindResponse": {
        "id": "m1-06-05-xc18",
        "answers": [
          "2"
        ],
        "alternativeAnswers": [],
        "reason": "호의 길이가 0보다 크다는 조건으로 l>0이므로 (1/2)rl=l의 양변을 l로 나누어 r=2로 유일하게 정해진다. 식은 주어졌지만 답 자체는 노출되지 않았다. 단위(cm, cm²)와 '나타낸 수'의 구분도 정확하고, 부채꼴 넓이 공식 S=(1/2)rl은 중1 범위이다."
      },
      "originalFinding": {
        "id": "m1-06-05-xc18",
        "grade": "m1",
        "section": "중1::6. 평면도형::부채꼴의 호의 길이와 넓이",
        "sourceHash": "852241d5b22599bee272567cf571c2d72d7bf774735007decac92499e3cc5b75",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "math-error",
        "student": "부채꼴의 넓이와 호의 길이를 같은 길이 단위로 재어 나타낸 수가 같으면 $\\frac{1}{2}rl=l$에서 반지름은 □이다.",
        "expected": [
          "$2$"
        ],
        "reason": "식 (1/2)rl=l이 주어져 답 2는 유일하게 정해지므로 결론은 수학적으로 옳다. '넓이를 같은 길이 단위로 재어'는 길이 단위와 넓이 단위를 흐리는 어색한 표현일 뿐, prior가 말한 확정적 수학 오류는 아니다.",
        "proposal": "'호의 길이(cm)와 넓이(cm²)를 나타내는 수가 같으면'처럼 수치와 단위를 구별해 고친다.",
        "primaryReason": "넓이와 호의 길이를 '같은 길이 단위로' 잰다고 하여 면적 단위와 길이 단위를 혼동한다. r=2라는 결론은 길이를 cm, 넓이를 cm²처럼 대응하는 단위로 나타낸 수가 같을 때의 수치 결론이며 현재 조건은 성립할 수 없다.",
        "primaryProposal": "길이를 cm, 넓이를 cm²로 나타낸 수가 같다는 식으로 수치와 단위를 구별해 제시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "넓이는 cm로 잴 수 없고 cm²로 잰다. 길이 1 cm와 넓이 1 cm²는 수치는 같아도 같은 단위의 양이 아니다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "길이와 넓이를 같은 길이 단위로 잰다는 표현을 cm와 cm²의 수치 비교로 바로잡았다. 양의 호 길이를 갖는 부채꼴에서 r=2라는 계산과 단위를 명시했다. 0 또는 1의 경계와 퇴화 도형을 점검하여 해당 조건과 예외를 문장에 명시했다."
    },
    {
      "id": "m1-02-04-xc20",
      "grade": "m1",
      "chapter": "2. 정수와 유리수",
      "after": "$0$이 아닌 수들의 곱의 부호는 각 수의 부호로 정한다. $a<0$, $b>0$일 때 $a\\times b$의 부호는 {음수}이다.",
      "completedDefinition": "$0$이 아닌 수들의 곱의 부호는 각 수의 부호로 정한다. $a<0$, $b>0$일 때 $a\\times b$의 부호는 음수이다.",
      "studentSentence": "$0$이 아닌 수들의 곱의 부호는 각 수의 부호로 정한다. $a<0$, $b>0$일 때 $a\\times b$의 부호는 □이다.",
      "expectedAnswers": [
        "음수"
      ],
      "blindResponse": {
        "id": "m1-02-04-xc20",
        "answers": [
          "음(−)"
        ],
        "alternativeAnswers": [],
        "reason": "음수와 양수의 곱은 음수이므로 부호는 −로 유일하다. '−', '음', '음의 부호', '마이너스'는 표기만 다른 같은 답이다. 답 노출은 없다. 다만 첫 문장 '각 수의 부호로 정한다'는 '음수의 개수'라는 판정 기준을 드러내지 않아 다소 막연하지만, 틀린 진술은 아니며 빈칸을 정하는 데 지장은 없다."
      },
      "originalFinding": {
        "id": "m1-02-04-xc20",
        "grade": "m1",
        "section": "중1::2. 정수와 유리수::유리수의 곱셈",
        "sourceHash": "de88c45861da0cb636499755eb7147593fdd678c9a5f0083a311a30e3701c0b2",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "math-error",
        "student": "$a<0$, $b>0$일 때 $a\\times b$의 부호처럼, 문자의 곱은 □만 보고 정한다.",
        "expected": [
          "각 문자의 부호"
        ],
        "reason": "앞 절의 'a×b의 부호처럼' 덕분에 답 '(각 문자의) 부호'는 유추할 수 있다. 다만 주절이 '문자의 곱은 …만 보고 정한다'로 되어 있어 곱의 값이 부호만으로 정해지는 듯 읽힌다.",
        "proposal": "'문자의 곱의 부호는 □만 보고 정한다'로 주어를 보완한다.",
        "primaryReason": "앞절의 'a×b의 부호처럼'으로 부호를 묻는 의도는 유추할 수 있다. 다만 뒤에서는 '곱'을 부호만 보고 정한다고 하여 곱의 값과 곱의 부호를 혼동하는 표현이므로, 수학 오류로 확정하기보다는 생략된 주어를 명확히 할 필요가 있는지 검토한다.",
        "primaryProposal": "문장 뒤의 '문자의 곱'을 '문자의 곱의 부호'로 명확히 한 뒤 부호 결정 규칙을 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "a=-1, b=2이면 곱은 -2이고 a=-3, b=2이면 -6이다. 두 경우 문자의 부호는 같다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "곱의 값이 부호만으로 정해진다는 독해를 없애고 곱의 부호를 대상으로 삼았다. 노출된 부호 조건으로 짧은 답 음수를 정한다. 0 또는 1의 경계와 퇴화 도형을 점검하여 해당 조건과 예외를 문장에 명시했다."
    },
    {
      "id": "m1-03-13-xc12",
      "grade": "m1",
      "chapter": "3. 방정식",
      "after": "처음에 전체의 일부를 쓰고, 다음에 남은 양의 일정 비율을 썼다면 두 번째로 쓴 양은 둘째 비율을 {남은 양}에 곱해 구한다.",
      "completedDefinition": "처음에 전체의 일부를 쓰고, 다음에 남은 양의 일정 비율을 썼다면 두 번째로 쓴 양은 둘째 비율을 남은 양에 곱해 구한다.",
      "studentSentence": "처음에 전체의 일부를 쓰고, 다음에 남은 양의 일정 비율을 썼다면 두 번째로 쓴 양은 둘째 비율을 □에 곱해 구한다.",
      "expectedAnswers": [
        "남은 양"
      ],
      "blindResponse": {
        "id": "m1-03-13-xc12",
        "answers": [
          "남은 양"
        ],
        "alternativeAnswers": [],
        "reason": "답 노출: 같은 문장 앞부분 '남은 양의 일정 비율'에 답이 그대로 있다. 내용은 정확하다."
      },
      "originalFinding": {
        "id": "m1-03-13-xc12",
        "grade": "m1",
        "section": "중1::3. 방정식::일차방정식의 활용(비율, 시계, 규칙)",
        "sourceHash": "f8f766fc32af2534a1f5fab688ec41cf8a2516482d59c6cdce24c98c9a792db7",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "처음에 전체의 얼마, 다음에 □의 얼마를 썼다면 둘째 비율은 □에 곱한다.",
        "expected": [
          "남은 양",
          "남은 양"
        ],
        "reason": "조건과 결론의 같은 말을 둘 다 가려 'X의 얼마를 썼다면 X에 곱한다' 꼴이 되므로, 형식상 '전체/전체'도 참이다. 그러나 '처음에 전체의…, 다음에 □의…'라는 대비가 '남은 양(나머지)'을 강하게 유도해 익숙한 유형의 자연스러운 답은 하나이므로 확정 결함까지는 아니다.",
        "proposal": "조건의 '남은 양'을 노출하고 결론만 빈칸으로 두거나, 그 반대로 한다.",
        "primaryReason": "두 번째 비율의 기준량인 '남은 양'을 조건과 결론에서 모두 가렸다. 남은 문장에는 둘째 사용량의 기준이 무엇인지 전혀 없어, 처음 전체량을 두 번 기준으로 잡는 상황도 문장을 참으로 완성한다.",
        "primaryProposal": "조건의 '남은 양'은 남겨 두고 둘째 사용량 또는 기준량을 적용한 식을 묻는다.",
        "initialAlternativeAnswers": [
          "전체 양 / 전체 양"
        ],
        "initialCounterexample": "전체의 1/4을 쓴 다음 전체의 1/3을 쓰는 상황도 '다음에 전체 양의 얼마를 썼다면 둘째 비율은 전체 양에 곱한다'로 성립한다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "남은 양이라는 조건을 본문에 노출하여 전체/전체 등 조건·결론을 함께 바꾸는 대안을 배제했다. 둘째 비율의 기준량을 묻는다."
    },
    {
      "id": "m1-04-03-xc5",
      "grade": "m1",
      "chapter": "4. 그래프와 비례",
      "after": "$x$가 출발 후 지난 시간이고 $y$가 물의 양이나 이동 거리 같은 양을 나타내는 그래프에서, $x=0$일 때의 $y$값은 {출발할 때}의 양을 나타낸다.",
      "completedDefinition": "$x$가 출발 후 지난 시간이고 $y$가 물의 양이나 이동 거리 같은 양을 나타내는 그래프에서, $x=0$일 때의 $y$값은 출발할 때의 양을 나타낸다.",
      "studentSentence": "$x$가 출발 후 지난 시간이고 $y$가 물의 양이나 이동 거리 같은 양을 나타내는 그래프에서, $x=0$일 때의 $y$값은 □의 양을 나타낸다.",
      "expectedAnswers": [
        "출발할 때"
      ],
      "blindResponse": {
        "id": "m1-04-03-xc5",
        "answers": [
          "처음"
        ],
        "alternativeAnswers": [],
        "reason": "'출발할 때', '시작할 때'는 같은 뜻이며 다른 의미의 대안은 없다. 다만 '출발 후 지난 시간'은 물의 양 상황과 어울리지 않아 어색하다."
      },
      "originalFinding": {
        "id": "m1-04-03-xc5",
        "grade": "m1",
        "section": "중1::4. 그래프와 비례::그래프의 이해",
        "sourceHash": "faf41a053ec128c51eda367871f7d197ae2ea3dad0f5ebd8b49f3f95e7189852",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "hidden-condition",
        "student": "그래프에서 $x=0$일 때의 점은 □ 상태, 곧 출발할 때의 □을 나타낸다.",
        "expected": [
          "처음",
          "값"
        ],
        "reason": "둘째 빈칸 '값'은 범용 명사라 '양', 'y의 값' 등으로 답의 종류가 흐리다. x가 출발 후 경과 시간이라는 전제도 문장에 없어 '출발할 때'가 갑자기 등장한다.",
        "proposal": "'x가 출발 후 시간을 나타내는 그래프에서'를 넣고, 둘째 빈칸은 'y의 값'처럼 대상을 특정하거나 노출한다.",
        "primaryReason": "x가 시간을 나타내며 x=0을 출발 시점으로 삼았다는 조건이 없다. 일반 그래프에서 x=0인 점이 처음 상태를 뜻하지 않으므로, 시간 그래프라는 맥락을 독립 문항에도 제시할 필요가 있다.",
        "primaryProposal": "가로축이 출발 후 경과 시간을 나타낸다는 조건을 남긴다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "x가 기온이고 y가 판매량인 그래프의 x=0은 출발 시간이 아니라 섭씨 0도일 때이다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "x가 경과 시간이라는 전제와 y의 대상을 명시했다. 처음 상태의 의미를 묻고 값이라는 범용 명사 빈칸을 없앴다."
    },
    {
      "id": "m1-02-01-c8",
      "grade": "m1",
      "chapter": "2. 정수와 유리수",
      "after": "유리수는 정수인지 아닌지에 따라 {정수}와 {정수가 아닌 유리수}로 나뉜다. $-\\frac{1}{2}$, $0.3$ 같은 수는 후자에 속한다.",
      "completedDefinition": "유리수는 정수인지 아닌지에 따라 정수와 정수가 아닌 유리수로 나뉜다. $-\\frac{1}{2}$, $0.3$ 같은 수는 후자에 속한다.",
      "studentSentence": "유리수는 정수인지 아닌지에 따라 □와 □로 나뉜다. $-\\frac{1}{2}$, $0.3$ 같은 수는 후자에 속한다.",
      "expectedAnswers": [
        "정수",
        "정수가 아닌 유리수"
      ],
      "blindResponse": {
        "id": "m1-02-01-c8",
        "answers": [
          "정수",
          "정수가 아닌 유리수"
        ],
        "alternativeAnswers": [],
        "reason": "답 노출: '정수인지 아닌지에 따라'가 두 빈칸의 답을 사실상 그대로 알려 준다. 분류 자체는 정확하다."
      },
      "originalFinding": {
        "id": "m1-02-01-c8",
        "grade": "m1",
        "section": "중1::2. 정수와 유리수::정수와 유리수",
        "sourceHash": "56ee519f96c56a8bae0167775ccbfd763784c63555eb6d66e299bcc93fadbd71",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "answer-leak",
        "student": "유리수는 □와 □로 나뉜다. $-\\frac{1}{2}$, $0.3$ 같은 수가 정수가 아닌 유리수이다.",
        "expected": [
          "정수",
          "정수가 아닌 유리수"
        ],
        "reason": "답 조합은 '정수/정수가 아닌 유리수'로 유일해 무엇을 쓸지는 분명하다. 다만 둘째 답이 다음 문장에 글자 그대로 있어 그 빈칸은 옮겨 적기가 된다. 이는 명료성 결함이 아니라 빈칸 설계 문제다.",
        "proposal": "뒤 문장을 '-1/2, 0.3 같은 수가 후자에 속한다'로 바꾸거나 둘째 빈칸을 해제한다.",
        "primaryReason": "두 번째 빈칸의 기대답 '정수가 아닌 유리수'가 바로 다음 문장에 그대로 제시된다. 유리수의 분류를 알지 못해도 같은 표현을 복사할 수 있다.",
        "primaryProposal": "분류를 묻는 문장 뒤의 예시에서는 분류명을 되풀이하지 않는 방향을 검토한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
        "batch": "m1m2"
      },
      "authorReason": "분류 기준을 정수 여부로 고정하여 양수·음수 등 다른 분류 대안을 없앴다. 예시의 개념명 반복은 후자로 바꿔 설명을 보존했다."
    },
    {
      "id": "m1-04-05-c5",
      "grade": "m1",
      "chapter": "4. 그래프와 비례",
      "after": "반비례 관계 $y=\\frac{a}{x}$의 그래프는 $a>0$이면 제{$1$, $3$}사분면을, $a<0$이면 제{$2$, $4$}사분면을 지난다.",
      "completedDefinition": "반비례 관계 $y=\\frac{a}{x}$의 그래프는 $a>0$이면 제$1$, $3$사분면을, $a<0$이면 제$2$, $4$사분면을 지난다.",
      "studentSentence": "반비례 관계 $y=\\frac{a}{x}$의 그래프는 $a>0$이면 제□사분면을, $a<0$이면 제□사분면을 지난다.",
      "expectedAnswers": [
        "$1$, $3$",
        "$2$, $4$"
      ],
      "blindResponse": {
        "id": "m1-04-05-c5",
        "answers": [
          "1, 3",
          "2, 4"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다. 빈칸마다 두 수를 쓰는 형식이다."
      },
      "originalFinding": {
        "id": "m1-04-05-c5",
        "grade": "m1",
        "section": "중1::4. 그래프와 비례::반비례 관계 y=a/x의 그래프",
        "sourceHash": "4ca5945f2ef62e5eef71f74b9457aa00782322b891226e251a03b615812f622f",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "$a>0$이면 그래프는 제□사분면을, $a<0$이면 제□사분면을 지난다.",
        "expected": [
          "$1$, $3$",
          "$2$, $4$"
        ],
        "reason": "관계식이 빠져 있지만 대단원 안의 y=ax와 y=a/x 어느 쪽으로 읽어도 답은 '1, 3 / 2, 4'로 같다. 학생이 쓸 답은 정해지므로 prior의 confirmed에는 동의하지 않고, 지시 대상 누락만 보완 대상으로 본다.",
        "proposal": "'반비례 관계 y=a/x의 그래프는'을 명시한다.",
        "primaryReason": "학생 문장에 그래프의 관계식이나 정비례·반비례라는 이름이 전혀 없고 매개변수 a만 제시된다. a의 부호만으로 그래프의 방향 또는 지나는 사분면을 결정할 수 없으며, 단원 제목이나 앞 문항을 임의로 보충해야 기대답을 알 수 있다.",
        "primaryProposal": "문장에 반비례 관계식 y=a/x를 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "a>0이어도 y=ax와 y=-ax는 서로 다른 사분면을 지나므로 a의 부호만으로 답을 정할 수 없다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "반비례 관계식을 명시하여 어느 그래프인지 소제목 없이 알 수 있게 했다. x=0은 관계식 자체에서 제외되며 부호별 사분면은 유지된다."
    },
    {
      "id": "m1-05-03-c1",
      "grade": "m1",
      "chapter": "5. 기본 도형",
      "after": "점과 직선의 위치 관계는 두 가지이다. 직선이 점을 지나면 점은 직선 {위}에 있고, 지나지 않으면 직선 {밖}에 있다.",
      "completedDefinition": "점과 직선의 위치 관계는 두 가지이다. 직선이 점을 지나면 점은 직선 위에 있고, 지나지 않으면 직선 밖에 있다.",
      "studentSentence": "점과 직선의 위치 관계는 두 가지이다. 직선이 점을 지나면 점은 직선 □에 있고, 지나지 않으면 직선 □에 있다.",
      "expectedAnswers": [
        "위",
        "밖"
      ],
      "blindResponse": {
        "id": "m1-05-03-c1",
        "answers": [
          "위",
          "밖"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다. 교과서 표현(직선 위에 있다 / 직선 밖에 있다)과 일치한다."
      },
      "originalFinding": {
        "id": "m1-05-03-c1",
        "grade": "m1",
        "section": "중1::5. 기본 도형::두 직선의 위치 관계",
        "sourceHash": "4daf44323dcd15fccaf5b12419d9a27eb5ec819c1e97acaba8b135bc357195e1",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "answer-leak",
        "student": "점은 직선 □ 직선 □. 직선이 점을 지날 때 점이 직선 위에 있다고 한다.",
        "expected": [
          "위에 있거나",
          "밖에 있다"
        ],
        "reason": "빈칸이 '위에 있거나'처럼 연결어미가 붙은 서술구라 '직선 □ 직선 □.'만으로는 응답 형태가 불친절하다. 뒤 문장이 '직선 위에 있다'를 그대로 보여 첫 빈칸은 옮겨 적기가 되지만, 답 자체는 정해진다.",
        "proposal": "'점은 직선 위에 있거나 직선 □에 있다'처럼 명사형 빈칸으로 바꾸고 중복 표현을 정리한다.",
        "primaryReason": "첫 빈칸의 핵심 표현 '직선 위에 있다'가 뒤의 '점이 직선 위에 있다고 한다'에 그대로 제시된다. 위치 관계의 한 종류를 답하는 대신 뒤 문장을 옮겨 쓸 수 있다.",
        "primaryProposal": "뒤 설명과 겹치는 분류명은 한 번만 제시하는 방향을 검토한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
        "batch": "m1m2"
      },
      "authorReason": "각 위치의 조건을 따로 드러내고 위/밖이라는 짧은 핵심어만 가렸다. 연결 어미를 포함한 서술절 빈칸과 중복 답 노출을 없앴다."
    },
    {
      "id": "m1-05-03-c5",
      "grade": "m1",
      "chapter": "5. 기본 도형",
      "after": "공간에서 두 직선은 한 점에서 만나거나, 평행하거나, 일치하거나, {꼬인 위치}에 있다. 마지막 경우의 두 직선은 {한 평면} 위에 있지 않다.",
      "completedDefinition": "공간에서 두 직선은 한 점에서 만나거나, 평행하거나, 일치하거나, 꼬인 위치에 있다. 마지막 경우의 두 직선은 한 평면 위에 있지 않다.",
      "studentSentence": "공간에서 두 직선은 한 점에서 만나거나, 평행하거나, 일치하거나, □에 있다. 마지막 경우의 두 직선은 □ 위에 있지 않다.",
      "expectedAnswers": [
        "꼬인 위치",
        "한 평면"
      ],
      "blindResponse": {
        "id": "m1-05-03-c5",
        "answers": [
          "꼬인 위치",
          "한 평면"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다('같은 평면'은 같은 답). 수학적으로 정확하다."
      },
      "originalFinding": {
        "id": "m1-05-03-c5",
        "grade": "m1",
        "section": "중1::5. 기본 도형::두 직선의 위치 관계",
        "sourceHash": "509f3d9fbd7384df27e22fb8dfe273e2327324d097b378227ce7c55eb409bce5",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "answer-leak",
        "student": "공간에서 두 직선은 한 점에서 만나거나, 평행하거나, 일치하거나, □에 있다. 꼬인 위치의 두 직선은 □ 위에 있지 않다.",
        "expected": [
          "꼬인 위치",
          "한 평면"
        ],
        "reason": "답은 유일하고 무엇을 쓸지 분명해 명료성 결함은 아니다. 첫 빈칸 '꼬인 위치'가 다음 문장 주어에 그대로 나와 그 빈칸의 회상 기능만 없어진다.",
        "proposal": "둘째 문장을 '이때 두 직선은 □ 위에 있지 않다'로 바꾼다.",
        "primaryReason": "첫 빈칸의 기대답 '꼬인 위치'가 다음 문장의 주어로 그대로 노출된다. 공간에서 두 직선의 위치 관계를 떠올리지 않아도 분류명을 복사할 수 있다.",
        "primaryProposal": "꼬인 위치의 특징을 설명할 때 분류명을 다시 쓰지 않거나 별도 문항으로 분리한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
        "batch": "m1m2"
      },
      "authorReason": "두 번째 문장의 꼬인 위치 반복을 마지막 경우로 바꾸었다. 앞의 세 관계와 한 평면 위에 있지 않다는 조건이 남은 관계를 정한다."
    },
    {
      "id": "m1-05-07-c1",
      "grade": "m1",
      "chapter": "5. 기본 도형",
      "after": "모양과 크기가 같아 완전히 포개지는 두 도형은 {합동}이며, 두 도형 사이에 기호 {$\\equiv$}를 써서 나타낸다.",
      "completedDefinition": "모양과 크기가 같아 완전히 포개지는 두 도형은 합동이며, 두 도형 사이에 기호 $\\equiv$를 써서 나타낸다.",
      "studentSentence": "모양과 크기가 같아 완전히 포개지는 두 도형은 □이며, 두 도형 사이에 기호 □를 써서 나타낸다.",
      "expectedAnswers": [
        "합동",
        "$\\equiv$"
      ],
      "blindResponse": {
        "id": "m1-05-07-c1",
        "answers": [
          "합동",
          "≡"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다."
      },
      "originalFinding": {
        "id": "m1-05-07-c1",
        "grade": "m1",
        "section": "중1::5. 기본 도형::합동",
        "sourceHash": "af637286def7aa26a58576c672708320a39c81a81160fbcd0a930c9bb3a214ba",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "answer-leak",
        "student": "모양과 크기가 같아 □ 두 도형은 합동이며, $\\triangle ABC\\equiv\\triangle DEF$처럼 기호 □를 쓴다.",
        "expected": [
          "완전히 포개지는",
          "$\\equiv$"
        ],
        "reason": "문장은 명료하고 답도 유일하다. 그러나 묻는 기호가 바로 앞 예시에 적혀 있어 둘째 빈칸은 회상 없이 채워진다. 설계 개선 사항이지 확정 결함은 아니다.",
        "proposal": "예시 식을 빼고 '기호 □를 써서 나타낸다'로 하거나, 기호 빈칸을 없애고 '합동'을 빈칸으로 둔다.",
        "primaryReason": "기호를 묻는 빈칸 앞 예시에 합동 기호 ≡가 그대로 적혀 있다. 합동 기호의 회상 여부를 확인할 수 없다.",
        "primaryProposal": "예시의 기호도 빈칸 처리하거나 기호를 묻는 빈칸을 다른 학습 요소로 바꾼다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
        "batch": "m1m2"
      },
      "authorReason": "합동의 정의와 기호는 유지하면서 기호가 그대로 드러나는 예시 식과 긴 서술구 빈칸을 없앴다. 모양과 크기가 같다는 조건이 합동을 특정한다."
    },
    {
      "id": "m1-01-04-c5",
      "grade": "m1",
      "chapter": "1. 소인수분해",
      "after": "$1$보다 큰 두 자연수의 최소공배수는 소인수분해한 뒤, 공통인 소인수의 지수가 같으면 그대로, 다르면 {큰} 지수의 거듭제곱을 택하고, 공통이 아닌 소인수의 거듭제곱도 모두 곱해 구한다. 한 수가 $1$이면 최소공배수는 다른 수이다.",
      "completedDefinition": "$1$보다 큰 두 자연수의 최소공배수는 소인수분해한 뒤, 공통인 소인수의 지수가 같으면 그대로, 다르면 큰 지수의 거듭제곱을 택하고, 공통이 아닌 소인수의 거듭제곱도 모두 곱해 구한다. 한 수가 $1$이면 최소공배수는 다른 수이다.",
      "studentSentence": "$1$보다 큰 두 자연수의 최소공배수는 소인수분해한 뒤, 공통인 소인수의 지수가 같으면 그대로, 다르면 □ 지수의 거듭제곱을 택하고, 공통이 아닌 소인수의 거듭제곱도 모두 곱해 구한다. 한 수가 $1$이면 최소공배수는 다른 수이다.",
      "expectedAnswers": [
        "큰"
      ],
      "blindResponse": {
        "id": "m1-01-04-c5",
        "answers": [
          "큰"
        ],
        "alternativeAnswers": [],
        "reason": "최소공배수는 공통인 소인수의 지수가 다르면 큰 쪽 지수를 택하므로 '큰'으로 유일하다('더 큰'은 동의 표현). '작은'을 넣으면 거짓이 되고, 답 노출은 없다. 공통이 아닌 소인수도 모두 곱한다는 설명과 한 수가 1인 경우의 보충도 정확하다. 다만 '1보다 큰 두 자연수'로 시작한 뒤 '한 수가 1이면'을 덧붙여 적용 범위 표현이 약간 어색하나 오류는 아니다."
      },
      "originalFinding": {
        "id": "m1-01-04-c5",
        "grade": "m1",
        "section": "중1::1. 소인수분해::공배수와 최소공배수",
        "sourceHash": "2078b65f8bad52a5fcd1c764016441d8b0a266bb23b60782a4549b0759d9c007",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "missing-referent",
        "student": "소인수분해한 뒤 공통인 소인수는 지수가 □ 쪽을 택하고, 공통이 아닌 소인수도 □ 곱한다.",
        "expected": [
          "큰",
          "모두"
        ],
        "reason": "'공통이 아닌 소인수도 곱한다'에서 최소공배수 절차임이 드러나 '큰/모두'는 사실상 정해진다. 다만 구하는 대상이 문장에 없고 둘째 빈칸이 부사라 경미한 보완 여지가 있다.",
        "proposal": "'두 수의 최소공배수는'을 문두에 넣는다. 우선순위는 낮다.",
        "primaryReason": "어떤 수들을 소인수분해하고 무엇을 구하는 절차인지 학생 문장에 없다. 공통 아닌 소인수도 곱한다는 설명에서 최소공배수를 추측할 수 있지만 문항 자체의 목표는 제시되지 않는다.",
        "primaryProposal": "두 자연수의 최소공배수를 구하는 절차라는 목적을 문장에 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "최소공배수라는 목표와 지수 선택을 명시했다. 공통이 아닌 소인수도 원래 지수대로 곱함을 거듭제곱으로 표현하고 두 수 모두 1인 경우를 보완했다. 각 소인수 자체가 아니라 선택한 지수의 거듭제곱을 곱함을 명시했다. 0 또는 1의 경계와 퇴화 도형을 점검하여 해당 조건과 예외를 문장에 명시했다."
    },
    {
      "id": "m1-08-05-c3",
      "grade": "m1",
      "chapter": "8. 통계",
      "after": "도수분포다각형을 그릴 때 양 끝에는 도수가 {$0$}인 계급이 하나씩 더 있다고 보고, 그 계급의 {가운데 점}까지 이어 가로축에 닿게 한다.",
      "completedDefinition": "도수분포다각형을 그릴 때 양 끝에는 도수가 $0$인 계급이 하나씩 더 있다고 보고, 그 계급의 가운데 점까지 이어 가로축에 닿게 한다.",
      "studentSentence": "도수분포다각형을 그릴 때 양 끝에는 도수가 □인 계급이 하나씩 더 있다고 보고, 그 계급의 □까지 이어 가로축에 닿게 한다.",
      "expectedAnswers": [
        "$0$",
        "가운데 점"
      ],
      "blindResponse": {
        "id": "m1-08-05-c3",
        "answers": [
          "0",
          "중앙"
        ],
        "alternativeAnswers": [],
        "reason": "첫째 빈칸은 유일하다. 둘째 빈칸은 '중앙(가운데)의 점'이 현행 표현이다. '계급값'도 같은 뜻이지만 현행 중1 교육과정에서 빠진 용어이므로 기대 답이 '계급값'이면 용어를 고쳐야 한다."
      },
      "originalFinding": {
        "id": "m1-08-05-c3",
        "grade": "m1",
        "section": "중1::8. 통계::도수분포다각형",
        "sourceHash": "8c9849e2a614c7293727cd3e539e8171eb4d4a0aa42423dfba3e506bc9b02aa2",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "missing-referent",
        "student": "양 끝에는 도수가 □인 계급이 하나씩 더 있다고 보고, 그 □까지 이어 가로축에 닿게 한다.",
        "expected": [
          "$0$",
          "가운데 점"
        ],
        "reason": "대단원 '통계'와 '도수가 □인 계급', '가로축' 표현으로 도수분포다각형 절차임을 알 수 있어 답 '0/가운데 점(중앙)'은 정해진다. 주어가 없고 '그'의 지시가 느슨한 정도의 경미한 보완 사항이다.",
        "proposal": "'도수분포다각형을 그릴 때'를 문두에 넣고 '그 계급의 □'로 다듬는다.",
        "primaryReason": "'양 끝'과 '가운데 점'이 어느 그래프의 무엇을 가리키는지 명시되지 않는다. 도수분포다각형을 완성하는 절차라는 단원이 없으면 그래프 양 끝을 처리하는 이유를 추측해야 한다.",
        "primaryProposal": "도수분포다각형을 그릴 때라는 설명을 앞에 넣고, 추가 계급의 중앙에 해당하는 가로축 위 점을 명확히 가리킨다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "도수분포다각형이라는 작도 대상과 그 계급이라는 지시 대상을 명시했다. 양 끝의 도수 0과 계급 가운데 점을 연결하는 이유를 유지했다."
    },
    {
      "id": "m2-01-07-c1",
      "grade": "m2",
      "chapter": "1. 수와 식",
      "after": "각 항의 차수 가운데 가장 큰 것이 $2$인 다항식을 {이차식}이라 한다.",
      "completedDefinition": "각 항의 차수 가운데 가장 큰 것이 $2$인 다항식을 이차식이라 한다.",
      "studentSentence": "각 항의 차수 가운데 가장 큰 것이 $2$인 다항식을 □이라 한다.",
      "expectedAnswers": [
        "이차식"
      ],
      "blindResponse": {
        "id": "m2-01-07-c1",
        "answers": [
          "이차식"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다. 정의가 정확하다."
      },
      "originalFinding": {
        "id": "m2-01-07-c1",
        "grade": "m2",
        "section": "중2::1. 수와 식::다항식의 덧셈과 뺄셈",
        "sourceHash": "03523a86080093352b149daa13bf0b44ce0fffb6ffc94dbb1beeb26092c3984b",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "각 항의 차수 가운데 가장 큰 것이 □인 다항식을 □이라 한다.",
        "expected": [
          "$2$",
          "이차식"
        ],
        "reason": "차수와 식의 이름을 모두 가려 '1/일차식', '2/이차식', '3/삼차식'이 모두 참인 정의가 된다. 조사 '이라'도 세 답을 모두 허용하고 대단원 '수와 식'만으로는 이차식으로 좁혀지지 않는다.",
        "proposal": "차수 2 또는 '이차식' 중 하나를 노출한다.",
        "primaryReason": "최고차항의 차수와 식의 명칭을 모두 가렸다. 2/이차식 외에 1/일차식, 3/삼차식도 서로 다른 정의인데 동일한 학생 문장을 참으로 완성한다.",
        "primaryProposal": "최고차항의 차수 2 또는 이차식이라는 이름 중 하나를 남긴다.",
        "initialAlternativeAnswers": [
          "1 / 일차식",
          "3 / 삼차식"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "차수 2를 노출하여 1/일차식 등 다른 차수와 이름의 쌍을 배제했다. 이차식이라는 기존 개념의 정의를 그대로 묻는다."
    },
    {
      "id": "m2-02-07-xc19",
      "grade": "m2",
      "chapter": "2. 부등식",
      "after": "소금물에 물만 넣고, $0\\%$보다 높고 처음 농도보다 낮은 농도를 기준으로 하자. 그 농도 이상을 지킬 수 있는 물의 양 중 가장 큰 값을 {최댓값}이라 하고, 그 농도 이하로 낮출 수 있는 물의 양 중 가장 작은 값을 {최솟값}이라 한다.",
      "completedDefinition": "소금물에 물만 넣고, $0\\%$보다 높고 처음 농도보다 낮은 농도를 기준으로 하자. 그 농도 이상을 지킬 수 있는 물의 양 중 가장 큰 값을 최댓값이라 하고, 그 농도 이하로 낮출 수 있는 물의 양 중 가장 작은 값을 최솟값이라 한다.",
      "studentSentence": "소금물에 물만 넣고, $0\\%$보다 높고 처음 농도보다 낮은 농도를 기준으로 하자. 그 농도 이상을 지킬 수 있는 물의 양 중 가장 큰 값을 □이라 하고, 그 농도 이하로 낮출 수 있는 물의 양 중 가장 작은 값을 □이라 한다.",
      "expectedAnswers": [
        "최댓값",
        "최솟값"
      ],
      "blindResponse": {
        "id": "m2-02-07-xc19",
        "answers": [
          "최댓값",
          "최솟값"
        ],
        "alternativeAnswers": [],
        "reason": "'가장 큰 값', '가장 작은 값'이라는 풀이말로 의미는 최대·최소로 하나로 정해지고, 순서를 바꾸면 거짓이 된다. 다만 교과서에 고정된 용어가 아니어서 표기가 하나로 정해지지 않는다. '최댓값/최솟값'과 '최대량/최소량'이 모두 조사 '이라'에 맞고 뜻이 같아, 어느 쪽이 기대 답인지는 문장만으로 확정할 수 없다. 채점에서 두 표기를 모두 허용하거나 빈칸 앞뒤로 표기를 고정해야 한다. 빈칸 바로 앞의 풀이말이 답을 거의 그대로 알려 주므로 난도는 매우 낮다. 수학적으로는 정확하다. 넣는 물의 양을 x라 하면 농도가 기준 이상인 것은 x가 어떤 값 이하인 것과 같고, 농도가 기준 이하인 것은 x가 그 값 이상인 것과 같아서, 두 빈칸이 가리키는 값은 같은 경계값이다. '물의 양'은 '더 넣는 물의 양'으로 명시하는 편이 안전하다. 중2 부등식 활용에서는 보통 '최대 몇 g', '최소 몇 g'으로 표현하므로 용어 수준은 무리가 없다."
      },
      "originalFinding": {
        "id": "m2-02-07-xc19",
        "grade": "m2",
        "section": "중2::2. 부등식::일차부등식의 활용(농도)",
        "sourceHash": "c475d254ec88498e3165609405676acb91205c52603b31a9380e8b4a82d1de38",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "hidden-condition",
        "student": "처음 농도보다 낮은 농도를 기준으로 할 때, 그 농도 이상으로 지키려면 넣는 물에 □이 있고 그 농도 이하로 낮추려면 넣는 물에 □이 있다.",
        "expected": [
          "최댓값",
          "최솟값"
        ],
        "reason": "일반적인 양의 목표 농도에서는 답이 정해진다는 Claude 의견을 반영한다. 다만 목표 농도 0%는 문장에 배제되어 있지 않아 자연수 회상 오류로 확정하지 않고 범위 명시 후보로 둔다.",
        "proposal": "유지.",
        "primaryReason": "기준 농도가 처음보다 낮다는 조건만 있고 0%보다 높다는 조건이 없다. 기준이 0%이면 아무리 물을 넣어도 농도는 0% 이상이어서 넣는 물의 최댓값이 존재하지 않는다.",
        "primaryProposal": "기준 농도가 0%보다 크고 처음 농도보다 작다는 범위를 제시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "10% 소금물을 0% 이상으로 유지하려는 경우 넣는 물의 양에 유한한 최댓값이 없다.",
        "additionalEvidence": null,
        "adjudication": "일반적인 양의 목표 농도에서는 답이 정해진다는 Claude 의견을 반영한다. 다만 목표 농도 0%는 문장에 배제되어 있지 않아 자연수 회상 오류로 확정하지 않고 범위 명시 후보로 둔다.",
        "batch": "m1m2"
      },
      "authorReason": "물만 넣는 소금물 상황과 양의 목표 농도를 명시했다. 목표 0%에서는 유한한 최대·최소 물의 양 진술이 성립하지 않는 반례를 배제했다. 0이라는 하한이 첫 빈칸의 최솟값도 참으로 만드는 반례를 반영하여 가장 큰 값·가장 작은 값이라는 응답 대상을 명시했다. 값 자체를 답하는 해석을 피하기 위해 가장 큰 값·가장 작은 값의 명칭을 묻는 ~이라 한다 형식으로 다듬었다."
    },
    {
      "id": "m2-02-04-xc4",
      "grade": "m2",
      "chapter": "2. 부등식",
      "after": "구한 해가 개수나 사람 수이면 $0$ 이상의 {정수}여야 한다. 실제 길이나 가격이면 문제 상황에 따라 $0$을 허용하는지도 확인하고, $0$을 허용하지 않으면 {양수}여야 한다.",
      "completedDefinition": "구한 해가 개수나 사람 수이면 $0$ 이상의 정수여야 한다. 실제 길이나 가격이면 문제 상황에 따라 $0$을 허용하는지도 확인하고, $0$을 허용하지 않으면 양수여야 한다.",
      "studentSentence": "구한 해가 개수나 사람 수이면 $0$ 이상의 □여야 한다. 실제 길이나 가격이면 문제 상황에 따라 $0$을 허용하는지도 확인하고, $0$을 허용하지 않으면 □여야 한다.",
      "expectedAnswers": [
        "정수",
        "양수"
      ],
      "blindResponse": {
        "id": "m2-02-04-xc4",
        "answers": [
          "정수",
          "양수"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다. 첫째 빈칸에 '자연수'를 넣으면 '0 이상의'와 맞지 않는다."
      },
      "originalFinding": {
        "id": "m2-02-04-xc4",
        "grade": "m2",
        "section": "중2::2. 부등식::일차부등식의 활용(수, 평균, 정가)",
        "sourceHash": "a0fc71c03e08913791c1137019a5f4b97a146b28633a4c62ae252c0277ee34cc",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "math-error",
        "student": "구한 해가 개수나 사람 수이면 □여야 하고, 길이나 가격이면 □여야 한다.",
        "expected": [
          "자연수",
          "양수"
        ],
        "reason": "Claude는 자연수라는 교과의 관용적 점검 문구를 인정했지만, 리드는 남은 물건이 0개인 상황 등을 드문 형식적 반례로 보지 않는다. 답의 종류 자체는 분명하므로 응답 모호 확정에서 빼되 0을 허용하는 실제 상황의 조건 검토를 남긴다.",
        "proposal": "유지. 채점에서 '0 이상의 정수/음이 아닌 정수'류 답의 허용 여부만 정해 두면 된다.",
        "primaryReason": "개수와 사람 수를 조건 없이 자연수로 제한한다. 0개 또는 0명도 가능한 활용 문제가 있으므로 주어진 문장만으로는 양의 정수만 허용하는 기대답을 정당화할 수 없다.",
        "primaryProposal": "0개가 가능한지 문제의 조건에 따라 확인하고 일반적으로는 0 이상의 정수로 제시한다.",
        "initialAlternativeAnswers": [
          "0 이상의 정수"
        ],
        "initialCounterexample": "사과와 배를 합해 5개 사는 문제에서 사과를 0개, 배를 5개 살 수 있다면 사과 개수 0은 정당한 해이다.",
        "additionalEvidence": null,
        "adjudication": "Claude는 자연수라는 교과의 관용적 점검 문구를 인정했지만, 리드는 남은 물건이 0개인 상황 등을 드문 형식적 반례로 보지 않는다. 답의 종류 자체는 분명하므로 응답 모호 확정에서 빼되 0을 허용하는 실제 상황의 조건 검토를 남긴다.",
        "batch": "m1m2"
      },
      "authorReason": "남은 물건 0개나 무료 가격처럼 0이 가능한 상황을 인정했다. 개수의 정수 조건과 0을 허용하지 않는 길이·가격의 양수 조건을 분리했다."
    },
    {
      "id": "m2-01-07-c5",
      "grade": "m2",
      "chapter": "1. 수와 식",
      "after": "괄호가 겹친 식은 가장 {안쪽}의 괄호부터 푼다. 소괄호를 중괄호로 감싸고 이를 대괄호로 감싼 식에서는 소괄호, 중괄호, 대괄호 순서로 푼다.",
      "completedDefinition": "괄호가 겹친 식은 가장 안쪽의 괄호부터 푼다. 소괄호를 중괄호로 감싸고 이를 대괄호로 감싼 식에서는 소괄호, 중괄호, 대괄호 순서로 푼다.",
      "studentSentence": "괄호가 겹친 식은 가장 □의 괄호부터 푼다. 소괄호를 중괄호로 감싸고 이를 대괄호로 감싼 식에서는 소괄호, 중괄호, 대괄호 순서로 푼다.",
      "expectedAnswers": [
        "안쪽"
      ],
      "blindResponse": {
        "id": "m2-01-07-c5",
        "answers": [
          "안쪽"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다."
      },
      "originalFinding": {
        "id": "m2-01-07-c5",
        "grade": "m2",
        "section": "중2::1. 수와 식::다항식의 덧셈과 뺄셈",
        "sourceHash": "5ecca6bef6e0c12f0b5779d878ea00474720e1bdee3021c361e2208e6a1488d5",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "math-error",
        "student": "괄호가 겹쳐 있으면 □, 중괄호, □의 순서로 안쪽부터 푼다.",
        "expected": [
          "소괄호",
          "대괄호"
        ],
        "reason": "소괄호→중괄호→대괄호 순서는 교과서의 표준 규약이고, 문장에 '안쪽부터'도 함께 있어 답이 유일하다. prior의 (2+[3×4]) 반례는 교과 표기 규약에서 벗어난 식이다.",
        "proposal": "유지.",
        "primaryReason": "괄호 계산의 기준은 모양이 아니라 안쪽부터라는 포함 관계이다. 소괄호·중괄호·대괄호라는 고정 순서를 정답으로 삼으면 다른 모양 순서로 중첩된 적법한 식에서 계산 순서를 오해하게 할 수 있다.",
        "primaryProposal": "안쪽 괄호부터 계산한다는 기준을 묻고, 괄호 모양의 나열을 필수 정답으로 삼지 않는 방향을 검토한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "(2+[3×4])에서는 대괄호가 소괄호보다 안쪽이다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "괄호의 일반 계산 규칙 안쪽부터를 묻고 표준 괄호 배치를 조건으로 드러냈다. 임의의 배치에도 이름 순서를 강제하지 않으면서 교과의 세 괄호 순서 설명을 보존했다."
    },
    {
      "id": "m2-05-05-c9",
      "grade": "m2",
      "chapter": "5. 도형의 성질",
      "after": "평행사변형에 대각선을 하나 그으면, 평행한 두 쌍의 대변에서 {엇각}이 각각 같은 두 삼각형이 생긴다. 공통인 대각선과 양 끝 각을 이용한 {$\\mathrm{ASA}$} 합동으로 대변의 길이가 같음을 보인다.",
      "completedDefinition": "평행사변형에 대각선을 하나 그으면, 평행한 두 쌍의 대변에서 엇각이 각각 같은 두 삼각형이 생긴다. 공통인 대각선과 양 끝 각을 이용한 $\\mathrm{ASA}$ 합동으로 대변의 길이가 같음을 보인다.",
      "studentSentence": "평행사변형에 대각선을 하나 그으면, 평행한 두 쌍의 대변에서 □이 각각 같은 두 삼각형이 생긴다. 공통인 대각선과 양 끝 각을 이용한 □ 합동으로 대변의 길이가 같음을 보인다.",
      "expectedAnswers": [
        "엇각",
        "$\\mathrm{ASA}$"
      ],
      "blindResponse": {
        "id": "m2-05-05-c9",
        "answers": [
          "엇각",
          "ASA"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다. '엇각이 각각 같은'은 '엇각의 크기가 각각 같은'이 더 정확하다."
      },
      "originalFinding": {
        "id": "m2-05-05-c9",
        "grade": "m2",
        "section": "중2::5. 도형의 성질::평행사변형의 성질",
        "sourceHash": "009835cc9e6e8c2157d68bb4896c3192566360e0405e3d1c89e0bcb365b0e11b",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "대각선을 하나 그으면 □이 같은 두 삼각형이 □ 합동이 되어 대변의 길이가 같음이 나온다.",
        "expected": [
          "엇각",
          "$\\mathrm{ASA}$"
        ],
        "reason": "'평행사변형'이 빠져 있으나 '대각선'과 '대변의 길이가 같음'으로 대상이 드러나고, '엇각/ASA' 외의 다른 답 조합은 없다. 답을 정할 수 없는 수준은 아니므로 지시 대상 누락으로 본다.",
        "proposal": "'평행사변형에 대각선을 하나 그으면'으로 대상을 명시한다.",
        "primaryReason": "어느 사각형에 대각선을 그리는지 대상과 평행 조건이 없다. 엇각이 같아 두 삼각형이 ASA 합동이라는 결론은 임의의 사각형에서 성립하지 않으며, 학생은 평행사변형을 가정해야 한다.",
        "primaryProposal": "평행사변형에 대각선을 하나 그린다는 대상을 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "일반 사다리꼴에 대각선을 하나 그으면 생기는 두 삼각형이 합동일 필요가 없다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "평행사변형과 대각선이라는 대상을 명시했다. 공통인 한 변과 양 끝 각이라는 근거를 노출하여 SAS 등 다른 합동 조건을 택할 수 없게 했다."
    },
    {
      "id": "m2-07-02-c5",
      "grade": "m2",
      "chapter": "7. 닮음의 활용",
      "after": "삼각형 $ABC$에서 $\\angle A$의 이등분선이 $BC$와 만나는 점을 $D$라 하자. $C$를 지나 $AD$에 {평행}한 직선이 $BA$의 연장선과 만나는 점을 $E$라 하면 $\\triangle ACE$는 {이등변삼각형}이다. 이를 이용해 $\\overline{BD}:\\overline{DC}=\\overline{AB}:\\overline{AC}$를 보인다.",
      "completedDefinition": "삼각형 $ABC$에서 $\\angle A$의 이등분선이 $BC$와 만나는 점을 $D$라 하자. $C$를 지나 $AD$에 평행한 직선이 $BA$의 연장선과 만나는 점을 $E$라 하면 $\\triangle ACE$는 이등변삼각형이다. 이를 이용해 $\\overline{BD}:\\overline{DC}=\\overline{AB}:\\overline{AC}$를 보인다.",
      "studentSentence": "삼각형 $ABC$에서 $\\angle A$의 이등분선이 $BC$와 만나는 점을 $D$라 하자. $C$를 지나 $AD$에 □한 직선이 $BA$의 연장선과 만나는 점을 $E$라 하면 $\\triangle ACE$는 □이다. 이를 이용해 $\\overline{BD}:\\overline{DC}=\\overline{AB}:\\overline{AC}$를 보인다.",
      "expectedAnswers": [
        "평행",
        "이등변삼각형"
      ],
      "blindResponse": {
        "id": "m2-07-02-c5",
        "answers": [
          "평행",
          "이등변삼각형"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다. '수직'을 넣으면 교점이 반직선 AB 쪽에 생겨 'BA의 연장선' 조건과 맞지 않으므로 대안이 아니다. 'BC'는 '변 BC'로 쓰는 편이 정확하다."
      },
      "originalFinding": {
        "id": "m2-07-02-c5",
        "grade": "m2",
        "section": "중2::7. 닮음의 활용::삼각형의 각의 이등분선",
        "sourceHash": "6ee5e97dde2fd55ce5ca8daeec00b8663e78183ff96318941c1773badc27d6c5",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "missing-referent",
        "student": "한 꼭짓점을 지나 이등분선에 □한 선을 그으면 □이 생겨서, 평행선과 선분의 비로 성질이 나온다.",
        "expected": [
          "평행",
          "이등변삼각형"
        ],
        "reason": "어느 삼각형의 어느 각의 이등분선인지, '성질'이 무엇인지 문장에 없다. '평행'은 뒤의 '평행선과 선분의 비'로, '이등변삼각형'은 증명 지식으로 정해지지만 지시 대상이 느슨하다.",
        "proposal": "'삼각형의 내각의 이등분선의 성질은, 다른 한 꼭짓점을 지나 …'처럼 주어와 구성을 밝힌다.",
        "primaryReason": "어느 내각의 이등분선인지와 그 각의 꼭짓점이 아닌 어느 꼭짓점을 지나는 보조선인지 명시되지 않는다. 이등분선이 시작하는 꼭짓점에서 같은 방향의 선을 그으면 새로운 삼각형이 생기지 않는다.",
        "primaryProposal": "삼각형 ABC와 A의 이등분선을 지정하고 B 또는 C에서 그 이등분선에 평행한 보조선을 긋는다는 구성을 제시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "어느 각의 이등분선인지, 지나는 꼭짓점과 연장선, 증명할 선분의 비를 명시했다. 평행선으로 만드는 이등변삼각형과 비례 증명이라는 기존 내용을 보존했다."
    },
    {
      "id": "m2-07-05-c3",
      "grade": "m2",
      "chapter": "7. 닮음의 활용",
      "after": "삼각형의 세 중선이 만나는 점의 개수는 {$1$}이다.",
      "completedDefinition": "삼각형의 세 중선이 만나는 점의 개수는 $1$이다.",
      "studentSentence": "삼각형의 세 중선이 만나는 점의 개수는 □이다.",
      "expectedAnswers": [
        "$1$"
      ],
      "blindResponse": {
        "id": "m2-07-05-c3",
        "answers": [
          "1"
        ],
        "alternativeAnswers": [],
        "reason": "유일하다(1, 1개, 하나는 같은 답). 다만 개수만 묻고 있어 무게중심 개념 자체는 확인하지 못한다."
      },
      "originalFinding": {
        "id": "m2-07-05-c3",
        "grade": "m2",
        "section": "중2::7. 닮음의 활용::삼각형의 무게중심",
        "sourceHash": "01a3066b90266dbe8bde9130d583a9a9f3b8cae6b566f17b0bf58ed6c09fceaf",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "open-answer",
        "student": "삼각형의 □은 반드시 □에서 만난다.",
        "expected": [
          "세 중선",
          "한 점"
        ],
        "reason": "'삼각형의 □은 반드시 □에서 만난다'는 세 중선, 세 변의 수직이등분선, 세 내각의 이등분선 모두로 참이 된다. 모두 같은 학년에서 배우는 내용이라 어느 선을 묻는지 정할 수 없다.",
        "proposal": "'세 중선'을 노출하고 '한 점'만 묻거나, '무게중심' 단서를 넣는다.",
        "primaryReason": "'삼각형의 □은 반드시 □에서 만난다'에서 어떤 선들의 만남을 묻는지 단서가 없다. 세 중선 외에도 세 변의 수직이등분선과 세 내각의 이등분선이 각각 한 점에서 만나며 서로 다른 중심을 설명한다.",
        "primaryProposal": "세 중선이라는 대상을 남기고 만나는 점의 수 또는 무게중심의 명칭을 묻는다.",
        "initialAlternativeAnswers": [
          "세 변의 수직이등분선 / 한 점",
          "세 내각의 이등분선 / 한 점"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "세 중선을 본문에 노출하여 내각 이등분선·변의 수직이등분선 등 다른 세 선의 교점 성질과 구별했다. 한 점이라는 위치 응답을 점의 개수로 바꾸어 무게중심·삼각형 내부 같은 다른 참 답을 배제했다."
    },
    {
      "id": "m2-05-02-xc16",
      "grade": "m2",
      "chapter": "5. 도형의 성질",
      "after": "직각삼각형의 합동 조건인 $\\mathrm{RHA}$와 $\\mathrm{RHS}$는 모두 {빗변}의 길이가 같아야 쓸 수 있다. 이 길이가 다르면 두 조건을 쓸 수 없다.",
      "completedDefinition": "직각삼각형의 합동 조건인 $\\mathrm{RHA}$와 $\\mathrm{RHS}$는 모두 빗변의 길이가 같아야 쓸 수 있다. 이 길이가 다르면 두 조건을 쓸 수 없다.",
      "studentSentence": "직각삼각형의 합동 조건인 $\\mathrm{RHA}$와 $\\mathrm{RHS}$는 모두 □의 길이가 같아야 쓸 수 있다. 이 길이가 다르면 두 조건을 쓸 수 없다.",
      "expectedAnswers": [
        "빗변"
      ],
      "blindResponse": {
        "id": "m2-05-02-xc16",
        "answers": [
          "빗변"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다. 내용이 정확하다."
      },
      "originalFinding": {
        "id": "m2-05-02-xc16",
        "grade": "m2",
        "section": "중2::5. 도형의 성질::직각삼각형의 합동",
        "sourceHash": "4988020427eeea53fd39d90f6dd56723bb6e2a36fb393ccad92bd93d37796252",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "answer-leak",
        "student": "직각삼각형의 합동 조건은 □이 같아야 쓸 수 있다. 빗변이 다르면 □도 $\\mathrm{RHS}$도 쓸 수 없다.",
        "expected": [
          "빗변",
          "$\\mathrm{RHA}$"
        ],
        "reason": "답은 '빗변/RHA'로 유일하고 문장도 명료하다. 다만 첫 답이 다음 문장 '빗변이 다르면'에 그대로 있고, 둘째 빈칸도 'RHS'와의 병렬로 자동 결정되어 두 빈칸 모두 회상 부담이 거의 없다.",
        "proposal": "둘째 문장을 '이것이 다르면 RHA도 RHS도 쓸 수 없다'로 바꾸는 등 중복을 없앤다.",
        "primaryReason": "첫 빈칸에서 묻는 빗변이 바로 다음 문장의 '빗변이 다르면'에 그대로 남는다. 특수 합동 조건에서 필요한 변을 회상하지 않고 복사할 수 있다.",
        "primaryProposal": "빗변 조건을 묻는 문장과 뒤의 설명을 분리하거나 같은 단어를 중복 제시하지 않는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
        "batch": "m1m2"
      },
      "authorReason": "두 합동 조건을 노출하고 공통 필수 조건인 빗변만 묻는다. 뒤 문장의 빗변 반복은 이 길이로 바꾸어 회상 답 노출을 없앴다."
    },
    {
      "id": "m2-02-03-c3",
      "grade": "m2",
      "chapter": "2. 부등식",
      "after": "두 일차부등식의 해가 같도록 미지의 상수를 정할 때에는, 그 상수가 없는 부등식을 먼저 풀어 해를 구하고 다른 부등식의 해와 {같게} 놓는다.",
      "completedDefinition": "두 일차부등식의 해가 같도록 미지의 상수를 정할 때에는, 그 상수가 없는 부등식을 먼저 풀어 해를 구하고 다른 부등식의 해와 같게 놓는다.",
      "studentSentence": "두 일차부등식의 해가 같도록 미지의 상수를 정할 때에는, 그 상수가 없는 부등식을 먼저 풀어 해를 구하고 다른 부등식의 해와 □ 놓는다.",
      "expectedAnswers": [
        "같게"
      ],
      "blindResponse": {
        "id": "m2-02-03-c3",
        "answers": [
          "같다고"
        ],
        "alternativeAnswers": [],
        "reason": "답 노출에 가깝다: 문장 첫머리 '해가 같도록'이 답을 알려 준다('같게'는 같은 답). 내용은 맞다."
      },
      "originalFinding": {
        "id": "m2-02-03-c3",
        "grade": "m2",
        "section": "중2::2. 부등식::일차부등식의 응용",
        "sourceHash": "6c6cacadd1ca5c0a2832ccfbf4e10d57e3b5ef3b83435e7d6e7f9374bb068f8b",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "미지의 상수가 없는 부등식을 먼저 풀어 해를 구하고, 그 해를 □의 해와 □ 놓는다.",
        "expected": [
          "다른 부등식",
          "같게"
        ],
        "reason": "'두 부등식의 해가 같을 때'라는 전제가 빠져 '같게 놓는다'의 근거가 문장에 없다. 그래도 '미지의 상수가 없는 부등식을 먼저'에서 유형이 드러나 '다른 부등식/같게'는 추론 가능하므로 확정 결함은 아니다.",
        "proposal": "'두 일차부등식의 해가 같을 때'를 문두에 넣는다.",
        "primaryReason": "두 부등식의 해가 같다는 조건이 없는데 그 해를 같게 놓는 절차를 제시한다. 상수가 없는 부등식을 먼저 푼다는 말만으로는 다른 부등식의 해와 어떤 관계를 비교해야 하는지 정해지지 않는다.",
        "primaryProposal": "두 부등식의 해가 같다는 조건이 주어졌을 때라는 문구를 남긴다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "두 부등식의 해가 같다는 문제 조건과 구할 미지의 상수를 명시했다. 해를 같게 놓는 이유를 남기고 다른 부등식이라는 지시 대상 빈칸은 풀었다."
    },
    {
      "id": "m2-03-05-c2",
      "grade": "m2",
      "chapter": "3. 방정식",
      "after": "미지수가 두 개인 두 일차방정식으로 된 연립방정식에서 한 방정식의 양변에 $0$이 아닌 알맞은 수를 곱해 다른 방정식과 완전히 같아지면 해가 {무수히 많다}.",
      "completedDefinition": "미지수가 두 개인 두 일차방정식으로 된 연립방정식에서 한 방정식의 양변에 $0$이 아닌 알맞은 수를 곱해 다른 방정식과 완전히 같아지면 해가 무수히 많다.",
      "studentSentence": "미지수가 두 개인 두 일차방정식으로 된 연립방정식에서 한 방정식의 양변에 $0$이 아닌 알맞은 수를 곱해 다른 방정식과 완전히 같아지면 해가 □.",
      "expectedAnswers": [
        "무수히 많다"
      ],
      "blindResponse": {
        "id": "m2-03-05-c2",
        "answers": [
          "무수히 많다"
        ],
        "alternativeAnswers": [],
        "reason": "두 방정식이 일치하는 경우이므로 유일하게 복원된다. '한없이 많다'는 같은 뜻이다."
      },
      "originalFinding": {
        "id": "m2-03-05-c2",
        "grade": "m2",
        "section": "중2::3. 방정식::해가 특수한 연립방정식",
        "sourceHash": "e5d525317fa7c5c667d4031d6280cbebd378ce31efd4834a39e05a792ff62a5c",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "한 방정식의 양변에 알맞은 수를 곱했을 때 다른 방정식과 □ 해가 □.",
        "expected": [
          "완전히 같아지면",
          "무수히 많다"
        ],
        "reason": "조건과 결론이 모두 가려져 '완전히 같아지면/무수히 많다'와 'x, y의 계수는 같고 상수항만 다르면/없다'가 모두 참이다. 둘은 같은 소단원에서 나란히 배우는 내용이라 남은 문장으로는 가를 수 없다.",
        "proposal": "조건 '완전히 같아지면'을 노출하고 해의 개수만 묻거나, 그 반대로 한다.",
        "primaryReason": "한 방정식을 상수배한 뒤 다른 방정식과 어떤 관계가 되는지와 해의 개수를 모두 가렸다. 식 전체가 같아지는 경우와 미지수 계수만 같고 상수항이 달라지는 경우를 가르는 핵심 조건이 없어 결론을 선택할 수 없다.",
        "primaryProposal": "두 방정식이 완전히 같아진다는 조건을 남겨 해의 개수를 묻는다.",
        "initialAlternativeAnswers": [
          "미지수의 계수만 같고 상수항은 달라지면 / 없다"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "두 일차방정식과 0이 아닌 배수라는 조건을 명시하고 동일해진다는 조건을 노출했다. 상수항만 다른 경우/해가 없음이라는 다른 참 답 쌍을 배제했다. 미지수가 한 개인 방정식은 같은 식이어도 해가 한 개일 수 있으므로 두 미지수라는 조건을 명시했다."
    },
    {
      "id": "m2-04-04-c5",
      "grade": "m2",
      "chapter": "4. 함수",
      "after": "두 일차함수의 기울기가 같고 $y$절편이 다르면 두 그래프는 서로 {평행}하다.",
      "completedDefinition": "두 일차함수의 기울기가 같고 $y$절편이 다르면 두 그래프는 서로 평행하다.",
      "studentSentence": "두 일차함수의 기울기가 같고 $y$절편이 다르면 두 그래프는 서로 □하다.",
      "expectedAnswers": [
        "평행"
      ],
      "blindResponse": {
        "id": "m2-04-04-c5",
        "answers": [
          "평행"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다."
      },
      "originalFinding": {
        "id": "m2-04-04-c5",
        "grade": "m2",
        "section": "중2::4. 함수::일차함수의 그래프의 성질",
        "sourceHash": "76f36ec9d302acaba925e620aa4830d5802f645de4006fad05e32d8a76da221e",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "일차함수 둘의 기울기가 같고 $y$절편이 □ 두 그래프는 서로 □하다.",
        "expected": [
          "다르면",
          "평행"
        ],
        "reason": "y절편 조건과 결론을 함께 가려 '다르면/평행'과 '같으면/일치'가 모두 참이며, 둘 다 같은 단원에서 짝으로 배우는 성질이다. 어미 '□하다'가 '평행'을 약하게 시사하지만 학생이 기댈 만한 단서는 아니다.",
        "proposal": "'y절편이 다르면'을 노출하고 '평행'만 묻는다.",
        "primaryReason": "기울기가 같다는 조건만 남고 y절편의 관계와 두 그래프의 관계를 모두 가렸다. 다르면/평행과 같으면/일치는 뜻이 다른 두 참인 정답 쌍이다.",
        "primaryProposal": "y절편이 다르다는 조건을 남기고 두 직선의 위치 관계를 묻는다.",
        "initialAlternativeAnswers": [
          "같으면 / 일치"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "y절편이 다르다는 조건을 노출하여 같음/일치 쌍을 배제했다. 서로 다른 평행 직선의 성질을 유지했다."
    },
    {
      "id": "m2-04-04-c6",
      "grade": "m2",
      "chapter": "4. 함수",
      "after": "두 일차함수의 기울기와 $y$절편이 모두 같으면 두 그래프는 {일치}한다.",
      "completedDefinition": "두 일차함수의 기울기와 $y$절편이 모두 같으면 두 그래프는 일치한다.",
      "studentSentence": "두 일차함수의 기울기와 $y$절편이 모두 같으면 두 그래프는 □한다.",
      "expectedAnswers": [
        "일치"
      ],
      "blindResponse": {
        "id": "m2-04-04-c6",
        "answers": [
          "일치"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다."
      },
      "originalFinding": {
        "id": "m2-04-04-c6",
        "grade": "m2",
        "section": "중2::4. 함수::일차함수의 그래프의 성질",
        "sourceHash": "55301b271033ee4ff43df2cdd1235a6bc495e5f962b28a620d8d9fb4b2c6db0f",
        "status": "not_issue",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "두 일차함수의 기울기와 $y$절편이 □ 두 그래프는 □한다.",
        "expected": [
          "모두 같으면",
          "일치"
        ],
        "reason": "'기울기와 y절편이 □'로 둘을 묶은 구조와 어미 '□한다'에서 '(모두/각각) 같으면/일치'가 자연스러운 단일 답이다. prior의 '모두 다르면/교차'는 y절편이 무관한 조건이라 교과에서 쓰지 않는 형식적 대안이다.",
        "proposal": "유지. 더 엄밀히 하려면 한쪽만 빈칸으로 둔다.",
        "primaryReason": "기울기와 y절편이 어떤 관계인지 및 그래프의 관계를 모두 가려 특정 성질을 가리키는 단서가 없다. 모두 같으면/일치 외에 모두 다르면/교차도 서로 다른 참인 내용으로 문장을 완성한다.",
        "primaryProposal": "기울기와 y절편이 모두 같다는 조건을 남긴다.",
        "initialAlternativeAnswers": [
          "모두 다르면 / 교차"
        ],
        "initialCounterexample": "y=x와 y=2x+1은 기울기와 y절편이 모두 다르고 한 점에서 교차한다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "모두 같다는 조건을 노출했다. 기울기와 절편이 모두 다름/교차도 수학적으로 참인 완성이라는 반례를 어미만으로 배제하지 않는다."
    },
    {
      "id": "m2-07-05-c2",
      "grade": "m2",
      "chapter": "7. 닮음의 활용",
      "after": "삼각형의 세 중선이 만나는 한 점을 그 삼각형의 {무게중심}이라 한다.",
      "completedDefinition": "삼각형의 세 중선이 만나는 한 점을 그 삼각형의 무게중심이라 한다.",
      "studentSentence": "삼각형의 세 중선이 만나는 한 점을 그 삼각형의 □이라 한다.",
      "expectedAnswers": [
        "무게중심"
      ],
      "blindResponse": {
        "id": "m2-07-05-c2",
        "answers": [
          "무게중심"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다. 정의가 정확하다."
      },
      "originalFinding": {
        "id": "m2-07-05-c2",
        "grade": "m2",
        "section": "중2::7. 닮음의 활용::삼각형의 무게중심",
        "sourceHash": "43bfe3869bb62b52cefc5d05b4c3f40cdf134e61b1b482305b62abc0b4182e6e",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "삼각형의 세 □이 만나는 한 점을 그 삼각형의 □이라 한다.",
        "expected": [
          "중선",
          "무게중심"
        ],
        "reason": "선의 종류와 점의 이름을 모두 가려 '중선/무게중심', '(변의) 수직이등분선/외심', '(내각의) 이등분선/내심'이 모두 참인 정의가 된다. 조사도 세 조합을 모두 허용하고 모두 중2 내용이다.",
        "proposal": "'중선' 또는 '무게중심' 중 하나를 노출한다.",
        "primaryReason": "삼각형에서 한 점에 모이는 세 선의 종류와 중심 이름을 모두 가렸다. 세 중선/무게중심뿐 아니라 세 수직이등분선/외심, 세 내각의 이등분선/내심도 각각 다른 참인 정의여서 목표 개념을 구분할 수 없다.",
        "primaryProposal": "무게중심 또는 중선 중 한 개념을 학생 문장에 남겨 정답 범위를 고정한다.",
        "initialAlternativeAnswers": [
          "수직이등분선 / 외심",
          "내각의 이등분선 / 내심"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "중선을 본문에 남겨 수직이등분선/외심, 내각 이등분선/내심 쌍을 배제했다."
    },
    {
      "id": "m2-08-01-c7",
      "grade": "m2",
      "chapter": "8. 피타고라스 정리",
      "after": "피타고라스 정리의 한 증명에서는 합동인 직각삼각형 네 개를 같은 큰 정사각형 안에 두 가지로 놓는다. 큰 정사각형의 넓이에서 같은 네 삼각형의 넓이를 빼므로 남는 부분의 {넓이}가 같다.",
      "completedDefinition": "피타고라스 정리의 한 증명에서는 합동인 직각삼각형 네 개를 같은 큰 정사각형 안에 두 가지로 놓는다. 큰 정사각형의 넓이에서 같은 네 삼각형의 넓이를 빼므로 남는 부분의 넓이가 같다.",
      "studentSentence": "피타고라스 정리의 한 증명에서는 합동인 직각삼각형 네 개를 같은 큰 정사각형 안에 두 가지로 놓는다. 큰 정사각형의 넓이에서 같은 네 삼각형의 넓이를 빼므로 남는 부분의 □가 같다.",
      "expectedAnswers": [
        "넓이"
      ],
      "blindResponse": {
        "id": "m2-08-01-c7",
        "answers": [
          "넓이"
        ],
        "alternativeAnswers": [],
        "reason": "답 노출: 같은 문장에 '넓이'가 두 번 나온다. 내용은 정확하다."
      },
      "originalFinding": {
        "id": "m2-08-01-c7",
        "grade": "m2",
        "section": "중2::8. 피타고라스 정리::피타고라스 정리",
        "sourceHash": "5cafa8457b1abf2efc182846537d17a99d938ba3916a669ad413ad48ce00ad33",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "missing-referent",
        "student": "합동인 직각삼각형 □를 큰 정사각형 안에 두 가지로 놓아 보고, 남는 부분의 □가 같음을 보이는 증명이다.",
        "expected": [
          "네 개",
          "넓이"
        ],
        "reason": "대단원이 '피타고라스 정리'이고 '합동인 직각삼각형', '큰 정사각형', '두 가지 배치'로 해당 증명이 특정된다. '네 개/넓이'는 자연스러운 단일 답이며 그림이 없다는 것만으로 결함은 아니다.",
        "proposal": "유지.",
        "primaryReason": "합동 직각삼각형을 큰 정사각형에 두 가지로 배치한다는 말만 있고 배치도나 증명의 이름이 없다. 남는 부분의 모양을 확인할 수 없어 몇 개를 쓰는지와 어떤 넓이를 비교하는지 특정 구성의 암기에 의존한다.",
        "primaryProposal": "두 배치도를 제시하거나 네 직각삼각형이라는 수량은 남기고 넓이 보존의 핵심을 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2"
      },
      "authorReason": "증명 대상과 네 개라는 구성을 노출하고 남는 넓이가 같은 까닭을 명시했다. 그림 없이 임의의 개수를 추측하는 빈칸을 없앴다."
    },
    {
      "id": "m3-01-03-c4",
      "grade": "m3",
      "chapter": "1. 실수와 그 계산",
      "after": "분모에 근호가 있는 분수에서 분자와 분모에 같은 $0$이 아닌 수를 곱해, 분모를 {유리수}로 바꾸는 일을 분모의 유리화라 한다.",
      "completedDefinition": "분모에 근호가 있는 분수에서 분자와 분모에 같은 $0$이 아닌 수를 곱해, 분모를 유리수로 바꾸는 일을 분모의 유리화라 한다.",
      "studentSentence": "분모에 근호가 있는 분수에서 분자와 분모에 같은 $0$이 아닌 수를 곱해, 분모를 □로 바꾸는 일을 분모의 유리화라 한다.",
      "expectedAnswers": [
        "유리수"
      ],
      "blindResponse": {
        "id": "m3-01-03-c4",
        "answers": [
          "유리수"
        ],
        "alternativeAnswers": [],
        "reason": "복원 가능하고 정의도 정확하다. 정의되는 용어 '유리화'가 답을 강하게 암시하지만 글자 그대로 노출된 것은 아니다."
      },
      "originalFinding": {
        "id": "m3-01-03-c4",
        "grade": "m3",
        "section": "중3::1. 실수와 그 계산::근호를 포함한 식의 계산",
        "sourceHash": "c0a9647cde49c527df464bb622ba92cd9312744375ccd745e802c637ac8be531",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "open-answer",
        "student": "분모에 근호가 있을 때 분자와 분모에 똑같이 □를 곱해 분모를 □로 바꾸는 일이 분모의 유리화이다.",
        "expected": [
          "$0$이 아닌 수",
          "유리수"
        ],
        "reason": "교과서 정의('0이 아닌 같은 수')를 외운 학생은 맞히지만, 첫 빈칸에 '분모의 근호 부분(√a)'처럼 실제로 곱하는 수를 쓰는 것도 자연스럽다. 일반 조건을 묻는지 구체적 인수를 묻는지 신호가 없다.",
        "proposal": "'똑같이 0이 아닌 □를 곱해'처럼 조건을 본문에 드러내거나, 첫 빈칸을 없애고 '유리수'만 묻는다.",
        "primaryReason": "분모를 유리수로 만드는 인수를 묻는지, 등식의 값을 보존하는 0 아닌 인수의 조건을 묻는지 빈칸에서 가르기 어렵다. 정답의 일반 조건 외에 구체적인 유리화 인수도 자연스럽게 들어간다.",
        "primaryProposal": "유리화의 목적은 본문에 두고 분자·분모에 같은 수를 곱해야 하는 이유나 제수의 조건 중 하나만 묻는다.",
        "initialAlternativeAnswers": [
          "분모를 유리수로 만드는 알맞은 수"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "곱하는 수의 일반 조건을 노출하여 구체적 근호 인수와 혼동하는 첫 빈칸을 없앴다. 분수의 값을 보존하면서 분모를 유리수로 만드는 정의를 유지했다."
    },
    {
      "id": "m3-02-02-c9",
      "grade": "m3",
      "chapter": "2. 다항식의 곱셈과 인수분해",
      "after": "$acx^2+(ad+bc)x+bd$는 $x^2$의 계수와 상수항을 각각 두 수의 곱 $a\\times c$, $b\\times d$로 쪼갠 뒤, {대각선}으로 곱해 더한 $ad+bc$가 {$x$의 계수}가 되는 짝을 찾아 $(ax+b)(cx+d)$로 쓴다.",
      "completedDefinition": "$acx^2+(ad+bc)x+bd$는 $x^2$의 계수와 상수항을 각각 두 수의 곱 $a\\times c$, $b\\times d$로 쪼갠 뒤, 대각선으로 곱해 더한 $ad+bc$가 $x$의 계수가 되는 짝을 찾아 $(ax+b)(cx+d)$로 쓴다.",
      "studentSentence": "$acx^2+(ad+bc)x+bd$는 $x^2$의 계수와 상수항을 각각 두 수의 곱 $a\\times c$, $b\\times d$로 쪼갠 뒤, □으로 곱해 더한 $ad+bc$가 □가 되는 짝을 찾아 $(ax+b)(cx+d)$로 쓴다.",
      "expectedAnswers": [
        "대각선",
        "$x$의 계수"
      ],
      "blindResponse": {
        "id": "m3-02-02-c9",
        "answers": [
          "대각선",
          "x의 계수"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다('대각선 방향', '일차항의 계수'는 같은 답)."
      },
      "originalFinding": {
        "id": "m3-02-02-c9",
        "grade": "m3",
        "section": "중3::2. 다항식의 곱셈과 인수분해::인수분해",
        "sourceHash": "ee58213e91925471aaf78510f1762aa35e5291f347ffeb42bddc164fab81f84f",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "missing-referent",
        "student": "$acx^2+(ad+bc)x+bd$는 $x^2$의 계수와 상수항을 각각 두 수의 곱 $a\\times c$, $b\\times d$로 쪼갠 뒤, □으로 곱해 더한 $ad+bc$가 □가 되는 짝을 찾아 $(ax+b)(cx+d)$로 쓴다.",
        "expected": [
          "대각선",
          "$x$의 계수"
        ],
        "reason": "$ad+bc$가 본문에 그대로 있어 어떤 짝을 곱하는지 드러나고, '대각선(엇갈려, X자)으로 곱해 더한다'는 표준 설명이라 답이 한 방향으로 모인다. 둘째 빈칸도 '$x$의 계수'로 정해진다.",
        "proposal": "유지. 'X자', '엇갈린 방향', '일차항의 계수'는 동의 표현으로 인정한다.",
        "primaryReason": "대각선으로 곱한다는 기대 답은 a,b,c,d의 배열표가 있어야 공간적 지시가 정해진다. 본문에는 곱의 기호와 ad+bc만 있어 배열의 대각선은 보이지 않는다.",
        "primaryProposal": "곱의 짝 ad와 bc를 명시하거나 배열표를 제시하고 x의 계수와 일치하는지를 묻는다.",
        "initialAlternativeAnswers": [
          "엇갈린 짝"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "전개식 ad+bc가 본문에 있어 a와 d, b와 c를 엇갈려 곱함이 특정되고, 그 합의 위치는 x의 계수로 정해진다. 대각선/엇갈려 같은 표현은 같은 연산의 동의 표현이며 완성된 (ax+b)(cx+d)의 항등식은 모든 계수에 참이다."
    },
    {
      "id": "m3-03-01-c3",
      "grade": "m3",
      "chapter": "3. 이차방정식",
      "after": "이차방정식을 푼다는 것은 그 방정식을 참이 되게 하는 $x$의 값인 {해}를 빠짐없이 모두 구하는 것이다.",
      "completedDefinition": "이차방정식을 푼다는 것은 그 방정식을 참이 되게 하는 $x$의 값인 해를 빠짐없이 모두 구하는 것이다.",
      "studentSentence": "이차방정식을 푼다는 것은 그 방정식을 참이 되게 하는 $x$의 값인 □를 빠짐없이 모두 구하는 것이다.",
      "expectedAnswers": [
        "해"
      ],
      "blindResponse": {
        "id": "m3-03-01-c3",
        "answers": [
          "해"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다. '근'은 같은 뜻이지만 조사 '를'과 맞지 않는다."
      },
      "originalFinding": {
        "id": "m3-03-01-c3",
        "grade": "m3",
        "section": "중3::3. 이차방정식::이차방정식의 풀이",
        "sourceHash": "e6a7676e785b6b45a9816f5b05bf834c5118e2511cc8a030278a6edb9ee5cee0",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "grammar-blank",
        "student": "이차방정식의 해를 □ 찾아내는 것을 이차방정식을 □고 한다.",
        "expected": [
          "빠짐없이 모두",
          "푼다"
        ],
        "reason": "Claude는 해를 모두 구한다는 학습한 정의가 답을 정한다고 보았다. 리드는 핵심 용어보다 꾸밈말을 가린 응답 틀의 개선 여지는 남기되 확정 결함 통계에서는 제외한다.",
        "proposal": "유지. '모두', '전부'를 '빠짐없이 모두'와 같은 답으로 인정한다.",
        "primaryReason": "해를 어떻게 찾아내는지 꾸미는 첫 빈칸에는 정확히·계산하여 등 여러 표현이 자연스럽게 들어간다. 모든 해를 찾는다는 수학적 완전성을 묻는 단서가 없고 두 번째 빈칸만 풀이의 명칭을 명확히 묻는다.",
        "primaryProposal": "해를 빠짐없이 모두 찾아내는 것은 본문에 주고, 이 행위의 수학 용어만 빈칸으로 둔다.",
        "initialAlternativeAnswers": [
          "정확히",
          "계산하여"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "Claude는 해를 모두 구한다는 학습한 정의가 답을 정한다고 보았다. 리드는 핵심 용어보다 꾸밈말을 가린 응답 틀의 개선 여지는 남기되 확정 결함 통계에서는 제외한다.",
        "batch": "m3"
      },
      "authorReason": "풀이의 정의를 완성된 문장으로 남기고 꾸밈말 빠짐없이 모두와 서술어 푼다 대신 수학적 대상 해를 묻는다."
    },
    {
      "id": "m3-03-01-c5",
      "grade": "m3",
      "chapter": "3. 이차방정식",
      "after": "이차방정식의 우변을 $0$으로 만들고 좌변을 인수분해한다. 두 인수의 곱이 $0$이면 적어도 한 인수는 {$0$}이므로, 각 인수를 $0$으로 만드는 값을 모두 찾는다.",
      "completedDefinition": "이차방정식의 우변을 $0$으로 만들고 좌변을 인수분해한다. 두 인수의 곱이 $0$이면 적어도 한 인수는 $0$이므로, 각 인수를 $0$으로 만드는 값을 모두 찾는다.",
      "studentSentence": "이차방정식의 우변을 $0$으로 만들고 좌변을 인수분해한다. 두 인수의 곱이 $0$이면 적어도 한 인수는 □이므로, 각 인수를 $0$으로 만드는 값을 모두 찾는다.",
      "expectedAnswers": [
        "$0$"
      ],
      "blindResponse": {
        "id": "m3-03-01-c5",
        "answers": [
          "0"
        ],
        "alternativeAnswers": [],
        "reason": "답 노출: 같은 문장과 앞뒤('우변을 0으로', '곱이 0이면', '각 인수를 0으로 만드는')에 0이 반복되어 빈칸이 기능하지 않는다. 내용은 정확하다."
      },
      "originalFinding": {
        "id": "m3-03-01-c5",
        "grade": "m3",
        "section": "중3::3. 이차방정식::이차방정식의 풀이",
        "sourceHash": "b3e66ec0485db9f8a2fa65b3316505ff217730ba4b684166b745ccc507789574",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "long-phrase",
        "student": "우변을 $0$으로 만들고 좌변을 인수분해한다 — □이므로, 각 인수를 $0$으로 만드는 값을 □ 찾는다.",
        "expected": [
          "곱이 $0$이면 적어도 한 인수가 $0$",
          "모두"
        ],
        "reason": "인수분해 직후 '□이므로 각 인수를 0으로 만드는 값'이라는 틀에서 근거는 '$AB=0$이면 $A=0$ 또는 $B=0$' 하나뿐이다. 서술식과 기호식은 동치 표현이고, 길다는 것만으로는 결함이 아니다.",
        "proposal": "유지. 기호식 답과 서술식 답을 모두 인정한다.",
        "primaryReason": "첫 빈칸이 영인수 성질 전체 문장이다. 앞뒤에서 원리를 추론할 수는 있지만 성질의 이름·기호식·서술식 중 어떤 형태를 적는지 표시되어 있지 않다.",
        "primaryProposal": "곱이 0이라는 전제를 제시하고 0이 되어야 할 인수의 수나 연결어 또는를 묻는다.",
        "initialAlternativeAnswers": [
          "영인수의 성질",
          "AB=0이면 A=0 또는 B=0"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "곱이 0인 까닭 절과 풀이 절차를 본문에 남기고 인수의 값 0만 묻는다. 두 해를 모두 찾아야 하는 설명은 유지하고 절 전체를 가리지 않는다."
    },
    {
      "id": "m3-03-01-c9",
      "grade": "m3",
      "chapter": "3. 이차방정식",
      "after": "이차방정식을 $x^2+bx=c$ 꼴로 고친 뒤 양변에 {$\\left(\\frac{b}{2}\\right)^2$}을 더하면 좌변이 완전제곱식이 된다. 양변에 같은 수를 더해도 해는 바뀌지 않으며, 이어 제곱근의 뜻으로 해를 구한다.",
      "completedDefinition": "이차방정식을 $x^2+bx=c$ 꼴로 고친 뒤 양변에 $\\left(\\frac{b}{2}\\right)^2$을 더하면 좌변이 완전제곱식이 된다. 양변에 같은 수를 더해도 해는 바뀌지 않으며, 이어 제곱근의 뜻으로 해를 구한다.",
      "studentSentence": "이차방정식을 $x^2+bx=c$ 꼴로 고친 뒤 양변에 □을 더하면 좌변이 완전제곱식이 된다. 양변에 같은 수를 더해도 해는 바뀌지 않으며, 이어 제곱근의 뜻으로 해를 구한다.",
      "expectedAnswers": [
        "$\\left(\\frac{b}{2}\\right)^2$"
      ],
      "blindResponse": {
        "id": "m3-03-01-c9",
        "answers": [
          "(b/2)^2"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다(b^2/4, 'x의 계수의 절반의 제곱'은 동치). 내용이 정확하다."
      },
      "originalFinding": {
        "id": "m3-03-01-c9",
        "grade": "m3",
        "section": "중3::3. 이차방정식::이차방정식의 풀이",
        "sourceHash": "99f8455780d03d70f9ba2b68ae4c44e5c77422d896781c3646335910698ec4db",
        "status": "confirmed",
        "initialStatus": "needs_review",
        "category": "open-answer",
        "student": "$x^2$의 계수를 $1$로 만들고 상수항을 우변으로 넘긴 뒤, 양변에 □를 더해 좌변을 완전제곱식으로 만들면 □으로 해를 구할 수 있다 — 양변에 같은 수를 더해도 해는 바뀌지 않는다.",
        "expected": [
          "같은 수",
          "제곱근의 뜻"
        ],
        "reason": "단순히 뒤에 답이 반복된다는 이유로 확정하지 않는다. 완전제곱식에 더할 구체적 양과 양변에 더하는 수의 일반 조건 중 무엇을 요구하는지 다르다는 Claude 지적을 리드가 받아들여 응답 대상 혼재로 분류한다.",
        "proposal": "뒤 절은 본문에 두고 첫 빈칸을 '$x$의 계수의 절반의 제곱'으로 바꾸거나, 첫 빈칸을 없애고 '완전제곱식', '제곱근'만 묻는다.",
        "primaryReason": "앞 빈칸의 정답 같은 수가 바로 뒤의 양변에 같은 수를 더해도 해는 바뀌지 않는다는 문장에 그대로 노출된다. 완전제곱을 만드는 데 더할 구체적 양을 묻지 않고 복사로 답할 수 있다.",
        "primaryProposal": "같은 수를 더한다는 설명은 본문에 두고 x의 계수의 절반을 제곱한 값을 묻거나 완전제곱식이라는 개념만 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "단순히 뒤에 답이 반복된다는 이유로 확정하지 않는다. 완전제곱식에 더할 구체적 양과 양변에 더하는 수의 일반 조건 중 무엇을 요구하는지 다르다는 Claude 지적을 리드가 받아들여 응답 대상 혼재로 분류한다.",
        "batch": "m3"
      },
      "authorReason": "x의 계수 b를 정의하여 더할 구체적 양 (b/2)²을 묻는다. 같은 수라는 일반 원칙과 완전제곱식을 만드는 특정 수를 혼동하지 않게 하고 등식 변형의 이유를 유지했다."
    },
    {
      "id": "m3-03-03-c4",
      "grade": "m3",
      "chapter": "3. 이차방정식",
      "after": "쏘아 올린 물체는 출발한 높이보다 높고 최고 높이보다 낮은 곳을 {올라갈 때와 내려올 때} 한 번씩 지나므로, 그 높이에 대한 방정식에는 서로 다른 두 해가 있다.",
      "completedDefinition": "쏘아 올린 물체는 출발한 높이보다 높고 최고 높이보다 낮은 곳을 올라갈 때와 내려올 때 한 번씩 지나므로, 그 높이에 대한 방정식에는 서로 다른 두 해가 있다.",
      "studentSentence": "쏘아 올린 물체는 출발한 높이보다 높고 최고 높이보다 낮은 곳을 □ 한 번씩 지나므로, 그 높이에 대한 방정식에는 서로 다른 두 해가 있다.",
      "expectedAnswers": [
        "올라갈 때와 내려올 때"
      ],
      "blindResponse": {
        "id": "m3-03-03-c4",
        "answers": [
          "올라갈 때와 내려올 때"
        ],
        "alternativeAnswers": [],
        "reason": "'한 번씩'과 '서로 다른 두 해'에서 올라갈 때와 내려올 때로 복원된다. 용어가 아닌 서술구 빈칸이라 표현이 조금씩 달라질 수 있으나 뜻이 다른 참인 답은 없다."
      },
      "originalFinding": {
        "id": "m3-03-03-c4",
        "grade": "m3",
        "section": "중3::3. 이차방정식::이차방정식의 활용",
        "sourceHash": "18c43c38838939703ab413dcd89d15087508b901c7c8eab3dc3ade63f1bab473",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "hidden-condition",
        "student": "쏘아 올린 물체는 □보다 높고 □보다 낮은 곳을 □ 한 번씩 지나므로, 그 높이에 대한 방정식에는 서로 다른 두 해가 있다.",
        "expected": [
          "출발한 높이",
          "최고 높이",
          "올라갈 때와 내려올 때"
        ],
        "reason": "'□보다 높고 □보다 낮은 곳을 □ 한 번씩 지난다'는 틀에서 아래 경계, 위 경계, 두 시점이 차례로 정해진다. 빈칸이 셋이지만 역할이 문장 구조로 구분된다.",
        "proposal": "유지. '처음 높이', '쏘아 올린 높이', '가장 높은 곳', '오를 때와 떨어질 때'를 동의 표현으로 인정한다.",
        "primaryReason": "높이 범위의 두 경계와 두 시점의 표현이 함께 가려진다. 두 해가 생기는 조건을 묻는 의도는 있으나 범위·운동 구간·시점을 한꺼번에 복원해야 해 학생이 어떤 말의 종류를 적을지 불분명할 수 있다.",
        "primaryProposal": "출발 높이보다 높고 최고 높이보다 낮다는 조건은 본문에 주고 지나가는 횟수 또는 서로 다른 해의 개수를 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "두 경계 높이를 노출했다. 쏘아 올린 위치를 지면으로 임의 보충하거나 다른 경계 높이를 답하는 대안을 배제했다."
    },
    {
      "id": "m3-04-01-c4",
      "grade": "m3",
      "chapter": "4. 이차함수",
      "after": "이차함수의 그래프인 포물선이 자기 {축}과 만나는 점이 꼭짓점이다. 이 점에서 $x$가 증가할 때 함숫값의 증가와 감소가 서로 바뀐다.",
      "completedDefinition": "이차함수의 그래프인 포물선이 자기 축과 만나는 점이 꼭짓점이다. 이 점에서 $x$가 증가할 때 함숫값의 증가와 감소가 서로 바뀐다.",
      "studentSentence": "이차함수의 그래프인 포물선이 자기 □과 만나는 점이 꼭짓점이다. 이 점에서 $x$가 증가할 때 함숫값의 증가와 감소가 서로 바뀐다.",
      "expectedAnswers": [
        "축"
      ],
      "blindResponse": {
        "id": "m3-04-01-c4",
        "answers": [
          "축"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 복원된다('대칭축'은 같은 뜻). 조사 '과'와도 맞고 뒤 문장도 정확하다."
      },
      "originalFinding": {
        "id": "m3-04-01-c4",
        "grade": "m3",
        "section": "중3::4. 이차함수::이차함수와 그래프",
        "sourceHash": "f5efa2db5a0ccfe4047d389fa6d5419812ecb17dbb055a44591ee7cd6dd1738e",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "open-answer",
        "student": "포물선이 자기 □과 만나는 점이 꼭짓점이고, 여기서 그래프가 □을 바꾼다.",
        "expected": [
          "축",
          "방향"
        ],
        "reason": "'자기 □과 만나는 점'은 축(대칭축)으로 정해지고, '□을 바꾼다'는 조사와 문맥상 '방향'이 자연스럽다. 증가·감소가 바뀐다는 답은 같은 내용의 다른 표현이다.",
        "proposal": "유지. '대칭축', '증감'을 같은 답으로 인정한다.",
        "primaryReason": "꼭짓점에서 그래프가 무엇을 바꾸는지 방향만 기대하지만 증가·감소도 자연스러운 수학적 답이다. 방향이라는 표현이 기하적 진행 방향인지 함수의 증감을 뜻하는지 모호하다.",
        "primaryProposal": "증가에서 감소 또는 감소에서 증가로 바뀌는 점이라는 설명을 주고 꼭짓점이라는 이름을 묻는다.",
        "initialAlternativeAnswers": [
          "증가·감소"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "증감·방향은 같은 뜻이지만 볼록한 방향과 혼동할 수 있어 설명으로 노출하고 대칭축만 묻는다."
    },
    {
      "id": "m3-04-02-c3",
      "grade": "m3",
      "chapter": "4. 이차함수",
      "after": "이차함수 $y=a(x-p)^2+q$에서 $x$가 $p$의 양쪽으로 같은 거리만큼 떨어지면, 함수식의 제곱 부분인 {$(x-p)^2$}의 값이 같아 함숫값도 같다. 그래서 그래프의 축은 {$x=p$}이다.",
      "completedDefinition": "이차함수 $y=a(x-p)^2+q$에서 $x$가 $p$의 양쪽으로 같은 거리만큼 떨어지면, 함수식의 제곱 부분인 $(x-p)^2$의 값이 같아 함숫값도 같다. 그래서 그래프의 축은 $x=p$이다.",
      "studentSentence": "이차함수 $y=a(x-p)^2+q$에서 $x$가 $p$의 양쪽으로 같은 거리만큼 떨어지면, 함수식의 제곱 부분인 □의 값이 같아 함숫값도 같다. 그래서 그래프의 축은 □이다.",
      "expectedAnswers": [
        "$(x-p)^2$",
        "$x=p$"
      ],
      "blindResponse": {
        "id": "m3-04-02-c3",
        "answers": [
          "(x-p)^2",
          "직선 x=p"
        ],
        "alternativeAnswers": [],
        "reason": "'제곱 부분'이라는 단서로 첫 빈칸은 (x-p)^2로 정해진다. a(x-p)^2를 넣어도 참이지만 '제곱 부분'이라는 표현과 덜 맞는다. 둘째 빈칸은 x=p만 써도 같은 답이다."
      },
      "originalFinding": {
        "id": "m3-04-02-c3",
        "grade": "m3",
        "section": "중3::4. 이차함수::이차함수 y=ax^2+bx+c의 그래프",
        "sourceHash": "6b05a0afd4d95127bd9a827decc3379be26047915b3316c9eee8a8eef93f3083",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "$y=a(x-p)^2+q$에서는 $x$가 $p$의 양쪽으로 같은 거리만큼 떨어지면 □ 함숫값도 같다 — 그래서 그래프의 축은 □이다.",
        "expected": [
          "제곱한 값이 같아",
          "$x=p$"
        ],
        "reason": "학생이 보는 문장에는 오류가 없고, 학생은 '$(x-p)^2$의 값이 같아'라고 쓰면 된다. 제곱 대상이 빠진 것은 기대 답 표기의 문제이고 이유절 전체가 빈칸이라 형식이 열려 있을 뿐이므로, prior의 confirmed는 과하다.",
        "proposal": "기대 답을 '$(x-p)^2$의 값이 같아'로 명시하거나, 본문에 '$(x-p)^2$의 값이 □'로 두고 '같아'만 묻는다.",
        "primaryReason": "제곱한 값이 무엇의 제곱인지 빠졌다. 주어가 x여서 x 자체의 제곱으로 읽히지만 같은 것은 (x-p)의 제곱이다. 이 이유 전체를 빈칸에 넣어 학생이 제곱 대상까지 추측해야 한다.",
        "primaryProposal": "(x-p)의 절댓값 또는 (x-p)^2를 본문에 명시하고 같다는 관계를 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "p=1에서 x=0,2는 p 양쪽 같은 거리지만 x^2은 0,4로 다르다. (x-p)^2만 모두 1이다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "이차함수임을 밝혀 a≠0의 전제를 유지하고 무엇을 제곱하는지 정확히 명시했다. 이유절 전체 대신 제곱식만 가려 x²과 혼동하지 않게 했다. 첫 빈칸은 함수식의 제곱 부분으로 한정하여 a(x-p)² 등 다른 같아지는 양을 답하는 대안을 배제했다."
    },
    {
      "id": "m3-04-03-c6",
      "grade": "m3",
      "chapter": "4. 이차함수",
      "after": "변하는 양을 $x$의 이차함수로 나타내면, 꼭짓점의 $x$값이 가능한 범위 안에 있을 때 그래프가 아래로 볼록하면 꼭짓점에서 {최솟값}, 위로 볼록하면 {최댓값}을 찾는다. 범위 밖에 있으면 가능한 범위에서 값을 비교한다.",
      "completedDefinition": "변하는 양을 $x$의 이차함수로 나타내면, 꼭짓점의 $x$값이 가능한 범위 안에 있을 때 그래프가 아래로 볼록하면 꼭짓점에서 최솟값, 위로 볼록하면 최댓값을 찾는다. 범위 밖에 있으면 가능한 범위에서 값을 비교한다.",
      "studentSentence": "변하는 양을 $x$의 이차함수로 나타내면, 꼭짓점의 $x$값이 가능한 범위 안에 있을 때 그래프가 아래로 볼록하면 꼭짓점에서 □, 위로 볼록하면 □을 찾는다. 범위 밖에 있으면 가능한 범위에서 값을 비교한다.",
      "expectedAnswers": [
        "최솟값",
        "최댓값"
      ],
      "blindResponse": {
        "id": "m3-04-03-c6",
        "answers": [
          "최솟값",
          "최댓값"
        ],
        "alternativeAnswers": [],
        "reason": "볼록 방향으로 유일하게 복원된다. 다만 이차함수의 최대·최소와 제한된 범위에서의 값 비교는 현행 중3 범위를 넘어 고등 과정에 해당하므로 학년 적합성을 확인해야 한다."
      },
      "originalFinding": {
        "id": "m3-04-03-c6",
        "grade": "m3",
        "section": "중3::4. 이차함수::이차함수의 최댓값과 최솟값",
        "sourceHash": "5e63c2790dc8f5df47c71fb42781f074559a3e49b3d582c107a7262a739730dc",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "math-error",
        "student": "변하는 양을 $x$의 □로 나타내고, 꼭짓점의 $x$의 값이 □인지 확인한 뒤 볼록한 방향에 따라 꼭짓점에서 최댓값이나 최솟값을 찾는다.",
        "expected": [
          "이차함수",
          "실제로 될 수 있는 값"
        ],
        "reason": "빈칸의 개념(이차함수, 가능한 범위의 값)은 추론할 수 있다. 다만 확인 결과가 범위 밖일 때의 처리가 없어 항상 꼭짓점에서 찾는 것처럼 읽히고, 둘째 빈칸은 자유 서술이라 채점 폭이 넓다.",
        "proposal": "'꼭짓점의 $x$의 값이 문제의 조건에 맞는 범위 안이면'처럼 분기를 본문에 넣고, 둘째 빈칸은 '범위' 같은 짧은 말로 줄인다.",
        "primaryReason": "실제로 될 수 있는 값인지 확인한 뒤 항상 꼭짓점에서 최댓값·최솟값을 찾는다고 읽힌다. 꼭짓점의 x가 허용 범위 밖이면 끝점에서 판단하는 분기가 빠졌다.",
        "primaryProposal": "꼭짓점이 허용 범위 안인 경우라는 조건을 본문에 명시하고 그 경우의 극값을 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "1≤x≤2에서 y=x²의 최솟값은 x=1에서 1이고 꼭짓점 x=0은 허용되지 않는다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "꼭짓점이 범위 안에 있을 때라는 조건을 노출하고 범위 밖에서는 별도로 비교해야 함을 덧붙였다. 볼록한 방향별 극값을 짧게 묻고 항상 꼭짓점이 답이라는 독해를 배제했다. 볼록한 것은 그래프라는 주어를 명시해 어순을 다듬었다. 최댓값·최솟값은 기준 은행에 이미 있던 용어이며 교육과정 전수 판별을 새로 수행한 것으로 주장하지 않는다."
    },
    {
      "id": "m3-05-03-c3",
      "grade": "m3",
      "chapter": "5. 삼각비",
      "after": "직각삼각형이 아닌 삼각형에서 한 꼭짓점으로부터 맞은편 변 또는 그 연장선에 수선을 그으면 직각삼각형 둘을 이용할 수 있다. 두 삼각형의 공통인 변은 원래 삼각형의 {높이}에 해당하므로, 한쪽에서 삼각비로 구한 길이를 다른 쪽에서 쓴다.",
      "completedDefinition": "직각삼각형이 아닌 삼각형에서 한 꼭짓점으로부터 맞은편 변 또는 그 연장선에 수선을 그으면 직각삼각형 둘을 이용할 수 있다. 두 삼각형의 공통인 변은 원래 삼각형의 높이에 해당하므로, 한쪽에서 삼각비로 구한 길이를 다른 쪽에서 쓴다.",
      "studentSentence": "직각삼각형이 아닌 삼각형에서 한 꼭짓점으로부터 맞은편 변 또는 그 연장선에 수선을 그으면 직각삼각형 둘을 이용할 수 있다. 두 삼각형의 공통인 변은 원래 삼각형의 □에 해당하므로, 한쪽에서 삼각비로 구한 길이를 다른 쪽에서 쓴다.",
      "expectedAnswers": [
        "높이"
      ],
      "blindResponse": {
        "id": "m3-05-03-c3",
        "answers": [
          "높이"
        ],
        "alternativeAnswers": [],
        "reason": "꼭짓점에서 대변 또는 그 연장선에 내린 수선이므로 '높이'로 복원된다."
      },
      "originalFinding": {
        "id": "m3-05-03-c3",
        "grade": "m3",
        "section": "중3::5. 삼각비::삼각비의 활용",
        "sourceHash": "2acf1e5e2420a3d6bdf8a35bb9c54d580f4eb90b1133e5a1946670fd15796ca2",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "long-phrase",
        "student": "직각삼각형이 아닌 삼각형은 한 꼭짓점에서 수선을 그어 □ 둘을 만든다 — 두 삼각형이 □, 한쪽에서 삼각비로 구한 수선의 길이를 다른 쪽에서 쓴다.",
        "expected": [
          "직각삼각형",
          "수선을 함께 가지므로"
        ],
        "reason": "뒤 절 '한쪽에서 구한 수선의 길이를 다른 쪽에서 쓴다'가 둘째 빈칸의 내용(수선 공유)을 정해 준다. '공유하므로', '공통인 변으로 가지므로'는 동의 표현이다.",
        "proposal": "유지. '높이(수선)가 공통이므로' 같은 표현을 인정한다.",
        "primaryReason": "두 삼각형이 □, 한쪽에서…라는 빈칸은 공통 높이라는 개념 자체보다 인과 연결절 전체를 기대한다. 학생은 공통인 변을 갖는다는 사실·높이가 같다는 사실 중 어떤 문장 꼴을 쓸지 정해야 한다.",
        "primaryProposal": "두 직각삼각형이 공통으로 갖는 선분은 본문에 표시하고 공통 높이나 직각삼각형 같은 개념어를 묻는다.",
        "initialAlternativeAnswers": [
          "높이를 공유하므로",
          "같은 높이를 가지므로"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "둔각삼각형의 수선이 변의 연장선에 닿는 경우도 명시했다. 공유하는 수선이라는 대상만 묻고 긴 까닭 절과 삼각비 활용 설명을 본문에 남겼다. 공통 변을 직선인 수선 자체 대신 높이에 해당하는 선분으로 표현하고 앞의 수선이라는 글자 반복을 피했다."
    }
  ]
}