# -*- coding: utf-8 -*-
"""문단의 흐름 → 문항 · 정답 · 풀이 (교과서 이관 · 2026-10-07).

교과서 출판사 자료(평가 문제 · 형성평가 · 단원 마무리 …)는 한 파일에 «문제 → 정답 및 풀이»가 이어 붙은 꼴이 많다.
번호는 글자(`01` · `1` · `1.`)이거나 작은 그림이다. 출판사마다 꼴이 달라 한 규칙이 아니라 **차례**로 가른다.

**문항** — 문단 머리의 번호가 바로 앞 번호 + 1 이면 다음 문항이다. 번호가 다시 처음(1)으로 돌아가면
  · 그 문단이 물음이면 **새 묶음**(한 파일의 «기초 탄탄 → 실력 다지기»)이고
  · 물음이 아니면 **정답 칸**의 시작이다(«정답» 머리 없이 «기초 탄탄 문제 480쪽 / 01 ⑴ …»으로 시작하는 책).
  번호가 글에 없고 작은 그림(`Picture.is_glyph`)으로 시작하는 책은 그림의 차례가 번호다.
**정답 칸** — «정답 · 해설 · 풀이» 머리, 한 줄에 «번호 + 답»이 둘 이상 늘어선 줄(빠른 정답), 또는 위의 «물음 아닌 되돌아감».
  정답 칸의 번호는 **문항 번호와 같은 꼴만** 받는다(문항이 `01` 이면 `01` — 정답 칸의 소제목 «1 소수와 합성수»를 답으로 읽지 않게).
  번호가 다시 처음으로 돌아갈 때마다 줄기가 하나 끊긴다. 줄기마다 «짧은 답(빠른 정답)»인지 «풀이»인지를 보고,
  번호가 맞는 문항 묶음에 차례로 붙인다(빠른 정답 묶음들 → 풀이 묶음들 · 묶음마다 답 → 풀이 둘 다 된다).

못 가른 것을 **지어내지 않는다** — 번호가 어긋난 문단은 앞 문항의 본문으로 남고, 답이 없으면 비운다(보고서가 센다).
"""
from __future__ import annotations

import dataclasses
import re

from hwpx_flow import Para, Picture

CIRCLED = "①②③④⑤"

#: 문단 머리의 번호 — `01 다음…` · `1` · `1.` · `[1]` · `1)`. 수식(`$…$`)으로 시작하면 번호가 아니다.
_LEAD_NUMBER = re.compile(r"^\[?\s*(0?[1-9]|[1-9]\d)\s*(?:[.)\]]\s*|\s+|$|(?=\$))")
#: 여러 문항이 같이 쓰는 지시문 머리 — `[04~05] 다음 …`
_GROUP_STEM = re.compile(r"^\[\s*(\d{1,2})\s*[~∼\-]\s*(\d{1,2})\s*\]\s*(.*)$")
#: 정답 칸의 번호 — 0 채움 두 자리 뒤에 글이 바로 붙은 꼴(`02ㄷ만`)
_TIGHT_NUMBER = re.compile(r"^(0[1-9]|[1-9]\d)(?=[^\d\s.,)%°~∼:/-])")
#: «정답 및 풀이» 같은 머리
_ANSWER_HEAD = re.compile(
    r"^\s*[\[(<【]?\s*(?:빠른\s*)?(?:정답|해설|풀이|답안)(?:\s*(?:및|과|·|와)\s*(?:해설|풀이))?\s*[\])>】]?\s*(?:$|\||[:：])"
    r"|정답\s*(?:및|과)\s*(?:해설|풀이)|빠른\s*정답"
)
#: 한 줄 안의 «번호 + 답» 자리 — 빠른 정답 줄을 알아본다
_INLINE_MARK = re.compile(r"(?:^|(?<=\s))(0?[1-9]|[1-9]\d)\s+(?=\S)")
#: 문제의 물음 끝
_QUESTION_END = re.compile(
    r"(\?|구하시오|구하여라|고르시오|고르면|쓰시오|하시오|하여라|나타내시오|말하시오|답하시오|설명하시오|"
    # «~해 보자 · 봅시다» — 답을 적어 내는 물음은 아니지만 **활동 문항의 머리**다. 이것을 물음으로 안 보면
    # «1 표를 완성하고 … 나타내 보자» 에서 번호가 1로 돌아간 것을 «정답 칸이 시작됐다»로 읽는다
    r"구하면|인가|것은|값은|몇\s*개인가|보자\.?$|봅시다\.?$)"
)
#: 문항 안의 군더더기 — 이름 칸 · 쪽수 · 난이도 갈래 · 단원 제목 · 묶음 제목
_NOISE = re.compile(
    r"^(?:\d+\s*)?(?:학년\s*)?반\s*번\s*이름(?:\s*점수)?$|^교과서\s*\d+\s*쪽$|^(?:기본|발전|쌍둥이|심화|실력|도전)$"
    r"|^\[\s*\d+\s*[~∼-]\s*\d+\s*\]\s*(?:단답형|서술형|서답형|객관식)?$|^(?:단답형|서술형|서답형|객관식)$"
    r"|^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ](?:\s*[-.]\s*\d+)?\s*[.\-]?\s*[^$]{1,30}$"
    r"|^(?:소단원|대단원|중단원)\s*\S*\s*(?:평가|마무리|문제|확인)?[^$]{0,20}$"
    r"|^.{0,20}문제\s*\d+\s*쪽$|^\d+\s*쪽$"
    # «|계승|» — 문항 머리의 갈래 표지(비상 «계산력 강화 문제»)
    r"|^\|[^|$]{1,20}\|$"
)


