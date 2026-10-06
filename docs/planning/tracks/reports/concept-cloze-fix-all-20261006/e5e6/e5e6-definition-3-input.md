독립 최종 원고 검토입니다. 앞선 가림 풀이와 원래 감사 지적은 참고 자료이며 무조건 따르지 마세요. currentDefinition은 지금 적용된 정확한 최종 후보이며, firstBlind는 일부 수정 전 문장에 대한 답일 수 있습니다. 기대 답과 가림 답은 철자·조사·활용형이 아니라 의미로 대조하세요. 같은 의미의 동의어/동치식은 허용합니다. 수학적 진실, 초5·초6 또는 아래 학년 용어, 조건·연산·대상·순서, 0·1·부호·범위·도형 포함관계, 학생이 읽는 문장으로 서로 다른 참인 완성이 가능한지를 검토하세요. 기대 답을 넣은 완성 정의가 A/B/D형과 SRS에서 의미 있는 원래 개념 설명으로 남는지도 확인하세요. 정의를 풀어 설명한 단서나 쉬운 문제라는 사실만으로 revise하지 마세요. 일상적인 동의 표현과 임의의 더 약한 일반어(수, 도형, 값 등)를 별개 수학 답으로 잘못 세지 마세요. 하지만 서로 다른 표준 수학 내용의 답이 실제로 가능하면 revise하고 구체 반례와 바로 적용할 정확한 definition을 제안하세요. JSON만 반환: {"cases":[{"id":"...","verdict":"pass|revise","reason":"...","proposal":"..."}]}.

