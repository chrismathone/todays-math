"""탐험 카드 문장 보정안(우리 말) → docs/reference/concept-terms/card-sentence-fixes.json (트랙 coverage, 2026-09-28).

원본(`src/lib/math-explorers/definition-content.ts` 215장 · `definition-cards.ts` 옛 카드 15장, 둘 다 PROVENANCE SHA)은 고치지 않는다.
보정은 원본 밖 표(id → 바꿀 칸)로 둔다 — 구현은 리드가 따로 맡긴다(옆 트랙 concept-context). 카드 id 는 그대로라 학생 기록이 이어진다.
표는 카드를 **내보내는 층**(`definitionCards`)에서 덮어써야 한다 — 화면 · 서버 채점 · 복습 · 선수가 같은 카드를 읽게(codex 지적).

결정: Claude · codex · grok 세 답(각자 따로, 같은 브리프) → 합의 또는 2:1. 표 칸 `votes` · `severityVotes` · `decidedBy` 에 남긴다(coverage.md §8).

보정안마다 코드가 확인하는 것:
  ① 문장 틀: 빈칸 {..} 정확히 둘 · 말 네 개(정답 둘 = 빈칸 순서 · 틀린 말 둘)가 서로 다르다 · 말 조각 셋 · 보기는 맞는/틀린 것이 다 있고 서로 다르다
     (엔진 시험 `mathExplorersEngine.test.ts` 와 같은 조건)
  ② 교재 원문과 겹침 0: 새로 쓴 글(문장 · 이름 · 보기 제목 · 함정 · 해설 · 보기)을 14권 원문 문장의 12글자 창(한글 4자 이상,
     아무것도 걷어내지 않음)과 맞대어 하나라도 같으면 멈춘다. 원문은 저장소 밖(`C:\\Creative\\testautocreator-data\\I-개념용어`).

실행: python scripts/qa/concept-terms/build-card-fixes.py --cards <카드.json> [--check]
"""

import argparse
import glob
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
OUT = os.path.join(ROOT, "docs", "reference", "concept-terms", "card-sentence-fixes.json")
DATA = r"C:\Creative\testautocreator-data\I-개념용어"
SEVERITY = ["틀림", "빠짐", "낱말", "범위"]

V3 = {"claude": "고침", "codex": "고침", "grok": "고침"}
AGREE = "3자 일치"


def ex(*pairs):
    return [{"text": t, "yes": y} for t, y in pairs]


def sev(c, x, g):
    """심각도 표(Claude · codex · grok) — 둘 이상 같은 쪽을 따른다."""
    return {"claude": c, "codex": x, "grok": g}


