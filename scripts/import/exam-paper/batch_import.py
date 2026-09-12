# -*- coding: utf-8 -*-
"""기출 편 **여러 개를 한 번에** — 0~9 단계를 한 명령으로 (2026-09-13).

    python scripts/import/exam-paper/batch_import.py --folder "N:/개인/기출/2025 기출모음/2025년 2학기 중간고사 모음" --grade 중3
    python scripts/import/exam-paper/batch_import.py --pdf <완료본.PDF> [<완료본.PDF> …]
    python scripts/import/exam-paper/batch_import.py --exam-dir <편 폴더> [--from 4]   # 이미 세운 편을 이어 돈다
    python scripts/import/exam-paper/batch_import.py --folder … --grade 중3 --list      # 계획만 찍는다

## 왜
지난 3편(동도중·강동중·경산여중)은 0~5 단계를 메인이 명령 116번으로 손으로 이었고, 그 대화의
토큰 절반이 «긴 문맥을 호출마다 다시 읽는 값»이었다. 남은 약 48편은 **정상 경로에서 모델 토큰 0**
으로 돈다. 모델은 예외(⏸ 편)와 분류(소단원·문항류 → exam.json units)와 풀이(grok CLI)만 본다.

## 단계 (편마다 `exams/<examId>/`)
    0  원본 복사       `(완료)` PDF ↔ 같은 이름 HWP 짝만(D-37) → src/paper.pdf · src/answers.hwp
    1  HWP→HWPX       scripts/qa/hwp_to_hwpx_quiet.py — **숨은 데스크톱 · 한 번에 하나**(절대 규칙 9)
    1x HWP 추출       hwp_extract.parse_exam → answers.json
    2  PDF 텍스트층    textlayer.extract → body.json
    3  그림           figures/extract_source_figures.py → figures/
    4  수식           answers → pieces_in·sol_in → convert-hwp-spans.py → pieces_conv·sol_conv
    5  잔재 고침       fix-exam-solutions.ts (exam.json hand) → hwp_fixed·sol_fixed
    3t 표             build-exam-drafts.ts --propose-tables → exam.json tables → figures/crop_tables.py
    7  초안           build-exam-drafts.ts → drafts.json
    7r 잔재 훑기       scan_residue.py (빈 분자·빈 분모·사적 사용 영역·빈 \\mathrm{}·$ 홀수)
    8  풀이자 문제지    HWP 해설 없는 객관식만 — 정답·해설 빼고, 그림은 문제지 폴더로 **복사**, 지시서 동봉
    8g 풀이 채점       grade_solutions.py — 통과만 sol_ai/ 로, 걸린 것은 solve-flags.json
    9  분류용 표       classify.md (번호 · 형식 · HWP 소단원 · 그림/표 · 발문 첫 두 줄)
    (6 units 와 적재는 사람·메인이 한다. **공유 DB 에는 절대 안 쓴다.**)

## 재개 — «어디까지 했나»는 파일에 있다 (20번 문서 2026-08-16 · 2026-08-21)
- 단계마다 입력의 지문(fingerprint)을 `batch-state.json` 에 적는다. 지문이 같고 산출물이 있으면
  건너뛴다. 한 단계가 **다시 돌면 그 뒤 단계의 기록은 전부 지운다**(3 이 다시 돌면 표 오림이 사라진다).
- 실패는 시도 횟수를 적고 **3회에 포기**한다. 성공하면 표시를 지운다. 포기 수는 최종 줄에 찍는다.
- «사람이 정할 것»(표 확신 없음 · 잔재 · 빌더의 [중단])은 실패가 아니라 **보류**다 — 횟수를 안 센다.
  사람이 exam.json 을 고치면 지문이 바뀌어 그 단계부터 다시 돈다.
- 🔴 실패한 단계의 산출물은 «끝났다»로 안 읽는다 — 빌더는 금지 검사에 걸려도 drafts.json 을 **쓰고**
  멈춘다. 그래서 그 파일은 `drafts.json.hold` 로 치운다.

## 화면
편마다 한 줄(✅ / ⏸ 단계·사유 / — 건너뜀). 자세한 것은 `exams/<examId>/batch.log`,
이번 실행의 줄 전부는 `exams/.batch-last-run.txt`.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import time
import unicodedata

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[2]
QA = REPO / "scripts" / "qa"
# `.bin/tsx.cmd` 는 한글 경로를 셸로 넘겨야 한다 — node 로 cli.mjs 를 직접 부른다.
TSX = ["node", str(REPO / "node_modules" / "tsx" / "dist" / "cli.mjs")]
DEFAULT_SOURCE_ROOT = pathlib.Path("N:/개인/기출")
MAX_ATTEMPTS = 3
HWPX_TIMEOUT = 240
CHILD_TIMEOUT = 900
LOG_CAP = 20000

sys.path.insert(0, str(QA))
sys.path.insert(0, str(HERE))


# ── 결과 ─────────────────────────────────────────────────────────────────────
class Hold(Exception):
    """사람이 정할 것 — 횟수를 안 센다."""


class Fail(Exception):
    """일시 오류일 수 있다 — 횟수를 세고 3회에 포기한다."""


class Abort(Exception):
    """배치 전체를 멈춘다 — 창이 떴거나 포커스를 뺏었다(절대 규칙 9)."""


# ── 학교 이름 → 로마자 (기존 편 id 와 같은 모양: 동도중 → dongdo) ─────────────
_I = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"]
_V = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we",
      "wi", "yu", "eu", "ui", "i"]
_F = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p",
      "t", "t", "ng", "t", "t", "k", "t", "p", "t"]


def romanize(hangul: str) -> str:
    """음절마다 개정 로마자 표기(동화 규칙 없음). 편 id 의 열쇠일 뿐 공식 표기가 아니다."""
    out = []
    for ch in unicodedata.normalize("NFC", hangul):
        c = ord(ch) - 0xAC00
        if not 0 <= c < 11172:
            raise Hold(f"학교 이름에 한글 음절이 아닌 글자 «{ch}» — examId 를 못 짓는다")
        out.append(_I[c // 588] + _V[(c % 588) // 28] + _F[c % 28])
    return "".join(out)


SCHOOL_SUFFIX = re.compile(r"(?:중학교|고등학교|중|고)$")
TAG = re.compile(r"\[([^\[\]]+)\]")
EXAM_TAG = re.compile(r"^(\d{2})\s*-?\s*(?:([12])\s*-?\s*(중간|기말)|(중간|기말)\s*-?\s*([12]))$")
FOLDER_TAG = re.compile(r"(\d{4})년\s*([12])학기\s*(중간|기말)")


def parse_name(pdf: pathlib.Path) -> dict:
    """파일 이름 태그에서 학교·학년·학기·고사를 읽는다. **학년은 폴더가 아니라 [학년] 태그다**
    (중3 폴더에 [강북중][2] 가 섞여 있다 — 2026-09-13 원장님)."""
    stem = unicodedata.normalize("NFC", pdf.stem)
    tags = [t.strip() for t in TAG.findall(stem)]
    if len(tags) < 3:
        raise Hold(f"이름 태그가 모자란다: {stem}")
    school = tags[0]
    if not tags[1].isdigit():
        raise Hold(f"둘째 태그가 학년이 아니다: [{tags[1]}]")
    level = "중" if school.endswith("중") else "고" if school.endswith("고") else None
    if not level:
        raise Hold(f"학교 이름이 중/고로 안 끝난다: {school}")
    ex = None
    for t in tags[2:]:
        m = EXAM_TAG.match(t)
        if m:
            ex = m
            break
    if not ex:
        raise Hold(f"학기·고사 태그를 못 찾았다: {stem}")
    sem = ex.group(2) or ex.group(5)
    kind = ex.group(3) or ex.group(4)
    # 폴더가 학기·고사를 말하면 **대 본다** — 근거가 하나뿐이면 다음 폴더에서 조용히 어긋난다.
    for anc in pdf.parents:
        fm = FOLDER_TAG.search(unicodedata.normalize("NFC", anc.name))
        if fm:
            if (fm.group(1)[2:], fm.group(2), fm.group(3)) != (ex.group(1), sem, kind):
                raise Hold(f"파일 태그({ex.group(1)}-{sem}-{kind})와 폴더({anc.name})가 다르다")
            break
    subject = "수학"
    if level == "고" and len(tags) > 3 and not EXAM_TAG.match(tags[2]):
        subject = tags[2]
    exam_id = f"20{ex.group(1)}-{romanize(SCHOOL_SUFFIX.sub('', school))}-{tags[1]}-{sem}-" + (
        "mid" if kind == "중간" else "final")
    return {"examId": exam_id, "school": school, "grade": f"{level}{tags[1]}", "subject": subject}


# ── 짝 찾기 ──────────────────────────────────────────────────────────────────
def hwp_index(word_root: pathlib.Path) -> dict[str, list[pathlib.Path]]:
    idx: dict[str, list[pathlib.Path]] = {}
    for p in word_root.rglob("*"):
        if p.suffix.lower() in (".hwp", ".hwpx") and p.is_file():
            idx.setdefault(unicodedata.normalize("NFC", p.stem), []).append(p)
    return idx


def pair_of(pdf: pathlib.Path, idx: dict[str, list[pathlib.Path]]) -> pathlib.Path:
    stem = unicodedata.normalize("NFC", pdf.stem)
    if "(완료)" not in stem:
        raise Hold("완료본이 아니다(D-37)")
    got = idx.get(stem, [])
    if not got:
        raise Hold("짝 HWP 없음")
    if len(got) > 1:
        raise Hold(f"짝 HWP 가 {len(got)}개 — {[str(p) for p in got]}")
    return got[0]


def word_root_of(pdf: pathlib.Path) -> pathlib.Path | None:
    """`…/pdf/중3/x.PDF` → `…/워드`."""
    for anc in pdf.parents:
        if anc.name.lower() == "pdf" and (anc.parent / "워드").is_dir():
            return anc.parent / "워드"
    return None


# ── 지문 · 상태 · 로그 ────────────────────────────────────────────────────────
def fingerprint(*parts) -> str:
    h = hashlib.sha1()
    for p in parts:
        if isinstance(p, pathlib.Path):
            h.update(p.name.encode())
            h.update(p.read_bytes() if p.exists() else "<없음>".encode())
        elif isinstance(p, bytes):
            h.update(p)
        else:
            h.update(json.dumps(p, ensure_ascii=False, sort_keys=True).encode())
        h.update(b"\x00")
    return h.hexdigest()[:16]


def write_json_atomic(path: pathlib.Path, obj, indent=1) -> None:
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=indent), encoding="utf-8")
    os.replace(tmp, path)


class Exam:
    """한 편의 폴더·상태·로그."""

    def __init__(self, d: pathlib.Path, meta: dict | None = None, pdf=None, hwp=None, source_rel=None):
        self.dir, self.meta, self.pdf, self.hwp, self.source_rel = d, meta or {}, pdf, hwp, source_rel
        self.state_path = d / "batch-state.json"
        self.state = (json.loads(self.state_path.read_text(encoding="utf-8"))
                      if self.state_path.exists() else {"done": {}, "attempts": {}, "gaveUp": None})
        self.notes: list[str] = []

    def save(self) -> None:
        self.dir.mkdir(parents=True, exist_ok=True)
        write_json_atomic(self.state_path, self.state)

    def log(self, text: str) -> None:
        self.dir.mkdir(parents=True, exist_ok=True)
        with open(self.dir / "batch.log", "a", encoding="utf-8") as f:
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {text}\n")

    def cfg(self) -> dict:
        return json.loads((self.dir / "exam.json").read_text(encoding="utf-8"))


def run(ex: Exam, cmd: list[str], timeout: int = CHILD_TIMEOUT) -> str:
    """자식 프로세스 하나. 출력은 로그로만 간다. [중단]·남은 결함 → 보류, 그 밖의 실패 → 실패."""
    env = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONUTF8="1")
    shown = " ".join(c if " " not in c else f'"{c}"' for c in cmd)
    ex.log(f"$ {shown}")
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace",
                           timeout=timeout, env=env, cwd=REPO)
    except subprocess.TimeoutExpired:
        ex.log(f"  ⏱ {timeout}초 넘김")
        raise Fail(f"{timeout}초 넘김")
    out = (r.stdout or "") + (("\n[stderr]\n" + r.stderr) if r.stderr.strip() else "")
    ex.log(out[-LOG_CAP:] + f"\n  → 종료 {r.returncode}")
    if r.returncode != 0:
        first = next((ln.strip() for ln in out.splitlines()
                      if "[중단]" in ln or "남은 결함" in ln or "🔴" in ln), "")
        if first:
            raise Hold(first[:160])
        tail = [ln for ln in out.splitlines() if ln.strip()][-1:] or ["(출력 없음)"]
        raise Fail(f"종료 {r.returncode}: {tail[0][:140]}")
    return r.stdout or ""


# ── 1단계 감시 — 창이 뜨거나 포커스를 뺏으면 **배치 전체를** 멈춘다 (절대 규칙 9) ─────
#
# `hwp_to_hwpx_quiet.py` 는 숨은 데스크톱에서 돈다 — 실측 포커스 이동 0회. 그래도 믿지 않고 본다:
# 자식이 도는 동안 0.1초마다 ⑴ 사용자 화면에 **새** 한글 창이 보이는가 ⑵ 전경 창이 한글이나
# 자식 쪽으로 넘어갔는가. 원장님이 원래 띄워 둔 한글 창은 «전»에 찍어 두고 빼고 센다.
# ⚠️ «0»을 믿기 전에 일을 했는지 본다 — 산출물(.hwpx)이 없으면 감시 0회는 아무것도 증명하지 않는다.
def _user32():
    import ctypes
    from ctypes import wintypes
    u, k = ctypes.windll.user32, ctypes.windll.kernel32
    u.GetForegroundWindow.restype = wintypes.HWND
    return ctypes, wintypes, u, k


def _proc_image(pid: int) -> str:
    ctypes, wintypes, _, k = _user32()
    h = k.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
    if not h:
        return ""
    try:
        buf = ctypes.create_unicode_buffer(1024)
        n = wintypes.DWORD(1024)
        return buf.value if k.QueryFullProcessImageNameW(h, 0, buf, ctypes.byref(n)) else ""
    finally:
        k.CloseHandle(h)


def _pid_of(hwnd) -> int:
    ctypes, wintypes, u, _ = _user32()
    pid = wintypes.DWORD()
    u.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    return pid.value


def _visible_hwp_windows() -> set[int]:
    ctypes, wintypes, u, _ = _user32()
    found: set[int] = set()
    proto = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

    def cb(hwnd, _):
        if u.IsWindowVisible(hwnd) and "hwp" in pathlib.Path(_proc_image(_pid_of(hwnd))).name.lower():
            found.add(int(hwnd or 0))
        return True

    u.EnumWindows(proto(cb), 0)
    return found


def watchdog_verdict(before: set, now: set, fg0, fg, fg_image: str, fg_pid: int, child_pid: int) -> str | None:
    """순수 판정 — 눈금 맞추기 쉽게 OS 호출과 가른다."""
    new = set(now) - set(before)
    if new:
        return f"사용자 화면에 한글 창이 떴다({len(new)}개)"
    if fg != fg0 and fg not in before and (fg_pid == child_pid or "hwp" in fg_image.lower()):
        return f"포커스를 뺏었다({pathlib.Path(fg_image).name or fg_pid})"
    return None


def gauge_watchdog() -> None:
    """감시가 «예»와 «아니오»를 둘 다 내는지 가짜 상태로 본다(진짜로 포커스를 뺏어 볼 수는 없다)."""
    cases = [
        (({1}, {1, 2}, 10, 10, "", 0, 99), True),                     # 새 한글 창
        (({1}, {1}, 10, 20, "C:/HNC/Hwp.exe", 5, 99), True),           # 전경이 한글로
        (({1}, {1}, 10, 20, "C:/py/python.exe", 99, 99), True),        # 전경이 자식으로
        (({1}, {1}, 10, 20, "C:/Chrome/chrome.exe", 7, 99), False),    # 원장님이 다른 창으로 옮김
        (({1}, {1}, 10, 1, "C:/HNC/Hwp.exe", 5, 99), False),           # 원래 있던 한글 창으로 옮김
        (({1}, {1}, 10, 10, "", 0, 99), False),                        # 아무 일 없음
    ]
    for args, want in cases:
        if (watchdog_verdict(*args) is not None) != want:
            raise Abort(f"감시 눈금이 틀린다: {args} → {want} 이어야 한다 — 변환을 안 돌린다")


def run_hwpx_child(ex: "Exam", src: pathlib.Path, workdir: pathlib.Path) -> None:
    gauge_watchdog()
    workdir.mkdir(parents=True, exist_ok=True)
    _, _, u, _ = _user32()
    before, fg0 = _visible_hwp_windows(), u.GetForegroundWindow()
    child_log = workdir / "child.log"
    cmd = [sys.executable, str(pathlib.Path(__file__).resolve()), "--_child-hwpx", str(src), str(workdir)]
    ex.log(f"$ {' '.join(cmd)}  (감시 시작 — 원래 보이던 한글 창 {len(before)}개)")
    env = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONUTF8="1")
    with open(child_log, "w", encoding="utf-8") as fh:
        p = subprocess.Popen(cmd, stdout=fh, stderr=subprocess.STDOUT, env=env, cwd=REPO)
        t0, polls, fg_moves, last = time.time(), 0, 0, fg0
        while p.poll() is None:
            fg = u.GetForegroundWindow()
            if fg != last:
                fg_moves, last = fg_moves + 1, fg
            fpid = _pid_of(fg) if fg else 0
            v = watchdog_verdict(before, _visible_hwp_windows(), fg0, fg, _proc_image(fpid) if fpid else "",
                                 fpid, p.pid)
            polls += 1
            if v:
                p.kill()
                ex.log(f"🛑 {v} — 자식을 죽이고 배치를 멈춘다")
                raise Abort(v)
            if time.time() - t0 > HWPX_TIMEOUT:
                p.kill()
                raise Fail(f"HWPX 변환 {HWPX_TIMEOUT}초 넘김")
            time.sleep(0.1)
    ex.log(child_log.read_text(encoding="utf-8", errors="replace")[-LOG_CAP:])
    ex.log(f"  감시: {polls}회 봄 · {time.time() - t0:.1f}초 · 새 한글 창 0 · 전경 바뀜 {fg_moves}회(한글·자식 아님)")
    ex.notes.append(f"HWP 감시 {polls}회·새 창 0")
    if p.returncode == 3:
        raise Hold("숨은 데스크톱을 못 세웠다 — 변환을 안 돌린다(절대 규칙 9)")
    if p.returncode != 0:
        raise Fail(f"HWPX 변환 종료 {p.returncode}")


# ── 단계 ─────────────────────────────────────────────────────────────────────
def _need(*paths: pathlib.Path) -> None:
    for p in paths:
        if not p.exists():
            raise Fail(f"입력이 없다: {p.name}")


def st_copy(ex: Exam) -> None:
    if not ex.pdf:
        raise Hold("원본 경로를 모른다(--exam-dir 로 부른 편은 --from 으로 앞 단계를 넘겨라)")
    src = ex.dir / "src"
    src.mkdir(parents=True, exist_ok=True)
    for a, b in ((ex.pdf, src / "paper.pdf"), (ex.hwp, src / ("answers" + ex.hwp.suffix.lower()))):
        shutil.copyfile(a, b)
        if a.stat().st_size != b.stat().st_size:
            raise Fail(f"복사 크기가 다르다: {a.name}")
    (ex.dir / "source_path.txt").write_bytes(ex.source_rel.encode("utf-8"))


def st_hwpx(ex: Exam) -> None:
    src = next((ex.dir / "src").glob("answers.hwp*"), None)
    if not src:
        raise Fail("src/answers.hwp 가 없다")
    work = ex.dir / "hwpx"
    if src.suffix.lower() == ".hwpx":
        work.mkdir(exist_ok=True)
        shutil.copyfile(src, work / "answers.hwpx")
        return
    run_hwpx_child(ex, src, work)
    if not (work / "answers.hwpx").exists() or (work / "answers.hwpx").stat().st_size == 0:
        raise Fail("HWPX 가 안 생겼다 — 감시 0회는 일을 안 한 것일 수 있다")


def st_extract(ex: Exam) -> None:
    _need(ex.dir / "hwpx" / "answers.hwpx")
    run(ex, [sys.executable, str(pathlib.Path(__file__).resolve()), "--_child-extract",
             str(ex.dir / "hwpx" / "answers.hwpx"), str(ex.dir / "answers.json")])


def st_body(ex: Exam) -> None:
    _need(ex.dir / "src" / "paper.pdf")
    run(ex, [sys.executable, str(pathlib.Path(__file__).resolve()), "--_child-body",
             str(ex.dir / "src" / "paper.pdf"), str(ex.dir / "body.json")])


def st_figures(ex: Exam) -> None:
    _need(ex.dir / "src" / "paper.pdf")
    run(ex, [sys.executable, str(HERE / "figures" / "extract_source_figures.py"),
             "--src", str(ex.dir / "src" / "paper.pdf"), "--out", str(ex.dir / "figures")])


def st_conv(ex: Exam) -> None:
    """answers.json → pieces_in·sol_in (발문·보기 조각 / HWP 해설) → 정본 변환기."""
    a = json.loads((ex.dir / "answers.json").read_text(encoding="utf-8"))
    pieces, sols = [], []
    for q in a["questions"]:
        pieces.append({"id": f"{q['number']}-stem", "text": q["stem"]})
        for i, c in enumerate(q["choices"], 1):
            pieces.append({"id": f"{q['number']}-c{i}", "text": c})
        if q["solution"] is not None:
            sols.append({"id": str(q["number"]), "text": q["solution"]})
    for name, rows in (("pieces", pieces), ("sol", sols)):
        (ex.dir / f"{name}_in.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
        run(ex, [sys.executable, str(QA / "convert-hwp-spans.py"),
                 str(ex.dir / f"{name}_in.json"), str(ex.dir / f"{name}_conv.json")])
        bad = [r["id"] for r in json.loads((ex.dir / f"{name}_conv.json").read_text(encoding="utf-8"))
               if "error" in r]
        if bad:
            raise Hold(f"수식 변환 오류 {len(bad)}행 ({', '.join(bad[:4])})")


def st_fix(ex: Exam) -> None:
    for a, b in (("pieces_conv", "hwp_fixed"), ("sol_conv", "sol_fixed")):
        run(ex, TSX + [str(HERE / "fix-exam-solutions.ts"), str(ex.dir / f"{a}.json"),
                       str(ex.dir / f"{b}.json"), "--config", str(ex.dir / "exam.json")])


class NotYet(Exception):
    """계획된 기다림 — 풀이자 출력 대기 · 뒤 절반(앞 절반 검수 전). 보류도 실패도 아니다."""


def write_exam_json(d: pathlib.Path, obj: dict) -> None:
    (d / "exam.json").write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def st_tables(ex: Exam) -> None:
    """표 후보를 **빌더와 같은 함수**로 찾아 제안한다. 확신이 없으면 그 편을 멈춘다."""
    out = run(ex, TSX + [str(HERE / "build-exam-drafts.ts"), str(ex.dir), "--propose-tables"])
    js = [ln for ln in out.splitlines() if ln.strip().startswith("{")]
    if not js:
        raise Fail("표 제안 출력이 없다")
    prop = json.loads(js[-1])
    cfg = ex.cfg()
    if "tables" in cfg:
        tables = sorted(cfg["tables"])
        if sorted(prop["candidates"]) != tables or prop["unsure"]:
            ex.log(f"  표: exam.json 에 사람이 적은 {tables} 를 따른다 · 제안 {prop}")
    else:
        if prop["unsure"]:
            u = prop["unsure"][0]
            raise Hold(f"표 확신 없음 — 문{u['n']}: {u['why']} · exam.json 에 tables 를 적을 것")
        tables = sorted(prop["candidates"])
        new: dict = {}
        for k, v in cfg.items():
            new[k] = v
            if k == "subject":
                new["tables"] = tables
        new.setdefault("tables", tables)
        write_exam_json(ex.dir, new)
        ex.notes.append(f"표 제안 채택 {tables}" if tables else "표 없음")
    if not tables:
        return
    pdf = ex.dir / "src" / "paper.pdf"
    if pdf.exists():
        run(ex, [sys.executable, str(HERE / "figures" / "crop_tables.py"), "--src", str(pdf),
                 "--out", str(ex.dir / "figures"), "--numbers", ",".join(map(str, tables))])
        return
    idx = json.loads((ex.dir / "figures" / "index.json").read_text(encoding="utf-8"))
    have = {f["number"] for f in idx["figures"] if f.get("kind") == "table"}
    if set(tables) - have:
        raise Hold(f"원본 PDF 가 없어 표 {sorted(set(tables) - have)} 를 못 오린다")


def st_drafts(ex: Exam) -> None:
    hold = ex.dir / "drafts.json.hold"
    try:
        run(ex, TSX + [str(HERE / "build-exam-drafts.ts"), str(ex.dir)])
    except (Hold, Fail):
        # 빌더는 금지 검사에 걸려도 drafts.json 을 **쓰고** 멈춘다 — «끝났다»로 읽히지 않게 치운다.
        if (ex.dir / "drafts.json").exists():
            os.replace(ex.dir / "drafts.json", hold)
            ex.log("  실패한 초안을 drafts.json.hold 로 치웠다")
        raise
    if hold.exists():
        hold.unlink()


def st_residue(ex: Exam) -> None:
    import scan_residue
    try:
        hits = scan_residue.scan(ex.dir)
    except SystemExit as e:
        raise Abort(f"잔재 훑기 눈금이 죽었다: {e}")
    for h in hits:
        ex.log("  잔재 " + h)
    if hits:
        raise Hold(f"잔재 {len(hits)}건 — {hits[0][:90]}")


def _compact(line: str) -> str:
    s = re.sub(r"\\(?:mathrm|mathit|overline|text)\s*", "", line)
    s = re.sub(r"\\[,;!: ~]|~", "", s).replace("$", "")
    s = re.sub(r"\\([a-zA-Z]+)", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()


def st_classify(ex: Exam) -> None:
    """분류용 짧은 표 — 모델·사람이 소단원·문항류를 exam.json units 에 적을 때 **이것만** 읽는다."""
    cfg = ex.cfg()
    drafts = json.loads((ex.dir / "drafts.json").read_text(encoding="utf-8"))
    ans = {q["number"]: q for q in json.loads((ex.dir / "answers.json").read_text(encoding="utf-8"))["questions"]}
    figs = json.loads((ex.dir / "figures" / "index.json").read_text(encoding="utf-8"))["figures"]
    out = [f"# {cfg['examId']} {cfg['school']} {cfg['grade']} — 분류용 (소단원·문항류 → exam.json units)",
           "n|형식|HWP 소단원·난이도|그림|발문 첫 두 줄"]
    for d in drafts:
        n = d["questionNumber"]
        q = ans.get(n, {})
        kinds = [f.get("kind", "fig") for f in figs if f["number"] == n]
        fig = "·".join(x for x in (f"그림{kinds.count('fig')}" if "fig" in kinds else "",
                                   "표" if "table" in kinds else "") if x) or "-"
        stem = re.split(r"\n\n1\. ", d["content"])[0]
        lines = [c for c in (_compact(ln) for ln in stem.split("\n")) if c][:2]
        out.append(f"{n}|{(d.get('questionType') or '?')[:1]}|{q.get('topic') or '-'}·{q.get('difficulty') or '-'}"
                   f"|{fig}|{' / '.join(x[:48] for x in lines)}")
    text = "\n".join(out) + "\n"
    (ex.dir / "classify.md").write_text(text, encoding="utf-8")
    ex.notes.append(f"분류표 {len(text.encode('utf-8')) / 1024:.1f}KB")


# ── 풀이자 문제지 · 채점 — 대량 풀이는 **두 번에 나눈다** (2026-09-13 원장님) ────────
# 편 목록을 앞 절반·뒤 절반으로 가른다(`solve-plan.json`). 앞 절반 채점이 끝나면
# «절반 지점 — 메인 표본 검수 후 재개» 를 찍고 멈춘다. `--reviewed` 로 다시 부르면 뒤 절반을 낸다.
PLAN: dict = {"first": [], "second": [], "reviewed": False}


def render_brief(ex: Exam, count: int) -> str:
    rules = json.loads((HERE / "solver_rules.json").read_text(encoding="utf-8"))
    cmds = ", ".join("`^\\circ`" if c == "circ" else f"`\\{c}`" for c in rules["allowedCommands"])
    rep = {
        "{{FORBIDDEN}}": " · ".join(m["name"] for m in rules["forbiddenMethods"]),
        "{{COMMANDS}}": cmds,
        "{{SENT_MIN}}": str(rules["sentences"]["min"]),
        "{{SENT_MAX}}": str(rules["sentences"]["max"]),
        "{{SENT_MAX_JUDGE}}": str(rules["sentences"]["maxJudge"]),
        "{{ROOT}}": ex.sheet.as_posix(),
        "{{SHEET}}": (ex.sheet / "problems.json").as_posix(),
        "{{COUNT}}": str(count),
        "{{REPORT}}": (ex.sheet / "REPORT.md").as_posix(),
    }
    t = (HERE / "SOLVER-BRIEF.md").read_text(encoding="utf-8")
    for k, v in rep.items():
        t = t.replace(k, v)
    left = re.findall(r"\{\{[A-Z_]+\}\}", t)
    if left:
        raise Fail(f"지시서 자리표가 남았다 {left}")
    return t


def st_sheet(ex: Exam) -> None:
    """HWP 해설이 없는 객관식만 — 정답·해설을 **빼고**, 그림은 문제지 폴더로 복사한다."""
    if ex.dir.name in PLAN["second"] and not PLAN["reviewed"]:
        raise NotYet("뒤 절반 — 앞 절반 표본 검수 뒤에 문제지를 낸다(--reviewed)")
    drafts = json.loads((ex.dir / "drafts.json").read_text(encoding="utf-8"))
    figs = json.loads((ex.dir / "figures" / "index.json").read_text(encoding="utf-8"))["figures"]
    qs = [d for d in drafts if d.get("questionType") == "객관식" and not d.get("solution")]
    (ex.sheet / "fig").mkdir(parents=True, exist_ok=True)
    (ex.sheet / "out").mkdir(exist_ok=True)
    for old in (ex.sheet / "fig").glob("*.png"):
        old.unlink()
    rows = []
    for d in qs:
        n = d["questionNumber"]
        if re.search(r"정답|해설", d["content"]):
            raise Hold(f"문{n} 문제지 발문에 «정답/해설» 이 남았다 — 풀이자 눈을 못 가린다")
        mine = []
        for f in figs:
            if f["number"] == n:
                shutil.copyfile(ex.dir / "figures" / f["file"], ex.sheet / "fig" / f["file"])
                mine.append(str(ex.sheet / "fig" / f["file"]))
        rows.append({"n": n, "content": d["content"], "figures": mine,
                     "out": str(ex.sheet / "out" / f"q{n:02d}.json")})
    (ex.sheet / "problems.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    if rows:
        (ex.sheet / "BRIEF.md").write_text(render_brief(ex, len(rows)), encoding="utf-8")
    ex.notes.append(f"문제지 {len(rows)}문항")


def st_grade(ex: Exam) -> None:
    sheet = json.loads((ex.sheet / "problems.json").read_text(encoding="utf-8"))
    if not sheet:
        ex.notes.append("풀이할 문항 없음")
        return
    if not any(pathlib.Path(p["out"]).exists() for p in sheet):
        raise NotYet(f"풀이 대기 {len(sheet)}문항 — 지시서 {(ex.sheet / 'BRIEF.md').as_posix()}")
    import grade_solutions
    try:
        r = grade_solutions.grade(ex.dir, ex.sheet)
    except SystemExit as e:
        raise Abort(f"채점기 눈금이 죽었다: {e}")
    for f in r["flags"]:
        ex.log(f"  채점 걸림 문{f['n']}: {'; '.join(f['why'])}")
    note = f"해설 통과 {len(r['passed'])}"
    if r["flags"]:
        note += f" · 걸림 {len(r['flags'])}(" + ",".join(f"문{f['n']}" for f in r["flags"]) + " — solve-flags.json)"
    if r["missing"]:
        note += f" · 미제출 {len(r['missing'])}"
    ex.notes.append(note)


def graded(d: pathlib.Path) -> bool:
    """앞 절반 판정용 — 채점이 끝났고 미제출이 없다(풀 문항이 없는 편도 끝난 것이다)."""
    st = d / "batch-state.json"
    if not st.exists() or "8g" not in json.loads(st.read_text(encoding="utf-8"))["done"]:
        return False
    fl = d / "solve-flags.json"
    return not fl.exists() or not json.loads(fl.read_text(encoding="utf-8"))["missing"]


# ── 단계 표 ──────────────────────────────────────────────────────────────────
def _tc(rel: str) -> pathlib.Path:
    from tc_paths import testchanger_dir
    return testchanger_dir() / rel


def _answers_src(ex: Exam) -> pathlib.Path:
    return next((ex.dir / "src").glob("answers.hwp*"), ex.dir / "src" / "answers.hwp")


def _cfg_or(ex: Exam, key: str, default=None):
    p = ex.dir / "exam.json"
    return json.loads(p.read_text(encoding="utf-8")).get(key, default) if p.exists() else default


def _sheet_outs(ex: Exam) -> list:
    p = ex.sheet / "problems.json"
    if not p.exists():
        return []
    return [pathlib.Path(r["out"]) for r in json.loads(p.read_text(encoding="utf-8"))]


class Stage:
    def __init__(self, key, name, fn, outputs, inputs, keep=None):
        self.key, self.name, self.fn, self.outputs, self.inputs = key, name, fn, outputs, inputs
        self.keep = keep or outputs


D = lambda ex, *names: [ex.dir.joinpath(*n.split("/")) for n in names]  # noqa: E731
STAGES = [
    Stage("0", "원본 복사", st_copy,
          lambda ex: [ex.dir / "src" / "paper.pdf", _answers_src(ex), ex.dir / "source_path.txt"],
          lambda ex: [str(ex.pdf), ex.pdf.stat().st_size, ex.pdf.stat().st_mtime_ns,
                      str(ex.hwp), ex.hwp.stat().st_size, ex.hwp.stat().st_mtime_ns, ex.source_rel]
          if ex.pdf else ["원본 모름"],
          keep=lambda ex: D(ex, "source_path.txt")),
    Stage("1", "HWP→HWPX", st_hwpx, lambda ex: D(ex, "hwpx/answers.hwpx"),
          lambda ex: [_answers_src(ex)], keep=lambda ex: []),
    Stage("1x", "HWP 추출", st_extract, lambda ex: D(ex, "answers.json"),
          lambda ex: D(ex, "hwpx/answers.hwpx") + [_tc("scripts/hwp_extract.py")]),
    Stage("2", "PDF 텍스트층", st_body, lambda ex: D(ex, "body.json"),
          lambda ex: D(ex, "src/paper.pdf") + [_tc("db/textlayer.py"), _tc("db/pua_table.json")]),
    Stage("3", "그림", st_figures, lambda ex: D(ex, "figures/index.json"),
          lambda ex: D(ex, "src/paper.pdf") + [HERE / "figures" / "extract_source_figures.py"]),
    Stage("4", "수식 변환", st_conv,
          lambda ex: D(ex, "pieces_in.json", "sol_in.json", "pieces_conv.json", "sol_conv.json"),
          lambda ex: D(ex, "answers.json") + [QA / "convert-hwp-spans.py", QA / "hwpeq_unglue.py"]),
    Stage("5", "잔재 고침", st_fix, lambda ex: D(ex, "hwp_fixed.json", "sol_fixed.json"),
          lambda ex: D(ex, "pieces_conv.json", "sol_conv.json") + [HERE / "fix-exam-solutions.ts",
                                                                    _cfg_or(ex, "hand", [])]),
    Stage("3t", "표", st_tables, lambda ex: D(ex, "figures/index.json"),
          lambda ex: D(ex, "hwp_fixed.json", "answers.json", "body.json") + [
              HERE / "build-exam-drafts.ts", HERE / "figures" / "crop_tables.py",
              _cfg_or(ex, "tables", "없음"), (ex.dir / "src" / "paper.pdf").exists()]),
    Stage("7", "초안", st_drafts, lambda ex: D(ex, "drafts.json"),
          lambda ex: D(ex, "answers.json", "body.json", "hwp_fixed.json", "sol_fixed.json", "source_path.txt") + [
              HERE / "build-exam-drafts.ts", HERE / "examConfig.ts",
              {k: v for k, v in json.loads((ex.dir / "exam.json").read_text(encoding="utf-8")).items()
               if k != "units"}]),
    Stage("7r", "잔재 훑기", st_residue, lambda ex: [],
          lambda ex: D(ex, "drafts.json") + sorted((ex.dir / "sol_ai").glob("q*.json")) + [
              HERE / "scan_residue.py"]),
    Stage("9", "분류용 표", st_classify, lambda ex: D(ex, "classify.md"),
          lambda ex: D(ex, "drafts.json", "answers.json", "figures/index.json")),
    Stage("8", "풀이자 문제지", st_sheet, lambda ex: [ex.sheet / "problems.json"],
          lambda ex: D(ex, "drafts.json", "figures/index.json") + [
              HERE / "SOLVER-BRIEF.md", HERE / "solver_rules.json", ex.sheet.as_posix()]),
    Stage("8g", "풀이 채점", st_grade,
          lambda ex: D(ex, "solve-flags.json") if _sheet_outs(ex) else [],
          lambda ex: [ex.sheet / "problems.json", *[o for o in _sheet_outs(ex) if o.exists()]] + D(
              ex, "drafts.json") + [HERE / "grade_solutions.py", HERE / "solver_rules.json",
                                    HERE / "scan_residue.py"]),
]
STAGE_KEYS = [s.key for s in STAGES]


def process(ex: Exam, start: int) -> None:
    for i, st in enumerate(STAGES):
        ex.current = st
        if i < start:
            missing = [p.name for p in st.keep(ex) if not p.exists()]
            if missing:
                raise Hold(f"--from 앞 단계 산출물이 없다 {missing}")
            continue
        rec = ex.state["done"].get(st.key)
        if rec and all(p.exists() for p in st.outputs(ex)) and rec["fp"] == fingerprint(*st.inputs(ex)):
            continue
        ex.log(f"── {st.key} {st.name}")
        st.fn(ex)
        # 지문은 **돈 뒤에** 잰다 — 표 단계는 제 입력(exam.json tables)을 스스로 쓴다.
        ex.state["done"][st.key] = {"fp": fingerprint(*st.inputs(ex)), "at": time.strftime("%Y-%m-%d %H:%M:%S")}
        ex.state["attempts"].pop(st.key, None)
        for later in STAGES[i + 1:]:
            ex.state["done"].pop(later.key, None)
        ex.save()