[
  {
    "id": "e5-2-5-5-xc16",
    "grade": "e5",
    "chapter": "2-5 직육면체",
    "student": "정육면체 전개도에서 접는 선은 □개이다.",
    "currentDefinition": "정육면체 전개도에서 접는 선은 {$5$}개이다.",
    "expected": [
      "$5$"
    ],
    "firstBlind": {
      "id": "e5-2-5-5-xc16",
      "answers": [
        "5"
      ],
      "alternativeAnswers": [],
      "reason": "면 6개를 한 장으로 이으려면 이어진 모서리(접는 선)가 5개 필요하며, 11가지 전개도 모두 5개로 같다. 잘리는 모서리 7개나 전체 모서리 12개는 '접는 선'이 아니므로 답은 하나로 정해진다."
    },
    "originalFinding": {
      "id": "e5-2-5-5-xc16",
      "grade": "e5",
      "section": "초5::2-5 직육면체::2-5-5 정육면체의 전개도",
      "sourceHash": "5b9ffdc5e1bd374ff169b5cbda28a7704421c308fc1d9be3ccfda9c2c0b6d2aa",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "정육면체 전개도에서 접는 선은 □이다.",
      "expected": [
        "$5$개"
      ],
      "reason": "'접는 선은 점선이다(점선으로 그린다)'가 전개도의 표준 약속이라 5개와 구별되는 자연스러운 답이다.",
      "proposal": "'접는 선은 □개이다'로 묻는다.",
      "primaryReason": "학생문장: “정육면체 전개도에서 접는 선은 □이다.” — 접는 선의 개수인지 뜻·표시 방법인지 문장만으로 정해지지 않는다. 수량을 쓰는 답과 선의 의미 또는 표시를 설명하는 답이 모두 성립한다.",
      "primaryProposal": "개수를 묻는다는 문장 틀을 남긴다.",
      "initialAlternativeAnswers": [
        "점선"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "개 단위를 남겨 점선이라는 표시 방법과 개수 답을 구별했다."
  },
  {
    "id": "e5-2-5-6-xc8",
    "grade": "e5",
    "chapter": "2-5 직육면체",
    "student": "직육면체 전개도에서 접는 선은 □개이다.",
    "currentDefinition": "직육면체 전개도에서 접는 선은 {$5$}개이다.",
    "expected": [
      "$5$"
    ],
    "firstBlind": {
      "id": "e5-2-5-6-xc8",
      "answers": [
        "5"
      ],
      "alternativeAnswers": [],
      "reason": "직육면체도 면 6개를 잇는 접는 선은 전개도 모양과 관계없이 5개이다. 정육면체 문항(e5-2-5-5-xc16)과 구조·답이 같아 중복에 가깝다."
    },
    "originalFinding": {
      "id": "e5-2-5-6-xc8",
      "grade": "e5",
      "section": "초5::2-5 직육면체::2-5-6 직육면체의 전개도",
      "sourceHash": "ced37dfa2744ee3af7ec6437e393d3cc18e04d8cf2e6f2d2957a4e873bd3c58a",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "직육면체 전개도에서 접는 선은 □이다.",
      "expected": [
        "$5$개"
      ],
      "reason": "바로 위 문항과 같이 '점선'이라는 표시 방법 답이 개수 답과 경쟁한다.",
      "proposal": "'접는 선은 □개이다'로 묻는다.",
      "primaryReason": "학생문장: “직육면체 전개도에서 접는 선은 □이다.” — 접는 선의 개수인지 선을 표시하는 방법인지 답 종류가 정해지지 않았다. 5개라는 수량과 점선이라는 표시가 모두 문장을 완성한다.",
      "primaryProposal": "접는 선의 개수를 묻는다고 명시한다.",
      "initialAlternativeAnswers": [
        "점선"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "개 단위를 남겨 점선이라는 표시 방법과 개수 답을 구별했다."
  },
  {
    "id": "e5-2-6-1-xc19",
    "grade": "e5",
    "chapter": "2-6 평균과 가능성",
    "student": "두 묶음의 자료에서 자료의 개수가 서로 같고 자료의 합도 서로 같으면 평균은 □.",
    "currentDefinition": "두 묶음의 자료에서 자료의 개수가 서로 같고 자료의 합도 서로 같으면 평균은 {같다}.",
    "expected": [
      "같다"
    ],
    "firstBlind": {
      "id": "e5-2-6-1-xc19",
      "answers": [
        "같다"
      ],
      "alternativeAnswers": [],
      "reason": "평균은 (자료의 합)÷(자료의 개수)이므로 둘이 각각 같으면 평균도 같다. '서로 같다'도 같은 답이다."
    },
    "originalFinding": {
      "id": "e5-2-6-1-xc19",
      "grade": "e5",
      "section": "초5::2-6 평균과 가능성::2-6-1 평균 알아보기",
      "sourceHash": "8307920c9b77b208e264381bc22584590b547246d970516b5a5689bae81d0612",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "자료의 개수와 합이 같으면 □.",
      "expected": [
        "평균도 같다"
      ],
      "reason": "'자료의 개수와 합이 같으면'은 문법상 개수와 합이 서로 같다는 뜻으로 먼저 읽히고, 그 경우 답은 '평균은 1이다'가 된다. 두 자료를 비교한다는 전제가 없어 서로 다른 수학적 답이 생긴다.",
      "proposal": "'두 자료의 개수가 서로 같고 합도 서로 같으면 □'로 고친다.",
      "primaryReason": "학생문장: “자료의 개수와 합이 같으면 □.” — 비교하는 두 자료 묶음이 제시되지 않았다. 남은 문장은 한 자료 묶음의 개수와 합이 서로 같다는 뜻으로 읽힐 수 있는데, 그때는 평균이 1이라는 다른 결론이 나온다.",
      "primaryProposal": "두 자료 묶음의 개수끼리와 합끼리가 각각 같다는 조건을 명시한다.",
      "initialAlternativeAnswers": [
        "평균은 1이다"
      ],
      "initialCounterexample": "자료 1, 1, 1은 개수와 합이 모두 3이어서 평균이 1이다. '평균도 같다'고 비교할 다른 자료는 문장에 없다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "두 자료 묶음을 비교한다고 명시해 한 묶음 안의 개수=합일 때 평균 1이라는 다른 해석을 막았다."
  },
  {
    "id": "e5-2-6-3-xc19",
    "grade": "e5",
    "chapter": "2-6 평균과 가능성",
    "student": "앞면과 뒷면이 나올 가능성이 같은 동전을 아주 많이 던지면 앞면이 나온 횟수는 대체로 던진 횟수의 □이 된다. 꼭 절반이 된다는 뜻은 아니다.",
    "currentDefinition": "앞면과 뒷면이 나올 가능성이 같은 동전을 아주 많이 던지면 앞면이 나온 횟수는 대체로 던진 횟수의 {절반쯤}이 된다. 꼭 절반이 된다는 뜻은 아니다.",
    "expected": [
      "절반쯤"
    ],
    "firstBlind": {
      "id": "e5-2-6-3-xc19",
      "answers": [
        "절반"
      ],
      "alternativeAnswers": [
        "반",
        "1/2"
      ],
      "reason": "답 노출: 바로 뒤 문장 '꼭 절반이 된다는 뜻은 아니다'에 답이 그대로 나온다. '반', '1/2'은 같은 뜻이고 조사 '이'와도 맞는다. 다만 '절반이 된다'보다 '절반에 가까워진다'가 더 정확한 표현이다."
    },
    "originalFinding": {
      "id": "e5-2-6-3-xc19",
      "grade": "e5",
      "section": "초5::2-6 평균과 가능성::2-6-3 일이 일어날 가능성",
      "sourceHash": "935c1bc596ffca9a468545b203a70e6d00c89cb055b752a2e7eefb7f35dc19e4",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "answer-leak",
      "student": "동전을 아주 많이 던지면 앞면이 나온 횟수는 대체로 던진 횟수의 □이 된다. 꼭 절반이 된다는 뜻은 아니다.",
      "expected": [
        "절반쯤"
      ],
      "reason": "답의 종류와 값(절반쯤, 반 정도)이 분명하다. 뒤 문장이 답을 드러내는 것은 변별력 문제이지 무엇을 쓸지 모르는 명료성 결함이 아니다.",
      "proposal": "유지('절반', '반쯤', '1/2쯤' 등 인정). 난이도를 높이려면 뒤 문장의 '절반'을 '그만큼'으로 바꿀 수 있다.",
      "primaryReason": "학생문장: “동전을 아주 많이 던지면 앞면이 나온 횟수는 대체로 던진 횟수의 □이 된다. 꼭 절반이 된다는 뜻은 아니다.” — 뒤 문장 '꼭 절반이 된다는 뜻은 아니다'가 빈칸의 핵심 수량인 절반과 어림이라는 의미를 함께 보여 준다. 동전 실험의 경향을 회상하지 않아도 빈칸을 복원할 수 있다.",
      "primaryProposal": "주의 설명에서 목표 수량을 다시 말하지 않거나 설명형 문항으로 분리한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "동전의 공정성을 같은 가능성이라는 학년 내 표현으로 명시했다. 절반은 확정이 아닌 대체적 어림이라는 설명을 보존했다."
  },
  {
    "id": "e6-1-2-1-xc26",
    "grade": "e6",
    "chapter": "1-2 각기둥과 각뿔",
    "student": "면이 모두 직사각형인 각기둥은 밑면이 사각형이므로, 밑면의 모양에 따라 이름 붙이면 □이다.",
    "currentDefinition": "면이 모두 직사각형인 각기둥은 밑면이 사각형이므로, 밑면의 모양에 따라 이름 붙이면 {사각기둥}이다.",
    "expected": [
      "사각기둥"
    ],
    "firstBlind": {
      "id": "e6-1-2-1-xc26",
      "answers": [
        "사각기둥"
      ],
      "alternativeAnswers": [],
      "reason": "'밑면의 모양에 따라 이름 붙이면'이라는 조건 때문에 사각기둥으로 정해진다. 직육면체도 참이지만 밑면 모양에 따른 이름이 아니므로 이 문장에서는 제외된다. 앞의 '밑면이 사각형', '각기둥'이 강한 단서이나 추론 단서로 볼 수 있는 수준이다."
    },
    "originalFinding": {
      "id": "e6-1-2-1-xc26",
      "grade": "e6",
      "section": "초6::1-2 각기둥과 각뿔::1-2-1 각기둥 알아보기와 각기둥의 밑면과 옆면",
      "sourceHash": "e7945f357707146f64853ec2f47df2da7759fcba290ea5e537435fcd0530d1c6",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "면이 모두 직사각형인 각기둥은 □이다.",
      "expected": [
        "사각기둥"
      ],
      "reason": "면이 모두 직사각형인 입체는 5학년에서 배운 '직육면체'가 가장 정확하고 자연스러운 이름이다. 사각기둥을 써야 한다는 단서가 없다.",
      "proposal": "'밑면의 모양에 따라 이름을 붙이면 □이다'로 기준을 주거나 직육면체도 인정한다.",
      "primaryReason": "학생문장: “면이 모두 직사각형인 각기둥은 □이다.” — 밑면의 변 수에 따른 이름을 묻는다는 기준이 없다. 모든 면이 직사각형인 각기둥은 직육면체라는 더 구체적인 이름으로도 정확히 답할 수 있으며 사각기둥과 두 범주는 같지 않다.",
      "primaryProposal": "밑면의 변 수에 따라 각기둥의 이름을 붙이라는 기준을 남긴다.",
      "initialAlternativeAnswers": [
        "직육면체"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "밑면 모양에 따른 이름이라는 분류 기준을 남겨 더 구체적인 직육면체와 답을 구별했다. 직육면체임을 부정하지 않는다."
  },
  {
    "id": "e6-1-2-3-xc18",
    "grade": "e6",
    "chapter": "1-2 각기둥과 각뿔",
    "student": "각기둥의 밑면이 정다각형이면 전개도의 옆면인 직사각형들은 모양과 크기가 같아 모두 □이다.",
    "currentDefinition": "각기둥의 밑면이 정다각형이면 전개도의 옆면인 직사각형들은 모양과 크기가 같아 모두 {합동}이다.",
    "expected": [
      "합동"
    ],
    "firstBlind": {
      "id": "e6-1-2-3-xc18",
      "answers": [
        "합동"
      ],
      "alternativeAnswers": [],
      "reason": "밑면이 정다각형이면 옆면 직사각형의 가로(밑면의 변)와 세로(높이)가 각각 같아 서로 합동이다. '모양과 크기가 같아'가 합동의 뜻을 그대로 풀어 쓴 단서이다. 합동은 5학년 용어라 학년에 맞는다."
    },
    "originalFinding": {
      "id": "e6-1-2-3-xc18",
      "grade": "e6",
      "section": "초6::1-2 각기둥과 각뿔::1-2-3 각기둥의 전개도",
      "sourceHash": "4cbf25cea0cdb7aee365262064fea012434e4e17f79264466148f631f893bc0f",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "밑면이 정다각형이면 전개도의 옆면은 모두 □이다.",
      "expected": [
        "합동"
      ],
      "reason": "'밑면이 정다각형이면'이라는 조건이 합동을 가리켜 답 추론은 가능하다. 다만 입체 이름이 없고 '직사각형'도 참인 답이라 틀을 다듬을 여지가 있다.",
      "proposal": "'각기둥의 밑면이 정다각형이면 전개도의 옆면은 모두 서로 □이다'로 고친다.",
      "primaryReason": "학생문장: “밑면이 정다각형이면 전개도의 옆면은 모두 □이다.” — 어떤 입체의 전개도인지 명시하지 않았다. 각기둥이면 정다각형 밑면으로부터 옆면의 합동을 보장하지만 각뿔은 밑면만 정다각형이어서는 보장되지 않는다.",
      "primaryProposal": "각기둥의 전개도임을 명시한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": "밑면이 정사각형이어도 꼭대기가 중심 위가 아닌 사각뿔의 옆면 삼각형들은 서로 합동이 아닐 수 있다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "각기둥과 옆면의 모양을 노출하고 모양과 크기가 같다는 관계 용어를 묻는다."
  },
  {
    "id": "e6-1-2-4-xc1",
    "grade": "e6",
    "chapter": "1-2 각기둥과 각뿔",
    "student": "각뿔의 밑면은 □개이다.",
    "currentDefinition": "각뿔의 밑면은 {$1$}개이다.",
    "expected": [
      "$1$"
    ],
    "firstBlind": {
      "id": "e6-1-2-4-xc1",
      "answers": [
        "1"
      ],
      "alternativeAnswers": [],
      "reason": "각뿔의 밑면은 1개로 유일하다(각기둥 2개와 대비)."
    },
    "originalFinding": {
      "id": "e6-1-2-4-xc1",
      "grade": "e6",
      "section": "초6::1-2 각기둥과 각뿔::1-2-4 각뿔 알아보기와 각뿔의 밑면과 옆면",
      "sourceHash": "814564552e32bd239783439d98418b45501b04636f3b385761ea7955dd07d76a",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "각뿔의 밑면은 □이다.",
      "expected": [
        "$1$개"
      ],
      "reason": "'각뿔의 밑면은 다각형이다'가 각뿔의 정의 문장 그대로여서 1개와 종류가 다른 자연스러운 답이 된다.",
      "proposal": "'각뿔의 밑면은 □개이다'로 묻는다.",
      "primaryReason": "학생문장: “각뿔의 밑면은 □이다.” — 각뿔 밑면의 개수인지 모양인지 구분되지 않는다. 1개라는 수량과 다각형이라는 모양이 모두 문장을 완성한다.",
      "primaryProposal": "밑면의 개수를 묻는 문장 틀을 남긴다.",
      "initialAlternativeAnswers": [
        "다각형"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "개 단위를 남겨 다각형이라는 모양과 개수 답을 구별했다."
  },
  {
    "id": "e6-1-2-4-xc13",
    "grade": "e6",
    "chapter": "1-2 각기둥과 각뿔",
    "student": "각뿔의 옆면 수와 밑면의 변의 수는 서로 □. 옆면 하나가 밑면의 변 하나에 이어지기 때문이다. 그러나 이 개수로 밑면의 변이 얼마나 긴지는 알 수 없다.",
    "currentDefinition": "각뿔의 옆면 수와 밑면의 변의 수는 서로 {같다}. 옆면 하나가 밑면의 변 하나에 이어지기 때문이다. 그러나 이 개수로 밑면의 변이 얼마나 긴지는 알 수 없다.",
    "expected": [
      "같다"
    ],
    "firstBlind": {
      "id": "e6-1-2-4-xc13",
      "answers": [
        "변의 수"
      ],
      "alternativeAnswers": [
        "변의 개수",
        "꼭짓점의 수"
      ],
      "reason": "옆면 수는 밑면의 변의 수와 같다. 그런데 밑면의 꼭짓점의 수도 옆면 수와 같으므로 '꼭짓점의 수를'도 참이고 조사도 맞는다(예: 옆면 5개이면 밑면은 변 5개, 꼭짓점 5개). 앞의 '변 하나에 이어지므로'와 뒤 문장의 '변이 얼마나 긴지'가 '변' 쪽으로 유도하지만 한 가지로 고정하지는 못한다. '모양'(몇 각형인지)도 뜻은 통하나 조사 '를'과 맞지 않는다."
    },
    "originalFinding": {
      "id": "e6-1-2-4-xc13",
      "grade": "e6",
      "section": "초6::1-2 각기둥과 각뿔::1-2-4 각뿔 알아보기와 각뿔의 밑면과 옆면",
      "sourceHash": "4c7cfd349152454b65f2279988642c40c2fb68f59f0f19f094b0eb8d5622eee0",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "옆면 하나가 밑면의 변 하나에 이어지므로 옆면 수로 □를 알 수 있다. 그러나 □까지 알 수는 없다.",
      "expected": [
        "밑면의 변 수",
        "변의 길이"
      ],
      "reason": "첫 빈칸은 추론할 수 있다. 그러나 둘째 빈칸은 '알 수 없는 것'을 제한 없이 물어 변의 길이, 높이, 넓이, 정다각형 여부가 모두 답이 된다.",
      "proposal": "둘째 문장을 '그러나 밑면의 변의 □까지 알 수는 없다'로 좁힌다.",
      "primaryReason": "학생문장: “옆면 하나가 밑면의 변 하나에 이어지므로 옆면 수로 □를 알 수 있다. 그러나 □까지 알 수는 없다.” — 둘째 빈칸은 옆면 수만으로 알 수 없는 속성을 아무 제한 없이 묻는다. 변의 길이 외에 높이나 넓이도 알 수 없어 서로 다른 측정량이 답이 된다.",
      "primaryProposal": "알 수 있는 개수와 알 수 없는 변의 길이를 대비한다는 범위를 명시한다.",
      "initialAlternativeAnswers": [
        "밑면의 변 수 / 높이",
        "밑면의 변 수 / 밑면의 넓이"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "두 개수를 본문에 남겨 꼭짓점의 수라는 다른 요소를 답하는 경쟁을 막고 연결 이유 및 길이를 알 수 없다는 설명을 보존했다."
  },
  {
    "id": "e6-1-2-4-xc18",
    "grade": "e6",
    "chapter": "1-2 각기둥과 각뿔",
    "student": "각뿔의 전체 면에서 밑면 □개를 제외하면 옆면들이다. 밑면의 변 하나마다 옆면이 □개씩 있으므로 남은 면의 수가 밑면의 변 수이다.",
    "currentDefinition": "각뿔의 전체 면에서 밑면 {$1$}개를 제외하면 옆면들이다. 밑면의 변 하나마다 옆면이 {$1$}개씩 있으므로 남은 면의 수가 밑면의 변 수이다.",
    "expected": [
      "$1$",
      "$1$"
    ],
    "firstBlind": {
      "id": "e6-1-2-4-xc18",
      "answers": [
        "1",
        "1"
      ],
      "alternativeAnswers": [],
      "reason": "각뿔의 밑면은 1개이고, 밑면의 변 하나마다 옆면(삼각형)이 1개씩 있다. 두 칸 모두 1로 정해진다."
    },
    "originalFinding": {
      "id": "e6-1-2-4-xc18",
      "grade": "e6",
      "section": "초6::1-2 각기둥과 각뿔::1-2-4 각뿔 알아보기와 각뿔의 밑면과 옆면",
      "sourceHash": "1dec4fa8a53977bbe59da83ba583a9ef2b9367a0044344267c2a361aeba45c4e",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "전체 면에서 □를 제외하면 옆면들이다. 밑면의 변 하나마다 □ 있으므로 남은 면의 수가 밑면의 변 수이다.",
      "expected": [
        "밑면 한 개",
        "옆면이 하나씩"
      ],
      "reason": "대단원에 각기둥과 각뿔이 함께 있고 문장에 입체 이름이 없다. 각뿔이면 밑면 한 개, 각기둥이면 밑면 두 개로 첫 빈칸의 답이 달라지며 두 경우 모두 뒤 설명과 맞는다.",
      "proposal": "문두에 '각뿔에서'를 넣는다.",
      "primaryReason": "학생문장: “전체 면에서 □를 제외하면 옆면들이다. 밑면의 변 하나마다 □ 있으므로 남은 면의 수가 밑면의 변 수이다.” — 각뿔이라는 입체 이름이 학생문장에 없다. 밑면 하나를 빼는 각뿔과 밑면 두 개를 빼는 각기둥 모두 남은 옆면 수가 밑면의 변 수라는 뒤 설명을 만족한다.",
      "primaryProposal": "각뿔의 면을 세는 상황임을 명시한다.",
      "initialAlternativeAnswers": [
        "밑면 두 개 / 옆면이 하나씩"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "각뿔을 명시하고 요소·개 단위를 남겨 각기둥의 두 밑면 및 답 순서 혼동을 막았다."
  },
  {
    "id": "e6-1-3-5-xc12",
    "grade": "e6",
    "chapter": "1-3 소수의 나눗셈",
    "student": "분수는 분자를 분모로 나눈 몫이다. 분자를 분모로 나누어 소수의 어떤 자리에서 나머지가 $0$이 되면 그 분수는 소수로 정확히 □ 있다.",
    "currentDefinition": "분수는 분자를 분모로 나눈 몫이다. 분자를 분모로 나누어 소수의 어떤 자리에서 나머지가 $0$이 되면 그 분수는 소수로 정확히 {나타낼 수} 있다.",
    "expected": [
      "나타낼 수"
    ],
    "firstBlind": {
      "id": "e6-1-3-5-xc12",
      "answers": [
        "나눗셈"
      ],
      "alternativeAnswers": [
        "(분자)÷(분모)"
      ],
      "reason": "'분자를 분모로 나눈 몫이므로'가 근거이므로 나눗셈으로 정해진다. 앞의 '나눈'이 강한 단서이다. 정확성 유의: 1/3처럼 나누어떨어지지 않는 분수는 초등 범위의 소수로 정확히 바꿀 수 없어 '바꿀 수 있다'는 일반화가 다소 넓다."
    },
    "originalFinding": {
      "id": "e6-1-3-5-xc12",
      "grade": "e6",
      "section": "초6::1-3 소수의 나눗셈::1-3-5 (자연수)÷(자연수), 어림셈하여 몫의 소수점 위치 확인하기",
      "sourceHash": "95c61049dda915d2a5185571bba1c2f96ee324d2a523cc81687bce1c250d66dd",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "answer-leak",
      "student": "분수는 분자를 분모로 나눈 몫이므로, □을 하면 소수로 바꿀 수 있다.",
      "expected": [
        "분자를 분모로 나누는 나눗셈"
      ],
      "reason": "앞 절이 근거를 주므로 답(분자를 분모로 나누는 나눗셈, 분자÷분모)이 분명하다. 답 노출은 난이도 문제이지 명료성 결함이 아니다.",
      "proposal": "유지('분자÷분모' 등 동치 표현 인정).",
      "primaryReason": "학생문장: “분수는 분자를 분모로 나눈 몫이므로, □을 하면 소수로 바꿀 수 있다.” — 앞 절에서 이미 '분자를 분모로 나눈 몫'이라고 밝히고, 빈칸에서 같은 나눗셈 절차 전체를 다시 요구한다. 답의 핵심 대상과 연산이 같은 문장 안에 모두 노출된다.",
      "primaryProposal": "변환할 분수를 제시하고 어떤 수를 어떤 수로 나눌지 직접 판단하도록 중복 절차를 없앤다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "초등에서 유한한 소수로 정확히 나타내는 경우를 나머지 0 조건으로 한정해 1/3 같은 반례와 고급 용어 도입을 피했다."
  },
  {
    "id": "e6-1-4-2-xc11",
    "grade": "e6",
    "chapter": "1-4 비와 비율",
    "student": "비 $6:2$는 $6$이 $2$의 몇 배인지를 보는 것이지, 두 수를 빼서 구한 □를 나타내는 것이 아니다.",
    "currentDefinition": "비 $6:2$는 $6$이 $2$의 몇 배인지를 보는 것이지, 두 수를 빼서 구한 {차}를 나타내는 것이 아니다.",
    "expected": [
      "차"
    ],
    "firstBlind": {
      "id": "e6-1-4-2-xc11",
      "answers": [
        "차"
      ],
      "alternativeAnswers": [
        "차이"
      ],
      "reason": "'두 수를 빼서 구한'이 차를 가리킨다(6-2=4가 아니라 6÷2=3배). '차이'는 같은 뜻이고 조사 '를'과도 맞는다."
    },
    "originalFinding": {
      "id": "e6-1-4-2-xc11",
      "grade": "e6",
      "section": "초6::1-4 비와 비율::1-4-2 비",
      "sourceHash": "28f45a8e1709a24cba07caa057c51f245b1ca87845788bd8b5274a67f1d9c4a4",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "비 $6:2$는 $6$이 $2$의 몇 배인지를 보는 것이지 □를 나타내는 것이 아니다.",
      "expected": [
        "차"
      ],
      "reason": "'몇 배인지'와 대비되는 비교 방식은 뺄셈 비교인 '차'가 자연스러운 단일 답이고 조사 '를'도 맞는다. prior가 든 합이나 곱은 비교 맥락에서 학생이 떠올릴 답이 아니다.",
      "proposal": "유지('6과 2의 차' 등 인정).",
      "primaryReason": "학생문장: “비 $6:2$는 $6$이 $2$의 몇 배인지를 보는 것이지 □를 나타내는 것이 아니다.” — 비가 나타내지 않는 양을 묻지만 어떤 비교 방식과 대조하는지 제한하지 않는다. 차뿐 아니라 합이나 곱도 비 6:2가 뜻하는 배 관계와 다른 값이다.",
      "primaryProposal": "뺄셈으로 비교한 값과 대조하는 문맥을 본문에 남긴다.",
      "initialAlternativeAnswers": [
        "합",
        "곱"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "뺄셈이라는 비교 방법을 남겨 합·곱과 구별하면서 비는 몇 배 비교라는 개념을 유지했다."
  },
  {
    "id": "e6-1-4-6-xc21",
    "grade": "e6",
    "chapter": "1-4 비와 비율",
    "student": "진하기가 $10\\%$인 소금물끼리 섞으면 섞은 소금물의 진하기도 □$\\%$이다.",
    "currentDefinition": "진하기가 $10\\%$인 소금물끼리 섞으면 섞은 소금물의 진하기도 {$10$}$\\%$이다.",
    "expected": [
      "$10$"
    ],
    "firstBlind": {
      "id": "e6-1-4-6-xc21",
      "answers": [
        "10"
      ],
      "alternativeAnswers": [],
      "reason": "섞는 양과 관계없이 소금의 양÷소금물의 양이 10%로 유지된다(예: 100g과 300g을 섞으면 소금 40g÷400g). 문장의 '10%'와 '진하기도'가 답을 암시하지만, 20이라는 오개념을 점검하는 의도로 볼 수 있다."
    },
    "originalFinding": {
      "id": "e6-1-4-6-xc21",
      "grade": "e6",
      "section": "초6::1-4 비와 비율::1-4-6 백분율이 사용되는 경우",
      "sourceHash": "8880b73e33fb0d06481c606de6ea9fe2c4a040a1ce909969a30616ae6779b772",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "answer-leak",
      "student": "진하기가 $10\\%$인 소금물끼리 섞으면 진하기는 □ $10\\%$ 그대로이다.",
      "expected": [
        "변하지 않고"
      ],
      "reason": "답을 못 정하는 문항은 아니다. 다만 빈칸이 '그대로'와 뜻이 겹치는 선택적 부사구라 '20%가 되지 않고', '여전히' 등 여러 표현이 들어가 채점 범위가 넓어진다.",
      "proposal": "'섞으면 진하기는 □%이다'처럼 결과 값을 묻는 틀을 검토한다.",
      "primaryReason": "학생문장: “진하기가 $10\\%$인 소금물끼리 섞으면 진하기는 □ $10\\%$ 그대로이다.” — 빈칸 뒤의 '10% 그대로이다'가 기대답 '변하지 않고'를 이미 말해 준다. 혼합 후 진하기의 변화를 판단할 부분이 같은 문장에 노출되어 있다.",
      "primaryProposal": "결과 수치나 변화 여부 중 하나만 묻고 나머지 중복 표현을 없앤다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "정답과 동의인 '그대로' 노출을 제거하고 섞은 진하기 수치를 묻는다. 같은 진하기끼리의 혼합 조건은 보존했다."
  },
  {
    "id": "e6-1-5-1-xc12",
    "grade": "e6",
    "chapter": "1-5 여러 가지 그래프",
    "student": "띠그래프에서 항목의 비율은 띠 전체 길이에 대한 그 항목의 조각 □의 비율과 같다.",
    "currentDefinition": "띠그래프에서 항목의 비율은 띠 전체 길이에 대한 그 항목의 조각 {길이}의 비율과 같다.",
    "expected": [
      "길이"
    ],
    "firstBlind": {
      "id": "e6-1-5-1-xc12",
      "answers": [
        "길이"
      ],
      "alternativeAnswers": [],
      "reason": "띠그래프는 띠 전체 길이에 대한 조각 길이의 비율로 항목의 비율을 나타낸다. '전체 길이에 대한'이 있어 길이로 정해진다."
    },
    "originalFinding": {
      "id": "e6-1-5-1-xc12",
      "grade": "e6",
      "section": "초6::1-5 여러 가지 그래프::1-5-1 띠그래프",
      "sourceHash": "696aa8b4f89ee801989df9b301b05cf622b0c7cbc31a9f72d944587c4449d523",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "항목의 비율은 □의 비율과 같다.",
      "expected": [
        "띠 전체 길이에 대한 그 조각 길이"
      ],
      "reason": "대단원에 띠그래프와 원그래프가 함께 있는데 문장에 그래프 종류가 없다. 띠의 길이를 써야 하는지 정할 수 없고 '전체에 대한 항목 수'도 성립한다.",
      "proposal": "'띠그래프에서 항목의 비율은 띠 전체 길이에 대한 □의 비율과 같다'로 고친다.",
      "primaryReason": "학생문장: “항목의 비율은 □의 비율과 같다.” — 어떤 그래프인지 학생문장에 없는데 기대답은 띠의 길이 비율을 요구한다. 항목 수의 비율이나 원그래프의 조각 넓이 비율도 성립해 비교 대상을 정할 수 없다.",
      "primaryProposal": "띠그래프의 길이로 항목 비율을 나타내는 문항임을 명시한다.",
      "initialAlternativeAnswers": [
        "전체 수에 대한 항목의 수",
        "원 전체 넓이에 대한 해당 조각 넓이"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "띠그래프와 전체 길이를 명시해 원그래프 또는 자료 수량 비율을 답하는 해석을 막았다."
  },
  {
    "id": "e6-1-5-1-xc25",
    "grade": "e6",
    "chapter": "1-5 여러 가지 그래프",
    "student": "기타로 묶은 항목들의 비율을 모두 더한 것이 □이다. 기타의 비율이 기타에 든 항목마다의 비율은 아니다.",
    "currentDefinition": "기타로 묶은 항목들의 비율을 모두 더한 것이 {기타의 비율}이다. 기타의 비율이 기타에 든 항목마다의 비율은 아니다.",
    "expected": [
      "기타의 비율"
    ],
    "firstBlind": {
      "id": "e6-1-5-1-xc25",
      "answers": [
        "기타의 비율"
      ],
      "alternativeAnswers": [
        "기타 항목의 비율",
        "기타의 백분율"
      ],
      "reason": "답 노출: 바로 뒤 문장이 '기타의 비율이'로 시작해 답이 그대로 나온다. 수학적으로는 타당하다."
    },
    "originalFinding": {
      "id": "e6-1-5-1-xc25",
      "grade": "e6",
      "section": "초6::1-5 여러 가지 그래프::1-5-1 띠그래프",
      "sourceHash": "c496f106853d858887bbd9bfe2beb057c19757437212d699c48197b26fc5cbed",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "answer-leak",
      "student": "기타로 묶은 항목들의 비율을 모두 더한 것이 □이다. 기타의 비율이 기타에 든 항목마다의 비율은 아니다.",
      "expected": [
        "기타의 비율"
      ],
      "reason": "답(기타의 비율)이 분명하게 하나로 정해진다. 뒤 문장의 반복은 변별력 문제일 뿐이다.",
      "proposal": "유지(난이도를 높이려면 뒤 문장을 '이 값이 …'로 바꿀 수 있음).",
      "primaryReason": "학생문장: “기타로 묶은 항목들의 비율을 모두 더한 것이 □이다. 기타의 비율이 기타에 든 항목마다의 비율은 아니다.” — 바로 뒤 문장이 '기타의 비율'을 같은 합계의 주어로 되풀이하며 기대답을 드러낸다. 기타 묶음의 전체 비율을 회상하기보다 뒤 문장을 옮겨 쓰게 된다.",
      "primaryProposal": "주의 문장과 평가 문항을 분리하거나 목표 용어를 뒤에서 다시 제시하지 않는다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "기타로 합친 항목 비율의 합은 기타 비율이라는 답으로 수렴한다. 개별 항목 비율과 같지 않다는 설명은 수학적으로 정확하고 답 노출만으로 명료성 오류가 되지 않는다."
  },
  {
    "id": "e6-1-5-3-xc16",
    "grade": "e6",
    "chapter": "1-5 여러 가지 그래프",
    "student": "같은 자료를 띠그래프와 원그래프로 그리면 각 항목의 전체에 대한 비율을 $100$배 하여 나타낸 □은 같다.",
    "currentDefinition": "같은 자료를 띠그래프와 원그래프로 그리면 각 항목의 전체에 대한 비율을 $100$배 하여 나타낸 {백분율}은 같다.",
    "expected": [
      "백분율"
    ],
    "firstBlind": {
      "id": "e6-1-5-3-xc16",
      "answers": [
        "백분율"
      ],
      "alternativeAnswers": [
        "값"
      ],
      "reason": "비율에 100을 곱해 나타낸 것은 백분율이며, 같은 자료이면 그래프 종류와 관계없이 같다. '값은'도 조사가 맞고 참이지만 일반어여서 개념 확인 효과는 약하다. '100배 하여 나타낸'이 백분율의 정의를 그대로 풀어 쓴 단서이다."
    },
    "originalFinding": {
      "id": "e6-1-5-3-xc16",
      "grade": "e6",
      "section": "초6::1-5 여러 가지 그래프::1-5-3 원그래프",
      "sourceHash": "ece14e7adaec6368a45bd44608b87980b793b588893de440882d76c0a4f7556e",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "같은 자료를 띠그래프와 원그래프로 그리면 각 항목의 □은 같다.",
      "expected": [
        "백분율"
      ],
      "reason": "두 비율그래프에서 같은 것은 자연스럽게 비율(백분율)이고 '비율'은 동의 표현이다. prior가 든 '실제 수'는 조사와 맥락 모두에서 덜 자연스럽다.",
      "proposal": "유지('비율' 인정).",
      "primaryReason": "학생문장: “같은 자료를 띠그래프와 원그래프로 그리면 각 항목의 □은 같다.” — 같은 자료를 두 방식으로 그렸을 때 무엇이 같은지 묻는 빈칸에 비율이라는 단서가 없다. 각 항목의 실제 수와 백분율은 서로 다른 양인데 자료가 같으므로 모두 유지된다.",
      "primaryProposal": "두 그래프가 나타내는 항목별 비율을 비교한다는 대상을 남긴다.",
      "initialAlternativeAnswers": [
        "실제 수"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "100배 표현이라는 기준을 남겨 비율과 백분율의 표현 차이를 명료화했다. 그래프를 바꿔도 비율이 같다는 개념을 유지한다."
  },
  {
    "id": "e6-1-5-5-xc10",
    "grade": "e6",
    "chapter": "1-5 여러 가지 그래프",
    "student": "반마다 인원이 다를 때 좋아하는 운동의 비율을 견주려면, 길이가 같은 띠를 백분율만큼 나눈 □를 반마다 그려 나란히 놓는다.",
    "currentDefinition": "반마다 인원이 다를 때 좋아하는 운동의 비율을 견주려면, 길이가 같은 띠를 백분율만큼 나눈 {띠그래프}를 반마다 그려 나란히 놓는다.",
    "expected": [
      "띠그래프"
    ],
    "firstBlind": {
      "id": "e6-1-5-5-xc10",
      "answers": [
        "띠그래프"
      ],
      "alternativeAnswers": [],
      "reason": "'길이가 같은 띠를 백분율만큼 나눈'은 띠그래프의 설명이다. 문장 안의 '띠'가 이름을 거의 드러내지만 정의형 문항으로는 허용할 만하다."
    },
    "originalFinding": {
      "id": "e6-1-5-5-xc10",
      "grade": "e6",
      "section": "초6::1-5 여러 가지 그래프::1-5-5 여러 가지 그래프 비교하기",
      "sourceHash": "13f4608ea4a7f090a549df0010179543be6b348e402e23e2ad05e9f291199574",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "반마다 인원이 다를 때 좋아하는 운동의 비율을 견주려면 □를 반마다 그려 나란히 놓는다.",
      "expected": [
        "띠그래프"
      ],
      "reason": "'나란히 놓는다'는 띠그래프의 교과서적 장점이라 기대답 추론은 가능하다. 그러나 원그래프를 반마다 그려 비교하는 것도 틀린 방법이 아니다.",
      "proposal": "'띠 모양의'처럼 단서를 보강하거나 원그래프 답의 처리 기준을 정한다.",
      "primaryReason": "학생문장: “반마다 인원이 다를 때 좋아하는 운동의 비율을 견주려면 □를 반마다 그려 나란히 놓는다.” — 학급별 비율 비교에 사용할 그래프의 종류를 띠 모양으로 한정하지 않았다. 원그래프를 각 반마다 그려 나란히 두어도 비율을 비교할 수 있어 서로 다른 그래프가 답이 된다.",
      "primaryProposal": "여러 항목의 길이를 같은 기준선에서 비교한다는 의도를 명시하거나 두 비율그래프를 허용한다.",
      "initialAlternativeAnswers": [
        "원그래프"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "띠로 나타내는 표현 방식을 지정해 원그래프라는 다른 유효한 비교 방법과 구별했다."
  },
  {
    "id": "e6-1-5-5-xc13",
    "grade": "e6",
    "chapter": "1-5 여러 가지 그래프",
    "student": "막대의 길이로 항목의 수량을 나타낸 □와 원을 항목의 비율만큼 나눈 □를 함께 보면 자료를 더 잘 이해할 수 있다.",
    "currentDefinition": "막대의 길이로 항목의 수량을 나타낸 {막대그래프}와 원을 항목의 비율만큼 나눈 {원그래프}를 함께 보면 자료를 더 잘 이해할 수 있다.",
    "expected": [
      "막대그래프",
      "원그래프"
    ],
    "firstBlind": {
      "id": "e6-1-5-5-xc13",
      "answers": [
        "막대그래프",
        "원그래프"
      ],
      "alternativeAnswers": [],
      "reason": "각각 '막대의 길이로 수량', '원을 비율만큼 나눈'으로 정해지고 순서도 문장 순서로 고정된다. '막대', '원'이 이름을 직접 암시한다(부분 노출)."
    },
    "originalFinding": {
      "id": "e6-1-5-5-xc13",
      "grade": "e6",
      "section": "초6::1-5 여러 가지 그래프::1-5-5 여러 가지 그래프 비교하기",
      "sourceHash": "4c9bd55d594478adfb9aed57d198150484671718fe6ea980ac601f0eec3fcd5e",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "□로 수량을, □로 비율을 함께 보면 자료를 더 잘 이해할 수 있다.",
      "expected": [
        "막대그래프",
        "원그래프"
      ],
      "reason": "비율을 보는 그래프는 띠그래프와 원그래프가 동등하게 표준이고 조사도 같다. 둘째 빈칸을 원그래프로 정할 근거가 없다(첫 빈칸도 그림그래프가 가능).",
      "proposal": "띠그래프와 원그래프를 모두 인정하거나 '원 모양의 □로 비율을'처럼 단서를 준다.",
      "primaryReason": "학생문장: “□로 수량을, □로 비율을 함께 보면 자료를 더 잘 이해할 수 있다.” — 수량과 비율이라는 기능만 주었고 사용할 그래프의 종류를 특정하지 않았다. 수량은 그림그래프, 비율은 띠그래프로도 나타낼 수 있어 여러 조합이 성립한다.",
      "primaryProposal": "특정 그래프를 선택할 자료와 비교 목적을 제시하거나 가능한 그래프들을 인정한다.",
      "initialAlternativeAnswers": [
        "그림그래프 / 띠그래프",
        "막대그래프 / 띠그래프"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "각 그래프의 표현 방식을 남겨 그림그래프·띠그래프를 고르는 다른 참인 조합을 막았다."
  },
  {
    "id": "e6-1-5-5-xc15",
    "grade": "e6",
    "chapter": "1-5 여러 가지 그래프",
    "student": "막대그래프의 항목들이 하나의 전체를 이룰 때, 각 항목의 비율은 그 항목의 수량을 전체 수량으로 □ 값이다. 전체 수량은 기준량이고 그 항목의 수량은 비교하는 양이다.",
    "currentDefinition": "막대그래프의 항목들이 하나의 전체를 이룰 때, 각 항목의 비율은 그 항목의 수량을 전체 수량으로 {나눈} 값이다. 전체 수량은 기준량이고 그 항목의 수량은 비교하는 양이다.",
    "expected": [
      "나눈"
    ],
    "firstBlind": {
      "id": "e6-1-5-5-xc15",
      "answers": [
        "기준량",
        "비교하는 양"
      ],
      "alternativeAnswers": [
        "전체, 부분",
        "분모, 분자"
      ],
      "reason": "비율=(비교하는 양)÷(기준량)에서 합이 기준량, 각 항목의 수량이 비교하는 양이다. 그러나 '합은 전체이고 각 항목의 수량은 부분이다'도 참이고 더 자연스러워 답의 종류가 정해지지 않는다. '각 항목의 비율에서 막대 수량의 합은'이라는 문장 자체가 어색해, 학생이 '비율의 합은 100%'로 잘못 읽고 첫 칸에 100%를 쓸 위험도 있다. '비율을 구할 때 기준량은 …'처럼 용어를 묻는다는 점이 드러나게 고쳐야 한다."
    },
    "originalFinding": {
      "id": "e6-1-5-5-xc15",
      "grade": "e6",
      "section": "초6::1-5 여러 가지 그래프::1-5-5 여러 가지 그래프 비교하기",
      "sourceHash": "4f180e89e285c7f812de72dbdf39b3af3eef596dcb849e3a31d1537f0726bb09",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "long-phrase",
      "student": "항목들이 하나의 전체를 이룰 때, □이고 □이다.",
      "expected": [
        "막대 수량의 합이 기준량",
        "각 항목의 수량이 비교하는 양"
      ],
      "reason": "두 빈칸이 주어와 서술어를 모두 삼켜 '기준량'과 '비교하는 양'을 말해야 한다는 것조차 알 수 없다.",
      "proposal": "'막대 수량의 합이 □이고 각 항목의 수량이 □이다'로 용어만 묻는다.",
      "primaryReason": "학생문장: “항목들이 하나의 전체를 이룰 때, □이고 □이다.” — 기준량과 비교하는 양을 묻는다는 이름까지 두 빈칸에 모두 들어 있다. 항목들이 전체를 이룬다는 조건만 남아 어떤 두 관계를 서술해야 하는지 답 범위를 정할 수 없다.",
      "primaryProposal": "기준량은 무엇이고 비교하는 양은 무엇인지 이름을 남긴다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "비율의 연산과 두 대상의 순서를 본문에 남겨 전체·부분·분모·분자라는 다른 명칭을 요구하는 문제를 막았다."
  },
  {
    "id": "e6-1-5-5-xc22",
    "grade": "e6",
    "chapter": "1-5 여러 가지 그래프",
    "student": "두 집단의 전체 수가 다르면 같은 항목의 비율이 달라도 그 항목의 실제 수는 □ 수 있다.",
    "currentDefinition": "두 집단의 전체 수가 다르면 같은 항목의 비율이 달라도 그 항목의 실제 수는 {같을} 수 있다.",
    "expected": [
      "같을"
    ],
    "firstBlind": {
      "id": "e6-1-5-5-xc22",
      "answers": [
        "같을"
      ],
      "alternativeAnswers": [],
      "reason": "'달라도'라는 양보 표현 때문에 자연스러운 완성은 '같을'이다(예: 20명의 50%와 40명의 25%는 모두 10명). '다를 수 있다'도 수학적으로는 참이지만(20명의 50%=10명, 40명의 30%=12명) 양보 구문과 어울리지 않아 대체 답으로 보지 않았다."
    },
    "originalFinding": {
      "id": "e6-1-5-5-xc22",
      "grade": "e6",
      "section": "초6::1-5 여러 가지 그래프::1-5-5 여러 가지 그래프 비교하기",
      "sourceHash": "fa4eb07eb9c610d999c633de0525170d7f1d6d169b853d7d957280802f1da1b7",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "두 집단의 전체 수가 다르면 □ 수 있다.",
      "expected": [
        "비율이 달라도 실제 수는 같을"
      ],
      "reason": "결론 전체가 빈칸이라 '비율이 같아도 실제 수는 다를', '실제 수가 많아도 비율은 낮을' 등 다른 명제가 들어간다.",
      "proposal": "'… 비율이 달라도 실제 수는 □ 수 있다'로 좁힌다.",
      "primaryReason": "학생문장: “두 집단의 전체 수가 다르면 □ 수 있다.” — 두 집단의 전체 수가 다르다는 조건 뒤 결론 전체가 빈칸이다. 비율과 실제 수의 관계 중 어느 경우를 설명해야 할지 정해지지 않는다.",
      "primaryProposal": "같은 비율 또는 같은 실제 수 중 비교할 조건과 결론 대상을 명시한다.",
      "initialAlternativeAnswers": [
        "비율이 같아도 실제 수는 다를"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "비율이 다른 조건과 실제 수라는 비교량을 남겨 반대 조합의 다른 참인 명제를 막았다."
  },
  {
    "id": "e6-1-6-1-xc2",
    "grade": "e6",
    "chapter": "1-6 직육면체의 겉넓이와 부피",
    "student": "직육면체에서 마주 보는 두 면의 넓이는 서로 □.",
    "currentDefinition": "직육면체에서 마주 보는 두 면의 넓이는 서로 {같다}.",
    "expected": [
      "같다"
    ],
    "firstBlind": {
      "id": "e6-1-6-1-xc2",
      "answers": [
        "같다"
      ],
      "alternativeAnswers": [],
      "reason": "직육면체에서 마주 보는 두 면은 합동이므로 넓이가 같다."
    },
    "originalFinding": {
      "id": "e6-1-6-1-xc2",
      "grade": "e6",
      "section": "초6::1-6 직육면체의 겉넓이와 부피::1-6-1 직육면체의 겉넓이 구하는 방법",
      "sourceHash": "df826e6409eb08daa8f9490df3da54e530f3e4e3af4a7b25af5a35127df87975",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "직육면체에서 마주 보는 두 면은 □.",
      "expected": [
        "넓이가 같다"
      ],
      "reason": "'서로 평행하다'(5학년 표준 성질)와 '합동이다'가 '넓이가 같다'보다 더 익숙하거나 강한 참인 답이다. 서술어 전체가 빈칸이라 종류를 정할 수 없다.",
      "proposal": "'마주 보는 두 면은 넓이가 □'로 좁히고 '합동이다' 인정 여부를 정한다.",
      "primaryReason": "학생문장: “직육면체에서 마주 보는 두 면은 □.” — 마주 보는 두 면의 어떤 성질을 답해야 하는지 없다. 넓이의 같음, 합동, 평행은 구별되는 개념인데 모두 성립한다.",
      "primaryProposal": "두 면의 넓이를 비교하는 문장 틀을 남긴다.",
      "initialAlternativeAnswers": [
        "서로 평행하다",
        "합동이다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "넓이를 명시해 평행·합동이라는 다른 관계와 구별했다."
  },
  {
    "id": "e6-1-6-1-xc13",
    "grade": "e6",
    "chapter": "1-6 직육면체의 겉넓이와 부피",
    "student": "정육면체의 겉넓이를 $6$으로 나누면 한 면의 넓이이다. 같은 수를 두 번 곱해 그 넓이가 되는 수가 정육면체의 한 □의 길이이다.",
    "currentDefinition": "정육면체의 겉넓이를 $6$으로 나누면 한 면의 넓이이다. 같은 수를 두 번 곱해 그 넓이가 되는 수가 정육면체의 한 {모서리}의 길이이다.",
    "expected": [
      "모서리"
    ],
    "firstBlind": {
      "id": "e6-1-6-1-xc13",
      "answers": [
        "모서리"
      ],
      "alternativeAnswers": [
        "변"
      ],
      "reason": "정육면체 맥락에서는 '한 모서리의 길이'가 자연스럽다. 그런데 바로 앞에서 '한 면의 넓이'를 말했으므로 그 면(정사각형)의 '한 변의 길이'도 참이고 자연스럽다(예: 겉넓이 54 → 한 면 9 → 한 변 3 = 한 모서리 3). 두 답을 모두 인정하거나 '정육면체의 한 □'으로 한정해야 한다."
    },
    "originalFinding": {
      "id": "e6-1-6-1-xc13",
      "grade": "e6",
      "section": "초6::1-6 직육면체의 겉넓이와 부피::1-6-1 직육면체의 겉넓이 구하는 방법",
      "sourceHash": "c099b01e05ea9ea1badb7fcc288aebfaf9943fd8a83c514f38ac7791b0596a9d",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "missing-referent",
      "student": "정육면체의 겉넓이를 $6$으로 나눈 한 면의 넓이는 □이므로, 그 수가 한 모서리의 길이이다.",
      "expected": [
        "같은 수를 두 번 곱한 값"
      ],
      "reason": "학생은 '한 모서리의 길이를 두 번 곱한 값'처럼 쓸 가능성이 높은데, 그러면 뒤의 '그 수가 한 모서리의 길이'가 순환 표현이 된다. '그 수'가 가리키는 대상도 빈칸 내용에 달려 있어 불안정하다.",
      "proposal": "'한 면의 넓이는 한 모서리의 길이를 □번 곱한 값이므로'처럼 틀을 고친다.",
      "primaryReason": "학생문장: “정육면체의 겉넓이를 $6$으로 나눈 한 면의 넓이는 □이므로, 그 수가 한 모서리의 길이이다.” — 끝의 '그 수'가 이미 계산한 한 면의 넓이인지, 빈칸 안에서 두 번 곱하는 수인지 학생문장에서 명확하지 않다. 넓이와 모서리 길이를 혼동하지 않도록 지시 대상을 검토할 필요가 있다.",
      "primaryProposal": "두 번 곱해서 한 면의 넓이가 되는 수를 찾는다는 절차를 명시한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": "한 면의 넓이가 9일 때 모서리는 3이지 9가 아니다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "길이의 소속을 정육면체로 명시해 앞의 정사각형 한 변이라는 대상과의 혼동을 줄였다. 모서리와 한 면의 변 길이는 동치임을 인정한다."
  },
  {
    "id": "e6-1-6-1-xc26",
    "grade": "e6",
    "chapter": "1-6 직육면체의 겉넓이와 부피",
    "student": "직육면체를 어느 면이 바닥에 닿게 놓든 겉넓이는 □.",
    "currentDefinition": "직육면체를 어느 면이 바닥에 닿게 놓든 겉넓이는 {같다}.",
    "expected": [
      "같다"
    ],
    "firstBlind": {
      "id": "e6-1-6-1-xc26",
      "answers": [
        "같다"
      ],
      "alternativeAnswers": [
        "변하지 않는다",
        "달라지지 않는다"
      ],
      "reason": "놓는 방향을 바꿔도 여섯 면은 그대로이므로 겉넓이는 같다. 대체 표현은 모두 같은 뜻이다."
    },
    "originalFinding": {
      "id": "e6-1-6-1-xc26",
      "grade": "e6",
      "section": "초6::1-6 직육면체의 겉넓이와 부피::1-6-1 직육면체의 겉넓이 구하는 방법",
      "sourceHash": "c64c808019275536f14e2c77653babb911f828af0ab16d8af9005c88e2e4b107",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "직육면체를 어느 면이 바닥에 닿게 놓든 □.",
      "expected": [
        "겉넓이는 같다"
      ],
      "reason": "대단원이 겉넓이와 부피라서 '부피는 같다'가 똑같이 자연스러운 다른 답이다. 어느 양을 묻는지 단서가 없다.",
      "proposal": "'어느 면이 바닥에 닿게 놓든 겉넓이는 □'로 대상을 남긴다.",
      "primaryReason": "학생문장: “직육면체를 어느 면이 바닥에 닿게 놓든 □.” — 바닥에 닿는 면을 바꿀 때 어떤 양이 유지되는지 지정하지 않았다. 겉넓이와 부피 모두 변하지 않으며 서로 다른 측정량이다.",
      "primaryProposal": "겉넓이의 변화를 묻는다고 명시한다.",
      "initialAlternativeAnswers": [
        "부피는 같다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "비교량을 겉넓이로 남겨 부피라는 다른 참인 답과 구별했다."
  },
  {
    "id": "e6-1-6-2-xc22",
    "grade": "e6",
    "chapter": "1-6 직육면체의 겉넓이와 부피",
    "student": "정육면체의 부피는 한 모서리의 길이를 □번 곱한 값이므로, 그 횟수만큼 곱해 부피가 되는 수가 한 모서리의 길이이다.",
    "currentDefinition": "정육면체의 부피는 한 모서리의 길이를 {$3$}번 곱한 값이므로, 그 횟수만큼 곱해 부피가 되는 수가 한 모서리의 길이이다.",
    "expected": [
      "$3$"
    ],
    "firstBlind": {
      "id": "e6-1-6-2-xc22",
      "answers": [
        "3"
      ],
      "alternativeAnswers": [
        "세"
      ],
      "reason": "부피는 (한 모서리)×(한 모서리)×(한 모서리)이므로 교과서 관용 표현으로 '세 번 곱한 값'이다. 곱셈 기호의 횟수(2회)로 세는 학생이 있을 수 있으나 '두 번 곱해 넓이'라는 같은 계열 표현과 일관되므로 3으로 정해진다."
    },
    "originalFinding": {
      "id": "e6-1-6-2-xc22",
      "grade": "e6",
      "section": "초6::1-6 직육면체의 겉넓이와 부피::1-6-2 직육면체의 부피 비교와 직육면체의 부피 구하는 방법",
      "sourceHash": "d6f4cccfb41bfde97202afd3aa43e276b779b92e9b42596d396a15468e7de4b9",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "answer-leak",
      "student": "정육면체의 부피는 □이므로, 세 번 곱해 부피가 되는 수가 한 모서리의 길이이다.",
      "expected": [
        "같은 수를 세 번 곱한 값"
      ],
      "reason": "답(한 모서리의 길이를 세 번 곱한 값)이 분명하고 동치 표현으로 처리할 수 있다. 뒤 절의 단서는 난이도 문제다.",
      "proposal": "유지.",
      "primaryReason": "학생문장: “정육면체의 부피는 □이므로, 세 번 곱해 부피가 되는 수가 한 모서리의 길이이다.” — 빈칸 뒤에서 이미 '세 번 곱해 부피가 되는 수'라고 설명하여 기대답의 핵심인 같은 수를 세 번 곱한다는 관계를 드러낸다. 부피 공식 자체를 회상하는 빈칸으로는 중복이다.",
      "primaryProposal": "부피 공식과 역으로 모서리를 구하는 설명을 분리하거나 빈칸 위치를 바꾼다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "곱하는 대상과 횟수 종류를 남겨 같은 수라는 긴 답의 지시 대상 혼동을 막았다. 모서리 역산 이유는 보존했다."
  },
  {
    "id": "e6-1-6-3-xc5",
    "grade": "e6",
    "chapter": "1-6 직육면체의 겉넓이와 부피",
    "student": "$1\\,\\mathrm{m}^3$는 $1000000\\,\\mathrm{cm}^3$이므로, 같은 부피를 $\\mathrm{m}^3$에서 $\\mathrm{cm}^3$로 나타내면 수가 □배가 된다.",
    "currentDefinition": "$1\\,\\mathrm{m}^3$는 $1000000\\,\\mathrm{cm}^3$이므로, 같은 부피를 $\\mathrm{m}^3$에서 $\\mathrm{cm}^3$로 나타내면 수가 {$1000000$}배가 된다.",
    "expected": [
      "$1000000$"
    ],
    "firstBlind": {
      "id": "e6-1-6-3-xc5",
      "answers": [
        "1000000"
      ],
      "alternativeAnswers": [
        "백만"
      ],
      "reason": "답 노출: 앞 절에 1000000이 그대로 있어 옮겨 적기만 하면 된다. 수학적으로는 정확하다."
    },
    "originalFinding": {
      "id": "e6-1-6-3-xc5",
      "grade": "e6",
      "section": "초6::1-6 직육면체의 겉넓이와 부피::1-6-3 ㎥ 알아보기",
      "sourceHash": "8ce5bb193b71e345c4e920c69d1445b37f904a76e765a663601b51857f50fdc1",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "□, 같은 부피를 $\\mathrm{cm}^3$로 나타내면 수가 □가 된다.",
      "expected": [
        "$1\\,\\mathrm{m}^3$가 $1000000\\,\\mathrm{cm}^3$이므로",
        "$1000000$배"
      ],
      "reason": "변환 전 단위가 첫 빈칸에 통째로 가려지고 그 빈칸이 이유절 전체다. 무엇을 써야 하는지, 몇 배인지가 문장만으로 정해지지 않는다.",
      "proposal": "'$1\\,\\mathrm{m}^3$는 □ $\\mathrm{cm}^3$이므로, $\\mathrm{m}^3$로 나타낸 부피를 $\\mathrm{cm}^3$로 나타내면 수가 □배가 된다'로 고친다.",
      "primaryReason": "학생문장: “□, 같은 부피를 $\\mathrm{cm}^3$로 나타내면 수가 □가 된다.” — 변환 전 단위가 첫 빈칸에 통째로 들어 있어 cm³로 바꿀 때 수가 몇 배가 되는지 정할 수 없다. m³에서 바꾸는지 다른 부피 단위에서 바꾸는지에 따라 배율이 달라진다.",
      "primaryProposal": "같은 부피를 m³에서 cm³로 바꾸는 상황을 명시한다.",
      "initialAlternativeAnswers": [
        "1 L가 1000 cm³이므로 / 1000배"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "변환 전후 단위와 이유를 남겨 이유절 전체가 가려졌던 문제를 없애고 변환 배율만 묻는다."
  },
  {
    "id": "e6-1-6-3-xc20",
    "grade": "e6",
    "chapter": "1-6 직육면체의 겉넓이와 부피",
    "student": "$0$보다 큰 같은 부피를 더 작은 단위로 나타내면 그 단위가 더 많이 들어가므로 단위의 개수를 나타내는 수가 □.",
    "currentDefinition": "$0$보다 큰 같은 부피를 더 작은 단위로 나타내면 그 단위가 더 많이 들어가므로 단위의 개수를 나타내는 수가 {커진다}.",
    "expected": [
      "커진다"
    ],
    "firstBlind": {
      "id": "e6-1-6-3-xc20",
      "answers": [
        "커진다"
      ],
      "alternativeAnswers": [
        "크다",
        "많아진다",
        "늘어난다"
      ],
      "reason": "단위가 작을수록 같은 부피에 더 많이 들어가므로 수가 커진다. '0보다 큰'이라는 조건이 있어 0인 경우의 예외도 막았다. 대체 표현은 같은 뜻이다."
    },
    "originalFinding": {
      "id": "e6-1-6-3-xc20",
      "grade": "e6",
      "section": "초6::1-6 직육면체의 겉넓이와 부피::1-6-3 ㎥ 알아보기",
      "sourceHash": "cf5fbb4e48cdf959c6cbdc868bea9e4bd33084aed5d6beba89fba37a8b1e0f22",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "□를 더 작은 단위로 나타내면 □ 수가 커진다.",
      "expected": [
        "$0$보다 큰 같은 부피",
        "그 단위가 더 많이 들어가므로"
      ],
      "reason": "주어와 이유가 모두 절 단위 빈칸이다. '0보다 큰 같은 부피' 같은 한정어를 학생이 떠올릴 수 없고 길이·넓이·들이 등 다른 양도 성립한다.",
      "proposal": "'같은 부피를 더 작은 단위로 나타내면 수가 □'처럼 결과만 묻는다.",
      "primaryReason": "학생문장: “□를 더 작은 단위로 나타내면 □ 수가 커진다.” — 어떤 종류의 양을 다루는지 첫 빈칸에 모두 가려져 있다. 같은 원리는 양수인 길이와 넓이에도 성립하므로 부피를 써야 한다는 단서가 없다.",
      "primaryProposal": "부피를 더 작은 단위로 바꾼다는 대상을 남기고 표시 수의 변화나 이유를 묻는다.",
      "initialAlternativeAnswers": [
        "0보다 큰 같은 길이 / 그 단위가 더 많이 들어가므로",
        "0보다 큰 같은 넓이 / 그 단위가 더 많이 들어가므로"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "양수인 같은 부피와 작은 단위라는 조건 및 이유를 본문에 남겨 주어·이유 전체를 요구하지 않는다. 부피 0의 예외도 유지한다."
  },
  {
    "id": "e6-2-2-4-xc15",
    "grade": "e6",
    "chapter": "2-2 소수의 나눗셈",
    "student": "같은 몫을 서로 다른 자리까지 반올림한 값이 항상 같은 것은 □. $2.36$을 소수 첫째 자리와 둘째 자리까지 나타내면 각각 $2.4$와 $2.36$이다.",
    "currentDefinition": "같은 몫을 서로 다른 자리까지 반올림한 값이 항상 같은 것은 {아니다}. $2.36$을 소수 첫째 자리와 둘째 자리까지 나타내면 각각 $2.4$와 $2.36$이다.",
    "expected": [
      "아니다"
    ],
    "firstBlind": {
      "id": "e6-2-2-4-xc15",
      "answers": [
        "다를 수 있다"
      ],
      "alternativeAnswers": [
        "달라질 수 있다",
        "다르다",
        "달라진다"
      ],
      "reason": "정확한 완성은 '다를 수 있다'이다. 그러나 빈칸 형태로는 학생이 '다르다/달라진다'로 단정해 쓰기 쉽고, 이는 항상 참이 아니다. 반례: 몫 3.004를 소수 첫째 자리까지 나타내면 3.0, 둘째 자리까지 나타내면 3.00으로 값이 같다. 몫이 2로 나누어떨어질 때도 같다. 문장 끝에 '~ 수 있다'를 남기고 '다를'만 묻는 편이 안전하다."
    },
    "originalFinding": {
      "id": "e6-2-2-4-xc15",
      "grade": "e6",
      "section": "초6::2-2 소수의 나눗셈::2-2-4 몫을 반올림하여 나타내기",
      "sourceHash": "7b0de83892b8d21843a642fa6bf44ae198d96b0839085605c6c5dcb4b188e717",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "같은 몫도 □ 나타낸 값이 □.",
      "expected": [
        "반올림하는 자리에 따라",
        "달라질 수 있다"
      ],
      "reason": "조건과 결론이 동시에 빈칸이고 반올림이라는 주제가 문장에 없다. '나타내는 방법에 따라', '분수로 나타내도' 등 서로 다른 조합이 가능하다.",
      "proposal": "'같은 몫도 반올림하는 □에 따라 나타낸 값이 달라질 수 있다'로 한 곳만 묻는다.",
      "primaryReason": "학생문장: “같은 몫도 □ 나타낸 값이 □.” — 반올림한 몫을 비교한다는 주제가 학생문장에서 사라졌다. 같은 몫을 나타내는 방법이나 어림 방법·자리에 따라 달라질 수 있다는 서로 다른 내용을 쓸 수 있다.",
      "primaryProposal": "반올림하는 자리를 달리한다는 상황을 남기고 어림값의 변화를 묻는다.",
      "initialAlternativeAnswers": [
        "어림하는 방법에 따라 / 달라질 수 있다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "항상 같음의 부정으로 질문을 고정하고 실제 어림값을 남겨 가능성 표현을 통째로 요구하지 않는다."
  },
  {
    "id": "e6-2-2-4-xc17",
    "grade": "e6",
    "chapter": "2-2 소수의 나눗셈",
    "student": "서로 다른 몫도 반올림하면 □가 될 수 있다. 반올림한 값이 같다고 정확한 몫이 같은 것은 아니다.",
    "currentDefinition": "서로 다른 몫도 반올림하면 {같은 수}가 될 수 있다. 반올림한 값이 같다고 정확한 몫이 같은 것은 아니다.",
    "expected": [
      "같은 수"
    ],
    "firstBlind": {
      "id": "e6-2-2-4-xc17",
      "answers": [
        "같은 수"
      ],
      "alternativeAnswers": [
        "같은 값"
      ],
      "reason": "답 노출: 뒤 문장 '반올림한 값이 같다고'에 답이 나온다. 조사 '가'에는 '같은 수'가 맞고, '같은 값'은 뜻은 같으나 '값이'가 되어 조사가 어긋난다. 예: 2.34와 2.26은 소수 첫째 자리까지 반올림하면 모두 2.3이다."
    },
    "originalFinding": {
      "id": "e6-2-2-4-xc17",
      "grade": "e6",
      "section": "초6::2-2 소수의 나눗셈::2-2-4 몫을 반올림하여 나타내기",
      "sourceHash": "a720dbeeb8475d3f0b920c9e14e89b76995f8adaccbdc742d972ed8bf6b590bd",
      "status": "not_issue",
      "initialStatus": "confirmed",
      "category": "answer-leak",
      "student": "서로 다른 몫도 반올림하면 □가 될 수 있다. 반올림한 값이 같다고 정확한 몫이 같은 것은 아니다.",
      "expected": [
        "같은 수"
      ],
      "reason": "답(같은 수, 같은 값)이 분명하게 하나다. 뒤 문장의 단서는 변별력 문제다.",
      "proposal": "유지('같은 값' 인정).",
      "primaryReason": "학생문장: “서로 다른 몫도 반올림하면 □가 될 수 있다. 반올림한 값이 같다고 정확한 몫이 같은 것은 아니다.” — 뒤 문장이 '반올림한 값이 같다고'라고 하여 빈칸의 '같은 수'를 그대로 알려 준다. 서로 다른 수의 반올림 결과를 판단할 답이 같은 문장에 노출된다.",
      "primaryProposal": "주의 설명과 빈칸 문항을 분리하거나 구체적인 수 두 개로 판단하게 한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "반올림은 여러 정확한 값이 같은 어림값이 될 수 있고 뒤의 주의 설명도 정확하다. 같은 수·같은 값은 동의 답으로 수렴한다."
  },
  {
    "id": "e6-2-3-1-xc20",
    "grade": "e6",
    "chapter": "2-3 공간과 입체",
    "student": "쌓기나무로 만든 두 입체의 앞에서 본 모양과 옆에서 본 모양이 각각 같아도, 사용한 쌓기나무의 개수가 항상 같은 것은 □. 보이지 않는 자리에 쌓인 개수가 다를 수 있기 때문이다.",
    "currentDefinition": "쌓기나무로 만든 두 입체의 앞에서 본 모양과 옆에서 본 모양이 각각 같아도, 사용한 쌓기나무의 개수가 항상 같은 것은 {아니다}. 보이지 않는 자리에 쌓인 개수가 다를 수 있기 때문이다.",
    "expected": [
      "아니다"
    ],
    "firstBlind": {
      "id": "e6-2-3-1-xc20",
      "answers": [
        "다를 수 있다"
      ],
      "alternativeAnswers": [
        "같지 않을 수 있다",
        "다르다"
      ],
      "reason": "앞·옆 모양이 같은 두 입체도 쌓기나무 수가 다를 수 있으므로 정확한 완성은 '다를 수 있다'이다. '다르다'로 단정하면 거짓이다(모양이 같은 두 입체는 개수도 같다). 문장도 모호하다. '입체는 앞과 옆에서 본 모양이 같아도'는 한 입체의 앞 모양과 옆 모양이 서로 같다는 뜻으로도 읽힌다. '두 입체의 앞, 옆에서 본 모양이 각각 같아도'로 고쳐야 한다."
    },
    "originalFinding": {
      "id": "e6-2-3-1-xc20",
      "grade": "e6",
      "section": "초6::2-3 공간과 입체::2-3-1 어느 방향에서 보았는지 알아보기",
      "sourceHash": "4d7671845c5aa7f984500ff169a63af5c79e555076a53481fdb9327a6cc0fcbc",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "앞과 옆에서 본 모양이 같아도 □가 다를 수 있다.",
      "expected": [
        "쌓은 개수"
      ],
      "reason": "'쌓은 모양'과 '위에서 본 모양'이 달라질 수 있다는 것도 이 단원의 표준 결론이다. 이들과 개수를 가르는 단서는 조사 '가'의 받침뿐이다.",
      "proposal": "'쌓기나무의 □가 다를 수 있다'로 대상어를 남긴다.",
      "primaryReason": "학생문장: “앞과 옆에서 본 모양이 같아도 □가 다를 수 있다.” — 앞과 옆에서 본 모양이 같을 때 어떤 다른 속성이 달라질 수 있는지 전체가 비었다. 쌓은 개수와 위에서 본 모양은 서로 다른 정보이며 모두 달라질 수 있다.",
      "primaryProposal": "쌓기나무의 총개수를 비교한다는 대상을 남긴다.",
      "initialAlternativeAnswers": [
        "위에서 본 모양"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "두 입체를 비교한다고 명시하고 항상 같음의 부정으로 묻는다. 같은 개수의 경우도 있음을 배제하지 않고 숨은 개수라는 이유를 남겼다."
  },
  {
    "id": "e6-2-3-1-xc27",
    "grade": "e6",
    "chapter": "2-3 공간과 입체",
    "student": "물체의 위아래를 그대로 두고 오른쪽 옆면이 앞으로 오게 $90^\\circ$ 돌려 놓으면, 앞에서 본 모양은 처음에 □에서 본 모양과 같다.",
    "currentDefinition": "물체의 위아래를 그대로 두고 오른쪽 옆면이 앞으로 오게 $90^\\circ$ 돌려 놓으면, 앞에서 본 모양은 처음에 {오른쪽 옆}에서 본 모양과 같다.",
    "expected": [
      "오른쪽 옆"
    ],
    "firstBlind": {
      "id": "e6-2-3-1-xc27",
      "answers": [
        "옆에서 본 모양"
      ],
      "alternativeAnswers": [
        "옆 모양",
        "앞에서 본 모양"
      ],
      "reason": "옆면이 앞으로 오게 돌리면 새 앞 모양은 처음의 옆에서 본 모양과 같아진다. 그러나 문장이 '같아질 수 있다'라는 가능 표현이어서 '앞에서 본 모양'도 참이다(예: 정육면체나 원기둥은 90° 돌려도 앞 모양이 처음의 앞 모양과 같다). '같아진다'로 단정하고 어느 쪽 옆인지(좌우 뒤집힘) 조건을 밝혀야 한 가지로 정해진다."
    },
    "originalFinding": {
      "id": "e6-2-3-1-xc27",
      "grade": "e6",
      "section": "초6::2-3 공간과 입체::2-3-1 어느 방향에서 보았는지 알아보기",
      "sourceHash": "b2d948e186fa6122d7a2192bc34c87d11a9617a166e887079e65348343f4fcc5",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "물체를 돌려 놓으면 앞에서 본 모양이 처음의 □과 같아질 수 있다.",
      "expected": [
        "옆에서 본 모양"
      ],
      "reason": "위·앞·옆을 다루는 단원 맥락에서는 '옆에서 본 모양'이 우선 떠오른다. 그러나 반 바퀴 돌리면 '뒤에서 본 모양'도 성립하고 회전량이 문장에 없다.",
      "proposal": "'물체를 옆으로 90° 돌려 놓으면'처럼 회전 조건을 명시한다.",
      "primaryReason": "학생문장: “물체를 돌려 놓으면 앞에서 본 모양이 처음의 □과 같아질 수 있다.” — 어느 방향으로 얼마나 돌리는지 제시하지 않았다. 옆면을 앞으로 돌릴 수도 있고 뒤쪽을 앞으로 돌릴 수도 있으므로 원래 어느 방향의 모양이 되는지 정할 수 없다.",
      "primaryProposal": "회전 방향과 회전량을 제시하거나 가능한 방향을 여러 개 쓰는 과제로 바꾼다.",
      "initialAlternativeAnswers": [
        "뒤에서 본 모양",
        "위에서 본 모양"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "회전 방향과 보는 방향을 지정하고 가능 표현 대신 방향 간의 일반 관계로 고쳐 대칭 물체에서 원래 앞 모양도 가능하다는 대안을 막았다."
  },
  {
    "id": "e6-2-3-2-xc1",
    "grade": "e6",
    "chapter": "2-3 공간과 입체",
    "student": "쌓기나무를 층별로 나누어 셀 때 전체 개수는 각 층의 개수를 모두 □ 구할 수 있다.",
    "currentDefinition": "쌓기나무를 층별로 나누어 셀 때 전체 개수는 각 층의 개수를 모두 {더해} 구할 수 있다.",
    "expected": [
      "더해"
    ],
    "firstBlind": {
      "id": "e6-2-3-2-xc1",
      "answers": [
        "더하여"
      ],
      "alternativeAnswers": [
        "더해서",
        "더하면"
      ],
      "reason": "전체 개수는 각 층 개수의 합이다. 활용형만 다른 같은 답이다."
    },
    "originalFinding": {
      "id": "e6-2-3-2-xc1",
      "grade": "e6",
      "section": "초6::2-3 공간과 입체::2-3-2 쌓은 모양과 쌓기나무의 개수 알아보기 (1)",
      "sourceHash": "bd509e4ca69cf281616a4f3ca0c5d5e42e7070204540a073d85926f97cbf1e17",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "쌓기나무 개수는 □ 구할 수 있다.",
      "expected": [
        "각 층의 개수를 모두 더해"
      ],
      "reason": "방법 전체가 빈칸이다. '위에서 본 모양의 각 자리에 쌓인 수를 더해'도 같은 단원의 표준 방법이어서 층별 합을 특정할 수 없다.",
      "proposal": "'각 □의 개수를 모두 더해 구할 수 있다'로 좁힌다.",
      "primaryReason": "학생문장: “쌓기나무 개수는 □ 구할 수 있다.” — 쌓기나무를 어떤 방식으로 나누어 세는지 조건이 없다. 층별 합과 바닥 자리별 높이의 합은 서로 다른 세기 방법인데 모두 전체 개수를 구한다.",
      "primaryProposal": "층별 개수를 이용하는 상황임을 명시한다.",
      "initialAlternativeAnswers": [
        "각 바닥 자리에 쌓인 개수를 모두 더해"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "층별로 세는 상황을 남겨 자리별 합이라는 다른 방법을 답하지 않고 합 연산만 묻게 했다."
  },
  {
    "id": "e6-2-3-3-xc14",
    "grade": "e6",
    "chapter": "2-3 공간과 입체",
    "student": "앞·옆·위에서 본 모양을 만족하면서 쌓기나무를 가장 적게 쓰려면, 위에서 보이는 칸마다 적어도 □개 놓고 앞·옆에서 보이는 높이를 모두 맞춰야 한다.",
    "currentDefinition": "앞·옆·위에서 본 모양을 만족하면서 쌓기나무를 가장 적게 쓰려면, 위에서 보이는 칸마다 적어도 {$1$}개 놓고 앞·옆에서 보이는 높이를 모두 맞춰야 한다.",
    "expected": [
      "$1$"
    ],
    "firstBlind": {
      "id": "e6-2-3-3-xc14",
      "answers": [
        "적은"
      ],
      "alternativeAnswers": [
        "작은"
      ],
      "reason": "답 노출 및 동어 반복: 앞 절 '가장 적게 쓰려면'이 답을 그대로 말하고, 문장 전체가 '가장 적게 쓰려면 가장 적은 것을 찾는다'는 순환 진술이라 개념 정보가 없다."
    },
    "originalFinding": {
      "id": "e6-2-3-3-xc14",
      "grade": "e6",
      "section": "초6::2-3 공간과 입체::2-3-3 쌓은 모양과 쌓기나무의 개수 알아보기 (2)",
      "sourceHash": "acdedac2ad0c79434e6c169e3d79293a2cb5d73322c21b80907bfca73546842d",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "위에서 보이는 칸마다 한 개 이상 놓고 앞·옆의 높이를 모두 맞춘 쌓기들 중, □을 찾는다.",
      "expected": [
        "전체 개수가 가장 적은 것"
      ],
      "reason": "조건을 만족하는 쌓기 중 무엇을 찾는지가 통째로 빈칸이다. 최소 개수와 최대 개수가 모두 전형적인 과제여서 정할 수 없다.",
      "proposal": "'전체 개수가 가장 □ 것을 찾는다' 앞에 '가장 적게 쓰려면' 같은 목표를 남긴다.",
      "primaryReason": "학생문장: “위에서 보이는 칸마다 한 개 이상 놓고 앞·옆의 높이를 모두 맞춘 쌓기들 중, □을 찾는다.” — 조건을 만족하는 쌓기 중 무엇을 찾는지 목표 전체가 빈칸이다. 전체 개수가 가장 적은 쌓기와 가장 많은 쌓기는 다른 과제인데 학생문장에는 선택 기준이 없다.",
      "primaryProposal": "쌓기나무 개수를 최소로 한다는 목표를 본문에 남기고 방법을 묻는다.",
      "initialAlternativeAnswers": [
        "전체 개수가 가장 많은 것"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "최소 쌓기의 조건을 본문에 남기고 필수 최소 개수 1을 묻게 해 순환적인 가장 적은 것 찾기 설명을 고쳤다."
  },
  {
    "id": "e6-2-3-4-xc13",
    "grade": "e6",
    "chapter": "2-3 공간과 입체",
    "student": "위에서 본 모양의 각 칸에 쌓인 개수를 적으면, 구하려는 층에 놓인 쌓기나무 수는 그 층수 □인 수가 적힌 칸의 수와 같다.",
    "currentDefinition": "위에서 본 모양의 각 칸에 쌓인 개수를 적으면, 구하려는 층에 놓인 쌓기나무 수는 그 층수 {이상}인 수가 적힌 칸의 수와 같다.",
    "expected": [
      "이상"
    ],
    "firstBlind": {
      "id": "e6-2-3-4-xc13",
      "answers": [
        "2"
      ],
      "alternativeAnswers": [],
      "reason": "2층에 쌓기나무가 있는 칸은 적힌 수가 2 이상인 칸이다. 유일하다."
    },
    "originalFinding": {
      "id": "e6-2-3-4-xc13",
      "grade": "e6",
      "section": "초6::2-3 공간과 입체::2-3-4 쌓은 모양과 쌓기나무의 개수 알아보기 (3)",
      "sourceHash": "202d7c997f0993d3be8dff6161141ee0118a2e9cdae34a08795d83a1c91de7ec",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "어느 층에 놓인 쌓기나무 수는 □와 같다.",
      "expected": [
        "그 층수 이상의 수가 적힌 칸의 수"
      ],
      "reason": "위에서 본 모양에 수를 적은 상황이라는 전제가 문장에 없다. '그 층 모양의 칸 수'처럼 다른 표현 방식에 근거한 답도 성립해 기대답의 '적힌 수' 틀을 떠올릴 수 없다.",
      "proposal": "'위에서 본 모양의 각 칸에 쌓은 수를 적었을 때, n층의 쌓기나무 수는 □ 이상의 수가 적힌 칸의 수와 같다'로 고친다.",
      "primaryReason": "학생문장: “어느 층에 놓인 쌓기나무 수는 □와 같다.” — 기대답은 위에서 본 모양의 칸에 적힌 높이를 이용하지만 학생문장에는 그런 그림이나 수의 의미가 없다. 어느 층의 개수를 어떤 자료에서 구하는지 제시해야 한다.",
      "primaryProposal": "각 자리의 쌓은 높이가 적힌 위에서 본 그림을 준 상황임을 명시한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "고정 2층 사례가 아닌 모든 층에 적용되는 정의를 유지하면서 층수와 비교할 범위를 이상으로 짧게 묻는다."
  },
  {
    "id": "e6-2-3-4-xc15",
    "grade": "e6",
    "chapter": "2-3 공간과 입체",
    "student": "위에서 본 모양의 각 칸에 쌓인 개수를 적었을 때, 적힌 수의 □이 같아도 앞에서 본 높이는 다를 수 있다.",
    "currentDefinition": "위에서 본 모양의 각 칸에 쌓인 개수를 적었을 때, 적힌 수의 {합}이 같아도 앞에서 본 높이는 다를 수 있다.",
    "expected": [
      "합"
    ],
    "firstBlind": {
      "id": "e6-2-3-4-xc15",
      "answers": [
        "합"
      ],
      "alternativeAnswers": [],
      "reason": "적힌 수의 합(전체 개수)이 같아도 배치에 따라 앞에서 본 높이가 다르다(예: 한 줄에 2, 2와 3, 1은 합이 모두 4이지만 앞에서 본 높이는 2·2와 3·1). 조사 '이'와도 맞는다. '평균'도 형식상 참이지만 이 단원의 자연스러운 문장이 아니어서 제외했다. '앞에서 본 높이'는 '앞에서 본 모양'이 더 명확하다."
    },
    "originalFinding": {
      "id": "e6-2-3-4-xc15",
      "grade": "e6",
      "section": "초6::2-3 공간과 입체::2-3-4 쌓은 모양과 쌓기나무의 개수 알아보기 (3)",
      "sourceHash": "c9109fd7baf2f6b1a0b931531243b38e3727a6ecbc47d834361604d98bcac7d5",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "적힌 수의 □이 같아도 앞에서 본 높이는 다를 수 있다.",
      "expected": [
        "합"
      ],
      "reason": "단원 맥락에서 '적힌 수'는 위에서 본 모양의 칸에 쓴 수로 읽혀 '합'을 추론할 수 있다. 다만 지시 대상이 문장에 없어 불친절하다.",
      "proposal": "'위에서 본 모양의 각 칸에 적힌 수의 □이 같아도'로 고친다.",
      "primaryReason": "학생문장: “적힌 수의 □이 같아도 앞에서 본 높이는 다를 수 있다.” — '적힌 수'가 어디에 적힌 어떤 수인지 문장에 없다. 위에서 본 칸의 높이를 뜻한다는 맥락과 합을 비교한다는 범위가 동시에 사라져 있다.",
      "primaryProposal": "위에서 본 각 칸에 쓴 높이 수의 합을 비교한다는 상황을 명시한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "적힌 수의 대상을 명시해 지시 대상 없는 문장을 고쳤다. 합이 전체 개수라는 개념은 유지한다."
  },
  {
    "id": "e6-2-3-5-xc26",
    "grade": "e6",
    "chapter": "2-3 공간과 입체",
    "student": "위에서 본 모양의 각 칸에 쌓인 개수를 적으면, 한 층 모양의 칸 수는 그 층수 □인 수가 적힌 칸의 수와 같다.",
    "currentDefinition": "위에서 본 모양의 각 칸에 쌓인 개수를 적으면, 한 층 모양의 칸 수는 그 층수 {이상}인 수가 적힌 칸의 수와 같다.",
    "expected": [
      "이상"
    ],
    "firstBlind": {
      "id": "e6-2-3-5-xc26",
      "answers": [
        "3"
      ],
      "alternativeAnswers": [],
      "reason": "3층 모양의 칸은 적힌 수가 3 이상인 칸이다. 유일하다. e6-2-3-4-xc13과 같은 구조의 문항이다."
    },
    "originalFinding": {
      "id": "e6-2-3-5-xc26",
      "grade": "e6",
      "section": "초6::2-3 공간과 입체::2-3-5 쌓은 모양과 쌓기나무의 개수 알아보기 (4)",
      "sourceHash": "4ebba3dc355901c912910ef28fbd21968d19c2f6ff94e4781ee97fe9db8809d3",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "missing-referent",
      "student": "위에서 본 모양의 수 가운데 □가 그 층 모양의 칸 수이다.",
      "expected": [
        "어느 층수 이상인 칸의 수"
      ],
      "reason": "'그 층'이 앞에서 지정되지 않은 채 기대답의 '어느 층수'와 맞물려 문장 자체가 어색하다. 학생은 '그 층수 이상인 수의 개수'처럼 쓸 텐데 동치로 처리할 수 있어 경계 사례다.",
      "proposal": "'어떤 층 모양의 칸 수는 위에서 본 모양의 수 가운데 □ 이상인 수의 개수이다'로 고친다.",
      "primaryReason": "학생문장: “위에서 본 모양의 수 가운데 □가 그 층 모양의 칸 수이다.” — '그 층'이 어느 층인지 학생문장에 먼저 지정되지 않고 기대답 속 '어느 층수'로 뒤늦게 정해진다. 특정 층 이상의 수가 적힌 칸을 세는 대상 관계가 충분히 명료한지 검토가 필요하다.",
      "primaryProposal": "먼저 찾을 층수를 정하고 그 층 이상인 칸을 세도록 지시한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "고정 3층 사례 대신 지정한 층에 대한 일반 관계를 유지하고 이상 조건만 묻는다."
  },
  {
    "id": "e6-2-3-6-xc8",
    "grade": "e6",
    "chapter": "2-3 공간과 입체",
    "student": "만든 모양의 쌓기나무를 층별로 세면, 각 층의 개수를 모두 □ 전체 개수를 구할 수 있다.",
    "currentDefinition": "만든 모양의 쌓기나무를 층별로 세면, 각 층의 개수를 모두 {더해} 전체 개수를 구할 수 있다.",
    "expected": [
      "더해"
    ],
    "firstBlind": {
      "id": "e6-2-3-6-xc8",
      "answers": [
        "더하여"
      ],
      "alternativeAnswers": [
        "더해서",
        "더하면"
      ],
      "reason": "각 층 개수의 합이 전체 개수이다. e6-2-3-2-xc1과 사실상 같은 문장으로 중복이다."
    },
    "originalFinding": {
      "id": "e6-2-3-6-xc8",
      "grade": "e6",
      "section": "초6::2-3 공간과 입체::2-3-6 여러 가지 모양 만들기",
      "sourceHash": "2b9322d323804879f1101c497d1605f6dcc2a7bf063b2b3f240a0b2d3f27d43e",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "만든 모양의 쌓기나무 개수는 □ 세면 빠뜨리지 않는다.",
      "expected": [
        "층별로"
      ],
      "reason": "세는 기준이 통째로 빈칸이다. '자리별로', '줄별로', '차례대로'도 빠뜨리지 않는 방법이어서 '층별로'를 고를 단서가 없다.",
      "proposal": "'1층, 2층, …처럼 □별로 세면'으로 단서를 남긴다.",
      "primaryReason": "학생문장: “만든 모양의 쌓기나무 개수는 □ 세면 빠뜨리지 않는다.” — 개수를 세는 구분 기준이 빈칸 전체에 가려졌다. 층별로 세거나 바닥 자리별 기둥으로 세어도 빠짐없이 셀 수 있어 특정 세기 방법을 고를 단서가 없다.",
      "primaryProposal": "각 층의 그림이나 층별 세기를 사용한다는 조건을 남긴다.",
      "initialAlternativeAnswers": [
        "바닥 자리별 기둥으로 나누어"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "층별 기준을 본문에 남겨 자리별·줄별 세기와의 경쟁을 막고 합 연산을 묻는다."
  },
  {
    "id": "e6-2-3-6-xc20",
    "grade": "e6",
    "chapter": "2-3 공간과 입체",
    "student": "쌓기나무로 만든 직육면체를 층별로 나누면 각 층의 모양은 서로 □.",
    "currentDefinition": "쌓기나무로 만든 직육면체를 층별로 나누면 각 층의 모양은 서로 {같다}.",
    "expected": [
      "같다"
    ],
    "firstBlind": {
      "id": "e6-2-3-6-xc20",
      "answers": [
        "같다"
      ],
      "alternativeAnswers": [
        "합동이다"
      ],
      "reason": "직육면체는 어느 층에서 나누어도 각 층이 같은 직사각형 모양이다. '합동이다'는 같은 뜻이다."
    },
    "originalFinding": {
      "id": "e6-2-3-6-xc20",
      "grade": "e6",
      "section": "초6::2-3 공간과 입체::2-3-6 여러 가지 모양 만들기",
      "sourceHash": "bbf9a3ed85fdf17a903515ac0222d6301e2dee743f21a91f937917fa04dfd364",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "직육면체 모양은 □으로 나누어 생각할 수 있다.",
      "expected": [
        "같은 모양의 층"
      ],
      "reason": "'직육면체 모양은 □으로 나누어'는 너무 열려 있어 '기둥', '작은 직육면체', '여러 층' 등 다른 분할이 모두 가능하다. '같은 모양의'까지 써야 한다는 것도 알 수 없다.",
      "proposal": "'쌓기나무로 만든 직육면체 모양은 같은 모양의 □으로 나누어'로 좁힌다.",
      "primaryReason": "학생문장: “직육면체 모양은 □으로 나누어 생각할 수 있다.” — 직육면체 쌓기를 어떤 덩어리로 나누어 생각할지 기준이 없다. 같은 모양의 층과 같은 높이의 기둥은 다른 분할 방법인데 모두 가능하다.",
      "primaryProposal": "가로로 같은 높이씩 나눈 층을 생각한다는 방향을 제시한다.",
      "initialAlternativeAnswers": [
        "같은 높이의 기둥"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "쌓기나무·직육면체·층별 분할을 명시해 다른 분할 방식을 답하지 않고 층의 모양 관계를 묻는다."
  },
  {
    "id": "e6-2-4-3-xc23",
    "grade": "e6",
    "chapter": "2-4 비례식과 비례배분",
    "student": "비례식에서 둘째 비의 두 수가 각각 첫째 비의 두 수의 같은 배이면, 둘째 비의 두 수의 합도 첫째 비의 두 수의 합의 □가 된다.",
    "currentDefinition": "비례식에서 둘째 비의 두 수가 각각 첫째 비의 두 수의 같은 배이면, 둘째 비의 두 수의 합도 첫째 비의 두 수의 합의 {그 배}가 된다.",
    "expected": [
      "그 배"
    ],
    "firstBlind": {
      "id": "e6-2-4-3-xc23",
      "answers": [
        "같은 배"
      ],
      "alternativeAnswers": [
        "그만큼의 배"
      ],
      "reason": "답 노출: 앞 절의 '같은 배이면'을 그대로 옮기면 된다. 수학적으로는 참이다(2:3=4:6에서 합 5와 10도 2배). '같은 배'라는 표현이 어색하므로 '같은 수를 곱한 것이면 … 그 수를 곱한 것' 식으로 다듬는 편이 낫다."
    },
    "originalFinding": {
      "id": "e6-2-4-3-xc23",
      "grade": "e6",
      "section": "초6::2-4 비례식과 비례배분::2-4-3 비례식 알아보기",
      "sourceHash": "36cddeb5372a6c2004be2c6f444d2f7dc9f8f336a31296a81a02dc08ca66040b",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "비례식에서 둘째 비의 두 수가 첫째 비의 두 수의 같은 배이면, □가 된다.",
      "expected": [
        "두 수의 합도 그 배"
      ],
      "reason": "결론 전체가 빈칸이라 '두 수의 차도 그 배', '두 비의 비율이 같게' 등 다른 참인 결론이 들어간다.",
      "proposal": "'두 수의 □도 그 배가 된다'처럼 대상을 좁히고 차도 인정할지 정한다.",
      "primaryReason": "학생문장: “비례식에서 둘째 비의 두 수가 첫째 비의 두 수의 같은 배이면, □가 된다.” — 비의 두 항을 같은 배로 바꿨을 때 무엇이 어떻게 변하는지 결론 전체가 가려졌다. 두 항의 합과 차는 서로 다른 양이지만 모두 같은 배가 된다.",
      "primaryProposal": "두 항의 합을 비교한다는 대상을 남기고 변화 배율을 묻는다.",
      "initialAlternativeAnswers": [
        "두 수의 차도 그 배"
      ],
      "initialCounterexample": "2:5를 4:10으로 바꾸면 합은 7에서 14로, 차는 3에서 6으로 각각 두 배가 된다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "두 비의 합을 비교한다고 남겨 차나 비율이라는 다른 참인 결론을 막았다."
  },
  {
    "id": "e6-2-4-5-xc13",
    "grade": "e6",
    "chapter": "2-4 비례식과 비례배분",
    "student": "전체를 두 자연수의 비로 비례배분하면 받은 두 양의 차는, 전체를 두 항의 합으로 나눈 값에 큰 항에서 작은 항을 뺀 □를 곱한 값이다.",
    "currentDefinition": "전체를 두 자연수의 비로 비례배분하면 받은 두 양의 차는, 전체를 두 항의 합으로 나눈 값에 큰 항에서 작은 항을 뺀 {차}를 곱한 값이다.",
    "expected": [
      "차"
    ],
    "firstBlind": {
      "id": "e6-2-4-5-xc13",
      "answers": [
        "차"
      ],
      "alternativeAnswers": [
        "차이"
      ],
      "reason": "전체 T를 a:b로 나누면 두 몫의 차는 T÷(a+b)×(a와 b의 차)이다(예: 20을 3:2로 나누면 12와 8, 차 4 = 20÷5×1). 문장 앞의 '두 양의 차'가 단서가 되지만 답 자체는 한 가지로 정해진다."
    },
    "originalFinding": {
      "id": "e6-2-4-5-xc13",
      "grade": "e6",
      "section": "초6::2-4 비례식과 비례배분::2-4-5 비례배분",
      "sourceHash": "24c3cf12e805e5c8f215d3291c1ff4ffb8859eea6ad145f753c81af6ca9b6646",
      "status": "needs_review",
      "initialStatus": "needs_review",
      "category": "missing-referent",
      "student": "비례배분한 두 몫의 차는 □이다.",
      "expected": [
        "두 항의 차만큼의 몫"
      ],
      "reason": "기대답의 '몫'이 배분받은 양과 한 단위의 양 두 뜻으로 쓰여 정의 문장 자체가 불명료하다. 학생은 식 형태로 동치 답을 쓸 수 있어 채점은 가능하나 원문을 고쳐야 한다.",
      "proposal": "'전체를 두 항의 합으로 나눈 한 몫에 두 항의 □를 곱한 값이다'처럼 한 단위를 정의한 뒤 묻는다.",
      "primaryReason": "학생문장: “비례배분한 두 몫의 차는 □이다.” — 기대답 속 '몫'이 비례배분으로 받은 두 양인지 비의 한 단위에 해당하는 양인지 구분되지 않는다. 두 항의 차에 무엇을 곱해야 하는지 알려면 한 단위 몫의 정의가 필요하다.",
      "primaryProposal": "비의 한 단위에 해당하는 양을 먼저 정의한 뒤 차를 구하도록 한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": "전체 30을 2:3으로 나누면 두 양은 12와 18이고 차는 6이다. 여기서 비의 한 단위 몫 6을 별도로 구별해야 한다.",
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "차를 큰 항에서 작은 항을 뺀 값으로 명시해 부호와 항 순서의 해석을 고정했다."
  },
  {
    "id": "e6-2-5-3-xc26",
    "grade": "e6",
    "chapter": "2-5 원의 둘레와 넓이",
    "student": "원주율을 자연수로 반올림하여 어림하면, 원의 넓이는 (반지름)$\\times$(반지름)의 약 □배이다.",
    "currentDefinition": "원주율을 자연수로 반올림하여 어림하면, 원의 넓이는 (반지름)$\\times$(반지름)의 약 {$3$}배이다.",
    "expected": [
      "$3$"
    ],
    "firstBlind": {
      "id": "e6-2-5-3-xc26",
      "answers": [
        "3"
      ],
      "alternativeAnswers": [],
      "reason": "원주율 3.14…를 자연수로 반올림하면 3이고, 원의 넓이는 (반지름)×(반지름)×(원주율)이다. 유일하다."
    },
    "originalFinding": {
      "id": "e6-2-5-3-xc26",
      "grade": "e6",
      "section": "초6::2-5 원의 둘레와 넓이::2-5-3 원의 넓이 어림하기",
      "sourceHash": "9f7d6429c9b461bce06c9c4ad4a53c443e00c19f266d60fe5b799a8e76856f3b",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "원의 넓이는 (반지름)$\\times$(반지름)의 약 □로 어림할 수 있다.",
      "expected": [
        "$3$배"
      ],
      "reason": "답의 종류(몇 배)는 분명하다. 다만 '약 3.14배', '약 3.1배'도 같은 사실의 옳은 어림이어서 3배만 정답으로 두면 채점이 부당해진다.",
      "proposal": "3.1배·3.14배·원주율배를 인정하거나 '자연수로 어림하면 약 □배'로 묻는다.",
      "primaryReason": "학생문장: “원의 넓이는 (반지름)$\\times$(반지름)의 약 □로 어림할 수 있다.” — 원의 넓이를 반지름 제곱의 몇 배로 어림하는지 묻지만 어림 자릿수나 사용할 원주율을 정하지 않았다. 3배, 3.1배, 3.14배는 서로 다른 수치이고 모두 '약'이라는 문장을 성립시킨다.",
      "primaryProposal": "사용할 원주율의 어림값 또는 어림 자릿수를 명시한다.",
      "initialAlternativeAnswers": [
        "3.1배",
        "3.14배"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "원주율 어림 방법을 자연수 반올림으로 지정해 3.1배·3.14배와 구별했다. 넓이 어림임을 유지한다."
  },
  {
    "id": "e6-2-6-2-xc4",
    "grade": "e6",
    "chapter": "2-6 원기둥, 원뿔, 구",
    "student": "원기둥의 전개도에서 옆면의 밑면과 맞닿는 변은 길이가 □와 같다.",
    "currentDefinition": "원기둥의 전개도에서 옆면의 밑면과 맞닿는 변은 길이가 {밑면의 둘레}와 같다.",
    "expected": [
      "밑면의 둘레"
    ],
    "firstBlind": {
      "id": "e6-2-6-2-xc4",
      "answers": [
        "밑면의 둘레"
      ],
      "alternativeAnswers": [
        "밑면의 원주",
        "원주"
      ],
      "reason": "옆면 직사각형에서 밑면과 맞닿는 변(가로)의 길이는 밑면의 둘레와 같다. '원주'는 6학년 2-5에서 배운 같은 뜻의 용어이고 조사 '와'와도 맞는다."
    },
    "originalFinding": {
      "id": "e6-2-6-2-xc4",
      "grade": "e6",
      "section": "초6::2-6 원기둥, 원뿔, 구::2-6-2 원기둥의 전개도 알아보기",
      "sourceHash": "f2da8f34a1158848d28fab5a000b81cc4805c2e7816aad2e82fd632da6328ad0",
      "status": "not_issue",
      "initialStatus": "needs_review",
      "category": "answer-leak",
      "student": "원기둥의 전개도에서 옆면의 밑면과 맞닿는 변은 길이가 □와 같다. 밑면 둘레가 $12\\,\\mathrm{cm}$이면 $12\\,\\mathrm{cm}$이다.",
      "expected": [
        "밑면의 둘레"
      ],
      "reason": "답(밑면의 둘레, 원주)이 하나로 분명하다. 뒤 예시의 노출은 난이도 문제이지 명료성 결함이 아니다.",
      "proposal": "유지('밑면의 원주' 인정). 난이도를 높이려면 예시 문장을 분리한다.",
      "primaryReason": "학생문장: “원기둥의 전개도에서 옆면의 밑면과 맞닿는 변은 길이가 □와 같다. 밑면 둘레가 $12\\,\\mathrm{cm}$이면 $12\\,\\mathrm{cm}$이다.” — 뒤 예시 '밑면 둘레가 12 cm이면 12 cm이다'가 앞 빈칸의 기대답 '밑면의 둘레'를 직접 제시한다. 관계를 설명하는 예시인지 회상 답의 노출인지 문항 목적을 검토할 필요가 있다.",
      "primaryProposal": "설명 예시와 회상용 빈칸을 분리한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "12 cm 예시의 기대 답 반복을 없애고 원기둥 옆면과 밑면 둘레의 관계는 보존했다. 독립 example 필드는 건드리지 않았다."
  },
  {
    "id": "e6-2-6-2-xc8",
    "grade": "e6",
    "chapter": "2-6 원기둥, 원뿔, 구",
    "student": "전개도에 밑면으로 붙인 두 원의 크기가 다르면 원기둥의 전개도가 □.",
    "currentDefinition": "전개도에 밑면으로 붙인 두 원의 크기가 다르면 원기둥의 전개도가 {아니다}.",
    "expected": [
      "아니다"
    ],
    "firstBlind": {
      "id": "e6-2-6-2-xc8",
      "answers": [
        "아니다"
      ],
      "alternativeAnswers": [
        "될 수 없다"
      ],
      "reason": "원기둥의 두 밑면은 합동인 원이어야 하므로 크기가 다르면 원기둥의 전개도가 아니다."
    },
    "originalFinding": {
      "id": "e6-2-6-2-xc8",
      "grade": "e6",
      "section": "초6::2-6 원기둥, 원뿔, 구::2-6-2 원기둥의 전개도 알아보기",
      "sourceHash": "0a8da265f10de32817fc272ae119d94a0b5d71a26efbe14acbb0ab9cf2b4267e",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "두 원의 크기가 다르면 □.",
      "expected": [
        "원기둥의 전개도가 아니다"
      ],
      "reason": "'두 원'이 전개도의 두 밑면이라는 상황이 문장에 없고 결론 전체가 빈칸이다. '원기둥이 아니다', '합동이 아니다' 등으로 갈린다.",
      "proposal": "'전개도에서 두 원의 크기가 다르면 □의 전개도가 아니다'로 고친다.",
      "primaryReason": "학생문장: “두 원의 크기가 다르면 □.” — 두 원이 전개도의 밑면으로 주어졌다는 상황과 원기둥이라는 대상이 모두 없다. 크기가 다른 두 원이라는 사실만으로 전개도에 대한 문장을 써야 하는지 알 수 없다.",
      "primaryProposal": "원기둥의 전개도 후보에 있는 두 원을 비교한다는 상황을 명시한다.",
      "initialAlternativeAnswers": [
        "합동이 아니다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "두 원이 밑면인 전개도라는 상황과 원기둥이라는 대상을 남겨 합동 여부 등 다른 결론을 막았다."
  },
  {
    "id": "e6-2-6-2-xc16",
    "grade": "e6",
    "chapter": "2-6 원기둥, 원뿔, 구",
    "student": "원기둥에서 밑면의 □와 높이가 같으면 전개도의 옆면은 정사각형이 된다.",
    "currentDefinition": "원기둥에서 밑면의 {둘레}와 높이가 같으면 전개도의 옆면은 정사각형이 된다.",
    "expected": [
      "둘레"
    ],
    "firstBlind": {
      "id": "e6-2-6-2-xc16",
      "answers": [
        "둘레"
      ],
      "alternativeAnswers": [
        "원주"
      ],
      "reason": "옆면의 가로는 밑면의 둘레, 세로는 높이이므로 둘이 같으면 정사각형이다. '지름'을 쓰면 거짓이다(가로가 지름의 약 3.14배가 됨). 조사 '와'가 받침 없는 '둘레/원주'를 가려 주어 한 가지로 정해진다."
    },
    "originalFinding": {
      "id": "e6-2-6-2-xc16",
      "grade": "e6",
      "section": "초6::2-6 원기둥, 원뿔, 구::2-6-2 원기둥의 전개도 알아보기",
      "sourceHash": "02a29d33e9137943e05dcd6bb8eaa18198e6357d9a74bfcb23ee9a97b093f525",
      "status": "needs_review",
      "initialStatus": "confirmed",
      "category": "missing-referent",
      "student": "□가 같으면 전개도의 옆면은 정사각형이 된다.",
      "expected": [
        "밑면 둘레와 높이"
      ],
      "reason": "이 단원에서 전개도는 원기둥뿐이라 '밑면의 둘레와 높이'를 추론할 수 있다. 다만 입체 이름이 없고 '옆면의 가로와 세로' 같은 동어반복 답도 문형에 맞는다.",
      "proposal": "'원기둥에서 밑면의 □와 높이가 같으면'으로 고친다.",
      "primaryReason": "학생문장: “□가 같으면 전개도의 옆면은 정사각형이 된다.” — 어떤 입체의 전개도인지 주어지지 않았고 같아야 할 두 길이도 통째로 빈칸이다. 원기둥의 옆면에서 밑면 둘레와 높이를 비교한다는 대상이 필요하다.",
      "primaryProposal": "원기둥 전개도의 옆면이 정사각형이 되는 조건을 묻는다고 명시한다.",
      "initialAlternativeAnswers": [],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "원기둥과 비교하는 두 길이 중 높이를 노출해 조건 전체 빈칸과 가로세로라는 동어반복을 막았다."
  },
  {
    "id": "e6-2-6-4-xc7",
    "grade": "e6",
    "chapter": "2-6 원기둥, 원뿔, 구",
    "student": "구는 평평한 바닥에서 어느 방향으로 밀어도 잘 □.",
    "currentDefinition": "구는 평평한 바닥에서 어느 방향으로 밀어도 잘 {굴러간다}.",
    "expected": [
      "굴러간다"
    ],
    "firstBlind": {
      "id": "e6-2-6-4-xc7",
      "answers": [
        "굴러간다"
      ],
      "alternativeAnswers": [
        "구른다"
      ],
      "reason": "구는 어느 방향에서 보아도 원이어서 어느 방향으로도 잘 굴러간다. '구른다'는 같은 뜻이다. 구의 성질을 관찰 수준으로 말한 문장이어서 6학년 구의 구성 요소(중심, 반지름) 학습과는 연결이 약하다."
    },
    "originalFinding": {
      "id": "e6-2-6-4-xc7",
      "grade": "e6",
      "section": "초6::2-6 원기둥, 원뿔, 구::2-6-4 구 알아보기와 여러 가지 모양 만들기",
      "sourceHash": "d41bfe4cc7226d6074b51f9e8db63a3facbc8a9a69b8c08ba323a302661c0df8",
      "status": "confirmed",
      "initialStatus": "confirmed",
      "category": "open-answer",
      "student": "구는 어느 방향으로 놓아도 □.",
      "expected": [
        "잘 굴러간다"
      ],
      "reason": "6학년 구의 대표 성질은 '어느 방향에서 보아도 원 모양(모양이 같다)'이어서 이 답이 '잘 굴러간다'보다 먼저 떠오를 수 있다. 서술어 전체가 빈칸이라 종류를 정할 수 없다.",
      "proposal": "'구는 어느 방향으로 굴려도 잘 □'처럼 상황을 남긴다.",
      "primaryReason": "학생문장: “구는 어느 방향으로 놓아도 □.” — 구를 놓는 방향을 바꿀 때 어떤 성질을 답해야 하는지 없다. 잘 굴러간다는 행동 성질과 앞에서 본 모양이 원이라는 관찰 성질 모두 성립한다.",
      "primaryProposal": "굴리는 상황인지 보는 모양을 비교하는 상황인지 명시한다.",
      "initialAlternativeAnswers": [
        "앞에서 보면 원 모양이다"
      ],
      "initialCounterexample": null,
      "additionalEvidence": null,
      "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
      "batch": "e5e6-extra"
    },
    "authorReason": "굴리는 상황과 바닥 조건을 남겨 앞에서 본 원 모양 등 관찰 성질을 대신 답하지 않게 했다."
  }
]
