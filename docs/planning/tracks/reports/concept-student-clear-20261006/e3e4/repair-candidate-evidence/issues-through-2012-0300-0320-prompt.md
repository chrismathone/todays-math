제공 순서 모든 ID에 대해 JSON 배열만 출력한다. 각 행은 수정 패치 {id,inputProposalFingerprint,변경하는필드들}이다. id와 현재 지문 해시는 필수이고 바뀌지 않은 필드는 복사하지 않는다. 직접 독자의 B/C 지적을 실제 문장과 채점 기준의 수정으로 해소하라. 지적이 수학적으로 틀렸으면 변경 대신 repairDisagreement에 이유와 실제 올바른 수학을 써라. 코멘트나 카운트만 고쳐서 문제를 해결했다고 하지 마라.
B를 바꾸면 bDecision,bPrompt,bAnswer,bRequiredIdeas,bGoal,bReason을 함께 완성한다. bDecision은 rewrite/exclude. exclude는 bPrompt,bAnswer null, bRequiredIdeas [], exclusionReason에 B만 제외하는 구체 이유와 알려진 실제 대응 ID를 기록한다. 초등에 익숙한 이름의 정의 질문은 가능하지만 제목 하나+설명하시오, 답 하나 대기, 의미 없는 이유 묻기는 금지한다. 설명 목표·조건·대상·응답 범위를 명시하고 질문에 예상 답은 넣지 않는다. 구체적 계산은 일반 방법·뜻·관계도 확인한다. requiredIdeas=[{anyOf:['한 가지 필수 의미의 유효한 표현', '그 의미를 만족하는 별도의 다른 방법']}]; 꼭 요청한 것만 필수다. 결과·식·방법·조건을 쓰라고 했으면 실제로 기준에 담고 묻지 않았으면 강제하지 않는다. 단순한 입력 되풀이를 설명으로 받지 않는다. 서로 다른 올바른 풀이의 필수 단계를 AND로 섞지 말고 전체 대체 풀이를 독립 anyOf 문자열로 적는다. 특정 예시만을 정답으로 강제하지 않는다. 역할을 바꾸면 learningRole=definition/procedure/reason/application/naming 중 실제 질문에 맞게 적는다.
C를 바꾸면 cDecision,cAfter,cSlotEquivalents,cReason을 함께 적는다. rewrite의 cAfter는 정답 부분을 {답}으로 표시한 실제 완성 학생 문장이고 1~4슬롯이다. 짧고 유용한 비교·계산 빈칸을 보존한다. 실제 대상 없이 긴 키워드를 복원하거나 부사만 채우게 하지 않는다. 빈칸과 같은 값을 다른 곳에서 공개하지 않는다. 입력의 수가 바뀐 역할에서 다시 답인 유용한 관계(몫 검산, 같은 거리 등)는 무조건 복사로 취급하지 않는다. 순서 없는 두 답은 같은 말을 두 번 써도 통과하는 슬롯별 대안으로 해결하지 말고 순서를 명시하거나 한 빈칸으로 줄인다. cSlotEquivalents는 각 슬롯의 대체 답 배열로서 수·읽기·단위·자리·횟수의 역할을 구별하되 그 문장에서 옳은 서로 다른 답은 허용한다. cDecision=keep은 원본 C 그대로 고정이므로 새 문장을 주지 않는다. exclude는 해당 C의 구체적인 낮은 이점 또는 반복 이유를 cReason으로 기록하고 cAfter=null, cSlotEquivalents=[]로 쓴다. 별도 remove:['cAfter','cSlotEquivalents'] 등으로 이전 필드 제거를 요청할 수 있다.
일반 학습 설명 A/SRS는 C와 별개다. coreAfter를 고칠 때는 실제 수학 오류나 빠진 조건을 고칠 때만이며 원래 표적과 일반 뜻을 보존한다. coreReason을 함께 기록한다. coreAfter도 {답} 1~4개, 보이는 전체 길이 8~160자로 만든다. C를 고쳤다는 이유로 A를 자동 대체하지 않는다.
숫자·수학 기호는 $...$ KaTeX, 곱은 	imes, 나눗셈은 div, 계산 내 빈칸 기호는 square이며 표시용 {답}과 LaTex의 중괄호를 혼동하지 않는다. 모든 조사·괄호·수식이 학생에게 실제로 읽혀야 한다. 쉬운 학년 말로 쓰고 새로운 이름이나 낯선 문자 변수를 만들지 않는다. 그림이 필요한 현재 질문은 실제 위치·수·이름을 텍스트에 제시하여 자립시키거나 그 form만 제외한다. 꼭 필요한 새 그림·조작 사례는 exampleNeeded에 무엇인지 적되 없는 그림을 이미 있는 것처럼 참조하지 않는다.
최종 승인·자동 테스트 pass·실제 독자가 재독했다는 말은 출력하지 않는다. 우리는 이 후보를 나중에 직접 읽고 원본과 확인한다. 다음 자료의 모든 ID를 빠짐없이 처리하라. 반드시 ID 하나당 B와 C 패치를 한 객체로 합쳐라. ID에 B·C 접미사를 붙이지 마라. cAfter의 중괄호에는 답·정답 같은 자리표시가 아니라 실제 수학 정답을 써라.

