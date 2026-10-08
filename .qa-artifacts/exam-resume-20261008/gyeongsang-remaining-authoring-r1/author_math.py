"""Deterministic author calculations from the NEW configured conditions only.
No original solution/key, solver output, model API or DB is used.
"""
from pathlib import Path
import hashlib,json,math,re,sys
import sympy as S
from sympy.parsing.sympy_parser import parse_expr,standard_transformations,implicit_multiplication_application,rationalize
from drafts import DRAFTS,NUMBERS
OUT=Path(__file__).resolve().parent
R=S.Rational;rt=S.sqrt
def simp(x):return S.simplify(x)
def eq(a,b):return simp(a-b)==0
def enc(x):
    if isinstance(x,S.Basic):return str(simp(x))
    if isinstance(x,dict):return {str(k):enc(v) for k,v in x.items()}
    if isinstance(x,(list,tuple)):return [enc(v) for v in x]
    return x
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def trig_table(angles,functions):
    return {fn:{a:f'{getattr(math,fn)(math.radians(a)):.4f}' for a in angles} for fn in functions}
def table_md(angles,functions):
    data=trig_table(angles,functions)
    head='| 三角比 | '+ ' | '.join(f'${a}^\\circ$' for a in angles)+' |'
    head=head.replace('三角比','삼각비')
    return '\n'.join([head,'|---|'+ '|'.join('---' for _ in angles)+'|']+
        ['| '+fn+' | '+' | '.join('$'+data[fn][a]+'$' for a in angles)+' |' for fn in functions])
def arg(t,i):
    if t[i]!='{':return t[i],i+1
    level=1;j=i+1
    while level:level+=(t[j]=='{')-(t[j]=='}');j+=1
    return t[i+1:j-1],j
def tex(t):
    t=re.sub(r'\\mathrm\{cm\}|\\mathrm\{m\}','',t)
    t=t.replace('\\,','').replace('\\ ','').replace('$','').replace('^\\circ','')
    t=re.sub(r'\s+','',t)
    def cv(t):
        out='';i=0
        while i<len(t):
            if t.startswith('\\frac',i):a,j=arg(t,i+5);b,i=arg(t,j);out+='(('+cv(a)+')/('+cv(b)+'))'
            elif t.startswith('\\sqrt',i):a,i=arg(t,i+5);out+='sqrt('+cv(a)+')'
            elif t[i] in '{}':out+='(' if t[i]=='{' else ')';i+=1
            else:out+=t[i];i+=1
        return out.replace('^','**')
    value=cv(t);assert re.fullmatch(r'[0-9+*/().\-sqrt]+',value),value
    return parse_expr(value,local_dict={'sqrt':rt},transformations=standard_transformations+(implicit_multiplication_application,rationalize))
