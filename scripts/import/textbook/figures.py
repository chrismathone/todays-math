# -*- coding: utf-8 -*-
"""그림 문항의 그림을 가리고 꺼낸다 (교과서 이관 · 2026-10-08).

  python figures.py <작업 폴더> [--extract extract3] [--out figures] [--export]

원장님 2026-10-08: «그림부터 그럼 싹 마무리할것».

한글 파일 안의 그림은 **이미지 파일 그대로** 들어 있다(bmp · png · jpg). 오려 내지 않는다 — 파일을 꺼내 쓴다.
그러니 여기서 할 일은 둘이다: ① 그 그림이 문항의 그림인가 장식인가 ② 그 문항을 지금 실을 수 있는가.

## 그림 하나의 처분 (`fate`)

  keep      문항의 그림
  glyph     (추출이 이미 뺐다 — 번호 대신 쓴 작은 그림)
  shared    여러 자료(파일 넷 넘게)에 같은 그림이 있다 — 색 띠 · 로고 · 단원 표지. 두세 파일에 겹치는 것은 진짜 그림이다
            (같은 문항이 다른 자료에 또 실린 것 — 2026-10-08 에 꺼내 봤다)
  backdrop  글 뒤에 깔린 쪽 크기의 그림(쪽 배경)
  strip     가늘고 긴 띠(가로 세로 비 8 넘게) · 4mm 가 안 되는 줄
  flat      거의 한 색뿐인 그림(상자 바탕)

## 문항의 갈래 (`route`)

  figure    문항의 그림이 있고, 전부 문단에 바로 든 그림이다 → 지금 싣는다(이 파일이 내는 것)
  group     묶음 개체 안의 그림 · 한글로 그린 도형이 있다 → 그림 파일만으로는 다 안 그려진다(다음 단계)
  table     자료 표가 있다(다음 단계)
  text      장식을 빼면 그림이 없다 → 글만으로 된 문항이다(글 문항의 길로 보낸다)
  joined    한 덩이에 다른 문항의 번호가 들어 있다

쓰는 것(`<작업 폴더>/<out>/`):
  meta.jsonl            문항 하나에 한 줄 — id · route · 그림들(fate · 파일 · 크기)
  figure/problems.jsonl `prepare.py … --all` 이 읽는 꼴. 본문에 그림의 자리가 `[그림]` 으로 적혀 있다(문제은행의 표지)
  text/problems.jsonl   새로 글만으로 된 문항
  img/<key>/<id>-<n>.png  `--export` 일 때 — 회색 PNG, 가로 1,000 픽셀까지

그림의 자리: 추출이 본문에 `[[FIG:k]]` 로 적어 둔 것을, 남기는 그림은 `[그림]` 으로 바꾸고 버리는 그림은 걷는다.
`[그림]` 의 차례가 곧 그림 파일의 차례다 — 보기 줄(`① [그림]`)에 선 것이 그 보기의 그림이다.
"""
from __future__ import annotations

import collections
import hashlib
import io
import json
import pathlib
import re
import sys
import zipfile

from PIL import Image, ImageOps, ImageStat

sys.path.insert(0, str(pathlib.Path(__file__).parent))

from prepare import ANSWER_SOURCES, CONTENT_MAX, external_id, points_to_figure  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

#: 같은 그림이 이만큼의 **파일**에 있으면 장식이다
SHARED_FILES = 4
#: 번호 딱지 같은 작은 도형 — 이보다 작으면 그림으로 치지 않는다(HWPUNIT · 추출의 `GLYPH_PICTURE_MAX` 와 같은 값)
SMALL_SHAPE = 4000
#: 쪽 배경으로 볼 폭(mm)
BACKDROP_MM = 150
#: 띠로 볼 가로 세로 비 · 줄로 볼 굵기(mm)
STRIP_RATIO = 8
STRIP_MM = 4
#: 한 색뿐인 그림으로 볼 밝기 표준편차
FLAT_STDDEV = 6
#: 꺼내는 그림의 가로 상한(픽셀) — 인쇄 폭 상한 70mm 에서 360dpi 다
EXPORT_MAX_WIDTH = 1000
#: 잘라 보이기 값의 단위는 HWPUNIT(1/7200 인치)이고, 그림의 **제 크기**(픽셀 ÷ 해상도)를 잰 것이다 —
#: 96dpi 그림이면 1픽셀이 75, 300dpi 그림이면 24. 해상도가 안 적힌 그림은 96 으로 본다.
DEFAULT_DPI = 96

