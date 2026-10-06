독립 최종 원고 검토다. 모든 항목의 현재 after 원문, 완성 정의, 실제 학생 문장, 기대 답, 이전 가림 풀이, 원 감사 지적을 함께 제공한다. 답의 맞음은 문자열이 아니라 의미로 판단하라. 동의어·동치식·같은 수량의 표기 차이는 허용하고 별개의 참인 완성, 순서를 바꿔도 다른 뜻으로 참인 답, 조건·대상·연산이 사라진 빈칸, 0·1·부호·정의역·포함 관계, 정답 글자 직접 반복, 긴 절 전체 가리기, 수식과 학년 용어를 검토하라. 기대 답이나 가림 검토자에게 맞추지 말고 유효한 반례가 있으면 반드시 revise로 판정하라. 다음 제약을 확인하라: 같은 의미 표현은 허용하며 추론을 위한 조건·수치 노출 자체는 결함이 아니다; 이유 설명은 완성 정의에 보존해야 한다; 기존 은행의 학년·개념·기존 용어를 유지하는 교정이며 교육과정 전수 검증은 이번 범위가 아니다; 계급값 등 새 용어는 도입하지 않았다. 기존 반례·최댓값·최솟값·다문자 인수분해 용어의 수록 학년은 이번에 변경하지 않는다. 도구 없이 각 항목을 읽고 JSON {"cases":[{"id":"...","verdict":"pass" 또는 "revise","reason":"...","proposal":"수정 필요 시 구체적 after 제안"}]}만 반환하라.

