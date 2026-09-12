# -*- coding: utf-8 -*-
"""풀이자(grok CLI) 해설 채점 — **걸린 문항은 해설을 싣지 않고 목록으로 낸다.**

    python scripts/import/exam-paper/grade_solutions.py <편 폴더> <문제지 폴더>

메인 scratchpad 의 `grade_grok.py`(일치·모양) 와 `scan_grok_quality.py` ㉠(과정 밖 방법)을
옮겼다(2026-09-13, 원장님 확정 「해설 풀이는 grok CLI 가 맡는다」). 눈금 시험 결과는
51/51 일치 · 과정 밖 방법 2 였다.

⚠️ `scan_grok_quality.py` 의 ㉡(«옳은 것» 문항에서 판정한 보기 개수 세기)은 **옮기지 않았다** —
   거짓 경보라 메인이 버렸다(늘 우는 가드는 꺼진다, 2026-08-20).

## 목록은 한 곳에서 — `solver_rules.json`
금지 방법 · 허용 명령 · 문장 수는 지시서(`SOLVER-BRIEF.md`)와 **같은 파일**에서 온다.
한쪽만 늘리면 시키는 쪽과 세는 쪽이 갈린다(2026-09-13 — 근과 계수의 관계·행렬을 더하며).

## 무엇을 보나
1. **기록된 정답과 일치**하는가 — 참은 `drafts.json` 의 `answer`(HWP 미주)다. 풀이자 쪽에는 없다.
2. **해설 모양** — 제어문자(`\\f` 가 폼피드로 먹힌 것) · `$` 홀수 · 목록 밖 명령 · 금지 표기 ·
   문장 수(«옳은/옳지 않은 것» 문항은 더 길게) · 끝 문장에 «답은».
3. **중학교 과정 밖 방법** — 금지 목록의 낱말, 그리고 이름을 안 대고 식만 쓴 **코사인 법칙 모양**.
4. **변환 잔재** — `scan_residue.py` 의 규칙(빈 분자·빈 분모·사적 사용 영역·빈 \\mathrm{}).

## 무엇을 하나
통과한 것만 `<편>/sol_ai/qNN.json` 으로 옮긴다(적재기 `load-exam-paper.ts` 가 거기서 읽는다).
걸린 것은 `<편>/solve-flags.json` 에 문항·사유로 남긴다 — 해설 전문은 화면에 안 낸다.
앞 채점에서 실린 해설이 이번에 걸리면 **치운다.**

눈금: 판정 **전에** 규칙마다 일부러 걸리는 글과 멀쩡한 글을 대 본다. 한쪽이 안 나오면 판정을 거부한다.
금지 목록은 항목마다 **제 이름**에 걸려야 한다 — 죽은 정규식이 목록에 섞이면 여기서 멈춘다.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import scan_residue  # noqa: E402 — 잔재 규칙은 한 벌만 둔다

RULES = json.loads((HERE / "solver_rules.json").read_text(encoding="utf-8"))
BS = chr(92)
ALLOWED = set(RULES["allowedCommands"])
METHODS = [(m["name"], re.compile(m["pattern"])) for m in RULES["forbiddenMethods"]]
SHAPES = [(s["name"], re.compile(s["pattern"]), s["probeHit"], s["probeMiss"]) for s in RULES["forbiddenShapes"]]
S_MIN, S_MAX, S_MAX_JUDGE = (RULES["sentences"][k] for k in ("min", "max", "maxJudge"))
JUDGE = re.compile(RULES["judgeQuestion"])
BANNED_TOKENS = ("\\(", "\\[", "$$", "**", "# ")

GOOD = ("편차의 합은 $0$이므로 $x=-4$이다.\n"
        "분산은 $\\frac{110}{5}=22$이다.\n"
        "직각삼각형에서 $\\cos 30^\\circ=\\frac{\\sqrt{3}}{2}$이다.\n"
        "따라서 답은 ④이다.")


def is_judge(content: str) -> bool:
    """«옳은 것 / 옳지 않은 것» 을 고르는 문항 — 발문 첫 줄로 본다(scan_grok_quality.py 와 같다)."""
    return bool(JUDGE.search(content.split("\n")[0]))


def commands(s: str) -> set[str]:
    out, i = set(), 0
    while i < len(s):
        if s[i] == BS:
            j = i + 1
            while j < len(s) and s[j].isalpha():
                j += 1
            if j > i + 1:
                out.add(s[i + 1:j])
            i = max(j, i + 1)
        else:
            i += 1
    return out


def shape_issues(s: str, judge: bool = False) -> list[str]:
    out = []
    ctrl = sorted({hex(ord(c)) for c in s if ord(c) < 32 and c != "\n"})
    if ctrl:
        out.append(f"제어문자 {ctrl}")  # \f→폼피드 같은 먹힌 역슬래시
    if s.count("$") % 2:
        out.append("$ 홀수")
    bad = sorted(commands(s) - ALLOWED)
    if bad:
        out.append(f"목록 밖 명령 {bad}")
    for tok in BANNED_TOKENS:
        if tok in s:
            out.append(f"금지 표기 {tok!r}")
    lines = [ln for ln in s.split("\n") if ln.strip()]
    top = S_MAX_JUDGE if judge else S_MAX
    if not (S_MIN <= len(lines) <= top):
        out.append(f"문장 {len(lines)}줄({S_MIN}~{top})")
    if lines and "답은" not in lines[-1]:
        out.append("끝 문장에 «답은» 없음")
    return out


def outside_issues(s: str) -> list[str]:
    out = [f"과정 밖 방법 «{name}»" for name, rx in METHODS if rx.search(s)]
    out += [f"과정 밖 방법 «{name}»" for name, rx, _, _ in SHAPES if rx.search(s)]
    return out


def gauge() -> None:
    """규칙마다 «예»와 «아니오»를 둘 다 내는지 본다."""
    scan_residue.gauge()
    if shape_issues(GOOD) or outside_issues(GOOD):
        raise SystemExit(f"[중단] 멀쩡한 해설을 잡는다: {shape_issues(GOOD) + outside_issues(GOOD)}")
    eight = "\n".join(["$a=1$이다."] * 7 + ["따라서 답은 ①이다."])
    probes = [
        ("제어문자", "a\x0crac{1}{2}\n" * 3 + "답은 ①", False),
        ("$ 홀수", GOOD.replace("$x=-4$", "$x=-4"), False),
        ("목록 밖 명령", GOOD.replace("\\frac{110}{5}", "\\dfrac{110}{5}"), False),
        ("금지 표기", GOOD.replace("$x=-4$", "$$x=-4$$"), False),
        ("문장", "따라서 답은 ④이다.", False),
        ("문장", eight, False),
        ("끝 문장", GOOD.replace("따라서 답은 ④이다.", "그러므로 ④."), False),
    ]
    for name, probe, judge in probes:
        if not any(name in x for x in shape_issues(probe, judge)):
            raise SystemExit(f"[중단] 눈금이 안 걸린다: {name} — 판정을 거부한다")
    if shape_issues(eight, judge=True):
        raise SystemExit("[중단] 보기 판정 문항의 긴 해설까지 잡는다 — 눈금이 틀린다")
    for name, rx in METHODS:
        if not rx.search(name):
            raise SystemExit(f"[중단] 금지 목록 «{name}» 이 제 이름에도 안 걸린다 — 죽은 규칙")
    if not outside_issues("코사인법칙에 의해") or outside_issues("직각삼각형에서 코사인 값"):
        raise SystemExit("[중단] 눈금이 안 걸린다: 과정 밖 방법 이름")
    for name, rx, hit, miss in SHAPES:
        if not rx.search(hit) or rx.search(miss):
            raise SystemExit(f"[중단] 눈금이 안 걸린다: {name}")
    if not is_judge("옳지 않은 것은?\n1. …") or is_judge("넓이는?\n1. 옳은 것"):
        raise SystemExit("[중단] 눈금이 안 걸린다: 보기 판정 문항")


def grade(exam_dir: pathlib.Path, sheet_dir: pathlib.Path) -> dict:
    """문제지 `out/qNN.json` 을 채점해 통과한 것만 `sol_ai/` 로 옮긴다. 요약을 돌려준다."""
    gauge()
    drafts = {d["questionNumber"]: d for d in
              json.loads((exam_dir / "drafts.json").read_text(encoding="utf-8"))}
    sheet = json.loads((sheet_dir / "problems.json").read_text(encoding="utf-8"))
    passed, flags, missing = [], [], []
    (exam_dir / "sol_ai").mkdir(exist_ok=True)
    for p in sheet:
        n = p["n"]
        f = pathlib.Path(p["out"])
        dst = exam_dir / "sol_ai" / f"q{n:02d}.json"
        if not f.exists():
            missing.append(n)
            continue
        try:
            g = json.loads(f.read_text(encoding="utf-8"))
        except Exception as e:  # noqa: BLE001 — 깨진 파일도 목록에 올린다
            g, why = {}, [f"JSON 깨짐 {str(e)[:60]}"]
        else:
            why = []
        got = (g.get("answer") or "").strip()
        want = (drafts[n].get("answer") or "").strip()
        sol = g.get("solution") or ""
        if not why:
            if not got:
                why.append(f"못 풂 ({(g.get('note') or '')[:40]})")
            elif got != want:
                why.append(f"불일치 풀이자 {got} / 정답 {want}")
            if sol:
                why += shape_issues(sol, is_judge(p["content"])) + outside_issues(sol)
                why += [f"잔재 {name}" for name, rx, _ in scan_residue.RULES if rx.search(sol)]
            elif got:
                why.append("해설 없음")
        if why:
            # 앞 채점에서 통과해 들어간 해설이 이번에 걸리면 **치운다** — 걸린 해설은 안 싣는다.
            if dst.exists():
                dst.unlink()
                why.append("앞서 실린 sol_ai 를 치웠다")
            flags.append({"n": n, "why": why})
            continue
        dst.write_text(json.dumps({"answer": got, "solution": sol}, ensure_ascii=False), encoding="utf-8")
        passed.append(n)
    (exam_dir / "solve-flags.json").write_text(
        json.dumps({"passed": passed, "flags": flags, "missing": missing}, ensure_ascii=False, indent=1),
        encoding="utf-8")
    return {"passed": passed, "flags": flags, "missing": missing}


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    exam_dir, sheet_dir = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    r = grade(exam_dir, sheet_dir)
    print(f"통과 {len(r['passed'])} · 걸림 {len(r['flags'])} · 파일 없음 {len(r['missing'])}")
    for f in r["flags"]:
        print(f"   문{f['n']:>2} {'; '.join(f['why'])}")
    return 1 if r["flags"] or r["missing"] else 0


if __name__ == "__main__":
    sys.exit(main())
