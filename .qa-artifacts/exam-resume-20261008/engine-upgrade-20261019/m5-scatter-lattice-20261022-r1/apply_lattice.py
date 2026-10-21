"""Change only nine future scatter producers; preserve type13 and shared samplers."""
from pathlib import Path
import hashlib,json,re
out=Path(__file__).resolve().parent
assert not (out/'apply-manifest-r1.json').exists(), 'Do not repeat an already recorded mutation'
p=Path('src/lib/middle/m3Stat2.ts');raw=p.read_bytes().decode('utf-8')
marker='  // ══ 상자그림과 산점도 06~10 (산점도)'
assert raw.count(marker)==1
prefix,tail=raw.split(marker,1)
matches=list(re.finditer(r'def\(\s*MINOR_BOX,\s*"(\d+)"',tail))
assert [m[1]for m in matches]==['06','07','08','09','10','11','12','13','14','15']
parts=[tail[:matches[0].start()]];changes=[]
for i,m in enumerate(matches):
    typ=m[1];block=tail[m.start():matches[i+1].start()if i+1<len(matches)else len(tail)]
    before=hashlib.sha256(block.encode()).hexdigest()
    if typ!='13':
        assert block.count('kind: "scatterPlot",')==1
        block=block.replace('distinctSorted(rng,','scatterSorted(rng,')
        for lo,hi in [(40,95),(30,95),(40,90)]:
            block=block.replace(f'intBetween(rng, {lo}, {hi})',f'scatterValue(rng, {lo}, {hi})')
        for minimum in [20,30]:block=block.replace(f'niceAxis({minimum}, 100)',f'scatterAxis({minimum})')
        block=re.sub(r'(\s*)kind: "scatterPlot",',lambda a:a[1]+'kind: "scatterPlot",'+a[1]+'gridStep: 5,',block)
        xname='국어'if typ in ['07','09']else'수학'
        yname='영어'if typ in ['07','10']else'수학'if typ=='09'else'과학'
        assert block.count('xLabel: "(점)"')==1 and block.count('yLabel: "(점)"')==1
        block=block.replace('xLabel: "(점)"',f'xLabel: "{xname}(점)"').replace('yLabel: "(점)"',f'yLabel: "{yname}(점)"')
        assert block.count('점수(x)')==1 and block.count('점수(y)')==1 and block.count('. (x, y):')==1
        block=block.replace('점수(x)','점수($x$)').replace('점수(y)','점수($y$)').replace('. (x, y):','. $(x, y)$:')
    parts.append(block);changes.append(dict(type=typ,beforeSHA256=before,afterSHA256=hashlib.sha256(block.encode()).hexdigest(),changed=typ!='13'))
p.write_bytes((prefix+marker+''.join(parts)).encode('utf-8'))
a=Path('src/lib/examStudy/adapters.ts');data=a.read_bytes().decode('utf-8')
entry='const LEGACY_FAMILY_VERSIONS: Readonly<Record<string, string>> = {'
assert data.count(entry)==1
lines='\n'.join(f'  "3-2|상자그림과 산점도|{t}": "20261022-scatter-five-point-grid-subject-axes-r1",'for t in ['06','07','08','09','10','11','12','14','15'])
a.write_bytes(data.replace(entry,entry+'\n'+lines,1).encode('utf-8'))
with(out/'apply-manifest-r1.json').open('x',encoding='utf-8')as f:json.dump(dict(typeBlocks=changes,onlyNineChanged=True,type13BytesPreserved=True,coordinateListsRetained=True,dbWrites=0),f,indent=2);f.write('\n')
stable=next(r for r in changes if r['type']=='13')
print(json.dumps(dict(changedTypes=[r['type']for r in changes if r['changed']],type13Unchanged=stable['beforeSHA256']==stable['afterSHA256'])))
