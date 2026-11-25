"""중1 보수적 유형 규칙. 원문을 저장하지 않고 형식·계산 목표만 분류한다.

A는 실제 등록 생성기의 좁은 산식 구조와 같은 경우만 인정한다. B는 생성
가능성 후보이며, 기존 유형의 부재 또는 지면/정답 품질 인증이 아니다.
"""
import re

FAMILIES = {}


def family(key, name, section, variables, answer_method, *, engine=None,
           difficulty="easy", figure="none", rationale=None):
    FAMILIES[key] = dict(name=name, grade="중1", section=section,
        category="A" if engine else "B", engine_keys=[engine] if engine else [],
        variables=variables, answer_method=answer_method, figure=figure,
        difficulty=difficulty, rationale=rationale or (
            "현재 생성 견본의 조건·산식·요구 답이 같은 좁은 구조를 확인함."
            if engine else "정답을 결정적으로 계산할 수 있으나 현재 생성기의 고정 골격이 이 묶음의 표현·조건·요구 답을 모두 생성한다고 확정하지 않아 신규/확장 후보로 둠."))
    return key


# 실제 출력의 항 수와 연산을 맞춘 좁은 A. 숫자의 값 자체는 같을 필요가 없다.
for key, name, sec, number, formula in [
    ("m1-a-add2", "두 유리수의 덧셈", "유리수의 덧셈과 뺄셈", "01", "a+b를 유리수로 약분한다."),
    ("m1-a-sub2", "두 유리수의 뺄셈", "유리수의 덧셈과 뺄셈", "03", "a-b를 유리수로 약분한다."),
    ("m1-a-add3", "세 유리수의 덧셈", "유리수의 덧셈과 뺄셈", "02", "a+b+c를 유리수로 약분한다."),
    ("m1-a-mixed4", "네 유리수의 덧셈·뺄셈", "유리수의 덧셈과 뺄셈", "04", "연산 부호 순서대로 네 항을 더한다."),
    ("m1-a-mul2", "두 유리수의 곱셈", "유리수의 곱셈", "12", "두 분자·분모를 곱하고 약분한다."),
    ("m1-a-mul3", "세 정수의 곱셈", "유리수의 곱셈", "70", "세 분자·분모를 곱하고 약분한다."),
    ("m1-a-div2", "두 유리수의 나눗셈", "유리수의 나눗셈", "19", "첫 수에 둘째 수의 역수를 곱하고 약분한다."),
]:
    family(key, name, sec, "피연산자의 부호·분자·분모; 0인 분모와 나누는 수 제외", formula,
        engine="1-1|정수와 유리수의 계산|" + number)

for index, sec in enumerate(["유리수의 덧셈과 뺄셈", "유리수의 곱셈", "유리수의 나눗셈"]):
    for shape, name in [("single", "항 수·괄호·소수 표현을 넓힌 계산"), ("batch", "여러 계산식을 함께 묻는 연습 묶음")]:
        family(f"m1-b-calc-{index}-{shape}", name, sec,
            "허용 연산의 식 나무, 피연산자 부호·분자·분모·소수 자리, 소문항 수",
            "식 나무를 유리수 연산으로 계산하고 소문항 순서대로 답을 보존한다.", difficulty="mid" if index == 2 else "easy")

