# -*- coding: utf-8 -*-
"""변이 **하나만** 돌려 판정한다 — `mutate-elem-tiers.py` 의 낱개 판.

    python scripts/qa/mutate-one.py g5 "약분이 사라짐"
    python scripts/qa/mutate-one.py g6 "공식 훼손"        # 이름 조각으로 고른다
    python scripts/qa/mutate-one.py g5 --list             # 그 학년 변이 목록

**왜 따로 있나** — 전량은 학년마다 20분이 넘는다. 그런데 실제로 다시 물어야 하는 것은
대개 **하나**다: 앵커가 죽었다는 보고가 왔을 때, 시험 문턱을 고친 뒤 그 변이만 재확인할 때,
검수에서 「이 변이가 정말 무는가」를 가를 때. 그 셋에 20분을 쓰면 아무도 안 돌린다.

**앵커 분쟁은 count 로 못 가른다.** count 는 무엇을 어떻게 쟀는지에 통째로 매여 있고
(패턴이 한 겹 벗겨지면 0 · 다른 세션이 하네스 창을 열고 있으면 0 · 포맷이 줄을 합쳐도 0),
세 원인이 **같은 0** 으로 보인다. 반면 이 도구의 판정 줄은 창 상태와 무관하게 참이다 —
`RED` 가 나왔다면 앵커는 살아 있다(못 찾으면 애초에 판정을 거부한다).

**판정 순서는 전량 판과 같다** (CLAUDE.md 2026-08-20·08-21):

  ⑴ 앵커가 정확히 하나인가 — 아니면 **판정 거부**(조용히 0건 치환하고 초록을 내지 않는다)
  ⑵ 파일이 바뀌었나        — 안 바뀌면 치환 실패다(따옴표·역슬래시가 흔한 범인)
  ⑶ **산출물이 바뀌었나**   — 파일이 바뀌어도 뜻이 안 바뀌면 «가드가 아니다»가 거짓말이 된다
  ⑷ 그제서야 시험이 빨개지나

⑶ 을 빠뜨리면 **멀쩡한 가드를 의심하고 고치러 간다** — 가드가 없는 것보다 나쁘다.
한 변이만 도는 판이라 특히 빠뜨리기 쉬워 여기서도 그대로 잰다.

원복은 **바이트**로 한다. 그리고 이 도구를 죽이면 대상 파일이 변이 상태 + 전량 CRLF 로
남는다(적용 쓰기가 텍스트 모드다) — 죽였다면 md5 를 대조하고 ⑴ 변이 되돌리기
⑵ CRLF→LF 를 **둘 다** 해야 원래 바이트가 된다.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HARNESS = os.path.join(ROOT, "scripts", "qa", "mutate-elem-tiers.py")
PROBE_PATH = os.path.join(ROOT, "scripts", "qa", ".mutate-one.probe.ts")

PROBE_TS = """
import { elementaryUnits, generateElementaryProblem } from "../../src/lib/elementary/generate";
import { ELEM_TIERS } from "../../src/lib/elementary/difficulty";

