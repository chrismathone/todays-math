제공 순서 모든 ID에 대해 JSON 배열만 출력한다. 각 행은 수정 패치 {id,inputProposalFingerprint,변경하는필드들}이다. id와 현재 지문 해시는 필수이고 바뀌지 않은 필드는 복사하지 않는다. 직접 독자의 B/C 지적을 실제 문장과 채점 기준의 수정으로 해소하라. 지적이 수학적으로 틀렸으면 변경 대신 repairDisagreement에 이유와 실제 올바른 수학을 써라. 코멘트나 카운트만 고쳐서 문제를 해결했다고 하지 마라.
B를 바꾸면 bDecision,bPrompt,bAnswer,bRequiredIdeas,bGoal,bReason을 함께 완성한다. bDecision은 rewrite/exclude. exclude는 bPrompt,bAnswer null, bRequiredIdeas [], exclusionReason에 B만 제외하는 구체 이유와 알려진 실제 대응 ID를 기록한다. 초등에 익숙한 이름의 정의 질문은 가능하지만 제목 하나+설명하시오, 답 하나 대기, 의미 없는 이유 묻기는 금지한다. 설명 목표·조건·대상·응답 범위를 명시하고 질문에 예상 답은 넣지 않는다. 구체적 계산은 일반 방법·뜻·관계도 확인한다. requiredIdeas=[{anyOf:['한 가지 필수 의미의 유효한 표현', '그 의미를 만족하는 별도의 다른 방법']}]; 꼭 요청한 것만 필수다. 결과·식·방법·조건을 쓰라고 했으면 실제로 기준에 담고 묻지 않았으면 강제하지 않는다. 단순한 입력 되풀이를 설명으로 받지 않는다. 서로 다른 올바른 풀이의 필수 단계를 AND로 섞지 말고 전체 대체 풀이를 독립 anyOf 문자열로 적는다. 특정 예시만을 정답으로 강제하지 않는다. 역할을 바꾸면 learningRole=definition/procedure/reason/application/naming 중 실제 질문에 맞게 적는다.
C를 바꾸면 cDecision,cAfter,cSlotEquivalents,cReason을 함께 적는다. rewrite의 cAfter는 정답 부분을 {답}으로 표시한 실제 완성 학생 문장이고 1~4슬롯이다. 짧고 유용한 비교·계산 빈칸을 보존한다. 실제 대상 없이 긴 키워드를 복원하거나 부사만 채우게 하지 않는다. 빈칸과 같은 값을 다른 곳에서 공개하지 않는다. 입력의 수가 바뀐 역할에서 다시 답인 유용한 관계(몫 검산, 같은 거리 등)는 무조건 복사로 취급하지 않는다. 순서 없는 두 답은 같은 말을 두 번 써도 통과하는 슬롯별 대안으로 해결하지 말고 순서를 명시하거나 한 빈칸으로 줄인다. cSlotEquivalents는 각 슬롯의 대체 답 배열로서 수·읽기·단위·자리·횟수의 역할을 구별하되 그 문장에서 옳은 서로 다른 답은 허용한다. cDecision=keep은 원본 C 그대로 고정이므로 새 문장을 주지 않는다. exclude는 해당 C의 구체적인 낮은 이점 또는 반복 이유를 cReason으로 기록하고 cAfter=null, cSlotEquivalents=[]로 쓴다. 별도 remove:['cAfter','cSlotEquivalents'] 등으로 이전 필드 제거를 요청할 수 있다.
일반 학습 설명 A/SRS는 C와 별개다. coreAfter를 고칠 때는 실제 수학 오류나 빠진 조건을 고칠 때만이며 원래 표적과 일반 뜻을 보존한다. coreReason을 함께 기록한다. coreAfter도 {답} 1~4개, 보이는 전체 길이 8~160자로 만든다. C를 고쳤다는 이유로 A를 자동 대체하지 않는다.
숫자·수학 기호는 $...$ KaTeX, 곱은 	imes, 나눗셈은 div, 계산 내 빈칸 기호는 square이며 표시용 {답}과 LaTex의 중괄호를 혼동하지 않는다. 모든 조사·괄호·수식이 학생에게 실제로 읽혀야 한다. 쉬운 학년 말로 쓰고 새로운 이름이나 낯선 문자 변수를 만들지 않는다. 그림이 필요한 현재 질문은 실제 위치·수·이름을 텍스트에 제시하여 자립시키거나 그 form만 제외한다. 꼭 필요한 새 그림·조작 사례는 exampleNeeded에 무엇인지 적되 없는 그림을 이미 있는 것처럼 참조하지 않는다.
최종 승인·자동 테스트 pass·실제 독자가 재독했다는 말은 출력하지 않는다. 우리는 이 후보를 나중에 직접 읽고 원본과 확인한다. 다음 자료의 모든 ID를 빠짐없이 처리하라.