family("m1-b-reciprocal", "유리수 하나의 역수", "유리수의 나눗셈", "0이 아닌 기약분수", "분자와 분모를 교환하고 부호를 보존한다.")
family("m1-b-reciprocals", "여러 수의 역수를 한꺼번에 쓰기", "유리수의 나눗셈", "정수·소수·분수의 목록", "각 수를 기약분수로 바꾼 뒤 역수를 순서대로 낸다.")
family("m1-a-factor", "자연수 하나를 소인수분해", "소인수분해", "소수와 양의 지수", "생성한 소수별 지수의 곱을 정답으로 낸다.", engine="1-1|소인수분해|18")
family("m1-b-factor-batch", "여러 자연수의 소인수분해", "소인수분해", "자연수 목록과 소인수별 지수", "각 수의 소인수분해를 순서대로 낸다.")
family("m1-b-prime-factor-attributes", "소인수분해의 지수·소인수 요약값", "소인수분해", "소수 지지집합·지수·물어볼 합 또는 개수", "소인수분해 후 지수/소인수의 합·개수를 계산하고, 선택형이면 그 값을 후보끼리 비교한다.")
family("m1-b-divisor-selection", "제시된 후보에서 약수를 고르기", "소인수분해", "기준 자연수와 참·거짓 약수 후보", "각 후보 d에 대해 n mod d=0을 판정한다.")
family("m1-b-square-completion", "곱하거나 나누어 제곱수 만들기와 미지수", "소인수분해", "소수 지수의 짝홀, 곱셈/나눗셈 방향, 목표값", "홀수 지수인 소인수의 곱으로 최소 보정수를 만들고 목표식을 계산한다.", difficulty="mid")
family("m1-b-power-representation", "정해진 밑으로 거듭제곱 나타내기", "소수와 거듭제곱", "밑·양의 지수·정수 또는 단위분수", "반복 곱의 횟수 또는 소인수 지수를 세어 밑의 지수를 정한다.")
family("m1-b-power-product", "반복 곱을 거듭제곱으로 묶기", "소수와 거듭제곱", "인수 종류·반복 횟수·소문항 수", "같은 인수의 출현 횟수를 지수로 바꾼다.")
family("m1-b-prime-list", "수 목록의 소수·합성수 판별", "소수와 거듭제곱", "자연수 목록·요구 분류·보기 순서", "2 이상 각 수의 약수 존재를 검사해 요청 목록 또는 개수를 낸다.")
family("m1-b-prime-interval", "구간의 소수·합성수 개수와 목록", "소수와 거듭제곱", "구간 양끝·포함 여부·요구 분류", "정수 구간을 열거하여 소수성 검사 후 집계한다.")
family("m1-b-coprime-selection", "서로소인 수나 수쌍 선택", "공약수와 최대공약수", "기준수·후보 정수/수쌍·보기 순서", "후보마다 gcd=1인지 검사한다.")
family("m1-b-gcd", "최대공약수·공약수와 최소공배수의 계산 묶음", "공약수와 최대공약수", "자연수 목록·소인수 지수·요구값", "gcd와 필요한 경우 lcm을 구하고, 공약수는 gcd의 약수에서 조건에 맞게 집계한다.")
family("m1-b-lcm", "최소공배수·범위 공배수 계산", "공배수와 최소공배수", "자연수 목록·구간 경계·요구 순번", "lcm과 요청 시 gcd를 구한다. 범위/순번은 정수배로 세고, 보기 선택은 후보를 lcm으로 나눈 나머지가 0인지 판정한다.")
family("m1-b-gcd-lcm-exponents", "최대공약수·최소공배수에서 지수 역산", "공배수와 최소공배수", "각 소인수의 최소/최대 지수·빈 지수 위치", "소인수마다 min/max 제약을 풀고 요청한 지수의 합 등을 낸다.", difficulty="mid")
family("m1-b-rational-classify", "수 목록을 정수·자연수·유리수로 분류", "정수와 유리수", "분모·분자·소수·부호를 섞은 수 목록", "약분한 분모가 1인지와 부호로 분류한 뒤 목록/개수를 낸다.")
family("m1-b-abs-direct", "절댓값의 직접 계산과 양·음수 복원", "정수와 유리수", "부호가 있는 유리수 또는 절댓값·부호 조건", "절댓값 계산 또는 ±a 중 요구 부호의 값을 낸다.")
family("m1-b-order-list", "수 목록의 대소 비교·정렬", "수의 대소관계", "정수·소수·분수 목록·정렬 방향·값/절댓값 기준", "유리수의 값 또는 요구된 절댓값으로 정렬하여 지정 위치를 선택한다.")
family("m1-b-inequality-notation", "수의 범위를 부등호로 표현", "수의 대소관계", "상하한과 엄격/비엄격 경계", "문장 조건을 <, ≤, >, ≥로 변환한다.")
family("m1-b-integer-interval", "구간·절댓값 조건의 정수 집계", "수의 대소관계", "유리수 경계·절댓값 한계·요구 개수/합", "경계를 만족하는 정수만 열거해 집계한다.", difficulty="mid")
family("m1-b-symbols", "곱셈·나눗셈 기호 생략과 복원", "문자의 사용과 식의 값", "상수·문자·곱/몫의 식 나무", "곱과 몫을 계수·문자·분수의 표준식으로 변환하거나 역변환한다.")
family("m1-b-substitution", "주어진 문자값을 식에 대입", "문자의 사용과 식의 값", "유리수 대입값·차수·계수·분모식", "0 분모를 제외하고 식 나무를 유리수 연산으로 평가한다.")
family("m1-b-poly-attributes", "다항식의 항·계수·차수·상수항", "일차식의 뜻Ⅰ", "단항식 계수·차수·변수·질문할 속성", "전개된 다항식의 항 배열에서 요청 속성을 추출한다.")
family("m1-b-poly-classify", "다항식·일차식·동류항 선택", "일차식의 뜻Ⅰ", "단항식 목록의 변수와 지수·보기 순서", "각 항의 지수 벡터와 다항식 차수를 비교해 참인 후보를 고른다.")
family("m1-b-linear-calc", "일차식의 연산 골격 확장", "일차식의 뜻Ⅱ", "유리수 계수·괄호 배치·문자 수", "각 변수 계수와 상수항을 정확한 유리수로 모은다.")
family("m1-b-linear-batch", "여러 일차식 계산의 연습 묶음", "일차식의 뜻Ⅱ", "소문항 수·식 나무·유리수 계수", "소문항별 계수 벡터를 계산하고 답 순서를 보존한다.")
family("m1-b-linear-missing", "계산 결과에서 어떤 식·잘못 계산한 식 복원", "일차식의 뜻Ⅱ", "원래 식·오류 연산·결과식의 계수", "식의 계수 벡터를 역연산해 미지의 식과 올바른 결과를 구한다.", difficulty="mid")
family("m1-b-identity", "다항식 등식의 항등식 판별", "방정식과 그 해", "한 변수 등식 양변의 계수·상수·보기", "양변을 정리한 모든 계수가 같으면 항등식이다.")
family("m1-b-equation-candidate", "대입하여 방정식의 해 판별", "방정식과 그 해", "방정식 계수·후보 대입값", "각 후보를 양변에 대입해 일치 여부를 판정한다.")
family("m1-b-identity-parameter", "항등식이 되는 계수·상수 찾기", "방정식과 그 해", "항등식 양변의 알려진 계수·미지수 위치", "차수별 계수를 비교하여 선형조건을 풀고 목표값을 계산한다.", difficulty="mid")
family("m1-b-linear-equation", "다양한 계수·괄호의 일차방정식 풀이", "일차방정식의 풀이", "0이 아닌 최종 일차항 계수·상수·괄호/분수 구조", "양변을 ax+b=cx+d로 정리해 x=(d-b)/(a-c)를 구한다.")
family("m1-b-equation-parameter", "해 조건으로 방정식의 상수 구하기", "일차방정식의 활용(해의 응용)", "해·계수·미지상수 위치·같은 해인 방정식", "주어진 해 또는 첫 식의 해를 대입하여 미지상수를 푼다.", difficulty="mid")
family("m1-b-triangle-side", "삼각형 변의 정수 범위와 후보 선택", "작도", "두 변·정수 범위·나머지 변 후보", "|a-b|<c<a+b를 만족하는 후보를 센다.")
family("m1-b-triangle-rods", "막대에서 세 변을 고르는 조합", "작도", "막대 수·길이 목록", "서로 다른 세 막대의 조합 중 두 짧은 변의 합이 긴 변보다 큰 것을 센다.", difficulty="mid")
family("m1-b-polygon-diagonal", "대각선·삼각형 수에서 다각형 수량 역산", "다각형", "변 수 n·대각선/삼각형 수·목표량", "n-3, n-2, n(n-3)/2를 결합하거나 n을 역산한다.")
family("m1-a-triangle-max", "세 내각의 비에서 가장 큰 내각", "삼각형의 내각과 외각", "세 양의 비", "180×최대비/세 비의 합을 계산한다.", engine="1-2|다각형|07")
family("m1-b-triangle-ratio", "세 내각의 비에서 최소·복수 내각", "삼각형의 내각과 외각", "세 양의 비·요청할 내각", "180×각 비/세 비의 합으로 요구한 내각을 구한다.")
family("m1-b-regular-polygon", "정다각형 내각·외각에서 다른 수량 구하기", "다각형의 내각과 외각", "변 수·내각/외각의 비·목표 수량", "외각=360/n, 내각=180-360/n, 대각선=n(n-3)/2로 계산한다.", difficulty="mid")
family("m1-b-polygon-angle-sum", "다각형 내각합·외각합의 조합", "다각형의 내각과 외각", "변 수 목록·요구 합/차·소문항 수", "내각합=180(n-2), 외각합=360을 계산한다.")
family("m1-b-sector", "글로 조건이 완결된 부채꼴의 역산", "부채꼴의 호의 길이와 넓이", "반지름·중심각·호 길이 중 주어진 두 수량", "l=2πrθ/360, S=rl/2로 미지량을 구한다.", difficulty="mid")
family("m1-b-sphere", "구의 넓이·부피·반지름의 상호 역산", "구의 겉넓이와 부피", "반지름·표면적/부피 조건·목표량", "S=4πr², V=4πr³/3을 직접 계산하거나 역산한다.")
family("m1-b-stat-direct", "수 목록의 평균·중앙값·최빈값", "대푯값", "수치 자료·범주 자료(최빈값)·자료 개수·동률·소문항 수", "합/n, 정렬한 중간 값, 빈도 최댓값으로 요구 통계를 구한다.")
family("m1-b-stat-unknown", "대푯값 조건으로 미지 변량 구하기", "대푯값", "알려진 자료·목표 평균/중앙값/최빈값·미지수 범위", "평균 방정식 또는 순위·빈도 조건을 만족하는 미지 변량을 찾는다.", difficulty="mid")
family("m1-b-relative-frequency", "총도수·도수·상대도수 상호 계산", "상대도수", "총도수와 도수/상대도수·집단별 비", "상대도수=도수/총도수 및 비례식을 계산한다.")


