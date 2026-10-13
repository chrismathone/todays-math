"""노변 2025 중3 2학기 중간 — NB 1·2·4·6·8 새 쌍둥이 저작 r1 (저자: Claude, 부모 세션).

입력은 질문만 정리한 파일(`next-three-source-review-r1/question-only-staged/nobyeon/qNN.json`)과
그 출처 검토 보고서뿐이다. 원문 답·해설·답안지는 읽지 않는다(그 파일들에 없다).

이 스크립트가 하는 일:
  1. 새 본문·보기·답·학생용 해설·변형 기록·메타데이터를 쓴다(candidates/qNN/qNN.json).
  2. 새 그림 스펙(FigureSpec v2)을 쓴다(candidates/qNN/stem-1.spec.json) — SVG 는 render_assets.mts 가 엔진으로 만든다.
  3. 모든 보기를 정확값(sympy)으로 계산해 정답이 하나뿐인지, 보기끼리 겹치지 않는지 확인한다(author-calculations.json).
  4. 학생 7면 저자 관찰(author-checks/qNN.json)을 쓴다.
저자의 계산과 관찰은 승인이 아니다 — 독립 풀이·검수가 따로 한다.
"""
import hashlib
import json
import pathlib
import re
import sys

import sympy as sp

sys.dont_write_bytecode = True
sys.stdout.reconfigure(encoding="utf-8")

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent  # .qa-artifacts/exam-resume-20261008
REPO = ROOT.parents[1]
SRC = ROOT / "next-three-source-review-r1"
PROVISIONS = ROOT / "gyeongsang-remaining-final14-r1" / "claude-review-r1" / "official-provisions.json"
BANK = ROOT / "bank-read-fresh-r3-20261008.json"
REGISTRY = REPO / "src" / "lib" / "middle" / "m3Trig.ts"
AUTHOR = "claude-opus-5-5-parent-exam-twin-20261014"
TWIN_PREFIX = "exam-twin-nobyeon-2025-2-mid-author-claude-r1-q"


def sha_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def sha(p: pathlib.Path) -> str:
    return sha_bytes(p.read_bytes())


def rel(p: pathlib.Path) -> str:
    return p.resolve().relative_to(REPO).as_posix()


def dump(p: pathlib.Path, value) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


# ── 보기 LaTeX → 정확값 ─────────────────────────────────────────────
def latex_value(tex: str):
    """$…$ 한 덩어리의 수(분수·근호·정수·단위)를 sympy 값으로. 보기의 글과 값이 따로 놀지 않게 글에서 읽는다."""
    s = tex.strip()
    assert s.startswith("$") and s.endswith("$"), tex
    s = s[1:-1]
    s = re.sub(r"\\,\\mathrm\{(?:cm|m)\}(?:\^\{?2\}?)?", "", s)
    s = s.replace("\\,", "")
    for _ in range(4):
        s = re.sub(r"\\frac\{([^{}]*)\}\{([^{}]*)\}", r"((\1)/(\2))", s)
        s = re.sub(r"\\sqrt\{([^{}]*)\}", r"sqrt(\1)", s)
    s = re.sub(r"(\d)\s*(sqrt|\()", r"\1*\2", s)
    s = re.sub(r"\)\s*(sqrt|\()", r")*\1", s)
    assert "\\" not in s, f"unparsed LaTeX: {tex} -> {s}"
    return sp.nsimplify(sp.sympify(s))


CIRCLED = "①②③④⑤"

provisions = {r["id"]: r for r in json.loads(PROVISIONS.read_text(encoding="utf-8"))["provisions"]}
bank = json.loads(BANK.read_text(encoding="utf-8"))
units = {u["section"]: u for u in bank["units"] if u["grade"] == "중3"}
live = bank.get("liveFamilies") or []


def live_count(family_key: str):
    for row in live:
        if row.get("family_key") == family_key:
            return {"unit_id": row.get("unit_id"), "family_key": family_key, "live_count": row.get("live_count")}
    return None


registry_text = REGISTRY.read_text(encoding="utf-8")


def registry_def(book: str, number: str):
    """m3Trig.ts 의 def(...) 한 줄을 찾아 그 제목·절을 돌려준다(가까운 목적 비교용 — 배정 근거가 아니다)."""
    pattern = re.compile(r'def\(\s*"' + re.escape(book) + r'",\s*"' + number + r'",\s*"([^"]+)",\s*SEC\.(\S+?),\s*"([^"]+)"')
    m = pattern.search(registry_text)
    assert m, (book, number)
    line = registry_text[: m.start()].count("\n") + 1
    return {"key": f"mid:3-2|{book}|{number}", "title": m.group(1), "section": m.group(2), "difficulty": m.group(3), "line1based": line}


def prov(ids):
    out = []
    for i in ids:
        r = provisions[i]
        row = {k: r[k] for k in ("id", "text", "kind", "hwpRecord1based", "pdfPrintedPage")}
        row["evidenceFiles"] = r["evidenceFiles"][:3]
        row["evidenceFileCount"] = len(r["evidenceFiles"])
        out.append(row)
    return out


