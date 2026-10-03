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
# 🔴 문제지는 **저장소 밖**에 둔다 — 저장소 안에는 exams/<편>/drafts.json(정답)이 있어서
#    풀이자가 눈을 뜬다(2026-09-13 메인이 잡았다). 기본값은 grok 워크트리의 작업 폴더다.
DEFAULT_BLIND_ROOT = pathlib.Path(
    "C:/Users/user/orca/workspaces/todays-math/grok-solve/scratch/grok-solve")
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


def run_raw(ex: Exam, cmd: list[str], timeout: int = CHILD_TIMEOUT) -> tuple[int, str]:
    """자식 하나를 돌리고 (종료코드, 출력)을 **그대로** 준다 — 실패 출력을 봐야 하는 단계가 있다(5)."""
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
    return r.returncode, out


def run(ex: Exam, cmd: list[str], timeout: int = CHILD_TIMEOUT) -> str:
    """자식 프로세스 하나. 출력은 로그로만 간다. [중단]·남은 결함 → 보류, 그 밖의 실패 → 실패."""
    rc, out = run_raw(ex, cmd, timeout)
    if rc != 0:
        first = next((ln.strip() for ln in out.splitlines()
                      if "[중단]" in ln or "남은 결함" in ln or "🔴" in ln), "")
        if first:
            raise Hold(first[:160])
        tail = [ln for ln in out.splitlines() if ln.strip()][-1:] or ["(출력 없음)"]
        raise Fail(f"종료 {rc}: {tail[0][:140]}")
    return out


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
    """정본이 못 되돌린 잔재를 고친다.

    🔴 **남은 결함은 사람이 exam.json `acceptFix` 에 적은 자리만 넘어간다.** 그냥 멈추면 이미 넣은
    편(동도중 문6 `\mathrm{\overline{OO'}}` — 프라임 때문에 규칙이 못 벗긴다)을 다시 못 만들고,
    그냥 넘어가면 **새 편의 진짜 결함**이 조용히 지나간다. 그리고 «적었는데 안 나는» 쪽도 멈춘다 —
    한쪽만 보면 받아들임이 영영 남아 다음 결함을 가린다.
    """
    accepted = {(a["id"], a["issue"]) for a in ex.cfg().get("acceptFix", [])}
    seen: set[tuple[str, str]] = set()
    for a, b in (("pieces_conv", "hwp_fixed"), ("sol_conv", "sol_fixed")):
        rc, out = run_raw(ex, TSX + [str(HERE / "fix-exam-solutions.ts"), str(ex.dir / f"{a}.json"),
                                     str(ex.dir / f"{b}.json"), "--config", str(ex.dir / "exam.json")])
        if rc == 0:
            continue
        stop = next((ln.strip() for ln in out.splitlines() if "[중단]" in ln), "")
        if stop:
            raise Hold(stop[:160])
        left = []
        for ln in out.splitlines():
            m = re.match(r"\[문(\S+)\]\s*(.+)$", ln.strip())
            if not m:
                continue
            for issue in m.group(2).split(" · "):
                key = (m.group(1), issue.strip())
                seen.add(key)
                if key not in accepted:
                    left.append(f"{key[0]} {key[1]}")
        if left:
            raise Hold("잔재 고침에 남은 결함 — " + " · ".join(sorted(set(left))[:3])
                       + " · 지면을 보고 exam.json hand 로 고치거나 acceptFix 에 까닭과 함께 적을 것")
        if not seen:
            raise Fail(f"fix-exam-solutions 가 종료 {rc} 인데 결함 줄이 없다")
    unused = accepted - seen
    if unused:
        raise Hold(f"exam.json acceptFix 에 적었는데 이번엔 안 난 것 {sorted(unused)} — 지워라")
    if accepted:
        ex.notes.append(f"받아들인 잔재 {len(accepted)}자리")


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
    # 표기는 지시서 원본대로 — `^\circ` 와 호(`\overset{\frown}{AB}`)는 이름만으로 못 적는다.
    shown = []
    for c in rules["allowedCommands"]:
        if c == "frown":
            continue
        shown.append("`^\\circ`" if c == "circ" else
                     "호는 `\\overset{\\frown}{AB}`" if c == "overset" else f"`\\{c}`")
    cmds = ", ".join(shown)
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
                                                                    _cfg_or(ex, "hand", []),
                                                                    _cfg_or(ex, "acceptFix", [])]),
    Stage("3t", "표", st_tables, lambda ex: D(ex, "figures/index.json"),
          lambda ex: D(ex, "hwp_fixed.json", "answers.json", "body.json") + [
              HERE / "build-exam-drafts.ts", HERE / "restoreBoxMarker.ts",
              REPO / "src" / "lib" / "math" / "boxBlock.ts", HERE / "figures" / "crop_tables.py",
              _cfg_or(ex, "tables", "없음"), (ex.dir / "src" / "paper.pdf").exists()]),
    Stage("7", "초안", st_drafts, lambda ex: D(ex, "drafts.json"),
          lambda ex: D(ex, "answers.json", "body.json", "hwp_fixed.json", "sol_fixed.json", "source_path.txt") + [
              HERE / "build-exam-drafts.ts", HERE / "restoreBoxMarker.ts",
              REPO / "src" / "lib" / "math" / "boxBlock.ts", HERE / "examConfig.ts",
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


# ── 자식 명령 — 무거운 단계는 따로 도는 프로세스다(한 편이 죽어도 드라이버는 산다) ──────
def _tc_module(name: str, rel: str):
    import importlib.util
    spec = importlib.util.spec_from_file_location(name, _tc(rel))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def child_main(argv: list[str]) -> int:
    kind, a, b = argv[0], argv[1], argv[2]
    if kind == "--_child-hwpx":
        import hwp_to_hwpx_quiet as q
        # COM 을 부르기 **전에** 숨은 데스크톱에 붙는다. 못 붙으면 변환을 아예 안 돌린다.
        if not q.isolate_desktop():
            print("isolate_desktop 실패 — 변환을 안 돌린다")
            return 3
        out = q.to_hwpx_quiet(pathlib.Path(a), pathlib.Path(b))
        print(f"HWPX {out.name} {out.stat().st_size}B")
        return 0
    if kind == "--_child-extract":
        data = _tc_module("hwp_extract", "scripts/hwp_extract.py").parse_exam(pathlib.Path(a))
        pathlib.Path(b).write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"문항 {data['question_count']}")
        return 0
    if kind == "--_child-body":
        d = _tc_module("textlayer", "db/textlayer.py").extract(pathlib.Path(a))
        pathlib.Path(b).write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"문항 {len(d['questions'])}")
        return 0
    print(f"모르는 자식 명령 {kind}")
    return 2


