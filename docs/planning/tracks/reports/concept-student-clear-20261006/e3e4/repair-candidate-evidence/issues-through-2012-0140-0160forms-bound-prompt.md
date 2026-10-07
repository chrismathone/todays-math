제공 순서 모든 ID에 대해 JSON 배열만 출력한다. 각 행은 수정 패치 {id,inputProposalFingerprint,변경하는필드들}이다. id와 현재 지문 해시는 필수이고 바뀌지 않은 필드는 복사하지 않는다. 직접 독자의 B/C 지적을 실제 문장과 채점 기준의 수정으로 해소하라. 지적이 수학적으로 틀렸으면 변경 대신 repairDisagreement에 이유와 실제 올바른 수학을 써라. 코멘트나 카운트만 고쳐서 문제를 해결했다고 하지 마라.
B를 바꾸면 bDecision,bPrompt,bAnswer,bRequiredIdeas,bGoal,bReason을 함께 완성한다. bDecision은 rewrite/exclude. exclude는 bPrompt,bAnswer null, bRequiredIdeas [], exclusionReason에 B만 제외하는 구체 이유와 알려진 실제 대응 ID를 기록한다. 초등에 익숙한 이름의 정의 질문은 가능하지만 제목 하나+설명하시오, 답 하나 대기, 의미 없는 이유 묻기는 금지한다. 설명 목표·조건·대상·응답 범위를 명시하고 질문에 예상 답은 넣지 않는다. 구체적 계산은 일반 방법·뜻·관계도 확인한다. requiredIdeas=[{anyOf:['한 가지 필수 의미의 유효한 표현', '그 의미를 만족하는 별도의 다른 방법']}]; 꼭 요청한 것만 필수다. 결과·식·방법·조건을 쓰라고 했으면 실제로 기준에 담고 묻지 않았으면 강제하지 않는다. 단순한 입력 되풀이를 설명으로 받지 않는다. 서로 다른 올바른 풀이의 필수 단계를 AND로 섞지 말고 전체 대체 풀이를 독립 anyOf 문자열로 적는다. 특정 예시만을 정답으로 강제하지 않는다. 역할을 바꾸면 learningRole=definition/procedure/reason/application/naming 중 실제 질문에 맞게 적는다.
C를 바꾸면 cDecision,cAfter,cSlotEquivalents,cReason을 함께 적는다. rewrite의 cAfter는 정답 부분을 {답}으로 표시한 실제 완성 학생 문장이고 1~4슬롯이다. 짧고 유용한 비교·계산 빈칸을 보존한다. 실제 대상 없이 긴 키워드를 복원하거나 부사만 채우게 하지 않는다. 빈칸과 같은 값을 다른 곳에서 공개하지 않는다. 입력의 수가 바뀐 역할에서 다시 답인 유용한 관계(몫 검산, 같은 거리 등)는 무조건 복사로 취급하지 않는다. 순서 없는 두 답은 같은 말을 두 번 써도 통과하는 슬롯별 대안으로 해결하지 말고 순서를 명시하거나 한 빈칸으로 줄인다. cSlotEquivalents는 각 슬롯의 대체 답 배열로서 수·읽기·단위·자리·횟수의 역할을 구별하되 그 문장에서 옳은 서로 다른 답은 허용한다. cDecision=keep은 원본 C 그대로 고정이므로 새 문장을 주지 않는다. exclude는 해당 C의 구체적인 낮은 이점 또는 반복 이유를 cReason으로 기록하고 cAfter=null, cSlotEquivalents=[]로 쓴다. 별도 remove:['cAfter','cSlotEquivalents'] 등으로 이전 필드 제거를 요청할 수 있다.
일반 학습 설명 A/SRS는 C와 별개다. coreAfter를 고칠 때는 실제 수학 오류나 빠진 조건을 고칠 때만이며 원래 표적과 일반 뜻을 보존한다. coreReason을 함께 기록한다. coreAfter도 {답} 1~4개, 보이는 전체 길이 8~160자로 만든다. C를 고쳤다는 이유로 A를 자동 대체하지 않는다.
숫자·수학 기호는 $...$ KaTeX, 곱은 	imes, 나눗셈은 div, 계산 내 빈칸 기호는 square이며 표시용 {답}과 LaTex의 중괄호를 혼동하지 않는다. 모든 조사·괄호·수식이 학생에게 실제로 읽혀야 한다. 쉬운 학년 말로 쓰고 새로운 이름이나 낯선 문자 변수를 만들지 않는다. 그림이 필요한 현재 질문은 실제 위치·수·이름을 텍스트에 제시하여 자립시키거나 그 form만 제외한다. 꼭 필요한 새 그림·조작 사례는 exampleNeeded에 무엇인지 적되 없는 그림을 이미 있는 것처럼 참조하지 않는다.
최종 승인·자동 테스트 pass·실제 독자가 재독했다는 말은 출력하지 않는다. 우리는 이 후보를 나중에 직접 읽고 원본과 확인한다. 다음 자료의 모든 ID를 빠짐없이 처리하라.