TRIG_RESTRICTIONS = ["no_trig_ratio_relationships", "angle_range", "no_complex_geometry_measurement", "no_formal_complex_justification"]

# ── 다섯 문항 ───────────────────────────────────────────────────────
ITEMS = []

ITEMS.append({
    "n": 1, "score": 3.0, "difficulty": "기본", "unitSection": "삼각비의 뜻",
    "content": (
        r"가로 $\overline{\mathrm{PQ}}$와 세로 $\overline{\mathrm{QR}}$의 길이의 비가 $3:1$인 직사각형 모양의 현수막 "
        r"$\mathrm{PQRS}$에 대각선 $\mathrm{PR}$을 그었다. 그림과 같이 $\angle \mathrm{QPR}=x$, $\angle \mathrm{PRQ}=y$라 할 때, "
        r"$\cos x\times\tan y$의 값은?"
    ),
    "choices": [r"$\frac{\sqrt{10}}{30}$", r"$\frac{\sqrt{10}}{10}$", r"$\frac{3\sqrt{10}}{10}$", r"$\frac{9\sqrt{10}}{10}$", r"$3\sqrt{10}$"],
    "solution": "\n\n".join([
        r"현수막은 직사각형이므로 $\angle \mathrm{PQR}=90^\circ$이다. $\overline{\mathrm{PQ}}=3k$, $\overline{\mathrm{QR}}=k$ $(k>0)$라 하면 "
        r"직각삼각형 $\mathrm{PQR}$에서 피타고라스 정리에 의해 $\overline{\mathrm{PR}}=\sqrt{(3k)^2+k^2}=\sqrt{10}\,k$이다.",
        r"$\cos x=\frac{\overline{\mathrm{PQ}}}{\overline{\mathrm{PR}}}=\frac{3k}{\sqrt{10}\,k}=\frac{3}{\sqrt{10}}$이고, "
        r"$\tan y=\frac{\overline{\mathrm{PQ}}}{\overline{\mathrm{QR}}}=\frac{3k}{k}=3$이다.",
        r"따라서 $\cos x\times\tan y=\frac{3}{\sqrt{10}}\times3=\frac{9}{\sqrt{10}}=\frac{9\sqrt{10}}{10}$이다.",
    ]),
    "math": lambda: (lambda k: sp.Rational(3) / sp.sqrt(10) * 3)(1),
    "modes": ["context", "representation"],
    "after": "직각을 낀 두 변의 비를 삼각형에 직접 주던 것을, 가로와 세로의 비가 주어진 직사각형 현수막과 그 대각선으로 바꾸었다. "
             "직각은 직사각형의 성질에서 나오고, 묻는 두 삼각비도 서로 다른 꼭짓점의 다른 짝(cos x, tan y)이다.",
    "sharedConcept": "두 변의 길이의 비가 주어진 직각삼각형에서 빗변을 구하고 삼각비의 정의로 두 각의 삼각비를 구한다.",
    "sharedProcedure": "비를 k배로 두고 피타고라스 정리로 빗변을 구한 뒤, 정의에 따라 서로 다른 두 각의 삼각비를 각각 구해 곱한다.",
    "standards": ["9수04-12", "9수04-16", "9수04-17"],
    "method": "직사각형의 한 각이 직각임을 이용해 직각삼각형을 잡고, 피타고라스 정리와 삼각비의 정의만 쓴다. 두 삼각비 사이의 관계식은 쓰지 않는다.",
    "familyCompare": [("삼각비", "01"), ("삼각비", "03"), ("삼각비", "20")],
    "familyNote": "01(삼각비의 값)은 세 변이 주어진 직각삼각형, 03은 한 삼각비에서 다른 삼각비를 구하는 갈래, 20은 두 삼각비의 식 계산이다. "
                  "비가 주어진 직사각형의 대각선이라는 입력 전체와 맞는 갈래를 확인하지 못해 배정하지 않는다.",
    "distractors": {
        "①": "cos x 를 QR/PR, tan y 를 QR/PQ 로 둘 다 뒤집은 값",
        "②": "tan y 만 QR/PQ 로 뒤집은 값",
        "③": "cos x 를 QR/PR 로 잡은 값",
        "⑤": "9/√10 을 9√10 으로 잘못 유리화한 뒤 3 으로 나눈 값",
    },
    "figure": {
        "version": 2, "theme": "exam-thin",
        "style": {"font_size": 18, "angle_font_size": 17, "angle_radius": 16, "padding": 22, "show_points": False},
        "points": {"P": [0, 0], "Q": [240, 0], "R": [240, 80], "S": [0, 80]},
        "segments": {"PQ": ["P", "Q"], "QR": ["Q", "R"], "RS": ["R", "S"], "SP": ["S", "P"], "PR": ["P", "R"]},
        "labels": {"P": "P", "Q": "Q", "R": "R", "S": "S"},
        "angles": {
            "rightQ": {"vertex": "Q", "points": ["P", "R"], "right": True, "radius": 9},
            "angX": {"vertex": "P", "points": ["Q", "R"], "label": "$x$", "radius": 40, "label_distance": 56},
            "angY": {"vertex": "R", "points": ["P", "Q"], "label": "$y$", "radius": 22, "label_distance": 34},
        },
    },
})

