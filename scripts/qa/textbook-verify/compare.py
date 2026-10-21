# -*- coding: utf-8 -*-
"""문제은행 문항 ↔ 원본 문항 — «같음 · 표기만 다름 · 다른 문항» 을 가르는 자 (교과서 원본 대조 · 2026-10-21).

두 글을 뼈대(`skeleton.py`)로 줄이고 어긋난 자리(difflib 의 opcode)마다 **까닭**을 붙인다.
까닭이 전부 «표기 · 군더더기 · 그림 · 조사 · 이름 바꿈 · 경계» 이면 «표기만 다름», 하나라도 «내용»이면 «다른 문항» 후보다.

내용으로 보는 것(놓치면 «다른 문항»을 «같음»으로 읽는다 — 18번 문서의 함정):
  · 숫자 · 로마자(변수 · 점 이름) · 한글 낱말이 바뀌었다 · 생겼다 · 없어졌다
  · **뜻을 지닌 기호**가 바뀌거나 빠졌다 — 부호(`−3`→`3`) · 부등호(`<`→`≤`) · 첨자(`x²`↔`x₂`) · 분수 선(`1/2`↔`12`)
    (Codex 1회차가 짚었다 — 기호만 다른 자리를 통째로 «표기»로 넘기던 것을 좁혔다)

«내용»을 «표기 · 경계 · 군더더기»로 넘기는 규칙은 **증거**가 있을 때만 쓴다:
  · 경계(이 대조기의 문항 경계가 이관과 갈린 것) — 원본 쪽에만 있는 글이 **바로 이웃한 번호**의 DB 문항에 그대로 있다 ·
    다른 범위의 같이 쓰는 지시문 «[95∼100]» · 원본에서 다음 번호를 따로 못 찾았고(붙었다) DB 의 물음이 제 끝에서 온전하다
  · 군더더기 — 배점 · 출처 표지 · 쪽수 · 유형 표지 «|…|» · 이 파일의 머리글 · 단원 제목 낱말(`titles`)
  · 그림 — 원본에만 있는 글이 **이 문항 가까이**의 표 칸 · 글상자 · 묶음 안에 있다(`boxes`)
묻는 말(«구하시오» · «것은»)이 든 글은 군더더기 · 그림으로 넘기지 않는다.
"""
from __future__ import annotations

import dataclasses
import difflib
import re

from rapidfuzz import fuzz

from skeleton import FIGURE, FRAC, UNKNOWN_SYMBOL, Skeleton, _hwp_words

#: 표기로만 갈리는 기호 — 이것들만 다른 자리는 «표기»다. 여기 없는 기호(부호 · 부등호 · 첨자 · 분수 선 · 근호 …)는 뜻이다
NOTATION_SYMBOLS = set("()[]{}·…∼□○′°‾⌒⃗%:!*'?") | {FIGURE, UNKNOWN_SYMBOL}
#: 뜻이 같은 기호 짝 — 서로 맞서면 «표기»
EQUIVALENT = {
    frozenset({"⇒", "→"}): "표기: 기호", frozenset({"⇔", "↔"}): "표기: 기호", frozenset({"≡", "="}): "표기: 합동 기호가 등호로",
    frozenset({"∥", UNKNOWN_SYMBOL}): "표기: 기호 글꼴", frozenset({"×", "·"}): "표기: 기호", frozenset({"/", FRAC}): "표기: 기호",
    frozenset({"¬=", "≠"}): "표기: 기호", frozenset({"‾", "⌒"}): "표기: 기호", frozenset({"∥", "//"}): "표기: 기호",
}
#: 조사 · 어미 — 수식 표기가 바뀌면 뒤 조사도 따라 고친다(«$0$를» → «$0$을»)
PARTICLES = {"을", "를", "은", "는", "이", "가", "와", "과", "로", "으로", "의", "에", "도", "만", "이다", "다", "인", "일", "이며",
             "이고", "고", "며", "면", "시오", "하시오", "하여라", "라", "은가", "는가", "인가", "까", "니", "요", "으"}