_TOKEN = re.compile(r"\[\[FIG:(\d+)\]\]")
#: 자료 표의 자리(`segment.Problem.marked_text`) — 표는 한글이 그린 그림으로 붙인다(`render_objects.py`)
_TABLE_TOKEN = re.compile(r"\[\[TBL:(\d+)\]\]")
_ANY_TOKEN = re.compile(r"\[\[(FIG|TBL):(\d+)\]\]")
MARKER = "[그림]"


def to_mm(hwpunit: int) -> float:
    return round(hwpunit / 7200 * 25.4, 2)


def open_image(data: bytes) -> Image.Image:
    """파일의 그림 → 흰 바탕의 RGB(투명한 자리는 흰색)."""
    image = Image.open(io.BytesIO(data))
    image.load()
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        rgba = image.convert("RGBA")
        white = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        return Image.alpha_composite(white, rgba).convert("RGB")
    return image.convert("RGB")


def clip_box(size: tuple[int, int], clip, dpi) -> tuple[int, int, int, int] | None:
    """잘라 보이기 값 → 픽셀 상자. 그림 전체면(또는 단위를 믿을 수 없으면) None — 자르지 않는다.

    🔴 단위를 그림 1픽셀 = 75 로 박아 뒀다가 300dpi 그림(1픽셀 = 24)의 «전체»를 왼쪽 위 3분의 1로 잘랐다 —
    보기 그림 다섯 장이 빈 그림 · 화살표 조각으로 나갔고, 시범 검토자가 «비어 있다»로 짚었다(2026-10-08).
    """
    if not clip:
        return None
    width, height = size
    try:
        dpi_x, dpi_y = (float(value) for value in dpi)
    except (TypeError, ValueError):
        dpi_x = dpi_y = 0.0
    unit_x = 7200 / dpi_x if dpi_x >= 30 else 7200 / DEFAULT_DPI
    unit_y = 7200 / dpi_y if dpi_y >= 30 else 7200 / DEFAULT_DPI
    left, top, right, bottom = clip[0] / unit_x, clip[1] / unit_y, clip[2] / unit_x, clip[3] / unit_y
    # 상자가 그림 밖으로 나가면 단위가 안 맞는 것이다 — 값을 믿지 않는다
    if right > width + 2 or bottom > height + 2:
        return None
    box = (max(0, round(left)), max(0, round(top)), min(width, round(right)), min(height, round(bottom)))
    # 그림 전체와 두 픽셀 안쪽 차이면 자르지 않는다(값의 반올림)
    if box[0] <= 2 and box[1] <= 2 and width - box[2] <= 2 and height - box[3] <= 2:
        return None
    # 왼 · 위가 0 이고 가로 세로 비가 그림과 같으면 «전체를 다른 단위로 적은 것»이다 — 해상도를 몰라도, 알아도.
    # 🔴 BMP 에 90dpi 가 적혀 있어도 한글은 1픽셀 = 75 로 적었다(224×169 → [0, 0, 16800, 12660]). 해상도 단위로 읽으면
    # 오른쪽 · 아래를 잘라 축 이름이 반쯤 잘렸다(2026-10-08 그림 지면 검토 시범이 짚었다)
    if clip[0] == 0 and clip[1] == 0:
        ratio_x, ratio_y = clip[2] / width, clip[3] / height
        if abs(ratio_x - ratio_y) <= 0.02 * max(ratio_x, ratio_y):
            return None
    if box[2] - box[0] < 4 or box[3] - box[1] < 4:
        return None
    return box


