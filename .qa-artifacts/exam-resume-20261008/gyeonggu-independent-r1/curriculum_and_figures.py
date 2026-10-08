"""Collect primary curricular clauses and record direct student-figure inspection.

No Gyeonggu author reports, private specs, authored answers, bank or DB are read.
"""
from pathlib import Path
import hashlib
import json
import re
import struct
import sys
import zlib
import fitz
import olefile

sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parent
OWN=ROOT.parents[2]
SRC=OWN.parent/'exam-twin-curriculum-20261008/.qa-artifacts/exam-resume-20261008/sources'

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def save(name,data):(ROOT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


def curriculum():
    hwp=SRC/'moe-2020-236-book8-math.hwp';pdf=SRC/'moe-2015-74-book8-math.pdf'
    with olefile.OleFileIO(str(hwp)) as o:
        data=zlib.decompress(o.openstream('BodyText/Section0').read(),-15)
    p=rn=pn=0;rows=[]
    while p<len(data):
        off=p;h=struct.unpack_from('<I',data,p)[0];p+=4;tag=h&1023;size=h>>20
        if size==4095:size=struct.unpack_from('<I',data,p)[0];p+=4
        payload=data[p:p+size];p+=size;rn+=1
        if tag==67:
            pn+=1;t=re.sub(r'[\x00-\x1f]','',payload.decode('utf-16le')).strip()
            rows.append({'stream':'BodyText/Section0','tag':67,'record1based':rn,'paragraph1based':pn,'offset':off,'text':t})
    selected=[]
    codes=['6수03-08','9수01-07','9수01-10','9수02-05','9수02-12','9수02-13',
           '9수04-01','9수04-02','9수04-04','9수04-05','9수04-09','9수04-10','9수04-12',
           '9수04-13','9수04-14','9수04-16','9수04-17','9수04-18','9수04-19']
    norm=lambda s:re.sub(r'[\s\x00-\x1f]','',s)
    with fitz.open(str(pdf)) as doc:
        # Relevant curriculum pages only, no exam content or original solutions.
        texts={n:doc[n-1].get_text() for n in range(29,40)}
        for code in codes:
            row=next(x for x in rows if x['text'].startswith('['+code+']'))
            matches=[n for n,t in texts.items() if norm(row['text']) in norm(t)]
            assert len(matches)==1,(code,matches)
            selected.append({'id':code,'hwp':row,'pdfPhysicalPage1based':matches[0],
                             'pdfPrintedPage':matches[0]-4,'wholeClausePdfMatch':True})
        for code,text in [
            ('no_trig_ratio_relationships','삼각비 사이의 관계는 다루지 않는다.'),
            ('angle_range','삼각비의 값은 0°에서 90°까지의 각도에 대한 것만 다룬다.'),
            ('no_circle_proportionality','원과 비례에 관한 성질은 다루지 않는다.'),
            ('no_complex_geometry_measurement','복잡하게 변형된 평면도형의 넓이와 둘레의 길이, 입체도형의 겉넓이와 부피를 구하는 문제는 다루지 않는다.'),
            ('no_formal_complex_justification','정확한 용어와 기호의 사용, 복잡한 형식 논리 규칙의 이용을 요구하는 연역적 정당화 문제는 다루지 않는다.')]:
            row=next(x for x in rows if x['text']==text)
            assert norm(text) in norm(texts[39])
            selected.append({'id':code,'hwp':row,'pdfPhysicalPage1based':39,'pdfPrintedPage':35,'wholeClausePdfMatch':True})
    rollout=[]
    for f in ['moe-60747.html','moe-93458.html']:
        p=SRC/f;s=p.read_text(encoding='utf-8')
        s=re.sub(r'<(script|style)\b[^>]*>.*?</\1>','',s,flags=re.S|re.I)
        import html
        s=re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',s)))
        start=s.index('부 칙');end=s.index('2.',start)
        rollout.append({'path':p.as_posix(),'sha256':sha(p),'locator':'부칙1 가~라','text':s[start:end].strip()})
    save('curriculum-method-evidence.json',{
        'reference':'2015 revision applies to 2025/2026 middle3; 2022 middle3 begins2027; exact-grade content is reviewed separately from band labels.',
        'hwp':{'path':hwp.as_posix(),'sha256':sha(hwp),'url':'https://www.moe.go.kr/boardCnts/fileDown.do?m=0404&s=moe&fileSeq=9626ca7f4483de728b1e9b14e8f41f84'},
        'pdf':{'path':pdf.as_posix(),'sha256':sha(pdf),'url':'https://www.moe.go.kr/boardCnts/fileDown.do?m=040401&s=moe&fileSeq=dc926a43bf953203951fb928ff098b1c'},
        'provisions':selected,'rollout':rollout,
        'methodBoundary':'Blind solve student route only. No original answer, author method, family assignment or bank permission. No law of sines/cosines, ratio identities, addition/half-angle, calculus/extrema, vector method, circle power or angle-bisector length theorem used in student solutions.',
        'specificCases':{
            'q05':'Compare same trig ratio as acute angle changes geometrically; no exact arbitrary-angle trig value or identity required.',
            'q09':'Two right triangles congruent (ASA from angle bisector and shared hypotenuse) then Pythagoras; avoid unstated angle-bisector length ratio theorem.',
            'q10':'30/60 and45/45 right triangles plus cosine definition recover15degree value; no addition formula.',
            'q13':'105degree is a geometric angle given; derive45degree subtriangle and use30/60 side proportions; no trig evaluated at105degrees.',
            'q21':'75degree requested angle is an angle-sum result, not a tangent-addition computation.',
            'q23':'120degree central angle and120degree sector fraction are ordinary circle geometry; trig evaluated only in right triangle30degrees.'},
        'scopeLimits':'This is a legitimate-method check for these blind solves, not exhaustive official policy history, exact Unit/live family adjudication, original-twin faithfulness, rights/native provenance, print production approval or authority for loading.'})
    print('Primary standard/restriction whole-clause bindings',len(selected))


def figures():
    records=json.loads((ROOT/'render-manifest.json').read_text(encoding='utf-8'))
    observed={
      1:'P right, Q upper left, R lower left; right angle atR. Point labels legible; side numbers come from student stem.',
      3:'P right, Q upper left, R lower left; right angle atR, labels clear; do not measure3/4 from pixels.',
      4:'M internal QR and PM perpendicular QR. Theta and phi labels use outward placement/leader arc nearP; stem explicitly fixes theta=QPM, phi=MPR. Definitions remove label association uncertainty.',
      6:'Quarter circle O-A-B, P onarc, H foot onOA, D on rayOP and verticalatA; both right angle markers visible; theta atO.',
      8:'H internal BC, AH perpendicular BC,45degree atB,35degree betweenCA andAH; labels readable.',
      9:'D onBC, E onAB, DE perpendicularAB and C right angle; angle theta is ADC. Stem states AD bisectsA, so no equal-arc count is inferred from pixels.',
      10:'RectangleABCD, E onBC and F onCD; right mark atE for AE/EF;45 and30 labels have leaders and stem fixes their angles. All labels legible at70mm.',
      11:'Two separate55mm figures: squareABCD with crossing diagonalsH; triangleOAH with H right angle and A30degrees. It exposes the requested perpendicular cross section without hidden 3D inference.',
      12:'H internalBC, AH vertical;60 atB and45 atC; right mark atH readable.',
      13:'D internalAB, E foot onBC, F foot onAB;105degree marker atD; both feet labeled and right marks clear. Shaded ADC matches area mention but is not used to measure.',
      14:'O center, chordAB, M perpendicular-foot midpoint; OM right marker clear.',
      15:'M/N feet onAB/AC with equal distance tick marksOM/ON; point labels clear. O need not be inside every triangle for the theorem; displayed positions cause no additional condition.',
      16:'O-P line intersects circle atB and radiusOA is perpendicular tangentAP. B label is displaced below the intersection; student stem explicitly states O,B,P in order. No radius/length read from pixels.',
      17:'Concentric circles, AB tangent to innercircle atH and OH perpendicularAB; annulus shaded. Drawn radius ratio is schematic and is not a given.',
      18:'B/C diameter endpoints, endpoint tangent supportsAB/CD, AD tangent atE, F foot fromA toCD; legible support/foot labels. AF is an auxiliary segment crossing the semicircle, not a perimeter edge.',
      19:'Square with inner semicircle onBC; AE tangent atF, E onCD; radiusOF right mark present. All labels legible; F internalAE consistent with stem.',
      21:'Vertical supportsAB/DC, crossed AC/BD meetingP, PH foot toBC;45 atA and60 atD. APB is the left wedge, not the lower105degree wedge.',
      22:'A at left, P/Q tangent points beyond C/B; BC tangent atD interior. O lies outside triangleABC as stated placement requires. No incircle-inside-triangle assumption used.',
      23:'Exterior shaded region between PA/PB and near small arcAB, excluding the circle; radii to tangent points perpendicular. Subtract120degree sector from OAPB quadrilateral, not just trianglePAB.'}
    rows=[]
    for r in records:
        assert sha(ROOT/r['png'])==r['pngSha256'] and sha(ROOT/r['pdf'])==r['pdfSha256']
        rows.append({**r,'visualInspection':'direct view_image completed on 2026-10-08',
                     'observation':observed[r['questionNumber']],'labelsReadableAtSpecifiedPhysicalWidth':True,
                     'pixelMeasurementsUsedToSolve':False,'physicalPrintProductionApproval':False})
    save('figure-observations.json',rows)
    save('judgment-method.json',{
        'projectSkill':{'path':(OWN/'.agents/skills/typesafe-ai/SKILL.md').as_posix(),'sha256':sha(OWN/'.agents/skills/typesafe-ai/SKILL.md')},
        'latestAgents':{'path':'D:/todays-math/AGENTS.md','sha256':sha(Path('D:/todays-math/AGENTS.md'))},
        'liveDocsReadDateKst':'2026-10-08',
        'liveDocs':[{'url':'https://docs.typesafe.ai/confidence','use':'No confidence/probability treated as permission; none computed.'},
                    {'url':'https://docs.typesafe.ai/cookbooks/citation_check','use':'Exact source text checks and contextual legitimate-method judgments recorded separately.'}],
        'inferenceApiCalls':0,'deterministicMath':'Independent code and elementary student proofs; code validates concrete givens, choices and witness geometry.',
        'knownOutOfGradeRoute':'exclude; continue other questions','uncertainStudentMethod':'pending with exact reason; no forced approval'})
    print('20 direct figure inspections recorded; no pixels used as math oracle')


if __name__=='__main__':curriculum();figures()