family("m1-a-gcd2", "소인수분해된 두 수의 최대공약수", "공약수와 최대공약수", "소수별 두 지수", "각 소인수 지수의 최솟값을 취해 곱한다.", engine="1-1|최대공약수와 최소공배수|02")
family("m1-a-gcd3", "세 자연수의 최대공약수", "공약수와 최대공약수", "세 양의 정수", "gcd(gcd(a,b),c)를 계산한다.", engine="1-1|최대공약수와 최소공배수|18")
family("m1-a-lcm2", "소인수분해된 두 수의 최소공배수", "공배수와 최소공배수", "소수별 두 지수", "각 소인수 지수의 최댓값을 취해 곱한다.", engine="1-1|최대공약수와 최소공배수|07")
family("m1-a-lcm3", "세 자연수의 최소공배수", "공배수와 최소공배수", "세 양의 정수", "lcm(lcm(a,b),c)를 계산한다.", engine="1-1|최대공약수와 최소공배수|24")
family("m1-a-scalar-linear", "정수와 일차식의 곱", "일차식의 뜻Ⅱ", "정수 계수와 상수항·곱하는 정수", "분배법칙으로 두 계수에 같은 정수를 곱한다.", engine="1-1|문자의 사용과 식의 계산|11")


# 동결 표본의 보수 과잉을 재검토한 뒤 더한 B. A 판정 범위는 그대로 둔다.
family("m1-b-prime-set-outlier", "소인수 집합이 다른 자연수 선택", "소인수분해", "공통 소수 집합·지수·다른 소인수를 넣은 후보 위치", "각 후보를 소인수분해해 지수를 버린 소인수 집합을 비교한다.")
family("m1-b-poly-truth", "주어진 일차식의 속성·대입 진술 OX", "일차식의 뜻Ⅰ", "일차식의 계수·상수항·대입값·참거짓 진술", "차수·계수·상수항을 추출하고 대입값을 계산해 각 진술의 값과 비교한다.")
family("m1-b-stat-mean-median", "평균과 중앙값을 같게 하는 미지 변량", "대푯값", "알려진 네 수·미지 자연수·중앙값이 바뀌는 경계", "정렬상 미지수의 위치별 평균=중앙값 방정식을 풀고 해당 순위와 자연수 조건을 확인한다.", difficulty="mid")
family("m1-b-stat-added-median", "자료 한 개 추가 뒤 중앙값", "대푯값", "기존 짝수 자료 수·가운데 아래 값·중앙값·추가 자료", "위쪽 가운데 값=2×중앙값−아래 값; 그 값보다 큰 자료 하나를 더하면 새 중앙값은 위쪽 가운데 값이다.", difficulty="mid")
family("m1-b-discount-installments", "정액 선차감·비율 할인 뒤 균등 납부", "일차방정식의 활용(증가와 감소, 원가와 정가)", "정가·먼저 쓸 적립금·할인율·납부 개월 수", "(정가−적립금)×(1−할인율/100)/개월 수를 계산한다.", difficulty="mid")
family("m1-b-coordinate-triangle", "축과 평행한 변이 있는 좌표 삼각형 넓이", "순서쌍과 좌표평면(응용)", "세 점의 정수 좌표·수평 또는 수직 밑변·높이", "축에 평행한 변의 좌표 차와 나머지 점까지 수직거리의 곱을 2로 나눈다.")
family("m1-b-proportional-membership", "정비례식에 제시된 점이 속하는지 OX", "정비례 관계 y=ax의 그래프", "0이 아닌 비례상수·점의 유리수 좌표·참거짓", "제시된 (u,v)에 대해 v=a×u인지 유리수 연산으로 판정한다.")
family("m1-b-inverse-monotonic", "수치 반비례식의 증감 진술 OX", "반비례 관계 y=a/x의 그래프", "0이 아닌 수치 비례상수·증가/감소 진술·x의 구간", "두 점의 차 -a(x2−x1)/(x1x2)의 부호를 판정한다. 구간 미지정은 양·음 구간과 0을 가로지르는 경우를 모두 검사한다.", difficulty="mid")


