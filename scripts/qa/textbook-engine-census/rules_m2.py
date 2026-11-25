"""중2 전수 대조용 보수적 구조 규칙. 원문 보관·DB/API 호출 없음.

규칙이 뜻하는 것은 생성 가능성이지 원본 정답/지면의 승인 아님.
같은 단원만으로 A를 만들지 않는다. A는 실제 handler 견본과 조건·목표를
좁혀 대조한 갈래이며, 구조 확장이 필요한 계산형은 B, 나머지는 None이다.
"""
import re
from math import gcd

FAMILIES = {}
_RULES = []


def add(slug, section, name, variables, answer_method, pred, *, category='B', key=None,
        difficulty='mid', figure='none', rationale=None):
    fid = 'm2-' + slug
    FAMILIES[fid] = dict(name=name, grade='중2', section=section, category=category,
        engine_keys=[key] if key else [], variables=variables, answer_method=answer_method,
        figure=figure, difficulty=difficulty,
        rationale=rationale or '수치·조건·목표를 제한한 결정적 후보. 현재 등록 유형의 동일 조건 생성은 확인하지 않아 B로 둔다.')
    _RULES.append((fid, section, pred))


def _has(t, *patterns):
    return all(re.search(p, t) for p in patterns)


def _no(t, pattern):
    return re.search(pattern, t) is None


def _math(t):
    return re.findall(r'\$([^$]+)\$', t)


def _clean_math(t):
    for a, b in [('\\left', ''), ('\\right', ''), ('\\,', ''), ('\\;', ''),
                 ('\\leq', '≤'), ('\\geq', '≥'), ('\\le', '≤'), ('\\ge', '≥'), ('~', '')]:
        t = t.replace(a, b)
    return re.sub(r'\s+', '', t)


def _simple_ineq(t, row):
    # Existing key 07: ax+b relation cx+d; scalar coefficients and one target.
    m = _math(t)
    if len(m) != 1 or not re.search(r'의 해[는를]|풀[면어]|푸시오', t):
        return False
    if not _no(t, r'자연수|정수|개수|가장|모두|같은|다른|상수|범위|⑴|\(1\)'):
        return False
    expr = _clean_math(m[0])
    z = re.fullmatch(r'([+-]?\d*)x([+-]\d+)?([<>≤≥])([+-]?\d*)x([+-]\d+)?', expr)
    if not z:
        return False
    def coefficient(s):
        return {'': 1, '+': 1, '-': -1}.get(s, int(s) if s not in ['', '+', '-'] else 1)
    return coefficient(z[1]) != coefficient(z[4])


def _finite_direct(t, row):
    if not re.search(r'(?:유한)?소수로 나타내(?:시오|어라|면)', t) or not _no(t, r'일 때|모두|분모|분자|가장|⑴|\(1\)|중에서|다음 중'):
        return False
    ms = _math(t)
    if len(ms) != 1:
        return False
    m = re.fullmatch(r'\\d?frac\{([1-9]\d*)\}\{([1-9]\d*)\}', _clean_math(ms[0]))
    if not m:
        return False
    a, b = map(int, m.groups())
    if a >= b:
        return False
    b //= gcd(a, b)
    for p in [2, 5]:
        while b % p == 0:
            b //= p
    return b == 1


def _repeat_to_frac(t, row):
    if not re.search(r'(?:기약)?분수로 나타내(?:시오|어라|면)', t) or not _no(t, r'일 때|합|곱|차|역수|⑴|\(1\)|다음 중'):
        return False
    ms = _math(t)
    return len(ms) == 1 and bool(re.fullmatch(r'0\.[1-9]\\dot\{[1-9]\}', _clean_math(ms[0])))


def _dice_difference(t, row):
    # Exactly two dice, a single absolute-difference target; engine key 70.
    return _has(t, r'(?:서로 다른 두 개|서로 다른 \$?2\$?개)의 주사위',
                r'동시에 던', r'두 눈의 수의 차가 \$?[1-5]\$?인 경우의 수') and _no(t, r'또는|이상|이하|보다|⑴|\(1\)')


def _prob_complement(t, row):
    return _has(t, r'동전', r'적어도 한 개', r'앞면', r'확률') and _no(t, r'주사위|뒷면.*앞면|세 번|두 번|⑴|\(1\)')


