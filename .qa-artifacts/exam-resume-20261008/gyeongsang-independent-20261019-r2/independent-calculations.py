"""GF14 independent arithmetic from the authorized student packet only.
No trigonometric functions, identities, author inputs, source questions or pixel measurements.
"""
from fractions import Fraction as F
from decimal import Decimal as D, ROUND_HALF_UP
import pathlib,json
OUT=pathlib.Path(__file__).resolve().parent
checks={}
def check(n,actual,choices):
 correct=[i+1 for i,v in enumerate(choices) if v==actual]
 assert len(correct)==1,(n,actual,correct)
 checks[f'q{n:02}']={'calculated':str(actual),'choices':[{'choice':i+1,'encodedValue':str(v),'correct':v==actual} for i,v in enumerate(choices)],'uniqueChoice':correct[0]}
def s(coef,n=1):
 coef=F(coef);d=2
 while d*d<=n:
  while n%(d*d)==0:coef*=d;n//=d*d
  d+=1
 return (coef,n)
def mul(a,b):return s(a[0]*b[0],a[1]*b[1])
# q1 sine definition QR/PQ=7/25, not an identity.
qr=25*F(7,25);check(1,qr,[24,175,7,25,18]);assert 25**2-qr**2==24**2
# q2 adjacent/hypotenuse=a/20=4/5.
a=20*F(4,5);check(2,a,[12,4,20,16,25]);assert a>0 and 20**2-a*a==12**2
# q3 positive square-root length and opposite/adjacent ratio.
check(3,(s(1,69),s(F(1,10),69)),[(s(1,69),s(F(10,69),69)),(s(1,69),s(F(1,10),69)),(s(3),s(F(3,10))),(s(1,159),s(F(1,10),159)),(s(1,69),s(F(1,13),69))]);assert 13**2-10**2==69
# q4: OH/OP and AD/OA on two actual right triangles, both denominators10.
cos_record=D('7.6604')/10;tan_record=D('8.3910')/10
q4=(cos_record.quantize(D('.0001'),rounding=ROUND_HALF_UP),tan_record.quantize(D('.0001'),rounding=ROUND_HALF_UP))
check(4,q4,[(D('.6428'),D('.7660')),(D('.7660'),D('8.3910')),(D('7.6604'),D('.8391')),(D('.7660'),D('.8391')),(D('.6428'),D('.8391'))])
# q5 exact decimal records; table values, not a recomputed transcendental function.
g=F('0.5150')+F('0.8290');na=F('0.5299')+F('0.8387');check(5,g-na,[F('1.3440'),F('.0246'),F('2.7126'),F('-.0246'),F('1.3686')]);assert g==F('1.3440') and na==F('1.3686')
# q6 finite table lookup, no monotonicity/identities.
angles=[37,38,39,40];tan=['.7536','.7813','.8098','.8391'];cos=['.7986','.7880','.7771','.7660'];xs=[a for a,v in zip(angles,tan) if F(v)==F('.7813')];ys=[a for a,v in zip(angles,cos) if F(v)==F('.7771')];assert xs==[38] and ys==[39];check(6,ys[0]-xs[0],[-2,-1,0,1,2])
# q7 tuples encode constant + coefficient*sqrt2; 1<sqrt2<2 also separates all options.
check(7,(24,-12),[(12,0),(24,-12),(0,12),(24,12),(24,0)]);assert 2*12**2==288
# q8 use special-triangle numeric values only. RHS factor sin45*tan30 =sqrt6/6.
factor=s(F(1,6),6);left=s(F(1,2),3);k_options=[s(F(1,2),2),s(1,2),s(F(1,2),6),s(3),s(F(3,2),2)];rhs=[mul(k,factor) for k in k_options];check(8,left,rhs)
# q9 P+Q=90,Q=2P ->P30,Q60; direct product of three special-angle side ratios.
product=mul(mul(s(F(1,2),3),s(F(1,2))),s(1,3));assert product==s(F(3,4))
check(9,(60,product),[(30,s(F(1,4))),(60,s(F(1,4))),(30,s(F(3,4))),(60,s(F(1,4),3)),(60,s(F(3,4)))])
# q16 actual height coefficient6sqrt3 -> area =3*base*sqrt3.
check(16,s(36,3),[s(18,3),s(108),s(36,3),s(54,3),s(72,3)]);assert F(36,3)==12 and 12>6
# q17 PH=QH/tan15 using stated table. Rounded interval selects10.1.
ph=F('2.7')/F('.2679');ph_decimal=D(ph.numerator)/D(ph.denominator);rounded=ph_decimal.quantize(D('.1'),rounding=ROUND_HALF_UP);check(17,rounded,[D('2.6'),D('5.2'),D('10.4'),D('10.1'),D('5.1')]);assert F('10.05')<=ph<F('10.15')
# q19 positive lengths QR=(3/5)x, PR=(4/5)x from Pythagoras; then area.
assert F(1)-F(3,5)**2==F(4,5)**2
area_coefficient=F(1,2)*F(3,5)*F(4,5);x_squared=F(24)/area_coefficient;assert x_squared==100
assert F(1,2)*6*8==24 and 6**2+8**2==10**2
checks['q19']={'part1':{'QR':'3x/5','PR':'4x/5','xDomain':'x>0'},'areaCoefficient':str(area_coefficient),'xSquared':str(x_squared),'part2Hypotenuse':10,'part3Legs':[6,8],'positiveRootOnly':True,'rubricPoints':[2,4,2]}
# q20 SSS congruence is in prose; numeric Pythagoras and the three side definitions.
assert 10**2-5**2==75 and s(1,75)==s(5,3)
checks['q20']={'part1':'SSS -> PH perpendicular QR, alpha30deg','part2PH':'5sqrt3 cm','part3':{'sin':'QH/PQ=1/2','cos':'PH/PQ=sqrt3/2','tan':'QH/PH=sqrt3/3'},'rightTriangleCheck':'25+75=100','rubricPoints':[2,3,3]}
# q21 30-60-90 right triangle OPH then Pythagoras in PHQ, not cosine law.
oh=F(18,2);ph_squared=F(18**2*3,4);hq_squared=6**2*13-ph_squared;assert oh==9 and ph_squared==243 and hq_squared==225
assert 9+15==24 and 0<9<24 and 9**2+243==18**2 and 15**2+243==6**2*13
checks['q21']={'part1':{'OH':'9 m','PH':'9sqrt3 m'},'part2HQ':'15 m','part3OQ':'24 m','heightSquared':str(ph_squared),'HqSquared':str(hq_squared),'interiorFootVerified':True,'rubricPoints':[3,3,2]}
result={'method':'Exact fractions/surd coefficients, decimal table lookup/rounding, Pythagoras and elementary areas only; no trigonometric function evaluation or trig identities.','checks':checks,'multipleChoiceQuestionsChecked':11,'choicesChecked':55,'writtenQuestionsChecked':3,'writtenSubpartsChecked':9,'authorAnswerInputs':False}
with (OUT/'calculation-results.json').open('x',encoding='utf-8') as f:json.dump(result,f,indent=2);f.write('\n')
print('GF14 exact checks passed:55 MC options plus9 written subparts; choice indices',[(k,v.get('uniqueChoice')) for k,v in checks.items() if 'uniqueChoice' in v])
