제공 순서 모든 ID에 대해 JSON 배열만 출력한다. 각 행은 수정 패치 {id,inputProposalFingerprint,변경하는필드들}이다. id와 현재 지문 해시는 필수이고 바뀌지 않은 필드는 복사하지 않는다. 직접 독자의 B/C 지적을 실제 문장과 채점 기준의 수정으로 해소하라. 지적이 수학적으로 틀렸으면 변경 대신 repairDisagreement에 이유와 실제 올바른 수학을 써라. 코멘트나 카운트만 고쳐서 문제를 해결했다고 하지 마라.
B를 바꾸면 bDecision,bPrompt,bAnswer,bRequiredIdeas,bGoal,bReason을 함께 완성한다. bDecision은 rewrite/exclude. exclude는 bPrompt,bAnswer null, bRequiredIdeas [], exclusionReason에 B만 제외하는 구체 이유와 알려진 실제 대응 ID를 기록한다. 초등에 익숙한 이름의 정의 질문은 가능하지만 제목 하나+설명하시오, 답 하나 대기, 의미 없는 이유 묻기는 금지한다. 설명 목표·조건·대상·응답 범위를 명시하고 질문에 예상 답은 넣지 않는다. 구체적 계산은 일반 방법·뜻·관계도 확인한다. requiredIdeas=[{anyOf:['한 가지 필수 의미의 유효한 표현', '그 의미를 만족하는 별도의 다른 방법']}]; 꼭 요청한 것만 필수다. 결과·식·방법·조건을 쓰라고 했으면 실제로 기준에 담고 묻지 않았으면 강제하지 않는다. 단순한 입력 되풀이를 설명으로 받지 않는다. 서로 다른 올바른 풀이의 필수 단계를 AND로 섞지 말고 전체 대체 풀이를 독립 anyOf 문자열로 적는다. 특정 예시만을 정답으로 강제하지 않는다. 역할을 바꾸면 learningRole=definition/procedure/reason/application/naming 중 실제 질문에 맞게 적는다.
C를 바꾸면 cDecision,cAfter,cSlotEquivalents,cReason을 함께 적는다. rewrite의 cAfter는 정답 부분을 {답}으로 표시한 실제 완성 학생 문장이고 1~4슬롯이다. 짧고 유용한 비교·계산 빈칸을 보존한다. 실제 대상 없이 긴 키워드를 복원하거나 부사만 채우게 하지 않는다. 빈칸과 같은 값을 다른 곳에서 공개하지 않는다. 입력의 수가 바뀐 역할에서 다시 답인 유용한 관계(몫 검산, 같은 거리 등)는 무조건 복사로 취급하지 않는다. 순서 없는 두 답은 같은 말을 두 번 써도 통과하는 슬롯별 대안으로 해결하지 말고 순서를 명시하거나 한 빈칸으로 줄인다. cSlotEquivalents는 각 슬롯의 대체 답 배열로서 수·읽기·단위·자리·횟수의 역할을 구별하되 그 문장에서 옳은 서로 다른 답은 허용한다. cDecision=keep은 원본 C 그대로 고정이므로 새 문장을 주지 않는다. exclude는 해당 C의 구체적인 낮은 이점 또는 반복 이유를 cReason으로 기록하고 cAfter=null, cSlotEquivalents=[]로 쓴다. 별도 remove:['cAfter','cSlotEquivalents'] 등으로 이전 필드 제거를 요청할 수 있다.
일반 학습 설명 A/SRS는 C와 별개다. coreAfter를 고칠 때는 실제 수학 오류나 빠진 조건을 고칠 때만이며 원래 표적과 일반 뜻을 보존한다. coreReason을 함께 기록한다. coreAfter도 {답} 1~4개, 보이는 전체 길이 8~160자로 만든다. C를 고쳤다는 이유로 A를 자동 대체하지 않는다.
숫자·수학 기호는 $...$ KaTeX, 곱은 	imes, 나눗셈은 div, 계산 내 빈칸 기호는 square이며 표시용 {답}과 LaTex의 중괄호를 혼동하지 않는다. 모든 조사·괄호·수식이 학생에게 실제로 읽혀야 한다. 쉬운 학년 말로 쓰고 새로운 이름이나 낯선 문자 변수를 만들지 않는다. 그림이 필요한 현재 질문은 실제 위치·수·이름을 텍스트에 제시하여 자립시키거나 그 form만 제외한다. 꼭 필요한 새 그림·조작 사례는 exampleNeeded에 무엇인지 적되 없는 그림을 이미 있는 것처럼 참조하지 않는다.
최종 승인·자동 테스트 pass·실제 독자가 재독했다는 말은 출력하지 않는다. 우리는 이 후보를 나중에 직접 읽고 원본과 확인한다. 다음 자료의 모든 ID를 빠짐없이 처리하라. 반드시 ID 하나당 B와 C 패치를 한 객체로 합쳐라. ID에 B·C 접미사를 붙이지 마라. cAfter의 중괄호에는 답·정답 같은 자리표시가 아니라 실제 수학 정답을 써라.

