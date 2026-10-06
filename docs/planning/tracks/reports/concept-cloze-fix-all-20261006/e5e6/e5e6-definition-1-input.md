독립 최종 원고 검토입니다. 앞선 가림 풀이와 원래 감사 지적은 참고 자료이며 무조건 따르지 마세요. currentDefinition은 지금 적용된 정확한 최종 후보이며, firstBlind는 일부 수정 전 문장에 대한 답일 수 있습니다. 기대 답과 가림 답은 철자·조사·활용형이 아니라 의미로 대조하세요. 같은 의미의 동의어/동치식은 허용합니다. 수학적 진실, 초5·초6 또는 아래 학년 용어, 조건·연산·대상·순서, 0·1·부호·범위·도형 포함관계, 학생이 읽는 문장으로 서로 다른 참인 완성이 가능한지를 검토하세요. 기대 답을 넣은 완성 정의가 A/B/D형과 SRS에서 의미 있는 원래 개념 설명으로 남는지도 확인하세요. 정의를 풀어 설명한 단서나 쉬운 문제라는 사실만으로 revise하지 마세요. 일상적인 동의 표현과 임의의 더 약한 일반어(수, 도형, 값 등)를 별개 수학 답으로 잘못 세지 마세요. 하지만 서로 다른 표준 수학 내용의 답이 실제로 가능하면 revise하고 구체 반례와 바로 적용할 정확한 definition을 제안하세요. JSON만 반환: {"cases":[{"id":"...","verdict":"pass|revise","reason":"...","proposal":"..."}]}.

