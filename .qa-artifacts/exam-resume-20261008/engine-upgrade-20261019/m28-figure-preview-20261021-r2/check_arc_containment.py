"""Check actual rendered SVG curves against the actual boundary vectors, not pixels."""
from pathlib import Path
import hashlib
import json
import math
import re
import xml.etree.ElementTree as ET

OUT = Path(__file__).resolve().parent
NUMBER = r'[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?'
def cross(a,b):
    return a[0]*b[1]-a[1]*b[0]
def sub(a,b):
    return (a[0]-b[0],a[1]-b[1])
def distance(a,b):
    return math.hypot(a[0]-b[0],a[1]-b[1])
def check(folder, beta):
    row = json.loads((folder / f'beta-{beta}.json').read_text(encoding='utf-8'))
    svg = folder / f'beta-{beta}.svg'
    root = ET.fromstring(svg.read_bytes())
    elements = []
    def walk(el):
        if el.tag.rsplit('}',1)[-1] == 'defs' or 'data-label' in el.attrib:
            return
        if el.tag.rsplit('}',1)[-1] in ['line','path']:
            elements.append(el)
        for child in el:
            walk(child)
    walk(root)
    lines = [el for el in elements if el.tag.rsplit('}',1)[-1]=='line']
    arcs = [el for el in elements if el.tag.rsplit('}',1)[-1]=='path' and 'A' in el.attrib.get('d','')]
    assert len(lines)==4 and len(arcs)==2
    points = row['task']['figureSpec']['points']
    # The actual AB boundary is the first rendered segment. Verify all four
    # segments against this translation instead of accepting an assumed frame.
    line = lines[0]
    shift = (float(line.attrib['x1'])-points['A'][0],float(line.attrib['y1'])-points['A'][1])
    world = {name:(p[0]+shift[0],p[1]+shift[1]) for name,p in points.items()}
    declared = list(row['task']['figureSpec']['segments'].values())
    for line, (a,b) in zip(lines,declared):
        assert distance(world[a],(float(line.attrib['x1']),float(line.attrib['y1'])))<.003
        assert distance(world[b],(float(line.attrib['x2']),float(line.attrib['y2'])))<.003
    names=['A','B','C','D'];poly=[world[n] for n in names]
    orientation=1 if sum(cross(poly[i],poly[(i+1)%4]) for i in range(4))>0 else -1
    def inside_distance(point,a,b):
        return orientation*cross(sub(b,a),sub(point,a))/distance(a,b)
    checks=[]
    for arc in arcs:
        commands=re.findall(r'[A-Za-z]',re.sub(NUMBER,' ',arc.attrib['d']))
        assert commands==['M','A']
        values=[float(n) for n in re.findall(NUMBER,arc.attrib['d'])]
        assert len(values)==9
        sx,sy,rx,ry,rotation,large,sweep,ex,ey=values
        assert rx>0 and abs(rx-ry)<1e-9 and rotation==0
        a,b=(sx-ex)/2,(sy-ey)/2;chord2=a*a+b*b
        # SVG circular-arc endpoint conversion, including mandatory radius
        # enlargement if quantized endpoints exceed the supplied diameter.
        radius=max(rx,math.sqrt(chord2))
        factor=math.sqrt(max(0,(radius*radius-chord2)/chord2))*(-1 if large==sweep else 1)
        center=(factor*b+(sx+ex)/2,-factor*a+(sy+ey)/2)
        name=min(['A','C'],key=lambda n:distance(center,world[n]))
        assert distance(center,world[name])<1.5
        stroke=float(arc.attrib.get('stroke-width','1'))
        nonincident=[i for i in range(4) if names[i]!=name and names[(i+1)%4]!=name]
        circle_margins=[inside_distance(center,poly[i],poly[(i+1)%4])-radius-stroke/2 for i in nonincident]
        t0=math.atan2(sy-center[1],sx-center[0]);t1=math.atan2(ey-center[1],ex-center[0]);delta=t1-t0
        if sweep and delta<0:delta+=2*math.pi
        if not sweep and delta>0:delta-=2*math.pi
        assert not large and abs(delta)<=math.pi+1e-8
        worst=min(inside_distance((center[0]+radius*math.cos(t0+delta*j/256),
                                   center[1]+radius*math.sin(t0+delta*j/256)),poly[i],poly[(i+1)%4])
                  for j in range(257) for i in range(4))
        checks.append(dict(vertex=name,actualSVGRadius=radius,nonincidentCircleMargins=circle_margins,
                           worstArcHalfplaneDistance=worst,
                           passed=min(circle_margins)>=-.05 and worst>=-.15))
    assert sorted(c['vertex'] for c in checks)==['A','C']
    return dict(beta=beta,svgSha256=hashlib.sha256(svg.read_bytes()).hexdigest(),
                checks=checks,passed=all(c['passed'] for c in checks))

r1=OUT.parent/'m28-figure-preview-20261021-r1/native-once'
before=[check(r1,beta) for beta in [9,16,72]]
after=[check(OUT/'matrix-native',beta) for beta in range(9,73)]
assert [r['beta'] for r in before if not r['passed']]==[9,16]
assert len(after)==64 and all(r['passed'] for r in after)
report=dict(method='actual SVG boundary lines and circular-arc endpoint conversion; whole-circle clearance to nonincident sides plus257 arc samples',
            initialRejected=before,currentPassed=after,actualSVGsChecked=64,actualAngleArcsChecked=128,
            quantizationTolerance=.15,pixelMathOracle=False,gradeRightsOrQuestionApproval=False,dbWrites=0)
(OUT/'vector-containment-results.json').write_bytes((json.dumps(report,indent=2)+'\n').encode('utf-8'))
print(json.dumps(dict(initialFailed=[r['beta'] for r in before if not r['passed']],currentPass=64,arcs=128,dbWrites=0)))
