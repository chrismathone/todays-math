"""Fresh deterministic solutions from the copied student questions only.

SymPy/Fraction-style exact arithmetic and constructed witnesses check math;
coordinate/trig diagnostics are not proposed student prerequisites or permissions.
No candidate answer, key, other solver, generation API or DB input.
"""
from pathlib import Path
import hashlib
import json
import math
import re
import sys
import sympy as S
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, rationalize

sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parent
INPUT=ROOT/'blind/student-problems.json'
QUESTIONS=json.loads(INPUT.read_text(encoding='utf-8'))
BYN={q['questionNumber']:q for q in QUESTIONS}
T35=S.Symbol('T35',positive=True)
R=S.Rational
rt=S.sqrt


def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def exact(x):return S.simplify(x)
def eq(a,b):return exact(a-b)==0
def save(p,d):
    p=ROOT/p;p.parent.mkdir(parents=True,exist_ok=True)
    assert p.resolve().is_relative_to(ROOT)
    p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def enc(x):
    if isinstance(x,S.Basic):return str(exact(x))
    if isinstance(x,dict):return {str(k):enc(v) for k,v in x.items()}
    if isinstance(x,(list,tuple)):return [enc(v) for v in x]
    return x


def tex_arg(s,i):
    if s[i]=='{':
        level=1;j=i+1
        while level:
            if s[j]=='{':level+=1
            if s[j]=='}':level-=1
            j+=1
        return s[i+1:j-1],j
    return s[i],i+1


def tex_expr(s):
    s=re.sub(r'\\mathrm\{cm\}(?:\^\{?[23]\}?)?','',s)
    s=s.replace('\\,','').replace('$','').replace('^\\circ','').replace('\\circ','')
    s=re.sub(r'\\tan\s*35','T35',s)
    s=re.sub(r'\s+','',s)
    def convert(t):
        out='';i=0
        while i<len(t):
            if t.startswith('\\frac',i):
                a,j=tex_arg(t,i+5);b,i=tex_arg(t,j)
                out+='(('+convert(a)+')/('+convert(b)+'))'
            elif t.startswith('\\sqrt',i):
                a,i=tex_arg(t,i+5);out+='sqrt('+convert(a)+')'
            elif t[i] in '{}':
                out+='(' if t[i]=='{' else ')';i+=1
            else:out+=t[i];i+=1
        return out.replace('^','**')
    return parse_expr(convert(s),local_dict={'sqrt':S.sqrt,'T35':T35},
        transformations=standard_transformations+(implicit_multiplication_application,rationalize))


def parsed_choice(choice):
    text=choice.replace('\\,','')
    return tuple(tex_expr(x) for x in text.split(','))


def choice_conditions(n,got):
    """Test raw alternatives against concrete domain/given equations, not an answer key."""
    a=got[0];b=got[1] if len(got)>1 else None
    checks={}
    if n==1:checks={'cosineAcuteRange':0<a<1,'tangentPositive':b>0}
    elif n==2:checks={'positiveLegs':a>0 and b>0,'hypotenuseSquared200':eq(a*a+b*b,200),'sineBC_AB_3over5':eq(a/(10*rt(2)),R(3,5))}
    elif n==4:checks={'differenceOfAcuteCosinesRange':-1<a<1}
    elif n==5:checks={'middleCardDifferencePositiveLessThanHalf':0<a<R(1,2)}
    elif n==6:checks={'twoUnitRadiusProjectionsRange':0<a<1 and 0<b<1}
    elif n==7:checks={'allResultsPositive':all(x>0 for x in got),'givenCos60DivisorNonzero':True}
    elif n==8:checks={'positiveLengthForPositiveTan35':a.is_positive is True}
    elif n==9:checks={'DInternalBC':0<a<20,'positiveTangent':b>0,'bisectorRightTriangleEquation':eq((20-a)**2,100+a*a),'tanADCDefinition':eq(b,15/a)}
    elif n==10:checks={'givenAngleSum90':a+45+30==90,'acuteCosineRange':0<b<1}
    elif n==11:checks={'positiveHeightVolume':a>0 and b>0,'pyramidVolumeFactor':eq(b,36*a/3),'given30degCrossSection':eq(a/(3*rt(2)),rt(3)/3)}
    elif n==12:checks={'baseSumGreaterThanHC6':a>6}
    elif n==13:checks={'positiveLength':a>0,'givenTriangleArea18sqrt3':eq(rt(3)*a*a/8,18*rt(3))}
    elif n==14:checks={'centerChordDistanceRange':0<a<10,'radiusPythagoras':eq(a*a+6*6,100)}
    elif n==15:checks={'equalBaseAngleRecords':eq(a+28,2*a-2),'AEqualsAngleSumRemainder':eq(b,180-(a+28)-(2*a-2)),
                       'allTriangleAnglesPositive':0<b<180 and 0<a+28<180 and 0<2*a-2<180}
    elif n==16:checks={'outsideSegmentPositive':a>0,'givenRadiusAndAreaTriangle':eq((8+a)**2,8**2+6**2)}
    elif n==17:checks={'positiveFullChord':a>0,'squaredHalfChord49':eq((a/2)**2,49)}
    elif n==18:checks={'inferredBCPositive':a-30>0,'AD15_DF9_Pythagoras':eq((a-30)**2+9**2,15**2)}
    elif n==19:checks={'EInternalCD':0<a<5,'tangentAndSquareEquation':eq((10-a)**2,25+a*a)}
    return {k:bool(v) for k,v in checks.items()}


