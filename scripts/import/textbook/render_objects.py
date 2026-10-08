# -*- coding: utf-8 -*-
"""자료 표를 그림으로 — 한글이 그린 그대로 (교과서 이관 · 2026-10-08).

  python render_objects.py <작업 폴더> [--extract extract5] [--kind tables|groups] [--out objects] [--keys k1,k2,…] [--limit N]

`--kind groups` 는 자료 표 대신 **라벨 · 선과 묶인 그림**(묶음 개체 `hp:container`)을 묶음째 그린다 — 그림 파일만 꺼내면
라벨(A, B, x …)이 빠진다. 기본 출력 폴더는 `objects-groups`, 색인의 칸은 `group`.

문제은행은 표를 글로 싣지 않는다 — 그림으로 붙인다. 표의 칸에는 수식 · 그림 · 테두리 · 칸 합치기가 있어 우리가 다시 그리면
어긋난다. 그래서 **한글이 그리게 한다**:

  ① 원본 HWPX 에서 그 표의 XML 을 떼어, 표만 든 작은 HWPX 를 짓는다(글꼴 · 테두리 정의 `header.xml` · 그림은 그대로).
     표마다 쪽을 나눠 한 쪽에 표 하나가 서게 한다. 떠 있던 표는 글자처럼(`treatAsChar`) 둔다.
  ② 한글로 PDF 를 낸다 — **창을 안 띄운다**(별도 데스크톱 · 창 숨김 · 대화상자 자동응답 — `convert_batch.py` 와 같은 장치).
     🔴 원장님이 띄운 한글은 건드리지 않는다 — 이 스크립트는 제 한글 객체를 따로 띄운다.
  ③ PDF 의 쪽마다 **잉크가 있는 둘레**로 오린다 — 낮은 해상도로 그려 흰 바탕이 아닌 곳의 둘레를 재고, 그 둘레만 다시 그린다.
     쪽 수가 표 수와 다르면(표 하나가 두 쪽에 걸쳤다) 그 파일의 표를 하나씩 따로 그린다.

쓰는 것: `<out>/img/<key>/t<번호>.png|jpg` · `<out>/index.jsonl`(key · table · file · px · mm · sha · error)
다시 돌리면 `index.jsonl` 에 있는 파일(key)은 건너뛴다.
"""
from __future__ import annotations

import collections
import copy
import hashlib
import io
import json
import pathlib
import re
import sys
import time
import xml.etree.ElementTree as ET
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).parent))

from hwpx_flow import HP, drawable_objects  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO = pathlib.Path(__file__).resolve().parents[3]
#: 잉크를 재는 해상도 · 오려 그리는 해상도(dpi)
PROBE_DPI = 60
RENDER_DPI = 300
#: 흰 바탕으로 보지 않는 밝기(0~255 를 뒤집은 값) — 옅은 회색 칸 바탕도 잉크로 센다
INK = 12
#: 오린 둘레 밖에 남길 여백(px, RENDER_DPI 기준)
MARGIN = 6
RESTART_EVERY = 40


def section_names(z: zipfile.ZipFile) -> list[str]:
    return sorted(
        (n for n in z.namelist() if re.match(r"Contents/section\d+\.xml$", n)),
        key=lambda n: int(re.search(r"(\d+)", n).group(1)),
    )


def register_namespaces(xml: str) -> None:
    """원본의 이름표(`hp:` · `hc:` …)를 그대로 쓰게 한다 — 안 하면 `ns0:` 로 나와 한글이 못 읽는다."""
    for prefix, uri in re.findall(r'xmlns:(\w+)="([^"]+)"', xml[:4000]):
        ET.register_namespace(prefix, uri)


def inline_copy(table: ET.Element) -> str:
    """표를 글자처럼 두고(떠 있던 자리를 버린다) XML 글로."""
    element = copy.deepcopy(table)
    pos = element.find(HP + "pos")
    if pos is not None:
        pos.set("treatAsChar", "1")
        pos.set("affectLSpacing", "0")
    return ET.tostring(element, encoding="unicode")


