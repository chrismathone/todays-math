초등 수학 C형 공유 definition의 현재 최종 원고를 독립 검토하라. 모든 ID를 읽고 JSON {cases:[{id,verdict:"pass"|"revise",reason,proposal}]}만 반환하라. 학생에게는 학년·대단원·student만 보이고 용어 제목과 소단원은 보이지 않는다. originalDefinition·originalFinding은 과거 문장의 지적이며 current afterRawDefinition을 판정해야 한다. 기대 답은 expected이다. 첫 가림 답과 비교하되 맞춤법·기호·같은 뜻의 동의 표현·동치 수식·같은 답들의 순서 교환은 의미상 일치로 인정한다. 다른 속성·조건·연산·서로 다른 도형 이름을 요구하는 참 완성은 허용하지 않는다. 단순히 특정 특수조건을 새로 가정해야만 참인 답은 일반 명제의 반례가 아니다. 하나의 선분을 다각형의 변이라고 부르는 같은 지시 대상 같은 뜻의 표현과, 분모/분수의 크기처럼 다른 속성을 구별하라. 수학적으로 참인지 0·1·부호·나머지·정의역·도형 포함 관계·표기·응답 범위·빈칸의 짧은 핵심·학생 말을 확인하라. 한 문장에 용어·정답이 반복되는 단순 베끼기와, 구체적 수나 조건에서 값을 계산·동일성·분류를 추론하는 개념 문장을 구별하라. 완성 정의는 A/B/D형과 SRS에서도 설명으로 참이어야 하며 termForEditorialIdentityOnly는 기존 개념 보존 확인용이다. 새 학년 밖 용어 또는 개념 변경을 제안하지 말라. 유효한 반례나 학생이 무엇을 답할지 모르는 문제가 있으면 revise와 구체적 짧은 완성 정의 proposal을 적고, 문제가 해소되었으면 pass와 이유를 적어라. 원 지적이 not_issue였어도 실제 문제가 남으면 revise이다. 모든 기대 답을 보인 상태에서 동의만 하지 말고 독립 판단하라.