#: 이관이 일부러 걷은 머리글 · 꼬리글(원본에만 있다) — 그 말만 선 조각일 때
NOISE = re.compile(
    r"^(?:\d+∼\d+)?(?:단답형|서술형|서답형|객관식|선택형)+$|^\d+∼\d+(?:단답형|서술형|서답형|객관식|선택형)$|^\d+회$"
    r"|^(?:대|중|소)?단원(?:평가|마무리|확인)?$|^<?보기>?$|^[<>]+$"
    r"|^(?:서술형)?(?:풀이과정과답을써보자|풀이과정답|다음문제의풀이과정을자세히서술한다음답을쓰시오?)$"
    r"|^\(\d+\)(?:\(\d+\))*$|^쪽$|^교과서\d*쪽\d*\+?$|^\d*차시(?:형성)?평가$|^정답\d*개?$|^성취도.*성취율.*$|^반번이름(?:점수)?$"
    r"|^\d+∼\d+번은서술형문제입니다$|^\d*번부터\d+번까지서술형입니다\d*$|^(?:주관식|서술형|객관식)\(\d+∼\d+\)$|^(?:심화문제)+$"
    r"|학년반번이름|^□[①-⑩㉠-㉯]*$"
)
#: 이름 바꿈(D-161 `neutralNames.ts`) — 출판사 이름을 딴 사람 · 학교
RENAMED = {
    frozenset({"천재", name}) for name in ("지우", "서아", "하루", "도하", "미나")
} | {frozenset({brand, "한빛"}) for brand in ("천재", "비상", "미래엔", "미래", "동아", "지학", "교학", "능률", "와이비엠")}
#: 묻는 말 — 이것이 든 글은 군더더기 · 그림으로 넘기지 않는다
ASKS = re.compile(r"구하시오|구하여라|고르시오|고르면|쓰시오|하시오|나타내시오|답하시오|것은|값은|인가|는가|몇|\?")
#: 조건 · 문장의 꼴 — 이것이 든 글은 머리 · 꼬리 글이 아니다(«소수 둘째 자리까지» 를 군더더기로 지우던 것 — Codex 1회차)
_SENTENCE = re.compile(
    r"이다|한다|있다|없다|된다|었다|였다|했다|진다|이고|이며|이면|일때|할때|라고|하자|붙어|이루어|만족|대하여|에서|하는데|하여"
    r"|까지|부터|반올림|이상|이하|미만|초과|만큼|마다|씩|단위"
)

_DIGIT = re.compile(r"\d")
_HANGUL = re.compile(r"[가-힣]")
_LATIN = re.compile(r"[A-Za-z]")
_HANGUL_RUN = re.compile(r"[가-힣]+")
#: 출처 표지 «[2019년 3월 고2 나형 20번]» · 쪽수 «104쪽 4» · 유형 표지 «|계승|»
_SOURCE_TAG = re.compile(r"\[\d{4}년도?(?:\d+월)?[^\]]*\]?|(?:교과서)?\d+쪽(?:문제)?\d*|\|[^|]{2,40}\|")
#: 표준정규분포표 — 문제의 끝에 덧붙은 참고 표(이관은 걷었다)
_NORMAL_TABLE = re.compile(r"zP\(0(?:≤|le)Z(?:≤|le)z\)")
#: 그림을 가리키는 말이 그림 표지에 끊겨 남은 조각
_POINTER_PIECES = {"오른쪽", "른쪽", "쪽", "오", "오른", "왼쪽", "아래", "위", "위의", "아래의", "오른쪽의"}
#: 자료의 제목 줄 «SNS에 올린 게시물의 개수 (단위: 개)» — D-164 가 그림 밑 제목으로 옮기거나 걷었다
_CAPTION = re.compile(r"^[가-힣A-Za-z0-9]{1,30}\(단위:?[^)]{1,8}\)$")
#: «(정답 2개)»
_ANSWER_COUNT = re.compile(r"\(정답\d+개\)")
#: 같이 쓰는 지시문의 머리 «[95∼100]»
_STEM_HEAD = re.compile(r"\[(\d{1,3})∼(\d{1,3})\]")
#: 단원 제목에 섞이는 번호 · 기호
_TITLE_DECOR = r"[\d\-.∼·()ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩIVX]"


@dataclasses.dataclass
class Opcode:
    tag: str
    orig: str
    db: str
    why: str

    def as_list(self) -> list[str]:
        return [self.tag, self.orig, self.db, self.why]


@dataclasses.dataclass
class Comparison:
    verdict: str  # same | notation | different
    reasons: list[str]
    opcodes: list[Opcode]
    similarity: float

    @property
    def substantive(self) -> list[Opcode]:
        return [op for op in self.opcodes if op.why.startswith("내용")]