def mini_section(first_section: str, objects: list[str]) -> str:
    """원본 첫 구역의 머리(이름표 · 쪽 설정 `secPr`)에 개체만 담은 구역. 첫 개체 뒤로는 쪽을 나눈다.
    다단(`colPr`) · 머리말 · 쪽 번호는 담지 않는다 — 표 하나가 한 단의 폭에 갇히거나, 쪽에 다른 글자가 찍히지 않게."""
    head_end = first_section.index("?>") + 2 if first_section.startswith("<?xml") else 0
    root_start = first_section.index("<hs:sec")
    root_open = first_section[root_start : first_section.index(">", root_start) + 1]
    start = first_section.index("<hp:secPr")
    close = first_section.find("</hp:secPr>", start)
    sec_pr = first_section[start : close + len("</hp:secPr>")] if close != -1 else first_section[start : first_section.index("/>", start) + 2]
    paragraphs = []
    for index, xml in enumerate(objects):
        lead = sec_pr if index == 0 else ""
        page_break = "0" if index == 0 else "1"
        paragraphs.append(
            f'<hp:p id="0" paraPrIDRef="0" styleIDRef="0" pageBreak="{page_break}" columnBreak="0" merged="0">'
            f'<hp:run charPrIDRef="0">{lead}{xml}</hp:run></hp:p>'
        )
    return first_section[:head_end] + root_open + "".join(paragraphs) + "</hs:sec>"


def fresh(info: zipfile.ZipInfo) -> zipfile.ZipInfo:
    """원본의 항목 정보를 새로 — `writestr` 는 받은 ZipInfo 를 고쳐 쓴다(같은 원본을 다시 읽으면 CRC 가 안 맞는다)."""
    copy_ = zipfile.ZipInfo(info.filename, info.date_time)
    copy_.compress_type = info.compress_type
    copy_.external_attr = info.external_attr
    return copy_


def drop_sections(name: str, text: str, gone: list[str]) -> str:
    """지운 구역을 가리키는 곳을 걷는다 — 목록(`content.hpf`) · 관계(`container.rdf`) · 머리의 구역 수(`secCnt`).
    하나라도 남으면 한글이 문서를 못 연다(«Open 실패» — 2026-10-08 시험에서)."""
    if not gone:
        return text
    if name == "Contents/content.hpf":
        for section in gone:
            stem = pathlib.PurePosixPath(section).stem
            text = re.sub(rf'<opf:item [^>]*href="{re.escape(section)}"[^>]*/>', "", text)
            text = re.sub(rf'<opf:itemref [^>]*idref="{re.escape(stem)}"[^>]*/>', "", text)
    elif name == "META-INF/container.rdf":
        for section in gone:
            text = re.sub(rf'<rdf:Description rdf:about="">\s*<\w+:hasPart [^>]*rdf:resource="{re.escape(section)}"\s*/>\s*</rdf:Description>', "", text)
            text = re.sub(rf'<rdf:Description rdf:about="{re.escape(section)}">.*?</rdf:Description>', "", text, flags=re.S)
    elif name == "Contents/header.xml":
        text = re.sub(r'secCnt="\d+"', 'secCnt="1"', text, count=1)
    return text


def mini_hwpx(source: pathlib.Path, objects: list[str], out: pathlib.Path) -> None:
    """원본 HWPX 를 그대로 베끼되, 구역은 개체만 든 첫 구역 하나로."""
    with zipfile.ZipFile(source) as z:
        sections = section_names(z)
        gone = sections[1:]
        first = z.read(sections[0]).decode("utf-8")
        with zipfile.ZipFile(out, "w") as w:
            for info in z.infolist():
                if info.filename in gone:
                    continue
                data = z.read(info.filename)
                if info.filename == sections[0]:
                    data = mini_section(first, objects).encode("utf-8")
                elif info.filename in ("Contents/content.hpf", "META-INF/container.rdf", "Contents/header.xml"):
                    data = drop_sections(info.filename, data.decode("utf-8"), gone).encode("utf-8")
                w.writestr(fresh(info), data)


