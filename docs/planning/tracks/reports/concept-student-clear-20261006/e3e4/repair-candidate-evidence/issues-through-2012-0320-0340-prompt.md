제공 순서 모든 ID에 대해 JSON 배열만 출력한다. 각 행은 수정 패치 {id,inputProposalFingerprint,변경하는필드들}이다. id와 현재 지문 해시는 필수이고 바뀌지 않은 필드는 복사하지 않는다. 직접 독자의 B/C 지적을 실제 문장과 채점 기준의 수정으로 해소하라. 지적이 수학적으로 틀렸으면 변경 대신 repairDisagreement에 이유와 실제 올바른 수학을 써라. 코멘트나 카운트만 고쳐서 문제를 해결했다고 하지 마라.
B를 바꾸면 bDecision,bPrompt,bAnswer,bRequiredIdeas,bGoal,bReason을 함께 완성한다. bDecision은 rewrite/exclude. exclude는 bPrompt,bAnswer null, bRequiredIdeas [], exclusionReason에 B만 제외하는 구체 이유와 알려진 실제 대응 ID를 기록한다. 초등에 익숙한 이름의 정의 질문은 가능하지만 제목 하나+설명하시오, 답 하나 대기, 의미 없는 이유 묻기는 금지한다. 설명 목표·조건·대상·응답 범위를 명시하고 질문에 예상 답은 넣지 않는다. 구체적 계산은 일반 방법·뜻·관계도 확인한다. requiredIdeas=[{anyOf:['한 가지 필수 의미의 유효한 표현', '그 의미를 만족하는 별도의 다른 방법']}]; 꼭 요청한 것만 필수다. 결과·식·방법·조건을 쓰라고 했으면 실제로 기준에 담고 묻지 않았으면 강제하지 않는다. 단순한 입력 되풀이를 설명으로 받지 않는다. 서로 다른 올바른 풀이의 필수 단계를 AND로 섞지 말고 전체 대체 풀이를 독립 anyOf 문자열로 적는다. 특정 예시만을 정답으로 강제하지 않는다. 역할을 바꾸면 learningRole=definition/procedure/reason/application/naming 중 실제 질문에 맞게 적는다.
C를 바꾸면 cDecision,cAfter,cSlotEquivalents,cReason을 함께 적는다. rewrite의 cAfter는 정답 부분을 {답}으로 표시한 실제 완성 학생 문장이고 1~4슬롯이다. 짧고 유용한 비교·계산 빈칸을 보존한다. 실제 대상 없이 긴 키워드를 복원하거나 부사만 채우게 하지 않는다. 빈칸과 같은 값을 다른 곳에서 공개하지 않는다. 입력의 수가 바뀐 역할에서 다시 답인 유용한 관계(몫 검산, 같은 거리 등)는 무조건 복사로 취급하지 않는다. 순서 없는 두 답은 같은 말을 두 번 써도 통과하는 슬롯별 대안으로 해결하지 말고 순서를 명시하거나 한 빈칸으로 줄인다. cSlotEquivalents는 각 슬롯의 대체 답 배열로서 수·읽기·단위·자리·횟수의 역할을 구별하되 그 문장에서 옳은 서로 다른 답은 허용한다. cDecision=keep은 원본 C 그대로 고정이므로 새 문장을 주지 않는다. exclude는 해당 C의 구체적인 낮은 이점 또는 반복 이유를 cReason으로 기록하고 cAfter=null, cSlotEquivalents=[]로 쓴다. 별도 remove:['cAfter','cSlotEquivalents'] 등으로 이전 필드 제거를 요청할 수 있다.
일반 학습 설명 A/SRS는 C와 별개다. coreAfter를 고칠 때는 실제 수학 오류나 빠진 조건을 고칠 때만이며 원래 표적과 일반 뜻을 보존한다. coreReason을 함께 기록한다. coreAfter도 {답} 1~4개, 보이는 전체 길이 8~160자로 만든다. C를 고쳤다는 이유로 A를 자동 대체하지 않는다.
숫자·수학 기호는 $...$ KaTeX, 곱은 	imes, 나눗셈은 div, 계산 내 빈칸 기호는 square이며 표시용 {답}과 LaTex의 중괄호를 혼동하지 않는다. 모든 조사·괄호·수식이 학생에게 실제로 읽혀야 한다. 쉬운 학년 말로 쓰고 새로운 이름이나 낯선 문자 변수를 만들지 않는다. 그림이 필요한 현재 질문은 실제 위치·수·이름을 텍스트에 제시하여 자립시키거나 그 form만 제외한다. 꼭 필요한 새 그림·조작 사례는 exampleNeeded에 무엇인지 적되 없는 그림을 이미 있는 것처럼 참조하지 않는다.
최종 승인·자동 테스트 pass·실제 독자가 재독했다는 말은 출력하지 않는다. 우리는 이 후보를 나중에 직접 읽고 원본과 확인한다. 다음 자료의 모든 ID를 빠짐없이 처리하라. 반드시 ID 하나당 B와 C 패치를 한 객체로 합쳐라. ID에 B·C 접미사를 붙이지 마라. cAfter의 중괄호에는 답·정답 같은 자리표시가 아니라 실제 수학 정답을 써라.

