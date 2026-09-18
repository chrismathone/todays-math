"""Annotated textbook graphs: deterministic curves plus finite segments and labels.

The upstream curveGraph accepts only whole lines and integer marks. This adapter
adds the finite segments/polygons used by inscribed-shape exam questions.

Ported from Mathgen scripts/figure/graph_scene.py (2026-09-14). Rendering uses
the existing identical core; local additions reject unknown/malformed fields
instead of silently drawing a partial spec.
"""
import math
import re

HANGUL = re.compile('[%s-%s%s-%s%s-%s]' % tuple(map(chr, (0x1100, 0x11FF, 0x3130, 0x318F, 0xAC00, 0xD7AF))))

CONTRACT = {
    'version': 'graph-1',
    'coordinates': 'Mathematical x right, y UP. Explicit xRange/yRange, each [min,max]. No eval/code.',
    'fields': {
        'xRange': 'required [min,max]', 'yRange': 'required [min,max]',
        'width': 'optional 240..640 default 520', 'height': 'optional 200..640 default 460',
        'axes': 'optional boolean default true; arrows + x,y labels only, NO automatic ticks or O label',
        'curves': 'list of {coefficients:[a,b,c,...],domain:[xmin,xmax]} for polynomial a*x^n+b*x^(n-1)+...; OR {type:"inverse",k:number,domain:[xmin,xmax]}; optional dashed:boolean',
        'segments': 'list of {from:[x,y],to:[x,y],dashed?:boolean,arrow?:boolean}; finite visible segments only',
        'polygons': 'list of {points:[[x,y],...],fill?:"#eeeeee",dashed?:boolean}; optional shading',
        'circles': 'list of {center:[x,y],radius:number,dashed?:boolean}; a geometric circle in DATA units (stretches to an ellipse when x/y scales differ) — never use it for printed dots; use points',
        'points': 'list of {at:[x,y],radius?:pixels 1..6 default 3,open?:boolean}; small printed dots at graph points (vertices, endpoints, intersections) in fixed screen pixels, filled black or open (white inside)',
        'labels': 'list of {at:[x,y],text:string,dx?:pixels,dy?:pixels,size?:pixels,anchor?:"start"|"middle"|"end"}; only printed labels; math can use $...$ LaTeX and is typeset as vector glyphs. Korean text cannot be typeset: write a label containing Korean as plain text without $ (e.g. "x(초)")',
    },
    'example': {'version':'graph-1','xRange':[-4,4],'yRange':[-2,11],
        'curves':[{'coefficients':[-1,0,9],'domain':[-3.4,3.4]}],
        'segments':[{'from':[-2,5],'to':[2,5]}],
        'labels':[{'at':[0,9],'text':'9','dx':-16,'dy':-3}, {'at':[-3,0],'text':'−3','dy':22},
            {'at':[3,0],'text':'3','dy':22},{'at':[0,0],'text':'O','dx':-16,'dy':22},
            {'at':[1.5,9],'text':'y = 9 − x²','dx':22,'dy':-8}]},
}