# 문장은 Claude 초안을 바탕으로, 두 답 이상이 같이 낸 덧붙임(보기 · 해설)을 합쳤다.
FIXES: list = [
    dict(id="g6-net", severity="틀림", sevVotes=sev("틀림", "범위", "틀림"), votes=V3, decidedBy=AGREE,
         issue="면을 잘라 펼친다고 적었다 — 각기둥 · 각뿔의 전개도는 모서리를 잘라 펼친 그림이다(5-2 · 6-1). 이 카드는 «각기둥·각뿔과 공간» 단원이라 범위도 그 둘로",
         template="각기둥이나 각뿔을 {모서리}를 따라 잘라 {평면} 위에 펼친 그림.", wrong=["면", "공간"],
         alsoCheck="원기둥의 전개도(6-2)는 모서리가 없다 — 원 단원에서 다룰 때 따로 말한다"),
    dict(id="g8-two-variable", severity="틀림", sevVotes=sev("틀림", "범위", "틀림"), votes=V3, decidedBy=AGREE,
         issue="«a, b가 동시에 0이 아닌»이면 한쪽이 0인 식(미지수 하나)도 들어간다 — 중2 교재는 두 미지수의 차수가 모두 1(a, b 둘 다 0이 아님). «식» → «방정식». 보기에도 미지수가 하나인 식을 넣는다(codex · grok)",
         template="ax+by+c=0에서 a, b가 {둘 다 0이 아닌} 방정식이며 해를 {순서쌍}으로 나타낸다.", wrong=["모두 0인", "평균"],
         examples=ex(("x + y = 3", True), ("2x − y = 1", True), ("x² + y = 3", False), ("y = 3", False)),
         explanation="a나 b가 0이면 미지수가 하나뿐인 방정식이 돼. (1,2), (0,3)처럼 해가 여러 개일 수 있어."),
    dict(id="g8-simultaneous", severity="틀림", sevVotes=sev("틀림", "틀림", "틀림"), votes=V3, decidedBy=AGREE,
         issue="공통인 해를 구하는 일(푸는 행동)을 연립방정식이라 했다 — 연립방정식은 방정식 여럿을 한 묶음으로 적은 것이고, 해를 구하는 일은 «연립방정식을 푼다»",
         template="둘 이상의 방정식을 {한데 묶어} 나타낸 것이며, 모든 방정식을 함께 참이 되게 하는 값을 그 {해}라고 한다.",
         wrong=["따로 버려", "평균"]),
    dict(id="g8-substitution", severity="빠짐", sevVotes=sev("빠짐", "빠짐", "빠짐"), votes=V3, decidedBy=AGREE,
         issue="무엇을 푸는지(연립방정식)가 문장에 없다",
         template="연립방정식의 한 식에서 구한 미지수의 표현을 {다른 식}에 {넣어} 푸는 방법.", wrong=["같은 식만", "빼서"]),
    dict(id="g8-elimination", severity="빠짐", sevVotes=sev("빠짐", "빠짐", "빠짐"), votes=V3, decidedBy=AGREE,
         issue="무엇을 푸는지(연립방정식)가 문장에 없다",
         template="연립방정식을 풀 때 두 식을 더하거나 빼서 한 {미지수}를 {없애는} 방법.", wrong=["해", "늘리는"],
         alsoCheck="계수를 맞추는 단계(양변에 같은 수를 곱함)는 함정 문장이 이미 말한다"),
    dict(id="g9-axis", severity="낱말", sevVotes=sev("틀림", "낱말", "낱말"), votes=V3, decidedBy=AGREE,
         issue="«꼭짓점을 지나는 수직선» — 교재에서 «수직선»은 수를 나타내는 직선이다. 세로 직선 뜻으로 잘못 쓴다",
         template="y=a(x−p)²+q 그래프의 대칭축은 직선 {x=p}이며 꼭짓점을 지나고 {x축}에 수직이다.", wrong=["x=q", "y축"],
         revision=dict(date="2026-09-28", votes="1차 (A) 2:1(grok B) → 2차 (A′) 3:0",
                       why="리드 적대적 검토 ② — «y축에 평행»은 p=0 이면 틀린다(축이 y축 자신 — 같은 카드 보기 y=x²+2 · 함정 «언제나 y축»과 부딪침). "
                           "«x축에 수직»은 p=0 에서도 참. 1차 (A)의 오답 말 y=p 는 둘째 칸에 넣어도 참(가로선 ⟂ 세로선 — grok 반례)이라 x=q 로")),
    dict(id="g9-parabola", severity="낱말", sevVotes=sev("낱말", "낱말", "낱말"), votes=V3, decidedBy=AGREE,
         issue="«a>0이면 위로 열린다» — 교재 낱말은 a>0이면 «아래로 볼록». «위로 열린다»와 «위로 볼록»이 반대 모양이라 헷갈린다. 해설에 두 말을 이어 준다(codex · grok)",
         template="이차함수 그래프처럼 한 축에 대하여 {대칭}인 곡선으로 a>0이면 {아래로 볼록}하다.", wrong=["비대칭", "위로 볼록"],
         exampleTitle="그래프가 아래로 볼록한 함수를 골라봐.",
         trap="y=−x²의 그래프는 아래로 볼록하다.", truth=False,
         explanation="x²의 계수가 음수이면 위로 볼록해. 흔히 «위로 열린다»고 하는 모양이 아래로 볼록한 모양이야."),
    dict(id="g8-pythagoras", severity="낱말", sevVotes=sev("낱말", "낱말", "낱말"), votes=V3, decidedBy=AGREE,
         issue="«직각변»은 교재에 없는 낱말(보기 제목에도)",
         template="직각삼각형에서 빗변이 아닌 두 변의 길이의 {제곱의 합}은 빗변의 길이의 {제곱}과 같다.", wrong=["합", "곱"],
         exampleTitle="빗변이 아닌 두 변이 3, 4인 직각삼각형의 빗변 설명을 골라봐.",
         explanation="빗변을 c, 나머지 두 변을 a, b라 하면 a²+b²=c²이야. 직각삼각형인지 먼저 확인하고 빗변을 정확히 골라.",
         revision=dict(date="2026-09-28", votes="1차 3:0 · 오답 말 «곱» 2차 3:0",
                       why="빈칸 맞바꿈 대칭 검사(리드 적대적 검토 ①의 시험)에서 새로 걸림 — «{a²+b²}={c²}»는 등식이라 맞바꾼 c²=a²+b² 도 참이어서 "
                           "자리 채점이 맞는 답을 틀림으로 친다. 말로 자리를 박고 식은 보기(3²+4²=5²) · 해설로. 오답 말 «두 배»는 조사(«두 배은»)로 걸러져 «곱»으로")),
    dict(id="g8-complement", severity="낱말", sevVotes=sev("낱말", "낱말", "낱말"), votes=V3, decidedBy=AGREE,
         issue="카드 이름 «여사건»은 고등 낱말 — 문장은 맞다. 이름만 바꾼다(id 는 그대로)",
         template="어떤 사건이 일어나지 않을 확률은 {1}에서 그 사건의 확률을 {뺀} 값이다.", wrong=["0", "더한"],
         name="일어나지 않을 확률"),
    dict(id="g6-divide-size", severity="낱말", sevVotes=sev("낱말", "낱말", "낱말"), votes=V3, decidedBy=AGREE,
         issue="초6 카드에 중1 낱말 «양수»",
         template="0보다 큰 수를 {0과 1 사이의 수}로 나누면 몫은 원래 수보다 커지고, {1보다 큰 수}로 나누면 작아진다.",
         wrong=["1", "0과 2 사이의 수"],
         revision=dict(date="2026-09-28", votes="(B) 2:1 — grok (A) «오답 말만 변하지 않고 · 변하지 않는다»",
                       why="리드 지시(넓은 검사에서 3자 모두 결함) — 원래 카드에서 물려받은 오답 말 «작아지고 · 커진다»가 정답과 같은 뜻의 활용형이라 "
                           "«…커진다, 1보다 큰 수로 나누면 작아진다»처럼 맞는 문장이 틀림이 됐다. 빈칸을 나누는 수 쪽으로 옮기고 오답 말은 "
                           "1(몫이 그대로) · 0과 2 사이의 수(커지기도 작아지기도)로 — 정답 아닌 채움 11개가 모두 거짓. grok 반론: «0과 2 사이의 수»를 "
                           "«그 범위의 어떤 수»로 읽으면 참 — 성질 문장은 «모든 수»로 읽고, 그 읽기까지 막는 범위형 오답은 «1» 말고 없다")),
    dict(id="g5-operation-order", severity="빠짐", sevVotes=sev("빠짐", "빠짐", "빠짐"), votes=V3, decidedBy=AGREE,
         issue="같은 단계(덧셈·뺄셈끼리, 곱셈·나눗셈끼리)는 왼쪽부터 — 교재 소단원의 핵심인데 문장엔 없고 해설에만. 보기에도 넣는다(세 답 모두)",
         template="덧셈·뺄셈과 곱셈·나눗셈이 섞인 식은 괄호 안을 먼저, 그다음 {곱셈·나눗셈}을 하고, 같은 단계끼리는 {왼쪽}부터 계산한다.",
         wrong=["덧셈·뺄셈", "오른쪽"],
         examples=ex(("(2 + 3) × 4 = 20", True), ("12 ÷ 3 × 2 = 8", True), ("2 + 3 × 4 = 20", False), ("12 ÷ 3 × 2 = 2", False))),
    dict(id="g5-fraction-multiply", severity="범위", sevVotes=sev("빠짐", "범위", "범위"), votes=V3, decidedBy=AGREE,
         issue="모든 분수에 한 줄 규칙 — 대분수는 가분수로 바꾼 뒤 곱한다. 대분수에 그대로 쓰면 틀린 답. 보기에 대분수를 넣는다(세 답 모두)",
         template="대분수는 가분수로 바꾼 뒤, {분자끼리} 곱한 값을 분자로, {분모끼리} 곱한 값을 분모로 하는 분수를 만든다.",
         wrong=["분모와", "분자와"],
         revision=dict(date="2026-09-28", votes="3:0",
                       why="리드 적대적 검토 ① — «두 분수의 {분자끼리} 곱한 값과 {분모끼리} 곱한 값으로 새 분수를»는 두 조각을 맞바꿔도 참이라 "
                           "자리 채점이 맞는 답을 틀림으로 치고(첫 판 14/15 · 기억 복습이면 차례가 처음으로), 어느 곱이 분자인지도 없었다. 빈칸 뒤 «분자로» · «분모로»가 자리를 박는다"),
         examples=ex(("1/2 × 1/3 = 1/6", True), ("1과 1/2 × 2/3 = 1", True), ("1/2 × 1/3 = 1/5", False), ("1과 1/2 × 2/3 = 1과 1/3", False))),
    dict(id="g7-vertical-angle", severity="범위", sevVotes=sev("범위", "범위", "범위"), votes=V3, decidedBy=AGREE,
         issue="정의 뒤에 성질(크기가 같다)을 붙였고 빈칸 둘이 성질 쪽 — «정의» 딱지로 성질을 조립시킨다. 빈칸을 뜻 쪽으로 옮기고, 크기가 같다는 성질은 보기 · 함정(참)에 남긴다",
         template="서로 엇갈리는 두 직선이 만드는 {네 각} 가운데 꼭짓점을 사이에 두고 {마주 보는} 두 각.", wrong=["세 각", "이웃한"],
         explanation="이웃한 각과 맞꼭지각을 구별해. 두 각의 크기가 같다는 건 뜻이 아니라 성질이야."),
    dict(id="g9-inscribed-angle", severity="범위", sevVotes=sev("범위", "범위", "범위"), votes=V3, decidedBy=AGREE,
         issue="정의 뒤에 성질(같은 호의 중심각의 절반)을 붙였고 둘째 빈칸이 성질 쪽 — 빈칸을 뜻 쪽으로, 성질은 보기 · 함정에 남긴다",
         template="원 위의 {한 점}을 꼭짓점으로 하고 두 변이 원의 {현}을 포함하는 각.", wrong=["중심", "접선"]),
    dict(id="g6-ratio", severity="빠짐", sevVotes=sev("범위", "빠짐", "빠짐"), votes=V3, decidedBy=AGREE,
         issue="교재는 뺄셈 비교와 나눗셈 비교를 가른 뒤 나눗셈 비교를 비로 정한다 — 카드엔 «나눗셈»이 없다",
         template="두 양의 크기를 {나눗셈}으로 견주기 위해 {a:b}처럼 나타낸 것.", wrong=["뺄셈", "a+b"],
         explanation="어느 양을 앞에 놓았는지 확인해. 빼서 견주는 것과 달리 비는 한 양이 다른 양의 몇 배인지를 견줘."),
    dict(id="g9-correlation", severity="범위", sevVotes=sev("범위", "범위", "빠짐"), votes=V3, decidedBy=AGREE,
         issue="이름은 «상관관계»인데 문장은 양 · 음의 상관관계만 — 함께 변하는 경향이 있는지가 먼저다. 해설에 «경향이 없으면 상관관계가 없다»(codex · grok)",
         template="두 변량 중 한쪽이 변할 때 다른 쪽도 {함께 변하는} 경향이 있는 관계이며, 함께 커지는 쪽이면 {양의 상관관계}이다.",
         wrong=["늘 같은 값인", "음의 상관관계"],
         explanation="함께 변하는 경향만으로 원인이라고 단정할 수 없어. 뚜렷한 경향이 없으면 상관관계가 없다고 해."),
    dict(id="g8-cases", severity="범위", sevVotes=sev("범위", "빠짐", "범위"), votes=V3, decidedBy=AGREE,
         issue="«모든 가능한 결과의 개수»라 전체 결과 수로 읽힌다 — 경우의 수는 한 사건이 일어나는 가짓수(사건마다 따로). 보기도 사건을 세게 바꾼다(codex · grok)",
         template="한 사건에 해당하는 {가능한 결과}를 빠짐없이 센 {개수}.", wrong=["평균", "합계의 값"],
         exampleTitle="주사위 한 개를 던져 짝수의 눈이 나오는 경우를 바르게 설명한 것을 골라봐.",
         examples=ex(("경우의 수는 3", True), ("2, 4, 6이 나오는 경우", True), ("경우의 수는 6", False), ("경우의 수는 2", False))),
    dict(id="g9-vertex", severity="범위", sevVotes=sev("범위", "빠짐", "범위"), votes=V3, decidedBy=AGREE,
         issue="«방향이 바뀌는 점»이라 적었고 빈칸 둘이 좌표 · 위치(성질) 쪽 — 포물선과 축이 만나는 점으로 뜻을 세운다(이름 «포물선의 꼭짓점»은 codex 만의 제안 — 원장님께 여쭐 것)",
         template="포물선이 {축}과 만나는 점이며, y=a(x−p)²+q의 그래프에서는 {(p, q)}이다.", wrong=["x축", "(−p, q)"]),
    # ── 둘째 협의(리드 요청 2026-09-28 — §9 ④): 빈칸 둘이 모두 덧붙인 사실 쪽이던 두 장 ──
    dict(id="g7-origin", severity="범위", sevVotes=sev("범위", "범위", "범위"), votes=V3,
         decidedBy="3자 일치(둘째 협의) — 문장은 grok 안: 빈칸 둘을 모두 뜻 쪽에(codex · grok 2:1 — Claude 는 한 빈칸을 (0,0)에 남김). 수직선의 원점을 넣자는 codex 안은 1표",
         issue="빈칸 둘((0,0) · 0)이 같은 좌표 사실을 두 번 묻고, 뜻(두 좌표축이 만나는 점)에는 빈칸이 없다 — 좌표 (0,0)은 보기 · 함정(참)에 이미 있다",
         template="좌표평면에서 {두 좌표축}이 {만나는 점}.", wrong=["한 좌표축", "평행한 직선"]),
    dict(id="g9-double-root", severity="범위", sevVotes=sev("범위", "범위", "범위"), votes=V3,
         decidedBy="3자 일치(둘째 협의) — 문장은 grok 안: 빈칸 둘을 모두 뜻 쪽에(codex · grok 2:1 — Claude 는 한 빈칸을 «한 개»에 남김)",
         issue="빈칸 둘(한 개 · a)이 덧붙인 사실 쪽 — 교재는 완전제곱식 꼴이면 중근을 갖는다는 것을 따로 성질로 둔다. 그 사실은 보기 · 함정 · 해설에 이미 있다",
         template="이차방정식이 {서로 같은 두 근}을 가질 때의 {그 근}.", wrong=["서로 다른 두 근", "해의 개수"]),
    # ── 2:1 로 고치기로 한 것 ──
    dict(id="g3-right-angle", severity="범위", sevVotes=sev("—", "범위", "범위"),
         votes={"claude": "안 고침", "codex": "고침", "grok": "고침"}, decidedBy="2:1(codex · grok 고침)",
         issue="초3 카드가 «90 도»를 빈칸으로 묻는다 — 도(°)는 4-1 에서 처음. 빈칸과 보기에서 각도 수를 뺀다(두 답 모두)",
         template="종이를 한 번 접은 뒤 접힌 선끼리 {포개지게} 다시 접으면 모서리에 생기는 {각}.", wrong=["벌어지게", "변"],
         examples=ex(("정사각형의 한 각", True), ("3시를 가리키는 시곗바늘 사이의 각", True),
                     ("1시를 가리키는 시곗바늘 사이의 각", False), ("조금만 벌린 가위 날 사이의 각", False))),
    dict(id="g8-exponent-law", severity="범위", sevVotes=sev("—", "범위", "범위"),
         votes={"claude": "안 고침", "codex": "고침", "grok": "고침"},
         decidedBy="2:1(codex · grok 고침) — 방법은 두 답이 겹치는 해설 보강만(codex 의 이름 좁히기 · grok 의 문장 늘이기는 각 1표)",
         issue="카드는 넷 중 둘(곱셈 · 거듭제곱의 거듭제곱) — 나머지 둘(나눗셈 · 곱과 몫의 거듭제곱)은 해설에 한 줄로 알린다. 문장 · 빈칸 · 보기는 그대로",
         template="밑이 같은 거듭제곱을 곱할 때 밑은 그대로 두고 지수를 {더하며}, 거듭제곱의 거듭제곱은 지수를 {곱한다}.",
         wrong=["빼며", "나눈다"],
         explanation="곱셈으로 풀어 쓰면 a가 다섯 번 곱해져 있어. 나눗셈이면 지수를 빼고, 곱이나 몫을 거듭제곱하면 안의 각각에 지수를 붙여."),
    dict(id="g6-cone-sphere", severity="빠짐", sevVotes=sev("—", "빠짐", "빠짐"),
         votes={"claude": "안 고침", "codex": "고침", "grok": "고침"},
         decidedBy="2:1(codex · grok 고침) — 문장은 grok 안(초6 교재의 구의 중심 · 반지름과 맞음). codex 의 회전체 정의는 중1 내용이라 쓰지 않음",
         issue="구의 뜻이 없다(밑면이 없다는 특징뿐)",
         template="원뿔은 원 모양의 밑면과 {한 꼭짓점}이 있고, 구는 중심에서 겉면의 어느 점까지나 거리가 {모두 같은} 입체도형이다.",
         wrong=["두 꼭짓점", "제각각 다른"]),
]
# 고치지 않기로 한 것 — id, 까닭(우리 말), decidedBy
NOT_FIXED: list = [
    dict(id="g3-decimal", decidedBy="2:1(Claude · grok 안 고침 / codex 이름 바꿈)",
         why="자리의 값은 맞다. 이름을 «소수»로 바꾸면 중1 «소수» 카드와 이름이 겹친다 — 자리 이름이 초4에서 나오는 것은 학년 앞당김으로 적어 둔다"),
    dict(id="g6-reciprocal", decidedBy="2:1(Claude · grok 안 고침 / codex 초6 이름 바꿈)",
         why="곱이 1이라는 뜻은 맞고, 같은 단원 «분수의 나눗셈»이 이 카드를 선수로 둔다 — 초6 교재에 낱말이 없는 것은 학년 앞당김으로 적어 둔다"),
    dict(id="rational", decidedBy="3자 일치", why="정수의 비로 나타내는 뜻은 정확하고 양·0·음의 유리수 분류와 함께 선다 — 중1 교재와 도입 순서가 다를 뿐"),
    dict(id="g7-direct", decidedBy="3자 일치", why="비가 일정하다는 말과 2배·3배로 함께 변한다는 말은 같은 조건에서 같은 뜻 — 해설이 이미 배수 변화를 말한다"),
    dict(id="g7-inverse", decidedBy="3자 일치(정비례와 같은 결)", why="곱이 일정하다는 말과 한쪽이 2배일 때 다른 쪽이 절반이 된다는 말은 같은 뜻 — 함정 문장이 이미 말한다"),
    dict(id="g8-repeat-block", decidedBy="3자 일치", why="«가장 짧은»은 되풀이 묶음을 하나로 정하는 맞는 조건이다"),
    dict(id="g4-isosceles", decidedBy="3자 일치", why="«적어도 두 개»는 정삼각형도 이등변삼각형에 든다는 것을 정확히 드러낸다 — 교재도 따로 그렇게 가르친다"),
    dict(id="g7-coordinate", decidedBy="Claude(협의 목록 밖)", why="수직선의 좌표는 1-1 이 먼저 가르치지만 카드 단원이 좌표평면이다 — 틀린 말이 아니다"),
    dict(id="coprime", decidedBy="Claude(협의 목록 밖)", why="«관계»와 «두 수» 표현 차이 — 뜻은 같다"),
    dict(id="g6-decimal-divide", decidedBy="Claude(협의 목록 밖)", why="나누는 수를 자연수로 고치는 것은 표준 방법 — 틀리지 않는다"),
    dict(id="g8-probability", decidedBy="Claude(협의 목록 밖)", why="같은 가능성일 때 a/n 은 중2 확률의 계산 뜻 — 상대도수 쪽은 해설로 보탤 수 있으나 틀리지 않는다"),
    dict(id="g3-table", decidedBy="Claude(협의 목록 밖)", why="행·열은 3-2 교재에 없는 낱말이지만 틀린 말은 아니다(가벼움)"),
    dict(id="g3-picture-graph", decidedBy="Claude(협의 목록 밖)", why="그림 하나가 뜻하는 수를 정한다는 덧붙임은 활동에 필요한 뜻이다"),
    dict(id="g5-correspondence", decidedBy="Claude(협의 목록 밖)", why="짝을 이루는 관계와 함께 변하는 관계 — 같은 대응을 다르게 말한 것"),
]


