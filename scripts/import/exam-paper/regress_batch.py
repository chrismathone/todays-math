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


def negative_residue(work: pathlib.Path, blind: pathlib.Path) -> list[str]:
    """7r 잔재 훑기가 **빈 분자를 잡는가** — 규칙이 못 고치는 꼴을 일부러 심어 본다.

    처음엔 «손 고침을 빼면 7r 이 멈춘다» 로 쟀다. 2026-09-13 고침기에 `bar-empty-numerator` 규칙이
    들어가 강동중 15-c2 를 규칙이 **스스로** 고치게 되자, 손 고침을 빼도 잔재가 안 남아 이 대조는
    **더는 실패할 수 없게** 됐다(20번 2026-08-21 「변이가 동작을 안 바꾸면 "가드가 아니다"가 거짓말이 된다」).
    그래서 전제를 바꿨다: 음성 사본에 **바가 아닌 것 뒤의 빈 분자** `3\\frac{}{…}` 를 손 고침으로 심는다.
    분자가 어디까지인지 모양으로 못 정해 규칙이 **일부러 안 건드리는** 꼴이고, KaTeX 는 그려 주므로
    5단계를 지나 초안까지 간다 — 거기서 7r 이 «빈 분자» 로 멈춰야 한다.
    """
    exam_id = "2025-gangdong-3-2-mid"
    d = work.parent / "neg" / exam_id
    shutil.rmtree(d.parent, ignore_errors=True)
    (d / "figures").mkdir(parents=True)
    for name in ["exam.json", "answers.json", "body.json", "source_path.txt"]:
        shutil.copyfile(EXAMS / exam_id / name, d / name)
    for f in (EXAMS / exam_id / "figures").iterdir():
        shutil.copyfile(f, d / "figures" / f.name)
    cfg = json.loads((d / "exam.json").read_text(encoding="utf-8"))
    # 15-c2 는 규칙이 이미 `\frac{\overline{AB}}{\overline{OB}}` 로 고친다 — 그 분자를 «3» 으로 바꿔
    # 바가 아닌 것 뒤의 빈 분자를 심는다(규칙이 모양만으로는 못 고치는 꼴).
    cfg["hand"] = [{
        "id": "15-c2",
        "why": "음성 대조 — 규칙이 못 고치는 빈 분자를 심는다",
        "from": "\\frac{\\overline{AB}}{\\overline{OB}}",
        "to": "3\\frac{}{\\overline{OB}}",
    }]
    (d / "exam.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    r = sh([sys.executable, str(HERE / "batch_import.py"), "--exam-dir", str(d),
            "--blind-root", str(blind / "neg"), "--from", "4", "--reviewed"])
    line = next((ln for ln in r.stdout.splitlines() if exam_id in ln), "(줄 없음)")
    if "7r" in line and "잔재" in line and "빈 분자" in line:
        return []
    return [f"빈 분자를 심었는데 7r 이 안 멈췄다 — «{line.strip()[:110]}»"]