@dataclasses.dataclass
class Fig:
    """문항에 딸린 그림 하나와 그 자리."""

    picture: Picture
    #: 이 그림이 든 줄(`lines` 의 번호). 줄 밖에 홀로 선 그림이면 그 **앞 줄**의 번호(맨 앞이면 -1)
    line: int
    #: 줄 안의 자리(글자 수) — 홀로 선 그림은 -1
    offset: int
    #: 자료 표의 칸 안에 든 그림이면 그 표의 번호 — 표를 그린 그림에 들어 있으므로 따로 자리를 두지 않는다
    in_table: int = 0


@dataclasses.dataclass
class Problem:
    #: 파일 안의 묶음 차례(0부터) — 번호가 다시 1로 돌아가면 하나 는다
    section: int
    number: int
    lines: list[str]
    pictures: list[Picture]
    #: 번호가 그림이었나(글이었나)
    glyph_number: bool = False
    #: 한글 도형(그린 그림)의 수
    shapes: int = 0
    #: `lines` 와 같은 길이 — 그 줄이 **자료 표**의 칸이면 그 표의 번호, 아니면 0.
    #: 문제은행은 표를 글로 싣지 않는다(그림으로 붙인다) — 표가 든 문항은 글만으로는 못 싣는다.
    line_tables: list[int] = dataclasses.field(default_factory=list)
    #: 그림과 그 자리(묶음 개체 안의 그림도) — 그림 문항을 실을 때 «보기 번호 뒤의 그림»인지 가린다.
    #: `pictures` 는 예전 그대로다(글만으로 된 문항을 가리는 규칙이 그것을 본다).
    figs: list[Fig] = dataclasses.field(default_factory=list)
    #: 도형 하나하나의 (종류, 가로, 세로) — `shapes` 와 같은 것을 센다
    shape_list: list[tuple[str, int, int]] = dataclasses.field(default_factory=list)

    def add_line(self, text: str, table_id: int = 0, *, head: bool = False) -> None:
        if head:
            self.lines.insert(0, text)
            self.line_tables.insert(0, table_id)
            for fig in self.figs:
                fig.line += 1
        else:
            self.lines.append(text)
            self.line_tables.append(table_id)

    def drop_last_line(self) -> None:
        self.lines.pop()
        self.line_tables.pop()
        for fig in self.figs:
            if fig.line >= len(self.lines):
                fig.line, fig.offset = len(self.lines) - 1, -1

    def attach(self, para: Para, line_text: str | None, *, skip: Picture | None = None) -> None:
        """이 문단의 그림을 단다 — `line_text` 는 이 문단에서 방금 넣은 줄(안 넣었으면 None).

        번호 대신 쓴 작은 그림(`is_glyph`)은 그림이 아니다. 줄이 문단 글의 뒷부분이면(번호를 뗀 것) 자리를 그만큼 당긴다.
        """
        last = len(self.lines) - 1
        for picture in (*para.pictures, *para.group_pictures):
            if picture is skip or picture.is_glyph:
                continue
            if line_text and picture.offset >= 0:
                if para.text.endswith(line_text):
                    offset = max(0, picture.offset - (len(para.text) - len(line_text)))
                else:
                    offset = len(line_text)
                self.figs.append(Fig(picture, last, offset, para.table_id))
            else:
                self.figs.append(Fig(picture, last, -1, para.table_id))

    def take_objects(self, para: Para) -> None:
        """번호가 있는 첫 문단의 그림 · 도형을 센다 — 전에는 이 문단의 것을 버려, 첫 문단에 그림이 든 문항이
        «그림 없는 문항»으로 읽혔다(2026-10-08 그림 문항을 하면서 찾았다)."""
        self.pictures.extend(p for p in para.pictures if not p.is_glyph)
        self.shapes += para.shapes
        self.shape_list.extend(para.shape_list)

    def release(self, para: Para) -> None:
        """이 문단에서 받은 그림 · 도형을 도로 내놓는다 — 닻이 다음 번호의 문단에 있었다(`segment` 의 `adopt`)."""
        gone = {id(picture) for picture in (*para.pictures, *para.group_pictures)}
        self.figs = [fig for fig in self.figs if id(fig.picture) not in gone]
        self.pictures = [picture for picture in self.pictures if id(picture) not in gone]
        self.shapes -= para.shapes
        for shape in para.shape_list:
            if shape in self.shape_list:
                self.shape_list.remove(shape)

    @property
    def marked_text(self) -> str:
        """본문에 그림의 자리를 `[[FIG:k]]`(k 는 `figs` 의 번호)로 적은 글 — 그림 문항을 싣는 쪽이 쓴다.

        자료 표는 칸의 글 대신 표 하나의 자리 `[[TBL:번호]]` 로 적는다(표는 그림으로 그려 붙인다 — `render_objects.py`).
        표 칸 안의 그림은 그 표의 그림에 들어 있으므로 자리를 따로 두지 않는다."""
        by_line: dict[int, list[tuple[int, int]]] = {}
        drawn = set(self.line_tables) - {0}
        for k, fig in enumerate(self.figs):
            # 이 문항에 칸 글이 든 표의 그림만 — 칸 글이 하나도 안 든 표(잡음만 든 머리 상자)는 표 자리가 안 선다
            if fig.in_table in drawn:
                continue
            by_line.setdefault(fig.line, []).append((fig.offset, k))
        out = [f"[[FIG:{k}]]" for _offset, k in by_line.get(-1, [])]
        previous_table = 0
        for index, line in enumerate(self.lines):
            items = by_line.get(index, [])
            table = self.line_tables[index] if index < len(self.line_tables) else 0
            if table:
                if table != previous_table:
                    out.append(f"[[TBL:{table}]]")
                previous_table = table
                out.extend(f"[[FIG:{k}]]" for offset, k in items if offset < 0)
                continue
            previous_table = 0
            text = line
            for offset, k in sorted((item for item in items if item[0] >= 0), reverse=True):
                text = f"{text[:offset]} [[FIG:{k}]] {text[offset:]}"
            text = re.sub(r" {2,}", " ", text).strip()
            if text:
                out.append(text)
            out.extend(f"[[FIG:{k}]]" for offset, k in items if offset < 0)
        return chr(10).join(out).strip()

    @property
    def tables(self) -> int:
        return len({table_id for table_id in self.line_tables if table_id})

    @property
    def text(self) -> str:
        return "\n".join(line for line in self.lines if line).strip()

    @property
    def key(self) -> tuple[int, int]:
        return (self.section, self.number)