const sections: string[] = __SECTIONS__;
const out: string[] = [];
for (const sec of sections) {
  const unit = elementaryUnits().find(
    (u) => u.grade === "__GRADE__" && u.section.startsWith(sec),
  )!;
  for (const tier of ELEM_TIERS) {
    for (const seed of [20260821, 7, 1234, 1, 2, 3]) {
      try {
        const p = generateElementaryProblem(unit, seed, tier);
        out.push(
          `${sec}|${tier}|${seed}|${p.content}|${p.answer}|${p.solution}|${JSON.stringify(p.figureSpec ?? null)}`,
        );
      } catch (err) {
        out.push(`${sec}|${tier}|${seed}|THROW ${String(err)}`);
      }
    }
  }
}
console.log(JSON.stringify(out));
"""


def load_targets() -> dict:
    """하네스의 변이 목록·타깃을 **그 파일에서** 읽는다 — 목록을 두 벌 두지 않는다."""
    src = io.open(HARNESS, encoding="utf-8").read()
    ns: dict = {"__file__": HARNESS}
    exec(src.split("def run(")[0], ns)
    return ns["TARGETS"]


def probe(grade: str, sections: list[str]) -> str | None:
    ts = PROBE_TS.replace("__SECTIONS__", json.dumps(sections)).replace(
        "__GRADE__", grade
    )
    io.open(PROBE_PATH, "w", encoding="utf-8", newline="\n").write(ts)
    try:
        r = subprocess.run(
            "npx tsx " + os.path.relpath(PROBE_PATH, ROOT),
            shell=True, cwd=ROOT, capture_output=True, text=True,
            encoding="utf-8", errors="replace",
        )
        return r.stdout.strip() if r.returncode == 0 else None
    finally:
        if os.path.exists(PROBE_PATH):
            os.remove(PROBE_PATH)


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    key = sys.argv[1]
    needle = sys.argv[2]
    targets = load_targets()
    if key not in targets:
        print("모르는 타깃: " + key + " — " + " · ".join(targets))
        return 2
    t = targets[key]
    muts = t["muts"]

    if needle == "--list":
        for i, (name, _o, _n) in enumerate(muts):
            print(f"  [{i:2}] {name}")
        return 0

    hits = [m for m in muts if needle in m[0]]
    if len(hits) != 1:
        print(f"이름 조각 «{needle}» 이 {len(hits)}개와 맞는다 — 하나로 좁혀라")
        for h in hits[:8]:
            print("   ·", h[0])
        return 2
    name, old, new = hits[0]
    path = os.path.join(ROOT, t["file"])
    print("변이:", name)

    orig = io.open(path, "rb").read()
    base = hashlib.md5(orig).hexdigest()
    text = orig.decode("utf-8")

    # ⑴ 앵커가 정확히 하나인가 — 아니면 판정을 **거부**한다
    cnt = text.count(old)
    if cnt != 1:
        print(f"⛔ 앵커가 {cnt}개다 — **판정하지 않는다**(코드가 움직였거나 다른 세션의 창)")
        return 3

    before = probe(t["grade"], t["sections"])
    if before is None:
        print("⛔ 기준 산출물을 못 얻었다 — 판정하지 않는다")
        return 3

    io.open(path, "wb").write(text.replace(old, new, 1).encode("utf-8"))
    verdict = None
    fails: list[str] = []
    try:
        # ⑵ 파일이 바뀌었나
        if io.open(path, "rb").read() == orig:
            verdict = "⛔ 파일이 안 바뀌었다 — 판정하지 않는다"
        else:
            # ⑶ 산출물이 바뀌었나
            after = probe(t["grade"], t["sections"])
            if after is None:
                verdict = "⛔ 변이 산출물을 못 얻었다 — 판정하지 않는다"
            elif after == before:
                verdict = "⛔ **산출물이 그대로다** — 판정하지 않는다(뜻이 안 바뀌었다)"
            else:
                # ⑷ 시험이 빨개지나
                r = subprocess.run(
                    "npx vitest run " + t["test"] + " --reporter=basic",
                    shell=True, cwd=ROOT, capture_output=True, text=True,
                    encoding="utf-8", errors="replace",
                )
                fails = [
                    ln.strip().lstrip("×").strip()
                    for ln in (r.stdout + r.stderr).splitlines()
                    if ln.strip().startswith("×")
                ]
                verdict = (
                    "RED   (가드가 문다)"
                    if r.returncode != 0
                    else "GREEN ← **가드가 아니다**"
                )
    finally:
        io.open(path, "wb").write(orig)

    restored = hashlib.md5(io.open(path, "rb").read()).hexdigest() == base
    print("판정:", verdict)
    for f in fails[:8]:
        print("   ↳", f)
    print("복원:", "예" if restored else "**아니오 — 손으로 확인하라**")
    ok = restored and verdict is not None and verdict.startswith("RED")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