def ink_crop(page, fitz, Image, ImageOps):
    """쪽에서 잉크가 있는 둘레만 RENDER_DPI 로 그린 회색 그림. 잉크가 없으면 None."""
    low = page.get_pixmap(dpi=PROBE_DPI, colorspace=fitz.csGRAY)
    probe = Image.frombytes("L", (low.width, low.height), low.samples)
    box = ImageOps.invert(probe).point(lambda v: 255 if v > INK else 0).getbbox()
    if not box:
        return None
    scale = 72 / PROBE_DPI
    pad = 2 * scale
    rect = fitz.Rect(box[0] * scale - pad, box[1] * scale - pad, box[2] * scale + pad, box[3] * scale + pad) & page.rect
    pix = page.get_pixmap(dpi=RENDER_DPI, clip=rect, colorspace=fitz.csGRAY)
    image = Image.frombytes("L", (pix.width, pix.height), pix.samples)
    tight = ImageOps.invert(image).point(lambda v: 255 if v > INK else 0).getbbox()
    if tight:
        image = image.crop(
            (max(0, tight[0] - MARGIN), max(0, tight[1] - MARGIN), min(image.width, tight[2] + MARGIN), min(image.height, tight[3] + MARGIN))
        )
    return image


class Hangul:
    """창을 안 띄우는 한글 객체 — 별도 데스크톱에서 띄우고, 문서를 열 때마다 창을 숨긴다."""

    def __init__(self) -> None:
        sys.path.insert(0, str(REPO / "scripts" / "qa"))
        sys.path.insert(0, str(REPO / "scripts" / "vendor" / "testchanger"))
        import hwp_to_hwpx_quiet as quiet  # noqa: E402

        self.quiet = quiet
        if not quiet.isolate_desktop("tbrender"):
            raise SystemExit("별도 데스크톱에 못 붙었다 — 창이 뜰 수 있어 멈춘다")
        from core import hwp_com  # noqa: E402

        self.hwp_com = hwp_com
        hwp_com.ensure_com_initialized()
        self.app = None
        self.used = 0

    def start(self) -> None:
        import win32com.client  # noqa: E402

        app = win32com.client.Dispatch("HWPFrame.HwpObject")
        for call in (
            lambda: app.SetMessageBoxMode(0xFFFFFF),
            lambda: self.hwp_com._register_security_module(),
            lambda: app.RegisterModule("FilePathCheckDLL", "FilePathCheckerModule"),
        ):
            try:
                call()
            except Exception:  # noqa: BLE001
                pass
        self.quiet._hide(app)
        self.app = app
        self.used = 0

    def stop(self) -> None:
        if self.app is not None:
            try:
                self.app.Quit()
            except Exception:  # noqa: BLE001
                pass
        self.app = None

    def to_pdf(self, hwpx: pathlib.Path, pdf: pathlib.Path) -> None:
        if self.app is None or self.used >= RESTART_EVERY:
            self.stop()
            self.start()
        try:
            if not self.app.Open(str(hwpx.resolve()), "HWPX", "forceopen:true"):
                raise RuntimeError("Open 실패")
            self.quiet._hide(self.app)
            self.app.SaveAs(str(pdf.resolve()), "PDF", "")
            try:
                self.app.Clear(1)
            except Exception:  # noqa: BLE001
                pass
        except Exception:
            self.stop()
            raise
        finally:
            self.used += 1
        if not pdf.exists() or pdf.stat().st_size == 0:
            raise RuntimeError("PDF 없음")


def wanted_groups(rows: list[dict]) -> dict[str, list[int]]:
    """묶음째 그릴 묶음 — 답이 붙은 평가 문항에 딸린, 그림이 든 묶음만(파일마다 번호 차례로)."""
    by_key: dict[str, set[int]] = collections.defaultdict(set)
    for row in rows:
        if row.get("kind") != "assessment" or not row.get("isQuestion", True) or not row.get("answer"):
            continue
        for fig in row.get("figs") or []:
            if fig.get("grouped") and fig.get("group"):
                by_key[row["key"]].add(fig["group"])
    return {key: sorted(groups) for key, groups in sorted(by_key.items())}


def wanted_tables(rows: list[dict]) -> dict[str, list[int]]:
    """그림으로 그릴 자료 표 — 답이 붙은 평가 문항의 표만(파일마다 번호 차례로)."""
    by_key: dict[str, set[int]] = collections.defaultdict(set)
    for row in rows:
        if row.get("kind") != "assessment" or not row.get("isQuestion", True) or not row.get("answer"):
            continue
        for table in row.get("tableIds") or []:
            by_key[row["key"]].add(table)
    return {key: sorted(tables) for key, tables in sorted(by_key.items())}


