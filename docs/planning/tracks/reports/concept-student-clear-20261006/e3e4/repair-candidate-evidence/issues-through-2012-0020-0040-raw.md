[
  {
    "id": "e3-1-2-2-xc9",
    "inputProposalFingerprint": "f8e2fe96459766f191304b3ceff8aa75cf0cf8d46977352bd54c76d7b1b2784e",
    "cDecision": "exclude",
    "cAfter": null,
    "cSlotEquivalents": [],
    "cReason": "문장에 주어진 꼭짓점 $3$개를 각의 수 빈칸에 그대로 옮겨 쓰는 문항이라 새로 배우는 것이 적다. 꼭짓점 수와 각 수의 관계는 e3-1-2-2-xc21에서 다루므로 C를 제외한다."
  },
  {
    "id": "e3-1-2-2-xc10",
    "inputProposalFingerprint": "e8664e9693310d118a09af263d938a5252061b9956bc86771861fa0ad0a74c65",
    "cDecision": "exclude",
    "cAfter": null,
    "cSlotEquivalents": [],
    "cReason": "문장에 주어진 꼭짓점 $4$개를 각의 수 빈칸에 그대로 옮겨 쓰는 문항이라 새로 배우는 것이 적다. 같은 관계를 e3-1-2-2-xc21이 다루므로 C를 제외한다."
  },
  {
    "id": "e3-1-2-2-xc18",
    "inputProposalFingerprint": "0e902dbca3fa1044219607299870ef810913e0ae03d7c945b8de5984da194df6",
    "learningRole": "procedure",
    "bDecision": "rewrite",
    "bPrompt": "시계를 $1$시부터 $12$시까지의 정각으로만 생각합니다. 긴바늘이 $12$를, 짧은바늘이 $3$을 가리키는 $3$시에 두 바늘이 직각을 이루는지 확인하는 방법을 쓰세요. 그리고 이 범위에서 $3$시 말고 두 바늘이 직각을 이루는 정각을 하나 쓰세요.",
    "bAnswer": "삼각자의 직각 부분을 두 바늘 사이에 대어 꼭 맞으면 직각입니다. $3$시 말고 두 바늘이 직각을 이루는 정각은 $9$시입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "삼각자의 직각 부분을 두 바늘 사이에 대어 꼭 맞는지 확인한다.",
          "직각이 되게 접은 종이를 두 바늘 사이에 대어 꼭 맞는지 확인한다.",
          "직각 확인 도구를 두 바늘 사이에 맞추어 확인한다."
        ]
      },
      {
        "anyOf": [
          "$9$시"
        ]
      }
    ],
    "bGoal": "$3$시에 두 바늘이 직각인지 확인하는 방법을 말하고, $1$시부터 $12$시까지의 범위에서 두 바늘이 직각인 다른 정각 찾기",
    "bReason": "다른 정각을 찾는 범위를 $1$시부터 $12$시까지로 정하고, $3$시의 바늘 위치도 질문에 적어 혼자 읽고 답할 수 있게 함. 확인 방법의 대체 도구는 별도 anyOf 문장으로 둠",
    "cDecision": "rewrite",
    "cAfter": "$1$시부터 $12$시까지의 정각 가운데 시계의 두 바늘이 직각을 이루는 때는 작은 시각부터 차례로 쓰면 {$3$시}, {$9$시}이다.",
    "cSlotEquivalents": [
      [
        "3시",
        "세 시"
      ],
      [
        "9시",
        "아홉 시"
      ]
    ],
    "cReason": "$3$시와 $9$시의 나열 순서가 자유여서 고정 슬롯으로 채점하면 안 되므로, 범위를 $1$시~$12$시로 정하고 작은 시각부터 차례로 쓰도록 순서를 명시함"
  },
  {
    "id": "e3-1-2-2-xc21",
    "inputProposalFingerprint": "d2fa5c19633cca6a0f93113aae4696e561b33bedd87f71aeb248cb3186f87aed",
    "cDecision": "rewrite",
    "cAfter": "곧은 선으로 둘러싸인 도형에서 각의 수는 두 변이 만나는 점인 {꼭짓점}의 수와 같다.",
    "cSlotEquivalents": [],
    "cReason": "첫 슬롯 $4$는 본문 $4$를 그대로 옮기는 빈칸이라 뺌. 꼭짓점 수와 각 수의 관계만 남기고, 꼭짓점이 '두 변이 만나는 점'임을 보여 주어 '변'이 답이 되지 않게 함"
  },
  {
    "id": "e3-1-2-3-xc14",
    "inputProposalFingerprint": "a3a3ea02fd37503473b5c8313e2f357fe795fe68d810a2a85997f1adb1352101",
    "cDecision": "exclude",
    "cAfter": null,
    "cSlotEquivalents": [],
    "cReason": "'만나는'을 채우는 문법 복원이고, 직각인 꼭짓점이 두 변이 만나는 점이라는 꼭짓점 정의와 겹친다. 새로 확인할 수학 관계가 적어 C를 제외한다."
  },
  {
    "id": "e3-1-2-3-xc21",
    "inputProposalFingerprint": "6b239f4111b83b37097f9cedec62ca428319af7535f04f90ead55ffac9a8517c",
    "bDecision": "rewrite",
    "bPrompt": "종이 위에 곧은 선 하나를 가로로 놓고, 그 양 끝에서 각각 위쪽으로 직각이 되게 곧은 선을 세웁니다. 이 두 선이 위로 올라가면서 서로 만나는지 생각해서, 삼각형에는 직각이 $2$개 있을 수 없는 까닭을 설명하세요.",
    "bAnswer": "아래 선의 양 끝에서 직각으로 세운 두 선은 위로 올라가도 서로 만나지 않아서 세 번째 꼭짓점이 생기지 않습니다. 그래서 삼각형이 될 수 없으므로 직각이 $2$개인 삼각형은 없습니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "양 끝에서 직각으로 세운 두 선(변)은 서로 만나지 않는다.",
          "두 선이 나란히 위로 올라가 만나는 점이 없다."
        ]
      },
      {
        "anyOf": [
          "삼각형이 되지 않는다.",
          "세 번째 꼭짓점이 생기지 않아 삼각형을 만들 수 없다."
        ]
      }
    ],
    "bGoal": "삼각형에 직각이 $2$개 있을 수 없는 까닭을, 한 변의 양 끝에서 직각으로 세운 두 선이 만나지 않는 것으로 설명하기",
    "bReason": "그림을 참조하지 않고 한 변을 가로로 놓고 양 끝에서 위로 직각으로 세우는 상황을 글로 직접 제시함. 평행이라는 말 없이 두 선이 만나는지만 살펴 보게 함",
    "exampleNeeded": "한 변의 양 끝에서 직각으로 세운 두 선이 나란히 위로 올라가는 그림 한 장 (삼각자로 직각을 대어 볼 수 있는 모양)",
    "coreAfter": "삼각형의 한 변 양 끝에서 모두 직각으로 변을 세우면 {두 변이 만나지 않으므로} 삼각형의 직각은 많아야 하나이다.",
    "coreReason": "'직각은 하나만 있을 수 있다'는 직각이 없는 삼각형도 있어서 '꼭 하나'로 읽힐 수 있다. 직각이 없는 경우도 포함하도록 '많아야 하나'로 조건을 바로잡음. 원래 표적인 두 변이 만나지 않는다는 이유는 그대로 둠",
    "cDecision": "rewrite",
    "cAfter": "삼각형의 한 변 양 끝에서 모두 직각으로 변을 세우면 그 두 변은 서로 {만나지} 않는다. 그래서 삼각형에 직각은 많아야 {$1$}개이다.",
    "cSlotEquivalents": [
      [
        "닿지"
      ],
      [
        "한"
      ]
    ],
    "cReason": "'직각이 $1$개만 있다'는 직각이 없는 삼각형을 빠뜨리므로 '많아야 $1$개'로 고침. 일반 설명과 같은 조건이며, 원문의 긴 이유 구절은 짧은 낱말과 수로 나눈 상태를 유지함"
  },
  {
    "id": "e3-1-2-4-xc16",
    "inputProposalFingerprint": "bcd6f85f39ac9851df96382ac4319b3a8054e54582543aa31ff149de22e0c3a1",
    "cDecision": "rewrite",
    "cAfter": "가로 $6$ cm, 세로 $4$ cm인 똑같은 직사각형 두 개를 길이가 $4$ cm인 변끼리 꼭 맞게 붙이면, 더 큰 직사각형의 긴 변은 {$12$} cm이다.",
    "cSlotEquivalents": [],
    "cReason": "본문에 있는 '직사각형'을 그대로 다시 쓰는 빈칸을 없애고, 붙인 뒤 변의 길이를 계산하는 빈칸으로 바꿈 ($6+6=12$)"
  },
  {
    "id": "e3-1-2-4-xc17",
    "inputProposalFingerprint": "1773939c6178ff08b097db8c1a9225698dfc5a366ea39cd149702ba7925a3e58",
    "cDecision": "rewrite",
    "cAfter": "가로 $8$ cm, 세로 $6$ cm인 직사각형을 길이가 $8$ cm인 마주 보는 두 변의 가운데끼리 잇는 선으로 자르면, 작은 직사각형 $2$개의 가로는 각각 {$4$} cm이다.",
    "cSlotEquivalents": [],
    "cReason": "본문 '직사각형'을 결과 이름에 복사하는 빈칸을 없애고, 가운데를 잇는 선으로 잘랐을 때 생기는 변의 길이를 구하는 빈칸으로 바꿈"
  },
  {
    "id": "e3-1-2-4-xc27",
    "inputProposalFingerprint": "6bc035ed2cfd0c1e51ce5860fc6f2904700e9775e84bf23efb5cea4ea9949983",
    "cDecision": "rewrite",
    "cAfter": "가로가 $9$ cm, 세로가 $5$ cm인 직사각형은 가로와 세로를 알면 네 변의 길이가 모두 정해지므로, 네 변의 길이를 모두 더하면 {$28$} cm이다.",
    "cSlotEquivalents": [],
    "cReason": "가로와 짝인 '세로'라는 낱말만 복원하는 빈칸 대신, 가로·세로로 네 변이 정해진다는 뜻을 이용해 네 변의 합 $2\\times(9+5)=28$을 구하게 함"
  },
  {
    "id": "e3-1-2-5-xc3",
    "inputProposalFingerprint": "9ee8790c540295774b90d7ecbf2526604ea633aed555962bd81edf9b7f50c706",
    "cDecision": "exclude",
    "cAfter": null,
    "cSlotEquivalents": [],
    "cReason": "바둑판·색종이 같은 물건 이름만으로 정사각형이라고 단정하기 어렵다. 네 변·네 각 조건을 보이면 정사각형 정의 문항과 겹쳐 새 이점이 적으므로 C를 제외한다."
  },
  {
    "id": "e3-1-2-5-xc5",
    "inputProposalFingerprint": "80574fb7bcc1470145aed6c4a3ef8fc80c671c5af8c1f7a003f160d66c327dfa",
    "cDecision": "exclude",
    "cAfter": null,
    "cSlotEquivalents": [],
    "cReason": "직각 $4$개를 주고 꼭짓점 $4$개를 그대로 옮겨 쓰는 빈칸이라 이점이 낮다. 꼭짓점 수와 각 수의 관계는 e3-1-2-2-xc21에서 다루므로 C를 제외한다."
  },
  {
    "id": "e3-1-2-5-xc7",
    "inputProposalFingerprint": "6eb166dceee7cf156ddf48a931c3a69010b13624ca14f44e7da37b39f0b5ac72",
    "cDecision": "rewrite",
    "cAfter": "그림에서 두 변의 가운데에 똑같은 짧은 선 표시($|$)가 있으면 두 변의 길이가 같다는 뜻이다. 이 표시가 있는 두 변 중 한 변이 $5$ cm이면 다른 변은 {$5$} cm이다.",
    "cSlotEquivalents": [],
    "cReason": "'같다'만 채우는 빈칸을 없애고, 같은 표시가 있는 변의 길이를 알아내는 쓰임으로 바꿈. 같은 표시의 모양을 글로 직접 보여 줌",
    "exampleNeeded": "두 변의 가운데에 똑같은 짧은 선 표시가 그려지고 한 변에만 $5$ cm가 적힌 도형 그림"
  },
  {
    "id": "e3-1-2-5-xc8",
    "inputProposalFingerprint": "4f1b5c0c5509f486481ad74b81a7432d6fe3a2d82a46193fd6aab768f820504f",
    "cDecision": "exclude",
    "cAfter": null,
    "cSlotEquivalents": [],
    "cReason": "시작 꼭짓점과 방향을 달리해도 같은 정사각형의 이름이 여덟 가지 가능해서 한 배열만 채점하기 어렵고, 이름 표기 약속이라 수학적 이점도 낮아 C를 제외한다."
  },
  {
    "id": "e3-1-3-1-xc5",
    "inputProposalFingerprint": "65b10257fa9ad569b63aa5749a1257d6efc192be5625e54302375c8ff96213f8",
    "cDecision": "rewrite",
    "cAfter": "$20$개를 $4$명에게 똑같이 나누는 $20\\div4$에서 몫은 한 사람이 받는 개수이므로, 한 사람이 받는 개수는 {$5$}개이다.",
    "cSlotEquivalents": [
      [
        "다섯"
      ]
    ],
    "cReason": "'사람'만 채우는 문법 빈칸 대신, 몫이 뜻하는 한 사람의 개수를 실제로 구하는 빈칸으로 바꿈"
  },
  {
    "id": "e3-1-3-1-xc10",
    "inputProposalFingerprint": "6020ebb132ecd1f63fbb2a417d027494096459eafcedfa242729065c55da1d39",
    "bDecision": "rewrite",
    "bPrompt": "$7\\div1$의 몫을 쓰고, 사탕 $7$개를 $1$명에게 주는 상황 또는 $1$개씩 묶는 상황으로 그 까닭을 설명하세요.",
    "bAnswer": "몫은 $7$입니다. 사탕 $7$개를 $1$명에게 모두 주면 그 사람이 $7$개를 다 받기 때문입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "몫이 $7$이다."
        ]
      },
      {
        "anyOf": [
          "사탕 $7$개를 $1$명에게 모두 주면 그 사람이 $7$개를 다 받는다.",
          "$7$개를 $1$개씩 묶으면 $7$묶음이 된다."
        ]
      }
    ],
    "bGoal": "$1$로 나눈 몫이 처음 수와 같은 까닭 설명하기",
    "bReason": "원문 예제 $7\\div1$로 몫과 까닭을 묻되, 서로 다른 두 설명(한 명이 모두 받음, $1$개씩 묶음)을 한 문자열에 '또는'으로 섞지 않고 별개의 anyOf 대안으로 나눔"
  },
  {
    "id": "e3-1-3-1-xc11",
    "inputProposalFingerprint": "b630ad001d02b413ab0fd169296b5f163e6105acbab11ff39c387db0314ed559",
    "bDecision": "rewrite",
    "bPrompt": "$6\\div6$의 몫을 쓰고, 사탕 $6$개를 $6$명에게 나누어 주는 상황 또는 $6$개씩 묶는 상황으로 그 까닭을 설명하세요.",
    "bAnswer": "몫은 $1$입니다. 사탕 $6$개를 $6$명에게 똑같이 나누어 주면 한 사람이 $1$개씩 받기 때문입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "몫이 $1$이다."
        ]
      },
      {
        "anyOf": [
          "사탕 $6$개를 $6$명에게 똑같이 나누어 주면 한 사람이 $1$개씩 받는다.",
          "$6$개를 $6$개씩 묶으면 $1$묶음이 된다."
        ]
      }
    ],
    "bGoal": "자기 자신으로 나눈 몫이 $1$인 까닭 설명하기",
    "bReason": "간단한 수 $6\\div6$으로 몫과 까닭을 묻되, 서로 다른 두 설명($6$명이 $1$개씩, $6$개씩 $1$묶음)을 별개의 anyOf 대안으로 나눔"
  },
  {
    "id": "e3-1-3-1-xc18",
    "inputProposalFingerprint": "6f17fbcb1b0e76c1ae23489e07bce999b947ee9bd333543c3011269d7ffa2c09",
    "cDecision": "rewrite",
    "cAfter": "사탕 $30$개를 $5$명에게 똑같이 나누어 주는 상황을 $30\\div5$로 나타내면, 한 사람이 받는 사탕은 {$6$}개이다.",
    "cSlotEquivalents": [
      [
        "여섯"
      ]
    ],
    "cReason": "$30$과 $5$의 역할을 본문에 주고 두 숫자를 복사하게 하던 빈칸을 없애고, 한 사람이 받는 실제 개수를 구하게 함"
  },
  {
    "id": "e3-1-3-1-xc22",
    "inputProposalFingerprint": "e0da5b48774e3c4f788b6f28509aa50fc33b94ca7b3dff5ea2a1588d381947af",
    "cDecision": "rewrite",
    "cAfter": "사탕 $12$개를 $3$명에게 똑같이 나누어 주는 상황을 나눗셈식 $12\\div3$으로 쓴다. 나눌 전체인 사탕의 수는 식의 {앞}의 수이고, 나누는 사람 수는 식의 {뒤}의 수이다.",
    "cSlotEquivalents": [
      [
        "앞쪽"
      ],
      [
        "뒤쪽"
      ]
    ],
    "cReason": "$12\\div3$의 앞 $12$와 뒤 $3$을 그대로 복사하던 빈칸 대신, 사탕 상황에서 전체와 사람 수가 식의 어느 자리에 오는지 고르게 함. 두 빈칸의 순서는 문장 순서(전체, 사람 수)로 정해짐"
  },
  {
    "id": "e3-1-3-2-xc2",
    "inputProposalFingerprint": "c6a05214b9d1bd6bfd8e8fd46002a5722397962583d695fb03f0f8b07be9b179",
    "bDecision": "rewrite",
    "bPrompt": "$15\\div3=5$를 곱셈식으로 바꾸어 쓰세요. 그리고 곱셈식에서 $15$가 곱한 결과의 자리에 오는 까닭을 쓰세요.",
    "bAnswer": "$3\\times5=15$ 또는 $5\\times3=15$입니다. $15$는 $3$개씩 $5$묶음을 모두 모은 전체이기 때문입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "$3\\times5=15$",
          "$5\\times3=15$"
        ]
      },
      {
        "anyOf": [
          "$15$는 묶음을 모두 모은 전체이다.",
          "$15$는 $3$개씩 $5$묶음의 전체 수이다."
        ]
      }
    ],
    "bGoal": "나눗셈식을 곱셈식으로 바꾸고 전체가 곱이 되는 까닭 설명하기",
    "bReason": "질문이 곱하는 순서를 정하지 않으므로 $3\\times5=15$와 $5\\times3=15$를 모두 옳은 식으로 기준에 포함함"
  },
  {
    "id": "e3-1-3-2-xc5",
    "inputProposalFingerprint": "bf5d039d98db0210a7a0da93a19a6405ee7e48aaba1238d7056717ecac4d61e8",
    "cDecision": "rewrite",
    "cAfter": "바둑돌 $18$개를 $3$줄에 똑같이 나누어 놓으면 $18\\div3$의 몫은 한 줄에 놓인 개수이므로, 한 줄에 {$6$}개이다.",
    "cSlotEquivalents": [
      [
        "여섯"
      ]
    ],
    "cReason": "'줄'만 채우는 낱말 복원 대신, 몫이 뜻하는 한 줄의 개수를 실제로 구하게 바꿈"
  }
]