def negative_grade(work: pathlib.Path, blind: pathlib.Path) -> list[str]:
    """틀린 답 + 과정 밖 해설은 걸리고, sol_ai 에 안 실려야 한다."""
    exam_id, n = "2025-dongdo-3-2-mid", 2
    p = blind / exam_id / "out" / f"q{n:02d}.json"
    if not p.exists():
        return ["풀이 파일이 없다(앞 단계에서 멈췄다) — 음성 대조를 못 했다"]
    keep = p.read_text(encoding="utf-8")
    orig = json.loads(keep)
    wrong = "①" if orig.get("answer") != "①" else "②"
    p.write_text(json.dumps({"answer": wrong,
                             "solution": "코사인 법칙을 쓰면 나머지 변이 나온다.\n"
                                         "그 값을 넣어 계산한다.\n"
                                         f"따라서 답은 {wrong}이다."}, ensure_ascii=False), encoding="utf-8")
    try:
        sh([sys.executable, str(HERE / "batch_import.py"), "--exam-dir", str(work / exam_id),
            "--blind-root", str(blind), "--from", "4", "--reviewed"])
        flags = json.loads((work / exam_id / "solve-flags.json").read_text(encoding="utf-8"))
        got = [f for f in flags["flags"] if f["n"] == n]
        bad = []
        if not got:
            bad.append("틀린 답이 안 걸렸다")
        else:
            why = " ".join(got[0]["why"])
            if "불일치" not in why:
                bad.append(f"«불일치»로 안 걸렸다 — {why[:60]}")
            if "과정 밖" not in why:
                bad.append(f"«과정 밖 방법»으로 안 걸렸다 — {why[:60]}")
        if (work / exam_id / "sol_ai" / f"q{n:02d}.json").exists():
            bad.append("걸린 해설이 sol_ai 에 남았다")
        return bad
    finally:
        p.write_text(keep, encoding="utf-8")


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
    print("── ⑸ 음성 대조 — 손 고침을 빼면 잔재로 멈춰야 한다")
    issues = negative_residue(work, blind)
    print("   " + ("멈춘다(좋다)" if not issues else "🔴 " + " · ".join(issues)))
    bad += len(issues)
    print("── ⑹ 음성 대조 — 틀린 답·과정 밖 해설은 걸려야 한다")
    issues = negative_grade(work, blind)
    print("   " + ("걸린다(좋다)" if not issues else "🔴 " + " · ".join(issues)))
    bad += len(issues)
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
        # 첫 판은 **0~3 단계**만 견준다(사람 결정이 아직 없어 4단계 이후는 멈추는 것이 옳다).
        issues = compare(exam_id, work, OUT_03)
        print(f"   {exam_id}: {'같다' if not issues else '🔴 ' + ' · '.join(issues)}")
        bad += len(issues)
    print("── 사람이 정한 것(hand · acceptFix)을 넣고 다시 — 그때 4단계 이후도 바이트가 같아야 한다")
    # 새로 세운 편의 exam.json 에는 사람 결정이 없다. 동도중은 5단계(남은 결함), 강동중은 7r(빈 분자)에서
    # 멈추는 것이 **옳은 동작**이다 — 그것을 넣어 주고 나서 견준다.
    dirs = []
    for exam_id in IDS:
        d = work / exam_id
        if not d.exists():
            continue
        cfg = json.loads((d / "exam.json").read_text(encoding="utf-8"))
        want = json.loads((EXAMS / exam_id / "exam.json").read_text(encoding="utf-8"))
        for key in ("hand", "acceptFix"):
            if want.get(key):
                cfg[key] = want[key]
        (d / "exam.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        dirs.append(str(d))
    if dirs:
        r = sh([sys.executable, str(HERE / "batch_import.py"), "--exam-dir", *dirs,
                "--blind-root", str(blind), "--from", "4", "--reviewed"])
        print(r.stdout.strip()[-900:])
        for exam_id in IDS:
            issues = compare(exam_id, work, OUT_03 + OUT_4) + compare_figures(exam_id, work)
            print(f"   {exam_id}: {'같다' if not issues else '🔴 ' + ' · '.join(issues)}")
            bad += len(issues)
    print(f"\nb부 결론: {'초록' if bad == 0 else f'🔴 어긋남 {bad}건'}")
    return bad


MUTATIONS = [
    ("batch_import.py", '    Stage("5", "잔재 고침", st_fix,', '    Stage("5", "잔재 고침", lambda ex: None,',
     "5단계(잔재 고침)를 빈 일로 만든다"),
    ("scan_residue.py", r'("빈 분자", re.compile(r"\\frac\s*\{\s*\}")', r'("빈 분자", re.compile(r"(?!x)x")',
     "잔재 규칙 «빈 분자» 를 끈다"),
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
            try:
                n = part_a(work)
            except Exception as e:  # noqa: BLE001 — 변이가 하네스를 죽여도 그건 «빨강»이다
                print(f"   (회귀가 예외로 죽었다: {type(e).__name__} {str(e)[:80]})")
                n = 99
            print(f"[변이] {why} → 회귀 {'🔴 초록(가드가 아니다)' if n == 0 else f'빨강 {n}건 — 좋다'}")
            if n == 0:
                bad += 1
        finally:
            sh(["git", "checkout", "--", f"scripts/import/exam-paper/{name}"])
            # ⚠️ 바이트로 견주면 안 된다 — autocrlf 가 되돌릴 때 줄끝을 CRLF 로 쓴다.
            #    «되돌아왔나»는 git 이 그 파일을 깨끗하다고 보는가로 묻는다.
            if sh(["git", "status", "--porcelain", "--",
                   f"scripts/import/exam-paper/{name}"]).stdout.strip():
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