@dataclasses.dataclass
class Segmented:
    problems: list[Problem]
    #: (묶음, 번호) → 빠른 정답(짧은 답)
    keys: dict[tuple[int, int], str]
    #: (묶음, 번호) → 풀이
    solutions: dict[tuple[int, int], str]
    #: 정답 칸이 있었나 · 정답 칸이 그림뿐이었나
    answer_section: bool
    answer_is_picture: bool
    #: 정답 칸의 원문(보고서에 쓴다)
    answer_text: str


#: 기호 글꼴이 쓰는 사용자 영역 글자(화살표 · 손가락 그림 따위) — 군더더기를 알아볼 때만 걷는다
_PUA = re.compile("[-]")


#: 시키는 말 · 물음표 — 풀이에는 안 나오는 것만(«구하면 · 것은 · 값은» 은 풀이에도 나온다)
_IMPERATIVE = re.compile(
    r"\?|구하시오|구하여라|고르시오|쓰시오|하시오|하여라|나타내시오|말하시오|답하시오|설명하시오|보자\.?$|봅시다\.?$"
)
#: 차례를 벗어난 번호를 문항으로 받는 폭 — 두 단 표가 가로로 읽힐 때 번호는 한두 칸 건너뛴다
OUT_OF_ORDER_MAX = 3
#: 번호 뒤에 이 낱말이 오면 번호가 아니다 — «1 학년» · «3 반» · «01차시»
_NOT_A_NUMBER = re.compile(r"^(?:학년|반|번|쪽|차시|단원)(?:\s|$)")


def is_noise(text: str) -> bool:
    return bool(_NOISE.match(re.sub(r"\s+", " ", _PUA.sub("", text)).strip()))


def strip_math(text: str) -> str:
    return re.sub(r"\$[^$]*\$", "§", text)


def lead_number(text: str) -> tuple[int, str, bool] | None:
    """문단 머리의 번호 · 그 뒤의 글 · 번호가 0 으로 채운 꼴(`01`)이었나. 수식으로 시작하면 번호가 아니다."""
    if text.startswith("$"):
        return None
    match = _LEAD_NUMBER.match(text)
    if not match:
        return None
    rest = text[match.end():]
    # «1 학년» · «3 반» 같은 머리 칸은 번호가 아니다. «14 원 $x^2+y^2=…$» 은 번호다 — 단위 낱말로 거르지 않는다
    # (번호 차례가 «바로 앞 + 1» 이어야 받으므로, 본문 속 «500 원»이 번호가 되는 일은 드물다)
    if re.match(r"^(?:학년|반|번|쪽|차시|단원)(?:\s|$)", rest):
        return None
    raw = match.group(1)
    return int(raw), rest, raw.startswith("0")


