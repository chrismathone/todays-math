초등 수학 C형 공유 definition의 현재 최종 원고를 독립 검토하라. 모든 ID를 읽고 JSON {cases:[{id,verdict:"pass"|"revise",reason,proposal}]}만 반환하라. 학생에게는 학년·대단원·student만 보이고 용어 제목과 소단원은 보이지 않는다. originalDefinition·originalFinding은 과거 문장의 지적이며 current afterRawDefinition을 판정해야 한다. 기대 답은 expected이다. 첫 가림 답과 비교하되 맞춤법·기호·같은 뜻의 동의 표현·동치 수식·같은 답들의 순서 교환은 의미상 일치로 인정한다. 다른 속성·조건·연산·서로 다른 도형 이름을 요구하는 참 완성은 허용하지 않는다. 단순히 특정 특수조건을 새로 가정해야만 참인 답은 일반 명제의 반례가 아니다. 하나의 선분을 다각형의 변이라고 부르는 같은 지시 대상 같은 뜻의 표현과, 분모/분수의 크기처럼 다른 속성을 구별하라. 수학적으로 참인지 0·1·부호·나머지·정의역·도형 포함 관계·표기·응답 범위·빈칸의 짧은 핵심·학생 말을 확인하라. 한 문장에 용어·정답이 반복되는 단순 베끼기와, 구체적 수나 조건에서 값을 계산·동일성·분류를 추론하는 개념 문장을 구별하라. 완성 정의는 A/B/D형과 SRS에서도 설명으로 참이어야 하며 termForEditorialIdentityOnly는 기존 개념 보존 확인용이다. 새 학년 밖 용어 또는 개념 변경을 제안하지 말라. 유효한 반례나 학생이 무엇을 답할지 모르는 문제가 있으면 revise와 구체적 짧은 완성 정의 proposal을 적고, 문제가 해소되었으면 pass와 이유를 적어라. 원 지적이 not_issue였어도 실제 문제가 남으면 revise이다. 모든 기대 답을 보인 상태에서 동의만 하지 말고 독립 판단하라.