[
  {
    "id": "e3-2-4-2-xc15",
    "sourceIndex": 1125,
    "grade": "e3",
    "source": {
      "sourceIndex": 1125,
      "sourceFingerprint": "6ad0d2194c4ccc89bcbf890729935a44b74bfe3fa7f406b556923a2835b1e872",
      "part": "e3plus",
      "id": "e3-2-4-2-xc15",
      "section": "초3::2-4 분수::2-4-2 분수만큼은 얼마인지 알아보기 (1)",
      "term": "단위가 있는 양의 단위분수만큼",
      "kind": "방법",
      "level": "중",
      "definition": "시간 · 길이처럼 단위가 있는 양은 {작은 단위로 바꾼 수를} 분모만큼 똑같이 나누어 단위분수만큼을 구한다.",
      "example": {
        "prompt": "$1$시간의 $\\frac{1}{4}$을 구할 때 $1$시간을 $60$분으로 바꾸는 까닭은?",
        "answer": "$60$은 $4$로 나누어떨어져서"
      },
      "studentC": "시간 · 길이처럼 단위가 있는 양은 □ 분모만큼 똑같이 나누어 단위분수만큼을 구한다.",
      "answers": [
        "작은 단위로 바꾼 수를"
      ]
    },
    "currentProposal": {
      "id": "e3-2-4-2-xc15",
      "proposalFingerprint": "608fb866a86c3635038f446518bbfaee6e9f90cf8d11dbdef72bf2dc253f0488",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$1$시간의 $\\frac{1}{4}$은 몇 분인지 구하는 방법을 설명해 보세요. $1$시간을 분으로 바꾸는 까닭도 써 보세요.",
      "bAnswer": "$1$을 $4$로 똑같이 나누기 어려우므로 $1$시간을 $60$분으로 바꾼다. $60$분을 $4$로 똑같이 나누면 $15$분이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$1$시간을 $60$분으로 바꾼다"
          ]
        },
        {
          "anyOf": [
            "$4$로 똑같이 나눈다"
          ]
        },
        {
          "anyOf": [
            "$15$분"
          ]
        }
      ],
      "bGoal": "단위가 있는 양의 단위분수만큼 구하는 방법 설명",
      "bReason": "원문 예시의 시간 상황으로 단위를 바꾸는 이유와 방법을 묻게 함",
      "cDecision": "rewrite",
      "cReason": "'작은 단위로 바꾼 수를'은 추상적인 긴 구절이라 시간 예시의 단위 바꾸기와 계산 빈칸으로 바꿈",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$1$시간의 $\\frac{1}{4}$을 구할 때는 $1$시간을 {$60$}분으로 바꾼 뒤 $4$로 똑같이 나눈다. 그래서 $1$시간의 $\\frac{1}{4}$은 {$15$}분이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$60$",
        "equivalents": []
      },
      {
        "expected": "$15$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "분으로바꾸는까닭도요청했으므로60분을넷으로똑같이나누어정수분으로쉽게계산한다는이유를기준에 보완한다.",
      "c": "60분변환뒤넷으로나눈15분의실제계산이다."
    }
  },
  {
    "id": "e3-2-4-2-xc20",
    "sourceIndex": 1126,
    "grade": "e3",
    "source": {
      "sourceIndex": 1126,
      "sourceFingerprint": "c6ad3899cda75253ce86a0018fab7e9c374fa9264f73a7c55743b9c57a2d4752",
      "part": "e3plus",
      "id": "e3-2-4-2-xc20",
      "section": "초3::2-4 분수::2-4-2 분수만큼은 얼마인지 알아보기 (1)",
      "term": "전체가 작아도 클 수 있다",
      "kind": "성질",
      "level": "상",
      "definition": "전체가 더 작아도 분모가 작으면 단위분수만큼이 {더 클} 수 있다.",
      "studentC": "전체가 더 작아도 분모가 작으면 단위분수만큼이 □ 수 있다.",
      "answers": [
        "더 클"
      ]
    },
    "currentProposal": {
      "id": "e3-2-4-2-xc20",
      "proposalFingerprint": "6b614519a2d3278df2889720c4498848fcf621f7d8e3d6cd7a10aeac0c8b828a",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$10$의 $\\frac{1}{2}$과 $12$의 $\\frac{1}{6}$을 각각 구해 비교하고, 전체가 더 작은 $10$ 쪽이 더 큰 까닭을 설명해 보세요.",
      "bAnswer": "$10$의 $\\frac{1}{2}$은 $5$, $12$의 $\\frac{1}{6}$은 $2$이다. $10$은 $2$묶음으로만 나누어 한 묶음이 크고, $12$는 $6$묶음으로 나누어 한 묶음이 작기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$5$와 $2$"
          ]
        },
        {
          "anyOf": [
            "적은 묶음으로 나누면 한 묶음이 크다"
          ]
        }
      ],
      "bGoal": "전체와 분모를 함께 보아야 함을 설명",
      "bReason": "'클 수 있다'를 확인할 구체 사례를 주고 이유를 쓰게 함",
      "cDecision": "rewrite",
      "cReason": "원문은 예시 없이 '더 클'이라는 말꼴을 맞춰야 해서 실제 계산과 크다/작다 비교로 바꿈",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$10$의 $\\frac{1}{2}$은 {$5$}이고 $12$의 $\\frac{1}{6}$은 {$2$}이다. 전체는 $10$이 더 작지만 단위분수만큼은 $10$의 $\\frac{1}{2}$이 더 {크다}.",
    "currentCSlotAnswers": [
      {
        "expected": "$5$",
        "equivalents": []
      },
      {
        "expected": "$2$",
        "equivalents": []
      },
      {
        "expected": "크다",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "전체10·12가서로다르므로적은묶음이면큰이라는일반이유만적용하면안된다;실제5>2의계산과전체크기만으로비교못하고분수도함께보는설명으로 고친다.",
      "c": "현재C의5·2와10쪽큰양은실제계산의참인비교다."
    }
  },
  {
    "id": "e3-2-4-2-xc26",
    "sourceIndex": 1128,
    "grade": "e3",
    "source": {
      "sourceIndex": 1128,
      "sourceFingerprint": "a8a22093136eb3c43f38b261c6207446fa198db917811443131fda5906eeb5d4",
      "part": "e3plus",
      "id": "e3-2-4-2-xc26",
      "section": "초3::2-4 분수::2-4-2 분수만큼은 얼마인지 알아보기 (1)",
      "term": "단위분수만큼을 곱셈으로 구하는 잘못",
      "kind": "성질",
      "level": "상",
      "definition": "전체가 $0$보다 클 때 분모가 $1$보다 큰 단위분수로 나타낸 양은 전체보다 {작으므로}, 전체에 분모를 곱하지 않고 전체를 분모로 나누어 구한다.",
      "example": {
        "prompt": "$15$의 $\\frac{1}{5}$을 $15\\times5$로 구하면 안 되는 까닭은?",
        "answer": "전체보다 커져서"
      },
      "studentC": "전체가 $0$보다 클 때 분모가 $1$보다 큰 단위분수로 나타낸 양은 전체보다 □, 전체에 분모를 곱하지 않고 전체를 분모로 나누어 구한다.",
      "answers": [
        "작으므로"
      ]
    },
    "currentProposal": {
      "id": "e3-2-4-2-xc26",
      "proposalFingerprint": "3f10a5f07c86579a72dcdad491b0976eb89d59939e477628fe50b593e1590ec5",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$15$의 $\\frac{1}{5}$을 $15\\times5=75$로 구했습니다. 이 답이 틀렸다는 것을 어떻게 알 수 있는지 설명하고 바르게 구해 보세요.",
      "bAnswer": "$15$의 $\\frac{1}{5}$은 $15$를 $5$묶음으로 나눈 한 묶음이라 $15$보다 작아야 하는데 $75$는 $15$보다 크다. 바르게 구하면 $15\\div5=3$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$\\frac{1}{5}$만큼은 전체보다 작아야 한다"
          ]
        },
        {
          "anyOf": [
            "$75$는 $15$보다 크다"
          ]
        },
        {
          "anyOf": [
            "$15\\div 5=3$"
          ]
        }
      ],
      "bGoal": "곱셈으로 구한 오류를 크기 어림으로 찾아 고치기",
      "bReason": "원문 예시의 오답을 주고 판단 근거와 바른 계산을 요구",
      "cDecision": "rewrite",
      "cReason": "'전체가 0보다 클 때 분모가 1보다 큰 …'이라는 조건 말이 초3에게 무거워 실제 수 상황의 비교·계산 빈칸으로 바꿈",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$15$의 $\\frac{1}{5}$은 $15$보다 {작은} 수이다. 그래서 $15\\times5$가 아니라 $15\\div5$로 구하며, 답은 {$3$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "작은",
        "equivalents": []
      },
      {
        "expected": "$3$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "잘못을아는방법에는전체보다큰75와부분정의의모순뿐아니라다섯묶음중하나가아닌다섯번모았다는이유도유효하므로대안을 인정한다.",
      "c": "양의15의1/5은작고몫3이라는방법·결과가 맞다."
    }
  },
  {
    "id": "e3-2-4-3-xc4",
    "sourceIndex": 1130,
    "grade": "e3",
    "source": {
      "sourceIndex": 1130,
      "sourceFingerprint": "c1701768ca5bba26adc1fdfe4054de254d4cf58919768032a4cd8c6199afd1a1",
      "part": "e3plus",
      "id": "e3-2-4-3-xc4",
      "section": "초3::2-4 분수::2-4-3 분수만큼은 얼마인지 알아보기 (2)",
      "term": "단위분수만큼 먼저",
      "kind": "방법",
      "level": "하",
      "definition": "{분수만큼을 구할 때} 먼저 단위분수만큼을 구한다.",
      "studentC": "□ 먼저 단위분수만큼을 구한다.",
      "answers": [
        "분수만큼을 구할 때"
      ]
    },
    "currentProposal": {
      "id": "e3-2-4-3-xc4",
      "proposalFingerprint": "9619a6721a4cb08d18e72b89f215719b8e121f363f94e80a12d649492c7042be",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$12$의 $\\frac{3}{4}$이 얼마인지 구하는 순서를 설명하고 답을 써 보세요.",
      "bAnswer": "먼저 $12$의 $\\frac{1}{4}$을 구하면 $12\\div4=3$이다. $\\frac{3}{4}$은 $\\frac{1}{4}$이 $3$개이므로 $3\\times3=9$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "먼저 $\\frac{1}{4}$만큼($3$)을 구한다"
          ]
        },
        {
          "anyOf": [
            "$3$묶음을 모은다"
          ]
        },
        {
          "anyOf": [
            "$9$"
          ]
        }
      ],
      "bGoal": "분수만큼을 구할 때 단위분수만큼부터 구하는 순서 설명",
      "bReason": "구할 대상을 정해 '무엇을 먼저'가 분명한 순서 질문으로 만듦",
      "cDecision": "rewrite",
      "cReason": "원문은 조건절 전체가 문장 맨 앞 빈칸에 가려져 무엇을 쓸지 알 수 없어 실제 계산 순서를 따라가는 빈칸으로 바꿈",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$12$의 $\\frac{3}{4}$을 구할 때는 먼저 $12$의 $\\frac{1}{4}$인 {$3$}을 구하고, 그것을 $3$번 모아 {$9$}를 구한다.",
    "currentCSlotAnswers": [
      {
        "expected": "$3$",
        "equivalents": []
      },
      {
        "expected": "$9$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "일반순서를묻는질문에곱셈먼저12×3뒤4로나누는유효방법도있다;한묶음부터구하는방법이라는응답범위를명시하거나다른유효순서를 인정한다.",
      "c": "C는단위분수먼저라는차례를명시하여3·9를 구한다."
    }
  },
  {
    "id": "e3-2-4-3-xc12",
    "sourceIndex": 1133,
    "grade": "e3",
    "source": {
      "sourceIndex": 1133,
      "sourceFingerprint": "636caaa7923feb48047b519c0726276b7482fc354275aae2acd77641676fc57e",
      "part": "e3plus",
      "id": "e3-2-4-3-xc12",
      "section": "초3::2-4 분수::2-4-3 분수만큼은 얼마인지 알아보기 (2)",
      "term": "분수만큼으로 전체 구하기",
      "kind": "방법",
      "level": "중",
      "definition": "어떤 수의 분수만큼을 알면 {분자로 나누어} 단위분수만큼을 구한 뒤 {분모만큼 모아} 전체를 구한다.",
      "example": {
        "prompt": "어떤 수의 $\\frac{3}{4}$이 $12$일 때 $\\frac{1}{4}$이 $4$인 까닭은?",
        "answer": "$12$가 세 묶음이라서"
      },
      "studentC": "어떤 수의 분수만큼을 알면 □ 단위분수만큼을 구한 뒤 □ 전체를 구한다.",
      "answers": [
        "분자로 나누어",
        "분모만큼 모아"
      ]
    },
    "currentProposal": {
      "id": "e3-2-4-3-xc12",
      "proposalFingerprint": "6eb84de25e455cb78c500e2bd70e102614bb64c5766b2a25cc4706b255cd9524",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "어떤 수의 $\\frac{3}{4}$이 $12$입니다. 어떤 수를 구하는 방법을 순서대로 설명하고 답을 써 보세요.",
      "bAnswer": "$\\frac{3}{4}$은 $\\frac{1}{4}$이 $3$묶음이므로 $12\\div3=4$가 어떤 수의 $\\frac{1}{4}$이다. 전체는 $\\frac{1}{4}$이 $4$묶음이므로 $4\\times4=16$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$12$를 $3$으로 나누어 $\\frac{1}{4}$만큼($4$)을 구한다"
          ]
        },
        {
          "anyOf": [
            "$4$묶음을 모은다"
          ]
        },
        {
          "anyOf": [
            "$16$"
          ]
        }
      ],
      "bGoal": "분수만큼에서 전체를 거꾸로 구하는 방법 설명",
      "bReason": "원문 예시의 수를 이어 써서 두 단계를 모두 말하게 함",
      "cDecision": "rewrite",
      "cReason": "긴 구절 빈칸 두 개가 방법 문장 전체를 복원하게 하여 실제 수의 두 단계 계산 빈칸으로 바꿈",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "어떤 수의 $\\frac{3}{4}$이 $12$이면, 어떤 수의 $\\frac{1}{4}$은 $12\\div3$으로 구한 {$4$}이고, 어떤 수는 $4$를 $4$번 모은 {$16$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$4$",
        "equivalents": []
      },
      {
        "expected": "$16$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "12를셋으로나눠한묶음4뒤네묶음16의복원순서는 맞다.",
      "c": "첫빈칸4가뒤의4를네번에드러나므로이결과를네번모은다는참조로바꾸어답복사를 없앤다."
    }
  },
  {
    "id": "e3-2-4-3-xc15",
    "sourceIndex": 1135,
    "grade": "e3",
    "source": {
      "sourceIndex": 1135,
      "sourceFingerprint": "e95221c7893446f26d64e5ff867a6ea38580e77bf18c002ac319658aed8cf959",
      "part": "e3plus",
      "id": "e3-2-4-3-xc15",
      "section": "초3::2-4 분수::2-4-3 분수만큼은 얼마인지 알아보기 (2)",
      "term": "단위가 있는 양의 분수만큼",
      "kind": "방법",
      "level": "중",
      "definition": "단위가 있는 양의 분수만큼은 {작은 단위로 바꾼 수로} 단위분수만큼을 구한 뒤 분자만큼 모은다.",
      "example": {
        "prompt": "$1\\,\\mathrm{m}$의 $\\frac{3}{4}$이 $75\\,\\mathrm{cm}$인 까닭은?",
        "answer": "$25\\,\\mathrm{cm}$씩 세 묶음이라서"
      },
      "studentC": "단위가 있는 양의 분수만큼은 □ 단위분수만큼을 구한 뒤 분자만큼 모은다.",
      "answers": [
        "작은 단위로 바꾼 수로"
      ]
    },
    "currentProposal": {
      "id": "e3-2-4-3-xc15",
      "proposalFingerprint": "540f94b75dedddd3dd202f031504b1a2ea6d049e3b093d606c8b3580d26189f5",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$1\\,\\mathrm{m}$의 $\\frac{3}{4}$은 몇 $\\mathrm{cm}$인지 구하는 방법을 순서대로 설명해 보세요.",
      "bAnswer": "$1\\,\\mathrm{m}$를 $100\\,\\mathrm{cm}$로 바꾼다. $100\\,\\mathrm{cm}$의 $\\frac{1}{4}$은 $25\\,\\mathrm{cm}$이고, $\\frac{3}{4}$은 $25\\,\\mathrm{cm}$가 $3$묶음이므로 $75\\,\\mathrm{cm}$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$100$cm로 바꾼다"
          ]
        },
        {
          "anyOf": [
            "$\\frac{1}{4}$만큼은 $25$cm"
          ]
        },
        {
          "anyOf": [
            "$75$cm"
          ]
        }
      ],
      "bGoal": "단위가 있는 양의 분수만큼 구하는 방법 설명",
      "bReason": "원문 예시의 길이 상황으로 단위 바꾸기부터 순서를 쓰게 함",
      "cDecision": "rewrite",
      "cReason": "'작은 단위로 바꾼 수로'는 추상 구절이라 길이 예시의 단위 바꾸기와 계산 빈칸으로 바꿈",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$1\\,\\mathrm{m}$의 $\\frac{3}{4}$을 구할 때는 $1\\,\\mathrm{m}$를 {$100$}$\\,\\mathrm{cm}$로 바꾼다. $100\\,\\mathrm{cm}$의 $\\frac{1}{4}$은 $25\\,\\mathrm{cm}$이므로 $\\frac{3}{4}$은 {$75$}$\\,\\mathrm{cm}$이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$100$",
        "equivalents": []
      },
      {
        "expected": "$75$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "1m→100cm→한묶음25→세묶음75의정확한순서다.",
      "c": "첫100이바로뒤100cm에드러나므로이길이의1/4처럼참조를바꿔변환과정답복사를 줄인다."
    }
  },
  {
    "id": "e3-2-4-4-xc4",
    "sourceIndex": 1141,
    "grade": "e3",
    "source": {
      "sourceIndex": 1141,
      "sourceFingerprint": "8eab1e836338b8fb2d75ff2c3a074856b1766593b173f718a900a59612be3ffe",
      "part": "e3plus",
      "id": "e3-2-4-4-xc4",
      "section": "초3::2-4 분수::2-4-4 진분수와 가분수 알아보기",
      "term": "자연수를 가분수로 나타내기",
      "kind": "방법",
      "level": "하",
      "definition": "자연수는 {분모와 분자가 같은 분수}를 그 수만큼 모은 가분수로 나타낼 수 있다.",
      "example": {
        "prompt": "$3$을 분모가 $3$인 분수로 $\\frac{9}{3}$이라 쓰는 까닭은?",
        "answer": "$\\frac{3}{3}$이 세 번이라서"
      },
      "studentC": "자연수는 □를 그 수만큼 모은 가분수로 나타낼 수 있다.",
      "answers": [
        "분모와 분자가 같은 분수"
      ]
    },
    "currentProposal": {
      "id": "e3-2-4-4-xc4",
      "proposalFingerprint": "361d98269ed0a0d6b7643888bb028cf5dcfdf7e203e9d55ae7ab15950a27f708",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "자연수 $3$을 분모가 $3$인 가분수로 나타내고, 그렇게 되는 까닭을 설명해 보세요.",
      "bAnswer": "$\\frac{9}{3}$가다. $1$이 $\\frac{3}{3}$이고 $3$은 $1$이 $3$개이므로, $\\frac{3}{3}$을 $3$번 모으면 $\\frac{1}{3}$이 $9$개인 $\\frac{9}{3}$가 된다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$\\frac{9}{3}$"
          ]
        },
        {
          "anyOf": [
            "$1$은 $\\frac{3}{3}$"
          ]
        },
        {
          "anyOf": [
            "$\\frac{3}{3}$을 $3$번 모은다"
          ]
        }
      ],
      "bGoal": "자연수를 가분수로 나타내는 방법과 까닭 설명",
      "bReason": "원문 예시의 수로 결과와 이유를 함께 쓰게 함",
      "cDecision": "rewrite",
      "cReason": "'분모와 분자가 같은 분수'는 긴 구절 복원이라 실제 분자를 구하는 계산 빈칸으로 바꿈",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$1$은 $\\frac{3}{3}$과 같다. $3$은 $\\frac{3}{3}$을 $3$번 모은 수이므로 분모가 $3$인 가분수로 나타내면 분자는 {$9$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$9$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "정답의9/3가다는문법오류를9/3이다로고친다;계산·단위분수세묶음설명은 맞다.",
      "c": "3/3세묶음의분자9를 구한다."
    }
  },
  {
    "id": "e3-2-4-4-xc11",
    "sourceIndex": 1147,
    "grade": "e3",
    "source": {
      "sourceIndex": 1147,
      "sourceFingerprint": "7b0a6fabbed226e771749daaa349d21283c0f1e0bf76f5a11332e213a2a293b7",
      "part": "e3plus",
      "id": "e3-2-4-4-xc11",
      "section": "초3::2-4 분수::2-4-4 진분수와 가분수 알아보기",
      "term": "분모가 정해진 진분수",
      "kind": "성질",
      "level": "중",
      "definition": "분모가 정해진 진분수는 분자가 {$1$부터} {분모보다 $1$ 작은 수까지}인 분수이다.",
      "example": {
        "prompt": "분모가 $7$인 진분수가 $6$개인 까닭은?",
        "answer": "분자가 $1$부터 $6$까지라서"
      },
      "studentC": "분모가 정해진 진분수는 분자가 □ □인 분수이다.",
      "answers": [
        "$1$부터",
        "분모보다 $1$ 작은 수까지"
      ]
    },
    "currentProposal": {
      "id": "e3-2-4-4-xc11",
      "proposalFingerprint": "34984590d5306d73c5fa36d9ebd3038f9182a9c0d7e50e7b1021268b440e60b1",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "분모가 $7$인 진분수를 모두 쓰고, 분자가 $7$이 될 수 없는 까닭을 설명해 보세요.",
      "bAnswer": "$\\frac{1}{7}$, $\\frac{2}{7}$, $\\frac{3}{7}$, $\\frac{4}{7}$, $\\frac{5}{7}$, $\\frac{6}{7}$이다. 진분수는 분자가 분모보다 작아야 하는데 $\\frac{7}{7}$은 분자와 분모가 같아 가분수이기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "분자가 $1$부터 $6$까지인 분수 $6$개"
          ]
        },
        {
          "anyOf": [
            "$\\frac{7}{7}$은 가분수"
          ]
        }
      ],
      "bGoal": "분모가 정해진 진분수의 범위와 까닭",
      "bReason": "원문 예시(분모 7)로 범위와 끝 수의 이유를 쓰게 함",
      "cDecision": "rewrite",
      "cReason": "'분모보다 1 작은 수까지' 같은 구절 빈칸 두 개가 문장 복원이어서 분모를 정한 수 빈칸으로 바꿈",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "분모가 $7$인 진분수의 분자는 $1$부터 {$6$}까지이므로, 분모가 $7$인 진분수는 모두 {$6$}개이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$6$",
        "equivalents": []
      },
      {
        "expected": "$6$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "분모7의모든진분수라고하면서0/7은빼려면분자가1이거나더큰조건을B에명시해야 한다.",
      "c": "C도0을포함하지않는분자범위를명시하거나양의분자로한정하여범위6·개수6을 정확히 한다."
    }
  },
  {
    "id": "e3-2-4-5-xc16",
    "sourceIndex": 1162,
    "grade": "e3",
    "source": {
      "sourceIndex": 1162,
      "sourceFingerprint": "aaa5944f3ca6aee08c49e06c7b7276f584316dd054b42633e7228c9cc7f39ef0",
      "part": "e3plus",
      "id": "e3-2-4-5-xc16",
      "section": "초3::2-4 분수::2-4-5 대분수 알아보기",
      "term": "자연수가 되는 가분수",
      "kind": "성질",
      "level": "중",
      "definition": "가분수의 분자를 분모로 나눈 {나머지가 없으면} 대분수가 아닌 자연수가 된다.",
      "studentC": "가분수의 분자를 분모로 나눈 □ 대분수가 아닌 자연수가 된다.",
      "answers": [
        "나머지가 없으면"
      ]
    },
    "currentProposal": {
      "id": "e3-2-4-5-xc16",
      "proposalFingerprint": "9384512d623a3f568067bb134f3ed90a0834aec602be114a3dee3a90deff1328",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$\\frac{8}{4}$과 $\\frac{9}{4}$ 중 대분수가 아니라 자연수로 나타내어지는 것을 고르고 그 까닭을 설명해 보세요.",
      "bAnswer": "$\\frac{8}{4}$이다. $8\\div4=2$로 나머지가 없어 $\\frac{4}{4}$가 꼭 $2$번이므로 $2$이다. $\\frac{9}{4}$는 $\\frac{1}{4}$이 남아 $2\\frac{1}{4}$이 된다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$\\frac{8}{4}$"
          ]
        },
        {
          "anyOf": [
            "분자를 분모로 나누면 나머지가 없다"
          ]
        },
        {
          "anyOf": [
            "$2$"
          ]
        }
      ],
      "bGoal": "가분수가 자연수가 되는 조건 설명",
      "bReason": "자연수가 되는 것과 아닌 것을 나란히 주어 조건을 말하게 함",
      "cDecision": "rewrite",
      "cReason": "'나머지가 없으면'은 조건절 전체를 가린 빈칸이라 실제 나눗셈의 나머지와 결과를 쓰게 함",
      "cSlotEquivalents": [],
      "answerNotes": "첫 빈칸은 $0$ 또는 '없다'는 뜻의 답 인정."
    },
    "currentCMarkedSentence": "$\\frac{8}{4}$은 분자 $8$을 분모 $4$로 나누면 몫이 $2$이고 나머지가 {$0$}이다. 그래서 대분수가 아니라 자연수 {$2$}로 나타낸다.",
    "currentCSlotAnswers": [
      {
        "expected": "$0$",
        "equivalents": []
      },
      {
        "expected": "$2$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "고를8/4와나머지없다는까닭외에자연수값2를질문은요청하지않으므로별도필수결과2는기준에서 빼거나질문에명시한다.",
      "c": "몫2·나머지0으로자연수2가되는실제변환이다."
    }
  },
  {
    "id": "e3-2-4-5-xc20",
    "sourceIndex": 1164,
    "grade": "e3",
    "source": {
      "sourceIndex": 1164,
      "sourceFingerprint": "317f484f83d987f7936581f205525f0b69e3a1cad16021837299d1815ad414f0",
      "part": "e3plus",
      "id": "e3-2-4-5-xc20",
      "section": "초3::2-4 분수::2-4-5 대분수 알아보기",
      "term": "숫자를 붙여 쓰는 잘못",
      "kind": "성질",
      "level": "상",
      "definition": "대분수를 가분수로 바꿀 때 자연수와 분자를 나란히 붙여 쓰면 안 된다. 자연수에 {분모}를 곱하고 분자를 더해 새 분자를 구한다.",
      "example": {
        "prompt": "$2\\frac{1}{4}$을 $\\frac{21}{4}$로 쓰면 안 되는 까닭은?",
        "answer": "$\\frac{21}{4}$은 $5$보다 커서"
      },
      "studentC": "대분수를 가분수로 바꿀 때 자연수와 분자를 나란히 붙여 쓰면 안 된다. 자연수에 □를 곱하고 분자를 더해 새 분자를 구한다.",
      "answers": [
        "분모"
      ]
    },
    "currentProposal": {
      "id": "e3-2-4-5-xc20",
      "proposalFingerprint": "85ba6ed794fece1ec6ecb6b5fd3072d6e6e18160d733101a8ba5f392c0f3c97b",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$2\\frac{1}{4}$을 $\\frac{21}{4}$로 쓰면 안 되는 까닭을 설명하고 바르게 고쳐 보세요.",
      "bAnswer": "자연수 $2$와 분자 $1$을 그냥 붙여 쓴 것이라 틀렸다. $2$는 $\\frac{8}{4}$이므로 $\\frac{1}{4}$과 합하면 $\\frac{9}{4}$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "숫자를 붙여 쓰면 안 된다"
          ]
        },
        {
          "anyOf": [
            "$2$는 $\\frac{8}{4}$"
          ]
        },
        {
          "anyOf": [
            "$\\frac{9}{4}$"
          ]
        }
      ],
      "bGoal": "자연수와 분자를 붙여 쓰는 오류 찾아 고치기",
      "bReason": "원문 예시의 오답을 주고 잘못과 바른 답을 요구",
      "cDecision": "keep",
      "cReason": "방법 문장 속 익숙한 용어 '분모' 하나를 묻고 앞뒤 조건이 다 보임",
      "cSlotEquivalents": [],
      "answerNotes": "B에서 '$\\frac{21}{4}$은 $5$보다 큰 수라서 $2\\frac{1}{4}$과 다르다'는 설명도 인정."
    },
    "currentCMarkedSentence": "대분수를 가분수로 바꿀 때 자연수와 분자를 나란히 붙여 쓰면 안 된다. 자연수에 {분모}를 곱하고 분자를 더해 새 분자를 구한다.",
    "currentCSlotAnswers": [
      {
        "expected": "분모",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "붙이면안된다는이미준결론을반복하는필수기준대신2=8/4의이유와바른9/4만으로충분한수정을 평가한다.",
      "c": "자연수에곱할분모라는대분수변환방법이다."
    }
  },
  {
    "id": "e3-2-4-6-xc6",
    "sourceIndex": 1170,
    "grade": "e3",
    "source": {
      "sourceIndex": 1170,
      "sourceFingerprint": "0ed4b0fe0e505daac8a50b2636a4bf52d58f2fdc8457138ddfade5944de24ba0",
      "part": "e3plus",
      "id": "e3-2-4-6-xc6",
      "section": "초3::2-4 분수::2-4-6 분모가 같은 분수의 크기 비교",
      "term": "크기가 같은 가분수와 대분수",
      "kind": "성질",
      "level": "하",
      "definition": "가분수와 대분수는 꼴이 달라도 {같은 수}를 나타낼 수 있다.",
      "studentC": "가분수와 대분수는 꼴이 달라도 □를 나타낼 수 있다.",
      "answers": [
        "같은 수"
      ]
    },
    "currentProposal": {
      "id": "e3-2-4-6-xc6",
      "proposalFingerprint": "60609d9705ce52badb721e9055bc7a7ceaff18420368755a90e088ead4cc8449",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$\\frac{7}{4}$과 $1\\frac{3}{4}$의 크기가 같은 까닭을 설명해 보세요.",
      "bAnswer": "$\\frac{7}{4}$에서 $\\frac{4}{4}$는 $1$이고 $\\frac{3}{4}$이 남으므로 $1\\frac{3}{4}$과 같다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$\\frac{4}{4}$는 $1$"
          ]
        },
        {
          "anyOf": [
            "$\\frac{3}{4}$이 남는다(또는 $1$과 $\\frac{3}{4}$을 가분수로 바꾸면 $\\frac{7}{4}$)"
          ]
        }
      ],
      "bGoal": "가분수와 대분수가 같은 수를 나타낼 수 있음을 설명",
      "bReason": "구체적인 한 쌍을 주어 같음을 이유로 보이게 함",
      "cDecision": "rewrite",
      "cReason": "'꼴'은 낯선 말이고 '같은 수'가 구절 빈칸이라 예시를 넣고 같다/다르다 한 낱말로 줄임",
      "cSlotEquivalents": [],
      "answerNotes": "B는 대분수를 가분수로 바꾸어 보이는 풀이도 정답."
    },
    "currentCMarkedSentence": "$\\frac{7}{4}$과 $1\\frac{3}{4}$은 모양은 달라도 크기가 서로 {같은} 수이다.",
    "currentCSlotAnswers": [
      {
        "expected": "같은",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "가분수분해와대분수를다시가분수로바꾸는두완결된이유를anyOf대안으로나눠어느방향의맞는설명도 허용한다.",
      "c": "표기는달라도같은7/4값이라는중요한관계다."
    }
  },
  {
    "id": "e3-2-4-6-xc9",
    "sourceIndex": 1173,
    "grade": "e3",
    "source": {
      "sourceIndex": 1173,
      "sourceFingerprint": "387bc443de0c79c1c8cbb4fb09a9c6ac3d00f73785d9edcf77606d8014b98729",
      "part": "e3plus",
      "id": "e3-2-4-6-xc9",
      "section": "초3::2-4 분수::2-4-6 분모가 같은 분수의 크기 비교",
      "term": "자연수와 분수 견주기",
      "kind": "방법",
      "level": "하",
      "definition": "자연수와 분수를 견줄 때는 자연수를 {분모가 같은 분수로 바꾸어} 견준다.",
      "example": {
        "prompt": "$2$와 $\\frac{9}{4}$를 견주려고 $2$를 $\\frac{8}{4}$로 나타내는 까닭은?",
        "answer": "같은 조각으로 세려고"
      },
      "studentC": "자연수와 분수를 견줄 때는 자연수를 □ 견준다.",
      "answers": [
        "분모가 같은 분수로 바꾸어"
      ]
    },
    "currentProposal": {
      "id": "e3-2-4-6-xc9",
      "proposalFingerprint": "8e9fa8ccb175002c3a49b5ef62852dfdd9ebd6a76fafdf14393130386db48f53",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$2$와 $\\frac{9}{4}$ 중 어느 수가 더 큰지 비교하는 방법을 설명하고 결과를 써 보세요.",
      "bAnswer": "$2$를 분모가 $4$인 분수 $\\frac{8}{4}$로 바꾸어 분자끼리 비교한다. $8$이 $9$보다 작으므로 $\\frac{9}{4}$가 더 크다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$2$를 $\\frac{8}{4}$로 바꾼다"
          ]
        },
        {
          "anyOf": [
            "$\\frac{9}{4}$가 더 크다"
          ]
        }
      ],
      "bGoal": "자연수와 분수의 크기 비교 방법 설명",
      "bReason": "원문 예시의 수로 방법과 결과를 쓰게 함",
      "cDecision": "rewrite",
      "cReason": "'분모가 같은 분수로 바꾸어'는 긴 방법 구절이라 실제로 바꾼 분자와 크기 비교를 쓰게 함",
      "cSlotEquivalents": [],
      "answerNotes": "B는 $\\frac{9}{4}$를 $2\\frac{1}{4}$로 바꾸어 비교해도 정답."
    },
    "currentCMarkedSentence": "$2$와 $\\frac{9}{4}$를 비교하려고 $2$를 분모가 $4$인 분수로 바꾸면 분자는 {$8$}이다. 분자 $8$이 $9$보다 작으므로 $2$는 $\\frac{9}{4}$보다 {작다}.",
    "currentCSlotAnswers": [
      {
        "expected": "$8$",
        "equivalents": []
      },
      {
        "expected": "작다",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "일반비교방법에는9/4을대분수로고치는방법도옳으므로2를분모4의분수로바꾸라는범위를질문에명시하거나다른방법을 인정한다.",
      "c": "첫8이뒤의분자8에드러나므로구한분자라고참조를바꿔값복사를 없앤다."
    }
  },
  {
    "id": "e3-2-4-6-xc11",
    "sourceIndex": 1175,
    "grade": "e3",
    "source": {
      "sourceIndex": 1175,
      "sourceFingerprint": "6cd2273a53757c401b39ae13436db4d5e47f11bd2d795dda735041508410b965",
      "part": "e3plus",
      "id": "e3-2-4-6-xc11",
      "section": "초3::2-4 분수::2-4-6 분모가 같은 분수의 크기 비교",
      "term": "대분수를 가분수로 바꾸어 견주기",
      "kind": "방법",
      "level": "중",
      "definition": "분모가 같은 가분수와 대분수를 견줄 때 대분수를 {가분수로 바꾸면} 분자끼리 견줄 수 있다.",
      "example": {
        "prompt": "$2\\frac{3}{4}$과 $\\frac{10}{4}$을 견주려고 대분수를 가분수로 바꾸는 까닭은?",
        "answer": "같은 조각의 수로 견주려고"
      },
      "studentC": "분모가 같은 가분수와 대분수를 견줄 때 대분수를 □ 분자끼리 견줄 수 있다.",
      "answers": [
        "가분수로 바꾸면"
      ]
    },
    "currentProposal": {
      "id": "e3-2-4-6-xc11",
      "proposalFingerprint": "875d5a6c55bb216c0fd83a3509447018185fad7717ca889fa328d5e662de62cc",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$2\\frac{3}{4}$과 $\\frac{10}{4}$의 크기를, 대분수를 가분수로 바꾸는 방법으로 비교하고 그 과정을 설명해 보세요.",
      "bAnswer": "$2\\frac{3}{4}$은 $\\frac{11}{4}$이다. 분모가 같으므로 분자를 비교하면 $11$이 $10$보다 커서 $2\\frac{3}{4}$이 더 크다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$2$와 $\\frac{3}{4}$은 $\\frac{11}{4}$"
          ]
        },
        {
          "anyOf": [
            "분자끼리 비교"
          ]
        },
        {
          "anyOf": [
            "$2$와 $\\frac{3}{4}$이 더 크다"
          ]
        }
      ],
      "bGoal": "대분수를 가분수로 바꾸어 비교하는 방법 설명",
      "bReason": "원문 예시의 수와 쓸 방법을 정해 과정 전체를 말하게 함",
      "cDecision": "rewrite",
      "cReason": "'가분수로 바꾸면'이라는 조건절 빈칸 대신 바꾼 분자와 비교 결과를 쓰게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$2\\frac{3}{4}$과 $\\frac{10}{4}$을 비교하려고 $2\\frac{3}{4}$을 가분수로 바꾸면 분자는 {$11$}이다. $11$이 $10$보다 크므로 $2\\frac{3}{4}$이 $\\frac{10}{4}$보다 {크다}.",
    "currentCSlotAnswers": [
      {
        "expected": "$11$",
        "equivalents": []
      },
      {
        "expected": "크다",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "대분수를가분수로바꾸는방법·11/4·큰관계의B는명확하다.",
      "c": "첫11이바로뒤11이10보다에드러나므로새분자가10보다크다는참조로바꿔답복사를 없앤다."
    }
  },
  {
    "id": "e3-2-4-6-xc12",
    "sourceIndex": 1176,
    "grade": "e3",
    "source": {
      "sourceIndex": 1176,
      "sourceFingerprint": "ede7bb252be1f998db0980df06731e5529c097e1312ead2d97c6f24c7d42df47",
      "part": "e3plus",
      "id": "e3-2-4-6-xc12",
      "section": "초3::2-4 분수::2-4-6 분모가 같은 분수의 크기 비교",
      "term": "자연수 사이로 먼저 가르기",
      "kind": "방법",
      "level": "중",
      "definition": "여러 분수를 늘어놓을 때 각 수가 {자연수와 같은지}, $0$과 $1$, $1$과 $2$처럼 {어느 두 수 사이}에 있는지 먼저 가르면 쉽게 견줄 수 있다.",
      "example": {
        "prompt": "$\\frac{9}{5}$가 $2\\frac{1}{5}$보다 작은 까닭은?",
        "answer": "$2$보다 작은 수와 큰 수라서"
      },
      "studentC": "여러 분수를 늘어놓을 때 각 수가 □, $0$과 $1$, $1$과 $2$처럼 □에 있는지 먼저 가르면 쉽게 견줄 수 있다.",
      "answers": [
        "자연수와 같은지",
        "어느 두 수 사이"
      ]
    },
    "currentProposal": {
      "id": "e3-2-4-6-xc12",
      "proposalFingerprint": "29e76f9e856f61d19c907f945d98d0b51fea1504c2d3822128d95cf6ed1accbe",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$\\frac{4}{5}$, $\\frac{9}{5}$, $2\\frac{1}{5}$을 작은 수부터 차례로 쓰고, 각 수가 어느 두 자연수 사이에 있는지를 이용해 까닭을 설명해 보세요. ($0$도 써도 됩니다.)",
      "bAnswer": "$\\frac{4}{5}$, $\\frac{9}{5}$, $2\\frac{1}{5}$ 순서이다. $\\frac{4}{5}$는 $0$과 $1$ 사이, $\\frac{9}{5}$는 $1$과 $2$ 사이, $2\\frac{1}{5}$은 $2$와 $3$ 사이에 있기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "작은 순서 $\\frac{4}{5}$, $\\frac{9}{5}$, $2$와 $\\frac{1}{5}$"
          ]
        },
        {
          "anyOf": [
            "각 수가 있는 두 수 사이"
          ]
        }
      ],
      "bGoal": "어느 수 사이인지로 먼저 갈라 크기 비교",
      "bReason": "분수 세 개를 주어 가르는 방법을 직접 쓰게 함",
      "cDecision": "rewrite",
      "cReason": "구절 빈칸 두 개가 긴 문장 속에 흩어져 있어 실제 두 분수의 자리와 비교 결과를 쓰게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$\\frac{9}{5}$는 $1$과 $2$ 사이의 수이고 $2\\frac{1}{5}$은 $2$와 {$3$} 사이의 수이다. 그래서 자세히 계산하지 않아도 $\\frac{9}{5}$가 $2\\frac{1}{5}$보다 {작다}는 것을 알 수 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "$3$",
        "equivalents": []
      },
      {
        "expected": "작다",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "각수가어느두수사이인지요청했으므로0~1·1~2·2~3의실제세경계도기준에 명시한다.",
      "c": "두번째대분수의위경계3과작다는문법·비교가 맞다."
    }
  },
  {
    "id": "e3-2-5-1-xc1",
    "sourceIndex": 1182,
    "grade": "e3",
    "source": {
      "sourceIndex": 1182,
      "sourceFingerprint": "312506110a1de2c4cb2a9e3ae8ac8c3c9e081fd94af261b2ce4887356dc15e57",
      "part": "e3plus",
      "id": "e3-2-5-1-xc1",
      "section": "초3::2-5 들이와 무게::2-5-1 들이 비교하기",
      "term": "들이를 견주는 말",
      "kind": "정의",
      "level": "하",
      "definition": "두 그릇 가운데 물을 더 많이 담을 수 있는 쪽을 들이가 더 {크다}고 말한다.",
      "studentC": "두 그릇 가운데 물을 더 많이 담을 수 있는 쪽을 들이가 더 □고 말한다.",
      "answers": [
        "크다"
      ]
    },
    "currentProposal": {
      "id": "e3-2-5-1-xc1",
      "proposalFingerprint": "c8d90b5389c2d6c6257bd3909b9f373b7f9377b2b4bc1c5a8d28cfa29f0f79ac",
      "learningRole": "definition",
      "bDecision": "rewrite",
      "bPrompt": "그릇의 '들이'가 무엇인지 설명하고, 두 그릇 중 어느 쪽 들이가 더 큰지는 무엇을 보고 말하는지 써 보세요.",
      "bAnswer": "들이는 그릇에 가득 담을 수 있는 양이다. 물을 더 많이 담을 수 있는 그릇의 들이가 더 크다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "들이는 그릇에 담을 수 있는 양"
          ]
        },
        {
          "anyOf": [
            "더 많이 담을 수 있는 쪽이 들이가 더 크다"
          ]
        }
      ],
      "bGoal": "들이의 뜻과 비교하는 말 설명",
      "bReason": "낱말 맞히기 대신 들이의 뜻과 비교 기준을 스스로 말하게 함",
      "cDecision": "keep",
      "cReason": "짧은 비교 낱말 빈칸이고 문장만으로 답이 정해짐",
      "cSlotEquivalents": [],
      "answerNotes": "'크다'와 교과서 표현인 '많다' 모두 인정. '작다', '적다'는 오답."
    },
    "currentCMarkedSentence": "두 그릇 가운데 물을 더 많이 담을 수 있는 쪽을 들이가 더 {크다}고 말한다.",
    "currentCSlotAnswers": [
      {
        "expected": "크다",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "들이뜻의첫기준에도가득담을수있는양을명시하여지금담긴물양과최대담길양을 구별한다.",
      "c": "더많이담을수있는들이가크다는관계다."
    }
  },
  {
    "id": "e3-2-5-1-xc4",
    "sourceIndex": 1185,
    "grade": "e3",
    "source": {
      "sourceIndex": 1185,
      "sourceFingerprint": "387382cd44ab53c501fa0ca01f1c4923d7241924c798faff50d0a3b6a312c11b",
      "part": "e3plus",
      "id": "e3-2-5-1-xc4",
      "section": "초3::2-5 들이와 무게::2-5-1 들이 비교하기",
      "term": "똑같은 통에 부어 높이 보기",
      "kind": "방법",
      "level": "하",
      "definition": "두 그릇에 가득 담은 물을 똑같은 빈 통 두 개에 하나씩 쏟았을 때 {물이 더 높이 올라온} 쪽의 들이가 크다.",
      "studentC": "두 그릇에 가득 담은 물을 똑같은 빈 통 두 개에 하나씩 쏟았을 때 □ 쪽의 들이가 크다.",
      "answers": [
        "물이 더 높이 올라온"
      ]
    },
    "currentProposal": {
      "id": "e3-2-5-1-xc4",
      "proposalFingerprint": "132598bf6897be040d2434de7fd1cef9b2c3957cdb255784f130424cb6005cbe",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "모양이 다른 두 그릇 가와 나의 들이를, 똑같은 빈 통 $2$개를 써서 비교하는 방법을 설명해 보세요.",
      "bAnswer": "가와 나에 물을 가득 채워 똑같은 통에 각각 옮겨 붓고 물의 높이를 비교한다. 물이 더 높이 올라온 쪽의 들이가 더 크다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "가득 채운 물을 똑같은 통에 각각 옮긴다"
          ]
        },
        {
          "anyOf": [
            "물 높이가 높은 쪽이 들이가 크다"
          ]
        }
      ],
      "bGoal": "똑같은 통에 옮겨 물 높이로 비교하는 방법 설명",
      "bReason": "도구(똑같은 통 2개)를 정해 주어 방법 전체를 스스로 쓰게 함",
      "cDecision": "rewrite",
      "cReason": "'물이 더 높이 올라온'이라는 구절 대신 높다/낮다 한 낱말 비교로 줄임",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "두 그릇에 가득 담은 물을 모양과 크기가 똑같은 빈 통 두 개에 각각 옮겨 담았다. 물의 높이가 더 {높은} 쪽 그릇의 들이가 더 크다.",
    "currentCSlotAnswers": [
      {
        "expected": "높은",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "비교용같은통에물이넘치면높이로원들이를비교못하므로물모두담길만큼큰통을쓰는조건을방법에 보완한다.",
      "c": "C도물을남김없이모두받고넘치지않는같은통의조건을 명시한다."
    }
  },
  {
    "id": "e3-2-5-1-xc5",
    "sourceIndex": 1186,
    "grade": "e3",
    "source": {
      "sourceIndex": 1186,
      "sourceFingerprint": "50f6cdef79769e0bd4674f3c71e72c0d256a114dda555e25398cbf4be15b6436",
      "part": "e3plus",
      "id": "e3-2-5-1-xc5",
      "section": "초3::2-5 들이와 무게::2-5-1 들이 비교하기",
      "term": "컵 수로 나타내기",
      "kind": "방법",
      "level": "하",
      "definition": "그릇을 채우는 데 같은 컵에 매번 가득 담아 몇 번 부었는지 세면 그 그릇의 들이를 {컵의 수}로 말할 수 있다.",
      "studentC": "그릇을 채우는 데 같은 컵에 매번 가득 담아 몇 번 부었는지 세면 그 그릇의 들이를 □로 말할 수 있다.",
      "answers": [
        "컵의 수"
      ]
    },
    "currentProposal": {
      "id": "e3-2-5-1-xc5",
      "proposalFingerprint": "4517ab316c8f9f2ba82f1eba101a9ad89e38f2b2ff4c490fd9f9bf313dc0f946",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "주전자의 들이를 컵 하나를 써서 '컵 몇 개만큼'으로 알아보는 방법을 설명해 보세요.",
      "bAnswer": "같은 컵에 물을 매번 가득 담아 주전자가 가득 찰 때까지 붓고, 부은 횟수를 센다. 그 횟수가 컵의 수이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "같은 컵에 매번 가득 담아 붓는다"
          ]
        },
        {
          "anyOf": [
            "가득 찰 때까지 부은 횟수를 센다"
          ]
        }
      ],
      "bGoal": "컵 수로 들이를 나타내는 방법 설명",
      "bReason": "잴 대상(주전자)과 도구(컵 하나)를 정해 방법을 쓰게 함",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸은 '컵의 수', '횟수', '수' 등으로 답이 흩어져 실제 횟수를 주고 컵 수를 쓰게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "같은 컵에 물을 가득 담아 주전자에 $6$번 부었더니 주전자가 가득 찼다. 주전자의 들이는 컵 {$6$}개만큼이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$6$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "매번가득컵횟수가들이의컵수가되려면빈주전자에마지막컵도남김없이꼭맞게들어가는조건이필요하다;마지막일부만붓는경우와 구별한다.",
      "c": "C의6번은매번가득물전체가넘치지않고빈주전자에꼭맞게들어갔다고 명시한다."
    }
  },
  {
    "id": "e3-2-5-1-xc6",
    "sourceIndex": 1187,
    "grade": "e3",
    "source": {
      "sourceIndex": 1187,
      "sourceFingerprint": "a09f6ec2c65e9d2397c3220bea7bfcc5a513aa014e01e362ca7fa6b9c628f366",
      "part": "e3plus",
      "id": "e3-2-5-1-xc6",
      "section": "초3::2-5 들이와 무게::2-5-1 들이 비교하기",
      "term": "들이가 같은 두 그릇",
      "kind": "성질",
      "level": "하",
      "definition": "같은 컵에 매번 가득 담아 남김없이 붓고, 두 그릇이 각각 꼭 맞게 가득 차도록 부은 횟수가 같으면 두 그릇의 들이는 {같다}.",
      "studentC": "같은 컵에 매번 가득 담아 남김없이 붓고, 두 그릇이 각각 꼭 맞게 가득 차도록 부은 횟수가 같으면 두 그릇의 들이는 □.",
      "answers": [
        "같다"
      ]
    },
    "currentProposal": {
      "id": "e3-2-5-1-xc6",
      "proposalFingerprint": "81f2c8ce6a899fb4557d01f069e1b5340bfb01853fca7906d99a98de329ddd2b",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "같은 컵에 물을 가득 담아 부었더니 가 그릇과 나 그릇이 똑같이 $5$번 만에 가득 찼습니다. 두 그릇의 들이를 비교하고 그 까닭을 설명해 보세요.",
      "bAnswer": "두 그릇의 들이는 같다. 같은 컵으로 같은 횟수만큼 부었으므로 들어간 물의 양이 같기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "들이가 같다"
          ]
        },
        {
          "anyOf": [
            "같은 컵, 같은 횟수라서 물의 양이 같다"
          ]
        }
      ],
      "bGoal": "컵 수가 같으면 들이가 같음을 설명",
      "bReason": "횟수를 정해 주고 판단과 이유를 쓰게 함",
      "cDecision": "keep",
      "cReason": "문장은 길지만 조건이 모두 드러나 있고 빈칸이 '같다' 한 낱말 비교임",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "같은 컵에 매번 가득 담아 남김없이 붓고, 두 그릇이 각각 꼭 맞게 가득 차도록 부은 횟수가 같으면 두 그릇의 들이는 {같다}.",
    "currentCSlotAnswers": [
      {
        "expected": "같다",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "같은가득컵5번씩측정하는두그릇은처음빈그릇이라는조건도 명시한다.",
      "c": "매번가득·남김없음·꼭맞게조건은좋으며두빈그릇이라고덧붙여같은횟수의같은들을 확정한다."
    }
  },
  {
    "id": "e3-2-5-1-xc7",
    "sourceIndex": 1188,
    "grade": "e3",
    "source": {
      "sourceIndex": 1188,
      "sourceFingerprint": "0458b4fa1dabf672c84ec745a62af2a7e06bc8d586d507304a4c3a445b170d7b",
      "part": "e3plus",
      "id": "e3-2-5-1-xc7",
      "section": "초3::2-5 들이와 무게::2-5-1 들이 비교하기",
      "term": "가득 채워 재기",
      "kind": "방법",
      "level": "하",
      "definition": "들이를 잴 때는 {그릇 위 끝까지} 물을 가득 채운 뒤 센다.",
      "studentC": "들이를 잴 때는 □ 물을 가득 채운 뒤 센다.",
      "answers": [
        "그릇 위 끝까지"
      ]
    },
    "currentProposal": {
      "id": "e3-2-5-1-xc7",
      "proposalFingerprint": "9154d87e0acebd83dec513a0e956e7206d3f8eb5cb2f77296ecd58dda2615a87",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "컵으로 물을 부어 그릇의 들이를 잴 때, 그릇을 반쯤만 채우고 횟수를 세면 안 되는 까닭을 설명해 보세요.",
      "bAnswer": "들이는 그릇에 가득 담을 수 있는 양이므로 위 끝까지 가득 채워야 한다. 반만 채우고 세면 실제 들이보다 적게 잰 것이 된다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "들이는 가득 담을 수 있는 양"
          ]
        },
        {
          "anyOf": [
            "가득 채우지 않으면 실제보다 적게 잰다"
          ]
        }
      ],
      "bGoal": "들이를 잴 때 가득 채워야 하는 까닭 설명",
      "bReason": "잘못 재는 상황을 주어 가득 채우는 이유를 말하게 함",
      "cDecision": "rewrite",
      "cReason": "원문은 '가득'이 이미 보이는데 '그릇 위 끝까지'를 따로 떠올려야 해서 익숙한 낱말 '가득'을 빈칸으로 바꿈",
      "cSlotEquivalents": [],
      "answerNotes": "'가득', '꽉' 인정."
    },
    "currentCMarkedSentence": "그릇의 들이를 컵으로 잴 때는 물이 그릇의 위 끝까지 {가득} 찰 때까지 부은 뒤 부은 횟수를 센다.",
    "currentCSlotAnswers": [
      {
        "expected": "가득",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "반까지만채운횟수를그대로전체의컵수로말하면안된다는범위로좁혀반을재고두배하는다른가능한방법과 구별한다.",
      "c": "그릇최대양을직접재는가득조건을 확인한다."
    }
  },
  {
    "id": "e3-2-5-1-xc9",
    "sourceIndex": 1190,
    "grade": "e3",
    "source": {
      "sourceIndex": 1190,
      "sourceFingerprint": "d4955b3599dd3ac23940bf34c1cda7c54a7d849afb5f0fb46551764c6e96a170",
      "part": "e3plus",
      "id": "e3-2-5-1-xc9",
      "section": "초3::2-5 들이와 무게::2-5-1 들이 비교하기",
      "term": "컵 수 비교의 예",
      "kind": "방법",
      "level": "중",
      "definition": "같은 컵으로 가 그릇은 $5$번, 나 그릇은 $8$번 부어 가득 찼다면 들이는 {부은 횟수가 많은} 나가 더 크다.",
      "example": {
        "prompt": "같은 컵으로 가는 $7$번, 나는 $4$번 부어 가득 찼다. 들이가 더 큰 그릇은?",
        "answer": "가"
      },
      "studentC": "같은 컵으로 가 그릇은 $5$번, 나 그릇은 $8$번 부어 가득 찼다면 들이는 □ 나가 더 크다.",
      "answers": [
        "부은 횟수가 많은"
      ]
    },
    "currentProposal": {
      "id": "e3-2-5-1-xc9",
      "proposalFingerprint": "0f84de70609bcb2e0819534ed652c48f3ca980a3669d43853ded685c5461535b",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "같은 컵으로 가 그릇은 $7$번, 나 그릇은 $4$번 부어 가득 찼습니다. 들이가 더 큰 그릇을 쓰고 그 까닭을 설명해 보세요.",
      "bAnswer": "가 그릇의 들이가 더 크다. 같은 컵으로 더 여러 번 부어야 가득 찼으므로 더 많은 물이 들어간다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "가"
          ]
        },
        {
          "anyOf": [
            "같은 컵으로 부은 횟수가 더 많다"
          ]
        }
      ],
      "bGoal": "같은 컵으로 부은 횟수로 들이 비교",
      "bReason": "원문 예시의 수로 판단과 이유를 함께 쓰게 함",
      "cDecision": "rewrite",
      "cReason": "원문은 결론(나)이 보이는 채로 이유 구절을 복원하게 해서, 이유를 보여 주고 그릇을 고르게 바꿈",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "같은 컵으로 가 그릇은 $5$번, 나 그릇은 $8$번 부어 가득 찼다. 부은 횟수가 더 많은 {나} 그릇의 들이가 더 크다.",
    "currentCSlotAnswers": [
      {
        "expected": "나",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "빈그릇에매번가득컵물을남김없이꼭맞게붓는횟수라고조건을명시하여7·4컵의비교를 확정한다.",
      "c": "5·8번의비교도같은가득컵단위·빈그릇측정조건을 보완한다."
    }
  }
]
