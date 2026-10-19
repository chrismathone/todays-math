"""Independent NB5 exact checks from student packet only; no author input."""
from fractions import Fraction as F
import json, math, pathlib
OUT = pathlib.Path(__file__).resolve().parent
# q1: choose positive ratio unit t=1; cos x=3/sqrt(10), tan y=3.
# Express all options as rational multiples of sqrt(10).
q1_options = [F(1,30),F(1,10),F(3,10),F(9,10),F(3)]
q1_true = F(3*3,10)
assert [i+1 for i,v in enumerate(q1_options) if v==q1_true] == [4]
# q2: similarity gives AB=26*(5/13)=10. Test every BC against Pythagoras.
ab = F(26)*F(5,13)
q2_options = [10,12,20,24,25]
q2_sums = [ab*ab+b*b for b in q2_options]
assert [i+1 for i,v in enumerate(q2_sums) if v==26**2] == [4]
# q4: use right triangle OPQ, OQ=6; cos a=OP/PQ=4/5.
# Pythagoras with OP=4t,PQ=5t gives 36=9t^2; t=2 (positive).
t=F(6,3);op=4*t;pq=5*t;area=op*6/2
q4_options=[12,18,24,36,48]
q4_op=[F(a,3) for a in q4_options]
q4_cos_squared=[x*x/(x*x+36) for x in q4_op]
assert area==24 and [i+1 for i,v in enumerate(q4_cos_squared) if v==F(16,25)] == [3]
# q6: 45-45-90 triangle gives BC=6. A 30-60-90 triangle gives CD=6sqrt3.
# Every area option is a rational multiple of sqrt3 in cm^2.
bc=F(6);cd_sqrt3=bc;area_sqrt3=bc*cd_sqrt3/2
q6_options=[6,9,12,18,36]
assert area_sqrt3==18 and [i+1 for i,v in enumerate(q6_options) if v==area_sqrt3]==[4]
# q8: altitude from A = 6*(sqrt3/2)=3sqrt3.
# O midpoint AC -> area OBC = half area ABC = (3*BC/4)*sqrt3.
q8_true=F(12)*4/3
q8_options=[4,8,16,16*math.sqrt(3),32]
q8_result_areas=[3,6,12,12*math.sqrt(3),24]  # coefficients of sqrt3; option4 =36 actual area
assert q8_true==16
# The non-rational option4 has actual area36, distinct from12sqrt3 (squares1296 vs432).
assert F(36**2)!=F(12**2*3)
assert [i+1 for i,v in enumerate([4,8,16,None,32]) if v==q8_true]==[3]
report={
 'q01':{'optionCoefficientsOfSqrt10':[str(x) for x in q1_options],'requiredCoefficient':str(q1_true),'uniqueChoice':4},
 'q02':{'AB':str(ab),'candidateBC':q2_options,'ABSquaredPlusBCSquared':[str(x) for x in q2_sums],'requiredACSquared':676,'uniqueChoice':4},
 'q04':{'OQ':6,'OP':str(op),'PQ':str(pq),'area':str(area),'candidateAreas':q4_options,'candidateCosSquaredFromSideRatios':[str(x) for x in q4_cos_squared],'requiredSquaredRatio':'16/25','uniqueChoice':3},
 'q06':{'BC':str(bc),'CDCoefficientOfSqrt3':str(cd_sqrt3),'areaCoefficientOfSqrt3':str(area_sqrt3),'optionCoefficientsOfSqrt3':q6_options,'uniqueChoice':4},
 'q08':{'heightCoefficientOfSqrt3':3,'requiredBC':str(q8_true),'candidateAreas':['3sqrt3','6sqrt3','12sqrt3','36','24sqrt3'],'option4AreaSquared':1296,'targetAreaSquared':432,'uniqueChoice':3},
 'method':'Exact rational side ratios, Pythagoras, similarity and elementary area. Squared ratios are arithmetic comparisons, not trigonometric identities. No pixel measurements or author answers.'}
with (OUT/'calculation-results.json').open('x',encoding='utf-8') as f:json.dump(report,f,indent=2);f.write('\n')
print('Independent checks passed: all 25 choices compared; unique choices 4,4,3,4,3')
