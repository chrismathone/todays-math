# -*- coding: utf-8 -*-
"""교과서 HWP → HWPX 일괄 변환 — **창을 안 띄운다**(별도 데스크톱 · 숨김 · 대화상자 자동응답).

저장소의 `scripts/qa/hwp_to_hwpx_quiet.py` 와 같은 안전장치를 쓰되, 한글 객체를 파일마다 새로 띄우지 않고
**한 객체로 여러 파일**을 연다(50편마다 새로 띄운다). 원본은 읽기만 한다 — 작업 폴더로 복사해 연다.
다시 돌리면 이미 바꾼 파일은 건너뛴다(manifest 의 ok 줄).

  python convert_batch.py <일꾼 번호> <일꾼 수> <출력 폴더> <triage.json>
"""
import hashlib
import json
import pathlib
import re
import shutil
import sys
import time

REPO = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "scripts" / "qa"))
sys.path.insert(0, str(REPO / "scripts" / "vendor" / "testchanger"))

import hwp_to_hwpx_quiet as quiet  # noqa: E402

KINDS = {"문제", "문제 의심", "정답·해설", "미리보기 없음"}
RESTART_EVERY = 50

worker, workers = int(sys.argv[1]), int(sys.argv[2])
out_root = pathlib.Path(sys.argv[3])
rows = json.loads(pathlib.Path(sys.argv[4]).read_text(encoding="utf-8"))
hwpx_dir = out_root / "hwpx"
work_dir = out_root / f"work{worker}"
hwpx_dir.mkdir(parents=True, exist_ok=True)
work_dir.mkdir(parents=True, exist_ok=True)
manifest = out_root / f"manifest{worker}.jsonl"

done = set()
for path in out_root.glob("manifest*.jsonl"):
    for line in path.read_text(encoding="utf-8").splitlines():
        item = json.loads(line)
        if item.get("ok"):
            done.add(item["path"])

targets = [row["path"] for row in rows if row["kind"] in KINDS]
targets = [p for i, p in enumerate(sorted(targets)) if i % workers == worker and p not in done]
print(f"일꾼 {worker}/{workers} — 할 것 {len(targets)}", flush=True)

if not quiet.isolate_desktop(f"tbconv{worker}"):
    sys.exit("별도 데스크톱에 못 붙었다 — 창이 뜰 수 있어 멈춘다")

from core import hwp_com  # noqa: E402
hwp_com.ensure_com_initialized()
import win32com.client  # noqa: E402


def key_of(path: str) -> str:
    return hashlib.sha1(path.encode("utf-8")).hexdigest()[:16]


def start():
    app = win32com.client.Dispatch("HWPFrame.HwpObject")
    for call in (
        lambda: app.SetMessageBoxMode(0xFFFFFF),
        lambda: hwp_com._register_security_module(),
        lambda: app.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule"),
    ):
        try:
            call()
        except Exception:
            pass
    quiet._hide(app)
    return app


def stop(app):
    try:
        app.Quit()
    except Exception:
        pass


app = start()
used = 0
with manifest.open("a", encoding="utf-8") as log:
    for index, src in enumerate(targets):
        source = pathlib.Path(src)
        key = key_of(src)
        local = work_dir / f"{key}{source.suffix.lower()}"
        out = hwpx_dir / f"{key}.hwpx"
        started = time.time()
        entry = {"path": src, "key": key}
        try:
            if source.suffix.lower() == ".hwpx":
                shutil.copy2(source, out)
            else:
                shutil.copy2(source, local)
                if not app.Open(str(local.resolve()), "HWP", "forceopen:true"):
                    raise RuntimeError("Open 실패")
                quiet._hide(app)
                app.SaveAs(str(out.resolve()), "HWPX", "")
                try:
                    app.Clear(1)  # 문서 닫기(저장하지 않음)
                except Exception:
                    pass
                local.unlink(missing_ok=True)
            if not out.exists() or out.stat().st_size == 0:
                raise RuntimeError("HWPX 없음")
            entry.update(ok=True, bytes=out.stat().st_size)
        except Exception as error:  # noqa: BLE001
            entry.update(ok=False, error=f"{type(error).__name__}: {error}"[:300])
            stop(app)
            app = start()
            used = 0
        entry["sec"] = round(time.time() - started, 2)
        log.write(json.dumps(entry, ensure_ascii=False) + "\n")
        log.flush()
        used += 1
        if used >= RESTART_EVERY:
            stop(app)
            app = start()
            used = 0
        if index % 25 == 0:
            print(f"{index + 1}/{len(targets)} {entry['sec']}s {'ok' if entry.get('ok') else entry.get('error')}", flush=True)
stop(app)
print("끝", flush=True)