[
  {
    "id": "e4-1-4-3-xc9",
    "sourceIndex": 1847,
    "grade": "e4",
    "source": {
      "sourceIndex": 1847,
      "sourceFingerprint": "119de902df72c5a5d7b831417a8f5cc39bdf998e3377a3d666e52b2b69ba3ef8",
      "part": "e4plus",
      "id": "e4-1-4-3-xc9",
      "section": "초4::1-4 평면도형의 이동::1-4-3 평면도형 뒤집기",
      "term": "생활 속 뒤집기",
      "kind": "성질",
      "level": "하",
      "definition": "종이에 물감을 찍고 반으로 접었다 펴면 한쪽 무늬가 반대쪽에 {뒤집힌 모양}으로 찍힌다.",
      "studentC": "종이에 물감을 찍고 반으로 접었다 펴면 한쪽 무늬가 반대쪽에 □으로 찍힌다.",
      "answers": [
        "뒤집힌 모양"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-3-xc9",
      "proposalFingerprint": "8a29b2950a1924da6892690ad6ed8f00ff035db8439e35beff803e50d51c983a",
      "learningRole": "application",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "접어 찍은 무늬",
      "bReason": "접어 만든 무늬는 xc28 B에서 다룸",
      "cDecision": "rewrite",
      "cReason": "가려진 구절 빈칸을 뒤집힌 한 낱말로 줄임",
      "cSlotEquivalents": [
        [
          "반대로 된",
          "바뀐"
        ]
      ],
      "exclusionReason": "접어서 뒤집힌 무늬가 생긴다는 목표가 xc28 B와 같아 중복"
    },
    "currentCMarkedSentence": "종이에 물감을 찍고 반으로 접었다 펴면 한쪽 무늬가 반대쪽에 좌우가 {뒤집힌} 모양으로 찍힌다.",
    "currentCSlotAnswers": [
      {
        "expected": "뒤집힌",
        "equivalents": [
          "반대로 된",
          "바뀐"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "접어 찍는 무늬의 기존 B와 중복되는 제외를 유지한다.",
      "c": "반으로 접는 방향이 없는데 좌우 반대를 강제하므로 왼쪽과 오른쪽을 맞대어 접는다고 명시해야 한다."
    }
  },
  {
    "id": "e4-1-4-3-xc15",
    "sourceIndex": 1853,
    "grade": "e4",
    "source": {
      "sourceIndex": 1853,
      "sourceFingerprint": "55a6378292391f51beb8904d7e2596fa9698b44c45afa01f9138723c21437d0e",
      "part": "e4plus",
      "id": "e4-1-4-3-xc15",
      "section": "초4::1-4 평면도형의 이동::1-4-3 평면도형 뒤집기",
      "term": "밀기와 뒤집기 가르기",
      "kind": "성질",
      "level": "중",
      "definition": "밀기는 모양이 향한 방향이 그대로이지만 뒤집기는 {방향이 바뀔} 수 있다.",
      "studentC": "밀기는 모양이 향한 방향이 그대로이지만 뒤집기는 □ 수 있다.",
      "answers": [
        "방향이 바뀔"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-3-xc15",
      "proposalFingerprint": "4558327fc1e045169833a3c977c3e9c56df942f76ffc051b0fb4eb6f8ee43c3b",
      "learningRole": "definition",
      "bDecision": "rewrite",
      "bPrompt": "도형을 밀 때와 뒤집을 때 모양이 향한 방향은 각각 어떻게 되는가?",
      "bAnswer": "밀기는 방향이 그대로이고, 뒤집기는 방향이 바뀔 수 있다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "밀기는 방향이 그대로이다"
          ]
        },
        {
          "anyOf": [
            "뒤집기는 방향이 바뀔 수 있다",
            "뒤집기는 방향이 달라진다"
          ]
        }
      ],
      "bGoal": "밀기와 뒤집기 구분",
      "bReason": "방향이 그대로인지로 두 이동을 구분",
      "cDecision": "rewrite",
      "cReason": "긴 구절 빈칸을 바뀔 한 낱말로 줄임",
      "cSlotEquivalents": [
        [
          "달라질",
          "변할"
        ]
      ]
    },
    "currentCMarkedSentence": "밀기는 모양이 향한 방향이 그대로이지만 뒤집기는 방향이 {바뀔} 수 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "바뀔",
        "equivalents": [
          "달라질",
          "변할"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "일반 뒤집기의 답은 방향이 바뀔 수 있다여야 하며 항상 바뀐다는 대체 기준을 빼야 한다.",
      "c": "바뀔 수 있다는 표현으로 대칭 모양이 그대로인 경우도 허용한다."
    }
  },
  {
    "id": "e4-1-4-3-xc18",
    "sourceIndex": 1856,
    "grade": "e4",
    "source": {
      "sourceIndex": 1856,
      "sourceFingerprint": "673026fc7307872f016639fc168d94d8fc6131030ece5320fa668eef91cc7df1",
      "part": "e4plus",
      "id": "e4-1-4-3-xc18",
      "section": "초4::1-4 평면도형의 이동::1-4-3 평면도형 뒤집기",
      "term": "뒤집은 모양 확인하기",
      "kind": "방법",
      "level": "중",
      "definition": "뒤집은 모양이 맞는지는 투명 종이에 본떠 {실제로 뒤집어} 보면 확인할 수 있다.",
      "studentC": "뒤집은 모양이 맞는지는 투명 종이에 본떠 □ 보면 확인할 수 있다.",
      "answers": [
        "실제로 뒤집어"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-3-xc18",
      "proposalFingerprint": "436157ffdaa6a69bf5df709dd3103bdd5b0ea29cea0ba7fbc4441ddc2a322e15",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "그린 뒤집은 모양이 맞는지 투명 종이로 확인하는 방법을 쓰시오.",
      "bAnswer": "처음 도형을 투명 종이에 본뜬 뒤 그 종이를 실제로 뒤집어 그린 모양과 비교한다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "투명 종이에 본뜬 것을 실제로 뒤집어 본다",
            "본뜬 종이를 뒤집어 겹쳐 본다"
          ]
        }
      ],
      "bGoal": "투명 종이로 확인",
      "bReason": "본떠서 직접 뒤집어 보는 확인 방법",
      "cDecision": "rewrite",
      "cReason": "실제로 뒤집어 구절 대신 뒤집어 한 낱말로 좁힘",
      "cSlotEquivalents": [
        [
          "실제로 뒤집어"
        ]
      ]
    },
    "currentCMarkedSentence": "뒤집은 모양이 맞는지는 투명 종이에 본뜬 것을 직접 {뒤집어} 보면 확인할 수 있다.",
    "currentCSlotAnswers": [
      {
        "expected": "뒤집어",
        "equivalents": [
          "실제로 뒤집어"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "그린 모양을 비교하는 행동도 질문의 확인 방법에서 필요하므로 실제로 뒤집는 것뿐 아니라 그린 도형과 겹쳐 비교하는 기준을 넣어야 한다.",
      "c": "같은 확인 목표에서 직접 뒤집어 보기만 반복하는 C는 실제 방향 판단으로 바꾸거나 제외할 수 있다."
    }
  },
  {
    "id": "e4-1-4-3-xc25",
    "sourceIndex": 1863,
    "grade": "e4",
    "source": {
      "sourceIndex": 1863,
      "sourceFingerprint": "d6d75325b42cb1f937e7e0e6f25b9df69968ce53ff757751e468103424fd2efa",
      "part": "e4plus",
      "id": "e4-1-4-3-xc25",
      "section": "초4::1-4 평면도형의 이동::1-4-3 평면도형 뒤집기",
      "term": "뒤집은 모양에서 처음 모양 찾기",
      "kind": "방법",
      "level": "상",
      "definition": "오른쪽으로 뒤집은 모양을 보고 처음 모양을 찾으려면 다시 {왼쪽이나 오른쪽}으로 뒤집는다.",
      "studentC": "오른쪽으로 뒤집은 모양을 보고 처음 모양을 찾으려면 다시 □으로 뒤집는다.",
      "answers": [
        "왼쪽이나 오른쪽"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-3-xc25",
      "proposalFingerprint": "5f3e3386298b96ac3df4a8307e7007bad7f227894300e120e2d26c516b72eb5d",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "도형을 오른쪽으로 뒤집었더니 지금 모양이 되었다. 처음 모양을 찾으려면 지금 모양을 어떻게 하면 되는가?",
      "bAnswer": "왼쪽이나 오른쪽으로 한 번 더 뒤집는다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "왼쪽이나 오른쪽으로 다시 뒤집는다",
            "좌우로 한 번 더 뒤집는다"
          ]
        }
      ],
      "bGoal": "처음 모양 되찾기",
      "bReason": "좌우로 다시 뒤집으면 원래대로 되돌아옴",
      "cDecision": "keep",
      "cReason": "왼쪽/오른쪽을 고르는 짧은 빈칸",
      "cSlotEquivalents": [
        [
          "왼쪽",
          "오른쪽",
          "좌우"
        ]
      ]
    },
    "currentCMarkedSentence": "오른쪽으로 뒤집은 모양을 보고 처음 모양을 찾으려면 다시 {왼쪽이나 오른쪽}으로 뒤집는다.",
    "currentCSlotAnswers": [
      {
        "expected": "왼쪽이나 오른쪽",
        "equivalents": [
          "왼쪽",
          "오른쪽",
          "좌우"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "처음 모양을 찾는 방법에 왼쪽 한 번과 오른쪽 한 번을 각각 실제 대체 방법으로 분리하여 기준에 담아야 한다.",
      "c": "왼쪽과 오른쪽은 같은 방향의 동의어가 아니라 이 되돌리기에서 각각 유효한 방법이다."
    }
  },
  {
    "id": "e4-1-4-4-xc4",
    "sourceIndex": 1870,
    "grade": "e4",
    "source": {
      "sourceIndex": 1870,
      "sourceFingerprint": "923c04df8b4b05a54d8624ca11914910952ee3ba698ef4a80473bfa2efa820b6",
      "part": "e4plus",
      "id": "e4-1-4-4-xc4",
      "section": "초4::1-4 평면도형의 이동::1-4-4 평면도형 돌리기",
      "term": "$270^\\circ$ 돌리기",
      "kind": "정의",
      "level": "하",
      "definition": "직각의 세 배만큼 돌리는 것은 {$270^\\circ$} 돌리는 것이다.",
      "studentC": "직각의 세 배만큼 돌리는 것은 □ 돌리는 것이다.",
      "answers": [
        "$270^\\circ$"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-4-xc4",
      "proposalFingerprint": "4286c891c6bd9d59139a235e6bb52760f99e766a74fdfe9ab7df90208d68d694",
      "learningRole": "application",
      "bDecision": "rewrite",
      "bPrompt": "도형을 직각의 세 배만큼 돌렸다. 몇 도 돌린 것인지 구하시오.",
      "bAnswer": "직각은 $90^\\circ$이므로 $90^\\circ\\times3=270^\\circ$ 돌린 것이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$270^\\circ$",
            "$270$도"
          ]
        }
      ],
      "bGoal": "직각의 세 배 각도",
      "bReason": "직각 $90^\\circ$의 세 배로 각도를 구함",
      "cDecision": "keep",
      "cReason": "직각의 세 배를 곱셈으로 구하는 선명한 계산",
      "cSlotEquivalents": [
        [
          "$270$도"
        ]
      ]
    },
    "currentCMarkedSentence": "직각의 세 배만큼 돌리는 것은 {$270^\\circ$} 돌리는 것이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$270^\\circ$",
        "equivalents": [
          "$270$도"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "각도 하나 계산하는 B를 방법이나 직각을 이용한 이유를 함께 설명하는 질문으로 보완해야 한다.",
      "c": "직각의 세 배 270도라는 실제 계산은 분명하다."
    }
  },
  {
    "id": "e4-1-4-4-xc10",
    "sourceIndex": 1876,
    "grade": "e4",
    "source": {
      "sourceIndex": 1876,
      "sourceFingerprint": "e1a04aec3d0e77102d5c6ae4936d2fc3c0004eef81a75bd46fed17a402a5d50c",
      "part": "e4plus",
      "id": "e4-1-4-4-xc10",
      "section": "초4::1-4 평면도형의 이동::1-4-4 평면도형 돌리기",
      "term": "시계 방향으로 $90^\\circ$ 돌린 화살표의 방향",
      "kind": "성질",
      "level": "중",
      "definition": "위쪽, 오른쪽, 아래쪽, 왼쪽 가운데 한쪽을 가리키는 화살표를 시계 방향으로 $90^\\circ$ 돌리면 이 차례에서 {바로 다음 방향}을 가리킨다(왼쪽 다음은 위쪽).",
      "studentC": "위쪽, 오른쪽, 아래쪽, 왼쪽 가운데 한쪽을 가리키는 화살표를 시계 방향으로 $90^\\circ$ 돌리면 이 차례에서 □을 가리킨다(왼쪽 다음은 위쪽).",
      "answers": [
        "바로 다음 방향"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-4-xc10",
      "proposalFingerprint": "479fc8741d4d7ac2a3d671e296068c2191ee14624333776c776a18288d368320",
      "learningRole": "application",
      "bDecision": "rewrite",
      "bPrompt": "오른쪽을 가리키는 화살표를 시계 방향으로 $90^\\circ$ 돌리면 어느 쪽을 가리키는가? 어떻게 알 수 있는지도 쓰시오.",
      "bAnswer": "아래쪽을 가리킨다. 시계 방향으로는 위쪽, 오른쪽, 아래쪽, 왼쪽 차례로 바뀌므로 오른쪽 바로 다음인 아래쪽이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "아래쪽을 가리킨다",
            "아래쪽"
          ]
        },
        {
          "anyOf": [
            "위쪽, 오른쪽, 아래쪽, 왼쪽 차례에서 바로 다음",
            "시계 방향으로 한 칸 다음 방향"
          ]
        }
      ],
      "bGoal": "돌린 화살표 방향 찾기",
      "bReason": "시계 방향 차례에서 다음 방향을 찾는 방법",
      "cDecision": "rewrite",
      "cReason": "긴 구절 빈칸을 다음 한 낱말로 줄이고 괄호 단서를 뒤 문장으로 옮김",
      "cSlotEquivalents": [
        [
          "뒤"
        ]
      ]
    },
    "currentCMarkedSentence": "위쪽, 오른쪽, 아래쪽, 왼쪽 가운데 한쪽을 가리키는 화살표를 시계 방향으로 $90^\\circ$ 돌리면 이 차례에서 바로 {다음} 방향을 가리킨다. 왼쪽을 가리키던 화살표는 위쪽을 가리키게 된다.",
    "currentCSlotAnswers": [
      {
        "expected": "다음",
        "equivalents": [
          "뒤"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "시계의 3에서 6으로 도는 방향 등 실제 다른 올바른 설명도 허용하여 반드시 네 방향 전체의 차례를 쓰게 하지 않아야 한다.",
      "c": "순서 다음이라는 낱말 대신 위쪽 화살표를 90도 돌린 실제 방향 같은 빈칸으로 바꾸는 것이 유용하다."
    }
  },
  {
    "id": "e4-1-4-4-xc11",
    "sourceIndex": 1877,
    "grade": "e4",
    "source": {
      "sourceIndex": 1877,
      "sourceFingerprint": "f01712003a9260f9769b04e1a0fdaaea0c6bfdb9a4339f6a43f9a8b509b026c9",
      "part": "e4plus",
      "id": "e4-1-4-4-xc11",
      "section": "초4::1-4 평면도형의 이동::1-4-4 평면도형 돌리기",
      "term": "시계 반대 방향으로 $90^\\circ$ 돌린 화살표의 방향",
      "kind": "성질",
      "level": "중",
      "definition": "위쪽, 왼쪽, 아래쪽, 오른쪽 가운데 한쪽을 가리키는 화살표를 시계 반대 방향으로 $90^\\circ$ 돌리면 이 차례에서 {바로 다음 방향}을 가리킨다(오른쪽 다음은 위쪽).",
      "studentC": "위쪽, 왼쪽, 아래쪽, 오른쪽 가운데 한쪽을 가리키는 화살표를 시계 반대 방향으로 $90^\\circ$ 돌리면 이 차례에서 □을 가리킨다(오른쪽 다음은 위쪽).",
      "answers": [
        "바로 다음 방향"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-4-xc11",
      "proposalFingerprint": "63851df678480a46993d34101933a6697ce6fe4fdae355991392a71402b2197d",
      "learningRole": "application",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "반시계 화살표 방향",
      "bReason": "시계 방향 xc10 B와 같은 목표",
      "cDecision": "rewrite",
      "cReason": "긴 구절 빈칸을 다음 한 낱말로 줄이고 괄호 단서를 뒤 문장으로 옮김",
      "cSlotEquivalents": [
        [
          "뒤"
        ]
      ],
      "exclusionReason": "시계 반대 방향 차례에서 다음 방향을 찾는 목표가 xc10 B와 같아 중복"
    },
    "currentCMarkedSentence": "위쪽, 왼쪽, 아래쪽, 오른쪽 가운데 한쪽을 가리키는 화살표를 시계 반대 방향으로 $90^\\circ$ 돌리면 이 차례에서 바로 {다음} 방향을 가리킨다. 오른쪽을 가리키던 화살표는 위쪽을 가리키게 된다.",
    "currentCSlotAnswers": [
      {
        "expected": "다음",
        "equivalents": [
          "뒤"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "시계 반대 회전의 대응 목표가 기존 B에 있어 반복 설명형 제외는 유지한다.",
      "c": "다음이라는 낱말 대신 실제 화살표의 시작 방향과 반대 회전 후 방향을 묻도록 바꾸어야 한다."
    }
  },
  {
    "id": "e4-1-4-4-xc12",
    "sourceIndex": 1878,
    "grade": "e4",
    "source": {
      "sourceIndex": 1878,
      "sourceFingerprint": "ee8053e46356e82decf01d7b3e0ef3271ab2a4ec10f3339c5180d4998896706d",
      "part": "e4plus",
      "id": "e4-1-4-4-xc12",
      "section": "초4::1-4 평면도형의 이동::1-4-4 평면도형 돌리기",
      "term": "$90^\\circ$씩 두 번 돌리기",
      "kind": "성질",
      "level": "중",
      "definition": "같은 중심에서 시계 방향으로 $90^\\circ$씩 두 번 돌린 것은 {$180^\\circ$} 돌린 것과 같다.",
      "studentC": "같은 중심에서 시계 방향으로 $90^\\circ$씩 두 번 돌린 것은 □ 돌린 것과 같다.",
      "answers": [
        "$180^\\circ$"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-4-xc12",
      "proposalFingerprint": "bfd259259047e4cdabc84898a28730084312402235a3d7e00311da20e45d4a35",
      "learningRole": "application",
      "bDecision": "rewrite",
      "bPrompt": "같은 중심에서 도형을 시계 방향으로 $90^\\circ$씩 두 번 돌렸다. 한 번에 몇 도 돌린 것과 같은가?",
      "bAnswer": "$90^\\circ+90^\\circ=180^\\circ$ 돌린 것과 같다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$180^\\circ$",
            "$180$도"
          ]
        }
      ],
      "bGoal": "두 번 돌린 각도 더하기",
      "bReason": "같은 방향으로 이어 돌린 각도를 더함",
      "cDecision": "keep",
      "cReason": "각도를 더하는 선명한 계산 빈칸",
      "cSlotEquivalents": [
        [
          "$180$도",
          "반 바퀴"
        ]
      ]
    },
    "currentCMarkedSentence": "같은 중심에서 시계 방향으로 $90^\\circ$씩 두 번 돌린 것은 {$180^\\circ$} 돌린 것과 같다.",
    "currentCSlotAnswers": [
      {
        "expected": "$180^\\circ$",
        "equivalents": [
          "$180$도",
          "반 바퀴"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "두 90도의 합만 묻는 B에 구하는 방법도 설명하도록 보완해야 한다.",
      "c": "같은 중심과 같은 방향이라는 조건으로 180도와 반 바퀴가 같은 회전량이다."
    }
  },
  {
    "id": "e4-1-4-4-xc13",
    "sourceIndex": 1879,
    "grade": "e4",
    "source": {
      "sourceIndex": 1879,
      "sourceFingerprint": "fdf158bd9e482365eb743edbdc334b11095c3bb7473ac7e4c51fcda41f723511",
      "part": "e4plus",
      "id": "e4-1-4-4-xc13",
      "section": "초4::1-4 평면도형의 이동::1-4-4 평면도형 돌리기",
      "term": "시계 방향 $270^\\circ$와 결과가 같은 반대 방향 돌리기",
      "kind": "성질",
      "level": "중",
      "definition": "시계 방향으로 $270^\\circ$ 돌린 것은 시계 반대 방향으로 {$90^\\circ$} 돌린 것과 같다.",
      "studentC": "시계 방향으로 $270^\\circ$ 돌린 것은 시계 반대 방향으로 □ 돌린 것과 같다.",
      "answers": [
        "$90^\\circ$"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-4-xc13",
      "proposalFingerprint": "ca008346a4729871770dc5b67c820306cedf9929c64e6b125282dd784b391069",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "도형을 시계 방향으로 $270^\\circ$ 돌렸다. 시계 반대 방향으로 몇 도 돌린 것과 같은가? 그 까닭도 쓰시오.",
      "bAnswer": "시계 반대 방향으로 $90^\\circ$ 돌린 것과 같다. 한 바퀴 $360^\\circ$에서 $270^\\circ$를 뺀 만큼 반대로 돌면 같은 자리가 되기 때문이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$90^\\circ$",
            "$90$도"
          ]
        },
        {
          "anyOf": [
            "$360^\\circ-270^\\circ$",
            "한 바퀴에서 $270^\\circ$를 뺀다"
          ]
        }
      ],
      "bGoal": "반대 방향으로 바꾸어 돌리기",
      "bReason": "한 바퀴에서 뺀 각도만큼 반대로 돌면 같음",
      "cDecision": "keep",
      "cReason": "$360-270$으로 구하는 선명한 계산 빈칸",
      "cSlotEquivalents": [
        [
          "$90$도"
        ]
      ]
    },
    "currentCMarkedSentence": "시계 방향으로 $270^\\circ$ 돌린 것은 시계 반대 방향으로 {$90^\\circ$} 돌린 것과 같다.",
    "currentCSlotAnswers": [
      {
        "expected": "$90^\\circ$",
        "equivalents": [
          "$90$도"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "반대 회전과 같은 결과를 비교할 때 같은 중심이라는 조건을 B에도 명시해야 한다.",
      "c": "C도 같은 중심의 반대 방향 회전이라고 명시해야 한다."
    }
  },
  {
    "id": "e4-1-4-4-xc15",
    "sourceIndex": 1881,
    "grade": "e4",
    "source": {
      "sourceIndex": 1881,
      "sourceFingerprint": "e0b976716b602e85d5d47ae202442b5cf9cc517b5d5a76ea3628be16d8bacdd0",
      "part": "e4plus",
      "id": "e4-1-4-4-xc15",
      "section": "초4::1-4 평면도형의 이동::1-4-4 평면도형 돌리기",
      "term": "시계 방향으로 $90^\\circ$ 돌린 도형 되돌리기",
      "kind": "방법",
      "level": "중",
      "definition": "시계 방향으로 $90^\\circ$ 돌린 도형은 {시계 반대 방향}으로 $90^\\circ$ 돌리면 처음 모양이 된다.",
      "studentC": "시계 방향으로 $90^\\circ$ 돌린 도형은 □으로 $90^\\circ$ 돌리면 처음 모양이 된다.",
      "answers": [
        "시계 반대 방향"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-4-xc15",
      "proposalFingerprint": "421217d8dddd4e0985e59aaf03020dd804d7457ef9e39e41d157320b6de852a8",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "도형을 시계 방향으로 $90^\\circ$ 돌렸다. 처음 모양으로 되돌리려면 어떻게 돌려야 하는가?",
      "bAnswer": "시계 반대 방향으로 $90^\\circ$ 돌린다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "시계 반대 방향으로 $90^\\circ$"
          ]
        }
      ],
      "bGoal": "돌린 도형 되돌리기",
      "bReason": "반대 방향으로 같은 각도만큼 되돌림",
      "cDecision": "keep",
      "cReason": "방향 이름을 묻는 짧은 빈칸",
      "cSlotEquivalents": [
        [
          "시계 반대방향"
        ]
      ]
    },
    "currentCMarkedSentence": "시계 방향으로 $90^\\circ$ 돌린 도형은 {시계 반대 방향}으로 $90^\\circ$ 돌리면 처음 모양이 된다.",
    "currentCSlotAnswers": [
      {
        "expected": "시계 반대 방향",
        "equivalents": [
          "시계 반대방향"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "같은 중심에서 시계 방향 270도를 더 돌리는 방법도 옳으므로 허용하거나 반대 방향으로 되돌린다고 범위를 명시해야 한다.",
      "c": "90도로 돌아간다고 한정한 C는 같은 중심이라는 조건을 더해야 한다."
    }
  },
  {
    "id": "e4-1-4-4-xc19",
    "sourceIndex": 1885,
    "grade": "e4",
    "source": {
      "sourceIndex": 1885,
      "sourceFingerprint": "e05ea27045d3446b64c0239202a4d01c8ddd9ce1e32c63af1e663d903450a133",
      "part": "e4plus",
      "id": "e4-1-4-4-xc19",
      "section": "초4::1-4 평면도형의 이동::1-4-4 평면도형 돌리기",
      "term": "한 바퀴를 넘겨 돌리기",
      "kind": "성질",
      "level": "상",
      "definition": "같은 중심에서 한 바퀴를 돌면 처음 자리로 돌아오므로, 한 바퀴를 넘겨 돌린 것은 {넘긴 만큼만} 돌린 것과 결과가 같다.",
      "studentC": "같은 중심에서 한 바퀴를 돌면 처음 자리로 돌아오므로, 한 바퀴를 넘겨 돌린 것은 □ 돌린 것과 결과가 같다.",
      "answers": [
        "넘긴 만큼만"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-4-xc19",
      "proposalFingerprint": "7e82896bcf5c5dc4fff4babbf7d8dfc3c769ca96b59879ea30ac116e4e894bed",
      "learningRole": "reason",
      "bDecision": "rewrite",
      "bPrompt": "같은 중심에서 도형을 $450^\\circ$ 돌렸다. 몇 도만 돌린 것과 결과가 같은가? 그 까닭도 쓰시오.",
      "bAnswer": "$90^\\circ$만 돌린 것과 같다. 한 바퀴 $360^\\circ$를 돌면 처음 자리로 돌아오므로 $450^\\circ-360^\\circ=90^\\circ$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "$90^\\circ$",
            "$90$도"
          ]
        },
        {
          "anyOf": [
            "한 바퀴는 처음으로 돌아와서 $360^\\circ$를 뺀다",
            "$450^\\circ-360^\\circ$"
          ]
        }
      ],
      "bGoal": "한 바퀴 넘긴 각도 줄이기",
      "bReason": "한 바퀴는 제자리라 넘긴 만큼만 돌린 것과 같음",
      "cDecision": "rewrite",
      "cReason": "넘긴 만큼만은 모호해 구체적인 $450^\\circ$ 계산으로 바꿈",
      "cSlotEquivalents": [
        [
          "$90$도"
        ]
      ]
    },
    "currentCMarkedSentence": "같은 중심에서 한 바퀴를 돌면 처음 자리로 돌아오므로 $450^\\circ$ 돌린 것은 {$90^\\circ$} 돌린 것과 결과가 같다.",
    "currentCSlotAnswers": [
      {
        "expected": "$90^\\circ$",
        "equivalents": [
          "$90$도"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "한 바퀴보다 적은 같은 방향의 각을 요청한다는 범위를 명시하여 450도와 같은 결과의 여러 회전량을 구분해야 한다.",
      "c": "C도 같은 방향에서 한 바퀴를 뺀 회전량이라고 명시해야 한다."
    }
  },
  {
    "id": "e4-1-4-4-xc26",
    "sourceIndex": 1891,
    "grade": "e4",
    "source": {
      "sourceIndex": 1891,
      "sourceFingerprint": "2ee8928d446c6b3603e5ad940fe33009c8e5a6831038efc8db926514154b58ed",
      "part": "e4plus",
      "id": "e4-1-4-4-xc26",
      "section": "초4::1-4 평면도형의 이동::1-4-4 평면도형 돌리기",
      "term": "시계 반대 방향으로 $90^\\circ$씩 세 번 돌리기",
      "kind": "성질",
      "level": "상",
      "definition": "같은 중심에서 시계 반대 방향으로 $90^\\circ$씩 세 번 돌린 것은 {시계 방향으로 $90^\\circ$} 돌린 것과 같다.",
      "studentC": "같은 중심에서 시계 반대 방향으로 $90^\\circ$씩 세 번 돌린 것은 □ 돌린 것과 같다.",
      "answers": [
        "시계 방향으로 $90^\\circ$"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-4-xc26",
      "proposalFingerprint": "78b542e91bfb33e60ada26065684116f233aa80ed6f843993a10aefa691d9435",
      "learningRole": "application",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "반시계 세 번 돌리기",
      "bReason": "$360$에서 뺀 각 구하기는 xc13 B와 같음",
      "cDecision": "rewrite",
      "cReason": "방향과 각도 두 가지 답을 각도 하나로 좁힘",
      "cSlotEquivalents": [
        [
          "$90$도"
        ]
      ],
      "exclusionReason": "반대 방향 $270^\\circ$를 한 바퀴에서 뺀 각으로 바꾸는 목표가 xc13 B와 같아 중복"
    },
    "currentCMarkedSentence": "같은 중심에서 시계 반대 방향으로 $90^\\circ$씩 세 번 돌린 것은 시계 방향으로 {$90^\\circ$} 돌린 것과 같다.",
    "currentCSlotAnswers": [
      {
        "expected": "$90^\\circ$",
        "equivalents": [
          "$90$도"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "반대 방향의 회전 관계를 설명하는 기존 B와 중복되는 제외를 유지한다.",
      "c": "같은 중심에서 한 바퀴보다 작은 시계 방향 회전량이라고 범위를 지정해야 한다."
    }
  },
  {
    "id": "e4-1-4-4-xc27",
    "sourceIndex": 1892,
    "grade": "e4",
    "source": {
      "sourceIndex": 1892,
      "sourceFingerprint": "d4ad43c34939a557ec05792479494c9c9875650378dcb37e67817afead4a319d",
      "part": "e4plus",
      "id": "e4-1-4-4-xc27",
      "section": "초4::1-4 평면도형의 이동::1-4-4 평면도형 돌리기",
      "term": "시계 방향으로 $90^\\circ$ 돌린 모양에서 처음 모양 찾기",
      "kind": "방법",
      "level": "상",
      "definition": "시계 방향으로 $90^\\circ$ 돌린 모양에서 처음 모양을 찾으려면 {시계 반대 방향}으로 $90^\\circ$ 돌린다.",
      "studentC": "시계 방향으로 $90^\\circ$ 돌린 모양에서 처음 모양을 찾으려면 □으로 $90^\\circ$ 돌린다.",
      "answers": [
        "시계 반대 방향"
      ]
    },
    "currentProposal": {
      "id": "e4-1-4-4-xc27",
      "proposalFingerprint": "6a80a71627fdbfdc87d83e690fb61f1c403eeff31f1f857740a3f057f5fcc36e",
      "learningRole": "procedure",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "돌린 모양에서 처음 찾기",
      "bReason": "되돌리기는 xc15 B와 같은 목표",
      "cDecision": "keep",
      "cReason": "방향 이름을 묻는 짧은 빈칸",
      "cSlotEquivalents": [
        [
          "시계 반대방향"
        ]
      ],
      "exclusionReason": "시계 방향으로 돌린 모양을 반대로 돌려 되돌리는 목표가 xc15 B와 같아 중복"
    },
    "currentCMarkedSentence": "시계 방향으로 $90^\\circ$ 돌린 모양에서 처음 모양을 찾으려면 {시계 반대 방향}으로 $90^\\circ$ 돌린다.",
    "currentCSlotAnswers": [
      {
        "expected": "시계 반대 방향",
        "equivalents": [
          "시계 반대방향"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "되돌리는 기존 B와 중복되는 제외를 유지한다.",
      "c": "같은 중심에서 돌아간다는 조건이 필요하며 대칭 모양의 우연한 같음이 아닌 이동의 되돌리기를 묻도록 해야 한다."
    }
  },
  {
    "id": "e4-1-5-1-xc5",
    "sourceIndex": 1898,
    "grade": "e4",
    "source": {
      "sourceIndex": 1898,
      "sourceFingerprint": "612216cbbbff11ecdca07a7d32ff1753cc7b06732b7c67d995d2cfff2357336d",
      "part": "e4plus",
      "id": "e4-1-5-1-xc5",
      "section": "초4::1-5 막대그래프::1-5-1 막대그래프 알아보기",
      "term": "막대를 눕혀 그린 그래프",
      "kind": "정의",
      "level": "하",
      "definition": "막대를 옆으로 눕혀 그린 막대그래프를 {가로 막대그래프}라 한다.",
      "studentC": "막대를 옆으로 눕혀 그린 막대그래프를 □라 한다.",
      "answers": [
        "가로 막대그래프"
      ]
    },
    "currentProposal": {
      "id": "e4-1-5-1-xc5",
      "proposalFingerprint": "75187d087ede481c3de0bb62c6996670f9bc67d0a3d4ebef43282125b310adb1",
      "learningRole": "naming",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "가로 막대그래프 이름",
      "bReason": "그래프 이름 하나를 확인하는 단순 낱말",
      "cDecision": "keep",
      "cReason": "눕혀 그렸다는 설명에 맞는 이름 빈칸",
      "cSlotEquivalents": [
        [
          "가로막대그래프",
          "가로 그래프"
        ]
      ],
      "exclusionReason": "눕혀 그린 그래프의 이름을 확인하는 단순 이름이라 설명할 의미나 방법이 없음"
    },
    "currentCMarkedSentence": "막대를 옆으로 눕혀 그린 막대그래프를 {가로 막대그래프}라 한다.",
    "currentCSlotAnswers": [
      {
        "expected": "가로 막대그래프",
        "equivalents": [
          "가로막대그래프",
          "가로 그래프"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "가로 막대그래프라는 이름만 확인하는 B 제외를 유지한다.",
      "c": "가로 그래프는 막대라는 종류를 빠뜨린 막연한 이름이므로 가로 막대그래프의 동의어로 받지 않아야 한다."
    }
  },
  {
    "id": "e4-1-5-1-xc7",
    "sourceIndex": 1900,
    "grade": "e4",
    "source": {
      "sourceIndex": 1900,
      "sourceFingerprint": "d5261baea746f8d3d9c03ad3c8a1ff5be27e42284a0347ebf889e6587c9ac12f",
      "part": "e4plus",
      "id": "e4-1-5-1-xc7",
      "section": "초4::1-5 막대그래프::1-5-1 막대그래프 알아보기",
      "term": "표와 막대그래프",
      "kind": "성질",
      "level": "하",
      "definition": "표는 수량을 {정확한 수}로 보여 주고, 막대그래프는 크기를 한눈에 견주게 해 준다.",
      "studentC": "표는 수량을 □로 보여 주고, 막대그래프는 크기를 한눈에 견주게 해 준다.",
      "answers": [
        "정확한 수"
      ]
    },
    "currentProposal": {
      "id": "e4-1-5-1-xc7",
      "proposalFingerprint": "500917e4e013c52fc1eb63f8cc0f984a31ea389c45cf2f691d594d2a74df7b7f",
      "learningRole": "definition",
      "bDecision": "rewrite",
      "bPrompt": "표와 막대그래프는 수량을 나타낼 때 각각 어떤 좋은 점이 있는지 쓰라.",
      "bAnswer": "표는 수량을 정확한 수로 보여 주고, 막대그래프는 막대 길이로 크기를 한눈에 견주게 해 준다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "표는 정확한 수를 알 수 있다",
            "표에는 수량이 정확한 수로 적힌다"
          ]
        },
        {
          "anyOf": [
            "막대그래프는 크기(많고 적음)를 한눈에 견줄 수 있다",
            "막대그래프는 막대 길이로 쉽게 비교한다"
          ]
        }
      ],
      "bGoal": "표와 막대그래프의 쓰임 비교",
      "bReason": "두 표현 방법의 장점을 각각 말하게 함",
      "cDecision": "rewrite",
      "cReason": "'□로'만으론 답 범위가 넓어 '정확한 수'로 좁힘",
      "cSlotEquivalents": [
        [
          "숫자"
        ]
      ]
    },
    "currentCMarkedSentence": "표는 수량을 정확한 {수}로 보여 주고, 막대그래프는 크기를 한눈에 견주게 해 준다.",
    "currentCSlotAnswers": [
      {
        "expected": "수",
        "equivalents": [
          "숫자"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "표와 그래프의 좋은 점을 자유롭게 묻지 말고 정확한 값 읽기와 여러 항목의 많고 적음 비교처럼 응답 범위를 질문에 맞추어야 한다.",
      "c": "수라는 일반 낱말 하나를 채우는 약한 C는 실제 표와 그래프의 읽기 비교 예로 바꾸거나 제외를 제안한다."
    }
  },
  {
    "id": "e4-1-5-1-xc8",
    "sourceIndex": 1901,
    "grade": "e4",
    "source": {
      "sourceIndex": 1901,
      "sourceFingerprint": "e6cf82d02e33ef4f0f0069ae088170ee762b42bfd05cc140afd540d2d9f4b03f",
      "part": "e4plus",
      "id": "e4-1-5-1-xc8",
      "section": "초4::1-5 막대그래프::1-5-1 막대그래프 알아보기",
      "term": "항목",
      "kind": "정의",
      "level": "하",
      "definition": "막대그래프에서 조사한 내용을 나눈 갈래 하나하나를 {항목}이라 한다.",
      "studentC": "막대그래프에서 조사한 내용을 나눈 갈래 하나하나를 □이라 한다.",
      "answers": [
        "항목"
      ]
    },
    "currentProposal": {
      "id": "e4-1-5-1-xc8",
      "proposalFingerprint": "ee838811605f127a9a3a086b8dc1adeffd8441ac63156696fe5e5d7d84b6ac4f",
      "learningRole": "naming",
      "bDecision": "rewrite",
      "bPrompt": "'좋아하는 과일'을 조사해 막대그래프로 나타냈다. 사과, 배, 귤처럼 조사한 내용을 나눈 갈래 하나하나를 무엇이라 부르는가?",
      "bAnswer": "항목",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "항목"
          ]
        }
      ],
      "bGoal": "항목이라는 말의 뜻 알기",
      "bReason": "사과·배·귤 예로 갈래의 이름을 묻게 함",
      "cDecision": "keep",
      "cReason": "짧고 정의가 문장에 있어 학생이 항목을 쓸 수 있음",
      "cSlotEquivalents": [
        []
      ]
    },
    "currentCMarkedSentence": "막대그래프에서 조사한 내용을 나눈 갈래 하나하나를 {항목}이라 한다.",
    "currentCSlotAnswers": [
      {
        "expected": "항목",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "항목 이름 한 가지를 묻는 B는 뜻과 실제 예를 설명하는 질문으로 바꾸거나 이름형 B 제외를 제안한다.",
      "c": "조사한 내용을 나눈 갈래라는 기존 항목의 뜻을 확인한다."
    }
  },
  {
    "id": "e4-1-5-1-xc9",
    "sourceIndex": 1902,
    "grade": "e4",
    "source": {
      "sourceIndex": 1902,
      "sourceFingerprint": "cc3d52f2bd97d106b81812cc35655518b0befd041835c836a45c35902e490d62",
      "part": "e4plus",
      "id": "e4-1-5-1-xc9",
      "section": "초4::1-5 막대그래프::1-5-1 막대그래프 알아보기",
      "term": "눈금 한 칸의 크기 알아내기",
      "kind": "방법",
      "level": "중",
      "definition": "눈금 한 칸의 크기는 두 눈금에 적힌 {수의 차}를 그 사이의 {칸 수}로 나눈 값이다.",
      "example": {
        "prompt": "눈금 $5$칸이 $10$명일 때 한 칸이 $1$명이 아닌 까닭은?",
        "answer": "$10$명을 $5$칸이 나누어 가져서"
      },
      "studentC": "눈금 한 칸의 크기는 두 눈금에 적힌 □를 그 사이의 □로 나눈 값이다.",
      "answers": [
        "수의 차",
        "칸 수"
      ]
    },
    "currentProposal": {
      "id": "e4-1-5-1-xc9",
      "proposalFingerprint": "fed0a7fcb0af0ff2ff5526a70466854aad1be002d2ff489a0469579d209d5cc2",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "세로 눈금에서 $10$과 $20$ 사이가 $5$칸으로 나뉘어 있다. 눈금 한 칸의 크기를 어떻게 구하는지 설명하고 값을 쓰라.",
      "bAnswer": "두 눈금의 차 $20-10=10$을 칸 수 $5$로 나누어 $10\\div5=2$이다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "두 눈금의 차(큰 눈금에서 작은 눈금을 뺀 값)를 구한다",
            "$20-10=10$"
          ]
        },
        {
          "anyOf": [
            "그 차를 칸 수로 나눈다",
            "$10\\div5$"
          ]
        },
        {
          "anyOf": [
            "한 칸은 $2$"
          ]
        }
      ],
      "bGoal": "눈금 한 칸 크기 구하는 방법",
      "bReason": "눈금 두 곳과 칸 수를 주어 방법과 값을 묻게 함",
      "cDecision": "rewrite",
      "cReason": "'수의 차·칸 수' 두 긴 낱말 대신 선명한 계산으로 바꿈",
      "cSlotEquivalents": []
    },
    "currentCMarkedSentence": "눈금 $10$과 $20$ 사이가 $5$칸이면, 한 칸의 크기는 $20-10=${$10$}을 $5$로 나눈 {$2$}이다.",
    "currentCSlotAnswers": [
      {
        "expected": "$10$",
        "equivalents": []
      },
      {
        "expected": "$2$",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "눈금 10과 20 사이의 다섯 칸이 같은 크기라는 조건을 B에도 명시해야 한다.",
      "c": "C도 같은 크기의 다섯 칸이라는 조건으로 한 칸의 크기가 정해져야 한다."
    }
  },
  {
    "id": "e4-1-5-1-xc11",
    "sourceIndex": 1904,
    "grade": "e4",
    "source": {
      "sourceIndex": 1904,
      "sourceFingerprint": "db722b407d790b9b66943adbedf8e2db16eac8be7194ccc7e9b1a5a8f77e7459",
      "part": "e4plus",
      "id": "e4-1-5-1-xc11",
      "section": "초4::1-5 막대그래프::1-5-1 막대그래프 알아보기",
      "term": "막대의 수량을 모두 더하면",
      "kind": "성질",
      "level": "중",
      "definition": "모든 막대가 나타내는 수량을 더하면 조사한 {합계}가 된다.",
      "studentC": "모든 막대가 나타내는 수량을 더하면 조사한 □가 된다.",
      "answers": [
        "합계"
      ]
    },
    "currentProposal": {
      "id": "e4-1-5-1-xc11",
      "proposalFingerprint": "89ede11d3902f8b7554b7ff71e0e74f3ccade3fa878900392b780e8ccf98d910",
      "learningRole": "definition",
      "bDecision": "rewrite",
      "bPrompt": "한 반 친구들이 좋아하는 과일을 조사해 막대그래프로 나타냈다. 모든 막대가 나타내는 수량을 더하면 무엇을 알 수 있는지 쓰라.",
      "bAnswer": "조사한 전체 수(합계)를 알 수 있다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "조사한 전체 수",
            "합계",
            "모두 합한 수"
          ]
        }
      ],
      "bGoal": "막대 수량의 합의 뜻",
      "bReason": "막대를 모두 더한 값의 의미를 묻게 함",
      "cDecision": "rewrite",
      "cReason": "'합계' 낱말 맞히기 대신 친숙한 '전체'로 바꿈",
      "cSlotEquivalents": [
        [
          "합계"
        ]
      ]
    },
    "currentCMarkedSentence": "모든 막대가 나타내는 수량을 더하면 조사한 {전체} 수가 된다.",
    "currentCSlotAnswers": [
      {
        "expected": "전체",
        "equivalents": [
          "합계"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "학생들이 하나씩만 고르고 빠짐없이 항목에 집계됐다는 조건을 넣어 합이 무엇의 전체인지 특정해야 한다.",
      "c": "아무 막대 합을 조사한 전체 학생 수로 읽지 않도록 조사 대상과 한 사람 한 항목 조건을 명시해야 한다."
    }
  },
  {
    "id": "e4-1-5-1-xc12",
    "sourceIndex": 1905,
    "grade": "e4",
    "source": {
      "sourceIndex": 1905,
      "sourceFingerprint": "9e47f1b54d6487dff26df6d8bd265f933a74432ab91b2408dfc2d176ebce598f",
      "part": "e4plus",
      "id": "e4-1-5-1-xc12",
      "section": "초4::1-5 막대그래프::1-5-1 막대그래프 알아보기",
      "term": "길이가 같은 두 막대",
      "kind": "성질",
      "level": "중",
      "definition": "같은 막대그래프에서 길이가 같은 두 막대는 나타내는 수량이 {같다}.",
      "studentC": "같은 막대그래프에서 길이가 같은 두 막대는 나타내는 수량이 □.",
      "answers": [
        "같다"
      ]
    },
    "currentProposal": {
      "id": "e4-1-5-1-xc12",
      "proposalFingerprint": "d1e66e9d258ed2d3ef1f66975591e0405c1558866a6a3ab3dd90fc4b0ca2f507",
      "learningRole": "definition",
      "bDecision": "exclude",
      "bPrompt": null,
      "bAnswer": null,
      "bRequiredIdeas": [],
      "bGoal": "",
      "bReason": "",
      "cDecision": "keep",
      "cReason": "같다/다르다 짧은 비교로 선명함",
      "cSlotEquivalents": [
        [
          "똑같다"
        ]
      ],
      "exclusionReason": "1-5-3 수량이 같은 항목과 같은 목표(길이 같으면 수량 같음)라 중복"
    },
    "currentCMarkedSentence": "같은 막대그래프에서 길이가 같은 두 막대는 나타내는 수량이 {같다}.",
    "currentCSlotAnswers": [
      {
        "expected": "같다",
        "equivalents": [
          "똑같다"
        ]
      }
    ],
    "directReaderNotes": {
      "b": "중복 제외의 대응 문항을 1-5-3이라는 단원만 적지 말고 실제 ID로 확인해 기록해야 한다.",
      "c": "같은 그래프의 같은 길이와 같은 수량이라는 조건은 분명하다."
    }
  },
  {
    "id": "e4-1-5-1-xc14",
    "sourceIndex": 1907,
    "grade": "e4",
    "source": {
      "sourceIndex": 1907,
      "sourceFingerprint": "f4dfec1f97fa8d54ee2c45c41ae0bd1a0bf50efca408b5e7dfc59a7be2701d6d",
      "part": "e4plus",
      "id": "e4-1-5-1-xc14",
      "section": "초4::1-5 막대그래프::1-5-1 막대그래프 알아보기",
      "term": "가로 막대그래프 읽기",
      "kind": "방법",
      "level": "중",
      "definition": "가로 막대그래프에서는 가로에 표시된 {눈금}을 읽어 수량을 안다.",
      "studentC": "가로 막대그래프에서는 가로에 표시된 □을 읽어 수량을 안다.",
      "answers": [
        "눈금"
      ]
    },
    "currentProposal": {
      "id": "e4-1-5-1-xc14",
      "proposalFingerprint": "5c21e0cbe4dd6e47d6f390cbc781d7d8d678c806e9e7fc174f272789e041a109",
      "learningRole": "procedure",
      "bDecision": "rewrite",
      "bPrompt": "가로 막대그래프에서 막대가 나타내는 수량을 알려면 어느 쪽의 무엇을 읽어야 하는지 쓰라.",
      "bAnswer": "막대가 끝나는 곳에서 가로에 표시된 눈금을 읽는다.",
      "bRequiredIdeas": [
        {
          "anyOf": [
            "가로에 표시된 눈금을 읽는다",
            "가로 눈금을 읽는다"
          ]
        }
      ],
      "bGoal": "가로 막대그래프 읽는 방법",
      "bReason": "세로 그래프와 달리 가로 눈금을 읽는다는 점 확인",
      "cDecision": "keep",
      "cReason": "'가로에 표시된 □'의 빈칸이 친숙한 낱말 눈금임",
      "cSlotEquivalents": [
        []
      ]
    },
    "currentCMarkedSentence": "가로 막대그래프에서는 가로에 표시된 {눈금}을 읽어 수량을 안다.",
    "currentCSlotAnswers": [
      {
        "expected": "눈금",
        "equivalents": []
      }
    ],
    "directReaderNotes": {
      "b": "아무 가로 눈금이 아니라 막대 끝과 같은 위치의 가로 눈금이라는 방법을 기준에도 넣어야 한다.",
      "c": "가로에 표시된 눈금으로 수량을 읽는 방향은 분명하다."
    }
  }
]