[
  {
    "id": "e5-1-2-4-c1",
    "grade": "e5",
    "chapter": "1-2 약수와 배수",
    "student": "두 자연수의 최대공약수를 구하려면 두 수의 약수 목록에서 겹치는 수를 찾고 그중 □를 고른다.",
    "currentDefinition": "두 자연수의 최대공약수를 구하려면 두 수의 약수 목록에서 겹치는 수를 찾고 그중 {가장 큰 수}를 고른다.",
    "expected": [
      "가장 큰 수"
    ],
    "firstBlind": {
      "id": "e5-1-2-4-c1",
      "answers": [
        "가장 큰 수"
      ],
      "alternativeAnswers": [
        "제일 큰 수",
        "가장 큰 것"
      ],
      "reason": "공약수 중 최댓값으로 유일하게 정해짐. '최대'라는 말이 답을 암시하지만 정의를 풀어 쓰는 문장이라 허용 범위. 조사 '를'과도 일치."
    },
    "originalFinding": {
      "id": "e5-1-2-4-c1",
      "grade": "e5",
      "section": "초5::1-2 약수와 배수::1-2-4 최대공약수 구하는 방법",
      "sourceHash": "6420a7ea9705bd20d375c45fc9f4f1a69927fa807fb1b51a3f2e727017b2c871",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "두 약수 목록에서 겹치는 수를 찾고 그중 □를 고른다.",
      "expected": [
        "맨 큰 수"
      ],
      "reason": "Claude는 공약수 가운데 고를 의미 있는 대상으로 최대공약수를 자연스럽게 유추할 수 있다고 보았다. 리드는 구하는 대상이 문장에 없는 점을 보완 후보로 남기되 확정 결함에서는 제외한다.",
      "proposal": "유지. '가장 큰 수'를 동의 답으로 인정하고, 원하면 문두에 '최대공약수를 구할 때'를 덧붙인다.",
      "primaryReason": "학생문장: “두 약수 목록에서 겹치는 수를 찾고 그중 □를 고른다.” — 무엇을 구하는 절차인지 학생문장에 없다. 겹치는 약수 중 가장 큰 수를 고르는 것은 최대공약수 계산이라는 목표가 있어야 결정된다.",
      "primaryProposal": "최대공약수를 구한다는 목표를 본문에 남기고 고르는 기준만 묻는다.",
      "initialAlternativeAnswers": [
        "맨 작은 수"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "Claude는 공약수 가운데 고를 의미 있는 대상으로 최대공약수를 자연스럽게 유추할 수 있다고 보았다. 리드는 구하는 대상이 문장에 없는 점을 보완 후보로 남기되 확정 결함에서는 제외한다.",
      "batch": "e5e6"
    },
    "authorReason": "최대공약수라는 목표와 자연수 대상을 문장에 남겨 가장 작은 공약수를 고르는 해석을 막았다."
  },
  {
    "id": "e5-1-6-1-xc20",
    "grade": "e5",
    "chapter": "1-6 다각형의 둘레와 넓이",
    "student": "직사각형의 한 귀퉁이를 직사각형 모양으로 잘라 낸 ㄱ자 도형의 □는 처음 직사각형의 둘레와 같다. 잘린 두 변의 길이만큼 새 변이 생기기 때문이다.",
    "currentDefinition": "직사각형의 한 귀퉁이를 직사각형 모양으로 잘라 낸 ㄱ자 도형의 {둘레}는 처음 직사각형의 둘레와 같다. 잘린 두 변의 길이만큼 새 변이 생기기 때문이다.",
    "expected": [
      "둘레"
    ],
    "firstBlind": {
      "id": "e5-1-6-1-xc20",
      "answers": [
        "둘레"
      ],
      "alternativeAnswers": [
        "둘레의 길이"
      ],
      "reason": "답 노출: 같은 문장에 '처음 직사각형의 둘레와 같다'가 있어 그대로 옮겨 쓰면 됨. 수학 내용은 정확하고, '넓이'를 넣으면 거짓이라 답은 유일."
    },
    "originalFinding": {
      "id": "e5-1-6-1-xc20",
      "grade": "e5",
      "section": "초5::1-6 다각형의 둘레와 넓이::1-6-1 정다각형과 사각형의 둘레",
      "sourceHash": "fb44605d2bf2ed49ca36aca4b692f42b01d932c23054e95e4ebca5545b0c56b9",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "missing-referent",
      "student": "직사각형의 한 귀퉁이를 직사각형 모양으로 잘라 낸 ㄱ자 도형은 변을 옮기면 □와 같다.",
      "expected": [
        "처음 직사각형의 둘레"
      ],
      "reason": "주어가 'ㄱ자 도형'이라 기대답을 넣으면 도형이 둘레(길이)와 같다는 범주가 어긋난 문장이 된다. 학생은 '처음 직사각형'이라고 쓰기 쉬워 답의 종류(도형인지 둘레인지)가 흔들린다.",
      "proposal": "주어를 'ㄱ자 도형의 둘레는'으로 바꾸고 '처음 직사각형의 □와 같다'처럼 묻는다.",
      "primaryReason": "학생문장: “직사각형의 한 귀퉁이를 직사각형 모양으로 잘라 낸 ㄱ자 도형은 변을 옮기면 □와 같다.” — 학생문장의 주어는 ㄱ자 도형인데 기대답은 길이인 '처음 직사각형의 둘레'이다. 도형 자체가 길이와 같다는 문장으로 읽혀 비교 대상이 둘레라는 말의 누락 여부를 검토해야 한다.",
      "primaryProposal": "ㄱ자 도형의 둘레를 비교한다는 주어를 명시한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "도형과 길이를 같다고 했던 범주 오류를 바로잡고 잘린 길이와 새 길이가 같다는 이유를 보존했다."
  },
  {
    "id": "e5-1-6-1-c6",
    "grade": "e5",
    "chapter": "1-6 다각형의 둘레와 넓이",
    "student": "두 도형의 둘레가 같아도 넓이가 항상 같은 것은 □. 가로와 세로가 $2$와 $4$인 직사각형과 $1$과 $5$인 직사각형은 둘레는 같지만 넓이는 다르다.",
    "currentDefinition": "두 도형의 둘레가 같아도 넓이가 항상 같은 것은 {아니다}. 가로와 세로가 $2$와 $4$인 직사각형과 $1$과 $5$인 직사각형은 둘레는 같지만 넓이는 다르다.",
    "expected": [
      "아니다"
    ],
    "firstBlind": {
      "id": "e5-1-6-1-c6",
      "answers": [
        "같아도"
      ],
      "alternativeAnswers": [
        "같더라도",
        "같을 때에도",
        "달라도",
        "다르면"
      ],
      "reason": "자연스러운 답은 '같아도'. 다만 '둘레가 달라도(다르면) 넓이는 서로 다를 수 있다'도 참이라 논리적으로는 유일하지 않음. 예: 둘레 12인 2×4(넓이 8)와 둘레 16인 4×4(넓이 16). '둘레가 같은 두 도형이라도'처럼 조건을 본문에 고정하는 편이 안전."
    },
    "originalFinding": {
      "id": "e5-1-6-1-c6",
      "grade": "e5",
      "section": "초5::1-6 다각형의 둘레와 넓이::1-6-1 정다각형과 사각형의 둘레",
      "sourceHash": "913d65e73a4a8bfbe6eedc574a8969c0b9fda4e188540b59234e6fccbd1ece5d",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "hidden-condition",
      "student": "□ 도형 안쪽을 채우는 넓이는 서로 다를 수 있다.",
      "expected": [
        "둘레가 같더라도"
      ],
      "reason": "조건절 전체가 빈칸이지만 대단원 '둘레와 넓이'와 '안쪽을 채우는 넓이'라는 대비 표현 덕분에 '둘레가 같아도'가 가장 자연스러운 답이다. prior의 대안(변의 수 등)은 부자연스러워 확정 결함은 아니나, 문장 안에 둘레를 가리키는 단서가 없어 경계 사례다.",
      "proposal": "'□가 같더라도 도형 안쪽을 채우는 넓이는 서로 다를 수 있다'처럼 조건의 틀을 남긴다.",
      "primaryReason": "학생문장: “□ 도형 안쪽을 채우는 넓이는 서로 다를 수 있다.” — 비교할 조건 전체가 빈칸이라 둘레와 넓이의 관계를 묻는다는 단서가 없다. 도형의 변의 수나 모양 등 서로 다른 조건으로도 자연스럽게 성립한다.",
      "primaryProposal": "둘레가 같은 두 도형을 비교한다는 조건을 남기고 넓이가 반드시 같은지를 묻는다.",
      "initialAlternativeAnswers": [
        "변의 수가 같더라도",
        "모두 직사각형이어도"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "둘레가 같다는 조건과 항상 같음의 부정을 본문에 고정하고 실제 반례를 남겨 달라도/같아도라는 다른 참인 조건 답을 막았다."
  },
  {
    "id": "e5-1-3-1-xc4",
    "grade": "e5",
    "chapter": "1-3 대응 관계",
    "student": "한 양이 $1$씩 늘 때 다른 양이 일정하게 늘어나는 대응 관계에서는, 늘어난 양을 알기 위해 다음 값에서 앞의 값을 □. 이 차를 보면 규칙을 찾기 쉽다.",
    "currentDefinition": "한 양이 $1$씩 늘 때 다른 양이 일정하게 늘어나는 대응 관계에서는, 늘어난 양을 알기 위해 다음 값에서 앞의 값을 {뺀다}. 이 차를 보면 규칙을 찾기 쉽다.",
    "expected": [
      "뺀다"
    ],
    "firstBlind": {
      "id": "e5-1-3-1-xc4",
      "answers": [
        "차"
      ],
      "alternativeAnswers": [
        "표",
        "이웃한 두 수의 차"
      ],
      "reason": "조사 '로' 때문에 '뺄셈(으로)'은 들어가지 못하고 '차로', '표로'가 모두 자연스러움. '표로 구하면 규칙을 찾기 쉽다'도 참인 문장이라 답의 종류(연산 결과인지 표현 도구인지)가 정해지지 않음. '다른 양이 한 번에 늘어난 양'이라는 표현도 5학년 학생에게 모호함."
    },
    "originalFinding": {
      "id": "e5-1-3-1-xc4",
      "grade": "e5",
      "section": "초5::1-3 대응 관계::1-3-1 두 양 사이의 대응 관계",
      "sourceHash": "5c9da77fdeb9581d130908d9bac5e556e685bd37bcb4181984b8368bd43dc796",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "hidden-condition",
      "student": "□ 다른 양이 얼마씩 늘어나는지 보면 규칙을 찾기 쉽다.",
      "expected": [
        "한 양이 $1$씩 늘 때"
      ],
      "reason": "'다른 양'과 대구가 되어 '한 양이 늘어날 때'까지는 떠올릴 수 있으나, '1씩'이라는 구체 값은 문장에서 정해지지 않는다. '일정하게 늘 때'라고 써도 타당하다.",
      "proposal": "'한 양이 □씩 늘 때 다른 양이 얼마씩 늘어나는지'처럼 틀을 남기거나, '1씩'을 뺀 답도 인정한다.",
      "primaryReason": "학생문장: “□ 다른 양이 얼마씩 늘어나는지 보면 규칙을 찾기 쉽다.” — 변화량을 관찰하는 기준 전체를 가려 한 양을 얼마씩 늘려 보라는 것인지 알 수 없다. 한 양이 2씩 또는 같은 양씩 늘 때의 변화를 살피는 것도 성립하며 1씩이라는 기준을 고를 근거가 없다. 다만 한 양이 1씩 늘 때를 보는 전형적인 대응표 탐구로 해석할 여지가 있어 보류한다.",
      "primaryProposal": "한 양을 1씩 늘려 본다는 조건을 남기고 다른 양에서 확인할 것을 묻는다.",
      "initialAlternativeAnswers": [
        "한 양이 2씩 늘 때",
        "한 양이 일정한 양씩 늘 때"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "이웃한 두 값과 빼는 순서를 명시해 표라는 도구와 차라는 결과의 경쟁을 막고 뺄셈 동작을 짧게 묻는다."
  },
  {
    "id": "e5-2-1-1-c1",
    "grade": "e5",
    "chapter": "2-1 수의 범위와 어림하기",
    "student": "기준 수 이상의 수의 범위는 기준 수를 □하고 그보다 큰 수들도 들어가는 범위이다.",
    "currentDefinition": "기준 수 이상의 수의 범위는 기준 수를 {포함}하고 그보다 큰 수들도 들어가는 범위이다.",
    "expected": [
      "포함"
    ],
    "firstBlind": {
      "id": "e5-2-1-1-c1",
      "answers": [
        "기준 수를 포함한다"
      ],
      "alternativeAnswers": [
        "기준 수도 범위에 들어간다",
        "기준 수와 같거나 큰 수이다",
        "수직선에 기준 수를 색칠한 점(●)으로 나타낸다"
      ],
      "reason": "절 전체가 빈칸이라 답의 종류가 정해지지 않음. 포함 여부, '같거나 큰 수'라는 정의, 수직선 표시 방법이 모두 참인 완성. 앞의 '기준 수부터'가 이미 포함을 암시해 부분 노출도 있음. '기준 수를 □한다'처럼 빈칸을 좁혀야 함."
    },
    "originalFinding": {
      "id": "e5-2-1-1-c1",
      "grade": "e5",
      "section": "초5::2-1 수의 범위와 어림하기::2-1-1 이상과 이하 알아보기",
      "sourceHash": "f4d0df32e36d6a028c3714147e238b6500b6aff169f5e0a9107a8227fa44ae74",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "기준 수부터 큰 쪽으로 이어지는 범위가 이상이며, □.",
      "expected": [
        "기준 수도 들어간다"
      ],
      "reason": "이상의 정의에서 방향 다음에 오는 핵심 내용은 기준 수의 포함 여부이므로 '기준 수를 포함한다'가 자연스러운 단일 답이다. prior의 대안(수직선 표현 등)은 정의 회상 맥락에서 학생이 쓸 만한 답이 아니다.",
      "proposal": "유지. '포함한다' 같은 동의 표현을 인정한다.",
      "primaryReason": "학생문장: “기준 수부터 큰 쪽으로 이어지는 범위가 이상이며, □.” — 이상의 방향을 설명한 뒤 연결어 '이며' 다음 서술 전체가 비어 있다. 기준 수의 포함 여부를 써야 한다는 질문이 없어 수의 범위 표현에 관한 서로 다른 설명도 들어간다.",
      "primaryProposal": "기준 수를 범위에 포함하는지 묻는 문장 틀을 남긴다.",
      "initialAlternativeAnswers": [
        "수직선에 나타낼 수 있다",
        "기준 수보다 작은 수는 들어가지 않는다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "전체 서술절 대신 기준 수 포함 여부를 묻는 동사에 한정해 수직선 표시 등 다른 참인 설명을 막았다."
  },
  {
    "id": "e5-1-1-3-xc10",
    "grade": "e5",
    "chapter": "1-1 자연수의 혼합 계산",
    "student": "혼합 계산에서 빠뜨린 계산이 없다면 식에 있는 계산의 개수와 끝낸 계산의 개수는 □. 계산을 마친 뒤 이 두 개수를 비교해 누락을 확인한다.",
    "currentDefinition": "혼합 계산에서 빠뜨린 계산이 없다면 식에 있는 계산의 개수와 끝낸 계산의 개수는 {같다}. 계산을 마친 뒤 이 두 개수를 비교해 누락을 확인한다.",
    "expected": [
      "같다"
    ],
    "firstBlind": {
      "id": "e5-1-1-3-xc10",
      "answers": [
        "빠뜨린 계산"
      ],
      "alternativeAnswers": [
        "빠진 계산",
        "빠진 것",
        "누락",
        "남은 계산",
        "잘못된 곳"
      ],
      "reason": "답 노출 및 동어반복: 바로 앞 '하나도 빠지지 않았는지'가 답을 그대로 말해 줌. 조사 '이'에 맞는 명사구가 여러 개(빠진 계산, 누락, 남은 계산, 잘못된 곳)라 표현도 하나로 정해지지 않음."
    },
    "originalFinding": {
      "id": "e5-1-1-3-xc10",
      "grade": "e5",
      "section": "초5::1-1 자연수의 혼합 계산::1-1-3 덧셈, 뺄셈, 곱셈, 나눗셈이 섞여 있는 식",
      "sourceHash": "91eedb8ab1d2b45dadb2b79c3ddecbc9ecae6e561a454bd3d47c992150b666da",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "open-answer",
      "student": "혼합 계산을 마친 뒤에는 차례를 다시 짚어 □이 없는지 확인한다.",
      "expected": [
        "빠뜨린 계산"
      ],
      "reason": "'~이 없는지 확인한다'는 틀로 오류 점검이라는 방향은 알 수 있지만, 빠뜨린 계산·틀린 계산·차례가 바뀐 곳이 모두 자연스럽다. 수학 개념이 아닌 일반 학습 조언이라 단일 답으로 회상하기 어렵다.",
      "proposal": "'빠뜨린 □'처럼 누락 점검임을 남기거나 인정 답의 범위를 넓힌다.",
      "primaryReason": "학생문장: “혼합 계산을 마친 뒤에는 차례를 다시 짚어 □이 없는지 확인한다.” — 확인할 오류의 종류를 한정하지 않은 일반적 학습 조언이다. 빠뜨린 계산 외에 잘못 적용한 계산 차례를 확인하는 답도 자연스러워 정해진 개념을 회상하는 빈칸인지 검토가 필요하다.",
      "primaryProposal": "누락 여부를 확인하는 문장 틀을 주거나 일반 학습 조언으로 분리한다.",
      "initialAlternativeAnswers": [
        "잘못 적용한 차례"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "누락 점검을 식과 끝낸 계산의 개수 비교로 구체화해 잘못된 곳·계산 순서 등 임의의 점검 대상을 막았다."
  },
  {
    "id": "e5-1-2-2-xc11",
    "grade": "e5",
    "chapter": "1-2 약수와 배수",
    "student": "곱셈식 $2\\times9=18$ 하나에서 약수 관계와 배수 관계를 □ 읽을 수 있다.",
    "currentDefinition": "곱셈식 $2\\times9=18$ 하나에서 약수 관계와 배수 관계를 {함께} 읽을 수 있다.",
    "expected": [
      "함께"
    ],
    "firstBlind": {
      "id": "e5-1-2-2-xc11",
      "answers": [
        "모두"
      ],
      "alternativeAnswers": [
        "함께",
        "동시에",
        "한꺼번에",
        "둘 다"
      ],
      "reason": "부사 자리로 뜻은 한 가지(둘 다 읽을 수 있음)이며 동의 표현만 여럿. 2와 9는 18의 약수, 18은 2와 9의 배수로 내용 정확."
    },
    "originalFinding": {
      "id": "e5-1-2-2-xc11",
      "grade": "e5",
      "section": "초5::1-2 약수와 배수::1-2-2 약수와 배수의 관계",
      "sourceHash": "04da920a7b745596070bfb37b1d19f48998154285864147123eb6f6afea7aa5a",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "grammar-blank",
      "student": "곱셈식 $2\\times9=18$ 하나에서 약수 관계와 배수 관계를 □ 읽을 수 있다.",
      "expected": [
        "함께"
      ],
      "reason": "'하나에서 ~를 □ 읽는다'의 답은 함께·모두·동시에 같은 동의어로 수렴하므로 무엇을 쓸지 모르는 수준의 결함은 아니다. 다만 빈칸이 부사 하나여서 수학 내용을 확인하지 못한다.",
      "proposal": "'2와 9는 18의 □, 18은 2와 9의 □'처럼 약수·배수 관계 자체를 묻도록 빈칸을 옮긴다.",
      "primaryReason": "학생문장: “곱셈식 $2\\times9=18$ 하나에서 약수 관계와 배수 관계를 □ 읽을 수 있다.” — 약수 관계와 배수 관계라는 수학 내용은 이미 모두 보이고 빈칸은 '함께'라는 서술 부사만 요구한다. '각각'처럼 서로 다른 읽기 방식도 자연스러워 수학적 판단 대상이 없다.",
      "primaryProposal": "예시 식에서 어느 수가 어느 수의 약수 또는 배수인지 묻도록 빈칸 위치를 바꾼다.",
      "initialAlternativeAnswers": [
        "각각"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "곱셈식 하나에서 두 관계를 읽는다는 문장에 함께·동시에·모두는 같은 의미의 부사이다. 수학적 명제를 바꾸는 대안이 아니므로 유지한다."
  },
  {
    "id": "e5-1-4-1-xc20",
    "grade": "e5",
    "chapter": "1-4 약분과 통분",
    "student": "분모와 분자에 같은 자연수 $k$를 곱해 크기가 같은 분수를 만들면, 분모와 분자의 합도 원래 합의 □배가 된다.",
    "currentDefinition": "분모와 분자에 같은 자연수 $k$를 곱해 크기가 같은 분수를 만들면, 분모와 분자의 합도 원래 합의 {$k$}배가 된다.",
    "expected": [
      "$k$"
    ],
    "firstBlind": {
      "id": "e5-1-4-1-xc20",
      "answers": [
        "배수"
      ],
      "alternativeAnswers": [
        "곱한 수 배",
        "그 자연수 배",
        "같은 배"
      ],
      "reason": "(분모+분자)×k이므로 '배수'도 참이고 '곱한 수만큼의 배'도 참. 후자가 더 강한 진술이라 기대 답이 무엇인지 학생이 정할 수 없음. 예: 2/3 → 4/6이면 합 5 → 10으로 '5의 배수'이자 '2배'. 1을 곱하는 경우도 1배로 성립."
    },
    "originalFinding": {
      "id": "e5-1-4-1-xc20",
      "grade": "e5",
      "section": "초5::1-4 약분과 통분::1-4-1 크기가 같은 분수 알아보기",
      "sourceHash": "216513901c80079d61b0fb1f33a90dfacb5fdb7f4ce8fd20f9cd0105a6f8782d",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "math-error",
      "student": "크기가 같은 분수에서 분모와 분자의 합도 □로 커진다.",
      "expected": [
        "같은 배"
      ],
      "reason": "분모와 분자에 같은 수를 곱한다는 전제가 문장에 없어 '같은 배'가 무엇과 같은지, 왜 커지는지 기준이 보이지 않는다. 다만 전제가 빠진 것이지 내용이 틀린 것은 아니므로 prior의 수학적 오류 판정에는 동의하지 않는다.",
      "proposal": "'분모와 분자에 같은 수를 곱해 크기가 같은 분수를 만들면 분모와 분자의 합도 □가 된다'처럼 전제를 넣는다.",
      "primaryReason": "학생문장: “크기가 같은 분수에서 분모와 분자의 합도 □로 커진다.” — 크기가 같은 분수를 만드는 방향을 제시하지 않았는데 합이 반드시 커진다고 서술한다. 약분으로 같은 크기의 분수를 만들면 합은 작아지므로 기대답을 넣어도 일반 진술이 성립하지 않는다.",
      "primaryProposal": "분모와 분자에 1보다 큰 같은 자연수를 곱하는 상황으로 한정하거나 합의 배수 관계를 중립적으로 묻는다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": "2/4를 1/2로 바꾸면 분모와 분자의 합은 6에서 3으로 작아진다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "곱한 자연수를 기호 k로 정하고 배 단위를 노출해 단순 배수라는 약한 진술 대신 정확한 배율을 묻는다. k는 이 문장 안에서 정의한 자연수이며 새 개념이 아니다."
  },
  {
    "id": "e5-1-4-4-xc15",
    "grade": "e5",
    "chapter": "1-4 약분과 통분",
    "student": "분모가 다른 두 분수는 조각의 크기가 달라, 분자가 더 크다고 분수의 크기도 항상 더 큰 것은 □.",
    "currentDefinition": "분모가 다른 두 분수는 조각의 크기가 달라, 분자가 더 크다고 분수의 크기도 항상 더 큰 것은 {아니다}.",
    "expected": [
      "아니다"
    ],
    "firstBlind": {
      "id": "e5-1-4-4-xc15",
      "answers": [
        "큰 것은 아니다"
      ],
      "alternativeAnswers": [
        "크지는 않다",
        "크다고 할 수 없다"
      ],
      "reason": "반례 1/2과 2/5(분자는 2가 크지만 2/5<1/2)로 내용은 참. 다만 '반드시 더 크지 않다'로 쓰면 '항상 더 크지 않다'는 전체부정으로 읽혀 거짓이 됨(3/4>1/2). 부분부정이 드러나게 '항상 더 큰 것은 □'처럼 빈칸을 '아니다'로 좁히는 편이 안전."
    },
    "originalFinding": {
      "id": "e5-1-4-4-xc15",
      "grade": "e5",
      "section": "초5::1-4 약분과 통분::1-4-4 분수의 크기 비교",
      "sourceHash": "618f6fdfc477cb8fce687eb2a28b91bdc92958cf9d732161a30e4424371f30cc",
      "status": "not_issue",
      "initialStatus": "needs_review",
      "category": "math-error",
      "student": "분모가 다른 두 분수는 조각의 크기가 달라 분자가 크다고 □.",
      "expected": [
        "더 큰 분수가 아니다"
      ],
      "reason": "'~다고 ~이 아니다'는 한국어에서 '반드시 그런 것은 아니다'로 읽히는 관용 구문이어서 기대답을 넣은 문장은 수학적으로 타당하다. 학생의 답도 같은 뜻으로 모인다.",
      "proposal": "유지. 원하면 '항상 더 큰 분수인 것은 아니다'로 다듬는다.",
      "primaryReason": "학생문장: “분모가 다른 두 분수는 조각의 크기가 달라 분자가 크다고 □.” — 의도는 분자가 크다는 이유만으로 분수가 더 크다고 단정할 수 없다는 뜻으로 보인다. 하지만 기대답을 넣은 문장은 '더 큰 분수가 아니다'라는 부정으로도 읽혀, 경우에 따라 더 클 수 있음을 분명하게 할 필요가 있다.",
      "primaryProposal": "항상 그런 것은 아니라는 의미를 명시하는 방향으로 검토한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": "3/4와 1/2는 분모가 다르고 분자가 더 큰 3/4가 실제로도 더 크다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "항상 더 크다는 명제의 부정으로 구조를 고정해 부분부정을 전체부정으로 읽는 위험을 없앴다."
  },
  {
    "id": "e5-1-4-3-xc18",
    "grade": "e5",
    "chapter": "1-4 약분과 통분",
    "student": "통분할 때 공통분모가 한쪽 분모와 같으면 그 분수의 분모와 분자는 □.",
    "currentDefinition": "통분할 때 공통분모가 한쪽 분모와 같으면 그 분수의 분모와 분자는 {바꾸지 않는다}.",
    "expected": [
      "바꾸지 않는다"
    ],
    "firstBlind": {
      "id": "e5-1-4-3-xc18",
      "answers": [
        "그대로 둔다"
      ],
      "alternativeAnswers": [
        "바꾸지 않는다",
        "변하지 않는다",
        "그대로 쓴다"
      ],
      "reason": "예: 1/2과 3/4를 분모 4로 통분하면 3/4은 그대로. 서술부 전체가 빈칸이지만 뜻은 한 가지로 모임."
    },
    "originalFinding": {
      "id": "e5-1-4-3-xc18",
      "grade": "e5",
      "section": "초5::1-4 약분과 통분::1-4-3 통분",
      "sourceHash": "c91b0d88d94a7f8771402726809209f249cd70ec1340bd874ed5a3ee29053c7a",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "answer-leak",
      "student": "공통분모가 한쪽 분모와 같으면 그 분수는 □ 그대로 쓴다.",
      "expected": [
        "바꾸지 않고"
      ],
      "reason": "빈칸 뒤 '그대로 쓴다'가 기대답 '바꾸지 않고'와 뜻이 겹쳐, 학생이 다른 내용을 요구받는다고 오해할 수 있다. 답은 추정할 수 있으므로 확정 결함보다는 틀 개선 대상이다.",
      "proposal": "중복을 없애고 '공통분모가 한쪽 분모와 같으면 그 분수는 □'처럼 변화 여부를 묻는다.",
      "primaryReason": "학생문장: “공통분모가 한쪽 분모와 같으면 그 분수는 □ 그대로 쓴다.” — 빈칸 뒤의 '그대로 쓴다'가 기대답 '바꾸지 않고'를 이미 뜻한다. 공통분모의 성질을 판단하기보다 보이는 표현을 동의어로 되풀이하는 빈칸이다.",
      "primaryProposal": "공통분모와 원래 분모의 관계를 묻거나 중복 표현을 없애고 변화 여부를 묻는다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
      "batch": "e5e6"
    },
    "authorReason": "통분 상황과 바꾸는 대상 두 수를 남기고 뒤의 동의 표현 노출을 없앴다."
  },
  {
    "id": "e5-1-2-6-c1",
    "grade": "e5",
    "chapter": "1-2 약수와 배수",
    "student": "두 자연수의 최소공배수를 구하려면 두 수의 배수를 작은 것부터 적어, 처음으로 □를 찾는다.",
    "currentDefinition": "두 자연수의 최소공배수를 구하려면 두 수의 배수를 작은 것부터 적어, 처음으로 {겹치는 수}를 찾는다.",
    "expected": [
      "겹치는 수"
    ],
    "firstBlind": {
      "id": "e5-1-2-6-c1",
      "answers": [
        "겹치는 수"
      ],
      "alternativeAnswers": [
        "같은 수",
        "공통으로 나오는 수",
        "공통인 수",
        "똑같이 나오는 수"
      ],
      "reason": "처음으로 공통인 배수가 최소공배수이므로 정확. 표현만 여러 가지이고 뜻은 하나. 조사 '를'과 일치."
    },
    "originalFinding": {
      "id": "e5-1-2-6-c1",
      "grade": "e5",
      "section": "초5::1-2 약수와 배수::1-2-6 최소공배수 구하는 방법",
      "sourceHash": "cbf1d8932b742240aba1f6754a5db584304e3abf07fe6d01be249d860f9ee270",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "두 수의 배수를 작은 것부터 적어 □를 찾는다.",
      "expected": [
        "처음으로 겹치는 수"
      ],
      "reason": "목표(최소공배수)가 문장에 없어 '공배수', '최소공배수', '처음으로 겹치는 수'가 모두 자연스럽게 들어간다. '작은 것부터'가 처음 겹치는 수를 암시하지만 답의 종류가 용어인지 설명인지 갈린다.",
      "proposal": "'최소공배수를 구할 때는 두 수의 배수를 작은 것부터 적어 □를 찾는다'로 목표를 밝힌다.",
      "primaryReason": "학생문장: “두 수의 배수를 작은 것부터 적어 □를 찾는다.” — 최소공배수를 찾는다는 목표가 가려져 있다. 공통 배수 하나를 찾는 것과 처음 공통 배수를 찾는 것은 다른 과제인데 문장만으로 구별되지 않는다.",
      "primaryProposal": "최소공배수 계산임을 명시한 뒤 처음 겹치는 수를 묻는다.",
      "initialAlternativeAnswers": [
        "공통으로 나타나는 수",
        "두 번째로 겹치는 수"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "최소공배수를 구하는 목표를 명시하고 처음이라는 선택 조건을 문장에 남겼다."
  },
  {
    "id": "e5-1-5-1-c1",
    "grade": "e5",
    "chapter": "1-5 분수의 덧셈과 뺄셈",
    "student": "분모가 다른 분수를 더할 때는 분모를 통일한 다음 분자는 □, 공통분모는 □ 적는다.",
    "currentDefinition": "분모가 다른 분수를 더할 때는 분모를 통일한 다음 분자는 {더하고}, 공통분모는 {그대로} 적는다.",
    "expected": [
      "더하고",
      "그대로"
    ],
    "firstBlind": {
      "id": "e5-1-5-1-c1",
      "answers": [
        "더하고",
        "그대로"
      ],
      "alternativeAnswers": [
        "분자끼리 더하고",
        "그대로 두어"
      ],
      "reason": "순서와 종류가 분명함. '더할 때'가 첫 빈칸을 약하게 암시하지만 절차 문장으로는 자연스러움. '분모를 통일'은 교과서 용어 '통분'으로 쓰는 편이 학년 용어에 맞음."
    },
    "originalFinding": {
      "id": "e5-1-5-1-c1",
      "grade": "e5",
      "section": "초5::1-5 분수의 덧셈과 뺄셈::1-5-1 진분수의 덧셈",
      "sourceHash": "2015871f4dda4c7305e18b6d19ada5301e736e8665fde11b6ff78afbd860802c",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "분모를 통일한 다음 분자는 □, 공통분모는 □ 적는다.",
      "expected": [
        "더하고",
        "그대로"
      ],
      "reason": "대단원이 '분수의 덧셈과 뺄셈'으로 두 연산을 모두 포함하는데, e5-1-5-3-c1과 학생 문장이 글자까지 같으면서 첫 기대답만 다르다. 문장만으로는 '더하고'와 '빼고'를 가를 수 없다.",
      "proposal": "'분모가 다른 진분수의 덧셈은'처럼 연산을 문두에 밝힌다.",
      "primaryReason": "학생문장: “분모를 통일한 다음 분자는 □, 공통분모는 □ 적는다.” — 덧셈인지 뺄셈인지 본문에 없고 e5-1-5-3-c1과 학생문장이 완전히 같지만 첫 기대답이 서로 다르다. 분모를 통일하는 절차만으로 연산을 결정할 수 없다.",
      "primaryProposal": "분수의 덧셈임을 학생문장에 명시한다.",
      "initialAlternativeAnswers": [
        "빼고 / 그대로"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "덧셈을 명시해 학생 문장이 같은 뺄셈 항목과 구별되게 했다."
  },
  {
    "id": "e5-1-5-3-c1",
    "grade": "e5",
    "chapter": "1-5 분수의 덧셈과 뺄셈",
    "student": "분모가 다른 분수를 뺄 때는 분모를 통일한 다음 분자는 □, 공통분모는 □ 적는다.",
    "currentDefinition": "분모가 다른 분수를 뺄 때는 분모를 통일한 다음 분자는 {빼고}, 공통분모는 {그대로} 적는다.",
    "expected": [
      "빼고",
      "그대로"
    ],
    "firstBlind": {
      "id": "e5-1-5-3-c1",
      "answers": [
        "빼고",
        "그대로"
      ],
      "alternativeAnswers": [
        "분자끼리 빼고",
        "그대로 두어"
      ],
      "reason": "덧셈 문항과 같은 구조로 유일. '뺄 때'가 첫 빈칸을 약하게 암시함. '분모를 통일'은 '통분'이 학년 용어."
    },
    "originalFinding": {
      "id": "e5-1-5-3-c1",
      "grade": "e5",
      "section": "초5::1-5 분수의 덧셈과 뺄셈::1-5-3 진분수의 뺄셈",
      "sourceHash": "c19faa62538980a9764e19f5ddfe717c68203758bd021c208509cd076a73f1df",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "분모를 통일한 다음 분자는 □, 공통분모는 □ 적는다.",
      "expected": [
        "빼고",
        "그대로"
      ],
      "reason": "e5-1-5-1-c1과 학생 문장이 완전히 같고 대단원 맥락도 덧셈·뺄셈을 모두 포함한다. 첫 빈칸에 '빼고'를 써야 한다는 근거가 문장에 없다.",
      "proposal": "'분모가 다른 진분수의 뺄셈은'처럼 연산을 문두에 밝힌다.",
      "primaryReason": "학생문장: “분모를 통일한 다음 분자는 □, 공통분모는 □ 적는다.” — 덧셈인지 뺄셈인지 본문에 없고 e5-1-5-1-c1과 학생문장이 완전히 같지만 첫 기대답이 서로 다르다. 분모를 통일하는 절차만으로 연산을 결정할 수 없다.",
      "primaryProposal": "분수의 뺄셈임을 학생문장에 명시한다.",
      "initialAlternativeAnswers": [
        "더하고 / 그대로"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "뺄셈을 명시해 학생 문장이 같은 덧셈 항목과 구별되게 했다."
  },
  {
    "id": "e5-2-1-1-c2",
    "grade": "e5",
    "chapter": "2-1 수의 범위와 어림하기",
    "student": "기준 수 이하의 수의 범위는 기준 수를 □하고 그보다 작은 수들도 들어가는 범위이다.",
    "currentDefinition": "기준 수 이하의 수의 범위는 기준 수를 {포함}하고 그보다 작은 수들도 들어가는 범위이다.",
    "expected": [
      "포함"
    ],
    "firstBlind": {
      "id": "e5-2-1-1-c2",
      "answers": [
        "기준 수를 포함한다"
      ],
      "alternativeAnswers": [
        "기준 수도 범위에 들어간다",
        "기준 수와 같거나 작은 수이다",
        "수직선에 기준 수를 색칠한 점(●)으로 나타낸다"
      ],
      "reason": "이상 문항과 같은 문제. 절 전체가 빈칸이라 포함 여부, '같거나 작은 수' 정의, 수직선 표시 등 서로 다른 참인 완성이 가능. '기준 수부터'가 포함을 미리 암시함."
    },
    "originalFinding": {
      "id": "e5-2-1-1-c2",
      "grade": "e5",
      "section": "초5::2-1 수의 범위와 어림하기::2-1-1 이상과 이하 알아보기",
      "sourceHash": "718cf43de45faf4e70139a8c7d0fd40de677bb6ac1c42edee675c4460a285324",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "기준 수부터 작은 쪽으로 이어지는 범위가 이하이며, □.",
      "expected": [
        "기준 수도 들어간다"
      ],
      "reason": "이하의 정의에서 이어질 핵심 내용은 기준 수의 포함 여부이므로 '기준 수도 포함한다'가 자연스러운 단일 답이다. prior의 대안은 실제 학생의 답으로 보기 어렵다.",
      "proposal": "유지. 동의 표현을 인정한다.",
      "primaryReason": "학생문장: “기준 수부터 작은 쪽으로 이어지는 범위가 이하이며, □.” — 이하의 방향을 설명한 뒤 연결어 '이며' 다음 서술 전체가 비어 있다. 기준 수의 포함 여부를 써야 한다는 질문이 없어 서로 다른 설명도 성립한다.",
      "primaryProposal": "기준 수를 범위에 포함하는지 묻는 문장 틀을 남긴다.",
      "initialAlternativeAnswers": [
        "수직선에 나타낼 수 있다",
        "기준 수보다 큰 수는 들어가지 않는다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "전체 서술절 대신 기준 수 포함 여부를 묻는 동사에 한정해 수직선 표시 등 다른 참인 설명을 막았다."
  },
  {
    "id": "e5-2-1-4-c1",
    "grade": "e5",
    "chapter": "2-1 수의 범위와 어림하기",
    "student": "올림할 때는 정한 자리 아래에 $0$이 아닌 숫자가 있으면 정한 자리의 수에 □을 보태고 아래 자리를 $0$으로 처리한다.",
    "currentDefinition": "올림할 때는 정한 자리 아래에 $0$이 아닌 숫자가 있으면 정한 자리의 수에 {$1$}을 보태고 아래 자리를 $0$으로 처리한다.",
    "expected": [
      "$1$"
    ],
    "firstBlind": {
      "id": "e5-2-1-4-c1",
      "answers": [
        "1을 더하고"
      ],
      "alternativeAnswers": [
        "1을 올리고",
        "1을 더한 뒤",
        "1을 올려 주고"
      ],
      "reason": "올림 절차로 읽으면 '1을 더하고'. 그러나 문장에 '올림'이라는 주어나 조건이 없어 일반 진술로는 참이 아님. 반올림이면 3210을 백의 자리까지 나타낼 때 아래에 10이 남아도 1을 더하지 않고, 버림이면 그 자리를 그대로 둠. '올림할 때'를 명시해야 함. '남은 양'보다 '0이 아닌 숫자가 있으면'이 학년 표현에 가까움."
    },
    "originalFinding": {
      "id": "e5-2-1-4-c1",
      "grade": "e5",
      "section": "초5::2-1 수의 범위와 어림하기::2-1-4 올림 알아보기",
      "sourceHash": "33700fa954d3cb7b2259d6efdba9611ffbbd20ce6c6419c3a777fd947ff02349",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "정한 자리 아래에 남은 양이 있으면 그 자리에 □ 아래 자리를 $0$으로 처리한다.",
      "expected": [
        "$1$을 보태고"
      ],
      "reason": "'남은 양이 있으면'이라는 조건은 올림에만 의미가 있고(버림은 조건과 무관, 반올림은 5 이상 기준), '그 자리에 □'의 조사도 '1을 더하고'를 요구한다. prior의 버림 대안은 '그 자리에'라는 틀에 맞지 않는다.",
      "proposal": "유지. '1을 더하고'를 동의 답으로 인정하고, 원하면 주어 '올림은'을 덧붙인다.",
      "primaryReason": "학생문장: “정한 자리 아래에 남은 양이 있으면 그 자리에 □ 아래 자리를 $0$으로 처리한다.” — 올림을 설명한다는 이름이 학생문장에 없다. 정한 자리 아래 양이 있을 때 그 자리에 1을 보태는 올림과 그 자리를 그대로 두는 버림 중 무엇을 설명하는지 결정되지 않는다.",
      "primaryProposal": "올림하는 방법임을 본문에 명시한다.",
      "initialAlternativeAnswers": [
        "있는 숫자를 그대로 두고"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "올림 상황과 0이 아닌 남은 숫자 조건을 남겨 버림·반올림 절차와 구별했다."
  },
  {
    "id": "e5-1-3-3-xc26",
    "grade": "e5",
    "chapter": "1-3 대응 관계",
    "student": "대응 관계의 식에서 기호가 어느 양을 나타내는지 정한 약속이 기호의 □이다. 식이 상황과 맞지 않으면 이 약속부터 다시 확인한다.",
    "currentDefinition": "대응 관계의 식에서 기호가 어느 양을 나타내는지 정한 약속이 기호의 {뜻}이다. 식이 상황과 맞지 않으면 이 약속부터 다시 확인한다.",
    "expected": [
      "뜻"
    ],
    "firstBlind": {
      "id": "e5-1-3-3-xc26",
      "answers": [
        "기호의 뜻"
      ],
      "alternativeAnswers": [
        "기호가 나타내는 양",
        "처음 정한 약속",
        "문제 상황",
        "기호를 정한 부분"
      ],
      "reason": "'기호가 어느 양을 나타내는지 점검하려면 기호의 뜻을 확인한다'는 동어반복이라 사실상 답 노출. 조사 '을'에 맞는 '문제 상황', '처음 정한 약속' 등도 참이고 자연스러워 답이 하나로 정해지지 않음."
    },
    "originalFinding": {
      "id": "e5-1-3-3-xc26",
      "grade": "e5",
      "section": "초5::1-3 대응 관계::1-3-3 생활 속에서 대응 관계를 찾아 식으로 나타내기",
      "sourceHash": "b737eb9e10121cdf2884bf8e5fbdc9a8f553a3a2cbc8ff6fd5dbfafa43e2b124",
      "status": "confirmed",
      "initialStatus": "needs_review",
      "category": "open-answer",
      "student": "상황과 식이 맞지 않으면 □부터 다시 확인한다.",
      "expected": [
        "기호의 뜻"
      ],
      "reason": "'□부터 다시 확인한다'에는 기호의 뜻, 대응 규칙, 연산의 종류, 표의 값처럼 수학적으로 서로 다른 점검 대상이 모두 들어가고, 이를 좁힐 단서가 없다. prior의 보류보다 강하게, 학생이 무엇을 써야 할지 정할 수 없는 문항으로 본다.",
      "proposal": "'상황과 식이 맞지 않으면 □, △ 같은 기호가 □부터 다시 확인한다'처럼 기호를 문장에 남기거나 점검 조언으로 분리한다.",
      "primaryReason": "학생문장: “상황과 식이 맞지 않으면 □부터 다시 확인한다.” — 상황과 식이 어긋났다는 말만으로 기호의 뜻을 먼저 확인해야 하는지, 계산 규칙을 먼저 확인해야 하는지 정해지지 않는다. 일반적인 점검 조언을 단일 기대답으로 묻는지 확인이 필요하다.",
      "primaryProposal": "기호를 잘못 정한 사례를 주거나 점검 조언으로 분리한다.",
      "initialAlternativeAnswers": [
        "계산 규칙",
        "표에 적은 값"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "기호가 나타내는 양이라는 약속의 이름만 묻게 하고 상황·표·연산 같은 점검 대안은 빈칸 밖으로 분리했다."
  },
  {
    "id": "e6-1-2-2-c5",
    "grade": "e6",
    "chapter": "1-2 각기둥과 각뿔",
    "student": "각기둥에서 밑면의 변 수에 □를 더하면 면 수, □을 곱하면 모서리 수, □를 곱하면 꼭짓점 수가 된다.",
    "currentDefinition": "각기둥에서 밑면의 변 수에 {$2$}를 더하면 면 수, {$3$}을 곱하면 모서리 수, {$2$}를 곱하면 꼭짓점 수가 된다.",
    "expected": [
      "$2$",
      "$3$",
      "$2$"
    ],
    "firstBlind": {
      "id": "e6-1-2-2-c5",
      "answers": [
        "2",
        "3",
        "2"
      ],
      "alternativeAnswers": [],
      "reason": "n각기둥은 면 n+2, 모서리 3n, 꼭짓점 2n으로 유일. 조사 '2를/3을/2를'과도 일치. '밑면의 변 수'는 '한 밑면의 변의 수'로 쓰면 더 분명함."
    },
    "originalFinding": {
      "id": "e6-1-2-2-c5",
      "grade": "e6",
      "section": "초6::1-2 각기둥과 각뿔::1-2-2 각기둥의 이름과 구성 요소",
      "sourceHash": "2941e730c20208381d850788f48d5d1bda0a11862871e2abb2c42ea5856537c2",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "밑면의 변 수에 □, □, □가 된다.",
      "expected": [
        "$2$를 더하면 면 수",
        "$3$을 곱하면 모서리 수",
        "$2$를 곱하면 꼭짓점 수"
      ],
      "reason": "대단원이 '각기둥과 각뿔'인데 입체 이름이 없고, 세 빈칸에 연산·수·구할 요소가 모두 가려져 있다. 어느 입체의 어떤 공식을 어떤 순서로 써야 하는지 알 수 없다.",
      "proposal": "'각기둥에서 밑면의 변 수에 □를 더하면 면 수, □을 곱하면 모서리 수, □를 곱하면 꼭짓점 수'처럼 입체와 요소 이름을 남긴다.",
      "primaryReason": "학생문장: “밑면의 변 수에 □, □, □가 된다.” — 입체의 종류가 학생문장에서 없어지고 연산과 구할 요소까지 세 빈칸 안에 들어 있다. 밑면의 변 수만으로 각기둥인지 각뿔인지 정할 수 없어 어느 개수 공식을 써야 하는지 알 수 없다.",
      "primaryProposal": "각기둥임을 명시하고 면·모서리·꼭짓점 중 각 빈칸의 대상을 남긴다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "각기둥이라는 대상과 요소 이름·연산을 남겨 각뿔 공식 및 빈칸 순서의 혼동을 막았다."
  },
  {
    "id": "e6-1-3-3-c2",
    "grade": "e6",
    "chapter": "1-3 소수의 나눗셈",
    "student": "소수의 나눗셈에서 나머지에 $0$을 내려 계산할 때는 남은 양을 크기가 앞 단위의 □인 단위로 바꾸어 나눈다. 단위의 개수는 □가 되지만 남은 양은 □.",
    "currentDefinition": "소수의 나눗셈에서 나머지에 $0$을 내려 계산할 때는 남은 양을 크기가 앞 단위의 {$\\frac{1}{10}$}인 단위로 바꾸어 나눈다. 단위의 개수는 {$10$배}가 되지만 남은 양은 {같다}.",
    "expected": [
      "$\\frac{1}{10}$",
      "$10$배",
      "같다"
    ],
    "firstBlind": {
      "id": "e6-1-3-3-c2",
      "answers": [
        "10분의 1",
        "10배",
        "변하지 않는다"
      ],
      "alternativeAnswers": [
        "1/10",
        "0.1배",
        "그대로이다",
        "같다"
      ],
      "reason": "예: 나머지 2를 0.1이 20개로 바꾸면 단위 크기는 1/10, 개수는 10배, 양은 그대로. 세 빈칸 모두 유일하고 표현만 다름. 둘째 빈칸은 조사 '가'에 맞춰 '10배'."
    },
    "originalFinding": {
      "id": "e6-1-3-3-c2",
      "grade": "e6",
      "section": "초6::1-3 소수의 나눗셈::1-3-3 소수점 아래 0을 내려 계산하는 (소수)÷(자연수) 알아보기",
      "sourceHash": "549d51d323dc0a579771fbb79b43f4cf84dd57904e6ca773204c1195ffa910ea",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "missing-referent",
      "student": "남은 양을 □의 개수로 바꾸어 나누는 것이다. 단위의 개수는 □가 되지만 남은 양은 □.",
      "expected": [
        "크기가 앞 단위의 $\\frac{1}{10}$인 단위",
        "$10$배",
        "같다"
      ],
      "reason": "'0을 내려 계산하는 것은'이라는 주어가 없어 첫 문장이 무엇을 설명하는지 불분명하고, 첫 빈칸의 기대 표현이 길고 특수하다. 둘째·셋째 빈칸(10배, 같다)은 첫 빈칸을 잡으면 정해지므로 경계 사례다.",
      "proposal": "주어 '소수점 아래 0을 내려 계산하는 것은'을 넣고, 첫 빈칸은 '앞 단위의 □인 단위'처럼 좁힌다.",
      "primaryReason": "학생문장: “남은 양을 □의 개수로 바꾸어 나누는 것이다. 단위의 개수는 □가 되지만 남은 양은 □.” — 남은 양이 어떤 나눗셈 단계에서 생겼는지, 한 자리 더 계산하려는 것인지 주어지지 않는다. 기대답의 앞 단위와 10배라는 변환 기준을 학생문장만으로 파악할 수 있는지 검토가 필요하다.",
      "primaryProposal": "소수 나눗셈을 한 자리 더 이어 계산하는 상황과 현재 단위를 명시한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "0을 내리는 절차의 주어와 단위 변환 구조를 노출하고 첫 긴 답을 비율 하나로 줄였다. 양은 유지되고 단위 개수만 10배임을 보존했다."
  },
  {
    "id": "e6-1-3-2-c3",
    "grade": "e6",
    "chapter": "1-3 소수의 나눗셈",
    "student": "$0$보다 큰 수를 자연수로 나눌 때, 몫이 $1$이 되려면 나누는 수만큼의 양이 있어야 한다. 나누어지는 수가 나누는 수보다 작으면 몫은 $1$보다 □.",
    "currentDefinition": "$0$보다 큰 수를 자연수로 나눌 때, 몫이 $1$이 되려면 나누는 수만큼의 양이 있어야 한다. 나누어지는 수가 나누는 수보다 작으면 몫은 $1$보다 {작다}.",
    "expected": [
      "작다"
    ],
    "firstBlind": {
      "id": "e6-1-3-2-c3",
      "answers": [
        "작다"
      ],
      "alternativeAnswers": [
        "작아진다"
      ],
      "reason": "'0보다 큰 수'와 '자연수로 나눌 때'라는 조건이 있어 유일. 예: 3÷4=0.75<1."
    },
    "originalFinding": {
      "id": "e6-1-3-2-c3",
      "grade": "e6",
      "section": "초6::1-3 소수의 나눗셈::1-3-2 몫이 1보다 작은 (소수)÷(자연수) 알아보기",
      "sourceHash": "c2e3293bb80ab544e12f2c0c4df427d9cfe318e920ee71170e402365d6c6ffaa",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "answer-leak",
      "student": "한 몫이 $1$이 되려면 나누는 수만큼의 양이 있어야 한다. 나누어지는 수가 그보다 작으면 □ 몫은 $1$보다 작다.",
      "expected": [
        "한 몫이 $1$에 못 미치므로"
      ],
      "reason": "기대답이 바로 뒤 결론 '몫은 1보다 작다'를 되풀이해 추론을 확인하는 가치는 낮다. 그러나 '1이 될 수 없으므로', '양이 모자라므로' 등으로 무리 없이 답할 수 있어 확정 결함은 아니다.",
      "proposal": "빈칸을 결론 쪽('몫은 □')으로 옮기거나, 이유 빈칸을 유지한다면 동의 답의 범위를 넓게 인정한다.",
      "primaryReason": "학생문장: “한 몫이 $1$이 되려면 나누는 수만큼의 양이 있어야 한다. 나누어지는 수가 그보다 작으면 □ 몫은 $1$보다 작다.” — 기대답 '한 몫이 1에 못 미치므로'는 바로 뒤의 '몫은 1보다 작다'와 같은 결론을 되풀이한다. 앞에서도 한 몫이 1이 될 조건을 제시하여 원인을 묻는 빈칸이 결론의 재진술이 된다.",
      "primaryProposal": "부족한 전체 양과 한 몫의 관계를 설명하도록 원인 부분을 구체화하고 결론 반복을 없앤다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
      "batch": "e5e6"
    },
    "authorReason": "양수·자연수 나눗셈을 명시하고 결론을 되풀이하는 긴 이유 답 대신 대소 관계만 묻는다. 한 몫을 만들 양이 부족하다는 설명을 남겼다."
  },
  {
    "id": "e6-2-6-2-xc3",
    "grade": "e6",
    "chapter": "2-6 원기둥, 원뿔, 구",
    "student": "원기둥의 전개도에서 옆면의 두 밑면 사이를 잇는 변은 길이가 원기둥의 □와 같다.",
    "currentDefinition": "원기둥의 전개도에서 옆면의 두 밑면 사이를 잇는 변은 길이가 원기둥의 {높이}와 같다.",
    "expected": [
      "높이"
    ],
    "firstBlind": {
      "id": "e6-2-6-2-xc3",
      "answers": [
        "높이"
      ],
      "alternativeAnswers": [],
      "reason": "옆면 직사각형의 세로는 높이, 가로는 밑면의 둘레이며, '두 밑면 사이를 잇는 변'은 높이 쪽으로 정해짐. 조사 '와'와 일치. 다만 '옆면의 두 밑면 사이를 잇는 변'은 어색하므로 '옆면인 직사각형의 세로'처럼 쓰는 편이 읽기 쉬움."
    },
    "originalFinding": {
      "id": "e6-2-6-2-xc3",
      "grade": "e6",
      "section": "초6::2-6 원기둥, 원뿔, 구::2-6-2 원기둥의 전개도 알아보기",
      "sourceHash": "2985dc858666b5e53cbc34a4cb1ca8ca44dc6e90392a50a5a11ec05516be52d5",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "answer-leak",
      "student": "원기둥의 전개도에서 옆면의 두 밑면 사이를 잇는 변은 길이가 원기둥의 □와 같다. 높이가 $8\\,\\mathrm{cm}$이면 $8\\,\\mathrm{cm}$이다.",
      "expected": [
        "높이"
      ],
      "reason": "문장은 명료하고 수학적으로 옳지만, 뒤 예시 '높이가 8 cm이면'이 빈칸의 답을 그대로 노출한다. 명료성 결함이 아니라 회상 문항으로서의 답 노출 문제다.",
      "proposal": "예시 문장을 빼거나 '원기둥의 □가 8 cm이면 이 변도 8 cm이다'처럼 예시의 답 낱말도 가린다.",
      "primaryReason": "학생문장: “원기둥의 전개도에서 옆면의 두 밑면 사이를 잇는 변은 길이가 원기둥의 □와 같다. 높이가 $8\\,\\mathrm{cm}$이면 $8\\,\\mathrm{cm}$이다.” — 뒤 예시 '높이가 8 cm이면 8 cm이다'가 앞 빈칸에서 묻는 측정량인 높이를 직접 제시한다. 예시로 관계를 추론하게 하는 의도인지, C형 회상 문항에서 답이 노출된 것인지 검토가 필요하다.",
      "primaryProposal": "확인용 예시와 빈칸 문항을 분리하거나 예시에서 목표 측정량을 직접 밝히지 않는다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
      "batch": "e5e6"
    },
    "authorReason": "뒤의 높이 8 cm 예시가 기대 답을 반복하므로 정의의 길이 관계는 남기고 예시 문장만 제거했다. 독립 example 필드는 보존했다."
  },
  {
    "id": "e6-2-3-2-c1",
    "grade": "e6",
    "chapter": "2-3 공간과 입체",
    "student": "쌓기나무는 모양과 크기가 같은 정육면체 모양의 블록이다. 한 블록의 모서리는 모두 길이가 □. 이를 붙이거나 쌓아 입체를 만들 수 있다.",
    "currentDefinition": "쌓기나무는 모양과 크기가 같은 정육면체 모양의 블록이다. 한 블록의 모서리는 모두 길이가 {같다}. 이를 붙이거나 쌓아 입체를 만들 수 있다.",
    "expected": [
      "같다"
    ],
    "firstBlind": {
      "id": "e6-2-3-2-c1",
      "answers": [
        "정육면체"
      ],
      "alternativeAnswers": [
        "직육면체",
        "주사위"
      ],
      "reason": "도형 포함관계: 정육면체는 직육면체에 속하므로 '직육면체 모양의 블록'도 거짓이 아니고, '주사위 모양'도 가능. 교과서 쌓기나무는 정육면체이므로 그것이 가장 구체적인 답이지만 문장만으로 직육면체를 배제하지는 못함."
    },
    "originalFinding": {
      "id": "e6-2-3-2-c1",
      "grade": "e6",
      "section": "초6::2-3 공간과 입체::2-3-2 쌓은 모양과 쌓기나무의 개수 알아보기 (1)",
      "sourceHash": "f7548e839776a051d39cbaacb6910f88efc5d987a0913ee35f9adf6a6aedacd2",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "모양과 크기가 같은 □을 붙이거나 쌓아 입체를 만들 수 있다.",
      "expected": [
        "정육면체 블록"
      ],
      "reason": "'쌓기나무'라는 정의 대상이 문장에 없어 학생은 빈칸에 '쌓기나무'를 쓰는 것이 가장 자연스럽고, 모양(정육면체)을 묻는다는 것을 알 수 없다. prior가 든 직육면체 대안보다 용어와 모양의 혼동이 더 큰 문제다.",
      "proposal": "'쌓기나무는 모양과 크기가 같은 □ 모양의 블록으로, 붙이거나 쌓아 입체를 만든다'처럼 주어를 밝힌다.",
      "primaryReason": "학생문장: “모양과 크기가 같은 □을 붙이거나 쌓아 입체를 만들 수 있다.” — 쌓기나무를 정의한다는 이름이나 정육면체 조건이 없다. 서로 같은 직육면체 블록 등도 붙이거나 쌓아 입체를 만들 수 있어 블록의 종류를 특정할 수 없다.",
      "primaryProposal": "쌓기나무라는 대상을 명시하고 그 모양을 묻는다.",
      "initialAlternativeAnswers": [
        "직육면체 블록"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "정육면체 이름은 본문에 남기고 모서리 길이 관계를 묻게 해 직육면체라는 포함관계 답과의 경쟁을 해소했다. 쌓기나무의 정의와 쓰임을 보존한다."
  },
  {
    "id": "e6-1-4-4-xc23",
    "grade": "e6",
    "chapter": "1-4 비와 비율",
    "student": "넓이에 대한 인구의 비율은 인구를 그 지역의 □로 나눈 값이다. 이 비율이 높은 마을이라도 전체 인구는 더 적을 수 있다.",
    "currentDefinition": "넓이에 대한 인구의 비율은 인구를 그 지역의 {넓이}로 나눈 값이다. 이 비율이 높은 마을이라도 전체 인구는 더 적을 수 있다.",
    "expected": [
      "넓이"
    ],
    "firstBlind": {
      "id": "e6-1-4-4-xc23",
      "answers": [
        "넓이"
      ],
      "alternativeAnswers": [
        "면적"
      ],
      "reason": "답 노출: 문장 첫머리 '넓이에 대한'에 답이 그대로 있음. '~에 대한'이 기준량임을 묻는 의도라면 성립하지만 단순 복사로 풀림. 내용(인구÷넓이, 비율이 높아도 인구는 적을 수 있음)은 정확."
    },
    "originalFinding": {
      "id": "e6-1-4-4-xc23",
      "grade": "e6",
      "section": "초6::1-4 비와 비율::1-4-4 비율이 사용되는 경우",
      "sourceHash": "f8bb4df65c2388093c81a0e5f61c2f326127ab4d99fc7f39f8573ed605a73fb2",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "open-answer",
      "student": "□이 높은 마을이라도 전체 인구는 더 적을 수 있다.",
      "expected": [
        "넓이에 대한 인구의 비율"
      ],
      "reason": "'전체 인구'와 대비되는 비율로 인구 밀도(넓이에 대한 인구의 비율)가 자연스럽지만, 주어 전체가 빈칸이라 다른 비율도 형식상 들어간다. 기대 표현이 길어 '인구 밀도'라고 쓴 답과 어긋날 수 있다.",
      "proposal": "'□에 대한 인구의 비율이 높은 마을이라도'처럼 틀을 남기고 '인구 밀도'를 동의 답으로 인정한다.",
      "primaryReason": "학생문장: “□이 높은 마을이라도 전체 인구는 더 적을 수 있다.” — 인구와 달라질 수 있는 마을의 어떤 속성을 묻는지 빈칸 전체가 가려져 있다. 넓이당 인구의 비율이라는 주제가 문장에 없어 다른 통계량도 자연스럽게 들어갈 여지가 있다.",
      "primaryProposal": "붐비는 정도를 나타내는 비율을 묻는다는 단서를 명시한다.",
      "initialAlternativeAnswers": [
        "평균 연령"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "긴 비율 이름 대신 나누는 기준량을 묻고 인구와 비율이 다름을 설명하는 원래 결론을 남겼다. 새 용어 인구밀도는 요구하지 않는다."
  },
  {
    "id": "e6-1-2-5-xc13",
    "grade": "e6",
    "chapter": "1-2 각기둥과 각뿔",
    "student": "삼각뿔에는 밑면이 $1$개, 옆면이 □개 있고, 밑면의 꼭짓점이 $3$개, 꼭대기가 □개 있다. 밑면의 모서리와 꼭대기로 가는 모서리는 각각 □개이다.",
    "currentDefinition": "삼각뿔에는 밑면이 $1$개, 옆면이 {$3$}개 있고, 밑면의 꼭짓점이 $3$개, 꼭대기가 {$1$}개 있다. 밑면의 모서리와 꼭대기로 가는 모서리는 각각 {$3$}개이다.",
    "expected": [
      "$3$",
      "$1$",
      "$3$"
    ],
    "firstBlind": {
      "id": "e6-1-2-5-xc13",
      "answers": [
        "3",
        "1",
        "3"
      ],
      "alternativeAnswers": [],
      "reason": "삼각뿔은 옆면 3, 각뿔의 꼭짓점 1, 밑면의 모서리 3, 옆 모서리 3으로 유일. 용어 문제: '꼭대기'는 6학년 교과서 용어가 아니며 '각뿔의 꼭짓점'으로 써야 함. '꼭대기로 가는 모서리'도 '옆면끼리 만나는 모서리' 등으로 고쳐야 함."
    },
    "originalFinding": {
      "id": "e6-1-2-5-xc13",
      "grade": "e6",
      "section": "초6::1-2 각기둥과 각뿔::1-2-5 각뿔의 이름과 구성 요소",
      "sourceHash": "604a72e63f81e7b5d151605ca6aeb6ad0df08dbd7df0d86580320c7c5b9eea32",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "long-phrase",
      "student": "삼각뿔에는 □, □, 밑면 둘레와 꼭대기로 가는 □이 있다.",
      "expected": [
        "밑면 하나와 옆면 셋",
        "밑면의 꼭짓점 셋과 꼭대기 한 점",
        "모서리 각 셋"
      ],
      "reason": "앞의 두 빈칸은 요소 이름(면, 꼭짓점)과 분해 방식(밑면 1과 옆면 3, 밑면의 꼭짓점 3과 꼭대기 1)이 통째로 가려져 순서와 세분 정도를 알 수 없다. '면 4개, 꼭짓점 4개'라고 쓴 학생은 기대답과 맞출 수 없고, 셋째 기대답 '모서리 각 셋'도 표현이 어색하다.",
      "proposal": "'삼각뿔에는 밑면 □개와 옆면 □개, 꼭짓점 □개, 모서리 □개가 있다'처럼 요소 이름을 남기고 수만 묻는다.",
      "primaryReason": "학생문장: “삼각뿔에는 □, □, 밑면 둘레와 꼭대기로 가는 □이 있다.” — 첫 두 빈칸에 면의 구성과 꼭짓점의 구성을 각각 써야 한다는 이름이 남아 있지 않다. 셋째 빈칸의 모서리 외에는 요구하는 요소와 수량의 범위가 통째로 가려져 삼각뿔의 여러 속성 중 무엇을 나열해야 하는지 알 수 없다.",
      "primaryProposal": "면·꼭짓점·모서리라는 요소 이름과 밑면·옆면 구분을 남기고 각각의 수량을 묻는다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "면·꼭짓점·모서리와 세는 범위를 남겨 답 순서가 정해지게 했다. 어색한 '모서리 각 셋'은 각각 3개로 고쳤다."
  },
  {
    "id": "e6-1-2-5-c6",
    "grade": "e6",
    "chapter": "1-2 각기둥과 각뿔",
    "student": "각뿔에서 밑면의 변 수에 □을 더하면 면 수와 꼭짓점 수, □를 곱하면 모서리 수가 된다.",
    "currentDefinition": "각뿔에서 밑면의 변 수에 {$1$}을 더하면 면 수와 꼭짓점 수, {$2$}를 곱하면 모서리 수가 된다.",
    "expected": [
      "$1$",
      "$2$"
    ],
    "firstBlind": {
      "id": "e6-1-2-5-c6",
      "answers": [
        "1",
        "2"
      ],
      "alternativeAnswers": [],
      "reason": "n각뿔은 면 n+1, 꼭짓점 n+1, 모서리 2n으로 유일. 조사 '1을/2를'과 일치."
    },
    "originalFinding": {
      "id": "e6-1-2-5-c6",
      "grade": "e6",
      "section": "초6::1-2 각기둥과 각뿔::1-2-5 각뿔의 이름과 구성 요소",
      "sourceHash": "e12b3e34de0fdacac542ef2a06e7842fbafca1a7d979bfea881c6347cb17386a",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "밑면의 변 수에 □, □가 된다.",
      "expected": [
        "$1$을 더하면 면 수와 꼭짓점 수",
        "$2$를 곱하면 모서리 수"
      ],
      "reason": "각뿔이라는 이름이 없고 연산·수·구할 요소가 모두 빈칸이어서, 같은 대단원의 각기둥 공식과 구별할 수 없다. 두 빈칸의 내용과 순서도 알 수 없다.",
      "proposal": "'각뿔에서 밑면의 변 수에 □을 더하면 면 수와 꼭짓점 수, □를 곱하면 모서리 수'처럼 입체와 요소 이름을 남긴다.",
      "primaryReason": "학생문장: “밑면의 변 수에 □, □가 된다.” — 각뿔이라는 입체 이름이 학생문장에서 빠지고 연산과 계산할 요소가 모두 가려져 있다. 밑면의 변 수만으로는 각기둥과 각뿔의 다른 공식을 구분할 수 없다.",
      "primaryProposal": "각뿔임을 명시하고 계산할 요소의 이름을 남긴다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "각뿔이라는 대상과 요소 이름·연산을 노출해 각기둥과 구별하고 수만 회상하게 했다."
  },
  {
    "id": "e6-1-4-6-c2",
    "grade": "e6",
    "chapter": "1-4 비와 비율",
    "student": "전체를 $100$으로 보았을 때 주어진 백분율만큼 차지하는 양을 구하려면, 전체 양에 백분율의 수를 □으로 나눈 값을 곱한다. 나눈 값은 전체를 $1$로 볼 때 차지하는 비율이다.",
    "currentDefinition": "전체를 $100$으로 보았을 때 주어진 백분율만큼 차지하는 양을 구하려면, 전체 양에 백분율의 수를 {$100$}으로 나눈 값을 곱한다. 나눈 값은 전체를 $1$로 볼 때 차지하는 비율이다.",
    "expected": [
      "$100$"
    ],
    "firstBlind": {
      "id": "e6-1-4-6-c2",
      "answers": [
        "소수"
      ],
      "alternativeAnswers": [
        "분수",
        "비율"
      ],
      "reason": "조사 '로'에 '소수로', '분수로', '비율로'가 모두 맞고 모두 참. 예: 25%는 0.25, 1/4 어느 쪽을 곱해도 됨. 답의 종류가 정해지지 않음. 뒤 문장의 '몫'은 나눗셈의 몫과 혼동될 수 있어 '비율'이나 '부분'이 적절."
    },
    "originalFinding": {
      "id": "e6-1-4-6-c2",
      "grade": "e6",
      "section": "초6::1-4 비와 비율::1-4-6 백분율이 사용되는 경우",
      "sourceHash": "8b5dd9f33040af0ba613ec9d4234d9ca78ef4a4b2aab062ebbd095215839c39f",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "전체를 $100$으로 보았을 때 □이다. 백분율을 비율로 고친 수는 전체를 $1$로 볼 때 차지하는 몫이므로 전체 양에 곱한다.",
      "expected": [
        "주어진 백분율만큼 차지하는 양"
      ],
      "reason": "첫 문장에 주어가 없어 '전체를 100으로 보았을 때 □이다'에는 교과서 정의대로 '백분율(비교하는 양의 비율)'을 쓰는 것이 가장 자연스럽다. 이는 기대답 '주어진 백분율만큼 차지하는 양'과 대상이 다르다.",
      "proposal": "'전체의 몇 %에 해당하는 양은 전체를 100으로 보았을 때 □이다'처럼 정의 대상을 주어로 밝힌다.",
      "primaryReason": "학생문장: “전체를 $100$으로 보았을 때 □이다. 백분율을 비율로 고친 수는 전체를 $1$로 볼 때 차지하는 몫이므로 전체 양에 곱한다.” — 첫 문장에 정의하려는 대상의 주어가 없고 전체를 100으로 보았다는 조건 뒤 서술 전체가 비었다. 주어진 백분율에 해당하는 실제 양을 뜻하는지 백분율 자체를 설명하는지 답의 대상을 알 수 없다.",
      "primaryProposal": "전체 양에서 주어진 백분율에 해당하는 양을 구한다는 목표와 주어진 수를 명시한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "백분율에서 비율로 변환하는 나눗수를 묻게 해 소수·분수·비율이라는 서로 다른 표현 이름과의 경쟁을 해소했다. 100과 1의 설명은 보존한다."
  },
  {
    "id": "e6-2-4-2-c2",
    "grade": "e6",
    "chapter": "2-4 비례식과 비례배분",
    "student": "두 항이 $0$보다 큰 소수인 비를 간단한 자연수의 비로 고치려면 두 항에 같은 $10$, $100$, $1000$ 등을 곱해 소수점을 □으로 옮겨 모두 자연수로 만든 뒤, 최대공약수로 나눈다.",
    "currentDefinition": "두 항이 $0$보다 큰 소수인 비를 간단한 자연수의 비로 고치려면 두 항에 같은 $10$, $100$, $1000$ 등을 곱해 소수점을 {오른쪽}으로 옮겨 모두 자연수로 만든 뒤, 최대공약수로 나눈다.",
    "expected": [
      "오른쪽"
    ],
    "firstBlind": {
      "id": "e6-2-4-2-c2",
      "answers": [
        "오른쪽"
      ],
      "alternativeAnswers": [],
      "reason": "10, 100 등을 곱하면 소수점이 오른쪽으로 이동하므로 유일. 조사 '으로'와 일치. '같은 수'는 '10, 100, 1000 같은 수'로 구체화하면 더 정확함(임의의 수를 곱하면 소수점 이동으로 설명되지 않음)."
    },
    "originalFinding": {
      "id": "e6-2-4-2-c2",
      "grade": "e6",
      "section": "초6::2-4 비례식과 비례배분::2-4-2 간단한 자연수의 비로 나타내기",
      "sourceHash": "684e3f0ec9caaba218f00703990054ea9a7e49e0f71c435ade80bd0e87783fe0",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "두 항이 모두 자연수가 되도록 □을 한 뒤 공약수로 나눈다.",
      "expected": [
        "같은 $10$배, $100$배 등"
      ],
      "reason": "'소수의 비'라는 전제가 없어, 같은 대단원에서 배우는 분수의 비(분모의 공배수를 곱함)와 구별되지 않는다. 학생은 '같은 수를 곱함' 정도만 쓸 수 있고 '10배, 100배 등'을 특정할 근거가 없다.",
      "proposal": "'소수의 비는 두 항이 모두 자연수가 되도록 두 항에 □을 곱한 뒤 공약수로 나눈다'처럼 대상을 밝힌다.",
      "primaryReason": "학생문장: “두 항이 모두 자연수가 되도록 □을 한 뒤 공약수로 나눈다.” — 소수로 된 비를 간단히 나타내는 절차라는 조건이 학생문장에 없다. 두 항이 분수인 비라면 같은 10배·100배 등만으로 자연수가 되지 않을 수 있어 기대 절차를 선택할 대상이 필요하다.",
      "primaryProposal": "두 항이 유한소수로 주어진 비라는 조건을 명시한다.",
      "initialAlternativeAnswers": [
        "분모들의 공배수를 곱하는 계산"
      ],
      "initialCounterexample": "1/3:1/2는 10이나 100 또는 10의 거듭제곱을 곱해도 첫 항이 자연수가 되지 않는다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "소수점 이동은 10의 배율로 하는 것임을 명시해 임의의 같은 수를 곱하는 해석을 막았다."
  },
  {
    "id": "e6-1-2-1-xc4",
    "grade": "e6",
    "chapter": "1-2 각기둥과 각뿔",
    "student": "각기둥의 밑면은 언제나 □개이다.",
    "currentDefinition": "각기둥의 밑면은 언제나 {$2$}개이다.",
    "expected": [
      "$2$"
    ],
    "firstBlind": {
      "id": "e6-1-2-1-xc4",
      "answers": [
        "2"
      ],
      "alternativeAnswers": [
        "두"
      ],
      "reason": "각기둥의 밑면은 서로 평행하고 합동인 두 면으로 유일."
    },
    "originalFinding": {
      "id": "e6-1-2-1-xc4",
      "grade": "e6",
      "section": "초6::1-2 각기둥과 각뿔::1-2-1 각기둥 알아보기와 각기둥의 밑면과 옆면",
      "sourceHash": "47ec810f5bca275031a092b9a41cd3d66db1696b007c11a85a9e12d98973725e",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "각기둥의 밑면은 언제나 □이다.",
      "expected": [
        "$2$개"
      ],
      "reason": "가장 자연스러운 답은 '2개'지만, 같은 정의(서로 평행하고 합동인 두 다각형)에서 나오는 '합동', '다각형'도 '언제나 □이다'에 그대로 들어간다. 답의 종류(개수인지 성질인지)만 고정하면 풀리는 틀 문제여서 prior의 확정보다 한 단계 낮게 본다.",
      "proposal": "'각기둥의 밑면은 언제나 □개이다'로 단위를 남긴다.",
      "primaryReason": "학생문장: “각기둥의 밑면은 언제나 □이다.” — 밑면의 개수인지 모양·관계인지 지정하지 않았다. 2개라는 수량과 합동인 다각형이라는 설명이 모두 성립해 답 종류가 갈린다.",
      "primaryProposal": "밑면이 몇 개인지 묻는 문장 틀을 남긴다.",
      "initialAlternativeAnswers": [
        "합동인 다각형"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "개 단위를 노출해 개수와 합동·다각형 같은 성질 답의 경쟁을 막았다."
  },
  {
    "id": "e6-1-2-1-xc14",
    "grade": "e6",
    "chapter": "1-2 각기둥과 각뿔",
    "student": "각기둥을 둘러싼 면은 모두 평평한 다각형이므로, 굽은 면이 있는 입체는 각기둥이 □.",
    "currentDefinition": "각기둥을 둘러싼 면은 모두 평평한 다각형이므로, 굽은 면이 있는 입체는 각기둥이 {아니다}.",
    "expected": [
      "아니다"
    ],
    "firstBlind": {
      "id": "e6-1-2-1-xc14",
      "answers": [
        "아니다"
      ],
      "alternativeAnswers": [
        "될 수 없다"
      ],
      "reason": "각기둥의 모든 면은 다각형이므로 굽은 면이 있으면 각기둥이 아님(예: 원기둥). 유일."
    },
    "originalFinding": {
      "id": "e6-1-2-1-xc14",
      "grade": "e6",
      "section": "초6::1-2 각기둥과 각뿔::1-2-1 각기둥 알아보기와 각기둥의 밑면과 옆면",
      "sourceHash": "474c06e443fb82596b81137fb6ac3eda9af447f7a16209d8182a6f32142943ac",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "둘러싼 면 가운데 굽은 면이 있으면 □.",
      "expected": [
        "각기둥이 아니다"
      ],
      "reason": "결론절 전체가 빈칸이고 대단원이 '각기둥과 각뿔'이라, '각기둥이 아니다', '각뿔이 아니다', '각기둥도 각뿔도 아니다'가 모두 참이면서 자연스럽다. 어느 분류 판단을 써야 하는지 문장에서 정해지지 않는다.",
      "proposal": "'둘러싼 면 가운데 굽은 면이 있는 입체도형은 각기둥이 □'처럼 판단 대상을 남긴다.",
      "primaryReason": "학생문장: “둘러싼 면 가운데 굽은 면이 있으면 □.” — 굽은 면이 있는 입체를 어느 종류와 구별할지 제시하지 않았다. 각기둥이 아니라는 답과 각뿔이 아니라는 답은 서로 다른 분류 판단이고 모두 맞는다.",
      "primaryProposal": "각기둥 여부를 판단하는 문항임을 본문에 명시한다.",
      "initialAlternativeAnswers": [
        "각뿔이 아니다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "각기둥 분류 여부를 묻는다고 명시하고 평평한 면이라는 이유를 남겼다. 각뿔이라는 다른 대상의 판정을 답하지 않는다."
  },
  {
    "id": "e6-1-5-2-xc19",
    "grade": "e6",
    "chapter": "1-5 여러 가지 그래프",
    "student": "전체 사람 수가 일정할 때 한 사람은 전체를 전체 사람 수만큼 □ 나눈 한 몫이다. 각 사람의 몫이 같으므로 한 항목의 사람 수가 몇 배가 되면 그 항목의 백분율도 같은 배가 된다.",
    "currentDefinition": "전체 사람 수가 일정할 때 한 사람은 전체를 전체 사람 수만큼 {똑같이} 나눈 한 몫이다. 각 사람의 몫이 같으므로 한 항목의 사람 수가 몇 배가 되면 그 항목의 백분율도 같은 배가 된다.",
    "expected": [
      "똑같이"
    ],
    "firstBlind": {
      "id": "e6-1-5-2-xc19",
      "answers": [
        "똑같이"
      ],
      "alternativeAnswers": [
        "전체 사람 수로",
        "사람 수만큼",
        "전체 사람 수만큼 똑같이"
      ],
      "reason": "'전체를 똑같이 나눈 한 몫'과 '전체를 전체 사람 수로 나눈 한 몫'이 모두 참이고 자연스러워 답의 종류(방법인지 나누는 수인지)가 정해지지 않음. 뒤 문장 '몇 배이면 백분율도 그만큼 커진다'는 '같은 배가 된다'로 써야 덧셈적 증가로 오독되지 않음."
    },
    "originalFinding": {
      "id": "e6-1-5-2-xc19",
      "grade": "e6",
      "section": "초6::1-5 여러 가지 그래프::1-5-2 띠그래프로 나타내기",
      "sourceHash": "bed6806c20edb3936fb417bfae433e9264bdb551099fc9287150d48bc802e2b2",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "missing-referent",
      "student": "전체 사람 수를 기준으로 하면 한 사람은 전체를 □ 나눈 한 몫이다. 각 사람의 몫이 같으므로 사람 수가 몇 배이면 백분율도 그만큼 커진다.",
      "expected": [
        "사람 수만큼 똑같이"
      ],
      "reason": "빈칸 자체는 '전체 사람 수만큼 똑같이'로 정해진다. 다만 둘째 문장의 '사람 수'가 전체 인원이 아니라 항목의 인원을 뜻해 같은 낱말의 지시 대상이 바뀐다.",
      "proposal": "빈칸은 유지하고 둘째 문장을 '한 항목의 사람 수가 몇 배이면 그 항목의 백분율도'로 고친다.",
      "primaryReason": "학생문장: “전체 사람 수를 기준으로 하면 한 사람은 전체를 □ 나눈 한 몫이다. 각 사람의 몫이 같으므로 사람 수가 몇 배이면 백분율도 그만큼 커진다.” — 앞의 '사람 수'는 전체 인원을 뜻하지만 뒤의 '사람 수가 몇 배'는 고정된 전체 안에서 항목 인원을 뜻해야 결론이 성립한다. 동일한 표현의 지시 대상이 바뀌어 전체 인원이 늘면 백분율도 늘어난다는 뜻으로 읽힐 수 있다.",
      "primaryProposal": "전체 인원은 고정하고 한 항목의 인원만 늘리는 경우임을 명시한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": "전체 10명 중 2명과 전체 20명 중 4명은 사람 수가 두 배여도 백분율은 모두 20%이다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "나누는 수를 전체 사람 수로 고정하고 같은 크기로 나누는 성질만 묻는다. 전체 인원과 항목 인원을 구별하고 배 관계를 명시했다."
  },
  {
    "id": "e6-2-2-3-xc25",
    "grade": "e6",
    "chapter": "2-2 소수의 나눗셈",
    "student": "같은 자연수를 $0$보다 크고 $1$보다 작은 소수로 나눌 때, 나누는 소수가 $1$에 가까워질수록 몫은 나누어지는 수보다 크면서 그 수에 □.",
    "currentDefinition": "같은 자연수를 $0$보다 크고 $1$보다 작은 소수로 나눌 때, 나누는 소수가 $1$에 가까워질수록 몫은 나누어지는 수보다 크면서 그 수에 {가까워진다}.",
    "expected": [
      "가까워진다"
    ],
    "firstBlind": {
      "id": "e6-2-2-3-xc25",
      "answers": [
        "가까워진다"
      ],
      "alternativeAnswers": [
        "점점 가까워진다",
        "가까운 값이 된다"
      ],
      "reason": "예: 6÷0.5=12, 6÷0.8=7.5, 6÷0.9≈6.67로 6보다 크면서 6에 가까워짐. 유일. 앞의 '가까워질수록'이 같은 어휘라 약한 답 노출."
    },
    "originalFinding": {
      "id": "e6-2-2-3-xc25",
      "grade": "e6",
      "section": "초6::2-2 소수의 나눗셈::2-2-3 (자연수)÷(소수) 알아보기",
      "sourceHash": "3cbae70fda202763f36d85dd86f76ddc021f39d241136901554d52786159062e",
      "status": "confirmed",
      "initialStatus": null,
      "category": "hidden-condition",
      "student": "같은 자연수를 $0$과 $1$ 사이의 소수로 나눌 때, 나누는 소수가 □ 몫은 나누어지는 수보다 크면서 □.",
      "expected": [
        "$1$에 가까울수록",
        "그 수에 가까워진다"
      ],
      "reason": "조건과 결론이 모두 빈칸이라 '1에 가까울수록/그 수에 가까워진다' 외에 '작을수록(0에 가까울수록)/더 커진다', '클수록/작아진다'도 수학적으로 옳은 조합이다. 어느 방향의 변화를 서술해야 하는지 문장에서 정해지지 않는다.",
      "proposal": "조건을 드러내 '나누는 소수가 1에 가까울수록 몫은 나누어지는 수보다 크면서 □'로 빈칸을 하나만 남긴다.",
      "primaryReason": null,
      "primaryProposal": null,
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": "10을 0.5로 나누면 20, 0.25로 나누면 40이다. 작을수록 / 더 커진다도 참이므로 1에 가까워지는 경우를 특정할 단서가 필요하다.",
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6"
    },
    "authorReason": "0·1을 제외하고 변화 방향을 1에 가까워짐으로 고정해 작아질수록/커진다는 다른 참인 조합을 막았다."
  },
  {
    "id": "e5-2-1-6-c1",
    "grade": "e5",
    "chapter": "2-1 수의 범위와 어림하기",
    "student": "반올림할 때 남길 자리 바로 아래 숫자가 $5$ 이상이면 □, $5$ 미만이면 □으로 어림한다.",
    "currentDefinition": "반올림할 때 남길 자리 바로 아래 숫자가 $5$ 이상이면 {올림}, $5$ 미만이면 {버림}으로 어림한다.",
    "expected": [
      "올림",
      "버림"
    ],
    "firstBlind": {
      "id": "e5-2-1-6-c1",
      "answers": [
        "올림",
        "버림"
      ],
      "alternativeAnswers": [
        "올리고 / 버림",
        "올림으로 / 버림"
      ],
      "reason": "순서와 종류가 분명함. 5 이상(5,6,7,8,9)은 올림, 5 미만(0~4)은 버림으로 정확. 둘째 빈칸은 조사 '으로'에 맞아 '버림'으로 고정."
    },
    "originalFinding": {
      "id": "e5-2-1-6-c1",
      "grade": "e5",
      "section": "초5::2-1 수의 범위와 어림하기::2-1-6 반올림 알아보기와 어림의 활용",
      "sourceHash": "0dce3754b828077e7ef09b1a55a71f11cf12e975eaf6ec6322ab461f87391f83",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "남길 자리 바로 아래 숫자가 □, □으로 어림한다.",
      "expected": [
        "$5$ 이상이면 올림",
        "$5$ 미만이면 버림"
      ],
      "reason": "'남길 자리 바로 아래 숫자'와 어림하기 단원 맥락으로 반올림 정의임을 알아볼 수 있고 답도 사실상 하나다. 다만 용어가 없고 조건과 처리가 한 빈칸에 묶여 있어 응답 틀이 거칠다.",
      "proposal": "문두에 '반올림은'을 넣고 '□ 이상이면 올림, □ 미만이면 버림'처럼 기준 수만 묻는 틀을 검토한다.",
      "primaryReason": "학생문장: “남길 자리 바로 아래 숫자가 □, □으로 어림한다.” — 반올림이라는 대상이 학생문장에서 사라졌고 판단 기준과 처리 절차가 함께 빈칸이다. 숫자를 기준으로 어느 어림 방법을 정하는 과제인지 알 수 없다.",
      "primaryProposal": "반올림임을 명시하고 5를 기준으로 한 조건이나 처리 중 한 부분만 묻는다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "반올림이라는 방법과 5 기준을 남기고 긴 조건 답에서 처리 방법만 회상하게 했다."
  },
  {
    "id": "e5-2-3-4-c1",
    "grade": "e5",
    "chapter": "2-3 합동과 대칭",
    "student": "점대칭도형은 한 점을 중심으로 반 바퀴 돌렸을 때 처음 도형과 완전히 □ 도형이다.",
    "currentDefinition": "점대칭도형은 한 점을 중심으로 반 바퀴 돌렸을 때 처음 도형과 완전히 {겹치는} 도형이다.",
    "expected": [
      "겹치는"
    ],
    "firstBlind": {
      "id": "e5-2-3-4-c1",
      "answers": [
        "180°"
      ],
      "alternativeAnswers": [
        "180도",
        "반 바퀴"
      ],
      "reason": "기대 답은 180°(반 바퀴). '한 바퀴(360°)'를 넣으면 모든 도형에 대해 참이 되어 정의 구실은 못 하지만 문장 자체는 거짓이 아니므로, 숫자를 통째로 비우면 구분력이 약함. 용어 문제: '한 점 둘레로', '처음 놓인 자리를 빈틈없이 채우는'은 교과서의 '한 점을 중심으로', '처음 도형과 완전히 겹치는'과 달라 5학년 학생에게 낯섦."
    },
    "originalFinding": {
      "id": "e5-2-3-4-c1",
      "grade": "e5",
      "section": "초5::2-3 합동과 대칭::2-3-4 점대칭도형과 그 성질 알아보기",
      "sourceHash": "77ae3c9b45a0565e6e763c5e18a0477f7a709f4838108ad3654d4b757ca3ae99",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "한 점 둘레로 □ 돌렸을 때 처음 놓인 자리를 빈틈없이 채우는 도형이다.",
      "expected": [
        "반 바퀴"
      ],
      "reason": "합동과 대칭 단원에서 '한 점 둘레로 돌려 처음 자리를 채우는 도형'은 점대칭도형의 익숙한 정의이고 자연스러운 답은 반 바퀴(180°) 하나다. prior가 든 '한 바퀴'는 형식 논리상 참일 뿐 실제 학생의 답이 아니다.",
      "proposal": "유지(180° 동치 인정).",
      "primaryReason": "학생문장: “한 점 둘레로 □ 돌렸을 때 처음 놓인 자리를 빈틈없이 채우는 도형이다.” — 점대칭도형의 정의라는 주어가 없어서 회전각을 반 바퀴로 한정할 수 없다. 한 바퀴 회전은 모든 도형에서 성립하며 정사각형 등은 다른 회전각도 성립한다.",
      "primaryProposal": "점대칭도형을 정의한다는 이름을 문장에 남기고 회전량만 묻는다.",
      "initialAlternativeAnswers": [
        "한 바퀴",
        "두 바퀴"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "반 바퀴라는 조건을 본문에 남겨 한 바퀴라는 모든 도형에 참인 답을 배제하고 겹침 성질만 묻는다."
  },
  {
    "id": "e5-1-1-2-xc21",
    "grade": "e5",
    "chapter": "1-1 자연수의 혼합 계산",
    "student": "덧셈과 곱셈이 섞인 식에서 덧셈을 곱셈보다 먼저 하려면 덧셈 부분을 □로 묶어야 한다.",
    "currentDefinition": "덧셈과 곱셈이 섞인 식에서 덧셈을 곱셈보다 먼저 하려면 덧셈 부분을 {괄호}로 묶어야 한다.",
    "expected": [
      "괄호"
    ],
    "firstBlind": {
      "id": "e5-1-1-2-xc21",
      "answers": [
        "괄호"
      ],
      "alternativeAnswers": [
        "( )",
        "소괄호"
      ],
      "reason": "유일. 조사 '로'와 일치. 예: 2+3×4에서 덧셈을 먼저 하려면 (2+3)×4."
    },
    "originalFinding": {
      "id": "e5-1-1-2-xc21",
      "grade": "e5",
      "section": "초5::1-1 자연수의 혼합 계산::1-1-2 덧셈, 뺄셈, 곱셈(나눗셈)이 섞여 있는 식",
      "sourceHash": "3700fb9e344343d1ebce38531aba85b011aa06eca55c71a6fcce2ac1a81d18df",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "hidden-condition",
      "student": "□ 하려면 반드시 그 부분에 괄호를 써야 한다.",
      "expected": [
        "덧셈을 곱셈보다 먼저"
      ],
      "reason": "조건절 전체가 빈칸이어서 덧셈·곱셈 쌍을 특정할 단서가 없다. '뺄셈을 나눗셈보다 먼저', '덧셈·뺄셈을 곱셈·나눗셈보다 먼저'처럼 범위가 다른 답이 모두 성립한다.",
      "proposal": "'덧셈을 곱셈보다 □ 하려면'처럼 연산 쌍을 본문에 남긴다.",
      "primaryReason": "학생문장: “□ 하려면 반드시 그 부분에 괄호를 써야 한다.” — 괄호를 써서 무엇을 먼저 계산하려는지 전체가 빈칸이다. 덧셈을 곱셈보다 먼저 하는 경우뿐 아니라 뺄셈을 나눗셈보다 먼저 하는 경우도 성립하므로 목표 연산을 알 수 없다.",
      "primaryProposal": "먼저 계산할 연산과 뒤의 연산을 본문에 제시하고 필요한 표시를 묻는다.",
      "initialAlternativeAnswers": [
        "뺄셈을 나눗셈보다 먼저"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "연산 쌍과 먼저 할 연산을 노출하고 순서를 바꾸는 표지만 짧게 묻는다."
  },
  {
    "id": "e5-1-1-3-xc13",
    "grade": "e5",
    "chapter": "1-1 자연수의 혼합 계산",
    "student": "괄호 안이 덧셈이어도, 괄호가 있으면 괄호 안을 곱셈과 나눗셈보다 □ 계산한다.",
    "currentDefinition": "괄호 안이 덧셈이어도, 괄호가 있으면 괄호 안을 곱셈과 나눗셈보다 {먼저} 계산한다.",
    "expected": [
      "먼저"
    ],
    "firstBlind": {
      "id": "e5-1-1-3-xc13",
      "answers": [
        "먼저"
      ],
      "alternativeAnswers": [
        "앞서"
      ],
      "reason": "유일. 괄호 안을 가장 먼저 계산한다는 순서 규칙과 일치."
    },
    "originalFinding": {
      "id": "e5-1-1-3-xc13",
      "grade": "e5",
      "section": "초5::1-1 자연수의 혼합 계산::1-1-3 덧셈, 뺄셈, 곱셈, 나눗셈이 섞여 있는 식",
      "sourceHash": "020f79ef94562b25bfbdb8c95b44fbc9e77f010211ec97404c0ae7be0c85635a",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "hidden-condition",
      "student": "□ 괄호가 있으면 곱셈과 나눗셈보다 먼저 계산한다.",
      "expected": [
        "괄호 안이 덧셈이어도"
      ],
      "reason": "문두의 양보절 전체가 빈칸이라 무엇을 써야 하는지 종류부터 알 수 없다. 덧셈, 뺄셈, 혼합 등 서로 다른 내용이 모두 들어간다.",
      "proposal": "'괄호 안이 덧셈이어도 괄호가 있으면 □보다 먼저 계산한다'처럼 빈칸을 계산 순서 쪽으로 옮긴다.",
      "primaryReason": "학생문장: “□ 괄호가 있으면 곱셈과 나눗셈보다 먼저 계산한다.” — 괄호 우선 규칙 앞의 양보 조건 전체를 가려 어떤 연산을 언급해야 하는지 알 수 없다. 괄호 안의 덧셈과 뺄셈 모두 성립하는 서로 다른 경우이다.",
      "primaryProposal": "괄호 안의 연산을 본문에 남기고 계산 순서를 묻는다.",
      "initialAlternativeAnswers": [
        "괄호 안이 뺄셈이어도",
        "괄호 안에 덧셈과 뺄셈이 섞여 있어도"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "양보절을 남겨 무엇을 먼저 하는지 정하고 순서 답만 짧게 묻는다."
  },
  {
    "id": "e5-1-2-3-xc23",
    "grade": "e5",
    "chapter": "1-2 약수와 배수",
    "student": "서로 다른 두 자연수에서 큰 수에서 작은 수를 뺀 □는 두 수의 공약수로 나누어떨어진다.",
    "currentDefinition": "서로 다른 두 자연수에서 큰 수에서 작은 수를 뺀 {차}는 두 수의 공약수로 나누어떨어진다.",
    "expected": [
      "차"
    ],
    "firstBlind": {
      "id": "e5-1-2-3-xc23",
      "answers": [
        "차"
      ],
      "alternativeAnswers": [
        "수",
        "값",
        "결과"
      ],
      "reason": "뜻은 한 가지(두 수의 차)이고 표현만 여럿. 예: 18과 12의 공약수 1, 2, 3, 6은 모두 차 6을 나누어떨어지게 함. 조건 부족: 두 수가 같으면 '큰 수/작은 수' 구분이 없고 차가 0이 되어 5학년 범위를 벗어남. '서로 다른 두 자연수'로 써야 함. 주어도 '공약수는 … 나누어떨어지게 한다'보다 '차는 공약수로 나누어떨어진다'가 자연스러움."
    },
    "originalFinding": {
      "id": "e5-1-2-3-xc23",
      "grade": "e5",
      "section": "초5::1-2 약수와 배수::1-2-3 공약수와 최대공약수",
      "sourceHash": "5d53c1e52ddb1a2a076d4cd58e301377ce66a9f93f0b0c05e869b18be4243181",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "두 수의 공약수는 두 수의 □도 나누어떨어지게 한다.",
      "expected": [
        "차"
      ],
      "reason": "공약수는 두 수의 합과 곱도 나누어떨어지게 하므로 차와 구별되는 참인 답이 여럿이다. 특히 '합'은 '차'만큼 자연스럽고 조사로도 구별되지 않는다.",
      "proposal": "'큰 수에서 작은 수를 뺀 □'처럼 뺄셈 단서를 남기거나 합·차를 함께 묻는다.",
      "primaryReason": "학생문장: “두 수의 공약수는 두 수의 □도 나누어떨어지게 한다.” — 공약수가 나누어떨어지게 하는 두 수의 연산 결과를 묻지만 어떤 연산인지 한정하지 않는다. 두 수의 합과 곱도 차와는 다른 값이면서 공약수로 나누어떨어진다.",
      "primaryProposal": "두 수를 빼서 얻는 값이라는 연산 단서를 남긴다.",
      "initialAlternativeAnswers": [
        "합",
        "곱"
      ],
      "initialCounterexample": "12와 18의 공약수 6은 차 6뿐 아니라 합 30과 곱 216도 나누어떨어지게 한다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "서로 다른 자연수로 한정해 큰 수·작은 수 구별과 양의 차를 보장하고 뺄셈 결과를 묻는다."
  },
  {
    "id": "e5-1-2-4-xc16",
    "grade": "e5",
    "chapter": "1-2 약수와 배수",
    "student": "두 자연수가 모두 어떤 자연수의 배수이면 두 수의 최대공약수도 그 자연수의 □이다.",
    "currentDefinition": "두 자연수가 모두 어떤 자연수의 배수이면 두 수의 최대공약수도 그 자연수의 {배수}이다.",
    "expected": [
      "배수"
    ],
    "firstBlind": {
      "id": "e5-1-2-4-xc16",
      "answers": [
        "배수"
      ],
      "alternativeAnswers": [],
      "reason": "답 노출: '어떤 자연수의 배수이면 … 최대공약수도 그 자연수의 □'에서 '~도'의 병렬 구조와 앞의 '배수'가 답을 그대로 줌. 내용은 참(공약수는 최대공약수의 약수). 예: 12와 18은 모두 3의 배수이고 최대공약수 6도 3의 배수. '약수'를 넣으면 거짓(6은 3의 약수가 아님)."
    },
    "originalFinding": {
      "id": "e5-1-2-4-xc16",
      "grade": "e5",
      "section": "초5::1-2 약수와 배수::1-2-4 최대공약수 구하는 방법",
      "sourceHash": "81843775ddee6dfc89bc218a8ad5d7e08514a94260b72e196090f46b9dcd386d",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "두 수가 모두 어떤 수의 배수이면 □도 그 어떤 수의 배수이다.",
      "expected": [
        "최대공약수"
      ],
      "reason": "최소공배수, 두 수의 합, 차도 모두 그 수의 배수여서 대상이 정해지지 않는다. 학생이 보는 문장에는 최대공약수를 가리키는 단서가 없다.",
      "proposal": "'두 수의 공약수 중 가장 큰 □도'처럼 대상 단서를 남긴다.",
      "primaryReason": "학생문장: “두 수가 모두 어떤 수의 배수이면 □도 그 어떤 수의 배수이다.” — 두 수로부터 만들 수 있는 어떤 수를 묻는지 단서가 없다. 최대공약수뿐 아니라 최소공배수와 두 수의 합도 공통 기준 수의 배수이므로 다른 수학 개념의 답이 성립한다.",
      "primaryProposal": "최대공약수의 성질을 묻는다는 대상 이름을 남긴다.",
      "initialAlternativeAnswers": [
        "최소공배수",
        "두 수의 합"
      ],
      "initialCounterexample": "12와 18이 6의 배수일 때 최대공약수 6, 최소공배수 36, 합 30은 모두 6의 배수이다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "최대공약수라는 대상을 남겨 최소공배수·합·차와의 경쟁을 막고 배수 관계만 묻는다."
  },
  {
    "id": "e5-1-2-5-xc5",
    "grade": "e5",
    "chapter": "1-2 약수와 배수",
    "student": "두 자연수를 □ 값은 언제나 두 수의 공배수이다.",
    "currentDefinition": "두 자연수를 {곱한} 값은 언제나 두 수의 공배수이다.",
    "expected": [
      "곱한"
    ],
    "firstBlind": {
      "id": "e5-1-2-5-xc5",
      "answers": [
        "곱한"
      ],
      "alternativeAnswers": [
        "서로 곱한",
        "곱하여 얻은"
      ],
      "reason": "두 수의 곱은 항상 공배수이므로 참이고 유일. 예: 4×6=24는 4와 6의 공배수. '더한'은 거짓(4+6=10)."
    },
    "originalFinding": {
      "id": "e5-1-2-5-xc5",
      "grade": "e5",
      "section": "초5::1-2 약수와 배수::1-2-5 공배수와 최소공배수",
      "sourceHash": "28fbc5e24cfb891755f61d9a30682c6c7998c3397257383052148601431c3436",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "□은 언제나 두 수의 공배수이다.",
      "expected": [
        "두 수를 곱한 값"
      ],
      "reason": "'언제나'와 조사 '은'을 보면 '두 수의 곱'이 가장 자연스러운 답이라 명확한 결함은 아니다. 다만 주어 전체가 빈칸이어서 '최소공배수의 배수' 같은 답도 나올 수 있다.",
      "proposal": "'두 수를 □ 값은 언제나 두 수의 공배수이다'처럼 연산만 묻는 틀을 검토한다.",
      "primaryReason": "학생문장: “□은 언제나 두 수의 공배수이다.” — 언제나 공배수가 되는 값을 묻지만 어떤 연산이나 대상을 답해야 할지 제한이 없다. 두 수의 곱과 최소공배수는 일반적으로 다른 값인데 둘 다 성립한다.",
      "primaryProposal": "두 수를 곱했을 때 얻는 값의 성질을 묻도록 연산을 명시한다.",
      "initialAlternativeAnswers": [
        "두 수의 최소공배수",
        "두 수를 곱한 값의 2배"
      ],
      "initialCounterexample": "4와 6의 곱 24와 최소공배수 12는 서로 다르지만 모두 공배수이다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "자연수 대상을 명시하고 주어 전체 대신 두 수로 하는 연산을 가려 최소공배수의 배수라는 대안을 막았다."
  },
  {
    "id": "e5-1-3-2-xc23",
    "grade": "e5",
    "chapter": "1-3 대응 관계",
    "student": "대응 관계를 기호를 사용한 식으로 나타내려면 두 양을 정하고, 표로 짝을 적고, 규칙을 찾아 기호로 □을 쓴다.",
    "currentDefinition": "대응 관계를 기호를 사용한 식으로 나타내려면 두 양을 정하고, 표로 짝을 적고, 규칙을 찾아 기호로 {식}을 쓴다.",
    "expected": [
      "식"
    ],
    "firstBlind": {
      "id": "e5-1-3-2-xc23",
      "answers": [
        "식으로 나타낸다"
      ],
      "alternativeAnswers": [
        "기호를 사용한 식으로 나타낸다",
        "말이나 식으로 나타낸다",
        "확인한다",
        "다음 값을 구한다"
      ],
      "reason": "서술부 전체가 빈칸이고 문장에 주어나 목적(대응 관계를 식으로 나타내는 순서)이 없어 답의 종류가 열려 있음. '규칙을 찾아 확인한다', '다음 값을 구한다'도 자연스러운 완성. '규칙을 찾아 □으로 나타낸다'처럼 좁혀야 함."
    },
    "originalFinding": {
      "id": "e5-1-3-2-xc23",
      "grade": "e5",
      "section": "초5::1-3 대응 관계::1-3-2 대응 관계를 식으로 나타내기",
      "sourceHash": "dc87667b832566a4b9f3cf1372c89c816b3389ea9c529130ed311bc6e46994ed",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "두 양을 정하고, 표로 짝을 적고, 규칙을 찾아 □.",
      "expected": [
        "기호로 식을 쓴다"
      ],
      "reason": "대응 관계 단원에서 '두 양 정하기 → 표 → 규칙' 다음 단계는 자연스럽게 '식으로 나타낸다' 하나로 모인다. 기대답과는 표현 차이일 뿐이다.",
      "proposal": "유지('식으로 나타낸다' 등 동의 표현 인정).",
      "primaryReason": "학생문장: “두 양을 정하고, 표로 짝을 적고, 규칙을 찾아 □.” — 규칙을 찾은 뒤 할 행동 전체가 빈칸이고 식으로 나타내는 과제라는 목표가 없다. 대응값을 구하거나 규칙을 말로 설명하는 것도 올바른 다음 행동이다.",
      "primaryProposal": "대응 관계를 식으로 나타내는 절차라는 목표를 명시하고 필요한 요소를 묻는다.",
      "initialAlternativeAnswers": [
        "다른 값에 적용한다",
        "말로 설명한다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "표와 규칙 다음의 목표를 식으로 명시하고 표현물의 이름만 묻게 해 확인·다음 값 구하기와의 경쟁을 막았다."
  },
  {
    "id": "e5-1-4-2-xc8",
    "grade": "e5",
    "chapter": "1-4 약분과 통분",
    "student": "분자가 $1$이고 분모가 자연수인 분수는 더 이상 □할 수 없어 기약분수이다.",
    "currentDefinition": "분자가 $1$이고 분모가 자연수인 분수는 더 이상 {약분}할 수 없어 기약분수이다.",
    "expected": [
      "약분"
    ],
    "firstBlind": {
      "id": "e5-1-4-2-xc8",
      "answers": [
        "기약분수"
      ],
      "alternativeAnswers": [
        "단위분수",
        "분수"
      ],
      "reason": "'분자가 1인 분수'는 단위분수의 정의이므로 '더 이상 약분할 수 없는 단위분수이다'도 참이고 자연스러움. 수식어 '더 이상 약분할 수 없는'은 기약분수의 정의라 그쪽으로 읽으면 답 노출이기도 함. 조건 문제: '분모가 자연수'는 분모 1(1/1)을 포함하므로 '분모가 1보다 큰 자연수'로 한정해야 함."
    },
    "originalFinding": {
      "id": "e5-1-4-2-xc8",
      "grade": "e5",
      "section": "초5::1-4 약분과 통분::1-4-2 분수를 간단하게 나타내기",
      "sourceHash": "cf23f613e1408162763f0a477f94be72387d05260b93ce018f29848e66d65e31",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "분자가 $1$인 분수 $\\frac{1}{7}$ 등은 모두 □이다.",
      "expected": [
        "기약분수"
      ],
      "reason": "분자가 1인 분수는 정의 그대로 '단위분수'이므로 기약분수와 다른 개념명이 똑같이 자연스럽게 들어간다. 문장에는 약분 관점이라는 단서가 없다.",
      "proposal": "'더 이상 약분할 수 없으므로 모두 □이다'처럼 약분 단서를 남긴다.",
      "primaryReason": "학생문장: “분자가 $1$인 분수 $\\frac{1}{7}$ 등은 모두 □이다.” — 분자가 1이라는 조건은 단위분수의 정의이며 동시에 기약분수임도 보장한다. 학생문장에 약분 가능 여부나 분류 기준이 없어 서로 다른 개념명 둘 다 답이 된다.",
      "primaryProposal": "더 약분할 수 있는지를 묻는 단서를 남겨 기약분수 개념을 겨냥한다.",
      "initialAlternativeAnswers": [
        "단위분수"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "약분이라는 행위만 묻게 해 단위분수·분수라는 다른 참인 분류명과의 경쟁을 막았다. 분모 1도 분자와의 최대공약수가 1이므로 수학적으로 성립한다."
  },
  {
    "id": "e5-1-4-3-xc8",
    "grade": "e5",
    "chapter": "1-4 약분과 통분",
    "student": "분모가 같은 분수끼리는 통분할 필요가 □.",
    "currentDefinition": "분모가 같은 분수끼리는 통분할 필요가 {없다}.",
    "expected": [
      "없다"
    ],
    "firstBlind": {
      "id": "e5-1-4-3-xc8",
      "answers": [
        "없다"
      ],
      "alternativeAnswers": [],
      "reason": "유일. 분모가 이미 같으면 통분 없이 분자끼리 비교·계산할 수 있음."
    },
    "originalFinding": {
      "id": "e5-1-4-3-xc8",
      "grade": "e5",
      "section": "초5::1-4 약분과 통분::1-4-3 통분",
      "sourceHash": "ae136b5e32d8c4714320ece74c4f20d1c9ec56bcb039c0d52df8dc19d4c1dd82",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "분모가 같은 분수끼리는 □.",
      "expected": [
        "통분할 필요가 없다"
      ],
      "reason": "서술어 전체가 빈칸이어서 통분 필요 여부를 묻는지 알 수 없다. '분자의 크기로 비교한다', '분자끼리 더한다'도 모두 표준적인 답이다.",
      "proposal": "'분모가 같은 분수끼리는 □할 필요가 없다'로 틀을 좁힌다.",
      "primaryReason": "학생문장: “분모가 같은 분수끼리는 □.” — 분모가 같은 분수에 관해 어떤 성질이나 계산을 답해야 하는지 서술 전체가 비어 있다. 통분 필요 여부와 크기 비교 방법은 서로 다른 내용인데 모두 자연스럽게 성립한다.",
      "primaryProposal": "분모를 맞추는 과정이 필요한지를 묻는 문장 틀을 남긴다.",
      "initialAlternativeAnswers": [
        "분자만 비교해 크기를 비교할 수 있다",
        "분자끼리 더해 덧셈할 수 있다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "통분 필요 여부라는 질문을 남겨 비교·덧셈 방법을 답하는 해석을 막았다."
  },
  {
    "id": "e5-1-4-4-xc24",
    "grade": "e5",
    "chapter": "1-4 약분과 통분",
    "student": "두 분수가 절반보다 큰지 작은지 확인할 때는 두 분수를 기준 수 □과도 견주어 본다.",
    "currentDefinition": "두 분수가 절반보다 큰지 작은지 확인할 때는 두 분수를 기준 수 {$\\frac{1}{2}$}과도 견주어 본다.",
    "expected": [
      "$\\frac{1}{2}$"
    ],
    "firstBlind": {
      "id": "e5-1-4-4-xc24",
      "answers": [
        "1/2"
      ],
      "alternativeAnswers": [
        "2분의 1",
        "절반",
        "0.5"
      ],
      "reason": "'절반'이 곧 1/2이므로 문장 안에서 답이 사실상 노출됨. 조사 '과'는 '2분의 1과'에 맞고 '0.5(와)'는 맞지 않지만 수학적으로는 동치. '절반보다 큰지 확인하려면 절반과 견준다'는 동어반복."
    },
    "originalFinding": {
      "id": "e5-1-4-4-xc24",
      "grade": "e5",
      "section": "초5::1-4 약분과 통분::1-4-4 분수의 크기 비교",
      "sourceHash": "ce279a7b33bc88e6e7045264ae2edf24eaae931dea909334fbcc18e051639e3b",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "open-answer",
      "student": "답을 확인할 때는 두 분수를 □ 같은 기준 수와도 견주어 본다.",
      "expected": [
        "$\\frac{1}{2}$이나 $1$"
      ],
      "reason": "'같은 기준 수'가 예시를 요구하므로 답의 종류는 분명하고 1/2과 1이 가장 자연스럽다. 다만 예시형이라 기준 수의 개수와 채점 범위가 열려 있다.",
      "proposal": "1/2 또는 1 중 하나만 써도 인정하도록 채점 기준을 정하거나 '$\\frac{1}{2}$이나 □'로 한 개만 묻는다.",
      "primaryReason": "학생문장: “답을 확인할 때는 두 분수를 □ 같은 기준 수와도 견주어 본다.” — 비교할 두 분수의 값이 없고 기준 수의 개수나 종류도 정하지 않았다. 1/2와 1 이외의 기준 수도 비교에 사용할 수 있어 특정 기준을 선택할 단서가 없다. 다만 '같은 기준 수'는 예시를 요구하는 표현이므로 여러 기준 수를 허용하는 문항일 가능성이 있어 보류한다.",
      "primaryProposal": "구체적인 비교 대상과 적절한 기준 수를 고를 근거를 제공한다.",
      "initialAlternativeAnswers": [
        "1/4이나 3/4"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "기준을 절반으로 지정해 1/2·1·다른 예시들의 자유 선택을 없앴다. 기준 수로 비교하는 개념을 유지한다."
  },
  {
    "id": "e5-1-4-5-xc12",
    "grade": "e5",
    "chapter": "1-4 약분과 통분",
    "student": "소수를 분수로 바꾼 뒤 분모와 분자를 같은 공약수로 나누어 □하면 간단한 분수가 된다.",
    "currentDefinition": "소수를 분수로 바꾼 뒤 분모와 분자를 같은 공약수로 나누어 {약분}하면 간단한 분수가 된다.",
    "expected": [
      "약분"
    ],
    "firstBlind": {
      "id": "e5-1-4-5-xc12",
      "answers": [
        "약분"
      ],
      "alternativeAnswers": [],
      "reason": "'공약수로 나누어'가 약분의 정의라 유일하며 정의 수준의 답 노출은 허용 범위. 예: 0.6=6/10=3/5. '같은 공약수'는 군더더기이고, '간단한 분수'는 '기약분수'가 학년 용어(최대공약수가 아닌 공약수로 한 번 나누면 기약분수가 아닐 수 있음. 예: 0.48=48/100을 2로 나누면 24/50)."
    },
    "originalFinding": {
      "id": "e5-1-4-5-xc12",
      "grade": "e5",
      "section": "초5::1-4 약분과 통분::1-4-5 분수와 소수의 크기 비교",
      "sourceHash": "a215ff517a70a50fb5798ef23dfb12d363b434902196281026614796ab56d0f7",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "hidden-condition",
      "student": "□ 약분하면 간단한 분수가 된다.",
      "expected": [
        "소수를 분수로 바꾼 뒤"
      ],
      "reason": "약분 앞 단계 전체가 빈칸이고 소수 상황이라는 단서가 없다. '분수를 계산한 뒤', '분모와 분자를 공약수로 나누어' 등 다른 내용이 들어간다.",
      "proposal": "'소수를 □로 바꾼 뒤 약분하면'처럼 상황을 본문에 남긴다.",
      "primaryReason": "학생문장: “□ 약분하면 간단한 분수가 된다.” — 약분하기 전 단계 전체가 비어 있어 소수를 분수로 바꾸는 상황인지 알 수 없다. 분수의 계산이나 통분 뒤 약분하는 경우도 문장을 완성한다.",
      "primaryProposal": "소수를 분수로 바꾼 상황을 본문에 남기고 이어서 할 일을 묻는다.",
      "initialAlternativeAnswers": [
        "분수의 덧셈을 한 뒤",
        "통분한 분수를"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "소수 상황과 변환 순서를 남기고 절차 전체 대신 약분이라는 용어를 묻는다."
  },
  {
    "id": "e5-1-5-1-xc3",
    "grade": "e5",
    "chapter": "1-5 분수의 덧셈과 뺄셈",
    "student": "분모가 다른 두 진분수를 더할 때 두 분모를 서로 □을 공통분모로 하여 통분해도 된다.",
    "currentDefinition": "분모가 다른 두 진분수를 더할 때 두 분모를 서로 {곱한 값}을 공통분모로 하여 통분해도 된다.",
    "expected": [
      "곱한 값"
    ],
    "firstBlind": {
      "id": "e5-1-5-1-xc3",
      "answers": [
        "곱한 값"
      ],
      "alternativeAnswers": [
        "곱한 것",
        "곱한 수"
      ],
      "reason": "'두 분모를 서로 □을' 구조라 곱으로 정해짐(최소공배수는 이 구문에 들어가지 못함). 예: 1/4+1/6은 24로 통분해도 됨. 조사 '을'에는 '값', '것'이 맞고 '수(를)'는 조사가 어긋나지만 뜻은 같음."
    },
    "originalFinding": {
      "id": "e5-1-5-1-xc3",
      "grade": "e5",
      "section": "초5::1-5 분수의 덧셈과 뺄셈::1-5-1 진분수의 덧셈",
      "sourceHash": "3611a554246c6406babec13c067be34ee666cb9a682e93bc7d05fdbe53cfcdf4",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "□으로 통분하면 어떤 두 진분수든 더할 수 있다.",
      "expected": [
        "두 분모의 곱"
      ],
      "reason": "교과서가 나란히 가르치는 '두 분모의 최소공배수'도 어떤 두 진분수에나 쓸 수 있는 다른 답이다. 둘을 가르는 단서는 조사 '으로'의 받침뿐이라 답을 정하기에 부족하다.",
      "proposal": "'두 분모를 □ 값으로 통분하면'처럼 곱셈 단서를 남기거나 최소공배수도 정답으로 인정한다.",
      "primaryReason": "학생문장: “□으로 통분하면 어떤 두 진분수든 더할 수 있다.” — 공통분모로 어떤 값을 선택하는지 묻지만 곱을 써야 한다는 제한이 없다. 두 분모의 최소공배수도 모든 두 진분수의 통분에 쓸 수 있으며 곱과는 일반적으로 다른 값이다.",
      "primaryProposal": "분모의 곱을 사용하는 방법임을 명시하거나 유효한 공통분모를 모두 허용하는 과제로 바꾼다.",
      "initialAlternativeAnswers": [
        "두 분모의 최소공배수"
      ],
      "initialCounterexample": "분모가 4와 6이면 곱 24와 최소공배수 12 모두 공통분모로 쓸 수 있다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "분모끼리 하는 연산을 남겨 최소공배수와 곱 사이의 모호함을 해소했다. 곱으로 통분 가능한 성질을 유지한다."
  }
]
