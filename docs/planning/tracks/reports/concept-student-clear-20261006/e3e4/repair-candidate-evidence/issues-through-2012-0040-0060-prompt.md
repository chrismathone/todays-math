제공 순서 모든 ID에 대해 JSON 배열만 출력한다. 각 행은 수정 패치 {id,inputProposalFingerprint,변경하는필드들}이다. id와 현재 지문 해시는 필수이고 바뀌지 않은 필드는 복사하지 않는다. 직접 독자의 B/C 지적을 실제 문장과 채점 기준의 수정으로 해소하라. 지적이 수학적으로 틀렸으면 변경 대신 repairDisagreement에 이유와 실제 올바른 수학을 써라. 코멘트나 카운트만 고쳐서 문제를 해결했다고 하지 마라.
B를 바꾸면 bDecision,bPrompt,bAnswer,bRequiredIdeas,bGoal,bReason을 함께 완성한다. bDecision은 rewrite/exclude. exclude는 bPrompt,bAnswer null, bRequiredIdeas [], exclusionReason에 B만 제외하는 구체 이유와 알려진 실제 대응 ID를 기록한다. 초등에 익숙한 이름의 정의 질문은 가능하지만 제목 하나+설명하시오, 답 하나 대기, 의미 없는 이유 묻기는 금지한다. 설명 목표·조건·대상·응답 범위를 명시하고 질문에 예상 답은 넣지 않는다. 구체적 계산은 일반 방법·뜻·관계도 확인한다. requiredIdeas=[{anyOf:['한 가지 필수 의미의 유효한 표현', '그 의미를 만족하는 별도의 다른 방법']}]; 꼭 요청한 것만 필수다. 결과·식·방법·조건을 쓰라고 했으면 실제로 기준에 담고 묻지 않았으면 강제하지 않는다. 단순한 입력 되풀이를 설명으로 받지 않는다. 서로 다른 올바른 풀이의 필수 단계를 AND로 섞지 말고 전체 대체 풀이를 독립 anyOf 문자열로 적는다. 특정 예시만을 정답으로 강제하지 않는다. 역할을 바꾸면 learningRole=definition/procedure/reason/application/naming 중 실제 질문에 맞게 적는다.
C를 바꾸면 cDecision,cAfter,cSlotEquivalents,cReason을 함께 적는다. rewrite의 cAfter는 정답 부분을 {답}으로 표시한 실제 완성 학생 문장이고 1~4슬롯이다. 짧고 유용한 비교·계산 빈칸을 보존한다. 실제 대상 없이 긴 키워드를 복원하거나 부사만 채우게 하지 않는다. 빈칸과 같은 값을 다른 곳에서 공개하지 않는다. 입력의 수가 바뀐 역할에서 다시 답인 유용한 관계(몫 검산, 같은 거리 등)는 무조건 복사로 취급하지 않는다. 순서 없는 두 답은 같은 말을 두 번 써도 통과하는 슬롯별 대안으로 해결하지 말고 순서를 명시하거나 한 빈칸으로 줄인다. cSlotEquivalents는 각 슬롯의 대체 답 배열로서 수·읽기·단위·자리·횟수의 역할을 구별하되 그 문장에서 옳은 서로 다른 답은 허용한다. cDecision=keep은 원본 C 그대로 고정이므로 새 문장을 주지 않는다. exclude는 해당 C의 구체적인 낮은 이점 또는 반복 이유를 cReason으로 기록하고 cAfter=null, cSlotEquivalents=[]로 쓴다. 별도 remove:['cAfter','cSlotEquivalents'] 등으로 이전 필드 제거를 요청할 수 있다.
일반 학습 설명 A/SRS는 C와 별개다. coreAfter를 고칠 때는 실제 수학 오류나 빠진 조건을 고칠 때만이며 원래 표적과 일반 뜻을 보존한다. coreReason을 함께 기록한다. coreAfter도 {답} 1~4개, 보이는 전체 길이 8~160자로 만든다. C를 고쳤다는 이유로 A를 자동 대체하지 않는다.
숫자·수학 기호는 $...$ KaTeX, 곱은 	imes, 나눗셈은 div, 계산 내 빈칸 기호는 square이며 표시용 {답}과 LaTex의 중괄호를 혼동하지 않는다. 모든 조사·괄호·수식이 학생에게 실제로 읽혀야 한다. 쉬운 학년 말로 쓰고 새로운 이름이나 낯선 문자 변수를 만들지 않는다. 그림이 필요한 현재 질문은 실제 위치·수·이름을 텍스트에 제시하여 자립시키거나 그 form만 제외한다. 꼭 필요한 새 그림·조작 사례는 exampleNeeded에 무엇인지 적되 없는 그림을 이미 있는 것처럼 참조하지 않는다.
최종 승인·자동 테스트 pass·실제 독자가 재독했다는 말은 출력하지 않는다. 우리는 이 후보를 나중에 직접 읽고 원본과 확인한다. 다음 자료의 모든 ID를 빠짐없이 처리하라.

