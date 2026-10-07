[
  {
    "id": "e3-1-5-1-xc3",
    "inputProposalFingerprint": "8d05b41b49e554cd2c5151b09d7079f882a04220a54ea99d9017b7662293894a",
    "bDecision": "rewrite",
    "bPrompt": "한쪽 끝을 $0$에 맞춘 자가 있고, 작은 눈금 한 칸은 $1\\,\\mathrm{mm}$입니다. 어떤 길이를 $5\\,\\mathrm{cm}\\ 3\\,\\mathrm{mm}$라고 썼습니다. 이 길이는 자의 눈금에서 어디까지 잰 길이인지, $5$와 $3$이 각각 무엇을 세는 수인지 설명해 보세요.",
    "bAnswer": "$0$에서 시작하여 $5\\,\\mathrm{cm}$ 눈금까지 가고, 거기서 작은 눈금 $3$칸을 더 간 곳까지의 길이이다. $5$는 $\\mathrm{cm}$의 수이고, $3$은 $5\\,\\mathrm{cm}$를 넘어 더 간 작은 눈금 칸 수(곧 $\\mathrm{mm}$의 수)이다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "$5$cm 눈금에서 작은 눈금 $3$칸 더 간 곳까지의 길이",
          "$5$cm보다 $3$mm 더 긴 길이"
        ]
      },
      {
        "anyOf": [
          "$5$는 cm의 수",
          "$5$는 $\\mathrm{cm}$가 몇 개인지 나타내는 수"
        ]
      },
      {
        "anyOf": [
          "$3$은 $5$cm를 넘은 작은 눈금 칸 수",
          "$3$은 $5$cm보다 더 긴 mm의 수",
          "$3$은 $3$mm를 나타내는 수"
        ]
      }
    ],
    "bGoal": "자 눈금에서 몇 cm 몇 mm 표기의 두 수가 각각 무엇을 뜻하는지 설명",
    "bReason": "한쪽 끝이 0이고 작은 눈금 한 칸이 1mm라는 조건을 질문에 명시하여 그림 없이도 5와 3의 뜻을 눈금 위치로 설명하게 함",
    "cDecision": "rewrite",
    "cAfter": "한쪽 끝을 $0$에 맞춘 자에서 작은 눈금 한 칸은 $1\\,\\mathrm{mm}$이다. $5\\,\\mathrm{cm}$ 눈금을 지나 작은 눈금 $3$칸을 더 간 길이는 $5\\,\\mathrm{cm}$ {$3$}$\\,\\mathrm{mm}$이다.",
    "cSlotEquivalents": [[]],
    "cReason": "작은 눈금 한 칸이 1mm라는 조건을 문장에 명시하여 칸 수가 mm의 수로 바뀌는 관계를 그림 없이 확인하게 함"
  },
  {
    "id": "e3-1-5-1-xc11",
    "inputProposalFingerprint": "15ce65b847057ef42b7ec51ed4c776e02787241ea227a9b1b4daea3bc806ca28",
    "cDecision": "rewrite",
    "cAfter": "$10\\,\\mathrm{mm}$는 $1\\,\\mathrm{cm}$이므로 $63\\,\\mathrm{mm}$는 {$6$}$\\,\\mathrm{cm}$ {$3$}$\\,\\mathrm{mm}$이다.",
    "cSlotEquivalents": [[], []],
    "cReason": "여섯 묶음과 남은 3을 미리 보여 주던 문장을 없애고, 10mm=1cm만 주어 63mm를 직접 cm와 mm로 바꾸게 하여 단순 복사를 줄임"
  },
  {
    "id": "e3-1-5-1-xc13",
    "inputProposalFingerprint": "85d5aa7a5469053ff74887e32f22a3e39d1555f7e927077e5b77d0fd26db7ff6",
    "bDecision": "rewrite",
    "bPrompt": "손톱의 폭은 $1\\,\\mathrm{cm}$보다 조금 짧습니다. 이 길이를 '약 $8\\,\\mathrm{cm}$'와 '약 $8\\,\\mathrm{mm}$' 중 어느 것으로 어림해야 알맞은지 고르고, 까닭을 설명해 보세요.",
    "bAnswer": "약 $8\\,\\mathrm{mm}$이다. $1\\,\\mathrm{cm}$는 $10\\,\\mathrm{mm}$이므로 그보다 조금 짧은 길이는 $\\mathrm{mm}$ 단위로 어림하는 것이 알맞고, $8\\,\\mathrm{cm}$는 $1\\,\\mathrm{cm}$보다 훨씬 길기 때문이다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "약 $8$mm",
          "약 $8$ 밀리미터"
        ]
      },
      {
        "anyOf": [
          "$1$cm는 $10$mm라서 조금 짧으면 $8$mm쯤이다",
          "$8$cm는 $1$cm보다 훨씬 길어서 알맞지 않다",
          "$1$cm보다 짧은 길이는 mm 단위로 나타내는 것이 알맞다"
        ]
      }
    ],
    "bGoal": "1cm보다 짧은 길이를 mm 단위로 어림하는 까닭 설명",
    "bReason": "선택은 8mm 하나로 확인하고, 까닭은 단위 비교로 충분한 서로 다른 설명 중 하나만 있으면 인정하도록 필수를 한 묶음의 대안으로 합침"
  },
  {
    "id": "e3-1-5-2-xc1",
    "inputProposalFingerprint": "3474a4ef24633ba3179b5866846124461ae8c52f0c1645061fba4eaf1acceb55",
    "cDecision": "keep",
    "cSlotEquivalents": [
      [
        "일 킬로미터",
        "1킬로미터",
        "일킬로미터"
      ]
    ],
    "cReason": "원본 C 문장은 그대로 두고, 같은 읽기인 숫자 표기와 한글 수 표기를 모두 인정하도록 슬롯의 대체 답만 보완함"
  },
  {
    "id": "e3-1-5-2-xc2",
    "inputProposalFingerprint": "f772ac913fb4c7aeef92a1bd728b7c81b80c3c3d61fddbc9513f4659ec528892",
    "cDecision": "rewrite",
    "cAfter": "$1\\,\\mathrm{km}$는 $1000\\,\\mathrm{m}$이므로 $2\\,\\mathrm{km}\\ 300\\,\\mathrm{m}$는 모두 {$2300$}$\\,\\mathrm{m}$이다.",
    "cSlotEquivalents": [
      [
        "2,300"
      ]
    ],
    "cReason": "이미 준 300m를 그대로 다시 쓰던 빈칸 대신, 복합 표기를 m 하나로 바꾸는 계산을 묻는 짧은 빈칸으로 바꿈"
  },
  {
    "id": "e3-1-5-2-xc11",
    "inputProposalFingerprint": "256e175a62e243e1f2bc6a2397dda55b22a1bdf67178f5769a912baa1d6d2dec",
    "cDecision": "rewrite",
    "cAfter": "$1000\\,\\mathrm{m}$는 $1\\,\\mathrm{km}$이므로 $2700\\,\\mathrm{m}$는 {$2$}$\\,\\mathrm{km}$ {$700$}$\\,\\mathrm{m}$이다.",
    "cSlotEquivalents": [[], []],
    "cReason": "2묶음과 700m를 미리 알려 주던 문장을 없애고, 1000m=1km만 주어 2700m를 직접 km와 m로 바꾸게 하여 복사를 줄임"
  },
  {
    "id": "e3-1-5-3-xc2",
    "inputProposalFingerprint": "949e0701c5024cc8f5fc76595e1083e5fcc46fa462232975dc11c3c34f4da720",
    "cDecision": "exclude",
    "cAfter": null,
    "cSlotEquivalents": [],
    "cReason": "빈칸이 '몸'이라는 낱말 복원에 그쳐 이점이 낮고, 걸음이나 뼘을 기준으로 직접 계산하는 C는 e3-1-5-3-xc8의 한 걸음 약 50cm로 10걸음 문항과 같은 내용이라 반복됨"
  },
  {
    "id": "e3-1-5-3-xc7",
    "inputProposalFingerprint": "ceaa10251b3c77887a7e9e467e97210caefcf1f91632157e540350f8b571b946",
    "cDecision": "rewrite",
    "cAfter": "내 손가락 한 마디의 폭을 재니 약 $1\\,\\mathrm{cm}$였다. 이 한 마디를 풀의 길이에 대어 보니 $9$번쯤 들어갔으므로 풀의 길이는 약 {$9$}$\\,\\mathrm{cm}$이다.",
    "cSlotEquivalents": [[]],
    "cReason": "손가락 폭이 사람마다 다르므로 모든 학생에게 같은 값을 외우게 하지 않고, 폭을 약 1cm로 잰 사례를 조건으로 주어 그 기준으로 길이를 어림하게 함. 들어간 횟수가 cm로 바뀌는 관계를 묻는다"
  },
  {
    "id": "e3-1-5-3-xc9",
    "inputProposalFingerprint": "aea0ba82db4061f0271ac3bd7c1b8a63cb9ad919b1767d5e330a1105bef1643c",
    "bDecision": "rewrite",
    "bPrompt": "어림한 길이를 쓸 때 '약 $3\\,\\mathrm{m}$'처럼 수 앞에 '약'을 붙이는 까닭을 설명해 보세요.",
    "bAnswer": "어림한 길이는 자로 잰 길이와 꼭 같지 않을 수 있어서, 정확한 값이 아니라 어림한 값임을 알리기 위해서이다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "어림한 길이는 잰 길이와 꼭 같지 않을 수 있다",
          "정확한 값이 아니라 어림한 값임을 알리려고",
          "어림한 값이라는 것을 나타내려고"
        ]
      }
    ],
    "bGoal": "'약'을 붙이는 까닭 설명",
    "bReason": "같은 한 가지 까닭을 다르게 말한 설명을 서로 다른 필수 두 개로 나누어 요구하던 것을 하나의 필수에 대안으로 합침",
    "cDecision": "rewrite",
    "cAfter": "어림한 길이는 잰 길이와 꼭 같지 않을 수 있으므로 수 앞에 {약}을 붙여 쓴다.",
    "cSlotEquivalents": [[]],
    "cReason": "어림한 값이 우연히 잰 값과 같을 수도 있으므로 '꼭 같지 않으므로'를 '꼭 같지 않을 수 있으므로'로 고쳐 수학적으로 정확하게 함"
  },
  {
    "id": "e3-1-5-3-xc14",
    "inputProposalFingerprint": "40c7ee37012381df8d33e45483ea9cfd9a2ca8182340027f8c651b8930c45055",
    "bDecision": "rewrite",
    "bPrompt": "줄자로 잰 길이가 $1\\,\\mathrm{m}\\ 98\\,\\mathrm{cm}$일 때 이것을 '약 $2\\,\\mathrm{m}$'라고 말해도 되는 까닭을 설명해 보세요.",
    "bAnswer": "$1\\,\\mathrm{m}\\ 98\\,\\mathrm{cm}$는 $2\\,\\mathrm{m}$보다 $2\\,\\mathrm{cm}$만 짧아 $2\\,\\mathrm{m}$에 아주 가깝기 때문이다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "$2$m에 가깝다",
          "$200$cm에 가깝다",
          "$2$m보다 $2$cm만 짧다",
          "거의 $2$m이다"
        ]
      }
    ],
    "bGoal": "잰 길이를 가까운 길이로 나타내어 말해도 되는 까닭 설명",
    "bReason": "묻는 것은 약 2m라고 말해도 되는 까닭이므로 2m에 가깝다는 하나의 설명이면 충분하다고 보고, 묻지 않은 '약을 붙이는 규칙'을 별도 필수로 요구하지 않음"
  },
  {
    "id": "e3-1-5-3-xc23",
    "inputProposalFingerprint": "57542f3f07764467da6121b9021f3295e67e5a01ce112232f0165f99b0205a79",
    "bDecision": "rewrite",
    "bPrompt": "약 $2000\\,\\mathrm{m}$인 거리를 약 $2\\,\\mathrm{km}$라고 바꾸어 말하면 좋은 까닭을 설명해 보세요.",
    "bAnswer": "$\\mathrm{km}$로 말하면 수가 $2000$에서 $2$로 작아져서 읽고 알기 쉽기 때문이다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "수가 작아져 알기 쉽다",
          "$2000$보다 $2$가 읽고 쓰기 쉽다",
          "큰 단위로 말하면 수가 작아 편하다"
        ]
      }
    ],
    "bGoal": "먼 거리를 큰 단위로 바꾸어 말하는 까닭 설명",
    "bReason": "질문에 이미 두 거리가 함께 주어져 있으므로 '같은 거리'를 다시 쓰게 하지 않고, 묻는 핵심인 수가 작아져 알기 쉽다는 까닭만 필수로 요구함"
  },
  {
    "id": "e3-1-5-3-xc27",
    "inputProposalFingerprint": "c270368f0092aae0f3f1f88686a2b31a39b308fe7366a8aa4d60cf5c75f69845",
    "bDecision": "rewrite",
    "bPrompt": "옷감을 사서 커튼을 만들 때처럼 길이가 꼭 맞아야 할 때에는 어림한 길이를 쓰면 안 되는 까닭을 설명해 보세요.",
    "bAnswer": "어림한 길이는 실제 길이와 다를 수 있어서 옷감이 모자라거나 남을 수 있기 때문이다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "어림한 길이는 실제 길이와 다를 수 있다",
          "어림하면 옷감이 모자라거나 남을 수 있다",
          "어림한 길이는 정확하지 않아 꼭 맞지 않을 수 있다"
        ]
      }
    ],
    "bGoal": "꼭 맞아야 할 때 어림한 길이를 쓰면 안 되는 까닭 설명",
    "bReason": "질문은 어림을 쓰면 안 되는 까닭을 묻는 것이므로 실제와 달라 모자라거나 남을 수 있다는 까닭이면 충분하고, 묻지 않은 '자로 재라'는 행동을 필수로 요구하지 않음"
  },
  {
    "id": "e3-1-5-4-xc1",
    "inputProposalFingerprint": "3ba651d342691bc8b05d0dbe218c4a98b2c585add39a8aca027b7e43e70bb2bb",
    "bDecision": "rewrite",
    "bPrompt": "시계에는 시침, 분침, 초침이 있습니다. 초침이 다른 두 바늘과 다른 점을 바늘이 도는 빠르기에 대해 설명해 보세요.",
    "bAnswer": "초침은 세 바늘 중 가장 빠르게 돌아서 $1$분에 한 바퀴를 돈다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "세 바늘 중 가장 빠르게 돈다",
          "$1$분에 한 바퀴를 돈다",
          "$1$초에 작은 눈금 한 칸씩 간다"
        ]
      }
    ],
    "bGoal": "초침이 도는 빠르기로 다른 바늘과 구별되는 점 설명",
    "bReason": "시계마다 달라질 수 있는 가늘기 같은 생김새 대신, 모든 시계에서 같은 움직이는 빠르기를 기준으로 삼음",
    "cDecision": "rewrite",
    "cAfter": "시계에서 $1$초에 작은 눈금 한 칸씩 가서 $1$분에 한 바퀴를 도는 바늘을 {초침}이라 한다.",
    "cSlotEquivalents": [
      [
        "초바늘"
      ]
    ],
    "cReason": "시계마다 다를 수 있는 '가장 가늘다'는 단정을 빼고, 1초마다 작은 눈금 한 칸이라는 일반적인 초침의 뜻으로 고침"
  },
  {
    "id": "e3-1-5-4-xc3",
    "inputProposalFingerprint": "a9de531c45f307d5e404ea3427f4dd80a5f6ac31ce1b1fc612b9d62c714d201f",
    "cDecision": "exclude",
    "cAfter": null,
    "cSlotEquivalents": [],
    "cReason": "'하나' 하고 말하는 시간은 사람마다 다르므로 항상 1초로 채점하는 빈칸은 근거가 약하고, 단위 하나를 쓰는 낮은 이점뿐이라 제외함"
  },
  {
    "id": "e3-1-5-4-xc7",
    "inputProposalFingerprint": "3797ba3613eecf9e4da76fc662dd08bca9575fdad119f7266634680deecfc925",
    "cDecision": "rewrite",
    "cAfter": "$1$분은 $60$초이므로 $1$분 $30$초는 모두 {$90$}초이다.",
    "cSlotEquivalents": [[]],
    "cReason": "이미 주어진 30초를 그대로 다시 쓰던 빈칸 대신, 분과 초의 복합 표기를 초 하나로 바꾸는 계산을 묻는 짧은 빈칸으로 바꿈"
  },
  {
    "id": "e3-1-5-4-xc15",
    "inputProposalFingerprint": "b45b1e3b645d6c6d78fb89757b626b95faa48fd64368ab5d3bf2372e0193e2e9",
    "cDecision": "rewrite",
    "cAfter": "$60$초는 $1$분이므로 $90$초는 {$1$}분 {$30$}초이다.",
    "cSlotEquivalents": [[], []],
    "cReason": "남은 30초를 미리 보여 주던 문장을 없애고, 60초=1분만 주어 90초를 직접 분과 초로 바꾸게 하여 복사를 줄임"
  },
  {
    "id": "e3-1-5-4-xc24",
    "inputProposalFingerprint": "410bcd085d81a2a776568bf164a264ffa1b3faee09006a339712a69ae63fb7f9",
    "bDecision": "rewrite",
    "bPrompt": "$50\\,\\mathrm{m}$를 달리는 데 지호는 $11$초, 수아는 $9$초 걸렸습니다. 누가 더 빨리 달렸는지 쓰고, 까닭을 설명해 보세요.",
    "bAnswer": "수아이다. 같은 $50\\,\\mathrm{m}$를 달리는 데 수아가 더 짧은 시간($9$초)이 걸렸기 때문이다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "수아",
          "수아가 더 빨리 달렸다"
        ]
      },
      {
        "anyOf": [
          "걸린 시간이 더 짧다",
          "$9$초가 $11$초보다 짧다",
          "시간이 짧을수록 빠르다"
        ]
      }
    ],
    "bGoal": "달리기 기록으로 빠르기를 판단하는 기준 설명",
    "bReason": "질문에 같은 50m가 이미 주어져 있으므로 '같은 거리'를 다시 쓰게 하지 않고, 누구인지와 걸린 시간이 더 짧다는 까닭만 필수로 요구함"
  },
  {
    "id": "e3-1-5-5-xc11",
    "inputProposalFingerprint": "21f38bb9a5b359ca963985b7f677f0b67541c75e6bf5811af9900dd53149b929",
    "cDecision": "rewrite",
    "cAfter": "$50$분과 $20$분을 더한 $70$분에서 $60$분을 시간으로 바꾸면 $70$분은 {$1$}시간 {$10$}분이다.",
    "cSlotEquivalents": [[], []],
    "cReason": "바로 앞에 '1시간'이 드러나 첫 빈칸이 복사가 되던 문장을 고쳐, 60분을 시간으로 바꾼다는 조작만 주고 70분을 직접 시간과 분으로 바꾸게 함"
  },
  {
    "id": "e3-1-5-5-xc15",
    "inputProposalFingerprint": "99d17febce9672f50eb90f4697a95208e5bf93b3ccaca29fe0aa375f501c4a8c",
    "coreAfter": "시각에 시간을 더해 분이 $60$분이거나 $60$분보다 많아지면 $60$분을 시간으로 바꾸는데, $60$분마다 시각이 {$1$}시간씩 더 지나간다.",
    "coreReason": "분이 60 이상이면 무조건 다음 시로 한 번만 바뀐다는 단정은 합이 120분 이상일 때 틀리므로, 원래 표적인 60분=1시간 교환을 보존하고 60분마다 한 시간씩 지나간다고 범위를 분명히 함"
  },
  {
    "id": "e3-1-5-6-xc6",
    "inputProposalFingerprint": "7ebd54a240e619f554a5bf05a718d74eb3167b880f20578890b087fe47510c12",
    "bDecision": "rewrite",
    "bPrompt": "같은 날 오후 $2$시와 오후 $5$시가 있습니다. 늦은 시각 $5$시에서 앞선 시각 $2$시를 빼어 $3$이 나왔습니다. 이 $3$은 '$3$시'인지 '$3$시간'인지 쓰고, 그 까닭을 설명해 보세요.",
    "bAnswer": "$3$시간이다. 오후 $2$시부터 오후 $5$시까지 흐른 시간의 길이를 나타내기 때문이다.",
    "bRequiredIdeas": [
      {
        "anyOf": [
          "$3$시간이다"
        ]
      },
      {
        "anyOf": [
          "두 시각 사이에 흐른 시간이다",
          "$2$시부터 $5$시까지 지난 시간의 길이이다",
          "시각이 아니라 시간의 길이를 나타낸다"
        ]
      }
    ],
    "bGoal": "같은 날 같은 낮 동안의 두 시각을 뺀 결과가 두 시각 사이의 시간임을 설명",
    "bReason": "같은 날 오후라는 범위와 늦은 시각에서 앞선 시각을 뺀다는 조건을 명시하여 날짜나 오전·오후에 따른 다른 해석이 생기지 않게 함",
    "cDecision": "rewrite",
    "cAfter": "같은 날 오전 또는 오후 안에서 두 시각을 고를 때, 늦은 시각에서 앞선 시각을 빼면 두 시각 사이의 {시간}이 된다.",
    "cSlotEquivalents": [
      [
        "걸린 시간"
      ]
    ],
    "cReason": "같은 날 오전 또는 오후 안이라는 범위와 늦은 시각에서 앞선 시각을 뺀다는 조건을 문장에 넣어 뜻을 분명히 함"
  }
]