def choices(n,values):
    rows=[]
    for i,c in enumerate(BYN[n]['choices'],1):
        if n==3:
            parts=c.replace('$','').split('<')
            lower,upper=tex_expr(parts[0]),tex_expr(parts[2])
            good=bool(lower<values[0]<upper)
            rows.append({'index1based':i,'studentChoice':c,'interval':[str(lower),str(upper)],'containsValue':good,
                         'strictEndpointsChecked':True})
        else:
            got=parsed_choice(c)
            flags=[eq(a,b) for a,b in zip(got,values)]
            good=len(got)==len(values) and all(flags)
            rows.append({'index1based':i,'studentChoice':c,'parsedValues':enc(got),'matchesEachRequestedPart':flags,'matches':good,
                         'domainAndGivenConditionChecks':choice_conditions(n,got),
                         'differencesFromIndependentRequestedValues':enc([exact(a-b) for a,b in zip(got,values)])})
    good=[x['index1based'] for x in rows if x.get('matches',x.get('containsValue'))]
    assert len(good)==1,(n,values,rows)
    return {'allChoices':rows,'matchingIndices1based':good,'exactlyOneChoice':True,
            'basis':'Parsed actual copied student choices; no author/original key'}


def geometry(points,relations):
    # Exact point witnesses validate incidence/perpendicularity/length, never pixels.
    P={k:S.Matrix(v) for k,v in points.items()}
    details=[]
    for typ,names,want in relations:
        if typ=='lengthSquared':got=exact((P[names[0]]-P[names[1]]).dot(P[names[0]]-P[names[1]]))
        elif typ=='perpendicular':got=exact((P[names[0]]-P[names[1]]).dot(P[names[2]]-P[names[3]]))
        elif typ=='collinear':
            u=P[names[0]]-P[names[1]];v=P[names[2]]-P[names[1]];got=exact(u[0]*v[1]-u[1]*v[0])
        assert eq(got,want),(typ,names,got,want)
        details.append({'relation':typ,'points':names,'calculated':got,'required':want,'passed':True})
    return {'points':enc(points),'relations':enc(details),'method':'Independent exact coordinate witness; supplemental validation only'}


