제공 순서 모든 ID에 대해 JSON 배열만 출력한다. 각 행은 수정 패치 {id,inputProposalFingerprint,변경하는필드들}이다. id와 현재 지문 해시는 필수이고 바뀌지 않은 필드는 복사하지 않는다. 직접 독자의 B/C 지적을 실제 문장과 채점 기준의 수정으로 해소하라. 지적이 수학적으로 틀렸으면 변경 대신 repairDisagreement에 이유와 실제 올바른 수학을 써라. 코멘트나 카운트만 고쳐서 문제를 해결했다고 하지 마라.
B를 바꾸면 bDecision,bPrompt,bAnswer,bRequiredIdeas,bGoal,bReason을 함께 완성한다. bDecision은 rewrite/exclude. exclude는 bPrompt,bAnswer null, bRequiredIdeas [], exclusionReason에 B만 제외하는 구체 이유와 알려진 실제 대응 ID를 기록한다. 초등에 익숙한 이름의 정의 질문은 가능하지만 제목 하나+설명하시오, 답 하나 대기, 의미 없는 이유 묻기는 금지한다. 설명 목표·조건·대상·응답 범위를 명시하고 질문에 예상 답은 넣지 않는다. 구체적 계산은 일반 방법·뜻·관계도 확인한다. requiredIdeas=[{anyOf:['한 가지 필수 의미의 유효한 표현', '그 의미를 만족하는 별도의 다른 방법']}]; 꼭 요청한 것만 필수다. 결과·식·방법·조건을 쓰라고 했으면 실제로 기준에 담고 묻지 않았으면 강제하지 않는다. 단순한 입력 되풀이를 설명으로 받지 않는다. 서로 다른 올바른 풀이의 필수 단계를 AND로 섞지 말고 전체 대체 풀이를 독립 anyOf 문자열로 적는다. 특정 예시만을 정답으로 강제하지 않는다. 역할을 바꾸면 learningRole=definition/procedure/reason/application/naming 중 실제 질문에 맞게 적는다.
C를 바꾸면 cDecision,cAfter,cSlotEquivalents,cReason을 함께 적는다. rewrite의 cAfter는 정답 부분을 {답}으로 표시한 실제 완성 학생 문장이고 1~4슬롯이다. 짧고 유용한 비교·계산 빈칸을 보존한다. 실제 대상 없이 긴 키워드를 복원하거나 부사만 채우게 하지 않는다. 빈칸과 같은 값을 다른 곳에서 공개하지 않는다. 입력의 수가 바뀐 역할에서 다시 답인 유용한 관계(몫 검산, 같은 거리 등)는 무조건 복사로 취급하지 않는다. 순서 없는 두 답은 같은 말을 두 번 써도 통과하는 슬롯별 대안으로 해결하지 말고 순서를 명시하거나 한 빈칸으로 줄인다. cSlotEquivalents는 각 슬롯의 대체 답 배열로서 수·읽기·단위·자리·횟수의 역할을 구별하되 그 문장에서 옳은 서로 다른 답은 허용한다. cDecision=keep은 원본 C 그대로 고정이므로 새 문장을 주지 않는다. exclude는 해당 C의 구체적인 낮은 이점 또는 반복 이유를 cReason으로 기록하고 cAfter=null, cSlotEquivalents=[]로 쓴다. 별도 remove:['cAfter','cSlotEquivalents'] 등으로 이전 필드 제거를 요청할 수 있다.
일반 학습 설명 A/SRS는 C와 별개다. coreAfter를 고칠 때는 실제 수학 오류나 빠진 조건을 고칠 때만이며 원래 표적과 일반 뜻을 보존한다. coreReason을 함께 기록한다. coreAfter도 {답} 1~4개, 보이는 전체 길이 8~160자로 만든다. C를 고쳤다는 이유로 A를 자동 대체하지 않는다.
숫자·수학 기호는 $...$ KaTeX, 곱은 	imes, 나눗셈은 div, 계산 내 빈칸 기호는 square이며 표시용 {답}과 LaTex의 중괄호를 혼동하지 않는다. 모든 조사·괄호·수식이 학생에게 실제로 읽혀야 한다. 쉬운 학년 말로 쓰고 새로운 이름이나 낯선 문자 변수를 만들지 않는다. 그림이 필요한 현재 질문은 실제 위치·수·이름을 텍스트에 제시하여 자립시키거나 그 form만 제외한다. 꼭 필요한 새 그림·조작 사례는 exampleNeeded에 무엇인지 적되 없는 그림을 이미 있는 것처럼 참조하지 않는다.
최종 승인·자동 테스트 pass·실제 독자가 재독했다는 말은 출력하지 않는다. 우리는 이 후보를 나중에 직접 읽고 원본과 확인한다. 다음 자료의 모든 ID를 빠짐없이 처리하라. 반드시 ID 하나당 B와 C 패치를 한 객체로 합쳐라. ID에 B·C 접미사를 붙이지 마라. cAfter의 중괄호에는 답·정답 같은 자리표시가 아니라 실제 수학 정답을 써라.