{
  "cases": [
    {
      "id": "m1-04-02-xc3",
      "grade": "m1",
      "chapter": "4. 그래프와 비례",
      "after": "$x$좌표와 $y$좌표가 모두 음수인 점들이 있는 부분을 {제$3$사분면}이라 한다.",
      "completedDefinition": "$x$좌표와 $y$좌표가 모두 음수인 점들이 있는 부분을 제$3$사분면이라 한다.",
      "studentSentence": "$x$좌표와 $y$좌표가 모두 음수인 점들이 있는 부분을 □이라 한다.",
      "expectedAnswers": [
        "제$3$사분면"
      ],
      "blindResponse": {
        "id": "m1-04-02-xc3",
        "answers": [
          "제3사분면"
        ],
        "alternativeAnswers": [],
        "reason": "답이 하나로 정해지고 조사 '이라'와도 맞는다. 문제 없음."
      },
      "originalFinding": {
        "id": "m1-04-02-xc3",
        "grade": "m1",
        "section": "중1::4. 그래프와 비례::순서쌍과 좌표평면(응용)",
        "sourceHash": "cd40fc15eec2c3ce794d46f96875fadde5486e81ee5e572f642bfdac643da927",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "$x$좌표와 $y$좌표가 모두 □인 점들이 있는 부분이 □이다.",
        "expected": [
          "음수",
          "제$3$사분면"
        ],
        "reason": "xc1과 학생 문장이 사실상 같은데 기대답만 음수/제3사분면이다. 학생은 두 문항을 구별할 수 없다.",
        "proposal": "'모두 음수인'을 남기고 사분면만 묻거나 그 반대로 한다.",
        "primaryReason": "두 좌표의 부호와 사분면 이름을 모두 빈칸으로 가려, 학생에게는 '두 좌표가 모두 □인 점들이 있는 부분'만 남는다. 양수와 제1사분면, 음수와 제3사분면은 서로 다른 내용인데 모두 문장을 참으로 완성한다.",
        "primaryProposal": "좌표의 부호 또는 사분면 이름 중 하나를 남기고 나머지를 묻는다.",
        "initialAlternativeAnswers": [
          "양수 / 제1사분면"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "두 좌표가 음수라는 조건을 노출하여 양수/제1사분면 쌍과 구별했다. 축 위의 점은 음수 조건을 만족하지 않는다."
    },
    {
      "id": "m1-04-03-xc21",
      "grade": "m1",
      "chapter": "4. 그래프와 비례",
      "after": "$x$가 경과 시간을 나타내는 두 그래프에서, 같은 양을 나타내는 $y$값에 닿는 두 {$x$값}의 차가 그 일이 일어난 시간 차이다.",
      "completedDefinition": "$x$가 경과 시간을 나타내는 두 그래프에서, 같은 양을 나타내는 $y$값에 닿는 두 $x$값의 차가 그 일이 일어난 시간 차이다.",
      "studentSentence": "$x$가 경과 시간을 나타내는 두 그래프에서, 같은 양을 나타내는 $y$값에 닿는 두 □의 차가 그 일이 일어난 시간 차이다.",
      "expectedAnswers": [
        "$x$값"
      ],
      "blindResponse": {
        "id": "m1-04-03-xc21",
        "answers": [
          "$x$좌표"
        ],
        "alternativeAnswers": [],
        "reason": "'$x$의 값', '$x$값', '시간'은 같은 뜻이므로 채점에서 허용해야 한다. 다만 'y값에 닿는 두 □'라는 표현이 모호하다. '두 그래프가 같은 y의 값이 되는 때의 x좌표'처럼 다듬기를 권한다."
      },
      "originalFinding": {
        "id": "m1-04-03-xc21",
        "grade": "m1",
        "section": "중1::4. 그래프와 비례::그래프의 이해",
        "sourceHash": "46f37ea458f759a6cab7c951bb94fd2951207998e4683baef280b5da190112ae",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "hidden-condition",
        "student": "두 그래프가 같은 □에 닿는 두 □의 차가 그 일이 일어난 시간 차이다.",
        "expected": [
          "$y$값",
          "$x$값"
        ],
        "reason": "가로축이 시간이라는 전제가 없어 '거리/시각', '위치/시간'처럼 뜻은 같지만 표현이 다른 답이 나오기 쉽다. 관례상 y값/x값으로 수렴하므로 답 불능까지는 아니다.",
        "proposal": "'x축이 시간, y축이 거리인 두 그래프에서'를 앞에 명시하고 좌표·값 표현을 폭넓게 인정한다.",
        "primaryReason": "x가 경과 시간이라는 조건 없이 x값의 차를 시간 차라고 한다. 가로축이 무엇인지 정해져야 시간 차에 해당하는 좌표를 고를 수 있다.",
        "primaryProposal": "가로축은 시간, 세로축은 비교하려는 양이라는 조건을 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "x가 경과 시간이고 두 y값이 같은 양이라는 전제를 명시했다. 시간 차를 읽는 좌표가 x값임을 묻고 뜻과 변수를 고정했다."
    },
    {
      "id": "m1-04-04-xc1",
      "grade": "m1",
      "chapter": "4. 그래프와 비례",
      "after": "표에서 정비례 관계인지 확인할 때에는 $x$가 $2$배, $3$배가 될 때 $y$도 각각 {같은 배}가 되는지 확인한다.",
      "completedDefinition": "표에서 정비례 관계인지 확인할 때에는 $x$가 $2$배, $3$배가 될 때 $y$도 각각 같은 배가 되는지 확인한다.",
      "studentSentence": "표에서 정비례 관계인지 확인할 때에는 $x$가 $2$배, $3$배가 될 때 $y$도 각각 □가 되는지 확인한다.",
      "expectedAnswers": [
        "같은 배"
      ],
      "blindResponse": {
        "id": "m1-04-04-xc1",
        "answers": [
          "$2$배, $3$배"
        ],
        "alternativeAnswers": [],
        "reason": "답이 하나로 정해진다. 앞 구절 '2배, 3배'가 그대로 답이 되지만 정비례의 뜻을 확인하는 의도된 구조라 허용할 수 있다."
      },
      "originalFinding": {
        "id": "m1-04-04-xc1",
        "grade": "m1",
        "section": "중1::4. 그래프와 비례::정비례 관계 y=ax의 그래프",
        "sourceHash": "caf9518e521d949b4d4df856758b94fb9a6abbd55a0d57c2c8e95d052efa1d0c",
        "status": "not_issue",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "표에서 $x$가 $2$배, $3$배가 될 때 $y$도 □가 되는지 □한다.",
        "expected": [
          "같은 배",
          "확인"
        ],
        "reason": "조사 'y도'가 같은 방향 변화를 지시하므로 '같은 배(2배, 3배)'로 자연스럽게 정해지고, 반비례 답은 문장에 맞지 않는다. prior가 든 1/2배, 1/3배 대안은 성립하지 않는다.",
        "proposal": "유지. '2배, 3배'와 '조사·판단'을 동의 답으로 인정한다.",
        "primaryReason": "표도 주어지지 않고 정비례·반비례 중 무엇을 확인하는 절차인지도 남아 있지 않다. 'x가 2배, 3배가 될 때 y가/도 □ 되는지 확인'만으로 기대되는 배율을 정할 수 없다.",
        "primaryProposal": "정비례 또는 반비례 관계인지 확인한다는 목적을 문장 앞에 명시한다.",
        "initialAlternativeAnswers": [
          "1/2배, 1/3배"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "정비례 확인이라는 목표를 명시하여 반비례 변화와 구별했다. 같은 배와 2배·3배는 같은 뜻이며 범용 서술어 확인 빈칸은 제거했다."
    },
    {
      "id": "m1-04-04-xc8",
      "grade": "m1",
      "chapter": "4. 그래프와 비례",
      "after": "정비례 관계 $y=ax$에서 $a>0$이면 $x$의 값이 커질 때 $y$의 값도 {커지고}, $a<0$이면 $y$의 값은 {작아진다}.",
      "completedDefinition": "정비례 관계 $y=ax$에서 $a>0$이면 $x$의 값이 커질 때 $y$의 값도 커지고, $a<0$이면 $y$의 값은 작아진다.",
      "studentSentence": "정비례 관계 $y=ax$에서 $a>0$이면 $x$의 값이 커질 때 $y$의 값도 □, $a<0$이면 $y$의 값은 □.",
      "expectedAnswers": [
        "커지고",
        "작아진다"
      ],
      "blindResponse": {
        "id": "m1-04-04-xc8",
        "answers": [
          "커지고",
          "작아진다"
        ],
        "alternativeAnswers": [],
        "reason": "'증가하고/감소한다'는 같은 뜻이다. 수학적으로 정확하고 중1 수준에 맞다."
      },
      "originalFinding": {
        "id": "m1-04-04-xc8",
        "grade": "m1",
        "section": "중1::4. 그래프와 비례::정비례 관계 y=ax의 그래프",
        "sourceHash": "71130647401677e1b8c8919136f6625029922d88b13a72e70a25aaa06dfa9d47",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "$a>0$이면 $x$의 값이 커질 때 $y$의 값도 □, $a<0$이면 $y$의 값은 □.",
        "expected": [
          "커지고",
          "작아진다"
        ],
        "reason": "y=ax가 문장에 없고, 같은 대단원의 y=a/x에서는 증감이 반대가 된다. 그래도 'y의 값도'라는 조사 덕에 커지고/작아진다가 자연스러운 단일 답이라 답 불능은 아니다.",
        "proposal": "'정비례 관계 y=ax에서'를 문장 앞에 넣는다(수정 권장).",
        "primaryReason": "a의 부호와 x, y의 증감만 있고 세 문자 사이의 관계식이 없다. y=ax라는 단원이 보이지 않는 독립 학생 문장에서는 y의 증감을 결정할 수 없다.",
        "primaryProposal": "y=ax라는 관계식을 문장에 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "a>0일 때 y=ax는 증가하지만 y=-ax는 감소한다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "관계식 y=ax를 명시하여 반비례에서는 증감이 반대라는 반례를 배제했다. a의 부호에 따른 변화 설명을 유지했다."
    },
    {
      "id": "m1-04-05-xc1",
      "grade": "m1",
      "chapter": "4. 그래프와 비례",
      "after": "표에서 반비례 관계인지 확인할 때에는 $x$가 $2$배, $3$배가 될 때 $y$가 각각 {$\\frac{1}{2}$배, $\\frac{1}{3}$배}가 되는지 확인한다.",
      "completedDefinition": "표에서 반비례 관계인지 확인할 때에는 $x$가 $2$배, $3$배가 될 때 $y$가 각각 $\\frac{1}{2}$배, $\\frac{1}{3}$배가 되는지 확인한다.",
      "studentSentence": "표에서 반비례 관계인지 확인할 때에는 $x$가 $2$배, $3$배가 될 때 $y$가 각각 □가 되는지 확인한다.",
      "expectedAnswers": [
        "$\\frac{1}{2}$배, $\\frac{1}{3}$배"
      ],
      "blindResponse": {
        "id": "m1-04-05-xc1",
        "answers": [
          "$\\frac{1}{2}$배, $\\frac{1}{3}$배"
        ],
        "alternativeAnswers": [],
        "reason": "답이 하나로 정해진다. 문제 없음."
      },
      "originalFinding": {
        "id": "m1-04-05-xc1",
        "grade": "m1",
        "section": "중1::4. 그래프와 비례::반비례 관계 y=a/x의 그래프",
        "sourceHash": "c037b77061de39db00e82261ffcf2808f3a2a4256a42553ad148d350d2064cae",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "표에서 $x$가 $2$배, $3$배가 될 때 $y$가 □가 되는지 확인한다.",
        "expected": [
          "$\\frac{1}{2}$배, $\\frac{1}{3}$배"
        ],
        "reason": "'y가 □가 되는지'에는 방향 단서가 없다. 정비례 확인(2배, 3배)과 반비례 확인(1/2배, 1/3배)이 모두 올바른 절차이고 대단원에 둘 다 있다.",
        "proposal": "'반비례 관계인지 알아보려면'을 문장 앞에 명시한다.",
        "primaryReason": "표도 주어지지 않고 정비례·반비례 중 무엇을 확인하는 절차인지도 남아 있지 않다. 'x가 2배, 3배가 될 때 y가/도 □ 되는지 확인'만으로 기대되는 배율을 정할 수 없다.",
        "primaryProposal": "정비례 또는 반비례 관계인지 확인한다는 목적을 문장 앞에 명시한다.",
        "initialAlternativeAnswers": [
          "2배, 3배"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "반비례를 확인하는 목표를 노출하여 2배·3배인 정비례 절차 답을 배제했다. x와 y의 배수 순서 대응을 각각으로 분명히 했다."
    },
    {
      "id": "m1-04-05-xc23",
      "grade": "m1",
      "chapter": "4. 그래프와 비례",
      "after": "전체 양을 한 몫씩 나누는 반비례 관계 $y=\\frac{a}{x}$에서, 전체 양과 한 몫의 단위가 다르면 {같은 단위}로 고친다. 이때 $x$는 한 몫의 양, $y$는 몫의 수이며, 두 수의 곱인 {$a$}가 전체 양이다.",
      "completedDefinition": "전체 양을 한 몫씩 나누는 반비례 관계 $y=\\frac{a}{x}$에서, 전체 양과 한 몫의 단위가 다르면 같은 단위로 고친다. 이때 $x$는 한 몫의 양, $y$는 몫의 수이며, 두 수의 곱인 $a$가 전체 양이다.",
      "studentSentence": "전체 양을 한 몫씩 나누는 반비례 관계 $y=\\frac{a}{x}$에서, 전체 양과 한 몫의 단위가 다르면 □로 고친다. 이때 $x$는 한 몫의 양, $y$는 몫의 수이며, 두 수의 곱인 □가 전체 양이다.",
      "expectedAnswers": [
        "같은 단위",
        "$a$"
      ],
      "blindResponse": {
        "id": "m1-04-05-xc23",
        "answers": [
          "같은 단위",
          "$a$"
        ],
        "alternativeAnswers": [],
        "reason": "둘째 빈칸은 $a$와 $xy$가 모두 들어갈 수 있다. 두 식은 관계식에서 같은 값이라 다른 의미의 대안은 아니지만, 기대 답 표기가 하나로 정해지지 않으므로 채점에서 둘 다 허용하거나 '비례상수 □'처럼 문장을 좁혀야 한다. '한 몫씩 나누는'은 어색하니 '똑같은 양씩 나누는' 정도로 고치기를 권한다."
      },
      "originalFinding": {
        "id": "m1-04-05-xc23",
        "grade": "m1",
        "section": "중1::4. 그래프와 비례::반비례 관계 y=a/x의 그래프",
        "sourceHash": "0e56d0ed9776b3e8567bbdc7bcf01594145f8e58eb52da285c5c76b4d1916ed3",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "전체 양과 한 몫을 나타낸 단위가 다르면 □로 고친 뒤 □를 구한다.",
        "expected": [
          "같은 단위",
          "$a$"
        ],
        "reason": "둘째 빈칸의 기대답 a는 문장에 정의되지 않은 문자다. 학생은 관계식·비례상수·전체 양 가운데 무엇을 써야 할지 알 수 없다.",
        "proposal": "'반비례 관계 y=a/x에서'를 넣고 a가 전체 양임을 드러내거나, 빈칸을 '비례상수'류 용어로 바꾼다.",
        "primaryReason": "단위를 맞춘 뒤 무엇을 구하려는 문제인지, a가 무엇을 나타내는지 제시되지 않는다. 기대답이 문자 a 하나이지만 학생 문장에는 그 문자를 선택할 근거가 없다.",
        "primaryProposal": "전체 양, 한 몫, 사람 수의 관계식과 a가 전체 양이라는 뜻을 함께 제시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "반비례 관계식과 x,y,a의 의미를 명시했다. 전체 양과 한 몫은 같은 종류의 양임을 드러내고 단위를 맞춘 뒤 전체 양 a를 찾는 내용을 유지했다."
    },
    {
      "id": "m1-05-01-xc3",
      "grade": "m1",
      "chapter": "5. 기본 도형",
      "after": "선분 $AB$의 길이도 {$\\overline{AB}$}로 나타낸다. 이 길이 기호를 써서 $5\\,\\mathrm{cm}$와 같다고 하면 선분 $AB$의 길이가 $5\\,\\mathrm{cm}$라는 뜻이다.",
      "completedDefinition": "선분 $AB$의 길이도 $\\overline{AB}$로 나타낸다. 이 길이 기호를 써서 $5\\,\\mathrm{cm}$와 같다고 하면 선분 $AB$의 길이가 $5\\,\\mathrm{cm}$라는 뜻이다.",
      "studentSentence": "선분 $AB$의 길이도 □로 나타낸다. 이 길이 기호를 써서 $5\\,\\mathrm{cm}$와 같다고 하면 선분 $AB$의 길이가 $5\\,\\mathrm{cm}$라는 뜻이다.",
      "expectedAnswers": [
        "$\\overline{AB}$"
      ],
      "blindResponse": {
        "id": "m1-05-01-xc3",
        "answers": [
          "$\\overline{AB}$"
        ],
        "alternativeAnswers": [],
        "reason": "답이 하나로 정해진다. 뒤 문장이 '이 길이 기호'로만 가리켜 답을 노출하지 않는다."
      },
      "originalFinding": {
        "id": "m1-05-01-xc3",
        "grade": "m1",
        "section": "중1::5. 기본 도형::점, 선, 면",
        "sourceHash": "81358a03d7d6897d1198b150c72fa6672def2d6b7df41673c7b7a5cf3d4a775c",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "answer-leak",
        "student": "선분 $AB$의 길이도 □로 나타내며, $\\overline{AB}=5\\,\\mathrm{cm}$는 선분 $AB$의 □가 $5\\,\\mathrm{cm}$라는 뜻이다.",
        "expected": [
          "$\\overline{AB}$",
          "길이"
        ],
        "reason": "첫 빈칸의 선분 기호가 바로 뒤 예시 등식에 그대로 나온다. 답은 분명하므로 정답 노출이다.",
        "proposal": "예시를 '이 기호 =5cm' 식으로 바꾸거나 둘째 빈칸만 남긴다.",
        "primaryReason": "선분 길이 표기를 묻는 첫 빈칸 뒤에 같은 기호가 길이 등식의 좌변으로 그대로 제시된다. 표기를 기억하지 않고 뒤 기호를 복사할 수 있다.",
        "primaryProposal": "기호 표기를 묻는 문항에서는 예시의 같은 기호도 함께 가리거나 표기 해석만 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "기호를 그대로 보여주는 뒤 등식은 이 길이 기호라는 표현으로 바꾸었다. 선분 기호가 길이에도 사용되는 관례와 등식의 의미를 유지했다."
    },
    {
      "id": "m1-05-03-xc4",
      "grade": "m1",
      "chapter": "5. 기본 도형",
      "after": "$l\\parallel m$은 「$l$과 $m$은 {평행}하다」라고 읽는다.",
      "completedDefinition": "$l\\parallel m$은 「$l$과 $m$은 평행하다」라고 읽는다.",
      "studentSentence": "$l\\parallel m$은 「$l$과 $m$은 □하다」라고 읽는다.",
      "expectedAnswers": [
        "평행"
      ],
      "blindResponse": {
        "id": "m1-05-03-xc4",
        "answers": [
          "평행"
        ],
        "alternativeAnswers": [],
        "reason": "답이 하나로 정해진다. 교과서 읽기대로 '직선 $l$과 직선 $m$'이라고 쓰면 더 정확하다."
      },
      "originalFinding": {
        "id": "m1-05-03-xc4",
        "grade": "m1",
        "section": "중1::5. 기본 도형::두 직선의 위치 관계",
        "sourceHash": "5c75c438a0512da522e73457699c79c42fbffa3af41bb55eb992b5da6a0753ff",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "answer-leak",
        "student": "$l\\parallel m$은 '$l$과 $m$은 □하다'라고 읽으며, 기호 □가 평행을 뜻한다.",
        "expected": [
          "평행",
          "$\\parallel$"
        ],
        "reason": "둘째 빈칸의 평행 기호가 문장 첫머리 식에 그대로 있다. 기호를 식별하는 과제로는 성립하지만 회상은 요구하지 않는다.",
        "proposal": "읽기 빈칸만 남기거나, 기호 쓰기를 묻는다면 앞의 식을 말로 바꾼다.",
        "primaryReason": "두 번째 빈칸의 평행 기호가 문장 맨 앞 l∥m에 그대로 제시된다. 기호와 말의 대응을 읽는 부분과 기호 자체를 회상하는 부분이 중복된다.",
        "primaryProposal": "읽기를 묻거나 기호 쓰기를 묻는 한쪽으로 정리한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "평행 기호가 이미 제시된 읽기 과제에서는 뜻 평행만 묻도록 했다. 같은 기호를 복사하는 둘째 빈칸과 뜻의 뒤 반복을 제거했다."
    },
    {
      "id": "m1-05-04-xc3",
      "grade": "m1",
      "chapter": "5. 기본 도형",
      "after": "직육면체에서 이웃한 두 면은 서로 {수직}이다.",
      "completedDefinition": "직육면체에서 이웃한 두 면은 서로 수직이다.",
      "studentSentence": "직육면체에서 이웃한 두 면은 서로 □이다.",
      "expectedAnswers": [
        "수직"
      ],
      "blindResponse": {
        "id": "m1-05-04-xc3",
        "answers": [
          "수직"
        ],
        "alternativeAnswers": [],
        "reason": "수학적으로 참이다. '만난다'도 사실이지만 '□이다' 형태에 맞지 않아 배제된다. '직교'는 같은 뜻이다."
      },
      "originalFinding": {
        "id": "m1-05-04-xc3",
        "grade": "m1",
        "section": "중1::5. 기본 도형::공간에서 평면의 위치 관계",
        "sourceHash": "886e28c643f8c0e74df160230353795a2d708ba47ee0a23ceabfc23e0091ba16",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "직육면체에서 □ 두 면은 서로 □이다.",
        "expected": [
          "이웃한",
          "수직"
        ],
        "reason": "이웃한/수직과 마주 보는/평행(또는 합동)이 모두 교과서 수준의 참인 문장이다. 문장에 구별 단서가 없다.",
        "proposal": "'이웃한'을 남기고 위치 관계만 묻는다.",
        "primaryReason": "직육면체의 두 면을 어떤 위치로 고르는지와 그 관계를 모두 가렸다. '이웃한 / 수직' 외에 '마주 보는 / 평행'도 서로 다른 참인 답이므로 학생에게 주어진 문장만으로 한 쌍을 선택할 수 없다.",
        "primaryProposal": "이웃한 두 면이라는 조건을 남기고 위치 관계만 묻는다.",
        "initialAlternativeAnswers": [
          "마주 보는 / 평행"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "이웃한 두 면이라는 조건을 드러내어 마주 보는/평행이라는 다른 참 답 쌍을 배제했다."
    },
    {
      "id": "m1-05-05-xc18",
      "grade": "m1",
      "chapter": "5. 기본 도형",
      "after": "평행한 양쪽 가장자리가 있는 띠 종이를 접을 때 접는 선과 접기 전후의 같은 가장자리가 이루는 두 각은 크기가 {같다}. 또 평행선 사이에서 한쪽 가장자리의 각과 엇갈려 놓인 각은 {엇각}으로 크기가 같다.",
      "completedDefinition": "평행한 양쪽 가장자리가 있는 띠 종이를 접을 때 접는 선과 접기 전후의 같은 가장자리가 이루는 두 각은 크기가 같다. 또 평행선 사이에서 한쪽 가장자리의 각과 엇갈려 놓인 각은 엇각으로 크기가 같다.",
      "studentSentence": "평행한 양쪽 가장자리가 있는 띠 종이를 접을 때 접는 선과 접기 전후의 같은 가장자리가 이루는 두 각은 크기가 □. 또 평행선 사이에서 한쪽 가장자리의 각과 엇갈려 놓인 각은 □으로 크기가 같다.",
      "expectedAnswers": [
        "같다",
        "엇각"
      ],
      "blindResponse": {
        "id": "m1-05-05-xc18",
        "answers": [
          "같다",
          "엇각"
        ],
        "alternativeAnswers": [],
        "reason": "답은 정해진다. 다만 첫 문장의 각 설명(접는 선과 접기 전후의 같은 가장자리가 이루는 두 각)은 그림 없이 중1 학생이 읽기 어렵다. 둘째 문장 끝의 '크기가 같다'가 첫 빈칸의 답을, '엇갈려 놓인'이 둘째 빈칸의 답을 약하게 드러낸다."
      },
      "originalFinding": {
        "id": "m1-05-05-xc18",
        "grade": "m1",
        "section": "중1::5. 기본 도형::평행선",
        "sourceHash": "e82736f25035c37caa6595832f35c148d578506d3fa4475cae53fc86e598cb11",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "평행한 띠 종이를 접으면 접힌 두 각의 크기가 □, 평행선의 □도 같아 두 성질을 함께 쓴다.",
        "expected": [
          "같고",
          "엇각"
        ],
        "reason": "'접은 각이 같다'는 이 유형의 관용 표현이라 첫 빈칸은 정해진다. prior의 지시 대상 불명 지적은 과하지만, 둘째 빈칸은 동위각도 참이어서 경계 사례다.",
        "proposal": "'평행선에서 서로 엇갈린 위치의 각인 □'처럼 단서를 주거나, 그림과 함께 제시하고 동위각 답 처리 기준을 정한다.",
        "primaryReason": "그림이나 각의 이름 없이 '접힌 두 각'이라고만 하여 어느 두 각을 비교하는지 특정되지 않는다. 접는 선과 원래 변의 각인지, 두 겹의 대응각인지에 따라 학생이 읽는 대상이 달라진다.",
        "primaryProposal": "접는 선과 원래 변·접힌 변 사이의 두 각처럼 비교할 각을 문장 또는 그림으로 특정한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "어느 접힌 두 각인지 명시했다. 평행선 사이에서 엇갈린 위치라는 단서를 노출하여 동위각과 구별하고 접기·평행선 두 성질을 유지했다."
    },
    {
      "id": "m1-05-07-xc1",
      "grade": "m1",
      "chapter": "5. 기본 도형",
      "after": "$\\triangle ABC\\equiv\\triangle DEF$는 「삼각형 $ABC$와 삼각형 $DEF$는 {합동}이다」라고 읽는다.",
      "completedDefinition": "$\\triangle ABC\\equiv\\triangle DEF$는 「삼각형 $ABC$와 삼각형 $DEF$는 합동이다」라고 읽는다.",
      "studentSentence": "$\\triangle ABC\\equiv\\triangle DEF$는 「삼각형 $ABC$와 삼각형 $DEF$는 □이다」라고 읽는다.",
      "expectedAnswers": [
        "합동"
      ],
      "blindResponse": {
        "id": "m1-05-07-xc1",
        "answers": [
          "합동"
        ],
        "alternativeAnswers": [],
        "reason": "기호 ≡의 읽기로 유일하게 복원된다."
      },
      "originalFinding": {
        "id": "m1-05-07-xc1",
        "grade": "m1",
        "section": "중1::5. 기본 도형::합동",
        "sourceHash": "772ed1c34ad8967dea6e7d204ec5e380cf59b2f1439cb8a2042a535dd9372933",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "answer-leak",
        "student": "$\\triangle ABC\\equiv\\triangle DEF$는 「삼각형 $ABC$와 삼각형 $DEF$는 □이다」로 읽으며, 기호 □가 합동을 나타낸다.",
        "expected": [
          "합동",
          "$\\equiv$"
        ],
        "reason": "'합동'은 뒤 절에, 합동 기호는 앞 식에 각각 인쇄되어 두 빈칸 모두 복사로 채워진다. 답은 명확하므로 명료성 결함이 아니라 문항 가치의 문제다.",
        "proposal": "읽기 또는 기호 쓰기 한쪽만 묻고 다른 쪽 노출을 없앤다.",
        "primaryReason": "첫 빈칸의 '합동'은 뒷부분에, 둘째 빈칸의 합동 기호는 맨 앞 수식에 그대로 제시되어 두 답 모두 같은 문장 안에서 복사할 수 있다.",
        "primaryProposal": "기호를 읽는 문항과 기호를 쓰는 문항 가운데 하나로 정리하고 정답을 중복 노출하지 않는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "합동 기호가 제시된 읽기 과제로 뜻 합동만 묻는다. 앞 식의 기호와 뒤 절의 합동을 그대로 복사하는 중복 빈칸을 없앴다."
    },
    {
      "id": "m1-06-01-xc11",
      "grade": "m1",
      "chapter": "6. 평면도형",
      "after": "다각형의 한 꼭짓점에서 내각이 둔각이면 외각은 {예각}이다. 내각과 외각의 합은 $180^\\circ$이며, 내각이 직각이면 외각도 직각이다.",
      "completedDefinition": "다각형의 한 꼭짓점에서 내각이 둔각이면 외각은 예각이다. 내각과 외각의 합은 $180^\\circ$이며, 내각이 직각이면 외각도 직각이다.",
      "studentSentence": "다각형의 한 꼭짓점에서 내각이 둔각이면 외각은 □이다. 내각과 외각의 합은 $180^\\circ$이며, 내각이 직각이면 외각도 직각이다.",
      "expectedAnswers": [
        "예각"
      ],
      "blindResponse": {
        "id": "m1-06-01-xc11",
        "answers": [
          "예각"
        ],
        "alternativeAnswers": [],
        "reason": "답이 하나로 정해지고 수학적으로 정확하다."
      },
      "originalFinding": {
        "id": "m1-06-01-xc11",
        "grade": "m1",
        "section": "중1::6. 평면도형::다각형",
        "sourceHash": "c6da55f66be3651765a2c99cff530550ac42f4fb19bce027dee20f4d3ffa6970",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "한 꼭짓점에서 내각이 □이면 외각은 □이고, 내각이 직각이면 외각도 직각이다.",
        "expected": [
          "둔각",
          "예각"
        ],
        "reason": "둔각/예각과 예각/둔각이 모두 참이고, 뒤의 직각 사례도 둘을 가르지 못한다.",
        "proposal": "'내각이 둔각이면'을 남기고 외각의 종류만 묻는다.",
        "primaryReason": "내각의 종류와 외각의 종류가 모두 가려져 있다. 둔각/예각과 예각/둔각이라는 서로 다른 조건-결론 쌍이 모두 성립하며 뒤의 직각 사례도 둘을 구별하지 않는다.",
        "primaryProposal": "내각이 둔각이라는 조건은 남기고 외각의 종류를 묻는다.",
        "initialAlternativeAnswers": [
          "예각 / 둔각"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "둔각이라는 조건을 노출하여 예각/둔각의 반대 쌍을 배제했다. 내각과 외각이 보각이라는 수치 이유와 직각 사례를 보존했다."
    },
    {
      "id": "m1-06-04-xc14",
      "grade": "m1",
      "chapter": "6. 평면도형",
      "after": "한 원의 중심이 $O$이고 서로 다른 세 점 $A$, $B$, $C$가 원 위에 있을 때, 같은 크기의 중심각 $\\angle AOB$, $\\angle BOC$에 대한 현 $AB$, $BC$의 길이는 같다. 현 $AC$는 삼각형 $ABC$의 한 변이므로 $\\overline{AB}+\\overline{BC}$보다 {짧다}.",
      "completedDefinition": "한 원의 중심이 $O$이고 서로 다른 세 점 $A$, $B$, $C$가 원 위에 있을 때, 같은 크기의 중심각 $\\angle AOB$, $\\angle BOC$에 대한 현 $AB$, $BC$의 길이는 같다. 현 $AC$는 삼각형 $ABC$의 한 변이므로 $\\overline{AB}+\\overline{BC}$보다 짧다.",
      "studentSentence": "한 원의 중심이 $O$이고 서로 다른 세 점 $A$, $B$, $C$가 원 위에 있을 때, 같은 크기의 중심각 $\\angle AOB$, $\\angle BOC$에 대한 현 $AB$, $BC$의 길이는 같다. 현 $AC$는 삼각형 $ABC$의 한 변이므로 $\\overline{AB}+\\overline{BC}$보다 □.",
      "expectedAnswers": [
        "짧다"
      ],
      "blindResponse": {
        "id": "m1-06-04-xc14",
        "answers": [
          "짧다"
        ],
        "alternativeAnswers": [],
        "reason": "원 위의 서로 다른 세 점은 한 직선 위에 있지 않으므로 삼각형이 되어 '짧다'(작다)로 유일하다. 첫 문장의 '현의 길이가 같다'는 빈칸 판단에 쓰이지 않는다."
      },
      "originalFinding": {
        "id": "m1-06-04-xc14",
        "grade": "m1",
        "section": "중1::6. 평면도형::원과 부채꼴",
        "sourceHash": "25368e069146d3c85139d7c55f52b378f0cb41a78f07e000b9f87c790dc6a5b1",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "hidden-condition",
        "student": "$\\angle AOB=\\angle BOC$일 때 현 $AC$는 □ $ABC$의 한 변이므로 $\\overline{AB}+\\overline{BC}$, 곧 현 $AB$의 $2$배보다 □.",
        "expected": [
          "삼각형",
          "짧다"
        ],
        "reason": "'현'과 문자 O의 관례로 원의 중심임이 통하고, 삼각형/짧다(작다)는 단일 답이다. 중심 명시 누락은 답에 영향을 주지 않는다.",
        "proposal": "유지. 원하면 '원 O에서'를 덧붙인다.",
        "primaryReason": "O가 해당 원의 중심이라는 설명이 없다. 같은 중심각에 대한 두 현의 길이가 같다는 성질을 쓰려면 O가 중심이어야 하므로, 각 AOB와 BOC의 크기가 같다는 조건만으로는 AB=BC라는 중간 근거를 보장하지 못한다.",
        "primaryProposal": "중심 O인 원 위에 A, B, C가 있다는 조건을 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "원의 중심과 서로 다른 세 점이라는 조건을 명시했다. 삼각형과 이등변삼각형이 둘 다 참인 첫 빈칸은 노출하고 한 변이 나머지 두 변의 합보다 짧다는 길이 관계만 묻는다."
    },
    {
      "id": "m1-06-04-xc17",
      "grade": "m1",
      "chapter": "6. 평면도형",
      "after": "원 위의 세 점이 원을 세 호로 나누고 그 길이의 비가 $a:b:c$일 때, 각 호에 대한 중심각은 {$360^\\circ$}를 비의 합 $a+b+c$로 나눈 뒤 각각 $a$, $b$, $c$를 곱해 구한다.",
      "completedDefinition": "원 위의 세 점이 원을 세 호로 나누고 그 길이의 비가 $a:b:c$일 때, 각 호에 대한 중심각은 $360^\\circ$를 비의 합 $a+b+c$로 나눈 뒤 각각 $a$, $b$, $c$를 곱해 구한다.",
      "studentSentence": "원 위의 세 점이 원을 세 호로 나누고 그 길이의 비가 $a:b:c$일 때, 각 호에 대한 중심각은 □를 비의 합 $a+b+c$로 나눈 뒤 각각 $a$, $b$, $c$를 곱해 구한다.",
      "expectedAnswers": [
        "$360^\\circ$"
      ],
      "blindResponse": {
        "id": "m1-06-04-xc17",
        "answers": [
          "$360^\\circ$"
        ],
        "alternativeAnswers": [],
        "reason": "답이 하나로 정해지고 수학적으로 정확하다."
      },
      "originalFinding": {
        "id": "m1-06-04-xc17",
        "grade": "m1",
        "section": "중1::6. 평면도형::원과 부채꼴",
        "sourceHash": "b0cf4004ab46305a085466336b3fb320956a440518b37c9122a8bb61dc7f8cc1",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "원 위의 점들이 나눈 호의 길이의 비가 $a:b:c$이면 □를 비의 □으로 나누어 각각 곱한다.",
        "expected": [
          "$360^\\circ$",
          "합"
        ],
        "reason": "구하려는 대상이 없어 중심각이면 360°, 호의 길이면 원의 둘레를 비의 합으로 나누게 된다. 두 답이 모두 올바른 절차다.",
        "proposal": "'각 호에 대한 중심각의 크기는'을 문장에 명시한다.",
        "primaryReason": "비를 이용해 무엇을 구하려는지 목적이 없고 '□를 비의 □으로 나누어 각각 곱한다'만 남는다. 중심각을 구하면 360°를, 호의 길이를 구하면 원의 둘레를 나누어야 하므로 두 가지 다른 답이 성립한다.",
        "primaryProposal": "각 호에 대한 중심각을 구하는 절차임을 문장에 명시한다.",
        "initialAlternativeAnswers": [
          "원의 둘레"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "원 전체를 세 호로 나눈다는 조건과 중심각을 구한다는 목표를 드러냈다. 원의 둘레를 비례배분하는 다른 참 절차 답을 배제했다."
    },
    {
      "id": "m1-06-05-xc24",
      "grade": "m1",
      "chapter": "6. 평면도형",
      "after": "반지름이 $r$인 바퀴가 미끄러지지 않고 한 바퀴 구르면 {$2\\pi r$}만큼 나아간다.",
      "completedDefinition": "반지름이 $r$인 바퀴가 미끄러지지 않고 한 바퀴 구르면 $2\\pi r$만큼 나아간다.",
      "studentSentence": "반지름이 $r$인 바퀴가 미끄러지지 않고 한 바퀴 구르면 □만큼 나아간다.",
      "expectedAnswers": [
        "$2\\pi r$"
      ],
      "blindResponse": {
        "id": "m1-06-05-xc24",
        "answers": [
          "$2\\pi r$"
        ],
        "alternativeAnswers": [],
        "reason": "'바퀴의 둘레(원주)'는 같은 뜻이다. '반지름이 $r$인'이 주어져 식으로 답하게 유도되므로 문제 없다."
      },
      "originalFinding": {
        "id": "m1-06-05-xc24",
        "grade": "m1",
        "section": "중1::6. 평면도형::부채꼴의 호의 길이와 넓이",
        "sourceHash": "704eaaa06dda9301e35790afb6007952110511eee92d2738a4b0308b9d91b8cb",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "반지름이 $r$인 바퀴가 미끄러지지 않고 □ 구르면 □만큼 나아간다.",
        "expected": [
          "한 바퀴",
          "$2\\pi r$"
        ],
        "reason": "두 빈칸이 서로를 정하는 구조라 형식상 열려 있다. 그러나 한 바퀴/2πr가 압도적으로 자연스러운 기준 답이어서 confirmed는 과하다고 본다.",
        "proposal": "'한 바퀴'를 남기고 이동 거리만 묻는 쪽을 권장한다.",
        "primaryReason": "바퀴가 회전한 횟수와 이동 거리를 모두 가려 두 양을 정할 조건이 남지 않는다. 한 바퀴/2πr 외에 두 바퀴/4πr도 서로 다른 참인 완성이다.",
        "primaryProposal": "한 바퀴 굴렀다는 조건을 남기고 이동 거리만 묻는다.",
        "initialAlternativeAnswers": [
          "두 바퀴 / 4πr"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "한 바퀴라는 조건을 노출하여 두 바퀴/4πr 등 회전 수와 거리를 함께 바꾸는 대안을 배제했다."
    },
    {
      "id": "m1-07-02-xc9",
      "grade": "m1",
      "chapter": "7. 입체도형",
      "after": "정다면체의 모서리 수는 면의 수와 한 면의 변의 수를 곱해 {$2$}로 나눈다. 모서리 하나를 두 면이 함께 쓰기 때문이다.",
      "completedDefinition": "정다면체의 모서리 수는 면의 수와 한 면의 변의 수를 곱해 $2$로 나눈다. 모서리 하나를 두 면이 함께 쓰기 때문이다.",
      "studentSentence": "정다면체의 모서리 수는 면의 수와 한 면의 변의 수를 곱해 □로 나눈다. 모서리 하나를 두 면이 함께 쓰기 때문이다.",
      "expectedAnswers": [
        "$2$"
      ],
      "blindResponse": {
        "id": "m1-07-02-xc9",
        "answers": [
          "$2$"
        ],
        "alternativeAnswers": [],
        "reason": "답이 하나로 정해진다. 근거 문장의 '두 면이 함께 쓰기'가 답을 사실상 알려 주지만 이유 설명으로 허용할 수 있다."
      },
      "originalFinding": {
        "id": "m1-07-02-xc9",
        "grade": "m1",
        "section": "중1::7. 입체도형::정다면체",
        "sourceHash": "4c3355f3db0a62c2d326c14249c2a85b9c5e14cbda08faee5aa5be49e8e8aa9c",
        "status": "not_issue",
        "initialStatus": "needs_review",
        "category": "hidden-condition",
        "student": "면의 수와 한 면의 변의 수를 곱해 □로 나눈다. 모서리 하나를 두 □이 함께 쓰기 때문이다.",
        "expected": [
          "$2$",
          "면"
        ],
        "reason": "뒤 문장('모서리 하나를 두 □이 함께 쓴다')이 목적과 답을 함께 정해 주어 2/면이 단일 답이다. 정다면체 명시가 없어도 학생 응답은 흔들리지 않는다.",
        "proposal": "유지. 원하면 '정다면체의 모서리 수는'을 앞에 붙인다.",
        "primaryReason": "한 면의 변의 수에 전체 면의 수를 곱하는 절차는 모든 면의 변 수가 같아야 성립하는데 정다면체 등의 대상 조건이 없다. 독립 문장으로는 어느 다면체에 적용하는 계산인지 제한되지 않는다.",
        "primaryProposal": "정다면체의 모서리 수를 구하는 절차임을 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "삼각기둥은 면이 5개지만 한 면의 변 수를 3 또는 4로 잡아 5와 곱하고 2로 나누면 모서리 9개를 얻지 못한다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "면마다 변의 수가 같아야 하는 정다면체 조건과 모서리 수라는 목표를 명시했다. 두 면이 함께 쓰는 이유는 본문에 남겨 숫자 2만 묻는다."
    },
    {
      "id": "m1-07-02-xc10",
      "grade": "m1",
      "chapter": "7. 입체도형",
      "after": "정다면체의 꼭짓점 수는 면의 수와 한 면의 꼭짓점 수를 곱해, 한 꼭짓점에 모인 면의 수로 {나눈다}. 각 꼭짓점을 그 면의 수만큼 중복해서 세기 때문이다.",
      "completedDefinition": "정다면체의 꼭짓점 수는 면의 수와 한 면의 꼭짓점 수를 곱해, 한 꼭짓점에 모인 면의 수로 나눈다. 각 꼭짓점을 그 면의 수만큼 중복해서 세기 때문이다.",
      "studentSentence": "정다면체의 꼭짓점 수는 면의 수와 한 면의 꼭짓점 수를 곱해, 한 꼭짓점에 모인 면의 수로 □. 각 꼭짓점을 그 면의 수만큼 중복해서 세기 때문이다.",
      "expectedAnswers": [
        "나눈다"
      ],
      "blindResponse": {
        "id": "m1-07-02-xc10",
        "answers": [
          "나눈다"
        ],
        "alternativeAnswers": [],
        "reason": "답이 하나로 정해지고 수학적으로 정확하다."
      },
      "originalFinding": {
        "id": "m1-07-02-xc10",
        "grade": "m1",
        "section": "중1::7. 입체도형::정다면체",
        "sourceHash": "539a7fea240b57968fa274c29cc84cf471dc03f2c833f9f4475b4651a7621585",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "missing-referent",
        "student": "면의 수와 한 면의 꼭짓점 수를 곱해 한 꼭짓점에 모인 □로 □.",
        "expected": [
          "면의 수",
          "나눈다"
        ],
        "reason": "무엇을 구하는 절차인지 문장에 없다. 또 한 꼭짓점에 모인 '모서리의 수'도 같은 값이라 다른 답이 수치상 성립한다.",
        "proposal": "'정다면체의 꼭짓점 수는'을 앞에 명시하고 모서리의 수 답 처리 기준을 정한다.",
        "primaryReason": "'한 꼭짓점에 모인'이라는 표현으로 면의 수를 유추할 수는 있지만, 무엇의 개수를 구하는지 목적과 정다면체라는 대상이 없다. 서로 같은 면과 일정한 모임 수를 전제한 꼭짓점 수 계산이라는 맥락을 독립 문장에도 남길 필요가 있는지 검토한다.",
        "primaryProposal": "정다면체의 꼭짓점 수를 구한다는 목적과 대상을 문장 앞에 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "정다면체의 꼭짓점 수라는 목표와 중복 계산 이유를 명시했다. 면·모서리 수가 수치상 같은 데서 생기는 대상 모호성은 분모를 노출하여 없앴다."
    },
    {
      "id": "m1-07-03-xc11",
      "grade": "m1",
      "chapter": "7. 입체도형",
      "after": "원뿔에서 모선의 길이는 높이보다 {길다}. 모선, 높이, 밑면의 반지름이 직각삼각형을 이루고 모선이 직각의 맞은편 변이기 때문이다.",
      "completedDefinition": "원뿔에서 모선의 길이는 높이보다 길다. 모선, 높이, 밑면의 반지름이 직각삼각형을 이루고 모선이 직각의 맞은편 변이기 때문이다.",
      "studentSentence": "원뿔에서 모선의 길이는 높이보다 □. 모선, 높이, 밑면의 반지름이 직각삼각형을 이루고 모선이 직각의 맞은편 변이기 때문이다.",
      "expectedAnswers": [
        "길다"
      ],
      "blindResponse": {
        "id": "m1-07-03-xc11",
        "answers": [
          "길다"
        ],
        "alternativeAnswers": [],
        "reason": "유일하다('크다'는 같은 뜻). 다만 근거로 든 '직각의 맞은편 변이 가장 길다'는 중1에서 정식으로 다루지 않는 성질이라 근거 문장의 학년 적합성을 확인해야 한다."
      },
      "originalFinding": {
        "id": "m1-07-03-xc11",
        "grade": "m1",
        "section": "중1::7. 입체도형::회전체",
        "sourceHash": "dd7ce5bf808de52a36173ce9d7ee0f48335726ed519c37945d0fc329c41a45fe",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "open-answer",
        "student": "원뿔에서 모선의 길이는 □보다 길다. 모선, 높이, 밑면의 반지름이 □을 이루고 모선이 빗변이기 때문이다.",
        "expected": [
          "높이",
          "직각삼각형"
        ],
        "reason": "모선은 높이보다도 밑면의 반지름보다도 길다. 뒤 문장이 두 변을 나란히 제시해 어느 쪽을 써야 할지 가를 근거가 없다.",
        "proposal": "'높이'를 남기고 길다/짧다를 묻거나, 반지름도 정답으로 인정하도록 문항을 바꾼다.",
        "primaryReason": "모선은 높이보다도, 밑면의 반지름보다도 길다. 뒤 문장 역시 두 길이를 직각삼각형의 두 변으로 나란히 제시하므로 어느 변과 비교하는 빈칸인지 정해 주지 않는다.",
        "primaryProposal": "높이를 비교 대상으로 남기고 길이 관계를 묻거나, 두 직각변을 모두 답하도록 범위를 명시한다.",
        "initialAlternativeAnswers": [
          "밑면의 반지름"
        ],
        "initialCounterexample": "반지름 3, 높이 4, 모선 5인 원뿔에서 5>4와 5>3은 모두 참이다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "비교 대상 높이를 노출하여 밑면 반지름도 가능한 답을 배제했다. 빗변은 직각의 맞은편 변으로 풀어 써서 grade 밖 용어를 전제하지 않고 직각삼각형의 이유를 보존했다."
    },
    {
      "id": "m1-07-04-xc11",
      "grade": "m1",
      "chapter": "7. 입체도형",
      "after": "기둥의 높이는 부피를 {밑넓이}로 나누어 구한다. 기둥의 부피가 밑면의 넓이와 높이의 곱이기 때문이다.",
      "completedDefinition": "기둥의 높이는 부피를 밑넓이로 나누어 구한다. 기둥의 부피가 밑면의 넓이와 높이의 곱이기 때문이다.",
      "studentSentence": "기둥의 높이는 부피를 □로 나누어 구한다. 기둥의 부피가 밑면의 넓이와 높이의 곱이기 때문이다.",
      "expectedAnswers": [
        "밑넓이"
      ],
      "blindResponse": {
        "id": "m1-07-04-xc11",
        "answers": [
          "밑넓이"
        ],
        "alternativeAnswers": [],
        "reason": "'밑넓이'(밑면의 넓이)로 유일하다. 다만 바로 뒤 문장에 '밑면의 넓이와 높이의 곱'이 그대로 나와 답이 노출되어 있다."
      },
      "originalFinding": {
        "id": "m1-07-04-xc11",
        "grade": "m1",
        "section": "중1::7. 입체도형::기둥의 겉넓이와 부피",
        "sourceHash": "4c2a2e3a4c513baaed9a4b5e454b84b702ac1b7186c2476bc2cd28479b23fce4",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "부피와 밑넓이를 알면 부피를 □로 나누어 □를 구한다.",
        "expected": [
          "밑넓이",
          "높이"
        ],
        "reason": "밑넓이/높이는 자연스럽게 정해진다(첫 빈칸은 앞 절에 노출). 다만 도형이 기둥이라는 전제가 없어 같은 대단원의 뿔에는 틀린 절차가 된다.",
        "proposal": "'기둥의'를 문장 앞에 명시한다.",
        "primaryReason": "어떤 입체도형의 부피와 밑넓이인지 빠져 있다. 부피를 밑넓이로 나누어 높이를 구하는 공식은 기둥에 대한 것인데, 뿔 등에는 그대로 적용되지 않아 학생이 대상 도형을 보충해야 한다.",
        "primaryProposal": "기둥의 부피와 밑넓이를 안다는 조건을 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "밑넓이 6, 부피 12인 기둥의 높이는 2이지만 같은 밑넓이와 부피인 뿔의 높이는 6이다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "기둥이라는 도형과 높이를 구하는 목표를 명시하여 뿔에서는 틀린 절차라는 반례를 배제했다. 나눌 양 밑넓이를 묻고 부피 공식의 이유를 유지했다. 설명 속 밑넓이는 풀어 쓴 밑면의 넓이로 바꾸어 직접적인 글자 반복을 줄였다."
    },
    {
      "id": "m1-07-06-xc1",
      "grade": "m1",
      "chapter": "7. 입체도형",
      "after": "구의 지름이 주어지면 그 {절반}을 반지름 $r$로 하여, 구의 겉넓이 공식 {$4\\pi r^2$}에 넣는다.",
      "completedDefinition": "구의 지름이 주어지면 그 절반을 반지름 $r$로 하여, 구의 겉넓이 공식 $4\\pi r^2$에 넣는다.",
      "studentSentence": "구의 지름이 주어지면 그 □을 반지름 $r$로 하여, 구의 겉넓이 공식 □에 넣는다.",
      "expectedAnswers": [
        "절반",
        "$4\\pi r^2$"
      ],
      "blindResponse": {
        "id": "m1-07-06-xc1",
        "answers": [
          "절반",
          "$4\\pi r^2$"
        ],
        "alternativeAnswers": [],
        "reason": "'반'과 '$S=4\\pi r^2$'은 같은 뜻이다. 조사 '을/에'와 맞고 수학적으로 정확하다."
      },
      "originalFinding": {
        "id": "m1-07-06-xc1",
        "grade": "m1",
        "section": "중1::7. 입체도형::구의 겉넓이와 부피",
        "sourceHash": "fcd5c250b87545aff6ae9adfd7f034aecf4e429531ca400792b060486e2afd14",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "지름이 주어지면 그 □을 반지름으로 하여 겉넓이 □에 넣는다.",
        "expected": [
          "절반",
          "$4\\pi r^2$"
        ],
        "reason": "어떤 입체인지 없이 '겉넓이 □'에 공식을 쓰라고 한다. 대단원에 원기둥·원뿔·구가 모두 있어 4πr²을 특정할 수 없다.",
        "proposal": "'구의 지름이 주어지면'으로 도형을 명시한다.",
        "primaryReason": "지름이 주어진 도형이 구라는 설명이 없고 겉넓이 공식 전체가 가려져 있다. 지름만으로는 구·반구·원기둥 중 어떤 도형의 겉넓이를 계산해야 하는지 알 수 없다.",
        "primaryProposal": "구의 지름이 주어졌다는 도형 이름을 문장에 명시한다.",
        "initialAlternativeAnswers": [
          "3πr² (반구의 겉넓이)"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "구라는 도형과 반지름 r를 명시하여 원기둥·원뿔의 다른 겉넓이 공식을 배제했다. 지름의 절반을 대입하는 절차를 유지했다."
    },
    {
      "id": "m2-01-04-xc7",
      "grade": "m2",
      "chapter": "1. 수와 식",
      "after": "순환소수가 든 식의 계산 결과는 분수로 나타낼 수 있다. 약분하여 분자와 분모가 서로소가 되게 한 분수를 {기약분수}라 한다. 결과가 정수일 수도 있으며, 소수로 쓰면 유한소수 또는 순환소수가 된다.",
      "completedDefinition": "순환소수가 든 식의 계산 결과는 분수로 나타낼 수 있다. 약분하여 분자와 분모가 서로소가 되게 한 분수를 기약분수라 한다. 결과가 정수일 수도 있으며, 소수로 쓰면 유한소수 또는 순환소수가 된다.",
      "studentSentence": "순환소수가 든 식의 계산 결과는 분수로 나타낼 수 있다. 약분하여 분자와 분모가 서로소가 되게 한 분수를 □라 한다. 결과가 정수일 수도 있으며, 소수로 쓰면 유한소수 또는 순환소수가 된다.",
      "expectedAnswers": [
        "기약분수"
      ],
      "blindResponse": {
        "id": "m2-01-04-xc7",
        "answers": [
          "기약분수"
        ],
        "alternativeAnswers": [],
        "reason": "정의문으로 유일하게 복원되며 내용도 정확하다."
      },
      "originalFinding": {
        "id": "m2-01-04-xc7",
        "grade": "m2",
        "section": "중2::1. 수와 식::순환소수를 포함한 식의 계산",
        "sourceHash": "c7178326533089936055b98ed83a9c9aeded08e6a3a5c45240b4f0f3d8611db4",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "math-error",
        "student": "순환소수가 든 식의 계산 결과는 □로 쓰거나 다시 □로 쓸 수 있다.",
        "expected": [
          "기약분수",
          "순환소수"
        ],
        "reason": "'다시 □로'가 순환소수를 가리켜 답은 대체로 정해진다. 다만 첫 빈칸은 '분수'가 더 자연스럽고, 결과가 정수·유한소수인 경우(0.4…+0.5…=1)에는 진술이 일반적으로 성립하지 않는다.",
        "proposal": "'분수'를 동의 답으로 인정하고 '필요하면 다시 소수로' 정도로 표현을 완화할지 검토한다.",
        "primaryReason": "순환소수가 든 식의 계산 결과가 항상 순환소수로도 나타나는 것처럼 읽힌다. 결과가 0인 경우는 이 은행이 정의한 '0이 아닌 숫자가 끝없이 나타나는 무한소수'나 순환소수가 아니므로 두 번째 답을 일반적인 출력 형식으로 강제하기 어렵다.",
        "primaryProposal": "결과의 기약분수 분모를 보고 유한소수 또는 순환소수로 나타낼 수 있다는 조건을 구별한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "0.333…-0.333…=0이다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "순환소수가 든 계산 결과도 정수·유한소수일 수 있음을 명시했다. 분자와 분모가 서로소인 분수의 이름을 묻는 형식으로 일반 분수라는 다른 참 답과 구별했다."
    },
    {
      "id": "m2-01-07-xc7",
      "grade": "m2",
      "chapter": "1. 수와 식",
      "after": "차수가 $1$인 다항식을 {일차식}이라 한다.",
      "completedDefinition": "차수가 $1$인 다항식을 일차식이라 한다.",
      "studentSentence": "차수가 $1$인 다항식을 □이라 한다.",
      "expectedAnswers": [
        "일차식"
      ],
      "blindResponse": {
        "id": "m2-01-07-xc7",
        "answers": [
          "일차식"
        ],
        "alternativeAnswers": [],
        "reason": "답이 하나로 정해지고 정의가 정확하다."
      },
      "originalFinding": {
        "id": "m2-01-07-xc7",
        "grade": "m2",
        "section": "중2::1. 수와 식::다항식의 덧셈과 뺄셈",
        "sourceHash": "d1e1ba6d2505e79e9b9aeab84a544384bb4a22a4ed63e8dc8566aee5cdec5c03",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "차수가 □인 다항식을 □이라 한다.",
        "expected": [
          "$1$",
          "일차식"
        ],
        "reason": "1/일차식과 2/이차식이 똑같이 정의로 성립한다. 특히 이 단원에서 새로 배우는 것은 이차식이라 대안이 오히려 더 자연스럽다.",
        "proposal": "차수 또는 이름 중 하나를 남긴다.",
        "primaryReason": "차수와 다항식의 이름을 모두 가려 어떤 차수의 식을 정의하는지 남아 있지 않다. 1/일차식 외에 2/이차식도 서로 다른 참인 완성이 된다.",
        "primaryProposal": "차수 1 또는 일차식이라는 명칭 중 하나를 남긴다.",
        "initialAlternativeAnswers": [
          "2 / 이차식",
          "3 / 삼차식"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "차수 1을 노출하여 2/이차식 등 다른 차수와 개념명 쌍을 배제했다."
    },
    {
      "id": "m2-01-07-xc8",
      "grade": "m2",
      "chapter": "1. 수와 식",
      "after": "괄호 앞이 $+$이면 괄호 안 각 항의 부호를 {그대로} 두고 괄호를 푼다.",
      "completedDefinition": "괄호 앞이 $+$이면 괄호 안 각 항의 부호를 그대로 두고 괄호를 푼다.",
      "studentSentence": "괄호 앞이 $+$이면 괄호 안 각 항의 부호를 □ 두고 괄호를 푼다.",
      "expectedAnswers": [
        "그대로"
      ],
      "blindResponse": {
        "id": "m2-01-07-xc8",
        "answers": [
          "그대로"
        ],
        "alternativeAnswers": [],
        "reason": "답이 하나로 정해진다. 문제 없음."
      },
      "originalFinding": {
        "id": "m2-01-07-xc8",
        "grade": "m2",
        "section": "중2::1. 수와 식::다항식의 덧셈과 뺄셈",
        "sourceHash": "580eba3043694c0587e286ebd9eaa2e04a39cd1f18357e9171adaa654ea862e4",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "괄호 앞이 □이면 괄호 안 각 항의 부호를 □ 두고 괄호를 푼다.",
        "expected": [
          "$+$",
          "그대로"
        ],
        "reason": "'□ 두고'라는 연어가 '그대로'를 강하게 지시해 +/그대로로 수렴한다. 그래도 조건과 결론을 함께 가려 -/바꾸어를 떠올리는 학생이 생길 수 있다.",
        "proposal": "'괄호 앞이 +이면'을 남기고 부호 처리만 묻는다.",
        "primaryReason": "괄호 앞 부호와 괄호 안 부호의 처리 방법을 함께 가렸다. +/그대로 외에 -/바꾸어도 문장을 참으로 완성하므로 어느 부호의 규칙을 묻는지 정해지지 않는다.",
        "primaryProposal": "괄호 앞이 +라는 조건을 남기고 내부 부호 처리만 묻는다.",
        "initialAlternativeAnswers": [
          "- / 바꾸어"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "괄호 앞 +라는 조건을 노출하여 -/바꾸어 같은 다른 참 답 쌍을 배제했다."
    },
    {
      "id": "m2-01-07-xc17",
      "grade": "m2",
      "chapter": "1. 수와 식",
      "after": "어떤 식에 한 식을 더해야 할 것을 잘못 뺀 경우, 잘못 계산한 결과에 뺀 식을 {더하면} 처음 식이 나온다. 그 처음 식에 더해야 할 식을 한 번 더 더하면 바른 결과가 나온다.",
      "completedDefinition": "어떤 식에 한 식을 더해야 할 것을 잘못 뺀 경우, 잘못 계산한 결과에 뺀 식을 더하면 처음 식이 나온다. 그 처음 식에 더해야 할 식을 한 번 더 더하면 바른 결과가 나온다.",
      "studentSentence": "어떤 식에 한 식을 더해야 할 것을 잘못 뺀 경우, 잘못 계산한 결과에 뺀 식을 □ 처음 식이 나온다. 그 처음 식에 더해야 할 식을 한 번 더 더하면 바른 결과가 나온다.",
      "expectedAnswers": [
        "더하면"
      ],
      "blindResponse": {
        "id": "m2-01-07-xc17",
        "answers": [
          "더하면"
        ],
        "alternativeAnswers": [],
        "reason": "$(A-B)+B=A$, $A+B$가 바른 결과이므로 수학적으로 맞다. 뒤 문장의 '한 번 더 더하면'이 답을 약하게 암시한다."
      },
      "originalFinding": {
        "id": "m2-01-07-xc17",
        "grade": "m2",
        "section": "중2::1. 수와 식::다항식의 덧셈과 뺄셈",
        "sourceHash": "285c44bb039d71a854208dc9cf498b320fafa6eae2d4e3330f0826be115257a5",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "더해야 할 식을 잘못하여 뺐다면 먼저 □을 구한 뒤 □ 다시 계산한다.",
        "expected": [
          "어떤 식",
          "바르게"
        ],
        "reason": "문제 유형을 알면 첫 빈칸은 어떤 식·처음 식으로 정해진다. 다만 지시 대상이 문장에 없고, 둘째 빈칸 '바르게'는 '더하여' 같은 다른 올바른 표현이 들어갈 수 있는 부사다.",
        "proposal": "문제 틀을 문장에 넣고, 둘째 빈칸은 제거하거나 '더하여'를 인정한다.",
        "primaryReason": "어떤 원래 식에서 어느 식을 빼 잘못 계산했는지 대상이 제시되지 않았는데 '먼저 □을 구한 뒤'를 묻는다. 기대답 '어떤 식'이 가리키는 것도 남은 문장에 없어 복원할 대상과 계산 방향을 학생이 임의로 보충해야 한다.",
        "primaryProposal": "원래 식·더해야 할 식·잘못 구한 결과를 구별해 제시하고 원래 식을 복원하는 단계를 묻는다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "원래 식과 잘못 뺀 결과를 문장 안에 정의했다. 역연산으로 처음 식을 복원한 뒤 다시 더하는 두 단계 설명을 남기고 구체적 연산만 묻는다."
    },
    {
      "id": "m2-01-08-xc17",
      "grade": "m2",
      "chapter": "1. 수와 식",
      "after": "직사각형의 넓이가 다항식이고 한 변의 길이가 단항식이면, 넓이를 그 변의 길이로 {나누어} 이웃한 다른 변의 길이를 구한다.",
      "completedDefinition": "직사각형의 넓이가 다항식이고 한 변의 길이가 단항식이면, 넓이를 그 변의 길이로 나누어 이웃한 다른 변의 길이를 구한다.",
      "studentSentence": "직사각형의 넓이가 다항식이고 한 변의 길이가 단항식이면, 넓이를 그 변의 길이로 □ 이웃한 다른 변의 길이를 구한다.",
      "expectedAnswers": [
        "나누어"
      ],
      "blindResponse": {
        "id": "m2-01-08-xc17",
        "answers": [
          "나누어"
        ],
        "alternativeAnswers": [],
        "reason": "'나누면'도 같은 뜻이다. 문제 없음."
      },
      "originalFinding": {
        "id": "m2-01-08-xc17",
        "grade": "m2",
        "section": "중2::1. 수와 식::다항식의 곱셈과 나눗셈",
        "sourceHash": "d9cb29cf1a696914487a1e88c2f0bfdbf7586d60803a7845432965bef7fb4814",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "넓이가 다항식이고 한 변이 단항식이면 넓이를 그 변으로 □ 다른 □을 구한다.",
        "expected": [
          "나누어",
          "변"
        ],
        "reason": "나누어/변은 정해진다('변'은 '한 변'에서 노출). 다만 직사각형이라는 전제가 없어 삼각형·평행사변형에는 틀린 절차가 된다.",
        "proposal": "'직사각형의'를 명시하고 둘째 빈칸은 '가로/세로' 등 노출되지 않는 형태로 조정한다.",
        "primaryReason": "어떤 도형의 넓이인지 빠져 있다. 넓이를 한 변으로 나누어 다른 변을 구하는 것은 직사각형 등의 조건이 필요하며, 임의의 도형에서 성립하는 방법이 아니다.",
        "primaryProposal": "직사각형의 넓이와 한 변이라는 대상을 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "삼각형의 넓이가 6x²이고 밑변이 3x이면 높이는 4x이다. 넓이를 밑변으로만 나누면 2x가 된다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "직사각형과 이웃한 다른 변의 길이라는 대상을 명시하여 삼각형·평행사변형의 반례를 배제했다. 넓이가 두 변의 곱이라는 계산을 유지했다."
    },
    {
      "id": "m2-02-01-xc13",
      "grade": "m2",
      "chapter": "2. 부등식",
      "after": "$a$가 상수일 때 $a-x$의 값의 범위는, $x$의 범위를 나타내는 부등식의 각 변에 $-1$을 곱해 {부등호 방향}을 바꾼 뒤 각 변에 $a$를 더해 구한다.",
      "completedDefinition": "$a$가 상수일 때 $a-x$의 값의 범위는, $x$의 범위를 나타내는 부등식의 각 변에 $-1$을 곱해 부등호 방향을 바꾼 뒤 각 변에 $a$를 더해 구한다.",
      "studentSentence": "$a$가 상수일 때 $a-x$의 값의 범위는, $x$의 범위를 나타내는 부등식의 각 변에 $-1$을 곱해 □을 바꾼 뒤 각 변에 $a$를 더해 구한다.",
      "expectedAnswers": [
        "부등호 방향"
      ],
      "blindResponse": {
        "id": "m2-02-01-xc13",
        "answers": [
          "부등호의 방향"
        ],
        "alternativeAnswers": [],
        "reason": "조사 '을' 때문에 '부등호'가 아니라 '부등호의 방향'으로 정해진다. 수학적으로 정확하다."
      },
      "originalFinding": {
        "id": "m2-02-01-xc13",
        "grade": "m2",
        "section": "중2::2. 부등식::부등식",
        "sourceHash": "20aa368ea9ea43e84bdc58676c0a154daa3ddb188182721e4aa7ca55b1223d97",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "math-error",
        "student": "$a-x$의 범위는 $-x$의 범위를 먼저 구해 □을 □ 뒤 $a$를 더한다.",
        "expected": [
          "부등호 방향",
          "바꾼"
        ],
        "reason": "부등호 방향/바꾼은 떠올릴 수 있다. 그러나 문장 순서가 '-x의 범위를 구한 뒤 방향을 또 바꾼다'로 읽혀 절차 서술이 부정확하다.",
        "proposal": "'x의 범위의 각 변에 -1을 곱해 부등호 방향을 바꾼 뒤 a를 더한다'로 순서를 바로잡는다.",
        "primaryReason": "문장 순서대로 읽으면 -x의 범위를 이미 구한 뒤 부등호 방향을 한 번 더 바꾸라는 절차가 된다. 방향을 바꾸는 것은 x의 범위에 -1을 곱해 -x의 범위를 만드는 순간이므로 순서가 혼동될 수 있다.",
        "primaryProposal": "x의 범위에 -1을 곱하면서 부등호 방향을 바꾸고, 이어 각 변에 a를 더한다는 순서로 명확히 한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "1<x<2이면 -2<-x<-1이다. 이 범위를 구한 뒤 부등호를 다시 뒤집으면 거짓이다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "x의 범위에서 출발해 -1을 곱할 때 한 번만 방향을 바꾸도록 순서를 바로잡았다. a가 상수라는 조건을 명시하고 범위 변환 연산의 설명을 보존했다."
    },
    {
      "id": "m2-02-03-xc14",
      "grade": "m2",
      "chapter": "2. 부등식",
      "after": "계수가 분수인 일차부등식의 자연수인 해의 개수를 구할 때에는, 분모의 최소공배수를 양변에 {곱해} 정수 계수로 고쳐 푼 뒤 해의 범위 안에 있는 자연수를 센다.",
      "completedDefinition": "계수가 분수인 일차부등식의 자연수인 해의 개수를 구할 때에는, 분모의 최소공배수를 양변에 곱해 정수 계수로 고쳐 푼 뒤 해의 범위 안에 있는 자연수를 센다.",
      "studentSentence": "계수가 분수인 일차부등식의 자연수인 해의 개수를 구할 때에는, 분모의 최소공배수를 양변에 □ 정수 계수로 고쳐 푼 뒤 해의 범위 안에 있는 자연수를 센다.",
      "expectedAnswers": [
        "곱해"
      ],
      "blindResponse": {
        "id": "m2-02-03-xc14",
        "answers": [
          "곱하여"
        ],
        "alternativeAnswers": [],
        "reason": "유일하다('곱해'는 같은 답). 양수를 곱하므로 부등호 방향이 바뀌지 않아 수학적으로 문제없다."
      },
      "originalFinding": {
        "id": "m2-02-03-xc14",
        "grade": "m2",
        "section": "중2::2. 부등식::일차부등식의 응용",
        "sourceHash": "8174e45876f78a9c65e4e0359969e6a5a3e2f0d22ca6063bb4d37afe213d4d85",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "계수가 분수인 부등식도 먼저 정수 계수로 고쳐 □, 범위 안의 □를 센다.",
        "expected": [
          "풀고",
          "자연수"
        ],
        "reason": "'범위 안의 □를 센다'에 자연수·정수·해가 모두 문법적으로 들어가고 각각 실제 문제 유형이다. 목표가 문장에 없어 특정할 수 없다.",
        "proposal": "'자연수인 해의 개수를 구할 때'라는 목적을 앞에 남긴다.",
        "primaryReason": "자연수인 해를 몇 개 찾는 문제라는 목표가 없다. '범위 안의 □를 센다'에는 자연수도 정수도 들어갈 수 있고, 두 경우는 세는 대상과 결과가 달라지므로 답의 종류를 특정할 수 없다.",
        "primaryProposal": "자연수인 해의 개수를 구할 때라는 목표를 문장 앞에 남긴다.",
        "initialAlternativeAnswers": [
          "정수"
        ],
        "initialCounterexample": "해가 -2<x<3이면 자연수 해는 2개이고 정수 해는 4개이다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "자연수 해의 개수라는 목표를 노출하여 정수·양수 등을 세는 다른 과제를 배제했다. 양의 공통분모를 곱하므로 부등호 방향을 보존한다는 절차를 남겼다. 자연수 답이 목표 조건에 노출되는 대신 정수 계수로 바꾸는 곱하기 연산을 묻는다."
    },
    {
      "id": "m2-03-02-xc1",
      "grade": "m2",
      "chapter": "3. 방정식",
      "after": "두 등식의 좌변은 좌변끼리, 우변은 우변끼리 더해도 등식이 {성립}한다. 즉 $A=B$, $C=D$이면 {$A+C=B+D$}이다.",
      "completedDefinition": "두 등식의 좌변은 좌변끼리, 우변은 우변끼리 더해도 등식이 성립한다. 즉 $A=B$, $C=D$이면 $A+C=B+D$이다.",
      "studentSentence": "두 등식의 좌변은 좌변끼리, 우변은 우변끼리 더해도 등식이 □한다. 즉 $A=B$, $C=D$이면 □이다.",
      "expectedAnswers": [
        "성립",
        "$A+C=B+D$"
      ],
      "blindResponse": {
        "id": "m2-03-02-xc1",
        "answers": [
          "성립",
          "$A+C=B+D$"
        ],
        "alternativeAnswers": [],
        "reason": "답이 정해지고 수학적으로 정확하다. $C+A=D+B$ 같은 표기는 동치식이다."
      },
      "originalFinding": {
        "id": "m2-03-02-xc1",
        "grade": "m2",
        "section": "중2::3. 방정식::연립방정식의 풀이",
        "sourceHash": "3c073fb4fb03e814bf1575790ecee05e9442dfdf732e85cc9c92e66abe05af0a",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "open-answer",
        "student": "두 등식의 좌변은 좌변끼리, 우변은 우변끼리 □ 등식이 □한다.",
        "expected": [
          "더해도",
          "성립"
        ],
        "reason": "변끼리 더해도, 빼도 등식이 성립한다. 가감법 단원에서 둘 다 핵심 내용이라 구별 단서가 없다.",
        "proposal": "'더해도'를 남기고 결론을 묻거나 A+C=B+D 꼴의 식을 함께 제시한다.",
        "primaryReason": "두 등식의 같은 쪽 변끼리 더해도, 빼도 각각 새로운 등식이 성립한다. 학생 문장에 어느 연산을 설명하는지 단서가 없어 더해도와 빼도는 동의어가 아닌 서로 다른 참인 답이다.",
        "primaryProposal": "덧셈에 대한 등식의 성질을 묻는다는 단서나 A+C=B+D와 같은 구조를 제시한다.",
        "initialAlternativeAnswers": [
          "빼도"
        ],
        "initialCounterexample": "a=b, c=d이면 a+c=b+d와 a-c=b-d가 모두 성립한다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "더하기 연산을 노출하여 빼기도 가능하다는 대안을 배제했다. 더한 뒤의 등식을 기호로도 완성하도록 하여 가감법의 이유를 유지했다."
    },
    {
      "id": "m2-03-04-xc19",
      "grade": "m2",
      "chapter": "3. 방정식",
      "after": "연립방정식의 해 $x$, $y$가 모두 자연수가 되는 상수 $k$를 찾으려면, 먼저 $x$와 $y$를 {$k$의 식}으로 나타낸 뒤 두 값이 모두 자연수가 되는지 확인한다.",
      "completedDefinition": "연립방정식의 해 $x$, $y$가 모두 자연수가 되는 상수 $k$를 찾으려면, 먼저 $x$와 $y$를 $k$의 식으로 나타낸 뒤 두 값이 모두 자연수가 되는지 확인한다.",
      "studentSentence": "연립방정식의 해 $x$, $y$가 모두 자연수가 되는 상수 $k$를 찾으려면, 먼저 $x$와 $y$를 □으로 나타낸 뒤 두 값이 모두 자연수가 되는지 확인한다.",
      "expectedAnswers": [
        "$k$의 식"
      ],
      "blindResponse": {
        "id": "m2-03-04-xc19",
        "answers": [
          "$k$에 대한 식"
        ],
        "alternativeAnswers": [],
        "reason": "'$k$의 식', '$k$를 사용한 식'은 같은 뜻이다. 구 단위의 서술형 빈칸이라 표기가 다양할 수 있으니 채점 허용 범위를 정해 두어야 한다."
      },
      "originalFinding": {
        "id": "m2-03-04-xc19",
        "grade": "m2",
        "section": "중2::3. 방정식::연립방정식의 풀이의 응용",
        "sourceHash": "af612f008f5996383b66bcef7d10e188c36d5bdf9c0a7b75049bf632f4459ac9",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "연립방정식의 해를 상수 $k$가 든 식으로 나타낸 다음, $x$와 $y$의 값이 □가 되는 $k$의 □을 찾는다.",
        "expected": [
          "모두 자연수",
          "조건"
        ],
        "reason": "해가 만족해야 할 조건 전체가 빈칸이라 자연수·정수·양수 등 서로 다른 과제가 모두 들어간다. 둘째 빈칸도 값/조건으로 갈린다.",
        "proposal": "'모두 자연수'를 문장에 남기고 절차의 다른 부분을 묻는다.",
        "primaryReason": "x와 y가 어떤 값이 되어야 하는지 조건 전체가 빈칸이다. 자연수 해, 정수 해, 양수 해 등은 서로 다른 k의 범위를 만드는 과제이며 현재 문장에는 자연수로 제한할 근거가 없다.",
        "primaryProposal": "x와 y가 자연수여야 한다는 조건을 남기고 이를 만족하는 k를 찾는 절차를 묻는다.",
        "initialAlternativeAnswers": [
          "모두 정수",
          "모두 양수"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "자연수 조건과 찾을 상수 k를 명시했다. 해의 조건을 통째로 가리거나 값/조건 중 무엇을 묻는지 모호하던 빈칸 대신 k로 해를 나타내는 대상을 묻는다."
    },
    {
      "id": "m2-04-02-xc5",
      "grade": "m2",
      "chapter": "4. 함수",
      "after": "$y$절편이 $0$인 일차함수의 그래프는 {원점}을 지난다.",
      "completedDefinition": "$y$절편이 $0$인 일차함수의 그래프는 원점을 지난다.",
      "studentSentence": "$y$절편이 $0$인 일차함수의 그래프는 □을 지난다.",
      "expectedAnswers": [
        "원점"
      ],
      "blindResponse": {
        "id": "m2-04-02-xc5",
        "answers": [
          "원점"
        ],
        "alternativeAnswers": [],
        "reason": "'점 $(0,0)$'은 같은 뜻이다. 문제 없음."
      },
      "originalFinding": {
        "id": "m2-04-02-xc5",
        "grade": "m2",
        "section": "중2::4. 함수::일차함수의 그래프와 절편",
        "sourceHash": "211b389889495f74d43d26f578c0dec6d6a46ead169a3ed136493e97339711de",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "$y$절편이 □인 일차함수의 그래프는 □을 지난다.",
        "expected": [
          "$0$",
          "원점"
        ],
        "reason": "조사 '□을'과 특수 사례의 대표성 때문에 0/원점이 자연스러운 답이다. 다만 'b / 점 (0, b)'라는 일반 진술도 참이어서 경계 사례다.",
        "proposal": "'원점'을 남기고 y절편 값을 묻거나 그 반대로 한다.",
        "primaryReason": "y절편의 값과 지나는 점을 모두 가려 어떤 절편 특성을 묻는지 남지 않는다. 0/원점 외에도 1/점(0,1)처럼 다른 값과 다른 점의 쌍이 모두 성립한다.",
        "primaryProposal": "y절편이 0이라는 조건 또는 원점을 지난다는 결론 중 하나를 남긴다.",
        "initialAlternativeAnswers": [
          "1 / 점 (0,1)"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "y절편 0을 노출하여 일반 b/점(0,b) 쌍을 배제했다."
    },
    {
      "id": "m2-04-04-xc5",
      "grade": "m2",
      "chapter": "4. 함수",
      "after": "두 일차함수의 식을 정리했을 때 똑같으면 그래프가 {일치}한다.",
      "completedDefinition": "두 일차함수의 식을 정리했을 때 똑같으면 그래프가 일치한다.",
      "studentSentence": "두 일차함수의 식을 정리했을 때 똑같으면 그래프가 □한다.",
      "expectedAnswers": [
        "일치"
      ],
      "blindResponse": {
        "id": "m2-04-04-xc5",
        "answers": [
          "일치"
        ],
        "alternativeAnswers": [],
        "reason": "답이 하나로 정해진다. 문제 없음."
      },
      "originalFinding": {
        "id": "m2-04-04-xc5",
        "grade": "m2",
        "section": "중2::4. 함수::일차함수의 그래프의 성질",
        "sourceHash": "6efc4f67b6686994c12ffef4c1854caf135aa0ac58b41fa3f88d69c9475e0a73",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "두 일차함수의 식을 정리했을 때 □ 그래프가 □한다.",
        "expected": [
          "똑같으면",
          "일치"
        ],
        "reason": "조건절과 결론을 모두 가려 '기울기가 같고 y절편이 다르면/평행', '기울기가 다르면/교차'도 들어간다. 어미 '한다'만으로는 학생이 일치를 특정하기 어렵다.",
        "proposal": "'식이 똑같으면'을 남기고 그래프의 관계만 묻는다.",
        "primaryReason": "두 식이 어떤 관계인지와 그래프의 위치 관계를 모두 가렸다. 식이 똑같으면 일치한다는 경우와 기울기만 같고 y절편이 다르면 평행한다는 경우를 학생 문장에서 구분할 단서가 없다.",
        "primaryProposal": "두 식을 정리한 결과가 똑같다는 조건을 남기고 그래프의 관계를 묻는다.",
        "initialAlternativeAnswers": [
          "기울기는 같고 y절편만 다르면 / 평행"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "식이 똑같다는 조건을 노출하여 기울기·절편 조건과 교차·평행의 결론을 함께 바꾸는 대안을 배제했다."
    },
    {
      "id": "m2-04-04-xc13",
      "grade": "m2",
      "chapter": "4. 함수",
      "after": "일차함수 $y=ax+b$에서 $a>0$, $b<0$이면 그래프는 오른쪽 {위}로 향하고 $y$축과 원점 {아래}에서 만난다.",
      "completedDefinition": "일차함수 $y=ax+b$에서 $a>0$, $b<0$이면 그래프는 오른쪽 위로 향하고 $y$축과 원점 아래에서 만난다.",
      "studentSentence": "일차함수 $y=ax+b$에서 $a>0$, $b<0$이면 그래프는 오른쪽 □로 향하고 $y$축과 원점 □에서 만난다.",
      "expectedAnswers": [
        "위",
        "아래"
      ],
      "blindResponse": {
        "id": "m2-04-04-xc13",
        "answers": [
          "위",
          "아래"
        ],
        "alternativeAnswers": [],
        "reason": "'위쪽/아래쪽'은 같은 뜻이다. 수학적으로 정확하다. 'y축과 원점 아래에서 만난다'는 'y축과 원점보다 아래쪽에서 만난다'로 다듬기를 권한다."
      },
      "originalFinding": {
        "id": "m2-04-04-xc13",
        "grade": "m2",
        "section": "중2::4. 함수::일차함수의 그래프의 성질",
        "sourceHash": "06ec6dee49d93ee72248e117e98a50bb47738e183c5c464dc135b192c0cffb50",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "$a>0$, $b<0$이면 그래프는 오른쪽 □로 향하고 $y$축과 원점 □에서 만난다.",
        "expected": [
          "위",
          "아래"
        ],
        "reason": "일차함수 단원에서 a, b는 y=ax+b의 관례로 읽혀 위/아래가 자연스러운 단일 답이라 confirmed는 과하다. 다만 관계식이 없고 같은 대단원에 ax+by+c=0 꼴도 있어 보강이 필요하다.",
        "proposal": "'일차함수 y=ax+b에서'를 문장 앞에 명시한다.",
        "primaryReason": "a와 b의 부호만 있고 y=ax+b라는 그래프의 관계식이 없다. 매개변수가 어느 항의 계수인지 알 수 없어 그래프의 방향이나 지나는 사분면을 결정할 수 없다.",
        "primaryProposal": "일차함수 y=ax+b의 그래프라는 대상을 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "a=1, b=-1일 때 y=ax+b와 y=-ax+b는 서로 다른 사분면을 지난다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "관계식 y=ax+b를 명시하여 a,b의 역할을 고정했다. ax+by+c=0의 계수 등 다른 해석을 배제했다."
    },
    {
      "id": "m2-04-04-xc15",
      "grade": "m2",
      "chapter": "4. 함수",
      "after": "일차함수 $y=ax+b$에서 $a>0$, $b<0$이면 그래프는 제$1$, $3$, $4$사분면을 지나고 제{$2$}사분면은 지나지 않는다.",
      "completedDefinition": "일차함수 $y=ax+b$에서 $a>0$, $b<0$이면 그래프는 제$1$, $3$, $4$사분면을 지나고 제$2$사분면은 지나지 않는다.",
      "studentSentence": "일차함수 $y=ax+b$에서 $a>0$, $b<0$이면 그래프는 제$1$, $3$, $4$사분면을 지나고 제□사분면은 지나지 않는다.",
      "expectedAnswers": [
        "$2$"
      ],
      "blindResponse": {
        "id": "m2-04-04-xc15",
        "answers": [
          "$2$"
        ],
        "alternativeAnswers": [],
        "reason": "수학적으로는 정확하다. 그러나 지나는 사분면 세 개가 문장에 나와 있어 남은 하나를 소거로 맞힐 수 있으므로 사실상 답이 노출된다. 지나는 사분면 쪽을 빈칸으로 바꾸거나 앞 구절을 지우기를 권한다."
      },
      "originalFinding": {
        "id": "m2-04-04-xc15",
        "grade": "m2",
        "section": "중2::4. 함수::일차함수의 그래프의 성질",
        "sourceHash": "64283090216aac59dd8d8c5df55390da50c635ca68807736ea5b158c6365ac82",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "missing-referent",
        "student": "$a>0$, $b<0$이면 그래프는 제$1$, $3$, $4$사분면을 지나고 제□사분면은 지나지 □.",
        "expected": [
          "$2$",
          "않는다"
        ],
        "reason": "나열된 세 사분면에서 소거로 2/않는다가 정해져 답 불능은 아니다. 다만 y=ax+b가 없고 답이 문장 내부에서 풀려 개념 확인 가치가 낮다.",
        "proposal": "관계식을 명시하고 '지나지 □' 빈칸은 제거한다.",
        "primaryReason": "y=ax+b라는 관계식은 없지만 이미 지나는 세 사분면이 남아 있어 빈칸의 제2사분면은 문장 내부에서 추론할 수 있다. 답의 범위가 불명확한 확정 사례로 세지 않고, a와 b의 부호로 이 그래프를 설명하는 근거가 독립 문장에도 필요한지 검토한다.",
        "primaryProposal": "일차함수 y=ax+b의 그래프라는 대상을 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "관계식 y=ax+b를 명시하고 부정 서술어 않다라는 범용 빈칸을 제거했다. 부호별 사분면의 내용은 유지했다."
    },
    {
      "id": "m2-04-04-xc16",
      "grade": "m2",
      "chapter": "4. 함수",
      "after": "일차함수 $y=ax+b$에서 $a<0$, $b<0$이면 그래프는 제$2$, $3$, $4$사분면을 지나고 제{$1$}사분면은 지나지 않는다.",
      "completedDefinition": "일차함수 $y=ax+b$에서 $a<0$, $b<0$이면 그래프는 제$2$, $3$, $4$사분면을 지나고 제$1$사분면은 지나지 않는다.",
      "studentSentence": "일차함수 $y=ax+b$에서 $a<0$, $b<0$이면 그래프는 제$2$, $3$, $4$사분면을 지나고 제□사분면은 지나지 않는다.",
      "expectedAnswers": [
        "$1$"
      ],
      "blindResponse": {
        "id": "m2-04-04-xc16",
        "answers": [
          "$1$"
        ],
        "alternativeAnswers": [],
        "reason": "수학적으로는 정확하다. xc15와 같이 지나는 사분면 세 개가 제시되어 소거만으로 답이 나온다. 같은 방식으로 고쳐야 한다."
      },
      "originalFinding": {
        "id": "m2-04-04-xc16",
        "grade": "m2",
        "section": "중2::4. 함수::일차함수의 그래프의 성질",
        "sourceHash": "04fa9192cf4d73477a13bf078177b8327090887d695139592498338b7e592458",
        "status": "needs_review",
        "initialStatus": "needs_review",
        "category": "missing-referent",
        "student": "$a<0$, $b<0$이면 그래프는 제$2$, $3$, $4$사분면을 지나고 제□사분면은 지나지 않는다.",
        "expected": [
          "$1$"
        ],
        "reason": "xc15와 같다. 소거로 1이 정해지지만 관계식이 빠져 있다.",
        "proposal": "'일차함수 y=ax+b에서'를 명시한다.",
        "primaryReason": "y=ax+b라는 관계식은 없지만 이미 지나는 세 사분면이 남아 있어 빈칸의 제1사분면은 문장 내부에서 추론할 수 있다. 답의 범위가 불명확한 확정 사례로 세지 않고, a와 b의 부호로 이 그래프를 설명하는 근거가 독립 문장에도 필요한지 검토한다.",
        "primaryProposal": "일차함수 y=ax+b의 그래프라는 대상을 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "관계식 y=ax+b를 명시하여 a,b가 기울기·절편임을 고정했다. 사분면의 결론은 그대로 유지했다."
    },
    {
      "id": "m2-05-04-xc1",
      "grade": "m2",
      "chapter": "5. 도형의 성질",
      "after": "삼각형의 내심은 보통 {$I$}로 나타내고, 내심에서 세 변까지 수직으로 잰 거리는 모두 {같다}.",
      "completedDefinition": "삼각형의 내심은 보통 $I$로 나타내고, 내심에서 세 변까지 수직으로 잰 거리는 모두 같다.",
      "studentSentence": "삼각형의 내심은 보통 □로 나타내고, 내심에서 세 변까지 수직으로 잰 거리는 모두 □.",
      "expectedAnswers": [
        "$I$",
        "같다"
      ],
      "blindResponse": {
        "id": "m2-05-04-xc1",
        "answers": [
          "I",
          "같다"
        ],
        "alternativeAnswers": [],
        "reason": "첫 빈칸은 관례 기호 I, 둘째 빈칸은 '같다'로 복원된다. '내접원의 반지름의 길이와 같다'는 같은 사실을 더 자세히 쓴 것이다. 첫 빈칸은 수학적 추론이 아닌 표기 관례를 묻는다."
      },
      "originalFinding": {
        "id": "m2-05-04-xc1",
        "grade": "m2",
        "section": "중2::5. 도형의 성질::삼각형의 내심",
        "sourceHash": "cdccf64ff941f97e52c484a1bb791cb7b489cfd525d176195a114092747f49eb",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "answer-leak",
        "student": "내심은 보통 □로 나타내고, $I$에서 세 변까지 수직으로 잰 거리는 모두 □.",
        "expected": [
          "$I$",
          "같다"
        ],
        "reason": "첫 빈칸의 I가 바로 뒤 'I에서'에 노출된다. 답은 분명하다.",
        "proposal": "뒤의 I를 '내심'으로 바꾼다.",
        "primaryReason": "내심을 나타내는 문자 I를 묻는 첫 빈칸 직후에 'I에서 세 변까지'라고 정답이 그대로 제시된다.",
        "primaryProposal": "기호를 한 번만 제시하고 반복되는 I는 '그 점'으로 가리키는 방향을 검토한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "뒤 절의 문자 I를 내심으로 바꾸어 기호가 답으로 노출되지 않게 했다. 내심의 표기 관례와 세 변까지 같은 거리라는 성질을 보존했다. 삼각형이라는 대상을 명시했다."
    },
    {
      "id": "m2-05-05-xc1",
      "grade": "m2",
      "chapter": "5. 도형의 성질",
      "after": "두 변이 평행함은 두 변 사이에 기호 {$\\parallel$}를 써서 나타낸다.",
      "completedDefinition": "두 변이 평행함은 두 변 사이에 기호 $\\parallel$를 써서 나타낸다.",
      "studentSentence": "두 변이 평행함은 두 변 사이에 기호 □를 써서 나타낸다.",
      "expectedAnswers": [
        "$\\parallel$"
      ],
      "blindResponse": {
        "id": "m2-05-05-xc1",
        "answers": [
          "$\\parallel$"
        ],
        "alternativeAnswers": [],
        "reason": "'//' 표기는 같은 기호다. 답이 하나로 정해진다."
      },
      "originalFinding": {
        "id": "m2-05-05-xc1",
        "grade": "m2",
        "section": "중2::5. 도형의 성질::평행사변형의 성질",
        "sourceHash": "8db25cafc72590b51d97de91a676f575b3c83833472ddc739c8a41ab5eee928d",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "answer-leak",
        "student": "두 변이 평행함은 기호 □를 써서 $\\overline{AB}\\parallel\\overline{DC}$처럼 □.",
        "expected": [
          "$\\parallel$",
          "나타낸다"
        ],
        "reason": "평행 기호가 뒤 예시에 그대로 있어 복사할 수 있다. '나타낸다'는 자연스러운 서술어라 명료성 문제는 없다.",
        "proposal": "예시를 빼거나 예시의 기호를 가린다.",
        "primaryReason": "평행 기호를 묻는 첫 빈칸의 기호가 뒤의 AB∥DC 예시에 그대로 남는다. 기호를 회상하지 않고 예시에서 복사할 수 있다.",
        "primaryProposal": "기호 쓰기와 예시 읽기를 분리하거나 예시에서도 기호를 가린다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "단순 반복 노출은 학생 응답 모호의 확정 근거로 삼지 않고 회상 문항의 편집 검토 후보로 구별한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "뒤 예시의 평행 기호 노출과 범용 서술어 나타낸다 빈칸을 제거했다. 평행을 나타내는 기호의 정의는 유지했다."
    },
    {
      "id": "m2-05-05-xc14",
      "grade": "m2",
      "chapter": "5. 도형의 성질",
      "after": "평행사변형 $ABCD$의 두 대각선의 교점을 $O$라 하자. $\\triangle OAB$와 $\\triangle OCD$는 길이가 같은 대변 $AB$, $CD$와 그 양 끝의 엇각을 이용해 {$\\mathrm{ASA}$} 합동이므로 $\\overline{OA}=\\overline{OC}$이다.",
      "completedDefinition": "평행사변형 $ABCD$의 두 대각선의 교점을 $O$라 하자. $\\triangle OAB$와 $\\triangle OCD$는 길이가 같은 대변 $AB$, $CD$와 그 양 끝의 엇각을 이용해 $\\mathrm{ASA}$ 합동이므로 $\\overline{OA}=\\overline{OC}$이다.",
      "studentSentence": "평행사변형 $ABCD$의 두 대각선의 교점을 $O$라 하자. $\\triangle OAB$와 $\\triangle OCD$는 길이가 같은 대변 $AB$, $CD$와 그 양 끝의 엇각을 이용해 □ 합동이므로 $\\overline{OA}=\\overline{OC}$이다.",
      "expectedAnswers": [
        "$\\mathrm{ASA}$"
      ],
      "blindResponse": {
        "id": "m2-05-05-xc14",
        "answers": [
          "ASA"
        ],
        "alternativeAnswers": [],
        "reason": "한 변과 그 양 끝 각이므로 ASA로 유일하다. 엇각 ∠OAB=∠OCD, ∠OBA=∠ODC도 정확하다."
      },
      "originalFinding": {
        "id": "m2-05-05-xc14",
        "grade": "m2",
        "section": "중2::5. 도형의 성질::평행사변형의 성질",
        "sourceHash": "bbe1a00f45389472553678ce663273172ce53506e52e74b2bf2397e684f08f6b",
        "status": "needs_review",
        "initialStatus": "confirmed",
        "category": "missing-referent",
        "student": "두 대각선의 교점 $O$에 대해 $\\triangle OAB$와 $\\triangle OCD$가 □ 합동이 되어 $\\overline{OA}=\\overline{OC}$임이 □된다.",
        "expected": [
          "$\\mathrm{ASA}$",
          "증명"
        ],
        "reason": "ABCD가 평행사변형이라는 가정이 없어 진술 자체는 일반 사각형에서 거짓이다. 그래도 표준 증명을 아는 학생은 ASA를 쓸 수 있어 답 불능은 아니며, '증명'은 '확인·설명'과 갈리는 약한 빈칸이다.",
        "proposal": "'평행사변형 ABCD에서'를 명시하고(수정 권장) 둘째 빈칸은 제거를 검토한다.",
        "primaryReason": "ABCD가 평행사변형이라는 대상 조건이 없고 두 대각선의 교점 O만 제시된다. 임의의 사각형에서 OAB와 OCD는 ASA 합동이 아니며 OA=OC도 보장되지 않는다.",
        "primaryProposal": "평행사변형 ABCD의 두 대각선 교점이라는 조건을 명시한다.",
        "initialAlternativeAnswers": [],
        "initialCounterexample": "윗변과 아랫변 길이가 다른 사다리꼴의 대각선 교점은 각 대각선을 이등분하지 않는다.",
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "평행사변형 ABCD라는 가정을 노출했다. 같은 대변과 양 끝 각이라는 합동 근거를 명시하여 SAS·AAS 등 다른 합동 설명을 구별하고 범용 증명 빈칸을 제거했다. 같은 대변이라는 표현을 길이가 같은 대변으로 다듬었다."
    },
    {
      "id": "m2-05-07-xc14",
      "grade": "m2",
      "chapter": "5. 도형의 성질",
      "after": "사각형이 {마름모}이면 두 대각선이 서로를 수직이등분하고, 거꾸로 이 조건을 만족하면 그 도형으로 판별할 수 있다. 정사각형도 이 부류에 속한다.",
      "completedDefinition": "사각형이 마름모이면 두 대각선이 서로를 수직이등분하고, 거꾸로 이 조건을 만족하면 그 도형으로 판별할 수 있다. 정사각형도 이 부류에 속한다.",
      "studentSentence": "사각형이 □이면 두 대각선이 서로를 수직이등분하고, 거꾸로 이 조건을 만족하면 그 도형으로 판별할 수 있다. 정사각형도 이 부류에 속한다.",
      "expectedAnswers": [
        "마름모"
      ],
      "blindResponse": {
        "id": "m2-05-07-xc14",
        "answers": [
          "마름모"
        ],
        "alternativeAnswers": [],
        "reason": "성질과 역이 모두 성립하는 도형은 마름모뿐이고, 끝 문장이 '정사각형'을 답에서 배제한다."
      },
      "originalFinding": {
        "id": "m2-05-07-xc14",
        "grade": "m2",
        "section": "중2::5. 도형의 성질::직사각형, 마름모, 정사각형",
        "sourceHash": "59772389121d5a23d057cc80d82b20b766127c079058b8691bc69446d4716bd2",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "두 대각선이 서로를 □하는 사각형은 □이다.",
        "expected": [
          "수직이등분",
          "마름모"
        ],
        "reason": "수직이등분/마름모와 이등분/평행사변형이 모두 교과서 진술로 참이며 구별 단서가 없다.",
        "proposal": "'수직이등분'을 남기고 도형 이름만 묻는다.",
        "primaryReason": "대각선의 성질과 사각형 이름을 함께 가려 어떤 분류를 정의하는지 알 수 없다. 수직이등분/마름모 외에 이등분/평행사변형도 서로 다른 참인 정의이다.",
        "primaryProposal": "수직으로 서로를 이등분한다는 조건 또는 마름모라는 이름을 남긴다.",
        "initialAlternativeAnswers": [
          "이등분 / 평행사변형"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "수직이등분 조건을 노출하여 이등분/평행사변형 쌍을 배제했다. 통틀어라는 범위를 명시하고 정사각형의 포함 관계를 설명하여 하위 도형만 답하는 모호성을 피했다. 대각선 조건과 도형의 관계를 양방향으로 표현하여 평행사변형 같은 상위 도형과 정사각형 같은 하위 도형 모두를 배제했다. 정사각형의 포함 관계는 남기되 마름모 답의 반복은 지웠다."
    },
    {
      "id": "m2-05-07-xc15",
      "grade": "m2",
      "chapter": "5. 도형의 성질",
      "after": "사각형이 {정사각형}이면 두 대각선의 길이가 같고 서로를 수직이등분하며, 거꾸로 이 두 조건을 만족하면 그 도형으로 판별할 수 있다.",
      "completedDefinition": "사각형이 정사각형이면 두 대각선의 길이가 같고 서로를 수직이등분하며, 거꾸로 이 두 조건을 만족하면 그 도형으로 판별할 수 있다.",
      "studentSentence": "사각형이 □이면 두 대각선의 길이가 같고 서로를 수직이등분하며, 거꾸로 이 두 조건을 만족하면 그 도형으로 판별할 수 있다.",
      "expectedAnswers": [
        "정사각형"
      ],
      "blindResponse": {
        "id": "m2-05-07-xc15",
        "answers": [
          "정사각형"
        ],
        "alternativeAnswers": [],
        "reason": "대각선의 길이가 같고 서로 수직이등분한다는 조건과 그 역이 모두 성립하는 도형은 정사각형뿐이다."
      },
      "originalFinding": {
        "id": "m2-05-07-xc15",
        "grade": "m2",
        "section": "중2::5. 도형의 성질::직사각형, 마름모, 정사각형",
        "sourceHash": "b085e5d76bdd7693a35e5e8bbf367fa430e2388556591d2a0efad2bae626114c",
        "status": "confirmed",
        "initialStatus": "confirmed",
        "category": "hidden-condition",
        "student": "두 대각선이 길이가 같고 서로를 □하는 사각형은 □이다.",
        "expected": [
          "수직이등분",
          "정사각형"
        ],
        "reason": "수직이등분/정사각형과 이등분/직사각형이 모두 참인 표준 진술이다.",
        "proposal": "조건을 남기고 도형 이름만 묻거나, 이름을 남기고 조건을 묻는다.",
        "primaryReason": "대각선의 길이가 같다는 조건만 남기고 추가 성질과 사각형 이름을 모두 가렸다. 수직이등분/정사각형과 이등분/직사각형은 서로 다른 도형 범위를 정의하며 모두 문장을 참으로 완성한다.",
        "primaryProposal": "서로 수직으로 이등분한다는 조건을 남겨 정사각형이라는 결론을 묻는다.",
        "initialAlternativeAnswers": [
          "이등분 / 직사각형"
        ],
        "initialCounterexample": null,
        "additionalEvidence": null,
        "adjudication": "독립 검토 근거와 학생 문장을 대조한 뒤 Claude 판정을 최종 분류에 반영한다.",
        "batch": "m1m2-extra"
      },
      "authorReason": "대각선의 두 조건을 모두 노출하여 이등분/직사각형이라는 다른 참 답 쌍을 배제했다. 통틀어라고 표현하여 마름모·직사각형 같은 더 넓은 도형명으로 답하는 경우와 구별했다. 대각선의 동치 성질을 양방향으로 표현하여 마름모·직사각형 같은 상위 도형 이름은 두 조건을 모두 보장하지 않으므로 답이 될 수 없게 했다."
    },
    {
      "id": "m2-05-06-c5",
      "grade": "m2",
      "chapter": "5. 도형의 성질",
      "after": "사각형이 {평행사변형}이면 두 대각선이 서로를 이등분하고, 거꾸로 이 조건을 만족하면 그 도형으로 판별할 수 있다.",
      "completedDefinition": "사각형이 평행사변형이면 두 대각선이 서로를 이등분하고, 거꾸로 이 조건을 만족하면 그 도형으로 판별할 수 있다.",
      "studentSentence": "사각형이 □이면 두 대각선이 서로를 이등분하고, 거꾸로 이 조건을 만족하면 그 도형으로 판별할 수 있다.",
      "expectedAnswers": [
        "평행사변형"
      ],
      "blindResponse": {
        "id": "m2-05-06-c5",
        "answers": [
          "평행사변형"
        ],
        "alternativeAnswers": [],
        "reason": "답은 평행사변형으로 유일하게 정해진다. 앞 절(두 대각선이 서로를 이등분)만 보면 직사각형, 마름모, 정사각형도 참이지만, 뒤 절이 역(두 대각선이 서로를 이등분하면 그 도형이다)까지 요구하므로 이들은 탈락한다. 대각선이 서로를 이등분한다는 조건만으로는 직사각형, 마름모, 정사각형이라고 판별할 수 없기 때문이다. 등변사다리꼴과 일반 사다리꼴은 앞 절부터 거짓이다. 문장에 답이 노출되어 있지 않고 조건도 충분하다. 수학적으로는 평행사변형의 성질과 판별 조건(필요충분)으로 정확하며, 중2 용어 수준에도 맞다. 다만 교과서 표준 표현은 '두 대각선이 서로 다른 것을 이등분한다'이므로 '서로를 이등분하고'는 표기 통일을 검토할 만하다(오류는 아님)."
      },
      "originalFinding": {
        "id": "m2-05-06-c5",
        "grade": "m2",
        "section": "중2::5. 도형의 성질::평행사변형이 되는 조건",
        "status": "confirmed",
        "category": "hidden-condition",
        "student": "두 대각선이 서로를 □하는 사각형은 □이다.",
        "expected": [
          "이등분",
          "평행사변형"
        ],
        "reason": "리드 추가 msg_64655ca4f891: m2-05-07-xc14와 대단원 안 학생 문장이 같고 이등분/평행사변형, 수직이등분/마름모의 다른 참 답이 가능하다."
      },
      "authorReason": "리드의 대단원 동일 문장 대조에서 추가된 항목이다. 이등분/평행사변형과 수직이등분/마름모의 다른 참 답 쌍을 해소하기 위해 대각선의 이등분 조건을 노출하고 양방향 판별을 명시했다. 직사각형·마름모 같은 하위 도형도 충분하지만 필요하지는 않으므로 양방향 문장은 평행사변형만 특정한다."
    }
  ]
}