[
  {
    "id": "e4-1-3-7-xc6",
    "sourceIndex": 1774,
    "grade": "e4",
    "source": {
      "sourceIndex": 1774,
      "sourceFingerprint": "cc0f97b4f55c58a353d7c56739d21fcec72b5e117feb004fb89d8f92897f16c0",
      "part": "e4plus",
      "id": "e4-1-3-7-xc6",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-7 나눗셈의 어림셈",
      "term": "나눗셈의 어림셈을 쓰는 때",
      "kind": "성질",
      "level": "하",
      "definition": "정확한 몫보다 {대강의 수}가 필요할 때 나눗셈의 어림셈을 쓴다.",
      "studentC": "정확한 몫보다 □가 필요할 때 나눗셈의 어림셈을 쓴다.",
      "answers": [
        "대강의 수"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-7-xc6",
      "proposalFingerprint": "8e0612ed0b16ce8dbf136717588b51fef2a2ef8356acc5d2be2e88cec58febdc",
      "learningRole": "application",
      "bDecision": "rewrite",
      "bPrompt": "$398$개의 사탕을 $20$개씩 상자에 담으려고 한다. 상자가 대략 몇 개 필요한지만 알고 싶을 때 어떻게 계산하면 좋은지 쓰시오.",
      "bAnswer": "$400\\div20=20$으로 어림해 약 $20$개로 본다. 정확한 몫이 아니라 대강의 수만 필요하기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$400\\div20=20$으로 어림해 약 $20$개"
          ]
        },
        {
          "anyOf": [
            "정확한 값이 아니라 대강의 수가 필요하다"
          ]
        }
      ],
      "bGoal": "나눗셈 어림셈을 쓰는 때",
      "bReason": "대강의 수가 필요한 상황에서 어림 적용",
      "cDecision": "keep",
      "cReason": "익숙한 낱말 빈칸",
      "cSlotEquivalents": [
        [
          "어림한 수",
          "대략적인 수"
        ]
      ]
    },
    "currentCMarkedSentence": "정확한 몫보다 {대강의 수}가 필요할 때 나눗셈의 어림셈을 쓴다.",
    "currentCSlotAnswers": [
      {
        "expected": "대강의 수",
        "equivalents": [
          "어림한 수",
          "대략적인 수"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "어떻게 계산할지 묻는 질문에 이미 준 대강의 필요를 반드시 이유로 다시 쓰게 하지 말고 질문과 기준을 맞추어야 한다.",
      "c": "대강의 개수가 필요할 때라는 나눗셈 어림의 쓰임을 확인한다."
    }
  },
  {
    "id": "e4-1-3-7-xc12",
    "sourceIndex": 1779,
    "grade": "e4",
    "source": {
      "sourceIndex": 1779,
      "sourceFingerprint": "b75e77955e90fae7feaac4d32510fd1d55e520c96340567b22a49c0d7d3bb59e",
      "part": "e4plus",
      "id": "e4-1-3-7-xc12",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-7 나눗셈의 어림셈",
      "term": "어림한 몫부터 넣어 보기",
      "kind": "방법",
      "level": "중",
      "definition": "실제 몫을 구할 때 어림한 몫을 {먼저 넣어 보고} 곱셈으로 확인한다.",
      "studentC": "실제 몫을 구할 때 어림한 몫을 □ 곱셈으로 확인한다.",
      "answers": [
        "먼저 넣어 보고"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-7-xc12",
      "proposalFingerprint": "93f89677a84f02e27a9a6c67473b38a60a5ae004c67e2768e71ad40d219dc1d2",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$598\\div31$을 $600\\div30$으로 어림한 몫 $20$을 이용해 실제 몫을 구하시오.",
      "bAnswer": "$31\\times20=620$이 $598$보다 커서 몫을 $19$로 줄인다. $31\\times19=589$이고 나머지는 $9$이므로 몫은 $19$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$31\\times20=620$이 $598$보다 커서 몫을 줄인다"
          ]
        },
        {
          "anyOf": [
            "몫은 $19$"
          ]
        }
      ],
      "bGoal": "어림한 몫부터 넣어 구하기",
      "bReason": "어림값을 넣어 보고 고치는 과정 확인",
      "cDecision": "keep",
      "cReason": "익숙한 동작 빈칸",
      "cSlotEquivalents": [
        [
          "먼저 써 보고",
          "먼저 넣고"
        ]
      ]
    },
    "currentCMarkedSentence": "실제 몫을 구할 때 어림한 몫을 {먼저 넣어 보고} 곱셈으로 확인한다.",
    "currentCSlotAnswers": [
      {
        "expected": "먼저 넣어 보고",
        "equivalents": [
          "먼저 써 보고",
          "먼저 넣고"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "어림한 몫을 이용하라는 질문에서 실제 곱해 확인하는 과정을 쓰도록 질문과 기준을 맞추어야 한다.",
      "c": "먼저 넣어 보고라는 막연한 행동 대신 실제 31과 20을 곱해 크거나 작은지 판단하는 문장으로 바꾸어야 한다."
    }
  },
  {
    "id": "e4-1-3-7-xc17",
    "sourceIndex": 1782,
    "grade": "e4",
    "source": {
      "sourceIndex": 1782,
      "sourceFingerprint": "4685a40e704b3ac2076fa0443211cd2a69cad9d43122617766f77333b9666a8c",
      "part": "e4plus",
      "id": "e4-1-3-7-xc17",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-7 나눗셈의 어림셈",
      "term": "나누기 쉬운 수로 어림하기",
      "kind": "방법",
      "level": "중",
      "definition": "나눗셈을 어림할 때는 {곱셈구구}로 바로 나누어지는 수로 바꾸면 편하다.",
      "studentC": "나눗셈을 어림할 때는 □로 바로 나누어지는 수로 바꾸면 편하다.",
      "answers": [
        "곱셈구구"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-7-xc17",
      "proposalFingerprint": "877a6531e51ab444e0fd488fb1e1fad0d71a5305101446321c82e687324cddf4",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$598\\div31$의 몫을 쉽게 어림하려고 두 수를 바꾼다. 어떤 식으로 바꾸면 편한지 쓰시오.",
      "bAnswer": "$600\\div30$처럼 곱셈구구로 바로 나눌 수 있는 수로 바꾼다. $6\\div3$으로 몫이 쉽게 나온다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$600\\div30$처럼 곱셈구구로 바로 나눌 수 있는 수로 바꾼다"
          ]
        }
      ],
      "bGoal": "나누기 쉬운 수로 어림",
      "bReason": "쉬운 수로 바꾸는 방법 확인",
      "cDecision": "keep",
      "cReason": "익숙한 낱말 빈칸",
      "cSlotEquivalents": [
        [
          "구구단"
        ]
      ]
    },
    "currentCMarkedSentence": "나눗셈을 어림할 때는 {곱셈구구}로 바로 나누어지는 수로 바꾸면 편하다.",
    "currentCSlotAnswers": [
      {
        "expected": "곱셈구구",
        "equivalents": [
          "구구단"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "600 나누기 30을 6 나누기 3의 결과 그대로 보는 답은 몫의 열 배를 빠뜨리므로 실제 60 나누기 3 또는 십 묶음의 설명으로 고쳐야 한다.",
      "c": "곱셈구구로 쉽게 나눌 수 있는 수를 고르는 방법은 유지할 수 있다."
    }
  },
  {
    "id": "e4-1-3-7-xc20",
    "sourceIndex": 1783,
    "grade": "e4",
    "source": {
      "sourceIndex": 1783,
      "sourceFingerprint": "cc2248e5780582c9ee2e111cb8b3b024aaaa028f1fdd9932676c9f96bd9e54a1",
      "part": "e4plus",
      "id": "e4-1-3-7-xc20",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-7 나눗셈의 어림셈",
      "term": "묶음 수를 넉넉하게 잡는 어림",
      "kind": "방법",
      "level": "상",
      "definition": "전체 수는 그대로 두고 한 묶음의 크기를 작게 어림한 뒤, 나머지가 있으면 몫에 $1$을 더해 {넉넉한 묶음 수}를 잡는다.",
      "studentC": "전체 수는 그대로 두고 한 묶음의 크기를 작게 어림한 뒤, 나머지가 있으면 몫에 $1$을 더해 □를 잡는다.",
      "answers": [
        "넉넉한 묶음 수"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-7-xc20",
      "proposalFingerprint": "565bcdef560201f3d85d65a0669f220c83ef6c7cf144aef6f37543d54f205101",
      "learningRole": "application",
      "bDecision": "rewrite",
      "bPrompt": "$610$개를 $38$개씩 담을 때 한 묶음을 $30$으로 작게 어림해 $610\\div30$을 계산하면 몫 $20$, 나머지 $10$이다. 상자를 몇 개 준비하면 넉넉하고 그 까닭은 무엇인가?",
      "bAnswer": "$21$개이다. 한 묶음을 작게 어림했으므로 실제 필요한 수보다 넉넉하고, 나머지 $10$개도 담으려고 몫에 $1$을 더한다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$21$개"
          ]
        },
        {
          "anyOf": [
            "나머지도 담으려고 몫에 $1$을 더한다",
            "한 묶음을 작게 어림하면 넉넉한 수가 나온다"
          ]
        }
      ],
      "bGoal": "묶음 수를 넉넉하게 잡기",
      "bReason": "작게 어림한 묶음과 몫+1의 이유",
      "cDecision": "rewrite",
      "cReason": "'넉넉한 묶음 수' 구절 대신 실제 수로 고침",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$610$개를 $38$개씩 담을 때 $38$을 더 작은 $30$으로 보고 $610\\div30=20\\cdots10$이므로, 몫에 $1$을 더한 {$21$}개의 상자면 넉넉하다.",
    "currentCSlotAnswers": [
      {
        "expected": "$21$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "왜 상자가 충분한지에 대한 실제 38 곱하기 21의 용량 확인도 옳은 이유이므로 허용하거나 어림한 방법으로 설명하라는 범위를 명시해야 한다.",
      "c": "작게 잡은 용량에 나머지까지 한 상자 더한 21개는 분명하다."
    }
  },
  {
    "id": "e4-1-3-7-xc21",
    "sourceIndex": 1784,
    "grade": "e4",
    "source": {
      "sourceIndex": 1784,
      "sourceFingerprint": "1c9e0a2cc060704afa739199d83a029ca5117d8ff3e5f33fe32e28b59bc023f2",
      "part": "e4plus",
      "id": "e4-1-3-7-xc21",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-7 나눗셈의 어림셈",
      "term": "곱셈으로 몫 어림하기",
      "kind": "방법",
      "level": "상",
      "definition": "나누는 수를 가까운 몇십으로 바꾸어 {몇십을 곱하면} {나누어지는 수에 가까운지} 찾아 몫을 어림할 수 있다.",
      "example": {
        "prompt": "$780\\div39$의 몫을 $20$쯤으로 어림한 까닭은?",
        "answer": "$40\\times20$이 $780$에 가까워서"
      },
      "studentC": "나누는 수를 가까운 몇십으로 바꾸어 □ □ 찾아 몫을 어림할 수 있다.",
      "answers": [
        "몇십을 곱하면",
        "나누어지는 수에 가까운지"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-7-xc21",
      "proposalFingerprint": "ba2a5442855f182c1c65135a28d1235da25e78bc7ca82443a6c52cc71627b669",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$780\\div39$의 몫을 약 $20$으로 어림하려고 한다. $39$를 가까운 몇십으로 바꿔 어떤 곱셈을 보면 되는지 쓰시오.",
      "bAnswer": "$39$를 $40$으로 보고 $40\\times20=800$이 $780$에 가까워서 약 $20$으로 어림한다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$39$를 $40$으로 본다"
          ]
        },
        {
          "anyOf": [
            "$40\\times20=800$이 $780$에 가깝다"
          ]
        }
      ],
      "bGoal": "곱셈으로 몫 어림하기",
      "bReason": "곱이 나누어지는 수에 가까운지 보는 방법",
      "cDecision": "rewrite",
      "cReason": "긴 두 구절 빈칸 대신 짧은 수 빈칸으로 고침",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$780\\div39$는 $39$를 $40$으로 보면 $40\\times10=400$, $40\\times20=800$이다. $780$에 더 가까운 것은 $40\\times${$20$}이므로 몫은 약 $20$이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$20$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "가까운 십으로 바꾸어 곱셈으로 몫을 어림하는 질문은 분명하다.",
      "c": "뒤에 약 20이라고 빈칸의 값을 공개하므로 그 부분을 없애고 가까운 곱을 선택하는 목표만 남겨야 한다."
    }
  },
  {
    "id": "e4-1-3-7-xc25",
    "sourceIndex": 1787,
    "grade": "e4",
    "source": {
      "sourceIndex": 1787,
      "sourceFingerprint": "1c9e75db89053cf0d1fefa7c9a7dd95ce2925fc0f012c45eac5f1f65768fc732",
      "part": "e4plus",
      "id": "e4-1-3-7-xc25",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-7 나눗셈의 어림셈",
      "term": "어림과 크게 다른 몫",
      "kind": "방법",
      "level": "상",
      "definition": "계산한 몫이 어림한 몫과 {자릿수}부터 다르면 계산을 다시 살핀다.",
      "studentC": "계산한 몫이 어림한 몫과 □부터 다르면 계산을 다시 살핀다.",
      "answers": [
        "자릿수"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-7-xc25",
      "proposalFingerprint": "33b825eae24af39089eda6319b107e35af0d1731c4ca6c1d29e66b4819b0eeaa",
      "learningRole": "application",
      "bDecision": "rewrite",
      "bPrompt": "$612\\div34$의 몫을 $600\\div30$으로 어림하면 약 $20$인데 계산한 몫이 $180$이 나왔다. 무엇을 해야 하는지 쓰시오.",
      "bAnswer": "$180$은 약 $20$과 자릿수부터 달라 계산을 다시 살펴야 한다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$180$과 $20$의 자릿수가 달라 계산을 다시 살핀다"
          ]
        }
      ],
      "bGoal": "어림과 다른 몫 점검",
      "bReason": "자릿수 차이로 계산 오류를 알아챔",
      "cDecision": "keep",
      "cReason": "익숙한 낱말 빈칸",
      "cSlotEquivalents": [
        [
          "몇 자리 수인지"
        ]
      ]
    },
    "currentCMarkedSentence": "계산한 몫이 어림한 몫과 {자릿수}부터 다르면 계산을 다시 살핀다.",
    "currentCSlotAnswers": [
      {
        "expected": "자릿수",
        "equivalents": [
          "몇 자리 수인지"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "해야 할 행동만 묻는 질문에 자리 수의 이유를 반드시 쓰게 하려면 질문에서도 이유를 요구해야 한다.",
      "c": "어림한 몫과 실제 계산의 자리 수가 다를 때 점검하는 관계를 확인한다."
    }
  },
  {
    "id": "e4-1-4-1-xc3",
    "sourceIndex": 1793,
    "grade": "e4",
    "source": {
      "sourceIndex": 1793,
      "sourceFingerprint": "7086339b5275e7f5eff80e81c687313882006beff1a1dc6b69bf9c75ceec3877",
      "part": "e4plus",
      "id": "e4-1-4-1-xc3",
      "section": "초4::1-4 평면도형의 이동::1-4-1 점의 이동",
      "term": "칸 수와 거리",
      "kind": "단위",
      "level": "하",
      "definition": "모눈에서 점이 옮겨 간 거리는 {한 칸의 길이를 칸 수만큼 더한} 길이이다.",
      "example": {
        "prompt": "한 칸이 $1\\,\\mathrm{cm}$인 모눈에서 $4$칸 옮긴 거리가 $4\\,\\mathrm{cm}$인 까닭은?",
        "answer": "$1\\,\\mathrm{cm}$를 네 번 가서"
      },
      "studentC": "모눈에서 점이 옮겨 간 거리는 □ 길이이다.",
      "answers": [
        "한 칸의 길이를 칸 수만큼 더한"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-1-xc3",
      "proposalFingerprint": "d4e04e1727041f7076022f9fe0d34e9468398456bc031220b2657eff35931222",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "한 칸이 $2\\,\\mathrm{cm}$인 모눈에서 점이 $3$칸 옮겨 간 거리를 구하고, 어떻게 구했는지 쓰시오.",
      "bAnswer": "$6\\,\\mathrm{cm}$이다. 한 칸의 길이 $2\\,\\mathrm{cm}$를 $3$번 더했다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "한 칸의 길이 $2\\,\\mathrm{cm}$를 $3$번 더한다",
            "$2\\times3$"
          ]
        },
        {
          "anyOf": [
            "$6\\,\\mathrm{cm}$"
          ]
        }
      ],
      "bGoal": "칸 수로 이동 거리 구하기",
      "bReason": "한 칸 길이와 칸 수의 관계 확인",
      "cDecision": "rewrite",
      "cReason": "어려운 긴 구절 대신 선명한 계산 빈칸으로 고침",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "한 칸이 $2\\,\\mathrm{cm}$인 모눈에서 점이 $3$칸 옮겨 가면 이동 거리는 {$6$}$\\,\\mathrm{cm}$이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$6$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "모눈에서 어느 방향으로 세 칸인지 질문에 명시하여 가로 또는 세로의 한 칸 길이를 이용하는 조건을 보여야 한다.",
      "c": "C도 오른쪽 세 칸 같은 이동 방향을 제시해야 한다."
    }
  },
  {
    "id": "e4-1-4-1-xc4",
    "sourceIndex": 1794,
    "grade": "e4",
    "source": {
      "sourceIndex": 1794,
      "sourceFingerprint": "712a6e51dacfd6ab22cca6d31beae5d22f875704ec1e9fad4a36046b0634f934",
      "part": "e4plus",
      "id": "e4-1-4-1-xc4",
      "section": "초4::1-4 평면도형의 이동::1-4-1 점의 이동",
      "term": "가로와 세로가 모두 다른 곳으로 점 옮기기",
      "kind": "방법",
      "level": "하",
      "definition": "오른쪽으로 $2$칸, 위쪽으로 $3$칸처럼 {두 방향}으로 나누어 점을 옮길 수 있다.",
      "studentC": "오른쪽으로 $2$칸, 위쪽으로 $3$칸처럼 □으로 나누어 점을 옮길 수 있다.",
      "answers": [
        "두 방향"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-1-xc4",
      "proposalFingerprint": "55cab6ef18e7e5b7fe451871c3aff0233d864fc55f7e590dde350f9aed4fc552",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "점이 오른쪽으로 $2$칸, 위쪽으로 $3$칸 옮겨 갔다. 이 이동을 말로 나타내려면 몇 가지 방향이 필요한가? 까닭도 쓰시오.",
      "bAnswer": "두 가지이다. 가로 방향과 세로 방향으로 모두 옮겼기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "두 방향",
            "$2$가지"
          ]
        },
        {
          "anyOf": [
            "가로와 세로로 모두 옮겼다",
            "오른쪽과 위쪽으로 나누어 옮겼다"
          ]
        }
      ],
      "bGoal": "두 방향으로 나눠 이동",
      "bReason": "가로·세로로 나눠 말하는 이유 확인",
      "cDecision": "keep",
      "cReason": "예가 주어진 짧은 빈칸",
      "cSlotEquivalents": [
        [
          "가로와 세로 방향",
          "두 번에"
        ]
      ]
    },
    "currentCMarkedSentence": "오른쪽으로 $2$칸, 위쪽으로 $3$칸처럼 {두 방향}으로 나누어 점을 옮길 수 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "두 방향",
        "equivalents": [
          "가로와 세로 방향",
          "두 번에"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "두 방향을 나누어 나타내는 목표를 실제 가로와 세로 이동으로 설명한다.",
      "c": "두 번에는 방향의 개수가 아니라 횟수이므로 같은 뜻의 대체 답으로 받지 않아야 한다."
    }
  },
  {
    "id": "e4-1-4-1-xc5",
    "sourceIndex": 1795,
    "grade": "e4",
    "source": {
      "sourceIndex": 1795,
      "sourceFingerprint": "ca01a6ea6bbae62316d76f7b8edbb7fe82a5a81cafa380979ce9fb39d7451b43",
      "part": "e4plus",
      "id": "e4-1-4-1-xc5",
      "section": "초4::1-4 평면도형의 이동::1-4-1 점의 이동",
      "term": "옮긴 점을 찍는 곳",
      "kind": "방법",
      "level": "하",
      "definition": "모눈의 선이 만나는 곳에 있던 점을 한 칸씩 옮기면 옮긴 점도 가로선과 세로선이 {만나는 곳}에 찍는다.",
      "studentC": "모눈의 선이 만나는 곳에 있던 점을 한 칸씩 옮기면 옮긴 점도 가로선과 세로선이 □에 찍는다.",
      "answers": [
        "만나는 곳"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-1-xc5",
      "proposalFingerprint": "44d2c1c0aa62f125ee227563c23d2144e4c77254e84ab383ff2fe8d7c90cdc08",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "모눈의 가로선과 세로선이 만나는 곳에 점이 있다. 이 점을 오른쪽으로 $1$칸 옮긴 점은 어디에 찍어야 하는지 쓰시오.",
      "bAnswer": "가로선과 세로선이 만나는 곳에 찍는다. 한 칸은 모눈선 사이 간격이라 선 위에서 선 위로 옮겨 가기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "가로선과 세로선이 만나는 곳"
          ]
        }
      ],
      "bGoal": "옮긴 점을 찍는 위치",
      "bReason": "모눈선이 만나는 곳에 찍는 기준 확인",
      "cDecision": "keep",
      "cReason": "익숙한 낱말 빈칸",
      "cSlotEquivalents": [
        [
          "만나는 점",
          "교차하는 곳"
        ]
      ]
    },
    "currentCMarkedSentence": "모눈의 선이 만나는 곳에 있던 점을 한 칸씩 옮기면 옮긴 점도 가로선과 세로선이 {만나는 곳}에 찍는다.",
    "currentCSlotAnswers": [
      {
        "expected": "만나는 곳",
        "equivalents": [
          "만나는 점",
          "교차하는 곳"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "어디에 찍는지 묻는 실제 질문에는 기존 점에서 오른쪽으로 한 칸 간 같은 가로선의 다음 교점이라는 위치가 답과 기준에 필요하다.",
      "c": "일반 모눈선이 만나는 위치의 성질은 분명하다."
    }
  },
  {
    "id": "e4-1-4-1-xc10",
    "sourceIndex": 1800,
    "grade": "e4",
    "source": {
      "sourceIndex": 1800,
      "sourceFingerprint": "75ed18a04301e0bd48eaa3660f7ccebf97d64026a6fbdfba370ec058059c9de9",
      "part": "e4plus",
      "id": "e4-1-4-1-xc10",
      "section": "초4::1-4 평면도형의 이동::1-4-1 점의 이동",
      "term": "같은 방향으로 이어 옮기기",
      "kind": "성질",
      "level": "중",
      "definition": "같은 방향으로 이어서 옮기면 옮긴 칸 수를 {더한} 만큼 그 방향으로 옮긴 것과 같다.",
      "example": {
        "prompt": "오른쪽 $2$칸 뒤 오른쪽 $3$칸이 오른쪽 $5$칸과 같은 까닭은?",
        "answer": "같은 방향으로 이어 가서"
      },
      "studentC": "같은 방향으로 이어서 옮기면 옮긴 칸 수를 □ 만큼 그 방향으로 옮긴 것과 같다.",
      "answers": [
        "더한"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-1-xc10",
      "proposalFingerprint": "ebbbab36cdf88190492eb86152161c6927c59904d20c11252a62cc4a63a24743",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "점을 오른쪽으로 $2$칸 옮기고 이어서 오른쪽으로 $3$칸 옮겼다. 한 번에 옮긴다면 어느 쪽으로 몇 칸이고, 그 칸 수는 어떻게 구하는가?",
      "bAnswer": "오른쪽으로 $5$칸이다. 같은 방향이므로 칸 수를 더한다($2+3=5$).",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "오른쪽으로 $5$칸",
            "$5$칸"
          ]
        },
        {
          "anyOf": [
            "칸 수를 더한다",
            "$2+3$",
            "합한다"
          ]
        }
      ],
      "bGoal": "같은 방향 이동 합치기",
      "bReason": "같은 방향이면 칸 수를 더한다는 방법을 직접 확인",
      "cDecision": "keep",
      "cReason": "짧은 낱말 빈칸이고 더한/합한 모두 자연스러움",
      "cSlotEquivalents": [
        [
          "합한"
        ]
      ]
    },
    "currentCMarkedSentence": "같은 방향으로 이어서 옮기면 옮긴 칸 수를 {더한} 만큼 그 방향으로 옮긴 것과 같다.",
    "currentCSlotAnswers": [
      {
        "expected": "더한",
        "equivalents": [
          "합한"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "어느 방향인지도 질문하므로 오른쪽 없이 5칸만으로 통과하는 기준을 고쳐야 한다.",
      "c": "같은 방향에서는 두 칸 수를 더하는 관계가 분명하다."
    }
  },
  {
    "id": "e4-1-4-1-xc13",
    "sourceIndex": 1803,
    "grade": "e4",
    "source": {
      "sourceIndex": 1803,
      "sourceFingerprint": "0a5a2783edac103f38c4e0b736e29c1d2ecfc93cf2d989b56b0ff1e42cfef18f",
      "part": "e4plus",
      "id": "e4-1-4-1-xc13",
      "section": "초4::1-4 평면도형의 이동::1-4-1 점의 이동",
      "term": "두 점 사이의 이동 찾기",
      "kind": "방법",
      "level": "중",
      "definition": "점 ㄱ에서 점 ㄴ까지의 이동은 가로로 {몇 칸}, 세로로 몇 칸인지 나누어 센다.",
      "studentC": "점 ㄱ에서 점 ㄴ까지의 이동은 가로로 □, 세로로 몇 칸인지 나누어 센다.",
      "answers": [
        "몇 칸"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-1-xc13",
      "proposalFingerprint": "27b030c7fb613986f1804e9e0bb8fb369b4683876467ccf8abcf8b70a56e003d",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "모눈 위 점 ㄱ에서 점 ㄴ까지 이동했다(그림). 이 이동을 가로와 세로로 나누어 각각 어느 쪽으로 몇 칸인지 쓰시오.",
      "bAnswer": "오른쪽으로 $4$칸, 위쪽으로 $3$칸이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "오른쪽으로 $4$칸",
            "가로로 $4$칸"
          ]
        },
        {
          "anyOf": [
            "위쪽으로 $3$칸",
            "세로로 $3$칸"
          ]
        }
      ],
      "bGoal": "두 점 사이 이동 나누어 세기",
      "bReason": "가로와 세로로 나누어 세는 방법을 그림으로 확인",
      "cDecision": "rewrite",
      "cReason": "빈칸 답 몇 칸이 바로 옆 구절에 그대로 보여 방법 낱말로 바꿈",
      "cSlotEquivalents": [
        [
          "따로",
          "각각"
        ]
      ],
      "exampleNeeded": "모눈종이에 점 ㄱ과, ㄱ에서 오른쪽 $4$칸·위쪽 $3$칸 떨어진 점 ㄴ을 표시한 그림"
    },
    "currentCMarkedSentence": "점 ㄱ에서 점 ㄴ까지의 이동은 가로로 몇 칸, 세로로 몇 칸인지 {나누어} 센다.",
    "currentCSlotAnswers": [
      {
        "expected": "나누어",
        "equivalents": [
          "따로",
          "각각"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "그림이라고만 쓰고 실제 두 점의 위치가 없어 오른쪽 네 칸 위쪽 세 칸을 구할 수 없으므로 모눈 그림 또는 두 위치의 선 번호를 제시해야 한다.",
      "c": "두 점의 위치도 없이 나누어라는 부사만 받지 말고 실제 가로와 세로의 칸 수를 구하는 문장으로 바꾸어야 한다."
    }
  },
  {
    "id": "e4-1-4-1-xc23",
    "sourceIndex": 1810,
    "grade": "e4",
    "source": {
      "sourceIndex": 1810,
      "sourceFingerprint": "af5f62e85c7b00a0150add02379ea62d024af8fd90ac1ea7a37dc0171ce6ea1b",
      "part": "e4plus",
      "id": "e4-1-4-1-xc23",
      "section": "초4::1-4 평면도형의 이동::1-4-1 점의 이동",
      "term": "한 칸의 길이가 다를 때",
      "kind": "단위",
      "level": "상",
      "definition": "같은 칸 수를 $1$칸 이상 옮길 때, 한 칸의 길이가 길면 옮긴 거리도 {길다}.",
      "example": {
        "prompt": "한 칸이 $2\\,\\mathrm{cm}$인 모눈에서 $3$칸 옮긴 거리가 $3\\,\\mathrm{cm}$가 아닌 까닭은?",
        "answer": "한 칸마다 $2\\,\\mathrm{cm}$씩 가서"
      },
      "studentC": "같은 칸 수를 $1$칸 이상 옮길 때, 한 칸의 길이가 길면 옮긴 거리도 □.",
      "answers": [
        "길다"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-1-xc23",
      "proposalFingerprint": "2913d6721b62874ac427d5d41ec338168f6ebe89508d4f7ae451092be611fbca",
      "learningRole": "application",
      "bDecision": "rewrite",
      "bPrompt": "한 칸의 길이가 $2\\,\\mathrm{cm}$인 모눈에서 점을 $3$칸 옮겼다. 옮긴 거리는 몇 $\\mathrm{cm}$이며, 어떻게 구하는가?",
      "bAnswer": "$6\\,\\mathrm{cm}$이다. 한 칸의 길이 $2\\,\\mathrm{cm}$가 $3$칸이므로 $2\\times3=6$으로 구한다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$6\\,\\mathrm{cm}$",
            "$6$cm"
          ]
        },
        {
          "anyOf": [
            "한 칸의 길이에 칸 수를 곱한다",
            "$2\\times3$",
            "$2$cm씩 $3$칸"
          ]
        }
      ],
      "bGoal": "칸 길이로 거리 구하기",
      "bReason": "칸 수와 한 칸 길이를 함께 써서 거리를 구함",
      "cDecision": "keep",
      "cReason": "길면 길다로 답하는 짧은 비교 빈칸",
      "cSlotEquivalents": [
        [
          "더 길다",
          "멀다"
        ]
      ]
    },
    "currentCMarkedSentence": "같은 칸 수를 $1$칸 이상 옮길 때, 한 칸의 길이가 길면 옮긴 거리도 {길다}.",
    "currentCSlotAnswers": [
      {
        "expected": "길다",
        "equivalents": [
          "더 길다",
          "멀다"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "1793과 한 칸 2cm 및 세 칸의 같은 B 질문이므로 하나의 설명형에서 제외하거나 새로운 비교 사례로 구별해야 한다.",
      "c": "거리 비교의 이동은 가로 또는 세로 한 방향이라고 조건을 명시해야 한다."
    }
  },
  {
    "id": "e4-1-4-1-xc24",
    "sourceIndex": 1811,
    "grade": "e4",
    "source": {
      "sourceIndex": 1811,
      "sourceFingerprint": "8a45ae6c4d7fa8c2666ed7256968770ae3523dd33a02e78f3d8af94331dd8f91",
      "part": "e4plus",
      "id": "e4-1-4-1-xc24",
      "section": "초4::1-4 평면도형의 이동::1-4-1 점의 이동",
      "term": "같은 곳에 가는 여러 이동",
      "kind": "성질",
      "level": "상",
      "definition": "같은 도착점으로 가는 이동은 {여러 가지}로 설명할 수 있다.",
      "studentC": "같은 도착점으로 가는 이동은 □로 설명할 수 있다.",
      "answers": [
        "여러 가지"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-1-xc24",
      "proposalFingerprint": "b8764811d2ac88c63fbf6bb08295249d3173c42a46c6ddd5e82cbc1e942d99bb",
      "learningRole": "application",
      "bDecision": "rewrite",
      "bPrompt": "점 ㄱ에서 오른쪽으로 $3$칸, 위쪽으로 $2$칸 간 곳을 점 ㄴ이라 한다. 점 ㄱ에서 점 ㄴ까지 가는 이동을 서로 다른 방법으로 두 가지 쓰시오.",
      "bAnswer": "예) 오른쪽 $3$칸 뒤 위쪽 $2$칸. 위쪽 $2$칸 뒤 오른쪽 $3$칸. (오른쪽 $1$칸씩 나누어 가도 된다.)",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "오른쪽 합이 $3$칸, 위쪽 합이 $2$칸이 되도록 서로 다른 순서나 나눔으로 두 가지를 쓴다"
          ]
        }
      ],
      "bGoal": "같은 도착점 여러 이동",
      "bReason": "여러 경로가 같은 도착점이 됨을 직접 만들어 확인",
      "cDecision": "keep",
      "cReason": "여러 가지는 짧고 친숙한 낱말 빈칸",
      "cSlotEquivalents": [
        [
          "여러 방법",
          "여러 가지 방법"
        ]
      ],
      "answerNotes": "오른쪽 합 $3$칸과 위쪽 합 $2$칸이 맞는 서로 다른 이동이면 정답"
    },
    "currentCMarkedSentence": "같은 도착점으로 가는 이동은 {여러 가지}로 설명할 수 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "여러 가지",
        "equivalents": [
          "여러 방법",
          "여러 가지 방법"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "두 가지 실제 방법을 자유롭게 요청하므로 반대 이동을 포함하여 도착점이 같은 우회 방법도 허용하거나 가로와 세로로만 나누는 조건을 명시해야 한다.",
      "c": "여러 가지라는 막연한 답 대신 실제 서로 다른 두 이동의 같은 도착점 비교를 제안한다."
    }
  },
  {
    "id": "e4-1-4-2-xc8",
    "sourceIndex": 1822,
    "grade": "e4",
    "source": {
      "sourceIndex": 1822,
      "sourceFingerprint": "c475f0aed78ad0fa079141affadb84486ac4029c766587cc154cfd33a220105f",
      "part": "e4plus",
      "id": "e4-1-4-2-xc8",
      "section": "초4::1-4 평면도형의 이동::1-4-2 평면도형 밀기",
      "term": "모눈에서 밀기",
      "kind": "방법",
      "level": "하",
      "definition": "모눈에서 도형을 밀 때는 도형 전체를 같은 방향으로 {같은 칸 수}만큼 옮겨 그린다.",
      "studentC": "모눈에서 도형을 밀 때는 도형 전체를 같은 방향으로 □만큼 옮겨 그린다.",
      "answers": [
        "같은 칸 수"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-2-xc8",
      "proposalFingerprint": "b13e84ae33d0caa62aa8e95b124e26eb827e4a1858de18f6462da84faa91830f",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "모눈 위 삼각형을 오른쪽으로 $3$칸 밀어서 새로 그리려면 삼각형의 꼭짓점을 어떻게 옮겨야 하는가?",
      "bAnswer": "세 꼭짓점을 모두 오른쪽으로 $3$칸씩 옮긴 뒤 이어서 그린다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "모든 꼭짓점을 오른쪽으로 $3$칸씩 옮긴다",
            "도형 전체를 오른쪽으로 $3$칸 옮긴다"
          ]
        }
      ],
      "bGoal": "모눈에서 밀어 그리기",
      "bReason": "도형 전체를 같은 방향 같은 칸 수로 옮기는 방법",
      "cDecision": "keep",
      "cReason": "같은 칸 수는 문맥상 분명한 짧은 빈칸",
      "cSlotEquivalents": [
        [
          "같은 거리",
          "똑같은 칸 수"
        ]
      ]
    },
    "currentCMarkedSentence": "모눈에서 도형을 밀 때는 도형 전체를 같은 방향으로 {같은 칸 수}만큼 옮겨 그린다.",
    "currentCSlotAnswers": [
      {
        "expected": "같은 칸 수",
        "equivalents": [
          "같은 거리",
          "똑같은 칸 수"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "꼭짓점을 어떻게 옮기는지 묻는 질문에 도형 전체를 옮긴다는 일반 답만으로는 요청한 세 꼭짓점의 행동을 확인하지 못하므로 기준을 좁혀야 한다.",
      "c": "도형 전체가 같은 방향으로 같은 칸 수를 이동하는 조건을 확인한다."
    }
  },
  {
    "id": "e4-1-4-2-xc10",
    "sourceIndex": 1824,
    "grade": "e4",
    "source": {
      "sourceIndex": 1824,
      "sourceFingerprint": "287acd2241e8d0c4b702969981263bf600049bee4013c2a90cc048988c2a4b18",
      "part": "e4plus",
      "id": "e4-1-4-2-xc10",
      "section": "초4::1-4 평면도형의 이동::1-4-2 평면도형 밀기",
      "term": "같은 방향으로 이어 밀기",
      "kind": "성질",
      "level": "중",
      "definition": "같은 방향으로 이어서 밀면 민 칸 수를 {더한} 만큼 한 번에 민 것과 같다.",
      "example": {
        "prompt": "오른쪽 $4$칸 뒤 오른쪽 $1$칸이 오른쪽 $5$칸을 한 번에 민 것과 같은 까닭은?",
        "answer": "같은 방향으로 이어 밀어서"
      },
      "studentC": "같은 방향으로 이어서 밀면 민 칸 수를 □ 만큼 한 번에 민 것과 같다.",
      "answers": [
        "더한"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-2-xc10",
      "proposalFingerprint": "1f8607316bb542273fa8a860203bfee991a8e3fc30693380fc919dac79727d9e",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "도형을 오른쪽으로 $4$칸 민 뒤 이어서 오른쪽으로 $1$칸 밀었다. 한 번에 민다면 어느 쪽으로 몇 칸이고, 칸 수는 어떻게 구하는가?",
      "bAnswer": "오른쪽으로 $5$칸이다. 같은 방향이므로 칸 수를 더한다($4+1=5$).",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "오른쪽으로 $5$칸",
            "$5$칸"
          ]
        },
        {
          "anyOf": [
            "칸 수를 더한다",
            "$4+1$",
            "합한다"
          ]
        }
      ],
      "bGoal": "같은 방향 밀기 합치기",
      "bReason": "같은 방향으로 이어 밀면 칸 수를 더함",
      "cDecision": "keep",
      "cReason": "더한은 짧고 분명한 계산 낱말 빈칸",
      "cSlotEquivalents": [
        [
          "합한"
        ]
      ]
    },
    "currentCMarkedSentence": "같은 방향으로 이어서 밀면 민 칸 수를 {더한} 만큼 한 번에 민 것과 같다.",
    "currentCSlotAnswers": [
      {
        "expected": "더한",
        "equivalents": [
          "합한"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "어느 쪽으로 몇 칸인지 묻는데 방향 없는 5칸만으로 통과하지 않게 기준에 오른쪽을 남겨야 한다.",
      "c": "같은 방향의 칸 수를 더하는 관계는 분명하다."
    }
  },
  {
    "id": "e4-1-4-2-xc19",
    "sourceIndex": 1832,
    "grade": "e4",
    "source": {
      "sourceIndex": 1832,
      "sourceFingerprint": "12595b68f1738ba56cba7c490867b4790f0ffcbc561e6b57ed702cf1a3330216",
      "part": "e4plus",
      "id": "e4-1-4-2-xc19",
      "section": "초4::1-4 평면도형의 이동::1-4-2 평면도형 밀기",
      "term": "여러 번 민 것을 간단히 나타내기",
      "kind": "방법",
      "level": "상",
      "definition": "여러 번 민 것은 가로와 세로를 따로 살펴 {서로 반대인 밀기를 덜어 낸} 나머지로 나타낼 수 있다.",
      "example": {
        "prompt": "좌우 밀기와 위아래 밀기를 따로 살펴도 되는 까닭은?",
        "answer": "좌우 밀기는 위아래를 안 바꿔서"
      },
      "studentC": "여러 번 민 것은 가로와 세로를 따로 살펴 □ 나머지로 나타낼 수 있다.",
      "answers": [
        "서로 반대인 밀기를 덜어 낸"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-2-xc19",
      "proposalFingerprint": "89c0c5a9e9687052b3456a2936399958dab80a5287f8649391b6a7d8cdd7ec4f",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "도형을 오른쪽으로 $3$칸, 위쪽으로 $2$칸, 왼쪽으로 $1$칸 차례로 밀었다. 가로와 세로를 따로 살펴서 한 번에 민 것처럼 나타내시오.",
      "bAnswer": "오른쪽으로 $2$칸, 위쪽으로 $2$칸이다. 가로에서 오른쪽 $3$칸과 왼쪽 $1$칸은 서로 반대라 $3-1=2$칸이 남는다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "오른쪽으로 $2$칸"
          ]
        },
        {
          "anyOf": [
            "위쪽으로 $2$칸"
          ]
        }
      ],
      "bGoal": "여러 번 민 것 간단히",
      "bReason": "가로·세로를 따로 보고 반대 밀기를 덜어 냄",
      "cDecision": "rewrite",
      "cReason": "긴 구절 빈칸을 반대 한 낱말로 줄임",
      "cSlotEquivalents": [
        [
          "반대 방향"
        ]
      ]
    },
    "currentCMarkedSentence": "여러 번 민 것은 가로와 세로를 따로 살펴 서로 {반대}인 밀기는 덜어 내고 남은 밀기로 나타낼 수 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "반대",
        "equivalents": [
          "반대 방향"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "한 번에 민 것처럼은 비스듬한 한 방향으로 읽히므로 가로와 세로의 남은 이동으로 간단히 말하라는 범위를 명시해야 한다.",
      "c": "반대 방향 이동을 전부 없애는 것이 아니라 같은 칸 수 부분만 없앤다는 조건을 실제 3과 1의 예로 보여야 한다."
    }
  },
  {
    "id": "e4-1-4-2-xc22",
    "sourceIndex": 1835,
    "grade": "e4",
    "source": {
      "sourceIndex": 1835,
      "sourceFingerprint": "cd997f19eb2f3db9fc8a6fc8b78773077ec7dc5cb52eb5312a6cde84a540d097",
      "part": "e4plus",
      "id": "e4-1-4-2-xc22",
      "section": "초4::1-4 평면도형의 이동::1-4-2 평면도형 밀기",
      "term": "민 거리를 거꾸로 알기",
      "kind": "방법",
      "level": "상",
      "definition": "밀기 전과 후에 {같은 꼭짓점}이 떨어진 칸 수를 세면 민 방향과 칸 수를 알 수 있다.",
      "studentC": "밀기 전과 후에 □이 떨어진 칸 수를 세면 민 방향과 칸 수를 알 수 있다.",
      "answers": [
        "같은 꼭짓점"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-2-xc22",
      "proposalFingerprint": "795b644c7e8830ae6848b5a348c41c5c3abac9f541b59485cfe708898ccc85a3",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "모눈에서 삼각형 ㄱㄴㄷ을 밀었더니 삼각형 ㄹㅁㅂ이 되었다(ㄱ은 ㄹ로, ㄴ은 ㅁ으로, ㄷ은 ㅂ으로 옮겨짐). 밀린 방향과 칸 수는 어떻게 알아내는가?",
      "bAnswer": "짝이 되는 꼭짓점 하나(예: ㄱ과 ㄹ)가 어느 쪽으로 몇 칸 떨어져 있는지 센다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "짝이 되는 꼭짓점 하나가 떨어진 방향과 칸 수를 센다",
            "ㄱ에서 ㄹ까지 센다"
          ]
        }
      ],
      "bGoal": "민 방향과 칸 수 찾기",
      "bReason": "짝이 되는 꼭짓점의 이동으로 민 정도를 알아냄",
      "cDecision": "rewrite",
      "cReason": "같은 꼭짓점이라는 가려진 구절을 꼭짓점 한 낱말로 줄임",
      "cSlotEquivalents": [
        [
          "점"
        ]
      ],
      "exampleNeeded": "모눈에 삼각형 ㄱㄴㄷ과 오른쪽으로 민 삼각형 ㄹㅁㅂ을 나란히 그린 그림"
    },
    "currentCMarkedSentence": "밀기 전과 후에 같은 {꼭짓점}이 떨어진 칸 수를 세면 민 방향과 칸 수를 알 수 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "꼭짓점",
        "equivalents": [
          "점"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "처음과 옮긴 세 꼭짓점의 짝을 질문에서 정해 방법을 설명하므로 실제 위치 그림 없이도 일반 방법의 대상이 분명하다.",
      "c": "같은 꼭짓점이라는 말 대신 옮기기 전후에 짝이 되는 꼭짓점이라고 써 두 점의 관계를 특정해야 한다."
    }
  },
  {
    "id": "e4-1-4-2-xc23",
    "sourceIndex": 1836,
    "grade": "e4",
    "source": {
      "sourceIndex": 1836,
      "sourceFingerprint": "b578952dfe6cdc6a23e3b6da5cf7ecc1e396c484ea3610d0101c60036fdca535",
      "part": "e4plus",
      "id": "e4-1-4-2-xc23",
      "section": "초4::1-4 평면도형의 이동::1-4-2 평면도형 밀기",
      "term": "밀기가 아닌 이동 찾기",
      "kind": "성질",
      "level": "상",
      "definition": "글자 ㄱ을 옮겼는데 ㄴ처럼 보이면 밀기가 아니라 {다른 이동}을 한 것이다.",
      "studentC": "글자 ㄱ을 옮겼는데 ㄴ처럼 보이면 밀기가 아니라 □을 한 것이다.",
      "answers": [
        "다른 이동"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-2-xc23",
      "proposalFingerprint": "5819b270f2b38c8e806ee84c861b0742289dbd7de444c2b2f509cc5673af1288",
      "learningRole": "application",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "밀기가 아닌 이동",
      "bReason": "밀기 판단 기준은 xc20 B에서 다룸",
      "cDecision": "rewrite",
      "cReason": "다른 이동이라는 모호한 답을 뒤집기·돌리기로 구체화",
      "cSlotEquivalents": [
        [
          "돌리기"
        ],
        [
          "뒤집기"
        ]
      ],
      "exclusionReason": "방향이 달라지면 밀기가 아니라는 목표가 xc20 B와 같아 중복",
      "answerNotes": "두 빈칸은 순서를 바꿔 써도 정답"
    },
    "currentCMarkedSentence": "글자를 옮겼더니 처음과 놓인 방향이 달라졌다면 밀기가 아니라 {뒤집기}나 {돌리기}를 한 것이다.",
    "currentCSlotAnswers": [
      {
        "expected": "뒤집기",
        "equivalents": [
          "돌리기"
        ]
      },
      {
        "expected": "돌리기",
        "equivalents": [
          "뒤집기"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "밀기와 다른 방향 변화의 기존 B와 중복되는 제외를 유지한다.",
      "c": "두 빈칸에 뒤집기와 돌리기를 양쪽 모두 허용하면 중복 답이 통과하므로 한 빈칸의 유효한 방법이나 밀기 여부로 바꾸어야 한다."
    }
  },
  {
    "id": "e4-1-4-3-xc4",
    "sourceIndex": 1842,
    "grade": "e4",
    "source": {
      "sourceIndex": 1842,
      "sourceFingerprint": "f771529c03ecb3f713a82fe7515bd697286b7343eed6a0be2eeae3dd506e89d8",
      "part": "e4plus",
      "id": "e4-1-4-3-xc4",
      "section": "초4::1-4 평면도형의 이동::1-4-3 평면도형 뒤집기",
      "term": "위쪽으로 뒤집을 때 그대로인 것",
      "kind": "성질",
      "level": "하",
      "definition": "도형을 위쪽으로 뒤집으면 위아래 방향은 바뀌지만 가로 방향, 곧 {왼쪽}과 {오른쪽}은 바뀌지 않는다.",
      "studentC": "도형을 위쪽으로 뒤집으면 위아래 방향은 바뀌지만 가로 방향, 곧 □과 □은 바뀌지 않는다.",
      "answers": [
        "왼쪽",
        "오른쪽"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-3-xc4",
      "proposalFingerprint": "c87b9820e1fb59cb33217d8f96d61a502f33651c94e3ecb5b367ad72e325b103",
      "learningRole": "definition",
      "bDecision": "rewrite",
      "bPrompt": "도형을 위쪽으로 뒤집으면 위아래 방향과 왼쪽·오른쪽 방향은 각각 어떻게 되는가?",
      "bAnswer": "위쪽과 아래쪽은 서로 바뀌고 왼쪽과 오른쪽은 바뀌지 않는다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "위아래가 서로 바뀐다",
            "위쪽과 아래쪽이 바뀐다"
          ]
        },
        {
          "anyOf": [
            "왼쪽과 오른쪽은 그대로이다",
            "좌우는 바뀌지 않는다"
          ]
        }
      ],
      "bGoal": "위쪽 뒤집기에서 바뀌는 방향",
      "bReason": "뒤집는 방향에 따라 바뀌는 방향이 다름을 확인",
      "cDecision": "keep",
      "cReason": "가로 방향이라는 단서로 왼쪽·오른쪽이 분명함",
      "cSlotEquivalents": [
        [
          "오른쪽"
        ],
        [
          "왼쪽"
        ]
      ],
      "answerNotes": "두 빈칸은 왼쪽·오른쪽 순서를 바꿔 써도 정답"
    },
    "currentCMarkedSentence": "도형을 위쪽으로 뒤집으면 위아래 방향은 바뀌지만 가로 방향, 곧 {왼쪽}과 {오른쪽}은 바뀌지 않는다.",
    "currentCSlotAnswers": [
      {
        "expected": "왼쪽",
        "equivalents": [
          "오른쪽"
        ]
      },
      {
        "expected": "오른쪽",
        "equivalents": [
          "왼쪽"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "위아래의 변화와 좌우의 불변을 함께 질문과 기준에서 확인한다.",
      "c": "순서 없는 좌우 두 빈칸에 각 방향을 서로 대체 답으로 받으면 중복 답이 통과하므로 가로 방향이라는 한 빈칸이나 순서 명시로 바꾸어야 한다."
    }
  },
  {
    "id": "e4-1-4-3-xc5",
    "sourceIndex": 1843,
    "grade": "e4",
    "source": {
      "sourceIndex": 1843,
      "sourceFingerprint": "b15d780e1fd33cba0142b0c41046cfc676228a592cb19407fbd2b6e142dcb8d8",
      "part": "e4plus",
      "id": "e4-1-4-3-xc5",
      "section": "초4::1-4 평면도형의 이동::1-4-3 평면도형 뒤집기",
      "term": "오른쪽으로 뒤집을 때 그대로인 것",
      "kind": "성질",
      "level": "하",
      "definition": "도형을 오른쪽으로 뒤집으면 왼쪽과 오른쪽은 바뀌지만 세로 방향, 곧 {위쪽}과 {아래쪽}은 바뀌지 않는다.",
      "studentC": "도형을 오른쪽으로 뒤집으면 왼쪽과 오른쪽은 바뀌지만 세로 방향, 곧 □과 □은 바뀌지 않는다.",
      "answers": [
        "위쪽",
        "아래쪽"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-3-xc5",
      "proposalFingerprint": "9145df98d1700ea223fa2ba940a532f31945aa364cbc43ecd797441eed486220",
      "learningRole": "definition",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "오른쪽 뒤집기 그대로인 것",
      "bReason": "방향 쌍이 xc4 B와 대칭으로 같은 목표",
      "cDecision": "keep",
      "cReason": "세로 방향이라는 단서로 위쪽·아래쪽이 분명함",
      "cSlotEquivalents": [
        [
          "아래쪽"
        ],
        [
          "위쪽"
        ]
      ],
      "exclusionReason": "오른쪽으로 뒤집는 경우는 xc4 B와 같은 목표를 방향만 바꾼 것이라 중복",
      "answerNotes": "두 빈칸은 위쪽·아래쪽 순서를 바꿔 써도 정답"
    },
    "currentCMarkedSentence": "도형을 오른쪽으로 뒤집으면 왼쪽과 오른쪽은 바뀌지만 세로 방향, 곧 {위쪽}과 {아래쪽}은 바뀌지 않는다.",
    "currentCSlotAnswers": [
      {
        "expected": "위쪽",
        "equivalents": [
          "아래쪽"
        ]
      },
      {
        "expected": "아래쪽",
        "equivalents": [
          "위쪽"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "방향만 바뀐 뒤집기의 불변 설명을 맡는 기존 B와 중복되는 제외를 유지한다.",
      "c": "순서 없는 위아래 두 빈칸이 중복 답도 허용하므로 세로 방향이라는 한 빈칸이나 순서를 정한 문장으로 바꾸어야 한다."
    }
  }
]
