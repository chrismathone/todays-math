제공 순서 모든 ID에 대해 JSON 배열만 출력한다. 각 행은 수정 패치 {id,inputProposalFingerprint,변경하는필드들}이다. id와 현재 지문 해시는 필수이고 바뀌지 않은 필드는 복사하지 않는다. 직접 독자의 B/C 지적을 실제 문장과 채점 기준의 수정으로 해소하라. 지적이 수학적으로 틀렸으면 변경 대신 repairDisagreement에 이유와 실제 올바른 수학을 써라. 코멘트나 카운트만 고쳐서 문제를 해결했다고 하지 마라.
B를 바꾸면 bDecision,bPrompt,bAnswer,bRequiredIdeas,bGoal,bReason을 함께 완성한다. bDecision은 rewrite/exclude. exclude는 bPrompt,bAnswer null, bRequiredIdeas [], exclusionReason에 B만 제외하는 구체 이유와 알려진 실제 대응 ID를 기록한다. 초등에 익숙한 이름의 정의 질문은 가능하지만 제목 하나+설명하시오, 답 하나 대기, 의미 없는 이유 묻기는 금지한다. 설명 목표·조건·대상·응답 범위를 명시하고 질문에 예상 답은 넣지 않는다. 구체적 계산은 일반 방법·뜻·관계도 확인한다. requiredIdeas=[{anyOf:['한 가지 필수 의미의 유효한 표현', '그 의미를 만족하는 별도의 다른 방법']}]; 꼭 요청한 것만 필수다. 결과·식·방법·조건을 쓰라고 했으면 실제로 기준에 담고 묻지 않았으면 강제하지 않는다. 단순한 입력 되풀이를 설명으로 받지 않는다. 서로 다른 올바른 풀이의 필수 단계를 AND로 섞지 말고 전체 대체 풀이를 독립 anyOf 문자열로 적는다. 특정 예시만을 정답으로 강제하지 않는다. 역할을 바꾸면 learningRole=definition/procedure/reason/application/naming 중 실제 질문에 맞게 적는다.
C를 바꾸면 cDecision,cAfter,cSlotEquivalents,cReason을 함께 적는다. rewrite의 cAfter는 정답 부분을 {답}으로 표시한 실제 완성 학생 문장이고 1~4슬롯이다. 짧고 유용한 비교·계산 빈칸을 보존한다. 실제 대상 없이 긴 키워드를 복원하거나 부사만 채우게 하지 않는다. 빈칸과 같은 값을 다른 곳에서 공개하지 않는다. 입력의 수가 바뀐 역할에서 다시 답인 유용한 관계(몫 검산, 같은 거리 등)는 무조건 복사로 취급하지 않는다. 순서 없는 두 답은 같은 말을 두 번 써도 통과하는 슬롯별 대안으로 해결하지 말고 순서를 명시하거나 한 빈칸으로 줄인다. cSlotEquivalents는 각 슬롯의 대체 답 배열로서 수·읽기·단위·자리·횟수의 역할을 구별하되 그 문장에서 옳은 서로 다른 답은 허용한다. cDecision=keep은 원본 C 그대로 고정이므로 새 문장을 주지 않는다. exclude는 해당 C의 구체적인 낮은 이점 또는 반복 이유를 cReason으로 기록하고 cAfter=null, cSlotEquivalents=[]로 쓴다. 별도 remove:['cAfter','cSlotEquivalents'] 등으로 이전 필드 제거를 요청할 수 있다.
일반 학습 설명 A/SRS는 C와 별개다. coreAfter를 고칠 때는 실제 수학 오류나 빠진 조건을 고칠 때만이며 원래 표적과 일반 뜻을 보존한다. coreReason을 함께 기록한다. coreAfter도 {답} 1~4개, 보이는 전체 길이 8~160자로 만든다. C를 고쳤다는 이유로 A를 자동 대체하지 않는다.
숫자·수학 기호는 $...$ KaTeX, 곱은 	imes, 나눗셈은 div, 계산 내 빈칸 기호는 square이며 표시용 {답}과 LaTex의 중괄호를 혼동하지 않는다. 모든 조사·괄호·수식이 학생에게 실제로 읽혀야 한다. 쉬운 학년 말로 쓰고 새로운 이름이나 낯선 문자 변수를 만들지 않는다. 그림이 필요한 현재 질문은 실제 위치·수·이름을 텍스트에 제시하여 자립시키거나 그 form만 제외한다. 꼭 필요한 새 그림·조작 사례는 exampleNeeded에 무엇인지 적되 없는 그림을 이미 있는 것처럼 참조하지 않는다.
최종 승인·자동 테스트 pass·실제 독자가 재독했다는 말은 출력하지 않는다. 우리는 이 후보를 나중에 직접 읽고 원본과 확인한다. 다음 자료의 모든 ID를 빠짐없이 처리하라.