def render(data: bytes, fig: dict) -> Image.Image:
    """지면에 보이는 꼴로 — 잘라 보이기 · 뒤집기 · 돌리기 · 회색 · 가로 상한."""
    source = Image.open(io.BytesIO(data))
    dpi = source.info.get("dpi")
    image = open_image(data)
    box = clip_box(image.size, fig.get("clip"), dpi)
    if box:
        image = image.crop(box)
    flip_h, flip_v = fig.get("flip") or (False, False)
    if flip_h:
        image = ImageOps.mirror(image)
    if flip_v:
        image = ImageOps.flip(image)
    if fig.get("rot"):
        image = image.rotate(-fig["rot"], expand=True, fillcolor=(255, 255, 255))
    image = image.convert("L")
    if image.width > EXPORT_MAX_WIDTH:
        height = round(image.height * EXPORT_MAX_WIDTH / image.width)
        image = image.resize((EXPORT_MAX_WIDTH, height), Image.LANCZOS)
    return image


#: PNG 가 이보다 크면 JPEG 도 지어 본다 — 사진 · 삽화는 PNG 로 수백 KB 가 된다(선 그림은 몇 KB)
JPEG_TRY_BYTES = 60_000
#: JPEG 가 PNG 의 이 몫보다 작을 때만 JPEG 로 쓴다
JPEG_GAIN = 0.6


def encode(image: Image.Image) -> tuple[bytes, str]:
    """꺼낼 파일의 바이트와 확장자 — 선 그림은 PNG, 사진 · 삽화처럼 PNG 로 큰 것은 JPEG."""
    out = io.BytesIO()
    image.save(out, format="PNG", optimize=True)
    png = out.getvalue()
    if len(png) <= JPEG_TRY_BYTES:
        return png, ".png"
    out = io.BytesIO()
    image.save(out, format="JPEG", quality=88, optimize=True)
    jpeg = out.getvalue()
    return (jpeg, ".jpg") if len(jpeg) < JPEG_GAIN * len(png) else (png, ".png")


def is_flat(image: Image.Image) -> bool:
    small = image.convert("L").resize((64, 64))
    return ImageStat.Stat(small).stddev[0] < FLAT_STDDEV


def fate_of(fig: dict, files: int, flat: bool) -> str:
    width, height = to_mm(fig["w"]), to_mm(fig["h"])
    if files >= SHARED_FILES:
        return "shared"
    if fig.get("behind") and max(width, height) >= BACKDROP_MM:
        return "backdrop"
    if min(width, height) < STRIP_MM or max(width, height) >= STRIP_RATIO * max(0.1, min(width, height)):
        return "strip"
    if flat:
        return "flat"
    return "keep"


def ordered_figures(marked: str, keep: set[int], tables: set[int]) -> list[tuple[str, int]]:
    """본문의 자리 차례대로의 그림 — `("fig", k)` · `("tbl", 표 번호)`. 버린 그림 · 그리지 못한 표는 뺀다.
    그림 파일의 차례는 **이것**이다(본문의 `[그림]` 차례와 같아야 한다 — `place_markers` 와 같은 표지를 읽는다)."""
    out: list[tuple[str, int]] = []
    for match in _ANY_TOKEN.finditer(marked):
        kind, number = match.group(1), int(match.group(2))
        if (kind == "FIG" and number in keep) or (kind == "TBL" and number in tables):
            out.append(("fig" if kind == "FIG" else "tbl", number))
    return out


def place_markers(marked: str, keep: set[int], tables: set[int] | frozenset[int] = frozenset()) -> str:
    """`[[FIG:k]]` · `[[TBL:번호]]` → 남기는 그림 · 그린 표는 `[그림]`, 나머지는 걷는다. 빈 줄 · 겹친 빈칸을 다듬는다."""
    lines = []
    for line in marked.split("\n"):
        line = _TOKEN.sub(lambda m: MARKER if int(m.group(1)) in keep else "", line)
        line = _TABLE_TOKEN.sub(lambda m: MARKER if int(m.group(1)) in tables else "", line)
        line = re.sub(r" {2,}", " ", line).strip()
        if line:
            lines.append(line)
    return "\n".join(lines)