[
  {
    "id": "e4-1-2-6-xc7",
    "sourceIndex": 1628,
    "grade": "e4",
    "source": {
      "sourceIndex": 1628,
      "sourceFingerprint": "ba9c58b95480d68e708777c5b2b905dec27f42153a11a2fada07e34aeffb683f",
      "part": "e4plus",
      "id": "e4-1-2-6-xc7",
      "section": "초4::1-2 각도::1-2-6 사각형의 네 각의 크기의 합 알아보기",
      "term": "사각형의 나머지 한 각 구하기",
      "kind": "방법",
      "level": "하",
      "definition": "사각형의 세 각을 알면 {$360^\\circ$에서 세 각의 합을 빼어} 나머지 각을 구한다.",
      "example": {
        "prompt": "사각형의 세 각이 $80^\\circ$, $90^\\circ$, $100^\\circ$이면 나머지 각은?",
        "answer": "$90^\\circ$"
      },
      "studentC": "사각형의 세 각을 알면 □ 나머지 각을 구한다.",
      "answers": [
        "$360^\\circ$에서 세 각의 합을 빼어"
      ]
    },
    "currentProposal": {
      "id": "e4-1-2-6-xc7",
      "proposalFingerprint": "29453d231fa43afefec670e7a362d1183b0cbd55e11b616ee74c7493181c7b79",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "사각형의 세 각이 $80^\\circ$, $90^\\circ$, $100^\\circ$일 때 나머지 한 각을 구하는 방법을 식과 함께 쓰세요.",
      "bAnswer": "$360^\\circ$에서 세 각의 합을 뺀다. $360^\\circ-270^\\circ=90^\\circ$",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$360^\\circ$에서 세 각의 합을 뺀다",
            "$360^\\circ-80^\\circ-90^\\circ-100^\\circ$",
            "$360^\\circ-270^\\circ$"
          ]
        },
        {
          "anyOf": [
            "$90^\\circ$"
          ]
        }
      ],
      "bGoal": "사각형의 나머지 한 각 구하기",
      "bReason": "원문 예제 수로 빼는 절차를 자립시킴. 차례로 빼도 인정",
      "cDecision": "rewrite",
      "cReason": "긴 방법 구절 대신 기준 각도와 계산 값을 묻도록 함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "사각형의 세 각이 $80^\\circ$, $90^\\circ$, $100^\\circ$이면 나머지 각은 {$360^\\circ$}에서 세 각의 합 $270^\\circ$를 뺀 {$90^\\circ$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$360^\\circ$",
        "equivalents": []
      },
      {
        "expected": "$90^\\circ$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "식과 함께 쓰라는 질문에 맞추어 실제 빼는 식이 기준에도 필요하다.",
      "c": "전체 360도와 실제 나머지 90도를 구하는 빈칸은 분명하다."
    }
  },
  {
    "id": "e4-1-2-6-xc9",
    "sourceIndex": 1630,
    "grade": "e4",
    "source": {
      "sourceIndex": 1630,
      "sourceFingerprint": "1e2f293875ac76799f99571dc2588ccab932282e64a48e0384dd1d75e85f51f5",
      "part": "e4plus",
      "id": "e4-1-2-6-xc9",
      "section": "초4::1-2 각도::1-2-6 사각형의 네 각의 크기의 합 알아보기",
      "term": "선 하나로 삼각형 두 개 만들기",
      "kind": "방법",
      "level": "하",
      "definition": "사각형에서 {마주 보는 두 꼭짓점}을 이으면 사각형이 삼각형 두 개로 나뉜다.",
      "studentC": "사각형에서 □을 이으면 사각형이 삼각형 두 개로 나뉜다.",
      "answers": [
        "마주 보는 두 꼭짓점"
      ]
    },
    "currentProposal": {
      "id": "e4-1-2-6-xc9",
      "proposalFingerprint": "c0d3450e415964b0cf6b0797ad27de20c70993dc5acfcfbaeaa3144036f6a5db",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "사각형을 선분 하나로 삼각형 두 개로 나누려고 합니다. 사각형의 어디와 어디를 이어야 하는지 쓰세요.",
      "bAnswer": "마주 보는 두 꼭짓점을 잇는다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "마주 보는 두 꼭짓점을 잇는다",
            "이웃하지 않은 두 꼭짓점을 잇는다",
            "대각선을 긋는다"
          ]
        }
      ],
      "bGoal": "삼각형 둘로 나누는 선 긋기",
      "bReason": "이을 두 점이 마주 보는 꼭짓점임을 말하게 함",
      "cDecision": "rewrite",
      "cReason": "문장 맨 앞의 긴 구절 빈칸을 낱말과 개수로 나눔",
      "cSlotEquivalents": [
        [],
        [
          "두"
        ]
      ]
    },
    "currentCMarkedSentence": "사각형에서 마주 보는 두 {꼭짓점}을 선분으로 이으면 사각형이 삼각형 {$2$}개로 나뉜다.",
    "currentCSlotAnswers": [
      {
        "expected": "꼭짓점",
        "equivalents": []
      },
      {
        "expected": "$2$",
        "equivalents": [
          "두"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "안쪽이 두 삼각형으로 나뉘는 선을 고른다는 조건이나 실제 사각형 그림으로 잇는 꼭짓점을 특정해야 한다.",
      "c": "일반 사각형의 아무 대각선이 항상 안쪽을 나눈다고 읽히지 않게 안쪽 분할 조건을 보여야 한다."
    }
  },
  {
    "id": "e4-1-2-6-xc19",
    "sourceIndex": 1640,
    "grade": "e4",
    "source": {
      "sourceIndex": 1640,
      "sourceFingerprint": "d27e98624b386cd3902bebbfb38a8045af72b3e85639e6c211793f79b651e580",
      "part": "e4plus",
      "id": "e4-1-2-6-xc19",
      "section": "초4::1-2 각도::1-2-6 사각형의 네 각의 크기의 합 알아보기",
      "term": "두 각을 알 때 나머지 두 각",
      "kind": "성질",
      "level": "중",
      "definition": "사각형의 두 각을 알면 나머지 두 각의 {합}은 정해지지만, 두 각 각각의 크기는 정해지지 않는다.",
      "example": {
        "prompt": "두 각의 합이 $200^\\circ$인 사각형의 나머지 두 각이 하나로 정해지지 않는 까닭은?",
        "answer": "합만 $160^\\circ$이면 돼서"
      },
      "studentC": "사각형의 두 각을 알면 나머지 두 각의 □은 정해지지만, 두 각 각각의 크기는 정해지지 않는다.",
      "answers": [
        "합"
      ]
    },
    "currentProposal": {
      "id": "e4-1-2-6-xc19",
      "proposalFingerprint": "99277170864fc7bd4a977342c2b03d1bf29fc6a2011430711f6826eafb39d2b7",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "두 각의 합이 $200^\\circ$인 사각형에서 나머지 두 각의 크기가 한 가지로 정해지지 않는 까닭을 예를 들어 설명하세요.",
      "bAnswer": "나머지 두 각은 합이 $160^\\circ$이기만 하면 되어 $80^\\circ$와 $80^\\circ$, $70^\\circ$와 $90^\\circ$처럼 여러 가지가 될 수 있다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "나머지 두 각의 합이 $160^\\circ$이면 된다",
            "합만 $160^\\circ$로 정해진다"
          ]
        },
        {
          "anyOf": [
            "$70^\\circ$와 $90^\\circ$ 같은 예를 든다",
            "합이 $160^\\circ$인 두 각은 여러 가지이다"
          ]
        }
      ],
      "bGoal": "합만 정해지는 까닭",
      "bReason": "원문 예제 수로 합은 정해지고 각각은 아님을 설명",
      "cDecision": "keep",
      "cReason": "뒤 절의 '각각'과 대비되어 '합'이 분명함",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "사각형의 두 각을 알면 나머지 두 각의 {합}은 정해지지만, 두 각 각각의 크기는 정해지지 않는다.",
    "currentCSlotAnswers": [
      {
        "expected": "합",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "예를 들어 설명하라는 범위에 맞추어 서로 다른 실제 두 각의 짝을 기준에서도 요구해야 한다.",
      "c": "합은 정해지지만 개별 값은 정해지지 않는 차이를 확인한다."
    }
  },
  {
    "id": "e4-1-2-6-xc20",
    "sourceIndex": 1641,
    "grade": "e4",
    "source": {
      "sourceIndex": 1641,
      "sourceFingerprint": "30f1595acccb5be531d0fddea99cf483c23966d64b11245f53483f7f79bb0565",
      "part": "e4plus",
      "id": "e4-1-2-6-xc20",
      "section": "초4::1-2 각도::1-2-6 사각형의 네 각의 크기의 합 알아보기",
      "term": "삼각형 네 개로 나누어 구하기",
      "kind": "방법",
      "level": "상",
      "definition": "사각형 안의 한 점과 네 꼭짓점을 이어 삼각형 네 개를 만들면 $180^\\circ\\times4$에서 가운데 {$360^\\circ$}를 뺀다.",
      "studentC": "사각형 안의 한 점과 네 꼭짓점을 이어 삼각형 네 개를 만들면 $180^\\circ\\times4$에서 가운데 □를 뺀다.",
      "answers": [
        "$360^\\circ$"
      ]
    },
    "currentProposal": {
      "id": "e4-1-2-6-xc20",
      "proposalFingerprint": "0909353ec76ded7be1bb6d15ca7ba081ea9578ff07700fd596dc6187c18754a4",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "사각형 안의 한 점과 네 꼭짓점을 이어 삼각형 네 개로 나누었습니다. 네 삼각형의 각을 모두 더한 $180^\\circ\\times4$에서 무엇을 왜 빼야 사각형의 네 각의 합이 되는지 설명하세요.",
      "bAnswer": "가운데 점에 모인 각 $360^\\circ$는 사각형의 각이 아니므로 뺀다. $720^\\circ-360^\\circ=360^\\circ$",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "가운데 점에 모인 각 $360^\\circ$를 뺀다",
            "가운데 한 바퀴를 뺀다"
          ]
        },
        {
          "anyOf": [
            "가운데 각은 사각형의 각이 아니다",
            "사각형의 네 각에 들어가지 않는다"
          ]
        }
      ],
      "bGoal": "가운데 $360^\\circ$를 빼는 까닭",
      "bReason": "빼는 대상과 그것이 사각형의 각이 아니라는 이유를 묻기",
      "cDecision": "rewrite",
      "cReason": "원문은 무엇을 구하려고 빼는지 없어 목적과 결과를 보탬",
      "cSlotEquivalents": [],
      "exampleNeeded": "사각형 안의 한 점과 네 꼭짓점을 이어 삼각형 네 개로 나누고 가운데 각을 표시한 그림",
      "coreAfter": "사각형 안의 한 점과 네 꼭짓점을 이어 안쪽을 겹치지 않게 삼각형 네 개로 나누면, $180^\\circ\\times4$에서 가운데 점에 모인 {$360^\\circ$}를 뺀다. 남은 값이 사각형의 네 각의 합이다.",
      "coreReason": "가운데360도라는 원래표적을보존하며겹치지않는안쪽분할조건과빼는목적을명시한다.아무내부점이나성립한다고일반화하지않는다."
    },
    "currentCMarkedSentence": "사각형 안의 한 점과 네 꼭짓점을 이으면 삼각형 $4$개가 생긴다. 네 삼각형의 각을 모두 더한 $180^\\circ\\times4=720^\\circ$에서 가운데 점에 모인 한 바퀴 {$360^\\circ$}를 빼면 사각형의 네 각의 합 {$360^\\circ$}가 된다.",
    "currentCSlotAnswers": [
      {
        "expected": "$360^\\circ$",
        "equivalents": []
      },
      {
        "expected": "$360^\\circ$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "한 점에서 네 꼭짓점을 이어 안쪽을 겹치지 않는 네 삼각형으로 나눈다는 조건과 그림을 제시해야 한다.",
      "c": "핵심 설명에 있는 겹침 없는 안쪽 분할 조건을 C에도 복원해야 한다."
    }
  },
  {
    "id": "e4-1-2-6-xc28",
    "sourceIndex": 1647,
    "grade": "e4",
    "source": {
      "sourceIndex": 1647,
      "sourceFingerprint": "74bd01b8f131e3b42f09141a9bcb0beebbbd604bf52891d313d67b24571fca3b",
      "part": "e4plus",
      "id": "e4-1-2-6-xc28",
      "section": "초4::1-2 각도::1-2-6 사각형의 네 각의 크기의 합 알아보기",
      "term": "같은 사각형 네 장으로 한 바퀴",
      "kind": "성질",
      "level": "상",
      "definition": "같은 사각형 네 장의 서로 다른 네 각을 한 점에 모으면 {빈틈없이} 한 바퀴를 채운다.",
      "studentC": "같은 사각형 네 장의 서로 다른 네 각을 한 점에 모으면 □ 한 바퀴를 채운다.",
      "answers": [
        "빈틈없이"
      ]
    },
    "currentProposal": {
      "id": "e4-1-2-6-xc28",
      "proposalFingerprint": "f20c12bb1c1718baa216a83abf01850a2c21550d3fc87f5ed0af22b4586b73e9",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "모양과 크기가 같은 사각형 네 장에서 서로 다른 네 각을 한 점에 모으면 빈틈없이 한 바퀴가 채워집니다. 그 까닭을 설명하세요.",
      "bAnswer": "서로 다른 네 각은 사각형 한 개의 네 각과 같아서 합이 $360^\\circ$이고, 한 바퀴도 $360^\\circ$이기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "네 각의 합이 $360^\\circ$이다",
            "사각형 한 개의 네 각을 모은 것과 같다"
          ]
        },
        {
          "anyOf": [
            "한 바퀴는 $360^\\circ$이다",
            "$360^\\circ$라서 빈틈없이 채운다"
          ]
        }
      ],
      "bGoal": "네 장이 한 바퀴를 채우는 까닭",
      "bReason": "활동 결과를 네 각의 합 $360^\\circ$와 연결해 설명",
      "cDecision": "rewrite",
      "cReason": "'빈틈없이'는 문장 복원형 답이라 근거가 되는 각도로 바꿈",
      "cSlotEquivalents": [],
      "exampleNeeded": "같은 사각형 네 장의 서로 다른 네 각을 한 점에 모아 붙인 그림"
    },
    "currentCMarkedSentence": "모양과 크기가 같은 사각형 네 장에서 서로 다른 네 각을 한 점에 모으면 네 각의 합이 {$360^\\circ$}이므로 빈틈없이 한 바퀴를 채운다.",
    "currentCSlotAnswers": [
      {
        "expected": "$360^\\circ$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "서로 다른 네 각이 크기가 서로 다르다는 뜻으로 읽히지 않게 사각형의 서로 다른 꼭짓점 하나씩을 택한다고 질문을 특정해야 한다.",
      "c": "같은 조건을 C에도 명시하고 실제 네 장 모으기 그림이 있으면 좋다."
    }
  },
  {
    "id": "e4-1-3-1-xc1",
    "sourceIndex": 1648,
    "grade": "e4",
    "source": {
      "sourceIndex": 1648,
      "sourceFingerprint": "0309f69fd099e77c72668a9256cbee4555f5b5bacbbbdab71ff8dfce352f9445",
      "part": "e4plus",
      "id": "e4-1-3-1-xc1",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-1 (세 자리 수)×(몇십)의 계산",
      "term": "몇백과 몇십의 곱",
      "kind": "방법",
      "level": "하",
      "definition": "$300\\times20$은 $3\\times2=6$ 뒤에 $0$을 {세 개} 붙여 $6000$이다.",
      "example": {
        "prompt": "$400\\times30$은?",
        "answer": "$12000$"
      },
      "studentC": "$300\\times20$은 $3\\times2=6$ 뒤에 $0$을 □ 붙여 $6000$이다.",
      "answers": [
        "세 개"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-1-xc1",
      "proposalFingerprint": "65dd73e6f3f715e34ac8bf52c778d8e6378ec9b3bd7eb53860c0fba6eef613f3",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$400\\times30$을 $4\\times3$을 이용해 계산하는 방법을 쓰고 답을 구하세요.",
      "bAnswer": "$4\\times3=12$를 구하고 그 뒤에 $0$을 세 개 붙여 $12000$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$4\\times3=12$"
          ]
        },
        {
          "anyOf": [
            "$0$을 세 개 붙인다",
            "$0$을 $3$개 붙인다"
          ]
        },
        {
          "anyOf": [
            "$12000$"
          ]
        }
      ],
      "bGoal": "몇백과 몇십의 곱 계산 방법",
      "bReason": "C와 다른 원문 예제 수로 같은 방법을 적용하게 함",
      "cDecision": "keep",
      "cReason": "식과 결과가 모두 보여 $0$의 개수만 쓰면 됨",
      "cSlotEquivalents": [
        [
          "$3$개"
        ]
      ]
    },
    "currentCMarkedSentence": "$300\\times20$은 $3\\times2=6$ 뒤에 $0$을 {세 개} 붙여 $6000$이다.",
    "currentCSlotAnswers": [
      {
        "expected": "세 개",
        "equivalents": [
          "$3$개"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "4 곱하기 3을 이용하라는 조건만으로 0 붙이기만 강제하지 말고 천 묶음 열두 개로 설명하는 실제 방법도 허용해야 한다.",
      "c": "곱 뒤에 붙인 0의 개수를 묻는 이 C는 방법을 명시한 범위에 맞는다."
    }
  },
  {
    "id": "e4-1-3-1-xc6",
    "sourceIndex": 1653,
    "grade": "e4",
    "source": {
      "sourceIndex": 1653,
      "sourceFingerprint": "37cb802e2cbadeaebfd7871faa2bb2624a45bbc4cc8f3c5d031387acf3c8ef65",
      "part": "e4plus",
      "id": "e4-1-3-1-xc6",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-1 (세 자리 수)×(몇십)의 계산",
      "term": "몇백에 몇을 곱하기",
      "kind": "방법",
      "level": "하",
      "definition": "몇백에 몇을 곱할 때는 {백의 묶음 수}에 몇을 곱해 백의 묶음이 모두 몇 개인지 구한다.",
      "example": {
        "prompt": "$400\\times3$을 $4\\times3$으로 구할 수 있는 까닭은?",
        "answer": "백의 묶음이 $12$개가 되어서"
      },
      "studentC": "몇백에 몇을 곱할 때는 □에 몇을 곱해 백의 묶음이 모두 몇 개인지 구한다.",
      "answers": [
        "백의 묶음 수"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-1-xc6",
      "proposalFingerprint": "77ba6f2e23298fc6b1c0098956eaf428e0bc54d1f3135254797a7176a1c6d881",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$400\\times3$을 $4\\times3$으로 구할 수 있는 까닭을 백의 묶음으로 설명하세요.",
      "bAnswer": "$400$은 백이 $4$묶음이고, $3$배 하면 백이 $4\\times3=12$묶음이 되어 $1200$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$400$은 백이 $4$묶음이다",
            "백이 $4$개이다"
          ]
        },
        {
          "anyOf": [
            "백이 $12$묶음이 된다",
            "백이 $12$개라서 $1200$이다"
          ]
        }
      ],
      "bGoal": "몇백 곱을 백의 묶음으로 설명",
      "bReason": "원문 예제로 묶음 수를 곱하는 까닭을 설명하게 함",
      "cDecision": "rewrite",
      "cReason": "'백의 묶음 수'는 낯선 구절이라 구체 수의 계산으로 바꿈",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$400\\times3$에서 $400$은 백이 $4$묶음이므로 $4\\times3=12$로 백이 {$12$}묶음임을 구하면 $400\\times3=$ {$1200$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$12$",
        "equivalents": []
      },
      {
        "expected": "$1200$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "백 묶음 네 개를 세 배하여 열두 묶음이라는 실제 이유를 설명한다.",
      "c": "12를 바로 앞 식에서 주고 그대로 다시 받는 첫 빈칸을 빼고 1200의 값 빈칸을 보존해야 한다."
    }
  },
  {
    "id": "e4-1-3-1-xc10",
    "sourceIndex": 1656,
    "grade": "e4",
    "source": {
      "sourceIndex": 1656,
      "sourceFingerprint": "e9c7fe8bd9192402b02f2c2499114b0a6014e693a51b945b332ae7dfcd6a0fb4",
      "part": "e4plus",
      "id": "e4-1-3-1-xc10",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-1 (세 자리 수)×(몇십)의 계산",
      "term": "몇십을 몇과 $10$의 곱으로 보기",
      "kind": "성질",
      "level": "중",
      "definition": "몇십은 {몇의 $10$배}이므로, 어떤 수에 몇십을 곱하는 것은 몇을 곱한 뒤 $10$을 곱하는 것과 같다.",
      "example": {
        "prompt": "어떤 수에 $40$을 곱할 때 $4$를 곱한 뒤 $10$을 곱해도 되는 까닭은?",
        "answer": "$40$이 $4$의 $10$배라서"
      },
      "studentC": "몇십은 □이므로, 어떤 수에 몇십을 곱하는 것은 몇을 곱한 뒤 $10$을 곱하는 것과 같다.",
      "answers": [
        "몇의 $10$배"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-1-xc10",
      "proposalFingerprint": "e636a30a425244036109e41608a49b70a903456e4c6138ca2e1fd4a4957e0e0f",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "어떤 수에 $40$을 곱할 때 $4$를 곱한 뒤 $10$을 곱해도 되는 까닭을 설명하세요.",
      "bAnswer": "$40$은 $4$의 $10$배이기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$40$은 $4$의 $10$배이다",
            "$40=4\\times10$"
          ]
        }
      ],
      "bGoal": "몇십을 몇과 $10$으로 보는 까닭",
      "bReason": "원문 예제 $40$으로 두 번에 나눠 곱하는 근거를 묻기",
      "cDecision": "rewrite",
      "cReason": "'몇의 $10$배' 구절 대신 구체 수 $40$의 관계를 묻기",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$40$은 $4$의 {$10$}배이므로, 어떤 수에 $40$을 곱하는 것은 $4$를 곱한 뒤 {$10$}을 곱하는 것과 같다.",
    "currentCSlotAnswers": [
      {
        "expected": "$10$",
        "equivalents": []
      },
      {
        "expected": "$10$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "40이 4의 열 배라는 관계로 곱하는 순서를 설명한다.",
      "c": "같은 10을 두 번 채우는 반복을 한 빈칸의 단위 관계로 줄여야 한다."
    }
  },
  {
    "id": "e4-1-3-1-xc16",
    "sourceIndex": 1660,
    "grade": "e4",
    "source": {
      "sourceIndex": 1660,
      "sourceFingerprint": "9eae43c6221cdb4f0ab16a25837cdcc68d1a5a23b95c4b97f8c31dd6f95c7210",
      "part": "e4plus",
      "id": "e4-1-3-1-xc16",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-1 (세 자리 수)×(몇십)의 계산",
      "term": "세로셈에서 $0$ 먼저 쓰기",
      "kind": "방법",
      "level": "중",
      "definition": "세로셈으로 $30$을 곱할 때는 곱의 일의 자리에 {$0$}을 먼저 쓰고 $3$을 곱한 값을 앞에 쓴다.",
      "studentC": "세로셈으로 $30$을 곱할 때는 곱의 일의 자리에 □을 먼저 쓰고 $3$을 곱한 값을 앞에 쓴다.",
      "answers": [
        "$0$"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-1-xc16",
      "proposalFingerprint": "cb095e29fe1ec8d62a3f016549256eb2d3ace10e8dbafc65f3692a66a4d35124",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$213\\times30$을 세로셈으로 계산하는 순서를 쓰고 답을 구하세요.",
      "bAnswer": "곱의 일의 자리에 $0$을 먼저 쓰고, $213\\times3=639$를 그 앞에 써서 $6390$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "일의 자리에 $0$을 먼저 쓴다",
            "끝에 $0$을 쓴다"
          ]
        },
        {
          "anyOf": [
            "$213\\times3=639$를 앞에 쓴다",
            "$3$을 곱한 값을 앞에 쓴다"
          ]
        },
        {
          "anyOf": [
            "$6390$"
          ]
        }
      ],
      "bGoal": "몇십 곱 세로셈 순서",
      "bReason": "$0$ 먼저 쓰기와 $3$ 곱하기 순서를 구체 식으로 확인",
      "cDecision": "keep",
      "cReason": "먼저 쓰는 숫자 하나만 묻는 선명한 빈칸",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "세로셈으로 $30$을 곱할 때는 곱의 일의 자리에 {$0$}을 먼저 쓰고 $3$을 곱한 값을 앞에 쓴다.",
    "currentCSlotAnswers": [
      {
        "expected": "$0$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "세로셈의 올바른 과정에서 213과 3의 곱을 먼저 구하고 끝에 0을 붙이는 순서도 옳으므로 0을 반드시 먼저 쓰도록 강제하지 않아야 한다.",
      "c": "0부터 쓰는 방법으로 한정한 C는 그 절차를 분명히 확인한다."
    }
  },
  {
    "id": "e4-1-3-1-xc27",
    "sourceIndex": 1665,
    "grade": "e4",
    "source": {
      "sourceIndex": 1665,
      "sourceFingerprint": "b520f5546e6ae8612aded9f2ee3b26d2c63b25f48a7b1a9f843fa079ddc700e0",
      "part": "e4plus",
      "id": "e4-1-3-1-xc27",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-1 (세 자리 수)×(몇십)의 계산",
      "term": "곱이 다섯 자리가 될 때",
      "kind": "성질",
      "level": "상",
      "definition": "세 자리 수에 몇십을 곱할 때 $500\\times20$처럼 곱이 {$10000$ 이상}이 되면 곱은 다섯 자리 수이다.",
      "studentC": "세 자리 수에 몇십을 곱할 때 $500\\times20$처럼 곱이 □이 되면 곱은 다섯 자리 수이다.",
      "answers": [
        "$10000$ 이상"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-1-xc27",
      "proposalFingerprint": "5df82817430c787178cfbedf4badc9ab5c4c88ab86a6cf9429694be682dcd229",
      "learningRole": "definition",
      "bDecision": "rewrite",
      "bPrompt": "$500\\times20$의 곱이 몇 자리 수인지 구하고, 세 자리 수에 몇십을 곱한 곱이 어떤 때 다섯 자리 수가 되는지 쓰세요.",
      "bAnswer": "$500\\times20=10000$으로 다섯 자리 수이다. 곱이 $10000$이거나 그보다 클 때 다섯 자리 수가 된다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$10000$",
            "다섯 자리 수"
          ]
        },
        {
          "anyOf": [
            "곱이 $10000$ 이상일 때",
            "곱이 $10000$이거나 그보다 클 때"
          ]
        }
      ],
      "bGoal": "곱이 다섯 자리가 되는 때",
      "bReason": "구체 곱과 다섯 자리가 되는 기준 $10000$을 함께 확인",
      "cDecision": "rewrite",
      "cReason": "'$10000$ 이상' 구절 대신 계산 값과 자릿수를 묻기",
      "cSlotEquivalents": [
        [],
        [
          "$5$"
        ]
      ]
    },
    "currentCMarkedSentence": "$500\\times20=$ {$10000$}처럼 세 자리 수에 몇십을 곱한 곱이 $10000$이거나 그보다 크면 곱은 {다섯} 자리 수이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$10000$",
        "equivalents": []
      },
      {
        "expected": "다섯",
        "equivalents": [
          "$5$"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "몇 자리인지 묻는 첫 답 범위에 맞추어 다섯 자리라는 판단을 기준에서 요구하고 곱 10000만을 같은 종류의 답으로 취급하지 않아야 한다.",
      "c": "몇십과 세 자리 수 범위에서 곱 10000 이상의 다섯 자리 판단이 맞는다."
    }
  },
  {
    "id": "e4-1-3-2-xc7",
    "sourceIndex": 1671,
    "grade": "e4",
    "source": {
      "sourceIndex": 1671,
      "sourceFingerprint": "72079831249b5fe344d8ef4a781bc830123227fdb1593a245dabbd84d80edc46",
      "part": "e4plus",
      "id": "e4-1-3-2-xc7",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-2 (세 자리 수)×(두 자리 수)의 계산",
      "term": "곱의 자릿수",
      "kind": "성질",
      "level": "하",
      "definition": "세 자리 수에 두 자리 수를 곱한 곱은 {네 자리나 다섯 자리} 수이다.",
      "studentC": "세 자리 수에 두 자리 수를 곱한 곱은 □ 수이다.",
      "answers": [
        "네 자리나 다섯 자리"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-2-xc7",
      "proposalFingerprint": "0f034771cd3ee1c1b5d5fe796438a1cc9cf74dbbb3a44146dcb05d6145c579c8",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "세 자리 수에 두 자리 수를 곱한 곱이 몇 자리 수가 될 수 있는지, 가장 작은 곱과 가장 큰 곱을 구해 설명하세요.",
      "bAnswer": "가장 작은 곱은 $100\\times10=1000$으로 네 자리 수이고, 가장 큰 곱은 $999\\times99=98901$로 다섯 자리 수이다. 그래서 네 자리 수이거나 다섯 자리 수이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "네 자리 수이거나 다섯 자리 수이다"
          ]
        },
        {
          "anyOf": [
            "$100\\times10=1000$",
            "가장 작은 곱이 네 자리 수이다"
          ]
        },
        {
          "anyOf": [
            "$999\\times99=98901$",
            "가장 큰 곱이 다섯 자리 수이다",
            "$999\\times99$는 $100000$보다 작다"
          ]
        }
      ],
      "bGoal": "곱의 자릿수와 그 까닭",
      "bReason": "가장 작은 곱과 큰 곱으로 자릿수 범위를 설명",
      "cDecision": "rewrite",
      "cReason": "'네 자리나 다섯 자리' 한 덩어리를 두 짧은 빈칸으로 나눔",
      "cSlotEquivalents": [
        [
          "$4$"
        ],
        [
          "$5$"
        ]
      ]
    },
    "currentCMarkedSentence": "세 자리 수에 두 자리 수를 곱한 곱은 {네} 자리 수이거나 {다섯} 자리 수이다.",
    "currentCSlotAnswers": [
      {
        "expected": "네",
        "equivalents": [
          "$4$"
        ]
      },
      {
        "expected": "다섯",
        "equivalents": [
          "$5$"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "가장 작은 곱과 큰 곱을 직접 구하라는 범위에 실제 두 곱의 값이 기준에도 필요하다.",
      "c": "네 자리와 다섯 자리의 순서가 없으므로 적은 자리 수부터 답하도록 순서를 명시해야 한다."
    }
  },
  {
    "id": "e4-1-3-2-xc9",
    "sourceIndex": 1673,
    "grade": "e4",
    "source": {
      "sourceIndex": 1673,
      "sourceFingerprint": "d9236b03e841d243bc7f51f180dfaa1345f798e633df743a182c7f6f80b9a62b",
      "part": "e4plus",
      "id": "e4-1-3-2-xc9",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-2 (세 자리 수)×(두 자리 수)의 계산",
      "term": "부분 곱의 개수",
      "kind": "성질",
      "level": "하",
      "definition": "두 자리 수를 곱하면 일의 자리와 십의 자리에서 부분 곱이 {두 개} 생긴다.",
      "studentC": "두 자리 수를 곱하면 일의 자리와 십의 자리에서 부분 곱이 □ 생긴다.",
      "answers": [
        "두 개"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-2-xc9",
      "proposalFingerprint": "421a3cd3a2ad7bd252357f7c7a0789d432496a7ca12423909aa9e4aac8e5aadd",
      "learningRole": "definition",
      "bDecision": "rewrite",
      "bPrompt": "$132\\times24$를 세로셈으로 계산할 때 생기는 부분 곱 두 개가 각각 어떤 곱셈식인지 쓰세요.",
      "bAnswer": "$132\\times4$와 $132\\times20$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$132\\times4$",
            "$528$"
          ]
        },
        {
          "anyOf": [
            "$132\\times20$",
            "$2640$"
          ]
        }
      ],
      "bGoal": "부분 곱 두 개의 뜻",
      "bReason": "개수만이 아니라 두 부분 곱이 무엇인지 말하게 함",
      "cDecision": "keep",
      "cReason": "일의 자리와 십의 자리가 보여 개수 답이 분명함",
      "cSlotEquivalents": [
        [
          "$2$개"
        ]
      ],
      "answerNotes": "B에서 둘째 부분 곱을 $132\\times2$라고만 쓰면 $20$을 곱한 뜻이 빠져 부족함"
    },
    "currentCMarkedSentence": "두 자리 수를 곱하면 일의 자리와 십의 자리에서 부분 곱이 {두 개} 생긴다.",
    "currentCSlotAnswers": [
      {
        "expected": "두 개",
        "equivalents": [
          "$2$개"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "각 부분 곱이 어떤 곱셈식인지 묻는데 528과 2640이라는 결과만을 식과 같은 답으로 받지 않도록 해야 한다.",
      "c": "일과 십에서 두 부분 곱이 생기는 구조를 확인한다."
    }
  },
  {
    "id": "e4-1-3-2-xc10",
    "sourceIndex": 1674,
    "grade": "e4",
    "source": {
      "sourceIndex": 1674,
      "sourceFingerprint": "d70dba83074cb99692a2d0276ae43d150c3ad995c10f289cfe64ae9df2363130",
      "part": "e4plus",
      "id": "e4-1-3-2-xc10",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-2 (세 자리 수)×(두 자리 수)의 계산",
      "term": "부분 곱의 받아올림",
      "kind": "방법",
      "level": "중",
      "definition": "부분 곱을 구하다가 받아올림이 생기면 {윗자리}에 더하는 것을 빠뜨리지 않는다.",
      "studentC": "부분 곱을 구하다가 받아올림이 생기면 □에 더하는 것을 빠뜨리지 않는다.",
      "answers": [
        "윗자리"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-2-xc10",
      "proposalFingerprint": "dd3f5ec0dc40aa520369f00e744bc19bc3b0b51af7e08f0786d3ebacba29953d",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$136\\times4$를 계산할 때 일의 자리 계산 $6\\times4=24$에서 받아올린 수를 어떻게 하는지 쓰고 곱을 구하세요.",
      "bAnswer": "받아올린 $2$를 십의 자리 계산 $3\\times4=12$에 더해 $14$로 계산한다. 곱은 $544$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "받아올린 $2$를 십의 자리 곱에 더한다",
            "윗자리에 더한다"
          ]
        },
        {
          "anyOf": [
            "$544$"
          ]
        }
      ],
      "bGoal": "받아올림을 윗자리에 더하기",
      "bReason": "받아올림이 있는 간단한 식을 새로 주어 절차를 확인",
      "cDecision": "keep",
      "cReason": "'윗자리'는 받아올림에서 익숙한 낱말",
      "cSlotEquivalents": [
        [
          "바로 윗자리",
          "다음 자리",
          "왼쪽 자리",
          "높은 자리"
        ]
      ]
    },
    "currentCMarkedSentence": "부분 곱을 구하다가 받아올림이 생기면 {윗자리}에 더하는 것을 빠뜨리지 않는다.",
    "currentCSlotAnswers": [
      {
        "expected": "윗자리",
        "equivalents": [
          "바로 윗자리",
          "다음 자리",
          "왼쪽 자리",
          "높은 자리"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "실제 받아올린 2를 다음 자리의 곱에 더하는 방법과 544의 결과를 확인한다.",
      "c": "윗자리라는 막연한 위치 대신 바로 다음 높은 자리에서 계산한 곱에 더한다고 구체적으로 써야 한다."
    }
  },
  {
    "id": "e4-1-3-2-xc17",
    "sourceIndex": 1679,
    "grade": "e4",
    "source": {
      "sourceIndex": 1679,
      "sourceFingerprint": "5d3d4e92f875a251df3b0370e69cabf11bacfbad7bdd408269526f9b13e5b998",
      "part": "e4plus",
      "id": "e4-1-3-2-xc17",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-2 (세 자리 수)×(두 자리 수)의 계산",
      "term": "가르기로 배운 계산 쓰기",
      "kind": "성질",
      "level": "중",
      "definition": "두 자리 수를 몇십과 몇으로 가르면 이미 배운 {몇십 곱하기}와 {몇 곱하기}로 계산할 수 있다.",
      "studentC": "두 자리 수를 몇십과 몇으로 가르면 이미 배운 □와 □로 계산할 수 있다.",
      "answers": [
        "몇십 곱하기",
        "몇 곱하기"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-2-xc17",
      "proposalFingerprint": "398ac6aa76f205c8f77c127db5304654b5b1a0c17f110cf3bf8dd29e9dac1bf7",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$132\\times24$를 $24$를 몇십과 몇으로 갈라 계산하는 방법을 쓰고 답을 구하세요.",
      "bAnswer": "$24$를 $20$과 $4$로 갈라 $132\\times20=2640$, $132\\times4=528$을 구해 더하면 $3168$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$24$를 $20$과 $4$로 가른다"
          ]
        },
        {
          "anyOf": [
            "$132\\times20$과 $132\\times4$를 더한다",
            "$2640+528$"
          ]
        },
        {
          "anyOf": [
            "$3168$"
          ]
        }
      ],
      "bGoal": "가르기로 곱 계산하기",
      "bReason": "가르기와 두 곱의 합을 구체 식으로 수행하게 함",
      "cDecision": "rewrite",
      "cReason": "'몇십 곱하기' 같은 구절 답을 실제 곱하는 수로 바꿈",
      "cSlotEquivalents": [],
      "answerNotes": "두 빈칸의 순서가 바뀌어도 뜻은 같음"
    },
    "currentCMarkedSentence": "$132\\times24$에서 $24$를 $20$과 $4$로 가르면 $132\\times$ {$20$}과 $132\\times$ {$4$}를 각각 계산해 더하면 된다.",
    "currentCSlotAnswers": [
      {
        "expected": "$20$",
        "equivalents": []
      },
      {
        "expected": "$4$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "몇십과 몇으로 나누는 방법을 한정한 B는 범위가 분명하다.",
      "c": "20과 4를 모두 바로 앞에 준 뒤 두 값을 그대로 옮기는 C는 실제 부분 곱이나 합의 빈칸으로 바꾸어야 한다."
    }
  },
  {
    "id": "e4-1-3-2-xc18",
    "sourceIndex": 1680,
    "grade": "e4",
    "source": {
      "sourceIndex": 1680,
      "sourceFingerprint": "071f59f68cadf34e507e61541482ad89ffb9faf2b5e52706dd95a7f5526a6e49",
      "part": "e4plus",
      "id": "e4-1-3-2-xc18",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-2 (세 자리 수)×(두 자리 수)의 계산",
      "term": "다르게 갈라 다시 계산하기",
      "kind": "방법",
      "level": "중",
      "definition": "곱이 맞는지는 곱하는 수를 다르게 갈라 {다시 계산해} 확인할 수 있다.",
      "studentC": "곱이 맞는지는 곱하는 수를 다르게 갈라 □ 확인할 수 있다.",
      "answers": [
        "다시 계산해"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-2-xc18",
      "proposalFingerprint": "7a1c757722f35e60981534a1e3b6607d2cee0b2d3637735c61c07c71dd9152f9",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "$125\\times24$를 $24$를 $20$과 $4$로 갈라 $3000$이라고 구했습니다. $24$를 다르게 갈라 이 곱이 맞는지 확인하는 방법을 한 가지 쓰세요.",
      "bAnswer": "$24$를 $12$와 $12$로 갈라 $125\\times12=1500$을 두 번 더하면 $3000$으로 처음 곱과 같다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$24$를 다르게 가른다",
            "$12$와 $12$로 가른다",
            "$10$, $10$, $4$로 가른다"
          ]
        },
        {
          "anyOf": [
            "다시 계산해 곱이 같은지 본다",
            "$3000$으로 같다"
          ]
        }
      ],
      "bGoal": "다르게 갈라 곱 확인하기",
      "bReason": "확인 방법을 구체 식으로 직접 해 보게 함",
      "cDecision": "rewrite",
      "cReason": "'다시 계산해' 구절 복원을 확인 계산과 비교로 바꿈",
      "cSlotEquivalents": [],
      "answerNotes": "B는 $10$, $10$, $4$ 등 다른 가르기도 정답"
    },
    "currentCMarkedSentence": "$125\\times24=3000$이 맞는지 확인하려고 $24$를 $12$와 $12$로 갈라 $125\\times12=1500$을 두 번 더하면 {$3000$}이 되어 처음 곱과 {같다}.",
    "currentCSlotAnswers": [
      {
        "expected": "$3000$",
        "equivalents": []
      },
      {
        "expected": "같다",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "다르게 가르는 확인 방법을 요청하므로 실제 새 가르기와 계산을 쓰도록 질문과 기준을 맞추어야 한다.",
      "c": "처음 곱 3000을 그대로 다시 받는 첫 빈칸은 빼고 확인 관계나 실제 다른 계산으로 바꾸어야 한다."
    }
  },
  {
    "id": "e4-1-3-2-xc21",
    "sourceIndex": 1683,
    "grade": "e4",
    "source": {
      "sourceIndex": 1683,
      "sourceFingerprint": "cd6d90d75863a18ad06bc4de4084b7693de2f363b56c5553119ad0a6aa6c5954",
      "part": "e4plus",
      "id": "e4-1-3-2-xc21",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-2 (세 자리 수)×(두 자리 수)의 계산",
      "term": "곱이 같은 두 곱셈식",
      "kind": "성질",
      "level": "상",
      "definition": "$250\\times12$와 $125\\times24$는 곱이 {같다}.",
      "studentC": "$250\\times12$와 $125\\times24$는 곱이 □.",
      "answers": [
        "같다"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-2-xc21",
      "proposalFingerprint": "9c753c5d6a45534242a08d97f64aeb630bfb9de61dafd3e67da581ff08971d33",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$250\\times12$와 $125\\times24$의 곱이 같은 까닭을 두 식의 수를 견주어 설명하세요.",
      "bAnswer": "$125$는 $250$의 반이고 $24$는 $12$의 $2$배라서 곱이 같다. 둘 다 $3000$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "한 수는 반이 되고 다른 수는 $2$배가 되었다",
            "$125$는 $250$의 반이고 $24$는 $12$의 $2$배이다",
            "둘 다 $3000$이다"
          ]
        }
      ],
      "bGoal": "곱이 같은 두 식의 까닭",
      "bReason": "반과 두 배 관계로 같음을 설명. 직접 계산도 인정",
      "cDecision": "keep",
      "cReason": "두 식이 보이고 '같다' 비교만 쓰면 됨",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "$250\\times12$와 $125\\times24$는 곱이 {같다}.",
    "currentCSlotAnswers": [
      {
        "expected": "같다",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "두 식의 인수들을 견주어 설명하라는 범위이므로 둘 다 3000이라는 결과만으로는 두 배와 반의 관계를 설명한 것으로 받지 않아야 한다.",
      "c": "실제 두 식의 같은 곱이라는 관계는 분명하다."
    }
  },
  {
    "id": "e4-1-3-2-xc26",
    "sourceIndex": 1685,
    "grade": "e4",
    "source": {
      "sourceIndex": 1685,
      "sourceFingerprint": "b4163c74af08737bb9afa4a9d7268ce9b50a88cd4d1c5334fe5b0770acf27f61",
      "part": "e4plus",
      "id": "e4-1-3-2-xc26",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-2 (세 자리 수)×(두 자리 수)의 계산",
      "term": "곱이 가장 큰 두 수 만들기",
      "kind": "방법",
      "level": "상",
      "definition": "숫자 카드로 두 수를 만들어 곱을 가장 크게 하려면 가장 큰 두 숫자를 {두 수의 가장 높은 자리}에 하나씩 놓고, 나머지 자리는 곱을 견주어 정한다.",
      "studentC": "숫자 카드로 두 수를 만들어 곱을 가장 크게 하려면 가장 큰 두 숫자를 □에 하나씩 놓고, 나머지 자리는 곱을 견주어 정한다.",
      "answers": [
        "두 수의 가장 높은 자리"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-2-xc26",
      "proposalFingerprint": "4d637a75d86a95e625bf9d534af8c03d3f8ec7c4fee3fc46d9b3cd7984c83974",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "숫자 카드 $1$, $2$, $3$, $4$, $5$를 한 번씩 써서 (세 자리 수)$\\times$(두 자리 수)의 곱을 가장 크게 만들려고 합니다. 가장 큰 두 숫자 $5$와 $4$를 어디에 놓아야 하는지와 그 까닭을 쓰세요.",
      "bAnswer": "세 자리 수의 백의 자리와 두 자리 수의 십의 자리에 하나씩 놓는다. 가장 높은 자리의 숫자가 클수록 수가 커져 곱도 커지기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "두 수의 가장 높은 자리에 하나씩 놓는다",
            "백의 자리와 십의 자리에 놓는다",
            "두 수의 맨 앞자리에 놓는다"
          ]
        },
        {
          "anyOf": [
            "높은 자리 숫자가 클수록 수가 커진다",
            "높은 자리가 곱의 크기를 가장 많이 바꾼다"
          ]
        }
      ],
      "bGoal": "가장 큰 곱 만들 때 큰 숫자 자리",
      "bReason": "구체 카드로 큰 숫자의 위치와 이유만 묻고 최댓값은 묻지 않음",
      "cDecision": "rewrite",
      "cReason": "'두 수의 가장 높은 자리' 구절을 낱말 하나로 줄임",
      "cSlotEquivalents": [
        [
          "앞",
          "왼쪽"
        ]
      ],
      "answerNotes": "참고: 가장 큰 곱은 $431\\times52=22412$이나 B에서 요구하지 않음. C에서 '낮은'은 오답"
    },
    "currentCMarkedSentence": "숫자 카드로 두 수를 만들어 곱을 가장 크게 하려면, 가장 큰 두 숫자를 두 수의 가장 {높은} 자리에 하나씩 놓고 나머지 자리는 곱을 견주어 정한다.",
    "currentCSlotAnswers": [
      {
        "expected": "높은",
        "equivalents": [
          "앞",
          "왼쪽"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "주어진 다섯 카드에서 세 자리 수와 두 자리 수를 정한 B의 배치 목표는 분명하다.",
      "c": "아무 숫자 카드와 아무 길이의 두 수로 일반화하지 말고 B처럼 실제 카드와 수의 길이를 조건으로 보여야 한다."
    }
  },
  {
    "id": "e4-1-3-3-xc3",
    "sourceIndex": 1690,
    "grade": "e4",
    "source": {
      "sourceIndex": 1690,
      "sourceFingerprint": "0858dbf1f86addf76cc5e84260e23ea2e5c58e28ce7b94dd9357109014c95745",
      "part": "e4plus",
      "id": "e4-1-3-3-xc3",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-3 곱셈의 어림셈",
      "term": "어림셈",
      "kind": "정의",
      "level": "하",
      "definition": "정확한 값 대신 어림한 수로 대강 계산하는 것을 {어림셈}이라 한다.",
      "studentC": "정확한 값 대신 어림한 수로 대강 계산하는 것을 □이라 한다.",
      "answers": [
        "어림셈"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-3-xc3",
      "proposalFingerprint": "a9d84bb57659a63799a59dd847e8fae135637fad60b452cc2169ab65deba0b99",
      "learningRole": "definition",
      "bDecision": "rewrite",
      "bPrompt": "어림셈은 어떻게 계산하는 것인지 $298\\times31$을 예로 들어 설명하세요.",
      "bAnswer": "정확한 수 대신 가까운 쉬운 수로 바꾸어 대강 계산하는 것이다. $298\\times31$은 $300\\times30=9000$쯤으로 계산한다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "어림한 수로 대강 계산한다",
            "가까운 쉬운 수로 바꾸어 계산한다"
          ]
        },
        {
          "anyOf": [
            "$300\\times30=9000$",
            "약 $9000$"
          ]
        }
      ],
      "bGoal": "어림셈의 뜻을 예로 설명",
      "bReason": "이름 암기 대신 뜻과 실제 어림 계산을 함께 확인",
      "cDecision": "keep",
      "cReason": "뜻이 문장에 있어 이름만 쓰면 되는 정의 빈칸",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "정확한 값 대신 어림한 수로 대강 계산하는 것을 {어림셈}이라 한다.",
    "currentCSlotAnswers": [
      {
        "expected": "어림셈",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "어림셈을 실제 예로 설명하는 범위에서 한 수만 어림한 300 곱하기 31 같은 올바른 쉬운 계산도 허용해야 한다.",
      "c": "어림한 수로 대강 계산한다는 기존 이름 어림셈의 뜻은 분명하다."
    }
  },
  {
    "id": "e4-1-3-3-xc10",
    "sourceIndex": 1696,
    "grade": "e4",
    "source": {
      "sourceIndex": 1696,
      "sourceFingerprint": "57f59899517a4c5004f16996e94592a895020e694d12ce99a9d19d27bcb7180e",
      "part": "e4plus",
      "id": "e4-1-3-3-xc10",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-3 곱셈의 어림셈",
      "term": "두 수를 모두 작게 어림할 때",
      "kind": "성질",
      "level": "중",
      "definition": "곱하는 두 수를 모두 더 작게 어림하면 어림한 곱은 실제 곱보다 {작다}.",
      "studentC": "곱하는 두 수를 모두 더 작게 어림하면 어림한 곱은 실제 곱보다 □.",
      "answers": [
        "작다"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-3-xc10",
      "proposalFingerprint": "9dcf6aaf5f1a9041cad375fa76f8324756715a7276fc63df2542de254ba2f783",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$412\\times23$을 $400\\times20$으로 어림하면 어림한 곱이 실제 곱보다 큰지 작은지 쓰고 그 까닭을 설명하세요.",
      "bAnswer": "작다. 두 수를 모두 더 작은 수로 바꾸어 곱했기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "작다"
          ]
        },
        {
          "anyOf": [
            "두 수를 모두 더 작게 바꾸었다",
            "$412$보다 작은 $400$, $23$보다 작은 $20$을 곱했다"
          ]
        }
      ],
      "bGoal": "둘 다 작게 어림한 곱의 크기",
      "bReason": "구체 식을 새로 주어 대소 판단과 근거를 함께 묻기",
      "cDecision": "keep",
      "cReason": "조건이 분명하고 큰/작은 비교 한 낱말",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "곱하는 두 수를 모두 더 작게 어림하면 어림한 곱은 실제 곱보다 {작다}.",
    "currentCSlotAnswers": [
      {
        "expected": "작다",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "두 양의 인수를 모두 작게 바꾼 실제 사례의 작은 곱과 이유를 확인한다.",
      "c": "두 수가 0보다 큰 경우임을 명시하여 원래 곱이 0인 경우에도 반드시 작아진다는 일반화를 피해야 한다."
    }
  },
  {
    "id": "e4-1-3-3-xc19",
    "sourceIndex": 1703,
    "grade": "e4",
    "source": {
      "sourceIndex": 1703,
      "sourceFingerprint": "cf6892c0ea194067aa0e12d837b68181ab8c8815b1b9647d98fc1535d677e2e1",
      "part": "e4plus",
      "id": "e4-1-3-3-xc19",
      "section": "초4::1-3 곱셈과 나눗셈::1-3-3 곱셈의 어림셈",
      "term": "한 수는 크게, 한 수는 작게",
      "kind": "성질",
      "level": "상",
      "definition": "한 수는 크게, 다른 수는 작게 어림하면 어림한 곱이 실제보다 큰지 작은지 {바로 알 수 없다}.",
      "studentC": "한 수는 크게, 다른 수는 작게 어림하면 어림한 곱이 실제보다 큰지 작은지 □.",
      "answers": [
        "바로 알 수 없다"
      ]
    },
    "currentProposal": {
      "id": "e4-1-3-3-xc19",
      "proposalFingerprint": "2ec6fa600c5923d7d62bd74dd52c0c1d44ea94a41d202a5039e731aa59ad1bc8",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "$398\\times21$을 $400\\times20$으로 어림했다. 한 수는 크게, 한 수는 작게 어림한 이 곱이 실제 곱보다 큰지 작은지 바로 알 수 있을까? 까닭도 쓰시오.",
      "bAnswer": "바로 알 수 없다. $398$은 크게, $21$은 작게 어림해 곱을 키우는 쪽과 줄이는 쪽이 섞였기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "바로 알 수 없다",
            "알 수 없다"
          ]
        },
        {
          "anyOf": [
            "한 수는 커지고 다른 수는 작아져 곱이 커지는지 작아지는지 정해지지 않는다"
          ]
        }
      ],
      "bGoal": "크게·작게 섞은 어림의 한계",
      "bReason": "반대 방향 어림이라 판단 불가인 이유 확인",
      "cDecision": "keep",
      "cReason": "문장 길이는 짧고 답 범위가 판단 가능 여부로 분명",
      "cSlotEquivalents": [
        [
          "알 수 없다",
          "모른다"
        ]
      ]
    },
    "currentCMarkedSentence": "한 수는 크게, 다른 수는 작게 어림하면 어림한 곱이 실제보다 큰지 작은지 {바로 알 수 없다}.",
    "currentCSlotAnswers": [
      {
        "expected": "바로 알 수 없다",
        "equivalents": [
          "알 수 없다",
          "모른다"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "두 인수의 어림 방향만으로 항상 곱의 큰 쪽을 알 수 있는지를 묻도록 바꾸어 실제 수를 이용한 다른 판단까지 불가능하다고 하지 않아야 한다.",
      "c": "바로 알 수 없다는 기준을 바꾼 방향만으로라고 명시해야 한다."
    }
  }
]
