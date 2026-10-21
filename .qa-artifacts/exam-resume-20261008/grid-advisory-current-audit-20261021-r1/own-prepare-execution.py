from pathlib import Path
from fractions import Fraction as F
import hashlib,json,shutil
P=Path(__file__).resolve().parent;E=P/'own-execution-r1';E.mkdir(exist_ok=False)
sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(n,v):(E/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
old=json.loads((P/'own-preparation-before.json').read_text(encoding='utf8'))
before={p:sha(Path(p).read_bytes()) for p in old};dump('own-before.json',before)
delta={p:{'preparedSHA':h,'currentSHA':before[p]} for p,h in old.items() if h!=before[p]}
dump('own-delta.json',{'changed':delta,'contract':'New inset48/side804; minimum3 cells; exact analysis coordinateSpace. Previous pending observations were NOT executed and are now rejection assertions. No runtime expectation changed after execution.'})
fixtures=json.loads((P/'own-fixtures.json').read_text(encoding='utf8'))
for c in fixtures['containCoordinates']:
 nw,nh=c['natural'];w,h=c['analysis'];fit=min(F(804,nw),F(804,nh));left=48+(804-nw*fit)/2;top=48+(804-nh*fit)/2
 c.update(left=str(left),top=str(top),fit=str(fit),sx=str(F(nw,w)*fit),sy=str(F(nh,h)*fit),panelBottomRight=[str(left+nw*fit),str(top+nh*fit)])
dump('own-fixtures.json',fixtures)
s=(P/'own-pending-runner.cjs').read_text(encoding='utf8').replace('own-preparation-before.json','own-before.json')
s=s.replace("rootRequire('tsx/cjs');", "assert(require('node:v8').getHeapStatistics().heap_size_limit<=256*1024**2);rootRequire('tsx/cjs');")
s=s.replace("return {observed:overlay(g,200,100),untrustedPublicRoute:false};", "const observed=overlay(g,200,100);assert.equal(observed,null);return {observed,currentGuardRejected:true,untrustedPublicRoute:false};")
s=s.replace("const out={modulePath", "const imported=Object.keys(require.cache).filter(f=>f.replaceAll('\\\\','/').includes('/src/lib/figure/gridMeasure.ts'));assert(imported.length===1);assert.equal(path.resolve(imported[0]),path.resolve(modulePath));const out={NodeEnded:true,heapLimitBytes:require('node:v8').getHeapStatistics().heap_size_limit,imported,moduleSHA256:hash(fs.readFileSync(modulePath)),inputSHA256:hash(fs.readFileSync(path.join(P,'own-fixtures.json'))),modulePath")
(E/'own-runner.cjs').write_text(s,encoding='utf8')
(E/'own-probe.txt').write_text('UTF8 · 実行 준비 모눈 advisory\n',encoding='utf8');assert '모눈' in (E/'own-probe.txt').read_text(encoding='utf8')
dump('own-prepared-input-hashes.json',{f.name:sha(f.read_bytes()) for f in E.iterdir() if f.is_file()})
print(json.dumps({'executionNamespace':str(E),'changedFiles':len(delta)}))
