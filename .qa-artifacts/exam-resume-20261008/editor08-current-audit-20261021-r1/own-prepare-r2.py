from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent;A=P/'own-execution-r1';E=P/'own-execution-r2';E.mkdir(exist_ok=False)
sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(n,v):(E/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
old=json.loads((A/'own-before.json').read_text(encoding='utf8'));before={p:sha(Path(p).read_bytes())for p in old};dump('own-prepared-before.json',before)
(E/'own-fixtures.json').write_bytes((A/'own-fixtures.json').read_bytes())
invalid=[{'id':'malformed-json','value':'['},{'id':'object','value':'{}'},{'id':'literal-null','value':'null'},{'id':'65-depth','value':json.dumps(['A']*65,separators=(',',':'))},{'id':'129-name','value':json.dumps(['A'*129])},{'id':'non-string','value':'[1]'},{'id':'unsafe-name','value':'["<script>"]'},{'id':'over8192','value':' '*8193},{'id':'whitespace-only','value':'   '},{'id':'empty-existing-attribute','value':''}]
dump('own-new-invalid-fixtures.json',invalid)
s=(A/'own-runner.cjs').read_text(encoding='utf8')
extra="""
 const invalidStack=JSON.parse(fs.readFileSync(path.join(P,'own-new-invalid-fixtures.json'),'utf8'));
 for(const bad of invalidStack)for(const op of ['push','pop'])await test('invalid-existing:'+bad.id+':'+op,()=>{
  const d=parse(base),n=d.querySelector('#math'),id=n.getAttribute('data-object-id');n.setAttribute('data-group','CURRENT');n.setAttribute('data-group-stack',bad.value);const original=new XMLSerializer().serializeToString(d.documentElement),cachedBefore=new XMLSerializer().serializeToString(edit.readFigureSvg(original)),numberBefore=[...edit.figureNumbers(original)],coordsBefore=ordinary(original);
  assert.throws(()=>op==='push'?edit.pushFigureGroup(original,[id],'NEXT'):edit.popFigureGroup(original,[id]));
  assert.equal(new XMLSerializer().serializeToString(edit.readFigureSvg(original)),cachedBefore);assert.deepEqual(ordinary(original),coordsBefore);assert.deepEqual([...edit.figureNumbers(original)],numberBefore);return {originalSVG_SHA:hash(original),unchangedAfterRejection:true};
 });
 await test('exact-r1-8128-to8259-reject-preserves-original',()=>{const id=parse(base).querySelector('#math').getAttribute('data-object-id'),d=parse(base),n=d.querySelector('#math'),name=i=>String(i).padStart(3,'0')+'G'.repeat(125),stack=[null,...Array.from({length:62},(_,i)=>name(i))],raw=JSON.stringify(stack);assert.equal(raw.length,8128);n.setAttribute('data-group-stack',raw);n.setAttribute('data-group',name(62));const original=new XMLSerializer().serializeToString(d.documentElement),cachedBefore=new XMLSerializer().serializeToString(edit.readFigureSvg(original)),numbers=[...edit.figureNumbers(original)],geometry=ordinary(original);assert.equal(JSON.stringify([...stack,name(62)]).length,8259);assert.throws(()=>edit.pushFigureGroup(original,[id],name(63)));assert.equal(new XMLSerializer().serializeToString(edit.readFigureSvg(original)),cachedBefore);assert.deepEqual([...edit.figureNumbers(original)],numbers);assert.deepEqual(ordinary(original),geometry);return {before:8128,proposed:8259,originalSVG_SHA:hash(original)};});
 await test('absent-stack-still-valid-push-pop',()=>{const id=parse(base).querySelector('#math').getAttribute('data-object-id'),out=edit.popFigureGroup(edit.pushFigureGroup(base,[id],'A'),[id]);assert.deepEqual(ordinary(out),oldMath);assert.equal(parse(out).querySelector('#math').getAttribute('data-group-stack'),null);});
"""
needle=" for(const[f,h]of Object.entries(cfg.sourceHashes))assert.equal(hash(fs.readFileSync(f)),h);"
assert s.count(needle)==1
s=s.replace(needle,extra+'\n'+needle)
(E/'own-runner.cjs').write_text(s,encoding='utf8')
dump('own-lineage.json',{'r1RunnerSHA256':sha((A/'own-runner.cjs').read_bytes()),'r1RawResultsSHA256':sha((A/'own-runtime-results.json').read_bytes()),'r1ReportSHA256':sha((A/'own-report.json').read_bytes()),'same114OriginalControlsAndExpectations':True,'sameOriginalFixtureSHA256':sha((E/'own-fixtures.json').read_bytes()),'newControlsPrepared':22,'expectedTotalIfReached':136,'RootDelta':{f:{'r1':old[f],'r2':h}for f,h in before.items()if old[f]!=h},'execution':False})
(E/'own-probe.txt').write_text('UTF8 R2 준비 · R1 실패 보존/Node 미실행\n',encoding='utf8');assert '보존' in (E/'own-probe.txt').read_text(encoding='utf8')
after={p:sha(Path(p).read_bytes())for p in before};assert after==before;dump('own-prepared-after.json',after)
dump('own-preparation-report.json',{'status':'prepared only, no Node/browser; separate explicit GO required','old114ExpectationsKept':True,'newControlsPrepared':22,'sourceDeltaFiles':sum(old[p]!=h for p,h in before.items()),'rejectionChecks':'Both mutators reject malformed/oversize/invalid existing stack; original SVG cachedDOM/coords/numbers unchanged after throw. Exact8128->8259 reproduction remains explicit. Absent stack remains valid.','potentialResidualBoundary':'parseGroupStack if(!value) returns[] for both absent and empty attribute. Prepared empty-existing-attribute rejection controls intentionally expose whether empty unparseable existing metadata is still silently accepted. This is source observation, not runtime finding; do not relax expectations after run.','go':False,'Node':0,'browser':0,'DB':0,'API':0,'RootOrSourceDWrites':0,'limits':'No current repair runtime pass claimed. R1 one failure unchanged, no new question/grade/rights/native approval.'})
print(json.dumps({'prepared':True,'newControls':22,'Node':0,'rootDelta':sum(old[p]!=h for p,h in before.items()),'reportSHA256':sha((E/'own-preparation-report.json').read_bytes())}))