def render_graph(spec):
    from core.figure_svg import line as engine_line, curve_path, txt
    fields = {
        'curves': {'coefficients', 'domain', 'type', 'k', 'dashed'},
        'segments': {'from', 'to', 'dashed', 'arrow'},
        'polygons': {'points', 'fill', 'dashed'},
        'circles': {'center', 'radius', 'dashed'},
        'points': {'at', 'radius', 'open'},
        'labels': {'at', 'text', 'dx', 'dy', 'size', 'anchor'},
    }
    if not isinstance(spec, dict) or spec.get('version') != 'graph-1':
        raise ValueError('graph-1 도형 스펙이 필요합니다.')
    if set(spec) - {'version', 'xRange', 'yRange', 'width', 'height', 'axes', *fields}:
        raise ValueError('지원하지 않는 그래프 필드가 있습니다.')
    if 'axes' in spec and not isinstance(spec['axes'], bool):
        raise ValueError('axes는 참/거짓이어야 합니다.')
    def num(v):
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or abs(v) > 10000:
            raise ValueError('그래프 좌표는 유한한 수여야 합니다.')
        return float(v)
    def point(value):
        if not isinstance(value, list) or len(value) != 2: raise ValueError('그래프 점은 [x,y]여야 합니다.')
        return num(value[0]), num(value[1])
    xlo, xhi = point(spec.get('xRange')); ylo, yhi = point(spec.get('yRange'))
    if xhi <= xlo or yhi <= ylo: raise ValueError('그래프 좌표 범위가 올바르지 않습니다.')
    w = min(640, max(240, num(spec.get('width', 520)))); h = min(640, max(200, num(spec.get('height', 460))))
    pad = 48
    def screen(p):
        x,y = point(p)
        return (pad+(x-xlo)/(xhi-xlo)*(w-2*pad), h-pad-(y-ylo)/(yhi-ylo)*(h-2*pad))
    def xy(p): return ' '.join(f'{v:.3f}' for v in screen(p))
    def style(obj): return ' stroke-dasharray="6 4"' if obj.get('dashed') else ''
    def items(key):
        value=spec.get(key,[])
        if not isinstance(value,list) or len(value)>100 or any(not isinstance(i,dict) for i in value): raise ValueError(f'{key}는 최대 100개의 객체 목록이어야 합니다.')
        for item in value:
            if set(item) - fields[key]: raise ValueError(f'{key}에 지원하지 않는 필드가 있습니다.')
            for flag in ('dashed', 'arrow', 'open'):
                if flag in item and not isinstance(item[flag], bool): raise ValueError(f'{flag}는 참/거짓이어야 합니다.')
        return value
    out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}" width="{w:g}" height="{h:g}">']
    def line(a,b,obj=None,sw=1.7):
        obj=obj or {}; x1,y1=screen(a);x2,y2=screen(b)
        out.append(engine_line((x1,y1),(x2,y2),w=sw,dash='6 4' if obj.get('dashed') else None))
        if obj.get('arrow'):
            length=math.hypot(x2-x1,y2-y1)
            if length>0:
                ux=(x2-x1)/length;uy=(y2-y1)/length
                points=f'{x2:.3f},{y2:.3f} {x2-8*ux+3*uy:.3f},{y2-8*uy-3*ux:.3f} {x2-8*ux-3*uy:.3f},{y2-8*uy+3*ux:.3f}'
                out.append(f'<polygon points="{points}" fill="#111"/>')
    if spec.get('axes',True):
        if ylo<=0<=yhi: line([xlo,0],[xhi,0],{'arrow':True},1.4)
        if xlo<=0<=xhi: line([0,ylo],[0,yhi],{'arrow':True},1.4)
    for polygon in items('polygons'):
        points=polygon.get('points',[])
        if not isinstance(points,list) or not 3<=len(points)<=100: raise ValueError('다각형은 3~100개 점이 필요합니다.')
        fill=polygon.get('fill','none')
        if fill!='none' and (not isinstance(fill,str) or len(fill)!=7 or not fill.startswith('#') or any(c not in '0123456789abcdefABCDEF' for c in fill[1:])): raise ValueError('채우기 색은 #RRGGBB여야 합니다.')
        out.append(f'<polygon points="{" ".join(xy(p) for p in points)}" fill="{fill}" stroke="#111" stroke-width="1.7"{style(polygon)}/>')
    for curve in items('curves'):
        lo,hi=point(curve.get('domain',[xlo,xhi]));lo=max(lo,xlo);hi=min(hi,xhi)
        if hi <= lo: raise ValueError('곡선 구간은 그래프 범위 안의 증가하는 구간이어야 합니다.')
        coeff=curve.get('coefficients')
        if curve.get('type') not in (None, 'polynomial', 'inverse'):
            raise ValueError('지원하지 않는 곡선 종류입니다.')
        if (curve.get('type') == 'inverse' and coeff is not None) or (curve.get('type') != 'inverse' and 'k' in curve):
            raise ValueError('다항식과 반비례 곡선 필드를 섞을 수 없습니다.')
        if curve.get('type')=='inverse':
            k=num(curve.get('k'))
            def fn(x): return k/x if abs(x)>1e-8 else math.nan
        else:
            if not isinstance(coeff,list) or not 1<=len(coeff)<=8: raise ValueError('다항식 계수 목록이 필요합니다.')
            coeff=[num(c) for c in coeff]
            def fn(x):
                value=0
                for c in coeff: value=value*x+c
                return value
        runs=[];points=[]
        for i in range(401):
            x=lo+(hi-lo)*i/400;y=fn(x)
            if curve.get('type') == 'inverse' and i > 0 and x > 0 and lo+(hi-lo)*(i-1)/400 < 0:
                if len(points)>1:runs.append(points)
                points=[]
            if not math.isfinite(y) or not ylo<=y<=yhi:
                if len(points)>1:runs.append(points)
                points=[];continue
            points.append(screen([x,y]))
        if len(points)>1:runs.append(points)
        for points in runs:out.append(curve_path(points,w=2,dash='6 4' if curve.get('dashed') else None))
    for segment in items('segments'): line(segment.get('from'),segment.get('to'),segment)
    for circle in items('circles'):
        cx,cy=screen(circle.get('center'));r=num(circle.get('radius'))
        if r<=0:raise ValueError('원의 반지름은 양수여야 합니다.')
        out.append(f'<ellipse cx="{cx:.3f}" cy="{cy:.3f}" rx="{r/(xhi-xlo)*(w-2*pad):.3f}" ry="{r/(yhi-ylo)*(h-2*pad):.3f}" fill="none" stroke="#111" stroke-width="1.7"{style(circle)}/>')
    # 꺾인점·끝점의 인쇄된 점 — 반지름은 화면 픽셀이다. 2026-09-18 운영: 이 칸이 없어 모델이 circles(데이터
    # 단위)로 점을 흉내 냈고, x 0~180·y 0~4 그래프에서 세로로 긴 타원이 섰다(다른 모델은 점을 빼먹었다).
    for dot in items('points'):
        px,py=screen(dot.get('at'));r=num(dot.get('radius',3))
        if not 1<=r<=6:raise ValueError('점의 반지름은 1~6 픽셀이어야 합니다.')
        fill,stroke=('#fff',' stroke="#111" stroke-width="1.4"') if dot.get('open') else ('#111','')
        out.append(f'<circle cx="{px:.3f}" cy="{py:.3f}" r="{r:g}" fill="{fill}"{stroke}/>')
    labels=items('labels')
    if spec.get('axes',True):
        if ylo<=0<=yhi: labels=labels+[{'at':[xhi,0],'text':'x','dx':4,'dy':23}]
        if xlo<=0<=xhi: labels=labels+[{'at':[0,yhi],'text':'y','dx':-13,'dy':-8}]
    for label in labels:
        x,y=screen(label.get('at'));x+=num(label.get('dx',0));y+=num(label.get('dy',0));size=min(48,max(10,num(label.get('size',20))))
        text=label.get('text','')
        if not isinstance(text,str) or len(text)>100:raise ValueError('그래프 라벨은 100자 이하여야 합니다.')
        # 한글은 TeX 글꼴에 글리프가 없어 조판을 건너뛰고 원문 <text> 로 나간다 — `$x$(초)` 의 `$` 까지(2026-09-18 운영).
        if HANGUL.search(text):text=re.sub(r'\$([^$]*)\$',r'\1',text)
        anchor=label.get('anchor','middle')
        if anchor not in ('start','middle','end'):raise ValueError('라벨 정렬 값이 올바르지 않습니다.')
        out.append(txt(x,y,text,fs=size,anc=anchor))
    return ''.join(out)+'</svg>'
