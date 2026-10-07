[
  {
    "id": "e3-2-5-1-xc11",
    "inputProposalFingerprint": "cdfeb23d9a15345c95c0991fb5da83a922900eadcf3af3b6b53564927b5b5a39",
    "bDecision": "rewrite",
    "bPrompt": "같은 빈 물통을 작은 컵과 큰 컵으로 각각 채웁니다. 두 경우 모두 컵을 매번 가득 담아 부었더니, 남거나 넘치는 것 없이 물통이 꼭 맞게 찼습니다. 어느 컵으로 더 여러 번 부었는지 쓰고, 그 까닭을 설명해 보세요.",
    "bAnswer": "작은 컵으로 더 여러 번 부었습니다. 작은 컵은 한 번에 붓는 양이 적고 큰 컵은 한 번에 붓는 양이 많아서, 같은 양을 꼭 맞게 채우려면 작은 컵으로 더 여러 번 부어야 하기 때문입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "작은 컵으로 더 여러 번 붓는다",
          "작은 컵이 부은 횟수가 더 많다",
          "작은 컵"
        ]
      },
      {
        "anyOf": [
          "작은 컵은 한 번에 붓는 양이 적어서 같은 양을 채우려면 더 여러 번 부어야 한다",
          "큰 컵은 한 번에 붓는 양이 많아서 더 적은 횟수로 채운다"
        ]
      }
    ],
    "bGoal": "컵의 크기와 같은 양을 채우는 데 부은 횟수의 관계 설명",
    "bReason": "두 컵 모두 가득 담아 남김없이 꼭 맞게 채운다는 조건을 문장에 넣어, 마지막에 남거나 넘치는 양 때문에 횟수가 같아질 수 있는 경우를 없앰",
    "cDecision": "rewrite",
    "cAfter": "같은 그릇을 가득 담은 컵으로 남거나 넘치지 않고 꼭 맞게 채울 때, 작은 컵으로 부어야 하는 횟수는 큰 컵으로 부어야 하는 횟수보다 {많다}.",
    "cSlotEquivalents": [
      [
        "더 많다"
      ]
    ],
    "cReason": "두 컵 모두 가득 담아 꼭 맞게 채우는 조건을 문장에 넣어 '많다'가 항상 참이 되게 함. 짧은 비교 빈칸은 그대로 보존함"
  },
  {
    "id": "e3-2-5-1-xc12",
    "inputProposalFingerprint": "c384f45c26ebd1cd8051b63b202d4fd060cea82e07c4d06dd1a2905f1685e890",
    "bDecision": "rewrite",
    "bPrompt": "키가 크고 좁은 병과 키가 작고 넓은 그릇이 있습니다. 눈으로만 보고 들이를 비교하기 어려운 까닭과, 정확하게 비교하는 방법을 한 가지 써 보세요.",
    "bAnswer": "높이와 폭이 모두 달라 어느 쪽에 더 많이 담기는지 눈으로 알 수 없습니다. 한쪽에 물을 가득 채워 다른 쪽에 옮겨 부어 보면 알 수 있습니다. 같은 컵으로 각각 몇 컵 들어가는지 세어 비교해도 됩니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "높이와 폭이 모두 달라 눈으로 보아서는 어느 쪽이 더 많이 담기는지 알기 어렵다",
          "한쪽은 높고 좁고 다른 쪽은 낮고 넓어서 눈으로 들이를 알기 어렵다"
        ]
      },
      {
        "anyOf": [
          "한쪽 그릇에 물을 가득 채워 다른 쪽 그릇에 옮겨 부어 남는지 넘치는지 본다",
          "같은 컵으로 각 그릇을 채우는 데 몇 컵 들어가는지 세어 비교한다",
          "각 그릇의 물을 똑같은 모양의 통에 옮겨 담아 물의 높이를 비교한다"
        ]
      }
    ],
    "bGoal": "눈어림의 한계와 직접 비교의 필요성 설명",
    "bReason": "정확한 비교 방법이 옮겨 붓기만이 아니므로 같은 컵으로 세기, 같은 통에 옮겨 높이 보기도 유효한 방법으로 기준에 넣음",
    "cDecision": "exclude",
    "cAfter": null,
    "cSlotEquivalents": [],
    "cReason": "빈칸에 들어갈 물·쌀·콩 같은 재료 이름은 정답이 여러 가지이고 수학 목표(눈어림의 한계, 직접 비교)를 확인하지 못해 이점이 낮음. 직접 비교의 뜻은 B가 확인함"
  },
  {
    "id": "e3-2-5-1-xc18",
    "inputProposalFingerprint": "b8a4391ce1987abeffc2c1e1d9cbf0eea23f375275c0182ef8fa4038914820c1",
    "bDecision": "rewrite",
    "bPrompt": "같은 컵으로 들이를 재었더니 큰 그릇은 컵 $5$개만큼, 작은 그릇은 컵 $3$개만큼 들어갑니다. 큰 그릇에 물을 가득 담아 빈 작은 그릇에 모두 부었습니다. 넘친 물은 컵 몇 개만큼인지 쓰고, 그 까닭을 두 그릇의 들이를 이용해 설명해 보세요.",
    "bAnswer": "컵 $2$개만큼입니다. 작은 그릇에는 $3$컵까지만 담기므로 $5$컵 중 나머지 $5-3=2$(컵)가 넘칩니다. 넘친 물의 양은 두 그릇의 들이의 차와 같습니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "컵 $2$개만큼",
          "$2$컵"
        ]
      },
      {
        "anyOf": [
          "작은 그릇에 담기는 $3$컵을 빼고 남은 물이 넘친다",
          "넘친 물의 양은 두 그릇의 들이의 차 $5-3$과 같다"
        ]
      }
    ],
    "bGoal": "넘친 물의 양이 두 그릇의 들이의 차임을 설명",
    "bReason": "두 그릇의 들이를 같은 컵으로 잰 값이라고 문장에 밝혀 두 들이의 차가 하나로 정해지게 함",
    "cDecision": "rewrite",
    "cAfter": "같은 컵으로 재었더니 큰 그릇의 들이는 컵 $5$개만큼, 빈 작은 그릇의 들이는 컵 $3$개만큼입니다. 큰 그릇에 가득 담은 물을 작은 그릇에 모두 부으면 컵 {$2$}개만큼의 물이 넘친다.",
    "cSlotEquivalents": [
      [
        "2"
      ]
    ],
    "cReason": "두 들이를 같은 컵으로 잰 값이라고 문장에 밝혀 넘친 양이 컵 2개만큼으로 정해지게 함. 두 들이의 차를 구하는 짧은 계산 빈칸은 보존함"
  },
  {
    "id": "e3-2-5-1-xc26",
    "inputProposalFingerprint": "c8760425e6eb01c757c451f8f646c9a38962c52063d99f99326fed7d17c3cc0d",
    "bDecision": "rewrite",
    "bPrompt": "실제 들이가 $500\\,\\mathrm{mL}$인 물병을 민지는 약 $400\\,\\mathrm{mL}$, 준호는 약 $550\\,\\mathrm{mL}$로 어림했습니다. 누가 더 잘 어림했는지 쓰고, 그 까닭을 쓰세요.",
    "bAnswer": "준호입니다. 실제 들이와의 차가 민지는 $100\\,\\mathrm{mL}$, 준호는 $50\\,\\mathrm{mL}$로 준호가 더 작기 때문입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "준호",
          "준호가 더 잘 어림했다"
        ]
      },
      {
        "anyOf": [
          "어림한 값과 실제 값 $500\\,\\mathrm{mL}$의 차가 민지는 $100\\,\\mathrm{mL}$, 준호는 $50\\,\\mathrm{mL}$로 준호가 더 작다",
          "준호의 어림값 $550\\,\\mathrm{mL}$가 실제 들이 $500\\,\\mathrm{mL}$에 더 가깝다",
          "어림한 값과 실제 값의 차가 더 작은 쪽이 더 잘 어림한 것이므로 준호이다"
        ]
      }
    ],
    "bGoal": "어림을 잘했는지 실제 값과의 차로 판단함을 설명",
    "bReason": "누가 더 잘 어림했는지 물었으므로 준호라는 선택을 기준에 넣고, 그 근거로 실제 값과의 차 비교 또는 가까움을 요구함"
  },
  {
    "id": "e3-2-5-2-xc6",
    "inputProposalFingerprint": "e54b35691dc4f66b10cd7566b6128a95312905f90009e61067e8d169ce300835",
    "cDecision": "rewrite",
    "cAfter": "$1\\,\\mathrm{L}=1000\\,\\mathrm{mL}$입니다. $2300\\,\\mathrm{mL}$는 $\\mathrm{L}$로 딱 떨어지지 않으므로 {$2$}$\\,\\mathrm{L}$ {$300$}$\\,\\mathrm{mL}$로 쓴다.",
    "cSlotEquivalents": [
      [
        "2"
      ],
      [
        "300"
      ]
    ],
    "cReason": "문장에 있는 수 1과 300을 그대로 복사하던 빈칸을 $\\mathrm{mL}$만으로 쓴 $2300$을 몇 $\\mathrm{L}$ 몇 $\\mathrm{mL}$로 바꾸는 실제 변환으로 고침. 첫 빈칸은 $\\mathrm{L}$의 수, 둘째 빈칸은 남는 $\\mathrm{mL}$의 수로 순서가 정해져 있고 답 값은 다른 곳에 공개되지 않음"
  },
  {
    "id": "e3-2-5-2-xc8",
    "inputProposalFingerprint": "45690328292107d4b3ed586256b660109f8cb5ceca1eae0fb0b79ba640ee1ef7",
    "learningRole": "procedure"
  },
  {
    "id": "e3-2-5-2-xc15",
    "inputProposalFingerprint": "498bb16731dcca8abf23a6b0cad192bceeb7bbb54a6148830c4a1ddf19663006",
    "bDecision": "rewrite",
    "bPrompt": "비커의 눈금 $0$부터 $100\\,\\mathrm{mL}$까지가 똑같이 $5$칸으로 나누어져 있습니다. 눈금 한 칸의 들이를 구하는 방법과 답을 쓰세요.",
    "bAnswer": "$100\\,\\mathrm{mL}$를 $5$칸으로 똑같이 나눕니다. $100\\div5=20$이므로 한 칸은 $20\\,\\mathrm{mL}$입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "$100\\,\\mathrm{mL}$를 $5$칸으로 똑같이 나눈다",
          "$100\\div5$를 계산한다",
          "전체 들이를 칸 수로 나누어 한 칸의 들이를 구한다",
          "한 칸의 들이를 $5$번 더하면 $100\\,\\mathrm{mL}$가 되는 수를 찾는다"
        ]
      },
      {
        "anyOf": [
          "한 칸은 $20\\,\\mathrm{mL}$이다",
          "$20\\,\\mathrm{mL}$"
        ]
      }
    ],
    "bGoal": "눈금 한 칸의 들이를 나눗셈으로 구하는 방법과 결과",
    "bReason": "질문에 이미 주어진 '똑같이 $5$칸' 조건을 필수로 되풀이하지 않고, 요청한 방법($100\\div5$ 또는 같은 뜻의 다른 방법)과 결과 $20\\,\\mathrm{mL}$만 기준에 남김"
  },
  {
    "id": "e3-2-5-2-xc17",
    "inputProposalFingerprint": "41ec6ae05dd4570e5304201942882b3cba74f29c15482bf9b0c212e8e52a970e",
    "bDecision": "rewrite",
    "bPrompt": "$2\\,\\mathrm{L}\\ 300\\,\\mathrm{mL}$와 $2\\,\\mathrm{L}\\ 700\\,\\mathrm{mL}$ 중 어느 쪽이 더 많은지 쓰고, 어떻게 비교했는지 설명하세요.",
    "bAnswer": "$2\\,\\mathrm{L}\\ 700\\,\\mathrm{mL}$가 더 많습니다. $\\mathrm{L}$의 수가 $2$로 같으므로 $\\mathrm{mL}$의 수를 비교하면 $700$이 $300$보다 크기 때문입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "$2\\,\\mathrm{L}\\ 700\\,\\mathrm{mL}$가 더 많다",
          "$2\\,\\mathrm{L}\\ 700\\,\\mathrm{mL}$"
        ]
      },
      {
        "anyOf": [
          "$\\mathrm{L}$의 수가 같으므로 $\\mathrm{mL}$의 수를 비교하고 $700$이 $300$보다 크다",
          "둘 다 $2\\,\\mathrm{L}$이므로 $\\mathrm{mL}$가 더 큰 쪽이 더 많다",
          "두 들이를 모두 $\\mathrm{mL}$로 바꾸어 $2700\\,\\mathrm{mL}$와 $2300\\,\\mathrm{mL}$를 비교한다"
        ]
      }
    ],
    "bGoal": "$\\mathrm{L}$가 같은 두 들이 중 더 많은 쪽과 비교 방법 설명",
    "bReason": "더 많은 쪽을 쓰라고 했으므로 $2\\,\\mathrm{L}\\ 700\\,\\mathrm{mL}$ 선택을 기준에 넣고, 같은 $\\mathrm{L}$에서 $\\mathrm{mL}$ 비교와 모두 $\\mathrm{mL}$로 바꾸어 비교하는 방법도 인정함"
  },
  {
    "id": "e3-2-5-2-xc21",
    "inputProposalFingerprint": "20f26c56f5544f01fcb07d28fb96d1a7fed6b939cb525fb3311e47167a11f76d",
    "bDecision": "rewrite",
    "bPrompt": "$1\\,\\mathrm{L}$보다 많고 $10\\,\\mathrm{L}$보다 적은 들이를 $\\mathrm{mL}$로만 나타냅니다. 이때 $\\mathrm{mL}$의 수가 소수나 분수 없이 딱 떨어지는 경우만 생각합니다. 이 수는 몇 자리 수인지 쓰고, 그 까닭을 설명하세요.",
    "bAnswer": "네 자리 수가 됩니다. $1\\,\\mathrm{L}=1000\\,\\mathrm{mL}$, $10\\,\\mathrm{L}=10000\\,\\mathrm{mL}$이므로 딱 떨어지는 $\\mathrm{mL}$의 수는 $1000$보다 크고 $10000$보다 작아 네 자리 수가 됩니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "네 자리 수",
          "$4$자리 수"
        ]
      },
      {
        "anyOf": [
          "$1\\,\\mathrm{L}$는 $1000\\,\\mathrm{mL}$, $10\\,\\mathrm{L}$는 $10000\\,\\mathrm{mL}$이므로 $1000$보다 크고 $10000$보다 작다",
          "$\\mathrm{mL}$의 수가 $1001$부터 $9999$까지의 수이므로 네 자리 수이다"
        ]
      }
    ],
    "bGoal": "$1\\,\\mathrm{L}$~$10\\,\\mathrm{L}$ 사이 들이를 $\\mathrm{mL}$로 쓴 수의 자릿수와 까닭 설명",
    "bReason": "$1000.5\\,\\mathrm{mL}$처럼 딱 떨어지지 않는 들이는 네 자리 수가 아니므로, $\\mathrm{mL}$의 수가 소수나 분수 없이 딱 떨어지는 경우로 조건을 한정함",
    "cDecision": "rewrite",
    "cAfter": "$1\\,\\mathrm{L}$보다 많고 $10\\,\\mathrm{L}$보다 적은 들이를 소수나 분수 없이 $\\mathrm{mL}$로만 쓰면 $1000$보다 크고 $10000$보다 작아 {네} 자리 수가 된다.",
    "cSlotEquivalents": [
      [
        "4"
      ]
    ],
    "cReason": "소수나 분수 없이 딱 떨어지는 $\\mathrm{mL}$의 수라는 조건을 넣어 '네 자리 수'가 항상 참이 되게 함. 빈칸은 자릿수 '네' 하나로 줄여 짧게 만듦"
  },
  {
    "id": "e3-2-5-3-xc3",
    "inputProposalFingerprint": "b24070669f1b64c1bffd2f3d3049e41c81446f4aae3203eae096529de02b49f9",
    "cDecision": "rewrite",
    "cAfter": "$2\\,\\mathrm{L}\\ 300\\,\\mathrm{mL}+1\\,\\mathrm{L}\\ 400\\,\\mathrm{mL}$를 세로로 줄을 맞추어 계산하면 $\\mathrm{L}$끼리 더한 수는 {$3$}이고 $\\mathrm{mL}$끼리 더한 수는 {$700$}이다.",
    "cSlotEquivalents": [
      [
        "3"
      ],
      [
        "700"
      ]
    ],
    "cReason": "'$\\mathrm{mL}$는 $\\mathrm{mL}$' 단어 복사 빈칸 대신, $\\mathrm{L}$끼리·$\\mathrm{mL}$끼리 줄을 맞추어 더한 실제 값을 구하게 고침. 첫 빈칸은 $\\mathrm{L}$끼리, 둘째 빈칸은 $\\mathrm{mL}$끼리의 합으로 순서가 정해져 있고 답 값은 다른 곳에 공개되지 않음"
  },
  {
    "id": "e3-2-5-3-xc8",
    "inputProposalFingerprint": "57805174549e5752558d08b2eedcbb31657b79a3bec8bec44d5bc14724332533",
    "learningRole": "reason",
    "bDecision": "rewrite",
    "bPrompt": "물의 양을 계산한 답을 '$500$'이라고만 쓰면 안 되는 까닭을 쓰세요.",
    "bAnswer": "$500\\,\\mathrm{L}$인지 $500\\,\\mathrm{mL}$인지 알 수 없기 때문입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "단위가 없으면 $\\mathrm{L}$인지 $\\mathrm{mL}$인지 알 수 없다",
          "$500$이 $500\\,\\mathrm{L}$인지 $500\\,\\mathrm{mL}$인지 구별할 수 없다",
          "단위가 없으면 물이 얼마만큼인지 정확히 알 수 없다"
        ]
      }
    ],
    "bGoal": "답에 단위를 붙여야 하는 까닭 설명",
    "bReason": "까닭만 물었으므로 단위를 몰라 $\\mathrm{L}$와 $\\mathrm{mL}$를 구별할 수 없다는 이유만 필수로 두고, 단위를 붙인다는 행동은 별도로 요구하지 않음. 질문이 까닭을 묻는 것이어서 역할을 reason으로 바꿈"
  },
  {
    "id": "e3-2-5-3-xc12",
    "inputProposalFingerprint": "85065a00937515e7d3b540efe9bc898692928a43eeb513311d389faab7d36f19",
    "bDecision": "rewrite",
    "bPrompt": "$3\\,\\mathrm{L}\\ 200\\,\\mathrm{mL}-1\\,\\mathrm{L}\\ 500\\,\\mathrm{mL}$에서 $200\\,\\mathrm{mL}$에서 $500\\,\\mathrm{mL}$를 뺄 수 없습니다. 이럴 때 어떻게 계산하면 되는지 한 가지 방법을 설명하고, 답을 쓰세요.",
    "bAnswer": "$3\\,\\mathrm{L}$ 중 $1\\,\\mathrm{L}$를 $1000\\,\\mathrm{mL}$로 바꾸어 $2\\,\\mathrm{L}\\ 1200\\,\\mathrm{mL}$로 만든 뒤 같은 단위끼리 뺍니다. 이때 $\\mathrm{L}$의 수는 $1$ 작아집니다. 답은 $1\\,\\mathrm{L}\\ 700\\,\\mathrm{mL}$입니다. 두 들이를 모두 $\\mathrm{mL}$로 바꾸어 $3200-1500=1700$으로 계산해도 됩니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "$3\\,\\mathrm{L}\\ 200\\,\\mathrm{mL}$에서 $1\\,\\mathrm{L}$를 $1000\\,\\mathrm{mL}$로 바꾸어 $2\\,\\mathrm{L}\\ 1200\\,\\mathrm{mL}$로 만든 뒤 같은 단위끼리 뺀다",
          "두 들이를 모두 $\\mathrm{mL}$로 바꾸어 $3200-1500$을 계산한다"
        ]
      },
      {
        "anyOf": [
          "$1\\,\\mathrm{L}\\ 700\\,\\mathrm{mL}$",
          "$1700\\,\\mathrm{mL}$"
        ]
      }
    ],
    "bGoal": "들이의 뺄셈에서 $\\mathrm{mL}$끼리 뺄 수 없을 때의 계산 방법 설명",
    "bReason": "모두 $\\mathrm{mL}$로 바꾸어 계산하는 방법도 옳으므로 '한 가지 방법'으로 범위를 정하고 두 방법을 각각 전체 풀이로 인정함. 필수는 방법과 답 두 가지만 둠"
  },
  {
    "id": "e3-2-5-3-xc25",
    "inputProposalFingerprint": "f944bb932fb4cffe1fe73cf2c9feeac8f7e42f5ff9d0860454cd616a34c4785e",
    "bDecision": "rewrite",
    "bPrompt": "$2\\,\\mathrm{L}\\ 800\\,\\mathrm{mL}+1\\,\\mathrm{L}\\ 300\\,\\mathrm{mL}$의 합을 어림하려고 합니다. 두 들이를 각각 가까운 몇 $\\mathrm{L}$로 바꾸어 더하는 방법으로 어림할 때, 가까운 $\\mathrm{L}$로 바꾸는 방법과 합이 약 몇 $\\mathrm{L}$인지 쓰세요.",
    "bAnswer": "각 들이가 어느 $\\mathrm{L}$에 더 가까운지 보고 바꿉니다. $2\\,\\mathrm{L}\\ 800\\,\\mathrm{mL}$는 약 $3\\,\\mathrm{L}$, $1\\,\\mathrm{L}\\ 300\\,\\mathrm{mL}$는 약 $1\\,\\mathrm{L}$로 보고 더하므로 합은 약 $4\\,\\mathrm{L}$입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "각 들이가 어느 $\\mathrm{L}$에 더 가까운지 보고 가까운 $\\mathrm{L}$로 바꾼다",
          "$\\mathrm{mL}$ 부분이 $500\\,\\mathrm{mL}$보다 많으면 $\\mathrm{L}$를 하나 올리고 적으면 그대로 두어 바꾼다",
          "$2\\,\\mathrm{L}\\ 800\\,\\mathrm{mL}$는 약 $3\\,\\mathrm{L}$, $1\\,\\mathrm{L}\\ 300\\,\\mathrm{mL}$는 약 $1\\,\\mathrm{L}$로 바꾼다"
        ]
      },
      {
        "anyOf": [
          "합은 약 $4\\,\\mathrm{L}$",
          "약 $4\\,\\mathrm{L}$"
        ]
      }
    ],
    "bGoal": "각 들이를 가까운 $\\mathrm{L}$로 바꾸어 더하는 합의 어림 방법 설명",
    "bReason": "합을 먼저 구해 어림하는 방법 등 다른 방법이 있으므로, 질문에서 '각각 가까운 몇 $\\mathrm{L}$로 바꾸어 더하는 방법'으로 범위를 정하고 그 방법과 결과를 요구함"
  },
  {
    "id": "e3-2-5-4-xc1",
    "inputProposalFingerprint": "1671b1ca5b8377ce2a049db30bcc232c3e4058f523d819973e9aaa4eb6d12788",
    "bDecision": "rewrite",
    "bPrompt": "저울 없이 두 물건의 무게를 비교하는 방법을 한 가지 쓰고, 어느 쪽이 더 무거운지 어떻게 아는지 설명하세요.",
    "bAnswer": "두 물건을 양손에 하나씩 들어 봅니다. 더 묵직하게(힘이 더 들게) 느껴지는 쪽이 더 무겁습니다. 한 손으로 두 물건을 번갈아 들어 비교해도 됩니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "두 물건을 양손에 하나씩 들어 보고 더 묵직하게(힘이 더 들게) 느껴지는 쪽이 더 무겁다",
          "한 손으로 두 물건을 번갈아 들어 보고 더 묵직하게(힘이 더 들게) 느껴지는 쪽이 더 무겁다",
          "시소나 막대의 양쪽 끝에 하나씩 올려 아래로 내려가는 쪽이 더 무겁다"
        ]
      }
    ],
    "bGoal": "저울 없이 무게를 비교하는 방법과 판단 기준 설명",
    "bReason": "방법을 한 가지만 묻고 방법에 따라 판단 기준도 달라지므로, 양손·한 손으로 번갈아 들기·시소를 각각 전체 풀이로 독립 인정함"
  },
  {
    "id": "e3-2-5-4-xc5",
    "inputProposalFingerprint": "1162725c0cf973d2059d8f7f31c3d6f6e466aac459547686bc12aa7f9814da8a",
    "bDecision": "rewrite",
    "bPrompt": "무게가 모두 같은 추와 양팔저울이 있습니다. 지우개의 무게가 추 몇 개의 무게와 꼭 같아서 저울이 수평이 되는 경우, 지우개의 무게를 '추 몇 개'로 나타내는 방법을 설명하세요.",
    "bAnswer": "한쪽 접시에 지우개를 놓고 다른 쪽 접시에 추를 하나씩 올립니다. 저울이 수평이 되었을 때 올린 추의 개수로 지우개의 무게를 말합니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "지우개를 한쪽 접시에 놓고 다른 쪽 접시에 추를 올린다",
          "지우개와 추를 양팔저울의 양쪽 접시에 나누어 올린다"
        ]
      },
      {
        "anyOf": [
          "저울이 수평이 될 때 올린 추의 개수로 지우개의 무게를 말한다",
          "저울이 수평이 되면 지우개의 무게는 올린 추 몇 개의 무게와 같다"
        ]
      }
    ],
    "bGoal": "같은 추의 개수로 무게를 나타내는 방법 설명",
    "bReason": "추 몇 개로 정확히 수평이 되는 지우개라는 조건을 문장에 넣어, 추의 개수로 무게를 말할 수 있는 경우로 응답 범위를 정함"
  },
  {
    "id": "e3-2-5-4-xc9",
    "inputProposalFingerprint": "e1fd4461c4d83312dcb2b2a3d500a62f699d34aed5dd99a022a5b51045ab8673",
    "bDecision": "exclude",
    "bPrompt": null,
    "bAnswer": null,
    "bRequiredIdeas": [],
    "bGoal": "없음(비교하는 말 한 쌍)",
    "bReason": "'더 무겁다/더 가볍다'라는 낱말 짝 하나를 떠올리는 내용",
    "exclusionReason": "'더 무겁다/더 가볍다'라는 말 한 쌍만 아는지 확인하는 내용이라 설명할 방법이나 이유가 없어 B로 만들 수 없음. 이 항목의 C도 제외하므로 대응하는 다른 ID는 알려진 것이 없음",
    "cDecision": "exclude",
    "cAfter": null,
    "cSlotEquivalents": [],
    "cReason": "'무겁다'의 반대말 '가볍다' 낱말 하나만 복원하는 빈칸이라 실제 두 물건의 무게 관계를 확인하지 못해 이점이 낮음"
  },
  {
    "id": "e3-2-5-4-xc17",
    "inputProposalFingerprint": "969969d2ee17129d5fc2f720c4b2424c509b3c175d330fd45ec7106b49bdb12a",
    "bDecision": "rewrite",
    "bPrompt": "양팔저울에 두 물건을 올렸더니 한쪽으로 기울었습니다. 무게가 같은 추 몇 개를 한쪽 접시에 더 올리면 저울이 정확히 수평이 되는 경우, 추를 사용하여 두 물건의 무게 차를 알아내는 방법을 설명하세요.",
    "bAnswer": "가벼운(올라간) 쪽 접시에 추를 하나씩 올립니다. 저울이 수평이 되었을 때 더 올린 추의 개수만큼의 무게가 두 물건의 무게 차입니다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "가벼운(올라간) 쪽 접시에 추를 하나씩 더 올린다"
        ]
      },
      {
        "anyOf": [
          "저울이 수평이 될 때 더 올린 추의 개수만큼의 무게가 무게 차이다",
          "수평이 되면 두 물건의 무게 차는 더 올린 추 몇 개의 무게와 같다"
        ]
      }
    ],
    "bGoal": "추를 더 얹어 두 물건의 무게 차를 아는 방법 설명",
    "bReason": "더 올린 같은 추 몇 개로 정확히 수평이 되는 경우라는 조건을 문장에 넣어, 남는 작은 차이가 있는 경우와 구별하고 무게 차가 추 개수로 정해지게 함"
  },
  {
    "id": "e3-2-5-4-xc18",
    "inputProposalFingerprint": "b0ded3163557c6542d5ceae6097a262735b35bf1174d5338498de55f763b4104",
    "cDecision": "rewrite",
    "cAfter": "무게를 아는 설탕 한 봉지가 $2\\,\\mathrm{kg}$일 때, 수박을 들어 보니 설탕 $3$봉지와 비슷하게 느껴지면 수박의 무게는 약 {$6$}$\\,\\mathrm{kg}$으로 어림한다.",
    "cSlotEquivalents": [
      [
        "6"
      ]
    ],
    "cReason": "'아는'이라는 낱말 복원 빈칸은 실제 무게 어림을 확인하지 못해, 기준이 되는 물건의 무게와 비교 결과를 주고 수박의 무게를 어림하는 짧은 계산 빈칸으로 바꿈. 답 $6$은 다른 곳에 공개되지 않고 입력 수 $2$, $3$과 다른 값임"
  },
  {
    "id": "e3-2-5-5-xc4",
    "inputProposalFingerprint": "cf47654363a37902ae5073dbd7a0f061f5d263a7fa6acfddebce842e84ee1713",
    "cDecision": "rewrite",
    "cAfter": "$1\\,\\mathrm{kg}=1000\\,\\mathrm{g}$입니다. $2500\\,\\mathrm{g}$은 $\\mathrm{kg}$으로 딱 떨어지지 않으므로 {$2$}$\\,\\mathrm{kg}$ {$500$}$\\,\\mathrm{g}$으로 쓴다.",
    "cSlotEquivalents": [
      [
        "2"
      ],
      [
        "500"
      ]
    ],
    "cReason": "문장에 있는 수 1과 500을 그대로 복사하던 빈칸을 $\\mathrm{g}$만으로 쓴 $2500$을 몇 $\\mathrm{kg}$ 몇 $\\mathrm{g}$으로 바꾸는 실제 변환으로 고침. 첫 빈칸은 $\\mathrm{kg}$의 수, 둘째 빈칸은 남는 $\\mathrm{g}$의 수로 순서가 정해져 있고 답 값은 다른 곳에 공개되지 않음"
  },
  {
    "id": "e3-2-5-5-xc6",
    "inputProposalFingerprint": "039f3fcb01e4c78811c06ac9e4b08850c6493b2db8de3c91ce1697fb7de6b0a0",
    "cDecision": "rewrite",
    "cAfter": "바둑돌 한 개와 클립 한 개의 무게가 서로 다릅니다. 같은 물건을 바둑돌 개수와 클립 개수로 각각 꼭 맞게 잴 때 두 개수는 서로 {다르다}. 그래서 누구나 같이 쓰는 단위 $\\mathrm{kg}$과 $\\mathrm{g}$으로 무게를 나타낸다.",
    "cSlotEquivalents": [
      [
        "달라진다",
        "같지 않다"
      ]
    ],
    "cReason": "바둑돌·클립 이름만으로 개수가 항상 다르다고 단정하지 않도록, 한 개의 무게가 서로 다르고 남김없이 꼭 맞게 잰다는 조건을 문장에 넣어 '다르다'가 참이 되게 함. '같다/다르다' 판단 빈칸은 보존함"
  }
]