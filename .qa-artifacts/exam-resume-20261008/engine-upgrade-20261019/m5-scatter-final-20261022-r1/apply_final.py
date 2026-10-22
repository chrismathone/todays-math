"""Remove authored coordinate-list interpolations, not runtime text by regex."""
from pathlib import Path
import hashlib,json
out=Path(__file__).resolve().parent
assert not(out/'apply-manifest-r1.json').exists()
p=Path('src/lib/middle/m3Stat2.ts');raw=p.read_bytes().decode('utf-8')
xs=' $(x, y)$: ${pointsList(xs.map((x, i) => [x, ys[i]!] as const))}'
pts=' $(x, y)$: ${pointsList(pts)}'
assert raw.count(xs)==6 and raw.count(pts)==3
raw=raw.replace(xs,'').replace(pts,'')
assert 'pointsList'not in raw
p.write_bytes(raw.encode('utf-8'))
a=Path('src/lib/examStudy/adapters.ts');text=a.read_bytes().decode('utf-8')
old='20261022-scatter-five-point-grid-subject-axes-r1';new='20261022-scatter-grid-reading-without-coordinate-lists-r2'
assert text.count(old)==9
a.write_bytes(text.replace(old,new).encode('utf-8'))
previous=json.loads((out.parent/'m5-scatter-lattice-20261022-r1/capture-seal.json').read_text(encoding='utf-8'))
with(out/'apply-manifest-r1.json').open('x',encoding='utf-8')as f:
    json.dump(dict(previousValidatedCommit='5b3ae1c5c58f7c67517c450edd6dee9b2e23065e',previousValidatedSourceSHA256=previous['sourceSHA256'],removedInterpolations=9,runtimeRegexTextStripping=False,answerDataOrFigureChanges=False,solutionConnectiveChanges=['12','15'],adapterVersion=new,dbWrites=0),f,indent=2);f.write('\n')
print(json.dumps(dict(removedInterpolations=9,adapterVersionsUpdated=9)))