{
  "cases": [
    {
      "id": "e3-1-1-4-xc1",
      "grade": "초3",
      "chapter": "덧셈과 뺄셈",
      "termForEditorialIdentityOnly": "받아내림이 두 번 있는 뺄셈",
      "originalDefinition": "{백 한 개를 십 열 개로}, {십 한 개를 낱개 열 개로} 각각 한 번씩 풀어 계산하는 뺄셈이다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "□, □ 각각 한 번씩 풀어 계산하는 뺄셈이다.",
        "expected": [
          "백 한 개를 십 열 개로",
          "십 한 개를 낱개 열 개로"
        ],
        "reason": "term이 가려져 문장에 주어가 없고, 두 빈칸이 '무엇을 무엇으로' 푸는지 구절 전체를 요구한다. 학생 문장만으로는 받아내림이 두 번인 세 자리 수 뺄셈인지, 어느 자리를 푸는지 정할 수 없다.",
        "proposal": "'받아내림이 두 번 있는 뺄셈은'처럼 대상을 문장에 남기고, 빈칸은 '십 열 개', '낱개 열 개' 같은 짧은 단위로 좁힌다."
      },
      "afterRawDefinition": "세 자리 수의 뺄셈에서 받아내림을 두 번 할 때는 백 한 개를 {십 열 개}로, 십 한 개를 {낱개 열 개}로 바꾸어 계산한다.",
      "completedDefinition": "세 자리 수의 뺄셈에서 받아내림을 두 번 할 때는 백 한 개를 십 열 개로, 십 한 개를 낱개 열 개로 바꾸어 계산한다.",
      "student": "세 자리 수의 뺄셈에서 받아내림을 두 번 할 때는 백 한 개를 □로, 십 한 개를 □로 바꾸어 계산한다.",
      "expected": [
        "십 열 개",
        "낱개 열 개"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-1-1-4-xc1",
          "answers": [
            "십 10개",
            "일 10개"
          ],
          "alternativeAnswers": [],
          "reason": "유일하게 복원됨. 다만 답이 '단위+개수' 복합 표현(십 열 개, 10이 10개 등)이라 채점 허용 범위를 넓게 잡아야 함."
        }
      ],
      "authorReason": "세 자리 수·뺄셈·두 번이라는 대상을 남기고 무엇으로 바꾸는지 두 자리값만 묻는다."
    },
    {
      "id": "e3-1-1-4-c1",
      "grade": "초3",
      "chapter": "덧셈과 뺄셈",
      "termForEditorialIdentityOnly": "두 번 받아내림",
      "originalDefinition": "{일과 십의 자리}에서 각각 뺄 수 없으면 받아내림을 두 번 한다.",
      "originalFinding": {
        "status": "not_issue",
        "student": "□에서 각각 뺄 수 없으면 받아내림을 두 번 한다.",
        "expected": [
          "일과 십의 자리"
        ],
        "reason": "초3 대단원은 세 자리 수 범위이고, (세 자리 수)-(세 자리 수)에서 받아내림이 두 번이면 일의 자리와 십의 자리뿐이다. prior의 네 자리 수 반례는 학년 범위 밖이다.",
        "proposal": "유지"
      },
      "afterRawDefinition": "세 자리 수끼리 뺄 때 일의 자리 계산과 십의 자리 계산에서 각각 윗자리의 $1$을 빌려야 한다면 받아내림은 {두} 번이다.",
      "completedDefinition": "세 자리 수끼리 뺄 때 일의 자리 계산과 십의 자리 계산에서 각각 윗자리의 $1$을 빌려야 한다면 받아내림은 두 번이다.",
      "student": "세 자리 수끼리 뺄 때 일의 자리 계산과 십의 자리 계산에서 각각 윗자리의 $1$을 빌려야 한다면 받아내림은 □ 번이다.",
      "expected": [
        "두"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-1-1-4-c1",
          "answers": [
            "백",
            "십"
          ],
          "alternativeAnswers": [
            "십 | 일",
            "십 | 백(순서 바꿈)"
          ],
          "reason": "중의적. '~의 자리에서 받아내림'을 빌려 오는 자리로 읽으면 백·십, 받아내림이 필요한 자리로 읽으면 십·일이며 둘 다 참. 순서도 고정되지 않음. 수정 필요."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e3-1-1-4-c1",
          "answers": [
            "두"
          ],
          "alternativeAnswers": [],
          "reason": "일의 자리와 십의 자리에서 각각 한 번씩 빌리므로 2번이다. '2'도 같은 답이다."
        }
      ],
      "authorReason": "소단원 없이도 세 자리 수 두 번 받아내림의 범위가 정해지도록 명시하고 두 자리 이름을 각각 묻는다. 순서 교환은 같은 답이다. 가림 검토 반영: 받아내림이 필요한 자리와 빌려 주는 자리의 중의성을 없애고 횟수만 묻는다."
    },
    {
      "id": "e3-2-5-1-xc6",
      "grade": "초3",
      "chapter": "들이와 무게",
      "termForEditorialIdentityOnly": "들이가 같은 두 그릇",
      "originalDefinition": "같은 컵에 매번 가득 담아 부은 횟수가 똑같은 두 그릇은 들이가 {같다}.",
      "originalFinding": {
        "status": "needs_review",
        "student": "같은 컵에 매번 가득 담아 부은 횟수가 똑같은 두 그릇은 들이가 □.",
        "expected": [
          "같다"
        ],
        "reason": "학생이 쓸 답은 '같다'로 유일하고, 단원 활동 맥락에서는 '그릇을 채우는 데 부은 횟수'로 읽힌다. 다만 '그릇이 가득 찰 때까지'가 빠져 문장만으로는 엄밀하지 않으므로, 확정 오류가 아니라 표현 보완 대상이다.",
        "proposal": "'두 그릇을 각각 가득 채울 때까지 부은 횟수가 똑같으면'으로 조건을 보충한다."
      },
      "afterRawDefinition": "같은 컵에 매번 가득 담아 남김없이 붓고, 두 그릇이 각각 꼭 맞게 가득 차도록 부은 횟수가 같으면 두 그릇의 들이는 {같다}.",
      "completedDefinition": "같은 컵에 매번 가득 담아 남김없이 붓고, 두 그릇이 각각 꼭 맞게 가득 차도록 부은 횟수가 같으면 두 그릇의 들이는 같다.",
      "student": "같은 컵에 매번 가득 담아 남김없이 붓고, 두 그릇이 각각 꼭 맞게 가득 차도록 부은 횟수가 같으면 두 그릇의 들이는 □.",
      "expected": [
        "같다"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-2-5-1-xc6",
          "answers": [
            "같다"
          ],
          "alternativeAnswers": [],
          "reason": "복원은 '같다'로 유일. 다만 마지막 컵이 남거나 넘치는 경우(2.3컵과 2.8컵 모두 3번)에는 횟수가 같아도 들이가 다를 수 있어, '남김없이 꼭 맞게 채워질 때'라는 조건이 없으면 일반 명제로는 엄밀하지 않음."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e3-2-5-1-xc6",
          "answers": [
            "같다"
          ],
          "alternativeAnswers": [],
          "reason": "같은 컵으로 가득 채운 횟수가 같고 두 그릇이 꼭 맞게 차므로 들이가 같다. 조건이 충분해 답이 하나다."
        }
      ],
      "authorReason": "담긴 물의 양과 그릇의 들이를 구별하기 위해 두 그릇 모두 가득 채운다는 조건을 보인다. 가림 검토 반영: 마지막 컵 일부만 붓거나 넘치는 반례를 막도록 남김없이·꼭 맞게 채움을 명시한다."
    },
    {
      "id": "e3-1-3-3-c1",
      "grade": "초3",
      "chapter": "나눗셈",
      "termForEditorialIdentityOnly": "빈칸 곱셈식",
      "originalDefinition": "나눗셈의 몫을 찾을 때 나누는 수와 {몫}을 곱한 값이 전체가 되게 한다.",
      "originalFinding": {
        "status": "not_issue",
        "student": "나눗셈의 몫을 찾을 때 나누는 수와 □을 곱한 값이 전체가 되게 한다.",
        "expected": [
          "몫"
        ],
        "reason": "초3 1학기 나눗셈 단원은 나누어떨어지는 경우만 다루므로 나머지 반례는 범위 밖이다. '나누는 수 × 몫 = 전체'에서 '몫'이 자연스러운 단일 답이다.",
        "proposal": "유지"
      },
      "afterRawDefinition": "나누어떨어지는 나눗셈에서는 나누는 수와 {몫}을 곱한 값이 나누어지는 수가 된다. 이 관계로 나눈 결과를 찾을 수 있다.",
      "completedDefinition": "나누어떨어지는 나눗셈에서는 나누는 수와 몫을 곱한 값이 나누어지는 수가 된다. 이 관계로 나눈 결과를 찾을 수 있다.",
      "student": "나누어떨어지는 나눗셈에서는 나누는 수와 □을 곱한 값이 나누어지는 수가 된다. 이 관계로 나눈 결과를 찾을 수 있다.",
      "expected": [
        "몫"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-1-3-3-c1",
          "answers": [
            "몫"
          ],
          "alternativeAnswers": [],
          "reason": "유일. 같은 문장 앞에 '몫을 찾을 때'가 있어 답 낱말이 노출됨."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e3-1-3-3-c1",
          "answers": [
            "몫"
          ],
          "alternativeAnswers": [],
          "reason": "나누는 수×몫=나누어지는 수이다. 조사 '을'과 맞는다."
        }
      ],
      "authorReason": "나머지가 없는 조건을 본문에 명시하여 2학기 나눗셈·SRS에서도 참인 관계를 유지한다. 가림 검토 반영: 앞의 몫을 찾는다는 답 노출을 없애면서 나머지 없는 관계와 찾는 목적을 유지한다."
    },
    {
      "id": "e3-1-3-3-c2",
      "grade": "초3",
      "chapter": "나눗셈",
      "termForEditorialIdentityOnly": "빈칸이 앞에 있는 곱셈식으로 몫 구하기",
      "originalDefinition": "곱하는 두 수의 순서를 바꾸어도 곱은 같으므로 빈칸이 {앞에 있는 곱셈식}으로도 몫을 구할 수 있다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "곱하는 두 수의 순서를 바꾸어도 곱은 같으므로 빈칸이 □으로도 몫을 구할 수 있다.",
        "expected": [
          "앞에 있는 곱셈식"
        ],
        "reason": "기준이 되는 식(빈칸이 뒤에 있는 곱셈식)이 제시되지 않아 '앞에 있는'과 '뒤에 있는'이 모두 참이다. 답의 형태(위치 설명인지 식인지)도 정해지지 않는다.",
        "proposal": "'3×□=12뿐 아니라'처럼 기준 식을 문장에 넣고 빈칸의 위치(앞/뒤)만 묻는다."
      },
      "afterRawDefinition": "곱하는 두 수의 순서를 바꾸어도 곱은 같으므로 $4\\times\\triangle=20$에서 몫을 찾듯이 $\\triangle\\times4=20$에서도 $20\\div4$의 몫 {$5$}를 찾을 수 있다.",
      "completedDefinition": "곱하는 두 수의 순서를 바꾸어도 곱은 같으므로 $4\\times\\triangle=20$에서 몫을 찾듯이 $\\triangle\\times4=20$에서도 $20\\div4$의 몫 $5$를 찾을 수 있다.",
      "student": "곱하는 두 수의 순서를 바꾸어도 곱은 같으므로 $4\\times\\triangle=20$에서 몫을 찾듯이 $\\triangle\\times4=20$에서도 $20\\div4$의 몫 □를 찾을 수 있다.",
      "expected": [
        "$5$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-1-3-3-c2",
          "answers": [
            "5"
          ],
          "alternativeAnswers": [],
          "reason": "20÷4=5로 유일. 조사 '를'도 맞음."
        }
      ],
      "authorReason": "앞·뒤 위치를 임의로 고르던 절 대신 두 식을 모두 보여 주고 공통 몫의 값을 묻는다. 삼각형 기호는 모르는 수의 자리이다."
    },
    {
      "id": "e3-1-2-2-xc13",
      "grade": "초3",
      "chapter": "평면도형",
      "termForEditorialIdentityOnly": "각이 없는 도형",
      "originalDefinition": "원처럼 곧은 선이 없는 도형에는 {각}이 없다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "원처럼 곧은 선이 없는 도형에는 □이 없다.",
        "expected": [
          "각"
        ],
        "reason": "곧은 선이 없는 도형에 없는 것은 각뿐 아니라 꼭짓점, 변도 참이며 조사 '이'가 모두 맞는다. 동의 표현이 아니라 서로 다른 도형 요소이고, 학생이 2학년에서 원의 특징으로 배운 내용이라 실제로 갈린다.",
        "proposal": "'두 반직선(곧은 선 두 개)이 만나 이루는 □이 없다'처럼 각을 특정하는 단서를 넣는다."
      },
      "afterRawDefinition": "원에는 두 곧은 선이 한 점에서 만나 벌어진 부분인 {각}이 없다.",
      "completedDefinition": "원에는 두 곧은 선이 한 점에서 만나 벌어진 부분인 각이 없다.",
      "student": "원에는 두 곧은 선이 한 점에서 만나 벌어진 부분인 □이 없다.",
      "expected": [
        "각"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-1-2-2-xc13",
          "answers": [
            "각"
          ],
          "alternativeAnswers": [
            "꼭짓점"
          ],
          "reason": "'만나 이루는'은 각 쪽이지만 '꼭짓점'도 조사 '이'에 맞고 원에 없다는 점에서 참. 두 답이 갈릴 수 있음."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e3-1-2-2-xc13",
          "answers": [
            "각"
          ],
          "alternativeAnswers": [],
          "reason": "'벌어진 부분'이라는 설명에 맞는 것은 각뿐이다. '꼭짓점'은 점이라 이 설명과 맞지 않지만 학생이 쓸 수 있는 오답이다. 초3 정의는 '반직선'을 쓰므로 '곧은 선'은 다소 느슨한 표현이다."
        }
      ],
      "authorReason": "각을 설명하는 두 곧은 선·한 점·만남이라는 조건을 남겨 꼭짓점이나 변과 구별한다. 가림 검토 반영: 벌어진 부분이라는 각의 정의를 명시해 만나는 점인 꼭짓점과 구별한다."
    },
    {
      "id": "e3-1-6-1-xc2",
      "grade": "초3",
      "chapter": "분수와 소수",
      "termForEditorialIdentityOnly": "똑같이 나눈 조각의 모양",
      "originalDefinition": "똑같이 나눈 조각은 모양과 {크기}가 같아 서로 포개면 꼭 겹친다.",
      "originalFinding": {
        "status": "not_issue",
        "student": "똑같이 나눈 조각은 모양과 □가 같아 서로 포개면 꼭 겹친다.",
        "expected": [
          "크기"
        ],
        "reason": "초3 '똑같이 나누기'는 교과서에서 모양과 크기가 같아 겹쳐지는 조각으로 도입하므로 학년 수준에서 오류로 볼 수 없다. 답 '크기'도 유일하다. prior의 넓이만 같은 반례는 이 단계의 정의 범위를 벗어난 형식 논리다.",
        "proposal": "유지"
      },
      "afterRawDefinition": "똑같이 나눈 조각은 모양과 {크기}가 같아 서로 포개면 꼭 겹친다.",
      "completedDefinition": "똑같이 나눈 조각은 모양과 크기가 같아 서로 포개면 꼭 겹친다.",
      "student": "똑같이 나눈 조각은 모양과 □가 같아 서로 포개면 꼭 겹친다.",
      "expected": [
        "크기"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-1-6-1-xc2",
          "answers": [
            "크기"
          ],
          "alternativeAnswers": [],
          "reason": "유일. '넓이'는 초3 용어 밖."
        }
      ],
      "authorReason": "모양과 크기가 같아 포개면 꼭 겹친다는 조건이 명시되어 답은 크기이다. 넓이만 같은 다른 모양은 포개진다는 조건을 만족하지 않는다."
    },
    {
      "id": "e3-2-1-1-c3",
      "grade": "초3",
      "chapter": "곱셈",
      "termForEditorialIdentityOnly": "곱해지는 수의 십의 자리가 $0$일 때",
      "originalDefinition": "$0$이 아닌 수를 곱할 때 곱해지는 수의 십의 자리가 $0$이고 일의 자리에서 올림이 없으면, 곱의 십의 자리에 {$0$을 써서 자리를 지킨다}.",
      "originalFinding": {
        "status": "not_issue",
        "student": "$0$이 아닌 수를 곱할 때 곱해지는 수의 십의 자리가 $0$이고 일의 자리에서 올림이 없으면, 곱의 십의 자리에 □.",
        "expected": [
          "$0$을 써서 자리를 지킨다"
        ],
        "reason": "초3 곱셈 단원에서 십의 자리가 있는 세 자리 수에 곱하는 수는 한 자리 수뿐이라 103×12 반례는 범위 밖이다. '0을 쓴다'가 자연스러운 단일 답이며 '자리를 지킨다'는 표현 차이다.",
        "proposal": "유지. 선택적으로 '0이 아닌 한 자리 수'라고 명시할 수 있다."
      },
      "afterRawDefinition": "세 자리 수에 $0$이 아닌 한 자리 수를 곱할 때, 곱해지는 수의 십의 자리 숫자가 $0$이고 일의 자리에서 올림이 없으면 곱의 십의 자리 숫자는 {$0$}이다.",
      "completedDefinition": "세 자리 수에 $0$이 아닌 한 자리 수를 곱할 때, 곱해지는 수의 십의 자리 숫자가 $0$이고 일의 자리에서 올림이 없으면 곱의 십의 자리 숫자는 $0$이다.",
      "student": "세 자리 수에 $0$이 아닌 한 자리 수를 곱할 때, 곱해지는 수의 십의 자리 숫자가 $0$이고 일의 자리에서 올림이 없으면 곱의 십의 자리 숫자는 □이다.",
      "expected": [
        "$0$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-2-1-1-c3",
          "answers": [
            "0"
          ],
          "alternativeAnswers": [],
          "reason": "일의 자리 곱이 10 미만이고 십의 자리는 0×(한 자리 수)+0이므로 항상 0(예: 203×3=609, 901×9=8109). 일반적으로 참."
        }
      ],
      "authorReason": "한 자리 수 곱셈 조건을 본문에 보이고 긴 행동절 대신 십의 자리 숫자를 묻는다."
    },
    {
      "id": "e3-1-2-3-xc2",
      "grade": "초3",
      "chapter": "평면도형",
      "termForEditorialIdentityOnly": "삼각형의 변",
      "originalDefinition": "삼각형을 둘러싼 곧은 선을 {변}이라 하며 삼각형에는 변이 $3$개 있다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "삼각형을 둘러싼 곧은 선을 □이라 하며 삼각형에는 변이 $3$개 있다.",
        "expected": [
          "변"
        ],
        "reason": "답은 '변'으로 명료하고 수학적 오류도 없다. 다만 같은 문장 뒤 절에 '변이 3개'가 그대로 나와 회상 없이 옮겨 쓸 수 있으므로, 명료성 결함이 아니라 문항 효용 문제다.",
        "proposal": "뒤 절을 '삼각형에는 이것이 3개 있다'로 바꾸거나 개수 설명을 뺀다."
      },
      "afterRawDefinition": "삼각형에서 이웃한 두 꼭짓점을 잇는 선분을 삼각형의 {변}이라 한다.",
      "completedDefinition": "삼각형에서 이웃한 두 꼭짓점을 잇는 선분을 삼각형의 변이라 한다.",
      "student": "삼각형에서 이웃한 두 꼭짓점을 잇는 선분을 삼각형의 □이라 한다.",
      "expected": [
        "변"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-1-2-3-xc2",
          "answers": [
            "변"
          ],
          "alternativeAnswers": [
            "선분"
          ],
          "reason": "의도는 '변'. 그러나 '곧은 선 → 선분'도 같은 단원 용어이고 조사 '이라'에 맞으며 참인 완성. '삼각형의'라는 한정이나 '꼭짓점과 꼭짓점을 잇는' 같은 단서가 있으면 좋음."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e3-1-2-3-xc2",
          "answers": [
            "변"
          ],
          "alternativeAnswers": [],
          "reason": "삼각형의 꼭짓점을 잇는 선분은 변이다. 답이 하나다."
        }
      ],
      "authorReason": "뒤 절의 변이라는 답 노출을 없애고 삼각형의 세 곧은 선이라는 설명을 유지한다. 가림 검토 반영: 삼각형에서 선분이 맡는 요소의 이름을 묻도록 한정한다."
    },
    {
      "id": "e3-1-3-2-xc9",
      "grade": "초3",
      "chapter": "나눗셈",
      "termForEditorialIdentityOnly": "곱셈구구와 나눗셈",
      "originalDefinition": "곱셈구구를 알면 그 곱을 {나누는} 나눗셈의 몫도 알 수 있다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "곱셈구구를 알면 그 곱을 □ 나눗셈의 몫도 알 수 있다.",
        "expected": [
          "나누는"
        ],
        "reason": "'그 곱을 □ 나눗셈'에서 '나누는'은 문맥상 채워지지만, 수학 개념이 아닌 연결 동사만 묻는다. 답을 못 정하는 수준은 아니고 측정 대상이 약한 경계 사례다.",
        "proposal": "'곱셈구구를 알면 그 곱을 곱한 한 수로 나눈 □도 알 수 있다'(몫)처럼 수의 역할을 묻는다."
      },
      "afterRawDefinition": "$3\\times4=12$라는 곱셈구구를 알면 $12\\div3$의 몫은 {$4$}임을 알 수 있다.",
      "completedDefinition": "$3\\times4=12$라는 곱셈구구를 알면 $12\\div3$의 몫은 $4$임을 알 수 있다.",
      "student": "$3\\times4=12$라는 곱셈구구를 알면 $12\\div3$의 몫은 □임을 알 수 있다.",
      "expected": [
        "$4$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-1-3-2-xc9",
          "answers": [
            "4"
          ],
          "alternativeAnswers": [],
          "reason": "유일. 곱셈식에 4가 보이지만 회상 의도상 문제없음."
        }
      ],
      "authorReason": "연결 동사 대신 곱셈구구에서 대응되는 나눗셈 몫을 묻는다."
    },
    {
      "id": "e3-1-1-1-xc14",
      "grade": "초3",
      "chapter": "덧셈과 뺄셈",
      "termForEditorialIdentityOnly": "몇백으로 어림하여 더하기",
      "originalDefinition": "세 자리 수의 덧셈은 두 수를 각각 {가까운 몇백}으로 바꾸어 더하면 합이 약 얼마인지 미리 알 수 있다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "세 자리 수의 덧셈은 두 수를 각각 □으로 바꾸어 더하면 합이 약 얼마인지 미리 알 수 있다.",
        "expected": [
          "가까운 몇백"
        ],
        "reason": "초3 어림셈의 표준은 '몇백(쯤)'이라 대체로 복원된다. 그러나 '몇백몇십'이나 '어림한 수'도 문장에 맞아 답의 정밀도가 문장만으로 고정되지 않는다.",
        "proposal": "'298+405를 300+400으로 보듯'처럼 예시를 붙여 단위를 고정한다."
      },
      "afterRawDefinition": "세 자리 수의 합을 가까운 몇백으로 어림하면 $238$은 {$200$}, $371$은 {$400$}으로 바꾸어 더할 수 있다.",
      "completedDefinition": "세 자리 수의 합을 가까운 몇백으로 어림하면 $238$은 $200$, $371$은 $400$으로 바꾸어 더할 수 있다.",
      "student": "세 자리 수의 합을 가까운 몇백으로 어림하면 $238$은 □, $371$은 □으로 바꾸어 더할 수 있다.",
      "expected": [
        "$200$",
        "$400$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-1-1-1-xc14",
          "answers": [
            "백"
          ],
          "alternativeAnswers": [],
          "reason": "'몇백으로'로 유일. '백 단위로'가 앞에 있어 답이 노출됨."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e3-1-1-1-xc14",
          "answers": [
            "200",
            "400"
          ],
          "alternativeAnswers": [],
          "reason": "238은 200에, 371은 400에 가깝다."
        }
      ],
      "authorReason": "백 단위 어림이라는 목표와 몇이라는 응답 틀을 남겨 몇백몇십 등 다른 정밀도의 전략과 구별한다. 가림 검토 반영: 백이라는 답 반복 대신 실제 두 수를 가까운 몇백으로 바꾸는 값을 묻는다."
    },
    {
      "id": "e3-1-1-3-xc13",
      "grade": "초3",
      "chapter": "덧셈과 뺄셈",
      "termForEditorialIdentityOnly": "몇백으로 어림하여 빼기",
      "originalDefinition": "두 수를 각각 {가까운 몇백}으로 바꾸어 빼면 차가 약 얼마인지 미리 알 수 있다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "두 수를 각각 □으로 바꾸어 빼면 차가 약 얼마인지 미리 알 수 있다.",
        "expected": [
          "가까운 몇백"
        ],
        "reason": "xc14와 같은 구조인데 '세 자리 수' 단서도 없어 어림 단위가 더 열려 있다. 단원 맥락상 '몇백'이 우세하므로 확정 결함보다는 단서 보강 대상이다.",
        "proposal": "'세 자리 수의 뺄셈에서'와 구체적인 예시(예: 586-243 → 600-200)를 추가한다."
      },
      "afterRawDefinition": "세 자리 수의 차를 가까운 몇백으로 어림하면 $482$는 {$500$}, $217$은 {$200$}으로 바꾸어 뺄 수 있다.",
      "completedDefinition": "세 자리 수의 차를 가까운 몇백으로 어림하면 $482$는 $500$, $217$은 $200$으로 바꾸어 뺄 수 있다.",
      "student": "세 자리 수의 차를 가까운 몇백으로 어림하면 $482$는 □, $217$은 □으로 바꾸어 뺄 수 있다.",
      "expected": [
        "$500$",
        "$200$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-1-1-3-xc13",
          "answers": [
            "백"
          ],
          "alternativeAnswers": [],
          "reason": "'몇백으로'로 유일. '백 단위로'가 앞에 있어 답이 노출됨."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e3-1-1-3-xc13",
          "answers": [
            "500",
            "200"
          ],
          "alternativeAnswers": [],
          "reason": "482는 500에, 217은 200에 가깝다."
        }
      ],
      "authorReason": "세 자리 수·차·백 단위라는 목표를 본문에 명시해 어림 단위와 연산을 고정한다. 가림 검토 반영: 가까운 몇백으로 바꾸는 값을 묻고 차의 어림이라는 기존 목표를 유지한다."
    },
    {
      "id": "e3-1-2-1-xc19",
      "grade": "초3",
      "chapter": "평면도형",
      "termForEditorialIdentityOnly": "한 직선 위의 점들로 만드는 선분",
      "originalDefinition": "한 직선 위에 있는 점들도 {이웃하지 않은 두 점}을 끝점으로 하는 선분을 만들 수 있다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "한 직선 위에 있는 점들도 □을 끝점으로 하는 선분을 만들 수 있다.",
        "expected": [
          "이웃하지 않은 두 점"
        ],
        "reason": "학생의 자연스러운 답은 '두 점'이며 이것도 참이다. 기대 답의 핵심인 '이웃하지 않은'을 복원할 단서가 문장에 전혀 없다.",
        "proposal": "'이웃한 두 점뿐 아니라 □ 두 점을 끝점으로 하는 선분도'처럼 대비 구조를 넣는다."
      },
      "afterRawDefinition": "한 직선 위에 세 점이 있을 때, 가운데 점을 사이에 둔 양 끝의 {두 점}을 끝점으로 하는 선분도 만들 수 있다.",
      "completedDefinition": "한 직선 위에 세 점이 있을 때, 가운데 점을 사이에 둔 양 끝의 두 점을 끝점으로 하는 선분도 만들 수 있다.",
      "student": "한 직선 위에 세 점이 있을 때, 가운데 점을 사이에 둔 양 끝의 □을 끝점으로 하는 선분도 만들 수 있다.",
      "expected": [
        "두 점"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-1-2-1-xc19",
          "answers": [
            "두 점"
          ],
          "alternativeAnswers": [],
          "reason": "'두 점' 또는 '점'(동의)으로 복원됨. '세 점 가운데 가운데 점을 사이에 둔'은 낱말이 겹쳐 학생이 읽기에 어색함."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e3-1-2-1-xc19",
          "answers": [
            "두 점"
          ],
          "alternativeAnswers": [],
          "reason": "양 끝의 두 점을 끝점으로 하는 선분이다. '점'만 써도 같은 뜻이다."
        }
      ],
      "authorReason": "이웃하지 않은 조건을 학생 문장에 풀어 보이고 끝점 개수만 묻는다. 가림 검토 반영: 세 점 가운데 가운데라는 중복 표현을 줄인다."
    },
    {
      "id": "e3-1-2-3-xc17",
      "grade": "초3",
      "chapter": "평면도형",
      "termForEditorialIdentityOnly": "생활 속 직각삼각형",
      "originalDefinition": "{삼각자}처럼 생활 속 물건에서도 직각삼각형 모양을 찾을 수 있다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "□처럼 생활 속 물건에서도 직각삼각형 모양을 찾을 수 있다.",
        "expected": [
          "삼각자"
        ],
        "reason": "단원에서 직각을 찾는 도구로 쓰는 '삼각자'가 압도적으로 자연스럽다. 다만 예시를 묻는 열린 빈칸이어서 다른 올바른 물건도 배제되지 않는다.",
        "proposal": "'직각을 찾을 때 쓰는 □처럼'으로 단서를 주거나, 채점에서 타당한 예시를 인정한다."
      },
      "afterRawDefinition": "생활 속 물건인 삼각자는 한 각이 {직각}인 삼각형 모양이다.",
      "completedDefinition": "생활 속 물건인 삼각자는 한 각이 직각인 삼각형 모양이다.",
      "student": "생활 속 물건인 삼각자는 한 각이 □인 삼각형 모양이다.",
      "expected": [
        "직각"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-1-2-3-xc17",
          "answers": [
            "직각"
          ],
          "alternativeAnswers": [],
          "reason": "초3 범위에서는 '직각'으로 유일. 90°·30°·45°·60° 같은 각도 표현은 초4 이후라 범위 밖."
        }
      ],
      "authorReason": "임의의 생활 물건 예를 쓰게 하던 빈칸을 삼각자의 직각삼각형 성질로 좁힌다."
    },
    {
      "id": "e3-1-3-1-xc5",
      "grade": "초3",
      "chapter": "나눗셈",
      "termForEditorialIdentityOnly": "나누어 주는 상황의 몫",
      "originalDefinition": "$20\\div4$를 $4$명에게 나누어 주는 상황으로 보면 몫은 {한 사람이 받는 수}이다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "$20\\div4$를 $4$명에게 나누어 주는 상황으로 보면 몫은 □이다.",
        "expected": [
          "한 사람이 받는 수"
        ],
        "reason": "'몫은 □이다'는 값 '5'를 쓰는 것이 가장 자연스럽고 참이지만 기대 답은 몫의 의미다. 값과 의미 중 어느 종류를 써야 하는지 문장이 정해 주지 않는다.",
        "proposal": "'몫 5는 □를 나타낸다'로 바꿔 의미를 묻는다는 점을 드러낸다."
      },
      "afterRawDefinition": "$20$개를 $4$명에게 똑같이 나누는 $20\\div4$에서 몫은 한 {사람}이 받는 개수를 뜻한다.",
      "completedDefinition": "$20$개를 $4$명에게 똑같이 나누는 $20\\div4$에서 몫은 한 사람이 받는 개수를 뜻한다.",
      "student": "$20$개를 $4$명에게 똑같이 나누는 $20\\div4$에서 몫은 한 □이 받는 개수를 뜻한다.",
      "expected": [
        "사람"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-1-3-1-xc5",
          "answers": [
            "명"
          ],
          "alternativeAnswers": [],
          "reason": "'명' 또는 '사람'(동의). 문제없음."
        }
      ],
      "authorReason": "몫의 값이 아니라 뜻을 묻는다는 틀을 남기고 한 사람이 받는 개수라는 설명을 보존한다."
    },
    {
      "id": "e3-1-3-3-c3",
      "grade": "초3",
      "chapter": "나눗셈",
      "termForEditorialIdentityOnly": "곱셈식으로 몫 확인하기",
      "originalDefinition": "구한 몫에 나누는 수를 곱해 {나누어지는 수}와 같은지 확인한다.",
      "originalFinding": {
        "status": "not_issue",
        "student": "구한 몫에 나누는 수를 곱해 □와 같은지 확인한다.",
        "expected": [
          "나누어지는 수"
        ],
        "reason": "나머지 없는 나눗셈 단원에서 '몫 × 나누는 수 = 나누어지는 수'의 검산은 답이 하나로 정해진다. '전체' 같은 동의 표현만 허용하면 된다.",
        "proposal": "유지"
      },
      "afterRawDefinition": "나누어떨어지는 나눗셈은 구한 몫에 나누는 수를 곱해 {나누어지는 수}와 같은지 확인한다.",
      "completedDefinition": "나누어떨어지는 나눗셈은 구한 몫에 나누는 수를 곱해 나누어지는 수와 같은지 확인한다.",
      "student": "나누어떨어지는 나눗셈은 구한 몫에 나누는 수를 곱해 □와 같은지 확인한다.",
      "expected": [
        "나누어지는 수"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e3-1-3-3-c3",
          "answers": [
            "나누어지는 수"
          ],
          "alternativeAnswers": [],
          "reason": "유일. 조사 '와'도 맞음."
        }
      ],
      "authorReason": "나머지 없는 조건을 보여 검산 관계를 모든 사용처에서 참으로 만든다. 전체는 같은 뜻으로 인정한다."
    },
    {
      "id": "e4-1-2-6-c2",
      "grade": "초4",
      "chapter": "각도",
      "termForEditorialIdentityOnly": "사각형 각의 합이 되는 까닭",
      "originalDefinition": "사각형 안에 선을 그어 삼각형 {$2$개}로 가르면, 두 삼각형의 각도 합인 $180^\\circ$의 두 배를 얻는다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "사각형 안에 선을 그어 삼각형 □로 가르면, 두 삼각형의 각도 합인 $180^\\circ$의 두 배를 얻는다.",
        "expected": [
          "$2$개"
        ],
        "reason": "답 '2개'는 명료하다. 다만 바로 뒤의 '두 삼각형', '두 배'가 답을 노출하므로 명료성 결함이 아닌 답 노출 문제다.",
        "proposal": "삼각형 개수를 물으려면 뒤 절을 '삼각형의 각도 합 180°를 이용할 수 있다'로 바꾸거나, 빈칸을 360°로 옮긴다."
      },
      "afterRawDefinition": "사각형의 마주 보는 두 꼭짓점을 이으면 삼각형 $2$개로 나뉘므로, 사각형의 네 각의 합은 $180^\\circ\\times$ {$2$}이다.",
      "completedDefinition": "사각형의 마주 보는 두 꼭짓점을 이으면 삼각형 $2$개로 나뉘므로, 사각형의 네 각의 합은 $180^\\circ\\times$ $2$이다.",
      "student": "사각형의 마주 보는 두 꼭짓점을 이으면 삼각형 $2$개로 나뉘므로, 사각형의 네 각의 합은 $180^\\circ\\times$ □이다.",
      "expected": [
        "$2$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-1-2-6-c2",
          "answers": [
            "2"
          ],
          "alternativeAnswers": [],
          "reason": "유일. '삼각형 2개'가 바로 앞에 있어 답이 노출되지만 추론 흐름상 허용 가능."
        }
      ],
      "authorReason": "삼각형으로 나누는 설명은 남기되 빈칸을 곱하는 배수로 옮겨 뒤의 두 배를 그대로 옮기는 구조를 없앤다."
    },
    {
      "id": "e4-1-3-4-xc17",
      "grade": "초4",
      "chapter": "곱셈과 나눗셈",
      "termForEditorialIdentityOnly": "몫과 나머지를 이어 쓰기",
      "originalDefinition": "$130\\div40=3\\cdots10$처럼 몫과 나머지는 {$\\cdots$}로 이어 쓴다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "$130\\div40=3\\cdots10$처럼 몫과 나머지는 □로 이어 쓴다.",
        "expected": [
          "$\\cdots$"
        ],
        "reason": "예시 식에 기호가 그대로 있어 답은 명확하지만 베껴 쓰면 된다. 회상 목적이라면 효용이 낮다.",
        "proposal": "기호 대신 '130÷40의 몫 3과 나머지 10을 식으로 쓰면 □'처럼 식 전체를 쓰게 하거나 나머지의 의미를 묻는다."
      },
      "afterRawDefinition": "$130\\div40$의 몫 $3$과 나머지 $10$은 기호 {$\\cdots$}로 이어 쓴다.",
      "completedDefinition": "$130\\div40$의 몫 $3$과 나머지 $10$은 기호 $\\cdots$로 이어 쓴다.",
      "student": "$130\\div40$의 몫 $3$과 나머지 $10$은 기호 □로 이어 쓴다.",
      "expected": [
        "$\\cdots$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-1-3-4-xc17",
          "answers": [
            "…"
          ],
          "alternativeAnswers": [],
          "reason": "130÷40=3…10으로 유일. 기호 입력형이라 '⋯', '...' 등 표기 변형을 허용해야 함."
        }
      ],
      "authorReason": "완성 나눗셈식의 기호 노출을 없애고 몫과 나머지를 잇는 기호를 묻는다."
    },
    {
      "id": "e4-2-4-7-xc21",
      "grade": "초4",
      "chapter": "사각형",
      "termForEditorialIdentityOnly": "정사각형이 아닌 평행사변형 찾기",
      "originalDefinition": "평행사변형에 {둔각이 하나라도 있다면} 정사각형일 수 없다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "평행사변형에 □ 정사각형일 수 없다.",
        "expected": [
          "둔각이 하나라도 있다면"
        ],
        "reason": "조건절 전체가 비어 있어 각 조건인지 변 조건인지조차 알 수 없다. '이웃한 두 변의 길이가 다르면'은 '둔각이 있으면'과 동치가 아닌 별개의 참인 답이다.",
        "proposal": "'평행사변형에 □인 각이 하나라도 있다면'처럼 각의 종류만 묻도록 좁힌다."
      },
      "afterRawDefinition": "평행사변형에 둔각이 하나라도 있다면 네 각이 모두 {직각}이어야 하는 정사각형일 수 없다.",
      "completedDefinition": "평행사변형에 둔각이 하나라도 있다면 네 각이 모두 직각이어야 하는 정사각형일 수 없다.",
      "student": "평행사변형에 둔각이 하나라도 있다면 네 각이 모두 □이어야 하는 정사각형일 수 없다.",
      "expected": [
        "직각"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-2-4-7-xc21",
          "answers": [
            "직각"
          ],
          "alternativeAnswers": [],
          "reason": "'직각' 또는 '90°'(동의). 평행사변형에 둔각이 있으면 직각이 없으므로 명제도 참."
        }
      ],
      "authorReason": "조건절을 남기고 정사각형의 각 조건을 묻도록 해 변 길이 조건으로 바꾸는 대안을 막는다."
    },
    {
      "id": "e4-2-2-5-c2",
      "grade": "초4",
      "chapter": "삼각형",
      "termForEditorialIdentityOnly": "직각이등변삼각형",
      "originalDefinition": "한 각이 직각이고 두 변의 길이가 같다면 {직각삼각형}이면서 {이등변삼각형}이다.",
      "originalFinding": {
        "status": "not_issue",
        "student": "한 각이 직각이고 두 변의 길이가 같다면 □이면서 □이다.",
        "expected": [
          "직각삼각형",
          "이등변삼각형"
        ],
        "reason": "대단원이 '삼각형'이고 직각과 같은 두 변이 각각 직각삼각형, 이등변삼각형에 자연스럽게 대응한다. prior의 정사각형 반례는 단원 맥락을 무시한 것이다.",
        "proposal": "유지. 선택적으로 '삼각형에서'를 문두에 추가할 수 있다."
      },
      "afterRawDefinition": "한 각이 직각이고 두 변의 길이가 같은 삼각형은 각의 크기로 보면 {직각삼각형}, 변의 길이로 보면 {이등변삼각형}이다.",
      "completedDefinition": "한 각이 직각이고 두 변의 길이가 같은 삼각형은 각의 크기로 보면 직각삼각형, 변의 길이로 보면 이등변삼각형이다.",
      "student": "한 각이 직각이고 두 변의 길이가 같은 삼각형은 각의 크기로 보면 □, 변의 길이로 보면 □이다.",
      "expected": [
        "직각삼각형",
        "이등변삼각형"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-2-2-5-c2",
          "answers": [
            "직각삼각형",
            "이등변삼각형"
          ],
          "alternativeAnswers": [],
          "reason": "유일. 분류 기준이 문장에 명시되어 순서도 고정됨."
        }
      ],
      "authorReason": "삼각형임을 명시하고 두 분류 기준을 각각 붙여 답 순서와 도형 범위를 고정한다."
    },
    {
      "id": "e4-2-4-7-c4",
      "grade": "초4",
      "chapter": "사각형",
      "termForEditorialIdentityOnly": "여러 가지 사각형의 관계",
      "originalDefinition": "마름모와 직사각형은 마주 보는 변이 두 쌍 모두 평행하므로 {평행사변형}이고, 평행한 변이 있으므로 {사다리꼴}이기도 하다. 정사각형은 {마름모}이면서 {직사각형}이다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "마름모와 직사각형은 마주 보는 변이 두 쌍 모두 평행하므로 □이고, 평행한 변이 있으므로 □이기도 하다. 정사각형은 □이면서 □이다.",
        "expected": [
          "평행사변형",
          "사다리꼴",
          "마름모",
          "직사각형"
        ],
        "reason": "'정사각형은 마름모이면서 직사각형'은 익숙한 표준 문장이라 대체로 복원된다. 그러나 앞 문장이 평행사변형·사다리꼴을 다루고 있어 뒤의 두 빈칸에 그것을 써도 참이며, 이를 가르는 근거 절이 없다.",
        "proposal": "'정사각형은 네 변의 길이가 같으므로 □이고 네 각이 직각이므로 □이다'처럼 근거를 붙인다."
      },
      "afterRawDefinition": "마름모와 직사각형은 마주 보는 변이 두 쌍 모두 평행하므로 {평행사변형}, 한 쌍 이상 평행하므로 {사다리꼴}이기도 하다. 정사각형은 네 변의 길이가 모두 같아 {마름모}, 네 각이 모두 직각이라 {직사각형}이기도 하다.",
      "completedDefinition": "마름모와 직사각형은 마주 보는 변이 두 쌍 모두 평행하므로 평행사변형, 한 쌍 이상 평행하므로 사다리꼴이기도 하다. 정사각형은 네 변의 길이가 모두 같아 마름모, 네 각이 모두 직각이라 직사각형이기도 하다.",
      "student": "마름모와 직사각형은 마주 보는 변이 두 쌍 모두 평행하므로 □, 한 쌍 이상 평행하므로 □이기도 하다. 정사각형은 네 변의 길이가 모두 같아 □, 네 각이 모두 직각이라 □이기도 하다.",
      "expected": [
        "평행사변형",
        "사다리꼴",
        "마름모",
        "직사각형"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-2-4-7-c4",
          "answers": [
            "평행사변형",
            "사다리꼴",
            "마름모",
            "직사각형"
          ],
          "alternativeAnswers": [],
          "reason": "조건별로 유일하고 포함 관계도 정확함. 셋째·넷째 답인 '마름모', '직사각형'이 첫 문장 주어로 나와 있어 답이 일부 노출됨. 빈칸 4개는 학생 문장으로 다소 김."
        }
      ],
      "authorReason": "은행의 포함적 사다리꼴 정의를 유지하고 정사각형 분류에도 각 빈칸의 변·각 기준을 남긴다."
    },
    {
      "id": "e4-1-2-1-xc14",
      "grade": "초4",
      "chapter": "각도",
      "termForEditorialIdentityOnly": "세 각의 차례 정하기",
      "originalDefinition": "세 각의 크기를 비교할 때는 {두 각씩 겹쳐 보고} 차례를 정한다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "세 각의 크기를 비교할 때는 □ 차례를 정한다.",
        "expected": [
          "두 각씩 겹쳐 보고"
        ],
        "reason": "방법 구절 전체가 비어 있고 대단원(각도)에는 각도기 측정도 포함된다. '각도기로 재어'와 '두 각씩 겹쳐 보고'가 서로 다른 유효한 방법으로 공존한다. prior의 보류보다 강하게 본다.",
        "proposal": "'각도기 없이 세 각을 비교할 때는 두 각씩 □ 차례를 정한다'로 방법 범위를 좁힌다."
      },
      "afterRawDefinition": "각도기 없이 세 각의 크기를 비교할 때는 두 각씩 꼭짓점과 한 변을 맞추어 {겹쳐} 보고 차례를 정한다.",
      "completedDefinition": "각도기 없이 세 각의 크기를 비교할 때는 두 각씩 꼭짓점과 한 변을 맞추어 겹쳐 보고 차례를 정한다.",
      "student": "각도기 없이 세 각의 크기를 비교할 때는 두 각씩 꼭짓점과 한 변을 맞추어 □ 보고 차례를 정한다.",
      "expected": [
        "겹쳐"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-1-2-1-xc14",
          "answers": [
            "겹쳐"
          ],
          "alternativeAnswers": [],
          "reason": "'겹쳐', '포개어', '대어'(동의). 문제없음."
        }
      ],
      "authorReason": "측정 대신 겹침 비교를 한다는 조건과 맞추는 위치를 보여 절차 전체를 숨기지 않는다."
    },
    {
      "id": "e4-1-2-2-xc5",
      "grade": "초4",
      "chapter": "각도",
      "termForEditorialIdentityOnly": "각도기의 두 줄 눈금",
      "originalDefinition": "각도기에는 {안쪽 눈금}과 {바깥쪽 눈금}이 함께 있다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "각도기에는 □과 □이 함께 있다.",
        "expected": [
          "안쪽 눈금",
          "바깥쪽 눈금"
        ],
        "reason": "각도기에 '함께 있는' 두 가지로는 교과서 용어인 '중심'과 '밑금'도 조사까지 맞게 들어간다. 눈금 두 줄을 묻는다는 정보가 문장에 없다.",
        "proposal": "'각도기에는 눈금이 두 줄, 곧 □ 눈금과 □ 눈금이 함께 있다'로 바꾼다."
      },
      "afterRawDefinition": "각도기에는 한쪽 끝에서 시작하는 눈금과 반대쪽 끝에서 시작하는 눈금이 있어 눈금이 {두} 줄이다.",
      "completedDefinition": "각도기에는 한쪽 끝에서 시작하는 눈금과 반대쪽 끝에서 시작하는 눈금이 있어 눈금이 두 줄이다.",
      "student": "각도기에는 한쪽 끝에서 시작하는 눈금과 반대쪽 끝에서 시작하는 눈금이 있어 눈금이 □ 줄이다.",
      "expected": [
        "두"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-1-2-2-xc5",
          "answers": [
            "안쪽 눈금",
            "바깥쪽 눈금"
          ],
          "alternativeAnswers": [
            "눈금 | 눈금"
          ],
          "reason": "'안쪽에 있는 안쪽 눈금'처럼 동어반복이 되어 답이 그대로 노출되고 회상할 내용이 없음. '눈금'만 써도 참이라 답 범위도 불명확. 문항 재구성 권장."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e4-1-2-2-xc5",
          "answers": [
            "두"
          ],
          "alternativeAnswers": [],
          "reason": "각도기에는 안쪽 눈금과 바깥쪽 눈금, 두 줄이 있다. '2'도 같은 답이다."
        }
      ],
      "authorReason": "각도기의 요소 일반이 아니라 두 줄 눈금의 이름을 묻도록 명시한다. 가림 검토 반영: 안쪽·바깥쪽 이름의 답 반복과 눈금만 쓰는 대안을 없애고 눈금 두 줄의 구조를 묻는다."
    },
    {
      "id": "e4-1-6-5-xc14",
      "grade": "초4",
      "chapter": "규칙 찾기",
      "termForEditorialIdentityOnly": "계산하지 않고 빈칸 구하기 — 곱셈식",
      "originalDefinition": "곱이 같은 두 곱셈식에서 $0$이 아닌 한 수가 몇 배가 되면 다른 수는 {같은 수로 나눈 수}여야 등호가 성립한다.",
      "originalFinding": {
        "status": "not_issue",
        "student": "곱이 같은 두 곱셈식에서 $0$이 아닌 한 수가 몇 배가 되면 다른 수는 □여야 등호가 성립한다.",
        "expected": [
          "같은 수로 나눈 수"
        ],
        "reason": "한 수가 몇 배가 되면 다른 수는 그 수로 나누어야 한다는 내용이 하나로 정해진다. '그 몇으로 나눈 수' 같은 표현 차이만 있다.",
        "proposal": "유지. 채점에서 동치 표현을 허용한다."
      },
      "afterRawDefinition": "두 수가 모두 $0$이 아닌 곱셈식에서 곱을 같게 하려고 한 수를 $2$배로 바꾸면, 다른 수가 $2$로 나누어떨어질 때 그 수를 {$2$}로 나누어야 한다.",
      "completedDefinition": "두 수가 모두 $0$이 아닌 곱셈식에서 곱을 같게 하려고 한 수를 $2$배로 바꾸면, 다른 수가 $2$로 나누어떨어질 때 그 수를 $2$로 나누어야 한다.",
      "student": "두 수가 모두 $0$이 아닌 곱셈식에서 곱을 같게 하려고 한 수를 $2$배로 바꾸면, 다른 수가 $2$로 나누어떨어질 때 그 수를 □로 나누어야 한다.",
      "expected": [
        "$2$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-1-6-5-xc14",
          "answers": [
            "절반"
          ],
          "alternativeAnswers": [],
          "reason": "뜻은 '반/절반/2로 나눈 수'로 하나. 그러나 '반', '절반'은 조사가 '으로'라 '□로'와 맞지 않고, 조사에 맞는 '1/2배'는 초4 범위 밖(분수의 곱셈은 초5). '2로 나눈 수'가 학년에 맞음. 다른 수가 홀수이면 자연수가 되지 않는 점도 있음."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e4-1-6-5-xc14",
          "answers": [
            "2"
          ],
          "alternativeAnswers": [],
          "reason": "한 수를 2배 하면 다른 수를 2로 나누어야 곱이 같다. 바로 앞의 '2로 나누어떨어질 때'가 답을 상당히 드러낸다."
        }
      ],
      "authorReason": "몇 배의 지시 대상과 두 수의 0 예외를 명시하여 반대 수의 변화량을 고정한다. 가림 검토 반영: 자연수에서 홀수의 절반이 새 학년 밖 수가 되는 상황을 배제하고 나누는 수를 값으로 묻는다."
    },
    {
      "id": "e4-1-3-1-xc3",
      "grade": "초4",
      "chapter": "곱셈과 나눗셈",
      "termForEditorialIdentityOnly": "$10$을 곱한 수",
      "originalDefinition": "어떤 수에 $10$을 곱하면 그 수 끝에 {$0$을 하나} 붙인 수가 된다.",
      "originalFinding": {
        "status": "not_issue",
        "student": "어떤 수에 $10$을 곱하면 그 수 끝에 □ 붙인 수가 된다.",
        "expected": [
          "$0$을 하나"
        ],
        "reason": "(세 자리 수)×(몇십) 단원의 자연수 맥락에서 '0을 하나'가 자연스러운 단일 답이다. 소수 반례는 이 단원 범위 밖이다.",
        "proposal": "유지. 선택적으로 '어떤 자연수'로 다듬을 수 있다."
      },
      "afterRawDefinition": "자연수에 $10$을 곱하면 그 수 끝에 {$0$을 하나} 붙인 수가 된다.",
      "completedDefinition": "자연수에 $10$을 곱하면 그 수 끝에 $0$을 하나 붙인 수가 된다.",
      "student": "자연수에 $10$을 곱하면 그 수 끝에 □ 붙인 수가 된다.",
      "expected": [
        "$0$을 하나"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-1-3-1-xc3",
          "answers": [
            "0을 하나"
          ],
          "alternativeAnswers": [],
          "reason": "'0을 한 개', '0을 1개'(동의). 빈칸에 조사와 개수가 함께 들어가 응답 형태가 흔들릴 수 있음."
        }
      ],
      "authorReason": "자연수 조건을 본문에 보여 소수 반례를 배제한다. 0도 00이라는 표기로 같은 값을 나타낸다."
    },
    {
      "id": "e4-1-6-2-xc6",
      "grade": "초4",
      "chapter": "규칙 찾기",
      "termForEditorialIdentityOnly": "한 줄씩 늘어나는 배열",
      "originalDefinition": "{단계마다} 아래에 한 줄씩 더 놓는 규칙의 배열도 있다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "□ 아래에 한 줄씩 더 놓는 규칙의 배열도 있다.",
        "expected": [
          "단계마다"
        ],
        "reason": "문두 빈칸에 품사나 종류를 알려 주는 단서가 없다. '바둑돌을', '모형을', '순서마다' 등 서로 다른 성분이 모두 자연스럽게 들어가 '단계마다'를 특정할 수 없다.",
        "proposal": "'단계가 하나 늘 때마다 아래에 □씩 더 놓는'처럼 늘어나는 양을 묻는다."
      },
      "afterRawDefinition": "아래에 한 줄씩 더 놓는 도형 배열에서는 다음 단계마다 줄 수가 {$1$}씩 늘어난다.",
      "completedDefinition": "아래에 한 줄씩 더 놓는 도형 배열에서는 다음 단계마다 줄 수가 $1$씩 늘어난다.",
      "student": "아래에 한 줄씩 더 놓는 도형 배열에서는 다음 단계마다 줄 수가 □씩 늘어난다.",
      "expected": [
        "$1$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-1-6-2-xc6",
          "answers": [
            "1"
          ],
          "alternativeAnswers": [],
          "reason": "'1' 또는 '한 줄'(동의). '한 줄씩 더 놓는'이 앞에 있어 답이 노출됨."
        }
      ],
      "authorReason": "언제·무엇을 놓는지 모두 가능했던 문두 빈칸을 줄 수의 증가량으로 옮긴다."
    },
    {
      "id": "e4-2-2-2-xc19",
      "grade": "초4",
      "chapter": "삼각형",
      "termForEditorialIdentityOnly": "한 각만 알 때의 두 경우",
      "originalDefinition": "한 각이 $40^\\circ$인 이등변삼각형은 그 각이 같은 두 각 가운데 하나인지 {아닌지}에 따라 나머지 각이 달라진다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "한 각이 $40^\\circ$인 이등변삼각형은 그 각이 같은 두 각 가운데 하나인지 □에 따라 나머지 각이 달라진다.",
        "expected": [
          "아닌지"
        ],
        "reason": "'~인지 □에 따라' 구조에서 '아닌지'는 정해지지만(동의 표현으로 '나머지 한 각인지'), 수학적 판단이 아닌 문법 조각을 묻는다.",
        "proposal": "'그 각이 크기가 같은 두 각 가운데 하나이면 나머지 각은 □, 아니면 □'처럼 각도 값을 묻는다."
      },
      "afterRawDefinition": "한 각이 $40^\\circ$인 이등변삼각형은 그 각이 같은 두 각 중 하나이면 크기가 다른 나머지 한 각이 {$100$}도이고, 같은 두 각이 아닌 한 각이면 나머지 두 각은 각각 {$70$}도이다.",
      "completedDefinition": "한 각이 $40^\\circ$인 이등변삼각형은 그 각이 같은 두 각 중 하나이면 크기가 다른 나머지 한 각이 $100$도이고, 같은 두 각이 아닌 한 각이면 나머지 두 각은 각각 $70$도이다.",
      "student": "한 각이 $40^\\circ$인 이등변삼각형은 그 각이 같은 두 각 중 하나이면 크기가 다른 나머지 한 각이 □도이고, 같은 두 각이 아닌 한 각이면 나머지 두 각은 각각 □도이다.",
      "expected": [
        "$100$",
        "$70$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-2-2-2-xc19",
          "answers": [
            "100°",
            "70°"
          ],
          "alternativeAnswers": [
            "40° | 70°"
          ],
          "reason": "의도는 100°, 70°. 그런데 40°가 같은 두 각 중 하나이면 남는 각이 둘(40°, 100°)이라 '나머지 한 각'이 '같은 두 각 중 다른 하나'(40°)로도 읽힘. '크기가 다른 나머지 한 각'으로 한정 필요."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e4-2-2-2-xc19",
          "answers": [
            "100",
            "70"
          ],
          "alternativeAnswers": [],
          "reason": "180-40-40=100, (180-40)÷2=70이다. 경우를 문장에서 나누어 주어 답이 하나씩이다."
        }
      ],
      "authorReason": "문법 조각 아닌지를 없애고 40도인 각의 두 위치를 보인 뒤 서로 다른 나머지 각 값을 묻는다. 가림 검토 반영: 남은 두 각 중 40도와 100도를 혼동하지 않도록 크기가 다른 각으로 한정하고 도 단위를 보인다."
    },
    {
      "id": "e4-2-4-6-xc9",
      "grade": "초4",
      "chapter": "사각형",
      "termForEditorialIdentityOnly": "종이를 접어 자른 마름모",
      "originalDefinition": "종이를 {서로 수직인 선으로 두 번 접고} 접힌 두 변을 비스듬히 잘라 삼각형 조각을 펼치면 마름모가 된다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "종이를 □ 접힌 두 변을 비스듬히 잘라 삼각형 조각을 펼치면 마름모가 된다.",
        "expected": [
          "서로 수직인 선으로 두 번 접고"
        ],
        "reason": "학생은 '두 번 접고'나 '반으로 두 번 접어'까지는 자연스럽게 쓴다. 그러나 핵심 조건인 '서로 수직'을 써야 한다는 단서가 없어 응답 틀이 넓다.",
        "proposal": "'종이를 서로 □인 선으로 두 번 접고'처럼 두 접는 선의 관계만 빈칸으로 둔다."
      },
      "afterRawDefinition": "종이를 서로 {수직}인 선을 따라 두 번 접는다. 두 접힌 변 위의 점을 하나씩 곧게 이어 잘라 생긴 모서리 쪽 삼각형을 펼치면 마름모가 된다.",
      "completedDefinition": "종이를 서로 수직인 선을 따라 두 번 접는다. 두 접힌 변 위의 점을 하나씩 곧게 이어 잘라 생긴 모서리 쪽 삼각형을 펼치면 마름모가 된다.",
      "student": "종이를 서로 □인 선을 따라 두 번 접는다. 두 접힌 변 위의 점을 하나씩 곧게 이어 잘라 생긴 모서리 쪽 삼각형을 펼치면 마름모가 된다.",
      "expected": [
        "수직"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-2-4-6-xc9",
          "answers": [
            "수직"
          ],
          "alternativeAnswers": [],
          "reason": "'수직'으로 복원됨('직각으로 만나는'은 동의). '두 접힌 변을 가로지르는 선을 따라 비스듬히 잘라 모서리 쪽 삼각형 조각을'은 길고 복잡해 초4 학생 문장으로 어색함."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e4-2-4-6-xc9",
          "answers": [
            "수직"
          ],
          "alternativeAnswers": [],
          "reason": "수직인 두 선으로 접어야 펼쳤을 때 대각선이 수직으로 만나는 마름모가 된다. 평행 등 다른 관계로는 성립하지 않는다. '직각'은 같은 뜻의 학생 표현이다."
        }
      ],
      "authorReason": "접기 횟수·절단 위치를 보이고 마름모가 되는 핵심인 두 접는 선의 직각 관계만 묻는다. 가림 검토 반영: 접힌 두 변 위의 두 점을 잇는 절단으로 구체화하고 긴 한 문장을 나눈다."
    },
    {
      "id": "e4-1-1-1-xc15",
      "grade": "초4",
      "chapter": "큰 수",
      "termForEditorialIdentityOnly": "만의 자릿수",
      "originalDefinition": "$10000$은 {다섯 자리 수 가운데 가장 작은 수}이다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "$10000$은 □이다.",
        "expected": [
          "다섯 자리 수 가운데 가장 작은 수"
        ],
        "reason": "'10000은 □이다'만 남아 '만', '1000이 10개인 수' 등 참인 답이 무수히 많다. 답의 종류를 전혀 정할 수 없다.",
        "proposal": "'10000은 다섯 자리 수 가운데 가장 □ 수이다'로 바꾼다."
      },
      "afterRawDefinition": "$10000$은 가장 작은 {다섯} 자리 수이다.",
      "completedDefinition": "$10000$은 가장 작은 다섯 자리 수이다.",
      "student": "$10000$은 가장 작은 □ 자리 수이다.",
      "expected": [
        "다섯"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-1-1-1-xc15",
          "answers": [
            "다섯"
          ],
          "alternativeAnswers": [],
          "reason": "'다섯' 또는 '5'(동의). 유일."
        }
      ],
      "authorReason": "가장 작은 수와 자릿수라는 응답 틀을 남겨 만 등 값 이름과 구별한다."
    },
    {
      "id": "e4-1-1-2-xc26",
      "grade": "초4",
      "chapter": "큰 수",
      "termForEditorialIdentityOnly": "조건에 맞는 수 찾기",
      "originalDefinition": "조건이 여러 개인 다섯 자리 수를 찾을 때는 {높은 자리}부터 조건에 맞는 숫자를 하나씩 정한다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "조건이 여러 개인 다섯 자리 수를 찾을 때는 □부터 조건에 맞는 숫자를 하나씩 정한다.",
        "expected": [
          "높은 자리"
        ],
        "reason": "큰 수 단원 습관상 '높은 자리'를 쓸 가능성이 높다. 그러나 조건의 내용이 없어 '일의 자리부터'나 '분명한 조건부터'도 타당하며, 일반 전략으로서의 근거가 약하다.",
        "proposal": "'조건에 맞는 가장 큰(작은) 다섯 자리 수를 찾을 때는'처럼 높은 자리부터 정할 이유를 문장에 넣는다."
      },
      "afterRawDefinition": "주어진 숫자 카드로 가장 큰 다섯 자리 수를 만들 때는 {높은} 자리부터 큰 숫자를 놓는다.",
      "completedDefinition": "주어진 숫자 카드로 가장 큰 다섯 자리 수를 만들 때는 높은 자리부터 큰 숫자를 놓는다.",
      "student": "주어진 숫자 카드로 가장 큰 다섯 자리 수를 만들 때는 □ 자리부터 큰 숫자를 놓는다.",
      "expected": [
        "높은"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-1-1-2-xc26",
          "answers": [
            "높은"
          ],
          "alternativeAnswers": [],
          "reason": "'높은', '가장 높은', '만의', '왼쪽'은 다섯 자리 수에서 모두 같은 뜻. 표현 폭이 넓어 채점 허용 범위가 필요함."
        }
      ],
      "authorReason": "임의의 조건이면 성립하지 않는 전략을 가장 큰 수를 만드는 목표와 숫자 카드 조건으로 한정한다."
    },
    {
      "id": "e4-1-1-3-xc5",
      "grade": "초4",
      "chapter": "큰 수",
      "termForEditorialIdentityOnly": "만 단위로 끊어 읽기",
      "originalDefinition": "만 단위로 끊은 왼쪽 부분은 {만이 몇 개인지}를 나타낸다. $35270000$의 $3527$은 낱개가 아니라 만의 개수이므로, 이를 읽은 뒤 만을 붙인다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "만 단위로 끊은 왼쪽 부분은 □를 나타낸다. $35270000$의 $3527$은 낱개가 아니라 만의 개수이므로, 이를 읽은 뒤 만을 붙인다.",
        "expected": [
          "만이 몇 개인지"
        ],
        "reason": "뒤 문장의 '만의 개수' 덕분에 답은 명확하다. 다만 그 설명이 답을 그대로 노출하므로 명료성 결함이 아닌 답 노출 문제다.",
        "proposal": "뒤 문장을 '35270000의 3527은 낱개가 아니므로'로 줄이거나 빈칸을 뒤 문장으로 옮긴다."
      },
      "afterRawDefinition": "$35270000$을 만 단위로 끊어 읽을 때 왼쪽의 $3527$은 만의 {개수}를 나타내므로 이를 읽은 뒤 만을 붙인다.",
      "completedDefinition": "$35270000$을 만 단위로 끊어 읽을 때 왼쪽의 $3527$은 만의 개수를 나타내므로 이를 읽은 뒤 만을 붙인다.",
      "student": "$35270000$을 만 단위로 끊어 읽을 때 왼쪽의 $3527$은 만의 □를 나타내므로 이를 읽은 뒤 만을 붙인다.",
      "expected": [
        "개수"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-1-1-3-xc5",
          "answers": [
            "개수"
          ],
          "alternativeAnswers": [],
          "reason": "'개수' 또는 '수'(동의). '자리'를 쓰면 한 자리 숫자를 뜻해 틀림."
        }
      ],
      "authorReason": "만의 개수라는 답을 뒤에서 반복하지 않고 단위와 수를 남겨 답의 종류를 개수로 고정한다."
    },
    {
      "id": "e4-1-1-3-xc26",
      "grade": "초4",
      "chapter": "큰 수",
      "termForEditorialIdentityOnly": "만 단위를 붙여 짧게 쓰기",
      "originalDefinition": "사람 수나 돈처럼 큰 수는 $8240$만처럼 {만}을 붙여 짧게 쓰기도 한다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "사람 수나 돈처럼 큰 수는 $8240$만처럼 □을 붙여 짧게 쓰기도 한다.",
        "expected": [
          "만"
        ],
        "reason": "답 '만'이 예시 '8240만'에 그대로 있어 명료하지만 회상할 것이 없다.",
        "proposal": "'82400000은 □만으로 짧게 쓴다'처럼 변환한 값을 묻는다."
      },
      "afterRawDefinition": "$82400000$은 $8240$ 뒤에 단위 {만}을 붙여 짧게 나타낼 수 있다.",
      "completedDefinition": "$82400000$은 $8240$ 뒤에 단위 만을 붙여 짧게 나타낼 수 있다.",
      "student": "$82400000$은 $8240$ 뒤에 단위 □을 붙여 짧게 나타낼 수 있다.",
      "expected": [
        "만"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-1-1-3-xc26",
          "answers": [
            "만"
          ],
          "alternativeAnswers": [],
          "reason": "82400000=8240만으로 유일."
        }
      ],
      "authorReason": "완성 예시 8240만을 제거하고 같은 값의 두 표기를 연결하는 단위를 묻는다."
    },
    {
      "id": "e4-1-1-5-xc15",
      "grade": "초4",
      "chapter": "큰 수",
      "termForEditorialIdentityOnly": "조의 자릿수",
      "originalDefinition": "$1$조는 숫자가 {열세 개}인 열세 자리 수이다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "$1$조는 숫자가 □인 열세 자리 수이다.",
        "expected": [
          "열세 개"
        ],
        "reason": "답은 명확하지만 '열세 자리 수'가 답 '열세 개'를 그대로 노출한다.",
        "proposal": "'1조는 1 뒤에 0이 □개 붙은 □ 자리 수이다'로 바꾼다."
      },
      "afterRawDefinition": "$1$조는 숫자 $1$ 뒤에 $0$이 열두 개 붙으므로 {열세} 자리 수이다.",
      "completedDefinition": "$1$조는 숫자 $1$ 뒤에 $0$이 열두 개 붙으므로 열세 자리 수이다.",
      "student": "$1$조는 숫자 $1$ 뒤에 $0$이 열두 개 붙으므로 □ 자리 수이다.",
      "expected": [
        "열세"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-1-1-5-xc15",
          "answers": [
            "열세"
          ],
          "alternativeAnswers": [],
          "reason": "1 뒤에 0이 12개이므로 13자리. '13'도 동의."
        }
      ],
      "authorReason": "자리 수 정답 반복을 없애고 열두 개의 0과 앞의 1이라는 자릿수 근거를 유지한다."
    },
    {
      "id": "e4-1-1-5-xc27",
      "grade": "초4",
      "chapter": "큰 수",
      "termForEditorialIdentityOnly": "생활 속 조 단위",
      "originalDefinition": "나라 살림처럼 아주 큰 돈은 $650$조 원처럼 {조}를 붙여 나타낸다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "나라 살림처럼 아주 큰 돈은 $650$조 원처럼 □를 붙여 나타낸다.",
        "expected": [
          "조"
        ],
        "reason": "답 '조'가 예시 '650조 원'에 그대로 있어 명료하지만 답 노출이다.",
        "proposal": "'650000000000000원은 □조 원으로 나타낸다'처럼 값을 묻는다."
      },
      "afterRawDefinition": "나라 살림처럼 아주 큰 돈은 억의 만 배인 {조}를 단위로 나타내기도 한다.",
      "completedDefinition": "나라 살림처럼 아주 큰 돈은 억의 만 배인 조를 단위로 나타내기도 한다.",
      "student": "나라 살림처럼 아주 큰 돈은 억의 만 배인 □를 단위로 나타내기도 한다.",
      "expected": [
        "조"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-1-1-5-xc27",
          "answers": [
            "조"
          ],
          "alternativeAnswers": [],
          "reason": "억의 만 배는 조로 유일."
        }
      ],
      "authorReason": "650조라는 답 노출을 없애고 억과 조 사이의 단위 관계를 남긴다."
    },
    {
      "id": "e4-2-1-1-xc17",
      "grade": "초4",
      "chapter": "분수의 덧셈과 뺄셈",
      "termForEditorialIdentityOnly": "빈칸이 있는 분수 덧셈식",
      "originalDefinition": "분모가 같은 덧셈식의 빈칸은 {조각이 몇 개 더 있어야 하는지}로 구한다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "분모가 같은 덧셈식의 빈칸은 □로 구한다.",
        "expected": [
          "조각이 몇 개 더 있어야 하는지"
        ],
        "reason": "덧셈식과 빈칸의 위치가 제시되지 않았다. 합을 구하는지 더하는 수를 구하는지에 따라 방법이 다르고, '뺄셈'이나 '분자의 차' 등 답의 형태도 정해지지 않는다.",
        "proposal": "'1/5+□=3/5처럼 더하는 수가 빈칸이면'이라고 식을 제시하고 구하는 방법이나 값을 묻는다."
      },
      "afterRawDefinition": "같은 크기의 조각이 $7$개가 되게 하려면 $\\frac{3}{8}+\\frac{\\triangle}{8}=\\frac{7}{8}$에서 더 필요한 조각 수를 구한다. $\\triangle$에는 {$4$}가 들어간다.",
      "completedDefinition": "같은 크기의 조각이 $7$개가 되게 하려면 $\\frac{3}{8}+\\frac{\\triangle}{8}=\\frac{7}{8}$에서 더 필요한 조각 수를 구한다. $\\triangle$에는 $4$가 들어간다.",
      "student": "같은 크기의 조각이 $7$개가 되게 하려면 $\\frac{3}{8}+\\frac{\\triangle}{8}=\\frac{7}{8}$에서 더 필요한 조각 수를 구한다. $\\triangle$에는 □가 들어간다.",
      "expected": [
        "$4$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-2-1-1-xc17",
          "answers": [
            "4"
          ],
          "alternativeAnswers": [],
          "reason": "3+△=7에서 4로 유일."
        }
      ],
      "authorReason": "분모 같은 덧셈과 빈칸 위치를 실제 식으로 보여 조각이 몇 개 더 필요한지 짧은 값으로 묻는다."
    },
    {
      "id": "e4-2-1-1-xc18",
      "grade": "초4",
      "chapter": "분수의 덧셈과 뺄셈",
      "termForEditorialIdentityOnly": "같은 전체의 분수끼리 더하기",
      "originalDefinition": "분수로 나타낸 두 양을 분자끼리 더하려면 {기준이 되는 전체}가 같아야 한다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "분수로 나타낸 두 양을 분자끼리 더하려면 □가 같아야 한다.",
        "expected": [
          "기준이 되는 전체"
        ],
        "reason": "'분자끼리 더하려면 □가 같아야 한다'에는 '분모'가 가장 자연스럽고 참이며 조사도 맞는다. 이는 기대 답 '기준이 되는 전체'와 다른 수학적 조건이다.",
        "proposal": "'분모가 같더라도 □가 같아야 분자끼리 더할 수 있다'로 바꾼다."
      },
      "afterRawDefinition": "분모가 같은 두 분수로 나타낸 양을 분자끼리 더하려면, 똑같이 나누기 전의 {전체} 크기도 같아야 한다.",
      "completedDefinition": "분모가 같은 두 분수로 나타낸 양을 분자끼리 더하려면, 똑같이 나누기 전의 전체 크기도 같아야 한다.",
      "student": "분모가 같은 두 분수로 나타낸 양을 분자끼리 더하려면, 똑같이 나누기 전의 □ 크기도 같아야 한다.",
      "expected": [
        "전체"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-2-1-1-xc18",
          "answers": [
            "전체"
          ],
          "alternativeAnswers": [
            "단위분수"
          ],
          "reason": "의도는 '전체'(또는 '1'). '단위분수'도 조사에 맞고 참이지만 초점이 다름. '기준이 되는'만으로는 덜 고정되어 '똑같이 나누기 전의'처럼 한정하면 좋음."
        },
        {
          "name": "e3e4-blind-corrected-1",
          "id": "e4-2-1-1-xc18",
          "answers": [
            "전체"
          ],
          "alternativeAnswers": [],
          "reason": "전체(기준량)의 크기가 같아야 분자끼리 더할 수 있다. '처음', '원래'는 같은 뜻이다."
        }
      ],
      "authorReason": "분모가 같다는 조건을 먼저 보이고 양의 기준 전체 크기라는 별도 조건을 고정한다. 가림 검토 반영: 단위분수를 만드는 조각과 나누기 전 전체를 구별한다."
    },
    {
      "id": "e4-2-2-2-xc3",
      "grade": "초4",
      "chapter": "삼각형",
      "termForEditorialIdentityOnly": "같은 두 각 가운데 하나를 알 때",
      "originalDefinition": "이등변삼각형에서 크기가 같은 두 각 중 하나가 $50^\\circ$이면 다른 하나도 {같은 크기인} $50^\\circ$이다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "이등변삼각형에서 크기가 같은 두 각 중 하나가 $50^\\circ$이면 다른 하나도 □ $50^\\circ$이다.",
        "expected": [
          "같은 크기인"
        ],
        "reason": "빈칸 없이도 문장이 완결되며 값 50°도 이미 주어져 있다. 들어갈 말이 '역시', '똑같이' 등 임의의 수식어가 되어 학생이 무엇을 써야 할지 정할 수 없다.",
        "proposal": "'다른 하나도 □이다'로 바꿔 50°를 묻는다."
      },
      "afterRawDefinition": "이등변삼각형에서 크기가 같은 두 각 중 하나가 $50^\\circ$이면 다른 하나의 크기도 {$50^\\circ$}이다.",
      "completedDefinition": "이등변삼각형에서 크기가 같은 두 각 중 하나가 $50^\\circ$이면 다른 하나의 크기도 $50^\\circ$이다.",
      "student": "이등변삼각형에서 크기가 같은 두 각 중 하나가 $50^\\circ$이면 다른 하나의 크기도 □이다.",
      "expected": [
        "$50^\\circ$"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-2-2-2-xc3",
          "answers": [
            "50°"
          ],
          "alternativeAnswers": [],
          "reason": "유일. 문장 안의 50°를 그대로 쓰는 것이 문항 의도라 문제없음."
        }
      ],
      "authorReason": "값을 노출한 임의 수식어 대신 같은 각의 크기를 묻는다."
    },
    {
      "id": "e4-2-3-1-xc25",
      "grade": "초4",
      "chapter": "소수의 덧셈과 뺄셈",
      "termForEditorialIdentityOnly": "가장 큰 소수 만들기",
      "originalDefinition": "숫자 카드를 한 번씩 쓰고 소수점의 자리가 정해져 있으면 {높은 자리부터 큰 숫자를} 놓는다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "숫자 카드를 한 번씩 쓰고 소수점의 자리가 정해져 있으면 □ 놓는다.",
        "expected": [
          "높은 자리부터 큰 숫자를"
        ],
        "reason": "term이 가려져 '가장 큰 소수'라는 목표가 문장에 없다. 가장 작은 수를 만들 때는 반대 배치가 되므로 놓는 순서를 정할 수 없다.",
        "proposal": "'가장 큰 소수를 만들려면'을 문장에 넣는다."
      },
      "afterRawDefinition": "숫자 카드를 한 번씩 쓰고 소수점의 위치가 정해져 있을 때 가장 큰 소수를 만들려면 높은 자리부터 {큰} 숫자를 놓는다.",
      "completedDefinition": "숫자 카드를 한 번씩 쓰고 소수점의 위치가 정해져 있을 때 가장 큰 소수를 만들려면 높은 자리부터 큰 숫자를 놓는다.",
      "student": "숫자 카드를 한 번씩 쓰고 소수점의 위치가 정해져 있을 때 가장 큰 소수를 만들려면 높은 자리부터 □ 숫자를 놓는다.",
      "expected": [
        "큰"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-2-3-1-xc25",
          "answers": [
            "큰"
          ],
          "alternativeAnswers": [],
          "reason": "유일. 소수점 위치가 고정이므로 명제도 참."
        }
      ],
      "authorReason": "가장 큰 소수라는 목표와 정해진 소수점 위치를 보이고 크기 순서만 묻는다."
    },
    {
      "id": "e4-2-4-4-xc13",
      "grade": "초4",
      "chapter": "사각형",
      "termForEditorialIdentityOnly": "직각이 있는 사다리꼴",
      "originalDefinition": "사다리꼴 가운데에는 직각이 {두 개} 있는 것도 있다.",
      "originalFinding": {
        "status": "needs_review",
        "student": "사다리꼴 가운데에는 직각이 □ 있는 것도 있다.",
        "expected": [
          "두 개"
        ],
        "reason": "'있는 것도 있다'의 자연스러운 답은 '두 개'이고 한 개나 세 개는 불가능하다. 다만 같은 문제은행(e4-2-4-7-c4)이 직사각형을 사다리꼴로 인정하므로 '네 개'도 참이다.",
        "proposal": "'직각이 꼭 □만 있는 것도 있다'로 다듬거나 채점에서 '네 개'도 인정한다."
      },
      "afterRawDefinition": "직사각형이 아닌 사다리꼴에 직각이 있으면 직각은 {두} 개이다.",
      "completedDefinition": "직사각형이 아닌 사다리꼴에 직각이 있으면 직각은 두 개이다.",
      "student": "직사각형이 아닌 사다리꼴에 직각이 있으면 직각은 □ 개이다.",
      "expected": [
        "두"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-2-4-4-xc13",
          "answers": [
            "2"
          ],
          "alternativeAnswers": [],
          "reason": "평행한 변 사이의 이웃한 두 각의 합이 180°라 직각은 짝으로 생기고, 나머지 두 각까지 직각이면 직사각형이므로 정확히 2개. '두'도 동의."
        }
      ],
      "authorReason": "포함적 사다리꼴 분류에서 직각 네 개인 직사각형을 배제하여 개수를 고정한다."
    },
    {
      "id": "e4-2-4-7-xc14",
      "grade": "초4",
      "chapter": "사각형",
      "termForEditorialIdentityOnly": "직각 없는 마름모의 분류",
      "originalDefinition": "직각이 없는 마름모는 변 길이가 같아도 {직사각형}으로 부를 수 없다.",
      "originalFinding": {
        "status": "confirmed",
        "student": "직각이 없는 마름모는 변 길이가 같아도 □으로 부를 수 없다.",
        "expected": [
          "직사각형"
        ],
        "reason": "'변 길이가 같아도'라는 단서는 오히려 '정사각형'을 더 강하게 떠올리게 하며, 정사각형도 참이고 조사도 맞는다. 기대 답 '직사각형'을 고를 근거가 없다.",
        "proposal": "'변 길이가 같아도'를 빼고 '네 각이 모두 직각인 □으로 부를 수 없다'로 하거나, 정사각형을 정답으로 재설계한다."
      },
      "afterRawDefinition": "직각이 없는 마름모는 네 각이 모두 {직각}이어야 하는 직사각형으로 부를 수 없다.",
      "completedDefinition": "직각이 없는 마름모는 네 각이 모두 직각이어야 하는 직사각형으로 부를 수 없다.",
      "student": "직각이 없는 마름모는 네 각이 모두 □이어야 하는 직사각형으로 부를 수 없다.",
      "expected": [
        "직각"
      ],
      "blindReplies": [
        {
          "name": "e3e4-blind-1",
          "id": "e4-2-4-7-xc14",
          "answers": [
            "직각"
          ],
          "alternativeAnswers": [],
          "reason": "'직각' 또는 '90°'(동의). 문장 첫머리 '직각이 없는'에 답 낱말이 그대로 노출됨."
        }
      ],
      "authorReason": "임의 도형 이름을 묻지 않고 직사각형 분류에 필요한 각 조건을 묻는다."
    }
  ]
}