# ── 한 번에 하나 — 드라이버 둘이 동시에 돌면 한글 변환도 둘이 된다(절대 규칙 9) ─────────
def _alive(pid: int) -> bool:
    ctypes, wintypes, _, k = _user32()
    h = k.OpenProcess(0x1000, False, pid)
    if not h:
        return False
    try:
        code = wintypes.DWORD()
        return bool(k.GetExitCodeProcess(h, ctypes.byref(code))) and code.value == 259  # STILL_ACTIVE
    finally:
        k.CloseHandle(h)


def take_lock(exams_dir: pathlib.Path) -> pathlib.Path:
    p = exams_dir / ".batch.lock"
    if p.exists():
        try:
            pid = int(p.read_text(encoding="utf-8").strip() or 0)
        except ValueError:
            pid = 0
        if pid and pid != os.getpid() and _alive(pid):
            raise SystemExit(f"🛑 다른 배치가 돌고 있다(pid {pid}) — 한 번에 하나(절대 규칙 9)")
    p.write_text(str(os.getpid()), encoding="utf-8")
    return p


# ── 편 모으기 ────────────────────────────────────────────────────────────────
def _grade_of_tags(stem: str) -> str:
    tags = [t.strip() for t in TAG.findall(stem)]
    if len(tags) < 2:
        return "?"
    lv = "중" if tags[0].endswith("중") else "고" if tags[0].endswith("고") else "?"
    return lv + tags[1]