def case(n):
    facts={};checks=[]
    def ck(name,ok,calculation):
        assert bool(ok),(n,name,calculation)
        checks.append({'condition':name,'passedAsAuthorCalculation':True,'calculation':enc(calculation)})
    if n==1:
        hyp=S.Integer(25);sinp=R(7,25);qr=hyp*sinp;pr=rt(hyp*hyp-qr*qr);values=(qr,)
        facts={'PQ':hyp,'givenSinP':sinp,'QR':qr,'PRexistenceWitness':pr}
        ck('positive right triangle, supplied sine definition',pr>0 and qr>0 and eq(qr/hyp,sinp) and eq(pr**2+qr**2,hyp**2),facts)
    elif n==2:
        hyp=S.Integer(20);cp=R(4,5);a=hyp*cp;b=rt(hyp*hyp-a*a);values=(a,)
        facts={'a':a,'bExistenceWitness':b,'PQ':hyp,'cosP':cp}
        ck('a,b positive and unique from cosine and positive-root Pythagoras',a>0 and b>0 and eq(a/hyp,cp) and eq(a*a+b*b,400),facts)
    elif n==3:
        hyp,adj=S.Integer(13),S.Integer(10);opp=rt(hyp*hyp-adj*adj);values=(opp,opp/adj)
        facts={'PQ':hyp,'PR':adj,'QR':opp,'tanP':values[1]}
        ck('positive root and tangent denominator',opp>0 and adj>0 and eq(opp*opp+adj*adj,hyp*hyp),facts)
    elif n==4:
        actual={fn:10*getattr(math,fn)(math.radians(40)) for fn in ['sin','cos','tan']}
        records={fn:f'{value:.4f}' for fn,value in actual.items()}
        ck('three length records correctly rounded',records=={'sin':'6.4279','cos':'7.6604','tan':'8.3910'},records)
        cq=f"{float(R(records['cos'])/10):.4f}";tq=f"{float(R(records['tan'])/10):.4f}"
        values=(R(cq),R(tq));facts={'OA':10,'OP':10,'actualLengths':actual,'recordedLengths':records,'cosRecord':cq,'tanRecord':tq}
        ck('normalized recorded ratios and true ratios have requested precision',cq==f'{math.cos(math.radians(40)):.4f}' and tq==f'{math.tan(math.radians(40)):.4f}',facts)
    elif n==5:
        t=trig_table([31,32,33,34],['sin','cos']);ga=R(t['sin'][31])+R(t['cos'][34]);na=R(t['sin'][32])+R(t['cos'][33]);values=(ga-na,)
        facts={'freshTable':t,'ga':ga,'na':na,'orderedDifference':values[0]}
        ck('two exact decimal-record sums and sign',eq(ga,R('1.3440')) and eq(na,R('1.3686')) and eq(values[0],R('-0.0246')),facts)
    elif n==6:
        t=trig_table([37,38,39,40],['cos','tan']);xs=[a for a,v in t['tan'].items() if v=='0.7813'];ys=[a for a,v in t['cos'].items() if v=='0.7771']
        ck('independent inverse rows unique',xs==[38] and ys==[39],{'xRows':xs,'yRows':ys})
        values=(S.Integer(ys[0]-xs[0]),);facts={'freshTable':t,'x':xs[0],'y':ys[0],'difference':values[0]}
    elif n==7:
        hyp=12*rt(2);leg=hyp*rt(2)/2;values=(leg*2-hyp,);facts={'hypotenuse':hyp,'twoEqualLegs':leg,'requestedEdgeDifference':values[0]}
        ck('positive edge difference and valid45 triangle',values[0]>0 and eq(2*leg**2,hyp**2),facts)
    elif n==8:
        ga=rt(3)/2;coef=rt(2)/2*rt(3)/3;k=simp(ga/coef);values=(k,);facts={'ga':ga,'naCoefficient':coef,'k':k}
        ck('coefficient nonzero, unique positive scalar',coef>0 and k>0 and eq(k*coef,ga),facts)
    elif n==9:
        p,q=S.Integer(30),S.Integer(60);values=(q,rt(3)/2*R(1,2)*rt(3));facts={'angles':[p,q,90],
          'fixed60Substitutions':['sqrt(3)/2','1/2','sqrt(3)'],'product':values[1]}
        ck('angle constraints and literal fixed constants',p+q+90==180 and q==2*p and eq(values[1],R(3,4)),facts)
    elif n==16:
        pq=S.Integer(12);height=pq*rt(3)/2;area=36*rt(3);qr=simp(2*area/height);values=(qr,)
        facts={'PQ':pq,'PH':height,'area':area,'QR':qr,'QH':pq/2}
        ck('unique positive base and interior foot',qr>pq/2>0 and eq(qr*height/2,area),facts)
    elif n==17:
        computed=R('2.7')/R('0.2679');actual=2.7/math.tan(math.radians(15));record=f'{float(computed):.1f}';values=(R(record),)
        facts={'givenHeight':R('2.7'),'tableTan':R('0.2679'),'usingTableHorizontalDistance':computed,
           'actualGeometryHorizontalDistance':actual,'requestedRoundedRecord':record,'precision':'one decimal place'}
        ck('table ratio positive and actual geometry stable at requested rounding',computed>0 and actual>0 and record==f'{actual:.1f}' and record=='10.1',facts)
        for fn,v in zip(['sin','cos','tan'],['0.2588','0.9659','0.2679']):ck(fn+'15 table value',f'{getattr(math,fn)(math.radians(15)):.4f}'==v,v)
    elif n==18:
        cd=S.Integer(8);h=simp(cd/(1+rt(3)));small=simp(cd*h/2);shade=16+8*rt(3);whole=simp(small+shade)
        t=S.Symbol('t',real=True);roots=S.solve(S.Eq(t*t/(2*rt(3)),whole),t);positive=[r for r in roots if r>0];bc=positive[0];bf=bc-cd;values=(bf,)
        facts={'CD=FC':cd,'EH':h,'FH':h,'HC':simp(rt(3)*h),'EFCarea':small,'ABFEarea':shade,
          'ABCarea':whole,'allBCRoots':roots,'positiveBC':bc,'BF':bf,'AB':bc/rt(3)}
        ck('unique positive root and all internal segments',len(positive)==1 and bc>cd>h>0 and bf>0 and eq(h+rt(3)*h,cd),facts)
    elif n==19:
        x=S.Symbol('x',positive=True);qr=3*x/5;pr=simp(rt(x*x-qr*qr));area=simp(qr*pr/2);roots=S.solve(S.Eq(area,24),x);hyp=roots[0]
        values=(qr,pr,hyp,qr.subs(x,hyp),pr.subs(x,hyp));facts={'symbol':'x>0 actual hypotenuse','QR':qr,'PRfromPythagoras':pr,
          'areaAsFunctionOfHypotenuse':area,'positiveRoots':roots,'PQ':hyp,'QRactual':values[3],'PRactual':values[4]}
        ck('positive unique scale and both actual leg constraints',roots==[10] and eq(pr*pr+qr*qr,x*x) and eq(qr/x,R(3,5)) and eq(area.subs(x,hyp),24),facts)
    elif n==20:
        side=S.Integer(10);half=side/2;height=rt(side*side-half*half);values=(S.Integer(30),height,half/side,height/side,half/height)
        facts={'givenSide':side,'halfBase':half,'height':height,'alpha':30,'SSSProofSides':[10,5,'PH shared'],
          'sinAlphaDefinition':half/side,'cosAlphaDefinition':height/side,'tanAlphaDefinition':half/height}
        ck('actual lengths and three definition values',height>0 and eq(height*height+half*half,side*side) and eq(values[2],R(1,2)) and eq(values[4],rt(3)/3),facts)
    elif n==21:
        op=S.Integer(18);pq=6*rt(13);oh=op/2;ph=op*rt(3)/2;hq=rt(pq*pq-ph*ph);oq=oh+hq;values=(oh,ph,hq,oq)
        facts={'OP':op,'PQ':pq,'OH':oh,'PH':ph,'HQ':hq,'OQ':oq,'OH_over_OQ':oh/oq}
        ck('positive internal foot, both right triangle constraints',0<oh<oq and hq>0 and eq(oh*oh+ph*ph,op*op) and eq(ph*ph+hq*hq,pq*pq),facts)
    return tuple(simp(v) for v in values),enc(facts),checks