ITEMS.append({
    "n": 2, "score": 4.0, "difficulty": "응용", "unitSection": "삼각비의 뜻",
    "content": (
        r"그림과 같이 $\angle \mathrm{B}=90^\circ$인 직각삼각형 $\mathrm{ABC}$의 빗변 $\mathrm{AC}$ 위의 점 $\mathrm{D}$에서 "
        r"변 $\mathrm{BC}$에 내린 수선의 발을 $\mathrm{E}$라 하고, $\angle \mathrm{CDE}=x$라 하자. "
        r"$\cos x=\frac{5}{13}$이고 $\overline{\mathrm{AC}}=26$일 때, $\overline{\mathrm{BC}}$의 길이는?"
    ),
    "choices": [r"$10$", r"$12$", r"$20$", r"$24$", r"$25$"],
    "solution": "\n\n".join([
        r"두 선분 $\mathrm{DE}$와 $\mathrm{AB}$는 모두 변 $\mathrm{BC}$에 수직이므로 서로 평행하다. "
        r"따라서 동위각으로 $\angle \mathrm{CDE}=\angle \mathrm{CAB}$, 즉 $x=\angle \mathrm{A}$이다.",
        r"직각삼각형 $\mathrm{ABC}$에서 $\cos x=\cos A=\frac{\overline{\mathrm{AB}}}{\overline{\mathrm{AC}}}=\frac{5}{13}$이므로 "
        r"$\overline{\mathrm{AB}}=26\times\frac{5}{13}=10$이다.",
        r"피타고라스 정리에 의해 $\overline{\mathrm{BC}}=\sqrt{26^2-10^2}=\sqrt{576}=24$이다.",
    ]),
    "math": lambda: sp.sqrt(26**2 - (sp.Rational(26) * sp.Rational(5, 13)) ** 2),
    "modes": ["inverse-target", "structure"],
    "after": "변의 길이 둘을 주고 수선이 만드는 각의 삼각비 식을 묻던 것을, 수선이 만드는 각의 코사인과 빗변을 주고 다른 변의 길이를 되찾게 바꾸었다. "
             "점도 빗변 위에서 다른 변으로 수선을 내리는 배치로 바꾸었고, 묻는 대상이 삼각비의 값에서 변의 길이로 넘어갔다.",
    "sharedConcept": "수선이 만드는 작은 직각삼각형과 처음 직각삼각형에서 같은 크기의 각을 찾아, 큰 삼각형의 변으로 그 각의 삼각비를 나타낸다.",
    "sharedProcedure": "평행선의 동위각(또는 공통인 각과 직각)으로 수선이 만든 각이 처음 삼각형의 한 예각과 같음을 보이고, 그 각의 삼각비 정의와 피타고라스 정리로 길이를 구한다.",
    "standards": ["9수04-02", "9수04-16", "9수04-17"],
    "method": "평행선의 동위각으로 x=∠A 를 보이고, 코사인의 정의와 피타고라스 정리만 쓴다.",
    "familyCompare": [("삼각비", "04"), ("삼각비", "05"), ("삼각비", "02")],
    "familyNote": "04·05(직각삼각형의 닮음과 삼각비)가 가장 가깝지만 주어진 것이 삼각비의 값이고 묻는 것이 변의 길이인 역방향 갈래인지 확인하지 못했다. "
                  "02(삼각비를 이용하여 변의 길이 구하기)는 수선·평행 구성이 없다. 배정하지 않는다.",
    "distractors": {
        "①": "x 를 ∠C 로 잘못 보고 BC=26×5/13 로 구한 값(또는 AB 를 답으로 쓴 값)",
        "②": "BC 를 반으로 잘못 계산한 값",
        "③": "특정 오류를 겨냥하지 않은 값",
        "⑤": "빗변 26 에 가까운 값 — 특정 오류를 겨냥하지 않음",
    },
    "figure": {
        "version": 2, "theme": "exam-thin",
        "style": {"font_size": 18, "angle_font_size": 17, "angle_radius": 16, "padding": 22, "show_points": False},
        "points": {"A": [0, 0], "B": [0, 100], "C": [240, 100], "D": [100.8, 42.0], "E": [100.8, 100]},
        "segments": {"AB": ["A", "B"], "BC": ["B", "C"], "CA": ["C", "A"], "DE": ["D", "E"]},
        "labels": {"A": "A", "B": "B", "C": "C", "D": "D", "E": "E"},
        "angles": {
            "rightB": {"vertex": "B", "points": ["A", "C"], "right": True, "radius": 9},
            "rightE": {"vertex": "E", "points": ["D", "C"], "right": True, "radius": 9},
            "angX": {"vertex": "D", "points": ["C", "E"], "label": "$x$", "radius": 20, "label_distance": 32},
        },
    },
})