def discover(a) -> tuple[list, list, int, list]:
    """(pdf, hwp, meta) 목록 · 건너뛴 것(이름, 사유) · 학년이 달라 뺀 수 · HWP 만 있는 것."""
    cache: dict = {}
    if a.folder:
        root = pathlib.Path(a.folder)
        pdfs = sorted(p for p in (root / "pdf").rglob("*") if p.is_file() and p.suffix.lower() == ".pdf")
        cache[None] = hwp_index(root / "워드")
        idx_of = lambda pdf: cache[None]  # noqa: E731
    else:
        pdfs = [pathlib.Path(p) for p in a.pdf]

        def idx_of(pdf):
            wr = word_root_of(pdf)
            if wr is None:
                return {}
            if wr not in cache:
                cache[wr] = hwp_index(wr)
            return cache[wr]
    jobs, skips, other_grade = [], [], 0
    for pdf in pdfs:
        if a.grade and _grade_of_tags(unicodedata.normalize("NFC", pdf.stem)) != a.grade:
            other_grade += 1
            continue
        try:
            meta = parse_name(pdf)
            hwp = pair_of(pdf, idx_of(pdf))
        except Hold as h:
            skips.append((pdf.stem, str(h)))
            continue
        jobs.append((pdf, hwp, meta))
    hwp_only = []
    if a.folder:
        stems = {unicodedata.normalize("NFC", p.stem) for p in pdfs}
        hwp_only = sorted(s for s in cache[None] if s not in stems and (not a.grade or _grade_of_tags(s) == a.grade))
    return jobs, skips, other_grade, hwp_only


def ok_line(ex: Exam) -> str:
    cfg = ex.cfg()
    drafts = json.loads((ex.dir / "drafts.json").read_text(encoding="utf-8"))
    figs = json.loads((ex.dir / "figures" / "index.json").read_text(encoding="utf-8"))["figures"]
    nt = sum(1 for f in figs if f.get("kind") == "table")
    tail = list(ex.notes) + ([] if cfg.get("units") else ["units 비었음(분류 대기 — classify.md)"])
    return (f"✅ {cfg['examId']} {cfg['school']} {cfg['grade']} · {len(drafts)}문항 · 그림 {len(figs) - nt}·표 {nt}"
            + (" · " + " · ".join(tail) if tail else ""))