def rescue_strips(figs: list[dict], points: bool) -> None:
    """본문이 그림을 가리키는데 남긴 그림이 하나도 없으면, 띠로 보고 버린 그림을 되살린다(`fate` 를 `keep` 으로).

    수직선 · 한 직선 위의 점은 가로로 긴 띠다(75×8mm). 띠 규칙은 쪽을 가로지르는 색 띠를 걷으려는 것이라 이런 그림까지
    버렸다(2026-10-08 — «다음 수직선에서 네 점 A, B, C, D 가 나타내는 수» 의 그림이 없었다). 실오라기(굵기 `STRIP_MM` 미만)는
    되살리지 않는다. 되살린 그림이 이 문항의 그림인지는 검토자가 그림을 보고 가른다."""
    if not points or any(fig["fate"] == "keep" for fig in figs):
        return
    for fig in figs:
        if fig["fate"] == "strip" and min(to_mm(fig["w"]), to_mm(fig["h"])) >= STRIP_MM:
            fig["fate"] = "keep"
            fig["rescued"] = True


def decoration_groups(figs: list[dict]) -> set[int]:
    """든 그림이 전부 장식인 묶음의 번호 — 여러 파일에 겹치는 머리 띠 · 딱지를 글상자와 함께 묶어 둔 것이다."""
    with_pictures = {fig["group"] for fig in figs if fig.get("group")}
    return with_pictures - {fig["group"] for fig in figs if fig.get("group") and fig["fate"] == "keep"}


#: 굵기가 이보다 얇은 선은 구분선이다(HWPUNIT ≈ 1mm)
RULE_MAX = 300
#: 그림이 안 든 묶음이 이보다 얇으면 딱지 · 머리 띠다(HWPUNIT ≈ 12mm)
BADGE_MAX = 3400


def is_decoration_shape(shape: list, decor_groups, picture_groups) -> bool:
    """도형 하나가 꾸밈인가 — 구분선 · 장식뿐인 묶음 · 그림이 안 든 얇은 묶음(딱지 · 머리 띠)."""
    kind, width, height = shape[0], shape[1], shape[2]
    group = shape[3] if len(shape) > 3 else 0
    if kind == "line" and min(width, height) < RULE_MAX:
        return True
    if kind == "container" and group:
        if group in decor_groups:
            return True
        if group not in picture_groups and min(width, height) < BADGE_MAX:
            return True
    return False


#: 쪽 폭만 한 묶음(mm) · 넓고(mm) 얇은(mm) 묶음 — 쪽 머리 띠다
BANNER_PAGE_MM = 180
BANNER_WIDE_MM = 120
BANNER_THIN_MM = 30


def banner_groups(shape_list: list) -> set[int]:
    """쪽 머리 띠 꼴의 묶음 번호 — 그 안의 그림(캐릭터 · 제목 글씨)은 문항의 그림이 아니다."""
    out = set()
    for shape in shape_list or []:
        if shape[0] != "container" or len(shape) < 4:
            continue
        width, height = to_mm(shape[1]), to_mm(shape[2])
        if width >= BANNER_PAGE_MM or (width >= BANNER_WIDE_MM and height <= BANNER_THIN_MM):
            out.add(shape[3])
    return out


def fold_groups(kept: list[dict], drawn: set[int]) -> tuple[list[dict], dict[int, int]]:
    """한글이 묶음째 그린 묶음(`drawn`)의 그림들을 묶음 그림 하나로 접는다 — 첫 그림의 자리에 묶음 그림이 서고 나머지는 걷는다.
    돌려주는 것: 접은 목록 · {그 자리의 k: 묶음 번호}."""
    folded: list[dict] = []
    stand_in: dict[int, int] = {}
    seen: set[int] = set()
    for fig in kept:
        group = fig.get("group") or 0
        if fig.get("grouped") and group in drawn:
            if group in seen:
                continue
            seen.add(group)
            stand_in[fig["k"]] = group
            folded.append({**fig, "grouped": False})
        else:
            folded.append(fig)
    return folded, stand_in


