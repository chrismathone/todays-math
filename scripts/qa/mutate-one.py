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

⑷ 앞에 **㉠ 음성 대조**가 하나 더 있다 — 변이를 넣기 **전에** 그 시험이 초록인가.

    ⚠️ 이 도구는 처음에 리포터로 `basic` 을 썼다. **vitest 4 에서 없어진 이름**이라
       (2026-08-19 설치) 러너가 기동 단계에서 죽고 종료 코드가 1 이 된다. 그런데 ⑷ 는
       「종료 코드 ≠ 0 이면 RED」이므로 **모든 변이가 빨강으로 찍혔다.** 가드가 없는
       변이도 빨강, 치환이 헛돈 변이도 빨강 — **답이 진실에 따라 안 변한다.**
       판정자가 아니라 도장이었다(2026-08-23 발견).

       징후는 있었다: 빨강인데 `↳` 실패 목록이 **늘 비어 있었다.** 판정 줄만 읽고
       근거 줄이 비었다는 것을 안 봤다. 그래서 이제 실패 이름을 **json 으로** 읽고
       (전량 판과 같은 방식), 하나도 못 읽었으면 그 사실을 판정에 **찍는다.**

    그리고 무엇보다, 「망가진 것을 잡는가」만 보면 「멀쩡한 것을 멀쩡하다 하는가」는
    구조적으로 안 보인다 — **판정자에게는 음성 대조군이 있어야 한다.** 기준 시험이
    빨갛거나 러너가 못 뜨면 **판정을 거부한다.**