def norm(t: str) -> str:
    return re.sub(r"[\s$«»‘’“”'\"`{}]", "", t)


def source_windows(win=12):
    ws = {}
    files = glob.glob(os.path.join(DATA, "*.json"))
    if not files:
        sys.exit(f"저장소 밖 원문이 없다: {DATA} — 겹침 검사를 할 수 없어 멈춘다")
    for f in files:
        for x in json.load(open(f, encoding="utf-8"))["terms"]:
            s = norm(x.get("sentence", ""))
            for i in range(len(s) - win + 1):
                w = s[i:i + win]
                if len(re.findall(r"[가-힣]", w)) >= 4:
                    ws.setdefault(w, (os.path.basename(f)[:-5], x["key"]))
    return ws


def overlaps(text, ws, win=12):
    t = norm(text)
    return [ws[t[i:i + win]] for i in range(len(t) - win + 1) if t[i:i + win] in ws]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cards", required=True)
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    cards = {c["id"]: c for u in json.load(open(a.cards, encoding="utf-8")) for c in u["cards"]}
    ws = source_windows()
    out = []
    seen = set()
    for f in FIXES:
        assert f["id"] not in seen, f["id"]
        seen.add(f["id"])
        c = cards[f["id"]]
        assert f["severity"] in SEVERITY, f["id"]
        blanks = re.findall(r"\{([^}]+)\}", f["template"])
        assert len(blanks) == 2, (f["id"], blanks)
        pieces = re.split(r"\{[^}]+\}", f["template"])
        assert len(pieces) == 3, f["id"]
        words = blanks + f["wrong"]
        assert len(set(words)) == 4, (f["id"], words)
        if f.get("examples"):
            exs = f["examples"]
            assert any(e["yes"] for e in exs) and any(not e["yes"] for e in exs), f["id"]
            assert len({e["text"] for e in exs}) == len(exs), f["id"]
        change = {"definition": f["template"].replace("{", "").replace("}", ""), "pieces": pieces, "words": words}
        for k in ("name", "exampleTitle", "examples", "trap", "truth", "explanation"):
            if k in f:
                change[k] = f[k]
        if "explanation" in f:
            change["note"] = f["explanation"]  # 새 형식 카드는 note = explanation(옛 카드 15장은 따로지만 이번 보정에 없다)
        # 🔴 카드 덤프는 보정 전 원본(`definitionSourceCards`)이어야 한다. 보정을 입은 덤프면 모든 칸이 이미 같아서 아래
        # «새 글만 잰다»가 23장 전부를 건너뛰고 `current` 칸도 보정 글로 채워진다(2026-09-28 리드 검토 ④) — 그래서 멈춘다.
        assert any(c.get(k) != v for k, v in change.items()), \
            f"{f['id']}: 카드 덤프가 이미 이 보정을 입었다 — dump-explorer-cards-coverage.ts(원본 카드)로 다시 뽑을 것"
        # 새로 쓴 글만 잰다 — 이름만 바꾸는 카드처럼 원래 카드 문장을 그대로 둔 칸은 새 글이 아니다(카드 원문 겹침은 coverage.md §11).
        unchanged_def = change["definition"] == c["definition"]
        new_text = [*([] if unchanged_def else [f["template"]]),
                    *(f.get(k, "") for k in ("name", "exampleTitle", "trap", "explanation")),
                    *(e["text"] for e in f.get("examples", []))]
        hits = [h for t in new_text if t for h in overlaps(t, ws)]
        assert not hits, f"{f['id']}: 교재 원문과 12글자 겹침 {hits[:3]}"
        out.append(dict(
            id=f["id"], name=c["name"], severity=f["severity"], issue=f["issue"],
            # 지금 칸은 문장 · 말만 — 말 조각은 문장에서 다시 나오고, 카드 원문 조각이 교재 표준 문구와 겹치는 곳(직각)을 한 번 더 옮기지 않는다.
            current=dict(definition=c["definition"], words=c["words"],
                         **{k: c[k] for k in ("name", "exampleTitle", "examples", "trap", "truth", "explanation") if k in change}),
            change=change, alsoCheck=f.get("alsoCheck", ""),
            decidedBy=f["decidedBy"], votes=f["votes"], severityVotes=f["sevVotes"],
            **({"revision": f["revision"]} if "revision" in f else {}),
        ))
    for n in NOT_FIXED:
        assert n["id"] in cards and n["id"] not in seen, n["id"]
    doc = dict(
        generatedBy="scripts/qa/concept-terms/build-card-fixes.py",
        policy="원본(definition-content.ts · definition-cards.ts, PROVENANCE SHA)은 그대로 — 원본 밖 보정 표(id → change 칸)를 "
               "카드를 내보내는 층에서 덮어쓴다(화면 · 채점 · 복습 · 선수가 같은 카드를 읽게). id 는 바꾸지 않는다(학생 기록 · 상자 · 교육과정 다리 유지).",
        checks="빈칸 둘 · 말 넷 서로 다름 · 말 조각 셋 · 보기 맞음/틀림 둘 다 · 새 글과 14권 원문의 12글자 창 겹침 0(걷어내기 없음) · "
               "빈칸 두 조각을 맞바꾼 문장이 거짓(자리 채점 — 감사 표 src/__tests__/unit/conceptSentenceSymmetry.test.ts)",
        severityOrder=SEVERITY,
        counts=dict(fixes=len(out), bySeverity={s: sum(1 for o in out if o["severity"] == s) for s in SEVERITY},
                    notFixed=len(NOT_FIXED)),
        fixes=out,
        notFixed=[dict(id=n["id"], name=cards[n["id"]]["name"], why=n["why"], decidedBy=n["decidedBy"]) for n in NOT_FIXED],
    )
    s = json.dumps(doc, ensure_ascii=False, indent=1) + "\n"
    if a.check:
        same = os.path.exists(OUT) and open(OUT, encoding="utf-8").read() == s
        print("같음" if same else "다름")
        sys.exit(0 if same else 1)
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(s)
    print(f"보정 {len(out)} · 안 고침 {len(NOT_FIXED)} · {doc['counts']['bySeverity']}")


if __name__ == "__main__":
    main()