@dataclasses.dataclass(frozen=True)
class Context:
    """한 문항을 견줄 때 필요한 주변 사실."""

    #: 문제은행 문항에 그림이 붙어 있나(`figure_urls`)
    db_has_figures: bool = False
    #: 이 파일의 머리글 · 단원 제목 · 파일 이름 · 차시 이름의 뼈대를 이어 붙인 것(`strict`)
    titles: str = ""
    #: 이 문항 **가까이**(찾은 문단 앞뒤)의 표 칸 · 글상자 · 묶음 안 글의 뼈대 — «그림으로 실린 글»의 근거
    boxes: str = ""
    #: 같은 묶음에서 **바로 이웃한 번호**(N±1 · N±2)의 DB 문항 뼈대 — 원본 쪽에만 있는 글이 거기 그대로 있으면
    #: DB 의 흠이 아니라 이 대조기의 문항 경계가 이관과 갈린 것이다
    neighbors: tuple[str, ...] = ()
    #: 원본 문항 글 가운데 **굵은 수식**(`bold`)이 든 줄의 뼈대 — 출판사가 굵게 찍은 유형 제목 · 묶음 지시문
    bold_lines: tuple[str, ...] = ()
    #: 이 대조기가 원본에서 다음 번호(같은 묶음의 N+1)를 따로 못 찾았나 — 못 찾았으면 원본 쪽 끝에 다음 문항이 붙었을 수 있다
    next_missing: bool = False
    #: 원본에서 바로 앞 번호 문항의 끝 두 글자 — 낱말이 문항 경계에서 갈린 꼴(«… 연 / 립방정식»)의 근거
    prev_tail: str = ""
    #: 원본 파일 전체의 뼈대 — 그림 둘레의 꾸밈 글이 파일에 되풀이되는가(«소인 수 소인 수»)
    stream: str = ""
    #: DB 문항의 그림 수(`figure_urls`)와 본문의 그림 자리 수가 같은가 — 보기 그림을 한 장으로 합친 문항만 «보기 번호가 그림 속으로»
    figures_placed: bool = True


def _symbols_only(text: str) -> bool:
    return not (_DIGIT.search(text) or _HANGUL.search(text) or _LATIN.search(text))


def _notation_only(text: str) -> bool:
    """표기로만 갈리는 기호뿐인가(뜻을 지닌 기호가 없다)."""
    return all(ch in NOTATION_SYMBOLS for ch in text)


def _keyword_letters(text: str) -> bool:
    """로마자 덩이가 한글 수식 낱말인가(원본에서 기호로 못 읽힌 `LE` · `pi` · `IN` · `parallel` · `OF`)."""
    words = _hwp_words()
    run = re.sub(r"[^A-Za-z]", "", text)
    if not run:
        return False
    if run in words or run.upper() in words or run.lower() in words:
        return True
    return run.lower() in {"le", "ge", "ne", "parallel", "of", "in", "pi", "deg", "rm", "it", "bold", "box", "vert", "dyad", "line"}


def _contained(piece: str, texts) -> bool:
    """조각이 글들 가운데 하나에 그대로 들어 있나 — 30자 미만은 글자 그대로만, 긴 조각은 부분 일치 95 이상(Codex 1회차)."""
    piece = piece.replace(FIGURE, "")
    if len(piece) < 4:
        return False
    for text in texts:
        if piece in text:
            return True
        if len(piece) >= 30 and fuzz.partial_ratio(piece, text) >= 95:
            return True
    return False


def _lost_subquestion(orig: str, whole_db: str) -> bool:
    """원본에만 있는 글이 DB 의 소문항으로 이어지는 번호로 시작하나 — 그러면 DB 가 잃은 소문항이다.
    «(1) …» 로 시작하는데 DB 에 «(1)» 이 없으면 소문항 목록을 통째로 잃은 것이다(눈금 맞추기 2회차)."""
    head = re.match(r"\((\d+)\)", orig.replace(FIGURE, ""))
    if not head:
        return False
    number = int(head.group(1))
    if number == 1:
        return "(1)" not in whole_db
    return f"({number - 1})" in whole_db


def _ends_with_ask(text: str) -> bool:
    """DB 의 물음이 제 끝에서 온전히 끝나나 — 묻는 말로 끝나거나, 묻는 말 뒤에 보기 ①~⑤ 가 다 있다."""
    if re.search(r"(?:구하시오|구하여라|고르시오|고르면|쓰시오|하시오|나타내시오|것은|값은|인가|는가|몇개인가)$", text):
        return True
    return bool(ASKS.search(text)) and all(mark in text for mark in "①②③④⑤")