def case(n):
    facts={};checks=[];witness=None
    def check(label,ok,detail):
        assert bool(ok),(n,label,detail)
        checks.append({'condition':label,'passed':True,'calculation':enc(detail)})
    if n==1:
        pq,qr=S.Integer(13),S.Integer(5);pr=rt(pq*pq-qr*qr)
        values=(qr/pq,qr/pr);facts={'PQ':pq,'QR':qr,'PR':pr,'cosQ':values[0],'tanP':values[1]}
        check('positive nondegenerate right triangle',pq>qr>0 and pr>0,pr**2+qr**2)
    elif n==2:
        ab=10*rt(2);s=R(3,5);bc=ab*s;ca=rt(ab*ab-bc*bc)
        values=(bc,ca);facts={'AB':ab,'sinA':s,'BC':bc,'CA':ca}
        check('definition and Pythagoras',eq(bc/ab,s) and eq(bc*bc+ca*ca,ab*ab),{'sidesSquared':bc*bc+ca*ca})
        check('positive acute-angle triangle',bc>0 and ca>0 and 0<s<1,values)
    elif n==3:
        pr,qr=S.Integer(4),S.Integer(3);pq=rt(pr*pr+qr*qr)
        tanp=qr/pr;sinq=pr/pq;t=exact(tanp*sinq);values=(t,)
        facts={'PR':pr,'QR':qr,'PQ':pq,'tanP':tanp,'sinQ':sinq,'t':t}
        check('strict range, exact cross-multiplication',R(1,2)<t<R(2,3),{'2*t-1':2*t-1,'2-3*t':2-3*t})
    elif n==4:
        pq,pr=S.Integer(5),S.Integer(12);qr=rt(pq*pq+pr*pr);pm=pq*pr/qr
        cost=pm/pq;cosf=pm/pr;values=(exact(cost-cosf),)
        facts={'QR':qr,'triangleArea':pq*pr/2,'PM':pm,'cosTheta':cost,'cosPhi':cosf,'difference':values[0]}
        check('same triangle area yields altitude',eq(qr*pm/2,pq*pr/2),qr*pm/2)
        check('two acute cosines/positive difference',0<cosf<cost<1,values[0])
        qm=pq*pq/qr;mr=pr*pr/qr
        check('internal foot and right subtriangles',qm>0 and mr>0 and eq(qm+mr,qr) and eq(qm*qm+pm*pm,pq*pq) and eq(mr*mr+pm*pm,pr*pr),{'QM':qm,'MR':mr})
    elif n==5:
        values=((rt(3)-1)/2,)
        diagnostics={'sin30':math.sin(math.radians(30)),'cos30':math.cos(math.radians(30)),
                     'cos75':math.cos(math.radians(75)),'tan55':math.tan(math.radians(55))}
        check('card ordering independently checked numerically',diagnostics['cos75']<diagnostics['sin30']<diagnostics['cos30']<diagnostics['tan55'],diagnostics)
        facts={'cardOrder':['다: cos75','가: sin30','나: cos30','라: tan55'],'retained':['가','나'],'difference':values[0],
               'numericalDiagnosticsOnly':diagnostics,'studentProof':'Quarter-circle cos decreases with acute angle; fixed adjacent leg tan increases; exact values needed only at 30 degrees.'}
    elif n==6:
        table=[]
        for line in BYN[n]['content'].splitlines():
            m=re.match(r'\| \$(\d+)\^\\circ\$ \| \$([\d.]+)\$ \| \$([\d.]+)\$ \| \$([\d.]+)\$ \|',line)
            if m:
                angle=int(m[1]);given=m.groups()[1:]
                computed=[f'{f(math.radians(angle)):.4f}' for f in [math.sin,math.cos,math.tan]]
                check(f'all table entries at {angle} degrees rounded correctly',list(given)==computed,{'given':given,'computedTo4Decimals':computed})
                table.append({'angle':angle,'sin':given[0],'cos':given[1],'tan':given[2]})
        assert len(table)==4
        target=re.search(r'결과가 \$([\d.]+)\$',BYN[n]['content'])[1]
        rows=[x for x in table if x['tan']==target];assert len(rows)==1
        row=rows[0];values=(R(row['sin']),R(row['cos']))
        facts={'OA':1,'OP':1,'ADRecorded':target,'selectedAngleDegrees':row['angle'],'table':table,'PHRecorded':row['sin'],'OHRecorded':row['cos']}
        check('positive lengths and acute selected table row',0<values[0]<1 and 0<values[1]<1 and 0<row['angle']<90,values)
        facts['limit']='Rounded table lengths need not satisfy an exact squared-sum identity; use exact trig for incidence and table values for requested records.'
    elif n==7:
        a=rt(3)/2*rt(3)/2;b=S.Integer(1)*R(1,2);c=rt(2)/2/R(1,2)-rt(3)/3
        values=tuple(exact(x) for x in (a,b,c));facts={'ga':values[0],'na':values[1],'da':values[2],
            'substitutions':{'sin60':'sqrt(3)/2','cos30':'sqrt(3)/2','tan45':'1','sin30':'1/2','sin45':'sqrt(2)/2','cos60':'1/2','tan30':'sqrt(3)/3'}}
        check('all three results and nonzero divisor',eq(a,R(3,4)) and eq(b,R(1,2)) and R(1,2)!=0,values)
    elif n==8:
        ah=S.Integer(9);bh=ah;hc=ah*T35;values=(bh+hc,)
        facts={'AH':ah,'BH':bh,'HC':hc,'BC':values[0],'tan35NumericalDiagnostic':math.tan(math.radians(35))}
        check('internal foot, acute35 and positive sum',math.tan(math.radians(35))>0 and bh>0,{'BH':bh,'HC':hc})
        check('symbolic tangent definition',eq(hc/ah,T35),hc/ah)
    elif n==9:
        ab,ac=S.Integer(25),S.Integer(15);bc=rt(ab*ab-ac*ac)
        # ASA right-triangle congruence ADE/ADC gives AE=AC and DE=DC=d.
        ae=ac;be=ab-ae;d=S.Symbol('d',real=True)
        roots=S.solve((bc-d)**2-be**2-d**2,d);dc=roots[0];de=dc;bd=bc-dc
        theta_tan=ac/dc;values=(dc,theta_tan)
        facts={'BC':bc,'AE':ae,'BE':be,'equation':str((bc-d)**2-be**2-d**2),'allRealRoots':roots,'DC':dc,'DE':de,'BD':bd,'tanTheta':theta_tan}
        check('unique internal D and E',len(roots)==1 and 0<dc<bc and 0<ae<ab and bd>0,{'DC':dc,'AE':ae})
        points={'A':(20,15),'B':(0,0),'C':(20,0),'D':(R(25,2),0),'E':(8,6)}
        witness=geometry(points,[('lengthSquared',['A','B'],625),('lengthSquared',['A','C'],225),
            ('lengthSquared',['D','C'],R(225,4)),('lengthSquared',['D','E'],R(225,4)),
            ('perpendicular',['D','E','A','B'],0),('collinear',['A','E','B'],0),('collinear',['B','D','C'],0)])
        angle=math.degrees(math.atan(2));check('theta acute',0<angle<90,angle)
    elif n==10:
        ab=2*rt(3);be=ab;ae=ab*rt(2);ef=exact(ae*rt(3)/3);af=exact(ae/(rt(3)/2))
        ec=exact(ef/rt(2));cf=ec;ad=be+ec;df=ab-cf;cosdaf=exact(ad/af)
        angle_daf=S.Integer(90)-45-30
        values=(angle_daf,cosdaf)
        facts={'AB':ab,'BE':be,'AE':ae,'EF':ef,'AF':af,'EC':ec,'CF':cf,'AD':ad,'DF':df,
               'angleDAF':'90-45-30=15','cosDAF':cosdaf,'studentRoute':'AEF30/60 right triangle and ECF45/45 right triangle; projection AD/AF; no addition or half-angle formula'}
        check('all actual lengths positive and F internal',df>0 and cf>0 and ad>be and cf<ab,{'CF':cf,'CD':ab})
        check('AEF and ADF Pythagoras',eq(ae*ae+ef*ef,af*af) and eq(ad*ad+df*df,af*af),{'AFSquared':af*af})
        pts={'A':(0,ab),'B':(0,0),'C':(ad,0),'D':(ad,ab),'E':(be,0),'F':(ad,cf)}
        witness=geometry(pts,[('perpendicular',['A','E','E','F'],0),('collinear',['C','F','D'],0),
                              ('lengthSquared',['A','F'],32),('lengthSquared',['E','F'],8)])
    elif n==11:
        side=S.Integer(6);diag=rt(2*side*side);ah=diag/2;height=exact(ah*rt(3)/3);vol=exact(side**2*height/3)
        values=(height,vol);facts={'baseSide':side,'baseArea':side**2,'diagonal':diag,'AH':ah,'heightOH':height,'pyramidVolume':vol}
        check('positive height and proper pyramid factor',height>0 and eq(vol,side**2*height/3),values)
        check('cross section acute30',eq(height/ah,rt(3)/3),height/ah)
    elif n==12:
        h=S.Integer(6);bh=exact(h/rt(3));hc=h;values=(bh+hc,)
        facts={'AH':h,'BH':bh,'HC':hc,'BC':values[0],'baseAnglesDegrees':[60,45]}
        check('both feet lengths positive and H internal',bh>0 and hc>0,values[0])
    elif n==13:
        x=S.Symbol('x',positive=True);be=x/2;de=rt(3)*x/2;ce=de;side=be+ce;ad=side-x;cf=rt(3)*side/2
        area=exact(ad*cf/2);solutions=S.solve(S.Eq(area,18*rt(3)),x);bd=solutions[0]
        vals={k:exact(v.subs(x,bd)) for k,v in {'BE':be,'DE':de,'CE':ce,'side':side,'AD':ad,'CF':cf,'area':area}.items()}
        values=(bd,);facts={'angleACD':'180-60-105=15','angleDCB':'60-15=45',
                           'BDvariable':x,'areaAsFunctionOfBD':area,'positiveRoots':solutions,**vals}
        check('unique positive length and D internal',len(solutions)==1 and bd>0 and bd<vals['side'] and vals['AD']>0,vals)
        s=vals['side'];d=vals['AD'];h=vals['CF']
        bpt=S.Matrix((s,0));cpt=S.Matrix((s/2,h))
        ept=bpt+(vals['BE']/s)*(cpt-bpt)
        pts={'A':(0,0),'B':(s,0),'C':(s/2,h),'D':(d,0),'F':(s/2,0),'E':tuple(ept)}
        witness=geometry(pts,[('lengthSquared',['A','B'],s*s),('lengthSquared',['B','C'],s*s),
                              ('lengthSquared',['A','C'],s*s),('perpendicular',['C','F','A','B'],0),
                              ('perpendicular',['D','E','B','C'],0),('collinear',['B','E','C'],0),
                              ('lengthSquared',['D','E'],vals['DE']**2),('lengthSquared',['C','E'],vals['CE']**2)])
        uv=S.Matrix(pts['A'])-S.Matrix(pts['D']);vv=S.Matrix(pts['C'])-S.Matrix(pts['D'])
        angle=math.degrees(math.acos(float(uv.dot(vv)/(rt(uv.dot(uv))*rt(vv.dot(vv))))))
        check('105 degree given reconstructed without using trig105 as student method',abs(angle-105)<1e-9,angle)
    elif n==14:
        radius,ab=S.Integer(10),S.Integer(12);am=ab/2;om=rt(radius**2-am**2)
        values=(om,);facts={'radius':radius,'AB':ab,'AM':am,'OM':om}
        check('chord shorter than diameter, positive distance',0<ab<2*radius and om>0,{'squaredDistance':radius**2-am**2})
    elif n==15:
        x=S.Symbol('x',real=True);roots=S.solve(S.Eq(x+28,2*x-2),x);xv=roots[0];b=xv+28;c=2*xv-2;a=180-b-c
        values=(xv,a);facts={'equalCenterDistances':'OM=ON -> AB=AC','allXRoots':roots,'angleB':b,'angleC':c,'angleA':a}
        check('unique x and every triangle angle positive',len(roots)==1 and 0<a<180 and 0<b<180 and 0<c<180 and a+b+c==180,{'angles':[a,b,c]})
    elif n==16:
        radius=S.Integer(8);area=S.Integer(24);ap=2*area/radius;op=rt(radius**2+ap**2);bp=op-radius
        values=(bp,);facts={'OA':radius,'areaOAP':area,'AP':ap,'OP':op,'OB':radius,'BP':bp}
        check('external P and O-B-P ordering',op>radius>0 and bp>0 and eq(radius+bp,op),{'OP':op,'BP':bp})
        witness=geometry({'O':(0,0),'P':(10,0),'B':(8,0),'A':(R(32,5),R(24,5))},
                         [('perpendicular',['O','A','P','A'],0),('lengthSquared',['O','A'],64),('lengthSquared',['P','A'],36),('collinear',['O','B','P'],0)])
    elif n==17:
        diff=S.Integer(49);ah=rt(diff);ab=2*ah;values=(ab,)
        facts={'annulusArea':'49*pi','R_squared_minus_r_squared':diff,'AH':ah,'AB':ab,
               'radiusFreedom':'r>0 arbitrary, R=sqrt(r²+49); radii not individually unique; chord uniquely14'}
        check('positive chord and distinct circles',ab>0 and diff>0,ab)
        witness=geometry({'O':(0,0),'H':(0,3),'A':(-7,3),'B':(7,3)},
                         [('lengthSquared',['O','A'],58),('lengthSquared',['O','H'],9),('perpendicular',['O','H','A','B'],0)])
    elif n==18:
        a,c=S.Integer(3),S.Integer(12);ae=a;de=c;ad=ae+de;df=c-a;bc=rt(ad**2-df**2);perimeter=a+c+ad+bc
        values=(perimeter,);facts={'AE':ae,'DE':de,'AD':ad,'CF':a,'DF':df,'AF=BC':bc,'perimeter':perimeter,'radius':bc/2}
        check('positive perimeter, F and E internal',df>0 and 0<ae<ad and 0<a<c and bc>0,facts)
        witness=geometry({'A':(0,3),'B':(0,0),'C':(12,0),'D':(12,12),'F':(12,3),'O':(6,0),'E':(R(12,5),R(24,5))},
                         [('perpendicular',['O','E','A','D'],0),('lengthSquared',['O','E'],36),
                          ('lengthSquared',['A','E'],9),('lengthSquared',['D','E'],144),('collinear',['A','E','D'],0)])
    elif n==19:
        side=S.Integer(20)/4;x=S.Symbol('x',real=True);ae=2*side-x
        roots=S.solve(S.Eq(ae*ae,side**2+x*x),x);de=roots[0];ec=side-de;av=ae.subs(x,de)
        values=(de,);facts={'squareSide':side,'DEvariable':x,'AEexpression':ae,'allRealRoots':roots,'DE':de,'EC=EF':ec,'AF=AB':side,'AE':av}
        check('unique E and internal F with positive tangent segments',len(roots)==1 and 0<de<side and ec>0 and side<av,{'DE':de,'EF':ec})
        witness=geometry({'A':(0,5),'B':(0,0),'C':(5,0),'D':(5,5),'E':(5,R(5,4)),'O':(R(5,2),0),'F':(4,2)},
                         [('perpendicular',['O','F','A','E'],0),('lengthSquared',['O','F'],R(25,4)),
                          ('lengthSquared',['A','F'],25),('lengthSquared',['E','F'],R(25,16)),('collinear',['A','F','E'],0)])
    elif n==21:
        ac=6*rt(2);ab=exact(ac/rt(2));bc=ab;dc=exact(bc/rt(3));bd=exact(bc/(rt(3)/2));ph=exact(bc/(rt(3)+1));bh=exact(rt(3)*ph);hc=ph;area=exact(bc*ph/2)
        angle_b=S.Integer(90)-60;angle_c=S.Integer(90)-45
        angle_bpc=180-angle_b-angle_c;angle_apb=180-angle_bpc
        values=(angle_apb,dc,bd,area);facts={'AB':ab,'BC':bc,'DC':dc,'BD':bd,'anglePBC':angle_b,'angleBCP':angle_c,'angleBPC':angle_bpc,'angleAPB':angle_apb,'PH':ph,'BH':bh,'HC':hc,'areaBPC':area}
        check('all positive lengths; H and P internal',dc>0 and bd>0 and 0<bh<bc and hc>0 and 0<ph<dc,{'BH+HC':bh+hc,'BC':bc,'PH':ph})
        check('unique linear intersection height',eq((rt(3)+1)*ph,bc),ph)
        witness=geometry({'A':(0,6),'B':(0,0),'C':(6,0),'D':(6,dc),'P':(bh,ph),'H':(bh,0)},
                         [('collinear',['A','P','C'],0),('collinear',['B','P','D'],0),('perpendicular',['P','H','B','C'],0),('lengthSquared',['A','C'],72),('lengthSquared',['B','D'],48)])
    elif n==22:
        perimeter=6*rt(3);ap=exact(perimeter/2);radius=exact(ap*rt(3)/3);ao=rt(ap*ap+radius*radius)
        values=(ap,radius,ao);facts={'perimeter':perimeter,'identity':'AB+AC+BC=AP+AQ=2*AP','AP=AQ':ap,'radius':radius,'AO':ao,'anglePAO':30,
                                  'triangleShapeFreedom':'B and C are not individually fixed; AP, radius, AO are unique.'}
        check('positive target lengths and right triangle',ap>0 and radius>0 and eq(ap*ap+radius*radius,ao*ao),values)
        pts={'A':(0,0),'O':(6,0),'P':(R(9,2),3*rt(3)/2),'Q':(R(9,2),-3*rt(3)/2),
             'C':(3,rt(3)),'B':(3,-rt(3)),'D':(3,0)}
        witness=geometry(pts,[('perpendicular',['O','P','A','P'],0),('perpendicular',['O','Q','A','Q'],0),
             ('perpendicular',['O','D','B','C'],0),('lengthSquared',['O','P'],9),('lengthSquared',['O','Q'],9),
             ('lengthSquared',['O','D'],9),('collinear',['A','C','P'],0),('collinear',['A','B','Q'],0),('collinear',['B','D','C'],0)])
        check('explicit witness perimeter and positive internal placements',eq(2*2*rt(3)+2*rt(3),perimeter),{'AB':2*rt(3),'AC':2*rt(3),'BC':2*rt(3),'AP':ap,'AO':ao})
    elif n==23:
        ratio_tangent,ratio_center=S.Integer(1),S.Integer(2)
        pangle=180*ratio_tangent/(ratio_tangent+ratio_center);theta=180*ratio_center/(ratio_tangent+ratio_center)
        coeff=rt(3)-(theta/360)*S.pi;area=12*rt(3)-4*S.pi;r_sq=exact(area/coeff);radius=rt(r_sq);pa=rt(3)*radius;op=rt(radius*radius+pa*pa)
        values=(theta,radius,op);facts={'centralMinorAngle':theta,'tangentAngle':pangle,'positiveAreaCoefficient':coeff,'givenArea':area,'rSquared':r_sq,'radius':radius,'OP':op,'PA=PB':pa,'quadrilateralArea':rt(3)*r_sq,'sector120Area':S.pi*r_sq/3}
        check('angle ratio and full quadrilateral angle sum',theta==2*pangle and theta+pangle+90+90==360,{'angleAOB':theta,'angleAPB':pangle})
        check('nonzero positive area coefficient and unique positive radius',float(coeff)>0 and r_sq==12 and radius>0,{'coefficientApprox':float(coeff),'rSquared':r_sq})
        check('sector subtraction gives actual stated shaded area',eq(rt(3)*r_sq-S.pi*r_sq/3,area),area)
        witness=geometry({'O':(0,0),'P':(4*rt(3),0),'A':(rt(3),3),'B':(rt(3),-3)},
                         [('perpendicular',['O','A','P','A'],0),('perpendicular',['O','B','P','B'],0),
                          ('lengthSquared',['O','A'],12),('lengthSquared',['O','B'],12),('lengthSquared',['P','A'],36),('lengthSquared',['P','B'],36)])
    else:raise ValueError(n)
    result={'questionNumber':n,'studentDigest':BYN[n]['studentDigest'],
            'inputContentSha256':hashlib.sha256(BYN[n]['content'].encode('utf-8')).hexdigest(),
            'exactRequestedValues':enc(values),'freshCalculations':enc(facts),'conditionChecks':checks,
            'coordinateWitness':witness,'codeSha256':sha(__file__),
            'calculationIsCurriculumPermission':False,'authorOrOriginalAnswerUsed':False}
    if BYN[n]['choices']:result['choiceCheck']=choices(n,values)
    else:result['choiceCheck']={'notApplicable':True,'multiPartCount':len(values),'eachPartExplicit':True}
    return result


if __name__=='__main__':
    for q in QUESTIONS:
        n=q['questionNumber'];proof=case(n);save(Path(f'blind/proofs/q{n:02}.json'),proof)
        print(n,proof['exactRequestedValues'],proof['choiceCheck'].get('matchingIndices1based'))