ITEMS.append({
    "n": 4, "score": 5.0, "difficulty": "응용", "unitSection": "삼각비의 뜻",
    "content": (
        r"일차함수 $y=kx+6$ $(k>0)$의 그래프가 $x$축, $y$축과 만나는 점을 각각 $\mathrm{P}$, $\mathrm{Q}$라 하고, "
        r"이 그래프와 $x$축이 이루는 예각의 크기를 $a$라 하자. $\cos a=\frac{4}{5}$일 때, 원점 $\mathrm{O}$에 대하여 "
        r"삼각형 $\mathrm{OPQ}$의 넓이는?"
    ),
    "choices": [r"$12$", r"$18$", r"$24$", r"$36$", r"$48$"],
    "solution": "\n\n".join([
        r"$y$절편이 $6$이므로 $\mathrm{Q}(0,\,6)$이고, $k>0$이므로 $x$절편인 점 $\mathrm{P}$는 $x$축의 음의 부분에 있다. "
        r"삼각형 $\mathrm{OPQ}$는 $\angle \mathrm{POQ}=90^\circ$인 직각삼각형이고, 그래프와 $x$축이 이루는 예각은 $\angle \mathrm{OPQ}=a$이다.",
        r"$\cos a=\frac{\overline{\mathrm{OP}}}{\overline{\mathrm{PQ}}}=\frac{4}{5}$이므로 $\overline{\mathrm{OP}}=4t$, $\overline{\mathrm{PQ}}=5t$ $(t>0)$라 하면 "
        r"피타고라스 정리에 의해 $\overline{\mathrm{OQ}}=\sqrt{(5t)^2-(4t)^2}=3t$이다. $\overline{\mathrm{OQ}}=6$이므로 $t=2$, $\overline{\mathrm{OP}}=8$이다.",
        r"따라서 삼각형 $\mathrm{OPQ}$의 넓이는 $\frac{1}{2}\times8\times6=24$이다.",
    ]),
    "math": lambda: sp.Rational(1, 2) * 8 * 6,
    "modes": ["inverse-target", "structure"],
    "after": "계수가 모두 주어진 직선에서 예각의 삼각비 식을 묻던 것을, 기울기를 모르는 직선의 y절편과 예각의 코사인을 주고 축과 만드는 삼각형의 넓이를 묻게 바꾸었다. "
             "결과(삼각비)에서 입력(절편·넓이)으로 묻는 방향이 바뀌었다.",
    "sharedConcept": "직선이 두 좌표축과 만드는 직각삼각형에서 직선과 x축이 이루는 예각의 삼각비를 변의 길이로 나타낸다.",
    "sharedProcedure": "x절편·y절편으로 원점과 함께 직각삼각형을 만들고, 예각의 삼각비 정의와 피타고라스 정리로 변의 길이를 구한다.",
    "standards": ["9수03-01", "9수03-05", "9수03-06", "9수04-16", "9수04-17"],
    "method": "일차함수의 절편으로 실제 직각삼각형을 만들고 코사인의 정의·피타고라스 정리만 쓴다. «기울기 = tan» 관계나 삼각비 사이의 관계식은 쓰지 않는다.",
    "familyCompare": [("삼각비", "06"), ("삼각비", "11")],
    "familyNote": "06(직선의 방정식과 삼각비)·11(직선의 기울기와 삼각비)이 가깝지만, 삼각비의 값과 y절편에서 넓이를 되찾는 역방향 입력 전체와 맞는지 확인하지 못했다. 배정하지 않는다.",
    "distractors": {
        "①": "½×4×6 — OP 를 비의 4 그대로 잡은 값",
        "②": "½×6×6 — OP 를 OQ 와 같다고 본 값",
        "④": "6×6 — OP=OQ 로 보고 1/2 도 빠뜨린 값",
        "⑤": "넓이에서 1/2 을 빠뜨린 값",
    },
    "figure": None,
})