#: 번호가 붙은 단원 제목 «1-02 다각형의 대각선» · «소인수분해 01 소인수분해 1» · «식의 계산 02 단항식의 곱셈과 나눗셈»
_NUMBERED_TITLE = re.compile(r"(?:\d{1,2}(?:[-.]\d{1,2})*\.?)?(?:[가-힣]{2,}\d{0,2}(?:[-.]\d{1,2})*\.?)+")


def _title_evidence(text: str, titles: str) -> bool:
    """원본에만 있는 글이 이 파일의 머리글 · 단원 제목 · 출처 표지로 되어 있나(증거가 있을 때만)."""
    piece = text.replace(FIGURE, "")
    if not piece or ASKS.search(piece) or re.match(r"^\(?단", piece):
        return False
    if NOISE.search(piece):
        return True
    # 출처 표지 · 쪽수 · 유형 표지(«|x→a 일 때 함수의 극한|»)는 그 안의 글이 문장 꼴이어도 표지다 — 먼저 걷는다
    tagged = _SOURCE_TAG.search(piece)
    if tagged:
        rest = _SOURCE_TAG.sub("", piece)
        return not rest or _title_evidence(rest, titles) or not (_HANGUL.search(rest) or re.search(r"[=+×÷<>≤≥]", rest))
    if _SENTENCE.search(piece) or re.search(r"\(\d+\)[가-힣]", piece):
        return False  # 문장 꼴 · 소문항 «(1) 밑넓이 (2) 옆넓이» 는 제목이 아니다
    if titles and len(piece) >= 2 and piece in titles:
        return True
    plain = re.sub(r"\d", "", piece)
    if titles and len(plain) >= 2 and plain in re.sub(r"\d", "", titles):
        return True  # «합의 기호 Σ 01» — 수만 걷으면 제목 그대로
    runs = _HANGUL_RUN.findall(piece)
    rest = re.sub(_TITLE_DECOR + r"|[가-힣]", "", piece)
    if titles and runs and not rest and sum(map(len, runs)) >= 2 and all(run in titles for run in runs):
        return True
    # 번호 붙은 단원 제목 꼴 — 번호(«1-02» · «01»)가 한글 이름 사이 · 앞에 있고 한글이 넷 넘는다(«넓이 2» 같은 조건은 안 된다)
    roman = re.match(r"^[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+", piece)
    if roman and re.fullmatch(r"[가-힣]{4,}", piece[roman.end():]):
        return True  # «Ⅶ 입체도형의 성질» — 로마 숫자 대단원 번호 + 이름
    return bool(_NUMBERED_TITLE.fullmatch(piece) and re.search(r"\d", piece) and sum(map(len, runs)) >= 4)


def _figure_labels(piece: str) -> bool:
    """그림의 이름표 꼴 — 한글 문장이 없고(단위 낱말만) 묻는 말 · 조건이 없다."""
    hangul = "".join(_HANGUL.findall(piece))
    if ASKS.search(piece) or _SENTENCE.search(piece) or len(hangul) > 4:
        return False
    return bool(re.search(r"[0-9A-Za-z]", piece)) and len(piece) <= 60


def _symbol_why(orig: str, db: str, *, whole_orig: str = "", whole_db: str = "") -> str:
    """기호만 다른 자리의 까닭 — 뜻이 같은 짝 · 표기 기호만이면 «표기», 아니면 «내용: 기호»."""
    a, b = orig.replace(FIGURE, ""), db.replace(FIGURE, "")
    labels = a or b
    if re.fullmatch(r"[①-⑩㉠-㉯]+", labels) and all(mark in (whole_db if a else whole_orig) for mark in labels):
        return "표기: 표지 자리 옮김"  # 계산 과정의 «㉠ ㉡» 이 식 위로 옮겨 갔다 — 다른 쪽에 같은 표지가 있다
    if not a and not b:
        return "그림 표지"
    pair = frozenset({a, b})
    if pair in EQUIVALENT:
        return EQUIVALENT[pair]
    if UNKNOWN_SYMBOL in a or UNKNOWN_SYMBOL in b:
        # 글꼴 글자는 무엇이든 될 수 있다 — 맞선 쪽이 기호 하나일 때만
        other = b if UNKNOWN_SYMBOL in a else a
        if len(other.replace(UNKNOWN_SYMBOL, "")) <= 1:
            return "표기: 기호 글꼴"
    if _notation_only(a) and _notation_only(b):
        if "‾" in a and "‾" not in b:
            return "표기: 선분 기호 빠짐"
        return "표기: 기호"
    return "내용: 기호"


