제공 순서 모든 ID에 대해 JSON 배열만 출력한다. 각 행은 수정 패치 {id,inputProposalFingerprint,변경하는필드들}이다. id와 현재 지문 해시는 필수이고 바뀌지 않은 필드는 복사하지 않는다. 직접 독자의 B/C 지적을 실제 문장과 채점 기준의 수정으로 해소하라. 지적이 수학적으로 틀렸으면 변경 대신 repairDisagreement에 이유와 실제 올바른 수학을 써라. 코멘트나 카운트만 고쳐서 문제를 해결했다고 하지 마라.
B를 바꾸면 bDecision,bPrompt,bAnswer,bRequiredIdeas,bGoal,bReason을 함께 완성한다. bDecision은 rewrite/exclude. exclude는 bPrompt,bAnswer null, bRequiredIdeas [], exclusionReason에 B만 제외하는 구체 이유와 알려진 실제 대응 ID를 기록한다. 초등에 익숙한 이름의 정의 질문은 가능하지만 제목 하나+설명하시오, 답 하나 대기, 의미 없는 이유 묻기는 금지한다. 설명 목표·조건·대상·응답 범위를 명시하고 질문에 예상 답은 넣지 않는다. 구체적 계산은 일반 방법·뜻·관계도 확인한다. requiredIdeas=[{anyOf:['한 가지 필수 의미의 유효한 표현', '그 의미를 만족하는 별도의 다른 방법']}]; 꼭 요청한 것만 필수다. 결과·식·방법·조건을 쓰라고 했으면 실제로 기준에 담고 묻지 않았으면 강제하지 않는다. 단순한 입력 되풀이를 설명으로 받지 않는다. 서로 다른 올바른 풀이의 필수 단계를 AND로 섞지 말고 전체 대체 풀이를 독립 anyOf 문자열로 적는다. 특정 예시만을 정답으로 강제하지 않는다. 역할을 바꾸면 learningRole=definition/procedure/reason/application/naming 중 실제 질문에 맞게 적는다.
C를 바꾸면 cDecision,cAfter,cSlotEquivalents,cReason을 함께 적는다. rewrite의 cAfter는 정답 부분을 {답}으로 표시한 실제 완성 학생 문장이고 1~4슬롯이다. 짧고 유용한 비교·계산 빈칸을 보존한다. 실제 대상 없이 긴 키워드를 복원하거나 부사만 채우게 하지 않는다. 빈칸과 같은 값을 다른 곳에서 공개하지 않는다. 입력의 수가 바뀐 역할에서 다시 답인 유용한 관계(몫 검산, 같은 거리 등)는 무조건 복사로 취급하지 않는다. 순서 없는 두 답은 같은 말을 두 번 써도 통과하는 슬롯별 대안으로 해결하지 말고 순서를 명시하거나 한 빈칸으로 줄인다. cSlotEquivalents는 각 슬롯의 대체 답 배열로서 수·읽기·단위·자리·횟수의 역할을 구별하되 그 문장에서 옳은 서로 다른 답은 허용한다. cDecision=keep은 원본 C 그대로 고정이므로 새 문장을 주지 않는다. exclude는 해당 C의 구체적인 낮은 이점 또는 반복 이유를 cReason으로 기록하고 cAfter=null, cSlotEquivalents=[]로 쓴다. 별도 remove:['cAfter','cSlotEquivalents'] 등으로 이전 필드 제거를 요청할 수 있다.
일반 학습 설명 A/SRS는 C와 별개다. coreAfter를 고칠 때는 실제 수학 오류나 빠진 조건을 고칠 때만이며 원래 표적과 일반 뜻을 보존한다. coreReason을 함께 기록한다. coreAfter도 {답} 1~4개, 보이는 전체 길이 8~160자로 만든다. C를 고쳤다는 이유로 A를 자동 대체하지 않는다.
숫자·수학 기호는 $...$ KaTeX, 곱은 	imes, 나눗셈은 div, 계산 내 빈칸 기호는 square이며 표시용 {답}과 LaTex의 중괄호를 혼동하지 않는다. 모든 조사·괄호·수식이 학생에게 실제로 읽혀야 한다. 쉬운 학년 말로 쓰고 새로운 이름이나 낯선 문자 변수를 만들지 않는다. 그림이 필요한 현재 질문은 실제 위치·수·이름을 텍스트에 제시하여 자립시키거나 그 form만 제외한다. 꼭 필요한 새 그림·조작 사례는 exampleNeeded에 무엇인지 적되 없는 그림을 이미 있는 것처럼 참조하지 않는다.
최종 승인·자동 테스트 pass·실제 독자가 재독했다는 말은 출력하지 않는다. 우리는 이 후보를 나중에 직접 읽고 원본과 확인한다. 다음 자료의 모든 ID를 빠짐없이 처리하라. 반드시 ID 하나당 B와 C 패치를 한 객체로 합쳐라. ID에 B·C 접미사를 붙이지 마라. cAfter의 중괄호에는 답·정답 같은 자리표시가 아니라 실제 수학 정답을 써라.

