"""교재 개념 용어(14권 844개) ↔ 탐험 카드(46단원 × 5 = 230장) — 한 기준으로 다시 맞춘 짝 · 포함률 (트랙 coverage, 2026-09-28).

트랙 넷(elem34 · elem56 · mid-a · mid-b)이 자기 학년 카드와 맞춘 짝은 기준이 조금씩 달랐다
(«이상» ↔ 카드 «이상과 이하» 를 한 트랙은 관련, 다른 트랙은 같음으로 · 초등 트랙은 자기 학년 카드만).
여기서 모든 용어를 카드 230장 **전부**와 한 기준으로 다시 맞춘다.

통일 기준(판정 칸 `cls`):
  cover   — 카드가 이 용어의 뜻(내용)을 온전히 가르친다. 이름이 같으면 exact, 다르면 alias(코드가 이름으로 가른다).
  partial — 같은 개념을 카드가 범위를 달리해 다룬다(좁음 · 넓음 · 경우 하나 · 성질 일부).
  word    — 카드 이름·문장에 낱말로만 나온다(뜻매김 없음).
  none    — 대응 없음. 이름만 같고 개념이 다르면(동음이의) none.
카드 학년이 교재 학년과 달라도 짝은 끊지 않는다 — 학년 차이는 따로 적는다.

교재 문장은 읽지 않는다(저장소 밖). 이 스크립트의 판정 까닭(why)은 모두 우리 말이다.

실행:
  npx tsx scripts/qa/concept-terms/dump-explorer-cards-coverage.ts <카드.json>
  python scripts/qa/concept-terms/build-coverage.py --cards <카드.json> --draft <concept-context-kinds-draft.tsv> [--check]
출력: docs/reference/concept-terms/coverage-matches.json · coverage-stats.json (coverage.md 의 표 원천)
"""

import argparse
import collections
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
TERMS_DIR = os.path.join(ROOT, "docs", "reference", "concept-terms")
BOOKS = [
    "cube-3-1", "cube-3-2", "cube-4-1", "cube-4-2",
    "cube-5-1", "cube-5-2", "cube-6-1", "cube-6-2",
    "gaenyeom-1-1", "gaenyeom-1-2", "gaenyeom-2-1",
    "gaenyeom-2-2", "gaenyeom-3-1", "gaenyeom-3-2",
]


def book_grade(book: str) -> int:
    """cube-3-1 → 3, gaenyeom-1-1 → 7 (탐험 카드 학년과 같은 눈금)."""
    src, g, _ = book.split("-")
    return int(g) + (6 if src == "gaenyeom" else 0)


def grade_label(g: int) -> str:
    return f"초{g}" if g < 7 else f"중{g - 6}"


def norm(s: str) -> str:
    return re.sub(r"\s+", "", s).replace("2개", "두개")


# ── 판정 덮어쓰기 ────────────────────────────────────────────────────────────
# 열쇠: "권:용어" (그 권에서 그 용어 줄 전부) 또는 "권:key" (한 줄). 값: (cls, [카드 id], 까닭).
# 트랙 판정과 다르게 한 것만 적는다. 까닭은 우리 말 — 교재 문장 인용 금지.
O = {}


def o(sel, cls, cards, why):
    assert cls in ("cover", "partial", "word", "none"), sel
    assert sel not in O, f"중복 덮어쓰기: {sel}"
    O[sel] = (cls, list(cards), why)