def evaluate():
    rows=[]
    for n in NUMBERS:
        values,facts,checks=case(n);draft=DRAFTS[n];choices=[]
        for i,choice in enumerate(draft['choices'],1):
            got=tuple(tex(t) for t in choice.replace('\\,','').split(','));differences=[simp(a-b) for a,b in zip(got,values)]
            correct=len(got)==len(values) and all(d==0 for d in differences)
            choices.append({'index1based':i,'choiceText':choice,'parsedExactValues':enc(got),'differencesFromCalculatedTargets':enc(differences),'correctAsAuthorCalculation':correct})
        winners=[r['index1based'] for r in choices if r['correctAsAuthorCalculation']]
        if choices:assert len(winners)==1,(n,values,choices)
        rows.append({'questionNumber':n,'newExactRequestedValues':enc(values),'freshNewCalculations':facts,'conditions':checks,
          'actualAllChoices':choices,'winnerIndex1based':winners[0] if winners else None,
          'choiceAnswerMark':'①②③④⑤'[winners[0]-1] if winners else None,
          'requestedUniquenessAuthorCheck':True,'wholeConfigurationMustBeUnique':n not in [8,9,20],
          'unitsAndPrecision':'q04/q05 table records andq17 specified rounded distance are approximations; all other numeric lengths/areas exact.',
          'code':{'path':Path(__file__).as_posix(),'sha256':sha(__file__)},'originalAnswerUsed':False,
          'authorCheckOnly':True,'independentMathApproval':False,'curriculumPermissionFromCalculation':False})
    return rows
if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf8');rows=evaluate()
    (OUT/'author-calculations.json').write_text(json.dumps({'authorOnly':True,'rows':rows,'MCchoicesChecked':sum(len(r['actualAllChoices']) for r in rows),
        'writtenParents':3,'originalAnswerKeyAgreementUsed':False},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps({'calculated':len(rows),'choicesChecked':sum(len(r['actualAllChoices']) for r in rows),'writtenParents':3}))
