[
  {
    "id": "e3-2-5-5-xc7",
    "inputProposalFingerprint": "0150e307dce98517798bf0bd4d1ebff565fb1017692af1451365b380b9243e51",
    "learningRole": "procedure",
    "exampleNeeded": "바늘이 눈금 위의 한 곳에 멈춰 있는 바늘 저울 그림(눈금 숫자가 보이는 것)"
  },
  {
    "id": "e3-2-5-5-xc13",
    "inputProposalFingerprint": "bd08e9ea41aa6923f92cd7e1a4bbbb09d4bc0e21ecdcc33d022351844eb0e30f",
    "bDecision": "rewrite",
    "bPrompt": "저울의 눈금 $0$부터 $200\\,\\mathrm{g}$까지가 똑같이 $4$칸으로 나누어져 있습니다. 눈금 한 칸의 무게를 구하는 방법과 답을 쓰세요.",
    "bAnswer": "$200\\,\\mathrm{g}$을 $4$칸으로 똑같이 나눕니다. $200\\div4=50$이므로 한 칸은 $50\\,\\mathrm{g}$입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "$200\\,\\mathrm{g}$을 $4$칸으로 똑같이 나눈다",
          "$200\\div4$를 계산한다",
          "전체 무게를 칸 수로 나눈다",
          "같은 수를 $4$번 더해 $200$이 되는 수를 찾는다"
        ]
      },
      {
        "anyOf": [
          "$50\\,\\mathrm{g}$",
          "$50$그램"
        ]
      }
    ],
    "bGoal": "저울 눈금 한 칸의 무게를 구하는 방법과 결과 쓰기",
    "bReason": "'칸마다 무게가 같다'는 문제에 이미 주어진 조건이라 다시 쓰게 하지 않고, 요청한 방법($200\\div4$ 또는 같은 뜻의 방법)과 결과 $50\\,\\mathrm{g}$만 기준에 담음"
  },
  {
    "id": "e3-2-5-5-xc15",
    "inputProposalFingerprint": "923ebf1eebdac1da227c61137e2cca4fee510b02afb7cab60fef4a0e0d79133b",
    "bDecision": "rewrite",
    "bPrompt": "$3\\,\\mathrm{kg}\\ 200\\,\\mathrm{g}$과 $3\\,\\mathrm{kg}\\ 600\\,\\mathrm{g}$ 중 어느 쪽이 더 무거운지 쓰고, 어떻게 비교했는지 설명하세요.",
    "bAnswer": "$3\\,\\mathrm{kg}\\ 600\\,\\mathrm{g}$이 더 무겁습니다. $\\mathrm{kg}$의 수가 $3$으로 같으므로 $\\mathrm{g}$의 수를 비교하면 $600$이 $200$보다 크기 때문입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "$3\\,\\mathrm{kg}\\ 600\\,\\mathrm{g}$이 더 무겁다",
          "$600\\,\\mathrm{g}$이 있는 쪽이 더 무겁다"
        ]
      },
      {
        "anyOf": [
          "$\\mathrm{kg}$의 수가 같으므로 $\\mathrm{g}$의 수 $600$과 $200$을 비교한다",
          "두 무게를 모두 $\\mathrm{g}$으로 바꾸어 $3600$과 $3200$을 비교한다"
        ]
      }
    ],
    "bGoal": "$\\mathrm{kg}$이 같은 두 무게 중 무거운 쪽을 고르고 비교 방법 설명",
    "bReason": "무거운 쪽을 쓰라고 했으므로 그 선택을 기준에 넣고, $\\mathrm{g}$의 수 비교와 모두 $\\mathrm{g}$으로 바꾸어 비교하는 풀이를 독립된 대안으로 인정함"
  },
  {
    "id": "e3-2-5-6-xc3",
    "inputProposalFingerprint": "63a5e7518c1a3db60f8a8d89b7115898c9a232a42ee69c921b97615052943c0f",
    "cDecision": "rewrite",
    "cAfter": "$3\\,\\mathrm{kg}\\ 150\\,\\mathrm{g}+2\\,\\mathrm{kg}\\ 600\\,\\mathrm{g}$에서 $\\mathrm{kg}$의 수끼리 $3+2$, $\\mathrm{g}$의 수끼리 $150+600$을 더하므로 합은 {$5$}$\\,\\mathrm{kg}$ {$750$}$\\,\\mathrm{g}$이다.",
    "cSlotEquivalents": [
      ["5", "다섯"],
      ["750", "칠백오십"]
    ],
    "cReason": "'g의 수는 □끼리'는 앞 문장을 그대로 복사하는 빈칸이었으므로, 실제 $\\mathrm{g}$의 수 두 개를 짝지어 더한 결과를 쓰게 함. B와 겹치지 않도록 다른 수를 사용함"
  },
  {
    "id": "e3-2-5-6-xc11",
    "inputProposalFingerprint": "44816bfb41d4a9ed9fc014c5f10ce96cc4ae62c0aa050a31a7ee4d5440943dc1",
    "learningRole": "procedure",
    "bDecision": "rewrite",
    "bPrompt": "$5\\,\\mathrm{kg}\\ 100\\,\\mathrm{g}-2\\,\\mathrm{kg}\\ 400\\,\\mathrm{g}$을 계산하려고 합니다. $100\\,\\mathrm{g}$에서 $400\\,\\mathrm{g}$을 뺄 수 없을 때 어떻게 계산하면 되는지 방법을 설명하고 답을 쓰세요.",
    "bAnswer": "$5\\,\\mathrm{kg}$ 중 $1\\,\\mathrm{kg}$을 $1000\\,\\mathrm{g}$으로 바꾸어 $4\\,\\mathrm{kg}\\ 1100\\,\\mathrm{g}$으로 만든 뒤 같은 단위끼리 뺍니다. 답은 $2\\,\\mathrm{kg}\\ 700\\,\\mathrm{g}$입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "$1\\,\\mathrm{kg}$을 $1000\\,\\mathrm{g}$으로 바꾸어 $\\mathrm{kg}$의 수를 $1$ 줄이고($5\\,\\mathrm{kg}$을 $4\\,\\mathrm{kg}$으로) $\\mathrm{g}$의 수에 $1000$을 더한 뒤 같은 단위끼리 뺀다",
          "두 무게를 모두 $\\mathrm{g}$으로 바꾸어 $5100\\,\\mathrm{g}-2400\\,\\mathrm{g}$을 계산한다"
        ]
      },
      {
        "anyOf": [
          "$2\\,\\mathrm{kg}\\ 700\\,\\mathrm{g}$",
          "$2700\\,\\mathrm{g}$"
        ]
      }
    ],
    "bGoal": "$\\mathrm{g}$끼리 뺄 수 없을 때 무게의 뺄셈을 하는 방법 설명",
    "bReason": "받아내림 방법만 정답으로 강제하지 않고 모두 $\\mathrm{g}$으로 바꾸어 빼는 풀이도 독립된 대안으로 인정함. 질문 문장의 어색한 조사도 고침. 질문이 방법을 묻는 것이므로 역할을 procedure로 바로잡음"
  },
  {
    "id": "e3-2-6-1-xc5",
    "inputProposalFingerprint": "7991ecaaf612fad420dac57f6a4a3556de3e47fd55552f72833b613d960ce0d1",
    "cDecision": "exclude",
    "cAfter": null,
    "cSlotEquivalents": [],
    "cReason": "'한눈에'는 '쉽게', '빠르게' 등 다른 부사도 자연스러워 수학 내용을 확인하지 못하는 부사 복원임. 그림그래프의 좋은 점은 e3-2-6-1-xc13에서 다룸"
  },
  {
    "id": "e3-2-6-1-xc7",
    "inputProposalFingerprint": "6677e98c6ae55d7b8669a9ae987907ddc2dca08847466815a43fadb39e24e6f1",
    "learningRole": "procedure",
    "cDecision": "rewrite",
    "cAfter": "큰 그림이 $10$명, 작은 그림이 $1$명을 나타내는 그림그래프에서 큰 그림 $3$개와 작은 그림 $2$개는 {$32$}명을 나타낸다.",
    "cSlotEquivalents": [
      ["32", "삼십이"]
    ],
    "cReason": "'수'라는 낱말만 복원하던 빈칸을 그림 한 개의 값을 읽어 전체 수를 구하는 짧은 계산으로 바꿈. 질문이 읽는 방법과 까닭을 묻는 것이므로 B의 역할은 procedure로 바로잡음"
  },
  {
    "id": "e3-2-6-1-xc12",
    "inputProposalFingerprint": "48a53d93d0b3c547995a5d84b5e5716a5db53b93a4613fdf8cc5ea5f4fde6c14",
    "bDecision": "rewrite",
    "bPrompt": "과일 가게에서 팔린 과일 수를 그림그래프로 나타냈습니다. 큰 그림 $1$개는 $10$개를, 작은 그림 $1$개는 $1$개를 나타냅니다. 사과는 큰 그림 $2$개와 작은 그림 $3$개, 배는 큰 그림 $2$개와 작은 그림 $6$개입니다. 팔린 수가 더 적은 것은 어느 것인지 쓰고, 어떻게 비교했는지 설명하세요.",
    "bAnswer": "사과가 더 적습니다. 큰 그림의 수가 $2$개로 같으므로 작은 그림의 수를 비교하면 $3$개가 $6$개보다 적기 때문입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "사과가 더 적다"
        ]
      },
      {
        "anyOf": [
          "큰 그림의 수가 같으므로 작은 그림의 수를 비교하여 $3$개가 $6$개보다 적다",
          "사과는 $23$개, 배는 $26$개로 읽어 $23$이 $26$보다 작다"
        ]
      }
    ],
    "bGoal": "큰 그림 수가 같은 두 항목에서 더 적은 쪽을 고르고 비교 방법 설명",
    "bReason": "더 적은 항목(사과)을 쓰라고 했으므로 그 선택을 기준에 넣음. 작은 그림 수 비교와 $23$, $26$으로 읽어 비교하는 풀이를 서로 독립된 전체 대안으로 적음. 그림 한 개의 값이 무엇을 세는지 분명하도록 문장을 고침"
  },
  {
    "id": "e3-2-6-1-xc13",
    "inputProposalFingerprint": "0694f6671541d4569ad4ed162b66976a45e20a1ac0cc90d0b0a6a988ada5bb30",
    "bDecision": "rewrite",
    "bPrompt": "같은 조사 결과를 표와 그림그래프로 나타냈습니다. 각 항목의 수를 읽을 때 표가 좋은 점과, 항목끼리 많고 적음을 견줄 때 그림그래프가 좋은 점을 한 가지씩 쓰세요.",
    "bAnswer": "표는 각 항목의 수를 바로 정확하게 읽을 수 있습니다. 그림그래프는 그림의 크기와 개수로 어느 항목이 많고 적은지 한눈에 비교할 수 있습니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "표는 각 항목의 수를 바로 읽을 수 있다",
          "표는 각 항목의 수를 정확하게 알 수 있다"
        ]
      },
      {
        "anyOf": [
          "그림그래프는 그림의 크기나 개수로 많고 적음을 한눈에 비교할 수 있다",
          "그림그래프는 항목끼리 많고 적음을 쉽게 견줄 수 있다"
        ]
      }
    ],
    "bGoal": "수를 읽는 면에서 표의 좋은 점, 많고 적음을 견주는 면에서 그림그래프의 좋은 점 설명",
    "bReason": "질문에서 비교하는 측면(수 읽기, 많고 적음 견주기)을 명시하여 응답 범위를 정하고, 같은 뜻의 다른 표현을 기준에서 인정함",
    "cDecision": "rewrite",
    "cAfter": "사과 $23$명, 배 $15$명인 같은 조사 결과에서 수를 바로 읽기 쉬운 것은 {표}이고, 그림의 크기와 개수로 많고 적음을 한눈에 견주기 쉬운 것은 {그림그래프}이다.",
    "cSlotEquivalents": [
      [],
      ["그림 그래프", "그래프"]
    ],
    "cReason": "실제 같은 자료($23$명, $15$명)를 보여 주어 표는 수를 읽는 쪽, 그림그래프는 많고 적음을 견주는 쪽이라는 두 이름의 장점을 구별하게 함. 순서가 있는 두 빈칸임"
  },
  {
    "id": "e3-2-6-1-xc14",
    "inputProposalFingerprint": "aa66ae2e18a5a3b52d0475d964e216f535cb2661a1ad296a8b3d7d1268384608",
    "bDecision": "rewrite",
    "bPrompt": "학생들이 좋아하는 과일을 한 명이 하나씩만 골라 조사했습니다. 그림그래프에서 좋아하는 과일별 학생 수를 사과 $23$명, 배 $15$명, 귤 $30$명으로 읽었습니다. 조사한 학생은 모두 몇 명인지 구하는 방법과 답을 쓰세요.",
    "bAnswer": "한 명이 하나씩만 골랐으므로 모든 항목의 수를 더합니다. $23+15+30=68$이므로 $68$명입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "모든 항목의 수를 더한다",
          "$23+15+30$을 계산한다"
        ]
      },
      {
        "anyOf": [
          "$68$명"
        ]
      }
    ],
    "bGoal": "그림그래프에서 한 명이 한 항목만 고른 조사의 전체 학생 수를 구하는 방법 설명",
    "bReason": "한 명이 하나씩만 골랐다는 조건을 질문에 명시하여, 항목별 수의 합이 학생 수가 되는 관계가 참이 되게 함",
    "cDecision": "rewrite",
    "cAfter": "한 명이 한 항목만 고른 조사에서 그림그래프의 항목별 수가 $12$명, $18$명, $25$명이면, 모든 항목의 수를 더한 합계는 {$55$}명이다.",
    "cSlotEquivalents": [
      ["55", "오십오"]
    ],
    "cReason": "한 명이 한 항목만 고른 조사라는 조건을 밝혀 항목 수의 합이 전체가 되게 하고, 부사만 복원하던 빈칸을 실제 합계 계산으로 바꿈. B와 다른 수를 사용함"
  },
  {
    "id": "e3-2-6-1-xc17",
    "inputProposalFingerprint": "36f643c3fb75ae9d0b76ce99f3cd22b567a591134e475aa271929ae7bd024b8a",
    "cDecision": "keep",
    "cSlotEquivalents": [
      ["한 개", "한개", "1개", "1"]
    ],
    "cReason": "원본 C를 유지하되 '하나로', '한 개로', '$1$개로'는 모두 큰 그림 한 개로 바꾼다는 같은 뜻이므로 대체 답으로 인정함"
  },
  {
    "id": "e3-2-6-1-xc20",
    "inputProposalFingerprint": "e6af76d8fcff329b9db84a3dc9967a944e6877d3486bc90bb18a7c35205ba77e",
    "bDecision": "rewrite",
    "bPrompt": "아이스크림 가게에서 일주일 동안 팔린 맛을 그림그래프로 나타냈더니 딸기 맛이 가장 많이, 녹차 맛이 가장 적게 팔렸습니다. 다음 주에 아이스크림을 준비할 때 이 결과를 어떻게 쓰면 좋을지 한 가지 계획과 그 까닭을 쓰세요.",
    "bAnswer": "가장 많이 팔린 딸기 맛을 더 많이 준비한다. 많이 팔린 맛은 다음에도 많이 찾을 수 있기 때문이다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "가장 많이 팔린 딸기 맛을 더 많이 준비한다",
          "가장 적게 팔린 녹차 맛을 덜 준비한다",
          "팔린 양에 맞추어 맛마다 준비하는 양을 정한다"
        ]
      },
      {
        "anyOf": [
          "많이 팔렸으므로 다음에도 많이 찾을 수 있다",
          "적게 팔렸으므로 준비하면 남을 수 있다",
          "그림그래프에서 팔린 수를 비교한 결과를 까닭으로 든다"
        ]
      }
    ],
    "bGoal": "그림그래프의 결과를 다음 계획에 쓰는 방법과 까닭 설명",
    "bReason": "딸기를 더 준비하는 계획뿐 아니라 녹차를 덜 준비하는 계획도 유효하므로 기준에서 대안으로 인정함. '다음에도 많이 찾을 것이다'라는 단정을 '찾을 수 있다'로 고침"
  },
  {
    "id": "e3-2-6-1-xc20-C",
    "inputProposalFingerprint": "e6af76d8fcff329b9db84a3dc9967a944e6877d3486bc90bb18a7c35205ba77e",
    "cDecision": "exclude",
    "cAfter": null,
    "cSlotEquivalents": [],
    "cReason": "'그 맛을 □ 준비하는'은 '더 많이' 외에 '덜' 준비하는 계획도 말이 되는 주관적 계획 말 복원이라 수학적 확인 가치가 낮음. 계획의 방법과 까닭은 B에서 다룸"
  },
  {
    "id": "e3-2-6-1-xc25",
    "inputProposalFingerprint": "3ee4b27afa11d57c040388328b41b3677744d01ef50c8f7f9fff8d95c61b6c73",
    "bDecision": "rewrite",
    "bPrompt": "큰 그림은 $10$명, 작은 그림은 $1$명을 나타냅니다. 가 반은 큰 그림 $3$개와 작은 그림 $1$개, 나 반은 큰 그림 $2$개와 작은 그림 $9$개입니다. 그림 개수는 나 반이 더 많은데 학생 수는 어느 반이 더 많은지 까닭과 함께 쓰세요.",
    "bAnswer": "가 반은 $31$명, 나 반은 $29$명이라 가 반이 더 많다. 작은 그림은 $9$개여도 $9$명이라 큰 그림 $1$개인 $10$명보다 작기 때문이다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "가 반이 더 많다"
        ]
      },
      {
        "anyOf": [
          "작은 그림 $9$개는 $9$명으로 큰 그림 $1$개($10$명)보다 적다",
          "가 반은 $31$명, 나 반은 $29$명으로 학생 수를 구해 견준다"
        ]
      }
    ],
    "bGoal": "큰 그림이 더 많은 쪽의 학생 수가 더 큰 까닭 설명",
    "bReason": "작은 그림 $9$개와 큰 그림 $1$개를 견주는 이유와 $31$명, $29$명으로 직접 견주는 이유를 괄호로 섞지 않고 독립된 anyOf 대안으로 분리함"
  },
  {
    "id": "e3-2-6-2-xc1",
    "inputProposalFingerprint": "9d608fa5ea34af92fde8325a33010bdcb6d99f7a4bd45851f49dc82b1aa187b5",
    "cDecision": "rewrite",
    "cAfter": "그림그래프로 $30$명을 나타낼 때 그림 하나가 $10$명이면 그림 {$3$}개, 그림 하나가 $5$명이면 그림 {$6$}개가 필요하다.",
    "cSlotEquivalents": [
      ["3", "세", "삼"],
      ["6", "여섯", "육"]
    ],
    "cReason": "'수'라는 낱말만 복원하던 빈칸을 그림 하나의 값에 따라 그려야 할 그림 개수가 달라지는 짧은 계산으로 바꿈"
  },
  {
    "id": "e3-2-6-2-xc3",
    "inputProposalFingerprint": "52e53506274bd4ef11ccd82b0c801ae8aa57dd896ea7720b5c7c4df257802ac2",
    "cDecision": "keep",
    "cSlotEquivalents": [
      ["알맞은", "맞는", "관계있는", "관련 있는"]
    ],
    "cReason": "원본 C를 유지하되 이 문장에서 '알맞은', '맞는', '관계있는'은 '어울리는'과 같은 뜻이므로 대체 답으로 인정함"
  },
  {
    "id": "e3-2-6-2-xc7",
    "inputProposalFingerprint": "df106246bcb408202dd9c5e32ae5f6e5a9bc154e09c0dfad23c7687c4b175c03",
    "cDecision": "rewrite",
    "cAfter": "표에 축구, 야구, 농구, 배구가 있는데 그림그래프에는 축구, 야구, 농구만 그렸다면 빠진 항목은 {배구}이다.",
    "cSlotEquivalents": [
      []
    ],
    "cReason": "문장 안의 $4$를 그대로 복사하던 빈칸 대신, 표의 네 항목과 그래프의 세 항목을 견주어 빠진 항목을 찾게 함. B의 과일 상황과 다른 항목을 사용함"
  },
  {
    "id": "e3-2-6-2-xc8",
    "inputProposalFingerprint": "ac379177eab609580cee02714c54dc204ecc182beb40ae2dafdf66ca481a88c3",
    "cDecision": "rewrite",
    "cAfter": "표시 없이 세다가 이미 한 번 센 자료 하나를 한 번 더 세었다. 이 자료는 모두 {$2$}번 센 것이고, 다른 실수가 없으면 센 전체 수는 실제보다 {$1$} 크다.",
    "cSlotEquivalents": [
      ["2", "두", "둘"],
      ["1", "하나", "한"]
    ],
    "cReason": "'같은 것을 □ 번'은 여러 번 센 경우도 가능해 답이 하나로 정해지지 않았음. 한 번 센 것을 한 번 더 세는 상황으로 범위를 정하고 횟수와 전체 수의 차이를 쓰게 함"
  },
  {
    "id": "e3-2-6-2-xc12",
    "inputProposalFingerprint": "376c66c84bb01e9185a556bf98b3e160ed031ee00ab92079f2ffa72f918f5185",
    "cDecision": "rewrite",
    "cAfter": "수가 큰 자료 $800$명을 나타낼 때 그림 하나가 $100$명이면 그림 {$8$}개, 그림 하나가 $200$명이면 그림 {$4$}개가 필요하다.",
    "cSlotEquivalents": [
      ["8", "여덟", "팔"],
      ["4", "네", "사"]
    ],
    "cReason": "'큰 수'는 '많은 수', '큰 개수' 등 비슷한 말이 가능해 낱말 복원에 그쳤음. 그림 하나의 값이 클수록 그림 개수가 줄어드는 실제 계산으로 바꿈. B와 다른 수를 사용함"
  },
  {
    "id": "e3-2-6-2-xc17",
    "inputProposalFingerprint": "24c6c3b6d7a1d9e65d6d0450032542b6015fa5af949784c522d228439ce165ba",
    "learningRole": "procedure",
    "cDecision": "keep",
    "cSlotEquivalents": [
      ["같은지", "일치하는지"]
    ],
    "cReason": "원본 C를 유지하되 '표의 수와 같은지'는 '맞는지'와 같은 뜻의 값 비교이므로 대체 답으로 인정함. B는 다시 수로 읽어 표와 견주는 확인 절차를 묻기 때문에 역할을 procedure로 바로잡음"
  },
  {
    "id": "e3-2-6-2-xc26",
    "inputProposalFingerprint": "0790c9dfa8538278882e0d7e5fd1a66d970f6df4367d26d56a8120c50cd0652d",
    "cDecision": "keep",
    "cSlotEquivalents": [
      ["권", "'권'"]
    ],
    "cReason": "원본 C를 유지하되 따옴표 없이 쓴 '권'도 같은 단위이므로 정답으로 인정함"
  }
]