[
  {
    "id": "e3-1-5-1-xc3",
    "sourceIndex": 714,
    "grade": "e3",
    "source": {
      "sourceIndex": 714,
      "sourceFingerprint": "2e7e31877da637b3b10de73f0db08aeb9a57481e313130639c43aae1c60c8a9b",
      "part": "e3plus",
      "id": "e3-1-5-1-xc3",
      "section": "초3::1-5 길이와 시간::1-5-1 1cm보다 작은 단위",
      "term": "몇 $\\mathrm{cm}$ 몇 $\\mathrm{mm}$로 쓰기",
      "kind": "방법",
      "level": "하",
      "definition": "$\\mathrm{cm}$ 눈금에서 작은 눈금 몇 칸을 더 간 길이는 {몇 $\\mathrm{cm}$ 몇 $\\mathrm{mm}$}로 쓴다.",
      "example": {
        "prompt": "$5\\,\\mathrm{cm}\\ 3\\,\\mathrm{mm}$에서 $3$이 세는 것은?",
        "answer": "$5\\,\\mathrm{cm}$를 넘은 작은 눈금 칸 수"
      },
      "studentC": "$\\mathrm{cm}$ 눈금에서 작은 눈금 몇 칸을 더 간 길이는 □로 쓴다.",
      "answers": [
        "몇 $\\mathrm{cm}$ 몇 $\\mathrm{mm}$"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-1-xc3",
      "proposalFingerprint": "8d05b41b49e554cd2c5151b09d7079f882a04220a54ea99d9017b7662293894a",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$5\\,\\mathrm{cm}\\ 3\\,\\mathrm{mm}$는 자에서 어디까지 잰 길이인지, $5$와 $3$이 각각 무엇을 나타내는지 설명해 보세요.",
      "bAnswer": "$5\\,\\mathrm{cm}$ 눈금에서 작은 눈금 $3$칸을 더 간 길이이다. $5$는 $\\mathrm{cm}$의 수이고, $3$은 $5\\,\\mathrm{cm}$를 넘어 더 간 작은 눈금 칸 수이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$5$cm에서 작은 눈금 $3$칸 더 간 길이"
          ]
        },
        {
          "anyOf": [
            "$3$은 $5$cm를 넘은 작은 눈금 칸 수"
          ]
        }
      ],
      "bGoal": "몇 cm 몇 mm 표기의 뜻 설명",
      "bReason": "원문 예제의 5cm 3mm로 두 수의 뜻을 말하게 함",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸 '몇 cm 몇 mm'는 틀 이름 복원이어서 실제 길이에서 mm의 수를 답하게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "자에서 $5\\,\\mathrm{cm}$ 눈금을 지나 작은 눈금 $3$칸을 더 간 길이는 $5\\,\\mathrm{cm}$ {$3$}$\\,\\mathrm{mm}$이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$3$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "5와3의 뜻을 실제 자 위치로 묻는 B에는 한 끝이 0이고 작은 칸이 1mm인 자 그림 예 또는 조건이 필요하다.",
      "c": "5cm에서 작은 세 칸을 간 길이라는 질문도 1mm 눈금의 자를 보이거나 한 칸 길이를 명시해야 한다."
    }
  },
  {
    "id": "e3-1-5-1-xc11",
    "sourceIndex": 720,
    "grade": "e3",
    "source": {
      "sourceIndex": 720,
      "sourceFingerprint": "f254644bff01e18c1532b3fbc58665a1ee3772b14929d43ccc3badb26e0e2f9e",
      "part": "e3plus",
      "id": "e3-1-5-1-xc11",
      "section": "초3::1-5 길이와 시간::1-5-1 1cm보다 작은 단위",
      "term": "$\\mathrm{mm}$를 몇 $\\mathrm{cm}$ 몇 $\\mathrm{mm}$로 나타내기",
      "kind": "방법",
      "level": "중",
      "definition": "$\\mathrm{mm}$로 나타낸 길이는 {$10\\,\\mathrm{mm}$씩 묶은 수}를 $\\mathrm{cm}$로, 남은 것을 $\\mathrm{mm}$로 쓴다.",
      "example": {
        "prompt": "$63\\,\\mathrm{mm}$를 $10\\,\\mathrm{mm}$씩 묶는 까닭은?",
        "answer": "$10\\,\\mathrm{mm}$가 $1\\,\\mathrm{cm}$라서"
      },
      "studentC": "$\\mathrm{mm}$로 나타낸 길이는 □를 $\\mathrm{cm}$로, 남은 것을 $\\mathrm{mm}$로 쓴다.",
      "answers": [
        "$10\\,\\mathrm{mm}$씩 묶은 수"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-1-xc11",
      "proposalFingerprint": "15ce65b847057ef42b7ec51ed4c776e02787241ea227a9b1b4daea3bc806ca28",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$63\\,\\mathrm{mm}$를 몇 $\\mathrm{cm}$ 몇 $\\mathrm{mm}$로 나타낼 때 $10\\,\\mathrm{mm}$씩 묶어 세는 까닭을 설명하고 답을 써 보세요.",
      "bAnswer": "$10\\,\\mathrm{mm}$가 $1\\,\\mathrm{cm}$이기 때문이다. $10\\,\\mathrm{mm}$씩 $6$묶음과 $3\\,\\mathrm{mm}$가 남으므로 $6\\,\\mathrm{cm}\\ 3\\,\\mathrm{mm}$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$10$mm가 $1$cm"
          ]
        },
        {
          "anyOf": [
            "$6$묶음과 $3$mm"
          ]
        },
        {
          "anyOf": [
            "$6$cm $3$mm"
          ]
        }
      ],
      "bGoal": "mm를 몇 cm 몇 mm로 나타내는 방법과 까닭 설명",
      "bReason": "원문 예제 63mm로 묶는 까닭과 결과를 함께 묻게 함",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸 '10mm씩 묶은 수'는 구절 복원이어서 63mm를 바꾼 두 수를 답하게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$63\\,\\mathrm{mm}$는 $10\\,\\mathrm{mm}$씩 $6$묶음과 $3\\,\\mathrm{mm}$이므로 {$6$}$\\,\\mathrm{cm}$ {$3$}$\\,\\mathrm{mm}$이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$6$",
        "equivalents": []
      },
      {
        "expected": "$3$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "10mm=1cm 묶기 이유와 6cm3mm 결과를 묻는 B는 적절하다.",
      "c": "이미 준 여섯 묶음·남은3의 단순 복사를 줄이고 63mm를 바로 복합 단위로 바꾸는 C를 제안한다."
    }
  },
  {
    "id": "e3-1-5-1-xc13",
    "sourceIndex": 722,
    "grade": "e3",
    "source": {
      "sourceIndex": 722,
      "sourceFingerprint": "6988e6b8fd85839ebee8bdfce74ec27809cc168155a3db832e3de824474038ef",
      "part": "e3plus",
      "id": "e3-1-5-1-xc13",
      "section": "초3::1-5 길이와 시간::1-5-1 1cm보다 작은 단위",
      "term": "$1\\,\\mathrm{cm}$보다 짧은 길이 어림",
      "kind": "방법",
      "level": "중",
      "definition": "손톱의 폭처럼 $1\\,\\mathrm{cm}$보다 조금 짧은 길이는 약 $8\\,\\mathrm{mm}$처럼 {$\\mathrm{mm}$ 단위}로 어림한다.",
      "studentC": "손톱의 폭처럼 $1\\,\\mathrm{cm}$보다 조금 짧은 길이는 약 $8\\,\\mathrm{mm}$처럼 □로 어림한다.",
      "answers": [
        "$\\mathrm{mm}$ 단위"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-1-xc13",
      "proposalFingerprint": "85d5aa7a5469053ff74887e32f22a3e39d1555f7e927077e5b77d0fd26db7ff6",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "손톱의 폭은 $1\\,\\mathrm{cm}$보다 조금 짧습니다. 이 길이를 '약 $8\\,\\mathrm{cm}$'와 '약 $8\\,\\mathrm{mm}$' 중 어느 것으로 어림해야 알맞은지 고르고, 까닭을 설명해 보세요.",
      "bAnswer": "약 $8\\,\\mathrm{mm}$이다. $1\\,\\mathrm{cm}$는 $10\\,\\mathrm{mm}$이므로 그보다 조금 짧은 길이는 $8\\,\\mathrm{mm}$쯤이고, $8\\,\\mathrm{cm}$는 $1\\,\\mathrm{cm}$보다 훨씬 길기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "약 $8$mm"
          ]
        },
        {
          "anyOf": [
            "$1$cm는 $10$mm라 조금 짧으면 $8$mm쯤"
          ]
        },
        {
          "anyOf": [
            "$8$cm는 $1$cm보다 훨씬 길다"
          ]
        }
      ],
      "bGoal": "1cm보다 짧은 길이를 mm로 어림하는 까닭 설명",
      "bReason": "단위만 답하는 원문을 두 어림 값 중 알맞은 것을 고르고 까닭을 대는 질문으로 바꿈",
      "cDecision": "rewrite",
      "cReason": "원문은 바로 앞에 '8 mm'가 보여 답을 베끼게 되므로 수 뒤의 단위를 스스로 쓰게 함",
      "cSlotEquivalents": [],
      "answerNotes": "'밀리미터' 인정. 'cm'는 1cm보다 길어져 오답."
    },
    "currentCMarkedSentence": "손톱의 폭은 $1\\,\\mathrm{cm}$보다 조금 짧으므로 약 $8$ {$\\mathrm{mm}$}라고 어림할 수 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "$\\mathrm{mm}$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "8mm 선택 이유에 10mm보다 짧음과 8cm의 부적절함을 모두 독립 필수로 요구하지 말고 충분한 단위 비교 설명의 대안 범위를 정한다.",
      "c": "1cm보다 조금 짧은 상황에 약8mm라는 두 단위 중 선택이 알맞다."
    }
  },
  {
    "id": "e3-1-5-2-xc1",
    "sourceIndex": 730,
    "grade": "e3",
    "source": {
      "sourceIndex": 730,
      "sourceFingerprint": "7f854dd21d062fd46a0028edb297b97f9d3beb783f4d2af8cd042456acd36e26",
      "part": "e3plus",
      "id": "e3-1-5-2-xc1",
      "section": "초3::1-5 길이와 시간::1-5-2 1m보다 큰 단위",
      "term": "$1\\,\\mathrm{km}$ 읽기",
      "kind": "방법",
      "level": "하",
      "definition": "$1\\,\\mathrm{km}$는 {$1$ 킬로미터}라고 읽는다.",
      "studentC": "$1\\,\\mathrm{km}$는 □라고 읽는다.",
      "answers": [
        "$1$ 킬로미터"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-2-xc1",
      "proposalFingerprint": "3474a4ef24633ba3179b5866846124461ae8c52f0c1645061fba4eaf1acceb55",
      "learningRole": "naming",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "없음(단위 읽기)",
      "bReason": "기호 km를 읽는 법만 다룸",
      "cDecision": "keep",
      "cReason": "기호를 보고 익숙한 단위 이름을 쓰는 짧은 빈칸",
      "cSlotEquivalents": [],
      "exclusionReason": "1 km를 소리 내어 읽는 단순 단위 읽기라 설명 질문 거리가 없음",
      "answerNotes": "'일 킬로미터', '1킬로미터' 인정. '키로', '킬로'는 오답."
    },
    "currentCMarkedSentence": "$1\\,\\mathrm{km}$는 {$1$ 킬로미터}라고 읽는다.",
    "currentCSlotAnswers": [
      {
        "expected": "$1$ 킬로미터",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "km 읽기 약속만의 B를 제외한다.",
      "c": "1 킬로미터와 일 킬로미터는 같은 단위 읽기이므로 맥락 대안을 보완한다."
    }
  },
  {
    "id": "e3-1-5-2-xc2",
    "sourceIndex": 731,
    "grade": "e3",
    "source": {
      "sourceIndex": 731,
      "sourceFingerprint": "511fcedd8f1fbc760561f2a8288923fa7ee234ade066e37d78740ad0e25f9063",
      "part": "e3plus",
      "id": "e3-1-5-2-xc2",
      "section": "초3::1-5 길이와 시간::1-5-2 1m보다 큰 단위",
      "term": "몇 $\\mathrm{km}$ 몇 $\\mathrm{m}$로 쓰기",
      "kind": "방법",
      "level": "하",
      "definition": "$\\mathrm{km}$로 딱 떨어지지 않는 거리는 {몇 $\\mathrm{km}$ 몇 $\\mathrm{m}$}로 쓴다.",
      "example": {
        "prompt": "$2\\,\\mathrm{km}\\ 300\\,\\mathrm{m}$에서 $300$이 세는 것은?",
        "answer": "$2\\,\\mathrm{km}$를 넘은 $\\mathrm{m}$의 수"
      },
      "studentC": "$\\mathrm{km}$로 딱 떨어지지 않는 거리는 □로 쓴다.",
      "answers": [
        "몇 $\\mathrm{km}$ 몇 $\\mathrm{m}$"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-2-xc2",
      "proposalFingerprint": "f772ac913fb4c7aeef92a1bd728b7c81b80c3c3d61fddbc9513f4659ec528892",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$2\\,\\mathrm{km}\\ 300\\,\\mathrm{m}$는 어떤 거리인지, $2$와 $300$이 각각 무엇을 나타내는지 설명해 보세요.",
      "bAnswer": "$2\\,\\mathrm{km}$보다 $300\\,\\mathrm{m}$ 더 먼 거리이다. $2$는 $\\mathrm{km}$의 수이고, $300$은 $2\\,\\mathrm{km}$를 넘은 $\\mathrm{m}$의 수이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$2$km보다 $300$m 더 먼 거리"
          ]
        },
        {
          "anyOf": [
            "$300$은 $2$km를 넘은 m의 수"
          ]
        }
      ],
      "bGoal": "몇 km 몇 m 표기의 뜻 설명",
      "bReason": "원문 예제 2km 300m로 두 수의 뜻을 말하게 함",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸 '몇 km 몇 m'는 틀 이름 복원이어서 실제 거리에서 m의 수를 답하게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$2\\,\\mathrm{km}$보다 $300\\,\\mathrm{m}$ 더 먼 거리는 $2\\,\\mathrm{km}$ {$300$}$\\,\\mathrm{m}$라고 쓴다.",
    "currentCSlotAnswers": [
      {
        "expected": "$300$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "2km와 추가300m의 서로 다른 단위 성분을 묻는 B는 명확하다.",
      "c": "같은300m를 그대로 다시 쓰는 C 대신2300m 같은 변환을 묻거나 복합 표기 중복 항목으로 제외한다."
    }
  },
  {
    "id": "e3-1-5-2-xc11",
    "sourceIndex": 737,
    "grade": "e3",
    "source": {
      "sourceIndex": 737,
      "sourceFingerprint": "c95e3e906b63ce48190e5dd0094c0498766a081874e3966cbf7297074364d521",
      "part": "e3plus",
      "id": "e3-1-5-2-xc11",
      "section": "초3::1-5 길이와 시간::1-5-2 1m보다 큰 단위",
      "term": "$\\mathrm{m}$를 몇 $\\mathrm{km}$ 몇 $\\mathrm{m}$로 나타내기",
      "kind": "방법",
      "level": "중",
      "definition": "$\\mathrm{m}$로 나타낸 거리는 {$1000\\,\\mathrm{m}$씩 묶은 수}를 $\\mathrm{km}$로, 남은 것을 $\\mathrm{m}$로 쓴다.",
      "example": {
        "prompt": "$2700\\,\\mathrm{m}$를 몇 $\\mathrm{km}$ 몇 $\\mathrm{m}$로 쓸 때 $\\mathrm{km}$의 수가 $2$인 까닭은?",
        "answer": "$1000\\,\\mathrm{m}$ 묶음이 둘이라서"
      },
      "studentC": "$\\mathrm{m}$로 나타낸 거리는 □를 $\\mathrm{km}$로, 남은 것을 $\\mathrm{m}$로 쓴다.",
      "answers": [
        "$1000\\,\\mathrm{m}$씩 묶은 수"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-2-xc11",
      "proposalFingerprint": "256e175a62e243e1f2bc6a2397dda55b22a1bdf67178f5769a912baa1d6d2dec",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$2700\\,\\mathrm{m}$를 몇 $\\mathrm{km}$ 몇 $\\mathrm{m}$로 나타내는 방법을 설명하고 답을 써 보세요.",
      "bAnswer": "$1000\\,\\mathrm{m}$가 $1\\,\\mathrm{km}$이므로 $1000\\,\\mathrm{m}$씩 묶는다. $2$묶음과 $700\\,\\mathrm{m}$가 남으므로 $2\\,\\mathrm{km}\\ 700\\,\\mathrm{m}$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$1000$m씩 묶음"
          ]
        },
        {
          "anyOf": [
            "$2$묶음과 $700$m"
          ]
        },
        {
          "anyOf": [
            "$2$km $700$m"
          ]
        }
      ],
      "bGoal": "m를 몇 km 몇 m로 나타내는 방법 설명",
      "bReason": "원문 예제 2700m로 묶는 방법과 결과를 말하게 함",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸 '1000m씩 묶은 수'는 구절 복원이어서 2700m를 바꾼 두 수를 답하게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$2700\\,\\mathrm{m}$는 $1000\\,\\mathrm{m}$씩 $2$묶음과 $700\\,\\mathrm{m}$이므로 {$2$}$\\,\\mathrm{km}$ {$700$}$\\,\\mathrm{m}$이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$2$",
        "equivalents": []
      },
      {
        "expected": "$700$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "1000m 묶기와 남은700m로2km700m를 만드는 B는 적절하다.",
      "c": "이미 준2묶음·700m의 복사 대신2700m에서 직접 복합 단위로 바꾸게 한다."
    }
  },
  {
    "id": "e3-1-5-3-xc2",
    "sourceIndex": 749,
    "grade": "e3",
    "source": {
      "sourceIndex": 749,
      "sourceFingerprint": "b96afad434eaa8fa907c500f1297efc37a4e49a6f7656892a146041041f9a07d",
      "part": "e3plus",
      "id": "e3-1-5-3-xc2",
      "section": "초3::1-5 길이와 시간::1-5-3 길이와 거리를 어림하고 재어 보기",
      "term": "몸으로 어림하기",
      "kind": "방법",
      "level": "하",
      "definition": "한 뼘이나 한 걸음처럼 {몸의 일부}를 기준으로 길이를 어림할 수 있다.",
      "studentC": "한 뼘이나 한 걸음처럼 □를 기준으로 길이를 어림할 수 있다.",
      "answers": [
        "몸의 일부"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-3-xc2",
      "proposalFingerprint": "949e0701c5024cc8f5fc76595e1083e5fcc46fa462232975dc11c3c34f4da720",
      "learningRole": "procedure",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "없음(xc8과 중복)",
      "bReason": "뼘이나 걸음으로 어림하는 방법은 xc8에서 실제 수로 설명하게 함",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸 '몸의 일부'는 '아는 길이', '손' 등으로 답이 갈려 한 낱말 '몸'으로 좁힘",
      "cSlotEquivalents": [],
      "exclusionReason": "몸을 기준으로 어림하는 방법은 e3-1-5-3-xc8의 B(한 걸음 약 50cm로 10걸음)와 같은 목표임",
      "answerNotes": "'몸의 일부', '신체' 인정. '자'는 오답."
    },
    "currentCMarkedSentence": "한 뼘이나 한 걸음처럼 자기 {몸}을 이용하면 자가 없어도 길이를 어림할 수 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "몸",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "몸을 기준으로 어림하는 실제 방법은755로 합친다.",
      "c": "몸이라는 말의 복원보다 실제 걸음·뼘 기준 계산으로 확인하거나 C도 제외하는 것을 제안한다."
    }
  },
  {
    "id": "e3-1-5-3-xc7",
    "sourceIndex": 754,
    "grade": "e3",
    "source": {
      "sourceIndex": 754,
      "sourceFingerprint": "7230e43106e0d0bec2fc56895aa854ff1726d5b5ea193e2be293b13369e6e231",
      "part": "e3plus",
      "id": "e3-1-5-3-xc7",
      "section": "초3::1-5 길이와 시간::1-5-3 길이와 거리를 어림하고 재어 보기",
      "term": "$1\\,\\mathrm{cm}$ 어림 기준",
      "kind": "방법",
      "level": "하",
      "definition": "손가락 한 마디의 폭처럼 약 $1\\,\\mathrm{cm}$인 것을 기억해 두면 {짧은 길이}를 어림하기 쉽다.",
      "studentC": "손가락 한 마디의 폭처럼 약 $1\\,\\mathrm{cm}$인 것을 기억해 두면 □를 어림하기 쉽다.",
      "answers": [
        "짧은 길이"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-3-xc7",
      "proposalFingerprint": "ceaa10251b3c77887a7e9e467e97210caefcf1f91632157e540350f8b571b946",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "지우개의 긴 쪽에 손가락 한 마디의 폭(약 $1\\,\\mathrm{cm}$)을 대어 보니 $4$번쯤 들어갔습니다. 지우개의 길이를 어림하고, 어떻게 어림했는지 설명해 보세요.",
      "bAnswer": "약 $4\\,\\mathrm{cm}$이다. 약 $1\\,\\mathrm{cm}$가 $4$번쯤 들어가기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "약 $4$cm"
          ]
        },
        {
          "anyOf": [
            "약 $1$cm가 $4$번"
          ]
        }
      ],
      "bGoal": "약 1cm인 기준으로 짧은 길이를 어림하는 방법 설명",
      "bReason": "기준을 기억한다는 문장을 실제로 기준을 써서 어림하는 상황으로 바꿈",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸 '짧은 길이'는 '길이', '작은 물건' 등으로 답이 갈려 기준이 되는 길이의 수를 답하게 함",
      "cSlotEquivalents": [],
      "answerNotes": "B에서 '약'을 빼고 4cm라고만 쓰면 어림한 값이라는 뜻이 빠진 답."
    },
    "currentCMarkedSentence": "손가락 한 마디의 폭은 약 {$1$}$\\,\\mathrm{cm}$이므로, 이것을 기억해 두면 짧은 길이를 어림하기 쉽다.",
    "currentCSlotAnswers": [
      {
        "expected": "$1$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "약1cm라는 기준을 질문에서 주어 네 번의 약4cm와 방법을 구하게 한 B는 적절하다.",
      "c": "손가락 폭은 사람마다 다르므로 모든 학생의 고정값 암기보다 폭을 약1cm로 잰 사례 조건을 주고 실제 어림을 구하게 한다."
    }
  },
  {
    "id": "e3-1-5-3-xc9",
    "sourceIndex": 756,
    "grade": "e3",
    "source": {
      "sourceIndex": 756,
      "sourceFingerprint": "faf1eb7eae865be1dea89a234b195abb03284a1bc8e220fadc318b052bf51e52",
      "part": "e3plus",
      "id": "e3-1-5-3-xc9",
      "section": "초3::1-5 길이와 시간::1-5-3 길이와 거리를 어림하고 재어 보기",
      "term": "약을 붙이는 까닭",
      "kind": "방법",
      "level": "하",
      "definition": "어림한 길이는 잰 길이와 꼭 같지 않으므로 수 앞에 {약}을 붙여 쓴다.",
      "studentC": "어림한 길이는 잰 길이와 꼭 같지 않으므로 수 앞에 □을 붙여 쓴다.",
      "answers": [
        "약"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-3-xc9",
      "proposalFingerprint": "aea0ba82db4061f0271ac3bd7c1b8a63cb9ad919b1767d5e330a1105bef1643c",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "어림한 길이를 쓸 때 '약 $3\\,\\mathrm{m}$'처럼 수 앞에 '약'을 붙이는 까닭을 설명해 보세요.",
      "bAnswer": "어림한 길이는 자로 잰 길이와 꼭 같지 않을 수 있어서, 정확한 값이 아니라 어림한 값임을 알리기 위해서이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "잰 길이와 꼭 같지 않을 수 있다"
          ]
        },
        {
          "anyOf": [
            "어림한 값임을 알린다"
          ]
        }
      ],
      "bGoal": "'약'을 붙이는 까닭 설명",
      "bReason": "'약'이라는 낱말을 답하는 문장을 붙이는 까닭을 묻는 질문으로 바꿈",
      "cDecision": "keep",
      "cReason": "까닭이 문장에 있고 익숙한 낱말 '약' 하나를 쓰는 빈칸",
      "cSlotEquivalents": [],
      "answerNotes": "'대략', '약 ~쯤'의 '쯤'은 수 앞에 붙이는 말이 아니므로 '약'만 정답."
    },
    "currentCMarkedSentence": "어림한 길이는 잰 길이와 꼭 같지 않으므로 수 앞에 {약}을 붙여 쓴다.",
    "currentCSlotAnswers": [
      {
        "expected": "약",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "정확한 값이 아닐 수 있어 어림값임을 알린다는 한 이유의 동등한 설명을 별개 독립 필수로 강제하지 않도록 기준을 합친다.",
      "c": "어림과 실측은 우연히 같을 수도 있으므로 꼭 같지 않으므로를 꼭 같지 않을 수 있으므로로 고친다."
    }
  },
  {
    "id": "e3-1-5-3-xc14",
    "sourceIndex": 759,
    "grade": "e3",
    "source": {
      "sourceIndex": 759,
      "sourceFingerprint": "160f0d83c19a2b1794e64439391084f48306797ae50419dd11c4a77f2497c103",
      "part": "e3plus",
      "id": "e3-1-5-3-xc14",
      "section": "초3::1-5 길이와 시간::1-5-3 길이와 거리를 어림하고 재어 보기",
      "term": "잰 길이를 간단히 나타내기",
      "kind": "방법",
      "level": "중",
      "definition": "잰 길이를 {가까운 길이로 간단히 나타낼 때} 수 앞에 약을 붙인다.",
      "example": {
        "prompt": "$1\\,\\mathrm{m}\\ 98\\,\\mathrm{cm}$를 약 $2\\,\\mathrm{m}$라고 말할 수 있는 까닭은?",
        "answer": "$2\\,\\mathrm{m}$에 가까워서"
      },
      "studentC": "잰 길이를 □ 수 앞에 약을 붙인다.",
      "answers": [
        "가까운 길이로 간단히 나타낼 때"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-3-xc14",
      "proposalFingerprint": "40c7ee37012381df8d33e45483ea9cfd9a2ca8182340027f8c651b8930c45055",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "줄자로 잰 길이가 $1\\,\\mathrm{m}\\ 98\\,\\mathrm{cm}$일 때 이것을 '약 $2\\,\\mathrm{m}$'라고 말해도 되는 까닭을 설명해 보세요.",
      "bAnswer": "$1\\,\\mathrm{m}\\ 98\\,\\mathrm{cm}$는 $2\\,\\mathrm{m}$보다 $2\\,\\mathrm{cm}$만 짧아 $2\\,\\mathrm{m}$에 가깝기 때문이다. 꼭 $2\\,\\mathrm{m}$는 아니므로 '약'을 붙인다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$2$m에 가깝다"
          ]
        },
        {
          "anyOf": [
            "꼭 $2$m는 아니라서 약을 붙임"
          ]
        }
      ],
      "bGoal": "잰 길이를 가까운 길이로 나타낼 때 '약'을 쓰는 까닭 설명",
      "bReason": "원문 예제 1m 98cm로 까닭을 스스로 말하게 함",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸 '가까운 길이로 간단히 나타낼 때'는 긴 구절이어서 실제 길이를 간단히 나타낸 수를 답하게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "잰 길이 $1\\,\\mathrm{m}\\ 98\\,\\mathrm{cm}$를 가까운 길이로 간단히 나타내면 약 {$2$}$\\,\\mathrm{m}$이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$2$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "198cm가200cm에 가까워 약2m로 말한다는 충분한 이유를 두 독립 필수로 과하게 나누지 않도록 기준의 대안 범위를 재검토한다.",
      "c": "198cm를 가까운2m로 어림하는 실제 계산이다."
    }
  },
  {
    "id": "e3-1-5-3-xc23",
    "sourceIndex": 765,
    "grade": "e3",
    "source": {
      "sourceIndex": 765,
      "sourceFingerprint": "33c7ab8a13219d850524f827ff15125c0d51a6e6e9a83530a429aa55a021c071",
      "part": "e3plus",
      "id": "e3-1-5-3-xc23",
      "section": "초3::1-5 길이와 시간::1-5-3 길이와 거리를 어림하고 재어 보기",
      "term": "알맞은 단위로 말하기",
      "kind": "방법",
      "level": "상",
      "definition": "수가 너무 커지는 거리는 {더 큰 단위}로 바꾸어 말하면 알기 쉽다.",
      "example": {
        "prompt": "약 $2000\\,\\mathrm{m}$를 약 $2\\,\\mathrm{km}$라고 하면 좋은 까닭은?",
        "answer": "수가 작아 알기 쉬워서"
      },
      "studentC": "수가 너무 커지는 거리는 □로 바꾸어 말하면 알기 쉽다.",
      "answers": [
        "더 큰 단위"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-3-xc23",
      "proposalFingerprint": "57542f3f07764467da6121b9021f3295e67e5a01ce112232f0165f99b0205a79",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "약 $2000\\,\\mathrm{m}$인 거리를 약 $2\\,\\mathrm{km}$라고 바꾸어 말하면 좋은 까닭을 설명해 보세요.",
      "bAnswer": "$2000\\,\\mathrm{m}$와 $2\\,\\mathrm{km}$는 같은 거리인데, $\\mathrm{km}$로 말하면 수가 작아져서 알기 쉽기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "같은 거리"
          ]
        },
        {
          "anyOf": [
            "수가 작아져 알기 쉽다"
          ]
        }
      ],
      "bGoal": "먼 거리를 큰 단위로 말하는 까닭 설명",
      "bReason": "원문 예제 2000m와 2km로 까닭을 스스로 말하게 함",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸 '더 큰 단위'는 'km'로도 답할 수 있어 실제 거리를 km로 바꾼 수를 답하게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "약 $2000\\,\\mathrm{m}$처럼 수가 큰 거리는 더 큰 단위로 바꾸어 약 {$2$}$\\,\\mathrm{km}$라고 말하면 알기 쉽다.",
    "currentCSlotAnswers": [
      {
        "expected": "$2$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "좋은 까닭은 숫자가 작아 말하기 쉽다는 이유이며 이미 주어진 같은 거리라는 사실을 별도 필수로 다시 요구하지 않도록 기준을 고친다.",
      "c": "2000m를 약2km로 바꾸는 실제 변환이다."
    }
  },
  {
    "id": "e3-1-5-3-xc27",
    "sourceIndex": 768,
    "grade": "e3",
    "source": {
      "sourceIndex": 768,
      "sourceFingerprint": "a9a2c0156432c1c93b57da6a963932c78b698dbc99664e7a2a7f31110cc78c4a",
      "part": "e3plus",
      "id": "e3-1-5-3-xc27",
      "section": "초3::1-5 길이와 시간::1-5-3 길이와 거리를 어림하고 재어 보기",
      "term": "재어야 하는 때",
      "kind": "방법",
      "level": "상",
      "definition": "옷감을 살 때처럼 꼭 맞아야 할 때에는 어림이 아니라 {자로 잰} 길이를 쓴다.",
      "studentC": "옷감을 살 때처럼 꼭 맞아야 할 때에는 어림이 아니라 □ 길이를 쓴다.",
      "answers": [
        "자로 잰"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-3-xc27",
      "proposalFingerprint": "c270368f0092aae0f3f1f88686a2b31a39b308fe7366a8aa4d60cf5c75f69845",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "옷감을 사서 커튼을 만들 때처럼 길이가 꼭 맞아야 할 때에는 어림한 길이를 쓰면 안 되는 까닭을 설명해 보세요.",
      "bAnswer": "어림한 길이는 실제 길이와 다를 수 있어서 옷감이 모자라거나 남을 수 있기 때문이다. 그래서 자로 재어 정확한 길이를 쓴다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "어림한 길이는 실제와 다를 수 있다"
          ]
        },
        {
          "anyOf": [
            "자로 잰 정확한 길이를 써야 한다"
          ]
        }
      ],
      "bGoal": "어림 대신 재어야 하는 때와 그 까닭 설명",
      "bReason": "잰 길이를 쓴다는 사실에 그 까닭을 묻는 질문을 붙임",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸은 '정확한', '실제' 등으로 답이 갈려 두 가지 중에서 고르게 함",
      "cSlotEquivalents": [],
      "answerNotes": "'잰', '자로 잰 길이' 인정. '어림한'은 오답."
    },
    "currentCMarkedSentence": "옷감을 살 때처럼 길이가 꼭 맞아야 할 때에는 '어림한 길이'와 '자로 잰 길이' 중 {자로 잰} 길이를 쓴다.",
    "currentCSlotAnswers": [
      {
        "expected": "자로 잰",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "왜 어림을 쓰면 안 되는지에는 실제와 달라 모자라거나 남는다는 이유가 충분하므로 자로 정확히 재라는 행동을 추가 필수로 요구하지 않는다.",
      "c": "꼭 맞아야 하는 옷감의 길이에 직접 잰 값을 선택한다."
    }
  },
  {
    "id": "e3-1-5-4-xc1",
    "sourceIndex": 769,
    "grade": "e3",
    "source": {
      "sourceIndex": 769,
      "sourceFingerprint": "f713763ff4d7fa640ae89750646ee2e56defc80411b20a25d289badc5902d06a",
      "part": "e3plus",
      "id": "e3-1-5-4-xc1",
      "section": "초3::1-5 길이와 시간::1-5-4 1분보다 작은 단위",
      "term": "초침",
      "kind": "정의",
      "level": "하",
      "definition": "시계에서 가장 가늘고 빠르게 도는 바늘을 {초침}이라 한다.",
      "studentC": "시계에서 가장 가늘고 빠르게 도는 바늘을 □이라 한다.",
      "answers": [
        "초침"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-4-xc1",
      "proposalFingerprint": "3ba651d342691bc8b05d0dbe218c4a98b2c585add39a8aca027b7e43e70bb2bb",
      "learningRole": "definition",
      "bDecision": "rewrite",
      "bPrompt": "시계에는 시침, 분침, 초침이 있습니다. 초침을 다른 두 바늘과 구별할 수 있는 특징을 설명해 보세요.",
      "bAnswer": "초침은 세 바늘 중 가장 가늘고 가장 빠르게 도는 바늘이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "가장 가늘다"
          ]
        },
        {
          "anyOf": [
            "가장 빠르게 돈다"
          ]
        }
      ],
      "bGoal": "초침의 특징 설명",
      "bReason": "이름을 답하는 정의를 초침을 알아보는 특징을 말하는 질문으로 바꿈",
      "cDecision": "keep",
      "cReason": "특징이 문장에 다 있고 익숙한 낱말 '초침' 하나를 쓰는 빈칸",
      "cSlotEquivalents": [],
      "answerNotes": "'분침', '시침'은 오답."
    },
    "currentCMarkedSentence": "시계에서 가장 가늘고 빠르게 도는 바늘을 {초침}이라 한다.",
    "currentCSlotAnswers": [
      {
        "expected": "초침",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "초침이 가장 가늘다는 외형은 시계마다 달라지므로 가장 빠르게 도는 속도·1초 이동을 뜻의 기준으로 삼거나 실제 그림의 조건을 명시한다.",
      "c": "가장 가늘다는 단정 대신1초마다 한 작은 칸을 도는 바늘처럼 일반적인 초침 뜻을 묻는 C로 수정한다."
    }
  },
  {
    "id": "e3-1-5-4-xc3",
    "sourceIndex": 771,
    "grade": "e3",
    "source": {
      "sourceIndex": 771,
      "sourceFingerprint": "6edf0ab667c38576310c49950f897121086839f09484b66535217cfc0b4f87aa",
      "part": "e3plus",
      "id": "e3-1-5-4-xc3",
      "section": "초3::1-5 길이와 시간::1-5-4 1분보다 작은 단위",
      "term": "$1$초의 길이 감각",
      "kind": "단위",
      "level": "하",
      "definition": "‘하나’ 하고 말하는 정도의 짧은 시간이 약 {$1$초}이다.",
      "studentC": "‘하나’ 하고 말하는 정도의 짧은 시간이 약 □이다.",
      "answers": [
        "$1$초"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-4-xc3",
      "proposalFingerprint": "a9de531c45f307d5e404ea3427f4dd80a5f6ac31ce1b1fc612b9d62c714d201f",
      "learningRole": "naming",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "없음(시간 감각)",
      "bReason": "1초가 얼마나 짧은지 느낌을 알려 주는 항목",
      "cDecision": "keep",
      "cReason": "짧은 시간이라는 실마리가 있고 익숙한 단위 '1초'를 쓰는 빈칸",
      "cSlotEquivalents": [],
      "exclusionReason": "1초의 길이 감각을 아는 것이라 뜻이나 방법을 설명하게 할 거리가 없고 답이 사람마다 달라짐",
      "answerNotes": "'1 초', '일 초' 인정. '1분'은 오답."
    },
    "currentCMarkedSentence": "‘하나’ 하고 말하는 정도의 짧은 시간이 약 {$1$초}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$1$초",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "사람마다 말하는 속도가 다른 감각 예의 B 제외는 적절하다.",
      "c": "하나 발화 길이를 항상1초로 채점하지 말고 느낌 예를 A에 남기며 C도 제외한다."
    }
  },
  {
    "id": "e3-1-5-4-xc7",
    "sourceIndex": 775,
    "grade": "e3",
    "source": {
      "sourceIndex": 775,
      "sourceFingerprint": "a895cbad2cd9ee6af688240ad058c46515e1dcabf19d1a6d09ccb9f4c11436b8",
      "part": "e3plus",
      "id": "e3-1-5-4-xc7",
      "section": "초3::1-5 길이와 시간::1-5-4 1분보다 작은 단위",
      "term": "몇 분 몇 초로 쓰기",
      "kind": "방법",
      "level": "하",
      "definition": "분으로 딱 떨어지지 않는 시간은 {몇 분 몇 초}로 쓴다.",
      "example": {
        "prompt": "$1$분 $30$초에서 $30$이 세는 것은?",
        "answer": "$1$분을 넘은 초의 수"
      },
      "studentC": "분으로 딱 떨어지지 않는 시간은 □로 쓴다.",
      "answers": [
        "몇 분 몇 초"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-4-xc7",
      "proposalFingerprint": "3797ba3613eecf9e4da76fc662dd08bca9575fdad119f7266634680deecfc925",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$1$분 $30$초는 어떤 시간인지, $1$과 $30$이 각각 무엇을 나타내는지 설명해 보세요.",
      "bAnswer": "$1$분보다 $30$초 더 긴 시간이다. $1$은 분의 수이고, $30$은 $1$분을 넘은 초의 수이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$1$분보다 $30$초 더 긴 시간"
          ]
        },
        {
          "anyOf": [
            "$30$은 $1$분을 넘은 초의 수"
          ]
        }
      ],
      "bGoal": "몇 분 몇 초 표기의 뜻 설명",
      "bReason": "원문 예제 1분 30초로 두 수의 뜻을 말하게 함",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸 '몇 분 몇 초'는 틀 이름 복원이어서 실제 시간에서 초의 수를 답하게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$1$분보다 $30$초 더 긴 시간은 $1$분 {$30$}초라고 쓴다.",
    "currentCSlotAnswers": [
      {
        "expected": "$30$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "1분과 추가30초의 다른 단위 성분을 설명하는 B는 명확하다.",
      "c": "이미 주어진30초를 다시 쓰는 C 대신90초 같은 실제 변환을 묻거나 단순 표기 중복으로 제외한다."
    }
  },
  {
    "id": "e3-1-5-4-xc15",
    "sourceIndex": 781,
    "grade": "e3",
    "source": {
      "sourceIndex": 781,
      "sourceFingerprint": "a1b3fc60b9da95457bbc6ef24892417e7a47faf8595489ac74e2a780bd42bde9",
      "part": "e3plus",
      "id": "e3-1-5-4-xc15",
      "section": "초3::1-5 길이와 시간::1-5-4 1분보다 작은 단위",
      "term": "$60$초보다 긴 시간",
      "kind": "방법",
      "level": "중",
      "definition": "$90$초처럼 $60$초보다 긴 시간은 {몇 분 몇 초}로 바꾸어 쓸 수 있다.",
      "studentC": "$90$초처럼 $60$초보다 긴 시간은 □로 바꾸어 쓸 수 있다.",
      "answers": [
        "몇 분 몇 초"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-4-xc15",
      "proposalFingerprint": "b45b1e3b645d6c6d78fb89757b626b95faa48fd64368ab5d3bf2372e0193e2e9",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$90$초를 몇 분 몇 초로 나타내는 방법을 설명하고 답을 써 보세요.",
      "bAnswer": "$60$초가 $1$분이므로 $90$초를 $60$초와 $30$초로 나누어 $1$분 $30$초로 나타낸다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$60$초가 $1$분"
          ]
        },
        {
          "anyOf": [
            "$90$초는 $60$초와 $30$초"
          ]
        },
        {
          "anyOf": [
            "$1$분 $30$초"
          ]
        }
      ],
      "bGoal": "60초보다 긴 시간을 몇 분 몇 초로 바꾸는 방법 설명",
      "bReason": "원문에 든 90초로 바꾸는 방법과 결과를 말하게 함",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸 '몇 분 몇 초'는 틀 이름 복원이어서 90초를 바꾼 두 수를 답하게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$90$초는 $60$초와 $30$초이므로 {$1$}분 {$30$}초이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$1$",
        "equivalents": []
      },
      {
        "expected": "$30$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "90초를60·30으로 나눠1분30초라는 B 방법은 적절하다.",
      "c": "남은30을 먼저 주어 복사하지 않도록90초를 바로 분·초로 나타내는 문장으로 고친다."
    }
  },
  {
    "id": "e3-1-5-4-xc24",
    "sourceIndex": 787,
    "grade": "e3",
    "source": {
      "sourceIndex": 787,
      "sourceFingerprint": "91d7e042ded874c30cbec630732a78c389aca7f3dc100e115d9c9f1f664887a2",
      "part": "e3plus",
      "id": "e3-1-5-4-xc24",
      "section": "초3::1-5 길이와 시간::1-5-4 1분보다 작은 단위",
      "term": "기록과 빠르기",
      "kind": "성질",
      "level": "상",
      "definition": "같은 거리를 달린 기록은 걸린 시간이 {짧을수록} 빠른 것이다.",
      "studentC": "같은 거리를 달린 기록은 걸린 시간이 □ 빠른 것이다.",
      "answers": [
        "짧을수록"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-4-xc24",
      "proposalFingerprint": "410bcd085d81a2a776568bf164a264ffa1b3faee09006a339712a69ae63fb7f9",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$50\\,\\mathrm{m}$를 달리는 데 지호는 $11$초, 수아는 $9$초 걸렸습니다. 누가 더 빨리 달렸는지 쓰고, 까닭을 설명해 보세요.",
      "bAnswer": "수아이다. 같은 거리를 더 짧은 시간에 달렸기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "수아"
          ]
        },
        {
          "anyOf": [
            "같은 거리"
          ]
        },
        {
          "anyOf": [
            "걸린 시간이 더 짧다"
          ]
        }
      ],
      "bGoal": "달리기 기록으로 빠르기를 판단하는 기준 설명",
      "bReason": "기준 문장에 두 사람의 기록을 주어 실제로 판단하게 함",
      "cDecision": "keep",
      "cReason": "걸린 시간과 빠르기의 관계를 '짧을수록' 한 마디로 답하는 짧은 비교 빈칸",
      "cSlotEquivalents": [],
      "answerNotes": "'짧으면', '적을수록' 인정. '길수록'은 오답."
    },
    "currentCMarkedSentence": "같은 거리를 달린 기록은 걸린 시간이 {짧을수록} 빠른 것이다.",
    "currentCSlotAnswers": [
      {
        "expected": "짧을수록",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "수아와 짧은9초의 이유가 유용하지만 문제에서 준 같은50m를 별도 필수로 반복시켜 정답 설명을 거절하지 않도록 기준을 정한다.",
      "c": "같은 거리라는 조건에서 짧은 시간과 빠르기의 관계가 옳다."
    }
  },
  {
    "id": "e3-1-5-5-xc11",
    "sourceIndex": 795,
    "grade": "e3",
    "source": {
      "sourceIndex": 795,
      "sourceFingerprint": "96e8c756c1f997fe0cc3568119eb5a67aebba30086cb6b5281c8ee7664055e53",
      "part": "e3plus",
      "id": "e3-1-5-5-xc11",
      "section": "초3::1-5 길이와 시간::1-5-5 시간의 덧셈",
      "term": "분에서 시간으로 올림",
      "kind": "방법",
      "level": "중",
      "definition": "더한 분이 $60$ 이상이면 그중 {$60$분을 $1$시간}으로 바꾼다.",
      "example": {
        "prompt": "$50$분과 $20$분의 합 $70$분을 $1$시간 $10$분으로 바꾸는 까닭은?",
        "answer": "$60$분이 $1$시간이라서"
      },
      "studentC": "더한 분이 $60$ 이상이면 그중 □으로 바꾼다.",
      "answers": [
        "$60$분을 $1$시간"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-5-xc11",
      "proposalFingerprint": "21f38bb9a5b359ca963985b7f677f0b67541c75e6bf5811af9900dd53149b929",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$1$시간 $50$분과 $2$시간 $20$분을 더하면 분끼리의 합이 $70$분입니다. 이 $70$분을 어떻게 바꾸어 합을 나타내는지 설명하고 답을 써 보세요.",
      "bAnswer": "$70$분 중 $60$분을 $1$시간으로 바꾸어 $1$시간 $10$분으로 본다. 시간은 $1+2+1=4$이므로 합은 $4$시간 $10$분이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$60$분을 $1$시간으로 바꿈"
          ]
        },
        {
          "anyOf": [
            "$4$시간 $10$분"
          ]
        }
      ],
      "bGoal": "분의 합에서 1시간으로 받아올리는 방법 설명",
      "bReason": "원문 예제의 50분과 20분을 넣은 덧셈으로 과정을 말하게 함",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸 '60분을 1시간'은 문장 가운데를 복원해야 하고 '이상'이 낯설어 실제 합 70분을 바꾼 두 수를 답하게 함",
      "cSlotEquivalents": [],
      "coreAfter": "더한 분이 $60$분이거나 $60$분보다 많으면 그중 {$60$분을 $1$시간}으로 바꾼다.",
      "coreReason": "60분을1시간이라는 원래 단위 교환 표적과경계60을 보존한다."
    },
    "currentCMarkedSentence": "$50$분과 $20$분을 더한 $70$분은 그중 $60$분을 $1$시간으로 바꾸어 {$1$}시간 {$10$}분으로 쓴다.",
    "currentCSlotAnswers": [
      {
        "expected": "$1$",
        "equivalents": []
      },
      {
        "expected": "$10$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "70분을1시간10분으로 교환하여 전체4시간10분 구하는 B는 적절하다.",
      "c": "첫 빈칸1이 바로 앞1시간에 드러나므로 그 복사를 빼거나70분을 직접 시간·분으로 변환하게 한다."
    }
  },
  {
    "id": "e3-1-5-5-xc15",
    "sourceIndex": 797,
    "grade": "e3",
    "source": {
      "sourceIndex": 797,
      "sourceFingerprint": "eddaef63df169db256950df16b933ca0c9a2498cae4de4a751b7f3ed911116b2",
      "part": "e3plus",
      "id": "e3-1-5-5-xc15",
      "section": "초3::1-5 길이와 시간::1-5-5 시간의 덧셈",
      "term": "시각을 더하다 시가 바뀔 때",
      "kind": "방법",
      "level": "중",
      "definition": "시각에 시간을 더해 분이 $60$ 이상이 되면 $60$분을 $1$시간으로 바꾸어 {시각이 한 시간 더 지나간다}.",
      "example": {
        "prompt": "$7$시 $50$분에서 $20$분 뒤가 $8$시 $10$분인 까닭은?",
        "answer": "$70$분은 $1$시간 $10$분이라서"
      },
      "studentC": "시각에 시간을 더해 분이 $60$ 이상이 되면 $60$분을 $1$시간으로 바꾸어 □.",
      "answers": [
        "시각이 한 시간 더 지나간다"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-5-xc15",
      "proposalFingerprint": "99d17febce9672f50eb90f4697a95208e5bf93b3ccaca29fe0aa375f501c4a8c",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$7$시 $50$분에서 $20$분 뒤의 시각을 구하고, 시가 $7$에서 $8$로 바뀌는 까닭을 설명해 보세요.",
      "bAnswer": "$8$시 $10$분이다. $50+20=70$분인데 $60$분이 $1$시간이므로 시가 $1$ 커지고 $10$분이 남기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$8$시 $10$분"
          ]
        },
        {
          "anyOf": [
            "$70$분 중 $60$분이 $1$시간"
          ]
        },
        {
          "anyOf": [
            "시가 $1$ 커지고 $10$분 남음"
          ]
        }
      ],
      "bGoal": "시각에 시간을 더할 때 시가 바뀌는 까닭 설명",
      "bReason": "원문 예제의 시각으로 결과와 까닭을 함께 묻게 함",
      "cDecision": "rewrite",
      "cReason": "원문은 결론을 통째로 가려 무엇을 쓸지 알 수 없으므로 실제 시각의 결과를 두 수로 답하게 함",
      "cSlotEquivalents": [],
      "coreAfter": "시각에 시간을 더해 분이 $60$분이거나 $60$분보다 많아지면, 그중 $60$분을 $1$시간으로 바꾸어 시각이 {다음 시로 바뀐다}.",
      "coreReason": "한 시간 더 지나는 시각의 변화 표적을 다음 시로 명시한다. 시의숫자1증가는12→1시계에서틀리므로 초안의그단정을피한다."
    },
    "currentCMarkedSentence": "$7$시 $50$분에서 $20$분이 지나면 분이 $70$분이 되므로, $60$분을 $1$시간으로 바꾸어 {$8$}시 {$10$}분이 된다.",
    "currentCSlotAnswers": [
      {
        "expected": "$8$",
        "equivalents": []
      },
      {
        "expected": "$10$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "7→8의 실제 시각 계산과60분 교환 이유는 맞다.",
      "c": "실제8시10분 C는 맞으나 일반 coreAfter의60분 이상이면 다음 시 단정은120분 이상 입력까지 포함한다;한 번만 교환하는60~119 조건 또는60분마다 한 시간 변화로 범위를 명시한다."
    }
  },
  {
    "id": "e3-1-5-6-xc6",
    "sourceIndex": 805,
    "grade": "e3",
    "source": {
      "sourceIndex": 805,
      "sourceFingerprint": "b1e9292a53667e436f12a5067bdb32a239fa22a06eee4cdc9c9ad82709a6ffd5",
      "part": "e3plus",
      "id": "e3-1-5-6-xc6",
      "section": "초3::1-5 길이와 시간::1-5-6 시간의 뺄셈",
      "term": "시각에서 시각을 뺀 것",
      "kind": "성질",
      "level": "하",
      "definition": "시각에서 시각을 빼면 두 시각 사이의 {시간}이 된다.",
      "studentC": "시각에서 시각을 빼면 두 시각 사이의 □이 된다.",
      "answers": [
        "시간"
      ]
    },
    "currentProposal": {
      "id": "e3-1-5-6-xc6",
      "proposalFingerprint": "7ebd54a240e619f554a5bf05a718d74eb3167b880f20578890b087fe47510c12",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$5$시에서 $2$시를 빼어 $3$이 나왔습니다. 이것은 '$3$시'인지 '$3$시간'인지 쓰고, 그 까닭을 쓰세요.",
      "bAnswer": "$3$시간이다. $2$시부터 $5$시까지 흐른 시간의 길이를 나타내기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$3$시간이다"
          ]
        },
        {
          "anyOf": [
            "두 시각 사이에 흐른 시간"
          ]
        }
      ],
      "bGoal": "시각에서 시각을 뺀 결과가 두 시각 사이의 시간임을 설명",
      "bReason": "'$3$시'와 '$3$시간'을 견주게 하여 답의 종류를 분명히 함",
      "cDecision": "keep",
      "cReason": "'두 시각 사이의'라는 단서가 있어 '시간'이 분명히 정해지는 짧은 문장",
      "cSlotEquivalents": [],
      "answerNotes": "'시간', '걸린 시간' 인정. '시각'은 오답."
    },
    "currentCMarkedSentence": "시각에서 시각을 빼면 두 시각 사이의 {시간}이 된다.",
    "currentCSlotAnswers": [
      {
        "expected": "시간",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "2시→5시 사이3시간은 같은 날·같은 오전이나 오후라는 범위를 명시해야 날짜·12시간 주기의 해석이 생기지 않는다.",
      "c": "두 시각의 차도 같은 범위와 늦은 시각에서 앞선 시각을 뺀다는 조건을 주면 의미가 더 분명하다."
    }
  }
]