add('a-finite-direct', '유리수와 소수', '진분수를 유한소수로 직접 변환',
    '분모의 2·5 지수와 기약 분자', '분모를 10의 거듭제곱으로 확장하여 소수로 쓴다.', _finite_direct,
    category='A', key='2-1|유리수와 순환소수|36', difficulty='easy',
    rationale='단일 진분수의 직접 변환이며 약분한 분모가 2·5만 갖는지 코드로 확인; handler 36의 목표와 일치.')
add('a-repeat-prefix-frac', '순환소수의 분수 표현', '비순환 한 자리·순환 한 자리 소수의 분수 변환',
    '비순환 숫자와 순환 숫자', '(두 자리 정수−비순환 숫자)/90을 약분한다.', _repeat_to_frac,
    category='A', key='2-1|유리수와 순환소수|41', difficulty='easy',
    rationale='0.a(b 반복) 하나를 기약분수로 바꾸는 구조만 허용; handler 41 견본의 비순환/순환 길이와 목표 일치.')
add('a-linear-ineq', '일차부등식의 풀이', '양변 정수 일차식 부등식의 해',
    '양변의 정수 계수·상수항과 부등호', '(a−c)x 관계 d−b를 풀고 음수로 나누면 부등호를 뒤집는다.', _simple_ineq,
    category='A', key='2-1|일차부등식|07', difficulty='easy',
    rationale='미지수 x 하나, 양변 ax+b 꼴, 해 구하기 하나를 정규식으로 확인; handler 07의 동일 구조. 자연수 개수·역산·복수 문항 제외.')
add('a-dice-difference', '경우의 수', '두 주사위 눈 차의 경우의 수',
    '눈 차 1~5', '순서쌍 1~6 두 축 중 절댓값 차가 목표인 쌍을 센다.', _dice_difference,
    category='A', key='2-2|경우의 수|70', difficulty='easy',
    rationale='구별되는 두 주사위를 동시에 던져 단일 차를 묻는 조건·목표를 모두 확인; handler 70과 일치.')
add('a-coin-complement', '확률의 뜻과 성질', '동전에서 앞면이 적어도 한 번 나올 확률',
    '동전의 개수', '전체 확률 1에서 전부 뒷면일 확률 2^(-n)을 뺀다.', _prob_complement,
    category='A', key='2-2|확률|05', difficulty='easy',
    rationale='동전을 동시에 던지는 단일 여사건 구조; handler 05의 조건과 목표 일치. 주사위 혼합·소문항 제외.')

# Handler 08의 두 분수 공통 배수와 handler 06의 다섯 보기/정답 둘만 승격.
def _two_fractions_min(t, row):
    fs = re.findall(r'\\d?frac\{([1-9]\d*)\}\{([1-9]\d*)\}', t)
    return len(fs) == 2 and _has(t, r'두 분수', r'각각', r'곱', r'유한소수', r'가장 작은') and _no(t, r'두 자리|세 자리|개수|분모가')


def _terminating_two_choices(t, row):
    if not _has(t, r'유한소수', r'모두') or not _no(t, r'옳은|옳지|설명|분모를|사이|값'):
        return False
    choices = re.split(r'[①②③④⑤]', row['content'])[1:]
    if len(choices) != 5:
        return False
    numeric = []
    for c in choices:
        m = re.fullmatch(r'\$\s*\\d?frac\{([1-9]\d*)\}\{([1-9]\d*)\}\s*\$', c.strip())
        if not m:
            return False
        a, b = map(int, m.groups())
        b //= gcd(a, b)
        for prime in (2, 5):
            while b % prime == 0:
                b //= prime
        numeric.append(b == 1)
    return sum(numeric) == 2 and len(re.findall(r'[①②③④⑤]', row.get('answer', ''))) == 2


add('a-common-finite-multiplier', '유리수와 소수', '두 분수를 유한소수로 만드는 최소 공통 배수',
    '기약 분모의 2·5 이외 인수', '두 기약 분모에서 2·5를 제거한 수의 최소공배수를 구한다.', _two_fractions_min,
    category='A', key='2-1|유리수와 순환소수|08',
    rationale='단순 수치 분수 둘·각각 같은 자연수 곱·가장 작은 자연수 목표를 확인. m2Rational.ts handler 08의 알고리즘/조건과 일치.')
add('a-finite-choice-two', '유리수와 소수', '다섯 수치 분수 중 유한소수 둘 선택',
    '분자·분모·보기 순서', '약분 분모의 2·5 이외 인수를 검사하여 유한소수 둘을 고른다.', _terminating_two_choices,
    category='A', key='2-1|유리수와 순환소수|06', difficulty='easy',
    rationale='보기 다섯 개가 모두 수치 분수이고 유한소수 정확히 둘임을 독립 소인수 계산으로 확인. handler 06과 동일 선택 구조.')