def exact_gcd_lcm(t, target):
    # Only one target, one set, and complete factor expressions; no inverse task.
    if not re.search(target + r"를?\s*구하시오", t) or re.search(r"[⑴-⑽]|\([1-9]\)|각각|일 때|할 때|개수|합|최대공약수와|최소공배수와", t):
        return None
    values = []
    for part in maths(t):
        values.extend(x for x in normalize(part).replace("~", "").split(",") if x)
    if len(values) == 3 and all(re.fullmatch(r"\d+", x) for x in values):
        return "3"
    if len(values) == 2 and all(numeric_expression(x) and r"\times" in x and not re.search(r"[-+/.]", x) for x in values):
        return "2"
    return None


def stem(text):
    """Drop answer options only; keep data before them."""
    return re.split(r"[①②③④⑤]", text, maxsplit=1)[0].strip()


def maths(text):
    return re.findall(r"\$([^$]+)\$", text)


def normalize(expr):
    expr = re.sub(r"\\(?:left|right|,|;|!|quad|qquad)", "", expr)
    return re.sub(r"\s+", "", expr).replace("−", "-")


NUM = r"(?:\d+(?:\.\d+)?|\\(?:d?frac)\{[+-]?\d+\}\{\d+\})"
ATOM = rf"(?:[+-]?{NUM}|\([+-]?{NUM}\))"


