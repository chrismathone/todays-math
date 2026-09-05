# -*- coding: utf-8 -*-
"""기출 2단 단 나눔(`packColumns`)의 **변이 시험** — 「가드는 망가뜨려 봐야 가드인 줄 안다」.

    python scripts/qa/mutate-pack-columns.py          # 전량
    python scripts/qa/mutate-pack-columns.py 첫 장     # 이름 조각으로 하나만

판정 순서는 이 저장소의 규약 그대로다 (CLAUDE.md 2026-08-20 · 08-21 · 08-23):

  ㉠ **음성 대조** — 변이를 넣기 **전에** 시험이 초록인가. 아니면 판정 거부.
  ⑴ 앵커가 정확히 하나인가 — 아니면 판정 거부
  ⑵ **파일이 바뀌었나** — 안 바뀌면 치환이 헛돈 것이다
  ⑶ **산출물이 바뀌었나** — 파일이 바뀌어도 뜻이 안 바뀌면 «가드가 아니다»가 거짓말이 된다
  ⑷ 그제서야 시험이 빨개지나

⑶ 의 산출물은 **규칙을 실제로 돌려** 앉은 자리를 찍은 것이다(텍스트 검사가 아니다).
표본은 시험 픽스처보다 **넓게** 잡는다 — 좁으면 변이가 산출물을 못 바꿔 «거부»가 나고,
다음 사람은 「내 가드가 장식인가」로 읽고 멀쩡한 가드를 고치러 간다(2026-08-25).

원복은 **바이트**로 한다(시작할 때 읽어 둔 그대로). `git show HEAD:` 로 되돌리면
커밋 안 된 수정을 통째로 먹는다(2026-08-23).
"""
from __future__ import annotations

import io
import json
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

RULE = "src/lib/print/packColumns.ts"
TESTS = ["src/__tests__/unit/packColumns.test.ts"]

# 산출물 프로브 — 규칙을 **돌려서** 앉은 자리를 찍는다.
# 표본은 시험보다 넓다: 첫 장/이어지는 장 차이 · 딱 맞는 간격 · 단보다 큰 문항 ·
# 다음 장에서 들어가게 되는 문항 · 3단 — 변이가 건드릴 자리를 전부 지나게 한다.
PROBE = r"""
import { packColumns } from "../../src/lib/print/packColumns";

const G = {
  firstPageColumnPx: 800,
  continuationColumnPx: 1000,
  columnsPerPage: 2,
  gapPx: 20,
};
const item = (id: string, px: number) => ({ id, px });
const h = (i: { px: number }) => i.px;

const CASES: Array<[string, Array<{ id: string; px: number }>, typeof G]> = [
  ["빈", [], G],
  ["한단", [item("a", 300), item("b", 300)], G],
  ["딱맞음", [item("a", 390), item("b", 390)], G],
  ["여백", [item("a", 400), item("b", 400)], G],
  ["첫장좁음", [item("큰", 900), item("작", 50)], G],
  ["넘김", [item("a", 500), item("b", 500), item("c", 500)], G],
  [
    "장경계",
    [item("a", 700), item("b", 700), item("c", 900), item("d", 50)],
    G,
  ],
  ["큰문항", [item("a", 300), item("X", 4000), item("b", 300)], G],
  [
    "긴줄",
    Array.from({ length: 24 }, (_, i) => item("q" + (i + 1), 120 + ((i * 137) % 700))),
    G,
  ],
  ["3단", [item("a", 500), item("b", 500), item("c", 500)], { ...G, columnsPerPage: 3 }],
];

for (const [name, items, geom] of CASES) {
  const r = packColumns(items, h, geom);
  const shape = r.pages
    .map((p) => p.columns.map((c) => c.map((i) => i.id).join(",")).join("|"))
    .join(" / ");
  console.log(`${name}: [${shape}] tooTall=${r.tooTall.map((i) => i.id).join(",")}`);
}
"""
PROBE_PATH = os.path.join(ROOT, "scripts", "qa", f".mutate-pack.probe.{os.getpid()}.ts")


def read(path: str) -> bytes:
    with open(os.path.join(ROOT, path), "rb") as f:
        return f.read()


def write(path: str, data: bytes) -> None:
    with open(os.path.join(ROOT, path), "wb") as f:
        f.write(data)


def probe_rule() -> str:
    r = subprocess.run(
        ["npx", "tsx", PROBE_PATH], cwd=ROOT, capture_output=True, text=True,
        encoding="utf-8", errors="replace", shell=(os.name == "nt"),
    )
    return r.stdout.strip() or f"(프로브 실패) {r.stderr.strip()[:200]}"