def main() -> None:
    import fitz  # noqa: E402 — PyMuPDF
    from PIL import Image, ImageOps  # noqa: E402

    from figures import encode  # noqa: E402

    root = pathlib.Path(sys.argv[1])
    option = lambda name, default: sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default  # noqa: E731
    kind = option("--kind", "tables")
    field, prefix = ("group", "g") if kind == "groups" else ("table", "t")
    out = root / option("--out", "objects-groups" if kind == "groups" else "objects")
    work = out / "work"
    (out / "img").mkdir(parents=True, exist_ok=True)
    work.mkdir(parents=True, exist_ok=True)
    rows = [json.loads(line) for line in (root / option("--extract", "extract5") / "problems.jsonl").open(encoding="utf-8")]
    wanted = wanted_groups(rows) if kind == "groups" else wanted_tables(rows)
    if "--keys" in sys.argv:
        keep = set(option("--keys", "").split(","))
        wanted = {key: tables for key, tables in wanted.items() if key in keep}
    index_path = out / "index.jsonl"
    done = set()
    if index_path.exists():
        done = {json.loads(line)["key"] for line in index_path.open(encoding="utf-8")}
    todo = [key for key in wanted if key not in done][: int(option("--limit", "100000"))]
    print(f"표 {sum(len(wanted[k]) for k in todo)} · 파일 {len(todo)} (이미 한 파일 {len(done)})", flush=True)

    hangul = Hangul()
    started = time.time()
    with index_path.open("a", encoding="utf-8") as index:
        for number, key in enumerate(todo, 1):
            source = root / "hwpx" / f"{key}.hwpx"
            tables = wanted[key]
            with zipfile.ZipFile(source) as z:
                register_namespaces(z.read(section_names(z)[0]).decode("utf-8"))
            tables_of, groups_of = drawable_objects(source)
            elements = groups_of if kind == "groups" else tables_of
            results: dict[int, dict] = {}
            xml_of = {}
            for table in tables:
                if table not in elements:
                    results[table] = {"error": "개체를 못 찾았다"}
                    continue
                xml_of[table] = inline_copy(elements[table])

            def render(group: list[int]) -> list | None:
                mini = work / f"{key}-{group[0]}.hwpx"
                pdf = mini.with_suffix(".pdf")
                mini_hwpx(source, [xml_of[t] for t in group], mini)
                hangul.to_pdf(mini, pdf)
                with fitz.open(pdf) as doc:
                    if len(doc) != len(group):
                        return None
                    images = [ink_crop(doc[i], fitz, Image, ImageOps) for i in range(len(doc))]
                mini.unlink(missing_ok=True)
                pdf.unlink(missing_ok=True)
                return images

            ready = [t for t in tables if t in xml_of]
            images: dict[int, object] = {}
            try:
                together = render(ready) if ready else []
                if together is not None:
                    images = dict(zip(ready, together))
                else:
                    # 쪽 수가 안 맞는다 — 표가 두 쪽에 걸쳤다. 하나씩 따로 그린다
                    for table in ready:
                        alone = render([table])
                        if alone is None:
                            results[table] = {"error": "표가 한 쪽에 안 든다"}
                        else:
                            images[table] = alone[0]
            except Exception as error:  # noqa: BLE001
                for table in ready:
                    results.setdefault(table, {"error": f"{type(error).__name__}: {error}"[:200]})
            for table, image in images.items():
                if image is None:
                    results[table] = {"error": "빈 쪽"}
                    continue
                data, extension = encode(image)
                file = f"{key}/{prefix}{table}{extension}"
                target = out / "img" / file
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                digest = hashlib.sha1(ET.tostring(elements[table])).hexdigest()[:16]
                results[table] = {
                    "file": file,
                    "px": [image.width, image.height],
                    "mm": round(image.width / RENDER_DPI * 25.4, 1),
                    "sha": f"{prefix}{digest}",
                }
            for table in tables:
                index.write(json.dumps({"key": key, field: table, **results.get(table, {"error": "그리지 못했다"})}, ensure_ascii=False) + "\n")
            index.flush()
            if number % 20 == 0 or number == len(todo):
                print(f"{number}/{len(todo)} · {time.time() - started:.0f}초", flush=True)
    hangul.stop()


if __name__ == "__main__":
    main()