# 소수: 참거짓 개념 진술은 이 규칙들에 들어가지 않는다.
add('finite-fraction-choice', '유리수와 소수', '수치 분수의 유한·순환 여부 선택',
    '보기 분자·분모와 정답 위치', '각 분수를 약분하고 분모의 2·5 이외 소인수 유무를 판정한다.',
    lambda t,r: _has(t, r'유한소수|순환소수', r'다음.*(?:중|분수)', r'나타낼|나타냈|나타낼 수|소수로 나타낼') and _no(t, r'옳은|옳지|유리수|설명|사이|일 때|수 있을 때|값|두 조건') and bool(re.search(r'\\d?frac\{\d+\}',r['content'])), difficulty='easy')
add('finite-denominator-parameter', '유리수와 소수', '유한소수 조건으로 분수 속 자연수 찾기',
    '분자·분모 인수와 미지수 범위', '약분한 분모가 2^u5^v인지 제한 범위의 자연수를 검사한다.',
    lambda t,r: _has(t, r'유한소수|순환소수', r'\\d?frac', r'자연수|값이 될|값으로|값을') and _no(t, r'순환마디|사이|각각.*곱|분모와 분자'))
add('finite-common-multiplier', '유리수와 소수', '여러 분수의 공통 유한소수 배수',
    '분수 둘 이상의 기약 분모', '각 분모에서 2·5 인수를 제거한 수들의 최소공배수를 구한다.',
    lambda t,r: _has(t, r'유한소수', r'각각', r'곱', r'가장 작은', r'\\d?frac'))
add('finite-power-ten', '유리수와 소수', '분모를 10의 거듭제곱으로 바꾼 계수',
    '2·5 인수 지수와 분자', '기약 분모 2^u5^v에 2^(m−u)5^(m−v)를 곱한다(m=max(u,v)).',
    lambda t,r: _has(t, r'\\d?frac', r'10', r'거듭제곱|꼴로|분모', r'가장 작은|최솟값|값을|최소'))
add('decimal-place-count', '유리수와 소수', '유한소수 자릿수와 자리숫자',
    '분자·분모 및 요구 자리', '기약 분모의 2·5 지수 최댓값을 구하고 정수 나눗셈으로 자리숫자를 얻는다.',
    lambda t,r: _has(t, r'유한소수', r'소수점 아래|소수의 자릿수', r'\\d?frac') and _no(t,r'다음 중|옳은|옳지'))
add('fraction-interval-filter', '유리수와 소수', '구간 안 지정 분모 분수의 개수·합',
    '양 끝 분수·공통 분모·유한/순환 조건', '교차 곱으로 분자 범위를 구해 기약 분모 조건을 거르고 세거나 더한다.',
    lambda t,r: _has(t, r'사이', r'분모', r'분수', r'개수|합'), difficulty='hard')
add('repeating-nth-digit', '순환소수', '순환소수의 특정 자리·여러 자리 합',
    '유리수·비순환 길이·순환마디·요구 자리', '나머지 추적으로 순환 시작과 주기를 찾고 나머지 인덱스로 자리 값을 구한다.',
    lambda t,r: _has(t, r'소수점 아래', r'자리', r'숫자|자리 수|값|합') and _no(t, r'옳은|옳지'))
add('repeating-period', '순환소수', '분수의 순환마디 길이·비교',
    '분자·분모와 비교할 분수들', '긴 나눗셈에서 동일 나머지가 되돌아오는 간격을 측정하고 비교한다.',
    lambda t,r: _has(t, r'순환마디', r'개수|가장|나머지|다른|길이') and _no(t,r'설명|유리수'), difficulty='mid')
add('repeating-notation', '순환소수', '순환소수 표기와 숫자 대응',
    '순환 시작 위치·마디 숫자·소문항 수', '나머지 상태로 순환마디를 결정하여 점 표기 또는 요구 숫자에 대응시킨다.',
    lambda t,r: _has(t, r'순환마디|순환소수|\\dot', r'나타내시오|표현하시오|짝 지어진|점.*찍|값으로') and _no(t,r'옳은|옳지|유리수|대한 설명'))