HOMO_VERTEX = "동음이의 — 카드 g9-vertex 는 포물선의 꼭짓점. 이 용어는 도형(각·다각형·입체)의 꼭짓점"
# 초3
o("cube-3-1:반직선", "cover", ["g7-ray"], "같은 뜻 — 카드는 중1 단원에 있고 교재는 3-1 에서 먼저 가르친다")
o("cube-3-1:올림", "partial", ["g3-carry"], "곱셈의 올림은 받아올림과 같은 생각(카드는 덧셈) — 5-2 «올림»(어림)과 동음이의라 g5-round-up 에 잇지 않는다")
o("cube-3-1:곱셈과 나눗셈의 관계", "partial", ["g3-check-division"], "곱셈식과 나눗셈식을 서로 바꾸는 관계 — 카드는 그 관계로 나눗셈을 확인하는 일만")
o("cube-3-1:밀리미터", "cover", ["g3-length"], "카드 «길이 단위»가 1cm 와 10mm 의 관계로 1mm 의 크기를 가르친다")
o("cube-3-1:초", "cover", ["g3-time"], "카드 «시간 단위»가 1분과 60초의 관계로 1초의 크기를 가르친다")
o("cube-3-1:소수", "partial", ["g3-decimal"], "카드 «소수 첫째 자리»는 소수의 자리 이름 — 중1 «소수»(1과 자신만을 약수로 갖는 수)와 동음이의라 prime 에 잇지 않는다")
o("cube-3-1:소수점", "word", ["g3-decimal"], "카드 문장에 낱말로만")
o("cube-3-2:올림", "partial", ["g3-carry"], "곱셈의 올림은 받아올림과 같은 생각 — 5-2 «올림»(어림)과 동음이의")
o("cube-3-2:나머지와 나누는 수의 관계", "cover", ["g3-remainder"], "카드 «나머지» 문장 뒷부분(나누는 수보다 작다)이 이 성질 전부")
o("cube-3-2:나눗셈을 맞게 계산했는지 확인하는 방법", "cover", ["g3-check-division"], "카드 «나눗셈 확인»과 같은 검산식")
o("cube-3-2:원의 성질", "cover", ["g3-diameter"], "카드 «지름» 문장 끝(반지름의 2배)이 이 성질 전부")
o("cube-3-2:리터", "cover", ["g3-capacity"], "카드 «들이»가 1L 와 1000mL 의 관계를 가르친다")
o("cube-3-2:밀리리터", "cover", ["g3-capacity"], "카드 «들이»가 1L 와 1000mL 의 관계를 가르친다")
o("cube-3-2:킬로그램", "cover", ["g3-mass"], "카드 «무게 단위»(1kg=1000g)")
o("cube-3-2:그램", "cover", ["g3-mass"], "카드 «무게 단위»(1kg=1000g)")
o("cube-3-2:합계", "cover", ["g3-data-total"], "카드 이름은 «자료의 합계» — 같은 뜻")
o("cube-3-2:나누어떨어진다", "word", ["g5-divisor"], "카드 «약수» 문장에 낱말로만")
# 초4
o("cube-4-1:합계", "cover", ["g3-data-total"], "카드 이름은 «자료의 합계» — 같은 뜻(카드는 초3)")
o("cube-4-1:도", "partial", ["g4-angle"], "카드 «각도» 문장이 단위 이름(도)을 말한다 — 기호 ° 읽기는 없다")
o("cube-4-2:수직", "cover", ["g7-perpendicular"], "같은 뜻 — 카드는 중1 단원, 교재는 4-2 에서 먼저")
o("cube-4-2:평행사변형의 성질", "none", [], "이 성질(마주 보는 변·각, 이웃한 각의 합)은 카드에 없다 — 중2 카드는 대각선 성질")
o("cube-4-2:정사각형의 성질", "none", [], "이름은 같으나 카드(중2 «정사각형의 대각선»)는 대각선 성질 — 이 성질(변·각)은 없다")
o("cube-4-2:대각선의 성질", "partial", ["g8-parallelogram-diagonal", "g8-square-properties"], "사각형마다 대각선이 이등분·수직·같은 길이인지 가르는 표 — 카드는 그중 둘을 중2 단원에")
o("cube-4-2:이등변삼각형과 정삼각형의 관계", "partial", ["g4-isosceles"], "카드 «이등변삼각형»의 «적어도 두 개»가 이 관계를 품는다")
o("cube-4-2:마름모의 성질", "partial", ["g8-parallelogram-diagonal"], "네 성질 중 대각선 하나만 — 대각선이 서로를 이등분한다는 것만 카드(중2 «평행사변형의 대각선»)에 있다")
o("cube-4-2:물결선", "none", [], "카드 «그래프의 눈금»에 물결선은 없다(같은 쪽에 나올 뿐)")
# 초5
o("cube-5-1:대응 관계를 식으로 나타내기", "cover", ["g5-rule-expression"], "카드 이름 «대응을 식으로 나타내기» — 같은 일")
o("cube-5-1:같은 수로 나누어 크기가 같은 분수 만들기", "cover", ["g5-equivalent"], "카드 문장이 곱하기·나누기를 함께 말한다")
o("cube-5-1:공통분모", "word", ["g5-common-denominator"], "카드 «통분» 문장에 «공통인 분모»로만")
o("cube-5-1:정사각형의 넓이", "partial", ["g5-rectangle-area"], "정사각형은 직사각형의 한 경우 — 카드는 직사각형 공식만")
o("cube-5-1:받아올림이 없는 진분수의 덧셈", "partial", ["g4-same-denominator", "g5-common-denominator"], "분모가 다른 분수의 덧셈 — 통분(초5 카드) 뒤 분자끼리 더하기(초4 카드)")
o("cube-5-1:마름모의 대각선의 성질", "partial", ["g8-parallelogram-diagonal"], "대각선이 서로를 이등분한다는 것만 카드(중2 «평행사변형의 대각선»)에 있다 — 수직은 없다")
o("cube-5-2:이상", "cover", ["g5-at-least"], "카드 한 장 «이상과 이하»가 두 낱말을 다 뜻매김한다")
o("cube-5-2:이하", "cover", ["g5-at-least"], "카드 한 장 «이상과 이하»가 두 낱말을 다 뜻매김한다")
o("cube-5-2:초과", "cover", ["g5-more-than"], "카드 한 장 «초과와 미만»이 두 낱말을 다 뜻매김한다")
o("cube-5-2:미만", "cover", ["g5-more-than"], "카드 한 장 «초과와 미만»이 두 낱말을 다 뜻매김한다")
o("cube-5-2:올림", "cover", ["g5-round-up"], "카드 한 장 «올림과 버림»이 두 낱말을 다 뜻매김한다")
o("cube-5-2:버림", "cover", ["g5-round-up"], "카드 한 장 «올림과 버림»이 두 낱말을 다 뜻매김한다")
o("cube-5-2:(진분수)×(진분수)", "cover", ["g5-fraction-multiply"], "카드 규칙 그대로(카드는 모든 분수로 넓혀 적었다 — 어긋남 목록)")
o("cube-5-2:(단위분수)×(단위분수)", "cover", ["g5-fraction-multiply"], "카드 규칙의 한 경우 — 그대로 맞는다")
o("cube-5-2:소수끼리 곱하는 경우", "cover", ["g5-decimal-multiply"], "카드 «소수의 곱셈»과 같은 규칙")
o("cube-5-2:전개도", "cover", ["g6-net"], "같은 이름 — 카드는 초6 단원, 교재는 5-2 정육면체에서 먼저(카드 문장은 틀림 — 어긋남 목록)")
o("cube-5-2:평행", "partial", ["g4-parallel"], "카드는 두 직선의 평행 — 5-2 는 직육면체의 두 면")
o("cube-5-2:확실하다", "cover", ["g5-certain"], "카드 이름 «확실한 일» — 같은 뜻")
o("cube-5-2:불가능하다", "cover", ["g5-impossible"], "카드 이름 «불가능한 일» — 같은 뜻")
o("cube-5-2:가능성을 수로 표현하기", "partial", ["g5-certain", "g5-impossible"], "카드 두 장이 두 끝(1 · 0)만 — 1/2 은 없다")
o("cube-5-2:평균을 구하는 식", "cover", ["g5-average"], "카드 «평균» 문장이 이 식을 말로 적은 것")
# 초6
o("cube-6-1:6-1/p028/높이", "cover", ["g6-prism-height"], "각기둥의 높이 — 카드 뜻과 같다")
o("cube-6-1:기준량", "word", ["g6-rate"], "카드 «비율» 문장에 낱말로만")
o("cube-6-1:비율을 구하는 식", "cover", ["g6-rate"], "카드 «비율» 문장이 이 식을 말로 적은 것")
o("cube-6-1:정육면체의 부피", "partial", ["g6-cuboid-volume"], "정육면체는 직육면체의 한 경우 — 카드는 직육면체만")
o("cube-6-2:비율을 구하는 식", "cover", ["g6-rate"], "카드 «비율» 문장이 이 식을 말로 적은 것(6-1 과 같은 식을 다시 적음)")
o("cube-6-2:반올림", "cover", ["g5-round"], "같은 이름 — 초5 카드(6-2 는 몫에 반올림을 다시 씀)")
o("cube-6-2:지름", "cover", ["g3-diameter"], "같은 이름 — 초3 카드(6-2 는 원주 앞에서 다시 적음)")
o("cube-6-2:반지름", "cover", ["g3-radius"], "같은 이름 — 초3 카드(6-2 는 원주 앞에서 다시 적음)")
o("cube-6-2:지름을 구하는 식", "partial", ["g6-pi"], "카드 «원주율»(원주÷지름)을 거꾸로 쓴 식 — 카드에는 없다")
o("cube-6-2:외항", "cover", ["g6-inner-outer"], "카드 한 장 «내항과 외항»이 두 낱말을 다 뜻매김한다")
o("cube-6-2:내항", "cover", ["g6-inner-outer"], "카드 한 장 «내항과 외항»이 두 낱말을 다 뜻매김한다")
o("cube-6-2:원주율을 구하는 식", "cover", ["g6-pi"], "카드 «원주율» 문장이 이 식을 말로 적은 것")
o("cube-6-2:비례배분하는 식", "cover", ["g6-part-of-ratio"], "카드 «비와 전체의 관계»가 같은 식")
# 중1
o("gaenyeom-1-1:해", "cover", ["g7-equation"], "카드 «방정식» 문장이 «해»를 함께 뜻매김한다")
o("gaenyeom-1-1:미지수", "word", ["g7-equation"], "카드 «방정식» 문장에 낱말로만")
o("gaenyeom-1-1:밑", "word", ["g8-power"], "카드 «거듭제곱» 문장에 낱말로만")
o("gaenyeom-1-1:지수", "word", ["g8-power"], "카드 «거듭제곱» 문장에 낱말로만")
o("gaenyeom-1-1:부등호", "word", ["g8-inequality"], "카드 «부등식» 문장에 낱말로만")
o("gaenyeom-1-1:x좌표", "word", ["g7-coordinate"], "카드 «좌표» 문장에 낱말로만")
o("gaenyeom-1-1:y좌표", "word", ["g7-coordinate"], "카드 «좌표» 문장에 낱말로만")
o("gaenyeom-1-1:1-1/p176/좌표", "partial", ["g7-coordinate"], "수직선 위 점의 좌표 — 카드는 좌표평면 쪽만(같은 쪽의 좌표평면 정의는 카드와 같다)")
o("gaenyeom-1-1:1-1/p176/원점", "partial", ["g7-origin"], "수직선의 원점 — 카드는 좌표평면 쪽만(같은 쪽의 좌표평면 정의는 카드와 같다)")
o("gaenyeom-1-2:각의 크기", "cover", ["g4-angle"], "카드 «각도»(초4)와 같은 개념 — 교재는 변이 돌아간 양으로 다시 설명")
o("gaenyeom-1-2:직교", "cover", ["g7-perpendicular"], "카드 «수직» 문장이 직교의 뜻 그대로")
o("gaenyeom-1-2:맞꼭지각의 성질", "cover", ["g7-vertical-angle"], "카드 «맞꼭지각» 문장 끝(크기가 같다)이 이 성질 전부")
o("gaenyeom-1-2:삼각형의 세 내각의 크기의 합", "cover", ["g4-triangle-sum"], "카드 «삼각형의 세 각»(초4)과 같은 사실")
o("gaenyeom-1-2:합동인 도형의 성질", "partial", ["g5-congruence"], "카드 «합동»의 «모양과 크기가 같다»에 녹아 있다 — 대응변·대응각 말은 없다(5-2 같은 용어와 같은 판정)")
o("gaenyeom-1-2:대칭축", "partial", ["g5-line-symmetry"], "카드 «선대칭도형» 문장에 «한 직선»으로만")
o("gaenyeom-1-2:기둥의 부피", "partial", ["g6-cuboid-volume"], "카드는 직육면체만 — 교재는 기둥 일반(밑넓이×높이)")
o("gaenyeom-1-2:원의 둘레의 길이와 넓이", "partial", ["g6-circle-area", "g6-circumference"], "카드 둘(초6)이 넓이 식과 원주의 뜻을 나눠 다룬다 — 원주 구하는 식은 없다")
# 중2
o("gaenyeom-2-1:밑", "word", ["g8-power"], "카드 «거듭제곱» 문장에 낱말로만")
o("gaenyeom-2-1:지수", "word", ["g8-power"], "카드 «거듭제곱» 문장에 낱말로만")
o("gaenyeom-2-1:부등호", "word", ["g8-inequality"], "카드 «부등식» 문장에 낱말로만")
o("gaenyeom-2-1:미지수가 2개인 일차방정식의 해", "partial", ["g8-two-variable"], "카드 문장 끝(해를 순서쌍으로)만")
o("gaenyeom-2-1:미지수가 2개인 연립일차방정식", "partial", ["g8-simultaneous"], "카드는 연립방정식 일반")
o("gaenyeom-2-1:연립방정식을 푼다", "cover", ["g8-simultaneous"], "카드 «연립방정식»의 문장이 사실은 이 뜻(푸는 일) — 어긋남 목록")
o("gaenyeom-2-1:일차함수의 그래프의 성질", "partial", ["g8-slope", "g8-y-intercept"], "기울기·y절편 카드 둘이 각 낱말의 뜻만 — 그래프가 그 기울기·절편의 직선이라는 말은 없다")
o("gaenyeom-2-2:2-2/p013/삼각형의 합동 조건", "partial", ["g7-sss"], "카드는 세 조건 중 SSS 하나")
o("gaenyeom-2-2:2-2/p115/삼각형의 합동 조건", "partial", ["g7-sss"], "카드는 세 조건 중 SSS 하나")
o("gaenyeom-2-2:맞꼭지각의 성질", "cover", ["g7-vertical-angle"], "카드 «맞꼭지각» 문장 끝이 이 성질 전부(복습)")
o("gaenyeom-2-2:외접", "word", ["g8-circumcenter"], "카드 «외심» 문장에 «외접원»으로만")
o("gaenyeom-2-2:외접원", "word", ["g8-circumcenter"], "카드 «외심» 문장에 낱말로만")
o("gaenyeom-2-2:내접", "word", ["g8-incenter"], "카드 «내심» 문장에 «내접원»으로만")
o("gaenyeom-2-2:내접원", "word", ["g8-incenter"], "카드 «내심» 문장에 낱말로만")
o("gaenyeom-2-2:닮은 두 평면도형의 둘레의 길이의 비와 넓이의 비", "partial", ["g8-similarity-area"], "카드는 넓이비만 — 둘레의 비는 없다")
o("gaenyeom-2-2:삼각형의 두 변의 중점을 연결한 선분의 성질", "none", [], "카드 «중점»은 뜻만 — 이 성질은 카드에 없다")
o("gaenyeom-2-2:중선", "word", ["g8-centroid"], "카드 «무게중심» 문장에 낱말로만")
o("gaenyeom-2-2:여러 가지 사각형의 대각선의 성질", "partial", ["g8-parallelogram-diagonal", "g8-square-properties"], "카드 둘이 평행사변형·정사각형의 것만")
o("gaenyeom-2-2:평면도형에서 닮음의 성질", "partial", ["g8-similarity-ratio"], "카드 «닮음비»가 대응변의 비만 — 대응각은 없다")
o("gaenyeom-2-2:입체도형에서 닮음의 성질", "partial", ["g8-similarity-ratio"], "카드 «닮음비»가 대응하는 길이의 비만")
o("gaenyeom-2-2:직각삼각형의 닮음", "cover", ["g9-trig-similarity"], "카드 «삼각비와 닮음»(중3) 문장 앞부분이 이 성질 그대로 — 교재는 2-2 에서 먼저")
o("gaenyeom-2-2:직사각형의 성질", "partial", ["g8-parallelogram-diagonal"], "대각선이 서로를 이등분한다는 것만 카드(중2 «평행사변형의 대각선»)에 있다 — 길이가 같다는 것은 없다")
o("gaenyeom-2-2:마름모의 성질", "partial", ["g8-parallelogram-diagonal"], "대각선이 서로를 이등분한다는 것만 카드(중2 «평행사변형의 대각선»)에 있다 — 수직은 없다")
o("gaenyeom-2-2:밑변", "none", [], "이등변삼각형의 밑변(꼭지각의 맞은편) — 넓이 공식의 «밑변»과 뜻이 달라 낱말 짝도 잇지 않는다")
o("gaenyeom-2-2:대변", "none", [], "사각형에서 마주 보는 변 — 삼각비 카드의 «대변»(각의 맞은편 변)과 뜻이 다르다")
o("gaenyeom-2-2:대각", "none", [], "사각형에서 마주 보는 각")
# 중3
o("gaenyeom-3-1:음의 제곱근", "partial", ["g9-square-root"], "카드 문장이 부호가 반대인 두 제곱근을 말한다 — «음의 제곱근» 이름은 없다")
o("gaenyeom-3-1:제곱근의 성질", "partial", ["g9-root-square"], "카드는 √(a²) 쪽 하나만")
o("gaenyeom-3-1:a²+2ab+b², a²−2ab+b²의 인수분해", "partial", ["g9-square-formula"], "합의 제곱 공식을 거꾸로 — 차의 제곱은 카드에 없다")
o("gaenyeom-3-1:이차방정식의 근의 개수", "partial", ["g9-root-formula"], "카드 «근의 공식»의 조건(b²−4ac≥0)만")
o("gaenyeom-3-1:위로 볼록", "partial", ["g9-parabola"], "카드는 a>0 쪽 모양만(그것도 «위로 열린다»로) — 어긋남 목록")
o("gaenyeom-3-1:이차함수의 일반형", "partial", ["g9-quadratic-function"], "카드가 y=ax²+bx+c 꼴을 말한다 — «일반형» 이름은 없다")
o("gaenyeom-3-1:이차함수의 표준형", "partial", ["g9-translation"], "카드가 y=a(x−p)²+q 꼴을 말한다 — «표준형» 이름은 없다")
o("gaenyeom-3-2:삼각비", "partial", ["g9-sine", "g9-cosine", "g9-tangent"], "셋을 통틀은 이름 — «삼각비» 카드는 따로 없고 셋이 한 장씩")
o("gaenyeom-3-2:sin · cos · tan", "partial", ["g9-sine", "g9-cosine", "g9-tangent"], "카드 셋이 기호를 쓴다 — 줄임말이라는 설명은 없다")
o("gaenyeom-3-2:현의 수직이등분선의 성질", "none", [], "카드 «현»은 뜻만 — 이 성질은 카드에 없다")
o("gaenyeom-3-2:현의 길이의 성질", "none", [], "카드 «현»은 뜻만 — 이 성질은 카드에 없다")
o("gaenyeom-3-2:양의 상관관계", "cover", ["g9-correlation"], "카드 «상관관계» 문장이 양의 상관관계를 뜻매김한다")
o("gaenyeom-3-2:음의 상관관계", "cover", ["g9-correlation"], "카드 «상관관계» 문장이 음의 상관관계를 뜻매김한다")

