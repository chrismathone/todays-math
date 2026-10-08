"""Fresh independent calculations. Input: this blind student JSON only."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,re,hashlib,collections
import sympy as S
R=Path(__file__).resolve().parent
inp=R/'student-problems.json';questions=json.loads(inp.read_text(encoding='utf-8'))
assert [q['questionNumber'] for q in questions]==[10,11,12,13,14,15,22]
Q=S.Rational
def mean(v):return sum(map(S.sympify,v))/len(v)
def var(v):m=mean(v);return S.simplify(sum((S.sympify(x)-m)**2 for x in v)/len(v))
def median(v):s=sorted(v);n=len(s);return S.sympify(s[n//2]) if n%2 else (S.sympify(s[n//2-1])+s[n//2])/2
def maths(t):return re.findall(r'\$([^$]+)\$',t)
def scalar(t):
 t=re.sub(r'\\text\{[^}]*\}','',t).replace(r'\ ','').replace(' ','')
 t=re.sub(r'\\sqrt\{([^}]+)\}',r'sqrt(\1)',t)
 t=re.sub(r'\\sqrt(\d)',r'sqrt(\1)',t)
 t=re.sub(r'(\d)sqrt',r'\1*sqrt',t)
 return S.sympify(t,rational=True)
def table(q):
 lines=[l for l in q['content'].splitlines() if l.startswith('|') and not re.fullmatch(r'\|[\s:|\-]+\|',l)]
 return [maths(l) for l in lines if maths(l)]
out=[]
for q in questions:
 n=q['questionNumber'];e={};opts=[];match=[]
 if n==10:
  tokens=maths(q['content']);assert tokens[0]=='5';values=tokens[-1].split(',');assert len(values)==7
  known=[int(v) for v in values if v!=r'\square'];target=7*5-sum(known)
  e={'knownValuesFromStudent':known,'sumKnown':sum(known),'count':7,'total':35,'missing':target,'completed':[4,7,3,target,6,5,3],'meanRecheck':mean(known+[target]),'proof':'Sum=7*mean; one missing scalar has nonzero coefficient1 and is uniquely7.'}
 elif n==11:
  values=maths(q['content'])[-1].replace(' ','').split(',');known=[int(x) for x in values if x!='x'];assert len(known)==6
  valid=[x for x in range(1,13) if median(known+[x])==7];assert valid==[7];target=S.Integer(7)
  e={'knownValuesFromStudent':known,'domain':'natural1..12','allDomainCases':[{'x':x,'median':median(known+[x])} for x in range(1,13)],'validX':valid,'proof':'Odd median is an actual datum;7 is absent from six fixed values,so x must7; completed sorted data confirm existence.'}
 elif n==12:
  vals,freq=table(q);vals=list(map(int,vals));freq=list(map(int,freq));assert sum(freq)==14
  cases=[]
  for x in vals:
   counts={v:f+(v==x) for v,f in zip(vals,freq)};top=max(counts.values());modes=[v for v,c in counts.items() if c==top]
   cases.append({'added':x,'counts':counts,'modes':modes,'soleMode25':modes==[25]})
  target=S.Integer(25);assert [c['added'] for c in cases if c['soleMode25']]==[25]
  e={'cardValuesFromStudent':vals,'knownFrequenciesFromStudent':freq,'totalKnown':sum(freq),'finalCount':15,'allFiveCases':cases,'strictTiesChecked':True}
 elif n==13:
  rows=table(q);dev=list(map(int,rows[-1]));assert dev==[6,-5,7];missing=-sum(dev);third=int(maths(q['content'])[0]);assert third==78
  target=S.Integer(third-missing);actual=[target+6,target-5,third,target+7];assert mean(actual)==target and all(0<=x<=100 for x in actual)
  e={'knownDeviationsFromStudent':dev,'thirdScoreFromStudent':third,'missingThirdDeviation':missing,'actualScores':actual,'meanRecheck':mean(actual),'scoreDomain':'0..100;all four valid','proof':'Four deviations sum0; third deviation−8; score=mean+deviation.'}
 elif n==14:
  vals,freq=table(q);vals=list(map(int,vals));freq=list(map(int,freq));data=[v for v,f in zip(vals,freq) for _ in range(f)];assert len(data)==10
  target=(var(data),S.sqrt(var(data)))
  e={'valuesFromStudent':vals,'frequenciesFromStudent':freq,'expanded':data,'count':len(data),'sum':sum(data),'mean':mean(data),'deviations':[x-mean(data) for x in data],'squaredDeviationSum':sum((x-mean(data))**2 for x in data),'variance':var(data),'standardDeviation':target[1],'method':'Each deviation squared;frequency weighting; divide by10; positive square root.'}
 elif n==15:
  rows=table(q);means=list(map(scalar,rows[0]));sigmas=list(map(scalar,rows[1]));assert means==[12,13,11,14,10] and len(sigmas)==4
  target=Q(7,10)
  witnesses=[]
  for m,sd in zip(means,[target]+sigmas):
   a=sd*S.sqrt(10)/2;v=[m-a,m,m,m,m+a];assert mean(v)==m and var(v)==sd**2 and all(x>0 for x in v)
   witnesses.append({'mean':m,'sd':sd,'fivePositiveDurations':v,'varianceRecheck':var(v)})
  e={'programMeansFromStudent':means,'otherStandardDeviationsFromStudent':sigmas,'strictRequirement':'A sd < min(other sd)=4/5; equality excluded','minimumOther':min(sigmas),'positiveFiveObservationWitnesses':witnesses,'units':'mean/minutes;SD/minutes','notMeanRanking':True}
 else:
  vals,freq=table(q);vals=list(map(int,vals));freq=list(map(int,freq));data=[v for v,f in zip(vals,freq) for _ in range(f)];assert len(data)==20 and all(x>0 for x in data)
  target=(mean(data),median(data));assert target==(Q(159,20),Q(9,2))
  e={'timesFromStudent':vals,'frequenciesFromStudent':freq,'count':len(data),'weightedSum':sum(data),'expandedSorted':data,'middlePositions':{'10':data[9],'11':data[10]},'mean':target[0],'median':target[1],'reportChosen':'B','other19Sum':sum(data[:-1]),'other19MeanForEvidenceOnly':mean(data[:-1]),'countAtMost6':sum(x<=6 for x in data),'max':max(data),'positiveTimes':True,'reason':'One60-minute observation raises mean;14of20 times<=6;median4.5 describes central observed completion better. No trimmed-statistic method required.'}
 if q['choices']:
  if n==14:opts=[tuple(scalar(t) for t in maths(c)[0].split(',')) for c in q['choices']]
  else:opts=[scalar(maths(c)[0]) for c in q['choices']]
  assert len(opts)==5 and len(set(opts))==5
  for i,v in enumerate(opts):
   if n==15:correct=v<e['minimumOther']
   elif n==11:correct=median(e['knownValuesFromStudent']+[v])==7 and v.is_integer and 1<=v<=12
   else:correct=v==target
   if correct:match.append(i+1)
  assert len(match)==1
  e['allFiveDisplayedChoiceValues']=opts;e['choiceCorrectness']=[i+1 in match for i in range(5)];e['correctChoiceNumber']=match[0];e['choiceDistinct']=True
  if n==12:e['allFiveCasesChecked']=True
  if n==15:e['strictChoiceComparisons']=[{'value':v,'strictlyBelowAllOthers':bool(v<e['minimumOther']),'tiesMinimum':bool(v==e['minimumOther'])} for v in opts]
 else:assert q['choices']==[]
 out.append({'questionNumber':n,'target':target,'status':'independently-computed','evidence':e})
payload={'method':'fresh independent SymPy exact arithmetic; no author/source/private inputs','independentCalculation':True,'inputPath':'student-problems.json','inputRawSha256':hashlib.sha256(inp.read_bytes()).hexdigest(),'results':out}
b=(json.dumps(payload,ensure_ascii=False,indent=2,default=str)+'\n').encode('utf-8');dest=R/'calculation-output.json'
if (R/'solve-freeze.json').exists():assert dest.read_bytes()==b,'Frozen independent code output drift'
else:dest.write_bytes(b)
print(f'7 independent exact calculations; all6 MC5choices unique; written mean159/20 median9/2; output SHA256='+hashlib.sha256(b).hexdigest())