add('repeating-convert-batch', '순환소수의 분수 표현', '순환소수 분수화와 분자·분모의 조합',
    '정수부·비순환부·순환부 길이 및 요구 연산', '전체 숫자열에서 비순환 숫자열을 빼고 (10^r−1)10^s로 나눠 약분한다. 목표가 역수이면 분자·분모를 바꾸고 나눗셈의 나머지 반복으로 순환소수를 다시 구한다.',
    lambda t,r: _has(t, r'\\dot|\\cdots', r'분수로|분모.*합|분자.*합|서로소') and _no(t,r'가장 간단한 식|이용할|계산을 간단|가장 편리|잘못|자연수인|만족시키는 분수'))
add('repeating-shift', '순환소수의 분수 표현', '순환부를 제거하는 10의 거듭제곱 식 선택',
    '비순환 길이·순환 길이·보기 계수', '비순환 길이 s와 순환 길이 r에서 10^(s+r)x−10^sx를 고른다.',
    lambda t,r: _has(t, r'분수로|순환소수', r'이용할|가장 간단한 식|가장 편리|계산을 간단'))
add('repeating-unknown-digit', '순환소수의 분수 표현', '순환소수의 미지 숫자 역산',
    '알려진 유리수와 비순환·순환 숫자의 빈칸', '숫자 0~9를 대입하여 변환한 유리수의 등식·부등식을 만족하는 값을 구한다.',
    lambda t,r: _has(t, r'\\dot', r'한 자리', r'\\d?frac') and _no(t,r'잘못|곱하|역수|분모.*분자'), difficulty='hard')
add('repeating-arithmetic', '순환소수를 포함한 식의 계산', '순환소수 포함 유리수 식·역산',
    '각 순환부와 연산·조건 상수', '순환소수를 기약분수로 변환하고 유리수 사칙연산 또는 일차식 역산을 한다.',
    lambda t,r: _has(t,r'\\dot',r'계산|값|큰 수|작은 수|곱|순환소수로 나타내') and _no(t,r'설명|옳은|옳지'))

# 지수·다항식: 계수/지수 연산, 복수 소문항은 새 handler의 구성 후보로 보수 분류.
add('powers-compute', '지수법칙', '지수법칙 계산의 식 구조 확장',
    '밑·정수 지수·곱과 몫 및 괄호 배치', '단항식을 계수와 문자별 지수 벡터로 바꾸어 곱·몫·거듭제곱을 계산한다.',
    lambda t,r: _has(t,r'간단히|계산하|계산하면|전개',r'\^') and _no(t,r'옳은|옳지|잘못|설명'))
add('powers-exponent-inverse', '지수법칙', '지수 등식의 미지 지수·밑 역산',
    '지수 등식의 계수·밑·미지 지수와 목표 조합', '같은 밑으로 고쳐 지수의 정수 방정식을 풀고 필요하면 약수 후보를 열거한다.',
    lambda t,r: _has(t,r'\^',r'=',r'값|자연수|안에|가장') and _no(t,r'옳은|옳지|설명'), difficulty='hard')
add('powers-digit', '지수법칙', '거듭제곱의 자릿수·일의 자리',
    '밑·지수 및 묻는 자리', '2·5 지수를 묶어 10의 거듭제곱을 분리하거나 mod 10 주기를 계산한다.',
    lambda t,r: _has(t,r'\^',r'자리|자릿수') and _no(t,r'옳은|옳지'))
add('powers-comparison', '지수법칙', '거듭제곱 식의 값·동치 비교',
    '밑과 지수 및 보기', '문자 지수 벡터를 정리하여 동치를 판정하거나 정수 거듭제곱을 정확히 비교한다.',
    lambda t,r: _has(t,r'\^',r'큰|작은|대소|같은 것|다른 것') and _no(t,r'옳은|옳지'))
add('monomial-compute', '단항식의 곱셈과 나눗셈', '단항식 곱·몫·거듭제곱 계산 확장',
    '계수·문자별 지수·연산 순서', '유리수 계수와 지수 벡터를 계산하여 단항식 표준형으로 만든다.',
    lambda t,r: _has(t,r'계산|간단히|지수|계수',r'\\times|\\div|×|÷|\^') and _no(t,r'잘못|바르게|옳은|옳지|설명'))
add('monomial-blank', '단항식의 곱셈과 나눗셈', '단항식 등식의 빈칸·미지 지수',
    '등식의 계수·지수와 빈칸 위치', '계수 등식과 각 문자의 지수 등식을 따로 풀어 결합한다.',
    lambda t,r: _has(t,r'=',r'□|\\square|자연수|상수|어떤 식|어떤 단항식') and _no(t,r'옳은|옳지'))