ITEMS.append({
    "n": 6, "score": 4.0, "difficulty": "응용", "unitSection": "삼각비의 값", "widthMm": 45,
    "content": (
        r"한 쌍의 삼각자를 그림과 같이 변 $\mathrm{BC}$가 겹치도록 놓았다. "
        r"$\angle \mathrm{ABC}=\angle \mathrm{BCD}=90^\circ$, $\angle \mathrm{BAC}=45^\circ$, $\angle \mathrm{BDC}=30^\circ$이고 "
        r"$\overline{\mathrm{AC}}=6\sqrt{2}\,\mathrm{cm}$일 때, 삼각형 $\mathrm{BCD}$의 넓이는?"
    ),
    "choices": [r"$6\sqrt{3}\,\mathrm{cm}^2$", r"$9\sqrt{3}\,\mathrm{cm}^2$", r"$12\sqrt{3}\,\mathrm{cm}^2$", r"$18\sqrt{3}\,\mathrm{cm}^2$", r"$36\sqrt{3}\,\mathrm{cm}^2$"],
    "solution": "\n\n".join([
        r"삼각형 $\mathrm{ABC}$는 $\angle \mathrm{B}=90^\circ$, $\angle \mathrm{BAC}=45^\circ$인 직각삼각형이므로 "
        r"$\sin 45^\circ=\frac{\overline{\mathrm{BC}}}{\overline{\mathrm{AC}}}$에서 $\overline{\mathrm{BC}}=6\sqrt{2}\times\frac{\sqrt{2}}{2}=6\,\mathrm{cm}$이다.",
        r"삼각형 $\mathrm{BCD}$는 $\angle \mathrm{C}=90^\circ$, $\angle \mathrm{BDC}=30^\circ$인 직각삼각형이므로 "
        r"$\tan 30^\circ=\frac{\overline{\mathrm{BC}}}{\overline{\mathrm{CD}}}=\frac{\sqrt{3}}{3}$에서 "
        r"$\overline{\mathrm{CD}}=6\times\frac{3}{\sqrt{3}}=6\sqrt{3}\,\mathrm{cm}$이다.",
        r"따라서 삼각형 $\mathrm{BCD}$의 넓이는 $\frac{1}{2}\times6\times6\sqrt{3}=18\sqrt{3}\,(\mathrm{cm}^2)$이다.",
    ]),
    "math": lambda: (lambda bc: sp.Rational(1, 2) * bc * (bc / sp.tan(sp.pi / 6)))(6 * sp.sqrt(2) * sp.sin(sp.pi / 4)),
    "modes": ["context", "inverse-target", "structure"],
    "after": "한 변의 길이를 다른 삼각형에서 주고 반대쪽 삼각형의 둘레를 묻던 것을, 한 쌍의 삼각자라는 소재로 바꾸고 45° 삼각자의 빗변에서 30° 삼각자의 넓이를 묻게 했다. "
             "두 삼각형의 역할(주는 쪽·묻는 쪽)과 특수각의 배치, 묻는 양(둘레→넓이)이 모두 바뀌었다.",
    "sharedConcept": "변 하나를 공유하는 두 직각삼각형에서 특수각의 삼각비로 공유 변을 거쳐 다른 삼각형의 변을 구한다.",
    "sharedProcedure": "주어진 삼각형에서 특수각의 삼각비로 공유 변을 구하고, 다른 삼각형에서 다시 특수각의 삼각비로 나머지 변을 구해 목표량을 계산한다.",
    "standards": ["9수04-17", "9수04-18", "6수03-06"],
    "method": "45°, 30° 의 삼각비 값과 정의만 쓴다. 삼각형 넓이는 (밑변)×(높이)÷2 이다.",
    "familyCompare": [("삼각비", "10"), ("삼각비의 활용", "01")],
    "familyNote": "10(특수각의 삼각비의 값을 이용하여 변의 길이 구하기)이 가깝지만 두 삼각형을 잇고 넓이를 묻는 구성 전체와 맞는지 확인하지 못했다. 배정하지 않는다.",
    "distractors": {
        "①": "CD 를 BC·tan30° 로 잘못 잡은 값(2√3)으로 넓이를 구한 값",
        "②": "CD 를 BC×sin60°(=3√3) 로 잘못 잡은 값",
        "③": "CD 를 BC÷sin60°(=4√3) 로 잘못 잡은 값",
        "⑤": "넓이에서 1/2 을 빠뜨린 값",
    },
    "figure": {
        "version": 2, "theme": "exam-thin",
        "style": {"font_size": 18, "angle_font_size": 17, "angle_radius": 16, "padding": 22, "show_points": False},
        "points": {"A": [0, 0], "B": [0, 120], "C": [120, 120], "D": [120, -87.846]},
        "segments": {"AB": ["A", "B"], "BC": ["B", "C"], "CA": ["C", "A"], "CD": ["C", "D"], "DB": ["D", "B"]},
        "labels": {"A": "A", "B": "B", "C": "C", "D": "D"},
        "angles": {
            "rightB": {"vertex": "B", "points": ["A", "C"], "right": True, "radius": 9},
            "rightC": {"vertex": "C", "points": ["B", "D"], "right": True, "radius": 9},
            "angA45": {"vertex": "A", "points": ["B", "C"], "label": "$45^\\circ$", "radius": 22, "label_distance": 38},
            "angD30": {"vertex": "D", "points": ["B", "C"], "label": "$30^\\circ$", "radius": 30},
        },
    },
})