{
  "cases": [
    {
      "id": "e3-2-4-2-xc26",
      "grade": "초3",
      "chapter": "분수",
      "termForEditorialIdentityOnly": "단위분수만큼을 곱셈으로 구하는 잘못",
      "originalDefinition": "$0$보다 큰 전체의 단위분수만큼은 전체보다 {작으므로} 분모를 곱하지 않고 분모로 나누어 구한다.",
      "originalFinding": {
        "status": "not_issue",
        "student": "$0$보다 큰 전체의 단위분수만큼은 전체보다 □ 분모를 곱하지 않고 분모로 나누어 구한다.",
        "expected": [
          "작으므로"
        ],
        "reason": "'작으므로'가 자연스러운 단일 답이다. 1/1 반례는 초3 단위분수 학습 범위에서 형식 논리에 불과하다.",
        "proposal": "유지."
      },
      "afterRawDefinition": "전체가 $0$보다 클 때, 분모가 $1$보다 큰 단위분수로 나타낸 양은 전체보다 {작으므로} 분모를 곱하지 않고 분모로 나누어 구한다.",
      "completedDefinition": "전체가 $0$보다 클 때, 분모가 $1$보다 큰 단위분수로 나타낸 양은 전체보다 작으므로 분모를 곱하지 않고 분모로 나누어 구한다.",
      "student": "전체가 $0$보다 클 때, 분모가 $1$보다 큰 단위분수로 나타낸 양은 전체보다 □ 분모를 곱하지 않고 분모로 나누어 구한다.",
      "expected": [
        "작으므로"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e3-2-4-2-xc26",
          "answers": [
            "작고"
          ],
          "alternativeAnswers": [],
          "reason": "'작으므로'는 같은 뜻이다. 수학적으로 참이나 '단위분수만큼은', '0보다 큰 전체'는 초3이 읽기에 딱딱하고 어색하다."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e3-2-4-2-xc26",
          "answers": [
            "작으므로"
          ],
          "alternativeAnswers": [],
          "reason": "전체가 0보다 크고 분모가 1보다 크면 단위분수만큼은 전체보다 작다. '작아서'는 같은 뜻이다."
        }
      ],
      "authorReason": "분모 1의 단위분수 정의 차이에도 참이도록 분모가 1보다 크다는 조건을 보인다. 가림 검토 반영: 단위분수만큼은이라는 딱딱한 연결을 풀고 전체의 부분인 양을 명시한다."
    },
    {
      "id": "e3-2-4-5-xc15",
      "grade": "초3",
      "chapter": "분수",
      "termForEditorialIdentityOnly": "바뀌지 않는 분모",
      "originalDefinition": "{대분수를 가분수로 고쳐 써도} 분모는 그대로이다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "□ 분모는 그대로이다.",
        "expected": [
          "대분수를 가분수로 고쳐 써도"
        ],
        "reason": "'분모는 그대로이다'만 남아 가분수→대분수 변환, 분모가 같은 분수의 비교 등 여러 상황이 모두 맞는다. 어떤 조작을 써야 할지 알 수 없다.",
        "proposal": "'대분수를 가분수로 고쳐 써도 □는 그대로이다'로 빈칸을 옮긴다."
      },
      "afterRawDefinition": "대분수를 가분수로 고쳐 쓸 때 분자는 달라지지만, 분수에서 아래에 쓰는 수인 {분모}는 그대로이다.",
      "completedDefinition": "대분수를 가분수로 고쳐 쓸 때 분자는 달라지지만, 분수에서 아래에 쓰는 수인 분모는 그대로이다.",
      "student": "대분수를 가분수로 고쳐 쓸 때 분자는 달라지지만, 분수에서 아래에 쓰는 수인 □는 그대로이다.",
      "expected": [
        "분모"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e3-2-4-5-xc15",
          "answers": [
            "분모"
          ],
          "alternativeAnswers": [
            "크기"
          ],
          "reason": "'(분수의) 크기는 그대로이다'도 참이고 조사 '는'에 맞아 분모와 다른 참 완성이 된다. '분모'로 한정하려면 '분자는 달라지지만 아래에 쓰는 수인 □는'처럼 단서가 필요하다."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e3-2-4-5-xc15",
          "answers": [
            "분모"
          ],
          "alternativeAnswers": [],
          "reason": "'아래에 쓰는 수'는 분모이고, 대분수를 가분수로 고쳐도 분모는 그대로이다."
        }
      ],
      "authorReason": "변환 방향과 분자의 변화를 보이고 바뀌지 않는 분수 요소를 묻는다. 가림 검토 반영: 크기도 그대로라는 다른 참인 답을 아래에 쓰는 수라는 위치 설명으로 배제한다."
    },
    {
      "id": "e3-2-4-5-xc20",
      "grade": "초3",
      "chapter": "분수",
      "termForEditorialIdentityOnly": "숫자를 붙여 쓰는 잘못",
      "originalDefinition": "대분수를 가분수로 바꿀 때 자연수와 분자를 {나란히 붙여 쓰는 것}은 바르게 바꾸는 방법이 아니다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "대분수를 가분수로 바꿀 때 자연수와 분자를 □은 바르게 바꾸는 방법이 아니다.",
        "expected": [
          "나란히 붙여 쓰는 것"
        ],
        "reason": "잘못된 방법은 '그냥 더하는 것', '곱하는 것', '붙여 쓰는 것' 등 여럿이 모두 참이다. 특정 오류 하나를 고를 근거가 없다.",
        "proposal": "잘못 쓴 예(2와 3/4 → 23/4)를 제시하고 오류를 설명하게 하거나 올바른 방법을 묻는다."
      },
      "afterRawDefinition": "대분수를 가분수로 바꿀 때 자연수와 분자를 나란히 붙여 쓰면 안 된다. 자연수에 {분모}를 곱하고 분자를 더해 새 분자를 구한다.",
      "completedDefinition": "대분수를 가분수로 바꿀 때 자연수와 분자를 나란히 붙여 쓰면 안 된다. 자연수에 분모를 곱하고 분자를 더해 새 분자를 구한다.",
      "student": "대분수를 가분수로 바꿀 때 자연수와 분자를 나란히 붙여 쓰면 안 된다. 자연수에 □를 곱하고 분자를 더해 새 분자를 구한다.",
      "expected": [
        "분모"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e3-2-4-5-xc20",
          "answers": [
            "분모"
          ],
          "alternativeAnswers": [],
          "reason": "유일하게 복원되며 수학적으로 정확하다."
        }
      ],
      "authorReason": "구체적 잘못을 보이고 바른 변환의 곱하는 대상을 묻는다. 단순 덧셈 등 다른 오류를 쓰는 답이 들어갈 수 없다."
    },
    {
      "id": "e3-2-5-2-xc14",
      "grade": "초3",
      "chapter": "들이와 무게",
      "termForEditorialIdentityOnly": "어림한 들이 쓰기",
      "originalDefinition": "어림한 들이는 약 $500\\,\\mathrm{mL}$처럼 수 앞에 {약}을 붙여 쓴다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "어림한 들이는 약 $500\\,\\mathrm{mL}$처럼 수 앞에 □을 붙여 쓴다.",
        "expected": [
          "약"
        ],
        "reason": "답 '약'이 같은 문장의 예시에 그대로 나와 있다. 무엇을 쓸지는 명확하므로 명료성 결함은 아니지만 회상을 측정하지 못한다.",
        "proposal": "예시를 '500 mL쯤이면'처럼 바꾸거나 예시의 '약'을 뺀다."
      },
      "afterRawDefinition": "들이를 어림한 값임을 나타내려면 수 앞에 {약}을 붙여 쓴다.",
      "completedDefinition": "들이를 어림한 값임을 나타내려면 수 앞에 약을 붙여 쓴다.",
      "student": "들이를 어림한 값임을 나타내려면 수 앞에 □을 붙여 쓴다.",
      "expected": [
        "약"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e3-2-5-2-xc14",
          "answers": [
            "약"
          ],
          "alternativeAnswers": [],
          "reason": "유일하게 복원되며 초3 용어에 맞다."
        }
      ],
      "authorReason": "예시의 약이라는 답 노출을 없애고 어림값 표기라는 기능을 남긴다."
    },
    {
      "id": "e3-2-5-3-xc7",
      "grade": "초3",
      "chapter": "들이와 무게",
      "termForEditorialIdentityOnly": "모두 부은 양 구하기",
      "originalDefinition": "두 그릇의 물을 한 그릇에 모두 부은 양은 두 들이를 {더해} 구한다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "두 그릇의 물을 한 그릇에 모두 부은 양은 두 들이를 □ 구한다.",
        "expected": [
          "더해"
        ],
        "reason": "답 '더해'는 명확해 prior의 확정 판단에는 동의하지 않는다. 다만 담긴 물의 양을 '두 들이'로 부르는 용어가 부정확해 경계 사례로 둔다.",
        "proposal": "'두 물의 양을 □ 구한다'로 바꾸거나 '가득 담긴 두 그릇'을 명시한다."
      },
      "afterRawDefinition": "두 그릇에 담긴 물을 넘치거나 흘리지 않고 한 그릇에 모두 부은 양은, 처음 담긴 두 물의 양을 {더해} 구한다.",
      "completedDefinition": "두 그릇에 담긴 물을 넘치거나 흘리지 않고 한 그릇에 모두 부은 양은, 처음 담긴 두 물의 양을 더해 구한다.",
      "student": "두 그릇에 담긴 물을 넘치거나 흘리지 않고 한 그릇에 모두 부은 양은, 처음 담긴 두 물의 양을 □ 구한다.",
      "expected": [
        "더해"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e3-2-5-3-xc7",
          "answers": [
            "더해"
          ],
          "alternativeAnswers": [],
          "reason": "'더하여', '합하여'는 같은 뜻이다. 넘치거나 흘리지 않는다는 조건이 있어 참이다."
        }
      ],
      "authorReason": "그릇의 들이와 담긴 물의 양을 구별하고 손실 없다는 조건을 보인다."
    },
    {
      "id": "e3-2-5-3-xc8",
      "grade": "초3",
      "chapter": "들이와 무게",
      "termForEditorialIdentityOnly": "답에 단위 붙이기",
      "originalDefinition": "답에 단위를 붙이지 않으면 그 수가 {$\\mathrm{L}$인지 $\\mathrm{mL}$인지} 알 수 없으므로 단위를 꼭 붙여 쓴다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "답에 단위를 붙이지 않으면 그 수가 □ 알 수 없으므로 단위를 꼭 붙여 쓴다.",
        "expected": [
          "$\\mathrm{L}$인지 $\\mathrm{mL}$인지"
        ],
        "reason": "'어떤 단위인지', '무엇을 나타내는지'가 같은 뜻의 자연스러운 답이다. 대단원이 들이와 무게라 'kg인지 g인지'도 가능해 기대 답의 구체 형태가 정해지지 않는다.",
        "proposal": "'들이를 구한 답에'를 넣고 동의 표현을 인정한다."
      },
      "afterRawDefinition": "물의 양을 적을 때 $\\mathrm{L}$와 $\\mathrm{mL}$ 중 무엇으로 잰 양인지 알 수 있도록, 답의 수 뒤에 {단위}를 꼭 붙인다.",
      "completedDefinition": "물의 양을 적을 때 $\\mathrm{L}$와 $\\mathrm{mL}$ 중 무엇으로 잰 양인지 알 수 있도록, 답의 수 뒤에 단위를 꼭 붙인다.",
      "student": "물의 양을 적을 때 $\\mathrm{L}$와 $\\mathrm{mL}$ 중 무엇으로 잰 양인지 알 수 있도록, 답의 수 뒤에 □를 꼭 붙인다.",
      "expected": [
        "단위"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e3-2-5-3-xc8",
          "answers": [
            "단위"
          ],
          "alternativeAnswers": [],
          "reason": "앞 절의 '어떤 단위인지'에 답 낱말이 그대로 나와 답이 노출된다."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e3-2-5-3-xc8",
          "answers": [
            "단위"
          ],
          "alternativeAnswers": [],
          "reason": "L와 mL는 들이의 단위이다. 답이 하나다."
        }
      ],
      "authorReason": "들이와 무게를 구별하는 두 단위를 보이고 단위 없는 수의 한계를 설명한다. 가림 검토 반영: 앞절의 단위라는 정답 낱말을 없애고 L·mL의 역할을 보인다."
    },
    {
      "id": "e3-2-5-3-xc25",
      "grade": "초3",
      "chapter": "들이와 무게",
      "termForEditorialIdentityOnly": "들이의 합 어림하기",
      "originalDefinition": "들이의 합을 {가까운 몇 $\\mathrm{L}$로} 어림하면 계산한 답이 맞는지 짐작할 수 있다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "들이의 합을 □ 어림하면 계산한 답이 맞는지 짐작할 수 있다.",
        "expected": [
          "가까운 몇 $\\mathrm{L}$로"
        ],
        "reason": "'□ 어림하면'에는 '미리', '먼저', '대강'이 자연스럽게 들어간다. 어림 단위(가까운 몇 L)를 쓰라는 단서가 없어 답의 종류를 알 수 없다.",
        "proposal": "'가까운 몇 □로 어림하면'처럼 틀을 남긴다."
      },
      "afterRawDefinition": "들이의 합을 가까운 몇 리터로 어림할 때 $2\\,\\mathrm{L}\\;800\\,\\mathrm{mL}$는 약 {$3\\,\\mathrm{L}$}, $1\\,\\mathrm{L}\\;300\\,\\mathrm{mL}$는 약 {$1\\,\\mathrm{L}$}로 바꾸어 더한다. 이 값으로 계산한 답이 맞는지 짐작한다.",
      "completedDefinition": "들이의 합을 가까운 몇 리터로 어림할 때 $2\\,\\mathrm{L}\\;800\\,\\mathrm{mL}$는 약 $3\\,\\mathrm{L}$, $1\\,\\mathrm{L}\\;300\\,\\mathrm{mL}$는 약 $1\\,\\mathrm{L}$로 바꾸어 더한다. 이 값으로 계산한 답이 맞는지 짐작한다.",
      "student": "들이의 합을 가까운 몇 리터로 어림할 때 $2\\,\\mathrm{L}\\;800\\,\\mathrm{mL}$는 약 □, $1\\,\\mathrm{L}\\;300\\,\\mathrm{mL}$는 약 □로 바꾸어 더한다. 이 값으로 계산한 답이 맞는지 짐작한다.",
      "expected": [
        "$3\\,\\mathrm{L}$",
        "$1\\,\\mathrm{L}$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e3-2-5-3-xc25",
          "answers": [
            "L"
          ],
          "alternativeAnswers": [],
          "reason": "'리터'는 같은 표기이다. 앞의 'L 단위로'가 답을 사실상 알려 주어 난도가 낮지만 오류는 아니다."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e3-2-5-3-xc25",
          "answers": [
            "3 L",
            "1 L"
          ],
          "alternativeAnswers": [],
          "reason": "2 L 800 mL는 3 L에, 1 L 300 mL는 1 L에 가깝다. 단위를 함께 써야 하며 '3리터', '1리터'도 같은 답이다."
        }
      ],
      "authorReason": "어림 단위와 두 양을 더하는 방법을 보이고 단위 이름만 묻는다. mL 어림이나 부사 완성과 구별한다. 가림 검토 반영: L와 리터의 답 반복 대신 같은 어림 전략에서 실제 변환값을 묻는다."
    },
    {
      "id": "e3-2-5-5-xc14",
      "grade": "초3",
      "chapter": "들이와 무게",
      "termForEditorialIdentityOnly": "어림한 무게 쓰기",
      "originalDefinition": "어림한 무게는 약 $2\\,\\mathrm{kg}$처럼 수 앞에 {약}을 붙여 나타낸다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "어림한 무게는 약 $2\\,\\mathrm{kg}$처럼 수 앞에 □을 붙여 나타낸다.",
        "expected": [
          "약"
        ],
        "reason": "답 '약'이 예시에 그대로 나와 있다. 응답은 명확하지만 측정 타당도가 낮다.",
        "proposal": "예시에서 '약'을 빼거나 다른 표현으로 바꾼다."
      },
      "afterRawDefinition": "무게를 어림한 값임을 나타내려면 수 앞에 {약}을 붙여 쓴다.",
      "completedDefinition": "무게를 어림한 값임을 나타내려면 수 앞에 약을 붙여 쓴다.",
      "student": "무게를 어림한 값임을 나타내려면 수 앞에 □을 붙여 쓴다.",
      "expected": [
        "약"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e3-2-5-5-xc14",
          "answers": [
            "약"
          ],
          "alternativeAnswers": [],
          "reason": "유일하게 복원된다. e3-2-5-2-xc14와 낱말 하나만 다른 같은 문장이다."
        }
      ],
      "authorReason": "약 2kg이라는 완성 예시를 없애고 어림값 표기의 의미를 남긴다."
    },
    {
      "id": "e4-1-2-1-xc12",
      "grade": "초4",
      "chapter": "각도",
      "termForEditorialIdentityOnly": "그림의 크기에 속지 않기",
      "originalDefinition": "그림에서 변이 짧게 그려진 각이 변이 긴 각보다 {더 클 수도} 있다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "그림에서 변이 짧게 그려진 각이 변이 긴 각보다 □ 있다.",
        "expected": [
          "더 클 수도"
        ],
        "reason": "오개념 교정 취지로 보면 '더 클 수도'가 자연스럽지만 '더 작을 수도'도 참이다. '□ 있다' 꼴이라 써야 할 형태도 어색하다.",
        "proposal": "'변의 길이와 각의 크기는 □'(관계없다)로 묻거나 '더 □ 수도 있다'로 틀을 좁힌다."
      },
      "afterRawDefinition": "그림에서 각의 변이 짧게 그려졌다고 각의 크기도 작다고 판단할 수는 없다. 각의 크기는 변의 길이가 아니라 두 변이 {벌어진 정도}로 정한다.",
      "completedDefinition": "그림에서 각의 변이 짧게 그려졌다고 각의 크기도 작다고 판단할 수는 없다. 각의 크기는 변의 길이가 아니라 두 변이 벌어진 정도로 정한다.",
      "student": "그림에서 각의 변이 짧게 그려졌다고 각의 크기도 작다고 판단할 수는 없다. 각의 크기는 변의 길이가 아니라 두 변이 □로 정한다.",
      "expected": [
        "벌어진 정도"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-2-1-xc12",
          "answers": [
            "벌어진 정도"
          ],
          "alternativeAnswers": [],
          "reason": "복원은 가능하고 내용도 정확하다. 다만 '각도 작다고'가 '각+도'인지 '각도(가)'인지 헷갈려 어색하므로 '각의 크기도 작다고'가 낫다."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e4-1-2-1-xc12",
          "answers": [
            "벌어진 정도"
          ],
          "alternativeAnswers": [],
          "reason": "각의 크기는 변의 길이와 관계없이 두 변이 벌어진 정도이다. 서술형 구라서 '벌어진 크기' 같은 표현 차이는 허용해야 한다."
        }
      ],
      "authorReason": "크거나 작을 수 있다는 열린 비교 대신 각 크기를 정하는 성질을 명시한다. 가림 검토 반영: 각도 작다고의 중의성을 각의 크기도로 풀어 쓴다."
    },
    {
      "id": "e4-1-2-2-xc27",
      "grade": "초4",
      "chapter": "각도",
      "termForEditorialIdentityOnly": "시곗바늘이 이루는 각도",
      "originalDefinition": "시계의 숫자 한 칸은 {$30^\\circ$}이므로 $1$시에 두 바늘이 이루는 작은 쪽 각은 $30^\\circ$이다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "시계의 숫자 한 칸은 □이므로 $1$시에 두 바늘이 이루는 작은 쪽 각은 $30^\\circ$이다.",
        "expected": [
          "$30^\\circ$"
        ],
        "reason": "답 30°가 뒷절에 그대로 제시되어 있다. 응답은 명확하지만 원리(360°÷12) 회상을 확인하지 못한다.",
        "proposal": "뒷절을 '2시에는 60°이다'처럼 다른 값으로 바꾼다."
      },
      "afterRawDefinition": "시계의 이웃한 숫자 사이 각의 크기는 $360^\\circ\\div12=$ {$30$}도이다. $1$시에 두 바늘이 이루는 작은 쪽 각의 크기도 이와 같다.",
      "completedDefinition": "시계의 이웃한 숫자 사이 각의 크기는 $360^\\circ\\div12=$ $30$도이다. $1$시에 두 바늘이 이루는 작은 쪽 각의 크기도 이와 같다.",
      "student": "시계의 이웃한 숫자 사이 각의 크기는 $360^\\circ\\div12=$ □도이다. $1$시에 두 바늘이 이루는 작은 쪽 각의 크기도 이와 같다.",
      "expected": [
        "$30$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-2-2-xc27",
          "answers": [
            "30°"
          ],
          "alternativeAnswers": [
            "몫",
            "값"
          ],
          "reason": "기대 답은 30°로 보이나 '나눈 몫이다', '나눈 값이다'도 문법과 내용이 맞아 수량 대신 낱말로 답할 수 있다. '$360^\\circ\\div12=$ □'처럼 수량 응답임을 드러내야 한다. '작은 쪽 각도 이 크기이다'도 '각+도'로 읽기 어렵다."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e4-1-2-2-xc27",
          "answers": [
            "30"
          ],
          "alternativeAnswers": [],
          "reason": "360÷12=30이고, 1시의 작은 쪽 각도 30도이다."
        }
      ],
      "authorReason": "뒤 절의 30도 반복을 없애고 한 바퀴를 12로 나누는 근거를 보인다. 가림 검토 반영: 등식과 도 단위를 남겨 몫·값 같은 일반 명사가 답이 되지 않게 한다."
    },
    {
      "id": "e4-1-2-3-xc25",
      "grade": "초4",
      "chapter": "각도",
      "termForEditorialIdentityOnly": "직각에 아주 가까운 각",
      "originalDefinition": "직각과 거의 같아 보여도 $90^\\circ$보다 {조금이라도} 크면 둔각이고, 조금이라도 작으면 예각이다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "직각과 거의 같아 보여도 $90^\\circ$보다 □ 크면 둔각이고, 조금이라도 작으면 예각이다.",
        "expected": [
          "조금이라도"
        ],
        "reason": "'조금이라도'가 뒤 절에 그대로 반복되어 베껴 쓰게 되고, 빈칸이 수학 개념이 아닌 수식어다. 답을 정하지 못하는 것은 아니다.",
        "proposal": "'둔각'이나 '예각'을 빈칸으로 바꾼다."
      },
      "afterRawDefinition": "$0^\\circ$보다 크고 $180^\\circ$보다 작은 각이 직각과 거의 같아 보여도 $90^\\circ$보다 크면 {둔각}, 작으면 예각이다.",
      "completedDefinition": "$0^\\circ$보다 크고 $180^\\circ$보다 작은 각이 직각과 거의 같아 보여도 $90^\\circ$보다 크면 둔각, 작으면 예각이다.",
      "student": "$0^\\circ$보다 크고 $180^\\circ$보다 작은 각이 직각과 거의 같아 보여도 $90^\\circ$보다 크면 □, 작으면 예각이다.",
      "expected": [
        "둔각"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-2-3-xc25",
          "answers": [
            "둔각"
          ],
          "alternativeAnswers": [],
          "reason": "0°보다 크고 180°보다 작다는 범위가 주어져 유일하고 정확하다."
        }
      ],
      "authorReason": "수학 개념 아닌 수식어를 각 이름으로 옮기고 0·180도 경계를 명시한다."
    },
    {
      "id": "e4-1-2-4-xc5",
      "grade": "초4",
      "chapter": "각도",
      "termForEditorialIdentityOnly": "삼각자의 각으로 어림하기",
      "originalDefinition": "삼각자의 {$30^\\circ$}, $45^\\circ$, $60^\\circ$ 각을 떠올리면 각도를 어림하기 쉽다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "삼각자의 □, $45^\\circ$, $60^\\circ$ 각을 떠올리면 각도를 어림하기 쉽다.",
        "expected": [
          "$30^\\circ$"
        ],
        "reason": "Claude는 45°,60° 앞의 빈칸을 오름차순으로 읽어 30°를 자연스러운 답으로 보았다. 문장에 오름차순 지시가 없고 삼각자의 90°도 실제 각이므로 정상 단일 답으로 확정하지 않고 편집 후보에 남긴다.",
        "proposal": "유지."
      },
      "afterRawDefinition": "두 종류의 삼각자에서 직각을 뺀 서로 다른 각은 작은 것부터 {$30^\\circ$}, $45^\\circ$, $60^\\circ$이다. 이 각들을 떠올려 각도를 어림할 수 있다.",
      "completedDefinition": "두 종류의 삼각자에서 직각을 뺀 서로 다른 각은 작은 것부터 $30^\\circ$, $45^\\circ$, $60^\\circ$이다. 이 각들을 떠올려 각도를 어림할 수 있다.",
      "student": "두 종류의 삼각자에서 직각을 뺀 서로 다른 각은 작은 것부터 □, $45^\\circ$, $60^\\circ$이다. 이 각들을 떠올려 각도를 어림할 수 있다.",
      "expected": [
        "$30^\\circ$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-2-4-xc5",
          "answers": [
            "30°"
          ],
          "alternativeAnswers": [],
          "reason": "두 삼각자의 각은 45°, 45°, 90°와 30°, 60°, 90°이므로 유일하다."
        }
      ],
      "authorReason": "직각을 제외하고 오름차순이라는 조건을 보여 90도 등 다른 삼각자 각과 구별한다."
    },
    {
      "id": "e4-1-2-4-xc28",
      "grade": "초4",
      "chapter": "각도",
      "termForEditorialIdentityOnly": "어림과 크게 다를 때",
      "originalDefinition": "잰 값이 어림한 값과 크게 다르면 {눈금을 잘못 읽었는지} 다시 살펴본다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "잰 값이 어림한 값과 크게 다르면 □ 다시 살펴본다.",
        "expected": [
          "눈금을 잘못 읽었는지"
        ],
        "reason": "'잘못 재었는지', '각도기를 바르게 맞췄는지' 등 점검 항목이 여럿이고 기대 답은 그중 하나다. 같은 취지의 답이라 채점 기준 조정으로 해결할 수 있는 경계 사례다.",
        "proposal": "측정 오류를 점검한다는 취지의 답을 폭넓게 인정하거나 '안쪽·바깥쪽 눈금' 상황을 제시한다."
      },
      "afterRawDefinition": "잰 각도가 어림한 값과 크게 다르면 각도기의 중심과 밑금을 바르게 맞췄는지, 두 줄의 {눈금} 중 맞는 것을 읽었는지 다시 살핀다.",
      "completedDefinition": "잰 각도가 어림한 값과 크게 다르면 각도기의 중심과 밑금을 바르게 맞췄는지, 두 줄의 눈금 중 맞는 것을 읽었는지 다시 살핀다.",
      "student": "잰 각도가 어림한 값과 크게 다르면 각도기의 중심과 밑금을 바르게 맞췄는지, 두 줄의 □ 중 맞는 것을 읽었는지 다시 살핀다.",
      "expected": [
        "눈금"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-2-4-xc28",
          "answers": [
            "눈금"
          ],
          "alternativeAnswers": [],
          "reason": "'숫자'도 같은 뜻으로 허용할 만하다. 수학적 문제는 없다."
        }
      ],
      "authorReason": "다른 타당한 점검 방법들을 보이고 두 줄이라는 단서로 읽을 대상을 고정한다."
    },
    {
      "id": "e4-1-2-6-xc26",
      "grade": "초4",
      "chapter": "각도",
      "termForEditorialIdentityOnly": "사각형의 나머지 각을 구할 때 흔한 잘못",
      "originalDefinition": "$360^\\circ$에서 세 각 가운데 {두 각만} 빼면 나머지 각이 틀리게 나온다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "$360^\\circ$에서 세 각 가운데 □ 빼면 나머지 각이 틀리게 나온다.",
        "expected": [
          "두 각만"
        ],
        "reason": "'한 각만', '일부만'도 참이라 표현이 하나로 정해지지 않는다. 핵심 이해(세 각을 모두 빼야 함)는 같아 경계 사례로 둔다.",
        "proposal": "'세 각을 □ 빼야 한다'(모두)로 긍정형으로 바꾸거나 대안 답을 인정한다."
      },
      "afterRawDefinition": "사각형의 나머지 한 각은 $360^\\circ$에서 알고 있는 세 각을 {모두} 빼야 한다. 일부만 빼면 바른 값을 구하지 못한다.",
      "completedDefinition": "사각형의 나머지 한 각은 $360^\\circ$에서 알고 있는 세 각을 모두 빼야 한다. 일부만 빼면 바른 값을 구하지 못한다.",
      "student": "사각형의 나머지 한 각은 $360^\\circ$에서 알고 있는 세 각을 □ 빼야 한다. 일부만 빼면 바른 값을 구하지 못한다.",
      "expected": [
        "모두"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-2-6-xc26",
          "answers": [
            "모두"
          ],
          "alternativeAnswers": [],
          "reason": "'전부', '다'는 같은 뜻이다. 뒤 문장 '일부만 빼면'이 답을 뒷받침한다."
        }
      ],
      "authorReason": "한 각만·두 각만 등 오류의 여러 답을 없애고 바른 방법의 포함 범위를 묻는다."
    },
    {
      "id": "e4-1-3-2-xc13",
      "grade": "초4",
      "chapter": "곱셈과 나눗셈",
      "termForEditorialIdentityOnly": "곱해지는 수에 $0$이 있을 때",
      "originalDefinition": "$305\\times12$처럼 곱해지는 수에 $0$이 있어도 {같은 방법}으로 부분 곱을 구한다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "$305\\times12$처럼 곱해지는 수에 $0$이 있어도 □으로 부분 곱을 구한다.",
        "expected": [
          "같은 방법"
        ],
        "reason": "'있어도 □으로'에서 '같은 방법'은 추론할 수 있지만 '세로셈' 등도 들어가고 비교 대상이 없다. 수학 내용이 약한 빈칸이다.",
        "proposal": "'0이 없을 때와 □ 방법으로'로 다듬거나 0이 있는 자리의 부분 곱을 직접 묻는다."
      },
      "afterRawDefinition": "$305\\times12$에서도 자리별 부분 곱을 구하므로, $305\\times2$와 $305\\times$ {$10$}을 더해 곱을 구한다.",
      "completedDefinition": "$305\\times12$에서도 자리별 부분 곱을 구하므로, $305\\times2$와 $305\\times$ $10$을 더해 곱을 구한다.",
      "student": "$305\\times12$에서도 자리별 부분 곱을 구하므로, $305\\times2$와 $305\\times$ □을 더해 곱을 구한다.",
      "expected": [
        "$10$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-3-2-xc13",
          "answers": [
            "10"
          ],
          "alternativeAnswers": [],
          "reason": "12=2+10이므로 유일하다. 1로 잘못 답하는 오개념을 겨냥한 문장으로 적절하다."
        }
      ],
      "authorReason": "같은 방법이라는 추상 답 대신 곱하는 수의 십의 자리 값과 부분 곱 관계를 묻는다."
    },
    {
      "id": "e4-1-3-3-xc5",
      "grade": "초4",
      "chapter": "곱셈과 나눗셈",
      "termForEditorialIdentityOnly": "약을 붙여 말하기",
      "originalDefinition": "어림한 결과는 약 $6000$처럼 앞에 {약}을 붙여 말한다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "어림한 결과는 약 $6000$처럼 앞에 □을 붙여 말한다.",
        "expected": [
          "약"
        ],
        "reason": "답 '약'이 같은 문장의 예시에 노출되어 있다. 명료성 문제는 아니고 측정 타당도 문제다.",
        "proposal": "예시의 '약'을 뺀다."
      },
      "afterRawDefinition": "곱을 어림한 값임을 나타내려면 수 앞에 {약}을 붙여 말한다.",
      "completedDefinition": "곱을 어림한 값임을 나타내려면 수 앞에 약을 붙여 말한다.",
      "student": "곱을 어림한 값임을 나타내려면 수 앞에 □을 붙여 말한다.",
      "expected": [
        "약"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-3-3-xc5",
          "answers": [
            "약"
          ],
          "alternativeAnswers": [],
          "reason": "유일하게 복원된다."
        }
      ],
      "authorReason": "약 6000이라는 완성 예시를 없애고 어림값 표기의 기능을 남긴다."
    },
    {
      "id": "e4-1-3-6-xc13",
      "grade": "초4",
      "chapter": "곱셈과 나눗셈",
      "termForEditorialIdentityOnly": "몫의 십의 자리 정하기",
      "originalDefinition": "몫의 십의 자리 숫자는 나누어지는 수의 {앞 두 자리 수}를 나누는 수로 나눈 몫이다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "몫의 십의 자리 숫자는 나누어지는 수의 □를 나누는 수로 나눈 몫이다.",
        "expected": [
          "앞 두 자리 수"
        ],
        "reason": "(세 자리 수)÷(몇십몇)이라는 범위가 문장에 없어 '앞 두 자리 수'의 근거가 단원 맥락에만 의존한다. 답 자체는 단원 안에서 추론할 수 있다.",
        "proposal": "'(세 자리 수)÷(몇십몇)에서'를 문장에 넣는다."
      },
      "afterRawDefinition": "세 자리 수를 두 자리 수로 나누어 몫이 두 자리 수일 때, 몫의 십의 자리 숫자는 나누어지는 수의 앞 {두} 자리로 만든 수를 나누는 수로 나눈 몫이다.",
      "completedDefinition": "세 자리 수를 두 자리 수로 나누어 몫이 두 자리 수일 때, 몫의 십의 자리 숫자는 나누어지는 수의 앞 두 자리로 만든 수를 나누는 수로 나눈 몫이다.",
      "student": "세 자리 수를 두 자리 수로 나누어 몫이 두 자리 수일 때, 몫의 십의 자리 숫자는 나누어지는 수의 앞 □ 자리로 만든 수를 나누는 수로 나눈 몫이다.",
      "expected": [
        "두"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-3-6-xc13",
          "answers": [
            "두"
          ],
          "alternativeAnswers": [],
          "reason": "복원은 유일하다. 다만 345÷67처럼 몫이 한 자리 수이면 '몫의 십의 자리 숫자'가 없어(0으로 보아야만 성립) 일반 명제로는 느슨하다. '몫이 두 자리 수일 때'라는 조건이 필요하다."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e4-1-3-6-xc13",
          "answers": [
            "두"
          ],
          "alternativeAnswers": [],
          "reason": "몫이 두 자리 수이면 앞 두 자리 수를 나누는 수로 나눈 몫이 십의 자리 숫자이다(예: 987÷12에서 98÷12의 몫 8). 항상 성립한다."
        }
      ],
      "authorReason": "세 자리÷두 자리의 범위를 보이고 앞 두 자리의 개수만 묻는다. 앞 두 자리보다 제수가 크면 십의 자리 숫자는 0이다. 가림 검토 반영: 몫이 한 자리 수이면 십의 자리 자체가 없다는 예외를 배제한다."
    },
    {
      "id": "e4-1-3-6-xc28",
      "grade": "초4",
      "chapter": "곱셈과 나눗셈",
      "termForEditorialIdentityOnly": "남는 것을 쓸 수 없을 때",
      "originalDefinition": "남는 돈이나 재료로 하나를 더 만들 수 없는 상황에서는 답이 {몫 그대로}이다.",
      "originalFinding": {
        "status": "not_issue",
        "student": "남는 돈이나 재료로 하나를 더 만들 수 없는 상황에서는 답이 □이다.",
        "expected": [
          "몫 그대로"
        ],
        "reason": "'하나를 더 만들 수 없는 상황'은 만들 수 있는 개수를 묻는 맥락이라 '몫'이 자연스러운 단일 답이다. '나머지'로 읽는 것은 부자연스럽다.",
        "proposal": "유지. '몫'만 써도 인정한다."
      },
      "afterRawDefinition": "남는 재료로 물건 하나를 더 만들 수 없을 때 만들 수 있는 물건의 개수는 나눗셈의 {몫} 그대로이다.",
      "completedDefinition": "남는 재료로 물건 하나를 더 만들 수 없을 때 만들 수 있는 물건의 개수는 나눗셈의 몫 그대로이다.",
      "student": "남는 재료로 물건 하나를 더 만들 수 없을 때 만들 수 있는 물건의 개수는 나눗셈의 □ 그대로이다.",
      "expected": [
        "몫"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-3-6-xc28",
          "answers": [
            "몫"
          ],
          "alternativeAnswers": [],
          "reason": "유일하고 정확하다. 올림이 필요한 상황과 구분하는 조건도 문장에 들어 있다."
        }
      ],
      "authorReason": "어떤 개수를 묻는지 명시해 남는 돈·나머지 값 등 다른 질문을 배제한다."
    },
    {
      "id": "e4-1-3-7-xc3",
      "grade": "초4",
      "chapter": "곱셈과 나눗셈",
      "termForEditorialIdentityOnly": "어림한 몫을 말하는 법",
      "originalDefinition": "어림한 몫은 약 $20$처럼 앞에 {약}을 붙여 말한다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "어림한 몫은 약 $20$처럼 앞에 □을 붙여 말한다.",
        "expected": [
          "약"
        ],
        "reason": "답 '약'이 예시에 그대로 나와 있다. 응답은 명확하지만 회상을 확인하지 못한다.",
        "proposal": "예시의 '약'을 뺀다."
      },
      "afterRawDefinition": "어림한 몫임을 나타내려면 수 앞에 {약}을 붙여 말한다.",
      "completedDefinition": "어림한 몫임을 나타내려면 수 앞에 약을 붙여 말한다.",
      "student": "어림한 몫임을 나타내려면 수 앞에 □을 붙여 말한다.",
      "expected": [
        "약"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-3-7-xc3",
          "answers": [
            "약"
          ],
          "alternativeAnswers": [],
          "reason": "유일하게 복원된다."
        }
      ],
      "authorReason": "약 20이라는 정답 노출을 없애고 어림값 표기의 목적을 남긴다."
    },
    {
      "id": "e4-1-4-3-xc4",
      "grade": "초4",
      "chapter": "평면도형의 이동",
      "termForEditorialIdentityOnly": "위쪽으로 뒤집을 때 그대로인 것",
      "originalDefinition": "도형을 위쪽으로 뒤집어도 도형의 {왼쪽과 오른쪽}은 바뀌지 않는다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "도형을 위쪽으로 뒤집어도 도형의 □은 바뀌지 않는다.",
        "expected": [
          "왼쪽과 오른쪽"
        ],
        "reason": "뒤집기 학습 맥락에서는 '왼쪽과 오른쪽'을 추론할 수 있다. 다만 '모양'도 조사에 맞게 들어가는 자연스러운 답이라 범위가 다소 넓다.",
        "proposal": "'위쪽과 아래쪽은 서로 바뀌지만 □은 바뀌지 않는다'로 대비를 넣는다."
      },
      "afterRawDefinition": "도형을 위쪽으로 뒤집으면 위아래 방향은 바뀌지만 가로 방향, 곧 {왼쪽}과 {오른쪽}은 바뀌지 않는다.",
      "completedDefinition": "도형을 위쪽으로 뒤집으면 위아래 방향은 바뀌지만 가로 방향, 곧 왼쪽과 오른쪽은 바뀌지 않는다.",
      "student": "도형을 위쪽으로 뒤집으면 위아래 방향은 바뀌지만 가로 방향, 곧 □과 □은 바뀌지 않는다.",
      "expected": [
        "왼쪽",
        "오른쪽"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-4-3-xc4",
          "answers": [
            "왼쪽",
            "오른쪽"
          ],
          "alternativeAnswers": [],
          "reason": "순서를 바꾼 '오른쪽, 왼쪽'도 조사에 맞고 같은 뜻이므로 순서 무관으로 채점해야 한다."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e4-1-4-3-xc4",
          "answers": [
            "왼쪽",
            "오른쪽"
          ],
          "alternativeAnswers": [],
          "reason": "위쪽으로 뒤집으면 위아래만 바뀐다. 두 칸의 순서를 바꾸어 써도 같은 답이다."
        }
      ],
      "authorReason": "방향이라는 응답 범위와 좌우를 보이고 두 이름을 각각 묻는다. 모양·크기와 구별된다. 가림 검토 반영: 좌우라는 한자어 대신 가로 방향으로 풀어 쓴다."
    },
    {
      "id": "e4-1-4-3-xc5",
      "grade": "초4",
      "chapter": "평면도형의 이동",
      "termForEditorialIdentityOnly": "오른쪽으로 뒤집을 때 그대로인 것",
      "originalDefinition": "도형을 오른쪽으로 뒤집어도 도형의 {위쪽과 아래쪽}은 바뀌지 않는다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "도형을 오른쪽으로 뒤집어도 도형의 □은 바뀌지 않는다.",
        "expected": [
          "위쪽과 아래쪽"
        ],
        "reason": "앞 문항과 같은 구조로 '모양'도 들어갈 수 있다. 단원 맥락상 의도는 추론할 수 있다.",
        "proposal": "'왼쪽과 오른쪽은 서로 바뀌지만 □은 바뀌지 않는다'로 대비를 넣는다."
      },
      "afterRawDefinition": "도형을 오른쪽으로 뒤집으면 왼쪽과 오른쪽은 바뀌지만 세로 방향, 곧 {위쪽}과 {아래쪽}은 바뀌지 않는다.",
      "completedDefinition": "도형을 오른쪽으로 뒤집으면 왼쪽과 오른쪽은 바뀌지만 세로 방향, 곧 위쪽과 아래쪽은 바뀌지 않는다.",
      "student": "도형을 오른쪽으로 뒤집으면 왼쪽과 오른쪽은 바뀌지만 세로 방향, 곧 □과 □은 바뀌지 않는다.",
      "expected": [
        "위쪽",
        "아래쪽"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-4-3-xc5",
          "answers": [
            "위쪽",
            "아래쪽"
          ],
          "alternativeAnswers": [],
          "reason": "순서를 바꾼 답도 같은 뜻이므로 순서 무관으로 채점해야 한다. 짝 문항 xc4는 '위아래'라 쓰고 여기서는 '상하'라 써 용어가 일관되지 않으며, 초4에게는 '위아래'가 낫다."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e4-1-4-3-xc5",
          "answers": [
            "위쪽",
            "아래쪽"
          ],
          "alternativeAnswers": [],
          "reason": "오른쪽으로 뒤집으면 좌우만 바뀐다. 조사 '과'와 '은' 때문에 '위', '아래'가 아니라 '위쪽', '아래쪽'이 맞고, 순서를 바꾸어도 같은 답이다."
        }
      ],
      "authorReason": "상하 방향이라는 범위를 명시하고 두 이름을 각각 묻는다. 가림 검토 반영: 상하라는 한자어 대신 세로 방향으로 풀어 쓴다."
    },
    {
      "id": "e4-1-5-1-xc22",
      "grade": "초4",
      "chapter": "막대그래프",
      "termForEditorialIdentityOnly": "막대그래프를 표로 옮기기",
      "originalDefinition": "막대그래프를 표로 나타내면 각 항목의 수량과 {합계}를 한 줄에 정리할 수 있다.",
      "originalFinding": {
        "status": "not_issue",
        "student": "막대그래프를 표로 나타내면 각 항목의 수량과 □를 한 줄에 정리할 수 있다.",
        "expected": [
          "합계"
        ],
        "reason": "표의 장점으로 배우는 '합계'가 자연스러운 답이다. 조사 '를' 때문에 '항목의 이름'은 들어가지 않는다.",
        "proposal": "유지. '전체 수' 등 동의 표현을 인정한다."
      },
      "afterRawDefinition": "막대그래프를 표로 옮기면 각 항목의 수량을 적고, 모든 수량을 더한 {합계}도 한 줄에 정리할 수 있다.",
      "completedDefinition": "막대그래프를 표로 옮기면 각 항목의 수량을 적고, 모든 수량을 더한 합계도 한 줄에 정리할 수 있다.",
      "student": "막대그래프를 표로 옮기면 각 항목의 수량을 적고, 모든 수량을 더한 □도 한 줄에 정리할 수 있다.",
      "expected": [
        "합계"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-5-1-xc22",
          "answers": [
            "합계"
          ],
          "alternativeAnswers": [],
          "reason": "'합'은 같은 뜻이다. 유일하고 정확하다."
        }
      ],
      "authorReason": "모든 수량을 더했다는 계산 의미를 남겨 항목 수나 이름과 구별한다."
    },
    {
      "id": "e4-1-5-1-xc25",
      "grade": "초4",
      "chapter": "막대그래프",
      "termForEditorialIdentityOnly": "세로 눈금이 나타낼 범위",
      "originalDefinition": "가장 큰 수량이 $23$명이면 세로 눈금은 적어도 {가장 큰 수량}인 $23$명까지 나타낼 수 있어야 한다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "가장 큰 수량이 $23$명이면 세로 눈금은 적어도 □인 $23$명까지 나타낼 수 있어야 한다.",
        "expected": [
          "가장 큰 수량"
        ],
        "reason": "'가장 큰 수량'이 문장 첫머리에 있고 값 23명도 반복되어 빈칸이 군더더기 수식어가 된다. 답은 정해지지만 묻는 것이 없다.",
        "proposal": "'세로 눈금은 적어도 □명까지'처럼 값을 묻거나 앞 절을 '수량이 12명, 23명, 9명이면'으로 바꾼다."
      },
      "afterRawDefinition": "막대그래프에서 가장 큰 수량이 $23$명이면 세로 눈금은 적어도 {$23$}명까지 나타낼 수 있어야 한다.",
      "completedDefinition": "막대그래프에서 가장 큰 수량이 $23$명이면 세로 눈금은 적어도 $23$명까지 나타낼 수 있어야 한다.",
      "student": "막대그래프에서 가장 큰 수량이 $23$명이면 세로 눈금은 적어도 □명까지 나타낼 수 있어야 한다.",
      "expected": [
        "$23$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-5-1-xc25",
          "answers": [
            "23"
          ],
          "alternativeAnswers": [],
          "reason": "'적어도'가 있어 23이 맞다. 눈금 간격을 떠올려 25로 답하는 학생이 있을 수 있으나 문장상 오답이다."
        }
      ],
      "authorReason": "임의 수식어를 없애고 적어도 표시할 수 있어야 하는 최솟값을 묻는다."
    },
    {
      "id": "e4-1-5-2-xc27",
      "grade": "초4",
      "chapter": "막대그래프",
      "termForEditorialIdentityOnly": "표로 먼저 정리하는 까닭",
      "originalDefinition": "조사한 것을 표로 먼저 정리하면 {합계}와 가장 큰 수량을 미리 알 수 있다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "조사한 것을 표로 먼저 정리하면 □와 가장 큰 수량을 미리 알 수 있다.",
        "expected": [
          "합계"
        ],
        "reason": "막대그래프를 그리기 전에 미리 알아야 할 것으로는 '항목의 수'가 '합계'만큼 자연스럽다. 조사 '와'에도 둘 다 맞는다.",
        "proposal": "'모든 수량을 더한 □'처럼 단서를 넣거나 두 답을 모두 인정한다."
      },
      "afterRawDefinition": "조사한 것을 표로 먼저 정리하면 모든 항목의 수량을 더한 {합계}와 가장 큰 수량을 미리 알 수 있다.",
      "completedDefinition": "조사한 것을 표로 먼저 정리하면 모든 항목의 수량을 더한 합계와 가장 큰 수량을 미리 알 수 있다.",
      "student": "조사한 것을 표로 먼저 정리하면 모든 항목의 수량을 더한 □와 가장 큰 수량을 미리 알 수 있다.",
      "expected": [
        "합계"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-5-2-xc27",
          "answers": [
            "합계"
          ],
          "alternativeAnswers": [],
          "reason": "조사 '와' 때문에 '합'은 맞지 않아 '합계'로 유일하다."
        }
      ],
      "authorReason": "모든 수량을 더한 값이라는 단서를 보이고 항목 수와 구별한다."
    },
    {
      "id": "e4-1-6-2-xc1",
      "grade": "초4",
      "chapter": "규칙 찾기",
      "termForEditorialIdentityOnly": "늘어나는 쪽 살피기",
      "originalDefinition": "도형 배열의 규칙은 몇 개씩 늘어나는지와 함께 {어느 쪽에 늘어나는지}도 살핀다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "도형 배열의 규칙은 몇 개씩 늘어나는지와 함께 □도 살핀다.",
        "expected": [
          "어느 쪽에 늘어나는지"
        ],
        "reason": "'어느 방향(쪽)으로 늘어나는지'는 추론할 수 있는 답이다. 다만 '모양이 어떻게 변하는지'도 타당해 범위가 다소 열려 있다.",
        "proposal": "'어느 □에 늘어나는지도 살핀다'로 틀을 남긴다."
      },
      "afterRawDefinition": "도형 배열의 규칙을 찾을 때는 몇 개씩 늘어나는지와 함께, 늘어나는 {방향}이 위쪽인지 아래쪽인지 옆쪽인지도 살핀다.",
      "completedDefinition": "도형 배열의 규칙을 찾을 때는 몇 개씩 늘어나는지와 함께, 늘어나는 방향이 위쪽인지 아래쪽인지 옆쪽인지도 살핀다.",
      "student": "도형 배열의 규칙을 찾을 때는 몇 개씩 늘어나는지와 함께, 늘어나는 □이 위쪽인지 아래쪽인지 옆쪽인지도 살핀다.",
      "expected": [
        "방향"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-6-2-xc1",
          "answers": [
            "방향"
          ],
          "alternativeAnswers": [],
          "reason": "'쪽', '곳'은 같은 뜻의 표현이다. 수학적 문제는 없다."
        }
      ],
      "authorReason": "구체적 방향 예를 보이고 모양 변화 등 다른 속성과 구별한다."
    },
    {
      "id": "e4-1-6-2-xc7",
      "grade": "초4",
      "chapter": "규칙 찾기",
      "termForEditorialIdentityOnly": "돌아가는 규칙",
      "originalDefinition": "도형이 단계마다 같은 방향으로 {같은 각도만큼 돌아가는} 것도 규칙이다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "도형이 단계마다 같은 방향으로 □ 것도 규칙이다.",
        "expected": [
          "같은 각도만큼 돌아가는"
        ],
        "reason": "'같은 방향으로 □ 것'에는 '늘어나는', '옮겨 가는', '돌아가는'이 모두 자연스럽다. 회전이라는 단서가 없고 기대 답은 '같은 각도만큼'이라는 추가 조건까지 요구한다.",
        "proposal": "'같은 방향으로 같은 □만큼 돌아가는 것도 규칙이다'로 바꾼다."
      },
      "afterRawDefinition": "도형이 단계마다 같은 방향으로 돌아가는 배열에서는 돌아가는 {각도}도 일정하면 규칙이 된다.",
      "completedDefinition": "도형이 단계마다 같은 방향으로 돌아가는 배열에서는 돌아가는 각도도 일정하면 규칙이 된다.",
      "student": "도형이 단계마다 같은 방향으로 돌아가는 배열에서는 돌아가는 □도 일정하면 규칙이 된다.",
      "expected": [
        "각도"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-6-2-xc7",
          "answers": [
            "각도"
          ],
          "alternativeAnswers": [],
          "reason": "'크기', '정도'는 같은 뜻으로 볼 수 있다. 다만 '방향'을 다시 쓰는 오답이 나올 수 있어 '돌아가는 □(몇 도인지)'처럼 단서를 주면 좋다."
        }
      ],
      "authorReason": "회전이라는 움직임을 보이고 일정한 회전량을 묻는다."
    },
    {
      "id": "e4-1-6-4-xc10",
      "grade": "초4",
      "chapter": "규칙 찾기",
      "termForEditorialIdentityOnly": "수 배열에서 계산식 찾기",
      "originalDefinition": "수 배열표에서 이웃한 두 수의 차가 일정하면 {뺄셈식}으로 그 규칙을 나타낼 수 있다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "수 배열표에서 이웃한 두 수의 차가 일정하면 □으로 그 규칙을 나타낼 수 있다.",
        "expected": [
          "뺄셈식"
        ],
        "reason": "'차가 일정'이 뺄셈식을 암시하지만 같은 규칙을 덧셈식으로도 나타낼 수 있다. 조사에도 둘 다 맞는다.",
        "proposal": "'두 수의 차를 구하는 □으로'로 다듬거나 덧셈식도 인정한다."
      },
      "afterRawDefinition": "수 배열표에서 이웃한 두 수를 큰 수에서 작은 수를 빼는 {뺄셈식}으로 나타내면 차가 일정한 규칙을 찾을 수 있다.",
      "completedDefinition": "수 배열표에서 이웃한 두 수를 큰 수에서 작은 수를 빼는 뺄셈식으로 나타내면 차가 일정한 규칙을 찾을 수 있다.",
      "student": "수 배열표에서 이웃한 두 수를 큰 수에서 작은 수를 빼는 □으로 나타내면 차가 일정한 규칙을 찾을 수 있다.",
      "expected": [
        "뺄셈식"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-1-6-4-xc10",
          "answers": [
            "뺄셈식"
          ],
          "alternativeAnswers": [],
          "reason": "'뺄셈', '식'도 조사 '으로'에 맞고 뜻이 같아 모두 허용해야 한다."
        }
      ],
      "authorReason": "빼는 연산을 보이고 같은 수열을 나타내는 덧셈식과 구별한다."
    },
    {
      "id": "e4-2-1-3-xc17",
      "grade": "초4",
      "chapter": "분수의 덧셈과 뺄셈",
      "termForEditorialIdentityOnly": "빈칸이 있는 대분수 덧셈식",
      "originalDefinition": "받아올림이 없는 대분수 덧셈식의 빈칸은 자연수 부분과 분수 부분이 {각각 얼마나 더 있어야 하는지}로 구한다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "받아올림이 없는 대분수 덧셈식의 빈칸은 자연수 부분과 분수 부분이 □로 구한다.",
        "expected": [
          "각각 얼마나 더 있어야 하는지"
        ],
        "reason": "문장 속 '빈칸'이 식의 어느 자리인지 주어지지 않았고, 기대 답은 긴 서술 구라서 무엇을 쓸지 정할 수 없다. 문항의 □와 문장 속 '빈칸'이라는 말도 서로 헷갈린다.",
        "proposal": "실제 식(예: 2와 1/5 + □ = 5와 4/5)을 제시하고 구하는 방법이나 값을 묻는다."
      },
      "afterRawDefinition": "분수 부분의 합이 $1$보다 작은 $1\\frac{2}{7}+\\triangle=3\\frac{6}{7}$에서는 자연수 부분의 차 $3-1$과 분수 부분의 차 $\\frac{6}{7}-\\frac{2}{7}$의 합을 구한다. 따라서 $\\triangle=$ {$2\\frac{4}{7}$}이다.",
      "completedDefinition": "분수 부분의 합이 $1$보다 작은 $1\\frac{2}{7}+\\triangle=3\\frac{6}{7}$에서는 자연수 부분의 차 $3-1$과 분수 부분의 차 $\\frac{6}{7}-\\frac{2}{7}$의 합을 구한다. 따라서 $\\triangle=$ $2\\frac{4}{7}$이다.",
      "student": "분수 부분의 합이 $1$보다 작은 $1\\frac{2}{7}+\\triangle=3\\frac{6}{7}$에서는 자연수 부분의 차 $3-1$과 분수 부분의 차 $\\frac{6}{7}-\\frac{2}{7}$의 합을 구한다. 따라서 $\\triangle=$ □이다.",
      "expected": [
        "$2\\frac{4}{7}$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-2-1-3-xc17",
          "answers": [
            "$2\\frac{4}{7}$"
          ],
          "alternativeAnswers": [
            "값",
            "수"
          ],
          "reason": "$\\frac{18}{7}$은 동치이다. '더한 값이다', '더한 수이다'도 문법상 완성되어 수로 답해야 함이 드러나지 않는다. '받아올림이 없는'은 분수 단원 용어가 아니므로 '분수 부분의 합이 1보다 작은'이 낫다."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e4-2-1-3-xc17",
          "answers": [
            "$2\\frac{4}{7}$"
          ],
          "alternativeAnswers": [],
          "reason": "3-1=2, 6/7-2/7=4/7이므로 2와 4/7이다. 18/7은 같은 값이다. 앞머리의 '분수 부분의 합이 1보다 작은'은 학생이 읽기에 어색한 수식어이다."
        },
        {
          "name": "e3e4-blind-final-1",
          "id": "e4-2-1-3-xc17",
          "answers": [
            "$2\\frac{4}{7}$"
          ],
          "alternativeAnswers": [],
          "reason": "3-1=2, 6/7-2/7=4/7이므로 △=2 4/7로 유일하게 정해진다. 18/7은 동치 표기일 뿐 다른 답이 아니다. 앞머리 '분수 부분의 합이 1보다 작은'은 2/7+4/7=6/7<1을 뜻해 참이지만, △를 구하기 전인 학생에게는 무엇의 합인지 다소 어색하게 읽힌다. 계산식이 문장에 거의 다 드러나 있으나 최종 값은 노출되지 않는다."
        }
      ],
      "authorReason": "빈칸 위치를 실제 식으로 보이고 자연수·분수 부분 각각 필요한 양이라는 설명을 유지한다. 가림 검토 반영: 등식으로 수 응답을 고정하고 받아올림 없는 대분수라는 조건을 분수 부분의 합으로 풀어 쓴다. 수식 뒤 조사도 검사에 맞게 정리한다."
    },
    {
      "id": "e4-2-1-3-xc25",
      "grade": "초4",
      "chapter": "분수의 덧셈과 뺄셈",
      "termForEditorialIdentityOnly": "더하는 순서를 골라 쉽게",
      "originalDefinition": "세 대분수를 더할 때 분수 부분의 합이 $1$이 되는 둘을 먼저 더하면 {계산이 쉽다}.",
      "originalFinding": {
        "status": "needs_review",
        "student": "세 대분수를 더할 때 분수 부분의 합이 $1$이 되는 둘을 먼저 더하면 □.",
        "expected": [
          "계산이 쉽다"
        ],
        "reason": "'계산이 쉽다'와 '합이 자연수가 된다'가 둘 다 자연스럽고 참인 완성이다. 평가를 쓸지 수학적 사실을 쓸지 정해지지 않는다.",
        "proposal": "'…먼저 더하면 그 합이 □가 되어 계산이 쉽다'로 바꾼다."
      },
      "afterRawDefinition": "세 대분수를 더할 때 분수 부분의 합이 $1$인 둘을 먼저 더하면 그 둘의 합은 {자연수}가 되어 나머지 수와 더하기 쉽다.",
      "completedDefinition": "세 대분수를 더할 때 분수 부분의 합이 $1$인 둘을 먼저 더하면 그 둘의 합은 자연수가 되어 나머지 수와 더하기 쉽다.",
      "student": "세 대분수를 더할 때 분수 부분의 합이 $1$인 둘을 먼저 더하면 그 둘의 합은 □가 되어 나머지 수와 더하기 쉽다.",
      "expected": [
        "자연수"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-2-1-3-xc25",
          "answers": [
            "자연수"
          ],
          "alternativeAnswers": [],
          "reason": "분수 부분의 합이 1이면 합은 자연수이므로 유일하고 정확하다."
        }
      ],
      "authorReason": "계산이 쉽다는 평가는 보이고 편리해지는 이유인 두 수 합의 종류를 묻는다."
    },
    {
      "id": "e4-2-2-1-xc1",
      "grade": "초4",
      "chapter": "삼각형",
      "termForEditorialIdentityOnly": "변의 길이로 분류하기",
      "originalDefinition": "삼각형은 {같은 길이의 변}이 몇 개인지에 따라 분류할 수 있다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "삼각형은 □이 몇 개인지에 따라 분류할 수 있다.",
        "expected": [
          "같은 길이의 변"
        ],
        "reason": "삼각형 대단원에는 각에 따른 분류도 있어 '예각이 몇 개인지'도 조사와 내용에 맞는다. '몇 개인지'가 변 쪽을 가리키기는 하지만 약한 단서다.",
        "proposal": "'변의 길이에 따라 분류할 때, 삼각형은 □이 몇 개인지에'처럼 기준을 밝힌다."
      },
      "afterRawDefinition": "삼각형을 변으로 분류할 때는 같은 {길이}의 변이 몇 개인지 살핀다.",
      "completedDefinition": "삼각형을 변으로 분류할 때는 같은 길이의 변이 몇 개인지 살핀다.",
      "student": "삼각형을 변으로 분류할 때는 같은 □의 변이 몇 개인지 살핀다.",
      "expected": [
        "길이"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-2-2-1-xc1",
          "answers": [
            "길이"
          ],
          "alternativeAnswers": [],
          "reason": "앞의 '변의 길이로 분류할 때'에 답 낱말이 그대로 나와 답이 노출된다."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e4-2-2-1-xc1",
          "answers": [
            "길이"
          ],
          "alternativeAnswers": [],
          "reason": "변으로 분류할 때는 길이가 같은 변의 수를 본다."
        }
      ],
      "authorReason": "변 기준을 본문에 명시해 각의 종류별 개수와 구별한다. 가림 검토 반영: 앞절의 길이라는 답 노출을 없애고 변 기준을 유지한다."
    },
    {
      "id": "e4-2-2-1-xc22",
      "grade": "초4",
      "chapter": "삼각형",
      "termForEditorialIdentityOnly": "붙인 도형의 바깥 변",
      "originalDefinition": "두 도형을 겹치지 않게 한 변끼리 붙이면 {맞붙은 변은 바깥 변에서 빠진다}.",
      "originalFinding": {
        "status": "confirmed",
        "student": "두 도형을 겹치지 않게 한 변끼리 붙이면 □.",
        "expected": [
          "맞붙은 변은 바깥 변에서 빠진다"
        ],
        "reason": "결론 문장 전체가 빈칸이라 '새 도형이 된다', '둘레가 줄어든다' 등 무수한 참인 완성이 가능하다. 기대 답으로 가는 단서가 전혀 없다.",
        "proposal": "'…붙이면 맞붙은 변은 □에서 빠진다'처럼 틀을 남긴다."
      },
      "afterRawDefinition": "두 도형을 겹치지 않게 길이가 같은 한 변 전체끼리 맞붙이면, 맞붙은 변의 길이는 새 도형의 둘레를 구할 때 더하지 {않는다}.",
      "completedDefinition": "두 도형을 겹치지 않게 길이가 같은 한 변 전체끼리 맞붙이면, 맞붙은 변의 길이는 새 도형의 둘레를 구할 때 더하지 않는다.",
      "student": "두 도형을 겹치지 않게 길이가 같은 한 변 전체끼리 맞붙이면, 맞붙은 변의 길이는 새 도형의 둘레를 구할 때 더하지 □.",
      "expected": [
        "않는다"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-2-2-1-xc22",
          "answers": [
            "바깥"
          ],
          "alternativeAnswers": [
            "둘레"
          ],
          "reason": "복원이 불안정하다. '바깥 변', '둘레 변' 모두 교과서 용어가 아니고 '둘레에서 빠진다'가 자연스러운데 뒤에 '변'이 붙어 어색하다. 맞붙인 두 변의 길이가 다르면 긴 변의 남는 부분은 둘레에 남으므로 '길이가 같은 변끼리'라는 조건도 필요하다."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e4-2-2-1-xc22",
          "answers": [
            "않는다"
          ],
          "alternativeAnswers": [],
          "reason": "맞붙은 변은 새 도형의 안쪽에 있어 둘레에 들어가지 않는다."
        }
      ],
      "authorReason": "맞붙는 범위와 판단할 변을 보이고 경계에서 빠진다는 결론을 유지한다. 가림 검토 반영: 맞붙는 두 변의 길이가 같은 조건을 명시하고 바깥 변이라는 어색한 표현을 둘레 계산으로 풀어 쓴다."
    },
    {
      "id": "e4-2-2-2-xc5",
      "grade": "초4",
      "chapter": "삼각형",
      "termForEditorialIdentityOnly": "두 각이 같은 삼각형",
      "originalDefinition": "어느 두 각이 서로 같은 크기이면 {이등변삼각형}이라고 판단한다.",
      "originalFinding": {
        "status": "not_issue",
        "student": "어느 두 각이 서로 같은 크기이면 □이라고 판단한다.",
        "expected": [
          "이등변삼각형"
        ],
        "reason": "삼각형 대단원 맥락에서 '이등변삼각형'이 자연스러운 단일 답이다. 정사각형 반례는 단원 밖의 형식 논리다.",
        "proposal": "유지(원하면 '삼각형에서'를 추가)."
      },
      "afterRawDefinition": "삼각형에서 두 각의 크기가 같으면 그 두 각과 마주 보는 변의 길이도 같다. 변의 길이로 분류하면 {이등변삼각형}이다.",
      "completedDefinition": "삼각형에서 두 각의 크기가 같으면 그 두 각과 마주 보는 변의 길이도 같다. 변의 길이로 분류하면 이등변삼각형이다.",
      "student": "삼각형에서 두 각의 크기가 같으면 그 두 각과 마주 보는 변의 길이도 같다. 변의 길이로 분류하면 □이다.",
      "expected": [
        "이등변삼각형"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-2-2-2-xc5",
          "answers": [
            "이등변삼각형"
          ],
          "alternativeAnswers": [],
          "reason": "세 각이 같은 경우에도 정삼각형은 이등변삼각형에 포함되므로 참이다. 다만 '어느 두 각'이 '임의의 두 각'으로 읽히면 정삼각형이라 답할 수 있어 '두 각의 크기가 같으면'으로 줄이는 편이 안전하다."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e4-2-2-2-xc5",
          "answers": [
            "이등변삼각형"
          ],
          "alternativeAnswers": [],
          "reason": "두 변의 길이가 같으면 이등변삼각형이다. 정삼각형은 일반적으로 성립하지 않으므로 답이 될 수 없다."
        }
      ],
      "authorReason": "삼각형 범위를 보이고 두 각에 대응하는 같은 변이라는 분류 근거를 남긴다. 가림 검토 반영: 어느 두 각을 임의의 모든 두 각으로 읽을 여지를 줄인다."
    },
    {
      "id": "e4-2-2-2-xc7",
      "grade": "초4",
      "chapter": "삼각형",
      "termForEditorialIdentityOnly": "같은 두 변 가운데 하나를 알 때",
      "originalDefinition": "이등변삼각형에서 길이가 같은 두 변 가운데 하나가 $6\\,\\mathrm{cm}$이면 다른 하나도 {같은 길이인} $6\\,\\mathrm{cm}$이다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "이등변삼각형에서 길이가 같은 두 변 가운데 하나가 $6\\,\\mathrm{cm}$이면 다른 하나도 □ $6\\,\\mathrm{cm}$이다.",
        "expected": [
          "같은 길이인"
        ],
        "reason": "값 6 cm가 이미 주어져 빈칸 없이도 문장이 완결된다. '역시', '똑같이' 등 어떤 수식어든 들어가서 무엇을 써야 할지 정해지지 않는다.",
        "proposal": "'다른 하나도 □ cm이다'로 값을 묻는다."
      },
      "afterRawDefinition": "이등변삼각형에서 길이가 같은 두 변 중 하나가 $6\\,\\mathrm{cm}$이면 다른 하나도 {$6\\,\\mathrm{cm}$}이다.",
      "completedDefinition": "이등변삼각형에서 길이가 같은 두 변 중 하나가 $6\\,\\mathrm{cm}$이면 다른 하나도 $6\\,\\mathrm{cm}$이다.",
      "student": "이등변삼각형에서 길이가 같은 두 변 중 하나가 $6\\,\\mathrm{cm}$이면 다른 하나도 □이다.",
      "expected": [
        "$6\\,\\mathrm{cm}$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-2-2-2-xc7",
          "answers": [
            "6 cm"
          ],
          "alternativeAnswers": [],
          "reason": "유일하다. 단위까지 써야 하는 응답임이 '$6\\,\\mathrm{cm}$이면'으로 드러난다."
        }
      ],
      "authorReason": "같은 길이인이라는 군더더기 수식어 대신 같은 변의 길이를 묻는다."
    },
    {
      "id": "e4-2-2-3-xc11",
      "grade": "초4",
      "chapter": "삼각형",
      "termForEditorialIdentityOnly": "정삼각형이 가진 이등변삼각형의 성질",
      "originalDefinition": "정삼각형도 두 변이 같은 삼각형이므로 {같은 두 각}이 있다는 성질을 함께 가진다.",
      "originalFinding": {
        "status": "not_issue",
        "student": "정삼각형도 두 변이 같은 삼각형이므로 □이 있다는 성질을 함께 가진다.",
        "expected": [
          "같은 두 각"
        ],
        "reason": "'두 변이 같은 삼각형이므로'가 이등변삼각형의 성질을 가리켜 '크기가 같은 두 각'이 자연스러운 단일 답이다. 대칭축은 초4 범위 밖이다.",
        "proposal": "유지."
      },
      "afterRawDefinition": "정삼각형도 두 변의 길이가 같은 삼각형이므로, 그 두 변과 마주 보는 두 {각}의 크기가 같다는 성질을 가진다.",
      "completedDefinition": "정삼각형도 두 변의 길이가 같은 삼각형이므로, 그 두 변과 마주 보는 두 각의 크기가 같다는 성질을 가진다.",
      "student": "정삼각형도 두 변의 길이가 같은 삼각형이므로, 그 두 변과 마주 보는 두 □의 크기가 같다는 성질을 가진다.",
      "expected": [
        "각"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-2-2-3-xc11",
          "answers": [
            "각"
          ],
          "alternativeAnswers": [],
          "reason": "유일하고 포함 관계 서술도 옳다. '두 변이 같은'은 '두 변의 길이가 같은'으로 써야 정확하다."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e4-2-2-3-xc11",
          "answers": [
            "각"
          ],
          "alternativeAnswers": [],
          "reason": "이등변삼각형은 두 각의 크기가 같고, 정삼각형도 이 성질을 가진다."
        }
      ],
      "authorReason": "같은 두 각이라는 성질을 보이고 대응하는 요소 이름만 묻는다. 가림 검토 반영: 두 변이 같다는 말을 두 변의 길이가 같다고 정확히 쓴다."
    },
    {
      "id": "e4-2-2-3-xc26",
      "grade": "초4",
      "chapter": "삼각형",
      "termForEditorialIdentityOnly": "세 변이 같은 삼각형의 각",
      "originalDefinition": "세 변의 길이가 같은 삼각형은 각을 재지 않아도 {한 각이 $60^\\circ$}임을 안다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "세 변의 길이가 같은 삼각형은 각을 재지 않아도 □임을 안다.",
        "expected": [
          "한 각이 $60^\\circ$"
        ],
        "reason": "'각을 재지 않아도'가 각에 대한 답임을 알려 주지만 '세 각이 모두 60°', '세 각의 크기가 같음' 등 수준이 다른 답이 가능하다. 기대 답 '한 각이 60°'의 형태는 특정되지 않는다.",
        "proposal": "'한 각이 □°임을 안다'로 틀을 좁히고 '세 각이 모두 60°'를 인정한다."
      },
      "afterRawDefinition": "세 변의 길이가 같은 삼각형은 세 각의 크기도 같으므로, 한 각은 $180^\\circ\\div3=$ {$60^\\circ$}이다.",
      "completedDefinition": "세 변의 길이가 같은 삼각형은 세 각의 크기도 같으므로, 한 각은 $180^\\circ\\div3=$ $60^\\circ$이다.",
      "student": "세 변의 길이가 같은 삼각형은 세 각의 크기도 같으므로, 한 각은 $180^\\circ\\div3=$ □이다.",
      "expected": [
        "$60^\\circ$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-2-2-3-xc26",
          "answers": [
            "60°"
          ],
          "alternativeAnswers": [],
          "reason": "유일하고 정확하다."
        }
      ],
      "authorReason": "같은 각과 각의 합이라는 근거를 보이고 각도 값만 묻는다."
    },
    {
      "id": "e4-2-2-4-xc17",
      "grade": "초4",
      "chapter": "삼각형",
      "termForEditorialIdentityOnly": "점 종이에 그린 삼각형을 각으로 분류하는 법",
      "originalDefinition": "점 종이에 삼각형을 그린 뒤 각을 {직각과 견주어} 분류할 수 있다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "점 종이에 삼각형을 그린 뒤 각을 □ 분류할 수 있다.",
        "expected": [
          "직각과 견주어"
        ],
        "reason": "'각을 재어', '크기에 따라', '직각과 비교하여'가 모두 들어간다. 직각 기준 분류라는 의도는 추론할 수 있으나 경계 사례다.",
        "proposal": "'각을 □과 견주어 분류할 수 있다'로 틀을 남긴다."
      },
      "afterRawDefinition": "점 종이에 그린 삼각형을 예각삼각형·직각삼각형·둔각삼각형으로 분류하려면 각의 크기를 {직각}과 견주어 살핀다.",
      "completedDefinition": "점 종이에 그린 삼각형을 예각삼각형·직각삼각형·둔각삼각형으로 분류하려면 각의 크기를 직각과 견주어 살핀다.",
      "student": "점 종이에 그린 삼각형을 예각삼각형·직각삼각형·둔각삼각형으로 분류하려면 각의 크기를 □과 견주어 살핀다.",
      "expected": [
        "직각"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-2-2-4-xc17",
          "answers": [
            "직각"
          ],
          "alternativeAnswers": [],
          "reason": "'90°'는 같은 뜻이나 조사 '과'에는 '직각'이 맞다."
        }
      ],
      "authorReason": "각에 따른 세 이름과 비교 연산을 보이며 비교 기준 각만 묻는다."
    },
    {
      "id": "e4-2-2-4-xc24",
      "grade": "초4",
      "chapter": "삼각형",
      "termForEditorialIdentityOnly": "한 각만 보는 잘못",
      "originalDefinition": "한 각이 예각이라는 것만으로 {예각삼각형}이라 할 수 없다.",
      "originalFinding": {
        "status": "not_issue",
        "student": "한 각이 예각이라는 것만으로 □이라 할 수 없다.",
        "expected": [
          "예각삼각형"
        ],
        "reason": "'한 각이 예각'이라는 전제에서 떠올릴 오판은 '예각삼각형'이라 자연스러운 단일 답이다. 다른 도형명도 참이라는 지적은 형식 논리다.",
        "proposal": "유지."
      },
      "afterRawDefinition": "예각삼각형이라고 하려면 한 각만이 아니라 {세} 각이 모두 예각이어야 한다.",
      "completedDefinition": "예각삼각형이라고 하려면 한 각만이 아니라 세 각이 모두 예각이어야 한다.",
      "student": "예각삼각형이라고 하려면 한 각만이 아니라 □ 각이 모두 예각이어야 한다.",
      "expected": [
        "세"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-2-2-4-xc24",
          "answers": [
            "세"
          ],
          "alternativeAnswers": [],
          "reason": "유일하고 정확하다."
        }
      ],
      "authorReason": "임의의 될 수 없는 도형 이름 대신 예각삼각형의 모든 각 조건을 묻는다."
    },
    {
      "id": "e4-2-2-5-xc2",
      "grade": "초4",
      "chapter": "삼각형",
      "termForEditorialIdentityOnly": "같은 두 각이 있고 모두 예각인 삼각형",
      "originalDefinition": "같은 두 각이 있고 세 각이 모두 예각이면 {이등변삼각형이면서 예각삼각형}이다.",
      "originalFinding": {
        "status": "not_issue",
        "student": "같은 두 각이 있고 세 각이 모두 예각이면 □이다.",
        "expected": [
          "이등변삼각형이면서 예각삼각형"
        ],
        "reason": "조건 두 개가 명시되어 두 이름을 함께 쓰는 답이 자연스럽게 유도된다. 한쪽만 써도 참이라는 것은 형식 논리다.",
        "proposal": "유지. 순서를 바꾼 표현도 인정한다."
      },
      "afterRawDefinition": "크기가 같은 두 각이 있고 세 각이 모두 예각인 삼각형은, 변의 길이로 분류하면 {이등변삼각형}이고 각의 크기로 분류하면 {예각삼각형}이다.",
      "completedDefinition": "크기가 같은 두 각이 있고 세 각이 모두 예각인 삼각형은, 변의 길이로 분류하면 이등변삼각형이고 각의 크기로 분류하면 예각삼각형이다.",
      "student": "크기가 같은 두 각이 있고 세 각이 모두 예각인 삼각형은, 변의 길이로 분류하면 □이고 각의 크기로 분류하면 □이다.",
      "expected": [
        "이등변삼각형",
        "예각삼각형"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-2-2-5-xc2",
          "answers": [
            "이등변삼각형",
            "예각삼각형"
          ],
          "alternativeAnswers": [],
          "reason": "세 각이 모두 같을 수도 있으나 정삼각형도 이등변삼각형이므로 일반적으로 참인 답은 이등변삼각형뿐이다. 정삼각형은 항상 참이 아니어서 대안이 아니다."
        }
      ],
      "authorReason": "삼각형과 두 분류 기준을 명시하고 두 답을 나누어 한쪽 이름만 쓰는 답과 구별한다."
    },
    {
      "id": "e4-2-2-5-xc28",
      "grade": "초4",
      "chapter": "삼각형",
      "termForEditorialIdentityOnly": "세 변이 모두 다를 때 될 수 없는 것",
      "originalDefinition": "세 변의 길이가 모두 다른 삼각형은 {직각이등변삼각형}이 될 수 없다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "세 변의 길이가 모두 다른 삼각형은 □이 될 수 없다.",
        "expected": [
          "직각이등변삼각형"
        ],
        "reason": "가장 자연스러운 답은 '이등변삼각형'이나 '정삼각형'이다. 기대 답 '직각이등변삼각형'은 그보다 좁은 특수 사례라 학생이 떠올릴 근거가 없다.",
        "proposal": "기대 답을 '이등변삼각형'으로 바꾸거나 '직각이 있어도 □은 될 수 없다'로 문장을 고친다."
      },
      "afterRawDefinition": "직각이 있어도 세 변의 길이가 모두 다른 삼각형은, 두 변의 길이가 같아야 하는 직각{이등변삼각형}이 될 수 없다.",
      "completedDefinition": "직각이 있어도 세 변의 길이가 모두 다른 삼각형은, 두 변의 길이가 같아야 하는 직각이등변삼각형이 될 수 없다.",
      "student": "직각이 있어도 세 변의 길이가 모두 다른 삼각형은, 두 변의 길이가 같아야 하는 직각□이 될 수 없다.",
      "expected": [
        "이등변삼각형"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-2-2-5-xc28",
          "answers": [
            "이등변삼각형"
          ],
          "alternativeAnswers": [],
          "reason": "'직각이등변삼각형'으로 유일하게 완성되며 정확하다."
        }
      ],
      "authorReason": "기존 직각이등변삼각형 개념을 유지하며 직각과 같은 두 변이라는 요건을 보인다. 정삼각형 등 다른 금지 도형과 구별된다."
    },
    {
      "id": "e4-2-3-1-xc4",
      "grade": "초4",
      "chapter": "소수의 덧셈과 뺄셈",
      "termForEditorialIdentityOnly": "$0$이 있는 소수 읽기",
      "originalDefinition": "소수 부분에 있는 $0$도 {빠뜨리지 않고} 영으로 읽는다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "소수 부분에 있는 $0$도 □ 영으로 읽는다.",
        "expected": [
          "빠뜨리지 않고"
        ],
        "reason": "'반드시', '꼭', '빼놓지 않고' 등 같은 취지의 부사가 여럿 들어가고 수학 내용은 이미 문장에 있다. 답을 정하지 못하는 것은 아니다.",
        "proposal": "동의 표현을 인정하거나 '소수 부분의 0도 □으로 읽는다'(영)로 빈칸을 옮긴다."
      },
      "afterRawDefinition": "소수를 읽을 때 소수 부분에 있는 $0$도 빠뜨리지 않고 {영}으로 읽는다.",
      "completedDefinition": "소수를 읽을 때 소수 부분에 있는 $0$도 빠뜨리지 않고 영으로 읽는다.",
      "student": "소수를 읽을 때 소수 부분에 있는 $0$도 빠뜨리지 않고 □으로 읽는다.",
      "expected": [
        "영"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-3",
          "id": "e4-2-3-1-xc4",
          "answers": [
            "영"
          ],
          "alternativeAnswers": [],
          "reason": "교과서 읽기는 '영'이다. '공'은 일상 표현이라 정답으로 보지 않는다."
        }
      ],
      "authorReason": "일반 부사구 대신 0의 읽는 이름을 묻는다."
    }
  ]
}