[
  {
    "id": "e3-1-3-2-xc10",
    "sourceIndex": 592,
    "grade": "e3",
    "source": {
      "sourceIndex": 592,
      "sourceFingerprint": "b2d0bbc7a7977fd05e50347c4c8464c1505a7993f9d4f6f7133c282598332598",
      "part": "e3plus",
      "id": "e3-1-3-2-xc10",
      "section": "초3::1-3 나눗셈::1-3-2 곱셈과 나눗셈의 관계",
      "term": "세 수로 식 만들기",
      "kind": "방법",
      "level": "중",
      "definition": "$5$, $8$, $40$으로 곱셈식 두 개와 {나눗셈식} 두 개를 만들 수 있다.",
      "studentC": "$5$, $8$, $40$으로 곱셈식 두 개와 □ 두 개를 만들 수 있다.",
      "answers": [
        "나눗셈식"
      ]
    },
    "currentProposal": {
      "id": "e3-1-3-2-xc10",
      "proposalFingerprint": "1d564c0cf56b52ab1de55d635ad6b7eba08b39004577dc3cf2e61cfcafe07576",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "세 수 $5$, $8$, $40$을 한 번씩 모두 써서 곱셈식 $2$개와 나눗셈식 $2$개를 만드세요. 그리고 나눗셈식에서 $40$을 어느 자리에 써야 하는지 쓰세요.",
      "bAnswer": "$5\\times8=40$, $8\\times5=40$, $40\\div5=8$, $40\\div8=5$입니다. 나눗셈식에서 $40$은 $\\div$ 앞(맨 앞)에 씁니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "곱셈식 $2$개"
          ]
        },
        {
          "anyOf": [
            "나눗셈식 $2$개"
          ]
        },
        {
          "anyOf": [
            "$40$은 나눗셈식의 맨 앞"
          ]
        }
      ],
      "bGoal": "세 수로 곱셈식과 나눗셈식을 만드는 방법 익히기",
      "bReason": "만들 식의 수와 자리 규칙을 분명히 물음",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸 '나눗셈식'은 낱말만 채우게 되어 실제 나눗셈식의 몫을 답하게 바꿈",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$5$, $8$, $40$으로 곱셈식 $5\\times8=40$, $8\\times5=40$과 나눗셈식 $40\\div5=${$8$}, $40\\div8=${$5$}를 만들 수 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "$8$",
        "equivalents": []
      },
      {
        "expected": "$5$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "네 실제 식을 만들라고 했으므로 식 두 개라는 개수 기준 대신 5×8·8×5와 40÷5·40÷8의 실제 관계를 기준에 넣는다.",
      "c": "역나눗셈 두 식의 몫 8·5를 확인한다."
    }
  },
  {
    "id": "e3-1-3-2-xc11",
    "sourceIndex": 593,
    "grade": "e3",
    "source": {
      "sourceIndex": 593,
      "sourceFingerprint": "e8b959894c274fe6cf600c7059ef464856938e1718c33b25dc618099601450f0",
      "part": "e3plus",
      "id": "e3-1-3-2-xc11",
      "section": "초3::1-3 나눗셈::1-3-2 곱셈과 나눗셈의 관계",
      "term": "나누는 수와 몫 바꾸기",
      "kind": "성질",
      "level": "중",
      "definition": "나누어지는 수가 $0$이 아니고 나누어떨어지는 나눗셈식은 나누는 수와 {몫}을 바꾸어도 맞는 나눗셈식이 된다.",
      "example": {
        "prompt": "$35\\div5=7$이면 $35\\div7=5$도 맞는 까닭은?",
        "answer": "둘 다 $5\\times7=35$에서 나와서"
      },
      "studentC": "나누어지는 수가 $0$이 아니고 나누어떨어지는 나눗셈식은 나누는 수와 □을 바꾸어도 맞는 나눗셈식이 된다.",
      "answers": [
        "몫"
      ]
    },
    "currentProposal": {
      "id": "e3-1-3-2-xc11",
      "proposalFingerprint": "312f72ae8724d65ecc85fdb988f2a21be1e81f780f3c1c5024eda6cabb5ccf68",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$35\\div5=7$이 맞으면 $35\\div7=5$도 맞습니다. 그 까닭을 곱셈식을 이용하여 쓰세요.",
      "bAnswer": "두 식 모두 $5\\times7=35$에서 나온 나눗셈식이기 때문입니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$5\\times7=35$에서 나온 두 식"
          ]
        }
      ],
      "bGoal": "나누는 수와 몫을 바꾼 식도 맞는 까닭 설명하기",
      "bReason": "원문 예제의 식을 써서 까닭을 곱셈식으로 묻게 함",
      "cDecision": "rewrite",
      "cReason": "원문은 조건 문장이 길고 어려워 실제 식을 주고 몫을 계산해 답하게 바꿈",
      "cSlotEquivalents": [],
      "answerNotes": "B에서 $7\\times5=35$를 써도 정답"
    },
    "currentCMarkedSentence": "$35\\div5=7$에서 나누는 수와 몫을 서로 바꾼 $35\\div7=${$5$}도 맞는 나눗셈식이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$5$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "곱셈식 5×7=35와 7×5=35 모두 두 역나눗셈의 이유로 옳으므로 기준의 맥락 대안을 보완한다.",
      "c": "나누는 수·몫을 바꾼 실제 몫 5를 확인한다."
    }
  },
  {
    "id": "e3-1-3-2-xc14",
    "sourceIndex": 595,
    "grade": "e3",
    "source": {
      "sourceIndex": 595,
      "sourceFingerprint": "0936df3e8df5bc180daf2c99a431e1cdbb40dba8235572d431a70e01992d2e4c",
      "part": "e3plus",
      "id": "e3-1-3-2-xc14",
      "section": "초3::1-3 나눗셈::1-3-2 곱셈과 나눗셈의 관계",
      "term": "배열로 보는 두 나눗셈",
      "kind": "성질",
      "level": "중",
      "definition": "줄을 맞추어 놓은 배열에서 전체를 줄의 수로 나누면 {한 줄의 수}, 한 줄의 수로 나누면 줄의 수가 된다.",
      "example": {
        "prompt": "$5$줄에 $6$개씩 놓은 배열에서 $30\\div6$의 몫 $5$는 무엇인가?",
        "answer": "줄의 수"
      },
      "studentC": "줄을 맞추어 놓은 배열에서 전체를 줄의 수로 나누면 □, 한 줄의 수로 나누면 줄의 수가 된다.",
      "answers": [
        "한 줄의 수"
      ]
    },
    "currentProposal": {
      "id": "e3-1-3-2-xc14",
      "proposalFingerprint": "37ddbb229e13f7b907c13f6c8d70fc1004014f39159c8e3f560a69d15a77d518",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "바둑돌을 $5$줄에 $6$개씩 놓았더니 모두 $30$개입니다. 이 배열에서 $30\\div5$의 몫과 $30\\div6$의 몫은 각각 무엇을 뜻하는지 쓰세요.",
      "bAnswer": "$30\\div5$의 몫 $6$은 한 줄에 놓인 개수이고, $30\\div6$의 몫 $5$는 줄의 수입니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$30\\div5$의 몫은 한 줄의 수"
          ]
        },
        {
          "anyOf": [
            "$30\\div6$의 몫은 줄의 수"
          ]
        }
      ],
      "bGoal": "배열에서 두 나눗셈의 몫이 뜻하는 것 구별하기",
      "bReason": "원문 예제의 배열을 써서 두 몫의 뜻을 묻게 함",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸 '한 줄의 수'는 이름 복원이라 배열 예를 주고 두 몫을 계산해 답하게 함",
      "cSlotEquivalents": [],
      "exampleNeeded": "바둑돌을 5줄에 6개씩 놓은 배열 그림"
    },
    "currentCMarkedSentence": "바둑돌을 $5$줄에 $6$개씩 놓으면 모두 $30$개이다. $30\\div5$의 몫 {$6$}은 한 줄의 수이고, $30\\div6$의 몫 {$5$}는 줄의 수이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$6$",
        "equivalents": []
      },
      {
        "expected": "$5$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "첫 기준의 한 줄의 수는 줄 개수와 혼동된다; 한 줄에 놓인 바둑돌 개수라고 명시해야 한다.",
      "c": "C의 한 줄의 수도 한 줄에 놓인 바둑돌 개수로 풀어 두 몫의 대상을 구별한다."
    }
  },
  {
    "id": "e3-1-3-2-xc24",
    "sourceIndex": 604,
    "grade": "e3",
    "source": {
      "sourceIndex": 604,
      "sourceFingerprint": "be8808114096268d1537640244f4812e1cbdc682c8da5064eb650ac1241df6f2",
      "part": "e3plus",
      "id": "e3-1-3-2-xc24",
      "section": "초3::1-3 나눗셈::1-3-2 곱셈과 나눗셈의 관계",
      "term": "식이 달라도 몫이 같은 나눗셈",
      "kind": "성질",
      "level": "상",
      "definition": "몫이 같은 나눗셈식들은 {같은 수에 서로 다른 수를 곱한} 곱셈식에서 나온다.",
      "example": {
        "prompt": "$12\\div3$과 $16\\div4$의 몫이 같은 까닭은?",
        "answer": "$4\\times3$, $4\\times4$에서 나와서"
      },
      "studentC": "몫이 같은 나눗셈식들은 □ 곱셈식에서 나온다.",
      "answers": [
        "같은 수에 서로 다른 수를 곱한"
      ]
    },
    "currentProposal": {
      "id": "e3-1-3-2-xc24",
      "proposalFingerprint": "1333a1c53af05acb0eccc6b2abd91f72bce14ba569063acf368ebf264b6fd4a2",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$12\\div3$과 $16\\div4$는 식이 다른데 몫이 같습니다. 두 몫이 같은 까닭을 곱셈식을 써서 설명해 보세요.",
      "bAnswer": "$4\\times3=12$, $4\\times4=16$이므로 두 나눗셈 모두 몫이 $4$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "각 나눗셈에 맞는 곱셈식 두 개"
          ]
        },
        {
          "anyOf": [
            "두 몫이 모두 $4$"
          ]
        }
      ],
      "bGoal": "몫이 같은 나눗셈식이 같은 수를 곱한 곱셈식에서 나옴을 설명",
      "bReason": "원문 예를 그대로 쓰되 '곱셈식을 써서'로 답 범위를 정함",
      "cDecision": "rewrite",
      "cReason": "'같은 수에 서로 다른 수를 곱한'은 긴 구절이고 가리키는 대상이 불분명해 공통 몫을 쓰는 계산 빈칸으로 바꿈",
      "cSlotEquivalents": [],
      "answerNotes": "$3\\times4=12$처럼 곱하는 순서를 바꾸어 쓴 곱셈식도 인정",
      "coreAfter": "{같은 수}를 서로 다른 $0$이 아닌 수와 각각 곱하고, 각 곱을 그 서로 다른 수로 나누면 {몫이 같다}. 예: $4\\times3=12$, $4\\times4=16$에서 $12\\div3=4$, $16\\div4=4$이다.",
      "coreReason": "긴 같은 수에 서로 다른 수를 곱한 표적을 고정한 같은 수와 같은 몫이라는 두 의미로 나눈다. 곱·나눔의 관계와보조예를 보존한다."
    },
    "currentCMarkedSentence": "$4\\times3=12$, $4\\times4=16$이므로 $12\\div3$과 $16\\div4$의 몫은 모두 {$4$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$4$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "곱셈식 두 개를 써서 설명하라고 했으므로 실제 4×3=12·4×4=16과 순서 대안을 기준에 명시해야 한다.",
      "c": "같은 인수 4로 나오는 두 몫을 확인하고 일반 설명의 고정한 같은 수·같은 몫 표적이 명확하다."
    }
  },
  {
    "id": "e3-1-3-3-xc8",
    "sourceIndex": 608,
    "grade": "e3",
    "source": {
      "sourceIndex": 608,
      "sourceFingerprint": "58d24d13554210bc1c9b71664a700e3e457fd1700ef427c568fd1e3f35c2c0de",
      "part": "e3plus",
      "id": "e3-1-3-3-xc8",
      "section": "초3::1-3 나눗셈::1-3-3 나눗셈의 몫을 곱셈식으로 구하기",
      "term": "나누어 주는 상황을 곱셈식으로",
      "kind": "방법",
      "level": "하",
      "definition": "똑같이 나누어 주는 상황은 (사람 수)$\\times\\square=$(전체)인 곱셈식에서 {한 사람 몫}인 $\\square$를 찾는 것과 같다.",
      "example": {
        "prompt": "사탕 $18$개를 $3$명에게 똑같이 나눌 때 $3\\times\\square=18$의 $\\square$가 나타내는 것은?",
        "answer": "한 명이 받는 사탕 수"
      },
      "studentC": "똑같이 나누어 주는 상황은 (사람 수)$\\times\\square=$(전체)인 곱셈식에서 □인 $\\square$를 찾는 것과 같다.",
      "answers": [
        "한 사람 몫"
      ]
    },
    "currentProposal": {
      "id": "e3-1-3-3-xc8",
      "proposalFingerprint": "d8f5427dc922767da8231ff4b9c819536a9824d60b54b264eb76e31b3eb04975",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "사탕 $18$개를 $3$명에게 똑같이 나누어 주려고 합니다. 이 상황을 $3\\times\\square=18$로 나타낼 때 $3$, $\\square$, $18$이 각각 무엇을 나타내는지 쓰세요.",
      "bAnswer": "$3$은 사람 수, $\\square$는 한 명이 받는 사탕 수, $18$은 전체 사탕 수이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$3$은 사람 수"
          ]
        },
        {
          "anyOf": [
            "$\\square$는 한 명이 받는 수"
          ]
        },
        {
          "anyOf": [
            "$18$은 전체 수"
          ]
        }
      ],
      "bGoal": "똑같이 나누어 주는 상황과 곱셈식의 수 대응",
      "bReason": "원문 예의 상황을 살려 세 수의 뜻을 모두 쓰게 해 답 범위를 분명히 함",
      "cDecision": "rewrite",
      "cReason": "원문은 $\\square$와 빈칸이 겹치고 괄호 말 식이라 추상적. 구체 상황에서 6의 뜻을 익숙한 말로 쓰게 함",
      "cSlotEquivalents": [],
      "answerNotes": "'한 명', '한 사람', '1명' 인정. '3명', '전체'는 오답"
    },
    "currentCMarkedSentence": "사탕 $18$개를 $3$명에게 똑같이 나누어 줄 때, 곱셈식 $3\\times6=18$에서 $6$은 {한 명}이 받는 사탕 수이다.",
    "currentCSlotAnswers": [
      {
        "expected": "한 명",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "사람 수·한 명의 몫·전체라는 세 역할을 구체식으로 묻는 B는 유용하다.",
      "c": "한 명을 복원하는 말 빈칸보다 실제 배분 개수 또는 서로 다른 3·6의 역할을 분명하게 묻는 C로 바꾼다."
    }
  },
  {
    "id": "e3-1-3-3-xc26",
    "sourceIndex": 616,
    "grade": "e3",
    "source": {
      "sourceIndex": 616,
      "sourceFingerprint": "76afe5fd77da47c987ad177881645418b65c3e0e9647ac216c1488f94d326658",
      "part": "e3plus",
      "id": "e3-1-3-3-xc26",
      "section": "초3::1-3 나눗셈::1-3-3 나눗셈의 몫을 곱셈식으로 구하기",
      "term": "곱이 같은 여러 짝",
      "kind": "성질",
      "level": "상",
      "definition": "곱이 같아도 {곱하는 두 수의 짝은 여러 가지}일 수 있어 그 곱을 나누는 나눗셈식도 여러 개 만들어진다.",
      "example": {
        "prompt": "$12$를 나눌 때 나누는 수에 따라 몫이 달라지는 까닭은?",
        "answer": "곱의 짝이 여럿이라서"
      },
      "studentC": "곱이 같아도 □일 수 있어 그 곱을 나누는 나눗셈식도 여러 개 만들어진다.",
      "answers": [
        "곱하는 두 수의 짝은 여러 가지"
      ]
    },
    "currentProposal": {
      "id": "e3-1-3-3-xc26",
      "proposalFingerprint": "80838e530bd059ff4f1d09a3c4be555b3c9c6a6abfa4074f39b97294cca97937",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$12$를 $2$로 나눌 때와 $3$으로 나눌 때 몫이 다릅니다. $12$를 두 수의 곱으로 나타낸 곱셈식을 써서 그 까닭을 설명해 보세요.",
      "bAnswer": "$12=2\\times6$, $12=3\\times4$처럼 곱이 $12$인 두 수의 짝이 여러 가지이다. 그래서 $2$로 나누면 몫이 $6$, $3$으로 나누면 몫이 $4$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$2\\times6=12$와 $3\\times4=12$"
          ]
        },
        {
          "anyOf": [
            "몫이 각각 $6$과 $4$"
          ]
        }
      ],
      "bGoal": "곱이 같은 짝이 여럿이라 나눗셈식도 여러 개임을 설명",
      "bReason": "원문 예(12)를 살리고 어떤 식을 써서 답할지 정해 줌",
      "cDecision": "rewrite",
      "cReason": "'곱하는 두 수의 짝은 여러 가지'는 문장 복원형 긴 빈칸이라 두 몫을 쓰는 계산으로 바꿈",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$12=2\\times6$이고 $12=3\\times4$이다. 그래서 $12\\div2=${$6$}, $12\\div3=${$4$}처럼 $12$를 나누는 나눗셈식도 여러 개이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$6$",
        "equivalents": []
      },
      {
        "expected": "$4$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "곱셈식으로 설명하는 질문은 2×6·3×4뿐 아니라 각 식의 인수 순서를 바꾼 동등한 설명도 허용해야 한다.",
      "c": "12의 두 나눗셈 몫 6·4를 계산한다."
    }
  },
  {
    "id": "e3-1-3-4-xc8",
    "sourceIndex": 620,
    "grade": "e3",
    "source": {
      "sourceIndex": 620,
      "sourceFingerprint": "0041d2745598b4daf0b71a119c173dd1ae81d6592387d06a195c1b832218e944",
      "part": "e3plus",
      "id": "e3-1-3-4-xc8",
      "section": "초3::1-3 나눗셈::1-3-4 나눗셈의 몫을 곱셈구구로 구하기",
      "term": "구구를 외워 몫 구하기",
      "kind": "성질",
      "level": "하",
      "definition": "곱셈구구를 잘 외우면 나눗셈의 {몫}을 빨리 구할 수 있다.",
      "studentC": "곱셈구구를 잘 외우면 나눗셈의 □을 빨리 구할 수 있다.",
      "answers": [
        "몫"
      ]
    },
    "currentProposal": {
      "id": "e3-1-3-4-xc8",
      "proposalFingerprint": "ae1f8d90c374fd01ce7ac216683723c615311ec743b584de4583bf7285fcec7f",
      "learningRole": "reason",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "곱셈구구가 몫을 구하는 데 쓰임을 알기",
      "bReason": "학습 권고 문장이라 수학적으로 설명할 까닭이 없음",
      "cDecision": "keep",
      "cReason": "'나눗셈의 □'에 들어갈 익숙한 낱말 하나라 그대로 둠",
      "cSlotEquivalents": [],
      "exclusionReason": "'잘 외우면 빨리 구한다'는 권고일 뿐이고, 곱셈구구로 몫을 찾는 방법은 e3-1-3-4-xc9에서 묻는다",
      "answerNotes": "'몫'이 표준 답. '답'도 뜻이 통하므로 인정"
    },
    "currentCMarkedSentence": "곱셈구구를 잘 외우면 나눗셈의 {몫}을 빨리 구할 수 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "몫",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "구구를 외우면 빠르다는 학습 권고만의 B 제외는 적절하다.",
      "c": "몫을 빨리 구한다는 권고는 수학 목표를 확인하지 못하므로 C도 제외를 제안한다."
    }
  },
  {
    "id": "e3-1-3-4-xc12",
    "sourceIndex": 622,
    "grade": "e3",
    "source": {
      "sourceIndex": 622,
      "sourceFingerprint": "136db40b8f3e8f3809b9a1ecce21fe9c98d94ba96d572653ae36b7884c17b0db",
      "part": "e3plus",
      "id": "e3-1-3-4-xc12",
      "section": "초3::1-3 나눗셈::1-3-4 나눗셈의 몫을 곱셈구구로 구하기",
      "term": "곱셈표에서 나눗셈하기",
      "kind": "방법",
      "level": "중",
      "definition": "곱셈표에서 나누는 수의 가로줄을 따라가 나누어지는 수를 찾으면, 그 칸의 맨 위에 적힌 {곱하는 수}가 몫이다.",
      "studentC": "곱셈표에서 나누는 수의 가로줄을 따라가 나누어지는 수를 찾으면, 그 칸의 맨 위에 적힌 □가 몫이다.",
      "answers": [
        "곱하는 수"
      ]
    },
    "currentProposal": {
      "id": "e3-1-3-4-xc12",
      "proposalFingerprint": "fede68e99dc138ee38ce2d4a33ef39906da71b4366935044a1f82ad406cb7640",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "곱셈표에서 $42\\div6$의 몫을 찾는 방법을 설명해 보세요. 어느 줄을 따라가서 무엇을 찾고, 몫은 어디에 적힌 수인지 써야 합니다.",
      "bAnswer": "$6$의 가로줄을 따라가 $42$를 찾는다. 그 칸의 맨 위에 적힌 수 $7$이 몫이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$6$의 줄에서 $42$를 찾음"
          ]
        },
        {
          "anyOf": [
            "그 칸의 맨 위(또는 맨 왼쪽)에 적힌 수가 몫"
          ]
        }
      ],
      "bGoal": "곱셈표로 몫을 찾는 방법",
      "bReason": "원문에 예가 없어 42÷6을 주고 답할 세 가지를 밝힘",
      "cDecision": "rewrite",
      "cReason": "답 '곱하는 수'는 표를 보지 않으면 복원하기 어려운 수 이름이라 실제 나눗셈에서 줄과 찾을 수를 쓰게 함",
      "cSlotEquivalents": [],
      "exampleNeeded": "9×9 곱셈표 그림(6의 가로줄과 42가 적힌 칸, 맨 위 줄의 7이 보이게)",
      "answerNotes": "B에서 6의 세로줄을 따라 내려가 42를 찾고 맨 왼쪽 수를 읽는 설명도 인정"
    },
    "currentCMarkedSentence": "곱셈표에서 $42\\div6$의 몫을 찾으려면 {$6$}의 가로줄을 따라가 {$42$}를 찾고, 그 칸의 맨 위에 적힌 수를 읽는다.",
    "currentCSlotAnswers": [
      {
        "expected": "$6$",
        "equivalents": []
      },
      {
        "expected": "$42$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "곱셈표 실제 배치 예가 필요하고 가로→맨 위와 세로→맨 왼쪽의 완결된 두 방법을 대안으로 나눠야 한다.",
      "c": "6 가로줄·42·맨 위의 방법이 성립하는 표를 실제로 보여야 한다."
    }
  },
  {
    "id": "e3-1-3-4-xc25",
    "sourceIndex": 629,
    "grade": "e3",
    "source": {
      "sourceIndex": 629,
      "sourceFingerprint": "10a99a7c63fec5424d736310c891fb50c392e9f688cd3a424e73a22bef111ae8",
      "part": "e3plus",
      "id": "e3-1-3-4-xc25",
      "section": "초3::1-3 나눗셈::1-3-4 나눗셈의 몫을 곱셈구구로 구하기",
      "term": "여러 단에 나오는 수",
      "kind": "성질",
      "level": "상",
      "definition": "어떤 수가 여러 단의 곱셈구구에 나오면 그 수는 {그 단의 수들로} 남김없이 나눌 수 있다.",
      "example": {
        "prompt": "$12$는 $3$단의 $3\\times4=12$에 나온다. $12$를 $3$으로 남김없이 나눌 수 있는 까닭은?",
        "answer": "$3$씩 $4$묶음이라서"
      },
      "studentC": "어떤 수가 여러 단의 곱셈구구에 나오면 그 수는 □ 남김없이 나눌 수 있다.",
      "answers": [
        "그 단의 수들로"
      ]
    },
    "currentProposal": {
      "id": "e3-1-3-4-xc25",
      "proposalFingerprint": "cf7b36cbf50608f2cb6527c39a6c57034531c9c24a44d34155741b8497c6e6c6",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$18$은 $2$단, $3$단, $6$단, $9$단 곱셈구구에 모두 나옵니다. 이것을 보고 $18$을 남김없이 나눌 수 있는 수를 모두 쓰고, 그렇게 말할 수 있는 까닭을 $3$단을 예로 설명해 보세요.",
      "bAnswer": "$2$, $3$, $6$, $9$. $3$단에 $3\\times6=18$이 있으므로 $18$은 $3$씩 $6$묶음으로 딱 떨어진다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$2$, $3$, $6$, $9$"
          ]
        },
        {
          "anyOf": [
            "단에 나오면 그 수씩 묶어 딱 떨어짐"
          ]
        }
      ],
      "bGoal": "여러 단에 나오는 수는 그 단의 수들로 나누어짐",
      "bReason": "원문 예는 3단 하나뿐이라 '여러 단'이 드러나도록 18을 새로 줌",
      "cDecision": "rewrite",
      "cReason": "'그 단의 수들로'는 가리키는 수가 가려진 구절이라 실제 단을 보여 주고 수 하나를 쓰게 함",
      "cSlotEquivalents": [],
      "answerNotes": "B에서 1과 18을 덧붙여 써도 틀린 것은 아님. 2, 3, 6, 9 가운데 빠진 것이 있으면 감점"
    },
    "currentCMarkedSentence": "$12$는 $2$단, $3$단, $4$단, $6$단에 모두 나온다. 그래서 $12$는 $2$, $3$, $4$, {$6$}으로 각각 남김없이 나눌 수 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "$6$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "남김없이 나눌 수 있는 수 모두에는 1·18도 포함된다; 제시한 단의 수 중이라고 범위를 한정하고 요청한 3단의 실제 3×6=18 근거를 기준에 넣는다.",
      "c": "앞에 준 단 목록의 마지막 6을 그대로 복사하는 C 대신 실제 몫 또는 나누어떨어짐을 확인하도록 고친다."
    }
  },
  {
    "id": "e3-1-4-1-xc2",
    "sourceIndex": 631,
    "grade": "e3",
    "source": {
      "sourceIndex": 631,
      "sourceFingerprint": "cbbc024b3841b151456a9b569d3404668f8354b9b7f14fc6dc176e4974951c5b",
      "part": "e3plus",
      "id": "e3-1-4-1-xc2",
      "section": "초3::1-4 곱셈::1-4-1 (몇십)×(몇)",
      "term": "(몇십)$\\times$(몇)의 뜻",
      "kind": "성질",
      "level": "하",
      "definition": "(몇십)$\\times$(몇)은 몇십을 {곱하는 수만큼 더한} 것과 같다.",
      "example": {
        "prompt": "$40\\times3$을 덧셈식으로 나타내면?",
        "answer": "$40+40+40$"
      },
      "studentC": "(몇십)$\\times$(몇)은 몇십을 □ 것과 같다.",
      "answers": [
        "곱하는 수만큼 더한"
      ]
    },
    "currentProposal": {
      "id": "e3-1-4-1-xc2",
      "proposalFingerprint": "2def298f57b1a010f4a3972e6c910cf196b7d87006470e2b335c53f21d8f33b6",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$40\\times3$이 무엇을 뜻하는지 덧셈식으로 나타내고 곱을 구해 보세요.",
      "bAnswer": "$40\\times3$은 $40$을 $3$번 더한 것이다. $40+40+40=120$.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$40$을 $3$번 더함"
          ]
        },
        {
          "anyOf": [
            "$120$"
          ]
        }
      ],
      "bGoal": "(몇십)×(몇)을 같은 수 더하기로 이해",
      "bReason": "원문 예(40×3)를 써서 뜻과 결과를 함께 묻게 함",
      "cDecision": "rewrite",
      "cReason": "'곱하는 수만큼 더한'은 긴 구절이고 괄호 말 식이라 추상적이어서 횟수 하나를 쓰게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$40\\times3$은 $40$을 {$3$}번 더한 것과 같다.",
    "currentCSlotAnswers": [
      {
        "expected": "$3$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "40×3을 덧셈식으로 나타내라고 했으므로 40+40+40 또는 동등한 실제 식을 기준에 명시해야 한다.",
      "c": "40을 더하는 횟수 3이라는 곱셈 뜻을 확인한다."
    }
  },
  {
    "id": "e3-1-4-1-xc23",
    "sourceIndex": 642,
    "grade": "e3",
    "source": {
      "sourceIndex": 642,
      "sourceFingerprint": "af0f871aba43f024644a6b47179f0ffe50da738b68ae6b10f2548724039ac7f7",
      "part": "e3plus",
      "id": "e3-1-4-1-xc23",
      "section": "초3::1-4 곱셈::1-4-1 (몇십)×(몇)",
      "term": "곱의 일의 자리",
      "kind": "성질",
      "level": "상",
      "definition": "(몇십)$\\times$(몇)의 곱은 일의 자리 숫자가 언제나 {$0$}이다.",
      "studentC": "(몇십)$\\times$(몇)의 곱은 일의 자리 숫자가 언제나 □이다.",
      "answers": [
        "$0$"
      ]
    },
    "currentProposal": {
      "id": "e3-1-4-1-xc23",
      "proposalFingerprint": "025a85bfbf9ec91fdb477a5f5dc3371c546673e7ac5a8710a0de9729df02759a",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$30\\times4$, $70\\times2$처럼 몇십에 한 자리 수를 곱하면 곱의 일의 자리 숫자가 항상 같습니다. 그 숫자를 쓰고, $30\\times4$를 예로 까닭을 설명해 보세요.",
      "bAnswer": "$0$이다. $30\\times4$는 십의 묶음이 $12$개이고 낱개는 없으므로 곱 $120$의 일의 자리가 $0$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "일의 자리 숫자는 $0$"
          ]
        },
        {
          "anyOf": [
            "십의 묶음만 있고 낱개가 없음"
          ]
        }
      ],
      "bGoal": "(몇십)×(몇)의 곱의 일의 자리가 0인 까닭",
      "bReason": "원문에 예가 없어 30×4를 주고 까닭을 묻게 함",
      "cDecision": "keep",
      "cReason": "답이 수 하나($0$)로 분명함. '(몇십)×(몇)'은 이 절에서 쓰는 표현이라 그대로 둠",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "(몇십)$\\times$(몇)의 곱은 일의 자리 숫자가 언제나 {$0$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$0$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "30×4를 예로 까닭을 쓰라고 했으므로 실제 십 묶음 12개 또는 120의 일 0 근거를 기준에 포함해야 한다.",
      "c": "몇십의 곱에서 일 숫자 0이라는 성질이 옳다."
    }
  },
  {
    "id": "e3-1-4-2-xc19",
    "sourceIndex": 657,
    "grade": "e3",
    "source": {
      "sourceIndex": 657,
      "sourceFingerprint": "dc4ec6472fa8115315dec46c8ff0e88363bcef6026051b9ce2e7aecbbe68b873",
      "part": "e3plus",
      "id": "e3-1-4-2-xc19",
      "section": "초3::1-4 곱셈::1-4-2 올림이 없는 (몇십몇)×(몇)",
      "term": "올림이 생기는 조건",
      "kind": "성질",
      "level": "상",
      "definition": "어느 자리의 숫자와 곱하는 수의 곱이 {$10$ 이상}이면 그 자리에서 올림이 생긴다.",
      "studentC": "어느 자리의 숫자와 곱하는 수의 곱이 □이면 그 자리에서 올림이 생긴다.",
      "answers": [
        "$10$ 이상"
      ]
    },
    "currentProposal": {
      "id": "e3-1-4-2-xc19",
      "proposalFingerprint": "2ed413980e202856fede315c61f28cc6602df9896314286f120d506f64ab6725",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$23\\times3$에는 올림이 없고 $24\\times3$에는 일의 자리에서 올림이 있습니다. 올림이 생기는지 아닌지를 무엇으로 알 수 있는지 두 식을 비교해 설명해 보세요.",
      "bAnswer": "일의 자리 곱을 본다. $3\\times3=9$는 $10$보다 작아 올림이 없고, $4\\times3=12$는 $10$보다 커서 십 $1$개를 올린다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "자리 숫자와 곱하는 수의 곱이 $10$이 되는지 봄"
          ]
        },
        {
          "anyOf": [
            "$9$는 올림 없음, $12$는 올림 있음"
          ]
        }
      ],
      "bGoal": "올림이 생기는 조건",
      "bReason": "원문에 예가 없어 올림이 없는 식과 있는 식을 나란히 주어 조건을 스스로 말하게 함",
      "cDecision": "rewrite",
      "cReason": "답 '10 이상'은 수와 '이상'을 함께 써야 하고 '이상'은 초5 용어라 계산값과 '있다'를 쓰게 함",
      "cSlotEquivalents": [],
      "answerNotes": "둘째 빈칸은 '있다', '생긴다' 인정",
      "coreAfter": "어느 자리의 숫자와 곱하는 수의 곱이 {$10$이거나 $10$보다 크면} 그 자리에서 올림이 생긴다.",
      "coreReason": "10 이상이라는 원래 경계 표적을 같은 포함 관계의 쉬운 말로 풀어 쓴다. 숫자10만으로 옮기지 않는다."
    },
    "currentCMarkedSentence": "$23\\times3$의 일의 자리 곱은 $9$라서 올림이 없고, $24\\times3$의 일의 자리 곱은 {$12$}라서 올림이 {있다}.",
    "currentCSlotAnswers": [
      {
        "expected": "$12$",
        "equivalents": []
      },
      {
        "expected": "있다",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "첫 기준의 곱이 10이 되는지는 12도 포함해야 하므로 10이거나 더 큰지로 수정한다.",
      "c": "9는 올림 없음·12는 있음이라는 비교와 일반 정의의 10 이상 경계는 맞다."
    }
  },
  {
    "id": "e3-1-4-2-xc24",
    "sourceIndex": 659,
    "grade": "e3",
    "source": {
      "sourceIndex": 659,
      "sourceFingerprint": "7512910ed4c1e6c56ecc8e97290d77e6ef406e6955e9144703d014e068e42527",
      "part": "e3plus",
      "id": "e3-1-4-2-xc24",
      "section": "초3::1-4 곱셈::1-4-2 올림이 없는 (몇십몇)×(몇)",
      "term": "곱해지는 수를 두 배로, 곱하는 수를 반으로",
      "kind": "성질",
      "level": "상",
      "definition": "곱하는 수가 짝수일 때 곱해지는 수를 $2$배로 하고 곱하는 수를 {반으로} 하면 곱은 같다.",
      "example": {
        "prompt": "$12\\times4$와 $24\\times2$의 곱이 같은 까닭은?",
        "answer": "네 묶음을 둘씩 합쳐서"
      },
      "studentC": "곱하는 수가 짝수일 때 곱해지는 수를 $2$배로 하고 곱하는 수를 □ 하면 곱은 같다.",
      "answers": [
        "반으로"
      ]
    },
    "currentProposal": {
      "id": "e3-1-4-2-xc24",
      "proposalFingerprint": "37b3c3473166717b9849f26a96f8efc08948bafe0978a364f379a930f5bbff7e",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$12\\times4$와 $24\\times2$의 곱이 같은 까닭을 묶음으로 설명해 보세요.",
      "bAnswer": "$12$씩 $4$묶음을 $2$묶음씩 합치면 $24$씩 $2$묶음이 된다. 전체 수는 그대로이므로 곱이 같다(둘 다 $48$).",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$12$ 두 묶음을 합치면 $24$"
          ]
        },
        {
          "anyOf": [
            "묶음 수는 $4$에서 $2$로 줄고 전체는 같음"
          ]
        }
      ],
      "bGoal": "곱해지는 수를 2배, 곱하는 수를 반으로 하면 곱이 같음",
      "bReason": "원문 예의 두 식을 써서 까닭을 묶음으로 묻게 함",
      "cDecision": "rewrite",
      "cReason": "답 '반으로'는 '절반으로', '2로 나누어' 등으로 흔들리고 식이 없어 실제 식에서 수와 비교를 쓰게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$12\\times4$에서 $12$를 $2$배 한 $24$와 $4$를 반으로 한 {$2$}를 곱한 $24\\times2$는 $12\\times4$와 곱이 {같다}.",
    "currentCSlotAnswers": [
      {
        "expected": "$2$",
        "equivalents": []
      },
      {
        "expected": "같다",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "12 두 묶음씩 합쳐 24 두 묶음으로 만들며 전체 보존을 설명하는 B는 적절하다.",
      "c": "첫 답 2가 뒤의 24×2에 이미 드러나므로 첫 빈칸을 빼고 같은 곱의 관계만 확인한다."
    }
  },
  {
    "id": "e3-1-4-3-xc5",
    "sourceIndex": 666,
    "grade": "e3",
    "source": {
      "sourceIndex": 666,
      "sourceFingerprint": "1c4b4fd151a87b3c9c282b203187c5aa552ddfdb3b1a3b203e304632924ab6c7",
      "part": "e3plus",
      "id": "e3-1-4-3-xc5",
      "section": "초3::1-4 곱셈::1-4-3 십의 자리에서 올림이 있는 (몇십몇)×(몇)",
      "term": "백의 자리에 쓰는 숫자",
      "kind": "방법",
      "level": "하",
      "definition": "일의 자리에서 올림이 없고 십의 자리 곱이 두 자리 수이면, 그 앞 숫자는 {백의 묶음 수}를 나타내므로 곱의 백의 자리에 쓴다.",
      "studentC": "일의 자리에서 올림이 없고 십의 자리 곱이 두 자리 수이면, 그 앞 숫자는 □를 나타내므로 곱의 백의 자리에 쓴다.",
      "answers": [
        "백의 묶음 수"
      ]
    },
    "currentProposal": {
      "id": "e3-1-4-3-xc5",
      "proposalFingerprint": "58d0e36bb5f352f74fa60c4591c2da790941329ab46954869bca232d93ad653c",
      "learningRole": "procedure",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "십의 자리 곱의 앞 숫자를 백의 자리에 쓰기",
      "bReason": "같은 절 xc1에서 함께 다룸",
      "cDecision": "rewrite",
      "cReason": "식 없이 '그 앞 숫자'가 무엇인지 가려져 있고 답이 구절 '백의 묶음 수'라 실제 식으로 바꿈",
      "cSlotEquivalents": [],
      "exclusionReason": "e3-1-4-3-xc1이 24의 2와 4를 각각 어느 자리에 쓰는지와 까닭을 함께 묻는다"
    },
    "currentCMarkedSentence": "$62\\times4$에서 십의 자리 곱 $6\\times4=24$의 앞 숫자 $2$는 백의 묶음 $2$개, 곧 {$200$}을 나타내므로 곱의 {백}의 자리에 쓴다.",
    "currentCSlotAnswers": [
      {
        "expected": "$200$",
        "equivalents": []
      },
      {
        "expected": "백",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "24의 두 숫자 위치와 이유는 662에서 함께 묻는다.",
      "c": "200이라는 실제 값은 유용하지만 두 번째 백 빈칸은 바로 앞 백의 묶음에서 복사하므로 실제 값 빈칸만 남기는 것을 제안한다."
    }
  },
  {
    "id": "e3-1-4-3-xc15",
    "sourceIndex": 672,
    "grade": "e3",
    "source": {
      "sourceIndex": 672,
      "sourceFingerprint": "f9527e154a49f0491efd678b73d71daa55a941313292189b2299654f0c6e9722",
      "part": "e3plus",
      "id": "e3-1-4-3-xc15",
      "section": "초3::1-4 곱셈::1-4-3 십의 자리에서 올림이 있는 (몇십몇)×(몇)",
      "term": "곱셈식으로 나타내는 상황",
      "kind": "방법",
      "level": "중",
      "definition": "같은 수만큼씩 여러 묶음이 있을 때 전체 수는 {(한 묶음의 수)$\\times$(묶음의 수)}로 구한다.",
      "example": {
        "prompt": "한 봉지에 $31$개씩 $4$봉지에 든 사탕 수를 (한 봉지의 수)$\\times$(봉지 수)로 쓰면?",
        "answer": "$31\\times4$"
      },
      "studentC": "같은 수만큼씩 여러 묶음이 있을 때 전체 수는 □로 구한다.",
      "answers": [
        "(한 묶음의 수)$\\times$(묶음의 수)"
      ]
    },
    "currentProposal": {
      "id": "e3-1-4-3-xc15",
      "proposalFingerprint": "8aba2c8137b2ee3f6a57f087f5b8f997a652db434c6d80b1f2233d8142ed57ec",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "한 봉지에 사탕이 $31$개씩 들어 있고 봉지가 $4$개 있습니다. 전체 사탕 수를 구하는 곱셈식을 쓰고, 왜 곱셈으로 구할 수 있는지 설명해 보세요.",
      "bAnswer": "$31\\times4$. $31$개씩 같은 수의 묶음이 $4$개 있어 $31$을 $4$번 더하는 것과 같기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$31\\times4$"
          ]
        },
        {
          "anyOf": [
            "같은 수씩 여러 묶음"
          ]
        }
      ],
      "bGoal": "같은 수씩 묶인 상황을 곱셈식으로 나타내기",
      "bReason": "원문 예 상황을 쓰되 식만 묻지 않고 곱셈인 까닭까지 묻게 함",
      "cDecision": "rewrite",
      "cReason": "답 '(한 묶음의 수)×(묶음의 수)'는 괄호 말 식 전체라 학생이 쓸 수 없어 실제 상황의 수를 쓰게 함",
      "cSlotEquivalents": [],
      "answerNotes": "빈칸을 4, 31 순서로 써도 곱은 같으므로 인정을 권장"
    },
    "currentCMarkedSentence": "한 봉지에 $31$개씩 $4$봉지에 든 사탕의 수는 {$31$}$\\times${$4$}로 구한다.",
    "currentCSlotAnswers": [
      {
        "expected": "$31$",
        "equivalents": []
      },
      {
        "expected": "$4$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "31개씩 네 봉지의 반복 묶음 곱셈 뜻은 유용하나 수의 순서를 질문이 지정하지 않아 4×31도 맥락상 바른 전체 식으로 검토해야 한다.",
      "c": "31×4와 4×31 모두 전체를 구하므로 고정한 두 슬롯 순서를 정하거나 한 계수를 고정한다."
    }
  },
  {
    "id": "e3-1-4-4-xc18",
    "sourceIndex": 692,
    "grade": "e3",
    "source": {
      "sourceIndex": 692,
      "sourceFingerprint": "815466c359d60f26d0e55bcb9bb7bf36052a837f1f1f90e6a667191ce6db09a5",
      "part": "e3plus",
      "id": "e3-1-4-4-xc18",
      "section": "초3::1-4 곱셈::1-4-4 일의 자리에서 올림이 있는 (몇십몇)×(몇)",
      "term": "몇십으로 바꾸어 곱한 뒤 되돌리기",
      "kind": "방법",
      "level": "중",
      "definition": "몇십보다 조금 작은 수에 곱할 때에는 몇십에 곱한 다음 {모자란 만큼의 곱을 뺀다}.",
      "example": {
        "prompt": "$29\\times3$이 $30\\times3$보다 $3$ 작은 까닭은?",
        "answer": "$1$씩 세 묶음이 모자라서"
      },
      "studentC": "몇십보다 조금 작은 수에 곱할 때에는 몇십에 곱한 다음 □.",
      "answers": [
        "모자란 만큼의 곱을 뺀다"
      ]
    },
    "currentProposal": {
      "id": "e3-1-4-4-xc18",
      "proposalFingerprint": "66357551e39ef748d9f048807aa155ddd77c13bc51f6f6c6c5f5299b44043b04",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$29\\times3$을 $30\\times3$을 이용해 계산하는 방법과 그렇게 해도 되는 까닭을 설명해 보세요.",
      "bAnswer": "$30\\times3=90$에서 $3$을 빼 $87$을 구한다. $29$는 $30$보다 $1$ 작으므로 $3$묶음에서 $1$씩 $3$번, 곧 $3$이 모자라기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$30\\times3=90$"
          ]
        },
        {
          "anyOf": [
            "$1\\times3=3$을 뺌"
          ]
        },
        {
          "anyOf": [
            "$87$"
          ]
        }
      ],
      "bGoal": "몇십으로 바꾸어 곱한 뒤 모자란 만큼 빼기",
      "bReason": "원문 예(29×3, 30×3)를 써서 방법과 까닭을 함께 묻게 함",
      "cDecision": "rewrite",
      "cReason": "'모자란 만큼의 곱을 뺀다'는 문장 복원형 긴 빈칸이라 실제 계산값을 쓰게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$29\\times3$은 $30\\times3=${$90$}에서 $1\\times3=3$을 뺀 {$87$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$90$",
        "equivalents": []
      },
      {
        "expected": "$87$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "방법·87뿐 아니라 29는 30보다 1 작고 세 묶음에서 1씩 총 3이 초과됐다는 왜 빼는지의 이유를 기준에 포함해야 한다.",
      "c": "30×3의 90에서 3을 뺀 실제 87을 구한다."
    }
  },
  {
    "id": "e3-1-4-5-xc4",
    "sourceIndex": 697,
    "grade": "e3",
    "source": {
      "sourceIndex": 697,
      "sourceFingerprint": "efb798fd9ff343c9a275407e3a89948e18bcce1c1d5291081266f850979ce953",
      "part": "e3plus",
      "id": "e3-1-4-5-xc4",
      "section": "초3::1-4 곱셈::1-4-5 십의 자리와 일의 자리에서 올림이 있는 (몇십몇)×(몇)",
      "term": "올린 수 더하기의 차례",
      "kind": "방법",
      "level": "하",
      "definition": "일의 자리를 곱해 올린 수를 정하고, {십의 자리를 곱한 뒤} 올린 수를 더한다.",
      "studentC": "일의 자리를 곱해 올린 수를 정하고, □ 올린 수를 더한다.",
      "answers": [
        "십의 자리를 곱한 뒤"
      ]
    },
    "currentProposal": {
      "id": "e3-1-4-5-xc4",
      "proposalFingerprint": "0b4ee734f9e41d010295b2b2bf52157c300d3b7b5f8d80a2eaac432e385d45cf",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$47\\times3$에서 일의 자리 곱 $21$의 $2$를 올렸습니다. 십의 자리를 계산할 때 $4$에 $2$를 먼저 더해 $6\\times3$으로 계산하면 안 되는 까닭을 설명하고 바르게 계산해 보세요.",
      "bAnswer": "올린 $2$는 이미 $3$을 곱해서 나온 십의 묶음이므로 다시 곱하면 안 된다. $4\\times3=12$를 먼저 구하고 $2$를 더해 $14$로 계산한다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "먼저 $4\\times3$을 구하고 $2$를 더함"
          ]
        },
        {
          "anyOf": [
            "올린 수는 다시 곱하지 않음"
          ]
        }
      ],
      "bGoal": "십의 자리를 곱한 뒤 올린 수를 더하는 차례",
      "bReason": "원문에 예가 없어 47×3으로 차례를 틀리는 경우를 주고 까닭을 묻게 함",
      "cDecision": "rewrite",
      "cReason": "'십의 자리를 곱한 뒤'는 문장 복원형 구절이라 실제 계산 차례의 값을 쓰게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$47\\times3$에서 일의 자리 곱 $21$의 $2$를 올린다. 십의 자리는 먼저 $4\\times3=${$12$}를 구한 뒤 올린 수 $2$를 더해 {$14$}가 된다.",
    "currentCSlotAnswers": [
      {
        "expected": "$12$",
        "equivalents": []
      },
      {
        "expected": "$14$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "올린 수는 다시 곱하지 않는 이유와 4×3 뒤 2 더하기는 맞지만 바르게 계산하라는 요청의 결과 14도 기준에 포함해야 한다.",
      "c": "곱 12를 먼저 구한 뒤 올린 2를 더한 14라는 차례다."
    }
  },
  {
    "id": "e3-1-4-5-xc6",
    "sourceIndex": 698,
    "grade": "e3",
    "source": {
      "sourceIndex": 698,
      "sourceFingerprint": "f0cd7d2b79323f30adc343c2db99864086fb8319bf6d8442693e746dc93a7423",
      "part": "e3plus",
      "id": "e3-1-4-5-xc6",
      "section": "초3::1-4 곱셈::1-4-5 십의 자리와 일의 자리에서 올림이 있는 (몇십몇)×(몇)",
      "term": "올림이 겹치는 곱셈을 나누어 보기",
      "kind": "방법",
      "level": "하",
      "definition": "두 번 올림이 있는 곱셈도 {몇십의 곱과 몇의 곱}으로 나누어 보면 올린 수가 어디에서 왔는지 알 수 있다.",
      "example": {
        "prompt": "$58\\times6$을 $300+48$로 볼 때 $48$의 $4$는 어느 자리로 가는가?",
        "answer": "십의 자리"
      },
      "studentC": "두 번 올림이 있는 곱셈도 □으로 나누어 보면 올린 수가 어디에서 왔는지 알 수 있다.",
      "answers": [
        "몇십의 곱과 몇의 곱"
      ]
    },
    "currentProposal": {
      "id": "e3-1-4-5-xc6",
      "proposalFingerprint": "9b21a0b620d598a89763272d1f60909bcc31df8246dc4153c340db2ed6ed9069",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$58\\times6$을 세로로 계산하면 일의 자리에서 $4$를 올립니다. $58\\times6$을 $50\\times6$과 $8\\times6$으로 나누어 계산하고, 올린 $4$가 무엇을 뜻하는지 설명해 보세요.",
      "bAnswer": "$50\\times6=300$, $8\\times6=48$이고 더하면 $348$이다. 올린 $4$는 $48$에 들어 있는 십의 묶음 $4$개($40$)이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$300$과 $48$"
          ]
        },
        {
          "anyOf": [
            "올린 $4$는 $48$의 십의 묶음 $4$개"
          ]
        }
      ],
      "bGoal": "나누어 곱해 올린 수의 출처 알기",
      "bReason": "원문 예(58×6을 300+48로 봄)를 써서 나누어 곱하기와 올린 수의 뜻을 잇게 함",
      "cDecision": "rewrite",
      "cReason": "'몇십의 곱과 몇의 곱'은 구절 복원형이라 실제 두 곱과 올린 수를 쓰게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$58\\times6$을 $50\\times6=${$300$}과 $8\\times6=${$48$}로 나누어 보면, 십의 자리로 올린 수 {$4$}는 일의 자리 곱에서 온 것임을 알 수 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "$300$",
        "equivalents": []
      },
      {
        "expected": "$48$",
        "equivalents": []
      },
      {
        "expected": "$4$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "분해한 두 곱 300·48과 올린 4의 뜻은 맞으며 전체 계산을 요청했으므로 합친 348까지 기준 범위를 명시한다.",
      "c": "300·48과 일 곱에서 온 올린 4의 대응이 분명하다."
    }
  },
  {
    "id": "e3-1-4-5-xc9",
    "sourceIndex": 701,
    "grade": "e3",
    "source": {
      "sourceIndex": 701,
      "sourceFingerprint": "3d55d236671e6c6d737da9098daff169ca0af1621cb7dc147cac5a62ab84d7b7",
      "part": "e3plus",
      "id": "e3-1-4-5-xc9",
      "section": "초3::1-4 곱셈::1-4-5 십의 자리와 일의 자리에서 올림이 있는 (몇십몇)×(몇)",
      "term": "끝이 $00$인 곱",
      "kind": "성질",
      "level": "하",
      "definition": "$25\\times8=200$처럼 곱의 십의 자리와 일의 자리가 모두 {$0$}일 수도 있다.",
      "studentC": "$25\\times8=200$처럼 곱의 십의 자리와 일의 자리가 모두 □일 수도 있다.",
      "answers": [
        "$0$"
      ]
    },
    "currentProposal": {
      "id": "e3-1-4-5-xc9",
      "proposalFingerprint": "8cfe48cc79bf9c56bf28f1f7996ffcfa4d0260df40c4b282320e16aacb9741e5",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$25\\times8$을 세로로 계산하면 곱 $200$의 일의 자리와 십의 자리에 모두 $0$을 쓰게 됩니다. 각 자리에 $0$을 쓰게 되는 까닭을 계산 차례대로 설명해 보세요.",
      "bAnswer": "일의 자리 곱이 $5\\times8=40$이라 일의 자리에 $0$을 쓰고 $4$를 올린다. 십의 자리 곱 $2\\times8=16$에 $4$를 더하면 $20$이라 십의 자리에도 $0$을 쓰고 백의 자리에 $2$를 쓴다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "일의 자리 곱 $40$이라 $0$을 쓰고 $4$를 올림"
          ]
        },
        {
          "anyOf": [
            "$16+4=20$이라 십의 자리 $0$, 백의 자리 $2$"
          ]
        }
      ],
      "bGoal": "곱의 두 자리가 0이 되는 과정을 올림으로 설명",
      "bReason": "원문은 결과만 보여 주므로 두 자리의 0이 각각 어떻게 생기는지 묻게 함",
      "cDecision": "keep",
      "cReason": "25×8=200이 문장에 있어 두 자리의 숫자 0을 바로 확인하는 짧은 빈칸",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$25\\times8=200$처럼 곱의 십의 자리와 일의 자리가 모두 {$0$}일 수도 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "$0$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "두 자리의 0이 생기는 실제 40·20 계산 과정이 요청과 맞는다.",
      "c": "이미 준 200에서 0을 베끼는 C 대신 두 자리의 부분 계산·남기는 숫자를 직접 구하도록 바꾼다."
    }
  },
  {
    "id": "e3-1-5-1-xc1",
    "sourceIndex": 712,
    "grade": "e3",
    "source": {
      "sourceIndex": 712,
      "sourceFingerprint": "093e1a4324efc69ae3f3d7564167e72e1a9365f0a986db6d42988847b1718e81",
      "part": "e3plus",
      "id": "e3-1-5-1-xc1",
      "section": "초3::1-5 길이와 시간::1-5-1 1cm보다 작은 단위",
      "term": "$1\\,\\mathrm{mm}$ 읽기",
      "kind": "방법",
      "level": "하",
      "definition": "$1\\,\\mathrm{mm}$는 {$1$ 밀리미터}라고 읽는다.",
      "studentC": "$1\\,\\mathrm{mm}$는 □라고 읽는다.",
      "answers": [
        "$1$ 밀리미터"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-1-xc1",
      "proposalFingerprint": "b1105603439fa667af2b31f264a9edc1e6751e5d8cf849fc01a8a8ddc204de82",
      "learningRole": "naming",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "없음(단위 읽기)",
      "bReason": "기호 mm를 읽는 법만 다루어 뜻이나 방법을 설명할 거리가 없음",
      "cDecision": "keep",
      "cReason": "기호를 보고 익숙한 단위 이름을 쓰는 짧은 빈칸",
      "cSlotEquivalents": [],
      "exclusionReason": "1 mm를 소리 내어 읽는 단순 단위 읽기라 B 설명 질문이 되지 않음",
      "answerNotes": "'일 밀리미터', '1밀리미터' 인정. '밀리', '미리미터'는 오답."
    },
    "currentCMarkedSentence": "$1\\,\\mathrm{mm}$는 {$1$ 밀리미터}라고 읽는다.",
    "currentCSlotAnswers": [
      {
        "expected": "$1$ 밀리미터",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "단위 읽기 약속만의 B를 제외한다.",
      "c": "1 밀리미터와 일 밀리미터라는 숫자 읽기 표현은 같은 뜻이므로 맥락 대안으로 보완한다."
    }
  }
]