MUTATIONS = [
    {
        "name": "첫 장 단 높이를 이어지는 장과 하나로 뭉갠다",
        "old": "    pages.length === 0 ? firstPageColumnPx : continuationColumnPx;",
        "new": "    continuationColumnPx;",
    },
    {
        "name": "문항 사이 여백을 안 센다 (겹쳐 찍힌다)",
        "old": "    if (used > 0 && used + gapPx + px > columnPx()) nextColumn();",
        "new": "    if (used > 0 && used + px > columnPx()) nextColumn();",
    },
    {
        "name": "마지막 문항 뒤에도 여백을 센다 (단마다 한 문항씩 빈다)",
        "old": "    used = used === 0 ? px : used + gapPx + px;",
        "new": "    used = used + gapPx + px;",
    },
    {
        "name": "단보다 큰 문항을 알리지 않는다 (조용히 겹쳐 나간다)",
        "old": "    if (px > columnPx()) tooTall.push(item);",
        "new": "",
    },
    {
        # 「옆에 아무도 안 앉는다」는 이제 `nextColumn()` 이 아니라 **산술**이 지킨다
        # (그 줄은 죽은 줄이라 지웠다). 그 산술을 깨는 변이로 성질을 시험한다.
        "name": "단보다 큰 문항이 먹은 세로를 깎는다 (옆에 문항이 앉는다)",
        "old": "    used = used === 0 ? px : used + gapPx + px;",
        "new": "    used = used === 0 ? Math.min(px, columnPx() / 2) : used + gapPx + px;",
    },
    {
        # 옛 결함의 실제 모양 — 「혼자 써야 하나」의 기준이 **옮기기 전** 단이면,
        # 이어지는 장에서는 들어가는 문항이 `tooTall` 로 새고 옆자리가 빈다.
        "name": "「혼자 써야 하나」를 옮기기 전 단으로 굳힌다 (옛 결함)",
        "old": "    if (px > columnPx()) tooTall.push(item);",
        "new": "    if (px > firstPageColumnPx) tooTall.push(item);",
    },
    {
        "name": "마지막 장을 안 내보낸다 (문항이 조용히 사라진다)",
        "old": "  if (columns.some((col) => col.length > 0)) pages.push({ columns });",
        "new": "  if (false) pages.push({ columns });",
    },
    {
        "name": "단 수를 2로 박는다 (기하를 안 본다)",
        "old": "    Array.from({ length: Math.max(1, columnsPerPage) }, () => []);",
        "new": "    Array.from({ length: 2 }, () => []);",
    },
    {
        "name": "읽기 순서를 뒤집는다",
        "old": "  for (const item of items) {",
        "new": "  for (const item of [...items].reverse()) {",
    },
]


def run_tests() -> tuple[int, list[str]]:
    """`(종료코드, 실패한 시험 이름들)`. 빨간데 이름을 못 대면 **판정을 거부**한다."""
    out = os.path.join(ROOT, f".mutate-pack.result.{os.getpid()}.json")
    r = subprocess.run(
        ["npx", "vitest", "run", *TESTS, "--reporter=json", f"--outputFile={out}"],
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8",
        errors="replace", shell=(os.name == "nt"),
    )
    failed: list[str] = []
    try:
        with io.open(out, encoding="utf-8") as f:
            data = json.load(f)
        for suite in data.get("testResults", []):
            for t in suite.get("assertionResults", []):
                if t.get("status") == "failed":
                    failed.append(t.get("fullName") or t.get("title") or "?")
    except Exception:
        failed = ["(판정 결과를 못 읽었다 — 러너가 안 떴을 수 있다)"]
    finally:
        if os.path.exists(out):
            os.remove(out)
    return r.returncode, failed


def main() -> int:
    pick = sys.argv[1] if len(sys.argv) > 1 else None
    chosen = [m for m in MUTATIONS if not pick or pick in m["name"]]
    if not chosen:
        print(f"이름 조각 «{pick}» 에 맞는 변이가 없다")
        return 2

    with io.open(PROBE_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write(PROBE)

    before = read(RULE)
    try:
        # ㉠ 음성 대조 — 지금이 초록이 아니면 무엇을 재도 뜻이 없다.
        code, failed = run_tests()
        if code != 0:
            print(f"⛔ 기준 시험이 이미 빨갛다 — 판정을 거부한다. {failed[:3]}")
            return 1
        base = probe_rule()
        if base.startswith("(프로브 실패)"):
            print(f"⛔ 기준 프로브가 안 돈다 — 판정을 거부한다.\n   {base}")
            return 1
        print("㉠ 음성 대조 통과 (기준 초록)\n")

        verdicts = []
        crlf = b"\r\n" in before
        text = before.decode("utf-8")
        for m in chosen:
            old = m["old"].replace("\n", "\r\n") if crlf else m["old"]
            new = m["new"].replace("\n", "\r\n") if crlf else m["new"]
            hits = text.count(old)
            if hits != 1:
                print(f"⛔ {m['name']}: 앵커가 {hits}개 — 판정 거부")
                verdicts.append((m["name"], "거부(앵커)"))
                continue
            write(RULE, text.replace(old, new).encode("utf-8"))
            try:
                if read(RULE) == before:
                    print(f"⛔ {m['name']}: 파일이 그대로 — 판정 거부")
                    verdicts.append((m["name"], "거부(파일)"))
                    continue
                after = probe_rule()
                if after == base:
                    print(f"⛔ {m['name']}: 산출물이 그대로 — 판정 거부\n     {after[:160]}")
                    verdicts.append((m["name"], "거부(산출물)"))
                    continue
                code, failed = run_tests()
                if code == 0:
                    print(f"🟢 {m['name']}\n     ← 초록이다. 이 자리를 지키는 가드가 없다.")
                    verdicts.append((m["name"], "초록(가드 없음)"))
                elif not failed or failed[0].startswith("(판정 결과를 못 읽었다"):
                    print(f"⛔ {m['name']}: 빨간데 실패한 시험을 못 댄다 — 판정 거부")
                    verdicts.append((m["name"], "거부(근거 없음)"))
                else:
                    extra = f"  (외 {len(failed) - 1}건)" if len(failed) > 1 else ""
                    print(f"🔴 {m['name']}\n     ↳ {failed[0]}{extra}")
                    verdicts.append((m["name"], f"빨강({len(failed)}건)"))
            finally:
                write(RULE, before)  # 원복은 **읽어 둔 바이트**로
        print("\n── 판정 ──")
        for name, v in verdicts:
            print(f"  {v:<16} {name}")
        return 0 if all(v.startswith("빨강") for _, v in verdicts) else 1
    finally:
        write(RULE, before)
        if os.path.exists(PROBE_PATH):
            os.remove(PROBE_PATH)


if __name__ == "__main__":
    raise SystemExit(main())
