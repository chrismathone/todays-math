"""Recalculate the acquired text candidates from their question conditions.

The inputs are transcribed from the question, bound to math-specs.json content
hashes by calculate_packet.py. These are deterministic checks, not blind-review
or human approvals. SymPy is a local dependency; no service/API is called.
"""
from __future__ import annotations

import sympy as s


def calculations() -> dict[str, dict]:
    x, t, a, b, c, k, h = s.symbols("x t a b c k h", real=True)
    result = {}

    def math(value):
        return f"${s.latex(s.expand(value))}$"

    def add(key, number, answer, proof):
        result[f"tb-{key}-0-{number}"] = {"calculatedAnswer": answer, "calculation": proof}

    def tangent(f, point):
        return s.expand(s.diff(f, x).subs(x, point) * (x - point) + f.subs(x, point))

    def slopes(f, slope):
        roots = sorted(s.solve(s.diff(f, x) - slope, x), key=float)
        return " 또는 ".join(f"$y={s.latex(tangent(f, point))}$" for point in roots)

    answers = [tangent(x**3, 2), tangent(2*x**2+x+3, -1), tangent(x**3+2*x**2+3, -2)]
    add("f84c254aaee88ed5", 1, " ".join(f"{mark} $y={s.latex(value)}$" for mark, value in zip("⑴⑵⑶", answers)),
        "각 점에서 f'(a)를 구하고 y=f'(a)(x-a)+f(a)를 전개: 12x-16, -3x+1, 4x+11.")
    add("f84c254aaee88ed5", 2, f"⑴ {slopes(x**2+x, 3)} ⑵ {slopes(3*x**3+3*x**2+1, 3)}",
        "f'(a)=3의 모든 실근: ⑴ a=1; ⑵ a=-1, 1/3. 각 접점에서의 절편까지 계산했다.")
    add("f84c254aaee88ed5", 3, f"⑴ {slopes(3*x**2-4*x+1, 2)} ⑵ {slopes(x**3-6*x-3, 6)}",
        "평행 조건 f'(a)=2, 6을 풀면 각각 a=1, a=±2. 두 번째의 접선 둘을 모두 유지한다.")
    discriminants = [s.factor(s.discriminant(s.diff(f, x), x))
                     for f in (x**3+2*a*x**2+4*x, -x**3+2*a*x**2+4*a*x+6)]
    assert all(s.simplify(actual-expected) == 0 for actual, expected in
               zip(discriminants, [16*(a**2-3), 16*a*(a+3)]))
    bounds = [s.solve(expression, a) for expression in discriminants]
    assert bounds == [[-s.sqrt(3), s.sqrt(3)], [-3, 0]]
    add("11bbd0ad2b6798f4", 4, "⑴ $-\\sqrt{3}\\leq a\\leq \\sqrt{3}$ ⑵ $-3\\leq a\\leq 0$",
        "도함수 판별식은 16(a²-3), 16a(a+3). 극값이 없으려면 각각 D≤0; D=0에서 부호가 바뀌지 않아 끝점도 포함한다.")
    endpoints = [(x**2+x).subs(x, value) for value in (1, 3)]
    assert endpoints == [2, 12] and s.diff(x**2+x, x).subs(x, 1) > 0
    add("beba382c1b0cc7fd", 4, "$2<k<12$", "x²+x는 (1,3)에서 엄격히 증가하며 상은 (2,12). 따라서 k의 필요충분조건이다.")
    f = a*x**2+b*x+c
    derivative = s.diff(f, x)
    conditions = s.Poly(s.expand(f.subs(x, derivative)-derivative.subs(x, f)), x).all_coeffs()
    solutions = [sol for sol in s.solve(conditions+[f.subs(x, -2)-5], (a,b,c), dict=True) if sol[a] != 0]
    assert len(solutions) == 1
    value = f.subs(solutions[0]).subs(x, 4)
    add("a8b0ac48f251ea1b", 4, math(value), "계수 항등식과 f(-2)=5, a≠0을 함께 풀어 a=1/2, b=0, c=3; f(4)=11.")
    f = x**3+x+3
    intercept = s.expand(f.subs(x,a)-a*s.diff(f,x).subs(x,a))
    contact = s.solve(intercept-5, a)
    assert contact == [-1]
    line = tangent(f, contact[0])
    add("68cd4a93b5c6bfa1", 4, math(s.solve(line, x)[0]), "(0,5)를 지나는 접선의 절편식 3-2a³=5에서 a=-1. 접선 y=4x+5의 x절편은 -5/4.")
    f = 3*x**2+x+1
    residual = s.factor(f.subs(x,a)-f.subs(x,a-h)-h*s.diff(f,x).subs(x,a-k*h))
    assert residual == 3*h**2*(2*k-1)
    add("5e59c02795c04cf9", 4, math(s.solve(residual, k)[0]), "조건식의 차는 3h²(2k-1). h>0이므로 k=1/2이고 0<k<1도 만족한다.")
    f = x**3+a*x**2+b*x+c
    sol = s.solve([s.diff(f,x).subs(x,-2), f.subs(x,1)-3, s.diff(f,x).subs(x,1)-9], (a,b,c), dict=True)[0]
    assert s.diff(f,x,2).subs(sol).subs(x,-2) < 0
    add("ccfc7256c368fb59", 5, math(f.subs(sol).subs(x,3)), "다항함수의 극댓값 조건 f'(-2)=0, 유한 극한에서 f(1)=3 및 f'(1)=9. a=3,b=0,c=-1; f''(-2)=-6<0 확인 후 f(3)=53.")
    f = x**4-8*x**3+18*x**2
    locations = [-1,2]+[r for r in s.solve(s.diff(f,x),x) if -1<r<2]
    values = [f.subs(x,p) for p in locations]
    add("31300a3c654d244c", 2, math(max(values)-min(values)), "정의역 내 정지점은 x=0. 끝점·정지점의 함수값 27,24,0을 모두 비교해 M-m=27.")
    position = 2*t**3+k*t**2+9
    add("eecf688bd7d0c30c", 2, math(s.solve(s.diff(position,t).subs(t,1)+6,k)[0]), "v(1)=6+2k=-6에서 k=-6.")
    add("ccb968bff05e34f7", 2, math(s.diff(x**2-8*x+3,x).subs(x,-2)), "원시함수를 미분해 f(x)=2x-8, f(-2)=-12.")
    f = 2*x**2+x+a
    parameter = s.solve(f.subs(x,2)-17,a)[0]
    add("1f59f8726f20495b", 1, math(f.subs(a,parameter).subs(x,-1)), "적분의 미분에서 f(x)=2x²+x+a. f(2)=17에서 a=7; f(-1)=8.")
    primitive = x**3-3*x+2
    assert primitive.subs(x,1) == 0
    add("1f59f8726f20495b", 2, math(s.diff(primitive,x).subs(x,2)), "적분 항등식의 양변 미분: f(x)=3x²-3. x=1에서 적분값 0도 확인; f(2)=9.")
    multiplier = s.limit((x**2+5*x+6)/(x+3),x,-3)
    add("855f74a7a4c95fd5", 6, math(-6/multiplier), "(x+3)을 약분한 계수의 극한은 -1. f의 연속성에 의해 -f(-3)=-6; f(-3)=6.")
    f = 3*x**2-6*x+2
    limit = s.limit((f.subs(x,a+h)-f.subs(x,a-h))/h,h,0)
    add("76694c0a07294a0b", 8, math(s.solve(limit-6,a)[0]), "대칭 차분의 극한은 2f'(a)=12a-12. 이를 6과 같게 놓아 a=3/2.")
    g1 = s.Rational(2)*3/3
    gp1 = (5*3+2*3-g1)/3
    add("76694c0a07294a0b", 10, math(2*g1+3*gp1), "x=1에서 2f(1)=3g(1)로 g(1)=2. 항등식 미분 후 5f(1)+2f'(1)=g(1)+3g'(1): g'(1)=19/3, 구하는 값 23.")
    position = 80*t-8*t**2
    stop = s.solve(s.diff(position,t),t)[0]
    add("8f346039a6d28ad3", 10, math(s.diff(position,t,2).subs(t,0)+position.subs(t,stop)), "가속도 p=-16, 정지 시각 t=5, 이동거리 q=200. 따라서 p+q=184.")
    equation = 2*s.integrate(3*x**2-k*x,(x,1,3))-4
    add("6ecb67c37ab48c18", 4, math(s.solve(equation,k)[0]), "역방향 적분의 부호를 바꾸면 2(26-4k)=4이므로 k=6.")
    f = s.integrate(24*x+k,x)-1
    parameter = s.solve(-k/12+s.Rational(1,12),k)[0]
    add("6ecb67c37ab48c18", 6, math(f.subs(k,parameter)), "기울기를 적분하고 f(0)=-1을 사용: f(x)=12x²+kx-1. 근의 합 -k/12=-1/12에서 k=1; 판별식 49>0.")
    assert len(result) == 20
    return result