[
  {
    "id": "e4-1-3-3-xc25",
    "sourceIndex": 1708,
    "grade": "e4",
    "source": {
      "sourceIndex": 1708,
      "sourceFingerprint": "a58ae166c9392e7d881f2cdd3762b849bb82ab5417d1252f37ffce1d803a4f95",
      "part": "e4plus",
      "id": "e4-1-3-3-xc25",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-3 곱셈의 어림셈",
      "term": "한 수만 어림해 더 가깝게",
      "kind": "성질",
      "level": "상",
      "definition": "$298\\times19$는 $300\\times19$로 한 수만 어림하면 $300\\times20$보다 실제 곱에 {더 가깝다}.",
      "studentC": "$298\\times19$는 $300\\times19$로 한 수만 어림하면 $300\\times20$보다 실제 곱에 □.",
      "answers": [
        "더 가깝다"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-3-xc25",
      "proposalFingerprint": "43a7fe442be4e07b66ec8fd3135e4135f0cbe7ae628a2ca585d626c20b6ab172",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$298\\times19$를 $300\\times19$로 어림한 것과 $300\\times20$으로 어림한 것 중 실제 곱에 더 가까운 것은 어느 것이고, 그 까닭은 무엇인가?",
      "bAnswer": "$300\\times19$이다. $19$는 그대로 두고 한 수만 어림해서 곱이 덜 달라지기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$300\\times19$가 더 가깝다"
          ]
        },
        {
          "anyOf": [
            "한 수만 어림하면 다른 수는 그대로라 곱이 덜 달라진다",
            "두 수를 모두 바꾸면 곱이 더 많이 달라진다"
          ]
        }
      ],
      "bGoal": "한 수만 어림하면 더 가까움",
      "bReason": "한 수만 바꾼 어림이 나은 까닭 확인",
      "cDecision": "keep",
      "cReason": "비교 빈칸이라 유지",
      "cSlotEquivalents": [
        [
          "가깝다",
          "더 가까워진다"
        ]
      ]
    },
    "currentCMarkedSentence": "$298\\times19$는 $300\\times19$로 한 수만 어림하면 $300\\times20$보다 실제 곱에 {더 가깝다}.",
    "currentCSlotAnswers": [
      {
        "expected": "더 가깝다",
        "equivalents": [
          "가깝다",
          "더 가까워진다"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "이 예에서는 두 인수를 모두 크게 바꾼다는 실제 조건으로 설명하고 한 수만 바꾸면 항상 가깝다는 일반화를 답과 기준에서 없애야 한다.",
      "c": "298과 19의 실제 예에서 한 수만 올린 값이 더 가까운 비교는 맞다."
    }
  },
  {
    "id": "e4-1-3-4-xc1",
    "sourceIndex": 1712,
    "grade": "e4",
    "source": {
      "sourceIndex": 1712,
      "sourceFingerprint": "f9d0eca0aa4a3e858484fad7a57f1687329d6113696ad909821bebfae0641c69",
      "part": "e4plus",
      "id": "e4-1-3-4-xc1",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-4 몇십으로 나누기",
      "term": "나눗셈에 쓰인 두 수의 이름",
      "kind": "정의",
      "level": "하",
      "definition": "$120\\div30$에서 $120$은 나누어지는 수, $30$은 {나누는 수}이다.",
      "studentC": "$120\\div30$에서 $120$은 나누어지는 수, $30$은 □이다.",
      "answers": [
        "나누는 수"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-4-xc1",
      "proposalFingerprint": "9d8b9e4b79272561e20de690754df8182bae8c850d44e5a71189e452a5718fef",
      "learningRole": "naming",
      "bDecision": "rewrite",
      "bPrompt": "$120\\div30$에서 $120$과 $30$을 각각 무엇이라고 부르는지 쓰시오.",
      "bAnswer": "$120$은 나누어지는 수, $30$은 나누는 수이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$120$은 나누어지는 수"
          ]
        },
        {
          "anyOf": [
            "$30$은 나누는 수"
          ]
        }
      ],
      "bGoal": "나눗셈 두 수의 이름",
      "bReason": "식 속 위치별 이름을 구분해 쓰게 함",
      "cDecision": "keep",
      "cReason": "식이 주어진 짧은 낱말 빈칸",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$120\\div30$에서 $120$은 나누어지는 수, $30$은 {나누는 수}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "나누는 수",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "두 수의 이름만 대는 B는 설명 목표가 약하므로 구체적 나누는 상황에서 역할을 설명하도록 바꾸거나 B 제외를 제안한다.",
      "c": "실제 식에서 나누는 수의 기존 이름을 확인한다."
    }
  },
  {
    "id": "e4-1-3-4-xc3",
    "sourceIndex": 1714,
    "grade": "e4",
    "source": {
      "sourceIndex": 1714,
      "sourceFingerprint": "c38c3a48a222678e9e55588aecbf868ec716be3b699401b98ccd02c0e80350a7",
      "part": "e4plus",
      "id": "e4-1-3-4-xc3",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-4 몇십으로 나누기",
      "term": "곱셈으로 몫 찾기",
      "kind": "방법",
      "level": "하",
      "definition": "$120\\div30$의 몫은 $30\\times\\square=120$에서 {$\\square$에 알맞은 수}를 찾으면 된다.",
      "example": {
        "prompt": "$30\\times\\square=210$에서 $\\square$는?",
        "answer": "$7$"
      },
      "studentC": "$120\\div30$의 몫은 $30\\times\\square=120$에서 □를 찾으면 된다.",
      "answers": [
        "$\\square$에 알맞은 수"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-4-xc3",
      "proposalFingerprint": "d3ea9fb8606fc54a1c34c2043a02ee89f005f85db7f88b983da98f1980dd1042",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$210\\div30$의 몫을 구하려고 $30$에 어떤 수를 곱해 $210$이 되는지 찾는다. 그 수와, 그 수가 몫이 되는 까닭을 쓰시오.",
      "bAnswer": "$30\\times7=210$이므로 몫은 $7$이다. 몫 $7$에 $30$을 곱하면 처음 수 $210$이 되기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$30\\times7=210$이므로 몫은 $7$이다"
          ]
        },
        {
          "anyOf": [
            "몫에 $30$을 곱하면 $210$이 되기 때문"
          ]
        }
      ],
      "bGoal": "곱셈으로 몫 찾기",
      "bReason": "곱셈식으로 몫을 구하는 이유까지 확인",
      "cDecision": "rewrite",
      "cReason": "□ 기호 혼동을 없애고 계산 빈칸으로 고침",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$120\\div30$의 몫은 $30$에 어떤 수를 곱해 $120$이 되는 수와 같다. 이 수는 {$4$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$4$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "그 수와 이유를 묻는 질문에서 반드시 곱셈식을 쓰도록 강제하지 말고 7이라는 답과 곱하면 처음 수가 되는 이유를 받도록 기준을 맞추어야 한다.",
      "c": "30의 몇 배가 120인지로 실제 몫을 구하는 목표가 분명하다."
    }
  },
  {
    "id": "e4-1-3-4-xc4",
    "sourceIndex": 1715,
    "grade": "e4",
    "source": {
      "sourceIndex": 1715,
      "sourceFingerprint": "d43b4c563aa1e0498cc18cb10f07af992751ea594e0e534c10f42092e057f086",
      "part": "e4plus",
      "id": "e4-1-3-4-xc4",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-4 몇십으로 나누기",
      "term": "$10$의 묶음으로 바꾸어 나누기",
      "kind": "방법",
      "level": "하",
      "definition": "몇백몇십을 몇십으로 나눌 때 두 수를 모두 {$10$의 묶음 수}로 바꾸어 나누어도 몫은 같다.",
      "example": {
        "prompt": "$240\\div40$과 $24\\div4$의 몫이 같은 까닭은?",
        "answer": "십 $24$개를 십 $4$개씩 묶어서"
      },
      "studentC": "몇백몇십을 몇십으로 나눌 때 두 수를 모두 □로 바꾸어 나누어도 몫은 같다.",
      "answers": [
        "$10$의 묶음 수"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-4-xc4",
      "proposalFingerprint": "964a361168a8146ee314d89b360cb24285c1cce84150b73e5dedcc976bf3d16b",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$240\\div40$과 $24\\div4$의 몫이 같은 까닭을 쓰시오.",
      "bAnswer": "$240$은 십 $24$개, $40$은 십 $4$개이므로 십 $24$개를 십 $4$개씩 묶는 것과 같아 몫이 같다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$240$은 십 $24$개, $40$은 십 $4$개로 볼 수 있다"
          ]
        },
        {
          "anyOf": [
            "십 $24$개를 십 $4$개씩 묶는 것과 같다"
          ]
        }
      ],
      "bGoal": "십 묶음으로 바꿔도 몫 같음",
      "bReason": "십 묶음 개념으로 몫이 같은 이유 확인",
      "cDecision": "rewrite",
      "cReason": "긴 키워드 구절 대신 짧은 비교 빈칸으로 고침",
      "cSlotEquivalents": [
        [
          "똑같다",
          "변하지 않는다"
        ]
      ]
    },
    "currentCMarkedSentence": "$240\\div40$은 $240$과 $40$을 모두 십이 몇 개인지로 바꾸어 $24\\div4$로 계산해도 몫이 {같다}.",
    "currentCSlotAnswers": [
      {
        "expected": "같다",
        "equivalents": [
          "똑같다",
          "변하지 않는다"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "몫이 같은 일반 이유를 묻는 범위에서는 두 수를 같은 열 배로 바꾸어도 몫이 같다는 설명도 허용하거나 질문에 십 묶음 설명 방법을 명시해야 한다.",
      "c": "십 묶음으로 바꾼 실제 두 식의 같은 몫을 확인한다."
    }
  },
  {
    "id": "e4-1-3-4-xc12",
    "sourceIndex": 1720,
    "grade": "e4",
    "source": {
      "sourceIndex": 1720,
      "sourceFingerprint": "9a9bcbf7cff9b012975931b6768e27f1d8cae958eb077993f3266fa5ae1855ce",
      "part": "e4plus",
      "id": "e4-1-3-4-xc12",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-4 몇십으로 나누기",
      "term": "곱셈구구 떠올리기",
      "kind": "방법",
      "level": "중",
      "definition": "몇십으로 나눌 때는 나누는 수의 {십의 자리 숫자}의 곱셈구구를 떠올린다.",
      "studentC": "몇십으로 나눌 때는 나누는 수의 □의 곱셈구구를 떠올린다.",
      "answers": [
        "십의 자리 숫자"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-4-xc12",
      "proposalFingerprint": "d54c72ff8d5c554ecde76f6e949ad33dc99612a6f619f049fac22d2a5c966544",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$240\\div30$의 몫을 구할 때 떠올릴 곱셈구구와 몫을 쓰시오.",
      "bAnswer": "$3\\times8=24$를 떠올려 몫은 $8$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$3\\times8=24$",
            "$3$단 곱셈구구"
          ]
        },
        {
          "anyOf": [
            "몫은 $8$"
          ]
        }
      ],
      "bGoal": "몇십 나눗셈의 곱셈구구 활용",
      "bReason": "어떤 구구를 쓰는지 직접 쓰게 함",
      "cDecision": "rewrite",
      "cReason": "'십의 자리 숫자' 복원 대신 계산 빈칸으로 고침",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$240\\div30$의 몫은 $3$에 어떤 수를 곱해 $24$가 되는지 곱셈구구로 찾아 구한다. 몫은 {$8$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$8$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "떠올릴 구구를 묻는 범위에 3단이라는 이름만으로는 부족하므로 3 곱하기 8 또는 8 곱하기 3의 실제 구구를 받아야 한다.",
      "c": "십 묶음의 곱으로 몫 8을 찾는 목표가 분명하다."
    }
  },
  {
    "id": "e4-1-3-4-xc18",
    "sourceIndex": 1724,
    "grade": "e4",
    "source": {
      "sourceIndex": 1724,
      "sourceFingerprint": "6f0a0e20e5339dbebeb57b47c2b2f62f7e5edc8d4beaafdccff9bb0e91eb2f32",
      "part": "e4plus",
      "id": "e4-1-3-4-xc18",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-4 몇십으로 나누기",
      "term": "나누는 수가 커질 때",
      "kind": "성질",
      "level": "중",
      "definition": "같은 수를 나눌 때 나누는 수가 커지면 몫은 {작아지거나 같다}.",
      "studentC": "같은 수를 나눌 때 나누는 수가 커지면 몫은 □.",
      "answers": [
        "작아지거나 같다"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-4-xc18",
      "proposalFingerprint": "2b0c7c5ebdd6cb351925bbf131721bc6a07a17796f4370e5f7423bdc2e8973ee",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$130\\div40$과 $130\\div60$의 몫을 각각 구하고, 같은 수를 나눌 때 나누는 수가 커지면 몫이 어떻게 되는지 쓰시오.",
      "bAnswer": "$130\\div40$의 몫은 $3$, $130\\div60$의 몫은 $2$이다. 나누는 수가 커지면 몫은 작아지거나 같다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$130\\div40$의 몫 $3$, $130\\div60$의 몫 $2$"
          ]
        },
        {
          "anyOf": [
            "몫이 작아지거나 같다",
            "몫이 커지지 않는다",
            "몫이 작아진다"
          ]
        }
      ],
      "bGoal": "나누는 수와 몫의 크기 관계",
      "bReason": "두 몫을 비교해 관계를 말하게 함",
      "cDecision": "keep",
      "cReason": "비교 빈칸이라 유지",
      "cSlotEquivalents": [
        [
          "커지지 않는다",
          "작아지거나 같아진다"
        ]
      ]
    },
    "currentCMarkedSentence": "같은 수를 나눌 때 나누는 수가 커지면 몫은 {작아지거나 같다}.",
    "currentCSlotAnswers": [
      {
        "expected": "작아지거나 같다",
        "equivalents": [
          "커지지 않는다",
          "작아지거나 같아진다"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "실제 예의 3에서 2로 작아짐과 일반적인 작아지거나 같음의 관계를 구분하고 일반 기준에서는 엄격한 작아짐만을 대체 답으로 받지 않아야 한다.",
      "c": "작아지거나 같다는 표현으로 정수 몫이 그대로인 경우도 보존한다."
    }
  },
  {
    "id": "e4-1-3-4-xc19",
    "sourceIndex": 1725,
    "grade": "e4",
    "source": {
      "sourceIndex": 1725,
      "sourceFingerprint": "bc1a42e6354e31e70ae3a1df67107908428818c04a18386d9cd3f6abb2dd19f8",
      "part": "e4plus",
      "id": "e4-1-3-4-xc19",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-4 몇십으로 나누기",
      "term": "남는 것도 담아야 할 때",
      "kind": "방법",
      "level": "상",
      "definition": "남는 것까지 모두 담거나 태워야 하는 상황에서는 나머지가 있으면 몫보다 {하나 더} 필요하다.",
      "example": {
        "prompt": "$250$명이 $40$명씩 타려면 $6$대가 아니라 $7$대인 까닭은?",
        "answer": "남은 $10$명도 타야 해서"
      },
      "studentC": "남는 것까지 모두 담거나 태워야 하는 상황에서는 나머지가 있으면 몫보다 □ 필요하다.",
      "answers": [
        "하나 더"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-4-xc19",
      "proposalFingerprint": "f43c80d65db0babd490152bf2246ecb32eec8dc365eefc444192fce52fc5af97",
      "learningRole": "application",
      "bDecision": "rewrite",
      "bPrompt": "$250$명이 $40$명씩 버스에 모두 타려면 버스가 몇 대 필요하고, 왜 그런지 쓰시오.",
      "bAnswer": "$7$대이다. $250\\div40=6\\cdots10$이고 남은 $10$명도 타야 해서 한 대 더 필요하다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$7$대"
          ]
        },
        {
          "anyOf": [
            "남은 $10$명도 타야 해서 한 대 더 필요하다"
          ]
        }
      ],
      "bGoal": "남는 것도 담을 때 몫+1",
      "bReason": "나머지가 있을 때 한 대 더 필요한 이유",
      "cDecision": "keep",
      "cReason": "익숙한 상황과 짧은 빈칸",
      "cSlotEquivalents": [
        [
          "한 개 더",
          "$1$ 더",
          "한 대 더",
          "한 묶음 더"
        ]
      ]
    },
    "currentCMarkedSentence": "남는 것까지 모두 담거나 태워야 하는 상황에서는 나머지가 있으면 몫보다 {하나 더} 필요하다.",
    "currentCSlotAnswers": [
      {
        "expected": "하나 더",
        "equivalents": [
          "한 개 더",
          "$1$ 더",
          "한 대 더",
          "한 묶음 더"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "남은 사람도 태우는 실제 상황과 일곱 대의 이유를 확인한다.",
      "c": "하나 더 필요한 것이 무엇인지 없는 일반 문장 대신 버스나 상자 개수의 구체적인 상황으로 바꾸어야 한다."
    }
  },
  {
    "id": "e4-1-3-4-xc27",
    "sourceIndex": 1731,
    "grade": "e4",
    "source": {
      "sourceIndex": 1731,
      "sourceFingerprint": "bd11521a2f000dc055f71be9ebc6ce428ac8f973cf353c7f749e3d6aad0da3ad",
      "part": "e4plus",
      "id": "e4-1-3-4-xc27",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-4 몇십으로 나누기",
      "term": "나누어떨어지게 고치기",
      "kind": "방법",
      "level": "상",
      "definition": "나머지가 있는 나눗셈은 나누어지는 수에서 {나머지만큼 빼거나}, 나누는 수에서 나머지를 뺀 만큼 더하면 나누어떨어진다.",
      "example": {
        "prompt": "$250\\div40$에서 $250$에 $30$을 더하면 나누어떨어지는 까닭은?",
        "answer": "남은 $10$과 합쳐 $40$이 되어서"
      },
      "studentC": "나머지가 있는 나눗셈은 나누어지는 수에서 □, 나누는 수에서 나머지를 뺀 만큼 더하면 나누어떨어진다.",
      "answers": [
        "나머지만큼 빼거나"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-4-xc27",
      "proposalFingerprint": "a671ca3ade68a76597bdfac30e98d227f6c85f210881cec3340228c3496656a0",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$250\\div40$을 나누어떨어지게 하려고 $250$에 $30$을 더한다. 왜 $30$을 더하면 되는지 쓰시오.",
      "bAnswer": "나머지 $10$에 $30$을 더하면 $40$이 되어 한 묶음이 채워지므로 $280\\div40=7$로 나누어떨어진다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "남은 $10$과 $30$을 합하면 $40$이 되어 한 묶음이 채워진다"
          ]
        }
      ],
      "bGoal": "나누어떨어지게 고치는 방법",
      "bReason": "더하는 수를 정하는 까닭 확인",
      "cDecision": "rewrite",
      "cReason": "긴 구절 대신 실제 수 두 개로 고침",
      "cSlotEquivalents": [
        [],
        []
      ]
    },
    "currentCMarkedSentence": "$250\\div40=6\\cdots10$이다. $250$에서 {$10$}을 빼거나 $250$에 {$30$}을 더하면 나누어떨어진다.",
    "currentCSlotAnswers": [
      {
        "expected": "$10$",
        "equivalents": []
      },
      {
        "expected": "$30$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "남은 10에 30을 더해 한 묶음을 채우는 실제 이유는 분명하다.",
      "c": "빼거나 더할 수는 10과 30 외에도 있으므로 가장 적게 빼거나 더한다는 조건을 명시해야 한다."
    }
  },
  {
    "id": "e4-1-3-5-xc5",
    "sourceIndex": 1735,
    "grade": "e4",
    "source": {
      "sourceIndex": 1735,
      "sourceFingerprint": "27ed1d65051183c59aa14157781ef1feb63c1521f76c2b09d076121497e50a5d",
      "part": "e4plus",
      "id": "e4-1-3-5-xc5",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-5 몇십몇으로 나누기 (1)",
      "term": "나누는 수의 배를 차례로 쓰기",
      "kind": "방법",
      "level": "하",
      "definition": "$24\\times1$, $24\\times2$, $24\\times3$을 차례로 써 보면 몫을 {찾기 쉽다}.",
      "studentC": "$24\\times1$, $24\\times2$, $24\\times3$을 차례로 써 보면 몫을 □.",
      "answers": [
        "찾기 쉽다"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-5-xc5",
      "proposalFingerprint": "7960d8acea851ce5416859e7752f3b7867495901845202c6aac36316bc2599c3",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$96\\div24$의 몫을 구하려고 $24\\times1=24$, $24\\times2=48$, $24\\times3=72$처럼 곱을 차례로 써 간다. 곱이 얼마가 될 때 멈추고, 몫은 얼마인가?",
      "bAnswer": "곱이 $96$이 되는 $24\\times4=96$에서 멈추고, 몫은 $4$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "곱이 $96$이 될 때 멈춘다",
            "$24\\times4=96$"
          ]
        },
        {
          "anyOf": [
            "몫은 $4$"
          ]
        }
      ],
      "bGoal": "배를 차례로 써서 몫 찾기",
      "bReason": "어디서 멈추는지와 몫을 확인",
      "cDecision": "keep",
      "cReason": "식이 주어진 짧은 빈칸",
      "cSlotEquivalents": [
        [
          "쉽게 찾을 수 있다",
          "구하기 쉽다"
        ]
      ]
    },
    "currentCMarkedSentence": "$24\\times1$, $24\\times2$, $24\\times3$을 차례로 써 보면 몫을 {찾기 쉽다}.",
    "currentCSlotAnswers": [
      {
        "expected": "찾기 쉽다",
        "equivalents": [
          "쉽게 찾을 수 있다",
          "구하기 쉽다"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "곱을 차례로 써서 96이 되는 배와 몫을 찾는 B는 분명하다.",
      "c": "몫을 찾기 쉽다는 인상만 묻는 C는 실제 나누어지는 수와 멈추는 곱 또는 몫을 제시하는 빈칸으로 바꿔야 한다."
    }
  },
  {
    "id": "e4-1-3-5-xc7",
    "sourceIndex": 1737,
    "grade": "e4",
    "source": {
      "sourceIndex": 1737,
      "sourceFingerprint": "fba7c1bfe432ae5eef92082d16e3d293876b62bd98d21fe4d2b2927d78bcd824",
      "part": "e4plus",
      "id": "e4-1-3-5-xc7",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-5 몇십몇으로 나누기 (1)",
      "term": "세로셈에서 빼기",
      "kind": "방법",
      "level": "하",
      "definition": "세로셈에서는 나누는 수와 몫의 곱을 나누어지는 수 아래에 쓰고 {빼서} 나머지를 구한다.",
      "studentC": "세로셈에서는 나누는 수와 몫의 곱을 나누어지는 수 아래에 쓰고 □ 나머지를 구한다.",
      "answers": [
        "빼서"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-5-xc7",
      "proposalFingerprint": "21d322291440c62fea40ce8a3d224aed1ffdd85bcc5069d39897490157dad14a",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$150\\div32$에서 몫을 $4$로 정해 세로셈을 쓰고 있다. $32\\times4$의 값을 $150$ 아래에 쓴 다음 어떤 계산을 해서 나머지를 구하는가? 나머지는 얼마인가?",
      "bAnswer": "$150$에서 $128$을 빼서 나머지 $22$를 구한다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$150$에서 $128$을 뺀다",
            "$150-128=22$"
          ]
        }
      ],
      "bGoal": "세로셈에서 빼서 나머지 구하기",
      "bReason": "곱을 쓴 뒤 하는 뺄셈 단계 확인",
      "cDecision": "keep",
      "cReason": "익숙한 동사 빈칸이고 답이 분명",
      "cSlotEquivalents": [
        [
          "빼어",
          "뺄셈으로"
        ]
      ]
    },
    "currentCMarkedSentence": "세로셈에서는 나누는 수와 몫의 곱을 나누어지는 수 아래에 쓰고 {빼서} 나머지를 구한다.",
    "currentCSlotAnswers": [
      {
        "expected": "빼서",
        "equivalents": [
          "빼어",
          "뺄셈으로"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "나머지도 직접 묻는 질문이므로 뺄셈 방법뿐 아니라 실제 나머지 22가 기준에 있어야 한다.",
      "c": "곱을 아래에 쓰고 빼는 실제 세로셈 행동을 확인한다."
    }
  },
  {
    "id": "e4-1-3-5-xc10",
    "sourceIndex": 1740,
    "grade": "e4",
    "source": {
      "sourceIndex": 1740,
      "sourceFingerprint": "b0f195b95458671e173497ee62424c8056ce40bf40f451166812c4716c38cf09",
      "part": "e4plus",
      "id": "e4-1-3-5-xc10",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-5 몇십몇으로 나누기 (1)",
      "term": "몫을 크게 짐작했을 때",
      "kind": "방법",
      "level": "중",
      "definition": "나누는 수와 짐작한 몫의 곱이 나누어지는 수보다 크면 그 곱이 나누어지는 수를 넘지 않을 때까지 {몫을 작게} 고친다.",
      "studentC": "나누는 수와 짐작한 몫의 곱이 나누어지는 수보다 크면 그 곱이 나누어지는 수를 넘지 않을 때까지 □ 고친다.",
      "answers": [
        "몫을 작게"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-5-xc10",
      "proposalFingerprint": "c67d1ef6b484818e249de0c3dc5e51303295593c205653d426af900de56f7637",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$150\\div24$에서 몫을 $7$로 짐작했다. 어떻게 고쳐야 하고, 최종 몫은 얼마인가?",
      "bAnswer": "$24\\times7=168$이 $150$보다 커서 몫을 $6$으로 작게 고친다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$24\\times7=168$이 $150$보다 크다"
          ]
        },
        {
          "anyOf": [
            "몫을 $6$으로 작게 고친다"
          ]
        }
      ],
      "bGoal": "크게 짐작한 몫 고치기",
      "bReason": "곱이 넘을 때 줄이는 방법 확인",
      "cDecision": "keep",
      "cReason": "크게/작게 방향이 분명한 짧은 빈칸",
      "cSlotEquivalents": [
        [
          "몫을 줄여",
          "몫을 더 작게"
        ]
      ]
    },
    "currentCMarkedSentence": "나누는 수와 짐작한 몫의 곱이 나누어지는 수보다 크면 그 곱이 나누어지는 수를 넘지 않을 때까지 {몫을 작게} 고친다.",
    "currentCSlotAnswers": [
      {
        "expected": "몫을 작게",
        "equivalents": [
          "몫을 줄여",
          "몫을 더 작게"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "질문에는 까닭을 요구하지 않았으므로 곱 168의 확인 이유를 반드시 쓰게 하려면 질문도 까닭을 묻도록 맞추어야 한다.",
      "c": "곱이 나누어지는 수를 넘을 때 몫을 줄이는 방향이 분명하다."
    }
  },
  {
    "id": "e4-1-3-5-xc19",
    "sourceIndex": 1747,
    "grade": "e4",
    "source": {
      "sourceIndex": 1747,
      "sourceFingerprint": "8283a329b1821b2a223201496a2bf1c09214c16fb9e05b5bfb3c3f9b811dfdd3",
      "part": "e4plus",
      "id": "e4-1-3-5-xc19",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-5 몇십몇으로 나누기 (1)",
      "term": "나누어떨어지게 고치기",
      "kind": "방법",
      "level": "상",
      "definition": "나머지가 있는 나눗셈은 나누어지는 수에서 {나머지만큼 빼거나}, 나누는 수에서 나머지를 뺀 만큼 더하면 나누어떨어진다.",
      "example": {
        "prompt": "$150\\div32$에서 $150$에서 $22$를 빼면 나누어떨어지는 까닭은?",
        "answer": "묶고 남은 $22$가 없어져서"
      },
      "studentC": "나머지가 있는 나눗셈은 나누어지는 수에서 □, 나누는 수에서 나머지를 뺀 만큼 더하면 나누어떨어진다.",
      "answers": [
        "나머지만큼 빼거나"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-5-xc19",
      "proposalFingerprint": "52066c908cb3a3383421784f59ed658bcdb70831f488be7bb1ca3d542e6a03ae",
      "learningRole": "procedure",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "나누어떨어지게 고치기",
      "bReason": "1-3-4 xc27과 같은 목표",
      "cDecision": "rewrite",
      "cReason": "긴 구절 대신 실제 수 두 개로 고침",
      "cSlotEquivalents": [
        [],
        []
      ],
      "exclusionReason": "나머지를 빼거나 보태 나누어떨어지게 만드는 e4-1-3-4-xc27과 같은 목표이다."
    },
    "currentCMarkedSentence": "$150\\div32=4\\cdots22$이다. $150$에서 {$22$}를 빼거나 $150$에 {$10$}을 더하면 나누어떨어진다.",
    "currentCSlotAnswers": [
      {
        "expected": "$22$",
        "equivalents": []
      },
      {
        "expected": "$10$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "남은 양을 빼거나 보태는 기존 B와 겹치는 제외를 유지한다.",
      "c": "22와 10 외에도 여러 수를 빼거나 더할 수 있으므로 가장 적게라는 조건이 필요하다."
    }
  },
  {
    "id": "e4-1-3-5-xc26",
    "sourceIndex": 1750,
    "grade": "e4",
    "source": {
      "sourceIndex": 1750,
      "sourceFingerprint": "17d5ff7c8f7b64df53b511b545ecdb0ec6d0fd2d988262d990c7cc43a680bd88",
      "part": "e4plus",
      "id": "e4-1-3-5-xc26",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-5 몇십몇으로 나누기 (1)",
      "term": "남는 것까지 모두 해야 할 때",
      "kind": "방법",
      "level": "상",
      "definition": "남는 것까지 모두 읽거나 담아야 하는 상황에서는 나머지가 있으면 몫보다 {하나 더} 필요하다.",
      "example": {
        "prompt": "$150$쪽을 하루 $32$쪽씩 읽으면 $4$일이 아니라 $5$일인 까닭은?",
        "answer": "남은 $22$쪽도 읽어야 해서"
      },
      "studentC": "남는 것까지 모두 읽거나 담아야 하는 상황에서는 나머지가 있으면 몫보다 □ 필요하다.",
      "answers": [
        "하나 더"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-5-xc26",
      "proposalFingerprint": "a704a4e7f53c46e18455939d0b1a01ab465ee71bea3844c9ecd07673a09d2d7c",
      "learningRole": "application",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "남는 것까지 해야 할 때",
      "bReason": "1-3-4 xc19와 같은 목표",
      "cDecision": "keep",
      "cReason": "익숙한 상황의 짧은 빈칸",
      "cSlotEquivalents": [
        [
          "한 개 더",
          "$1$ 더",
          "한 묶음 더"
        ]
      ],
      "exclusionReason": "나머지가 있으면 몫보다 하나 더 필요하다는 e4-1-3-4-xc19와 같은 목표이고 소재만 다르다."
    },
    "currentCMarkedSentence": "남는 것까지 모두 읽거나 담아야 하는 상황에서는 나머지가 있으면 몫보다 {하나 더} 필요하다.",
    "currentCSlotAnswers": [
      {
        "expected": "하나 더",
        "equivalents": [
          "한 개 더",
          "$1$ 더",
          "한 묶음 더"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "남는 것까지 처리하는 기존 상황 B와 중복되는 제외를 유지한다.",
      "c": "남는 것, 몫보다 더 필요한 대상, 읽는 횟수가 막연하므로 실제 책의 쪽수와 하루 읽는 쪽수 같은 상황으로 바꾸어야 한다."
    }
  },
  {
    "id": "e4-1-3-6-xc5",
    "sourceIndex": 1756,
    "grade": "e4",
    "source": {
      "sourceIndex": 1756,
      "sourceFingerprint": "191a8bb09df2d447d1c4d66e4d07bb88c47bc0f929c95768d93bd48164e51a27",
      "part": "e4plus",
      "id": "e4-1-3-6-xc5",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-6 몇십몇으로 나누기 (2)",
      "term": "몫의 십의 자리 숫자를 쓰는 자리",
      "kind": "방법",
      "level": "하",
      "definition": "몫의 십의 자리 숫자는 나누어지는 수의 {십의 자리} 위에 쓴다. 나누는 수가 몇십 번 들어가는지를 나타내기 때문이다.",
      "example": {
        "prompt": "$312\\div24$의 몫 $13$에서 $1$이 뜻하는 것은?",
        "answer": "$24$가 $10$번 들어감"
      },
      "studentC": "몫의 십의 자리 숫자는 나누어지는 수의 □ 위에 쓴다. 나누는 수가 몇십 번 들어가는지를 나타내기 때문이다.",
      "answers": [
        "십의 자리"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-6-xc5",
      "proposalFingerprint": "7949dc7004e0e7101811b45d04808c3ad9d6b3816c6cd29371bb0e19513bfe51",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$312\\div24=13$에서 몫의 십의 자리 숫자 $1$은 무엇을 뜻하는지 쓰시오.",
      "bAnswer": "$312$ 안에 $24$가 $10$번 들어간다는 뜻이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$24$가 $10$번 들어간다",
            "$24$를 $10$번 묶는다"
          ]
        }
      ],
      "bGoal": "몫의 십의 자리 숫자의 뜻",
      "bReason": "자리값을 나누는 수의 횟수로 설명",
      "cDecision": "keep",
      "cReason": "설명이 붙은 익숙한 자리 빈칸",
      "cSlotEquivalents": [
        [
          "십 자리"
        ]
      ]
    },
    "currentCMarkedSentence": "몫의 십의 자리 숫자는 나누어지는 수의 {십의 자리} 위에 쓴다. 나누는 수가 몇십 번 들어가는지를 나타내기 때문이다.",
    "currentCSlotAnswers": [
      {
        "expected": "십의 자리",
        "equivalents": [
          "십 자리"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "312 안에 24가 모두 열 번 들어간다는 뜻으로 읽히지 않게 십의 자리 몫이 나타내는 열 묶음 부분이라고 답과 기준을 명시해야 한다.",
      "c": "십의 자리 숫자를 나누어지는 수의 십의 자리 위에 쓰는 위치를 확인한다."
    }
  },
  {
    "id": "e4-1-3-6-xc9",
    "sourceIndex": 1758,
    "grade": "e4",
    "source": {
      "sourceIndex": 1758,
      "sourceFingerprint": "8b8f338e1a8ecb0dafcbcba03de9b13bb08704241c9b87546d08d116b66aeef8",
      "part": "e4plus",
      "id": "e4-1-3-6-xc9",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-6 몇십몇으로 나누기 (2)",
      "term": "똑같이 나누어 담을 때 몫의 뜻",
      "kind": "정의",
      "level": "하",
      "definition": "전체를 정해진 수의 상자에 똑같이 나누어 담을 때 몫은 {한 상자에 담기는 수}이다.",
      "example": {
        "prompt": "$480$개를 $24$상자에 똑같이 나눈 몫 $20$은 무엇을 뜻하는가?",
        "answer": "한 상자에 담기는 $20$개"
      },
      "studentC": "전체를 정해진 수의 상자에 똑같이 나누어 담을 때 몫은 □이다.",
      "answers": [
        "한 상자에 담기는 수"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-6-xc9",
      "proposalFingerprint": "f365680fe2dfcbaa559f6f48f13026ea5d6f5d7fcaa8fdb6bfbf99b5bbe0cfdd",
      "learningRole": "definition",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "똑같이 나눌 때 몫의 뜻",
      "bReason": "1-3-5 xc8과 같은 목표",
      "cDecision": "keep",
      "cReason": "상황이 주어진 명확한 의미 빈칸",
      "cSlotEquivalents": [
        [
          "한 상자에 들어가는 수",
          "한 상자에 담는 개수"
        ]
      ],
      "exclusionReason": "똑같이 나눌 때 몫의 뜻은 e4-1-3-5-xc8과 같은 목표이고 소재만 상자로 바뀐다."
    },
    "currentCMarkedSentence": "전체를 정해진 수의 상자에 똑같이 나누어 담을 때 몫은 {한 상자에 담기는 수}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "한 상자에 담기는 수",
        "equivalents": [
          "한 상자에 들어가는 수",
          "한 상자에 담는 개수"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "같이 나눌 때 몫의 의미를 설명하는 기존 B와 중복되는 제외를 유지한다.",
      "c": "전체와 한 상자에 담기는 수의 대상이 막연하므로 사탕 같은 셀 물건의 개수를 명시해야 한다."
    }
  },
  {
    "id": "e4-1-3-6-xc13",
    "sourceIndex": 1761,
    "grade": "e4",
    "source": {
      "sourceIndex": 1761,
      "sourceFingerprint": "8efc239c18897af8f1b50fe2d20099fc30a08c218d6d8129424381c0e47c4fa2",
      "part": "e4plus",
      "id": "e4-1-3-6-xc13",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-6 몇십몇으로 나누기 (2)",
      "term": "몫의 십의 자리 정하기",
      "kind": "방법",
      "level": "중",
      "definition": "세 자리 수를 두 자리 수로 나누어 몫이 두 자리 수일 때, 몫의 십의 자리 숫자는 나누어지는 수의 앞 {두} 자리로 만든 수를 나누는 수로 나눈 몫이다.",
      "example": {
        "prompt": "$756\\div36$에서 $75\\div36$을 먼저 하는 까닭은?",
        "answer": "십의 묶음 $75$개를 먼저 나누어서"
      },
      "studentC": "세 자리 수를 두 자리 수로 나누어 몫이 두 자리 수일 때, 몫의 십의 자리 숫자는 나누어지는 수의 앞 □ 자리로 만든 수를 나누는 수로 나눈 몫이다.",
      "answers": [
        "두"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-6-xc13",
      "proposalFingerprint": "7a28ba003d6575ebc234c5ce4672f3003a1dbbc8956528a2da52912da3beef55",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$756\\div36$의 몫이 두 자리 수일 때, 앞 두 자리로 만든 $75$를 먼저 $36$으로 나누는 까닭을 쓰시오.",
      "bAnswer": "$75$는 십의 묶음 $75$개를 뜻하므로 몫의 십의 자리를 구하려고 십 묶음을 먼저 나누기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$75$는 십의 묶음 $75$개이다",
            "십의 묶음을 먼저 나누어 몫의 십의 자리를 구한다"
          ]
        }
      ],
      "bGoal": "몫의 십의 자리 정하는 방법",
      "bReason": "앞 두 자리를 먼저 나누는 이유 확인",
      "cDecision": "keep",
      "cReason": "'두' 한 낱말 빈칸으로 짧고 명확",
      "cSlotEquivalents": [
        [
          "$2$"
        ]
      ]
    },
    "currentCMarkedSentence": "세 자리 수를 두 자리 수로 나누어 몫이 두 자리 수일 때, 몫의 십의 자리 숫자는 나누어지는 수의 앞 {두} 자리로 만든 수를 나누는 수로 나눈 몫이다.",
    "currentCSlotAnswers": [
      {
        "expected": "두",
        "equivalents": [
          "$2$"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "앞 두 자리의 75 자체가 750을 뜻하는 것처럼 쓰지 말고 원래 756에서 앞 두 숫자로 나타낸 부분이 십 묶음 75개라는 뜻으로 답과 기준을 고쳐야 한다.",
      "c": "세 자리 수를 두 자리로 나누는 범위와 앞 두 자리라는 방법이 분명하다."
    }
  },
  {
    "id": "e4-1-3-6-xc14",
    "sourceIndex": 1762,
    "grade": "e4",
    "source": {
      "sourceIndex": 1762,
      "sourceFingerprint": "c383e7ffa2d5d342b00a81f2f4a3d90fb20ba32eb1878e90c1dd7e6e9cdd7123",
      "part": "e4plus",
      "id": "e4-1-3-6-xc14",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-6 몇십몇으로 나누기 (2)",
      "term": "내려 쓴 수가 뜻하는 것",
      "kind": "성질",
      "level": "중",
      "definition": "앞에서 나누고 남은 수 옆에 일의 자리 숫자를 내려 쓴 수는 {아직 나누지 않은 낱개 전체}이다.",
      "example": {
        "prompt": "$756\\div36$에서 남은 $3$ 옆에 $6$을 내려 쓴 $36$은 무엇인가?",
        "answer": "남은 십 $3$개와 낱개 $6$개"
      },
      "studentC": "앞에서 나누고 남은 수 옆에 일의 자리 숫자를 내려 쓴 수는 □이다.",
      "answers": [
        "아직 나누지 않은 낱개 전체"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-6-xc14",
      "proposalFingerprint": "8b0f4a45ddaf041d86f8a1ad8793c2edf8491845ad054750b8f4ffe6844eb2b2",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$756\\div36$에서 십의 자리 몫 $2$를 구하고 남은 $3$ 옆에 $6$을 내려 쓴 $36$은 어떤 수를 뜻하는지 쓰시오.",
      "bAnswer": "남은 십 $3$개와 낱개 $6$개를 합친, 아직 나누지 않은 수 $36$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "남은 십 $3$개와 낱개 $6$개를 합친 수",
            "$30$과 $6$을 합친 아직 나누지 않은 수"
          ]
        }
      ],
      "bGoal": "내려 쓴 수가 뜻하는 것",
      "bReason": "내려 쓴 수의 값을 십과 낱개로 설명",
      "cDecision": "rewrite",
      "cReason": "어려운 긴 구절을 예와 쉬운 낱말로 고침",
      "cSlotEquivalents": [
        [
          "낱",
          "일의 자리"
        ]
      ]
    },
    "currentCMarkedSentence": "$756\\div36$에서 남은 $3$ 옆에 $6$을 내려 쓴 $36$은 남은 십 $3$개와 {낱개} $6$개를 합친 수이다.",
    "currentCSlotAnswers": [
      {
        "expected": "낱개",
        "equivalents": [
          "낱",
          "일의 자리"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "남은 십 세 묶음과 낱개 여섯을 합치는 자리값의 뜻을 설명한다.",
      "c": "일의 자리는 개수나 묶음의 단위인 낱개와 다른 종류의 답이므로 대체 답에서 빼야 한다."
    }
  },
  {
    "id": "e4-1-3-6-xc21",
    "sourceIndex": 1767,
    "grade": "e4",
    "source": {
      "sourceIndex": 1767,
      "sourceFingerprint": "f71ae479864db6f68d108c9ac4d9ecf54775640bb116fe63ff965cfc3c7d7f14",
      "part": "e4plus",
      "id": "e4-1-3-6-xc21",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-6 몇십몇으로 나누기 (2)",
      "term": "남는 것도 담아야 할 때",
      "kind": "방법",
      "level": "상",
      "definition": "남는 것까지 모두 담아야 하는 상황에서는 나머지가 있으면 몫보다 {하나 더} 필요하다.",
      "example": {
        "prompt": "$500$개를 $24$개씩 모두 담는 상자가 $20$개가 아니라 $21$개인 까닭은?",
        "answer": "남은 $20$개도 담아야 해서"
      },
      "studentC": "남는 것까지 모두 담아야 하는 상황에서는 나머지가 있으면 몫보다 □ 필요하다.",
      "answers": [
        "하나 더"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-6-xc21",
      "proposalFingerprint": "68421929951f7e4290f7915901973dc0575bd476b7a5a3a1cca6a8a7c29c1606",
      "learningRole": "application",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "남는 것도 담아야 할 때",
      "bReason": "1-3-4 xc19와 같은 목표",
      "cDecision": "keep",
      "cReason": "익숙한 상황의 짧은 빈칸",
      "cSlotEquivalents": [
        [
          "한 개 더",
          "$1$ 더",
          "한 상자 더",
          "한 묶음 더"
        ]
      ],
      "exclusionReason": "나머지가 있으면 몫보다 하나 더 필요하다는 e4-1-3-4-xc19와 같은 목표이다."
    },
    "currentCMarkedSentence": "남는 것까지 모두 담아야 하는 상황에서는 나머지가 있으면 몫보다 {하나 더} 필요하다.",
    "currentCSlotAnswers": [
      {
        "expected": "하나 더",
        "equivalents": [
          "한 개 더",
          "$1$ 더",
          "한 상자 더",
          "한 묶음 더"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "남는 양도 담는 기존 상황 B와 중복되는 제외를 유지한다.",
      "c": "더 필요한 것이 무엇인지 없는 문장 대신 실제 사탕과 상자 용량의 상황으로 바꾸어야 한다."
    }
  },
  {
    "id": "e4-1-3-6-xc25",
    "sourceIndex": 1770,
    "grade": "e4",
    "source": {
      "sourceIndex": 1770,
      "sourceFingerprint": "04eca646a756c33898fe1d75ab2540750ba96f7b3978a891d05a75d3175fdbda",
      "part": "e4plus",
      "id": "e4-1-3-6-xc25",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-6 몇십몇으로 나누기 (2)",
      "term": "자리마다 확인하며 나누기",
      "kind": "방법",
      "level": "상",
      "definition": "몫의 십의 자리를 정한 뒤 일의 자리를 정할 때에도 {곱해 보고 빼 보며} 확인한다.",
      "studentC": "몫의 십의 자리를 정한 뒤 일의 자리를 정할 때에도 □ 확인한다.",
      "answers": [
        "곱해 보고 빼 보며"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-6-xc25",
      "proposalFingerprint": "c1ce59690fcc08064bbaf472336a1e8f7f753cb12797902e22070d087cb933a5",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$756\\div36$에서 일의 자리 몫을 $1$로 정했다. 어떤 계산으로 맞는지 확인하고, 결과는 어떻게 되는지 쓰시오.",
      "bAnswer": "나누는 수에 몫을 곱한 $36\\times1=36$을 내려 쓴 $36$에서 빼면 $0$이어서 맞다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "나누는 수에 몫을 곱한 값을 내려 쓴 수에서 뺀다"
          ]
        },
        {
          "anyOf": [
            "나머지가 $0$이고 나누는 수보다 작아 맞다"
          ]
        }
      ],
      "bGoal": "일의 자리 몫 확인 방법",
      "bReason": "곱해 보고 빼 보는 확인 절차 확인",
      "cDecision": "rewrite",
      "cReason": "긴 키워드 구절을 두 동작 낱말로 나눠 고침",
      "cSlotEquivalents": [
        [
          "곱하여"
        ],
        [
          "뺀",
          "빼어"
        ]
      ]
    },
    "currentCMarkedSentence": "몫의 십의 자리를 정한 뒤 일의 자리를 정할 때에도 나누는 수에 짐작한 몫을 {곱해} 보고, 내려 쓴 수에서 {빼} 보며 확인한다.",
    "currentCSlotAnswers": [
      {
        "expected": "곱해",
        "equivalents": [
          "곱하여"
        ]
      },
      {
        "expected": "빼",
        "equivalents": [
          "뺀",
          "빼어"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "어떤 계산으로 확인하는지 묻는 범위에 실제 곱셈과 뺄셈을 학생이 써야 하며 일반 방법과 결과 0만으로 통과하지 않도록 기준을 보완해야 한다.",
      "c": "곱한 뒤 내려 쓴 수에서 빼는 실제 두 행동의 순서가 분명하다."
    }
  },
  {
    "id": "e4-1-3-7-xc4",
    "sourceIndex": 1773,
    "grade": "e4",
    "source": {
      "sourceIndex": 1773,
      "sourceFingerprint": "8d451481904067f3ecd1195573a94493cd54bf0c97f9b4d6ac93883ef1204661",
      "part": "e4plus",
      "id": "e4-1-3-7-xc4",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-7 나눗셈의 어림셈",
      "term": "어림한 몫의 쓰임",
      "kind": "성질",
      "level": "하",
      "definition": "몫을 어림해 두면 계산한 몫이 {알맞은 크기인지} 확인할 수 있다.",
      "studentC": "몫을 어림해 두면 계산한 몫이 □ 확인할 수 있다.",
      "answers": [
        "알맞은 크기인지"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-7-xc4",
      "proposalFingerprint": "b8bd569c31675ba2b853519b9a742c461018165b9e5001d8178c852131486fa4",
      "learningRole": "application",
      "bDecision": "rewrite",
      "bPrompt": "$612\\div34$의 몫을 $600\\div30$으로 어림하면 약 $20$이다. 계산한 몫이 $18$일 때 어림한 몫이 어떻게 도움이 되는지 쓰시오.",
      "bAnswer": "계산한 몫 $18$이 어림한 약 $20$과 가까워 알맞은 크기의 몫이라고 확인할 수 있다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "계산한 몫 $18$이 어림한 약 $20$과 가까워 알맞은 크기이다"
          ]
        }
      ],
      "bGoal": "어림한 몫으로 점검하기",
      "bReason": "계산 결과가 알맞은지 보는 쓰임 확인",
      "cDecision": "keep",
      "cReason": "익숙한 쓰임 빈칸",
      "cSlotEquivalents": [
        [
          "맞는지",
          "알맞은지"
        ]
      ]
    },
    "currentCMarkedSentence": "몫을 어림해 두면 계산한 몫이 {알맞은 크기인지} 확인할 수 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "알맞은 크기인지",
        "equivalents": [
          "맞는지",
          "알맞은지"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "계산한 몫의 대강 크기를 점검하는 쓰임을 설명한다.",
      "c": "어림만으로 정확히 맞는지 확인할 수는 없으므로 맞는지라는 대체 답을 빼고 알맞은 크기인지만 받도록 해야 한다."
    }
  }
]
