from fractions import Fraction as F
from pathlib import Path
import json
# Exact pairs a+b*sqrt(5); author arithmetic, never independent review.
def add(x,y): return (x[0]+y[0],x[1]+y[1])
def neg(x): return (-x[0],-x[1])
def mul(x,y): return (x[0]*y[0]+5*x[1]*y[1],x[0]*y[1]+x[1]*y[0])
def inv(x):
    norm=x[0]*x[0]-5*x[1]*x[1]
    assert norm != 0
    return (x[0]/norm,-x[1]/norm)
def div(x,y): return mul(x,inv(y))
def packed(x): return [str(x[0]),str(x[1])]
u=(F(1,4),F(1,4));v=(F(-1,4),F(1,4));one=(F(1),F(0))
assert mul(u,(F(-1),F(1))) == one
assert mul(v,(F(1),F(1))) == one
uv=mul(u,v);total=add(u,v);difference=add(u,neg(v))
assert uv==(F(1,4),F(0));assert total==(F(0),F(1,2));assert difference==(F(1,2),F(0))
cubic=add(mul(mul(mul(u,u),u),v),neg(mul(u,mul(mul(v,v),v))))
assert cubic==mul(mul(uv,difference),total)==(F(0),F(1,16))
target=(F(0),F(13,16));t=div(add(target,neg(cubic)),total)
assert t==(F(3,2),F(0));assert total[1]>0;assert 5>1**2
choices=[F(-1,2),F(0),F(1,2),F(1),F(3,2)]
rows=[{'t':str(c),'left':packed(add(cubic,mul((c,F(0)),total))),'satisfies':add(cubic,mul((c,F(0)),total))==target} for c in choices]
assert [row['t'] for row in rows if row['satisfies']]==['3/2']
out={'kind':'author-exact-Qsqrt5-arithmetic/not-independent-review','u':packed(u),'v':packed(v),'uv':packed(uv),'uPlusV':packed(total),'uMinusV':packed(difference),'cubicDifference':packed(cubic),'target':packed(target),'uniqueT':packed(t),'choices':rows,'positiveDenominatorProof':'sqrt5>1 because5>1; u+v=sqrt5/2>0, so division is legitimate','authorOnly':True,'independentReview':False,'dbWrites':0}
path=Path('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/q12-author-radical-calc-r1.json')
with path.open('x',encoding='utf-8',newline='\n') as f: json.dump(out,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps({'exactT':packed(t),'onlyCorrectChoice':5,'authorOnly':True}))