def is_answer_head(text: str) -> bool:
    return bool(_ANSWER_HEAD.search(text)) and len(text) <= 60


def _inline_marks(text: str) -> list[tuple[int, int, int, bool]]:
    """한 줄 안의 «번호 + 답» 자리 — (번호, 번호 시작, 답 시작, 0 채움). 수식 안은 가린다."""
    masked = re.sub(r"\$[^$]*\$", lambda m: "§" * len(m.group(0)), text)
    return [
        (int(m.group(1)), m.start(1), m.end(), m.group(1).startswith("0"))
        for m in _INLINE_MARK.finditer(masked)
    ]


def key_pairs(text: str, padded: bool | None = None) -> list[tuple[int, str]]:
    """빠른 정답 줄 하나 → (번호, 답) 들. 번호가 차례로 느는 자리만 받는다(`padded` 가 있으면 그 꼴만)."""
    marks = _inline_marks(text)
    chosen: list[tuple[int, int, int, bool]] = []
    for mark in marks:
        # 첫 번호만 꼴(0 채움)을 본다 — 이어지는 번호는 «바로 앞 + 1» 이면 꼴이 달라도 받는다(«07 $1$ 8 $23 over 2$»)
        if not chosen:
            if padded is None or mark[3] == padded or mark[0] >= 10:
                chosen.append(mark)
        elif mark[0] == chosen[-1][0] + 1:
            chosen.append(mark)
    if len(chosen) < 2 or chosen[0][1] > 0 and text[: chosen[0][1]].strip():
        # 첫 번호 앞에 다른 글이 있으면 빠른 정답 줄이 아니다(본문 속 «2 3 4» 따위)
        return []
    pairs = []
    for i, (number, _start, answer_start, _pad) in enumerate(chosen):
        end = chosen[i + 1][1] if i + 1 < len(chosen) else len(text)
        answer = text[answer_start:end].strip()
        if not answer:
            return []
        pairs.append((number, answer))
    return pairs


def looks_like_question(text: str) -> bool:
    return bool(_QUESTION_END.search(strip_math(text)))


def embedded_number(problem: "Problem") -> int | None:
    """본문 **안**에 다른 문항의 머리로 보이는 줄이 있으면 그 번호 — 두 문항이 하나로 붙었다는 표시다.

    번호가 차례를 벗어나거나(«3번 번호가 그림이라 못 읽었다») 꼴이 달라 문항으로 못 받은 줄은 앞 문항의 본문이 된다.
    그러면 그 문항은 «글이 멀쩡해 보이는데 두 문제가 들어 있고, 답은 하나뿐»이다 — 싣기 전에 걸러야 한다.
    자료 표의 칸(숫자뿐인 줄)은 세지 않는다."""
    for line, table_id in zip(problem.lines[1:], problem.line_tables[1:] or [0] * len(problem.lines)):
        if table_id:
            continue
        marker = lead_number(line)
        if marker is None:
            tight = _TIGHT_NUMBER.match(line)
            if tight and not _NOT_A_NUMBER.match(line[tight.end():]):
                marker = (int(tight.group(1)), line[tight.end():], True)
        if marker is None or marker[0] == problem.number:
            continue
        number, rest, _padded = marker
        # 번호만 선 줄 · 물음이 따라오는 줄만 — «3 이상인 자연수» 같은 본문 줄은 번호가 아니다
        if not rest or looks_like_question(rest):
            return number
    return None


#: 풀이 문장의 표지 — 빠른 정답에는 이런 말이 없다
_SENTENCE = re.compile(r"따라서|이므로|그러므로|이때|하면|에서\s|이다\.?$|이다\.|한다\.|된다\.|같다\.")


def _is_short_answer(body: str) -> bool:
    plain = strip_math(body.strip())
    return "\n" not in body.strip() and len(plain) <= 40 and not _SENTENCE.search(plain)


def numbering_style(paras: list[Para]) -> bool | None:
    """이 파일의 문항 번호가 0 채움 꼴(`01`)인가 — 물음이 따라오는 한 자리 번호를 세어 많은 쪽.
    머리의 «1» · «2»(쪽 · 단원 표시)가 먼저 나와 꼴을 잘못 정하던 일이 있었다(천재 형성평가 «원과 직선 / 01 …»)."""
    votes = {True: 0, False: 0}
    for index, para in enumerate(paras):
        marker = lead_number(para.text)
        if marker is None or marker[0] >= 10:
            continue
        follow = marker[1] or next((p.text for p in paras[index + 1 : index + 4] if p.text), "")
        if looks_like_question(follow):
            votes[marker[2]] += 1
    if not votes[True] and not votes[False]:
        return None
    return votes[True] > votes[False]


