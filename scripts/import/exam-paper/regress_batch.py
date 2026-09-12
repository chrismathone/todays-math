# -*- coding: utf-8 -*-
"""대량 이관 드라이버 회귀 — **이미 넣은 세 편이 바이트 그대로 다시 나오는가** (2026-09-13).

    python scripts/import/exam-paper/regress_batch.py --part a     # 4단계 이후(커밋된 중간물에서)
    python scripts/import/exam-paper/regress_batch.py --part b     # 0~3 단계(N드라이브 · HWP COM 을 돈다)
    python scripts/import/exam-paper/regress_batch.py --part mut   # 드라이버를 망가뜨려 회귀가 빨개지는지

## 왜 «바이트 그대로» 인가
동도중·강동중·경산여중 세 편은 메인이 **손으로** 0~5 단계를 이어 만든 것이고 그 산출물이 커밋돼 있다.
드라이버가 같은 입력에서 같은 바이트를 못 내면, 그 차이가 곧 **드라이버가 바꾼 것**이다.

## 어디서 «참»을 가져오나
작업 트리의 파일이 아니라 **git blob**(HEAD) 이다. 작업 트리는 autocrlf 로 CRLF 인데 커밋된 것은 LF 다 —
그래서 `git hash-object --path <저장소 경로>` 로 «이 파일을 커밋하면 나올 해시»를 구해 견준다.

## 무엇을 못 지키나 (정직하게)
- HWPX 중간물은 변환할 때마다 바이트가 달라진다(zip 시각) — answers.json 으로 견준다.
- 강동중은 손 고침(문15 ②)이 exam.json 에 **사람이 적은 것**이라, 빈 설정에서 도는 b부에서는
  7r(잔재)에서 멈추는 것이 **옳은 동작**이다. 그 뒤 hand 를 넣고 다시 돌려 바이트를 견준다.
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
EXAMS = HERE / "exams"
IDS = ["2025-dongdo-3-2-mid", "2025-gangdong-3-2-mid", "2025-gyeongsanyeo-3-2-mid"]
OLD_BLIND = pathlib.Path(r"C:\Users\user\AppData\Local\Temp\claude\D--todays-math"
                         r"\5013f6aa-4795-4e1c-950b-5f6ca7aa5266\scratchpad\blind")
SOURCE_ROOT = pathlib.Path("N:/개인/기출")
# 4단계 이후가 다시 만들어 내야 하는 것들(0~3 은 b부에서 더 본다)
OUT_4 = ["pieces_in.json", "sol_in.json", "pieces_conv.json", "sol_conv.json",
         "hwp_fixed.json", "sol_fixed.json", "drafts.json", "figures/index.json"]
OUT_03 = ["source_path.txt", "answers.json", "body.json"]
# 지난번 문제지와 **달라야 옳은** 자리 — 까닭을 적어 둔다(안 적힌 차이는 빨강이다).
EXPECTED_SHEET_DIFF = {
    ("2025-gangdong-3-2-mid", 15): "그 뒤 손 고침 15-c2 가 들어갔다 — 지난번 문제지가 고침 전 글이다",
}


def sh(cmd: list[str], cwd=REPO) -> subprocess.CompletedProcess:
    env = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONUTF8="1")
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace",
                          cwd=cwd, env=env)


def committed(rel: str) -> str:
    return sh(["git", "rev-parse", f"HEAD:{rel}"]).stdout.strip()


def would_commit(rel: str, path: pathlib.Path) -> str:
    return sh(["git", "hash-object", "--path", rel, str(path)]).stdout.strip()


def compare(exam_id: str, work: pathlib.Path, names: list[str]) -> list[str]:
    """돌아온 파일이 커밋된 것과 **같은 바이트로 커밋될** 것인가."""
    bad = []
    for name in names:
        rel = f"scripts/import/exam-paper/exams/{exam_id}/{name}"
        got = work / exam_id / name
        if not got.exists():
            bad.append(f"{name}: 안 나왔다")
        elif would_commit(rel, got) != committed(rel):
            bad.append(f"{name}: 바이트가 다르다")
    return bad


def compare_figures(exam_id: str, work: pathlib.Path) -> list[str]:
    base = EXAMS / exam_id / "figures"
    bad = []
    for f in sorted(base.glob("*.png")):
        rel = f"scripts/import/exam-paper/exams/{exam_id}/figures/{f.name}"
        got = work / exam_id / "figures" / f.name
        if not got.exists():
            bad.append(f"figures/{f.name}: 안 나왔다")
        elif would_commit(rel, got) != committed(rel):
            bad.append(f"figures/{f.name}: 바이트가 다르다")
    extra = sorted(p.name for p in (work / exam_id / "figures").glob("*.png")
                   if not (base / p.name).exists())
    if extra:
        bad.append(f"없던 그림이 생겼다 {extra}")
    return bad


def compare_sheet(exam_id: str, blind: pathlib.Path) -> list[str]:
    """지난번 풀이자 문제지와 견준다 — 번호·발문·그림 이름."""
    old_p = OLD_BLIND / exam_id / "problems.json"
    new_p = blind / exam_id / "problems.json"
    if not old_p.exists():
        return [f"문제지: 지난번 것이 없다({old_p}) — 미검"]
    if not new_p.exists():
        return ["문제지가 안 나왔다(앞 단계에서 멈췄다)"]
    old = json.loads(old_p.read_text(encoding="utf-8"))
    new = json.loads(new_p.read_text(encoding="utf-8"))
    bad = []
    if [x["n"] for x in old] != [x["n"] for x in new]:
        bad.append(f"문제지 번호가 다르다 {[x['n'] for x in old]} ≠ {[x['n'] for x in new]}")
    drafts = {d["questionNumber"]: d for d in
              json.loads((EXAMS / exam_id / "drafts.json").read_text(encoding="utf-8"))}
    for o, x in zip(old, new):
        # 참은 **커밋된 초안**이다. 지난번 문제지는 손 고침 전 글일 수 있다(강동중 문15).
        if x["content"] != drafts[x["n"]]["content"]:
            bad.append(f"문{x['n']} 발문이 커밋된 초안과 다르다")
        if o["content"] != x["content"]:
            why = EXPECTED_SHEET_DIFF.get((exam_id, o["n"]))
            if why:
                print(f"     (설명됨) 문{o['n']} 은 지난번 문제지와 다르다 — {why}")
            else:
                bad.append(f"문{o['n']} 발문이 지난번 문제지와 다르다")
        if [pathlib.Path(f).name for f in o["figures"]] != [pathlib.Path(f).name for f in x["figures"]]:
            bad.append(f"문{o['n']} 그림 목록이 다르다")
        if not pathlib.Path(x["figures"][0]).exists() if x["figures"] else False:
            bad.append(f"문{o['n']} 그림이 문제지 폴더에 복사되지 않았다")
        if set(x) != {"n", "content", "figures", "out"}:
            bad.append(f"문{o['n']} 문제지에 없어야 할 칸 {sorted(set(x) - {'n', 'content', 'figures', 'out'})}")
    return bad


def seed_from_commit(work: pathlib.Path, names: list[str]) -> None:
    """커밋된 중간물로 작업 폴더를 세운다(0~3 산출물 + 설정)."""
    for exam_id in IDS:
        d = work / exam_id
        (d / "figures").mkdir(parents=True, exist_ok=True)
        for name in names:
            shutil.copyfile(EXAMS / exam_id / name, d / name)
        for f in (EXAMS / exam_id / "figures").iterdir():
            shutil.copyfile(f, d / "figures" / f.name)


def driver(work: pathlib.Path, blind: pathlib.Path, *args: str) -> subprocess.CompletedProcess:
    cmd = [sys.executable, str(HERE / "batch_import.py"), "--exam-dir",
           *[str(work / i) for i in IDS], "--blind-root", str(blind), *args]
    r = sh(cmd)
    print(r.stdout.strip())
    if r.stderr.strip():
        print("[stderr]", r.stderr.strip()[:2000])
    return r


def part_a(work: pathlib.Path) -> int:
    """4단계 이후 — 커밋된 중간물에서 다시 돌려 바이트를 견준다."""
    work = work / "a"
    shutil.rmtree(work, ignore_errors=True)
    blind = work.parent / "a-blind"
    shutil.rmtree(blind, ignore_errors=True)
    seed_from_commit(work, ["exam.json", "answers.json", "body.json", "source_path.txt"])
    bad = 0
    print("── ⑴ 절반 계획 — 뒤 절반은 문제지를 안 낸다")
    r = driver(work, blind, "--from", "4")
    if "뒤 절반" not in r.stdout:
        print("🔴 뒤 절반을 막는 줄이 없다")
        bad += 1
    print("── ⑵ 바이트 대조")
    for exam_id in IDS:
        issues = compare(exam_id, work, OUT_4) + compare_figures(exam_id, work)
        print(f"   {exam_id}: {'같다' if not issues else '🔴 ' + ' · '.join(issues)}")
        bad += len(issues)
    print("── ⑶ 풀이자 문제지")
    r = driver(work, blind, "--from", "4", "--reviewed")
    for exam_id in IDS:
        issues = compare_sheet(exam_id, blind)
        print(f"   {exam_id}: {'같다' if not issues else '🔴 ' + ' · '.join(issues)}")
        bad += len([i for i in issues if "미검" not in i])
    print("── ⑷ 채점 — 지난번 채택 해설을 풀이자 답으로 넣는다")
    for exam_id in IDS:
        for src in sorted((EXAMS / exam_id / "sol_ai").glob("q*.json")):
            dst = blind / exam_id / "out" / src.name
            if dst.parent.exists():
                shutil.copyfile(src, dst)
        shutil.rmtree(work / exam_id / "sol_ai", ignore_errors=True)
    r = driver(work, blind, "--from", "4", "--reviewed")
    for exam_id in IDS:
        f = work / exam_id / "solve-flags.json"
        if not f.exists():
            print(f"   🔴 {exam_id}: 채점 결과가 없다")
            bad += 1
            continue
        j = json.loads(f.read_text(encoding="utf-8"))
        print(f"   {exam_id}: 통과 {len(j['passed'])} · 걸림 {len(j['flags'])} · 경고 {len(j.get('warnings', []))}"
              + (f" · {[x['n'] for x in j['flags']]}" if j["flags"] else ""))
        bad += len(j["flags"]) + len(j["missing"])
    if "절반 지점" not in r.stdout and not any(
            (work / i / "solve-flags.json").exists() for i in IDS):
        print("🔴 절반 지점 줄이 없다")
        bad += 1
    print(f"\na부 결론: {'초록' if bad == 0 else f'🔴 어긋남 {bad}건'}")
    return bad


def part_b(work: pathlib.Path) -> int:
    """0~3 단계 — N드라이브 원본에서 (HWP COM 을 돈다. 창이 뜨면 드라이버가 스스로 멈춘다)."""
    work = work / "b"
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir(parents=True)
    blind = work.parent / "b-blind"
    shutil.rmtree(blind, ignore_errors=True)
    pdfs = [str(SOURCE_ROOT / (EXAMS / i / "source_path.txt").read_text(encoding="utf-8").strip())
            for i in IDS]
    cmd = [sys.executable, str(HERE / "batch_import.py"), "--pdf", *pdfs,
           "--exams-dir", str(work), "--blind-root", str(blind), "--source-root", str(SOURCE_ROOT)]
    r = sh(cmd)
    print(r.stdout.strip())
    if r.stderr.strip():
        print("[stderr]", r.stderr.strip()[:2000])
    bad = 0
    for exam_id in IDS:
        names = OUT_03 + (OUT_4 if exam_id != "2025-gangdong-3-2-mid" else
                          [n for n in OUT_4 if n not in ("hwp_fixed.json", "drafts.json")])
        issues = compare(exam_id, work, names) + compare_figures(exam_id, work)
        print(f"   {exam_id}: {'같다' if not issues else '🔴 ' + ' · '.join(issues)}")
        bad += len(issues)
    print("── 강동중: 사람이 적은 손 고침(문15 ②)을 넣고 다시 — 그러면 바이트가 같아야 한다")
    gd = work / "2025-gangdong-3-2-mid"
    if gd.exists():
        cfg = json.loads((gd / "exam.json").read_text(encoding="utf-8"))
        cfg["hand"] = json.loads((EXAMS / "2025-gangdong-3-2-mid" / "exam.json").read_text(encoding="utf-8"))["hand"]
        (gd / "exam.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        r = sh([sys.executable, str(HERE / "batch_import.py"), "--exam-dir", str(gd),
                "--blind-root", str(blind), "--reviewed"])
        print(r.stdout.strip()[-600:])
        issues = compare("2025-gangdong-3-2-mid", work, OUT_03 + OUT_4)
        print(f"   2025-gangdong-3-2-mid: {'같다' if not issues else '🔴 ' + ' · '.join(issues)}")
        bad += len(issues)
    print(f"\nb부 결론: {'초록' if bad == 0 else f'🔴 어긋남 {bad}건'}")
    return bad


MUTATIONS = [
    ("batch_import.py", '    Stage("5", "잔재 고침", st_fix,', '    _SKIP = Stage("5", "잔재 고침", st_fix,',
     "5단계(잔재 고침)를 단계 표에서 뺀다"),
    ("scan_residue.py", '    ("빈 분자", re.compile(r"\\\\frac\\s*\\{\\s*\\}"),',
     '    ("빈 분자", re.compile(r"(?!)"),', "잔재 규칙 «빈 분자» 를 끈다"),
    ("grade_solutions.py", "            elif got != want:", "            elif False:",
     "채점의 «기록된 정답과 일치» 를 끈다"),
]


def part_mut(work: pathlib.Path) -> int:
    """드라이버를 망가뜨려 회귀가 **빨개지는지** 본다. 미커밋 파일을 먹지 않게 깨끗한 것만 건드린다."""
    dirty = sh(["git", "status", "--porcelain", "--", "scripts/import/exam-paper"]).stdout.strip()
    if dirty:
        print("🔴 exam-paper 에 커밋 안 된 것이 있다 — 되돌리기가 그것을 먹는다. 먼저 커밋하라:\n" + dirty)
        return 1
    bad = 0
    for name, old, new, why in MUTATIONS:
        p = HERE / name
        before = p.read_bytes()
        s = p.read_text(encoding="utf-8")
        if s.count(old) != 1:
            print(f"🔴 변이 앵커가 {s.count(old)}개 — {why}")
            bad += 1
            continue
        p.write_text(s.replace(old, new), encoding="utf-8", newline="\n")
        if p.read_bytes() == before:
            print(f"🔴 변이가 파일을 안 바꿨다 — {why}")
            bad += 1
        try:
            n = part_a(work)
            print(f"[변이] {why} → 회귀 {'🔴 초록(가드가 아니다)' if n == 0 else f'빨강 {n}건 — 좋다'}")
            if n == 0:
                bad += 1
        finally:
            sh(["git", "checkout", "--", f"scripts/import/exam-paper/{name}"])
            if p.read_bytes() != before:
                print(f"🔴 되돌리기가 안 됐다 — {name}")
                bad += 1
    print(f"\n변이 결론: {'초록(변이마다 회귀가 빨개졌다)' if bad == 0 else f'🔴 {bad}건'}")
    return bad


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--part", choices=["a", "b", "mut"], required=True)
    ap.add_argument("--work", default=str(pathlib.Path(os.environ.get("TEMP", ".")) / "exam-batch-regress"))
    a = ap.parse_args()
    work = pathlib.Path(a.work)
    work.mkdir(parents=True, exist_ok=True)
    return {"a": part_a, "b": part_b, "mut": part_mut}[a.part](work)


if __name__ == "__main__":
    sys.exit(main())