# 낱말 짝 자동 찾기에서 빼는 것(동음이의 · 뜻이 다른 같은 낱말)
WORD_SKIP_TERMS = {"소수", "올림", "대응", "내림", "대각"}  # 권마다 뜻이 갈리는 낱말(2-2 밑변·대변·대각은 위 덮어쓰기로)
WORD_SKIP_CARDS = {
    "수직선": {"g9-axis"},  # g9-axis 는 «수직선»을 세로 직선 뜻으로 잘못 쓴다(어긋남 목록)
    "전개": {"g6-net"},  # 식의 전개 ↔ 전개도
    "꼭짓점": {"g9-vertex", "g9-axis", "g9-translation"},  # 포물선의 꼭짓점(동음이의)
}
# 자동 판정 줄에 덧붙일 주의(동음이의)
WORD_NOTE = {"꼭짓점": HOMO_VERTEX}

# 같은 이름이라도 다른 개념 — 고유 개념 셀 때 가른다(열쇠: 권:용어)
SENSE = {
    "cube-3-1:소수": "소수점 수",
    "gaenyeom-1-1:소수": "1과 자신만 약수",
    "cube-3-1:올림": "받아올림",
    "cube-3-2:올림": "받아올림",
    "cube-5-2:올림": "어림",
    "gaenyeom-3-1:꼭짓점": "포물선",
    "gaenyeom-2-2:밑변": "이등변삼각형",
    "gaenyeom-2-2:대변": "사각형",
    "gaenyeom-2-2:대각": "사각형",
}