add('monomial-error', '단항식의 곱셈과 나눗셈', '곱셈·나눗셈 오산의 바른 식',
    '잘못 사용한 단항식·오산 결과·올바른 연산', '오산의 역연산으로 원식을 복원한 뒤 의도한 연산을 적용한다.',
    lambda t,r: _has(t,r'잘못',r'곱|나누',r'바르게|어떤 식'))
add('polynomial-add-batch', '다항식의 덧셈과 뺄셈', '다항식 덧셈·뺄셈 구조 확장',
    '동류항 계수·차수·괄호 깊이·소문항 수', '단항식 지수 튜플을 키로 계수를 합쳐 각 다항식을 계산하고, 지정 항의 계수를 추출해 요구 합·곱을 계산한다.',
    lambda t,r: _has(t,r'계산하|계산하면|간단히|전개',r'[a-z]') and _no(t,r'잘못|바르게|옳은|옳지'))
add('polynomial-substitution', '다항식의 덧셈과 뺄셈', '문자로 정의한 다항식의 합성',
    'A·B·C로 정의할 다항식과 요구 선형결합', '정의된 다항식을 요구 식에 대입하여 계수 벡터를 합산한다.',
    lambda t,r: _has(t,r'[ABC]\s*=',r'식|계산|값') and _no(t,r'잘못|바르게|옳은|옳지'))
add('polynomial-inverse', '다항식의 덧셈과 뺄셈', '다항식 역산·오산 복원',
    '알려진 다항식·오산 또는 합/차 조건', '합·차 등식을 계수별로 풀고 바른 연산을 다시 적용한다.',
    lambda t,r: _has(t,r'어떤 식|어떤 다항식|잘못|바르게',r'더|빼|뺐|괄호'))
add('polynomial-coefficients', '다항식의 덧셈과 뺄셈', '다항식 항등식의 계수 조합',
    '양변 다항식·미지 계수·목표 연산', '양변을 정리한 동류항의 계수를 비교하여 목표 값을 계산한다.',
    lambda t,r: _has(t,r'=',r'계수|상수|세 수|두 수') and _no(t,r'옳은|옳지|설명'))
add('polynomial-mul-div', '다항식의 곱셈과 나눗셈', '다항식과 단항식의 분배·나눗셈 확장',
    '다항식 계수·단항식·연산 순서', '분배법칙 후 각 항의 계수와 지수로 곱·몫을 계산하고, 지정 항의 계수를 추출해 요구 합·곱을 계산한다.',
    lambda t,r: _has(t,r'전개|계산|간단히|계수',r'\\times|\\div|×|÷|\^|\)\(') and _no(t,r'잘못|바르게|옳은|옳지'))
add('polynomial-product-inverse', '다항식의 곱셈과 나눗셈', '단항식 연산으로 정의된 원 다항식',
    '곱하거나 나눈 단항식·결과 다항식', '알려진 연산을 역으로 적용하여 다항식을 복원한다.',
    lambda t,r: _has(t,r'어떤 식|어떤 다항식',r'곱|나누') and _no(t,r'옳은|옳지'))
add('polynomial-value', '다항식의 곱셈과 나눗셈', '조건 대입 후 다항식 값·표현',
    '문자 값·일차 관계·다항식', '지정된 값 또는 일차 관계를 대입하고 다항식 표준형으로 정리한다.',
    lambda t,r: _has(t,r'일 때',r'식의 값|식으로 나타내|값을|값은',r'=') and _no(t,r'옳은|옳지|\\frac\{1\}\{[xy]\}'))

add('ineq-substitution', '부등식', '정해진 값이 부등식의 해인지 선택',
    '대입값과 일차부등식 보기', '각 보기의 좌우를 유리수로 계산하여 부등호의 참거짓을 판정한다.',
    lambda t,r: _has(t,r'x\s*=',r'해로 갖|해가 되|만족',r'부등식'), difficulty='easy')
add('ineq-order-preservation', '부등식', '부등식 변형의 방향 판정',
    '두 수의 대소 관계·동일한 선형 변환·보기', '공통 계수의 부호에 따라 부등호 방향을 결정한다.',
    lambda t,r: _has(t,r'[ab].*[<>≤≥]|\\le|\\ge',r'옳은|옳지|대소') and _no(t,r'제곱|\^|절댓값'))