def numeric_expression(expr):
    t = normalize(expr)
    t = re.sub(r"\\(?:d?frac)\{([+-]?\d+)\}\{(\d+)\}", r"(\1/\2)", t)
    t = t.replace(r"\times", "*").replace(r"\div", "/").replace(r"\cdot", "*")
    return bool(re.fullmatch(r"[0-9+*/().^{}\[\]-]+", t) and re.search(r"\d", t))


def pure_calculation(text, variables=False):
    """Require a complete calculation instruction, then only supported maths.

    The original expressions are used only in memory. Missing expressions never match.
    """
    ms = maths(text)
    if not ms or not re.search(r"계산|간단히", text):
        return None
    prose = re.sub(r"\$[^$]+\$", "", text)
    prose = re.sub(r"[⑴-⑽]|\([1-9]\d?\)|\[[1-9]\d?\]", "", prose)
    prose = re.sub(r"다음|식의|식을|식|을|를|계산하시오|계산하여라|계산해\s*보자|간단히\s*하시오|계산하면\?|계산한\s*것은\?|하시오|[\s.,?]", "", prose)
    if prose:
        return None
    if variables:
        # Single letters and basic rational/polynomial operations only.
        clean = [re.sub(r"[a-zA-Z]", "1", re.sub(r"\\[a-zA-Z]+", "", m)) for m in ms]
        if all(re.fullmatch(r"[0-9+*/().^{}\[\]\s,-]+", x) for x in clean):
            return ms
        return None
    return ms if all(numeric_expression(m) for m in ms) else None


def direct_factor(text):
    ms = maths(text)
    if len(ms) != 1 or not re.fullmatch(r"\d+", ms[0].strip()):
        return False
    prose = re.sub(r"\$[^$]+\$", "", text)
    return bool(re.fullmatch(r"\s*(?:다음\s*(?:수|자연수)를?\s*)?(?:을|를)?\s*소인수분해\s*(?:하시오|하여라)\.?\s*", prose))


def numeric_options(text):
    """An empty numeric stem is valid when all five choices supply complete numbers."""
    parts = re.split(r"[①②③④⑤]", text)
    return len(parts) == 6 and all(
        re.fullmatch(r"\s*\$[^$]+\$\s*", part)
        and numeric_expression(maths(part)[0]) for part in parts[1:])


def coordinate_triangle(text):
    clean = normalize(re.sub(r"\\(?:mathrm|text)\{([^}]+)\}", r"\1", text)).replace("~", "")
    pairs = re.findall(r"\(([+-]?\d+),([+-]?\d+)\)", clean)
    if len(pairs) != 3:
        return False
    points = [(int(x), int(y)) for x, y in pairs]
    for i, j, k in [(0, 1, 2), (0, 2, 1), (1, 2, 0)]:
        a, b, c = points[i], points[j], points[k]
        if (a[0] == b[0] and a[1] != b[1] and c[0] != a[0]) or (a[1] == b[1] and a[0] != b[0] and c[1] != a[1]):
            return True
    return False


def added_median(text):
    middle = re.search(r"중앙값은\s*\$(\d+)\$", text)
    lower = re.search(r"번째[^.]*?(?:성적은|점수는)\s*\$(\d+)\$", text)
    new = re.search(r"(?:성적이|점수가)\s*\$(\d+)\$점인 학생이 들어", text)
    return bool(middle and lower and new and int(new[1]) >= 2 * int(middle[1]) - int(lower[1]))


def proportional_membership(text):
    ms = [normalize(x) for x in maths(text)]
    return (any(re.fullmatch(rf"y=[+-]?{NUM}?x", x) for x in ms)
            and sum(bool(re.fullmatch(rf"\([+-]?{NUM},[+-]?{NUM}\)", x)) for x in ms) == 1)