원복은 **바이트**로 한다. 그리고 이 도구를 죽이면 대상 파일이 변이 상태 + 전량 CRLF 로
남는다(적용 쓰기가 텍스트 모드다) — 죽였다면 md5 를 대조하고 ⑴ 변이 되돌리기
⑵ CRLF→LF 를 **둘 다** 해야 원래 바이트가 된다.
"""
from __future__ import annotations

import hashlib
import importlib.util
import io
import json
import os
import subprocess
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# 하네스가 판정을 **못 읽었을 때** 채워 넣는 자리(`failed_tests`). 이 표가 오면
# 「시험이 빨갛다」가 아니라 「러너가 안 떴다」다 — 그 둘을 뭉개면 모든 변이가 빨강이다.
UNREADABLE = "(판정 결과를 못 읽었다"

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HARNESS = os.path.join(ROOT, "scripts", "qa", "mutate-elem-tiers.py")
# ⚠️ **경로에 PID 를 넣는다.** 고정 이름이면 두 세션이 동시에 돌 때 한쪽이 `finally`
#    에서 지운 파일을 다른 쪽이 못 열어 「산출물을 못 얻었다」로 떨어진다(전량 하네스가
#    이미 겪고 고친 그 자리 — 2026-08-23).
PROBE_PATH = os.path.join(ROOT, "scripts", "qa", f".mutate-one.probe.{os.getpid()}.ts")


def load_harness():
    """
    전량 하네스를 **모듈로 그대로 불러온다** — 변이 목록·타깃·프로브 문자열·시험
    실행기를 한 벌만 두기 위해서다.

    ⚠️ 예전에는 `PROBE_TS` 를 여기에 **복사해** 두었다. 목록은 한 벌이었지만 **씨앗은
       두 벌**이었고, 곧 갈라졌다 — 하네스가 「밟기 어려운 가지」를 밟으려고 넣은
       씨앗(`4`·`79`·`23`·`68`)이 낱개 판에는 없었다. 그러면 **하필 그 변이에서만**
       「⛔ 산출물이 그대로다」라는 **거짓 판정 거부**가 난다. 다음 사람은 「내 가드가
       장식인가」로 읽고 멀쩡한 가드를 고치러 간다(2026-08-23 g6 이 적발).

    ⚠️ 그리고 **같은 부류가 한 번 더 있었다.** 시험을 부르는 줄을 여기에 따로 적어
       두었더니 `t["test"]` 가 **목록인 학년**(초3 은 파일럿 판과 확대 판이 따로다)에서
       `str + list` 로 죽었다. 전량 하네스는 안쪽에서 `*paths` 로 펴는데 낱개 판만
       문자열을 가정했다 — **펴는 규칙이 두 벌**이었다(2026-08-23 리드 적발).

       그래서 이제 예전처럼 앞부분만 `exec` 하지 않고 **모듈째 import** 한다.
       씨앗도, 프로브도, 리포터 이름도, 목록을 펴는 규칙도 늘어날 자리가 없다.
       (하네스는 `if __name__ == "__main__"` 으로 감싸여 있어 import 해도 안 돈다.)
    """
    spec = importlib.util.spec_from_file_location("mutate_elem_tiers", HARNESS)
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    # 계약 — 하네스가 프로브 모양을 바꾸면 **조용히 어긋나지 말고 멈춘다**.
    for needed in ("__SECTIONS__", "__GRADE__", "for (const seed of ["):
        if needed not in mod.PROBE_TS:
            raise SystemExit(
                "하네스의 PROBE_TS 모양이 바뀌었다 — «" + needed + "» 가 없다. "
                "낱개 판을 맞춰 고쳐라(조용히 다른 것을 재면 안 된다)."
            )
    return mod


def seeds_of(probe_ts: str) -> list[str]:
    """프로브가 실제로 도는 씨앗 — 보고에 찍어 «무엇을 쟀는지»가 남게 한다."""
    m = re.search(r"for \(const seed of \[([^\]]*)\]\)", probe_ts)
    return [t.strip() for t in m.group(1).split(",")] if m else []


def run_tests(mod, test_paths) -> tuple[int, list[str]]:
    """
    시험을 돌려 `(종료코드, 실패한 시험 이름들)` — **전량 하네스의 실행기를 그대로
    부른다.** 리포터 이름도, `test` 가 목록일 때 펴는 규칙도 저쪽 한 곳에만 있다.

    ⚠️ 여기에 따로 적으면 두 벌이 된다. 실제로 두 번 그랬다(씨앗 · 목록 펴기).
    """
    return mod.failed_tests(test_paths)


def probe(probe_ts: str, grade: str, sections: list[str]) -> str | None:
    ts = probe_ts.replace("__SECTIONS__", json.dumps(sections)).replace(
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
    mod = load_harness()
    targets = mod.TARGETS
    probe_ts = mod.PROBE_TS
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

    # ㉠ 음성 대조 — 변이 **전에** 그 시험이 초록인가. 아니면 판정을 거부한다.
    #    이게 없으면 러너가 못 뜨는 것만으로 **모든 변이가 빨강**이 된다.
    base_code, base_fails = run_tests(mod, t["test"])
    if base_code != 0 and (
        not base_fails or any(f.startswith(UNREADABLE) for f in base_fails)
    ):
        print("⛔ 기준 시험의 판정을 **못 읽었다** — 러너가 안 떴을 수 있다. 판정하지 않는다")
        return 3
    if base_code != 0:
        print(f"⛔ 기준 시험이 이미 빨갛다({len(base_fails)}건) — 판정하지 않는다")
        for f in base_fails[:8]:
            print("   ↳", f)
        return 3
    print("기준 시험: 초록 (음성 대조)")

    # 무엇을 쟀는지 남긴다 — 씨앗이 다르면 판정도 다르다
    print("씨앗:", " ".join(seeds_of(probe_ts)), "(하네스에서 읽음)")
    before = probe(probe_ts, t["grade"], t["sections"])
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
            after = probe(probe_ts, t["grade"], t["sections"])
            if after is None:
                verdict = "⛔ 변이 산출물을 못 얻었다 — 판정하지 않는다"
            elif after == before:
                verdict = "⛔ **산출물이 그대로다** — 판정하지 않는다(뜻이 안 바뀌었다)"
            else:
                # ⑷ 시험이 빨개지나
                code, fails = run_tests(mod, t["test"])
                if code != 0 and (
                    not fails or any(f.startswith(UNREADABLE) for f in fails)
                ):
                    # 빨간데 **어느 시험인지 못 대는** 상태 — 근거 없는 빨강이다.
                    # 옛 판이 정확히 이 모양으로 45개 변이를 전부 「RED」로 찍었다.
                    verdict = "⛔ 빨간데 실패한 시험을 못 댄다 — 러너가 안 떴다. 판정하지 않는다"
                else:
                    verdict = (
                        "RED   (가드가 문다)"
                        if code != 0
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