add('ineq-solve-extension', '일차부등식의 풀이', '괄호·분수·소수 일차부등식',
    '유리수 계수·상수·괄호 구조·부등호', '공통분모와 괄호를 정리해 Ax 관계 B를 풀고 경계 포함을 유지한다.',
    lambda t,r: _has(t,r'부등식',r'[<>≤≥]|\\le|\\ge',r'해|풀') and _no(t,r'자연수|정수|다른|같|모두|상수|가장|개수|\$[abkmn]'))
add('ineq-integer-solutions', '일차부등식의 풀이', '일차부등식의 정수·자연수 해',
    '계수·경계·정수 도메인·추가 범위', '일차부등식 해와 도메인을 교차하여 열린/닫힌 경계를 반영해 세거나 열거한다.',
    lambda t,r: _has(t,r'부등식',r'자연수|정수',r'[<>≤≥]|\\le|\\ge') and _no(t,r'상수|\$a|\$b'))
add('ineq-parameter', '일차부등식의 응용', '해의 범위·개수에서 부등식 상수 역산',
    '지정 해 구간·해 개수·미지 계수', '정리된 경계식과 정수 해의 개수 조건을 부등식으로 풀어 상수 범위를 구한다.',
    lambda t,r: _has(t,r'부등식',r'상수|자연수.*개|정수.*값',r'[<>≤≥]|\\le|\\ge'), difficulty='hard')

for sec,slug in [('미지수가 2개인 연립일차방정식','linear-pair'),('연립방정식의 풀이','system'),('여러 가지 연립방정식의 풀이','system-rational'),('연립방정식의 풀이의 응용','system-application'),('해가 특수한 연립방정식','system-special')]:
    add(slug+'-solve',sec,'연립 일차식의 수치 해·해의 조합',
        '두 방정식 계수·해의 선형 조합·유리수 분모', '분모를 없앤 두 일차식을 소거법으로 풀고 목표 조합에 대입한다.',
        lambda t,r: _has(t,r'\\begin\{cases\}',r'해|풀|값') and _no(t,r'상수|자연수.*모두|해가 없|무수히|존재하지|해의 개수|서로 같|잘못|없애|필요한 식|\b[abkmn]\b'))
    add(slug+'-parameter',sec,'주어진 해·공통 해로 연립식 상수 역산',
        '일차식 계수·알려진 순서쌍·미지 계수', '알려진 해를 대입하거나 독립인 두 식으로 공통 해를 구한 뒤 미지 계수를 역산한다.',
        lambda t,r: _has(t,r'=',r'해|만족',r'상수|값|서로 같') and _no(t,r'옳은|옳지|일차방정식인|해가 없|무수히|존재하지|구하는 과정'), difficulty='hard')
add('system-rank','해가 특수한 연립방정식','연립식의 무해·무수해 조건',
    '두 일차식의 계수·상수 및 미지 항', '계수 행의 비례 여부와 상수항의 비례 여부를 비교해 랭크 조건을 푼다.',
    lambda t,r: _has(t,r'\\begin\{cases\}',r'해가 없|무수히|존재하지|해의 개수'))

add('function-values','함수와 함숫값','명시된 함수의 함숫값·조합 계산',
    '일차·유리 함수의 계수·입력값·출력 연산', '정의역을 확인하고 필요한 미지 계수를 일차식으로 역산한 뒤 각 입력값을 유리수 산술로 대입한다.',
    lambda t,r: _has(t,r'f\s*\(',r'=',r'값|함숫값') and _no(t,r'나머지|약수|소수의 개수|자연수.*모두|일차함수가 되'))
add('function-linear-select','함수와 함숫값','명시식이 일차함수인지 판정',
    '차수·분모·일차항 계수가 다른 식 보기', '식을 정리해 y=ax+b이고 a≠0인지 확인한다.',
    lambda t,r: _has(t,r'일차함수',r'것은|고르|○|옳은|옳지') and bool(re.search(r'y\s*=',r['content'])) and _no(t,r'상수|값'), difficulty='easy')
