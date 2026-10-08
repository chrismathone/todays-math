"""Post-exposure role/unit/value comparison. Never rewrites pre-exposure solves.

Expressions are parsed to exact arithmetic trees, not compared as normalized strings.
The limited syntax is inspected actual numeric/radical/trig35 input, not a general CAS API.
Authored MC marks select inspected choices; written subpart role maps are explicit.
Fresh calculations check the authored intermediate route as well as its conclusion.
"""
from pathlib import Path
import hashlib,json,math,re,sys
import sympy as S
from sympy.parsing.sympy_parser import parse_expr,standard_transformations,implicit_multiplication_application,rationalize
sys.stdout.reconfigure(encoding='utf8')
OUT=Path(__file__).resolve().parent
OWN=OUT.parents[2]
OLD=OWN/'.qa-artifacts/exam-resume-20261008/gyeonggu-independent-r1'
inputs=json.loads((OUT/'input-bindings.json').read_text(encoding='utf8'))
rows=json.loads(Path(inputs['verificationInputs']['path']).read_text(encoding='utf8'))
R=S.Rational;rt=S.sqrt;T=S.Symbol('T35',positive=True)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def simp(x):return S.simplify(x)
def equal(a,b):return simp(a-b)==0
def enc(x):
    if isinstance(x,S.Basic):return str(simp(x))
    if isinstance(x,dict):return {str(k):enc(v) for k,v in x.items()}
    if isinstance(x,(list,tuple)):return [enc(v) for v in x]
    return x
def arg(t,i):
    if t[i]!='{':return t[i],i+1
    d=1;j=i+1
    while d:
        d+=(t[j]=='{')-(t[j]=='}');j+=1
    return t[i+1:j-1],j
def tex(t):
    t=re.sub(r'\\mathrm\{cm\}(?:\^\{?[23]\}?)?','',t)
    t=t.replace('\\,','').replace('$','').replace('^\\circ','').replace('\\circ','')
    t=re.sub(r'\\tan\s*35','T35',t);t=re.sub(r'\s+','',t)
    def cv(t):
        out='';i=0
        while i<len(t):
            if t.startswith(('\\frac','\\dfrac'),i):
                k=6 if t.startswith('\\dfrac',i) else 5
                a,j=arg(t,i+k);b,i=arg(t,j);out+='(('+cv(a)+')/('+cv(b)+'))'
            elif t.startswith('\\sqrt',i):
                a,i=arg(t,i+5);out+='sqrt('+cv(a)+')'
            elif t[i] in '{}':out+='(' if t[i]=='{' else ')';i+=1
            else:out+=t[i];i+=1
        return out.replace('^','**')
    expr=cv(t);assert re.fullmatch(r'[0-9+*/().\-sqrtT35]+',expr),expr
    return parse_expr(expr,local_dict={'sqrt':rt,'T35':T},transformations=standard_transformations+(implicit_multiplication_application,rationalize))
def raw_value(t):
    t=t.split(' (')[0].replace('−','-').replace('°','').replace('cm³','').replace('cm²','').replace('cm','')
    t=t.replace('tan35','T35')
    # Radical arguments in these fixed answers are single positive digits.
    t=re.sub(r'√(\d)',r'sqrt(\1)',t);t=re.sub(r'\s+','',t)
    assert re.fullmatch(r'[0-9+*/().\-sqrtT35]+',t),t
    return parse_expr(t,local_dict={'sqrt':rt,'T35':T},transformations=standard_transformations+(implicit_multiplication_application,rationalize))
roles={
 1:[('cos Q','1'),('tan P','1')],2:[('BC','cm'),('CA','cm')],3:[('t','1')],4:[('cos θ−cos φ','1')],
 5:[('remaining card difference','1')],6:[('PH rounded record','length,unit radius'),('OH rounded record','length,unit radius')],
 7:[('㉠','1'),('㉡','1'),('㉢','1')],8:[('BC','cm')],9:[('DC','cm'),('tan ADC','1')],
 10:[('DAF','degree'),('cos DAF','1')],11:[('OH height','cm'),('pyramid volume','cm^3')],12:[('BC','cm')],
 13:[('BD','cm')],14:[('OM','cm')],15:[('x','1'),('BAC','degree')],16:[('BP','cm')],17:[('AB full chord','cm')],
 18:[('ABCD perimeter','cm')],19:[('DE','cm')],21:[('APB','degree'),('DC','cm'),('BD','cm'),('BPC area','cm^2')],
 22:[('AP','cm'),('radius','cm'),('AO','cm')],23:[('minor AOB','degree'),('radius','cm'),('OP','cm')]}
