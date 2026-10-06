독립 최종 원고 검토다. 모든 항목의 현재 after 원문, 완성 정의, 실제 학생 문장, 기대 답, 이전 가림 풀이, 원 감사 지적을 함께 제공한다. 답의 맞음은 문자열이 아니라 의미로 판단하라. 동의어·동치식·같은 수량의 표기 차이는 허용하고 별개의 참인 완성, 순서를 바꿔도 다른 뜻으로 참인 답, 조건·대상·연산이 사라진 빈칸, 0·1·부호·정의역·포함 관계, 정답 글자 직접 반복, 긴 절 전체 가리기, 수식과 학년 용어를 검토하라. 기대 답이나 가림 검토자에게 맞추지 말고 유효한 반례가 있으면 반드시 revise로 판정하라. 다음 제약을 확인하라: 같은 의미 표현은 허용하며 추론을 위한 조건·수치 노출 자체는 결함이 아니다; 이유 설명은 완성 정의에 보존해야 한다; 기존 은행의 학년·개념·기존 용어를 유지하는 교정이며 교육과정 전수 검증은 이번 범위가 아니다; 계급값 등 새 용어는 도입하지 않았다. 기존 반례·최댓값·최솟값·다문자 인수분해 용어의 수록 학년은 이번에 변경하지 않는다. 도구 없이 각 항목을 읽고 JSON {"cases":[{"id":"...","verdict":"pass" 또는 "revise","reason":"...","proposal":"수정 필요 시 구체적 after 제안"}]}만 반환하라.