def _classify(tag: str, orig: str, db: str, *, at_start: bool, next_to_figure: bool, context: Context, whole_db: str,
              whole_orig: str = "", at_end: bool = False, after_figure: bool = False, at_head: bool = False) -> str:
    if frozenset({orig, db}) in RENAMED:
        return "이름 바꿈"
    if tag == "replace" and len(orig) <= 3 and len(db) <= 3 and orig in PARTICLES and db in PARTICLES:
        return "조사"
    if tag in ("insert", "delete") and (orig or db) in PARTICLES and len(orig or db) == 1:
        return "조사"
    if orig.replace(FIGURE, "") in _POINTER_PIECES and db.replace(FIGURE, "") in ("다음", ""):
        return "표기: 그림 가리키는 말"
    if tag in ("insert", "delete") and _CAPTION.search((orig or db).replace(FIGURE, "")):
        return "표기: 자료 제목(단위)"
    if tag == "delete" and _ANSWER_COUNT.fullmatch(orig.replace(FIGURE, "")):
        return "안내: (정답 n개) 빠짐"
    piece = orig.replace(FIGURE, "")
    in_box = bool(context.boxes) and len(piece) >= 2 and piece in context.boxes
    if (tag == "delete" or (tag == "replace" and not db.replace(FIGURE, ""))) and at_start and ASKS.search(orig) \
            and _contained(orig, context.bold_lines) and not _lost_subquestion(orig, whole_db) and ASKS.search(whole_db):
        return "군더더기: 굵은 유형 제목 · 지시문"
    if context.db_has_figures and in_box and not ASKS.search(orig) and (
        (tag == "replace" and FIGURE in db and not db.replace(FIGURE, "")) or (tag == "delete" and next_to_figure)
    ):
        return "그림: 원본 글이 그림으로"
    if tag == "delete" and context.db_has_figures and in_box and len(piece) <= 16 and not ASKS.search(orig) \
            and not _SENTENCE.search(orig) and not re.match(r"^\(?단", piece):
        return "그림: 원본 글이 그림으로"  # 표 칸의 제목 · 이름표
    if tag == "delete" and _NORMAL_TABLE.search(orig):
        return "군더더기: 표준정규분포표"
    if tag == "delete" and in_box and len(piece) <= 12 and not _DIGIT.search(piece) and not _LATIN.search(piece) \
            and not ASKS.search(piece) and not _SENTENCE.search(piece) and not re.match(r"^\(?단", piece):
        return "군더더기: 상자 글"  # 그림 둘레의 이름표 · 꾸밈 글(«소인 수 소인 수»)
    if tag == "delete" and at_end and len(piece) == 1 and _HANGUL.match(piece):
        return "경계: 낱말 조각"  # 원본 쪽 끝에 남은 다음 문항의 첫 글자(«… 구하시오. 연»)
    if tag == "insert" and at_start and len(db) <= 2 and _HANGUL.search(db) and context.prev_tail.endswith(db):
        return "경계: 낱말 조각"  # 앞 문항 끝에 붙어 간 이 문항의 첫 글자(«연 / 립방정식»)
    if tag == "delete" and after_figure and context.db_has_figures and _figure_labels(piece):
        return "그림: 그림 속 이름표"  # 그림 바로 뒤의 짧은 수식 이름표(«$8$ cm» · «$x$ cm» · «$ax+b$»)
    if tag == "delete" and context.db_has_figures and context.figures_placed and after_figure and re.fullmatch(r"[①-⑩]+", piece):
        return "그림: 보기 번호가 그림 속으로"
    if tag == "delete" and at_end and context.stream and len(piece) <= 12 and re.fullmatch(r"[가-힣]+", piece) \
            and not _SENTENCE.search(piece) and context.stream.count(piece) >= 3:
        return "군더더기: 꾸밈 글"  # 파일에 되풀이된 꾸밈 글(«소인 수 소인 수»)
    if tag == "delete" and re.fullmatch(r"□[①-⑩㉠-㉯]*", piece):
        return "표기: 답 칸"  # 문항 속 빈칸 «$box{~①~}$»
    if _symbols_only(orig) and _symbols_only(db):
        return _symbol_why(orig, db, whole_orig=whole_orig, whole_db=whole_db)
    if tag == "replace" and _keyword_letters(orig) and (_symbols_only(db) or _keyword_letters(db) or db == "π"):
        return "표기: 수식 낱말"
    if tag == "replace" and _keyword_letters(db) and _symbols_only(orig):
        return "표기: 수식 낱말"
    if tag in ("insert", "delete") and _keyword_letters(db or orig) and not _DIGIT.search(db or orig) and not _HANGUL.search(db or orig):
        return "표기: 수식 낱말"
    if tag == "delete" and NOISE.search(piece):
        return "군더더기"
    if tag == "delete" and (at_start or at_head) and re.fullmatch(r"0?\d{1,2}", piece):
        return "군더더기: 머리의 문항 번호"  # 문항 머리에 남은 번호 «01» — 가운데의 수는 내용이다(눈금 맞추기 2회차)
    if tag == "delete" and _title_evidence(orig, context.titles):
        return "군더더기: 머리글 · 단원 제목"
    if tag in ("insert", "delete") and re.fullmatch(r"(?:\(\d+\)|[①-⑩]|\([가-하]\))+", (db or orig).replace(FIGURE, "")):
        return "그림 표지: 번호"
    if _DIGIT.search(orig) or _DIGIT.search(db):
        return "내용: 수"
    if _LATIN.search(orig) or _LATIN.search(db):
        return "내용: 문자"
    return "내용: 글"