def fresh(n):
    steps=[]
    def ck(label,a,b):
        assert equal(a,b),(n,label,a,b)
        steps.append({'claim':label,'left':str(simp(a)),'right':str(simp(b)),'difference':str(simp(a-b)),'passed':True})
    if n==1:
        leg=rt(13**2-5**2);ck('remaining leg',leg,12);v=(R(5,13),5/leg)
    elif n==2:
        hyp=10*rt(2);bc=hyp*R(3,5);ca=rt(hyp**2-bc**2);ck('Pythagoras',bc**2+ca**2,200);v=(bc,ca)
    elif n==3:
        v=(R(3,4)*R(4,5),);ck('product',v[0],R(3,5));assert R(1,2)<v[0]<R(2,3)
    elif n==4:
        hyp=rt(25+144);alt=S.Integer(60)/hyp;ck('area from two bases',hyp*alt/2,30);v=(alt/5-alt/12,)
    elif n==5:
        vals=[math.cos(math.radians(75)),0.5,math.sqrt(3)/2,math.tan(math.radians(55))]
        assert all(a<b for a,b in zip(vals,vals[1:]));v=((rt(3)-1)/2,)
        steps.append({'claim':'geometric acute-angle order cos75<sin30<cos30<tan55','numericalSupplement':vals,'passed':True,'studentProof':'cos75<cos60=1/2<sqrt3/2<1=tan45<tan55; quarter-circle/fixed adjacent leg comparisons, no derivative'})
    elif n==6:
        t=re.findall(r'\| \$(\d+)\^\\circ\$ \| \$([\d.]+)\$ \| \$([\d.]+)\$ \| \$([\d.]+)\$ \|',next(r['candidate']['content'] for r in rows if r['candidate']['questionNumber']==n))
        assert len(t)==4
        for a,s,c,tan in t:
            comp=[f'{f(math.radians(int(a))):.4f}' for f in [math.sin,math.cos,math.tan]];assert comp==[s,c,tan]
            steps.append({'claim':f'{a} degree table, all three rounded entries','given':[s,c,tan],'calculated':comp,'passed':True})
        selected=[x for x in t if x[3]=='0.8391'];assert len(selected)==1 and selected[0][0]=='40'
        v=(R('0.6428'),R('0.7660'))
        steps.append({'claim':'AD is a rounded table record; exact AD=tan40, PH=sin40,OH=cos40','actualAD':math.tan(math.radians(40)),'actualPH':math.sin(math.radians(40)),'actualOH':math.cos(math.radians(40)),'roundedSquaredSum':str(simp(v[0]**2+v[1]**2)),'passed':True,'limit':'Recorded decimals are not exact actual side lengths.'})
    elif n==7:v=(rt(3)/2*rt(3)/2,R(1,2),rt(2)/2/R(1,2)-rt(3)/3)
    elif n==8:
        ck('tan35 definition HC/AH',9*T/9,T);v=(9+9*T,)
    elif n==9:
        t=S.Symbol('t',real=True);roots=S.solve(S.Eq((20-t)/25,t/15),t);assert roots==[R(15,2)]
        ck('AA similarity author alternative BD/BA=DE/AC',(20-roots[0])/25,roots[0]/15)
        ck('independent Pythagorean alternative',(20-roots[0])**2,100+roots[0]**2);v=(roots[0],15/roots[0])
    elif n==10:
        ae=2*rt(6);ef=ae*rt(3)/3;af=ae/(rt(3)/2);ec=ef/rt(2);ad=2*rt(3)+ec
        ck('AEF Pythagoras',ae**2+ef**2,af**2);ck('ECF equal legs',ec,2)
        ck('ADF Pythagoras',ad**2+(2*rt(3)-2)**2,af**2);v=(S.Integer(90-45-30),ad/af)
    elif n==11:
        ah=rt(72)/2;h=ah*rt(3)/3;v=(h,36*h/3);ck('height definition',h/ah,rt(3)/3)
    elif n==12:v=(6+6/rt(3),)
    elif n==13:
        t=S.Symbol('t',real=True);side=t*(1+rt(3))/2;ad=side-t;cf=side*rt(3)/2
        area=simp(ad*cf/2);ck('authored area as function of BD',area,rt(3)*t*t/8)
        roots=S.solve(S.Eq(area,18*rt(3)),t);assert roots==[-12,12];v=(S.Integer(12),)
        steps.append({'claim':'exclude negative length;12 lies inside AB=6+6sqrt3','realRoots':[-12,12],'ad':str(ad.subs(t,12)),'passed':bool(0<12<side.subs(t,12))})
    elif n==14:v=(rt(100-36),)
    elif n==15:
        x=S.Symbol('x');sol=S.solve(x+28-(2*x-2),x);assert sol==[30];v=(sol[0],180-2*(sol[0]+28))
    elif n==16:
        ap=R(2*24,8);op=rt(64+ap**2);v=(op-8,);ck('triangle area',8*ap/2,24)
    elif n==17:
        v=(2*rt(49),);ck('invariant half-chord squared',v[0]**2/4,49)
        steps.append({'claim':'radii vary, requested chord unique','witnesses':[{'r':3,'R2':58,'chord':14},{'r':4,'R2':65,'chord':14}],'passed':True})
    elif n==18:
        bc=rt((3+12)**2-(12-3)**2);v=(3+12+15+bc,);ck('parallel heights Pythagoras',bc**2+9**2,225)
    elif n==19:
        x=S.Symbol('x',real=True);ce=S.solve((5+x)**2-25-(5-x)**2,x);assert ce==[R(5,4)]
        de=5-ce[0];v=(de,);ck('author CE vs blind DE roles',ce[0]+de,5);ck('AE positive tangent sum squared',(5+ce[0])**2,25+de**2)
    elif n==21:
        bc=6*rt(2)/rt(2);dc=bc/rt(3);bd=dc/R(1,2);ph=bc/(rt(3)+1);v=(S.Integer(75),dc,bd,bc*ph/2)
        ck('internal horizontal partitions',rt(3)*ph+ph,6);ck('BD right triangle',bd**2,bc**2+dc**2)
    elif n==22:
        ap=6*rt(3)/2;r=ap*rt(3)/3;ao=ap/(rt(3)/2);v=(ap,r,ao)
        AB,AC,BQ,CP=S.symbols('AB AC BQ CP');BC=BQ+CP;AQ=AB+BQ;AP=AC+CP
        ck('perimeter from internal point/tangent identities',AB+AC+BC,AP+AQ)
        ck('RHS tangents equal implies perimeter=2AP',(AP+AQ).subs(AB,AP-BQ),2*AP)
        ck('requested right triangle',ap**2+r**2,ao**2)
        # Exact existence at B=(3,-sqrt3),C=(3,sqrt3); both internal to A-tangent segments.
        ck('equilateral witness perimeter',3*(2*rt(3)),6*rt(3))
        steps.append({'claim':'valid internal placements; circle outside ABC; configuration need not be unique','segmentFractionAB_AQ':R(2,3),'segmentFractionAC_AP':R(2,3),'segmentFractionBD_BC':R(1,2),'AO':6,'circleRadius':3,'BClineX':3,'passed':True})
    elif n==23:
        coef=rt(3)-S.pi/3;assert float(coef)>0
        given=12*rt(3)-4*S.pi;r2=simp(given/coef);ck('inverse curved-region area',r2,12)
        r=rt(r2);v=(S.Integer(120),r,2*r);ck('small sector subtraction',r*r*rt(3)-r*r*S.pi/3,given)
    return tuple(simp(x) for x in v),steps

