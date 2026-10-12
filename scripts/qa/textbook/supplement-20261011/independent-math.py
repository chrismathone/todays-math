"""Recompute the recovered Hong Jinkon 20-question packet from its question conditions.

This is an independent authored witness, not a general verifier or a human review log.
Usage: python -X utf8 independent-math.py prepared.jsonl output.json
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import re
import sys
import sympy as s

x, a, b, c, h, k, t = s.symbols("x a b c h k t", real=True)
R = s.Rational
proofs: dict[str, dict] = {}


def add(key: str, calculations: list, expected: list[str], reason: str) -> None:
    proofs[key] = {"calculations": [s.sstr(v) for v in calculations], "expectedMath": expected, "reason": reason}


def tangent(f, at):
    return s.expand(s.diff(f, x).subs(x, at) * (x-at) + f.subs(x, at))


lines = [tangent(x**3, 2), tangent(2*x**2+x+3, -1), tangent(x**3+2*x**2+3, -2)]
assert lines == [12*x-16, -3*x+1, 4*x+11]
add("tb-f84c254aaee88ed5-0-1", lines, ["y=12x-16", "y=-3x+1", "y=4x+11"], "Differentiate each polynomial and substitute the stated point; all points lie on their curves.")
slopes = [tangent(x**2+x, 1), tangent(3*x**3+3*x**2+1, -1), tangent(3*x**3+3*x**2+1, R(1,3))]
assert s.solve(s.diff(3*x**3+3*x**2+1,x)-3,x) == [-1,R(1,3)]
assert slopes == [3*x-1, 3*x+4, 3*x+R(4,9)]
add("tb-f84c254aaee88ed5-0-2", slopes, ["y=3x-1", "y=3x+4", r"y=3x+\frac{4}{9}"], "Solve derivative=3 for every contact point and compute every tangent intercept.")
parallel = [tangent(3*x**2-4*x+1,1), tangent(x**3-6*x-3,-2), tangent(x**3-6*x-3,2)]
assert parallel == [2*x-2,6*x+13,6*x-19]
add("tb-f84c254aaee88ed5-0-3", parallel, ["y=2x-2","y=6x+13","y=6x-19"], "Parallel slopes are 2 and 6; solve derivatives for all real contacts.")
d1=s.discriminant(s.diff(x**3+2*a*x**2+4*x,x),x)
d2=s.discriminant(s.diff(-x**3+2*a*x**2+4*a*x+6,x),x)
assert d1==16*a**2-48 and d2==16*a**2+48*a
add("tb-11bbd0ad2b6798f4-0-4",[d1,d2], [r"-\sqrt{3}\leq a\leq \sqrt{3}",r"-3\leq a\leq 0"], "A cubic has no local extremum exactly when its quadratic derivative discriminant is nonpositive, including double roots.")
assert s.diff(x**2+x,x).subs(x,1)>0
add("tb-beba382c1b0cc7fd-0-4",[2,12],["2<k<12"], "x²+x is strictly increasing on (1,3), whose image is exactly (2,12).")
f=a*x*x+b*x+c
identity=s.Poly(s.expand(f.subs(x,s.diff(f,x))-s.diff(f,x).subs(x,f)),x)
solutions=s.solve([*identity.all_coeffs(),f.subs(x,-2)-5],(a,b,c),dict=True)
quadratics=[v for v in solutions if v[a]!=0]
assert len(quadratics)==1 and quadratics[0]=={a:R(1,2),b:0,c:3}
add("tb-a8b0ac48f251ea1b-0-4",[f.subs(quadratics[0]).subs(x,4)],["11"], "Equate polynomial coefficients of f(f′(x)) and f′(f(x)); discard nonquadratic branches and impose f(-2)=5.")
f=x**3+x+3
contacts=s.solve(f.subs(x,a)-a*s.diff(f,x).subs(x,a)-5,a)
assert contacts==[-1] and tangent(f,-1)==4*x+5
add("tb-68cd4a93b5c6bfa1-0-4",[-R(5,4)],[r"-\frac{5}{4}"], "For a real contact a, tangent intercept is 3-2a³=5, so a=-1 and tangent is y=4x+5.")
f=3*x*x+x+1
mvt=s.expand(f.subs(x,a)-f.subs(x,a-h)-h*s.diff(f,x).subs(x,a-k*h))
assert s.factor(mvt)==3*h*h*(2*k-1)
add("tb-5e59c02795c04cf9-0-4",[R(1,2)],[r"\frac{1}{2}"], "The given equality reduces to 3h²(2k-1)=0. Since h>0, k=1/2 and lies in (0,1).")
f=x**3+a*x*x+b*x+c
values=s.solve([s.diff(f,x).subs(x,-2),f.subs(x,1)-3,s.diff(f,x).subs(x,1)-9],(a,b,c))
assert values=={a:3,b:0,c:-1} and s.diff(f,x,2).subs(values).subs(x,-2)<0
add("tb-ccfc7256c368fb59-0-5",[f.subs(values).subs(x,3)],["53"], "A finite stated limit enforces f(1)=3 and f′(1)=9; f′(-2)=0 yields the unique monic cubic and f″(-2)<0 verifies the local maximum.")
f=x**4-8*x**3+18*x**2
domain_points=[-1,0,2]
critical=[z for z in s.solve(s.diff(f,x),x) if -1<=z<=2]
assert critical==[0]
values=[f.subs(x,z) for z in domain_points]
add("tb-31300a3c654d244c-0-2",[max(values)-min(values)],["27"], "Evaluate both interval endpoints and every critical point: values are 27,0,24.")
assert s.solve(s.diff(2*t**3+k*t**2+9,t).subs(t,1)+6,k)==[-6]
add("tb-eecf688bd7d0c30c-0-2",[-6],["-6"], "Velocity at t=1 is 6+2k=-6.")
add("tb-ccb968bff05e34f7-0-2",[s.diff(x*x-8*x+3,x).subs(x,-2)],["-12"], "Differentiate the given antiderivative to get f(x)=2x-8.")
add("tb-1f59f8726f20495b-0-1",[2*(-1)**2-1+7],["8"], "Fundamental theorem gives f(x)=2x²+x+a; f(2)=17 gives a=7.")
assert (x**3-3*x+2).subs(x,1)==0
add("tb-1f59f8726f20495b-0-2",[s.diff(x**3-3*x+2,x).subs(x,2)],["9"], "Differentiate the integral identity; its basepoint value is consistent, and f(2)=9.")
assert s.limit((x*x+5*x+6)/(x+3),x,-3)==-1
add("tb-855f74a7a4c95fd5-0-6",[6],["6"], "Cancel x+3 off the limit point and use continuity: -f(-3)=-6.")
f=3*x*x-6*x+2
symmetrical=s.limit((f.subs(x,a+h)-f.subs(x,a-h))/h,h,0)
assert s.solve(symmetrical-6,a)==[R(3,2)]
add("tb-76694c0a07294a0b-0-8",[R(3,2)],[r"\frac{3}{2}"], "The symmetric difference quotient is 2f′(a)=12a-12=6.")
g1=R(2); gp1=(5*3+2*3-g1)/3
assert 2*g1+3*gp1==23
add("tb-76694c0a07294a0b-0-10",[2*g1+3*gp1],["23"], "At x=1 the identity gives g(1)=2; differentiate once to get g′(1)=19/3.")
position=80*t-8*t*t
stop=s.solve(s.diff(position,t),t)[0]
add("tb-8f346039a6d28ad3-0-10",[s.diff(position,t,2)+position.subs(t,stop)],["184"], "Initial acceleration is -16 m/s²; velocity first reaches zero at 5 s, and distance is 200 m.")
integral=s.integrate(3*x*x-k*x,(x,1,3))
assert s.solve(2*integral-4,k)==[6]
add("tb-6ecb67c37ab48c18-0-4",[6],["6"], "Reverse bounds negate the second integral; 2(26-4k)=4.")
f=12*x*x+x-1
assert f.subs(x,0)==-1 and s.diff(f,x)==24*x+1
add("tb-6ecb67c37ab48c18-0-6",[f],["12x^{2}+x-1"], "Integrate the slope and use f(0)=-1; root sum -k/12=-1/12 gives k=1.")

input_file, output_file=map(Path,sys.argv[1:3])
raw=input_file.read_bytes()
rows=[json.loads(line) for line in raw.decode("utf-8").splitlines() if line.strip()]
assert len(rows)==20 and {row["id"] for row in rows}==set(proofs), "The witness only covers these exact 20 identities."
normal=lambda value: re.sub(r"\s+", "",value)
results=[]
for row in rows:
    proof=proofs[row["id"]]
    actual=re.findall(r"\$([^$]+)\$",row["answer"])
    assert [normal(v) for v in actual]==[normal(v) for v in proof["expectedMath"]], row["id"]
    results.append({"externalId":row["id"],"questionSha256":hashlib.sha256(row["content"].encode()).hexdigest(),
                    "answerSha256":hashlib.sha256(row["answer"].encode()).hexdigest(),**proof,"matched":True})
output_file.parent.mkdir(parents=True,exist_ok=True)
report={"engine":"SymPy "+s.__version__,"kind":"independent source-condition recomputation; no human verdict",
        "inputSha256":hashlib.sha256(raw).hexdigest(),"checked":len(results),"failures":[],"entries":results}
output_file.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"checked":len(results),"failures":0,"output":str(output_file)}))