def boundary(tag: str, orig: str, db: str, context: Context, *, at_end: bool, whole_db: str, at_start: bool = False) -> str | None:
    """«내용»으로 보인 자리가 실은 **문항 경계**의 차이인가 — 증거가 있을 때만(모듈 머리말)."""
    if tag in ("delete", "replace") and orig and (tag == "delete" or not db.replace(FIGURE, "")):
        # 이웃 문항의 글 — 원본 쪽 **가장자리**(머리 · 꼬리)에서만, 그리고 그것이 묻는 말이면 DB 에 제 물음이 남아 있어야 한다
        # (눈금 맞추기 2회차: 이웃 문항과 같은 발문 «다음 그림에서 ∠x 의 크기를 구하시오» 를 잃은 DB 가 «경계»로 넘어갔다)
        at_edge = at_start or at_end
        own_question = bool(ASKS.search(whole_db.replace(FIGURE, "")))
        if _STEM_HEAD.search(orig) and (own_question or not ASKS.search(orig)):
            return "경계: 원본 쪽에 이웃 문항의 글"
        if at_edge and len(orig.replace(FIGURE, "")) >= 20 and not re.match(r"^\(?단", orig) and not _lost_subquestion(orig, whole_db) \
                and _contained(orig, context.neighbors) and (own_question or not ASKS.search(orig)):
            # 스무 자 넘는 조각만 — 짧은 조건 «(단, a 는 상수이다)» 은 이웃 문항과 같아도 DB 가 잃은 제 조건일 수 있다
            return "경계: 원본 쪽에 이웃 문항의 글"
        if at_end and context.next_missing and not _lost_subquestion(orig, whole_db) and _ends_with_ask(whole_db.replace(FIGURE, "")) \
                and not re.match(r"^\(?단|^또|^이때", orig):
            if ASKS.search(orig):
                return "경계: 원본 쪽에 다음 문항이 붙음"
            if orig.replace(FIGURE, "") in context.boxes or re.match(r"^[ㄱ-ㅎ]", orig):
                return "경계: 원본 쪽에 다음 문항의 자료"
    if tag in ("insert", "replace") and db and _contained(db, context.neighbors):
        return "내용: DB 에 이웃 문항의 글이 섞임"
    return None