ITEMS.append({
    "n": 8, "score": 4.0, "difficulty": "응용", "unitSection": "삼각비의 활용",
    "content": (
        r"평행사변형 $\mathrm{ABCD}$에서 두 대각선의 교점을 $\mathrm{O}$라 하자. "
        r"$\overline{\mathrm{AB}}=6\,\mathrm{cm}$, $\angle \mathrm{ABC}=60^\circ$이고 삼각형 $\mathrm{OBC}$의 넓이가 "
        r"$12\sqrt{3}\,\mathrm{cm}^2$일 때, $\overline{\mathrm{BC}}$의 길이는?"
    ),
    "choices": [r"$4\,\mathrm{cm}$", r"$8\,\mathrm{cm}$", r"$16\,\mathrm{cm}$", r"$16\sqrt{3}\,\mathrm{cm}$", r"$32\,\mathrm{cm}$"],
    "solution": "\n\n".join([
        r"점 $\mathrm{A}$에서 직선 $\mathrm{BC}$에 내린 수선의 발을 $\mathrm{H}$라 하면 직각삼각형 $\mathrm{ABH}$에서 "
        r"$\sin 60^\circ=\frac{\overline{\mathrm{AH}}}{\overline{\mathrm{AB}}}$이므로 $\overline{\mathrm{AH}}=6\times\frac{\sqrt{3}}{2}=3\sqrt{3}\,\mathrm{cm}$이다.",
        r"대각선 $\mathrm{AC}$는 평행사변형의 넓이를 이등분하므로 삼각형 $\mathrm{ABC}$의 넓이는 평행사변형 넓이의 $\frac{1}{2}$이다. "
        r"또 평행사변형의 두 대각선은 서로를 이등분하므로 $\mathrm{O}$는 $\mathrm{AC}$의 중점이고, 삼각형 $\mathrm{OBC}$의 넓이는 삼각형 $\mathrm{ABC}$의 넓이의 $\frac{1}{2}$이다. "
        r"따라서 평행사변형 $\mathrm{ABCD}$의 넓이는 $4\times12\sqrt{3}=48\sqrt{3}\,\mathrm{cm}^2$이다.",
        r"평행사변형의 넓이는 (밑변)$\times$(높이)이므로 $\overline{\mathrm{BC}}\times3\sqrt{3}=48\sqrt{3}$, 즉 $\overline{\mathrm{BC}}=16\,\mathrm{cm}$이다.",
    ]),
    "math": lambda: (4 * 12 * sp.sqrt(3)) / (6 * sp.sin(sp.pi / 3)),
    "modes": ["inverse-target", "structure"],
    "after": "두 변과 끼인각을 주고 대각선이 나눈 삼각형의 넓이를 묻던 것을, 한 변·끼인각과 대각선이 나눈 다른 삼각형의 넓이를 주고 나머지 변의 길이를 되찾게 바꾸었다. "
             "넓이(결과)에서 변(입력)으로 묻는 방향이 바뀌었다.",
    "sharedConcept": "평행사변형의 높이를 한 변과 끼인각의 사인으로 구하고, 대각선이 만드는 네 삼각형의 넓이가 같음을 이용한다.",
    "sharedProcedure": "수선의 실제 높이를 사인의 정의로 구하고, 대각선의 성질로 작은 삼각형과 평행사변형의 넓이 관계를 세운 뒤 (밑변)×(높이)로 길이를 구한다.",
    "standards": ["9수04-12", "9수04-17", "9수04-18", "6수03-06"],
    "method": "높이는 실제 수선과 사인의 정의로, 넓이는 (밑변)×(높이)로 구한다. «½ab sin C» 넓이 공식을 외워 쓰게 하지 않는다.",
    "familyCompare": [("삼각비의 활용", "11"), ("삼각비의 활용", "08")],
    "familyNote": "활용11(평행사변형의 넓이)이 가깝지만 넓이에서 변을 되찾는 역방향과 대각선이 나눈 삼각형을 거치는 구성 전체와 맞는지 확인하지 못했다. 배정하지 않는다.",
    "distractors": {
        "①": "OBC 넓이를 평행사변형 넓이로 잘못 보고 구한 값",
        "②": "OBC 넓이를 평행사변형의 반으로 잘못 보고 구한 값",
        "④": "높이를 AB·cos60°=3 으로 잘못 잡은 값",
        "⑤": "넓이 관계를 8배로 잘못 잡은 값",
    },
    "figure": {
        "version": 2, "theme": "exam-thin",
        "style": {"font_size": 18, "angle_font_size": 17, "angle_radius": 16, "padding": 22, "show_points": False},
        # 12px = 1cm: AB=6, BC=16, ∠B=60° — 대각선 BD 가 ∠B 의 이등분선에서 15° 쯤 떨어져 각 라벨이 안에 들어간다.
        "points": {"A": [36, 77.646], "B": [0, 140], "C": [192, 140], "D": [228, 77.646], "O": [114, 108.823]},
        "segments": {"AB": ["A", "B"], "BC": ["B", "C"], "CD": ["C", "D"], "DA": ["D", "A"], "AC": ["A", "C"], "BD": ["B", "D"]},
        "regions": {"shadeOBC": {"boundary": [{"seg": ["O", "B"]}, {"seg": ["B", "C"]}, {"seg": ["C", "O"]}], "fill": "#e8eef7"}},
        "labels": {"A": "A", "B": "B", "C": "C", "D": "D", "O": "O"},
        "angles": {"angB60": {"vertex": "B", "points": ["C", "A"], "label": "$60^\\circ$", "radius": 20, "label_distance": 50}},
    },
})