def route_of(
    row: dict,
    kept: list[dict],
    decor_groups: set[int] | frozenset[int] = frozenset(),
    points: bool = True,
    tables_drawn: bool = False,
) -> str:
    """문항의 갈래. `points` — 본문이 그림 · 표를 가리킨다(`prepare.points_to_figure`).
    `tables_drawn` — 이 문항의 자료 표를 전부 그림으로 그렸다(`render_objects.py`). 그러면 표는 그림이다(`kept` 에 든다).

    남긴 그림이 없고 본문이 아무것도 가리키지 않으면 도형은 꾸밈이다(보기를 두른 상자 · 구분선 · 머리 상자 —
    2026-10-08 표본 215문항이 거의 다 그랬다). 글 문항으로 보내 검토자가 «글만으로 풀리나»를 가른다."""
    picture_groups = {fig.get("group") for fig in kept if fig.get("group")} | set(decor_groups)
    big_shapes = [
        shape
        for shape in row.get("shapeList") or []
        if max(shape[1], shape[2]) > SMALL_SHAPE and not is_decoration_shape(shape, decor_groups, picture_groups)
    ]
    if row.get("embeddedNumber") is not None:
        return "joined"
    if row.get("tables") and not tables_drawn:
        return "table"
    if not kept and not points:
        return "text"
    if big_shapes or any(fig["grouped"] for fig in kept):
        return "group"
    return "figure" if kept else "text"