[
  {
    "id": "e3-2-1-2-xc14",
    "sourceIndex": 960,
    "grade": "e3",
    "source": {
      "sourceIndex": 960,
      "sourceFingerprint": "b1935a5b4f6105afa2b8b32e4471f43e654756eb9f6b0299a2de7234304398d6",
      "part": "e3plus",
      "id": "e3-2-1-2-xc14",
      "section": "초3::2-1 곱셈::2-1-2 (세 자리 수)×(한 자리 수) (2)",
      "term": "끝이 $0$인 곱",
      "kind": "성질",
      "level": "중",
      "definition": "$725\\times4=2900$처럼 일의 자리가 {$0$}인 곱도 있다.",
      "studentC": "$725\\times4=2900$처럼 일의 자리가 □인 곱도 있다.",
      "answers": [
        "$0$"
      ]
    },
    "currentProposal": {
      "id": "e3-2-1-2-xc14",
      "proposalFingerprint": "7dbb693fd8c2ece5c437523545196470ae51ce2225239207d10faf8eed4b7852",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$725$와 $4$는 모두 일의 자리 숫자가 $0$이 아닌데 $725\\times4$의 곱은 일의 자리 숫자가 $0$입니다. 그 까닭을 일의 자리 계산으로 설명해 보세요.",
      "bAnswer": "일의 자리의 곱 $5\\times4=20$에서 $2$는 십의 자리로 올리고 일의 자리에는 $0$이 남기 때문입니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$5\\times 4=20$"
          ]
        },
        {
          "anyOf": [
            "일의 자리에 $0$이 남고 $2$는 올린다"
          ]
        }
      ],
      "bGoal": "올림 때문에 곱의 일의 자리가 0이 되는 까닭",
      "bReason": "'0인 곱도 있다'는 사실에서 그 까닭을 묻는 질문으로 좁힘",
      "cDecision": "keep",
      "cReason": "식 2900이 보이고 일의 자리 숫자 하나를 쓰는 분명한 문제임",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$725\\times4=2900$처럼 일의 자리가 {$0$}인 곱도 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "$0$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "일곱5×4=20에서0을 남기는 B 이유는 명확하다.",
      "c": "이미 준2900의0을 베끼는 C 대신일곱20과그자리처리를 직접구하게 한다."
    }
  },
  {
    "id": "e3-2-1-4-xc9",
    "sourceIndex": 982,
    "grade": "e3",
    "source": {
      "sourceIndex": 982,
      "sourceFingerprint": "2bac74bb18b1918a8cedd48aa4c9e22abd6c2e9fc90b3c1be34f90e95f7f8e6c",
      "part": "e3plus",
      "id": "e3-2-1-4-xc9",
      "section": "초3::2-1 곱셈::2-1-4 (몇십몇)×(몇십몇)",
      "term": "십의 자리로 곱한 줄의 끝",
      "kind": "성질",
      "level": "하",
      "definition": "$23\\times14$에서 십의 자리 숫자 $1$로 곱한 줄이 나타내는 값은 $230$처럼 끝이 {$0$}이다.",
      "studentC": "$23\\times14$에서 십의 자리 숫자 $1$로 곱한 줄이 나타내는 값은 $230$처럼 끝이 □이다.",
      "answers": [
        "$0$"
      ]
    },
    "currentProposal": {
      "id": "e3-2-1-4-xc9",
      "proposalFingerprint": "977c29044180bfb8f56db910c6661a067d506c0fa327934e09bf5e794e21fd8f",
      "learningRole": "application",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": null,
      "bReason": "십의 자리 숫자로 곱한 줄이 몇십을 곱한 값인 까닭은 e3-2-1-4-xc4와 e3-2-1-4-xc20의 B에서 묻고 있음",
      "cDecision": "keep",
      "cReason": "230이 보이고 끝 숫자 하나를 쓰는 분명한 문제임",
      "cSlotEquivalents": [],
      "exclusionReason": "e3-2-1-4-xc20의 B(십의 자리 숫자 1이 10을 나타냄)와 설명 목표가 같음"
    },
    "currentCMarkedSentence": "$23\\times14$에서 십의 자리 숫자 $1$로 곱한 줄이 나타내는 값은 $230$처럼 끝이 {$0$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$0$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "십자리1이10인뜻은989에서설명하므로 B를 제외한다.",
      "c": "이미준230의끝0복사보다23×10의실제부분곱230을구하도록 고친다."
    }
  },
  {
    "id": "e3-2-1-4-xc12",
    "sourceIndex": 984,
    "grade": "e3",
    "source": {
      "sourceIndex": 984,
      "sourceFingerprint": "3f88ee215dfdd568b2cb544728a1af57d1a26b847558a59fa9e6b37ac333b9e1",
      "part": "e3plus",
      "id": "e3-2-1-4-xc12",
      "section": "초3::2-1 곱셈::2-1-4 (몇십몇)×(몇십몇)",
      "term": "몇십끼리로 어림하기",
      "kind": "방법",
      "level": "중",
      "definition": "두 수를 가까운 몇십으로 바꾸어 곱하면 {곱이 어느 정도인지} 미리 알 수 있다.",
      "example": {
        "prompt": "$41\\times19$를 약 $800$이라고 어림하는 까닭은?",
        "answer": "$40$과 $20$에 가까워서"
      },
      "studentC": "두 수를 가까운 몇십으로 바꾸어 곱하면 □ 미리 알 수 있다.",
      "answers": [
        "곱이 어느 정도인지"
      ]
    },
    "currentProposal": {
      "id": "e3-2-1-4-xc12",
      "proposalFingerprint": "cf9f4f74ebfc4932f163c7241e313029ef79a2e0ec1244695284ce1bef04841c",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$41\\times19$의 곱을 계산하기 전에 어림하려고 합니다. 두 수를 어떤 수로 바꾸어 곱하는지 쓰고, 어림한 값을 써 보세요.",
      "bAnswer": "$41$은 $40$으로, $19$는 $20$으로 바꾸어 $40\\times20=800$, 약 $800$으로 어림합니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "가까운 몇십인 $40$과 $20$으로 바꾼다"
          ]
        },
        {
          "anyOf": [
            "약 $800$"
          ]
        }
      ],
      "bGoal": "가까운 몇십끼리의 곱으로 어림하는 방법",
      "bReason": "원문 예제 41×19를 써서 바꾸는 수와 어림값을 쓰게 함",
      "cDecision": "rewrite",
      "cReason": "빈칸 '곱이 어느 정도인지'는 답할 범위가 뚜렷하지 않음. 실제 어림값을 쓰게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$41\\times19$는 $41$을 $40$으로, $19$를 $20$으로 바꾸어 어림하면 약 {$800$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$800$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "두수를어림할수로바꾸라고만묻고40·20의가까운몇십만채점하므로 가까운몇십이라는조건을질문에 명시한다.",
      "c": "40·20변환을준뒤약800을구하는 계산이다."
    }
  },
  {
    "id": "e3-2-1-4-xc14",
    "sourceIndex": 985,
    "grade": "e3",
    "source": {
      "sourceIndex": 985,
      "sourceFingerprint": "6864c481cf3923b9d706b7fb20e39e153237255becb770d32502e2b47d0dafdd",
      "part": "e3plus",
      "id": "e3-2-1-4-xc14",
      "section": "초3::2-1 곱셈::2-1-4 (몇십몇)×(몇십몇)",
      "term": "네 자리 수가 되는 곱",
      "kind": "성질",
      "level": "중",
      "definition": "$43\\times27=1161$처럼 두 자리 수끼리의 곱이 {네 자리 수}가 될 수 있다.",
      "studentC": "$43\\times27=1161$처럼 두 자리 수끼리의 곱이 □가 될 수 있다.",
      "answers": [
        "네 자리 수"
      ]
    },
    "currentProposal": {
      "id": "e3-2-1-4-xc14",
      "proposalFingerprint": "468d82eb36f09dcb7af29899e8e6dcb51b6a718b6148b907217d47dfa973279c",
      "learningRole": "reason",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": null,
      "bReason": "곱의 자리 수는 e3-2-1-4-xc7의 B에서 다루고, 이 항목은 예 하나를 확인하는 사실임",
      "cDecision": "rewrite",
      "cReason": "빈칸 '네 자리 수'를 '네' 한 낱말로 줄여 '몇 자리'를 묻는 것임을 분명히 함",
      "cSlotEquivalents": [],
      "exclusionReason": "e3-2-1-4-xc7의 B(두 자리 수끼리 곱의 자리 수)와 목표가 겹치고 따로 설명할 까닭이 없음",
      "answerNotes": "'4'도 정답."
    },
    "currentCMarkedSentence": "$43\\times27=1161$처럼 두 자리 수끼리의 곱이 {네} 자리 수가 될 수 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "네",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "두자리곱의자릿수범위와같은B를제외한다.",
      "c": "이미준1161의네자리세기보다는실제43×27곱계산으로바꾸거나 C도제외한다."
    }
  },
  {
    "id": "e3-2-1-4-xc20",
    "sourceIndex": 989,
    "grade": "e3",
    "source": {
      "sourceIndex": 989,
      "sourceFingerprint": "0c361182813f793e316cb42c6e0f8e9b189ad519a44cbe42c060176f5a570b99",
      "part": "e3plus",
      "id": "e3-2-1-4-xc20",
      "section": "초3::2-1 곱셈::2-1-4 (몇십몇)×(몇십몇)",
      "term": "십의 자리로 곱한 줄을 일의 자리부터 쓰는 잘못",
      "kind": "성질",
      "level": "상",
      "definition": "십의 자리 숫자로 곱한 줄을 일의 자리부터 쓰면 {몇십을 곱한 것}을 {몇을 곱한 것}으로 잘못 본 것이다.",
      "example": {
        "prompt": "$31\\times12$의 세로셈에서 둘째 줄 $31$을 일의 자리부터 쓰면 안 되는 까닭은?",
        "answer": "$1$이 $10$을 나타내서"
      },
      "studentC": "십의 자리 숫자로 곱한 줄을 일의 자리부터 쓰면 □을 □으로 잘못 본 것이다.",
      "answers": [
        "몇십을 곱한 것",
        "몇을 곱한 것"
      ]
    },
    "currentProposal": {
      "id": "e3-2-1-4-xc20",
      "proposalFingerprint": "b58faf57f7b03dd584d4d8a778bf4baa307ac0977d1b99f47ef545458f9fa8f9",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$31\\times12$의 세로셈에서 $12$의 십의 자리 숫자 $1$과 $31$을 곱한 $31$을 일의 자리부터 맞추어 쓰면 안 되는 까닭을 쓰고, 어떻게 써야 하는지 써 보세요.",
      "bAnswer": "$12$의 $1$은 $10$을 나타내므로 그 줄은 $31\\times10=310$입니다. 그래서 $31$을 십의 자리부터 쓰거나 $310$으로 써야 합니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$12$의 $1$은 $10$을 나타낸다"
          ]
        },
        {
          "anyOf": [
            "$310$(십의 자리부터 쓴다)"
          ]
        }
      ],
      "bGoal": "십의 자리 숫자로 곱한 줄을 쓰는 자리와 그 까닭",
      "bReason": "원문 예제 31×12를 써서 잘못의 까닭과 바른 쓰기를 묻게 함",
      "cDecision": "rewrite",
      "cReason": "빈칸 두 개가 '몇십을 곱한 것', '몇을 곱한 것'이라는 추상 구절임. 구체 식에서 그 줄의 실제 값을 쓰게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$31\\times12$에서 $12$의 십의 자리 숫자 $1$은 $10$을 나타내므로, $31$과 이 $1$을 곱한 줄은 $31$이 아니라 {$310$}을 나타낸다.",
    "currentCSlotAnswers": [
      {
        "expected": "$310$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "31을십자리부터쓰는방법과310으로쓰는방법은둘다옳으므로 둘째기준의괄호대신두완결된anyOf대안으로 명시한다.",
      "c": "십자리1의실제10배부분곱310을 구한다."
    }
  },
  {
    "id": "e3-2-1-4-xc23",
    "sourceIndex": 990,
    "grade": "e3",
    "source": {
      "sourceIndex": 990,
      "sourceFingerprint": "dd9d8190d3e93ef1b552a4a74a1b2499c117dfafdb0501e259d2787654709541",
      "part": "e3plus",
      "id": "e3-2-1-4-xc23",
      "section": "초3::2-1 곱셈::2-1-4 (몇십몇)×(몇십몇)",
      "term": "곱이 가장 큰 두 자리 수끼리의 곱 만들기",
      "kind": "방법",
      "level": "상",
      "definition": "서로 다른 숫자 카드 네 장으로 두 자리 수 두 개를 만들 때 곱이 가장 크려면 {큰 숫자 두 개를 십의 자리에} 놓는다.",
      "example": {
        "prompt": "$4$, $3$, $2$, $1$로 곱이 가장 큰 두 수를 만들 때 $4$와 $3$을 십의 자리에 놓는 까닭은?",
        "answer": "백의 묶음 수가 가장 커져서"
      },
      "studentC": "서로 다른 숫자 카드 네 장으로 두 자리 수 두 개를 만들 때 곱이 가장 크려면 □ 놓는다.",
      "answers": [
        "큰 숫자 두 개를 십의 자리에"
      ]
    },
    "currentProposal": {
      "id": "e3-2-1-4-xc23",
      "proposalFingerprint": "db7787f8b294b92d38fe8982b83fdca87b48d1f2cd4d8cc6232e76dce567978c",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "숫자 카드 $4$, $3$, $2$, $1$을 한 번씩 써서 두 자리 수 두 개를 만들어 곱하려고 합니다. 곱이 가장 크게 되려면 $4$와 $3$을 십의 자리에 놓아야 하는 까닭을 써 보세요.",
      "bAnswer": "십의 자리 숫자끼리의 곱은 백이 몇 개인지를 정해 곱에서 가장 큰 부분이 됩니다. $4$와 $3$을 십의 자리에 놓으면 $40\\times30=1200$으로 이 부분이 가장 커집니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "십의 자리끼리의 곱이 백의 개수"
          ]
        },
        {
          "anyOf": [
            "큰 숫자 $4$와 $3$이면 그 부분이 가장 크다"
          ]
        }
      ],
      "bGoal": "곱이 가장 큰 두 자리 수끼리의 곱을 만드는 방법의 까닭",
      "bReason": "원문 예제의 카드를 살리고 최종 곱 계산은 요구하지 않음",
      "cDecision": "rewrite",
      "cReason": "빈칸 '큰 숫자 두 개를 십의 자리에'는 긴 구절임. 실제 카드에서 십의 자리에 놓을 숫자를 쓰게 함",
      "cSlotEquivalents": [],
      "answerNotes": "두 빈칸은 순서를 바꾸어 3, 4로 써도 정답."
    },
    "currentCMarkedSentence": "숫자 카드 $4$, $3$, $2$, $1$을 한 번씩 써서 두 자리 수 두 개를 만들 때 곱이 가장 크려면 두 수의 십의 자리에 {$4$}와 {$3$}을 놓는다.",
    "currentCSlotAnswers": [
      {
        "expected": "$4$",
        "equivalents": []
      },
      {
        "expected": "$3$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "십×십부분최대만으로전체최대의까닭을끝내지말고나머지교차곱도고려한자리값이유나실제후보비교로보완해야 한다.",
      "c": "두십숫자4·3의순서는자유이므로한쌍슬롯에두순서를허용하거나큰숫자부터라는응답순서를 명시한다."
    }
  },
  {
    "id": "e3-2-1-4-xc25",
    "sourceIndex": 991,
    "grade": "e3",
    "source": {
      "sourceIndex": 991,
      "sourceFingerprint": "9976c1c2d3a1f1f1b583b8e96cca699e5ea44c9b600a3722b2b9f808a095d550",
      "part": "e3plus",
      "id": "e3-2-1-4-xc25",
      "section": "초3::2-1 곱셈::2-1-4 (몇십몇)×(몇십몇)",
      "term": "어림하여 범위 정하기",
      "kind": "방법",
      "level": "상",
      "definition": "$73\\times46$은 $70\\times40=2800$보다 크고 $80\\times50=4000$보다 {작다}.",
      "studentC": "$73\\times46$은 $70\\times40=2800$보다 크고 $80\\times50=4000$보다 □.",
      "answers": [
        "작다"
      ]
    },
    "currentProposal": {
      "id": "e3-2-1-4-xc25",
      "proposalFingerprint": "c4387eadcb8420d8a8cf52eb5c3e12066155f6b5ed79da4d0a877060247f58db",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$73\\times46$의 곱이 $2800$보다 크고 $4000$보다 작다는 것을 계산하지 않고 아는 방법을 써 보세요.",
      "bAnswer": "$73$과 $46$은 $70$과 $40$보다 크므로 곱이 $70\\times40=2800$보다 크고, $80$과 $50$보다 작으므로 곱이 $80\\times50=4000$보다 작습니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$70\\times 40$보다 크다"
          ]
        },
        {
          "anyOf": [
            "$80\\times 50$보다 작다"
          ]
        }
      ],
      "bGoal": "아래위 몇십으로 곱의 범위를 어림하기",
      "bReason": "범위의 두 값은 주고 그 근거가 되는 어림 방법을 쓰게 함",
      "cDecision": "keep",
      "cReason": "식과 값이 다 주어져 있고 빈칸이 '작다' 한 낱말인 선명한 비교임",
      "cSlotEquivalents": [],
      "answerNotes": "'작습니다'도 정답."
    },
    "currentCMarkedSentence": "$73\\times46$은 $70\\times40=2800$보다 크고 $80\\times50=4000$보다 {작다}.",
    "currentCSlotAnswers": [
      {
        "expected": "작다",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "큰2800·작은4000이라는이미준결론뿐인기준대신73·46이70·40보다각각크고80·50보다각각작다는입력비교의근거를기준에넣는다.",
      "c": "어림의위범위4000보다작다는 관계가 옳다."
    }
  },
  {
    "id": "e3-2-1-4-xc27",
    "sourceIndex": 992,
    "grade": "e3",
    "source": {
      "sourceIndex": 992,
      "sourceFingerprint": "e0cf2c5d35fd5649e62b381387ae1dc87fb52db16f7c27dd0109f9379b78a099",
      "part": "e3plus",
      "id": "e3-2-1-4-xc27",
      "section": "초3::2-1 곱셈::2-1-4 (몇십몇)×(몇십몇)",
      "term": "곱의 일의 자리 숫자",
      "kind": "성질",
      "level": "상",
      "definition": "두 자리 수끼리의 곱의 일의 자리 숫자는 두 수의 {일의 자리 숫자끼리 곱한} 값의 일의 자리 숫자와 같다.",
      "example": {
        "prompt": "$36\\times14$의 일의 자리를 $6\\times4$만으로 알 수 있는 까닭은?",
        "answer": "나머지는 십의 묶음이라서"
      },
      "studentC": "두 자리 수끼리의 곱의 일의 자리 숫자는 두 수의 □ 값의 일의 자리 숫자와 같다.",
      "answers": [
        "일의 자리 숫자끼리 곱한"
      ]
    },
    "currentProposal": {
      "id": "e3-2-1-4-xc27",
      "proposalFingerprint": "5a92e9ca7262c0eee9acf8a3d88080059f5f4689eac38eee85942d0bd79d89bd",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$36\\times14$의 곱의 일의 자리 숫자를 $6\\times4$만 계산해서 알 수 있는 까닭을 써 보세요.",
      "bAnswer": "$30\\times14$나 $6\\times10$처럼 나머지 곱은 모두 몇십이라 일의 자리가 $0$입니다. 그래서 일의 자리 숫자는 $6\\times4=24$의 $4$로 정해집니다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "나머지 곱은 모두 몇십(일의 자리 $0$)"
          ]
        },
        {
          "anyOf": [
            "$6\\times 4$의 일의 자리로 정해진다"
          ]
        }
      ],
      "bGoal": "곱의 일의 자리 숫자가 일의 자리 숫자끼리의 곱으로 정해지는 까닭",
      "bReason": "원문 예제 36×14를 살려 까닭을 쓰게 함",
      "cDecision": "rewrite",
      "cReason": "빈칸 '일의 자리 숫자끼리 곱한'은 긴 구절임. 구체 식에서 일의 자리 숫자를 쓰게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$36\\times14$의 곱의 일의 자리 숫자는 $6\\times4=24$의 일의 자리 숫자와 같은 {$4$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$4$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "30×14=420을몇십이라부르지말고일자리0인수또는십묶음으로만된수로설명·기준을 고친다.",
      "c": "일×일곱24의일숫자4가전체일숫자인관계를 확인한다."
    }
  },
  {
    "id": "e3-2-2-1-xc12",
    "sourceIndex": 1000,
    "grade": "e3",
    "source": {
      "sourceIndex": 1000,
      "sourceFingerprint": "b6e119726423bffa826789eccd22aae748795817b584a97d0ba11887ee080e07",
      "part": "e3plus",
      "id": "e3-2-2-1-xc12",
      "section": "초3::2-2 나눗셈::2-2-1 내림이 없는 (몇십)÷(몇), (몇십몇)÷(몇)",
      "term": "몫 어림하기",
      "kind": "방법",
      "level": "중",
      "definition": "나누어지는 수를 가까운 몇십으로 바꾸어 나누면 {몫이 어느 정도인지} 미리 알 수 있다.",
      "example": {
        "prompt": "$82\\div2$의 몫을 어림할 때 $82$ 대신 $80$을 쓰는 까닭은?",
        "answer": "가깝고 $2$로 나누기 쉬워서"
      },
      "studentC": "나누어지는 수를 가까운 몇십으로 바꾸어 나누면 □ 미리 알 수 있다.",
      "answers": [
        "몫이 어느 정도인지"
      ]
    },
    "currentProposal": {
      "id": "e3-2-2-1-xc12",
      "proposalFingerprint": "410225ab971c51bc37219f2843b625906bc3da7683929e8c7983a74d2b7c07ae",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$82\\div2$를 계산하기 전에 몫이 얼마쯤인지 어림하려고 합니다. $82$를 어떤 수로 바꾸어 나누면 좋은지 쓰고, 어림한 몫을 구하세요.",
      "bAnswer": "$82$를 가까운 몇십인 $80$으로 바꾸어 $80\\div2=40$으로 계산한다. 몫은 $40$쯤이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$82$를 가까운 몇십 $80$으로 바꿈"
          ]
        },
        {
          "anyOf": [
            "어림한 몫 $40$쯤"
          ]
        }
      ],
      "bGoal": "가까운 몇십으로 바꾸어 몫을 어림하는 방법",
      "bReason": "원문 예제 82÷2를 써서 무엇을 바꾸고 무엇을 답할지 정함",
      "cDecision": "rewrite",
      "cReason": "정답 '몫이 어느 정도인지'가 긴 구절 복원이라 실제 수로 답하게 바꿈",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$82\\div2$의 몫을 어림하려면 $82$를 가까운 몇십인 {$80$}으로 바꾸어 나눈다. 그러면 몫은 약 {$40$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$80$",
        "equivalents": []
      },
      {
        "expected": "$40$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "어떤수로바꾸면좋은지만묻고80으로만채점하므로 가까운몇십으로바꾸어어림이라는범위를B에 명시한다.",
      "c": "C는가까운몇십을명시하여80·40이 확정된다."
    }
  },
  {
    "id": "e3-2-2-1-xc13",
    "sourceIndex": 1001,
    "grade": "e3",
    "source": {
      "sourceIndex": 1001,
      "sourceFingerprint": "6b420f53181530853ddabf9becceaf9b2c9e135a878cf0a0a72960ed8712da4c",
      "part": "e3plus",
      "id": "e3-2-2-1-xc13",
      "section": "초3::2-2 나눗셈::2-2-1 내림이 없는 (몇십)÷(몇), (몇십몇)÷(몇)",
      "term": "나누어지는 수 찾기",
      "kind": "방법",
      "level": "중",
      "definition": "$\\square\\div$(몇)$=$(몫)에서 $\\square$는 {몫과 나누는 수를 곱해} 찾는다.",
      "example": {
        "prompt": "$\\square\\div2=24$에서 $24\\times2$를 계산하는 까닭은?",
        "answer": "나눗셈을 곱셈으로 되돌려서"
      },
      "studentC": "$\\square\\div$(몇)$=$(몫)에서 $\\square$는 □ 찾는다.",
      "answers": [
        "몫과 나누는 수를 곱해"
      ]
    },
    "currentProposal": {
      "id": "e3-2-2-1-xc13",
      "proposalFingerprint": "b38c8771ff39bec93a6257c58853f8bf3f060480274a44ac832595df20ffb303",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "어떤 수를 $2$로 나누었더니 몫이 $24$가 되었습니다. 어떤 수를 구하는 방법을 설명하고, 어떤 수를 구하세요.",
      "bAnswer": "몫 $24$에 나누는 수 $2$를 곱한다. $24\\times2=48$이므로 어떤 수는 $48$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "몫에 나누는 수를 곱함"
          ]
        },
        {
          "anyOf": [
            "$48$"
          ]
        }
      ],
      "bGoal": "나눗셈을 곱셈으로 되돌려 나누어지는 수 찾기",
      "bReason": "□와 (몇)·(몫) 표기 대신 구체적인 수로 자립시킴",
      "cDecision": "rewrite",
      "cReason": "수식의 □와 빈칸 □가 겹쳐 보이고, 정답이 수 이름을 복원하는 긴 구절이라 실제 계산으로 바꿈",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "어떤 수를 $2$로 나누었더니 몫이 $24$였다. 어떤 수는 $24$에 {$2$}를 곱한 {$48$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$2$",
        "equivalents": []
      },
      {
        "expected": "$48$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "2로나눈몫24에는48과나머지1인49도가능하므로남김없이나누었다는조건을B에 명시한다.",
      "c": "C도몫24만이아닌나누어떨어짐을명시해야전체48이 유일하다."
    }
  },
  {
    "id": "e3-2-2-2-xc7",
    "sourceIndex": 1011,
    "grade": "e3",
    "source": {
      "sourceIndex": 1011,
      "sourceFingerprint": "f2568955693bb80f8cb6045c771d27beaf37685dcbb3980195775ca03a001d98",
      "part": "e3plus",
      "id": "e3-2-2-2-xc7",
      "section": "초3::2-2 나눗셈::2-2-2 내림이 있는 (몇십)÷(몇), (몇십몇)÷(몇)",
      "term": "내림이 있는 나눗셈",
      "kind": "정의",
      "level": "하",
      "definition": "십의 자리 숫자가 나누는 수로 남김없이 나누어지지 않으면 {내림}이 있다.",
      "studentC": "십의 자리 숫자가 나누는 수로 남김없이 나누어지지 않으면 □이 있다.",
      "answers": [
        "내림"
      ]
    },
    "currentProposal": {
      "id": "e3-2-2-2-xc7",
      "proposalFingerprint": "c30b821ad86aa337a1b6e62c60a87aac307ea48452fe0d53ac519e5362f72c6d",
      "learningRole": "definition",
      "bDecision": "rewrite",
      "bPrompt": "'내림이 있는 나눗셈'은 어떤 나눗셈인지 $52\\div4$를 예로 들어, 십의 자리를 나눌 때 어떤 일이 생기는지 설명하세요.",
      "bAnswer": "십의 자리 숫자가 나누는 수로 남김없이 나누어지지 않아 십이 남는 나눗셈이다. $52\\div4$는 십 $5$개를 $4$로 나누면 십 $1$개가 남고, 이것을 낱개 $10$개로 바꾸어 $2$와 합친 $12$를 다시 나눈다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "십의 자리를 나누면 십이 남음"
          ]
        },
        {
          "anyOf": [
            "남은 십을 낱개로 바꾸어 다시 나눔"
          ]
        }
      ],
      "bGoal": "내림이 있는 나눗셈의 뜻",
      "bReason": "52÷4라는 예를 주어 뜻을 과정으로 말하게 함",
      "cDecision": "rewrite",
      "cReason": "원문 빈칸은 '나머지'로도 읽힐 수 있어 낱개로 바꾸는 과정을 넣어 '내림'만 답이 되게 함",
      "cSlotEquivalents": [],
      "answerNotes": "'나머지'는 오답"
    },
    "currentCMarkedSentence": "$52\\div4$처럼 십의 자리 숫자 $5$가 나누는 수 $4$로 남김없이 나누어지지 않아, 남은 십을 낱개로 바꾸어 일의 자리와 함께 나누어야 하는 나눗셈을 {내림}이 있는 나눗셈이라고 한다.",
    "currentCSlotAnswers": [
      {
        "expected": "내림",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "52÷4의예로설명하라고했으므로십1이남아일10+2=12를다시나누는실제예도기준에 포함해야 한다.",
      "c": "남은십을일과함께나누는내림이라는뜻을구체적52÷4로 설명한다."
    }
  },
  {
    "id": "e3-2-2-2-xc11",
    "sourceIndex": 1014,
    "grade": "e3",
    "source": {
      "sourceIndex": 1014,
      "sourceFingerprint": "2460fe5c5f35d34f87009666f3ee0385583a077679a95e36b2a679e70b1684e5",
      "part": "e3plus",
      "id": "e3-2-2-2-xc11",
      "section": "초3::2-2 나눗셈::2-2-2 내림이 있는 (몇십)÷(몇), (몇십몇)÷(몇)",
      "term": "몫의 범위 어림하기",
      "kind": "방법",
      "level": "중",
      "definition": "남김없이 나누어지는 나눗셈에서 나누어지는 수가 나누는 수의 $10$배와 $20$배처럼 {몇십 배인 두 수 사이}에 있으면 몫은 {그 두 몇십 사이}이다.",
      "example": {
        "prompt": "$75\\div5$의 몫이 $10$과 $20$ 사이인 까닭은?",
        "answer": "$75$가 $50$과 $100$ 사이라서"
      },
      "studentC": "남김없이 나누어지는 나눗셈에서 나누어지는 수가 나누는 수의 $10$배와 $20$배처럼 □에 있으면 몫은 □이다.",
      "answers": [
        "몇십 배인 두 수 사이",
        "그 두 몇십 사이"
      ]
    },
    "currentProposal": {
      "id": "e3-2-2-2-xc11",
      "proposalFingerprint": "0d150186187af5b1221469c0ce45db1f0c3777c6eea3ea6e941b592f09ef9982",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$75\\div5$의 몫이 $10$과 $20$ 사이의 수라는 것을, 나눗셈을 끝까지 하지 않고 알아내는 방법을 설명하세요.",
      "bAnswer": "$5\\times10=50$, $5\\times20=100$이다. $75$는 $50$과 $100$ 사이에 있으므로 몫은 $10$보다 크고 $20$보다 작다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$5$의 $10$배 $50$과 $20$배 $100$을 구함"
          ]
        },
        {
          "anyOf": [
            "$75$가 그 사이에 있음"
          ]
        }
      ],
      "bGoal": "나누는 수의 몇십 배로 몫의 범위 어림하기",
      "bReason": "원문 예제 75÷5로 조건을 밝힘",
      "cDecision": "rewrite",
      "cReason": "빈칸 두 개가 조건과 결론을 모두 가린 긴 구절이라 구체적인 식의 결론만 채우게 함",
      "cSlotEquivalents": [],
      "coreAfter": "나누어떨어지는 나눗셈에서 나누는 수에 곱할 수를 $10$, $20$처럼 두 개 정한다. 나눌 수가 두 곱 {사이에} 있으면 몫은 앞서 정한 두 수 {사이에} 있다. 예: $75\\div5$에서 $75$가 $50$과 $100$ 사이이므로 몫은 $10$과 $20$ 사이이다.",
      "coreReason": "원래남김없이조건을보존해51÷5의정수몫10반례를피한다. 긴두범위표적을지시대상이명시된사이에로줄이고 일반배수비교와보조예를보존한다."
    },
    "currentCMarkedSentence": "$75\\div5$에서 $5\\times10=50$, $5\\times20=100$이다. $75$는 $50$과 $100$ 사이에 있으므로 몫은 {$10$}과 {$20$} 사이의 수이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$10$",
        "equivalents": []
      },
      {
        "expected": "$20$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "5의10배·20배와75의사이위치로몫범위를추론하는B는 맞다.",
      "c": "10과20의나열순서는바꿔도같은범위이므로10보다크고20보다작다형태로두슬롯의역할을정하거나순서를 명시한다;일반정의의나누어떨어짐조건은 필요하다."
    }
  },
  {
    "id": "e3-2-2-2-xc16",
    "sourceIndex": 1016,
    "grade": "e3",
    "source": {
      "sourceIndex": 1016,
      "sourceFingerprint": "412bc9a29ff4d7be9d050c89563c0c1a4a0dd0988ac3e14555839de2eacd2ad3",
      "part": "e3plus",
      "id": "e3-2-2-2-xc16",
      "section": "초3::2-2 나눗셈::2-2-2 내림이 있는 (몇십)÷(몇), (몇십몇)÷(몇)",
      "term": "나누는 수가 두 배일 때",
      "kind": "성질",
      "level": "중",
      "definition": "$72\\div4$의 몫은 $72\\div2$의 몫 $36$의 {반}인 $18$이다.",
      "studentC": "$72\\div4$의 몫은 $72\\div2$의 몫 $36$의 □인 $18$이다.",
      "answers": [
        "반"
      ]
    },
    "currentProposal": {
      "id": "e3-2-2-2-xc16",
      "proposalFingerprint": "8d11b0a6410defa358f223df24940d2823157298d45990e586e0ea3882869785",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$72\\div2=36$입니다. 이것을 이용해 $72\\div4$의 몫을 구하는 방법을 까닭과 함께 설명하세요.",
      "bAnswer": "나누는 수 $4$는 $2$의 $2$배이므로 몫은 $36$의 반인 $18$이다. 같은 $72$를 $2$배 많은 묶음으로 나누면 한 묶음은 반이 되기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "나누는 수가 $2$배"
          ]
        },
        {
          "anyOf": [
            "몫은 $36$의 반인 $18$"
          ]
        }
      ],
      "bGoal": "나누는 수가 2배가 되면 몫이 반이 되는 관계",
      "bReason": "원문의 72÷2, 72÷4를 써서 방법과 까닭을 묻도록 함",
      "cDecision": "keep",
      "cReason": "수가 모두 나와 있고 빈칸이 '반' 한 낱말이라 선명함",
      "cSlotEquivalents": [],
      "answerNotes": "'절반'도 정답"
    },
    "currentCMarkedSentence": "$72\\div4$의 몫은 $72\\div2$의 몫 $36$의 {반}인 $18$이다.",
    "currentCSlotAnswers": [
      {
        "expected": "반",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "방법은36의반18이지만왜그런지에는같은전체를두배많은묶음으로나누면각묶음이반이된다는이유도기준에 포함해야 한다.",
      "c": "몫36의반18이라는나누는수두배관계를 확인한다."
    }
  },
  {
    "id": "e3-2-2-3-xc11",
    "sourceIndex": 1025,
    "grade": "e3",
    "source": {
      "sourceIndex": 1025,
      "sourceFingerprint": "fae61cfdd2cb988a88e8081020c4b18dcae9a5b2e0ceb59085906abb8cea1111",
      "part": "e3plus",
      "id": "e3-2-2-3-xc11",
      "section": "초3::2-2 나눗셈::2-2-3 나머지가 있는 (몇십몇)÷(몇)",
      "term": "나머지가 있는 나눗셈의 확인",
      "kind": "방법",
      "level": "중",
      "definition": "나머지가 있는 나눗셈은 {나머지가 나누는 수보다 작은지}와, 나누는 수와 몫의 곱에 나머지를 더하면 나누어지는 수가 되는지 보아 확인한다.",
      "example": {
        "prompt": "$29\\div4=7\\cdots1$을 $4\\times7+1$로 확인하는 까닭은?",
        "answer": "$7$묶음과 남은 $1$을 합쳐서"
      },
      "studentC": "나머지가 있는 나눗셈은 □와, 나누는 수와 몫의 곱에 나머지를 더하면 나누어지는 수가 되는지 보아 확인한다.",
      "answers": [
        "나머지가 나누는 수보다 작은지"
      ]
    },
    "currentProposal": {
      "id": "e3-2-2-3-xc11",
      "proposalFingerprint": "ff0f3a2b6f2566d005fe308ee0b62c3b57b56c0b20e222266205961d2334b87c",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$29\\div4=7\\cdots1$이 바르게 계산되었는지 확인하려면 어떤 두 가지를 살펴봐야 하는지 쓰고, 실제로 확인해 보세요.",
      "bAnswer": "나머지 $1$이 나누는 수 $4$보다 작은지 보고, $4\\times7=28$에 나머지 $1$을 더해 $29$가 되는지 본다. 둘 다 맞으므로 바른 계산이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "나머지가 나누는 수보다 작은지"
          ]
        },
        {
          "anyOf": [
            "$4\\times 7+1$이 $29$인지"
          ]
        }
      ],
      "bGoal": "나머지가 있는 나눗셈의 두 가지 확인 방법",
      "bReason": "원문 예제 29÷4=7⋯1로 확인할 대상을 정함",
      "cDecision": "rewrite",
      "cReason": "'나머지가 나누는 수보다 작은지'라는 긴 구절 대신 비교 한 낱말과 계산 결과를 채우게 함",
      "cSlotEquivalents": [],
      "answerNotes": "첫째 빈칸은 '작으며'도 정답"
    },
    "currentCMarkedSentence": "$29\\div4=7\\cdots1$이 맞는지 확인한다. 나머지 $1$은 나누는 수 $4$보다 {작고}, $4\\times7=28$에 나머지 $1$을 더하면 {$29$}가 되므로 계산이 맞다.",
    "currentCSlotAnswers": [
      {
        "expected": "작고",
        "equivalents": []
      },
      {
        "expected": "$29$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "실제로확인하라고했으므로나머지1<4의실제판단과28+1=29의검산을기준에 명시해야 한다.",
      "c": "1은4보다작고곱에1더한29라는두검산이 분명하다."
    }
  },
  {
    "id": "e3-2-2-3-xc20",
    "sourceIndex": 1028,
    "grade": "e3",
    "source": {
      "sourceIndex": 1028,
      "sourceFingerprint": "5ffd32d658870fd90942aa49e1653e65dd46fbc6921738208c763ace26e1c990",
      "part": "e3plus",
      "id": "e3-2-2-3-xc20",
      "section": "초3::2-2 나눗셈::2-2-3 나머지가 있는 (몇십몇)÷(몇)",
      "term": "몫이 같은 수 가운데 가장 큰 수",
      "kind": "성질",
      "level": "상",
      "definition": "같은 수로 나누어 몫이 같은 수들 가운데에서는 {나머지가 가장 클 때} 나누어지는 수가 가장 크다.",
      "example": {
        "prompt": "$6$으로 나눈 몫이 $3$인 수 가운데 가장 큰 수가 $23$인 까닭은?",
        "answer": "나머지가 $5$까지라서"
      },
      "studentC": "같은 수로 나누어 몫이 같은 수들 가운데에서는 □ 나누어지는 수가 가장 크다.",
      "answers": [
        "나머지가 가장 클 때"
      ]
    },
    "currentProposal": {
      "id": "e3-2-2-3-xc20",
      "proposalFingerprint": "8e50252867e60da46f2ce5b6580af935e6ecbdb54ce9267d838c1dab8bfcf326",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "어떤 수를 $6$으로 나누었더니 몫이 $3$이었습니다. 어떤 수가 될 수 있는 수 가운데 가장 큰 수를 구하고, 구한 방법을 설명하세요.",
      "bAnswer": "나머지가 가장 클 때 어떤 수가 가장 크다. $6$으로 나눈 나머지는 $5$까지 될 수 있으므로 $6\\times3+5=23$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "나머지가 가장 큰 $5$일 때"
          ]
        },
        {
          "anyOf": [
            "$6\\times 3+5=23$"
          ]
        }
      ],
      "bGoal": "몫이 같을 때 나머지가 가장 크면 나누어지는 수가 가장 큼",
      "bReason": "원문 예제(6으로 나눈 몫 3)를 문제로 바꾸어 방법을 설명하게 함",
      "cDecision": "rewrite",
      "cReason": "'나머지가 가장 클 때'라는 조건 구절 복원 대신 구체적인 나머지와 결과를 채우게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$6$으로 나눈 몫이 $3$인 수 가운데 가장 큰 수는 나머지가 가장 큰 {$5$}일 때이므로 $6\\times3+5=${$23$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$5$",
        "equivalents": []
      },
      {
        "expected": "$23$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "최대나머지5를더한전체23의방법·결과를 요청한다.",
      "c": "첫빈칸5가뒤식에그대로보이므로최대나머지계산을가리지않거나그빈칸을빼고전체23만 구한다."
    }
  },
  {
    "id": "e3-2-2-4-xc8",
    "sourceIndex": 1035,
    "grade": "e3",
    "source": {
      "sourceIndex": 1035,
      "sourceFingerprint": "ecb0ebb07eadedf6d8642888fcc2cef82b04f080d0df5fa16a0153373f912441",
      "part": "e3plus",
      "id": "e3-2-2-4-xc8",
      "section": "초3::2-2 나눗셈::2-2-4 (세 자리 수)÷(한 자리 수)",
      "term": "몇백 나누기",
      "kind": "방법",
      "level": "하",
      "definition": "(몇백)$\\div$(몇)은 {백의 묶음을 나누어} 한 몫에 백의 묶음이 몇 개인지 본다.",
      "example": {
        "prompt": "$800\\div4$의 몫이 $2$가 아니라 $200$인 까닭은?",
        "answer": "백의 묶음이 $2$개씩이라서"
      },
      "studentC": "(몇백)$\\div$(몇)은 □ 한 몫에 백의 묶음이 몇 개인지 본다.",
      "answers": [
        "백의 묶음을 나누어"
      ]
    },
    "currentProposal": {
      "id": "e3-2-2-4-xc8",
      "proposalFingerprint": "f15b88fb5687b8eadbaed4336adf0fab1b0598867a089e76af588f2b2bc2d12e",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$800\\div4$의 몫이 $2$가 아니라 $200$인 까닭을 '백 몇 개'라는 말을 써서 설명하세요.",
      "bAnswer": "$800$은 백 $8$개이고, $4$로 나누면 백 $2$개씩이다. 백 $2$개는 $200$이므로 몫은 $200$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$800$은 백 $8$개"
          ]
        },
        {
          "anyOf": [
            "백 $2$개씩이라 $200$"
          ]
        }
      ],
      "bGoal": "(몇백)÷(몇)을 백의 묶음으로 나누는 뜻",
      "bReason": "원문 예제 800÷4로 까닭을 묻도록 함",
      "cDecision": "rewrite",
      "cReason": "'백의 묶음을 나누어'라는 구절 복원 대신 실제 계산 결과를 채우게 함",
      "cSlotEquivalents": [],
      "coreAfter": "몇백을 몇으로 나누는 것은 {백의 묶음을 나누어} 한 묶음에 백이 몇 개인지 보는 것이다. 예: $800\\div4$는 백 $8$개를 $4$로 나누어 백 $2$개씩이므로 $200$이다.",
      "coreReason": "백묶음을나눈다는 원래동작을보존하고 한몫이라는겹치는말을 한묶음으로명시한다."
    },
    "currentCMarkedSentence": "$800\\div4$는 백 $8$개를 $4$로 나누는 것이다. $8\\div4=2$이므로 한 묶음은 백 {$2$}개이고, $800\\div4=${$200$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$2$",
        "equivalents": []
      },
      {
        "expected": "$200$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "800÷4의백묶음설명은맞다;일반coreAfter는600÷4처럼백묶음이남아십으로도나눠야하는경우를포함하지않도록백의묶음수가남김없이나누어질때조건을 보완한다.",
      "c": "첫2는앞의8÷4=2를복사하므로실제백단위몫200만남기는것을검토한다."
    }
  },
  {
    "id": "e3-2-2-4-xc11",
    "sourceIndex": 1036,
    "grade": "e3",
    "source": {
      "sourceIndex": 1036,
      "sourceFingerprint": "deaa54ba8d2b46140b5802baab87d610c38a13aa1ad22b98ff3fd8b4b1e2232f",
      "part": "e3plus",
      "id": "e3-2-2-4-xc11",
      "section": "초3::2-2 나눗셈::2-2-4 (세 자리 수)÷(한 자리 수)",
      "term": "내림이 두 번 있는 나눗셈",
      "kind": "방법",
      "level": "중",
      "definition": "백의 자리와 십의 자리에서 모두 나머지가 생기면 {내림을 두 번} 하여 끝까지 나눈다.",
      "example": {
        "prompt": "$916\\div4$에서 남은 백 $1$개와 십 $1$개를 십 $11$개로 바꾸는 까닭은?",
        "answer": "백 $1$개가 십 $10$개라서"
      },
      "studentC": "백의 자리와 십의 자리에서 모두 나머지가 생기면 □ 하여 끝까지 나눈다.",
      "answers": [
        "내림을 두 번"
      ]
    },
    "currentProposal": {
      "id": "e3-2-2-4-xc11",
      "proposalFingerprint": "a14e88763b2bb0c44d23e3a41d5c019ed0e7381c144cdb4d166fa6d5ea5965fd",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$916\\div4$를 계산할 때 내림을 몇 번 하는지 쓰고, 각 내림에서 무엇을 무엇으로 바꾸는지 설명하세요.",
      "bAnswer": "두 번 한다. 백 $9$개를 나누고 남은 백 $1$개를 십 $10$개로 바꾸어 십 $11$개를 나눈다. 남은 십 $3$개는 낱개 $30$개로 바꾸어 $36$을 나눈다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "내림 두 번"
          ]
        },
        {
          "anyOf": [
            "남은 백 $1$개를 십으로 바꿈"
          ]
        },
        {
          "anyOf": [
            "남은 십 $3$개를 낱개로 바꿈"
          ]
        }
      ],
      "bGoal": "내림이 두 번 있는 나눗셈의 과정",
      "bReason": "원문 예제 916÷4로 과정을 말하게 함",
      "cDecision": "rewrite",
      "cReason": "'내림을 두 번'이라는 구절 대신 과정의 수와 횟수를 채우게 함",
      "cSlotEquivalents": [],
      "answerNotes": "셋째 빈칸은 '2'도 정답"
    },
    "currentCMarkedSentence": "$916\\div4$에서 백 $9$개를 $4$로 나누면 백 $1$개가 남는다. 이것을 십 $1$개와 합친 십 {$11$}개를 $4$로 나누면 십 {$3$}개가 남는다. 이렇게 내림을 {두} 번 한다.",
    "currentCSlotAnswers": [
      {
        "expected": "$11$",
        "equivalents": []
      },
      {
        "expected": "$3$",
        "equivalents": []
      },
      {
        "expected": "두",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "무엇을무엇으로바꾸는지에는백1→십10·십3→일30의교환개수도명시해야하므로기준을 보완한다.",
      "c": "십11과남은십3·내림두번의실제순서를 확인한다."
    }
  },
  {
    "id": "e3-2-2-4-xc21",
    "sourceIndex": 1039,
    "grade": "e3",
    "source": {
      "sourceIndex": 1039,
      "sourceFingerprint": "6a0023ec927d198fb0d8aee760788acc7055497afdf52b7013c62030192298c1",
      "part": "e3plus",
      "id": "e3-2-2-4-xc21",
      "section": "초3::2-2 나눗셈::2-2-4 (세 자리 수)÷(한 자리 수)",
      "term": "몫의 가운데 $0$을 빠뜨리는 잘못",
      "kind": "성질",
      "level": "상",
      "definition": "몫의 가운데 자리에 $0$을 쓰지 않으면 {몫의 자리가 하나 줄어} 실제보다 훨씬 작아진다.",
      "example": {
        "prompt": "$728\\div7$의 몫을 $14$라고 쓰면 $1$이 나타내는 값은 어떻게 바뀌는가?",
        "answer": "$100$이 $10$으로 바뀐다"
      },
      "studentC": "몫의 가운데 자리에 $0$을 쓰지 않으면 □ 실제보다 훨씬 작아진다.",
      "answers": [
        "몫의 자리가 하나 줄어"
      ]
    },
    "currentProposal": {
      "id": "e3-2-2-4-xc21",
      "proposalFingerprint": "00e64d5b31ebd48aff8f4dd6022639ea8bcd80d12d8e4687c97f0158f08963e9",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$728\\div7$의 몫을 $14$라고 쓴 친구가 있습니다. 무엇을 빠뜨렸는지 설명하고 바른 몫을 쓰세요.",
      "bAnswer": "십의 자리 숫자 $2$는 $7$로 나눌 수 없으므로 몫의 십의 자리에 $0$을 써야 하는데 빠뜨렸다. 바른 몫은 $104$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "몫의 십의 자리에 $0$을 써야 함"
          ]
        },
        {
          "anyOf": [
            "바른 몫 $104$"
          ]
        }
      ],
      "bGoal": "몫의 가운데 0을 빠뜨리는 잘못 찾기",
      "bReason": "원문 예제 728÷7의 틀린 몫 14를 고치게 함",
      "cDecision": "rewrite",
      "cReason": "'몫의 자리가 하나 줄어'라는 구절 복원 대신 써야 할 숫자와 바른 몫을 채우게 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$728\\div7$에서 십의 자리 숫자 $2$는 $7$로 나눌 수 없으므로 몫의 십의 자리에 {$0$}을 쓴다. 그래서 몫은 $14$가 아니라 {$104$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$0$",
        "equivalents": []
      },
      {
        "expected": "$104$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "2는7로나눌수없다는말대신2<7이라그자리몫0이라고써분수나눔가능성과혼동을 피한다.",
      "c": "C도2가7보다작아그자리몫0이라는말로고치되104의실제값은 맞다."
    }
  },
  {
    "id": "e3-2-3-1-xc2",
    "sourceIndex": 1042,
    "grade": "e3",
    "source": {
      "sourceIndex": 1042,
      "sourceFingerprint": "da8482100cded3c1196813f6bdce0452a8cedc9d699d8860a9a2b6bd1e53c065",
      "part": "e3plus",
      "id": "e3-2-3-1-xc2",
      "section": "초3::2-3 원::2-3-1 원의 중심, 지름, 반지름",
      "term": "반지름의 개수",
      "kind": "성질",
      "level": "하",
      "definition": "한 원에는 반지름을 {끝없이 많이} 그을 수 있다.",
      "studentC": "한 원에는 반지름을 □ 그을 수 있다.",
      "answers": [
        "끝없이 많이"
      ]
    },
    "currentProposal": {
      "id": "e3-2-3-1-xc2",
      "proposalFingerprint": "428eefb3a2c3ff9cb696be61e01fa9ec451ee4d1941b3f05e4b2f5d215b0dc3a",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "한 원에는 반지름을 셀 수 없이 많이 그을 수 있습니다. 그 까닭을 반지름이 어떤 두 점을 이은 선분인지와 관련지어 설명하세요.",
      "bAnswer": "반지름은 원의 중심과 원 위의 한 점을 이은 선분이다. 원 위의 점이 셀 수 없이 많으므로 반지름도 셀 수 없이 많이 그을 수 있다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "중심과 원 위의 한 점을 이은 선분"
          ]
        },
        {
          "anyOf": [
            "원 위의 점이 셀 수 없이 많음"
          ]
        }
      ],
      "bGoal": "반지름을 끝없이 그을 수 있는 까닭",
      "bReason": "개수만 묻지 않고 까닭을 묻도록 함",
      "cDecision": "rewrite",
      "cReason": "'끝없이 많이'는 '여러 개', '무수히' 등으로 답이 흩어져 맞고 틀림을 가르기 어려우므로 한 낱말로 좁힘",
      "cSlotEquivalents": [],
      "answerNotes": "'많습니다'도 정답. '적다', '1개'는 오답"
    },
    "currentCMarkedSentence": "한 원에 그을 수 있는 반지름은 $1$개뿐이 아니라 셀 수 없이 {많다}.",
    "currentCSlotAnswers": [
      {
        "expected": "많다",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "원위각점마다반지름을만들수있다는B이유는 의미있다.",
      "c": "셀수없이많다의많다를복원하는C는457과같은문법완성으로보고B활동에남기며C제외를 제안한다."
    }
  },
  {
    "id": "e3-2-3-1-xc3",
    "sourceIndex": 1043,
    "grade": "e3",
    "source": {
      "sourceIndex": 1043,
      "sourceFingerprint": "adafd3d8eeeb61fc2ed5b42e2cabb7c7391208f953bcb071bdde3052b610811d",
      "part": "e3plus",
      "id": "e3-2-3-1-xc3",
      "section": "초3::2-3 원::2-3-1 원의 중심, 지름, 반지름",
      "term": "지름의 개수",
      "kind": "성질",
      "level": "하",
      "definition": "한 원에는 지름을 {여러 개} 그을 수 있다.",
      "studentC": "한 원에는 지름을 □ 그을 수 있다.",
      "answers": [
        "여러 개"
      ]
    },
    "currentProposal": {
      "id": "e3-2-3-1-xc3",
      "proposalFingerprint": "d730ab89b445d8f85ca2255e81b1a672e4ce4f333889df020a442f65a0ea6f83",
      "learningRole": "application",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "별도 B 없음",
      "bReason": "개수의 까닭 설명이 반지름 항목과 겹침",
      "cDecision": "rewrite",
      "cReason": "'여러 개'는 2개, 많이 등 답 범위가 넓어 맞고 틀림을 가르기 어려우므로 한 낱말로 좁힘",
      "cSlotEquivalents": [],
      "exclusionReason": "원 위의 점이 많아 선분도 많이 그을 수 있다는 설명은 e3-2-3-1-xc2의 B(반지름의 개수)와 같은 목표",
      "answerNotes": "'많습니다'도 정답. '적다', '1개'는 오답"
    },
    "currentCMarkedSentence": "한 원에 그을 수 있는 지름은 $1$개뿐이 아니라 셀 수 없이 {많다}.",
    "currentCSlotAnswers": [
      {
        "expected": "많다",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "원위점이많아무한히그리는이유는1042와겹쳐B를 제외한다.",
      "c": "같은무한개수말복원C를제외하고일반학습사실로 보존한다."
    }
  }
]