for sec,slug in [('일차함수의 그래프와 절편','intercept'),('일차함수의 그래프와 기울기','slope'),('일차함수의 그래프의 성질','line-property'),('일차함수의 식 구하기','line-equation'),('일차함수와 일차방정식','line-equivalence')]:
    add(slug+'-parameters',sec,'좌표·기울기·절편 조건으로 직선 결정',
        '알려진 좌표·기울기·절편·미지 계수', '일반형 Ax+By+C=0에 좌표·기울기 조건을 대입해 계수를 구한다. 수직선 x=k와 수평선 y=k를 포함하여 요구 값이나 식을 계산한다.',
        lambda t,r: _has(t,r'점|절편|기울기',r'값|식|방정식|구하') and _no(t,r'옳은|옳지|사분면|넓이|범위|가장|모두|몇 개|평행이동|선분.*위의 점'))
    add(slug+'-parallel',sec,'평행·일치·이동으로 직선 계수 결정',
        '직선 계수·이동량·통과점', '평행이면 기울기, 일치면 두 계수를 같게 두고 평행이동의 절편 변화를 계산한다.',
        lambda t,r: _has(t,r'평행|일치|평행이동',r'값|식|방정식|구하') and _no(t,r'옳은|옳지|사분면|넓이|가장|몇 개'))
add('line-intersection','일차함수의 그래프와 연립방정식의 해','교점·공점에서 미지 계수 역산',
    '직선들의 계수·공통점·미지 계수', '두 직선을 풀어 교점을 구하고 나머지 직선 조건에 대입한다.',
    lambda t,r: _has(t,r'=',r'교점|한 점|해가|해는',r'값|좌표|구하') and _no(t,r'옳은|옳지|넓이|해가 없|무수히|존재하지'))
add('line-area','일차함수의 그래프와 연립방정식의 해','직선과 좌표축이 둘러싼 넓이',
    '직선 계수와 좌표축', '교점과 절편으로 넓이를 계산하고, 넓이가 주어졌으면 유리식 방정식과 부호 조건으로 계수를 역산한다.',
    lambda t,r: _has(t,r'=',r'넓이',r'둘러싸인|둘러싸여'), figure='required')
add('similarity-volume-area','닮은 도형의 넓이의 비와 부피의 비','닮음비와 넓이·부피 변환',
    '길이비·넓이비·부피비와 한 도형의 측정값', '길이비 r에서 넓이비 r², 부피비 r³을 적용하고 역으로는 제곱근·세제곱근을 쓴다.',
    lambda t,r: _has(t,r'비|각각',r'넓이|부피',r'닮|구|정사각형') and _no(t,r'옳은|옳지'))
add('pythagorean-choice','피타고라스 정리','수치 세 변의 직각삼각형 판정',
    '세 변 후보·정답 위치 또는 자연수 범위', '양의 세 변을 정렬한 뒤 작은 두 변 제곱합과 가장 긴 변 제곱을 비교한다.',
    lambda t,r: _has(t,r'직각삼각형',r'세 변|세변',r'길이|나온 수|수가') and _no(t,r'증명|설명|되도록|a\^'), difficulty='easy')

add('pythagorean-unknown-side','피타고라스 정리','직각삼각형에서 미지 변 제곱의 모든 값',
    '알려진 두 변과 미지 변의 자리', '미지 변이 빗변인 경우와 다른 변인 경우를 각각 계산하고 양수·삼각형 조건으로 거른다.',
    lambda t,r: _has(t,r'직각삼각형',r'세 변',r'되도록',r'값.*모두'), difficulty='mid')