def classify(tag: str, orig: str, db: str, *, at_start: bool, at_end: bool, next_to_figure: bool, context: Context,
             whole_orig: str, whole_db: str, after_figure: bool = False, at_head: bool = False) -> str:
    """어긋난 자리 하나의 까닭. «내용…» 으로 시작하면 내용이 다르다.

    표를 줄로 풀어 쓴 DB 는 표의 머리(«계산 결과»)를 보기마다 되풀이한다 — 이 문항 가까이의 표 칸에 있던 낱말이
    DB 에서 되풀이된 것은 «되풀이»다(원본에 없는 글이 아니다)."""
    why = _classify(tag, orig, db, at_start=at_start, next_to_figure=next_to_figure, context=context, whole_db=whole_db,
                    whole_orig=whole_orig, at_end=at_end, after_figure=after_figure, at_head=at_head)
    if not why.startswith("내용"):
        return why
    if tag == "insert" and len(db) >= 2 and not _DIGIT.search(db) and db in whole_orig and db in context.boxes:
        return "표기: 되풀이(표를 줄로 풀어 씀)"
    return boundary(tag, orig, db, context, at_end=at_end, at_start=at_start, whole_db=whole_db) or why


def _worst(whys: list[str]) -> str:
    for prefix in ("내용", "경계"):
        found = [why for why in whys if why.startswith(prefix)]
        if found:
            return found[0]
    return whys[0] if whys else "그림 표지"


def compare(db: Skeleton, orig: Skeleton, context: Context = Context()) -> Comparison:
    if db.strict == orig.strict:
        return Comparison("same", [], [], 1.0)
    matcher = difflib.SequenceMatcher(None, orig.strict, db.strict, autojunk=False)
    opcodes: list[Opcode] = []
    blocks = matcher.get_opcodes()
    changed = [b for b in blocks if b[0] != "equal"]
    for index, (tag, i1, i2, j1, j2) in enumerate(blocks):
        if tag == "equal":
            continue
        a, b = orig.strict[i1:i2], db.strict[j1:j2]
        at_start, at_end = index == 0, index == len(blocks) - 1
        near = db.strict[max(0, j1 - 1) : j2 + 1]
        # 그림 바로 뒤 · 문항의 머리(앞에 같은 글이 하나도 없다) — 이름표 · 머리의 번호를 가를 때
        after_figure = (i1 > 0 and orig.strict[i1 - 1] == FIGURE) or a.startswith(FIGURE)
        at_head = all(block[0] != "equal" or not orig.strict[block[1]:block[2]].replace(FIGURE, "") for block in blocks[:index])
        common = dict(context=context, whole_orig=orig.strict, whole_db=db.strict, after_figure=after_figure, at_head=at_head)
        # 낱말 조각 — 원본 쪽 끝에 붙은 글자가 DB 쪽 머리에 있다(«연 / 립방정식» 이 줄 · 쪽 넘김에 갈렸다)
        if len(changed) >= 2 and len(b) <= 2 and tag == "insert" and at_start and changed[-1][0] == "delete":
            if orig.strict[changed[-1][1] : changed[-1][2]].endswith(b) and _HANGUL.search(b):
                opcodes.append(Opcode(tag, a, b, "경계: 낱말 조각"))
                continue
        if len(changed) >= 2 and tag == "delete" and at_end and blocks[0][0] == "insert":
            head = db.strict[blocks[0][3] : blocks[0][4]]
            if len(head) <= 2 and a.endswith(head) and _HANGUL.search(head):
                rest = a[: len(a) - len(head)]
                why = classify("delete", rest, "", at_start=False, at_end=True, next_to_figure=False, **common) if rest else "경계: 낱말 조각"
                opcodes.append(Opcode(tag, a, b, why))
                continue
        if tag in ("delete", "replace") and FIGURE in a and a.replace(FIGURE, ""):
            # 그림 표지를 사이에 둔 조각들 — 하나씩 가른다(«-3 -2 a b c 60 ▣ ▣ 2 정수와 유리수 01~15 선택형»)
            pieces = [piece for piece in a.split(FIGURE) if piece]
            whys = [classify("delete", piece, "", at_start=at_start, at_end=at_end, next_to_figure=True, **common) for piece in pieces]
            if tag == "replace" and b.replace(FIGURE, ""):
                whys.append(classify("insert", "", b, at_start=at_start, at_end=at_end, next_to_figure=True, **common))
            opcodes.append(Opcode(tag, a, b, _worst(whys)))
            continue
        why = classify(tag, a, b, at_start=at_start, at_end=at_end, next_to_figure=FIGURE in near, **common)
        opcodes.append(Opcode(tag, a, b, why))
    reasons = sorted({op.why for op in opcodes})
    verdict = "different" if any(op.why.startswith("내용") for op in opcodes) else "notation"
    return Comparison(verdict, reasons, opcodes, matcher.ratio())