{
  "cases": [
    {
      "id": "m3-06-02-c6",
      "grade": "m3",
      "chapter": "6. 원의 성질",
      "after": "원 밖의 점 $P$에서 그은 두 접선의 접점을 $A$, $B$, 중심을 $O$라 하자. $OA$, $OB$, $OP$를 이으면 생기는 두 직각삼각형은 {빗변} $OP$가 공통이고 {반지름} $OA$, $OB$의 길이가 같아 $\\mathrm{RHS}$ 합동이다. 따라서 두 접선의 길이가 같다.",
      "completedDefinition": "원 밖의 점 $P$에서 그은 두 접선의 접점을 $A$, $B$, 중심을 $O$라 하자. $OA$, $OB$, $OP$를 이으면 생기는 두 직각삼각형은 빗변 $OP$가 공통이고 반지름 $OA$, $OB$의 길이가 같아 $\\mathrm{RHS}$ 합동이다. 따라서 두 접선의 길이가 같다.",
      "studentSentence": "원 밖의 점 $P$에서 그은 두 접선의 접점을 $A$, $B$, 중심을 $O$라 하자. $OA$, $OB$, $OP$를 이으면 생기는 두 직각삼각형은 □ $OP$가 공통이고 □ $OA$, $OB$의 길이가 같아 $\\mathrm{RHS}$ 합동이다. 따라서 두 접선의 길이가 같다.",
      "expectedAnswers": [
        "빗변",
        "반지름"
      ],
      "blindResponse": {
        "id": "m3-06-02-c6",
        "answers": [
          "빗변",
          "반지름"
        ],
        "alternativeAnswers": [],
        "reason": "RHS 합동과 '공통', '길이가 같아'라는 단서로 빗변·반지름이 정해진다. '변', '선분'도 참이지만 같은 대상을 덜 구체적으로 부른 것일 뿐이다. 수학적으로 정확하다. 다만 선분 표기($\\overline{OA}$)와 '접선의 길이'가 $\\overline{PA}$, $\\overline{PB}$임을 밝히면 더 엄밀하다."
      },
      "originalFinding": {
        "id": "m3-06-02-c6",
        "grade": "m3",
        "section": "중3::6. 원의 성질::원의 접선",
        "sourceHash": "94c20c4126543b01b92d17aa1c3d3ccf8f23069b157bc99fd4e1d5b6d55582b9",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "원의 중심과 원 밖의 점을 이으면 직각삼각형 둘이 생기는데, □이 공통이고 □의 길이가 같아 $\\mathrm{RHS}$ 합동이기 때문이다.",
        "expected": [
          "빗변",
          "반지름"
        ],
        "reason": "RHS와 '□이 공통', '□의 길이가 같아'라는 틀이 빗변과 반지름을 사실상 정해 주므로 학생이 답을 정할 수는 있다. 다만 무엇의 까닭인지와 접점으로 그은 반지름이 본문에 없어 문장이 불완전하다.",
        "proposal": "'원 밖의 한 점에서 그은 두 접선의 길이가 같은 까닭은, 중심과 그 점, 중심과 두 접점을 이으면…'처럼 주장과 작도를 본문에 넣는다.",
        "primaryReason": "원 밖의 점에서 두 접선과 접점의 반지름을 그리는 작도가 빠져 있다. 중심과 외부 점만 잇는 것으로는 직각삼각형 두 개가 생기지 않으며 마지막 때문이다가 무엇을 증명하는지도 없다. C형에는 이 문항의 숨은 소제목이나 증명 그림이 실리지 않는다.",
        "primaryProposal": "두 접점 A,B 및 PA,PB,OA,OB,OP를 명시하고 두 삼각형의 합동 조건 또는 공통 빗변을 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "원과 외부 점 P, 중심 O와 선분 OP만 그리면 삼각형은 하나도 만들어지지 않는다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "두 접선의 길이 증명이라는 목표와 모든 보조선의 구성을 명시했다. 공통인 빗변 OP와 같은 반지름 OA·OB를 구분하여 빈칸 역할을 고정했다."
    },
    {
      "id": "m3-06-03-c6",
      "grade": "m3",
      "chapter": "6. 원의 성질",
      "after": "원주각이 같은 호에 대한 중심각의 절반임을 보일 때, 원주각의 꼭짓점을 지나는 지름을 긋고 중심과 호의 양 끝점을 잇는다. 한 변이 지름 위에 있으면 두 변이 반지름인 {이등변삼각형}의 외각 성질을 쓰고, 나머지는 두 원주각을 더하거나 빼서 보인다.",
      "completedDefinition": "원주각이 같은 호에 대한 중심각의 절반임을 보일 때, 원주각의 꼭짓점을 지나는 지름을 긋고 중심과 호의 양 끝점을 잇는다. 한 변이 지름 위에 있으면 두 변이 반지름인 이등변삼각형의 외각 성질을 쓰고, 나머지는 두 원주각을 더하거나 빼서 보인다.",
      "studentSentence": "원주각이 같은 호에 대한 중심각의 절반임을 보일 때, 원주각의 꼭짓점을 지나는 지름을 긋고 중심과 호의 양 끝점을 잇는다. 한 변이 지름 위에 있으면 두 변이 반지름인 □의 외각 성질을 쓰고, 나머지는 두 원주각을 더하거나 빼서 보인다.",
      "expectedAnswers": [
        "이등변삼각형"
      ],
      "blindResponse": {
        "id": "m3-06-03-c6",
        "answers": [
          "이등변삼각형"
        ],
        "alternativeAnswers": [],
        "reason": "'두 변이 반지름'이라는 단서로 유일하게 복원된다. 증명의 흐름도 정확하다."
      },
      "originalFinding": {
        "id": "m3-06-03-c6",
        "grade": "m3",
        "section": "중3::6. 원의 성질::원주각",
        "sourceHash": "0b09725af3df21ce2ff320a1153bc51c2f42abbe79a40a6771f300eca3a4046c",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "꼭짓점을 지나는 지름을 그으면, 한 변이 지름일 때는 □의 □으로 보이고, 나머지 경우는 그렇게 생기는 두 원주각을 □ 보인다.",
        "expected": [
          "이등변삼각형",
          "외각",
          "더하거나 빼서"
        ],
        "reason": "무엇을 보이는지(원주각이 중심각의 절반)와 어느 꼭짓점인지가 본문에 없다. 그 상태에서 '□의 □으로'라는 연속 빈칸과 서술 빈칸까지 세 곳을 채워야 해 빈칸의 역할을 정할 수 없다.",
        "proposal": "'원주각이 중심각의 절반임은, 원주각의 꼭짓점을 지나는 지름을 그으면…'처럼 명제를 본문에 넣고, 연속 빈칸 중 '이등변삼각형'은 본문에 준다.",
        "primaryReason": "무엇을 보이는 증명인지 진술하지 않고 보인다만 두 번 쓴다. 원주각 정리, 보조선, 이등변삼각형의 외각 관계가 학생에게 주어지지 않아 빈칸 셋의 역할을 결정하기 어렵다.",
        "primaryProposal": "원주각이 중심각의 절반임을 보이는 상황과 중심·원주각 꼭짓점·현 끝점을 제시하고 한 단계의 관계만 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "증명할 성질과 원주각의 꼭짓점을 명시했다. 반지름이 같은 삼각형과 외각 성질을 묻고 더하거나 빼는 절차 전체를 노출했다. 외각과 밑각이 모두 증명에 쓰인다는 반례를 반영하여 외각을 본문에 노출하고 삼각형 종류만 묻는다."
    },
    {
      "id": "m3-01-02-xc15",
      "grade": "m3",
      "chapter": "1. 실수와 그 계산",
      "after": "$1$과 $2$ 사이에 $\\sqrt{2}$, $\\sqrt{3}$이 있듯, 서로 다른 두 유리수 사이에도 분자와 분모가 정수인 분수로 나타낼 수 없는 {무리수}가 끼어 있다.",
      "completedDefinition": "$1$과 $2$ 사이에 $\\sqrt{2}$, $\\sqrt{3}$이 있듯, 서로 다른 두 유리수 사이에도 분자와 분모가 정수인 분수로 나타낼 수 없는 무리수가 끼어 있다.",
      "studentSentence": "$1$과 $2$ 사이에 $\\sqrt{2}$, $\\sqrt{3}$이 있듯, 서로 다른 두 유리수 사이에도 분자와 분모가 정수인 분수로 나타낼 수 없는 □가 끼어 있다.",
      "expectedAnswers": [
        "무리수"
      ],
      "blindResponse": {
        "id": "m3-01-02-xc15",
        "answers": [
          "무리수"
        ],
        "alternativeAnswers": [],
        "reason": "정의 설명이 붙어 있어 유일하게 복원된다. '수'나 '실수'를 넣어도 같은 대상을 가리키므로 다른 뜻의 대안은 아니다. 엄밀히는 '분모가 0이 아닌'이 빠져 있다."
      },
      "originalFinding": {
        "id": "m3-01-02-xc15",
        "grade": "m3",
        "section": "중3::1. 실수와 그 계산::무리수와 실수",
        "sourceHash": "92cf456a9cdc438771dc9b95f186f24165bf28af55a8880f669cb81a00576308",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "open-answer",
        "student": "$1$과 $2$ 사이에 $\\sqrt{2}$, $\\sqrt{3}$이 있듯, 서로 다른 두 □ 사이에도 □가 끼어 있다.",
        "expected": [
          "유리수",
          "무리수"
        ],
        "reason": "'서로 다른 두 유리수 사이의 무리수'와 '서로 다른 두 실수 사이의 무리수'는 둘 다 교과서에 실린 참인 성질이다. 예시 1과 2는 정수이기도 해서 첫 빈칸이 유리수, 실수, 정수 중 무엇인지 정해지지 않는다.",
        "proposal": "'서로 다른 두 유리수 사이에도'를 본문에 두고 '무리수'만 묻거나, 예시를 정수가 아닌 유리수로 바꾼다.",
        "primaryReason": "두 수 사이에 어떤 종류의 수가 존재하는지 설명하면서 양쪽 수의 종류도 함께 가렸다. 유리수 사이의 무리수 외에 실수 사이의 무리수나 정수 사이의 무리수로 채워도 옳아 기대하는 일반화의 범위가 정해지지 않는다.",
        "primaryProposal": "서로 다른 두 유리수 사이라는 조건을 본문에 두고 그 사이에 존재하는 수의 종류를 묻는다.",
        "initialAlternativeAnswers": [
          "실수 / 무리수",
          "정수 / 무리수"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "유리수 경계를 본문에 남기고 분수로 나타낼 수 없다는 조건으로 내부 수의 종류를 고정했다. 정수·실수 경계나 유리수·실수 내부 수 등 다른 참 답을 배제했다. 분수의 분자·분모를 정수로 명시하여 무리수의 정의를 정확히 했다."
    },
    {
      "id": "m3-01-02-xc18",
      "grade": "m3",
      "chapter": "1. 실수와 그 계산",
      "after": "두 실수의 차의 부호로 대소를 비교할 수 있다. 세 실수 $a$, $b$, $c$에 대해 $a<b$, $b<c$이면 $a$와 $c$의 대소 관계는 {$a<c$}이다.",
      "completedDefinition": "두 실수의 차의 부호로 대소를 비교할 수 있다. 세 실수 $a$, $b$, $c$에 대해 $a<b$, $b<c$이면 $a$와 $c$의 대소 관계는 $a<c$이다.",
      "studentSentence": "두 실수의 차의 부호로 대소를 비교할 수 있다. 세 실수 $a$, $b$, $c$에 대해 $a<b$, $b<c$이면 $a$와 $c$의 대소 관계는 □이다.",
      "expectedAnswers": [
        "$a<c$"
      ],
      "blindResponse": {
        "id": "m3-01-02-xc18",
        "answers": [
          "$a<c$"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 정해진다. $c>a$는 동치 표현이다. 수학적으로 정확하다."
      },
      "originalFinding": {
        "id": "m3-01-02-xc18",
        "grade": "m3",
        "section": "중3::1. 실수와 그 계산::무리수와 실수",
        "sourceHash": "38bef7f43851d9e64e01c7a504f07eaae4f11f184669ef5649fccac4e6d970dd",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "grammar-blank",
        "student": "세 실수는 두 개씩 □ 비교한 뒤 $a<b$, $b<c$이면 □로 이어 붙여 차례를 정한다.",
        "expected": [
          "빼서",
          "$a<c$"
        ],
        "reason": "'$a<b$, $b<c$이면 □로 이어 붙여'에 가장 자연스러운 답은 $a<b<c$인데 기대 답은 $a<c$이다. 첫 빈칸도 '빼서' 말고 다른 비교 방법이 들어갈 수 있어 한정되지 않는다.",
        "proposal": "둘째 빈칸의 기대 답을 $a<b<c$로 바꾸거나 문장을 '$a<b$, $b<c$이면 □이다'로 고친다. 첫 빈칸은 '두 수의 차의 □를 보고'처럼 차를 쓴다는 점을 드러낸다.",
        "primaryReason": "두 개씩 어떻게 비교하는지를 꾸미는 첫 빈칸에 빼서만 기대하지만 수직선에서·직접 등 다른 방법과 부사가 성립한다. 뒤의 부등식 추이관계는 빼기로 비교해야 한다는 조건을 주지 않는다.",
        "primaryProposal": "두 수의 차를 이용하는 방법임을 본문에 주고 차의 부호와 대소 관계를 묻는다.",
        "initialAlternativeAnswers": [
          "수직선에서",
          "직접"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "비교 방법은 노출하고 답의 대상을 a와 c의 두 수 관계로 고정했다. a<b<c라는 세 수의 정렬 답과 a<c라는 두 수의 비교를 구분했다."
    },
    {
      "id": "m3-01-03-xc11",
      "grade": "m3",
      "chapter": "1. 실수와 그 계산",
      "after": "$0$이 아닌 수로 나누는 것은 그 수의 {역수}를 곱하는 것으로 바꿀 수 있다. 그러면 곱셈의 {교환법칙}과 {결합법칙}에 따라 순서와 묶음을 바꿀 수 있다.",
      "completedDefinition": "$0$이 아닌 수로 나누는 것은 그 수의 역수를 곱하는 것으로 바꿀 수 있다. 그러면 곱셈의 교환법칙과 결합법칙에 따라 순서와 묶음을 바꿀 수 있다.",
      "studentSentence": "$0$이 아닌 수로 나누는 것은 그 수의 □를 곱하는 것으로 바꿀 수 있다. 그러면 곱셈의 □과 □에 따라 순서와 묶음을 바꿀 수 있다.",
      "expectedAnswers": [
        "역수",
        "교환법칙",
        "결합법칙"
      ],
      "blindResponse": {
        "id": "m3-01-03-xc11",
        "answers": [
          "역수",
          "교환법칙",
          "결합법칙"
        ],
        "alternativeAnswers": [],
        "reason": "'순서와 묶음'에 대응시키면 교환법칙, 결합법칙 순이다. 둘째와 셋째 □를 바꿔 써도 같은 내용이므로 순서 무관으로 채점해야 한다. 수학적으로 정확하다."
      },
      "originalFinding": {
        "id": "m3-01-03-xc11",
        "grade": "m3",
        "section": "중3::1. 실수와 그 계산::근호를 포함한 식의 계산",
        "sourceHash": "10f9fac953887e3d84291a61a1200bd816fd85f7595d6bbb15c8724bdb28486b",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "long-phrase",
        "student": "$0$이 아닌 수로 나누는 것을 그 수의 □으로 바꾸면 곱셈만 남아, 곱셈의 □에 따라 순서와 묶음을 바꿀 수 있다.",
        "expected": [
          "역수를 곱하는 것",
          "교환법칙과 결합법칙"
        ],
        "reason": "'나누는 것을 그 수의 □으로 바꾸면 곱셈만 남아'라는 대구와 조사 '으로'가 '역수를 곱하는 것'을 가리킨다. 둘째 빈칸은 '순서와 묶음'이 교환법칙과 결합법칙을 정한다.",
        "proposal": "유지. '역수의 곱셈', '역수의 곱'도 인정한다.",
        "primaryReason": "수의 개념인 역수보다 역수를 곱하는 것이라는 연산 절차 전체를 기대한다. 그 수의 □으로라는 문장 틀에서 학생이 용어만 쓰면 문법·의미가 달라져 요구 답의 형태가 길어진다.",
        "primaryProposal": "0 아닌 수로 나누는 것은 그 수의 □를 곱하는 것과 같다는 형태로 역수만 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "역수를 곱하는 절 전체를 가리지 않고 수의 이름 역수만 묻는다. 순서와 묶음에 대응하는 두 법칙을 분리하여 수학적 의미와 0 제외 조건을 유지했다."
    },
    {
      "id": "m3-01-03-xc14",
      "grade": "m3",
      "chapter": "1. 실수와 그 계산",
      "after": "분모의 근호 안에 제곱인 인수가 있으면 그 인수의 양의 제곱근을 {근호 밖}으로 꺼낸 뒤 유리화할 수 있다. 그러면 분모에 남은 근호 부분에 맞추어 곱할 수를 고른다.",
      "completedDefinition": "분모의 근호 안에 제곱인 인수가 있으면 그 인수의 양의 제곱근을 근호 밖으로 꺼낸 뒤 유리화할 수 있다. 그러면 분모에 남은 근호 부분에 맞추어 곱할 수를 고른다.",
      "studentSentence": "분모의 근호 안에 제곱인 인수가 있으면 그 인수의 양의 제곱근을 □으로 꺼낸 뒤 유리화할 수 있다. 그러면 분모에 남은 근호 부분에 맞추어 곱할 수를 고른다.",
      "expectedAnswers": [
        "근호 밖"
      ],
      "blindResponse": {
        "id": "m3-01-03-xc14",
        "answers": [
          "근호 밖"
        ],
        "alternativeAnswers": [],
        "reason": "조사 '으로'와 '꺼낸'에서 '근호 밖'으로 복원된다('밖'은 같은 답)."
      },
      "originalFinding": {
        "id": "m3-01-03-xc14",
        "grade": "m3",
        "section": "중3::1. 실수와 그 계산::근호를 포함한 식의 계산",
        "sourceHash": "75feac50e63219a6ed4070a3c07fbb601a5464af17e56b4883eb0b7b1dbc9843",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "long-phrase",
        "student": "분모의 근호 안에 제곱인 인수가 있으면 유리화하기 전에 □ — 그러면 분모에 □에 맞추어 곱할 수를 고를 수 있다.",
        "expected": [
          "먼저 꺼낼 수 있다",
          "남은 근호 부분"
        ],
        "reason": "내용은 추론할 수 있지만 첫 빈칸이 서술어 전체다. 둘째 빈칸은 '분모에 □에 맞추어'로 '남은'까지 가려져 틀이 어색하고 답의 길이를 가늠하기 어렵다.",
        "proposal": "'유리화하기 전에 그 인수를 근호 □으로 먼저 꺼낸다 — 그러면 분모에 남은 □에 맞추어'처럼 핵심어만 빈칸으로 둔다.",
        "primaryReason": "먼저 꺼낼 수 있다라는 완결 서술 전체가 가려져 있고, 뒤의 남은 근호 부분도 길게 표현해야 한다. 유리화 이전에 무엇을 어떻게 하는지 본문에 간결하게 제시할 수 있다.",
        "primaryProposal": "제곱인 인수를 근호 밖으로 꺼낸다는 절차를 주고 분모를 유리수로 만드는 목적이나 곱할 인수를 묻는다.",
        "initialAlternativeAnswers": [
          "근호 안을 간단히 한다"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "꺼내는 위치만 핵심어로 가리고 절차와 남은 근호 부분을 노출했다. 분모에 □에라는 어색한 조사 연결과 서술어 전체 빈칸을 없앴다. 꺼내는 제곱근은 양의 제곱근임을 명시했다."
    },
    {
      "id": "m3-01-03-xc19",
      "grade": "m3",
      "chapter": "1. 실수와 그 계산",
      "after": "$a,b\\ge0$에서 $\\sqrt{a}+\\sqrt{b}=\\sqrt{a+b}$가 항상 성립하는 것은 아님은 {반례} 하나로 보일 수 있다. 예를 들어 $\\sqrt{9}+\\sqrt{16}=7$이지만 $\\sqrt{9+16}=5$이다.",
      "completedDefinition": "$a,b\\ge0$에서 $\\sqrt{a}+\\sqrt{b}=\\sqrt{a+b}$가 항상 성립하는 것은 아님은 반례 하나로 보일 수 있다. 예를 들어 $\\sqrt{9}+\\sqrt{16}=7$이지만 $\\sqrt{9+16}=5$이다.",
      "studentSentence": "$a,b\\ge0$에서 $\\sqrt{a}+\\sqrt{b}=\\sqrt{a+b}$가 항상 성립하는 것은 아님은 □ 하나로 보일 수 있다. 예를 들어 $\\sqrt{9}+\\sqrt{16}=7$이지만 $\\sqrt{9+16}=5$이다.",
      "expectedAnswers": [
        "반례"
      ],
      "blindResponse": {
        "id": "m3-01-03-xc19",
        "answers": [
          "반례"
        ],
        "alternativeAnswers": [],
        "reason": "뜻으로는 '반례'로 복원된다. 다만 '반례'는 고등 명제 단원 용어로 중3 교육과정 용어가 아니라고 판단되므로, 기대 답이 '반례'라면 학년 용어 부적합이다. 중3 학생은 '성립하지 않는 예'나 '예'로 답할 가능성이 크며, 이는 같은 뜻이다."
      },
      "originalFinding": {
        "id": "m3-01-03-xc19",
        "grade": "m3",
        "section": "중3::1. 실수와 그 계산::근호를 포함한 식의 계산",
        "sourceHash": "f7b3ec1be1dffef3de44268e401c636b2b20752e0740b3e30cedcfd1933cbba4",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "long-phrase",
        "student": "$\\sqrt{a}+\\sqrt{b}=\\sqrt{a+b}$가 □은 □로 보일 수 있다 — $\\sqrt{9}+\\sqrt{16}=7$이지만 $\\sqrt{9+16}=5$이다.",
        "expected": [
          "항상 성립하는 식이 아님",
          "반례 하나"
        ],
        "reason": "뒤의 수치 예가 반례이므로 첫 빈칸은 '성립하지 않음', 둘째 빈칸은 '반례'로 모인다. 표현 차이는 동의 표현 범위다.",
        "proposal": "유지. '(일반적으로) 성립하지 않음', '거짓임', '반례'를 인정한다.",
        "primaryReason": "첫 빈칸이 항상 성립하는 식이 아님이라는 판정 문장 전체다. 뒤의 반례로 거짓임을 알 수는 있지만 학생에게 참·거짓 판단을 쓰라는 지시나 짧은 응답 틀이 없다.",
        "primaryProposal": "항상 성립하는지 여부를 짧게 묻고 이처럼 반증하는 예의 이름을 반례로 묻는다.",
        "initialAlternativeAnswers": [
          "일반적으로 성립하지 않음"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "항상 성립하지 않는다는 명제와 수치 이유를 드러내고 반례라는 짧은 수학적 핵심어만 묻는다. 절 전체 빈칸과 하나까지 포함한 불필요한 답 길이를 없앴다. 항상 성립하지 않음을 한 번도 성립하지 않음으로 읽지 않도록 다듬고 근호의 정의역을 명시했다. 반례라는 용어는 기준 은행의 기존 용어를 보존했다."
    },
    {
      "id": "m3-02-01-xc17",
      "grade": "m3",
      "chapter": "2. 다항식의 곱셈과 인수분해",
      "after": "서로 다른 양의 유리수 $a$, $b$에 대해 분모가 $\\sqrt{a}+\\sqrt{b}$인 분수를 유리화할 때 분자와 분모에 $\\sqrt{a}-\\sqrt{b}$를 곱한다. 가운데 두 항이 지워져 분모가 $0$이 아닌 {유리수} $a-b$가 된다. 같은 부호의 식을 곱하면 $2\\sqrt{ab}$ 항이 남는다.",
      "completedDefinition": "서로 다른 양의 유리수 $a$, $b$에 대해 분모가 $\\sqrt{a}+\\sqrt{b}$인 분수를 유리화할 때 분자와 분모에 $\\sqrt{a}-\\sqrt{b}$를 곱한다. 가운데 두 항이 지워져 분모가 $0$이 아닌 유리수 $a-b$가 된다. 같은 부호의 식을 곱하면 $2\\sqrt{ab}$ 항이 남는다.",
      "studentSentence": "서로 다른 양의 유리수 $a$, $b$에 대해 분모가 $\\sqrt{a}+\\sqrt{b}$인 분수를 유리화할 때 분자와 분모에 $\\sqrt{a}-\\sqrt{b}$를 곱한다. 가운데 두 항이 지워져 분모가 $0$이 아닌 □ $a-b$가 된다. 같은 부호의 식을 곱하면 $2\\sqrt{ab}$ 항이 남는다.",
      "expectedAnswers": [
        "유리수"
      ],
      "blindResponse": {
        "id": "m3-02-01-xc17",
        "answers": [
          "유리수"
        ],
        "alternativeAnswers": [],
        "reason": "$a$, $b$가 서로 다른 양의 유리수이므로 $a-b$는 $0$이 아닌 유리수이고, 유리화의 목적상 답은 유리수이다. '수', '실수'도 참이지만 덜 구체적인 표현이다. 수학적으로 정확하다."
      },
      "originalFinding": {
        "id": "m3-02-01-xc17",
        "grade": "m3",
        "section": "중3::2. 다항식의 곱셈과 인수분해::다항식의 곱셈",
        "sourceHash": "7a9fcaec45e54b96dd45702351bb3f699bc411d476161459cf572159d3d25ea7",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "서로 다른 두 양의 유리수 $a$, $b$에 대하여 $(\\sqrt{a}+\\sqrt{b})(\\sqrt{a}-\\sqrt{b})$에서는 가운데 두 항이 □ 분모가 □ $a-b$가 된다 — 자기 자신을 곱하면 $2\\sqrt{ab}$가 남는다.",
        "expected": [
          "지워져",
          "$0$이 아닌 유리수"
        ],
        "reason": "곱만 주어진 상태에서 갑자기 '분모가'라고 해 유리화 상황이 본문에 없다. 둘째 빈칸도 자연스러운 답은 '유리수'인데 기대 답은 '0이 아닌'까지 요구한다. 다만 빈칸의 종류는 추론할 수 있어 confirmed까지는 아니다.",
        "proposal": "'분모가 $\\sqrt{a}+\\sqrt{b}$인 분수의 분자와 분모에 $\\sqrt{a}-\\sqrt{b}$를 곱하면'으로 상황을 주고, '0이 아닌'은 본문에 두어 '유리수'만 묻는다.",
        "primaryReason": "주어진 것은 두 근호식의 곱뿐인데 갑자기 분모가 된다고 한다. 어떤 분수의 분모를 유리화하는 상황인지 생략되어 대수식의 전개와 유리화 적용이 혼재한다.",
        "primaryProposal": "분모가 두 근호의 합인 분수를 먼저 제시하거나 분모라는 말을 빼고 곱의 값 a-b의 성질을 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "분수의 유리화 상황과 서로 다른 양의 유리수 조건을 명시했다. 분모가 0이 되지 않는 이유는 노출하고 수의 종류 유리수만 묻는다."
    },
    {
      "id": "m3-02-01-xc20",
      "grade": "m3",
      "chapter": "2. 다항식의 곱셈과 인수분해",
      "after": "곱셈 공식은 문자 자리에 무리수를 넣어도 그대로 성립한다. 전개한 뒤 근호를 간단히 하고 근호 부분이 같은 항끼리 모으며, 정수의 비로 나타낼 수 있는 수인 {유리수} 항끼리는 따로 모은다.",
      "completedDefinition": "곱셈 공식은 문자 자리에 무리수를 넣어도 그대로 성립한다. 전개한 뒤 근호를 간단히 하고 근호 부분이 같은 항끼리 모으며, 정수의 비로 나타낼 수 있는 수인 유리수 항끼리는 따로 모은다.",
      "studentSentence": "곱셈 공식은 문자 자리에 무리수를 넣어도 그대로 성립한다. 전개한 뒤 근호를 간단히 하고 근호 부분이 같은 항끼리 모으며, 정수의 비로 나타낼 수 있는 수인 □ 항끼리는 따로 모은다.",
      "expectedAnswers": [
        "유리수"
      ],
      "blindResponse": {
        "id": "m3-02-01-xc20",
        "answers": [
          "유리수"
        ],
        "alternativeAnswers": [],
        "reason": "'정수의 비로 나타낼 수 있는 수'라는 설명으로 유일하게 복원된다. 엄밀히는 분모가 0이 아니라는 조건이 빠져 있다."
      },
      "originalFinding": {
        "id": "m3-02-01-xc20",
        "grade": "m3",
        "section": "중3::2. 다항식의 곱셈과 인수분해::다항식의 곱셈",
        "sourceHash": "39cc0e4190bafb13bc94fd44fc96964ec16108b1c206e648d8b84adb1ca87e5e",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "open-answer",
        "student": "곱셈 공식은 문자 자리에 □를 넣어도 그대로 성립한다 — 전개한 뒤 근호 안이 같은 항끼리, □끼리 따로 모은다.",
        "expected": [
          "무리수",
          "유리수"
        ],
        "reason": "'넣어도 그대로 성립한다'는 양보 표현과 뒤의 '근호 안이 같은 항끼리'가 첫 빈칸을 무리수(근호가 있는 수)로 모은다. 둘째 빈칸은 대비로 유리수가 정해진다.",
        "proposal": "유지. '근호를 포함한 수', '제곱근'을 인정한다.",
        "primaryReason": "곱셈 공식에 넣어도 성립하는 대상의 종류를 가리면서 무리수만 기대한다. 유리수·실수·식도 성립하며, 뒤의 근호 계산 문맥이 있어도 첫 빈칸의 범주가 명확히 제한되지 않는다.",
        "primaryProposal": "문자 자리에 근호로 나타낸 무리수를 넣는다는 상황은 본문에 주고 사용할 법칙이나 항의 묶음 기준을 묻는다.",
        "initialAlternativeAnswers": [
          "실수",
          "근호를 포함한 식"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "무리수·실수 등 첫 빈칸의 겹치는 수 종류를 노출했다. 근호 부분이 같은 항끼리 모으는 절차를 명확히 하고 유리수 항의 대비를 보존했다. 빈칸의 수 종류를 정수의 비로 나타낼 수 있는 수로 한정하여 항·수 등 포괄적 응답을 배제했다."
    },
    {
      "id": "m3-02-02-xc2",
      "grade": "m3",
      "chapter": "2. 다항식의 곱셈과 인수분해",
      "after": "인수분해한 결과는 다시 {전개}해 처음 식이 나오는지 보면 인수분해가 맞았는지 확인할 수 있다.",
      "completedDefinition": "인수분해한 결과는 다시 전개해 처음 식이 나오는지 보면 인수분해가 맞았는지 확인할 수 있다.",
      "studentSentence": "인수분해한 결과는 다시 □해 처음 식이 나오는지 보면 인수분해가 맞았는지 확인할 수 있다.",
      "expectedAnswers": [
        "전개"
      ],
      "blindResponse": {
        "id": "m3-02-02-xc2",
        "answers": [
          "전개"
        ],
        "alternativeAnswers": [],
        "reason": "유일하게 정해진다. 정확하다."
      },
      "originalFinding": {
        "id": "m3-02-02-xc2",
        "grade": "m3",
        "section": "중3::2. 다항식의 곱셈과 인수분해::인수분해",
        "sourceHash": "37a669e0241c55bed515d81794762a0a80d6adc21045a58886e3cea41155c967",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "grammar-blank",
        "student": "인수분해한 결과는 다시 □해 처음 식이 나오는지 보면 □ 확인할 수 있다.",
        "expected": [
          "전개",
          "맞았는지"
        ],
        "reason": "첫 빈칸 '전개'는 명확하다. 둘째 빈칸은 수학 내용이 아닌 연결 표현이어서 '맞았는지' 외에 '쉽게' 같은 부사도 문법상 들어가 변별력이 낮다. 대부분 '맞는지'로 모이므로 confirmed는 과하다.",
        "proposal": "둘째 빈칸을 없애고 '전개'만 묻거나, '처음 식이 나오는지'를 빈칸으로 바꾼다.",
        "primaryReason": "두 번째 빈칸은 맞았는지 외에 쉽게·스스로·정확하게 등을 넣어도 자연스러운 서술이 된다. 수학적 검산 원리는 전개라는 첫 답에서 이미 정해지고 뒤의 빈칸은 문장 연결 표현이다.",
        "primaryProposal": "전개하여 원래 식과 일치하는지 확인한다는 문장을 제시하고 검산 방법의 수학 용어만 빈칸으로 둔다.",
        "initialAlternativeAnswers": [
          "쉽게",
          "스스로"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "수학적 연산 전개만 묻고 맞았는지·쉽게 등 범용 서술어 빈칸을 없앴다. 역연산으로 결과를 확인한다는 설명은 유지했다."
    },
    {
      "id": "m3-02-02-xc4",
      "grade": "m3",
      "chapter": "2. 다항식의 곱셈과 인수분해",
      "after": "$x^2$의 계수가 $1$이고 상수항이 $0$이 아닌 정수인 이차식을 정수 계수로 인수분해하려면, {곱}이 상수항인 정수 쌍을 먼저 찾고 그 {합}이 $x$의 계수인지 살핀다.",
      "completedDefinition": "$x^2$의 계수가 $1$이고 상수항이 $0$이 아닌 정수인 이차식을 정수 계수로 인수분해하려면, 곱이 상수항인 정수 쌍을 먼저 찾고 그 합이 $x$의 계수인지 살핀다.",
      "studentSentence": "$x^2$의 계수가 $1$이고 상수항이 $0$이 아닌 정수인 이차식을 정수 계수로 인수분해하려면, □이 상수항인 정수 쌍을 먼저 찾고 그 □이 $x$의 계수인지 살핀다.",
      "expectedAnswers": [
        "곱",
        "합"
      ],
      "blindResponse": {
        "id": "m3-02-02-xc4",
        "answers": [
          "곱",
          "합"
        ],
        "alternativeAnswers": [],
        "reason": "순서를 바꾸면 거짓이 되므로 유일하다. 정확하다."
      },
      "originalFinding": {
        "id": "m3-02-02-xc4",
        "grade": "m3",
        "section": "중3::2. 다항식의 곱셈과 인수분해::인수분해",
        "sourceHash": "458e480ca40c82d11885790ff437e5d2abc3bf8be544827a8814cb03db7e84cb",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "$x^2$의 계수가 $1$인 이차식에서 상수항이 □일 때 정수인 두 수를 찾으려면, □이 상수항인 쌍을 먼저 찾고 그 □이 $x$의 계수인지 살핀다.",
        "expected": [
          "$0$이 아닌 정수",
          "곱",
          "합"
        ],
        "reason": "'상수항이 □일 때'가 조건의 종류를 알려 주지 않는다. 자연스러운 답은 '정수'나 '양수/음수'이고, '0이 아닌'을 붙여야 한다는 단서가 본문에 없다.",
        "proposal": "'상수항이 0이 아닌 정수일 때'를 본문에 두고 '곱', '합'만 묻는다.",
        "primaryReason": "인수분해할 상수항의 조건을 통째로 가렸다. 0 아닌 정수 외에 양의 정수·음의 정수 같은 충분 조건도 모두 참이며 가장 넓은 조건을 구하라는 요구가 없다.",
        "primaryProposal": "상수항이 0 아닌 정수인 경우임을 본문에 주고 두 수의 곱과 합의 역할을 묻는다.",
        "initialAlternativeAnswers": [
          "양의 정수",
          "음의 정수"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "상수항의 종류와 0 제외 조건은 본문에 남기고 곱·합의 역할만 묻는다. 정수 계수 인수분해의 탐색 조건과 순서를 보존했다."
    },
    {
      "id": "m3-02-03-xc8",
      "grade": "m3",
      "chapter": "2. 다항식의 곱셈과 인수분해",
      "after": "$x^2-x=x(x-1)$이므로 큰 수를 $x$에 대입할 때, 인수분해한 식을 쓰면 큰 수의 제곱을 직접 구하는 대신 $x$와 $x-1$의 {곱}으로 식의 값을 구할 수 있다.",
      "completedDefinition": "$x^2-x=x(x-1)$이므로 큰 수를 $x$에 대입할 때, 인수분해한 식을 쓰면 큰 수의 제곱을 직접 구하는 대신 $x$와 $x-1$의 곱으로 식의 값을 구할 수 있다.",
      "studentSentence": "$x^2-x=x(x-1)$이므로 큰 수를 $x$에 대입할 때, 인수분해한 식을 쓰면 큰 수의 제곱을 직접 구하는 대신 $x$와 $x-1$의 □으로 식의 값을 구할 수 있다.",
      "expectedAnswers": [
        "곱"
      ],
      "blindResponse": {
        "id": "m3-02-03-xc8",
        "answers": [
          "곱"
        ],
        "alternativeAnswers": [],
        "reason": "제시된 등식 $x^2-x=x(x-1)$에서 바로 정해진다. 정확하다."
      },
      "originalFinding": {
        "id": "m3-02-03-xc8",
        "grade": "m3",
        "section": "중3::2. 다항식의 곱셈과 인수분해::인수분해의 응용",
        "sourceHash": "5befa6c5014490dffe1542dc6761863524f0bc040813d9e4c741be879b1fa4da",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "open-answer",
        "student": "식의 값을 구할 때 인수분해한 뒤 대입하면 □을 구하지 않아도 되고, □끼리의 곱이 될 때가 많다.",
        "expected": [
          "큰 수의 제곱",
          "계산하기 쉬운 수"
        ],
        "reason": "구체적인 식이 없는 일반 조언문에서 '□을 구하지 않아도 되고'에 '큰 수의 제곱'을 특정할 근거가 없다. '각 항의 값', '거듭제곱', '복잡한 값' 등 서로 다른 답이 모두 성립하고, 둘째 빈칸도 자유 서술이다.",
        "proposal": "$51^2-49^2$ 같은 구체적 예를 본문에 주고 '인수분해하면 $(51+49)(51-49)$가 되어 □을 구하지 않아도 된다'처럼 범위를 좁히거나, 빈칸을 '인수분해'로 옮긴다.",
        "primaryReason": "어떤 식을 인수분해하는지 제시하지 않고 피할 수 있는 계산과 쉬워지는 수의 종류를 가렸다. 큰 수의 제곱 외에도 큰 수의 곱이나 각 항의 값 등 다른 대답이 성립한다.",
        "primaryProposal": "인수분해할 구체적인 식을 제시하고 계산 전후의 수 또는 사용할 공식 하나를 묻는다.",
        "initialAlternativeAnswers": [
          "큰 수의 곱 / 작은 수",
          "각 항의 값 / 간단한 수"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "구체적 식 x²-x를 명시하여 큰 수의 제곱을 피한다는 설명의 근거를 확보했다. 빈칸은 두 인수를 계산하는 연산 곱으로 고정하고 기존 예제의 요점을 유지했다."
    },
    {
      "id": "m3-02-03-xc14",
      "grade": "m3",
      "chapter": "2. 다항식의 곱셈과 인수분해",
      "after": "완전제곱식으로 인수분해한 식에 무리수를 대입했을 때 괄호 안의 유리수 부분이 지워지는 경우에는, 남은 근호 부분만 {제곱}하면 된다.",
      "completedDefinition": "완전제곱식으로 인수분해한 식에 무리수를 대입했을 때 괄호 안의 유리수 부분이 지워지는 경우에는, 남은 근호 부분만 제곱하면 된다.",
      "studentSentence": "완전제곱식으로 인수분해한 식에 무리수를 대입했을 때 괄호 안의 유리수 부분이 지워지는 경우에는, 남은 근호 부분만 □하면 된다.",
      "expectedAnswers": [
        "제곱"
      ],
      "blindResponse": {
        "id": "m3-02-03-xc14",
        "answers": [
          "제곱"
        ],
        "alternativeAnswers": [],
        "reason": "'완전제곱식'과 '괄호 안'이라는 단서로 제곱이 정해진다. '계산'도 문법상 들어가지만 덜 구체적인 표현이다. 정확하다."
      },
      "originalFinding": {
        "id": "m3-02-03-xc14",
        "grade": "m3",
        "section": "중3::2. 다항식의 곱셈과 인수분해::인수분해의 응용",
        "sourceHash": "d71cc38296917ff71df2b6694384c50709e742b7405db3d7424314ea7f675346",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "open-answer",
        "student": "무리수를 대입할 식이 □으로 인수분해되면, 괄호 안에서 □이 지워져 근호만 제곱하면 될 때가 있다.",
        "expected": [
          "완전제곱식",
          "유리수 부분"
        ],
        "reason": "'근호만 제곱하면 된다'가 첫 빈칸을 완전제곱식으로 정한다. 둘째 빈칸도 괄호 안에서 지워지는 것이 유리수(상수) 부분임을 가리킨다.",
        "proposal": "유지. '유리수', '정수 부분', '상수'를 인정한다. 예시($x=1+\\sqrt{3}$, $(x-1)^2$)를 덧붙이면 더 친절하다.",
        "primaryReason": "무리수를 대입할 구체적인 식 없이 어떤 부분이 지워지는 경우가 있다는 설명을 완성하게 한다. 완전제곱식에 어떤 수를 대입하는지에 따라 지워지는 부분이 달라진다.",
        "primaryProposal": "완전제곱식과 대입할 무리수를 제시하여 실제로 없어지는 항을 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "완전제곱식과 유리수 부분이 지워지는 조건을 노출했다. ~되면/~될 때가 있다에 임의의 참 식 종류를 넣는 대안을 없애고 남은 계산의 제곱을 묻는다."
    },
    {
      "id": "m3-02-03-xc18",
      "grade": "m3",
      "chapter": "2. 다항식의 곱셈과 인수분해",
      "after": "한 문자에 대해서는 일차식이고 다른 문자에 대해서는 이차식인 식을 인수분해할 때, 차수가 더 {낮은} 문자에 대하여 정리하면 공통인 인수를 찾기 쉬울 수 있다.",
      "completedDefinition": "한 문자에 대해서는 일차식이고 다른 문자에 대해서는 이차식인 식을 인수분해할 때, 차수가 더 낮은 문자에 대하여 정리하면 공통인 인수를 찾기 쉬울 수 있다.",
      "studentSentence": "한 문자에 대해서는 일차식이고 다른 문자에 대해서는 이차식인 식을 인수분해할 때, 차수가 더 □ 문자에 대하여 정리하면 공통인 인수를 찾기 쉬울 수 있다.",
      "expectedAnswers": [
        "낮은"
      ],
      "blindResponse": {
        "id": "m3-02-03-xc18",
        "answers": [
          "낮은"
        ],
        "alternativeAnswers": [],
        "reason": "답은 '낮은'이고 '작은'은 동의어이다. 다만 '차수가 낮은 문자에 대하여 정리'하는 방법은 보통 고1 인수분해에서 다루므로 중3 수준을 넘는지 확인해야 한다."
      },
      "originalFinding": {
        "id": "m3-02-03-xc18",
        "grade": "m3",
        "section": "중3::2. 다항식의 곱셈과 인수분해::인수분해의 응용",
        "sourceHash": "6d0856bd1fb91b4b92f0fce0ce5867711c2cd23d51d7774ca135c3df2db21fbd",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "open-answer",
        "student": "문자가 여러 개인 식은 □ 문자에 대하여 내림차순으로 정리하면 □가 잘 보인다.",
        "expected": [
          "차수가 가장 낮은",
          "공통인 인수"
        ],
        "reason": "'차수가 가장 낮은 문자에 대하여 내림차순으로 정리'는 널리 쓰이는 표준 요령이라 자연스러운 답이 하나다. prior의 '차수가 높은'은 대안이 아니라 오답이다.",
        "proposal": "유지. '차수가 낮은', '공통인수', '공통으로 들어 있는 인수'를 인정한다.",
        "primaryReason": "여러 문자 중 차수가 가장 낮은 문자를 고르는 요령을 기대하지만 구체적인 식이나 비교 기준이 없다. 학생은 어떤 기준으로 문자를 고르는지 설명해야 한다.",
        "primaryProposal": "해당 요령의 조건을 본문에 주거나 실제 식에서 정리할 문자를 선택하게 한다.",
        "initialAlternativeAnswers": [
          "차수가 높은",
          "계산하기 편한"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "비교할 두 차수를 드러내어 표준 요령의 낮은 차수라는 응답 범위를 좁혔다. 모든 다문자 식에서 인수가 반드시 보인다는 일반화를 피하고 조건부 요령으로 남겼다."
    },
    {
      "id": "m3-02-03-xc20",
      "grade": "m3",
      "chapter": "2. 다항식의 곱셈과 인수분해",
      "after": "한 문자로 놓아 식을 두 인수의 곱으로 나타낸 뒤 원래 식을 되돌려 넣었을 때 각 인수가 이차식이라면, 그 인수를 더 {인수분해}할 수 있는지 끝까지 살핀다.",
      "completedDefinition": "한 문자로 놓아 식을 두 인수의 곱으로 나타낸 뒤 원래 식을 되돌려 넣었을 때 각 인수가 이차식이라면, 그 인수를 더 인수분해할 수 있는지 끝까지 살핀다.",
      "studentSentence": "한 문자로 놓아 식을 두 인수의 곱으로 나타낸 뒤 원래 식을 되돌려 넣었을 때 각 인수가 이차식이라면, 그 인수를 더 □할 수 있는지 끝까지 살핀다.",
      "expectedAnswers": [
        "인수분해"
      ],
      "blindResponse": {
        "id": "m3-02-03-xc20",
        "answers": [
          "인수분해"
        ],
        "alternativeAnswers": [],
        "reason": "치환 인수분해 뒤 끝까지 인수분해하라는 문맥으로 유일하게 복원된다."
      },
      "originalFinding": {
        "id": "m3-02-03-xc20",
        "grade": "m3",
        "section": "중3::2. 다항식의 곱셈과 인수분해::인수분해의 응용",
        "sourceHash": "a543eee3fbaf12753e4db594f80b9290402ba66ab278290fee84c6a70e4109c4",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "open-answer",
        "student": "한 문자로 놓아 인수분해한 뒤 원래 식을 되돌려 넣으면 각 인수가 □일 수 있다 — 그 인수가 □ 끝까지 살핀다.",
        "expected": [
          "이차식",
          "더 인수분해되는지"
        ],
        "reason": "둘째 빈칸은 명확하다. 첫 빈칸은 '~일 수 있다'라는 틀이어서 '이차식' 대신 '더 인수분해되는 식'처럼 다른 종류의 답도 자연스럽다. 삼차식 반례는 형식 논리 수준이어서 confirmed까지는 아니다.",
        "proposal": "'$x^2+x=A$처럼 이차식을 한 문자로 놓아'를 본문에 주거나, 첫 빈칸을 없애고 '더 인수분해되는지'만 묻는다.",
        "primaryReason": "치환한 식의 차수가 주어지지 않았는데 되돌린 인수가 이차식일 수 있다는 대답만 기대한다. 삼차식이나 사차식도 같은 문장에 들어갈 수 있다.",
        "primaryProposal": "이차식으로 치환하는 실제 예를 주거나 인수분해를 더 할 수 있는지 확인한다는 핵심만 묻는다.",
        "initialAlternativeAnswers": [
          "삼차식",
          "사차식"
        ],
        "initialCounterexample": "T=x³+1로 치환한 뒤 T+1을 되돌리면 x³+2로 삼차식이 된다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "각 인수가 이차식일 수 있다는 조건을 드러내고 추가 인수분해라는 연산만 묻는다. 임의의 식 종류를 써도 참이 되는 첫 빈칸을 없앴다. 앞의 인수분해 글자 반복은 두 인수의 곱이라는 설명으로 바꾸었다."
    },
    {
      "id": "m3-03-01-xc13",
      "grade": "m3",
      "chapter": "3. 이차방정식",
      "after": "두 인수의 곱이 $0$이 아니면 어느 인수도 {$0$}일 수 없다. 곱의 값만으로 한 인수가 곱의 값과 같다고 할 수도 없으므로, 이차방정식은 전개해 우변을 $0$으로 만든 뒤 푼다.",
      "completedDefinition": "두 인수의 곱이 $0$이 아니면 어느 인수도 $0$일 수 없다. 곱의 값만으로 한 인수가 곱의 값과 같다고 할 수도 없으므로, 이차방정식은 전개해 우변을 $0$으로 만든 뒤 푼다.",
      "studentSentence": "두 인수의 곱이 $0$이 아니면 어느 인수도 □일 수 없다. 곱의 값만으로 한 인수가 곱의 값과 같다고 할 수도 없으므로, 이차방정식은 전개해 우변을 $0$으로 만든 뒤 푼다.",
      "expectedAnswers": [
        "$0$"
      ],
      "blindResponse": {
        "id": "m3-03-01-xc13",
        "answers": [
          "$0$"
        ],
        "alternativeAnswers": [],
        "reason": "유일하다. $AB=0$이면 $A=0$ 또는 $B=0$이라는 성질의 대우로 정확하다. 바로 앞에 '$0$이 아니면'이 있어 난도는 매우 낮다."
      },
      "originalFinding": {
        "id": "m3-03-01-xc13",
        "grade": "m3",
        "section": "중3::3. 이차방정식::이차방정식의 풀이",
        "sourceHash": "8eaef9b298096df4096255c590da3ddc06fa5d407614f5d41bcca87e90a3817f",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "long-phrase",
        "student": "곱이 $0$이 아니면 □, 곱의 값만으로 어느 한 인수가 □고 할 수도 없다 — 전개해 우변을 $0$으로 만든 뒤 푼다.",
        "expected": [
          "어느 인수도 $0$일 수 없고",
          "그 값과 같다"
        ],
        "reason": "첫 빈칸이 절 전체여서 '어느 인수도 0이 아니고'뿐 아니라 '$A=0$ 또는 $B=0$이라 할 수 없고' 같은 다른 내용도 들어간다. 둘째 빈칸 '그 값과 같다'도 본문만으로는 떠올리기 어렵다.",
        "proposal": "'$(x-1)(x-2)=3$'처럼 예를 주고 '$x-1=3$ 또는 $x-2=3$이라고 할 수 □'처럼 판단 하나만 묻는다.",
        "primaryReason": "첫 빈칸이 영인수 성질과 대비되는 완결된 판단절이고 두 번째도 문장 조각이다. 개념을 알아도 요구하는 서술 길이와 형식을 추측해야 한다.",
        "primaryProposal": "AB≠0일 때 A와 B가 0일 수 있는지를 짧게 묻는 형태로 나눈다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "0이 아닌 곱에서 각 인수가 0이 될 수 없다는 성질을 짧은 숫자 빈칸으로 묻는다. 전체 부정 절과 그 값이라는 서술구를 노출하여 응답의 대상을 명확히 했다."
    },
    {
      "id": "m3-03-01-xc20",
      "grade": "m3",
      "chapter": "3. 이차방정식",
      "after": "이차방정식 $x^2=2$의 해는 $\\pm\\sqrt{2}$로, 분자와 분모가 정수인 분수로 나타낼 수 없는 {무리수}이다. 이처럼 $(x+p)^2=q$ 꼴로 고치면 제곱근의 뜻으로 해를 구할 수 있다.",
      "completedDefinition": "이차방정식 $x^2=2$의 해는 $\\pm\\sqrt{2}$로, 분자와 분모가 정수인 분수로 나타낼 수 없는 무리수이다. 이처럼 $(x+p)^2=q$ 꼴로 고치면 제곱근의 뜻으로 해를 구할 수 있다.",
      "studentSentence": "이차방정식 $x^2=2$의 해는 $\\pm\\sqrt{2}$로, 분자와 분모가 정수인 분수로 나타낼 수 없는 □이다. 이처럼 $(x+p)^2=q$ 꼴로 고치면 제곱근의 뜻으로 해를 구할 수 있다.",
      "expectedAnswers": [
        "무리수"
      ],
      "blindResponse": {
        "id": "m3-03-01-xc20",
        "answers": [
          "무리수"
        ],
        "alternativeAnswers": [],
        "reason": "정의 설명으로 유일하게 복원된다('수', '실수'는 같은 대상). 분모가 0이 아니라는 조건은 빠져 있다."
      },
      "originalFinding": {
        "id": "m3-03-01-xc20",
        "grade": "m3",
        "section": "중3::3. 이차방정식::이차방정식의 풀이",
        "sourceHash": "a01d26df26a2379dd3ae5500b0f620727a269caf4cb5e8fea6d3f1a95b904ce7",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "open-answer",
        "student": "이차방정식의 해는 □일 수도 있다 — 이런 방정식은 인수분해 대신 $(x+p)^2=q$ 꼴로 고쳐 □으로 푼다.",
        "expected": [
          "무리수",
          "제곱근"
        ],
        "reason": "Claude는 인수분해 대신이라는 문맥이 무리수를 가리킨다고 보았다. 유리수 해도 같은 풀이를 쓸 수 있다는 리드의 우려는 남지만 교과 맥락의 관례가 있어 판단 보류로 둔다.",
        "proposal": "유지. '제곱근의 뜻', '제곱근의 성질'을 인정한다.",
        "primaryReason": "해가 무리수일 수 있다는 첫 빈칸을 제한하는 식이나 조건이 없다. 유리수 해가 있는 방정식도 완전제곱식과 제곱근으로 풀 수 있어 뒤 문장이 앞 답을 결정하지 못한다.",
        "primaryProposal": "x²=2처럼 구체적인 방정식을 주고 해의 수 종류나 풀이에 쓰는 개념을 묻는다.",
        "initialAlternativeAnswers": [
          "유리수",
          "정수"
        ],
        "initialCounterexample": "x²=4의 해는 정수이지만 제곱근으로 풀 수 있다.",
        "additionalEvidence": null,
        "adjudication": "Claude는 인수분해 대신이라는 문맥이 무리수를 가리킨다고 보았다. 유리수 해도 같은 풀이를 쓸 수 있다는 리드의 우려는 남지만 교과 맥락의 관례가 있어 판단 보류로 둔다.",
        "batch": "m3"
      },
      "authorReason": "무리수 해인 구체적 방정식 x²=2를 드러내어 유리수도 가능하다는 첫 빈칸의 대안을 없앴다. 인수분해 대신 제곱근을 이용할 수 있다는 기존 설명을 유지했다. 분수로 나타낼 수 없다는 조건으로 실수·두 개 등의 다른 참 답을 배제했다."
    },
    {
      "id": "m3-03-03-xc17",
      "grade": "m3",
      "chapter": "3. 이차방정식",
      "after": "반지름이 $r$인 원의 반지름을 $x$만큼 늘려 넓이가 $k$배가 되면 $\\pi(r+x)^2=k\\pi r^2$이다. 양변을 $\\pi$로 나누면 $(r+x)^2=$ {$kr^2$}이 되어 $x$를 구할 수 있다.",
      "completedDefinition": "반지름이 $r$인 원의 반지름을 $x$만큼 늘려 넓이가 $k$배가 되면 $\\pi(r+x)^2=k\\pi r^2$이다. 양변을 $\\pi$로 나누면 $(r+x)^2=$ $kr^2$이 되어 $x$를 구할 수 있다.",
      "studentSentence": "반지름이 $r$인 원의 반지름을 $x$만큼 늘려 넓이가 $k$배가 되면 $\\pi(r+x)^2=k\\pi r^2$이다. 양변을 $\\pi$로 나누면 $(r+x)^2=$ □이 되어 $x$를 구할 수 있다.",
      "expectedAnswers": [
        "$kr^2$"
      ],
      "blindResponse": {
        "id": "m3-03-03-xc17",
        "answers": [
          "kr^2"
        ],
        "alternativeAnswers": [],
        "reason": "바로 앞 식의 양변을 π로 나눈 결과로 유일하다. 동치식만 가능하다."
      },
      "originalFinding": {
        "id": "m3-03-03-xc17",
        "grade": "m3",
        "section": "중3::3. 이차방정식::이차방정식의 활용",
        "sourceHash": "6e59a6b29314f9c3deed27bf6828c7ef3f22d242924fa08e41f991506ff29587",
        "status": "confirmed",
        "initialStatus": "needs_review",
        "category": "open-answer",
        "student": "반지름을 $x$만큼 늘린 원의 넓이는 $\\pi(r+x)^2$이므로, 넓이가 몇 배가 되는 문제는 $\\pi$를 □ □에 대한 식으로 푼다.",
        "expected": [
          "양변에서 지워",
          "$(r+x)^2$"
        ],
        "reason": "'□에 대한 식으로 푼다'에는 미지수 '$x$'가 가장 자연스럽지만 기대 답은 '$(r+x)^2$'이다. '$r+x$'도 성립하고, 빈칸 둘이 구분 없이 붙어 있어 경계도 불분명하다.",
        "proposal": "'$\\pi$를 양변에서 □ $(r+x)^2=kr^2$ 꼴로 만든 뒤 제곱근으로 푼다'처럼 목표 꼴을 본문에 주고 빈칸 하나만 둔다.",
        "primaryReason": "양변의 π를 지우는 절차를 쓰게 한 뒤 무엇에 대한 식인지 묻는데, 미지수 x와 식 (r+x)² 모두 자연스럽다. 기대 답이 미지수가 아니라 식 전체임을 알려 주지 않는다.",
        "primaryProposal": "넓이의 배수 조건을 등식으로 제시하고 공통 인수 π나 미지수를 묻는다.",
        "initialAlternativeAnswers": [
          "양변에서 나누어 / x"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "기준 반지름과 배수 k를 명시하고 나누기 후의 방정식 전체를 답으로 특정했다. 미지수 x·r+x·(r+x)² 중 무엇에 대한 식인지 모호하던 응답 틀을 없앴다. 빈칸을 나눗셈 후 식의 우변으로 옮겨 이차방정식이라는 이름이나 미지수 이름을 답하는 대안을 배제했다."
    },
    {
      "id": "m3-03-03-xc21",
      "grade": "m3",
      "chapter": "3. 이차방정식",
      "after": "점이 출발한 뒤 지난 시간을 $t$로 놓고, 움직이는 점이 정하는 길이를 {$t$의 식}으로 나타내어 넓이 조건을 방정식으로 세운다. 해를 구한 뒤 점이 움직일 수 있는 {시간의 범위}에 맞는지 확인한다.",
      "completedDefinition": "점이 출발한 뒤 지난 시간을 $t$로 놓고, 움직이는 점이 정하는 길이를 $t$의 식으로 나타내어 넓이 조건을 방정식으로 세운다. 해를 구한 뒤 점이 움직일 수 있는 시간의 범위에 맞는지 확인한다.",
      "studentSentence": "점이 출발한 뒤 지난 시간을 $t$로 놓고, 움직이는 점이 정하는 길이를 □으로 나타내어 넓이 조건을 방정식으로 세운다. 해를 구한 뒤 점이 움직일 수 있는 □에 맞는지 확인한다.",
      "expectedAnswers": [
        "$t$의 식",
        "시간의 범위"
      ],
      "blindResponse": {
        "id": "m3-03-03-xc21",
        "answers": [
          "$t$에 대한 식",
          "범위"
        ],
        "alternativeAnswers": [],
        "reason": "첫째 □는 '식', '$t$의 식', '일차식' 등 표현 폭이 넓어 허용 범위를 정해야 한다. 뜻은 같다. 둘째 □는 '범위'이며 '시간의 범위'도 같은 뜻이다. 내용은 타당하다."
      },
      "originalFinding": {
        "id": "m3-03-03-xc21",
        "grade": "m3",
        "section": "중3::3. 이차방정식::이차방정식의 활용",
        "sourceHash": "40ce2a2d5ec9a83ee6a4e8d38a420880fe45ef1c9b61cd5181548d4a016aeabf",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "움직이는 점이 정하는 길이를 □으로 나타내어 넓이 조건을 방정식으로 세우고, 해를 구한 뒤 점이 움직일 수 있는 □에 맞는지 확인한다.",
        "expected": [
          "$t$의 식",
          "시간의 범위"
        ],
        "reason": "빈칸의 종류(문자를 쓴 식, 범위)는 알 수 있다. 그러나 본문에 $t$나 시간이 나오지 않는데 기대 답이 '$t$의 식', '시간의 범위'여서 '$x$의 식', '거리의 범위'도 똑같이 타당하다.",
        "proposal": "'움직인 시간을 $t$초라 하면'을 본문에 넣거나, 기대 답을 '시간(문자)에 대한 식', '범위'로 일반화한다.",
        "primaryReason": "문제에 시간 t나 점의 운동 속도를 정의하지 않았는데 t의 식과 시간의 범위를 답으로 요구한다. 길이를 나타내는 문자를 x로 놓거나 이동 거리의 범위를 확인하는 풀이도 가능하다.",
        "primaryProposal": "움직인 시간을 t로 놓는다는 조건을 본문에 주고 길이나 허용 시간 범위를 구체적으로 묻는다.",
        "initialAlternativeAnswers": [
          "x의 식 / 이동 거리의 범위"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "t를 경과 시간으로 정의하여 x의 식·거리 범위 등 다른 변수 해석을 배제했다. 넓이 방정식과 실제 이동 시간 범위 확인을 보존했다."
    },
    {
      "id": "m3-04-01-xc10",
      "grade": "m3",
      "chapter": "4. 이차함수",
      "after": "이차함수 $y=a(x-p)^2+q$의 그래프는 아래로 볼록하면 {$a>0$}, 위로 볼록하면 $a<0$이다. 꼭짓점의 $x$좌표와 $y$좌표가 각각 {$p$, $q$}이므로 꼭짓점의 위치에서 두 수의 부호를 읽는다.",
      "completedDefinition": "이차함수 $y=a(x-p)^2+q$의 그래프는 아래로 볼록하면 $a>0$, 위로 볼록하면 $a<0$이다. 꼭짓점의 $x$좌표와 $y$좌표가 각각 $p$, $q$이므로 꼭짓점의 위치에서 두 수의 부호를 읽는다.",
      "studentSentence": "이차함수 $y=a(x-p)^2+q$의 그래프는 아래로 볼록하면 □, 위로 볼록하면 $a<0$이다. 꼭짓점의 $x$좌표와 $y$좌표가 각각 □이므로 꼭짓점의 위치에서 두 수의 부호를 읽는다.",
      "expectedAnswers": [
        "$a>0$",
        "$p$, $q$"
      ],
      "blindResponse": {
        "id": "m3-04-01-xc10",
        "answers": [
          "$a>0$",
          "$p$, $q$"
        ],
        "alternativeAnswers": [],
        "reason": "첫째는 대구 구조로 $a>0$이 정해진다. 둘째는 '각각'으로 $p$, $q$ 순서가 정해진다. 한 □에 두 값을 쓰게 하는 형식임을 학생이 알기 어렵다. 정확하다."
      },
      "originalFinding": {
        "id": "m3-04-01-xc10",
        "grade": "m3",
        "section": "중3::4. 이차함수::이차함수와 그래프",
        "sourceHash": "66b777d8cf6c3f9b89b791f639a8f00288b64a10a6015718aa2837c2af764c9c",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "아래로 볼록하면 □, 위로 볼록하면 $a<0$이다 — 꼭짓점의 $x$좌표와 $y$좌표가 각각 □이므로 꼭짓점의 위치에서 두 수의 부호를 읽는다.",
        "expected": [
          "$a>0$",
          "$p$, $q$"
        ],
        "reason": "$y=a(x-p)^2+q$가 본문에 없어 $a$, $p$, $q$가 무엇인지 정의되지 않았는데 둘째 빈칸의 답이 그 문자 자체다. 관례로 짐작할 수는 있지만 필요한 정보가 빠진 문항이다.",
        "proposal": "문장 앞에 '$y=a(x-p)^2+q$의 그래프가'를 넣는다.",
        "primaryReason": "함수 식이 주어지지 않아 a,p,q가 어떤 계수인지 알 수 없는데 꼭짓점 좌표로 p,q를 요구한다. C형에서는 숨은 개념명이나 앞 문제의 표준형을 읽었다고 가정할 수 없다.",
        "primaryProposal": "y=a(x-p)²+q라는 식을 본문에 명시한 뒤 계수의 부호와 꼭짓점 좌표를 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "표준형 이차함수 식을 명시하여 a,p,q가 정의되지 않은 문자를 요구하던 결함을 해소했다. 볼록한 방향과 꼭짓점 좌표를 읽는 성질은 유지했다."
    },
    {
      "id": "m3-04-02-xc5",
      "grade": "m3",
      "chapter": "4. 이차함수",
      "after": "이차함수 $y=ax^2+bx+c$의 그래프는 $y=ax^2$의 그래프를 평행이동한 것이므로, 그래프의 폭은 $x^2$의 계수 {$a$}의 절댓값만으로 정해진다.",
      "completedDefinition": "이차함수 $y=ax^2+bx+c$의 그래프는 $y=ax^2$의 그래프를 평행이동한 것이므로, 그래프의 폭은 $x^2$의 계수 $a$의 절댓값만으로 정해진다.",
      "studentSentence": "이차함수 $y=ax^2+bx+c$의 그래프는 $y=ax^2$의 그래프를 평행이동한 것이므로, 그래프의 폭은 $x^2$의 계수 □의 절댓값만으로 정해진다.",
      "expectedAnswers": [
        "$a$"
      ],
      "blindResponse": {
        "id": "m3-04-02-xc5",
        "answers": [
          "a"
        ],
        "alternativeAnswers": [],
        "reason": "유일하다. 다만 같은 문장의 식 y=ax^2+bx+c와 'x^2의 계수'라는 말에 답이 사실상 드러나 있어 변별력이 낮다."
      },
      "originalFinding": {
        "id": "m3-04-02-xc5",
        "grade": "m3",
        "section": "중3::4. 이차함수::이차함수 y=ax^2+bx+c의 그래프",
        "sourceHash": "d0fc7833b33e0e8b938b6ce348fe6b34d1bd1161b11d21c18f4875662315e701",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "open-answer",
        "student": "$y=ax^2+bx+c$의 그래프는 $y=ax^2$의 그래프를 평행이동한 것이므로 □은 □만으로 정해진다.",
        "expected": [
          "폭",
          "$a$"
        ],
        "reason": "평행이동해도 변하지 않고 $a$만으로 정해지는 것은 폭, 모양, 볼록한 방향 모두이다. '□은'에 셋 다 들어가므로 어느 속성을 묻는지 정해지지 않는다.",
        "proposal": "'그래프의 폭은 □만으로 정해진다'로 속성을 본문에 주거나, 정답에 '모양', '볼록한 방향'을 포함한다.",
        "primaryReason": "평행이동으로 바뀌지 않고 a만으로 정해지는 속성에는 폭뿐 아니라 볼록한 방향도 있다. 어떤 그래프 속성을 묻는지 빈칸이 정하지 않는다.",
        "primaryProposal": "폭과 볼록한 방향 중 무엇을 묻는지 본문에 주고 이를 정하는 계수만 묻는다.",
        "initialAlternativeAnswers": [
          "볼록한 방향 / a"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "묻는 속성 폭을 노출하여 모양·볼록한 방향도 가능한 대안을 배제했다. 이차함수라는 전제와 평행이동이 폭을 바꾸지 않는 이유를 유지했다. 폭을 정하는 수는 계수의 절댓값임을 명시하여 a와 |a|가 별개의 참 답인 상태를 없앴다."
    },
    {
      "id": "m3-04-02-xc12",
      "grade": "m3",
      "chapter": "4. 이차함수",
      "after": "이차함수의 꼭짓점이 $x$축 아래에 있고 아래로 볼록하면, 그래프는 $x$축과 {두} 점에서 만난다.",
      "completedDefinition": "이차함수의 꼭짓점이 $x$축 아래에 있고 아래로 볼록하면, 그래프는 $x$축과 두 점에서 만난다.",
      "studentSentence": "이차함수의 꼭짓점이 $x$축 아래에 있고 아래로 볼록하면, 그래프는 $x$축과 □ 점에서 만난다.",
      "expectedAnswers": [
        "두"
      ],
      "blindResponse": {
        "id": "m3-04-02-xc12",
        "answers": [
          "서로 다른 두"
        ],
        "alternativeAnswers": [],
        "reason": "'두'만 써도 같은 뜻이다. 정확하다. '이차함수의 꼭짓점'은 '이차함수의 그래프의 꼭짓점'이 바르다."
      },
      "originalFinding": {
        "id": "m3-04-02-xc12",
        "grade": "m3",
        "section": "중3::4. 이차함수::이차함수 y=ax^2+bx+c의 그래프",
        "sourceHash": "116716d9725e4f2e4e88625f74f419acb24aeea985a881a9cff9304c945c0e15",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "꼭짓점이 $x$축 아래에 있고 □ 볼록하면 그래프는 $x$축과 □ 점에서 만난다.",
        "expected": [
          "아래로",
          "두"
        ],
        "reason": "초기에는 위로/0도 가능하다고 보았으나 Claude가 만난다는 표현의 존재 전제를 지적했다. 0점에서 만난다는 대안의 자연스러움이 약해 확정 판정은 철회하고 조건·결론 동시 빈칸의 편집 후보로만 둔다.",
        "proposal": "유지.",
        "primaryReason": "볼록한 방향과 교점 개수를 동시에 가려 서로 다른 두 정답 조합이 생긴다. 꼭짓점이 x축 아래라는 조건만으로 두 빈칸이 정해지지 않는다.",
        "primaryProposal": "아래로 볼록하다는 조건을 본문에 두고 x축과의 교점 개수만 묻는다.",
        "initialAlternativeAnswers": [
          "위로 / 0"
        ],
        "initialCounterexample": "y=x²-1은 아래로 볼록하고 두 점에서 만나지만 y=-x²-1은 위로 볼록하고 만나지 않는다.",
        "additionalEvidence": null,
        "adjudication": "초기에는 위로/0도 가능하다고 보았으나 Claude가 만난다는 표현의 존재 전제를 지적했다. 0점에서 만난다는 대안의 자연스러움이 약해 확정 판정은 철회하고 조건·결론 동시 빈칸의 편집 후보로만 둔다.",
        "batch": "m3"
      },
      "authorReason": "아래로 볼록하다는 조건을 노출하여 조건과 교점 수를 함께 바꾸는 대안을 없앴다. 꼭짓점의 위치와 교점 수의 관계를 묻는다."
    },
    {
      "id": "m3-04-02-xc19",
      "grade": "m3",
      "chapter": "4. 이차함수",
      "after": "이차함수 그래프 위의 서로 다른 두 점이 축에서 같은 거리에 있으면 서로 {대칭}이어서 대입할 때 같은 조건을 준다. 축과 두 점으로 식을 하나로 정하려면 두 점에서 축까지의 거리가 서로 {달라야} 한다.",
      "completedDefinition": "이차함수 그래프 위의 서로 다른 두 점이 축에서 같은 거리에 있으면 서로 대칭이어서 대입할 때 같은 조건을 준다. 축과 두 점으로 식을 하나로 정하려면 두 점에서 축까지의 거리가 서로 달라야 한다.",
      "studentSentence": "이차함수 그래프 위의 서로 다른 두 점이 축에서 같은 거리에 있으면 서로 □이어서 대입할 때 같은 조건을 준다. 축과 두 점으로 식을 하나로 정하려면 두 점에서 축까지의 거리가 서로 □ 한다.",
      "expectedAnswers": [
        "대칭",
        "달라야"
      ],
      "blindResponse": {
        "id": "m3-04-02-xc19",
        "answers": [
          "대칭",
          "달라야"
        ],
        "alternativeAnswers": [],
        "reason": "그래프 위의 서로 다른 두 점이 축에서 같은 거리에 있으면 축에 대하여 대칭이고, $y=a(x-p)^2+q$에 대입하면 같은 식이 나오므로 내용은 정확하다. 둘째 □는 '한다'와의 호응으로 '달라야'가 정해진다. 첫째는 '축에 대하여 대칭'이 더 엄밀하다."
      },
      "originalFinding": {
        "id": "m3-04-02-xc19",
        "grade": "m3",
        "section": "중3::4. 이차함수::이차함수 y=ax^2+bx+c의 그래프",
        "sourceHash": "ec60d5faaf53b19033ac630260e8df51ffefbc55949e4b058d3ac020f347979b",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "missing-referent",
        "student": "축에서 같은 거리에 있는 두 점은 □이어서 대입하면 같은 조건을 준다 — 축과 두 점으로 식을 하나로 정하려면 두 점에서 □ 한다.",
        "expected": [
          "대칭",
          "축까지의 거리가 달라야"
        ],
        "reason": "'대입하면', '축과 두 점으로 식을 정하려면'이라는 문맥에서 두 점은 그래프 위의 점이다. 그러면 축에서 같은 거리인 두 점은 대칭이고, 둘째 빈칸은 앞 절을 뒤집은 조건으로 정해진다.",
        "proposal": "유지. 엄밀성을 위해 '그래프 위의 두 점'을 덧붙이는 것은 선택 사항이다.",
        "primaryReason": "축에서 같은 거리에 있는 두 점이라는 조건만 적혀 있다. 같은 포물선 위의 두 점이라는 조건이 있으면 대칭이지만 평면의 임의의 두 점에는 그렇지 않다.",
        "primaryProposal": "같은 이차함수의 그래프 위에 있는 두 점이라는 조건을 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "축 x=0에서 같은 거리인 (1,1),(-1,2)는 서로 대칭이 아니다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "두 점이 이차함수 그래프 위의 서로 다른 점임을 명시했다. 대칭과 서로 다른 거리라는 핵심어를 짧게 나누고 식을 정하는 데 독립된 두 조건이 필요하다는 설명을 유지했다."
    },
    {
      "id": "m3-04-03-xc8",
      "grade": "m3",
      "chapter": "4. 이차함수",
      "after": "$x$의 범위가 실수 전체일 때, 이차함수는 볼록한 방향에 따라 최댓값과 최솟값 가운데 {하나만} 갖는다.",
      "completedDefinition": "$x$의 범위가 실수 전체일 때, 이차함수는 볼록한 방향에 따라 최댓값과 최솟값 가운데 하나만 갖는다.",
      "studentSentence": "$x$의 범위가 실수 전체일 때, 이차함수는 볼록한 방향에 따라 최댓값과 최솟값 가운데 □ 갖는다.",
      "expectedAnswers": [
        "하나만"
      ],
      "blindResponse": {
        "id": "m3-04-03-xc8",
        "answers": [
          "하나만"
        ],
        "alternativeAnswers": [],
        "reason": "답은 '하나만'이고 '한 가지만'은 같은 뜻이다. 내용은 정확하다. 다만 이차함수의 최댓값·최솟값은 2015 개정 이후 중3에서 빠져 고1로 옮겨졌으므로 중3 원고에 싣는 것이 적절한지 확인해야 한다."
      },
      "originalFinding": {
        "id": "m3-04-03-xc8",
        "grade": "m3",
        "section": "중3::4. 이차함수::이차함수의 최댓값과 최솟값",
        "sourceHash": "53e2a6de1f6cbff69fcdb8eb0d7bb7423d12537b4ecc5b2dfc1fa46679e39b20",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "hidden-condition",
        "student": "이차함수는 볼록한 방향에 따라 최댓값과 최솟값 가운데 □ 갖는다 — $x$의 범위가 □일 때이다.",
        "expected": [
          "하나만",
          "실수 전체"
        ],
        "reason": "'하나만', '실수 전체(모든 실수)'가 자연스러운 단일 답이다. 반직선 범위에서도 하나만 가진다는 지적은 더 좁은 조건도 참이라는 형식 논리에 그친다.",
        "proposal": "유지. '모든 실수', '제한이 없을'을 인정한다.",
        "primaryReason": "최댓값·최솟값 중 하나만 존재하는 조건으로 정의역 전체를 빈칸 처리했다. 실수 전체는 충분한 상황이지만 다른 구간에서도 하나만 존재할 수 있어 어떤 범위를 쓰는지 불명확할 수 있다.",
        "primaryProposal": "x가 모든 실수라는 조건은 본문에 두고 최대·최소의 존재 여부를 묻는다.",
        "initialAlternativeAnswers": [
          "꼭짓점을 포함하는 닫힌 반직선"
        ],
        "initialCounterexample": "x≥0에서 y=x²도 최솟값만 있고 최댓값은 없다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "정의역 실수 전체를 노출하여 양수 전체 등 더 좁은 범위도 참일 수 있는 응답 대안을 없앴다. 극값 중 하나만 존재하는 성질을 유지했다."
    },
    {
      "id": "m3-06-01-xc13",
      "grade": "m3",
      "chapter": "6. 원의 성질",
      "after": "원의 중심에서 지름이 아닌 현에 수선을 내려 만든 직각삼각형에서, 수선의 발부터 현의 한 끝점까지 구한 길이는 현의 {절반}이다. 따라서 현의 길이는 그 값에 {$2$}를 곱해 구한다.",
      "completedDefinition": "원의 중심에서 지름이 아닌 현에 수선을 내려 만든 직각삼각형에서, 수선의 발부터 현의 한 끝점까지 구한 길이는 현의 절반이다. 따라서 현의 길이는 그 값에 $2$를 곱해 구한다.",
      "studentSentence": "원의 중심에서 지름이 아닌 현에 수선을 내려 만든 직각삼각형에서, 수선의 발부터 현의 한 끝점까지 구한 길이는 현의 □이다. 따라서 현의 길이는 그 값에 □를 곱해 구한다.",
      "expectedAnswers": [
        "절반",
        "$2$"
      ],
      "blindResponse": {
        "id": "m3-06-01-xc13",
        "answers": [
          "절반",
          "2"
        ],
        "alternativeAnswers": [],
        "reason": "원의 중심에서 현에 내린 수선은 그 현을 이등분하므로 수선의 발에서 끝점까지의 길이는 현의 절반이고, 현의 길이는 그 값의 2배이다. '반', '1/2', '길이의 절반'은 동의 표현이며, 두 번째 빈칸은 앞 빈칸에 종속되어 2로 유일하다. '지름이 아닌 현' 조건으로 직각삼각형이 생기지 않는 경우를 배제해 정확하다. 답 노출은 없고 중3 원과 현 단원 용어에 맞는다. '끝점까지 구한 길이'라는 표현은 다소 어색하지만 의미는 분명하다."
      },
      "originalFinding": {
        "id": "m3-06-01-xc13",
        "grade": "m3",
        "section": "중3::6. 원의 성질::원과 현",
        "sourceHash": "625b326e0fe48a2fabe916542bcdf1bc37844d04132a2df60e9420ba405e7841",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "현의 길이를 구할 때 직각삼각형에서 얻은 값은 현의 □이므로 마지막에 □를 곱해야 한다.",
        "expected": [
          "절반",
          "$2$"
        ],
        "reason": "Claude는 원과 현 단원의 통상적인 수선 작도로 답을 정할 수 있다고 보았다. 리드는 개별 문항으로 뽑을 때 직각삼각형의 구성을 명시하는 편이 필요하다고 보지만 확정 통계에 넣지 않는다.",
        "proposal": "유지. '중심에서 현에 내린 수선으로 만든'을 덧붙이는 것은 선택 사항이다.",
        "primaryReason": "어떤 직각삼각형을 구성했는지 없는데 얻은 값이 현의 절반이라고 단정한다. 중심에서 현에 수선을 내리고 반지름을 빗변으로 삼는 구성이 필요하다.",
        "primaryProposal": "중심에서 현에 내린 수선과 반지름으로 만든 직각삼각형임을 명시하고 구한 밑변이 현의 절반임을 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "원을 지나는 지름을 빗변으로 하는 내접 직각삼각형에서는 다른 한 변이 현 전체일 수 있다.",
        "additionalEvidence": null,
        "adjudication": "Claude는 원과 현 단원의 통상적인 수선 작도로 답을 정할 수 있다고 보았다. 리드는 개별 문항으로 뽑을 때 직각삼각형의 구성을 명시하는 편이 필요하다고 보지만 확정 통계에 넣지 않는다.",
        "batch": "m3"
      },
      "authorReason": "중심에서 현에 내린 수선과 구한 변의 위치를 명시했다. 임의의 직각삼각형의 길이를 현의 절반으로 오해할 수 없게 했다. 0 또는 1의 경계와 퇴화 도형을 점검하여 해당 조건과 예외를 문장에 명시했다."
    },
    {
      "id": "m3-06-03-xc13",
      "grade": "m3",
      "chapter": "6. 원의 성질",
      "after": "원의 중심이 원주각의 바깥에 있어도, 원주각은 같은 호에 대한 중심각의 {절반}이다.",
      "completedDefinition": "원의 중심이 원주각의 바깥에 있어도, 원주각은 같은 호에 대한 중심각의 절반이다.",
      "studentSentence": "원의 중심이 원주각의 바깥에 있어도, 원주각은 같은 호에 대한 중심각의 □이다.",
      "expectedAnswers": [
        "절반"
      ],
      "blindResponse": {
        "id": "m3-06-03-xc13",
        "answers": [
          "절반"
        ],
        "alternativeAnswers": [],
        "reason": "'$\\frac{1}{2}$'은 같은 뜻이다. 정확하다. 같은 소단원 m3-06-03-c6의 문장에 '중심각의 절반'이 그대로 있어 함께 실리면 답이 노출된다. '원주각의 크기', '중심각의 크기'로 쓰는 것이 엄밀하다."
      },
      "originalFinding": {
        "id": "m3-06-03-xc13",
        "grade": "m3",
        "section": "중3::6. 원의 성질::원주각",
        "sourceHash": "bb6081a7d5467c1963d2c1fbf8bc69c48d22b074349bae10b00067921aa0ef85",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "hidden-condition",
        "student": "원의 중심이 원주각의 □에 있어도 원주각은 같은 호에 대한 중심각의 □이다.",
        "expected": [
          "바깥",
          "절반"
        ],
        "reason": "'있어도'라는 양보 표현이 '바깥'을 가리키기는 한다. 그러나 안쪽이나 변 위에 있어도 문장이 참이어서 위치 빈칸의 근거가 약하다.",
        "proposal": "'바깥'을 본문에 두고 '절반'만 묻거나, '안쪽이나 변 위에 있을 때뿐 아니라 □에 있어도'로 대비를 준다.",
        "primaryReason": "중심이 원주각의 안쪽·변 위·바깥에 있는 모든 경우에 같은 정리가 성립한다. 위치를 가린 빈칸에서 바깥만 골라야 할 근거가 약하다.",
        "primaryProposal": "중심이 원주각 바깥에 있는 경우임을 본문에 두고 두 각의 크기 관계만 묻는다.",
        "initialAlternativeAnswers": [
          "안쪽",
          "변 위"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "중심의 위치 바깥을 조건으로 남겨 안쪽·변 위 등 다른 위치의 참 답을 배제했다. 바깥인 경우에도 성립하는 중심각과 원주각의 관계를 유지했다."
    },
    {
      "id": "m3-06-03-xc15",
      "grade": "m3",
      "chapter": "6. 원의 성질",
      "after": "한 원에서 크기가 같은 원주각이 마주 보는 현의 길이는 {같다}. 여기서 현은 호의 두 끝점을 잇는 선분이다.",
      "completedDefinition": "한 원에서 크기가 같은 원주각이 마주 보는 현의 길이는 같다. 여기서 현은 호의 두 끝점을 잇는 선분이다.",
      "studentSentence": "한 원에서 크기가 같은 원주각이 마주 보는 현의 길이는 □. 여기서 현은 호의 두 끝점을 잇는 선분이다.",
      "expectedAnswers": [
        "같다"
      ],
      "blindResponse": {
        "id": "m3-06-03-xc15",
        "answers": [
          "같다"
        ],
        "alternativeAnswers": [],
        "reason": "'서로 같다'는 같은 뜻이다. 한 원에서 원주각이 같으면 호가 같고 현도 같으므로 정확하다."
      },
      "originalFinding": {
        "id": "m3-06-03-xc15",
        "grade": "m3",
        "section": "중3::6. 원의 성질::원주각",
        "sourceHash": "ddbef351323b20162363f43347464392e11487ba616cade8b4164b0e7fd40f1a",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "open-answer",
        "student": "한 원에서 원주각의 크기가 같으면 그 각이 마주 보는 □의 길이도 □.",
        "expected": [
          "현",
          "같다"
        ],
        "reason": "크기가 같은 원주각에 대한 호의 길이가 같다는 것이 교과서 정리여서 '호 / 같다'가 오히려 더 자연스러운 답이다. '현'과 '호' 중 무엇을 묻는지 가릴 단서가 없다.",
        "proposal": "'그 각이 마주 보는 호의 양 끝을 이은 □의 길이도'처럼 현을 특정하거나, '현'을 본문에 두고 '같다'만 묻는다.",
        "primaryReason": "크기가 같은 두 원주각이 마주 보는 현의 길이도 같고 호의 길이도 같다. 직선으로 잇는 선분을 묻는다는 단서가 없어 현과 호 중 하나를 결정할 수 없다.",
        "primaryProposal": "두 끝점을 이은 선분이라는 단서를 주고 현을 묻거나 현을 본문에 주고 길이 관계만 묻는다.",
        "initialAlternativeAnswers": [
          "호 / 같다"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "현이라는 대상을 노출하고 선분임을 설명해 호의 길이와 구별했다. 원주각의 크기와 현의 길이가 같다는 성질의 핵심 결론만 묻는다."
    },
    {
      "id": "m3-06-04-xc17",
      "grade": "m3",
      "chapter": "6. 원의 성질",
      "after": "접점을 지나는 지름을 그으면 접선과 지름이 {$90^\\circ$}를 이룬다. 이를 이용해 접선과 현이 이루는 각은 그 각의 안쪽 호에 대한 {원주각}과 같음을 보일 수 있다.",
      "completedDefinition": "접점을 지나는 지름을 그으면 접선과 지름이 $90^\\circ$를 이룬다. 이를 이용해 접선과 현이 이루는 각은 그 각의 안쪽 호에 대한 원주각과 같음을 보일 수 있다.",
      "studentSentence": "접점을 지나는 지름을 그으면 접선과 지름이 □를 이룬다. 이를 이용해 접선과 현이 이루는 각은 그 각의 안쪽 호에 대한 □과 같음을 보일 수 있다.",
      "expectedAnswers": [
        "$90^\\circ$",
        "원주각"
      ],
      "blindResponse": {
        "id": "m3-06-04-xc17",
        "answers": [
          "$90^\\circ$",
          "원주각"
        ],
        "alternativeAnswers": [],
        "reason": "첫째 □ 뒤의 조사가 '를'이어서 '직각'은 맞지 않고 '$90^\\circ$'만 자연스럽다. 기대 답이 '직각'이라면 조사를 '을'로 고쳐야 한다. 둘째는 원주각으로 정해진다. '원주각의 크기와 같음'이 엄밀하다."
      },
      "originalFinding": {
        "id": "m3-06-04-xc17",
        "grade": "m3",
        "section": "중3::6. 원의 성질::원주각의 활용",
        "sourceHash": "2b14a49abf95952ca30c416ba7fc9e9e5d61538aa4e82f32333790f6fbda1aaa",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "missing-referent",
        "student": "접점을 지나는 지름을 그으면 접선과 지름이 □를 이루어, 접선과 현이 이루는 각과 □이 같음을 보일 수 있다.",
        "expected": [
          "$90^\\circ$",
          "원주각"
        ],
        "reason": "접선과 접점을 지나는 지름이 이루는 각은 $90^\\circ$, 접선과 현이 이루는 각과 같은 것은 원주각으로 각각 답이 하나다. 어느 호에 대한 원주각인지는 답을 더 자세히 쓴 것일 뿐이다.",
        "proposal": "유지. '직각', '그 각 안에 있는 호에 대한 원주각'을 인정한다.",
        "primaryReason": "접선과 현이 이루는 각과 같은 원주각이 어느 호에 대한 것인지 명시하지 않았다. 지름을 그리는 설명만으로는 비교할 원주각이 정해지지 않는다.",
        "primaryProposal": "접현각 안쪽 호에 대한 원주각을 비교한다는 조건을 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "어느 호에 대한 원주각인지 명시했다. 접점에서의 수직 관계와 접선·현 각의 정리를 보존했다."
    },
    {
      "id": "m3-07-02-xc15",
      "grade": "m3",
      "chapter": "7. 통계",
      "after": "아이스크림 판매량과 물놀이 사고가 함께 늘어도 둘 다 기온의 영향을 받았을 수 있으므로, 상관관계만으로 한쪽이 다른 쪽의 {원인}이라고 단정할 수 없다.",
      "completedDefinition": "아이스크림 판매량과 물놀이 사고가 함께 늘어도 둘 다 기온의 영향을 받았을 수 있으므로, 상관관계만으로 한쪽이 다른 쪽의 원인이라고 단정할 수 없다.",
      "studentSentence": "아이스크림 판매량과 물놀이 사고가 함께 늘어도 둘 다 기온의 영향을 받았을 수 있으므로, 상관관계만으로 한쪽이 다른 쪽의 □이라고 단정할 수 없다.",
      "expectedAnswers": [
        "원인"
      ],
      "blindResponse": {
        "id": "m3-07-02-xc15",
        "answers": [
          "원인"
        ],
        "alternativeAnswers": [],
        "reason": "조사 '이라고' 때문에 '결과'는 맞지 않아 '원인'이 정해진다. 내용은 타당하다."
      },
      "originalFinding": {
        "id": "m3-07-02-xc15",
        "grade": "m3",
        "section": "중3::7. 통계::산점도와 상관관계",
        "sourceHash": "cf51cc55e5e19990f9f6d3d1cd82ed543574285d208762527307df59b43a210a",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "open-answer",
        "student": "아이스크림 판매량과 물놀이 사고가 함께 늘어도 둘 다 □의 영향을 받았을 수 있으므로, 상관관계만으로 한쪽이 다른 쪽의 □이라고 단정할 수 없다.",
        "expected": [
          "기온",
          "원인"
        ],
        "reason": "답의 종류(두 변량에 함께 영향을 주는 요인)가 분명하다. '기온', '날씨', '더위'는 같은 취지의 표현이고, 둘째 빈칸 '원인'은 단일 답이다.",
        "proposal": "유지. '날씨', '더위', '계절(여름)'을 인정한다.",
        "primaryReason": "공통 원인으로 기온을 기대하지만 계절이나 여름철 야외 활동 등 여러 요인도 문장에 들어갈 수 있다. 인과관계와 상관관계의 차이를 아는지와 특정 사례 설명의 선택이 섞인다.",
        "primaryProposal": "기온의 영향을 함께 받는 예라고 본문에 주고 원인이라고 단정할 수 없다는 개념만 묻는다.",
        "initialAlternativeAnswers": [
          "계절",
          "여름철 야외 활동"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "공통 요인인 기온을 노출하여 날씨·휴가 등 서로 다른 가설을 답으로 쓰는 첫 빈칸을 없앴다. 상관관계만으로 인과를 단정하지 않는 설명을 유지했다."
    },
    {
      "id": "m3-07-03-xc13",
      "grade": "m3",
      "chapter": "7. 통계",
      "after": "상자그림에서는 최솟값, 제$1$사분위수, 중앙값, 제$3$사분위수, 최댓값을 읽을 수 있다. 이 다섯 값이 같은 자료라도 개별 변량이 다를 수 있으므로, 변량의 총합을 개수로 나눈 {평균}을 언제나 알아낼 수 있는 것은 아니다.",
      "completedDefinition": "상자그림에서는 최솟값, 제$1$사분위수, 중앙값, 제$3$사분위수, 최댓값을 읽을 수 있다. 이 다섯 값이 같은 자료라도 개별 변량이 다를 수 있으므로, 변량의 총합을 개수로 나눈 평균을 언제나 알아낼 수 있는 것은 아니다.",
      "studentSentence": "상자그림에서는 최솟값, 제$1$사분위수, 중앙값, 제$3$사분위수, 최댓값을 읽을 수 있다. 이 다섯 값이 같은 자료라도 개별 변량이 다를 수 있으므로, 변량의 총합을 개수로 나눈 □을 언제나 알아낼 수 있는 것은 아니다.",
      "expectedAnswers": [
        "평균"
      ],
      "blindResponse": {
        "id": "m3-07-03-xc13",
        "answers": [
          "평균"
        ],
        "alternativeAnswers": [],
        "reason": "'변량의 총합을 개수로 나눈'이라는 정의로 유일하게 복원되며 내용도 정확하다."
      },
      "originalFinding": {
        "id": "m3-07-03-xc13",
        "grade": "m3",
        "section": "중3::7. 통계::상자그림",
        "sourceHash": "b6e9453e7493e9e28acb5adcad8b76ffe72a8042d6d5cadb849e6fbd73340021",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "open-answer",
        "student": "상자그림에서는 □을 읽을 수 있다 — 그림이 같아도 변량이나 평균이 다른 자료가 있으므로, 변량 하나하나와 □을 언제나 알아낼 수 있는 것은 아니다.",
        "expected": [
          "다섯 값",
          "평균"
        ],
        "reason": "'□을 읽을 수 있다'에 '중앙값', '최댓값', '최솟값' 등 여러 참인 답이 들어가고, '다섯 값'이라는 묶음 표현을 요구한다는 단서가 없다. 둘째 빈칸 '평균'은 바로 앞 절에 노출되어 있다.",
        "proposal": "'최솟값, 제1사분위수, □, 제3사분위수, 최댓값의 다섯 값'처럼 나열 속 한 항목을 묻고, 앞 절의 '평균'은 다른 표현으로 바꾼다.",
        "primaryReason": "상자그림에서 읽을 수 있는 것을 묻는 첫 빈칸에는 중앙값·사분위수·범위 등 여러 다른 답이 옳다. 다섯 값이라는 개수 표현 전체를 요구한다는 단서가 없다.",
        "primaryProposal": "다섯 요약값을 본문에 나열하고 읽을 수 없는 평균과 구분하게 하거나 빠진 통계량 하나만 묻는다.",
        "initialAlternativeAnswers": [
          "중앙값",
          "사분위수",
          "범위"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m3"
      },
      "authorReason": "읽을 수 있는 다섯 값을 명시하여 그중 임의의 한 값을 답으로 쓰는 대안을 없앴다. 평균이 바로 앞에 반복되던 노출을 지우고 개별 자료를 모르면 평균을 알 수 없다는 이유를 남겼다. 평균의 계산 의미를 노출하여 최빈값·분산·자료의 총합 등 알 수 없는 다른 값을 답하는 대안을 배제했다."
    },
    {
      "id": "m1-07-06-c2",
      "grade": "m1",
      "chapter": "7. 입체도형",
      "after": "반지름의 길이가 $r$인 구의 부피는 $\\pi r^3$의 {$\\frac{4}{3}$}배이다.",
      "completedDefinition": "반지름의 길이가 $r$인 구의 부피는 $\\pi r^3$의 $\\frac{4}{3}$배이다.",
      "studentSentence": "반지름의 길이가 $r$인 구의 부피는 $\\pi r^3$의 □배이다.",
      "expectedAnswers": [
        "$\\frac{4}{3}$"
      ],
      "blindResponse": {
        "id": "m1-07-06-c2",
        "answers": [
          "$\\frac{4}{3}$"
        ],
        "alternativeAnswers": [],
        "reason": "유일하다. 정확하다."
      },
      "originalFinding": {
        "id": "m1-07-06-c2",
        "grade": "m1",
        "section": "중1::7. 입체도형::구의 겉넓이와 부피",
        "sourceHash": "bf4bedef4aabd04f7bef667158e2d48767854373c2cfd668009633271a1b5b48",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "answer-leak",
        "student": "반지름의 길이가 $r$인 구의 부피는 $\\pi r^3$의 □배이다. 곧 $V=\\frac{4}{3}\\pi r^3$이다.",
        "expected": [
          "$\\frac{4}{3}$"
        ],
        "reason": "빈칸의 4/3이 바로 뒤 공식에 그대로 있어 회상 없이 옮겨 적을 수 있다. 다만 무엇을 쓸지는 분명하므로 명료성 결함이 아니라 정답 노출이다.",
        "proposal": "'곧 V=…' 문장을 빼거나 공식 쪽 계수를 함께 가린다.",
        "primaryReason": "빈칸에 넣을 계수 4/3이 바로 다음 공식 V=4/3πr³에 그대로 보인다. 구의 부피 공식을 기억하지 않고 주어진 식에서 수만 옮겨 적으면 된다.",
        "primaryProposal": "공식 전체와 계수 표현 중 한쪽으로 묻고 다른 쪽에서 답을 노출하지 않도록 한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "계수 4/3를 묻는 한 식만 남겨 같은 계수를 뒤 공식에서 그대로 복사하는 구조를 없앴다. 완성 문장은 구의 부피 공식 V=(4/3)πr³와 동치이며 수학적 내용 손실이 없다."
    },
    {
      "id": "m1-01-03-xc20",
      "grade": "m1",
      "chapter": "1. 소인수분해",
      "after": "두 자연수의 공약수는 큰 수에서 작은 수를 뺀 {차}도 나누어떨어지게 한다. 두 수가 같아 뺄셈 결과가 $0$인 경우도 마찬가지이다.",
      "completedDefinition": "두 자연수의 공약수는 큰 수에서 작은 수를 뺀 차도 나누어떨어지게 한다. 두 수가 같아 뺄셈 결과가 $0$인 경우도 마찬가지이다.",
      "studentSentence": "두 자연수의 공약수는 큰 수에서 작은 수를 뺀 □도 나누어떨어지게 한다. 두 수가 같아 뺄셈 결과가 $0$인 경우도 마찬가지이다.",
      "expectedAnswers": [
        "차"
      ],
      "blindResponse": {
        "id": "m1-01-03-xc20",
        "answers": [
          "차"
        ],
        "alternativeAnswers": [],
        "reason": "'차'로 복원된다. '값', '수', '결과'를 넣어도 같은 뜻이라 다른 의미의 대안은 없다. 뒤 문장의 '뺄셈 결과'가 약한 단서가 된다. 0이 모든 자연수로 나누어떨어진다는 처리도 정확하다."
      },
      "originalFinding": {
        "id": "m1-01-03-xc20",
        "grade": "m1",
        "section": "중1::1. 소인수분해::공약수와 최대공약수",
        "sourceHash": "197bd498275f70cbde341b783b20d6a47c4091889b923ace20315fb72f9d7a84",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "open-answer",
        "student": "두 수의 공약수는 두 수의 □도 나누어떨어지게 한다.",
        "expected": [
          "차"
        ],
        "reason": "공약수는 두 수의 차뿐 아니라 합, 곱, 최대공약수, 최소공배수도 나누어떨어지게 한다. '□도'만으로는 어느 것을 묻는지 고를 단서가 없다.",
        "proposal": "'큰 수에서 작은 수를 뺀 □'처럼 연산 단서를 남기거나, 유클리드식 활용 맥락을 문장에 넣는다.",
        "primaryReason": "두 수의 공약수는 두 수의 차뿐 아니라 합과 곱도 나누어떨어지게 한다. 어떤 연산으로 만든 수의 성질을 묻는지 단서가 없어, 서로 다른 수학적 주장을 나타내는 답이 모두 성립한다.",
        "primaryProposal": "큰 수에서 작은 수를 뺀 수라는 연산 단서를 남기고 공약수의 성질을 묻도록 한정한다.",
        "initialAlternativeAnswers": [
          "합",
          "곱"
        ],
        "initialCounterexample": "12와 18의 공약수 6은 차 6, 합 30, 곱 216을 모두 나누어떨어지게 한다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "뺄셈이라는 연산을 노출하여 합·곱 등 다른 참 답을 배제했다. 두 수가 같아 차가 0인 경우도 공약수로 나누어떨어진다는 성질을 유지했다. 뒤 문장의 차라는 답 반복을 뺄셈 결과로 바꾸었다."
    },
    {
      "id": "m1-03-01-xc5",
      "grade": "m1",
      "chapter": "3. 방정식",
      "after": "$a\\%$는 {$\\frac{a}{100}$}이므로 어떤 양의 $a\\%$는 그 양에 이 비율을 곱해 구한다.",
      "completedDefinition": "$a\\%$는 $\\frac{a}{100}$이므로 어떤 양의 $a\\%$는 그 양에 이 비율을 곱해 구한다.",
      "studentSentence": "$a\\%$는 □이므로 어떤 양의 $a\\%$는 그 양에 이 비율을 곱해 구한다.",
      "expectedAnswers": [
        "$\\frac{a}{100}$"
      ],
      "blindResponse": {
        "id": "m1-03-01-xc5",
        "answers": [
          "$\\frac{a}{100}$"
        ],
        "alternativeAnswers": [],
        "reason": "유일하다. $0.01a$는 동치 표현이다. 정확하다. m1-03-10-xc3과 문장이 완전히 같아 중복이다."
      },
      "originalFinding": {
        "id": "m1-03-01-xc5",
        "grade": "m1",
        "section": "중1::3. 방정식::문자의 사용과 식의 값",
        "sourceHash": "dc205559f2a2076590182fc324b0f46d3bd23ec5a4080341dad046b3ff0c4ea9",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "answer-leak",
        "student": "$a\\%$는 □이므로 어떤 양의 $a\\%$는 그 양에 $\\frac{a}{100}$를 □.",
        "expected": [
          "$\\frac{a}{100}$",
          "곱한다"
        ],
        "reason": "첫 빈칸의 a/100이 같은 문장 뒤에 그대로 인쇄되어 있다. 답의 종류는 분명하므로 정답 노출 문제이다.",
        "proposal": "뒤의 a/100을 '그 분수'로 바꾸거나 함께 가린다.",
        "primaryReason": "첫 빈칸의 기대식 a/100이 같은 문장 뒷부분에 그대로 인쇄된다. 백분율을 분수로 바꾸는 이해 없이 뒤의 식을 복사할 수 있다.",
        "primaryProposal": "백분율의 분수 표현은 한 번만 제시하거나 반복되는 식도 함께 가린다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "뒤 문장에 답 a/100을 반복하지 않고 이 비율로 가리켰다. 백분율의 분수 표현을 짧게 묻고 기준량에 곱한다는 설명을 유지했다."
    },
    {
      "id": "m1-03-03-xc20",
      "grade": "m1",
      "chapter": "3. 방정식",
      "after": "어떤 식에서 한 식을 빼야 할 것을 잘못 더한 경우, 잘못 계산한 결과에서 더한 식을 {빼면} 처음 식이 나온다. 그 처음 식에서 빼야 할 식을 한 번 더 빼면 바른 결과가 나온다.",
      "completedDefinition": "어떤 식에서 한 식을 빼야 할 것을 잘못 더한 경우, 잘못 계산한 결과에서 더한 식을 빼면 처음 식이 나온다. 그 처음 식에서 빼야 할 식을 한 번 더 빼면 바른 결과가 나온다.",
      "studentSentence": "어떤 식에서 한 식을 빼야 할 것을 잘못 더한 경우, 잘못 계산한 결과에서 더한 식을 □ 처음 식이 나온다. 그 처음 식에서 빼야 할 식을 한 번 더 빼면 바른 결과가 나온다.",
      "expectedAnswers": [
        "빼면"
      ],
      "blindResponse": {
        "id": "m1-03-03-xc20",
        "answers": [
          "빼면"
        ],
        "alternativeAnswers": [],
        "reason": "역연산으로 '빼면'이 정해지고 내용도 정확하다. 다음 문장의 '한 번 더 빼면'이 답의 어형을 그대로 노출한다."
      },
      "originalFinding": {
        "id": "m1-03-03-xc20",
        "grade": "m1",
        "section": "중1::3. 방정식::일차식의 뜻Ⅱ",
        "sourceHash": "6997a787ed3726d0afd5f19fbed50cd7a01b99ab4b5421d566282c923c20190b",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "빼야 할 것을 더했다면 먼저 □을 구한 뒤 바르게 □.",
        "expected": [
          "어떤 식",
          "뺀다"
        ],
        "reason": "'어떤 식에서 빼야 할 것을 더했더니' 유형을 아는 학생은 어떤 식·처음 식·원래 식과 뺀다를 떠올릴 수 있어 답 불능은 아니다. 다만 '어떤 식'의 지시 대상이 문장 안에 없고 둘째 빈칸에도 '계산한다'가 들어갈 수 있다.",
        "proposal": "'어떤 식에서 A를 빼야 할 것을 잘못 더했다면'처럼 문제 틀을 문장에 넣고, 처음 식·원래 식을 동의 답으로 인정한다.",
        "primaryReason": "어떤 계산에서 무엇을 빼야 했는지, 잘못 계산한 결과가 무엇인지 제시되지 않은 채 '먼저 □을 구한 뒤'를 묻는다. 기대답 '어떤 식'의 지시대상도 문장 안에 없어서 학생은 구할 대상과 절차의 범위를 알 수 없다.",
        "primaryProposal": "원래 식·빼야 할 식·잘못 구한 결과를 문장에서 구별하고, 원래 식을 복원하는 단계 중 한 부분을 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "어떤 식이라는 대상과 잘못 더한 결과를 명시했다. 역연산으로 처음 식을 복원한 뒤 바르게 빼는 두 단계 설명을 남기고 연산만 묻는다."
    },
    {
      "id": "m1-03-04-xc21",
      "grade": "m1",
      "chapter": "3. 방정식",
      "after": "같은 종류의 양을 서로 다른 단위로 나타냈으면 {같은 단위}로 바꾼 뒤 등식을 세운다. 예를 들어 길이끼리는 $\\mathrm{cm}$와 $\\mathrm{m}$를 맞추고, 시간끼리는 분과 시간을 맞춘다.",
      "completedDefinition": "같은 종류의 양을 서로 다른 단위로 나타냈으면 같은 단위로 바꾼 뒤 등식을 세운다. 예를 들어 길이끼리는 $\\mathrm{cm}$와 $\\mathrm{m}$를 맞추고, 시간끼리는 분과 시간을 맞춘다.",
      "studentSentence": "같은 종류의 양을 서로 다른 단위로 나타냈으면 □로 바꾼 뒤 등식을 세운다. 예를 들어 길이끼리는 $\\mathrm{cm}$와 $\\mathrm{m}$를 맞추고, 시간끼리는 분과 시간을 맞춘다.",
      "expectedAnswers": [
        "같은 단위"
      ],
      "blindResponse": {
        "id": "m1-03-04-xc21",
        "answers": [
          "같은 단위"
        ],
        "alternativeAnswers": [],
        "reason": "'하나의 단위'는 같은 뜻이다. 문장 안의 '단위'와 '맞추고'가 강한 단서여서 난도는 낮다. 내용은 타당하다."
      },
      "originalFinding": {
        "id": "m1-03-04-xc21",
        "grade": "m1",
        "section": "중1::3. 방정식::방정식과 그 해",
        "sourceHash": "0bab6e7021cda7d154bb9038462fdc525482ba1eb06e8c084e7961e7afd9a7b0",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "math-error",
        "student": "길이 · 시간처럼 단위가 다른 양은 □로 바꾼 뒤 □을 세운다.",
        "expected": [
          "같은 단위",
          "등식"
        ],
        "reason": "학생은 '같은 단위'와 '등식(방정식·식)'을 자연스럽게 쓸 수 있다. 다만 '길이·시간처럼 단위가 다른 양'은 길이와 시간을 서로 환산하라는 뜻으로도 읽힌다.",
        "proposal": "'같은 종류의 양인데 단위가 다르면(m와 cm, 시간과 분)'으로 고치고 방정식·식을 동의 답으로 인정한다.",
        "primaryReason": "길이·시간 각각에서 단위를 통일하라는 뜻으로 읽을 수 있지만, 문자 그대로는 길이와 시간을 같은 단위로 바꾸라는 안내이다. 차원이 다른 양은 서로 환산할 수 없으므로 같은 종류의 양에서 단위가 다르다는 조건을 명확히 하는 편이 좋다.",
        "primaryProposal": "같은 종류의 양에서 단위가 다른 예(길이의 m와 cm, 시간의 시간과 분)를 제시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "3 m와 2 s는 m·cm 또는 시간·분처럼 서로 환산할 수 없다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "길이와 시간을 서로 환산한다는 독해를 배제하고 같은 종류의 양 안에서 단위를 맞춤을 명시했다. 단위 통일과 등식 작성이라는 절차를 유지했다."
    },
    {
      "id": "m1-03-10-xc3",
      "grade": "m1",
      "chapter": "3. 방정식",
      "after": "$a\\%$는 {$\\frac{a}{100}$}이므로 어떤 양의 $a\\%$는 그 양에 이 비율을 곱해 구한다.",
      "completedDefinition": "$a\\%$는 $\\frac{a}{100}$이므로 어떤 양의 $a\\%$는 그 양에 이 비율을 곱해 구한다.",
      "studentSentence": "$a\\%$는 □이므로 어떤 양의 $a\\%$는 그 양에 이 비율을 곱해 구한다.",
      "expectedAnswers": [
        "$\\frac{a}{100}$"
      ],
      "blindResponse": {
        "id": "m1-03-10-xc3",
        "answers": [
          "$\\frac{a}{100}$"
        ],
        "alternativeAnswers": [],
        "reason": "유일하고 정확하다. m1-03-01-xc5와 문장이 완전히 같아 중복이다."
      },
      "originalFinding": {
        "id": "m1-03-10-xc3",
        "grade": "m1",
        "section": "중1::3. 방정식::일차방정식의 활용(증가와 감소, 원가와 정가)",
        "sourceHash": "c04f63c87dec78ec619c89d2fb339177780c515adbd2df539c8a262026a00002",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "answer-leak",
        "student": "$a\\%$는 □이므로 어떤 양의 $a\\%$는 그 양에 $\\frac{a}{100}$를 □ 구한다.",
        "expected": [
          "$\\frac{a}{100}$",
          "곱해"
        ],
        "reason": "m1-03-01-xc5와 같은 구조로, 첫 빈칸의 a/100이 뒤에 그대로 노출된다. 명료성 자체에는 문제가 없다.",
        "proposal": "중복되는 식을 한쪽에서 제거하거나 함께 가린다.",
        "primaryReason": "첫 빈칸의 a/100이 같은 문장 뒷부분에 그대로 표시되어 백분율을 분수로 고치는 답을 복사할 수 있다.",
        "primaryProposal": "같은 식을 중복 표시하지 않도록 한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "같은 답 a/100의 뒤 문장 반복을 이 비율로 바꾸었다. 백분율을 분수로 나타내고 기준량에 곱하는 기존 내용을 유지했다."
    },
    {
      "id": "m1-03-10-xc14",
      "grade": "m1",
      "chapter": "3. 방정식",
      "after": "처음 양보다 $a\\%$ 늘어난 뒤의 양이 주어지면, 처음 양을 $x$로 놓고 {$\\left(1+\\frac{a}{100}\\right)x$}가 늘어난 뒤의 양과 같다고 놓는다.",
      "completedDefinition": "처음 양보다 $a\\%$ 늘어난 뒤의 양이 주어지면, 처음 양을 $x$로 놓고 $\\left(1+\\frac{a}{100}\\right)x$가 늘어난 뒤의 양과 같다고 놓는다.",
      "studentSentence": "처음 양보다 $a\\%$ 늘어난 뒤의 양이 주어지면, 처음 양을 $x$로 놓고 □가 늘어난 뒤의 양과 같다고 놓는다.",
      "expectedAnswers": [
        "$\\left(1+\\frac{a}{100}\\right)x$"
      ],
      "blindResponse": {
        "id": "m1-03-10-xc14",
        "answers": [
          "$\\left(1+\\frac{a}{100}\\right)x$"
        ],
        "alternativeAnswers": [],
        "reason": "$x+\\frac{a}{100}x$는 동치식이다. 정확하다."
      },
      "originalFinding": {
        "id": "m1-03-10-xc14",
        "grade": "m1",
        "section": "중1::3. 방정식::일차방정식의 활용(증가와 감소, 원가와 정가)",
        "sourceHash": "1a03b8fb7836088f31564b9a46006a7110e115add6913883f1b35f7a17dc346d",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "늘어난 뒤의 양이 주어지면 처음 양을 $x$로 놓고 □가 그 양과 □고 놓는다.",
        "expected": [
          "$\\left(1+\\frac{a}{100}\\right)x$",
          "같다"
        ],
        "reason": "기대답 (1+a/100)x의 a와 'a% 증가'라는 조건이 학생 문장 어디에도 없다. 증가량인지 증가율인지, 어떤 문자를 쓸지 정할 수 없다(x+a도 가능).",
        "proposal": "문장 앞에 '처음 양이 a% 늘어난 뒤의 양이 주어지면'을 명시한다.",
        "primaryReason": "얼마나 늘어났는지, 문자 a가 무엇인지 학생 문장에 없다. 기대식은 증가율 a%를 전제로 하지만 남은 문장만으로는 증가량을 더할지 증가율을 곱할지 또는 어떤 문자를 써야 할지 정할 수 없다.",
        "primaryProposal": "처음 양이 a% 늘어났다는 조건을 빈칸 밖에 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "처음보다 a만큼 늘었다면 x+a이고, a% 늘었다면 (1+a/100)x이다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "증가율 a%를 명시하여 x+a 같은 증가량 해석을 배제했다. 미지수 x와 늘어난 뒤의 양의 관계를 완성된 방정식 설명으로 남겼다."
    },
    {
      "id": "m1-03-12-xc3",
      "grade": "m1",
      "chapter": "3. 방정식",
      "after": "삼각형의 넓이는 {$\\frac{1}{2}$}$\\times$(밑변)$\\times$(높이)이므로, 넓이가 주어지면 모르는 길이를 $x$로 놓고 방정식을 세운다.",
      "completedDefinition": "삼각형의 넓이는 $\\frac{1}{2}$$\\times$(밑변)$\\times$(높이)이므로, 넓이가 주어지면 모르는 길이를 $x$로 놓고 방정식을 세운다.",
      "studentSentence": "삼각형의 넓이는 □$\\times$(밑변)$\\times$(높이)이므로, 넓이가 주어지면 모르는 길이를 $x$로 놓고 방정식을 세운다.",
      "expectedAnswers": [
        "$\\frac{1}{2}$"
      ],
      "blindResponse": {
        "id": "m1-03-12-xc3",
        "answers": [
          "$\\frac{1}{2}$"
        ],
        "alternativeAnswers": [],
        "reason": "유일하다. 정확하다. '(밑변의 길이)'로 쓰면 더 엄밀하다."
      },
      "originalFinding": {
        "id": "m1-03-12-xc3",
        "grade": "m1",
        "section": "중1::3. 방정식::일차방정식의 활용(도형, 농도, 일)",
        "sourceHash": "aad03302583d0a735ae7006470c04ad564843144feca93d9f03925061fea7466",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "answer-leak",
        "student": "삼각형의 넓이는 $\\frac{1}{2}\\times$(밑변)$\\times$(높이)이므로 모르는 길이를 $x$로 놓고 □을 세운다. 이때 □을 빠뜨리지 않는다.",
        "expected": [
          "방정식",
          "$\\frac{1}{2}$"
        ],
        "reason": "둘째 빈칸의 1/2이 문장 첫머리 공식에 그대로 있다. 답은 정해지지만 회상 가치는 없다.",
        "proposal": "공식의 1/2을 가리거나 '이때 □을 빠뜨리지 않는다' 빈칸을 없앤다.",
        "primaryReason": "둘째 빈칸의 1/2이 문장 앞에 제시한 삼각형 넓이 공식에 그대로 남는다. 넓이의 절반 관계를 회상하지 않고 계수를 복사할 수 있다.",
        "primaryProposal": "공식과 계수 확인을 중복하지 않도록 빈칸을 재배치한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "삼각형의 넓이 공식을 한 번만 제시하고 계수 1/2를 그 자리에서 묻는다. 공식의 계수를 뒤에서 그대로 복사하는 빈칸과 범용 방정식 빈칸을 제거했다."
    },
    {
      "id": "m1-03-12-xc9",
      "grade": "m1",
      "chapter": "3. 방정식",
      "after": "직사각형의 둘레가 $L$이면 가로와 세로의 합은 {$\\frac{L}{2}$}이므로, 가로를 $x$로 놓으면 세로는 {$\\frac{L}{2}-x$}이다.",
      "completedDefinition": "직사각형의 둘레가 $L$이면 가로와 세로의 합은 $\\frac{L}{2}$이므로, 가로를 $x$로 놓으면 세로는 $\\frac{L}{2}-x$이다.",
      "studentSentence": "직사각형의 둘레가 $L$이면 가로와 세로의 합은 □이므로, 가로를 $x$로 놓으면 세로는 □이다.",
      "expectedAnswers": [
        "$\\frac{L}{2}$",
        "$\\frac{L}{2}-x$"
      ],
      "blindResponse": {
        "id": "m1-03-12-xc9",
        "answers": [
          "$\\frac{L}{2}$",
          "$\\frac{L}{2}-x$"
        ],
        "alternativeAnswers": [],
        "reason": "유일하다. 동치식은 허용한다. 정확하다. '둘레의 길이', '가로의 길이'로 쓰면 더 엄밀하다."
      },
      "originalFinding": {
        "id": "m1-03-12-xc9",
        "grade": "m1",
        "section": "중1::3. 방정식::일차방정식의 활용(도형, 농도, 일)",
        "sourceHash": "a8f990e298424ebabd4fc47619d2c9cec5c3714258e06af1a08b09f8e1674f62",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "missing-referent",
        "student": "둘레가 $L$이면 가로와 세로의 합은 □이므로 가로를 $x$로 놓으면 세로는 □이다.",
        "expected": [
          "$\\frac{L}{2}$",
          "$\\frac{L}{2}-x$"
        ],
        "reason": "'둘레·가로·세로'라는 표현으로 직사각형이 사실상 유일하게 정해지고, L/2와 L/2-x도 단일 답이다. prior의 우려는 실제 학생 혼란으로 이어지기 어렵다.",
        "proposal": "유지. 원하면 '직사각형의'를 덧붙인다.",
        "primaryReason": "가로·세로·둘레라는 관용적 표현으로 직사각형을 유추할 수는 있다. 다만 도형 이름이 없고 두 식은 직사각형의 둘레 공식을 전제로 하므로, 독립 문항에서도 대상을 명시할 필요가 있는지 검토한다.",
        "primaryProposal": "직사각형의 둘레가 L이라는 대상을 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "가로·세로라는 관용 단서에만 의존하지 않고 직사각형이라는 대상을 명시했다. 둘레의 절반과 가로를 뺀 세로의 식을 보존했다."
    },
    {
      "id": "m1-04-02-xc1",
      "grade": "m1",
      "chapter": "4. 그래프와 비례",
      "after": "$x$좌표와 $y$좌표가 모두 양수인 점들이 있는 부분을 {제$1$사분면}이라 한다.",
      "completedDefinition": "$x$좌표와 $y$좌표가 모두 양수인 점들이 있는 부분을 제$1$사분면이라 한다.",
      "studentSentence": "$x$좌표와 $y$좌표가 모두 양수인 점들이 있는 부분을 □이라 한다.",
      "expectedAnswers": [
        "제$1$사분면"
      ],
      "blindResponse": {
        "id": "m1-04-02-xc1",
        "answers": [
          "제$1$사분면"
        ],
        "alternativeAnswers": [],
        "reason": "유일하다. 정확하다."
      },
      "originalFinding": {
        "id": "m1-04-02-xc1",
        "grade": "m1",
        "section": "중1::4. 그래프와 비례::순서쌍과 좌표평면(응용)",
        "sourceHash": "08b5197974aa8e6e04afda0c7acc1dbd03ffdc2df6029ad1cd0704e4acd08cee",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "$x$좌표와 $y$좌표가 모두 □인 점들이 있는 부분을 □이라 한다.",
        "expected": [
          "양수",
          "제$1$사분면"
        ],
        "reason": "부호와 사분면 이름을 모두 가려 양수/제1사분면과 음수/제3사분면이 똑같이 참이다. 실제로 xc3이 사실상 같은 문장에 다른 답을 기대한다.",
        "proposal": "부호 또는 사분면 이름 중 하나를 문장에 남긴다.",
        "primaryReason": "두 좌표의 부호와 사분면 이름을 모두 빈칸으로 가려, 학생에게는 '두 좌표가 모두 □인 점들이 있는 부분'만 남는다. 양수와 제1사분면, 음수와 제3사분면은 서로 다른 내용인데 모두 문장을 참으로 완성한다.",
        "primaryProposal": "좌표의 부호 또는 사분면 이름 중 하나를 남기고 나머지를 묻는다.",
        "initialAlternativeAnswers": [
          "음수 / 제3사분면"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "두 좌표가 양수라는 조건을 노출하여 음수/제3사분면 쌍과 구별했다. 축 위의 점은 양수 조건을 만족하지 않는다."
    }
  ]
}