def segment(paras: list[Para]) -> Segmented:
    problems: list[Problem] = []
    current: Problem | None = None
    glyph_mode: bool | None = None
    padded: bool | None = numbering_style(paras)
    answer_start: int | None = None

    def next_text(index: int) -> str:
        for para in paras[index + 1 : index + 4]:
            if para.text:
                return para.text
        return ""

    def asks_ahead(index: int) -> bool:
        """번호 뒤 몇 줄 안에 **시키는 말**이 있나 — 다음 번호가 나오기 전까지만 본다.
        풀이에도 «구하면 · 것은» 이 나오므로 여기서는 `_IMPERATIVE`(시키는 말 · 물음표)만 센다."""
        seen = 0
        for para in paras[index + 1 : index + 14]:
            if not para.text:
                continue
            if lead_number(para.text) is not None:
                return False
            if _IMPERATIVE.search(strip_math(para.text)):
                return True
            seen += 1
            if seen >= 6:
                break
        return False

    #: 지금 문항이 시작된 문단의 번호(`paras` 의 자리) — 그 앞의 것은 이미 주인이 정해졌다
    started_at = -1

    def adopt(index: int, problem: Problem, previous: Problem | None) -> None:
        """번호와 **같은 문단에 닻을 둔** 그림 · 도형을 이 문항으로 옮긴다.

        떠 있는 개체의 닻은 문단의 맨 앞에 놓이기 쉽다. 번호가 글상자에 든 책은 그 그림이 번호 상자보다 먼저 흘러나오고
        (문단이 상자에서 끊긴다), 묶음 개체는 만나는 자리에서 끊어 내므로 번호가 문단의 글에 있어도 먼저 나온다.
        문서 차례대로만 달면 그 그림이 **앞 문항**에 붙는다 — 그림이 한 문항씩 밀리고 첫 문항의 그림은 사라진다.

        옮기는 것은 번호 바로 앞에 이어진, 글 없는 개체 문단뿐이다: 이 번호와 같은 문단에서 나왔거나(`host`), 이 번호가 든
        글상자 · 표가 매인 문단에서 나온 것(`parent`). 제 문단에 홀로 선 그림은 앞 문항의 것 그대로다.
        """
        para = paras[index]
        homes = {para.host, para.parent} - {0}
        moved: list[Para] = []
        for j in range(index - 1, started_at, -1):
            before = paras[j]
            if para.host and before.parent == para.host:
                continue  # 이 문단의 글상자 안 글(묶음 안의 라벨) — 건너뛴다
            if before.host in homes and not before.text:
                if before.pictures or before.group_pictures or before.shapes:
                    moved.append(before)
                continue
            break
        if not moved:
            return
        ahead = Problem(problem.section, problem.number, [], [])
        for before in reversed(moved):  # 문서 차례로
            if previous is not None:
                previous.release(before)
            ahead.attach(before, None)
            ahead.take_objects(before)
        problem.figs[:0] = ahead.figs
        problem.pictures[:0] = ahead.pictures
        problem.shapes += ahead.shapes
        problem.shape_list[:0] = ahead.shape_list

    #: 여러 문항이 같이 쓰는 지시문 «[04~05] 다음 전개도로 만든 원기둥의 겉넓이를 구하시오.» — (묶음, 처음, 끝, 글)
    groups: list[tuple[int, int, int, str, Para]] = []

    #: 첫 문항 앞의 글(단원 · 자료 이름) — 정답 칸의 머리에 같은 글이 되풀이된다
    head_texts: set[str] = set()

    for index, para in enumerate(paras):
        text = para.text
        if not problems and text:
            head_texts.add(text)
        if problems and (is_answer_head(text) or (len(key_pairs(text, padded)) >= 2 and not para.pictures)):
            answer_start = index
            break
        group = _GROUP_STEM.match(text)
        if group:
            # 앞 문항의 본문이 아니다 — 범위 안의 문항 머리에 붙인다
            stem = group.group(3).strip()
            first, last = int(group.group(1)), int(group.group(2))
            if stem and not is_noise(f"[{first}~{last}] {stem}"):
                section = problems[-1].section if problems else 0
                if problems and first == 1:
                    section += 1  # 새 묶음의 첫 지시문
                groups.append((section, first, last, stem, para))
            continue
        marker = lead_number(text)
        if marker is None:
            # «10두 행렬 …» — 번호 뒤에 글이 띄어쓰기 없이 붙은 꼴. 바로 다음 번호일 때만 받는다
            # (첫 문항이면 «01다음은 모든 자연수 …» 처럼 1번일 때만 — 물음은 몇 줄 뒤에 올 수 있다)
            tight = _TIGHT_NUMBER.match(text)
            if tight:
                number, rest = int(tight.group(1)), text[tight.end():]
                follows = number == (problems[-1].number + 1 if problems else 1)
                if follows and not _NOT_A_NUMBER.match(rest):
                    marker = (number, rest, tight.group(1).startswith("0"))
        started = False
        if glyph_mode is not True and marker is not None and (padded is None or marker[2] == padded or marker[0] >= 10):
            number, rest, is_padded = marker
            expected = problems[-1].number + 1 if problems else None
            asks = looks_like_question(rest) or (not rest and looks_like_question(next_text(index)))
            if expected is None and number != 1 and not asks:
                # 첫 문항 자리의 «02 등차수열» · «02. 순열» — 소단원 제목이다. 번호로 받으면 뒤따르는 01 · 02 가
                # «2번 문항»의 본문으로 빨려 들어가, 두 문항이 하나가 되고 답은 2번 것만 붙는다
                # (천재 «형성평가» · 비상 «계산력 강화 문제» — 2026-10-07 표본에서 찾았다).
                continue
            if expected is None or number == expected:
                section = problems[-1].section if problems else 0
                current = Problem(section, number, [], [])
                if rest:
                    current.add_line(rest)
                current.attach(para, rest or None)
                current.take_objects(para)
                problems.append(current)
                glyph_mode, started = False, True
                if number < 10 and padded is None:
                    # 0 채움 꼴은 한 자리 번호에서만 보인다(`15` 는 어느 쪽 책에도 있다)
                    padded = is_padded
            elif number == 1 and len(problems) >= 2:
                # 번호가 1로 돌아갔다 — 새 묶음인가, 정답 칸인가. 물음이 몇 줄 뒤에 오는 문항이 있다
                # («1 / 어떤 소방차 물탱크에 … / (1) 다음 표를 완성하시오.») — 바로 다음 줄만 보면 정답 칸으로 읽는다.
                if asks or asks_ahead(index):
                    current = Problem(problems[-1].section + 1, 1, [], [])
                    if rest:
                        current.add_line(rest)
                    current.attach(para, rest or None)
                    current.take_objects(para)
                    problems.append(current)
                    started = True
                else:
                    answer_start = index
                    break
            elif (
                asks
                and number > 1
                and abs(number - expected) <= OUT_OF_ORDER_MAX
                and not any(p.number == number for p in problems if p.section == problems[-1].section)
            ):
                # 차례를 벗어난 번호 — 문항을 두 단 표에 넣은 자료는 XML 이 가로로 읽혀 01 · 03 · 02 · 04 로 나온다
                # (미래엔 «수준별 문제»). 물음이 따라오고 그 묶음에 아직 없는 가까운 번호면 문항으로 받는다.
                # 차례는 끝에서 번호로 다시 세운다.
                current = Problem(problems[-1].section, number, [], [])
                if rest:
                    current.add_line(rest)
                current.attach(para, rest or None)
                current.take_objects(para)
                problems.append(current)
                started = True
        if not started and glyph_mode is not False and para.lead_picture is not None and para.lead_picture.is_glyph:
            # 번호가 그림인 책 — 물음이 따라와야 받는다(머리의 작은 장식 그림을 번호로 알지 않게)
            if glyph_mode is True or looks_like_question(text) or looks_like_question(next_text(index)):
                number = problems[-1].number + 1 if problems else 1
                pictures = [p for p in para.pictures if p is not para.lead_picture]
                current = Problem(0, number, [], pictures, glyph_number=True)
                if text:
                    current.add_line(text)
                current.attach(para, text or None, skip=para.lead_picture)
                current.shapes += para.shapes
                current.shape_list.extend(para.shape_list)
                problems.append(current)
                glyph_mode, started = True, True
        if started:
            adopt(index, current, problems[-2] if len(problems) >= 2 else None)
            started_at = index
        if started or current is None:
            continue
        added = bool(text) and not is_noise(text)
        if added:
            current.add_line(text, para.table_id)
        current.attach(para, text if added else None)
        current.pictures.extend(p for p in para.pictures if not p.is_glyph)
        current.shapes += para.shapes
        current.shape_list.extend(para.shape_list)

    # 같이 쓰는 지시문을 범위 안 문항의 머리에(그 묶음 안에서 — 지시문이 나온 뒤의 문항만)
    for section, first, last, stem, stem_para in groups:
        for problem in problems:
            if problem.section == section and first <= problem.number <= last and stem not in problem.lines[:1]:
                problem.add_line(stem, head=True)
                # 지시문에 딸린 그림(«[04~05] 다음 전개도 …» + 그림)은 그 범위의 문항이 같이 쓴다
                shared = Problem(section, problem.number, [stem], [])
                shared.attach(stem_para, stem)
                problem.figs[:0] = shared.figs

    # 마지막 문항의 끝에 붙은 머리글 — 정답 칸이 «단원 이름»으로 시작하는데 그 줄에는 «정답» 이라는 말이 없어
    # 정답 칸의 시작을 그 다음 줄에서야 안다. 첫 문항 앞에 나왔던 글이 그대로 되풀이된 것만 걷는다.
    if problems:
        last = problems[-1]
        while len(last.lines) > 1 and last.lines[-1] in head_texts:
            last.drop_last_line()

    # 차례를 벗어나 받은 번호가 있으면 묶음 안에서 번호 차례로 다시 세운다(묶음의 차례는 그대로)
    problems.sort(key=lambda problem: (problem.section, problem.number))

    keys: dict[tuple[int, int], str] = {}
    solutions: dict[tuple[int, int], str] = {}
    answer_text = ""
    answer_is_picture = False
    if answer_start is not None:
        tail = paras[answer_start:]
        answer_text = "\n".join(p.text for p in tail if p.text)
        has_text = any(p.text and not is_answer_head(p.text) for p in tail)
        answer_is_picture = not has_text and any(not pic.is_glyph for p in tail for pic in p.pictures)
        runs = _answer_runs(tail, padded)
        _assign(runs, problems, keys, solutions)
    return Segmented(problems, keys, solutions, answer_start is not None, answer_is_picture, answer_text)


