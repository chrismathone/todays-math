독립 최종 원고 검토입니다. 앞선 가림 풀이와 원래 감사 지적은 참고 자료이며 무조건 따르지 마세요. currentDefinition은 지금 적용된 정확한 최종 후보이며, firstBlind는 일부 수정 전 문장에 대한 답일 수 있습니다. 기대 답과 가림 답은 철자·조사·활용형이 아니라 의미로 대조하세요. 같은 의미의 동의어/동치식은 허용합니다. 수학적 진실, 초5·초6 또는 아래 학년 용어, 조건·연산·대상·순서, 0·1·부호·범위·도형 포함관계, 학생이 읽는 문장으로 서로 다른 참인 완성이 가능한지를 검토하세요. 기대 답을 넣은 완성 정의가 A/B/D형과 SRS에서 의미 있는 원래 개념 설명으로 남는지도 확인하세요. 정의를 풀어 설명한 단서나 쉬운 문제라는 사실만으로 revise하지 마세요. 일상적인 동의 표현과 임의의 더 약한 일반어(수, 도형, 값 등)를 별개 수학 답으로 잘못 세지 마세요. 하지만 서로 다른 표준 수학 내용의 답이 실제로 가능하면 revise하고 구체 반례와 바로 적용할 정확한 definition을 제안하세요. JSON만 반환: {"cases":[{"id":"...","verdict":"pass|revise","reason":"...","proposal":"..."}]}.