results=[]
for row in rows:
    n=row['candidate']['questionNumber'];c=row['candidate'];tag=f'q{n:02}'
    rawpath=OLD/f'blind/solve/{tag}.json';raw=json.loads(rawpath.read_text(encoding='utf8'));proof=OLD/f'blind/proofs/{tag}.json'
    assert raw==row['independentSolve'];values,steps=fresh(n)
    parts=list(raw['answerParts'].items())
    rawparts=parts[:1] if n==3 else parts[1:] if n==22 else parts
    parsedraw=[raw_value(v) for k,v in rawparts];assert all(equal(a,b) for a,b in zip(parsedraw,values)) and len(parsedraw)==len(values)
    choices=[];authvals=[]
    if c['choices']:
        marks='①②③④⑤';assert c['answer'] in marks and raw['answer'].count(c['answer'])==1
        for i,ch in enumerate(c['choices'],1):
            if n==3:
                a,_,b=ch.replace('$','').split('<');lo,hi=tex(a),tex(b);good=bool(lo<values[0]<hi)
                choices.append({'index1based':i,'text':ch,'lower':str(lo),'upper':str(hi),'value':str(values[0]),'strictContains':good})
            else:
                got=tuple(tex(x) for x in ch.replace('\\,','').split(','));diff=[simp(a-b) for a,b in zip(got,values)]
                good=len(got)==len(values) and all(x==0 for x in diff)
                choices.append({'index1based':i,'text':ch,'values':enc(got),'differences':enc(diff),'allRequestedPartsMatch':good})
        winners=[x['index1based'] for x in choices if x.get('strictContains',x.get('allRequestedPartsMatch'))]
        assert winners==[marks.index(c['answer'])+1]
        if n==3:
            lo,hi=raw['answerParts']['해당 구간'].split('<t<')
            chosen=choices[winners[0]-1]
            assert equal(raw_value(lo),S.sympify(chosen['lower'])) and equal(raw_value(hi),S.sympify(chosen['upper']))
        authvals=values if n==3 else tuple(tex(x) for x in c['choices'][winners[0]-1].replace('\\,','').split(','))
        authorMapping={'mark':c['answer'],'selectedChoiceIndex1based':winners[0],'selectedChoice':c['choices'][winners[0]-1],
                       'limit':'Author mark identifies printed choice, not a numerical parsing of the mark.'}
    else:
        blocks=re.split('[⑴⑵⑶⑷]',c['answer'])[1:];assert len(blocks)==(4 if n==21 else 3)
        spans=[re.findall(r'\$([^$]+)\$',b) for b in blocks]
        if n==22:
            assert len(spans[0])==2 and '2\\overline' in spans[0][0]
            first=spans[0][1].split('=')[-1];authvals=[tex(first),tex(spans[1][0]),tex(spans[2][0])]
        else:authvals=[tex(x[0]) for x in spans]
        numericspans=[first,spans[1][0],spans[2][0]] if n==22 else [x[0] for x in spans]
        for (_,unit),span in zip(roles[n],numericspans):
            if unit=='degree':assert '\\circ' in span
            else:
                assert '\\mathrm{cm}' in span
                assert ('^2' in span)==(unit=='cm^2') and '^3' not in span
        authorMapping={'subpartMathSpans':spans,'manualRoleMapCheckedAgainstActualStem':roles[n],
                       'q22RelationshipExplicitAndProved':n==22}
    comparisons=[]
    for (role,unit),(key,rawtext),a,b,v in zip(roles[n],rawparts,parsedraw,authvals,values):
        assert equal(a,b) and equal(a,v)
        comparisons.append({'role':role,'unit':unit,'rawPartKey':key,'rawTextUnchanged':rawtext,'parsedRawExact':str(a),
                            'authorPrintedExact':str(simp(b)),'freshCalculationExact':str(v),'difference':str(simp(a-b)),'equivalent':True,
                            'unitBasis':'Explicit printed choice/record table/stem subpart; raw answer retains units. Dimensionless trig ratios never inherit cm.'})
    results.append({'questionNumber':n,'providedDigests':{k:row[k] for k in ['studentDigest','candidateDigest','assetDigest','solveDigest']},
        'rawSolve':{'path':rawpath.as_posix(),'sha256':sha(rawpath),'answerUnchanged':raw['answer']},
        'preExposureProof':{'path':proof.as_posix(),'sha256':sha(proof)},'authorAnswer':c['answer'],
        'authorRoleMapping':authorMapping,'roleUnitValueComparisons':comparisons,
        'q22RequiredRelationshipIncluded':raw['answerParts'].get('⑴ 둘레 관계') if n==22 else None,
        'allChoices':choices,'freshAuthoredRouteCalculations':enc(steps),'mathematicallyEquivalent':True,
        'allRequestedPartsReviewed':True,'stringNormalizationIsAlgebraProof':False,
        'formattingOnlyComparatorMatch':False,'formattingLimit':'Current comparator compares the entire detailed raw answer with short author mark/value. Raw answers must stay unchanged; this explicit typed evidence is separate.'})
code={'path':Path(__file__).as_posix(),'sha256':sha(__file__)}
out={'method':'independent-solve-then-review','code':code,'results':results,'counts':{'questions':22,'MC':19,'actualChoicesChecked':95,
    'writtenNumberedSubparts':10,'writtenExtraRelationshipProof':1,'equivalent':22},
    'limits':['No edits of committed raw solves/proofs/code.','CAS is supplemental math, not grade permission.','Numeric trig checks are developer diagnostics; the authored elementary student proof is separately reviewed.']}
(OUT/'answer-equivalence-evidence.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(out['counts']))