def merge_answer_file(doc: Segmented, answer_paras: list[Para], padded: bool | None = None) -> int:
    """따로 있는 정답 파일을 문항 묶음에 붙인다 — 비어 있는 자리만 채운다. 채운 자리 수를 돌려준다."""
    keys: dict[tuple[int, int], str] = {}
    solutions: dict[tuple[int, int], str] = {}
    _assign(_answer_runs(answer_paras, padded), doc.problems, keys, solutions)
    filled = 0
    for slot, value in keys.items():
        if slot not in doc.keys:
            doc.keys[slot] = value
            filled += 1
    for slot, value in solutions.items():
        if slot not in doc.solutions:
            doc.solutions[slot] = value
            filled += 1
    return filled


def _answer_runs(tail: list[Para], padded: bool | None) -> list[list[tuple[int, str]]]:
    """정답 칸 → 번호 줄기들. 번호가 다시 작아지면 줄기가 끊긴다. 줄기 안 원소는 (번호, 글)."""
    entries: list[tuple[int, str]] = []
    current: int | None = None
    buffer: list[str] = []

    def flush() -> None:
        if current is not None:
            entries.append((current, "\n".join(buffer).strip()))

    for para in tail:
        text = para.text
        if not text or is_answer_head(text) or _GROUP_STEM.match(text):
            continue
        pairs = key_pairs(text, padded)
        if len(pairs) >= 2:
            flush()
            current, buffer = None, []
            entries.extend(pairs)
            continue
        marker = lead_number(text)
        if marker is None:
            # 정답 칸에서는 번호 바로 뒤에 글이 붙기도 한다(`02ㄷ만 옳다.` · `05로그의 밑의 조건에 의해`).
            # 그런 자리는 **바로 다음 번호**이거나 처음(1)일 때만 번호로 받는다 — 풀이 속 «3개이다»를 번호로 알지 않게
            tight = _TIGHT_NUMBER.match(text)
            if tight and int(tight.group(1)) in ((current or 0) + 1, 1):
                marker = (int(tight.group(1)), text[tight.end():], tight.group(1).startswith("0"))
        if marker is not None and (padded is None or marker[2] == padded or marker[0] >= 10):
            flush()
            current, rest, _ = marker
            buffer = [rest] if rest else []
            continue
        if current is not None and not is_noise(text):
            buffer.append(text)
    flush()

    runs: list[list[tuple[int, str]]] = []
    for number, body in entries:
        if not body:
            continue
        if not runs or number <= runs[-1][-1][0]:
            runs.append([])
        runs[-1].append((number, body))
    return runs