for sec,slug in [('경우의 수','count'),('여러 가지 경우의 수','count-various'),('확률의 뜻과 성질','prob-basic'),('확률의 계산','prob')]:
    isprob='확률' in sec
    add(slug+'-dice',sec,'주사위 표본공간의 수치 조건 '+('확률' if isprob else '경우의 수'),
        '주사위 개수·합·차·곱·방정식 조건', '구별되는 눈의 튜플을 열거해 조건을 검사'+('하고 전체 튜플 수로 나눈다.' if isprob else '하여 센다.'),
        lambda t,r: _has(t,r'주사위',r'던',r'확률|경우의 수') and _no(t,r'설명|옳은|옳지|이기는|승리|게임|공을|주머니|동전'))
    add(slug+'-coins',sec,'동전 앞·뒷면 조건 '+('확률' if isprob else '경우의 수'),
        '동전 개수·앞면/뒷면 개수 조건', '이진 결과열을 열거해 조건을 만족하는 결과를 센 뒤 확률이면 2^n으로 나눈다.',
        lambda t,r: _has(t,r'동전',r'던',r'앞면|뒷면',r'확률|경우의 수') and _no(t,r'주사위|설명|옳은|옳지|게임'))
    add(slug+'-digit-cards',sec,'숫자 카드의 자리배열 조건 '+('확률' if isprob else '경우의 수'),
        '카드 숫자 집합·뽑는 수·자릿수·배수 조건', '중복 없는 자리 순열을 생성하고 선행 0과 지정 수치 조건을 거른다.',
        lambda t,r: _has(t,r'카드',r'자리',r'만들',r'자연수|정수',r'확률|경우의 수|개수') and _no(t,r'설명|옳은|옳지'))
    add(slug+'-arrangement',sec,'유한 인원·물건의 순열과 선택',
        '대상 수·선택 수·역할/인접/고정 위치 조건', '순열 또는 조합을 열거하고 역할·인접·고정 조건을 검사한다. 확률이면 조건을 만족하는 경우의 수를 전체 등가능한 순열·조합 수로 나눈다.',
        lambda t,r: _has(t,r'일렬|한 줄|대표|회장|부회장|반장|부반장|악수|이웃하게|달리는 순서',r'경우의 수|확률|몇 가지|횟수') and _no(t,r'설명|옳은|옳지|주사위|카드'))
    add(slug+'-numeric-single-draw',sec,'번호 집합에서 한 번 뽑는 수치 사건',
        '번호 범위·짝홀·배수·약수·구간 조건', '번호를 열거해 조건을 만족하는 원소를 세고 확률이면 집합 크기로 나눈다.',
        lambda t,r: _has(t,r'한 장|한 개|1.*개|하나',r'배수|약수|소수|짝수|홀수|이상|이하',r'확률|경우의 수') and _no(t,r'다시|두 번|두 장|두 주머니|각각.*한 개|설명|옳은|옳지|던|주사위|동전'))
    add(slug+'-urn',sec,'명시된 유한 집합의 추출 확률·개수',
        '색·종류별 개수·추출 횟수·복원 여부', '주어진 비율에 미지 개수가 있으면 먼저 역산하고, 유한 추출 결과를 열거하거나 조건부 비율을 곱하여 목표 사건을 합산한다.',
        lambda t,r: _has(t,r'주머니|상자|공|구슬|볼펜|불량품|합격품|학생|반장|제비',r'확률|경우의 수',r'개|명|장',r'뽑|꺼|고를|선택') and _no(t,r'설명|옳은|옳지|주사위|동전|더 넣|몇 개를|게임|앱|나누어 담'))



def _repeating_numerator(t, row):
    # One unknown numerator / known integer denominator equals a written recurring decimal.
    fs = re.findall(r'\\d?frac\{([a-z])\}\{([1-9]\d*)\}', t)
    if len(fs) != 1 or not _has(t, r'분수', r'소수로 나타내면', r'자연수', r'값을|값은'):
        return False
    if not re.search(r'\d+\.(?:\d*\\dot\{\d\}(?:\d*\\dot\{\d\})?)', t):
        return False
    return _no(t, r'합|곱|차|범위|모두|사이|이상|이하|⑴|\(1\)')


add('repeating-known-denominator', '순환소수의 분수 표현', '알려진 순환소수와 분모로 분자 역산',
    '정수부·비순환부·순환부·알려진 분모',
    '순환소수를 기약분수 p/q로 바꾼 뒤 알려진 분모 d를 곱하여 x=dp/q를 구한다. x가 자연수인 씨앗만 허용한다.',
    _repeating_numerator)
add('monomial-rhombus-diagonal', '단항식의 곱셈과 나눗셈', '단항식 넓이로 마름모의 다른 대각선 역산',
    '한 대각선의 양의 단항식과 넓이의 양의 단항식',
    '마름모 넓이=두 대각선 곱/2에서 다른 대각선을 2×넓이/알려진 대각선으로 계산한다.',
    lambda t,r: _has(t, r'마름모', r'한 대각선', r'다른 대각선', r'넓이', r'\^|\\frac') and _no(t,r'옳은|옳지|증명|설명|⑴|\(1\)'),
    figure='none')

def classify(row):
    if row.get('grade') != '중2':
        return None
    content = row.get('content', '')
    if row.get('has_figure') or '그림' in content or row.get('question_type') == '서술형':
        return None
    # Do not silently treat missing data, proof requests or naked prompts as numeric tasks.
    if not content.strip() or re.search(r'증명|설명하|이유를|까닭을|토의|조사하|직접.*그려', content):
        return None
    if not re.search(r'\d', content):
        return None
    stem = re.split(r'[①②③④⑤]', content, maxsplit=1)[0].strip()
    if len(stem) < 5:
        return None
    for fid, section, pred in _RULES:
        if row.get('section') == section and pred(stem, row):
            return fid
    return None