def load_cards(path):
    units = json.load(open(path, encoding="utf-8"))
    cards = {}
    for u in units:
        for c in u["cards"]:
            cards[c["id"]] = dict(c, grade=u["grade"], unit=u["id"], unitTitle=u["title"])
    assert len(cards) == 230, len(cards)
    return units, cards


def load_terms():
    rows = []
    for b in BOOKS:
        d = json.load(open(os.path.join(TERMS_DIR, f"{b}.json"), encoding="utf-8"))
        for i, x in enumerate(d["terms"]):
            assert "sentence" not in x, f"저장소 용어 JSON 에 문장 칸: {b} {x['key']}"
            e = x["explorer"]
            es = e if isinstance(e, list) else [e]
            rows.append(dict(
                book=b, idx=i, key=x["key"], term=x["term"], aliases=x["aliases"], kind=x["kind"],
                grade=book_grade(b), book_grade=x["grade"], chapter=x["chapter"], section=x["section"],
                bookPage=x["bookPage"], first_track=x["first"],
                track=[dict(match=y["match"], cardId=y.get("cardId", "")) for y in es],
            ))
    assert len(rows) == 844, len(rows)
    return rows


def card_name_parts(name):
    """«이상과 이하» → {이상과이하, 이상, 이하}. «초과와 미만»처럼 앞말에 «과»가 들어 있어도 되게 모든 자리에서 가른다."""
    n = norm(name)
    ps = {n}
    for i, ch in enumerate(n):
        if ch in "과와" and 0 < i < len(n) - 1:
            ps |= {n[:i], n[i + 1:]}
    return ps