# ── 쓰기 ─────────────────────────────────────────────────────────────
def main():
    calc_rows, index_rows, render_rows = [], [], []
    for it in ITEMS:
        n = it["n"]
        tag = f"q{n:02d}"
        folder = HERE / "candidates" / tag
        staged_path = SRC / "question-only-staged" / "nobyeon" / f"{tag}.json"
        report_path = SRC / "items" / "nobyeon" / f"{tag}.json"
        staged = json.loads(staged_path.read_text(encoding="utf-8"))
        report = json.loads(report_path.read_text(encoding="utf-8"))
        school = report["sourceIdentity"]["printedSchool"]

        # 정확 계산 — 정답은 보기 가운데 정확히 하나, 보기는 서로 다른 값
        answer_value = sp.nsimplify(sp.simplify(it["math"]()))
        values = [sp.nsimplify(sp.simplify(latex_value(c))) for c in it["choices"]]
        assert len({sp.srepr(v) for v in values}) == 5, (tag, values)
        hits = [i for i, v in enumerate(values) if sp.simplify(v - answer_value) == 0]
        assert len(hits) == 1, (tag, answer_value, values)
        answer = CIRCLED[hits[0]]
        assert all(float(values[i]) < float(values[i + 1]) for i in range(4)), f"{tag}: choices not ascending"
        calc_rows.append({
            "questionNumber": n,
            "answerExact": sp.srepr(answer_value), "answerLatex": sp.latex(answer_value), "answerFloat": float(answer_value),
            "answer": answer,
            "choices": [{"choice": CIRCLED[i], "latex": c, "exact": sp.latex(values[i]), "float": float(values[i]),
                         "equalsAnswer": i == hits[0], "authorDistractorNote": it["distractors"].get(CIRCLED[i])}
                        for i, c in enumerate(it["choices"])],
            "uniqueCorrectChoice": True, "choicesDistinct": True, "choicesAscending": True,
        })

        figure_artifacts = []
        if it["figure"]:
            dump(folder / "stem-1.spec.json", it["figure"])
            figure_artifacts.append({"role": "stem", "specPath": "stem-1.spec.json", "svgPath": "stem-1.svg", "intendedWidthMm": it.get("widthMm", 70)})
            render_rows.append({"questionNumber": n, "spec": {"path": rel(folder / "stem-1.spec.json"), "sha256": sha(folder / "stem-1.spec.json")},
                                "svgPath": rel(folder / "stem-1.svg")})

        unit = units[it["unitSection"]]
        compared = []
        for book, number in it["familyCompare"]:
            d = registry_def(book, number)
            compared.append({"registry": d, "liveMatch": live_count(d["key"])})

        standards = it["standards"]
        candidate = {
            "schemaVersion": 1,
            "questionNumber": n,
            "twinExternalId": f"{TWIN_PREFIX}{n:02d}",
            "authorId": AUTHOR,
            "questionType": "객관식",
            "score": it["score"],
            "content": it["content"],
            "choices": it["choices"],
            "answer": answer,
            "solution": it["solution"],
            "figureArtifacts": figure_artifacts,
            "sourceReference": {
                "externalId": f"2025-nobyeon-3-2-mid-{n}",
                "sourceContentSha256": sha(staged_path),
                "sourceSchoolInternal": school,
                "sourceExamYear": 2025,
                "questionOnlyStaged": {"path": rel(staged_path), "sha256": sha(staged_path)},
                "sourceReviewReport": {"path": rel(report_path), "sha256": sha(report_path)},
                "newSourceReferenceId": staged.get("newSourceReferenceId"),
                "sourceIdentityAsProvided": report["sourceIdentity"]["status"],
                "sourceManifestOrOriginalAnswerInput": False,
                "originalAnswersOmittedInInput": bool(staged.get("originalAnswersOmitted")),
            },
            "variantDelta": {
                "modes": it["modes"],
                "before": staged["stem"],
                "after": it["after"],
                "sharedConcept": it["sharedConcept"],
                "sharedProcedure": it["sharedProcedure"],
                "originalAnswerOrNumericalAgreementUsed": False,
            },
            "curriculumReview": {
                "grade": "중3",
                "edition": "2015",
                "status": "author-proposed",
                "standardCodes": standards,
                "legitimateMethodDraft": it["method"],
                "officialProvisions": prov(standards),
                "restrictionClauses": prov(TRIG_RESTRICTIONS + (["para-4221"] if n == 4 else [])),
                "independentReviewPending": True,
                "authorCannotApprove": True,
                "sourceEraBasis": "Actual 2025 middle3 uses 2015; middle3 rollout of 2022 begins 2027; future republication needs its own review.",
                "preauthorGate": "author-method-proposed-independent-review-pending",
            },
            "metadata": {
                "grade": "중3",
                "semester": 2,
                "subject": "수학",
                "source": "transformed",
                "originProblemId": None,
                "curriculum": {"sourceExam": "2015", "target": "2015", "2027Republication": "requires new 2022 review"},
                "sourceExamYear": 2025,
                "sourceSchoolInternal": school,
                "fictionalVisibleSchool": None,
                "schoolReplacementMap": {},
                "fictionalSchoolUsedInStudentText": False,
                "sourceSchoolNamesInStudentSurfaces": False,
                "sourceQuestionId": f"2025-nobyeon-3-2-mid-{n}",
                "twinExternalId": f"{TWIN_PREFIX}{n:02d}",
                "questionType": "객관식",
                "score": it["score"],
                "parentScoreCountedOnce": True,
                "newSubpartRubric": [],
                "sourcePrintedScore": {"originalPrintedParentScore": staged["score"]["parentScore"], "parentCountedOnce": True},
                "difficultyProposal": it["difficulty"],
                "difficultyStatus": "author-proposed",
                "difficultyEvidence": f"Task operations: {it['sharedProcedure']} Original printed points kept; not a measured difficulty.",
                "problemTypeProposal": None,
                "problemTypeStatus": "pending",
                "problemTypeEvidence": "problemType is a separate bank axis; no rule maps this whole item yet.",
                "assignment": {
                    "status": "proposed",
                    "unitId": unit["id"],
                    "unitSection": unit["section"],
                    "familyKey": None,
                    "evidence": {
                        "actualCapturedUnit": unit,
                        "bankSnapshot": {"path": rel(BANK), "sha256": sha(BANK), "capturedAt": bank.get("capturedAt"), "snapshotOnly": True},
                        "registry": {"path": rel(REGISTRY), "sha256": sha(REGISTRY)},
                        "comparedRegistryEntries": compared,
                        "comparison": it["familyNote"],
                    },
                },
                "authorMathEvidence": {"file": "../../author-calculations.json", "questionNumber": n},
                "authorSevenSurfaceEvidence": {"path": f"author-checks/{tag}.json"},
                "authorOnly": True,
                "independentMathApproval": False,
                "independentGradeApproval": False,
                "rightsApproved": False,
                "nativeProvenanceApproved": False,
                "loadable": False,
                "limits": [
                    "Independent solve and full seven-surface review pending.",
                    "Rights/native/custody/loading remain pending.",
                    "Historical taxonomy snapshot is not a currentDB assertion.",
                ],
            },
        }
        dump(folder / f"{tag}.json", candidate)

        checks = {
            "questionNumber": n,
            "authorId": AUTHOR,
            "authorObservationOnly": True,
            "surfaces": {
                "stem": {"observation": f"{it['method']} 본문의 조건만으로 답이 하나로 정해진다(author-calculations.json).", "standards": standards},
                "choices": {"observation": "다섯 보기 모두 정확값으로 계산해 서로 다르고 정답이 하나뿐임을 확인했다. 오답 보기는 흔한 실수에서 나오게 했다.", "distractors": it["distractors"]},
                "figuresAndTables": {"observation": ("엔진 FigureSpec v2 새 그림 — 본문 조건(직각·각·점의 위치)과 좌표를 맞췄다. 원문 그림은 쓰지 않았다." if it["figure"] else "그림·표 없음 — 원문도 그림이 없다.")},
                "notation": {"observation": "선분은 \\overline, 점은 \\mathrm, 각은 \\angle, 단위는 \\mathrm{cm} 로 은행 표기를 따른다. 학년 밖 기호(θ 등)를 쓰지 않았다."},
                "answer": {"observation": f"정답 {answer} — 단일 선택."},
                "studentSolution": {"observation": "해설은 정의·피타고라스 정리·평행선/평행사변형 성질·특수각 값만 쓴다. 삼각비 사이의 관계식(sin²+cos²=1, tan=sin/cos, 여각 관계)을 쓰지 않는다."},
                "prerequisites": {"observation": "선수: " + ", ".join(standards) + " — 모두 중3(2015)까지 배운다."},
            },
            "notApproval": True,
        }
        dump(HERE / "author-checks" / f"{tag}.json", checks)
        index_rows.append({"questionNumber": n, "candidate": rel(folder / f"{tag}.json"), "twinExternalId": candidate["twinExternalId"],
                           "answer": answer, "modes": it["modes"], "figure": bool(it["figure"])})

    dump(HERE / "author-calculations.json", {"kind": "author-exact-calculations/v1", "author": AUTHOR, "tool": f"sympy {sp.__version__}",
                                            "rows": calc_rows, "notIndependentApproval": True})
    dump(HERE / "assets-to-render.json", render_rows)
    dump(HERE / "candidate-index-draft.json", {"author": AUTHOR, "rows": index_rows})
    print(json.dumps([{"q": r["questionNumber"], "answer": r["answer"], "fig": r["figure"]} for r in index_rows], ensure_ascii=False))


if __name__ == "__main__":
    main()