def _state_of(d: pathlib.Path) -> dict:
    p = d / "batch-state.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {"done": {}}


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1].startswith("--_child-"):
        return child_main(sys.argv[1:])
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description="기출 편 여러 개를 한 번에 — 0~9 단계 (공유 DB 는 안 쓴다)")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--folder", help="N드라이브 기출 폴더 — 밑에 pdf/ 와 워드/ 가 있다")
    src.add_argument("--pdf", nargs="+", help="완료본 PDF 경로들")
    src.add_argument("--exam-dir", nargs="+", help="이미 세운 편 폴더(회귀·재개)")
    ap.add_argument("--grade", help="파일 이름 [학년] 태그로 거른다 — 예: 중3")
    ap.add_argument("--from", dest="from_stage", choices=STAGE_KEYS,
                    help="이 단계 앞은 산출물이 있으면 끝난 것으로 본다(커밋된 중간물로 회귀할 때)")
    ap.add_argument("--exams-dir", default=str(HERE / "exams"))
    ap.add_argument("--blind-root", default=str(DEFAULT_BLIND_ROOT),
                    help="풀이자 문제지 폴더 — 편마다 <examId>/problems.json · fig/ · out/ · BRIEF.md")
    ap.add_argument("--source-root", default=str(DEFAULT_SOURCE_ROOT), help="source_path.txt 의 기준")
    ap.add_argument("--list", action="store_true", help="계획만 찍는다 — 아무것도 안 쓴다")
    ap.add_argument("--limit", type=int, help="이만큼만 돈다")
    ap.add_argument("--retry-gave-up", action="store_true", help="3회 실패로 포기한 편을 다시 돈다")
    ap.add_argument("--reviewed", action="store_true", help="앞 절반 표본 검수를 마쳤다 — 뒤 절반 문제지를 낸다")
    ap.add_argument("--reset-solve-plan", action="store_true", help="앞·뒤 절반을 새로 가른다")
    a = ap.parse_args()

    lines: list[str] = []

    def say(s: str) -> None:
        print(s, flush=True)
        lines.append(s)

    n = {"ok": 0, "wait": 0, "hold": 0, "skip": 0, "gave": 0, "gave_now": 0}
    blind = pathlib.Path(os.path.abspath(a.blind_root))
    if blind == REPO or REPO in blind.parents:
        raise SystemExit(
            "🛑 문제지 폴더가 저장소 안이다 — 저장소에는 정답이 든 drafts.json 이 있어 풀이자가 눈을 뜬다. "
            "--blind-root 를 저장소 밖으로 (기본값: grok 워크트리)")
    todo: list[Exam] = []
    if a.exam_dir:
        dirs = [pathlib.Path(os.path.abspath(d)) for d in a.exam_dir]
        parents = {d.parent for d in dirs}
        if len(parents) != 1:
            raise SystemExit("--exam-dir 는 한 폴더 밑의 편들만 받는다(절반 계획이 그 폴더에 적힌다)")
        exams_dir = parents.pop()
        for d in dirs:
            cfg = json.loads((d / "exam.json").read_text(encoding="utf-8"))
            todo.append(Exam(d, {k: cfg[k] for k in ("examId", "school", "grade", "subject")}))
    else:
        exams_dir = pathlib.Path(os.path.abspath(a.exams_dir))
        root = pathlib.Path(os.path.abspath(a.source_root))
        jobs, skips, other_grade, hwp_only = discover(a)
        for stem, why in skips:
            say(f"— 건너뜀 {stem} · {why}")
            n["skip"] += 1
        ids: dict[str, list] = {}
        for pdf, _, meta in jobs:
            ids.setdefault(meta["examId"], []).append(pdf)
        for pdf, hwp, meta in jobs:
            eid = meta["examId"]
            d = exams_dir / eid
            try:
                rel = pathlib.Path(os.path.abspath(pdf)).relative_to(root).as_posix()
            except ValueError:
                rel = pathlib.Path(os.path.abspath(pdf)).as_posix()
            rel = unicodedata.normalize("NFC", rel)
            if len(ids[eid]) > 1:
                say(f"⏸ {eid} · examId 가 겹친다 — {[p.name for p in ids[eid]]}")
                n["hold"] += 1
            elif (d / "exam-load-ledger.json").exists():
                say(f"— 건너뜀 {eid} · 이미 적재(exam-load-ledger.json)")
                n["skip"] += 1
            elif d.exists() and not (d / "batch-state.json").exists():
                say(f"⏸ {eid} · 편 폴더가 이미 있는데 드라이버가 세운 것이 아니다 — "
                    "원장 없이 적재된 편일 수 있다(정화중처럼). 사람이 정할 것")
                n["hold"] += 1
            elif (d / "source_path.txt").exists() and \
                    (d / "source_path.txt").read_text(encoding="utf-8").strip() != rel:
                say(f"⏸ {eid} · 같은 examId 가 다른 원본을 가리킨다")
                n["hold"] += 1
            else:
                todo.append(Exam(d, meta, pdf, hwp, rel))
        if hwp_only:
            say(f"— HWP 만 있고 짝 PDF 가 없는 것 {len(hwp_only)}개 — 건너뜀(목록은 .batch-last-run.txt)")
            lines.extend(f"   HWP 만: {s}" for s in hwp_only)
        if other_grade:
            lines.append(f"   학년 태그가 {a.grade} 가 아니라 뺀 PDF {other_grade}개")
    for ex in todo:
        ex.sheet = blind / ex.dir.name

    if a.list:
        for ex in todo:
            say(f"· {ex.dir.name} {ex.meta['school']} {ex.meta['grade']} ← {ex.pdf.name if ex.pdf else ex.dir}")
        say(f"계획 — 할 것 {len(todo)} · 건너뜀 {n['skip']} · 보류 {n['hold']} (아무것도 안 썼다)")
        return 0

    exams_dir.mkdir(parents=True, exist_ok=True)
    lock = take_lock(exams_dir)
    last_run = exams_dir / ".batch-last-run.txt"
    aborted = halfway = False
    try:
        # 대량 풀이는 두 번에 나눈다 — 앞 절반 채점이 끝나면 멈추고 메인이 표본을 본다.
        plan_path = exams_dir / "solve-plan.json"
        ids_now = sorted(ex.dir.name for ex in todo)
        if plan_path.exists() and not a.reset_solve_plan:
            PLAN.update(json.loads(plan_path.read_text(encoding="utf-8")))
            known = set(PLAN["first"]) | set(PLAN["second"])
            PLAN["second"] += [i for i in ids_now if i not in known]
        else:
            half = (len(ids_now) + 1) // 2
            PLAN.update({"first": ids_now[:half], "second": ids_now[half:], "reviewed": False})
        if a.reviewed and not PLAN["reviewed"]:
            PLAN["reviewed"] = time.strftime("%Y-%m-%d %H:%M:%S")
        write_json_atomic(plan_path, PLAN)

        start = STAGE_KEYS.index(a.from_stage) if a.from_stage else 0
        ran = 0
        for ex in todo:
            eid = ex.dir.name
            if a.limit is not None and ran >= a.limit:
                say(f"— 건너뜀 {eid} · --limit {a.limit}")
                n["skip"] += 1
                continue
            if ex.state.get("gaveUp") and not a.retry_gave_up:
                g = ex.state["gaveUp"]
                say(f"⏹ {eid} · {g['stage']} — 포기(시도 {MAX_ATTEMPTS}회): {g['why']} · --retry-gave-up 로 다시")
                n["gave"] += 1
                continue
            if a.retry_gave_up:
                ex.state["gaveUp"], ex.state["attempts"] = None, {}
            if not (ex.dir / "exam.json").exists():
                ex.dir.mkdir(parents=True, exist_ok=True)
                write_exam_json(ex.dir, {**ex.meta, "hand": [], "units": {}})
            ex.save()  # 드라이버가 세운 편이라는 표시이자 «어디까지 했나»
            ran += 1
            ex.current = STAGES[0]
            ex.log(f"════ 실행 시작 — {' '.join(sys.argv[1:])}")
            try:
                process(ex, start)
                say(ok_line(ex))
                n["ok"] += 1
            except NotYet as w:
                say(f"⏳ {eid} · {ex.current.key} {ex.current.name} — {w}")
                n["wait"] += 1
            except Hold as h:
                ex.log(f"⏸ {h}")
                say(f"⏸ {eid} · {ex.current.key} {ex.current.name} — {h}")
                n["hold"] += 1
            except Abort as ab:
                ex.log(f"🛑 {ab}")
                say(f"🛑 {eid} · {ex.current.key} {ex.current.name} — {ab} — 배치를 멈춘다")
                n["hold"] += 1
                aborted = True
                break
            except Exception as e:  # noqa: BLE001 — Fail 과 뜻밖의 예외는 횟수를 센다
                import traceback
                ex.log(traceback.format_exc())
                k = ex.state["attempts"].get(ex.current.key, 0) + 1
                ex.state["attempts"][ex.current.key] = k
                why = str(e) if isinstance(e, Fail) else f"{type(e).__name__}: {e}"
                if k >= MAX_ATTEMPTS:
                    ex.state["gaveUp"] = {"stage": ex.current.key, "why": why[:160]}
                    say(f"⏹ {eid} · {ex.current.key} {ex.current.name} — {why[:120]} "
                        f"(시도 {k}/{MAX_ATTEMPTS} — 포기)")
                    n["gave"] += 1
                    n["gave_now"] += 1
                else:
                    say(f"⏸ {eid} · {ex.current.key} {ex.current.name} — {why[:120]} (시도 {k}/{MAX_ATTEMPTS})")
                    n["hold"] += 1
                ex.save()

        if not aborted and not PLAN["reviewed"] and PLAN["first"]:
            first = [exams_dir / i for i in PLAN["first"]]
            issued = [d for d in first if "8" in _state_of(d)["done"]]
            waiting = [d for d in first if d not in issued]
            if issued and all(graded(d) for d in issued):
                halfway = True
                say(f"🔶 절반 지점 — 메인 표본 검수 후 재개 · 앞 절반 채점 끝 {len(issued)}편"
                    + (f"(보류로 채점 전 {len(waiting)}편)" if waiting else "")
                    + f" · 뒤 절반 {len(PLAN['second'])}편은 문제지를 안 냈다"
                    " · 표본에 «그림에서 값을 읽는 문항»(산점도·표·그래프)을 넣을 것 · 재개: --reviewed")
        say(f"끝 — ✅ {n['ok']} · ⏳ {n['wait']} · ⏸ {n['hold']} · 건너뜀 {n['skip']} · 포기 {n['gave']}"
            + (f"(이번에 {n['gave_now']})" if n["gave_now"] else "")
            + f" · 줄 전부 {last_run.as_posix()}")
    finally:
        last_run.write_text("\n".join(lines) + "\n", encoding="utf-8")
        lock.unlink(missing_ok=True)
    if aborted:
        return 3
    if halfway:
        return 4
    return 1 if n["hold"] or n["gave_now"] else 0


if __name__ == "__main__":
    sys.exit(main())