def classify(row):
    if row.get("grade") != "중1":
        return None
    text = row.get("content") or ""
    if row.get("has_figure") or "그림" in text or row.get("question_type") == "서술형":
        return None
    s = row["section"]
    t = stem(text)
    ms = maths(t)
    # No numeric/algebraic evidence is no licence to infer missing formulae.
    if not ms and not re.search(r"\d|[삼사오육칠팔구십]각형", t) and not numeric_options(text):
        return None

    calc_sections = ["유리수의 덧셈과 뺄셈", "유리수의 곱셈", "유리수의 나눗셈"]
    if s in calc_sections:
        calc = pure_calculation(t)
        if calc:
            idx = calc_sections.index(s)
            if len(calc) == 1:
                e = normalize(calc[0])
                # Decimal notation is conservatively outside these exact generators.
                if "." not in e:
                    patterns = []
                    if idx == 0:
                        patterns = [(rf"{ATOM}\+{ATOM}", "m1-a-add2"), (rf"{ATOM}-{ATOM}", "m1-a-sub2"), (rf"{ATOM}\+{ATOM}\+{ATOM}", "m1-a-add3")]
                        if re.fullmatch(rf"{ATOM}[+-]{ATOM}[+-]{ATOM}[+-]{ATOM}", e):
                            # Handler 04 always uses +--, so preserve that operation pattern.
                            if re.fullmatch(rf"{ATOM}\+{ATOM}-{ATOM}-{ATOM}", e):
                                return "m1-a-mixed4"
                    elif idx == 1:
                        patterns = [(rf"{ATOM}\\times{ATOM}", "m1-a-mul2"), (rf"{ATOM}\\times{ATOM}\\times{ATOM}", "m1-a-mul3")]
                    elif idx == 2:
                        patterns = [(rf"{ATOM}\\div{ATOM}", "m1-a-div2")]
                    for pat, key in patterns:
                        if re.fullmatch(pat, e):
                            if key == "m1-a-mul3" and "frac" in e:
                                break
                            return key
                return f"m1-b-calc-{idx}-single"
            return f"m1-b-calc-{idx}-batch"
        if s == "유리수의 나눗셈" and "역수" in t and re.search(r"역수를?\s*구하시오", t):
            prose = re.sub(r"\$[^$]+\$", "", t)
            if re.search(r"합|곱|차|이용|일 때|옳", prose):
                return None
            if ms and all(re.fullmatch(ATOM, normalize(m)) for m in ms):
                return "m1-b-reciprocal" if len(ms) == 1 and "." not in ms[0] else "m1-b-reciprocals"
        return None

    if s == "소인수분해":
        if re.search(r"다른 소인수|소인수가 다른", t) and numeric_options(text):
            return "m1-b-prime-set-outlier"
        if direct_factor(t):
            return "m1-a-factor"
        if "소인수분해" in t and re.search(r"소인수분해\s*(?:하시오|하여라)", t) and len(ms) > 1 and all(re.fullmatch(r"\d+", m.strip()) for m in ms):
            return "m1-b-factor-batch"
        if re.search(r"(?:소인수|지수)의?\s*(?:합|개수)|지수의 합", t) and not re.search(r"약수의 개수|보기|옳|아닌", t):
            return "m1-b-prime-factor-attributes"
        if re.search(r"약수", t) and re.search(r"고른|고르|아닌|모두.*것", t) and not re.search(r"공약수|최대|최소|소인수의", t):
            return "m1-b-divisor-selection"
        if "제곱" in t and re.search(r"곱하|곱하여|곱해|나누어|나누면", t) and re.search(r"가장 작은|최소", t):
            return "m1-b-square-completion"
        return None

    if s == "소수와 거듭제곱":
        if re.search(r"거듭제곱.*나타내", t) and ("밑" in t or "안의 수" in t):
            return "m1-b-power-representation"
        if re.search(r"거듭제곱.*나타내", t) and any(r"\times" in m for m in ms):
            return "m1-b-power-product"
        if re.search(r"소수|합성수", t) and re.search(r"다음.*(?:중|수)|보기", t) and not re.search(r"설명|성질|옳|약수|쌍둥이|출처|방법|읽고|규칙|배수|만족", t):
            return "m1-b-prime-list"
        if re.search(r"소수|합성수", t) and re.search(r"이상|이하|보다|사이", t) and not re.search(r"설명|성질|옳|만족", t):
            return "m1-b-prime-interval"
        return None

    if s == "공약수와 최대공약수":
        exact = exact_gcd_lcm(t, "최대공약수")
        if exact:
            return "m1-a-gcd" + exact
        if "서로소" in t and re.search(r"다음|고르|고른|것은|몇|개수", t):
            return "m1-b-coprime-selection"
        if re.search(r"최대공약수|공약수", t) and re.search(r"구하시오|것은\?|개수|합", t) and not re.search(r"일 때|일때|자연수.*[a-z]|각각.*나누|설명|옳", t):
            return "m1-b-gcd"
        return None
    if s == "공배수와 최소공배수":
        exact = exact_gcd_lcm(t, "최소공배수")
        if exact:
            return "m1-a-lcm" + exact
        if "최소공배수" in t and "일 때" in t and re.search(r"자연수.*[abc]|[abc].*값", t):
            return "m1-b-gcd-lcm-exponents" if "^{" in t and "제곱" not in t else None
        if re.search(r"공배수", t) and re.search(r"구하시오|것은\?|개수|몇|작은|큰|가까운", t) and not re.search(r"설명|옳|서로소|제곱|어떤 자연수|□|square", t) and not any(re.search(r"[a-zA-Z]", re.sub(r"\\[a-zA-Z]+", "", m)) for m in ms):
            return "m1-b-lcm"
        return None

    if s == "정수와 유리수":
        if re.search(r"정수|자연수|유리수", t) and re.search(r"다음.*(?:중|수)|보기", t) and not re.search(r"설명|성질|옳|절댓값|항상|모든", t):
            return "m1-b-rational-classify"
        if "절댓값" in t and re.search(r"구하시오|나타내시오", t) and not re.search(r"수직선|거리|조건|합|차|사이|작은|큰|개수", t):
            return "m1-b-abs-direct"
        return None
    if s == "수의 대소관계":
        if re.search(r"부등호.*나타내", t) and re.search(r"보다|이상|이하|미만|초과", t):
            return "m1-b-inequality-notation"
        if re.search(r"가장.*(?:큰|작은|오른쪽|왼쪽)|차례|대소", t) and re.search(r"다음.*수|중에서|중 가장", t) and not re.search(r"만족|어떤|일 때|일때", t):
            return "m1-b-order-list"
        if "정수" in t and re.search(r"개수|모두.*합|모두.*구하", t) and re.search(r"사이|보다|이상|이하|절댓값|만족", t):
            return "m1-b-integer-interval"
        return None

    if s == "문자의 사용과 식의 값":
        if re.search(r"기호.*(?:생략|사용)|생략된.*기호|생략한.*것", t) and not re.search(r"한 개|속력|넓이|둘레|무게|성적|시간|거리|자리의|값은", t) and ms and any(re.search(r"[a-z]", re.sub(r"\\[a-z]+", "", m)) for m in ms):
            return "m1-b-symbols"
        if re.search(r"일\s*때", t) and re.search(r"식의\s*값|값을\s*구하시오", t) and re.search(r"\$[a-z]\s*=", t) and not re.search(r"가장|알맞|소리|온도|기온|요금|속력|거리를|길이|넓이|무게|반지름|비용|원가|도형|옳|키가|체중|칼로리", t):
            return "m1-b-substitution"
        return None
    if s == "일차식의 뜻Ⅰ":
        if ms and "다항식" in t and re.search(r"옳.*표", t) and all(word in t for word in ["차수", "계수", "상수항"]) and re.fullmatch(rf"[+-]?{NUM}?[a-z][+-]{NUM}", normalize(ms[0])):
            return "m1-b-poly-truth"
        if re.search(r"항의 개수|상수항|계수|차수|항과", t) and re.search(r"구하시오|값은|얼마|말하시오", t) and not re.search(r"일차식일|일차식이|되도록|동류항|옳|설명", t):
            return "m1-b-poly-attributes"
        if re.search(r"단항식|일차식|동류항", t) and re.search(r"고르|고른|것은|몇 개|개수", t) and not re.search(r"설명|옳|조건", t):
            return "m1-b-poly-classify"
        return None
    if s == "일차식의 뜻Ⅱ":
        calc = pure_calculation(t, variables=True)
        if calc and any(re.search(r"[a-z]", re.sub(r"\\[a-z]+", "", m)) for m in calc):
            if len(calc) == 1:
                e = normalize(calc[0]).replace(r"\times", "")
                if not re.search(r"[.\\^]", e):
                    e = re.sub(r"[a-z]", "x", e)
                    coefficient = r"(?:[+-]?\d+|\([+-]?\d+\))"
                    linear = r"\([+-]?\d*x[+-]\d+\)"
                    if re.fullmatch(coefficient + linear, e) or re.fullmatch(linear + coefficient, e):
                        return "m1-a-scalar-linear"
            return "m1-b-linear-batch" if len(calc) > 1 else "m1-b-linear-calc"
        if re.search(r"어떤 (?:식|다항식)|잘못.*더|잘못.*빼", t) and re.search(r"구하시오|것은|값은|얼마", t):
            return "m1-b-linear-missing"
        return None
    if s == "방정식과 그 해":
        if re.search(r"들어갈 식|알맞은 식", t):
            return None
        if "항등식" in t and re.search(r"일 때|일때|되도록|되는 상수", t) and "=" in t and not re.search(r"들어갈 식|알맞은 식", t):
            return "m1-b-identity-parameter"
        if "항등식" in t and re.search(r"고르|고른|것은|개수", t) and "=" in text:
            return "m1-b-identity"
        if re.search(r"해인|해가 되는|해로 갖는|참이 되|거짓이 되", t) and "=" in text:
            return "m1-b-equation-candidate"
        return None
    if s == "일차방정식의 풀이":
        if "=" in t and re.search(r"해를 구|해는|푸시오|풀어|만족시키는.*값", t) and not re.search(r"상수|계수.*값|개수|이항|빈칸|□|square|밑줄|옳|▲|★|△|라고 할 때|라고 정의", t):
            return "m1-b-linear-equation"
        return None
    if s == "일차방정식의 활용(해의 응용)":
        if "=" in t and re.search(r"해가 같|해가.*일 때|해는", t) and re.search(r"상수|[abc].*값", t) and not re.search(r"자연수가|정수가|모든|개수|가장", t):
            return "m1-b-equation-parameter"
        return None

    if s == "일차방정식의 활용(증가와 감소, 원가와 정가)":
        if all(word in t for word in ["정가", "적립금", "먼저", "할인", "개월", "나누어", "한 달"]) and len(ms) == 4:
            return "m1-b-discount-installments"
        return None
    if s == "순서쌍과 좌표평면(응용)":
        if "삼각형" in t and re.search(r"넓이를 구하시오|넓이는", t) and coordinate_triangle(t):
            return "m1-b-coordinate-triangle"
        return None
    if s == "정비례 관계 y=ax의 그래프":
        if "지나는 점인" in t and re.search(r"표.*하시오", t) and proportional_membership(t):
            return "m1-b-proportional-membership"
        return None
    if s == "반비례 관계 y=a/x의 그래프":
        if re.search(r"옳은.*O|옳은.*표", t) and re.search(r"증가하면.*(?:증가|감소)", t) and not re.search(r"사분면|원점|축|㉠|⑴|직선", t) and any(re.fullmatch(r"y=[+-]?\\(?:d?frac)\{[1-9]\d*\}\{x\}", normalize(m)) for m in ms):
            return "m1-b-inverse-monotonic"
        return None
    if s == "작도":
        if "삼각형" in t and re.search(r"막대|선분", t) and re.search(r"개수|몇 가지", t) and re.search(r"길이", t):
            return "m1-b-triangle-rods"
        if "삼각형" in t and re.search(r"세 변|두 변|나머지 한 변", t) and re.search(r"자연수|값이 될|길이가 될|정수", t):
            return "m1-b-triangle-side"
        return None
    if s == "다각형":
        if "대각선" in t and re.search(r"개수|개인|몇 개|구하시오|다각형은", t) and not re.search(r"옳|설명|정의", t):
            return "m1-b-polygon-diagonal"
        return None
    if s == "삼각형의 내각과 외각":
        if re.search(r"세 내각의 크기의 비", t) and re.search(r"[0-9].*[:∶].*[0-9]", t):
            if re.search(r"가장 큰 내각의 크기(?:를|는)", t) and not re.search(r"작은|각각|외각", t):
                return "m1-a-triangle-max"
            if re.search(r"가장 작은|각각", t):
                return "m1-b-triangle-ratio"
        return None
    if s == "다각형의 내각과 외각":
        if "정다각형" in t and re.search(r"한 내각|한 외각|크기의 비", t) and not re.search(r"옳|설명", t):
            return "m1-b-regular-polygon"
        if re.search(r"내각.*합|외각.*합", t) and not re.search(r"옳|설명", t):
            return "m1-b-polygon-angle-sum"
        return None
    if s == "부채꼴의 호의 길이와 넓이":
        if "부채꼴" in t and sum(x in t for x in ["반지름", "중심각", "호의 길이", "넓이"]) >= 3 and len(ms) >= 2 and not re.search(r"색칠|겹친|이동|회전|접어|오려", t):
            return "m1-b-sector"
        return None
    if s == "구의 겉넓이와 부피":
        if re.search(r"겉넓이|부피", t) and not re.search(r"쇠구슬|녹여|접하|반구|겹친", t):
            return "m1-b-sphere"
        return None
    if s == "대푯값":
        if re.search(r"평균과 중앙값이 (?:서로 )?같", t) and "자연수" in t and "모두 구하시오" in t and len(ms) == 6:
            return "m1-b-stat-mean-median"
        if re.search(r"들어왔.*중앙값", t) and re.search(r"3.*번째|세 번째", t) and re.search(r"\$6\$명", t) and re.search(r"\$7\$명", t) and len(ms) >= 5 and added_median(t):
            return "m1-b-stat-added-median"
        if re.search(r"평균|중앙값|최빈값", t) and re.search(r"[ax].*값|자연수.*개수", t) and re.search(r"일 때|조건", t):
            return "m1-b-stat-unknown"
        if re.search(r"(?:평균|중앙값|최빈값)(?:을|은|이|과|과\s*최빈값을)", t) and len(ms) >= 3 and not re.search(r"적절|좋은|추가|옳|설명|변하|한 명|더 들어|들어왔|제외|제거|비교|될 수|나머지 변량|일 때|조건", t) and not any(re.search(r"[a-zA-Z]", re.sub(r"\\(?:mathrm|text)\{[^}]*\}|\\[a-zA-Z]+", "", m)) for m in ms):
            return "m1-b-stat-direct"
        return None
    if s == "상대도수":
        if "상대도수" in t and "도수" in t and len(ms) >= 2 and re.search(r"구하시오|비는|얼마|몇", t) and not re.search(r"옳|설명|비교|더 높", t):
            return "m1-b-relative-frequency"
    return None
