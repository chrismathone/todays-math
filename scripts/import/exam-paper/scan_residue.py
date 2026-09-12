# -*- coding: utf-8 -*-
"""기출 초안의 **변환 잔재**를 훑는다 — 제품 렌더러가 초록이어도 틀린 부류.

    python scripts/import/exam-paper/scan_residue.py <편 폴더> [<편 폴더> …]
    (인자가 없으면 exams/ 아래 drafts.json 이 있는 편 전부)

메인 scratchpad 에만 있던 것을 옮겼다(2026-09-13, 대량 이관 드라이버 `batch_import.py` 가 부른다).
2026-09-12 에 63문항에서 강동중 문15 ② 하나를 이것으로 찾았다 — `\\overline{AB}\\frac{}{\\overline{OB}}`.

잡는 것
- 빈 분자 `\\frac{}{…}` — 분자가 분수 **밖**에 남는 HWP 변환 잔재(20번 문서 2026-08-21).
  KaTeX 는 이것을 오류 없이 그린다 — 분자 자리가 비어 보일 뿐이다.
- 빈 분모 `\\frac{…}{}`
- 사적 사용 영역 글자 (∥ 가 U+F005A 로 왔다 — 2026-09-12)
- 빈 `\\mathrm{}`
- `$` 홀수

눈금: 판정 **전에** 규칙마다 일부러 걸리는 글과 멀쩡한 글을 대서 «예»와 «아니오»를
둘 다 낼 수 있는지 본다. 한쪽이 안 나오면 판정을 거부한다(0 은 «깨끗»과 «못 셈»을 안 가른다).

셸로 넘기면 정규식의 역슬래시가 한 겹 먹힌다 — 그래서 파일로 둔다.
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent

RULES = [
    ("빈 분자", re.compile(r"\\frac\s*\{\s*\}"), r"$\overline{CD}=\overline{AB}\frac{}{\overline{OB}}$"),
    ("빈 분모", re.compile(r"\\frac\s*\{[^{}]*\}\s*\{\s*\}"), r"$\frac{3}{}$"),
    ("사적 사용 영역", re.compile("[\ue000-\uf8ff\U000f0000-\U000ffffd\U00100000-\U0010fffd]"), "m\U000f005a n"),
    ("빈 mathrm", re.compile(r"\\mathrm\s*\{\s*\}"), r"$\mathrm{}A$"),
]
CLEAN = r"$\frac{1}{2}\overline{AB}\mathrm{A}$ 와 $x$"


def odd_dollars(t: str) -> bool:
    return t.count("$") % 2 == 1


def gauge() -> None:
    """규칙마다 «예»와 «아니오»를 둘 다 내는지 본다. 못 내면 SystemExit(2)."""
    for name, rx, probe in RULES:
        if not rx.search(probe):
            raise SystemExit(f"[중단] 눈금이 안 걸린다: {name} — 판정을 거부한다")
        if rx.search(CLEAN):
            raise SystemExit(f"[중단] 멀쩡한 글을 잡는다: {name} — 늘 우는 가드는 꺼진다")
    if not odd_dollars("$a") or odd_dollars(CLEAN):
        raise SystemExit("[중단] 눈금이 안 걸린다: $ 홀수 — 판정을 거부한다")


def _hits_in(label: str, t: str) -> list[str]:
    out = []
    if odd_dollars(t):
        out.append(f"{label} $ 홀수")
    for name, rx, _ in RULES:
        for m in rx.finditer(t):
            ctx = t[max(0, m.start() - 35): m.end() + 30].replace("\n", " ⏎ ")
            out.append(f"{label} {name} «{ctx}»")
    return out


def scan(exam_dir: pathlib.Path) -> list[str]:
    """한 편의 drafts.json(발문·정답·해설)과 sol_ai/*.json(풀이자 해설)을 훑는다."""
    gauge()
    hits: list[str] = []
    drafts = json.loads((exam_dir / "drafts.json").read_text(encoding="utf-8"))
    for x in drafts:
        n = x["questionNumber"]
        for field in ("content", "answer", "solution"):
            hits += _hits_in(f"문{n}.{field}", x.get(field) or "")
    sd = exam_dir / "sol_ai"
    if sd.exists():
        for p in sorted(sd.glob("q*.json")):
            j = json.loads(p.read_text(encoding="utf-8"))
            hits += _hits_in(f"{p.name} 해설", j.get("solution") or "")
    return hits


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    gauge()
    print("눈금 통과 — 규칙", len(RULES) + 1, "개가 «예»와 «아니오»를 둘 다 낸다")
    dirs = [pathlib.Path(a) for a in sys.argv[1:]] or sorted(
        d for d in (HERE / "exams").iterdir() if (d / "drafts.json").exists()
    )
    total = 0
    for d in dirs:
        hits = scan(d)
        total += len(hits)
        print(f"── {d.name}: {len(hits)}건")
        for h in hits:
            print("   ", h)
    print("합계", total)
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