def main() -> None:
    root = pathlib.Path(sys.argv[1])
    option = lambda name, default: sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default  # noqa: E731
    out = root / option("--out", "figures")
    export = "--export" in sys.argv
    rows = [json.loads(line) for line in (root / option("--extract", "extract3") / "problems.jsonl").open(encoding="utf-8")]
    ledger_path = root / "load" / "ledger.json"
    loaded = {row["externalId"] for row in json.loads(ledger_path.read_text(encoding="utf-8"))["problems"]} if ledger_path.exists() else set()
    # `--objects <폴더>` — 한글이 그린 자료 표(`render_objects.py`). 문항의 표를 전부 그렸으면 그 표는 그림이다
    objects_dir = root / option("--objects", "") if "--objects" in sys.argv else None
    drawn_tables: dict[tuple[str, int], dict] = {}
    decor_tables: set[tuple[str, int]] = set()
    if objects_dir is not None:
        files_of_table: dict[str, set[str]] = collections.defaultdict(set)
        for entry in map(json.loads, (objects_dir / "index.jsonl").open(encoding="utf-8")):
            if entry.get("file"):
                entry["img"] = hashlib.sha1((objects_dir / "img" / entry["file"]).read_bytes()).hexdigest()[:16]
                drawn_tables[(entry["key"], entry["table"])] = entry
                files_of_table[entry["img"]].add(entry["key"])
        # 같은 표가 넷 넘는 파일에 똑같이 그려졌다 — «반 · 번 · 이름» 칸 · 성취도 안내표 같은 꾸밈이다(그림의 `shared` 와 같은 규칙)
        decor_tables = {place for place, entry in drawn_tables.items() if len(files_of_table[entry["img"]]) >= SHARED_FILES}
    # `--groups <폴더>` — 한글이 묶음째 그린 «라벨 · 선과 묶인 그림»(`render_objects.py --kind groups`)
    groups_dir = root / option("--groups", "") if "--groups" in sys.argv else None
    drawn_groups: dict[tuple[str, int], dict] = {}
    if groups_dir is not None:
        for entry in map(json.loads, (groups_dir / "index.jsonl").open(encoding="utf-8")):
            if entry.get("file"):
                drawn_groups[(entry["key"], entry["group"])] = entry
    order_changed = 0

    # ── 그림 파일의 지문 — 같은 그림이 몇 파일에 있나(문항이든 아니든 전부 센다) ──
    by_key: dict[str, list[dict]] = collections.defaultdict(list)
    for row in rows:
        if row.get("figs"):
            by_key[row["key"]].append(row)
    digest_of: dict[tuple[str, str], str] = {}
    files_of: dict[str, set[str]] = collections.defaultdict(set)
    flat_of: dict[str, bool] = {}
    for key, items in sorted(by_key.items()):
        with zipfile.ZipFile(root / "hwpx" / f"{key}.hwpx") as z:
            names = {pathlib.PurePosixPath(n).stem: n for n in z.namelist() if n.startswith("BinData/")}
            for row in items:
                for fig in row["figs"]:
                    name = fig["bin"]
                    if name not in names or (key, name) in digest_of:
                        continue
                    data = z.read(names[name])
                    digest = hashlib.sha1(data).hexdigest()[:16]
                    digest_of[(key, name)] = digest
                    if digest not in flat_of:
                        try:
                            flat_of[digest] = is_flat(open_image(data))
                        except Exception:  # noqa: BLE001 — 못 여는 그림은 그림으로 치지 않는다
                            flat_of[digest] = True
        for row in items:
            for fig in row["figs"]:
                digest = digest_of.get((key, fig["bin"]))
                if digest:
                    files_of[digest].add(key)

    # ── 문항마다 ────────────────────────────────────────────────────────────
    (out / "figure").mkdir(parents=True, exist_ok=True)
    routes: collections.Counter[str] = collections.Counter()
    fates: collections.Counter[str] = collections.Counter()
    skipped: collections.Counter[str] = collections.Counter()
    seen: set[str] = set()
    exported = 0
    exported_bytes = 0
    with (out / "meta.jsonl").open("w", encoding="utf-8") as meta_out, (out / "figure" / "problems.jsonl").open(
        "w", encoding="utf-8"
    ) as figure_out, (out / "loaded.jsonl").open("w", encoding="utf-8") as loaded_out:
        for row in rows:
            if row.get("kind") != "assessment" or not row.get("isQuestion", True):
                continue
            if not row.get("answer") or row.get("answerFrom") not in ANSWER_SOURCES:
                continue
            if not (row.get("figs") or row.get("pictures") or row.get("shapes") or row.get("tables")):
                continue  # 그림 · 도형 · 표가 처음부터 없는 문항 — 글 문항의 길이 이미 다뤘다
            rid = external_id(row)
            if rid in seen:
                skipped["같은 열쇠가 두 번"] += 1
                continue
            seen.add(rid)
            figs = []
            for index, fig in enumerate(row.get("figs") or []):
                digest = digest_of.get((row["key"], fig["bin"]))
                fate = fate_of(fig, len(files_of.get(digest, ())), flat_of.get(digest, True)) if digest else "missing"
                figs.append({**fig, "k": index, "sha": digest, "fate": fate})
            table_ids = row.get("tableIds") or []
            real_tables = [table for table in table_ids if (row["key"], table) not in decor_tables]
            fates["decor-table"] += len(table_ids) - len(real_tables)
            tables_drawn = bool(table_ids) and all((row["key"], table) in drawn_tables for table in real_tables)
            banners = banner_groups(row.get("shapeList"))
            for fig in figs:
                # 자료 표의 칸 안 그림 — 표를 그린 그림에 들어 있다
                if fig.get("inTable") and fig["inTable"] in table_ids:
                    fig["fate"] = "in-table"
                # 쪽 머리 띠 꼴의 묶음 안 그림
                elif fig.get("grouped") and fig.get("group") in banners and fig["fate"] == "keep":
                    fig["fate"] = "banner"
            rescue_strips(figs, points_to_figure(row["content"]))
            for fig in figs:
                fates["rescued" if fig.get("rescued") else fig["fate"]] += 1
            kept = [fig for fig in figs if fig["fate"] == "keep"]
            # 묶음째 그린 묶음 — 그 묶음의 그림들을 묶음 그림 하나로 접는다(라벨이 얹힌 채로)
            group_ids = {fig["group"] for fig in kept if fig.get("grouped") and fig.get("group")}
            kept, stand_in = fold_groups(kept, {g for g in group_ids if (row["key"], g) in drawn_groups})
            tables = set(real_tables) if tables_drawn else set()
            route = route_of(
                row,
                kept + [{"grouped": False} for _ in tables],
                decoration_groups(figs),
                points_to_figure(row["content"]),
                tables_drawn=tables_drawn,
            )
            if rid in loaded:
                # 글만으로 된 문항으로 이미 실렸다 — 그런데 그림 · 도형이 딸려 있었다(번호가 있는 첫 문단의 것을 전에는 버렸다).
                # 장식뿐이면 그대로 두면 되고, 진짜 그림이 있으면 그 문항은 그림 없이 실린 것이다. 따로 적어 둔다.
                skipped["이미 실린 문항"] += 1
                skipped[f"이미 실린 문항 — {route}"] += 1
                kept_brief = [{"k": f["k"], "bin": f["bin"], "mm": [to_mm(f["w"]), to_mm(f["h"])], "grouped": f["grouped"]} for f in kept]
                loaded_out.write(json.dumps({"id": rid, "key": row["key"], "route": route, "kept": kept_brief, "shapeList": row.get("shapeList")}, ensure_ascii=False) + chr(10))
                # 진짜 그림이 있던 문항은 그림 문항의 길로 다시 보낸다 — 실린 줄을 그림과 함께 제자리에서 고친다
                if route != "figure":
                    continue
            keep_k = {fig["k"] for fig in kept}
            marked = row.get("contentFig")
            content = place_markers(marked, keep_k, tables) if marked else row["content"]
            if route in ("figure", "text") and len(content) > CONTENT_MAX:
                route = "long"
            if route == "figure" and re.search(r"풀이\s*참조|해설\s*참조", row["answer"]):
                route = "open"
            routes[route] += 1
            # 그림 파일의 차례 = 본문의 자리 차례(그림 · 표가 섞여도)
            order = ordered_figures(marked, keep_k, tables) if marked else [("fig", fig["k"]) for fig in kept]
            if [number for kind, number in order if kind == "fig"] != [fig["k"] for fig in kept]:
                order_changed += 1
            # 묶음 그림이 선 자리 — («grp», 묶음 번호)
            order = [("grp", stand_in[number]) if kind == "fig" and number in stand_in else (kind, number) for kind, number in order]
            by_k = {fig["k"]: fig for fig in kept}
            files = []
            sources = []
            for n, (kind, number) in enumerate(order, 1):
                if kind == "fig":
                    fig = by_k[number]
                    files.append({"n": n, "k": number, "file": f"{row['key']}/{rid}-{n}.png", "mm": to_mm(fig["w"]), "sha": fig["sha"], "grouped": fig["grouped"]})
                else:
                    drawn = (drawn_tables if kind == "tbl" else drawn_groups)[(row["key"], number)]
                    files.append({"n": n, "table" if kind == "tbl" else "group": number, "file": f"{row['key']}/{rid}-{n}.png", "mm": drawn["mm"], "sha": drawn["sha"], "grouped": False})
                sources.append((kind, number))
            if export and route == "figure":
                with zipfile.ZipFile(root / "hwpx" / f"{row['key']}.hwpx") as z:
                    names = {pathlib.PurePosixPath(n).stem: n for n in z.namelist() if n.startswith("BinData/")}
                    for item, (kind, number) in zip(files, sources):
                        if kind == "fig":
                            image = render(z.read(names[by_k[number]["bin"]]), by_k[number])
                            data, extension = encode(image)
                            size = [image.width, image.height]
                        else:
                            drawn = (drawn_tables if kind == "tbl" else drawn_groups)[(row["key"], number)]
                            data = ((objects_dir if kind == "tbl" else groups_dir) / "img" / drawn["file"]).read_bytes()
                            extension = pathlib.PurePosixPath(drawn["file"]).suffix
                            size = drawn["px"]
                        item["file"] = item["file"][: -len(".png")] + extension
                        target = out / "img" / item["file"]
                        target.parent.mkdir(parents=True, exist_ok=True)
                        target.write_bytes(data)
                        item["px"] = size
                        # 지면에 나가는 바이트의 지문 — 자르기 · 회색을 바꾸면 달라진다(지면 검토의 판정을 이것에 묶는다)
                        item["imgSha"] = hashlib.sha1(data).hexdigest()[:16]
                        exported += 1
                        exported_bytes += len(data)
            meta_out.write(json.dumps({"id": rid, "key": row["key"], "route": route, "figures": files, "dropped": [{"k": f["k"], "fate": f["fate"]} for f in figs if f["fate"] != "keep"]}, ensure_ascii=False) + "\n")
            # 그림이 장식뿐인 문항(text 갈래)은 글 문항이다 — `prepare.py --decor <이 meta.jsonl>` 이 추출에서 바로 고른다
            if route == "figure":
                figure_out.write(json.dumps({**row, "content": content, "figureCount": len(files)}, ensure_ascii=False) + "\n")
    print(json.dumps({"갈래": dict(routes.most_common()), "그림의 처분": dict(fates.most_common()), "건너뜀": dict(skipped), "꺼낸 그림": exported, "꺼낸 그림의 용량(MB)": round(exported_bytes / 1e6, 1), "그림 차례가 남긴 차례와 다른 문항": order_changed}, ensure_ascii=False))


if __name__ == "__main__":
    main()