def is_exact(row, card):
    names = {norm(n) for n in [row["term"]] + row["aliases"]}
    cn = norm(card["name"])
    if names & card_name_parts(card["name"]):
        return True
    # «이차함수의 축» ↔ «축», «삼각형의 SSS 합동» ↔ «SSS 합동» — 앞 한정어만 다른 이름
    return any(cn.endswith("의" + n) for n in names if len(n) >= 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cards", required=True)
    ap.add_argument("--draft", required=False)
    ap.add_argument("--check", action="store_true", help="파일을 쓰지 않고 지금 저장소 산출물과 같은지만 본다")
    a = ap.parse_args()
    units, cards = load_cards(a.cards)
    rows = load_terms()

    # 덮어쓰기 열쇠 → 줄
    used = collections.Counter()
    for r in rows:
        k1 = f"{r['book']}:{r['key']}"
        k2 = f"{r['book']}:{r['term']}"
        hit = O.get(k1) or O.get(k2)
        if O.get(k1):
            used[k1] += 1
        elif O.get(k2):
            used[k2] += 1
        track_cards = [t["cardId"] for t in r["track"] if t["match"] != "none"]
        track_best = "none"
        for t in r["track"]:
            if t["match"] in ("exact", "alias"):
                track_best = "cover"
            elif t["match"] == "related" and track_best == "none":
                track_best = "partial"
        r["track_cls"] = track_best
        r["track_cards"] = track_cards
        if hit:
            cls, cs, why = hit
            r["cls"], r["cards"], r["why"], r["source"] = cls, cs, why, "coverage"
        else:
            r["cls"], r["cards"], r["why"], r["source"] = track_best, track_cards, "", "track"
    unused = [k for k in O if not used[k]]
    assert not unused, f"안 맞은 덮어쓰기: {unused}"

    # 낱말 짝 자동: 아직 none 인 줄 — 용어 이름(한글)이 카드 이름·문장에 낱말 머리로 있으면 word.
    # 왼쪽 경계를 본다 — «인수»가 «10개인 수»에, «제곱»이 «거듭제곱»에, «육면체»가 «직육면체»에 걸리지 않게.
    # 한 글자 용어(원·각·변·호·면)는 바로 뒤에 조사가 붙을 때만(«원점»·«각도»·«각 항목»·«변들»은 아님).
    one_right = r"(?=[의은는이가을를과와에로])"
    for r in rows:
        if r["cls"] != "none" or r["source"] == "coverage" or r["term"] in WORD_SKIP_TERMS:
            continue
        names = [n for n in [r["term"]] + r["aliases"] if re.search(r"[가-힣]", n) and not re.search(r"[()]", n)]
        pats = [re.compile(r"(?<![가-힣A-Za-z0-9])" + re.escape(n) + (one_right if len(norm(n)) == 1 else ""))
                for n in names]
        hits = []
        for cid, c in cards.items():
            if cid in WORD_SKIP_CARDS.get(r["term"], set()):
                continue
            text = c["name"] + " | " + c["definition"]
            if any(p.search(text) for p in pats):
                hits.append(cid)
        if hits:
            r["cls"], r["cards"], r["why"], r["source"] = "word", hits, "카드 이름·문장에 낱말로만(자동)", "auto-word"
        if r["term"] in WORD_NOTE:
            r["why"] = (r["why"] + " · " if r["why"] else "") + WORD_NOTE[r["term"]]

    # cover → exact / alias
    for r in rows:
        r["match"] = r["cls"]
        if r["cls"] == "cover":
            assert r["cards"], r
            r["match"] = "exact" if any(is_exact(r, cards[c]) for c in r["cards"]) else "alias"
        for c in r["cards"]:
            assert c in cards, (r["key"], c)
        r["cardGrades"] = sorted({cards[c]["grade"] for c in r["cards"]})

    # 고유 개념: 이름(+뜻 갈래)로 묶고 처음 나온 권·학년
    order = {b: i for i, b in enumerate(BOOKS)}
    groups = collections.OrderedDict()
    for r in sorted(rows, key=lambda r: (order[r["book"]], r["idx"])):
        sense = SENSE.get(f"{r['book']}:{r['term']}", "")
        gk = norm(r["term"]) + ("#" + sense if sense else "")
        r["concept"] = gk
        groups.setdefault(gk, []).append(r)
    rank = {"exact": 4, "alias": 3, "partial": 2, "word": 1, "none": 0}
    concepts = []
    for gk, rs in groups.items():
        best = max(rs, key=lambda r: rank[r["match"]])
        first = rs[0]
        for r in rs:
            r["firstGlobal"] = r is first
        concepts.append(dict(concept=gk, term=first["term"], kind=first["kind"], grade=first["grade"],
                             book=first["book"], rows=len(rs), match=best["match"], cards=best["cards"]))

    # 표
    def table(items, keyf, cols):
        t = collections.OrderedDict()
        for it in items:
            k = keyf(it)
            t.setdefault(k, collections.Counter())[it["match"]] += 1
        return {k: {c: v.get(c, 0) for c in cols} for k, v in t.items()}

    cols = ["exact", "alias", "partial", "word", "none"]
    kinds = ["정의", "성질", "정리", "공식", "법칙", "기호", "기타"]
    stats = dict(
        rows_by_grade=table(sorted(rows, key=lambda r: r["grade"]), lambda r: grade_label(r["grade"]), cols),
        rows_by_kind=table(sorted(rows, key=lambda r: kinds.index(r["kind"])), lambda r: r["kind"], cols),
        rows_by_book=table(rows, lambda r: r["book"], cols),
        concepts_by_grade=table(sorted(concepts, key=lambda c: c["grade"]), lambda c: grade_label(c["grade"]), cols),
        concepts_by_kind=table(sorted(concepts, key=lambda c: kinds.index(c["kind"])), lambda c: c["kind"], cols),
        rows_total={c: sum(1 for r in rows if r["match"] == c) for c in cols},
        concepts_total={c: sum(1 for x in concepts if x["match"] == c) for c in cols},
        n_rows=len(rows), n_concepts=len(concepts),
    )
    # 트랙 판정과 달라진 것
    chg = collections.Counter((r["track_cls"], r["cls"]) for r in rows if r["track_cls"] != r["cls"])
    stats["changed_from_track"] = {f"{a}→{b}": n for (a, b), n in sorted(chg.items())}
    stats["changed_cover_status"] = sum(1 for r in rows if (r["track_cls"] == "cover") != (r["cls"] == "cover"))

    # 카드 쪽: 카드마다 가장 가까운 교재 용어
    card_rows = []
    for cid, c in cards.items():
        hits = [r for r in rows if cid in r["cards"]]
        best = max((rank[r["match"]] for r in hits), default=0)
        best_m = [k for k, v in rank.items() if v == best][0] if hits else "none"
        cover_hits = [r for r in hits if r["match"] in ("exact", "alias")]
        bg = sorted({r["grade"] for r in cover_hits})
        card_rows.append(dict(
            id=cid, name=c["name"], grade=c["grade"], unit=c["unit"], best=best_m,
            coverTerms=[f"{r['book']}:{r['key']}" for r in cover_hits],
            partialTerms=[f"{r['book']}:{r['key']}" for r in hits if r["match"] == "partial"],
            bookGrades=bg,
            firstBookGrade=bg[0] if bg else None,
            sameGradeInBooks=c["grade"] in bg,
        ))
    cstat = collections.OrderedDict()
    for cr in sorted(card_rows, key=lambda x: x["grade"]):
        g = grade_label(cr["grade"])
        cstat.setdefault(g, collections.Counter())[cr["best"]] += 1
    stats["cards_by_grade"] = {g: {c: v.get(c, 0) for c in ["exact", "alias", "partial", "word", "none"]} for g, v in cstat.items()}
    stats["cards_total"] = {c: sum(1 for x in card_rows if x["best"] == c) for c in cols}
    stats["cards_grade_shift"] = dict(
        earlier=[dict(id=x["id"], name=x["name"], card=x["grade"], book=x["firstBookGrade"]) for x in card_rows
                 if x["firstBookGrade"] is not None and x["grade"] < x["firstBookGrade"]],
        later_no_same=[dict(id=x["id"], name=x["name"], card=x["grade"], book=x["bookGrades"]) for x in card_rows
                       if x["firstBookGrade"] is not None and x["grade"] > x["firstBookGrade"] and not x["sameGradeInBooks"]],
        later_but_revisited=[dict(id=x["id"], name=x["name"], card=x["grade"], book=x["bookGrades"]) for x in card_rows
                             if x["firstBookGrade"] is not None and x["grade"] > x["firstBookGrade"] and x["sameGradeInBooks"]],
    )

    out_rows = [dict(book=r["book"], key=r["key"], term=r["term"], kind=r["kind"], grade=grade_label(r["grade"]),
                     concept=r["concept"], firstGlobal=r["firstGlobal"], match=r["match"], cards=r["cards"],
                     cardGrades=[grade_label(g) for g in r["cardGrades"]], why=r["why"], source=r["source"],
                     trackMatch=r["track_cls"], trackCards=r["track_cards"]) for r in rows]
    out_matches = dict(
        generatedBy="scripts/qa/concept-terms/build-coverage.py",
        rule="cover(exact·alias)=카드가 뜻을 온전히 가르침 · partial=범위가 다름 · word=낱말로만 · none=없음/동음이의. 학년 차이로 짝을 끊지 않는다.",
        note="교재 문장은 저장소 밖(testautocreator-data/I-개념용어) — 여기 why 는 우리 말.",
        rows=out_rows, cards=card_rows)
    files = {
        os.path.join(TERMS_DIR, "coverage-matches.json"): json.dumps(out_matches, ensure_ascii=False, indent=1) + "\n",
        os.path.join(TERMS_DIR, "coverage-stats.json"): json.dumps(stats, ensure_ascii=False, indent=1) + "\n",
    }
    if a.check:
        bad = [p for p, s in files.items() if not os.path.exists(p) or open(p, encoding="utf-8").read() != s]
        print("같음" if not bad else f"다름: {bad}")
        sys.exit(1 if bad else 0)
    for p, s in files.items():
        with open(p, "w", encoding="utf-8", newline="\n") as f:
            f.write(s)
    print(json.dumps({k: stats[k] for k in ("rows_total", "concepts_total", "n_concepts", "cards_total",
                                            "changed_from_track", "changed_cover_status")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