[
  {
    "id": "e4-1-1-1-xc1",
    "sourceIndex": 1323,
    "grade": "e4",
    "source": {
      "sourceIndex": 1323,
      "sourceFingerprint": "8c24a84ea54bd642e96e94b9a3d3090ffa610a3dbf1c7f536a3ec346d23fcb98",
      "part": "e4plus",
      "id": "e4-1-1-1-xc1",
      "section": "초4::1-1 큰 수::1-1-1 1000이 10개인 수 알아보기",
      "term": "$10000$을 읽는 두 가지 말",
      "kind": "정의",
      "level": "하",
      "definition": "$10000$은 {만} 또는 {일만}이라고 읽는다.",
      "example": {
        "prompt": "$10000$을 읽어 보시오.",
        "answer": "만 또는 일만"
      },
      "studentC": "$10000$은 □ 또는 □이라고 읽는다.",
      "answers": [
        "만",
        "일만"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-1-xc1",
      "proposalFingerprint": "6d6eb58f409391692ef650d73491599a4bbb266d8cda1e0faf374d1433aca856",
      "learningRole": "naming",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "$10000$을 읽는 두 가지 말",
      "bReason": "읽는 말 두 개를 쓰는 내용이라 C로만 확인한다.",
      "cDecision": "keep",
      "cReason": "수가 주어져 있고 빈칸 두 개가 모두 짧은 읽는 말이다.",
      "cSlotEquivalents": [],
      "exclusionReason": "수 하나를 읽는 말 두 가지를 쓰는 단순 읽기라 설명할 뜻이나 까닭이 없다.",
      "answerNotes": "만, 일만의 순서는 바뀌어도 정답."
    },
    "currentCMarkedSentence": "$10000$은 {만} 또는 {일만}이라고 읽는다.",
    "currentCSlotAnswers": [
      {
        "expected": "만",
        "equivalents": []
      },
      {
        "expected": "일만",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "두읽기말약속만의B를 제외한다.",
      "c": "만·일만의순서는자유이므로한빈칸에두바른읽기를인정하는문장으로고쳐고정슬롯순서문제를 없앤다."
    }
  },
  {
    "id": "e4-1-1-2-xc4",
    "sourceIndex": 1352,
    "grade": "e4",
    "source": {
      "sourceIndex": 1352,
      "sourceFingerprint": "0ae6f245c30a5c6bf18ce5be03f1a3ebd9277c021f0ae72bc77f93f748b8623f",
      "part": "e4plus",
      "id": "e4-1-1-2-xc4",
      "section": "초4::1-1 큰 수::1-1-2 다섯 자리 수 알아보기",
      "term": "자리 이름을 붙이지 않는 자리",
      "kind": "방법",
      "level": "하",
      "definition": "수를 읽을 때 만, 천, 백, 십의 자리는 읽을 때 자리 이름을 붙이지만, {일의 자리} 숫자는 자리 이름 없이 숫자만 읽는다.",
      "example": {
        "prompt": "$35214$의 끝 숫자 $4$를 «사»로만 읽는 까닭은?",
        "answer": "일의 자리 숫자라서"
      },
      "studentC": "수를 읽을 때 만, 천, 백, 십의 자리는 읽을 때 자리 이름을 붙이지만, □ 숫자는 자리 이름 없이 숫자만 읽는다.",
      "answers": [
        "일의 자리"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-2-xc4",
      "proposalFingerprint": "f77708e4eeac1f785f247a7ba015814c9ee19e98aead6e0bc84d795197a4f0f5",
      "learningRole": "naming",
      "bDecision": "rewrite",
      "bPrompt": "$35214$를 읽으면 '삼만 오천이백십사'입니다. $3$, $5$, $2$, $1$ 뒤에는 만, 천, 백, 십을 붙여 읽는데 $4$ 뒤에는 아무 말도 붙이지 않는 까닭을 쓰세요.",
      "bAnswer": "$4$는 일의 자리 숫자이고, 일의 자리는 자리 이름을 붙이지 않고 숫자만 읽기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$4$는 일의 자리 숫자"
          ]
        },
        {
          "anyOf": [
            "일의 자리는 자리 이름 없이 읽음"
          ]
        }
      ],
      "bGoal": "일의 자리 숫자를 읽는 방법",
      "bReason": "원문 예제의 수와 읽은 말을 함께 주어 무엇에 대한 까닭인지 분명히 했다.",
      "cDecision": "keep",
      "cReason": "만, 천, 백, 십이 앞에 나열되어 남은 자리 이름 하나로 답이 정해진다.",
      "cSlotEquivalents": [],
      "answerNotes": "일의 자리, 일 자리 인정."
    },
    "currentCMarkedSentence": "수를 읽을 때 만, 천, 백, 십의 자리는 읽을 때 자리 이름을 붙이지만, {일의 자리} 숫자는 자리 이름 없이 숫자만 읽는다.",
    "currentCSlotAnswers": [
      {
        "expected": "일의 자리",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "읽는전체말과접미규칙을질문에이미주어답에는일의자리라는명명만남는다;새까닭을억지로묻기보다B를제외하는것을 제안한다.",
      "c": "자리이름없이읽는일의자리는짧은표기약속확인으로 남길수있다."
    }
  },
  {
    "id": "e4-1-1-2-xc6",
    "sourceIndex": 1354,
    "grade": "e4",
    "source": {
      "sourceIndex": 1354,
      "sourceFingerprint": "1a6f7f676e5e3339223e9089a574f010600b184274257082c023086005aa4205",
      "part": "e4plus",
      "id": "e4-1-1-2-xc6",
      "section": "초4::1-1 큰 수::1-1-2 다섯 자리 수 알아보기",
      "term": "천, 백, 십의 자리 숫자가 $1$일 때 읽기",
      "kind": "방법",
      "level": "하",
      "definition": "$31511$의 천의 자리와 십의 자리처럼 천, 백, 십의 자리 숫자가 $1$이면 {일을 빼고} 자리 이름만 읽어 삼만 천오백십일이라 한다.",
      "studentC": "$31511$의 천의 자리와 십의 자리처럼 천, 백, 십의 자리 숫자가 $1$이면 □ 자리 이름만 읽어 삼만 천오백십일이라 한다.",
      "answers": [
        "일을 빼고"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-2-xc6",
      "proposalFingerprint": "0c8cfc9798c9b9aec7cc704b45627c22eed7776bffc112b5b206ad4c124cda40",
      "learningRole": "naming",
      "bDecision": "rewrite",
      "bPrompt": "$31511$을 읽어 쓰고, 천의 자리 숫자 $1$과 십의 자리 숫자 $1$을 읽는 방법을 설명하세요.",
      "bAnswer": "삼만 천오백십일. 천의 자리와 십의 자리 숫자가 $1$이면 '일천', '일십'이라 하지 않고 '천', '십'처럼 자리 이름만 읽는다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "삼만 천오백십일"
          ]
        },
        {
          "anyOf": [
            "$1$은 '일'을 붙이지 않고 자리 이름만 읽음"
          ]
        }
      ],
      "bGoal": "자리 숫자가 $1$일 때 읽는 방법",
      "bReason": "원문의 수를 써서 읽은 말과 방법을 함께 답하게 했다.",
      "cDecision": "rewrite",
      "cReason": "뒤 설명에 그대로 나온 천·십을 제거하여 수 읽기의 규칙을 적용한다.",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$31511$을 읽으면 삼만 {천}오백{십}일이다.",
    "currentCSlotAnswers": [
      {
        "expected": "천",
        "equivalents": []
      },
      {
        "expected": "십",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "천과일천은국립국어원사전에유의어로기록되므로일천이라하지않는다는모든맥락의단정을보통읽기에서일을생략한다로고친다;전체복합읽기의인정범위는 별도검토한다.",
      "c": "천·십의표준교과서읽기빈칸과다른읽기표현을인정할지범위를명시해야하며일십은이번사전근거만으로확정하지 않는다."
    }
  },
  {
    "id": "e4-1-1-2-xc19",
    "sourceIndex": 1365,
    "grade": "e4",
    "source": {
      "sourceIndex": 1365,
      "sourceFingerprint": "de393204e7c10436d7596f756e76484b9ff425052df89ec7de7b2bac58fa9afa",
      "part": "e4plus",
      "id": "e4-1-1-2-xc19",
      "section": "초4::1-1 큰 수::1-1-2 다섯 자리 수 알아보기",
      "term": "숫자 카드로 가장 큰 수 만들기",
      "kind": "방법",
      "level": "상",
      "definition": "숫자 카드 다섯 장으로 가장 큰 다섯 자리 수를 만들려면 {큰 숫자}부터 만의 자리에 차례로 놓는다.",
      "example": {
        "prompt": "$85310$의 만의 자리 $8$과 천의 자리 $5$를 바꾸면 수가 작아지는 까닭은?",
        "answer": "만 $3$개가 줄고 천 $3$개만 늘어서"
      },
      "studentC": "숫자 카드 다섯 장으로 가장 큰 다섯 자리 수를 만들려면 □부터 만의 자리에 차례로 놓는다.",
      "answers": [
        "큰 숫자"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-2-xc19",
      "proposalFingerprint": "388a799cfd644b7a2ec1adf86f2af2252186fd91d3f2944ee968d82829e1d9a2",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "숫자 카드 $3$, $8$, $0$, $5$, $1$을 한 번씩 써서 가장 큰 다섯 자리 수를 만들고, 그렇게 놓은 까닭을 설명하세요.",
      "bAnswer": "$85310$. 높은 자리 숫자일수록 나타내는 값이 크므로 만의 자리부터 큰 숫자를 차례로 놓는다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$85310$"
          ]
        },
        {
          "anyOf": [
            "높은 자리일수록 값이 커서 큰 숫자를 높은 자리에 놓음"
          ]
        }
      ],
      "bGoal": "가장 큰 수를 만드는 방법과 까닭",
      "bReason": "원문 예제의 카드로 수를 만들고 까닭을 말하게 했다.",
      "cDecision": "keep",
      "cReason": "목표가 문장에 있고 빈칸은 '큰 숫자'라는 짧은 말이다.",
      "cSlotEquivalents": [],
      "answerNotes": "큰 숫자, 가장 큰 숫자, 큰 수 인정."
    },
    "currentCMarkedSentence": "숫자 카드 다섯 장으로 가장 큰 다섯 자리 수를 만들려면 {큰 숫자}부터 만의 자리에 차례로 놓는다.",
    "currentCSlotAnswers": [
      {
        "expected": "큰 숫자",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "다섯실제카드85310과높은자리에큰숫자이유의B는 명확하다.",
      "c": "큰숫자부터만의자리에차례로놓는다는말은모두한자리에넣는듯하므로만의자리부터일의자리까지큰숫자부터차례로라는두방향을 명시한다."
    }
  },
  {
    "id": "e4-1-1-3-xc13",
    "sourceIndex": 1385,
    "grade": "e4",
    "source": {
      "sourceIndex": 1385,
      "sourceFingerprint": "0af09992a99793d1f38bb53bc034e62ac80eee93ca4bdc59af8188cfc94d9be4",
      "part": "e4plus",
      "id": "e4-1-1-3-xc13",
      "section": "초4::1-1 큰 수::1-1-3 10000이 몇십 개, 몇백 개, 몇천 개인 수 알아보기",
      "term": "큰 수를 자리 값의 합으로 나타내기",
      "kind": "방법",
      "level": "중",
      "definition": "큰 수는 {각 자리 숫자가 나타내는 값의 합}으로 나타낼 수 있다. 숫자가 $0$인 자리의 값은 $0$이므로 합에서 생략할 수 있다.",
      "studentC": "큰 수는 □으로 나타낼 수 있다. 숫자가 $0$인 자리의 값은 $0$이므로 합에서 생략할 수 있다.",
      "answers": [
        "각 자리 숫자가 나타내는 값의 합"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-3-xc13",
      "proposalFingerprint": "5e8ac6782b16e550016d48a375bad4dc08f2898178929d3018cbb98f75d8c6f8",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$3020000$을 각 자리 숫자가 나타내는 값의 합으로 나타내고, 덧셈식에 수를 두 개만 써도 되는 까닭을 설명하세요.",
      "bAnswer": "$3000000+20000$. 나머지 자리는 숫자가 $0$이어서 나타내는 값이 $0$이므로 더하지 않아도 된다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$3000000+20000$"
          ]
        },
        {
          "anyOf": [
            "숫자가 $0$인 자리의 값은 $0$"
          ]
        }
      ],
      "bGoal": "큰 수를 자리 값의 합으로 쓰고 $0$인 자리를 생략하는 까닭",
      "bReason": "$0$이 많은 수를 새로 주어 생략의 까닭까지 말하게 했다.",
      "cDecision": "rewrite",
      "cReason": "'각 자리 숫자가 나타내는 값의 합'이라는 긴 구절이 빈칸이었다. 실제 수의 합으로 답하게 했다.",
      "cSlotEquivalents": [],
      "answerNotes": "두 수의 순서는 바뀌어도 정답."
    },
    "currentCMarkedSentence": "$3020000$을 각 자리 숫자가 나타내는 값의 합으로 쓰면 {$3000000$} $+$ {$20000$}이다. 숫자가 $0$인 자리의 값은 $0$이라 쓰지 않아도 된다.",
    "currentCSlotAnswers": [
      {
        "expected": "$3000000$",
        "equivalents": []
      },
      {
        "expected": "$20000$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "자리값3000000+20000과다른자리0을뺄수있는이유의B는명확하다.",
      "c": "덧셈순서는바꿔도맞으므로큰자리부터같은응답순서를명시해야두슬롯의값을 고정할수있다."
    }
  },
  {
    "id": "e4-1-1-3-xc20",
    "sourceIndex": 1391,
    "grade": "e4",
    "source": {
      "sourceIndex": 1391,
      "sourceFingerprint": "d2494354308837bc70c2fd3331d57ca23a9d51500bef710c8881aa3fee3dc6ea",
      "part": "e4plus",
      "id": "e4-1-1-3-xc20",
      "section": "초4::1-1 큰 수::1-1-3 10000이 몇십 개, 몇백 개, 몇천 개인 수 알아보기",
      "term": "백만 원 묶음",
      "kind": "성질",
      "level": "상",
      "definition": "만 원짜리 지폐를 $100$장씩 묶으면 한 묶음이 {백만 원}이다.",
      "example": {
        "prompt": "만 원짜리 $100$장을 백만 원 한 묶음으로 바꾸면 전체 금액이 달라지는가?",
        "answer": "아니다. 같은 양이라서"
      },
      "studentC": "만 원짜리 지폐를 $100$장씩 묶으면 한 묶음이 □이다.",
      "answers": [
        "백만 원"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-3-xc20",
      "proposalFingerprint": "f0130089b04d505eda1d7e2d369645ec36da18e1c34f2db9b7bb26a19f24258b",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "만 원짜리 지폐 $300$장을 $100$장씩 묶었습니다. 한 묶음은 얼마이고 모두 얼마인지 구하고, 묶어서 세어도 전체 금액이 달라지지 않는 까닭을 쓰세요.",
      "bAnswer": "한 묶음은 백만 원이고 $3$묶음이므로 삼백만 원이다. 묶는 것은 세는 방법만 바꾼 것이고 지폐의 수는 그대로이기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "한 묶음은 백만 원"
          ]
        },
        {
          "anyOf": [
            "모두 삼백만 원"
          ]
        },
        {
          "anyOf": [
            "지폐 수는 그대로"
          ]
        }
      ],
      "bGoal": "만 $100$개를 백만으로 묶어 세기",
      "bReason": "원문 예제(금액이 달라지는가)를 장수를 정한 상황으로 넓혔다.",
      "cDecision": "keep",
      "cReason": "익숙한 돈 상황이고 답은 금액 하나다.",
      "cSlotEquivalents": [],
      "answerNotes": "백만 원, $1000000$원, $100$만 원 인정."
    },
    "currentCMarkedSentence": "만 원짜리 지폐를 $100$장씩 묶으면 한 묶음이 {백만 원}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "백만 원",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "한묶음백만원·전체삼백만원과지폐수보존의B는분명하다.",
      "c": "금액을묻는C에는백만원외100만원·1000000원도같은양의표현으로인정해야하며단순읽기동의어와 구별한다."
    }
  },
  {
    "id": "e4-1-1-3-xc24",
    "sourceIndex": 1394,
    "grade": "e4",
    "source": {
      "sourceIndex": 1394,
      "sourceFingerprint": "d045993b8a00c611d1bbbeaa020ec6369d1537d261a628b918ce6fffd5862b7a",
      "part": "e4plus",
      "id": "e4-1-1-3-xc24",
      "section": "초4::1-1 큰 수::1-1-3 10000이 몇십 개, 몇백 개, 몇천 개인 수 알아보기",
      "term": "십만이 열 개를 넘을 때 쓰기",
      "kind": "방법",
      "level": "상",
      "definition": "십만의 묶음이 $10$개 이상이면 {$10$개를 백만 $1$개로 바꾸어} 자리에 맞추어 쓴다.",
      "example": {
        "prompt": "십만이 $13$개인 수의 백만의 자리 숫자가 $1$인 까닭은?",
        "answer": "십만 $10$개가 백만 $1$개로 바뀐다"
      },
      "studentC": "십만의 묶음이 $10$개 이상이면 □ 자리에 맞추어 쓴다.",
      "answers": [
        "$10$개를 백만 $1$개로 바꾸어"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-3-xc24",
      "proposalFingerprint": "7255dc53b9eb103ead01745ee74c1cfbb2586f67563ad0d6ddf29d98c76d5462",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "십만이 $13$개인 수를 숫자로 쓰고, 이 수의 백만의 자리 숫자가 $1$인 까닭을 설명하세요.",
      "bAnswer": "$1300000$. 십만 $13$개 가운데 $10$개가 백만 $1$개로 바뀌고 십만 $3$개가 남기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$1300000$"
          ]
        },
        {
          "anyOf": [
            "십만 $10$개가 백만 $1$개"
          ]
        }
      ],
      "bGoal": "십만이 $10$개 이상일 때 백만으로 바꾸어 쓰기",
      "bReason": "원문 예제의 수로 쓰기와 까닭을 함께 답하게 했다.",
      "cDecision": "rewrite",
      "cReason": "'$10$개를 백만 $1$개로 바꾸어'라는 긴 구절을 되살려 쓰게 했다. 실제 수로 바꾼 개수와 결과를 답하게 했다.",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "십만이 $13$개인 수는 십만 $10$개를 백만 {$1$}개로 바꾸어 {$1300000$}이라고 쓴다.",
    "currentCSlotAnswers": [
      {
        "expected": "$1$",
        "equivalents": []
      },
      {
        "expected": "$1300000$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "전체1300000과십만열개의백만하나교환을설명하는B는 맞다.",
      "c": "C에남은십만3개를더한다는조건과수전체를숫자로쓴다는응답범위를넣어부분교환과전체표기를 구별한다."
    }
  },
  {
    "id": "e4-1-1-4-xc1",
    "sourceIndex": 1396,
    "grade": "e4",
    "source": {
      "sourceIndex": 1396,
      "sourceFingerprint": "0e3465dd67bd8eedef960b1e8da1bcc99356392fd709ea64cebf6100c872471c",
      "part": "e4plus",
      "id": "e4-1-1-4-xc1",
      "section": "초4::1-1 큰 수::1-1-4 억 알아보기",
      "term": "$100000000$을 읽는 두 가지 말",
      "kind": "정의",
      "level": "하",
      "definition": "$100000000$은 {억} 또는 {일억}이라고 읽는다.",
      "studentC": "$100000000$은 □ 또는 □이라고 읽는다.",
      "answers": [
        "억",
        "일억"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-4-xc1",
      "proposalFingerprint": "e74f15cba3a2aa11820dba050e857c66c0454b69a9f4cb10cd2e4b767d3b394e",
      "learningRole": "naming",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "$100000000$을 읽는 두 가지 말",
      "bReason": "읽는 말 두 개를 쓰는 내용이라 C로만 확인한다.",
      "cDecision": "keep",
      "cReason": "수가 주어져 있고 빈칸 두 개가 짧은 읽는 말이다.",
      "cSlotEquivalents": [],
      "exclusionReason": "수 하나를 읽는 말 두 가지를 쓰는 단순 읽기라 설명할 뜻이나 까닭이 없다.",
      "answerNotes": "억, 일억의 순서는 바뀌어도 정답."
    },
    "currentCMarkedSentence": "$100000000$은 {억} 또는 {일억}이라고 읽는다.",
    "currentCSlotAnswers": [
      {
        "expected": "억",
        "equivalents": []
      },
      {
        "expected": "일억",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "두읽기약속만의B를 제외한다.",
      "c": "억·일억순서는자유이므로한빈칸에두바른읽기를인정하여순서나중복슬롯문제를 없앤다."
    }
  },
  {
    "id": "e4-1-1-4-xc2",
    "sourceIndex": 1397,
    "grade": "e4",
    "source": {
      "sourceIndex": 1397,
      "sourceFingerprint": "72db34df1b42fc24782ad5f8ac948479e2a8e7f3740a4356fb7cdfe37431fab2",
      "part": "e4plus",
      "id": "e4-1-1-4-xc2",
      "section": "초4::1-1 큰 수::1-1-4 억 알아보기",
      "term": "억을 숫자로 쓸 때의 $0$",
      "kind": "정의",
      "level": "하",
      "definition": "억을 숫자로 쓰면 $1$ 뒤에 $0$을 {여덟 개} 붙인다.",
      "example": {
        "prompt": "억을 숫자로 쓰면 $0$은 몇 개인가?",
        "answer": "$8$개"
      },
      "studentC": "억을 숫자로 쓰면 $1$ 뒤에 $0$을 □ 붙인다.",
      "answers": [
        "여덟 개"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-4-xc2",
      "proposalFingerprint": "62a595ca43b2046d2e61c4f744e855eb8bcaa3e359dcb3bd007c1126cce70353",
      "learningRole": "definition",
      "bDecision": "rewrite",
      "bPrompt": "천만을 숫자로 쓰면 $1$ 뒤에 $0$이 $7$개입니다. 억은 천만이 $10$개인 수임을 이용하여, 억을 숫자로 쓸 때 $0$이 몇 개인지 설명하세요.",
      "bAnswer": "$8$개. 억은 천만의 $10$배이고, $10$배가 되면 $0$이 하나 더 붙어 $7$개에서 $8$개가 된다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$8$개"
          ]
        },
        {
          "anyOf": [
            "천만의 $10$배라 $0$이 하나 늚"
          ]
        }
      ],
      "bGoal": "억을 숫자로 쓸 때 $0$의 개수와 까닭",
      "bReason": "개수만 묻지 않고 천만과의 관계로 까닭을 말하게 했다.",
      "cDecision": "keep",
      "cReason": "'$1$ 뒤에 $0$을 □ 붙인다'는 개수 하나로 답이 정해진다.",
      "cSlotEquivalents": [],
      "answerNotes": "여덟 개, $8$개 인정."
    },
    "currentCMarkedSentence": "억을 숫자로 쓰면 $1$ 뒤에 $0$을 {여덟 개} 붙인다.",
    "currentCSlotAnswers": [
      {
        "expected": "여덟 개",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "천만10배의추가0으로여덟0개인B이유는 맞다.",
      "c": "여덟개와8개는이문장에서같은개수이므로숫자표현의맥락대안을 보완한다."
    }
  },
  {
    "id": "e4-1-1-4-xc3",
    "sourceIndex": 1398,
    "grade": "e4",
    "source": {
      "sourceIndex": 1398,
      "sourceFingerprint": "cd9d5a7edd3aadb88d715a3b6a6b306a8d2c2089feb859bdbc00fc1c14a239e1",
      "part": "e4plus",
      "id": "e4-1-1-4-xc3",
      "section": "초4::1-1 큰 수::1-1-4 억 알아보기",
      "term": "억이 몇 개인 수 쓰고 읽기",
      "kind": "방법",
      "level": "하",
      "definition": "억이 몇 개인 수는 그 개수 뒤에 억을 붙여 읽고, 숫자로 쓸 때는 개수 뒤에 $0$을 {여덟 개} 붙인다.",
      "example": {
        "prompt": "억이 $4$개인 수를 $40000000$으로 쓰면 안 되는 까닭은?",
        "answer": "$4$가 천만의 자리에 놓여서"
      },
      "studentC": "억이 몇 개인 수는 그 개수 뒤에 억을 붙여 읽고, 숫자로 쓸 때는 개수 뒤에 $0$을 □ 붙인다.",
      "answers": [
        "여덟 개"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-4-xc3",
      "proposalFingerprint": "46a64e4e5779d6cdc595ea71362bab9539248a088b270e3ebf70f30ab4a1a3bd",
      "learningRole": "naming",
      "bDecision": "rewrite",
      "bPrompt": "억이 $4$개인 수를 $40000000$이라고 썼습니다. 이렇게 쓰면 안 되는 까닭을 $4$가 놓인 자리를 들어 설명하고, 바르게 고쳐 쓰세요.",
      "bAnswer": "$40000000$은 $0$이 $7$개라 $4$가 천만의 자리에 놓여 사천만이 된다. $0$을 $8$개 붙여 $400000000$으로 써야 $4$가 억의 자리에 놓인다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$4$가 천만의 자리에 놓임"
          ]
        },
        {
          "anyOf": [
            "$400000000$"
          ]
        }
      ],
      "bGoal": "억이 몇 개인 수를 쓰는 방법",
      "bReason": "원문 예제의 잘못 쓴 수를 주어 까닭과 바른 수를 함께 답하게 했다.",
      "cDecision": "rewrite",
      "cReason": "'그 개수'가 어떤 수인지 가려져 있었고 빈칸이 e4-1-1-4-xc2와 같았다. 개수를 $4$로 정해 실제 수까지 쓰게 했다.",
      "cSlotEquivalents": [],
      "answerNotes": "첫 빈칸은 여덟, $8$ 인정."
    },
    "currentCMarkedSentence": "억이 $4$개인 수는 사억이라고 읽고, 숫자로 쓰면 $4$ 뒤에 $0$을 {여덟} 개 붙인 {$400000000$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "여덟",
        "equivalents": []
      },
      {
        "expected": "$400000000$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "4의잘못된천만위치와바른400000000을요청하는B는 명확하다.",
      "c": "여덟과8은뒤의개를붙였을때같은0개수이므로이슬롯의맥락대안을 보완한다."
    }
  },
  {
    "id": "e4-1-1-4-xc9",
    "sourceIndex": 1403,
    "grade": "e4",
    "source": {
      "sourceIndex": 1403,
      "sourceFingerprint": "8ddb331541e8d7689e97031362ab35d784965572cb52a726c7c097408e2e7a20",
      "part": "e4plus",
      "id": "e4-1-1-4-xc9",
      "section": "초4::1-1 큰 수::1-1-4 억 알아보기",
      "term": "십억",
      "kind": "정의",
      "level": "하",
      "definition": "억이 $10$개인 수를 {십억}이라 하고 $1000000000$으로 쓴다.",
      "example": {
        "prompt": "십억은 억이 몇 개인 수인가?",
        "answer": "$10$개"
      },
      "studentC": "억이 $10$개인 수를 □이라 하고 $1000000000$으로 쓴다.",
      "answers": [
        "십억"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-4-xc9",
      "proposalFingerprint": "de74758563ad66939c94f239136fdda536536519ef6666be0526f40c4264d7fe",
      "learningRole": "definition",
      "bDecision": "rewrite",
      "bPrompt": "십억은 억이 몇 개인 수인지 쓰고, 십억을 숫자로 쓰면 $1$ 뒤에 $0$이 몇 개 붙는지 쓰세요.",
      "bAnswer": "억이 $10$개인 수이고, $1$ 뒤에 $0$이 $9$개 붙습니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "억이 $10$개"
          ]
        },
        {
          "anyOf": [
            "$0$이 $9$개",
            "$1000000000$"
          ]
        }
      ],
      "bGoal": "십억의 뜻과 쓰기 확인",
      "bReason": "이름만이 아니라 억의 개수와 $0$의 개수를 함께 말하게 함",
      "cDecision": "keep",
      "cReason": "억 $10$개와 숫자 표기가 보여 이름 하나만 쓰면 됨",
      "cSlotEquivalents": [
        [
          "$10$억"
        ]
      ]
    },
    "currentCMarkedSentence": "억이 $10$개인 수를 {십억}이라 하고 $1000000000$으로 쓴다.",
    "currentCSlotAnswers": [
      {
        "expected": "십억",
        "equivalents": [
          "$10$억"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "억열개와0아홉개를각각묻는데두번째기준의맨숫자1000000000을0개수9와같은답으로두지말고1뒤0이아홉개인표기라고완전한의미로 쓰거나삭제한다.",
      "c": "십억과10억은같은수이름의문맥표현이다."
    }
  },
  {
    "id": "e4-1-1-4-xc11",
    "sourceIndex": 1405,
    "grade": "e4",
    "source": {
      "sourceIndex": 1405,
      "sourceFingerprint": "1a70a52e91c63597023ac296b8c8ee07ceaab674e629315fa45889f136edfe28",
      "part": "e4plus",
      "id": "e4-1-1-4-xc11",
      "section": "초4::1-1 큰 수::1-1-4 억 알아보기",
      "term": "큰 수를 네 자리씩 끊어 읽는 까닭",
      "kind": "방법",
      "level": "중",
      "definition": "$10000$개씩 모일 때마다 만, 억으로 단위가 바뀐다. 오른쪽부터 {네 자리씩} 끊은 묶음은 차례로 {낱개, 만, 억의 개수}를 나타낸다.",
      "studentC": "$10000$개씩 모일 때마다 만, 억으로 단위가 바뀐다. 오른쪽부터 □ 끊은 묶음은 차례로 □를 나타낸다.",
      "answers": [
        "네 자리씩",
        "낱개, 만, 억의 개수"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-4-xc11",
      "proposalFingerprint": "2d1c892179434b2c947dd07064c61be46f1d2b1e7899b67e0db90bf4ba7147f6",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "큰 수를 읽을 때 오른쪽부터 네 자리씩 끊어 읽습니다. 그 까닭을 만과 억이 각각 바로 앞 단위의 몇 배인지 써서 설명하세요.",
      "bAnswer": "만은 일의 $10000$배, 억은 만의 $10000$배이므로 네 자리마다 새 단위가 붙기 때문입니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$10000$배마다 단위가 바뀐다",
            "$10000$개가 모이면 새 단위가 된다",
            "네 자리마다 새 단위가 붙는다"
          ]
        }
      ],
      "bGoal": "네 자리씩 끊는 까닭 설명",
      "bReason": "끊는 방법이 아니라 $10000$배마다 단위가 바뀌는 까닭을 물음",
      "cDecision": "rewrite",
      "cReason": "둘째 빈칸이 긴 구절이고 앞 문장에 만, 억이 미리 나와 있음",
      "cSlotEquivalents": [
        [
          "$4$"
        ],
        [],
        []
      ]
    },
    "currentCMarkedSentence": "큰 수는 $10000$배가 될 때마다 새 단위 이름이 붙으므로 오른쪽부터 {네} 자리씩 끊어 읽는다. 끊은 묶음은 오른쪽부터 차례로 낱개, {만}, {억}이 몇 개인지를 나타낸다.",
    "currentCSlotAnswers": [
      {
        "expected": "네",
        "equivalents": [
          "$4$"
        ]
      },
      {
        "expected": "만",
        "equivalents": []
      },
      {
        "expected": "억",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "바로앞단위는천→만·천만→억으로해석될수있어일→만·만→억을명시해야한다;기준에도요청한두10000배관계를넣고네자리라는이미준규칙복사만으로통과하지않게 한다.",
      "c": "4·만·억의블록순서는맞으며숫자4와네는같은자리수표현이다."
    }
  },
  {
    "id": "e4-1-1-4-xc19",
    "sourceIndex": 1411,
    "grade": "e4",
    "source": {
      "sourceIndex": 1411,
      "sourceFingerprint": "3df1aacf045d4b8164b6e816c05fbccc00c9fe997201c65731525bd78d94f148",
      "part": "e4plus",
      "id": "e4-1-1-4-xc19",
      "section": "초4::1-1 큰 수::1-1-4 억 알아보기",
      "term": "네 자리가 모두 $0$인 단위",
      "kind": "방법",
      "level": "상",
      "definition": "네 자리씩 끊었을 때 한 단위의 네 자리가 모두 $0$이면 그 단위는 {이름도 읽지 않는다}.",
      "example": {
        "prompt": "$500000000$을 읽을 때 «만»이라는 말이 나오지 않는 까닭은?",
        "answer": "만 단위 네 자리가 모두 $0$이다"
      },
      "studentC": "네 자리씩 끊었을 때 한 단위의 네 자리가 모두 $0$이면 그 단위는 □.",
      "answers": [
        "이름도 읽지 않는다"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-4-xc19",
      "proposalFingerprint": "b301f382b987d9d2087faca36ddada02cbbe52e9d138730e148c721109748901",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$500000000$은 '오억'이라고 읽습니다. 읽을 때 '만'이라는 말이 나오지 않는 까닭을 네 자리씩 끊어서 설명하세요.",
      "bAnswer": "오른쪽부터 네 자리씩 끊으면 만 단위 네 자리가 $0000$으로 모두 $0$이라서 만은 읽지 않습니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "만 단위 네 자리가 모두 $0$",
            "만 단위 묶음이 $0000$",
            "만이 하나도 없다"
          ]
        }
      ],
      "bGoal": "모두 $0$인 단위를 안 읽는 까닭",
      "bReason": "원문 예 $5$억으로 만을 읽지 않는 까닭을 설명하게 함",
      "cDecision": "rewrite",
      "cReason": "문장 끝 '이름도 읽지 않는다'를 통째로 되살려야 하는 빈칸임",
      "cSlotEquivalents": [
        [
          "영"
        ],
        [
          "$5$억"
        ]
      ]
    },
    "currentCMarkedSentence": "$500000000$을 오른쪽부터 네 자리씩 끊으면 $5$, $0000$, $0000$이다. 만 단위 네 자리가 모두 {$0$}이므로 '만'은 읽지 않고 {오억}이라고 읽는다.",
    "currentCSlotAnswers": [
      {
        "expected": "$0$",
        "equivalents": [
          "영"
        ]
      },
      {
        "expected": "오억",
        "equivalents": [
          "$5$억"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "만이하나도없다는말은전체만묶음수와혼동되므로억단위아래의만단위네자리가모두0이라는뜻으로기준을 한정한다.",
      "c": "첫0은앞의0000에서그대로베끼므로빈칸을빼고같은읽기오억만확인한다."
    }
  },
  {
    "id": "e4-1-1-4-xc21",
    "sourceIndex": 1413,
    "grade": "e4",
    "source": {
      "sourceIndex": 1413,
      "sourceFingerprint": "baee85a946a4886c1de6eda997d4e042241d2bde135fdaf244c6aae9a789b4a2",
      "part": "e4plus",
      "id": "e4-1-1-4-xc21",
      "section": "초4::1-1 큰 수::1-1-4 억 알아보기",
      "term": "천만이 열 개를 넘을 때",
      "kind": "방법",
      "level": "상",
      "definition": "천만의 묶음이 $10$개 이상이면 {$10$개를 억 $1$개로 바꾸어} 읽고 쓴다.",
      "example": {
        "prompt": "천만이 $13$개인 수를 $1$억 $3000$만이라고 읽는 까닭은?",
        "answer": "천만 $10$개가 억 $1$개라서"
      },
      "studentC": "천만의 묶음이 $10$개 이상이면 □ 읽고 쓴다.",
      "answers": [
        "$10$개를 억 $1$개로 바꾸어"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-4-xc21",
      "proposalFingerprint": "1a1c0f43a1c013d03c3795dce6e9582c6d5bf13abbcf7ad41c9f36f00bd10850",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "천만이 $13$개인 수는 $1$억 $3000$만이라고 읽습니다. 그렇게 읽는 까닭을 설명하세요.",
      "bAnswer": "천만 $10$개는 $1$억이므로 $10$개를 억 $1$개로 바꾸면 천만 $3$개가 남아 $1$억 $3000$만입니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "천만 $10$개가 $1$억",
            "천만 $10$개를 억 $1$개로 바꾼다"
          ]
        }
      ],
      "bGoal": "천만 $10$개를 억으로 바꾸기",
      "bReason": "원문 예 천만 $13$개로 묶음을 바꾸는 까닭을 말하게 함",
      "cDecision": "rewrite",
      "cReason": "빈칸이 '$10$개를 억 $1$개로 바꾸어'라는 긴 구절이라 답 범위가 넓음",
      "cSlotEquivalents": [
        [
          "열"
        ],
        [
          "삼천"
        ]
      ]
    },
    "currentCMarkedSentence": "천만이 $13$개인 수는 천만 {$10$}개를 억 $1$개로 바꾸어 $1$억 {$3000$}만이라고 읽는다.",
    "currentCSlotAnswers": [
      {
        "expected": "$10$",
        "equivalents": [
          "열"
        ]
      },
      {
        "expected": "$3000$",
        "equivalents": [
          "삼천"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "천만 열세 개를 억과 만으로 읽는 이유를 묻는 범위에 남은 세 개가 3000만이라는 뜻도 기준에 포함해야 한다.",
      "c": "열 개가 한 억이 되고 남은 세 천만을 3000만으로 쓰는 두 계산 빈칸은 유용하다."
    }
  },
  {
    "id": "e4-1-1-4-xc22",
    "sourceIndex": 1414,
    "grade": "e4",
    "source": {
      "sourceIndex": 1414,
      "sourceFingerprint": "cbdc99d18322590ef8029c6a05b3310db4fc09150d25fa502c2856f8e2b3510d",
      "part": "e4plus",
      "id": "e4-1-1-4-xc22",
      "section": "초4::1-1 큰 수::1-1-4 억 알아보기",
      "term": "합해서 억이 되는 두 몇천만",
      "kind": "성질",
      "level": "상",
      "definition": "두 몇천만의 합이 $1$억이 되려면 천만의 묶음 수의 합이 {$10$}이어야 한다.",
      "example": {
        "prompt": "$6000$만에 $4000$만을 더하면 $1$억이 되는 까닭은?",
        "answer": "천만이 모두 $10$개라서"
      },
      "studentC": "두 몇천만의 합이 $1$억이 되려면 천만의 묶음 수의 합이 □이어야 한다.",
      "answers": [
        "$10$"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-4-xc22",
      "proposalFingerprint": "333432b0ecdd46e885884995dec67ad9df309c4c815b6bb90eed15bba670b0ed",
      "learningRole": "application",
      "bDecision": "rewrite",
      "bPrompt": "$6000$만과 $4000$만을 더하면 $1$억이 됩니다. 이처럼 더해서 $1$억이 되는 '몇천만'과 '몇천만'의 짝을 하나 더 쓰고, 그렇게 고른 까닭을 천만의 개수로 설명하세요.",
      "bAnswer": "예: $7000$만과 $3000$만. 천만이 $7$개와 $3$개로 모두 $10$개가 되어 $1$억이기 때문입니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$7000$만과 $3000$만",
            "$8000$만과 $2000$만",
            "$9000$만과 $1000$만",
            "$5000$만과 $5000$만"
          ]
        },
        {
          "anyOf": [
            "천만이 모두 $10$개",
            "천만 $10$개가 $1$억"
          ]
        }
      ],
      "bGoal": "합이 $1$억인 몇천만 짝 만들기",
      "bReason": "xc5와 겹치지 않게 새 짝을 만들고 까닭을 말하게 함",
      "cDecision": "rewrite",
      "cReason": "'두 몇천만', '묶음 수의 합'이 추상적이라 구체 수로 바꿈",
      "cSlotEquivalents": [
        [
          "열"
        ],
        [
          "억",
          "일억",
          "$100000000$"
        ]
      ],
      "answerNotes": "$4000$만과 $6000$만처럼 순서만 바꾼 짝은 새 짝으로 보지 않는다."
    },
    "currentCMarkedSentence": "$6000$만은 천만이 $6$개, $4000$만은 천만이 $4$개인 수이다. 두 수를 더하면 천만이 모두 {$10$}개가 되어 {$1$억}이 된다.",
    "currentCSlotAnswers": [
      {
        "expected": "$10$",
        "equivalents": [
          "열"
        ]
      },
      {
        "expected": "$1$억",
        "equivalents": [
          "억",
          "일억",
          "$100000000$"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "예시와 다른 두 수의 합을 요구하므로 열 천만이 되는 새 짝의 순서를 바꾼 표현도 허용해야 한다.",
      "c": "여섯 천만과 네 천만이 열 천만이라는 수량 변환은 분명하다."
    }
  },
  {
    "id": "e4-1-1-4-xc23",
    "sourceIndex": 1415,
    "grade": "e4",
    "source": {
      "sourceIndex": 1415,
      "sourceFingerprint": "f550ea7fa528cf903ca45b4087516c5528e0f0bff1967934ab16729be6483520",
      "part": "e4plus",
      "id": "e4-1-1-4-xc23",
      "section": "초4::1-1 큰 수::1-1-4 억 알아보기",
      "term": "숫자 카드로 가장 큰 아홉 자리 수",
      "kind": "방법",
      "level": "상",
      "definition": "아홉 자리 수에서 억의 자리 숫자가 $1$ 커지면 나머지 여덟 자리가 만드는 차이보다 큰 {$1$억}이 커지므로, 가장 큰 숫자를 {억의 자리}에 놓는다.",
      "studentC": "아홉 자리 수에서 억의 자리 숫자가 $1$ 커지면 나머지 여덟 자리가 만드는 차이보다 큰 □이 커지므로, 가장 큰 숫자를 □에 놓는다.",
      "answers": [
        "$1$억",
        "억의 자리"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-4-xc23",
      "proposalFingerprint": "b69de9085ec16312d1241cf9ebb751eaff99cec3c30cef85d1b80daac93ee033",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "서로 다른 숫자 카드 $9$장을 한 번씩 써서 가장 큰 아홉 자리 수를 만들려고 합니다. 가장 큰 숫자를 어느 자리에 놓아야 하는지 쓰고, 그 까닭을 설명하세요.",
      "bAnswer": "억의 자리에 놓습니다. 가장 높은 자리의 숫자가 나타내는 값이 가장 커서, 억의 자리 숫자가 클수록 수가 커지기 때문입니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "억의 자리",
            "가장 높은 자리",
            "맨 왼쪽 자리"
          ]
        },
        {
          "anyOf": [
            "높은 자리의 숫자일수록 나타내는 값이 크다",
            "억의 자리 $1$은 아래 자리 전체보다 크다",
            "억의 자리 숫자가 클수록 수가 크다"
          ]
        }
      ],
      "bGoal": "큰 숫자를 억의 자리에 놓는 까닭",
      "bReason": "놓는 자리와 자리 값의 크기를 함께 설명하게 함",
      "cDecision": "rewrite",
      "cReason": "'여덟 자리가 만드는 차이보다 큰'이 어려워 쉬운 문장으로 나눔",
      "cSlotEquivalents": [
        [],
        [
          "일억",
          "$100000000$"
        ],
        []
      ]
    },
    "currentCMarkedSentence": "아홉 자리 수에서 가장 높은 자리는 {억}의 자리이다. 이 자리의 숫자가 $1$ 커지면 수는 {$1$억}만큼 커지므로, 가장 큰 아홉 자리 수를 만들 때는 가장 {큰} 숫자를 이 자리에 놓는다.",
    "currentCSlotAnswers": [
      {
        "expected": "억",
        "equivalents": []
      },
      {
        "expected": "$1$억",
        "equivalents": [
          "일억",
          "$100000000$"
        ]
      },
      {
        "expected": "큰",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "가장 큰 수에서 큰 숫자를 높은 자리에 놓는 이유는 분명하다.",
      "c": "억 자리 숫자를 하나 크게 바꾸는 문장은 그 숫자가 9보다 작다는 조건을 넣어야 한다."
    }
  },
  {
    "id": "e4-1-1-4-xc24",
    "sourceIndex": 1416,
    "grade": "e4",
    "source": {
      "sourceIndex": 1416,
      "sourceFingerprint": "06f5514e94024817e859f1145b43fe0117b37f961db18c8b0665f81d8c7278be",
      "part": "e4plus",
      "id": "e4-1-1-4-xc24",
      "section": "초4::1-1 큰 수::1-1-4 억 알아보기",
      "term": "억이 $1$개부터 $9$개까지인 수의 자릿수 확인",
      "kind": "성질",
      "level": "상",
      "definition": "억의 개수가 $1$부터 $9$까지인 수는 {아홉 자리}이다. 바르게 썼는지는 {각 자리의 값}도 확인해야 한다.",
      "example": {
        "prompt": "$2$억 $5000$만을 $25000000$으로 쓰면 잘못인 까닭은?",
        "answer": "$2$가 천만의 자리에 있어서"
      },
      "studentC": "억의 개수가 $1$부터 $9$까지인 수는 □이다. 바르게 썼는지는 □도 확인해야 한다.",
      "answers": [
        "아홉 자리",
        "각 자리의 값"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-4-xc24",
      "proposalFingerprint": "3eab70151b624263015888aa8264e3579c7cb20009d6beb0091b3025d5250ef3",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$2$억 $5000$만을 $25000000$으로 썼습니다. 잘못 쓴 까닭을 자릿수나 $2$의 자리로 설명하고, 바르게 고쳐 쓰세요.",
      "bAnswer": "$25000000$은 여덟 자리 수라서 $2$가 천만의 자리에 있습니다. 억이 있는 수는 아홉 자리여야 하므로 $250000000$으로 씁니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$2$가 천만의 자리에 있다",
            "여덟 자리 수이다",
            "아홉 자리 수여야 한다",
            "$0$이 하나 모자란다"
          ]
        },
        {
          "anyOf": [
            "$250000000$"
          ]
        }
      ],
      "bGoal": "자릿수로 잘못 쓴 수 고치기",
      "bReason": "원문 예의 잘못을 자릿수와 자리 값으로 짚고 고치게 함",
      "cDecision": "rewrite",
      "cReason": "둘째 빈칸 '각 자리의 값'은 무엇을 쓸지 문장만으로 알 수 없음",
      "cSlotEquivalents": [
        [
          "$9$"
        ],
        []
      ]
    },
    "currentCMarkedSentence": "억이 $1$개부터 $9$개까지 들어 있는 수는 모두 {아홉} 자리 수이다. $2$억 $5000$만을 $25000000$으로 쓰면 $2$가 {천만}의 자리에 놓이므로 잘못 쓴 것이다.",
    "currentCSlotAnswers": [
      {
        "expected": "아홉",
        "equivalents": [
          "$9$"
        ]
      },
      {
        "expected": "천만",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "이 수가 아홉 자리인 근거를 설명해야 하며 억이 있는 모든 수가 아홉 자리라는 일반화는 고쳐야 한다.",
      "c": "억 자리 숫자가 1부터 9인 조건을 둔 자리 수 판단은 명확하다."
    }
  },
  {
    "id": "e4-1-1-4-xc28",
    "sourceIndex": 1419,
    "grade": "e4",
    "source": {
      "sourceIndex": 1419,
      "sourceFingerprint": "9faa6c86e3feb16990bd458473c50dd6811ea8ac411da59a7c247c12b70dcb22",
      "part": "e4plus",
      "id": "e4-1-1-4-xc28",
      "section": "초4::1-1 큰 수::1-1-4 억 알아보기",
      "term": "억과 만을 붙여 읽는 차례",
      "kind": "방법",
      "level": "상",
      "definition": "억과 만 단위가 함께 있는 수는 높은 단위부터 {억}, {만}의 차례로 붙여 읽는다.",
      "studentC": "억과 만 단위가 함께 있는 수는 높은 단위부터 □, □의 차례로 붙여 읽는다.",
      "answers": [
        "억",
        "만"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-4-xc28",
      "proposalFingerprint": "e4af67d87abfacfa7221cfef5efc91b0a495f8d9558ef06d77270d12029f3306",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$300450000$을 읽고, 억과 만 가운데 어느 단위부터 읽었는지 쓰세요.",
      "bAnswer": "삼억 사십오만이라고 읽습니다. 높은 단위인 억부터 읽고 그다음 만을 읽습니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "삼억 사십오만",
            "$3$억 $45$만"
          ]
        },
        {
          "anyOf": [
            "억부터 읽는다",
            "높은 단위부터 읽는다"
          ]
        }
      ],
      "bGoal": "억, 만 차례로 붙여 읽기",
      "bReason": "실제 수를 읽어 보며 읽는 차례를 말하게 함",
      "cDecision": "keep",
      "cReason": "'높은 단위부터'라는 기준이 있어 두 낱말의 차례만 쓰면 됨",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "억과 만 단위가 함께 있는 수는 높은 단위부터 {억}, {만}의 차례로 붙여 읽는다.",
    "currentCSlotAnswers": [
      {
        "expected": "억",
        "equivalents": []
      },
      {
        "expected": "만",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "억과 만 단위를 높은 자리부터 읽는 순서와 제시된 수의 읽기를 함께 확인한다.",
      "c": "문장에 이미 억과 만을 모두 써 두고 두 단위 이름을 빈칸에 요구하므로 실제 수의 읽기로 바꿔야 한다."
    }
  },
  {
    "id": "e4-1-1-5-xc1",
    "sourceIndex": 1420,
    "grade": "e4",
    "source": {
      "sourceIndex": 1420,
      "sourceFingerprint": "dc314e31516ecbb3ddc28df5b97137132d2c6d8eb54612b7dc166922451ea7cf",
      "part": "e4plus",
      "id": "e4-1-1-5-xc1",
      "section": "초4::1-1 큰 수::1-1-5 조 알아보기",
      "term": "$1000000000000$을 읽는 두 가지 말",
      "kind": "정의",
      "level": "하",
      "definition": "$1000000000000$은 {조} 또는 {일조}라고 읽는다.",
      "studentC": "$1000000000000$은 □ 또는 □라고 읽는다.",
      "answers": [
        "조",
        "일조"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-5-xc1",
      "proposalFingerprint": "61aab84186d34b61da13aa2be087883e1ced1c71e7ab7c6f2a5f326e919744bc",
      "learningRole": "naming",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "B 없음: $1$조 읽는 말",
      "bReason": "수 하나를 읽는 이름만 답하게 되어 설명거리가 없음",
      "cDecision": "keep",
      "cReason": "수가 보이고 읽는 말 둘을 쓰는 익숙한 낱말 빈칸임",
      "cSlotEquivalents": [
        [
          "일조"
        ],
        [
          "조"
        ]
      ],
      "exclusionReason": "수 하나를 읽는 이름만 쓰는 단순 읽기라 까닭이나 방법을 물을 수 없다.",
      "answerNotes": "두 빈칸의 순서는 바뀌어도 정답이다."
    },
    "currentCMarkedSentence": "$1000000000000$은 {조} 또는 {일조}라고 읽는다.",
    "currentCSlotAnswers": [
      {
        "expected": "조",
        "equivalents": [
          "일조"
        ]
      },
      {
        "expected": "일조",
        "equivalents": [
          "조"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "단위 이름만 묻는 B 제외는 유지한다.",
      "c": "조와 일조를 순서 없는 두 빈칸으로 받으면 같은 말을 두 번 써도 통과하므로 한 빈칸의 대체 답으로 받아야 한다."
    }
  },
  {
    "id": "e4-1-1-5-xc3",
    "sourceIndex": 1422,
    "grade": "e4",
    "source": {
      "sourceIndex": 1422,
      "sourceFingerprint": "2d14b46ec2322e999f11fefb1643924f8e6ef6e5d2bcc2fbb53d55a8fafef503",
      "part": "e4plus",
      "id": "e4-1-1-5-xc3",
      "section": "초4::1-1 큰 수::1-1-5 조 알아보기",
      "term": "조의 자리",
      "kind": "정의",
      "level": "하",
      "definition": "열세 자리 수에서 맨 왼쪽 자리는 {조의 자리}이다.",
      "studentC": "열세 자리 수에서 맨 왼쪽 자리는 □이다.",
      "answers": [
        "조의 자리"
      ]
    },
    "currentProposal": {
      "id": "e4-1-1-5-xc3",
      "proposalFingerprint": "09cbf5a444bf07aff22ff51daeac131a7d699b229da999a3cf47bb87fb11e709",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "열세 자리 수의 맨 왼쪽 자리가 무슨 자리인지 쓰고, 오른쪽부터 네 자리씩 끊어서 그 까닭을 설명하세요.",
      "bAnswer": "조의 자리입니다. 오른쪽부터 일, 만, 억 단위가 네 자리씩 열두 자리를 차지하고, 그다음 열세 번째 자리가 조의 자리입니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "조의 자리"
          ]
        },
        {
          "anyOf": [
            "일, 만, 억 단위가 네 자리씩 열두 자리",
            "열두 자리 다음이 조의 자리",
            "억 단위 네 자리의 왼쪽이 조"
          ]
        }
      ],
      "bGoal": "열세 번째 자리가 조인 까닭",
      "bReason": "네 자리씩 끊어 세어 조의 자리를 찾는 과정을 말하게 함",
      "cDecision": "keep",
      "cReason": "자릿수와 위치가 보이고 자리 이름 하나만 쓰면 됨",
      "cSlotEquivalents": [
        [
          "조",
          "일조의 자리"
        ]
      ]
    },
    "currentCMarkedSentence": "열세 자리 수에서 맨 왼쪽 자리는 {조의 자리}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "조의 자리",
        "equivalents": [
          "조",
          "일조의 자리"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "네 자리 묶음 세 개 다음 자리가 조라는 설명은 자리 수와 단위를 연결한다.",
      "c": "일조의자리는 자리 이름이 아니므로 대체 답에서 빼고 조의 자리와 문맥상 조만 구분해 검토한다."
    }
  }
]