_NUMBER = re.compile(r"\d+(?:\.\d+)?")
#: 풀이가 이 문제의 풀이로 보려면 넘어야 하는 수 겹침(문제의 수식에 나온 수 가운데 풀이에도 나온 몫)
CONTENT_MIN = 0.4


def math_numbers(text: str) -> set[str]:
    """수식(`$…$`) 안의 수 — 문제와 풀이가 같은 문제를 말하는지 견줄 때 쓴다."""
    return set(_NUMBER.findall(" ".join(re.findall(r"\$([^$]*)\$", text))))


def content_score(problem_text: str, solution: str) -> float | None:
    """문제의 수식에 나온 수 가운데 풀이에도 나온 몫. 문제에 수가 둘 미만이면 견줄 수 없다(`None`)."""
    numbers = math_numbers(problem_text)
    if len(numbers) < 2:
        return None
    return len(numbers & math_numbers(solution)) / len(numbers)


def _run_kind(run: list[tuple[int, str]]) -> str:
    short = sum(1 for _, body in run if _is_short_answer(body))
    return "key" if short >= max(1, 0.6 * len(run)) else "solution"


def _assign(runs, problems, keys, solutions) -> None:
    """정답 칸의 줄기를 문항 묶음에 붙인다.

    번호 겹침만으로는 **크기가 같은 묶음**을 못 가른다 — 한 파일에 6문항짜리 묶음이 셋이고 첫 묶음 일부를 놓치면
    정답 줄기가 한 묶음씩 밀려 붙었다(동아 «소단원학습지 4_7» — 무작위 표본에서 찾았다). 그래서
      1. **풀이 줄기**는 «문제의 수식에 나온 수가 풀이에도 나오는가»(`content_score`)로 묶음을 고른다. 견줄 수가 없는
         줄기(수가 없는 문제들)만 번호 겹침 · 차례로 고른다.
      2. **빠른 정답 줄기**는 파일 안에서 그 뒤에 오는 풀이 줄기와 짝지어 같은 묶음으로 보낸다
         (빠른 정답 → 풀이 → 빠른 정답 → 풀이 꼴도, 빠른 정답들 → 풀이들 꼴도 차례로 짝이 맞는다).
         풀이 줄기가 없는 파일만 번호 겹침으로 고른다.
    번호를 가장 많이 덮는 줄기가 먼저다 — 정답 파일 머리의 단원 제목(«1 유리수와 순환소수»)이 번호 1 하나짜리 줄기로
    먼저 나와 진짜 줄기의 자리를 차지하던 일이 있었다(동아 «해결해요» 정답 파일).
    """
    sections: dict[int, set[int]] = {}
    texts: dict[tuple[int, int], str] = {}
    for problem in problems:
        sections.setdefault(problem.section, set()).add(problem.number)
        texts[problem.key] = problem.text
    order = sorted(sections)
    kinds = [_run_kind(run) for run in runs]

    def fits(run, section) -> int:
        numbers = {number for number, _ in run}
        overlap = len(numbers & sections[section])
        return overlap if numbers <= sections[section] or overlap > len(numbers) // 2 else 0

    def score(run, section) -> float | None:
        values = [
            s for number, body in run
            if (section, number) in texts and (s := content_score(texts[(section, number)], body)) is not None
        ]
        return sum(values) / len(values) if values else None

    target_of: dict[int, int] = {}
    filled: set[tuple[int, str]] = set()

    # 1. 풀이 줄기 — 내용이 맞는 묶음
    candidates = []
    for index, run in enumerate(runs):
        if kinds[index] != "solution":
            continue
        for section in order:
            overlap = fits(run, section)
            if not overlap:
                continue
            value = score(run, section)
            if value is not None and value < CONTENT_MIN:
                continue
            candidates.append((value is None, -(value or 0), -overlap, abs(len(sections[section]) - len(run)), index, section))
    for *_rest, index, section in sorted(candidates):
        if index in target_of or (section, "solution") in filled:
            continue
        target_of[index] = section
        filled.add((section, "solution"))

    # 2. 빠른 정답 줄기 — 파일 차례대로, 뒤따르는 풀이 줄기(아직 짝 없는 것)와 짝짓는다. 그 풀이가 묶음을 못 잡았으면
    #    빠른 정답도 붙이지 않는다(밀린 자리에 붙느니 비운다). 번호가 풀이 줄기의 절반도 안 되는 줄기(머리의 제목 한 줄)는
    #    짝이 아니다 — 진짜 빠른 정답 줄기의 짝을 뺏지 않게
    def run_fit(key_run, solution_run) -> bool:
        a = {n for n, _ in key_run}
        b = {n for n, _ in solution_run}
        return len(a) * 2 >= len(b) and (a <= b or len(a & b) * 2 > len(a))

    solution_indexes = [i for i in range(len(runs)) if kinds[i] == "solution"]
    assigned_solutions = [i for i in solution_indexes if i in target_of]
    paired: set[int] = set()
    for index in range(len(runs)):
        if kinds[index] != "key":
            continue
        partner = next(
            (j for j in solution_indexes if j > index and j not in paired and run_fit(runs[index], runs[j])),
            None,
        )
        if partner is None:
            continue
        paired.add(partner)
        if partner in target_of:
            section = target_of[partner]
            if (section, "key") not in filled and fits(runs[index], section):
                target_of[index] = section
                filled.add((section, "key"))
    solution_indexes = assigned_solutions
    if not solution_indexes:
        # 풀이 줄기가 하나도 자리를 못 잡았다 — 번호 겹침 · 차례로. 짧은 풀이(«ㄷ만 옳다.»)는 빠른 정답처럼 보이므로
        # 답 자리가 찬 뒤에 오는 줄기는 풀이로 받는다
        candidates = []
        for index, run in enumerate(runs):
            if index in target_of:
                continue
            for section in order:
                overlap = fits(run, section)
                if not overlap:
                    continue
                for kind in ("key", "solution"):
                    candidates.append((-overlap, kind != kinds[index], abs(len(sections[section]) - len(run)), index, section, kind))
        for *_rest, index, section, kind in sorted(candidates):
            if index in target_of or (section, kind) in filled:
                continue
            target_of[index] = section
            filled.add((section, kind))
            kinds[index] = kind

    for index, section in target_of.items():
        for number, body in runs[index]:
            if number not in sections[section]:
                continue
            slot = (section, number)
            if kinds[index] == "key" and _is_short_answer(body) and slot not in keys:
                keys[slot] = body
            elif slot in solutions:
                solutions[slot] += "\n" + body
            else:
                solutions[slot] = body