[
  {
    "id": "e5-1-5-1-xc7",
    "grade": "e5",
    "chapter": "1-5 분수의 덧셈과 뺄셈",
    "student": "분수를 더할 때 공통분모는 □ 그대로 둔다.",
    "currentDefinition": "분수를 더할 때 공통분모는 {더하지 않고} 그대로 둔다.",
    "expected": [
      "더하지 않고"
    ],
    "firstBlind": {
      "id": "e5-1-5-1-xc7",
      "answers": [
        "더하지 않고"
      ],
      "alternativeAnswers": [
        "바꾸지 않고",
        "건드리지 않고"
      ],
      "reason": "'그대로 둔다' 앞의 부사구 자리라 답이 하나로 정해지지 않는다. '바꾸지 않고'도 참이고 자연스럽다. '분자끼리만 더하고 분모는 □' 꼴로 고치면 '더하지 않고'로 수렴한다. 수학적 오류는 없다."
    },
    "originalFinding": {
      "id": "e5-1-5-1-xc7",
      "grade": "e5",
      "section": "초5::1-5 분수의 덧셈과 뺄셈::1-5-1 진분수의 덧셈",
      "sourceHash": "ef77ae0efe0f753f5a7e41df810e6b3e5b11f3d075a3d056d8928c7cf1eda60d",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "answer-leak",
      "student": "분수를 더할 때 공통분모는 □ 그대로 둔다.",
      "expected": [
        "더하지 않고"
      ],
      "reason": "'분수를 더할 때'와 '그대로 둔다' 사이에 들어갈 말은 '더하지 않고'로 자연스럽게 정해지고, 분모끼리 더하는 오개념도 겨냥한다. prior가 지적한 답 노출은 변별력 문제이지 명료성 결함이 아니다.",
      "proposal": "유지(선택적으로 '공통분모는 □ 않고 그대로 둔다'로 다듬을 수 있음).",
      "primaryReason": "학생문장: “분수를 더할 때 공통분모는 □ 그대로 둔다.” — 공통분모를 '그대로 둔다'는 남은 문장이 기대답 '더하지 않고'의 결론을 이미 보여 준다. 빈칸 뒤 표현만 읽어도 변화시키지 않는다는 답을 복원할 수 있다.",
      "primaryProposal": "분모를 어떻게 처리하는지 한 곳에서만 묻도록 중복 표현을 정리한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "분수 덧셈에서 공통분모를 더하지 않고 그대로 두는 명제는 정확하고 답도 '합하지 않고' 등 동의 표현이다. 뒤 단서는 명료성을 해치지 않는다."
  },
  {
    "id": "e5-1-5-2-xc2",
    "grade": "e5",
    "chapter": "1-5 분수의 덧셈과 뺄셈",
    "student": "분모가 같은 대분수를 더할 때는 통분하지 않고 자연수 부분끼리, 분수 부분끼리 □ 더한다.",
    "currentDefinition": "분모가 같은 대분수를 더할 때는 통분하지 않고 자연수 부분끼리, 분수 부분끼리 {각각} 더한다.",
    "expected": [
      "각각"
    ],
    "firstBlind": {
      "id": "e5-1-5-2-xc2",
      "answers": [
        "따로"
      ],
      "alternativeAnswers": [
        "각각",
        "따로따로",
        "나누어"
      ],
      "reason": "'각각/따로/나누어' 모두 같은 뜻으로 인정해야 한다. 빈칸을 지워도 문장이 완성되는 생략 가능한 부사라 개념 확인력이 약하다. 수학적으로는 정확하다."
    },
    "originalFinding": {
      "id": "e5-1-5-2-xc2",
      "grade": "e5",
      "section": "초5::1-5 분수의 덧셈과 뺄셈::1-5-2 대분수의 덧셈",
      "sourceHash": "e3f11d0e54533d2151fffcd1117c47017d347f5ee792e85c8089220b868be73b",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "grammar-blank",
      "student": "분모가 같은 대분수는 자연수 부분끼리, 분수 부분끼리 □ 더한다.",
      "expected": [
        "바로"
      ],
      "reason": "이 자리에 자연스러운 말은 '각각'이나 '따로'인데, 기대답 '바로'는 통분 없이라는 다른 뜻이다. 그 의도를 떠올릴 단서가 없어 학생이 기대답을 정할 수 없다.",
      "proposal": "'분모가 같은 대분수는 □하지 않고 자연수 부분끼리, 분수 부분끼리 더한다'처럼 통분 여부를 직접 묻는다.",
      "primaryReason": "학생문장: “분모가 같은 대분수는 자연수 부분끼리, 분수 부분끼리 □ 더한다.” — 자연수 부분끼리와 분수 부분끼리 더한다는 수학 내용이 모두 남고 부사 '바로'만 가려져 있다. 따로, 각각 등으로도 자연스럽게 읽혀 어떤 계산 지식을 요구하는지 분명하지 않다.",
      "primaryProposal": "통분 필요 여부나 더할 대상 부분을 빈칸으로 묻는다.",
      "initialAlternativeAnswers": [
        "각각",
        "따로"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "통분하지 않는 전제를 본문에 남기고 '바로' 대신 각각·따로라는 같은 의미의 절차 답으로 고쳤다."
  },
  {
    "id": "e5-1-5-3-xc3",
    "grade": "e5",
    "chapter": "1-5 분수의 덧셈과 뺄셈",
    "student": "분모가 다른 두 분수를 뺄 때 두 분모를 서로 □을 공통분모로 하여 통분해도 된다.",
    "currentDefinition": "분모가 다른 두 분수를 뺄 때 두 분모를 서로 {곱한 값}을 공통분모로 하여 통분해도 된다.",
    "expected": [
      "곱한 값"
    ],
    "firstBlind": {
      "id": "e5-1-5-3-xc3",
      "answers": [
        "곱한 값"
      ],
      "alternativeAnswers": [
        "곱한 것",
        "곱한 수"
      ],
      "reason": "'두 분모를 서로 ~'라는 구조상 '곱한 ~'으로 수렴하고 수학적으로 옳다. 조사 '을' 때문에 받침 있는 '값/것'만 문법에 맞고, 뜻이 같은 '곱한 수'는 조사가 어긋난다. 조사를 '을(를)'로 쓰거나 '곱한 수'도 인정해야 한다."
    },
    "originalFinding": {
      "id": "e5-1-5-3-xc3",
      "grade": "e5",
      "section": "초5::1-5 분수의 덧셈과 뺄셈::1-5-3 진분수의 뺄셈",
      "sourceHash": "6a8e78300cef797922197e17afef7d0122cc5f74b6db462a233e92a473be240e",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "□을 공통분모로 하여 뺄 수 있다.",
      "expected": [
        "두 분모의 곱"
      ],
      "reason": "공통분모 후보가 통째로 빈칸이고 '두 분모의 최소공배수', '공배수'도 똑같이 옳다. 조사 '을' 말고는 곱을 가리키는 단서가 없다.",
      "proposal": "'두 분모를 곱한 □을'로 바꾸거나 최소공배수도 정답으로 인정한다.",
      "primaryReason": "학생문장: “□을 공통분모로 하여 뺄 수 있다.” — 공통분모 선택 기준이 전혀 없어 두 분모의 곱과 최소공배수 중 무엇을 써야 하는지 알 수 없다. 서로 다른 값으로 같은 뺄셈을 계산할 수 있다.",
      "primaryProposal": "공통분모를 선택하는 방법이나 가장 작다는 기준을 명시한다.",
      "initialAlternativeAnswers": [
        "두 분모의 최소공배수"
      ],
      "initialCounterexample": "분모 4와 6은 24 또는 12로 통분할 수 있다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "곱을 만들 대상과 연산 구조를 남겨 최소공배수라는 다른 공통분모와 구별했다."
  },
  {
    "id": "e5-1-5-3-xc6",
    "grade": "e5",
    "chapter": "1-5 분수의 덧셈과 뺄셈",
    "student": "분수를 뺄 때 공통분모는 □ 그대로 둔다.",
    "currentDefinition": "분수를 뺄 때 공통분모는 {빼지 않고} 그대로 둔다.",
    "expected": [
      "빼지 않고"
    ],
    "firstBlind": {
      "id": "e5-1-5-3-xc6",
      "answers": [
        "빼지 않고"
      ],
      "alternativeAnswers": [
        "바꾸지 않고",
        "건드리지 않고"
      ],
      "reason": "e5-1-5-1-xc7과 같은 구조로 부사구 자리가 열려 있어 '바꾸지 않고'도 참이다. 덧셈 문항(xc7)과 짝이라 한쪽이 다른 쪽 답을 노출한다."
    },
    "originalFinding": {
      "id": "e5-1-5-3-xc6",
      "grade": "e5",
      "section": "초5::1-5 분수의 덧셈과 뺄셈::1-5-3 진분수의 뺄셈",
      "sourceHash": "119c99a1f6158c875d7fd7692f76781fc8a4909cae8e60a5e40aa84d39150785",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "answer-leak",
      "student": "분수를 뺄 때 공통분모는 □ 그대로 둔다.",
      "expected": [
        "빼지 않고"
      ],
      "reason": "'분수를 뺄 때 … 그대로 둔다' 사이의 답은 '빼지 않고'로 자연스럽게 정해진다. 답 노출은 난이도 문제이지 무엇을 쓸지 모르는 결함이 아니다.",
      "proposal": "유지.",
      "primaryReason": "학생문장: “분수를 뺄 때 공통분모는 □ 그대로 둔다.” — 공통분모를 '그대로 둔다'는 남은 문장이 기대답 '빼지 않고'의 결론을 이미 보여 준다. 수학 판단보다 바로 뒤 표현을 되풀이하게 된다.",
      "primaryProposal": "분모를 어떻게 처리하는지 한 곳에서만 묻도록 중복 표현을 정리한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "분수 뺄셈에서 공통분모를 빼지 않고 그대로 두는 명제는 정확하고 '차를 구하지 않고'는 동의 표현이다. 회상 단서가 답의 종류를 흔들지 않는다."
  },
  {
    "id": "e5-1-5-4-xc1",
    "grade": "e5",
    "chapter": "1-5 분수의 덧셈과 뺄셈",
    "student": "분모가 같은 대분수의 뺄셈에서 분수 부분끼리 뺄 수 있으면 자연수 부분끼리, 분수 부분끼리 □ 뺀다.",
    "currentDefinition": "분모가 같은 대분수의 뺄셈에서 분수 부분끼리 뺄 수 있으면 자연수 부분끼리, 분수 부분끼리 {따로} 뺀다.",
    "expected": [
      "따로"
    ],
    "firstBlind": {
      "id": "e5-1-5-4-xc1",
      "answers": [
        "따로"
      ],
      "alternativeAnswers": [
        "각각",
        "따로따로",
        "나누어"
      ],
      "reason": "동의 부사를 모두 인정해야 한다. 빈칸 없이도 문장이 성립해 변별력이 낮다. 주어(대분수의 뺄셈)가 없어 '분모가 같고'가 무엇의 분모인지 불분명하므로 '분모가 같은 대분수의 뺄셈에서'로 보완하는 것이 좋다."
    },
    "originalFinding": {
      "id": "e5-1-5-4-xc1",
      "grade": "e5",
      "section": "초5::1-5 분수의 덧셈과 뺄셈::1-5-4 대분수의 뺄셈",
      "sourceHash": "d02faee17725f1ae424e7d8988248be0e5021ff537aea45e31cceff706e4d27e",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "grammar-blank",
      "student": "분모가 같고 분수 부분끼리 뺄 수 있으면 자연수 부분끼리, 분수 부분끼리 □ 뺀다.",
      "expected": [
        "따로"
      ],
      "reason": "'따로'와 '각각'은 동의 표현이라 학생이 답할 수 있어 명확한 결함은 아니다. 다만 수학 내용이 없는 부사만 가려져 빈칸 위치가 약하다.",
      "proposal": "'각각' 등 동의어를 인정하고, 빈칸을 '분수 부분끼리 뺄 수 있으면' 같은 조건이나 대상 쪽으로 옮기는 것을 검토한다.",
      "primaryReason": "학생문장: “분모가 같고 분수 부분끼리 뺄 수 있으면 자연수 부분끼리, 분수 부분끼리 □ 뺀다.” — 부분끼리 빼라는 내용은 이미 완성되어 있고 빈칸은 '따로'라는 부사만 요구한다. 학생은 수학 개념보다 자연스러운 말 연결을 추측하게 된다.",
      "primaryProposal": "서로 빼는 부분 또는 통분 필요 여부를 묻도록 빈칸을 옮긴다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "대분수 뺄셈이라는 주어를 추가했다. 따로·각각은 같은 의미로 허용하며 기존 받아내림이 필요 없는 조건은 유지한다."
  },
  {
    "id": "e5-1-5-4-xc10",
    "grade": "e5",
    "chapter": "1-5 분수의 덧셈과 뺄셈",
    "student": "분수 부분을 통분하고, 필요하면 받아내린 뒤, 자연수 부분과 분수 부분을 □ 뺀다.",
    "currentDefinition": "분수 부분을 통분하고, 필요하면 받아내린 뒤, 자연수 부분과 분수 부분을 {각각} 뺀다.",
    "expected": [
      "각각"
    ],
    "firstBlind": {
      "id": "e5-1-5-4-xc10",
      "answers": [
        "따로"
      ],
      "alternativeAnswers": [
        "각각",
        "나누어",
        "따로따로"
      ],
      "reason": "'각각/따로' 동의어를 인정해야 한다. 생략 가능한 부사 자리라 답 종류가 약하게만 정해진다. '받아내린'은 학년 용어로 적절하다(자연수 부분에서 1을 받아내림)."
    },
    "originalFinding": {
      "id": "e5-1-5-4-xc10",
      "grade": "e5",
      "section": "초5::1-5 분수의 덧셈과 뺄셈::1-5-4 대분수의 뺄셈",
      "sourceHash": "88ad3bb22f4ad0ff507483c164ea425c45b7360d71ac799a311469b9a88d8e7b",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "grammar-blank",
      "student": "분수 부분을 통분하고, 필요하면 받아내린 뒤, 자연수 부분과 분수 부분을 □ 뺀다.",
      "expected": [
        "각각"
      ],
      "reason": "'각각'이나 '따로'로 자연스럽게 채워지므로 답을 못 정하는 문항은 아니다. 다만 절차의 핵심인 통분과 받아내림이 모두 노출되고 부사만 묻는다.",
      "proposal": "동의어를 인정하고, '필요하면 □한 뒤'처럼 받아내림 단계를 빈칸으로 하는 것을 검토한다.",
      "primaryReason": "학생문장: “분수 부분을 통분하고, 필요하면 받아내린 뒤, 자연수 부분과 분수 부분을 □ 뺀다.” — 받아내림과 두 부분의 뺄셈이라는 수학적 절차는 모두 노출되고 '각각'이라는 연결 부사만 비어 있다. 별도 수학 판단을 요구하는 지점이 없다.",
      "primaryProposal": "받아내림 조건이나 계산 대상 부분을 묻는다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "통분과 필요한 받아내림을 모두 마친 뒤 두 부분을 각각·따로 뺀다는 같은 절차로 수렴한다. 유효한 다른 연산이나 조건을 요구하지 않아 유지한다."
  },
  {
    "id": "e5-1-6-1-xc7",
    "grade": "e5",
    "chapter": "1-6 다각형의 둘레와 넓이",
    "student": "직사각형에서 마주 보는 두 변의 길이는 서로 □.",
    "currentDefinition": "직사각형에서 마주 보는 두 변의 길이는 서로 {같다}.",
    "expected": [
      "같다"
    ],
    "firstBlind": {
      "id": "e5-1-6-1-xc7",
      "answers": [
        "같다"
      ],
      "alternativeAnswers": [],
      "reason": "주어가 '길이'이므로 '같다'로 유일하게 정해진다. '평행하다'는 주어와 맞지 않아 배제된다. 수학적으로 정확하다."
    },
    "originalFinding": {
      "id": "e5-1-6-1-xc7",
      "grade": "e5",
      "section": "초5::1-6 다각형의 둘레와 넓이::1-6-1 정다각형과 사각형의 둘레",
      "sourceHash": "0d08d72d90a33d3b44c04120de6f8b0b35e286544f878056f19cde224b234da0",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "직사각형에서 마주 보는 두 변은 □.",
      "expected": [
        "길이가 같다"
      ],
      "reason": "둘레와 넓이 단원 맥락에서는 '길이가 같다'가 우선 떠오르지만 '서로 평행하다'도 배운 참인 성질이다. 서술어 전체가 빈칸이라 답의 종류가 문장만으로는 고정되지 않는다.",
      "proposal": "'마주 보는 두 변은 길이가 □'로 틀을 좁힌다.",
      "primaryReason": "학생문장: “직사각형에서 마주 보는 두 변은 □.” — 마주 보는 두 변의 어떤 성질을 답해야 하는지 지정하지 않았다. 길이가 같다는 성질과 서로 평행하다는 성질은 다른 수학 내용이며 모두 직사각형에서 성립한다.",
      "primaryProposal": "길이를 비교하는지 위치 관계를 묻는지 문장에 명시한다.",
      "initialAlternativeAnswers": [
        "서로 평행하다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "길이 비교라는 응답 범위를 남겨 평행이라는 다른 참인 성질과 구별했다."
  },
  {
    "id": "e5-1-6-1-xc8",
    "grade": "e5",
    "chapter": "1-6 다각형의 둘레와 넓이",
    "student": "정다각형의 둘레를 구하려면 한 변의 길이에 모든 변의 개수를 □. 따라서 먼저 변이 몇 개인지 센다.",
    "currentDefinition": "정다각형의 둘레를 구하려면 한 변의 길이에 모든 변의 개수를 {곱한다}. 따라서 먼저 변이 몇 개인지 센다.",
    "expected": [
      "곱한다"
    ],
    "firstBlind": {
      "id": "e5-1-6-1-xc8",
      "answers": [
        "변의 수"
      ],
      "alternativeAnswers": [
        "변의 개수",
        "꼭짓점의 수"
      ],
      "reason": "답 노출: 뒤 절 '먼저 변이 몇 개인지 센다'가 답을 그대로 알려 준다. '변의 개수'는 동의어로 인정한다. '꼭짓점의 수'도 값이 같아 수학적으로 참인 다른 완성이다."
    },
    "originalFinding": {
      "id": "e5-1-6-1-xc8",
      "grade": "e5",
      "section": "초5::1-6 다각형의 둘레와 넓이::1-6-1 정다각형과 사각형의 둘레",
      "sourceHash": "4202cf3fe07b2dd92ab96bc3828fe597bd1017e618606512c8830e1f055b7ef7",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "□를 구하려면 먼저 변의 수를 센다.",
      "expected": [
        "정다각형의 둘레"
      ],
      "reason": "단원 맥락과 '변의 수'로 둘레를 추론할 수는 있다. 그러나 '정다각형의'까지 써야 하는지, '한 변의 길이' 같은 다른 대상인지는 문장에서 정해지지 않는다.",
      "proposal": "'정다각형의 □를 구하려면 먼저 변의 수를 센다'로 도형명을 남긴다.",
      "primaryReason": "학생문장: “□를 구하려면 먼저 변의 수를 센다.” — 구할 대상과 도형 이름이 모두 빈칸이다. 변의 수를 세는 행위만으로 정다각형의 둘레를 구하는 상황인지, 둘레가 주어진 정다각형의 한 변을 구하는 상황인지 알 수 없다.",
      "primaryProposal": "정다각형의 둘레를 구한다는 상황을 남기고 필요한 정보를 묻는다.",
      "initialAlternativeAnswers": [
        "둘레가 주어진 정다각형의 한 변의 길이"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "세는 대상인 변의 수를 본문에 남기고 곱하는 연산만 묻게 해 꼭짓점의 수라는 값이 같은 다른 요소를 막았다."
  },
  {
    "id": "e5-1-6-1-xc21",
    "grade": "e5",
    "chapter": "1-6 다각형의 둘레와 넓이",
    "student": "정사각형의 한 변의 길이를 $2$배로 늘려 새 정사각형을 만들면 둘레도 □배가 된다.",
    "currentDefinition": "정사각형의 한 변의 길이를 $2$배로 늘려 새 정사각형을 만들면 둘레도 {$2$}배가 된다.",
    "expected": [
      "$2$"
    ],
    "firstBlind": {
      "id": "e5-1-6-1-xc21",
      "answers": [
        "2"
      ],
      "alternativeAnswers": [],
      "reason": "답은 2로 유일하다. 답 노출: 문장 안의 '2배'와 '둘레도'의 '도'가 같은 수임을 드러내 개념 없이도 맞힌다. '한 변을 2배로'는 '한 변의 길이를 2배로'가 정확하다. 문자 그대로 한 변만 늘리면 정사각형이 아니게 된다."
    },
    "originalFinding": {
      "id": "e5-1-6-1-xc21",
      "grade": "e5",
      "section": "초5::1-6 다각형의 둘레와 넓이::1-6-1 정다각형과 사각형의 둘레",
      "sourceHash": "924a0083a681333486d16a52ab642eea5dddec942041436c1ac660542c4e1d01",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "정사각형의 한 변을 $2$배로 늘리면 □도 $2$배가 된다.",
      "expected": [
        "둘레"
      ],
      "reason": "5학년 둘레·넓이 맥락에서 한 변이 2배일 때 함께 2배가 되는 양은 둘레가 자연스러운 단일 답이다(넓이는 4배). prior가 든 대각선 길이는 이 단원에서 학생이 떠올릴 양이 아니다.",
      "proposal": "유지.",
      "primaryReason": "학생문장: “정사각형의 한 변을 $2$배로 늘리면 □도 $2$배가 된다.” — 정사각형에서 함께 두 배가 되는 어떤 양을 묻는지 범위가 없다. 둘레와 대각선 길이는 서로 다른 측정량인데 모두 두 배가 된다.",
      "primaryProposal": "도형의 테두리 길이라는 단서를 남기거나 둘레의 배율을 묻는다.",
      "initialAlternativeAnswers": [
        "대각선의 길이"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "한 변만 변형하는 해석을 막도록 길이를 늘려 새 정사각형을 만든다고 명시했다."
  },
  {
    "id": "e5-1-6-2-xc14",
    "grade": "e5",
    "chapter": "1-6 다각형의 둘레와 넓이",
    "student": "넓이가 같은 두 직사각형의 둘레가 항상 같은 것은 □. 가로와 세로가 $6$과 $2$인 직사각형과 $4$와 $3$인 직사각형은 넓이는 같지만 둘레는 다르다.",
    "currentDefinition": "넓이가 같은 두 직사각형의 둘레가 항상 같은 것은 {아니다}. 가로와 세로가 $6$과 $2$인 직사각형과 $4$와 $3$인 직사각형은 넓이는 같지만 둘레는 다르다.",
    "expected": [
      "아니다"
    ],
    "firstBlind": {
      "id": "e5-1-6-2-xc14",
      "answers": [
        "다를 수 있다"
      ],
      "alternativeAnswers": [
        "같을 수 있다",
        "같을 수도 다를 수도 있다",
        "다르다(거짓)"
      ],
      "reason": "넓이 12인 3×4(둘레 14)와 2×6(둘레 16)은 둘레가 다르다. 그러나 3×4와 4×3처럼 합동이면 둘레가 같으므로 '같을 수 있다'도 참이다. 학생이 쓰기 쉬운 '다르다'는 전칭으로 거짓이다. 빈칸이 가능성 표현까지 요구하는지 드러나지 않으므로 '넓이가 같아도 둘레가 항상 같은 것은 □' 꼴로 고쳐야 한다."
    },
    "originalFinding": {
      "id": "e5-1-6-2-xc14",
      "grade": "e5",
      "section": "초5::1-6 다각형의 둘레와 넓이::1-6-2 1cm², 직사각형과 정사각형의 넓이",
      "sourceHash": "3b1854d75f149be3b844d82768cc30fe6e8da7e5937d178beffee875b247ace8",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "넓이가 같은 두 직사각형도 □.",
      "expected": [
        "둘레는 다를 수 있다"
      ],
      "reason": "결론 전체가 빈칸이어서 '모양이 다를 수 있다', '가로와 세로가 다를 수 있다', '합동이 아닐 수 있다'가 모두 자연스럽다. 둘레를 비교한다는 단서가 없다.",
      "proposal": "'넓이가 같은 두 직사각형도 □는 다를 수 있다'로 대상만 묻는다.",
      "primaryReason": "학생문장: “넓이가 같은 두 직사각형도 □.” — 넓이가 같은 직사각형의 어떤 다른 속성을 비교하는지 서술 전체가 비어 있다. 둘레가 다를 수 있음과 합동이 아닐 수 있음은 서로 다른 성질이다.",
      "primaryProposal": "둘레를 비교한다는 대상을 남기고 같음이 보장되는지를 묻는다.",
      "initialAlternativeAnswers": [
        "합동이 아닐 수 있다",
        "가로의 길이는 다를 수 있다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "항상 같음의 부정으로 질문을 고정하고 실제 반례를 남겨 같을 수 있다라는 다른 참인 완성을 막았다."
  },
  {
    "id": "e5-1-6-4-xc21",
    "grade": "e5",
    "chapter": "1-6 다각형의 둘레와 넓이",
    "student": "한 직선 위에 길이가 같은 밑변을 두고 그 직선과 평행한 다른 직선 위에 꼭짓점을 둔 삼각형들은 넓이가 서로 □.",
    "currentDefinition": "한 직선 위에 길이가 같은 밑변을 두고 그 직선과 평행한 다른 직선 위에 꼭짓점을 둔 삼각형들은 넓이가 서로 {같다}.",
    "expected": [
      "같다"
    ],
    "firstBlind": {
      "id": "e5-1-6-4-xc21",
      "answers": [
        "같다"
      ],
      "alternativeAnswers": [
        "모두 같다"
      ],
      "reason": "밑변의 길이와 높이가 같으므로 '같다'로 유일하고 수학적으로 정확하다. '꼭짓점'은 '나머지 한 꼭짓점'으로 쓰면 더 분명하다."
    },
    "originalFinding": {
      "id": "e5-1-6-4-xc21",
      "grade": "e5",
      "section": "초5::1-6 다각형의 둘레와 넓이::1-6-4 평행사변형과 삼각형의 넓이",
      "sourceHash": "7fe3c7eab6e715bf56d75bff67461fddadae3e89d5a0f6f8c7bdfd405d38fc29",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "한 직선 위에 길이가 같은 밑변을 두고 그 직선과 평행한 다른 직선 위에 꼭짓점을 둔 삼각형들은 □.",
      "expected": [
        "넓이가 같다"
      ],
      "reason": "밑변의 길이가 같고 평행선 사이에 있다는 조건을 모두 준 뒤 묻는 결론은 넓이 단원에서 '넓이가 같다'가 자연스러운 단일 답이다. prior가 든 '높이가 같다'는 그 결론의 중간 근거일 뿐이다.",
      "proposal": "유지(선택적으로 '삼각형들은 넓이가 □'로 다듬을 수 있음).",
      "primaryReason": "학생문장: “한 직선 위에 길이가 같은 밑변을 두고 그 직선과 평행한 다른 직선 위에 꼭짓점을 둔 삼각형들은 □.” — 평행한 직선 사이의 삼각형에 대해 무엇을 비교하는지 서술이 모두 비었다. 밑변에 대한 높이가 같다는 성질과 넓이가 같다는 결론은 서로 다른 수학 내용이지만 모두 성립한다.",
      "primaryProposal": "넓이를 비교하는지 높이를 비교하는지 대상을 본문에 명시한다.",
      "initialAlternativeAnswers": [
        "밑변에 대한 높이가 같다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "넓이 비교를 본문에 남겨 높이가 같다는 중간 근거와 정답을 구별했다. 밑변과 높이가 같은 조건은 보존했다."
  },
  {
    "id": "e5-1-6-5-xc14",
    "grade": "e5",
    "chapter": "1-6 다각형의 둘레와 넓이",
    "student": "마름모의 두 대각선과 평행한 변들로 네 꼭짓점에 꼭 맞게 둘러싼 직사각형의 넓이는 두 대각선의 곱이고, 마름모의 넓이는 그 □이다.",
    "currentDefinition": "마름모의 두 대각선과 평행한 변들로 네 꼭짓점에 꼭 맞게 둘러싼 직사각형의 넓이는 두 대각선의 곱이고, 마름모의 넓이는 그 {절반}이다.",
    "expected": [
      "절반"
    ],
    "firstBlind": {
      "id": "e5-1-6-5-xc14",
      "answers": [
        "절반"
      ],
      "alternativeAnswers": [
        "반",
        "$\\frac{1}{2}$"
      ],
      "reason": "'반', '1/2'은 동치로 인정한다. '두 대각선의 곱'은 '두 대각선의 길이의 곱'이 정확하다. 문장이 길지만 직사각형의 넓이와 대비되어 답은 수렴한다."
    },
    "originalFinding": {
      "id": "e5-1-6-5-xc14",
      "grade": "e5",
      "section": "초5::1-6 다각형의 둘레와 넓이::1-6-5 마름모와 사다리꼴의 넓이",
      "sourceHash": "44093f5bc3e73e06a5af11dfeedf0cd6216673f2cceed113cca8f2f38eab3ba6",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "math-error",
      "student": "마름모를 둘러싼 직사각형의 넓이는 두 대각선의 곱이고, 마름모는 그 □이다.",
      "expected": [
        "절반"
      ],
      "reason": "문장이 스스로 '넓이가 두 대각선의 곱인 직사각형'이라고 밝히므로 교과서 그림의 꼭 맞는 직사각형으로 읽히고 답은 절반(1/2)으로 정해진다. 임의의 큰 직사각형을 든 prior의 반례는 학생의 읽기와 거리가 멀어 수학적 오류로 보기 어렵다.",
      "proposal": "유지(선택적으로 '꼭 맞게 둘러싼'으로 다듬을 수 있음).",
      "primaryReason": "학생문장: “마름모를 둘러싼 직사각형의 넓이는 두 대각선의 곱이고, 마름모는 그 □이다.” — 마름모를 둘러싸는 직사각형의 위치와 변의 방향을 지정하지 않았는데 넓이가 항상 두 대각선의 곱이라고 단정한다. 각 꼭짓점을 지나며 변이 대각선과 평행한 특정 직사각형이라는 조건이나 그림이 필요하다.",
      "primaryProposal": "직사각형의 네 변이 마름모의 꼭짓점을 지나고 대각선과 평행하다는 조건을 명시한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": "대각선이 각각 2인 마름모를 한 변 3인 정사각형 안에 넣으면 둘러싼 직사각형 넓이는 9이고 대각선의 곱은 4이다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "임의의 둘러싼 직사각형에 일반화하지 않도록 꼭 맞음과 대각선 방향을 지정하고 도형 아닌 넓이를 비교하게 했다."
  },
  {
    "id": "e5-1-6-5-xc20",
    "grade": "e5",
    "chapter": "1-6 다각형의 둘레와 넓이",
    "student": "복잡한 도형을 넓이를 구할 수 있는 도형들로 겹치지 않게 나누면, 각 부분의 넓이를 모두 □ 전체 넓이를 구한다.",
    "currentDefinition": "복잡한 도형을 넓이를 구할 수 있는 도형들로 겹치지 않게 나누면, 각 부분의 넓이를 모두 {더해} 전체 넓이를 구한다.",
    "expected": [
      "더해"
    ],
    "firstBlind": {
      "id": "e5-1-6-5-xc20",
      "answers": [
        "더해"
      ],
      "alternativeAnswers": [
        "더하여",
        "더해서",
        "합하여"
      ],
      "reason": "활용형과 동의어를 인정하면 유일하다. '겹치지 않게' 조건이 있어 수학적으로 정확하다. '나누면 … 구한다'는 '나눈 뒤 … 구한다'가 더 자연스럽다."
    },
    "originalFinding": {
      "id": "e5-1-6-5-xc20",
      "grade": "e5",
      "section": "초5::1-6 다각형의 둘레와 넓이::1-6-5 마름모와 사다리꼴의 넓이",
      "sourceHash": "28ad52f58f34976d87501dbf21bb1084d12a0cd108a7d3b62a2d4c83746d9ed0",
      "status": "confirmed",
      "initialStatus": "needs_review",
      "category": "open-answer",
      "student": "복잡한 도형은 □으로 나누어 넓이를 더한다.",
      "expected": [
        "사다리꼴, 삼각형, 직사각형"
      ],
      "reason": "구체적인 도형 없이 세 도형의 목록을 그대로 요구하므로 몇 개를, 어떤 도형을 써야 하는지 정할 수 없다. '삼각형과 사각형', '넓이를 구할 수 있는 도형'도 타당하다. prior의 보류보다 결함이 분명하다고 본다.",
      "proposal": "'넓이를 구할 수 있는 □으로 나누어'처럼 일반 원리로 묻거나 도형을 제시한다.",
      "primaryReason": "학생문장: “복잡한 도형은 □으로 나누어 넓이를 더한다.” — 구체적 도형 없이 분할할 도형 이름의 목록을 통째로 요구한다. 삼각형만으로 나누거나 다른 조합을 쓰는 방법도 있어, 제시된 세 도형을 모두 답해야 할 근거가 약하다.",
      "primaryProposal": "실제 도형이나 분할 그림을 제공하거나 넓이를 구할 수 있는 도형으로 나눈다는 일반 원리로 묻는다.",
      "initialAlternativeAnswers": [
        "삼각형"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "그림 없이 특정 도형 세 개를 요구하지 않고 분할된 부분의 넓이를 합한다는 개념을 묻는다. 겹침과 빠짐을 막는 조건을 남겼다."
  },
  {
    "id": "e5-2-1-1-xc12",
    "grade": "e5",
    "chapter": "2-1 수의 범위와 어림하기",
    "student": "이상으로만 정해 위쪽 끝을 제한하지 않은 수의 범위에는 가장 큰 수가 □.",
    "currentDefinition": "이상으로만 정해 위쪽 끝을 제한하지 않은 수의 범위에는 가장 큰 수가 {없다}.",
    "expected": [
      "없다"
    ],
    "firstBlind": {
      "id": "e5-2-1-1-xc12",
      "answers": [
        "없다"
      ],
      "alternativeAnswers": [],
      "reason": "'○ 이상인 수'에는 가장 큰 수가 없으므로 '없다'로 유일하다. '위쪽 끝을 제한하지 않은'은 학년 용어로 다소 낯설지만 이해할 수 있다."
    },
    "originalFinding": {
      "id": "e5-2-1-1-xc12",
      "grade": "e5",
      "section": "초5::2-1 수의 범위와 어림하기::2-1-1 이상과 이하 알아보기",
      "sourceHash": "180d438644503dc60835dc46d0c8abeb8d34c6fb7a23ce048f40d1427f3b02ad",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "이상으로만 정한 범위에는 □.",
      "expected": [
        "가장 큰 수가 없다"
      ],
      "reason": "'이상으로만'의 '만'이 위쪽 끝이 없음을 암시해 기대답 방향을 추론할 수 있다. 그래도 서술어 전체가 빈칸이라 '기준 수가 포함된다', '수가 끝없이 많다'도 들어간다.",
      "proposal": "'이상으로만 정한 범위에는 가장 큰 수가 □'로 틀을 좁힌다.",
      "primaryReason": "학생문장: “이상으로만 정한 범위에는 □.” — 이상으로 정한 범위의 어떤 속성을 묻는지 서술 전체가 비었다. 가장 큰 수의 유무와 기준 수의 포함 여부는 서로 다른 핵심 성질이고 둘 다 답이 된다.",
      "primaryProposal": "가장 큰 수가 있는지를 묻는 틀을 남긴다.",
      "initialAlternativeAnswers": [
        "기준 수가 포함된다",
        "기준 수보다 작은 수가 없다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "위쪽 끝과 최댓값 존재를 본문에 남겨 포함 여부나 개수에 관한 다른 결론을 막았다."
  },
  {
    "id": "e5-2-1-3-xc15",
    "grade": "e5",
    "chapter": "2-1 수의 범위와 어림하기",
    "student": "여러 사람의 총요금을 구하려면 사람마다 범위를 찾아 요금을 정한 뒤 □.",
    "currentDefinition": "여러 사람의 총요금을 구하려면 사람마다 범위를 찾아 요금을 정한 뒤 {모두 더한다}.",
    "expected": [
      "모두 더한다"
    ],
    "firstBlind": {
      "id": "e5-2-1-3-xc15",
      "answers": [
        "모두 더한다"
      ],
      "alternativeAnswers": [
        "더한다",
        "합한다",
        "합을 구한다",
        "같은 요금끼리 묶어 곱한 뒤 더한다"
      ],
      "reason": "문장 끝이 열려 있어 표현이 다양하지만 뜻은 '합'으로 수렴하므로 동의 표현을 넓게 인정해야 한다. '범위를 찾아'는 '나이(조건)가 속하는 범위를 찾아'처럼 대상을 밝히면 좋다."
    },
    "originalFinding": {
      "id": "e5-2-1-3-xc15",
      "grade": "e5",
      "section": "초5::2-1 수의 범위와 어림하기::2-1-3 수의 범위를 알고 문제 해결하기",
      "sourceHash": "ae61276b8455dc7a4a91a3ed72d7127e54511eae2d03b1d148306125bc58336b",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "사람마다 범위를 찾아 요금을 정한 뒤 □.",
      "expected": [
        "모두 더한다"
      ],
      "reason": "'사람마다 요금을 정한 뒤'에 이어지는 단계는 자연스럽게 '모두 더한다(합을 구한다)'로 모인다. prior가 든 대안은 인위적이다.",
      "proposal": "유지(선택적으로 '전체 요금은'을 덧붙일 수 있음).",
      "primaryReason": "학생문장: “사람마다 범위를 찾아 요금을 정한 뒤 □.” — 사람별 요금을 정한 뒤 무엇을 구하려는지 목표가 없다. 전체 요금을 구한다면 합해야 하지만 각자 낼 요금을 안내하거나 서로 비교하는 과제도 가능하다.",
      "primaryProposal": "전체 요금의 합을 구하는 상황이라는 목표를 제시한다.",
      "initialAlternativeAnswers": [
        "각자 낼 금액을 알려 준다",
        "가장 비싼 요금을 찾는다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "총요금을 구하는 목표를 명시해 요금만 정한 뒤 가능한 다른 행동을 배제했다."
  },
  {
    "id": "e5-2-1-3-xc23",
    "grade": "e5",
    "chapter": "2-1 수의 범위와 어림하기",
    "student": "양쪽 경계가 자연수이고 경계의 포함 여부가 정해진 범위에 자연수가 한 개 이상 들어 있으면, 한쪽 경계와 그 개수로 □를 거꾸로 찾을 수 있다.",
    "currentDefinition": "양쪽 경계가 자연수이고 경계의 포함 여부가 정해진 범위에 자연수가 한 개 이상 들어 있으면, 한쪽 경계와 그 개수로 {다른 쪽 경계 수}를 거꾸로 찾을 수 있다.",
    "expected": [
      "다른 쪽 경계 수"
    ],
    "firstBlind": {
      "id": "e5-2-1-3-xc23",
      "answers": [
        "다른 쪽 경계"
      ],
      "alternativeAnswers": [
        "나머지 경계",
        "반대쪽 경계",
        "다른 한쪽 경계의 수"
      ],
      "reason": "표현만 다르고 뜻은 하나다. 개수가 1 이상이면 수학적으로 참이다(예: 5 이상 □ 미만에 자연수 4개 → 9). 개수가 0이면 유일하지 않다. '5 초과 □ 미만'에 0개이면 □는 5도 6도 가능하므로 '개수가 1개 이상일 때' 조건이 필요하다."
    },
    "originalFinding": {
      "id": "e5-2-1-3-xc23",
      "grade": "e5",
      "section": "초5::2-1 수의 범위와 어림하기::2-1-3 수의 범위를 알고 문제 해결하기",
      "sourceHash": "9d6c673822efd15c43194951a8c10507a55a281a1f62cc09acadf03b1e89214b",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "math-error",
      "student": "한쪽 경계와 범위에 드는 자연수의 개수를 알면 □를 거꾸로 찾을 수 있다.",
      "expected": [
        "모르는 경계 수"
      ],
      "reason": "한쪽 경계와 개수를 알 때 거꾸로 찾는 대상은 '다른 쪽 경계'로 자연스럽게 정해진다. 경계가 자연수가 아닌 경우를 든 prior의 반례는 초등 문제 상황 밖의 형식적 지적이라 수학적 오류로 보지 않는다.",
      "proposal": "유지(선택적으로 '경계가 자연수일 때'를 덧붙일 수 있음).",
      "primaryReason": "학생문장: “한쪽 경계와 범위에 드는 자연수의 개수를 알면 □를 거꾸로 찾을 수 있다.” — 다른 경계가 자연수인지와 경계 포함 방식 등의 조건 없이 한쪽 경계와 자연수 개수만으로 다른 경계 수를 역으로 정할 수 있다고 서술한다. 일반 수의 범위에서는 경계가 하나로 정해지지 않는다.",
      "primaryProposal": "양쪽 경계의 수 종류와 이상·이하·초과·미만 조건을 모두 명시한 구체적 문제로 바꾼다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": "1 이상 3.2 이하와 1 이상 3.8 이하는 한쪽 경계 1과 포함 자연수 3개가 같지만 다른 경계는 다르다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "빈 범위에서는 모르는 경계가 여러 개일 수 있으므로 한 개 이상 조건을 추가했다. 자연수 경계와 포함 여부 조건도 유지한다."
  },
  {
    "id": "e5-2-1-4-xc11",
    "grade": "e5",
    "chapter": "2-1 수의 범위와 어림하기",
    "student": "올림은 나타낼 자리 아래에 $0$이 아닌 숫자가 있으면 나타낼 자리의 수를 □만큼 올린다.",
    "currentDefinition": "올림은 나타낼 자리 아래에 $0$이 아닌 숫자가 있으면 나타낼 자리의 수를 {$1$}만큼 올린다.",
    "expected": [
      "$1$"
    ],
    "firstBlind": {
      "id": "e5-2-1-4-xc11",
      "answers": [
        "1"
      ],
      "alternativeAnswers": [
        "하나"
      ],
      "reason": "답은 1로 유일하다. 아래 자리를 0으로 바꾼다는 내용과 나타낼 자리 숫자가 9일 때의 받아올림은 생략되었으나 '1만큼 올린다'는 진술 자체는 옳다. '나타낼 자리 아래에'는 '구하려는 자리 아래 수'가 교과서 표현에 가깝다."
    },
    "originalFinding": {
      "id": "e5-2-1-4-xc11",
      "grade": "e5",
      "section": "초5::2-1 수의 범위와 어림하기::2-1-4 올림 알아보기",
      "sourceHash": "6dc59b9390b1fab3aa85170b308ba92f158c07cbf8b781aaae1f81ee30a87b76",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "math-error",
      "student": "올림은 나타낼 자리 아래 숫자가 □ 있으면 올린다.",
      "expected": [
        "$1$이라도"
      ],
      "reason": "'숫자가 1이라도 있으면'은 숫자 1이 있다는 뜻으로도 읽힌다. 학생은 '0이 아닌 수가'처럼 뜻은 같지만 형태가 다른 답을 쓰기 쉬워 기대 표현을 예측하기 어렵다.",
      "proposal": "'아래 자리에 0이 아닌 숫자가 □ 있으면 올린다(하나라도)'처럼 원문 표현을 고친다.",
      "primaryReason": "학생문장: “올림은 나타낼 자리 아래 숫자가 □ 있으면 올린다.” — 기대답을 넣으면 아래 자리 숫자가 '1이라도 있으면' 올린다는 표현이다. 0이 아닌 숫자가 하나라도 있다는 뜻인지 숫자 1의 존재를 말하는지 초등학생에게 다르게 읽힐 수 있다.",
      "primaryProposal": "0이 아닌 숫자가 하나라도 있다는 조건을 명시하는 방향으로 검토한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": "42를 십의 자리까지 올릴 때 아래 숫자는 2이고 숫자 1은 없지만 올림해야 한다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "숫자 1이 있어야 한다는 오독을 없애고 0이 아닌 숫자 조건은 남긴 채 증가량을 짧게 묻는다."
  },
  {
    "id": "e5-2-1-6-xc10",
    "grade": "e5",
    "chapter": "2-1 수의 범위와 어림하기",
    "student": "반올림할 때 남길 자리 바로 아래 숫자가 정확히 $5$이면 남길 자리의 수를 □만큼 올린다.",
    "currentDefinition": "반올림할 때 남길 자리 바로 아래 숫자가 정확히 $5$이면 남길 자리의 수를 {$1$}만큼 올린다.",
    "expected": [
      "$1$"
    ],
    "firstBlind": {
      "id": "e5-2-1-6-xc10",
      "answers": [
        "올림"
      ],
      "alternativeAnswers": [
        "올림(올린다)",
        "반올림(동어반복)"
      ],
      "reason": "의도한 답은 '올림'으로 보이지만 '남길 자리에서 올림한다'는 용어가 어긋난다. 교과서에서 '○의 자리에서 반올림'은 버려지는 자리를 가리키고, 올림은 '○의 자리까지 나타낸다'고 쓴다. '남길 자리의 숫자를 1 올린다' 또는 '5이면 버리지 않고 □'로 고쳐야 한다. '정확히 5'는 6~9와 구별하려는 뜻이나 불필요한 특수화로 읽힐 수 있다."
    },
    "originalFinding": {
      "id": "e5-2-1-6-xc10",
      "grade": "e5",
      "section": "초5::2-1 수의 범위와 어림하기::2-1-6 반올림 알아보기와 어림의 활용",
      "sourceHash": "531c8f1b460ec6aad65b4a77c409e933b379123274ed7c7c06d6b3c7bd45ff99",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "살필 자리의 숫자가 정확히 $5$이면 □.",
      "expected": [
        "올린다"
      ],
      "reason": "'정확히 5'라는 단서로 반올림을 추론할 수 있어 답은 대체로 '올린다'로 모인다. 그러나 같은 단원에 올림과 버림이 함께 있고 문장에 어림 방법이 없다.",
      "proposal": "문두에 '반올림에서'를 넣는다.",
      "primaryReason": "학생문장: “살필 자리의 숫자가 정확히 $5$이면 □.” — 살필 자리가 어느 어림 방법의 어느 자리인지 나타나 있지 않다. 5이면 올린다는 판단은 반올림 상황에서만 고를 수 있고 버림 상황이라면 버린다.",
      "primaryProposal": "반올림에서 남길 자리 바로 아래 숫자를 살핀다는 조건을 남긴다.",
      "initialAlternativeAnswers": [
        "버린다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "남길 자리에서 올림한다는 어색한 표현 대신 증가량 1을 명확히 묻는다."
  },
  {
    "id": "e5-2-2-2-xc5",
    "grade": "e5",
    "chapter": "2-2 분수의 곱셈",
    "student": "자연수와 분수를 곱할 때 자연수가 그 분수의 분모의 □이면 곱은 자연수가 된다.",
    "currentDefinition": "자연수와 분수를 곱할 때 자연수가 그 분수의 분모의 {배수}이면 곱은 자연수가 된다.",
    "expected": [
      "배수"
    ],
    "firstBlind": {
      "id": "e5-2-2-2-xc5",
      "answers": [
        "배수"
      ],
      "alternativeAnswers": [],
      "reason": "'배수'로 유일하다. '약수'는 반례가 있다(2×1/4=1/2). 충분조건 진술로서 참이다. 필요조건은 아니지만(3×2/6=1) 문장은 그렇게 주장하지 않는다."
    },
    "originalFinding": {
      "id": "e5-2-2-2-xc5",
      "grade": "e5",
      "section": "초5::2-2 분수의 곱셈::2-2-2 (자연수)×(분수)의 계산",
      "sourceHash": "efefe7a1a9970abc5631ce1a3563b17b09ebffd64175023b68876381ec313070",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "□이면 곱은 자연수가 된다.",
      "expected": [
        "자연수가 분모의 배수"
      ],
      "reason": "조건절 전체가 빈칸이고 어떤 곱인지(자연수×분수)도 문장에 없다. 그래서 기대답의 '분모'가 가리킬 대상이 없다.",
      "proposal": "'(자연수)×(분수)에서 자연수가 분모의 □이면 곱은 자연수가 된다'로 상황을 남긴다.",
      "primaryReason": "학생문장: “□이면 곱은 자연수가 된다.” — 곱하는 두 수가 자연수와 분수인지조차 학생문장에 없다. 자연수가 분모의 배수라는 기대 조건의 '분모'가 가리킬 대상이 없고 자연수끼리의 곱 등 다른 조건도 성립한다.",
      "primaryProposal": "자연수와 분수를 곱하는 상황과 묻는 조건의 대상을 명시한다.",
      "initialAlternativeAnswers": [
        "두 수가 모두 자연수"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "곱의 두 대상과 분모의 소속을 명시하고 조건절 전체 대신 배수 관계만 묻는다."
  },
  {
    "id": "e5-2-2-4-xc9",
    "grade": "e5",
    "chapter": "2-2 분수의 곱셈",
    "student": "대분수끼리의 곱은 두 대분수의 자연수 부분끼리의 곱보다 □.",
    "currentDefinition": "대분수끼리의 곱은 두 대분수의 자연수 부분끼리의 곱보다 {크다}.",
    "expected": [
      "크다"
    ],
    "firstBlind": {
      "id": "e5-2-2-4-xc9",
      "answers": [
        "크다"
      ],
      "alternativeAnswers": [
        "항상 크다"
      ],
      "reason": "대분수는 자연수 부분이 1 이상이고 분수 부분이 0보다 크므로 (a+p)(b+q)>ab가 항상 성립한다. '크다'로 유일하고 정확하다."
    },
    "originalFinding": {
      "id": "e5-2-2-4-xc9",
      "grade": "e5",
      "section": "초5::2-2 분수의 곱셈::2-2-4 여러 가지 분수의 곱셈",
      "sourceHash": "583f785e70f40404d1aa798150e7c3cd2fe659882cdab01bdaeaef7556ae7757",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "대분수끼리의 곱은 □보다 크다.",
      "expected": [
        "자연수 부분끼리의 곱"
      ],
      "reason": "비교 대상이 통째로 빈칸이다. '곱하는 두 대분수 각각(원래 수)'보다 크다는 것도 이 단원의 표준 성질이어서 서로 다른 답이 성립한다.",
      "proposal": "'대분수끼리의 곱은 □ 부분끼리의 곱보다 크다'로 좁힌다.",
      "primaryReason": "학생문장: “대분수끼리의 곱은 □보다 크다.” — 곱과 비교할 기준량을 통째로 가렸다. 자연수 부분끼리의 곱 외에 각각의 대분수도 항상 더 작으므로 서로 다른 비교 명제가 성립한다.",
      "primaryProposal": "자연수 부분끼리의 곱과 비교한다는 대상을 남기고 대소 관계를 묻는다.",
      "initialAlternativeAnswers": [
        "각각의 대분수"
      ],
      "initialCounterexample": "1과 1/2, 2와 1/2의 곱 3과 3/4은 자연수 부분의 곱 2보다도, 원래 두 대분수 각각보다도 크다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "비교 대상을 자연수 부분의 곱으로 남겨 원래 대분수와 비교하는 다른 참인 명제와 구별했다."
  },
  {
    "id": "e5-2-2-4-xc14",
    "grade": "e5",
    "chapter": "2-2 분수의 곱셈",
    "student": "분수 세 개를 곱할 때 어느 두 수를 먼저 곱해도 결과가 같다. 계산을 간단히 하려면 분자와 분모가 잘 □되는 두 수를 먼저 곱한다.",
    "currentDefinition": "분수 세 개를 곱할 때 어느 두 수를 먼저 곱해도 결과가 같다. 계산을 간단히 하려면 분자와 분모가 잘 {약분}되는 두 수를 먼저 곱한다.",
    "expected": [
      "약분"
    ],
    "firstBlind": {
      "id": "e5-2-2-4-xc14",
      "answers": [
        "약분"
      ],
      "alternativeAnswers": [],
      "reason": "'분자와 분모가 잘 □되는'에는 '약분'만 자연스럽다. 앞 문장(곱하는 순서를 바꾸어도 결과가 같음)도 옳다."
    },
    "originalFinding": {
      "id": "e5-2-2-4-xc14",
      "grade": "e5",
      "section": "초5::2-2 분수의 곱셈::2-2-4 여러 가지 분수의 곱셈",
      "sourceHash": "26849739891e3252a3693d235c64aaba9fedcb9b0c951e3d4c71e662dcbd54a7",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "세 수의 곱은 □를 먼저 곱해도 결과가 같다.",
      "expected": [
        "약분이 잘 되는 두 수"
      ],
      "reason": "수학적으로 가장 자연스러운 답은 '어느 두 수'나 '뒤의 두 수'다. 기대답의 '약분이 잘 되는'이라는 편의 기준을 떠올릴 단서가 없다.",
      "proposal": "'계산을 쉽게 하려면 □이 잘 되는 두 수를 먼저 곱한다'처럼 목적을 본문에 남긴다.",
      "primaryReason": "학생문장: “세 수의 곱은 □를 먼저 곱해도 결과가 같다.” — 먼저 곱할 두 수의 선택 기준이 제시되지 않았다. 약분이 잘 되는 두 수뿐 아니라 앞의 두 수, 뒤의 두 수, 임의의 두 수를 먼저 곱해도 결과는 같아 특정 편의 기준을 회상할 단서가 없다.",
      "primaryProposal": "약분을 쉽게 하는 계산 순서를 묻거나 결합 순서를 바꿔도 된다는 일반 성질로 묻는다.",
      "initialAlternativeAnswers": [
        "어떤 두 수",
        "앞의 두 수"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "결합 순서의 자유는 본문에 보존하고 편리한 순서를 선택하는 기준이 약분임을 짧게 묻는다."
  },
  {
    "id": "e5-2-3-2-xc7",
    "grade": "e5",
    "chapter": "2-3 합동과 대칭",
    "student": "서로 합동인 두 도형에서 모르는 변의 길이는 그 □의 길이와 같으므로 알 수 있다.",
    "currentDefinition": "서로 합동인 두 도형에서 모르는 변의 길이는 그 {대응변}의 길이와 같으므로 알 수 있다.",
    "expected": [
      "대응변"
    ],
    "firstBlind": {
      "id": "e5-2-3-2-xc7",
      "answers": [
        "대응변"
      ],
      "alternativeAnswers": [
        "대응하는 변"
      ],
      "reason": "'대응변/대응하는 변'으로 유일하고 정확하다. xc8과 짝이지만 문장 안에 답이 드러나지는 않는다."
    },
    "originalFinding": {
      "id": "e5-2-3-2-xc7",
      "grade": "e5",
      "section": "초5::2-3 합동과 대칭::2-3-2 합동인 도형의 성질 알아보기",
      "sourceHash": "89c1887e107c814fa77f947df06de17fc813dbf71c9a5cabd9e5624ec0e9a43c",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "모르는 변의 길이는 □를 보고 알 수 있다.",
      "expected": [
        "그 대응변의 길이"
      ],
      "reason": "합동과 대칭 단원 맥락에서는 답이 '대응변(의 길이)'로 모여 답을 못 정하는 문항은 아니다. 다만 문장만으로는 합동이라는 전제가 없어 일반적 진술처럼 읽힌다.",
      "proposal": "문두에 '합동인 두 도형에서'를 넣는다.",
      "primaryReason": "학생문장: “모르는 변의 길이는 □를 보고 알 수 있다.” — 도형이나 합동 관계가 제시되지 않아 어떤 변의 길이를 보고 모르는 변을 정할 수 있는지 알 수 없다. 대응변 길이가 같다는 결론에는 합동 등 조건이 필요하다.",
      "primaryProposal": "합동인 두 도형이라는 조건과 모르는 변을 명시한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "합동 전제를 명시하고 길이를 주는 대상이 대응변임을 묻는다."
  },
  {
    "id": "e5-2-3-2-xc8",
    "grade": "e5",
    "chapter": "2-3 합동과 대칭",
    "student": "서로 합동인 두 도형에서 모르는 각의 크기는 그 □의 크기와 같으므로 알 수 있다.",
    "currentDefinition": "서로 합동인 두 도형에서 모르는 각의 크기는 그 {대응각}의 크기와 같으므로 알 수 있다.",
    "expected": [
      "대응각"
    ],
    "firstBlind": {
      "id": "e5-2-3-2-xc8",
      "answers": [
        "대응각"
      ],
      "alternativeAnswers": [
        "대응하는 각"
      ],
      "reason": "'대응각/대응하는 각'으로 유일하고 정확하다."
    },
    "originalFinding": {
      "id": "e5-2-3-2-xc8",
      "grade": "e5",
      "section": "초5::2-3 합동과 대칭::2-3-2 합동인 도형의 성질 알아보기",
      "sourceHash": "a6b8c75b77241714cde03e1a90da6882c541c9c8f277a080a6ff9f7e647d8895",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "모르는 각의 크기는 □를 보고 알 수 있다.",
      "expected": [
        "그 대응각의 크기"
      ],
      "reason": "단원 맥락상 '대응각(의 크기)'로 답이 모인다. 다만 합동 전제가 문장에 없어 응답 틀이 느슨하다.",
      "proposal": "문두에 '합동인 두 도형에서'를 넣는다.",
      "primaryReason": "학생문장: “모르는 각의 크기는 □를 보고 알 수 있다.” — 어떤 도형의 어떤 각인지와 합동 관계가 남아 있지 않다. 대응각의 크기가 같다는 성질을 쓸 수 있는 상황인지 학생문장만으로 판단할 수 없다.",
      "primaryProposal": "합동인 두 도형에서 대응하는 각을 찾는 상황을 명시한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "합동 전제를 명시하고 각의 크기를 주는 대상이 대응각임을 묻는다."
  },
  {
    "id": "e5-2-3-2-xc19",
    "grade": "e5",
    "chapter": "2-3 합동과 대칭",
    "student": "이등변삼각형과 합동인 삼각형도 두 변의 길이가 서로 □.",
    "currentDefinition": "이등변삼각형과 합동인 삼각형도 두 변의 길이가 서로 {같다}.",
    "expected": [
      "같다"
    ],
    "firstBlind": {
      "id": "e5-2-3-2-xc19",
      "answers": [
        "같다"
      ],
      "alternativeAnswers": [],
      "reason": "합동이면 대응변의 길이가 같으므로 합동인 삼각형도 이등변삼각형이다. '같다'로 유일하다. 이등변삼각형의 정의만으로 맞힐 수 있어 합동 개념 확인력은 약하다."
    },
    "originalFinding": {
      "id": "e5-2-3-2-xc19",
      "grade": "e5",
      "section": "초5::2-3 합동과 대칭::2-3-2 합동인 도형의 성질 알아보기",
      "sourceHash": "f1cf99be9c4254e12f4d1f42dff6437c7fc7ccd7ea2b147ba0b8dbc4a7c61d52",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "open-answer",
      "student": "이등변삼각형과 합동인 삼각형도 □가 같다.",
      "expected": [
        "두 변의 길이"
      ],
      "reason": "정의 회상으로 '두 변의 길이'가 우선이지만 '두 각의 크기'도 참이다. 게다가 무엇과 같다는 것인지 불분명해 '대응변의 길이'나 '넓이'처럼 원래 삼각형과 견주는 답도 나올 수 있다.",
      "proposal": "'이등변삼각형과 합동인 삼각형도 두 □의 길이가 서로 같다'로 좁힌다.",
      "primaryReason": "학생문장: “이등변삼각형과 합동인 삼각형도 □가 같다.” — 이등변삼각형의 어떤 성질을 답해야 하는지 한정하지 않았다. 두 변의 길이와 두 밑각의 크기는 서로 다른 속성이며 합동인 삼각형에도 모두 성립한다. 다만 이등변삼각형의 학습한 정의를 직접 회상하는 문항으로 해석할 수 있어 보류한다.",
      "primaryProposal": "변의 길이를 묻는지 각의 크기를 묻는지 명시한다.",
      "initialAlternativeAnswers": [
        "두 밑각의 크기"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "두 변의 길이를 본문에 남겨 두 각·대응변·넓이 등 다른 비교량과 구별했다."
  },
  {
    "id": "e5-2-3-3-xc10",
    "grade": "e5",
    "chapter": "2-3 합동과 대칭",
    "student": "직사각형도 마름모도 아닌 평행사변형은 선대칭도형이 □.",
    "currentDefinition": "직사각형도 마름모도 아닌 평행사변형은 선대칭도형이 {아니다}.",
    "expected": [
      "아니다"
    ],
    "firstBlind": {
      "id": "e5-2-3-3-xc10",
      "answers": [
        "아니다"
      ],
      "alternativeAnswers": [
        "될 수 없다"
      ],
      "reason": "선대칭인 평행사변형은 직사각형이거나 마름모이므로 진술이 참이고, 포함관계 처리가 정확하다. '아니다'로 수렴한다."
    },
    "originalFinding": {
      "id": "e5-2-3-3-xc10",
      "grade": "e5",
      "section": "초5::2-3 합동과 대칭::2-3-3 선대칭도형과 그 성질 알아보기",
      "sourceHash": "b5d22e28103bbe0333bde6a95abefedf22a901b51f38bff7e17c5f812ce8b93e",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "open-answer",
      "student": "직사각형도 마름모도 아닌 평행사변형은 □.",
      "expected": [
        "선대칭도형이 아니다"
      ],
      "reason": "'직사각형도 마름모도 아닌'이라는 조건이 선대칭 여부를 겨냥하므로 기대답 추론은 가능하다. 다만 평행사변형의 대표 성질인 '점대칭도형이다'도 참이라 서술어 전체 빈칸은 경계 사례다.",
      "proposal": "'… 평행사변형은 선대칭도형이 □'로 좁히거나 '대칭축이 없다'를 인정한다.",
      "primaryReason": "학생문장: “직사각형도 마름모도 아닌 평행사변형은 □.” — 이 평행사변형의 어떤 분류나 성질을 답해야 하는지 단서가 없다. 선대칭 여부와 점대칭 여부는 다른 판단인데 모두 자연스럽게 문장을 완성한다. 다만 직사각형과 마름모를 제외한 조건은 선대칭 여부를 가르는 교과상의 단서일 수 있어 보류한다.",
      "primaryProposal": "한 직선으로 접는 선대칭 여부를 묻는 단서를 남긴다.",
      "initialAlternativeAnswers": [
        "점대칭도형이다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "선대칭 여부를 명시해 점대칭이라는 다른 참인 성질을 대신 답하지 않게 했다. 직사각형·마름모 제외 조건은 보존했다."
  },
  {
    "id": "e5-2-3-3-xc17",
    "grade": "e5",
    "chapter": "2-3 합동과 대칭",
    "student": "원의 대칭축의 개수는 □.",
    "currentDefinition": "원의 대칭축의 개수는 {셀 수 없이 많다}.",
    "expected": [
      "셀 수 없이 많다"
    ],
    "firstBlind": {
      "id": "e5-2-3-3-xc17",
      "answers": [
        "무수히 많다"
      ],
      "alternativeAnswers": [
        "셀 수 없이 많다",
        "많다",
        "있다"
      ],
      "reason": "답 종류가 정해지지 않는다. '있다'도 참인 완성이고 '많다'도 가능하다. '원의 대칭축은 몇 개인가'를 묻는 구조가 아니므로 '원의 대칭축은 원의 중심을 지나는 직선이므로 □ 많다'처럼 고쳐야 한다."
    },
    "originalFinding": {
      "id": "e5-2-3-3-xc17",
      "grade": "e5",
      "section": "초5::2-3 합동과 대칭::2-3-3 선대칭도형과 그 성질 알아보기",
      "sourceHash": "7a3d6936160c4fc4831321c41c35625c15f98d35e5775557ef447580c401c587",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "원의 대칭축은 □.",
      "expected": [
        "셀 수 없이 많다"
      ],
      "reason": "'무수히 많다'가 가장 널리 알려진 답이라 다수는 맞히겠지만 '원의 중심을 지나는 직선이다'도 자연스러운 완성이다. 개수를 묻는지 위치를 묻는지 문장에 없다.",
      "proposal": "'원의 대칭축의 수는 □'로 묻는다.",
      "primaryReason": "학생문장: “원의 대칭축은 □.” — 원의 대칭축에 대해 개수를 묻는지 위치를 묻는지 서술이 모두 비었다. 무한히 많다는 수량 성질과 중심을 지나는 직선이라는 위치 설명은 서로 다른 답이다.",
      "primaryProposal": "대칭축의 개수를 묻는 문장 틀을 남긴다.",
      "initialAlternativeAnswers": [
        "원의 중심을 지나는 직선이다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "개수를 명시해 위치나 단순 존재 여부를 답하는 해석을 막았다. 무수히 많다는 동의 답이다."
  },
  {
    "id": "e5-2-3-4-xc15",
    "grade": "e5",
    "chapter": "2-3 합동과 대칭",
    "student": "변의 수가 짝수인 정다각형은 중심을 기준으로 반 바퀴 돌리면 처음 도형과 완전히 □ 점대칭도형이다.",
    "currentDefinition": "변의 수가 짝수인 정다각형은 중심을 기준으로 반 바퀴 돌리면 처음 도형과 완전히 {겹치므로} 점대칭도형이다.",
    "expected": [
      "겹치므로"
    ],
    "firstBlind": {
      "id": "e5-2-3-4-xc15",
      "answers": [
        "맞다"
      ],
      "alternativeAnswers": [
        "된다"
      ],
      "reason": "진술은 참이다(중심에 대해 180° 돌리면 겹친다). 그러나 자연스러운 문장은 '점대칭도형이다'인데 '점대칭도형이 □' 꼴이라 긍정 답('맞다/된다')이 부자연스럽다. 맞다/아니다 이지선다여서 추측이 가능하고, 짝 문항 xc16과 서로 답을 노출한다. '…은 □도형이다' 꼴이 낫다."
    },
    "originalFinding": {
      "id": "e5-2-3-4-xc15",
      "grade": "e5",
      "section": "초5::2-3 합동과 대칭::2-3-4 점대칭도형과 그 성질 알아보기",
      "sourceHash": "635ff6bc244d90e214796cd274b2ea31ddb1964bbd9370159e030640cc876b7a",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "open-answer",
      "student": "변의 수가 짝수인 정다각형은 □.",
      "expected": [
        "점대칭도형이다"
      ],
      "reason": "변의 수의 홀짝 조건이 점대칭 여부를 가리키는 전형적 단서라 기대답 추론이 가능하다. 다만 '선대칭도형이다'도 참이고 소단원명이 보이지 않아 서술어 전체 빈칸은 경계 사례다.",
      "proposal": "'변의 수가 짝수인 정다각형은 점대칭도형이 □'처럼 좁힌다.",
      "primaryReason": "학생문장: “변의 수가 짝수인 정다각형은 □.” — 변의 수가 짝수인 정다각형의 어떤 성질을 답해야 하는지 제시되지 않았다. 점대칭도형이라는 분류와 선대칭도형이라는 분류가 모두 참이다. 다만 변의 수의 홀짝은 점대칭 여부를 배우는 전형적인 단서여서 학습한 성질이 목표 답을 충분히 정하는지 재검토한다.",
      "primaryProposal": "반 바퀴 회전 또는 점대칭 여부를 묻는 문맥을 본문에 남긴다.",
      "initialAlternativeAnswers": [
        "선대칭도형이다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "긍정의 된다라는 어색한 표현 대신 반 바퀴 회전의 겹침 여부를 묻고 점대칭이라는 분류 이유를 남겼다."
  },
  {
    "id": "e5-2-3-4-xc16",
    "grade": "e5",
    "chapter": "2-3 합동과 대칭",
    "student": "변의 수가 홀수인 정다각형은 점대칭도형이 □.",
    "currentDefinition": "변의 수가 홀수인 정다각형은 점대칭도형이 {되지 않는다}.",
    "expected": [
      "되지 않는다"
    ],
    "firstBlind": {
      "id": "e5-2-3-4-xc16",
      "answers": [
        "아니다"
      ],
      "alternativeAnswers": [
        "될 수 없다"
      ],
      "reason": "홀수 정다각형은 180° 회전으로 겹치지 않으므로 참이고 '아니다'로 수렴한다. xc15와 대구를 이루어 서로 답을 노출한다."
    },
    "originalFinding": {
      "id": "e5-2-3-4-xc16",
      "grade": "e5",
      "section": "초5::2-3 합동과 대칭::2-3-4 점대칭도형과 그 성질 알아보기",
      "sourceHash": "45af9caf5a0c2da80bbcecc15dda740ec46f4dd15d5e9486afbbf8ef9063ebb6",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "open-answer",
      "student": "변의 수가 홀수인 정다각형은 □.",
      "expected": [
        "점대칭도형이 아니다"
      ],
      "reason": "홀짝 단서로 '점대칭도형이 아니다'를 추론할 수 있다. 그러나 '선대칭도형이다'도 참이어서 xc15와 같은 경계 사례다.",
      "proposal": "'변의 수가 홀수인 정다각형은 점대칭도형이 □'처럼 좁힌다.",
      "primaryReason": "학생문장: “변의 수가 홀수인 정다각형은 □.” — 변의 수가 홀수인 정다각형에 대해 점대칭 여부를 묻는다는 단서가 없다. 선대칭도형이라는 별도의 참인 분류도 문장을 완성한다. 다만 변의 수의 홀짝은 점대칭 여부를 배우는 전형적인 단서여서 학습한 성질이 목표 답을 충분히 정하는지 재검토한다.",
      "primaryProposal": "반 바퀴 회전 또는 점대칭 여부를 묻는 문맥을 본문에 남긴다.",
      "initialAlternativeAnswers": [
        "선대칭도형이다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "점대칭 여부를 본문에 남겨 선대칭도형이라는 다른 참인 분류를 막았다."
  },
  {
    "id": "e5-2-3-4-xc18",
    "grade": "e5",
    "chapter": "2-3 합동과 대칭",
    "student": "정사각형, 직사각형, 마름모, 원은 모두 선대칭도형이며, 한 점을 중심으로 반 바퀴 돌려 처음 도형과 겹쳐지는 □이기도 하다.",
    "currentDefinition": "정사각형, 직사각형, 마름모, 원은 모두 선대칭도형이며, 한 점을 중심으로 반 바퀴 돌려 처음 도형과 겹쳐지는 {점대칭도형}이기도 하다.",
    "expected": [
      "점대칭도형"
    ],
    "firstBlind": {
      "id": "e5-2-3-4-xc18",
      "answers": [
        "점대칭도형"
      ],
      "alternativeAnswers": [
        "평면도형(자명하지만 참)"
      ],
      "reason": "'선대칭도형이면서'가 짝 개념을 강하게 유도해 '점대칭도형'으로 수렴하고, 수학적으로 참이다. 정사각형은 직사각형과 마름모에 포함되어 나열이 중복이지만 오류는 아니다."
    },
    "originalFinding": {
      "id": "e5-2-3-4-xc18",
      "grade": "e5",
      "section": "초5::2-3 합동과 대칭::2-3-4 점대칭도형과 그 성질 알아보기",
      "sourceHash": "1d956ad69dee81693c739e746b60ba2d311c36eb10595cfd27a0a773a883a899",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "open-answer",
      "student": "정사각형, 직사각형, 마름모, 원은 □이다.",
      "expected": [
        "선대칭도형이면서 점대칭도형"
      ],
      "reason": "도형 목록에서 대칭을 묻는다는 것은 알 수 있다. 그러나 두 대칭을 모두 써야 한다는 범위가 드러나지 않아 '선대칭도형'만 쓴 답이 참인데도 오답이 될 수 있다.",
      "proposal": "'선대칭도형이면서 □이다'처럼 한쪽을 남기거나 '두 가지 대칭을 모두 쓰시오' 단서를 준다.",
      "primaryReason": "학생문장: “정사각형, 직사각형, 마름모, 원은 □이다.” — 도형 목록 뒤에 공통 속성 전체가 비어 있고 어떤 대칭성을 몇 가지 답해야 하는지 없다. 선대칭과 점대칭 중 하나만 언급해도 문장은 참이므로 기대답의 범위를 알기 어렵다. 다만 두 대칭성을 함께 가지는 대표 도형 목록을 회상하는 문항으로 해석할 수 있어 보류한다.",
      "primaryProposal": "접기와 반 바퀴 회전 두 기준의 대칭성을 각각 묻는다.",
      "initialAlternativeAnswers": [
        "선대칭도형",
        "점대칭도형"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "추가 대칭의 구체적 정의를 남겨 평면도형 같은 더 넓은 분류명과 구별했다."
  },
  {
    "id": "e5-2-4-2-xc13",
    "grade": "e5",
    "chapter": "2-4 소수의 곱셈",
    "student": "소수와 $2$ 이상인 자연수의 곱은 같은 소수를 그 자연수 번 거듭 더해 □ 있다. $1$을 곱하면 그 소수 그대로이다.",
    "currentDefinition": "소수와 $2$ 이상인 자연수의 곱은 같은 소수를 그 자연수 번 거듭 더해 {확인할 수} 있다. $1$을 곱하면 그 소수 그대로이다.",
    "expected": [
      "확인할 수"
    ],
    "firstBlind": {
      "id": "e5-2-4-2-xc13",
      "answers": [
        "구할 수"
      ],
      "alternativeAnswers": [
        "계산할 수",
        "나타낼 수",
        "알 수"
      ],
      "reason": "동의 표현을 인정해야 한다. '그 자연수만큼'은 '그 자연수 번'이 정확하다. 자연수가 1이면 '거듭 더한다'가 어색하다(0.3×1)."
    },
    "originalFinding": {
      "id": "e5-2-4-2-xc13",
      "grade": "e5",
      "section": "초5::2-4 소수의 곱셈::2-4-2 (1보다 큰 소수)×(자연수)의 계산",
      "sourceHash": "c7c2010edaf6936d5212d96ddb71d196b175a311f68ea20309a8560aa5e54b51",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "grammar-blank",
      "student": "소수와 자연수의 곱은 같은 소수를 그 자연수만큼 거듭 더해 □ 있다.",
      "expected": [
        "확인할 수"
      ],
      "reason": "'구할 수', '계산할 수'도 수학적으로 같은 내용이라 학생이 답할 수는 있다. 다만 기능 표현만 가린 빈칸이라 기대답 '확인할 수'와 맞는지는 채점 허용 범위에 달려 있다.",
      "proposal": "'구할 수' 등을 인정하거나 '같은 소수를 그 자연수만큼 거듭 □ 확인할 수 있다'로 빈칸을 옮긴다.",
      "primaryReason": "학생문장: “소수와 자연수의 곱은 같은 소수를 그 자연수만큼 거듭 더해 □ 있다.” — 소수를 자연수만큼 거듭 더한다는 수학 내용은 모두 보이고 '확인할 수'라는 기능 표현만 가려졌다. 계산할 수, 구할 수처럼 목적이 다른 말도 들어가 수학 개념을 특정하지 않는다.",
      "primaryProposal": "곱을 확인할 때 되풀이해 더하는 수나 횟수를 묻는다.",
      "initialAlternativeAnswers": [
        "계산할 수"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "거듭 더하는 설명은 2 이상에 적용하고 1의 예외도 설명했다. 확인할 수·구할 수·계산할 수는 같은 내용의 동의 표현이다."
  },
  {
    "id": "e5-2-4-3-xc8",
    "grade": "e5",
    "chapter": "2-4 소수의 곱셈",
    "student": "$2$ 이상인 자연수에 $0$보다 크고 $1$보다 작은 소수를 곱하면 곱은 그 소수보다 □.",
    "currentDefinition": "$2$ 이상인 자연수에 $0$보다 크고 $1$보다 작은 소수를 곱하면 곱은 그 소수보다 {크다}.",
    "expected": [
      "크다"
    ],
    "firstBlind": {
      "id": "e5-2-4-3-xc8",
      "answers": [
        "크다"
      ],
      "alternativeAnswers": [],
      "reason": "n≥2, 0<d<1이면 n×d>d이므로 '크다'로 유일하다. '2 이상'으로 1을 배제한 처리가 정확하다. 흔한 진술인 '자연수보다 작다'와 비교 대상이 달라 학생이 '작다'로 틀리기 쉬우나 문장 자체는 명확하다."
    },
    "originalFinding": {
      "id": "e5-2-4-3-xc8",
      "grade": "e5",
      "section": "초5::2-4 소수의 곱셈::2-4-3 (자연수)×(1보다 작은 소수)의 계산",
      "sourceHash": "33cf971e96987a3737bd119b84a64b3cb163259552e32717edfa6cc02cdea7f6",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "$2$ 이상인 자연수에 $0$보다 크고 $1$보다 작은 소수를 곱하면 곱은 □.",
      "expected": [
        "그 소수보다 크다"
      ],
      "reason": "'그 자연수보다 작다'는 1보다 작은 수를 곱할 때의 가장 익숙한 성질인데 기대답과 반대 방향의 다른 답이다. 어느 수와 비교하는지가 빈칸에 들어 있어 정할 수 없다.",
      "proposal": "'곱은 그 소수보다 □'로 비교 대상을 남긴다.",
      "primaryReason": "학생문장: “$2$ 이상인 자연수에 $0$보다 크고 $1$보다 작은 소수를 곱하면 곱은 □.” — 곱을 어느 인수와 비교해야 하는지 전체가 빈칸이다. 곱은 소수보다 크면서 자연수보다 작으므로 서로 반대 방향의 대소 관계가 모두 맞는다.",
      "primaryProposal": "비교할 인수를 본문에 남기고 대소 관계만 묻는다.",
      "initialAlternativeAnswers": [
        "그 자연수보다 작다"
      ],
      "initialCounterexample": "2×0.5=1은 소수 0.5보다 크고 자연수 2보다 작다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "비교 대상을 소수로 남겨 자연수보다 작다는 다른 참인 명제와 구별했다. 0·1 제외 조건은 유지한다."
  },
  {
    "id": "e5-2-5-1-xc22",
    "grade": "e5",
    "chapter": "2-5 직육면체",
    "student": "직육면체의 한 꼭짓점에서 모서리를 따라 가장 먼 꼭짓점까지 가려면 모서리를 적어도 □개 지나야 한다.",
    "currentDefinition": "직육면체의 한 꼭짓점에서 모서리를 따라 가장 먼 꼭짓점까지 가려면 모서리를 적어도 {$3$}개 지나야 한다.",
    "expected": [
      "$3$"
    ],
    "firstBlind": {
      "id": "e5-2-5-1-xc22",
      "answers": [
        "3"
      ],
      "alternativeAnswers": [],
      "reason": "가장 먼 꼭짓점(마주 보는 꼭짓점)까지는 세 방향의 모서리를 하나씩 지나야 하므로 3으로 유일하다. '가장 먼'의 기준(직선 거리)이 명시되지 않았지만 어느 기준으로도 같은 꼭짓점이다."
    },
    "originalFinding": {
      "id": "e5-2-5-1-xc22",
      "grade": "e5",
      "section": "초5::2-5 직육면체::2-5-1 직사각형 6개로 둘러싸인 도형",
      "sourceHash": "9c226432a37601a60a654b6ee4870060482c34b2c400fabb01242e1c3d8397ed",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "한 꼭짓점에서 모서리를 따라 가장 먼 꼭짓점까지 가려면 모서리를 적어도 □ 지나야 한다.",
      "expected": [
        "$3$개"
      ],
      "reason": "대단원이 직육면체이므로 도형은 맥락으로 정해지고 답은 3개 하나다(정육면체도 같음). prior가 든 삼각뿔 반례는 단원 범위 밖이다.",
      "proposal": "유지(선택적으로 '직육면체의'를 덧붙일 수 있음).",
      "primaryReason": "학생문장: “한 꼭짓점에서 모서리를 따라 가장 먼 꼭짓점까지 가려면 모서리를 적어도 □ 지나야 한다.” — 입체의 종류가 학생문장에 없다. 꼭짓점과 모서리를 가진 여러 입체에서 모서리를 따라 가는 최소 개수는 달라 직육면체라는 숨은 이름 없이는 답을 정할 수 없다.",
      "primaryProposal": "직육면체에서 반대쪽 꼭짓점으로 가는 상황임을 명시한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": "삼각뿔의 한 꼭짓점에서 다른 꼭짓점까지는 모서리 하나로 갈 수 있다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "직육면체를 명시하고 개 단위를 남겨 도형 종류 및 답 종류를 고정했다."
  },
  {
    "id": "e5-2-5-2-xc2",
    "grade": "e5",
    "chapter": "2-5 직육면체",
    "student": "정육면체의 면은 □개이다.",
    "currentDefinition": "정육면체의 면은 {$6$}개이다.",
    "expected": [
      "$6$"
    ],
    "firstBlind": {
      "id": "e5-2-5-2-xc2",
      "answers": [
        "6"
      ],
      "alternativeAnswers": [],
      "reason": "답은 6으로 유일하고 정확하다."
    },
    "originalFinding": {
      "id": "e5-2-5-2-xc2",
      "grade": "e5",
      "section": "초5::2-5 직육면체::2-5-2 정사각형 6개로 둘러싸인 도형",
      "sourceHash": "c13ef3ae51f905da74f2317a10a13207834df0e0571bb485d742bde4d6b4a6eb",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "정육면체의 면은 □이다.",
      "expected": [
        "$6$개"
      ],
      "reason": "'정육면체의 면은 정사각형이다'가 개수 답만큼, 혹은 그보다 더 자연스럽다. 개수와 모양 중 어느 답을 쓸지 정할 수 없다.",
      "proposal": "'정육면체의 면은 □개이다'로 묻는다.",
      "primaryReason": "학생문장: “정육면체의 면은 □이다.” — 면의 개수를 묻는지 면의 모양을 묻는지 문장에 없다. 수량 6개와 도형 이름 정사각형은 답 종류 자체가 다른데 모두 자연스럽게 성립한다.",
      "primaryProposal": "면이 몇 개인지 묻도록 개수라는 말을 남긴다.",
      "initialAlternativeAnswers": [
        "정사각형"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "개 단위를 남겨 면의 모양인 정사각형과 개수 답을 구별했다."
  },
  {
    "id": "e5-2-5-2-xc3",
    "grade": "e5",
    "chapter": "2-5 직육면체",
    "student": "정육면체의 모서리는 □개이다.",
    "currentDefinition": "정육면체의 모서리는 {$12$}개이다.",
    "expected": [
      "$12$"
    ],
    "firstBlind": {
      "id": "e5-2-5-2-xc3",
      "answers": [
        "12"
      ],
      "alternativeAnswers": [],
      "reason": "답은 12로 유일하고 정확하다."
    },
    "originalFinding": {
      "id": "e5-2-5-2-xc3",
      "grade": "e5",
      "section": "초5::2-5 직육면체::2-5-2 정사각형 6개로 둘러싸인 도형",
      "sourceHash": "30bd63d52e76739ad017d7e2a59d5b07b2e3c5e3b6cfc82030da7a790b0b322e",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "정육면체의 모서리는 □이다.",
      "expected": [
        "$12$개"
      ],
      "reason": "'□이다' 틀에서 모서리에 대한 답은 대체로 개수(12개)로 모인다. 다만 '길이가 모두 같은 선분' 같은 답도 가능해 단위를 남기면 깔끔하다.",
      "proposal": "'□개이다'로 틀만 고친다.",
      "primaryReason": "학생문장: “정육면체의 모서리는 □이다.” — 모서리의 개수인지 길이의 성질인지 답 종류를 알 수 없다. 12개라는 수량과 모두 길이가 같다는 성질이 모두 성립한다.",
      "primaryProposal": "모서리의 개수를 묻는 문장 틀을 남긴다.",
      "initialAlternativeAnswers": [
        "모두 길이가 같은 선분"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "개 단위를 남겨 모서리의 길이 성질과 개수 답을 구별했다."
  },
  {
    "id": "e5-2-5-2-xc4",
    "grade": "e5",
    "chapter": "2-5 직육면체",
    "student": "정육면체의 꼭짓점은 □개이다.",
    "currentDefinition": "정육면체의 꼭짓점은 {$8$}개이다.",
    "expected": [
      "$8$"
    ],
    "firstBlind": {
      "id": "e5-2-5-2-xc4",
      "answers": [
        "8"
      ],
      "alternativeAnswers": [],
      "reason": "답은 8로 유일하고 정확하다."
    },
    "originalFinding": {
      "id": "e5-2-5-2-xc4",
      "grade": "e5",
      "section": "초5::2-5 직육면체::2-5-2 정사각형 6개로 둘러싸인 도형",
      "sourceHash": "9b77fdd96813364435a4b5c652e750b8783ad75180e15e973cb9fafb1a69341e",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "정육면체의 꼭짓점은 □이다.",
      "expected": [
        "$8$개"
      ],
      "reason": "꼭짓점에 대한 자연스러운 답은 8개이지만 '세 모서리가 만나는 점' 같은 정의형 답도 문형에 맞는다. 명확한 결함이라기보다 틀 개선 사안이다.",
      "proposal": "'□개이다'로 틀만 고친다.",
      "primaryReason": "학생문장: “정육면체의 꼭짓점은 □이다.” — 꼭짓점의 개수인지 꼭짓점의 뜻인지 답 종류가 정해지지 않았다. 8개라는 수량과 세 모서리가 만나는 점이라는 정의가 모두 성립한다.",
      "primaryProposal": "꼭짓점이 몇 개인지 묻도록 개수라는 말을 남긴다.",
      "initialAlternativeAnswers": [
        "세 모서리가 만나는 점"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "개 단위를 남겨 꼭짓점의 정의와 개수 답을 구별했다."
  },
  {
    "id": "e5-2-5-3-xc3",
    "grade": "e5",
    "chapter": "2-5 직육면체",
    "student": "직육면체에서 한 면을 밑면으로 정하면 그 면과 마주 보는 면도 밑면이므로 밑면은 □개이다.",
    "currentDefinition": "직육면체에서 한 면을 밑면으로 정하면 그 면과 마주 보는 면도 밑면이므로 밑면은 {$2$}개이다.",
    "expected": [
      "$2$"
    ],
    "firstBlind": {
      "id": "e5-2-5-3-xc3",
      "answers": [
        "2"
      ],
      "alternativeAnswers": [
        "6",
        "3쌍"
      ],
      "reason": "조건이 부족하다. 교과서는 평행한 두 면을 밑면이라 하고, 평행한 면 3쌍이 각각 밑면이 될 수 있다고 한다. 한 쌍을 정하면 2개이지만, '밑면이 될 수 있는 면'으로 읽으면 6개(3쌍)도 참이다. '한 쌍의 밑면을 정하면 밑면은 □개' 또는 '한 면을 밑면으로 정하면'을 넣어야 한다."
    },
    "originalFinding": {
      "id": "e5-2-5-3-xc3",
      "grade": "e5",
      "section": "초5::2-5 직육면체::2-5-3 직육면체의 성질",
      "sourceHash": "0f6651da34132776d453254f43971a504c0d2b2541e46b35c6a9f817664dcdf9",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "직육면체의 밑면은 □이다.",
      "expected": [
        "$2$개"
      ],
      "reason": "교과서 정의 '서로 평행한 두 면'이 이 문형에 그대로 들어가 개수 답(2개)과 경쟁한다. 개수를 묻는다는 단서가 없다.",
      "proposal": "'직육면체의 밑면은 □개이다'로 묻는다.",
      "primaryReason": "학생문장: “직육면체의 밑면은 □이다.” — 밑면의 개수인지 모양·관계인지 묻는 대상이 없다. 2개라는 수량과 서로 평행한 두 직사각형이라는 정의가 모두 성립한다.",
      "primaryProposal": "밑면의 개수를 묻는 문장 틀을 남긴다.",
      "initialAlternativeAnswers": [
        "서로 평행한 직사각형"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "밑면의 선택을 먼저 정해 밑면이 될 수 있는 여섯 면과 선택된 두 면의 혼동을 막았다."
  },
  {
    "id": "e5-2-5-3-xc4",
    "grade": "e5",
    "chapter": "2-5 직육면체",
    "student": "직육면체에서 한 쌍의 밑면을 정하면 그 밑면과 수직인 옆면은 □개이다.",
    "currentDefinition": "직육면체에서 한 쌍의 밑면을 정하면 그 밑면과 수직인 옆면은 {$4$}개이다.",
    "expected": [
      "$4$"
    ],
    "firstBlind": {
      "id": "e5-2-5-3-xc4",
      "answers": [
        "4"
      ],
      "alternativeAnswers": [
        "6(밑면을 정하지 않으면 모든 면이 옆면이 될 수 있음)"
      ],
      "reason": "밑면을 정했을 때 밑면과 수직인 면은 4개이므로 통상 4로 수렴한다. 다만 밑면 선택에 의존하므로 '밑면을 정했을 때' 전제가 있어야 엄밀하다."
    },
    "originalFinding": {
      "id": "e5-2-5-3-xc4",
      "grade": "e5",
      "section": "초5::2-5 직육면체::2-5-3 직육면체의 성질",
      "sourceHash": "e7d98f8838d4a474976736048aa3ead2e17c0a82c3f12f250c7066f3e0da0523",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "직육면체의 옆면은 □이다.",
      "expected": [
        "$4$개"
      ],
      "reason": "'밑면과 수직인 면'(정의)과 '직사각형'(모양)이 4개와 같은 정도로 자연스럽다. 답의 종류를 정할 수 없다.",
      "proposal": "'직육면체의 옆면은 □개이다'로 묻는다.",
      "primaryReason": "학생문장: “직육면체의 옆면은 □이다.” — 옆면의 개수인지 모양인지 답 종류를 알 수 없다. 4개와 직사각형이 모두 문장을 완성한다.",
      "primaryProposal": "옆면의 개수를 묻는 문장 틀을 남긴다.",
      "initialAlternativeAnswers": [
        "직사각형"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "밑면의 선택을 정해 모든 면이 옆면 후보가 될 수 있다는 해석을 막았다."
  },
  {
    "id": "e5-2-5-3-xc10",
    "grade": "e5",
    "chapter": "2-5 직육면체",
    "student": "직육면체에서 평행한 두 면은 함께 가지는 모서리가 □.",
    "currentDefinition": "직육면체에서 평행한 두 면은 함께 가지는 모서리가 {없다}.",
    "expected": [
      "없다"
    ],
    "firstBlind": {
      "id": "e5-2-5-3-xc10",
      "answers": [
        "없다"
      ],
      "alternativeAnswers": [
        "하나도 없다",
        "0개이다"
      ],
      "reason": "평행한 두 면은 만나지 않으므로 공유하는 모서리가 없다. '없다'로 유일하다. '함께 가지는 모서리'는 풀어 쓴 표현으로 적절하다."
    },
    "originalFinding": {
      "id": "e5-2-5-3-xc10",
      "grade": "e5",
      "section": "초5::2-5 직육면체::2-5-3 직육면체의 성질",
      "sourceHash": "d40311cd507c7e8705ebf8e040b4ece23be821ba433af818a761432f332201df",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "평행한 두 면에는 □가 없다.",
      "expected": [
        "같이 가지는 모서리"
      ],
      "reason": "조사 '가'와 문맥으로 '만나는(공통인) 모서리'류의 답이 유도되고 동의 표현으로 처리할 수 있다. 다만 '공통인 꼭짓점'도 수학적으로 참이고 직육면체라는 주어도 없다.",
      "proposal": "'직육면체에서 평행한 두 면은 만나는 □가 없다'처럼 다듬거나 '서로 만나지 않는다'형으로 바꾼다.",
      "primaryReason": "학생문장: “평행한 두 면에는 □가 없다.” — 평행한 두 면이 공유하지 않는 요소를 특정하지 않았다. 공통 모서리도 없고 공통 꼭짓점도 없어 서로 다른 기하 요소가 답이 된다.",
      "primaryProposal": "모서리의 공유 여부를 묻는다고 명시한다.",
      "initialAlternativeAnswers": [
        "같이 가지는 꼭짓점"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "직육면체와 모서리라는 비교 요소를 남겨 공통 꼭짓점이라는 다른 참인 요소를 막았다."
  },
  {
    "id": "e5-2-5-3-xc17",
    "grade": "e5",
    "chapter": "2-5 직육면체",
    "student": "직육면체는 면마다 수직인 면이 $4$개이고 한 쌍을 두 번 세므로 수직인 두 면의 쌍은 □쌍이다.",
    "currentDefinition": "직육면체는 면마다 수직인 면이 $4$개이고 한 쌍을 두 번 세므로 수직인 두 면의 쌍은 {$12$}쌍이다.",
    "expected": [
      "$12$"
    ],
    "firstBlind": {
      "id": "e5-2-5-3-xc17",
      "answers": [
        "12"
      ],
      "alternativeAnswers": [],
      "reason": "6×4÷2=12로 유일하다. 면의 수 6을 알아야 하지만 학년 수준에 맞고 풀이 근거가 정확하다."
    },
    "originalFinding": {
      "id": "e5-2-5-3-xc17",
      "grade": "e5",
      "section": "초5::2-5 직육면체::2-5-3 직육면체의 성질",
      "sourceHash": "dbcc2d5411a27d4b12eb46dfc0ba38a61c931dcf504bf9c218fa800ef30240d0",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "면마다 수직인 면이 $4$개이고 한 쌍을 두 번 세므로 수직인 두 면의 쌍은 □이다.",
      "expected": [
        "$12$쌍"
      ],
      "reason": "대단원이 직육면체이므로 면이 6개라는 것은 맥락에서 주어지고, 문장이 준 계산 구조(4개씩, 두 번 셈)로 12쌍이 하나로 정해진다.",
      "proposal": "유지(선택적으로 '직육면체에서'를 덧붙일 수 있음).",
      "primaryReason": "학생문장: “면마다 수직인 면이 $4$개이고 한 쌍을 두 번 세므로 수직인 두 면의 쌍은 □이다.” — 한 면과 수직인 면 수는 주지만 입체의 종류나 전체 면 수가 없다. 6×4÷2를 쓰려면 직육면체의 여섯 면이라는 정보가 필요한데 학생문장에서 사라져 있다.",
      "primaryProposal": "직육면체의 여섯 면을 세는 문제임을 본문에 남긴다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "직육면체를 명시하고 쌍 단위를 남겼다. 면 6개×4개÷2라는 이유를 유지했다."
  },
  {
    "id": "e5-2-5-4-xc3",
    "grade": "e5",
    "chapter": "2-5 직육면체",
    "student": "직육면체의 세 면이 보이게 그린 겨냥도에서 실선으로 그린 모서리는 □개이다.",
    "currentDefinition": "직육면체의 세 면이 보이게 그린 겨냥도에서 실선으로 그린 모서리는 {$9$}개이다.",
    "expected": [
      "$9$"
    ],
    "firstBlind": {
      "id": "e5-2-5-4-xc3",
      "answers": [
        "9"
      ],
      "alternativeAnswers": [],
      "reason": "'세 면이 보이게 그린' 조건이 있어 보이는 모서리는 9개로 확정된다."
    },
    "originalFinding": {
      "id": "e5-2-5-4-xc3",
      "grade": "e5",
      "section": "초5::2-5 직육면체::2-5-4 직육면체의 겨냥도",
      "sourceHash": "de648f9aa46e4ee971551f531969851e19cac6ee77006275e90176beb8953a37",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "직육면체의 겨냥도에서 실선으로 그린 모서리는 □이다.",
      "expected": [
        "$9$개"
      ],
      "reason": "'실선으로 그린 모서리는 보이는 모서리이다'가 겨냥도의 교과서 정의 그대로여서 개수 답(9개)과 구별되는 자연스러운 답이 된다.",
      "proposal": "'□개이다'로 묻는다.",
      "primaryReason": "학생문장: “직육면체의 겨냥도에서 실선으로 그린 모서리는 □이다.” — 실선으로 그린 모서리의 개수인지 뜻·표시 방법인지 문장만으로 정해지지 않는다. 수량을 쓰는 답과 선의 의미 또는 표시를 설명하는 답이 모두 성립한다.",
      "primaryProposal": "개수를 묻는다는 문장 틀을 남긴다.",
      "initialAlternativeAnswers": [
        "눈에 보이는 모서리"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "개 단위를 남기고 세 면이 보이는 겨냥도 조건을 명시해 표시 의미 및 다른 투영의 개수와 구별했다."
  },
  {
    "id": "e5-2-5-4-xc4",
    "grade": "e5",
    "chapter": "2-5 직육면체",
    "student": "직육면체의 세 면이 보이게 그린 겨냥도에서 점선으로 그린 모서리는 □개이다.",
    "currentDefinition": "직육면체의 세 면이 보이게 그린 겨냥도에서 점선으로 그린 모서리는 {$3$}개이다.",
    "expected": [
      "$3$"
    ],
    "firstBlind": {
      "id": "e5-2-5-4-xc4",
      "answers": [
        "3"
      ],
      "alternativeAnswers": [],
      "reason": "보이지 않는 모서리는 3개로 유일하다. xc3과 합이 12라서 서로 유추할 수 있지만 문장 안 노출은 없다."
    },
    "originalFinding": {
      "id": "e5-2-5-4-xc4",
      "grade": "e5",
      "section": "초5::2-5 직육면체::2-5-4 직육면체의 겨냥도",
      "sourceHash": "a244b7192d80867d1668a9299a3b9797e328d803df7ca9d59af0377b44a4f697",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "직육면체의 겨냥도에서 점선으로 그린 모서리는 □이다.",
      "expected": [
        "$3$개"
      ],
      "reason": "'점선으로 그린 모서리는 보이지 않는 모서리이다'가 정의 그대로 들어가 3개와 경쟁한다.",
      "proposal": "'□개이다'로 묻는다.",
      "primaryReason": "학생문장: “직육면체의 겨냥도에서 점선으로 그린 모서리는 □이다.” — 점선으로 그린 모서리의 개수인지 뜻·표시 방법인지 문장만으로 정해지지 않는다. 수량을 쓰는 답과 선의 의미 또는 표시를 설명하는 답이 모두 성립한다.",
      "primaryProposal": "개수를 묻는다는 문장 틀을 남긴다.",
      "initialAlternativeAnswers": [
        "눈에 보이지 않는 모서리"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "개 단위를 남기고 세 면이 보이는 조건을 지정해 보이지 않는 모서리라는 의미 답과 구별했다."
  },
  {
    "id": "e5-2-5-4-xc17",
    "grade": "e5",
    "chapter": "2-5 직육면체",
    "student": "정육면체의 세 면이 보이게 그린 겨냥도에서도 점선으로 그린 모서리는 □개이다.",
    "currentDefinition": "정육면체의 세 면이 보이게 그린 겨냥도에서도 점선으로 그린 모서리는 {$3$}개이다.",
    "expected": [
      "$3$"
    ],
    "firstBlind": {
      "id": "e5-2-5-4-xc17",
      "answers": [
        "3"
      ],
      "alternativeAnswers": [],
      "reason": "답은 3으로 유일하다. 답 노출: '에서도'가 직육면체 문항(e5-2-5-4-xc4)과 같은 값임을 드러낸다."
    },
    "originalFinding": {
      "id": "e5-2-5-4-xc17",
      "grade": "e5",
      "section": "초5::2-5 직육면체::2-5-4 직육면체의 겨냥도",
      "sourceHash": "596c4a140c043b4847821579174abae64fd000da1300f027faa9cd3b41162514",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "정육면체의 겨냥도에서도 점선은 □이다.",
      "expected": [
        "세 개"
      ],
      "reason": "'점선은 보이지 않는 모서리이다'도 정육면체에 똑같이 성립해 개수(세 개)와 답의 종류가 갈린다.",
      "proposal": "'점선으로 그린 모서리는 □개이다'로 묻는다.",
      "primaryReason": "학생문장: “정육면체의 겨냥도에서도 점선은 □이다.” — 점선의 개수인지 뜻·표시 방법인지 문장만으로 정해지지 않는다. 수량을 쓰는 답과 선의 의미 또는 표시를 설명하는 답이 모두 성립한다.",
      "primaryProposal": "개수를 묻는다는 문장 틀을 남긴다.",
      "initialAlternativeAnswers": [
        "눈에 보이지 않는 모서리를 나타내는 선"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "세 면이 보이는 겨냥도와 모서리 개수라는 응답 종류를 명시했다."
  },
  {
    "id": "e5-2-5-5-xc3",
    "grade": "e5",
    "chapter": "2-5 직육면체",
    "student": "정육면체의 전개도를 접었을 때 마주 보는 면은 □쌍이다.",
    "currentDefinition": "정육면체의 전개도를 접었을 때 마주 보는 면은 {$3$}쌍이다.",
    "expected": [
      "$3$"
    ],
    "firstBlind": {
      "id": "e5-2-5-5-xc3",
      "answers": [
        "3"
      ],
      "alternativeAnswers": [],
      "reason": "접으면 평행한(마주 보는) 면이 3쌍이므로 3으로 유일하다. 교과서 용어 '평행한 면'을 함께 쓰면 더 좋다."
    },
    "originalFinding": {
      "id": "e5-2-5-5-xc3",
      "grade": "e5",
      "section": "초5::2-5 직육면체::2-5-5 정육면체의 전개도",
      "sourceHash": "bde9174d1aa880c71a4f8aa289c9d8c3833e74ab7eba27bdc8baa6776f47acce",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "정육면체의 전개도에서 접었을 때 마주 보는 면은 □이다.",
      "expected": [
        "세 쌍"
      ],
      "reason": "전개도 단원에서 '마주 보는 면'은 보통 어떤 면인지나 평행 관계를 묻는 대상이다. 쌍의 수를 묻는다는 단서가 없어 '서로 평행한 면' 같은 답과 갈린다.",
      "proposal": "'마주 보는 면은 모두 □쌍이다'로 묻는다.",
      "primaryReason": "학생문장: “정육면체의 전개도에서 접었을 때 마주 보는 면은 □이다.” — 접었을 때 마주 보는 면의 쌍 수인지 모양·관계인지 질문이 정해지지 않았다. 세 쌍과 서로 평행한 정사각형은 다른 답 종류이지만 모두 성립한다.",
      "primaryProposal": "마주 보는 면이 몇 쌍인지 명시한다.",
      "initialAlternativeAnswers": [
        "서로 평행한 정사각형"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "쌍 단위를 남겨 평행 관계가 아닌 쌍의 수를 묻는다고 명시했다."
  }
]
