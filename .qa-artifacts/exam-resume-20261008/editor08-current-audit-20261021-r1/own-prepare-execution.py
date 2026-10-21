from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent;E=P/'own-execution-r1';E.mkdir(exist_ok=False)
sha=lambda b:hashlib.sha256(b).hexdigest()
old=json.loads((P/'own-preparation-hashes.json').read_text(encoding='utf8'));before={f:sha(Path(f).read_bytes())for f in old}
(E/'own-before.json').write_text(json.dumps(before,indent=2),encoding='utf8')
(E/'own-fixtures.json').write_bytes((P/'own-fixtures.json').read_bytes())
s=(P/'own-pending-dom.cjs').read_text(encoding='utf8')
s=s.replace("const base=edit.prepareFigureSvg(fixtures.baseSVG)","const base=edit.numberFigureObjects(edit.prepareFigureSvg(fixtures.baseSVG))")
s=s.replace("op:'addAngle',at:[0,0],from:[100,0],to:[-50,100]","op:'addAngle',at:{x:0,y:0},from:{x:100,y:0},to:{x:-50,y:100}")
extra="""
 await test('partial-ungroup-preserves-other-member',()=>{const d=parse(base),a=d.querySelector('#math').getAttribute('data-object-id'),b=d.querySelector('#value').getAttribute('data-object-id');let s=edit.pushFigureGroup(base,[a,b],'A');s=edit.pushFigureGroup(s,[a,b],'B');s=edit.popFigureGroup(s,[a]);const n=parse(s);assert.equal(n.querySelector('#math').getAttribute('data-group'),'A');assert.equal(n.querySelector('#value').getAttribute('data-group'),'B');assert.deepEqual(ordinary(s),oldMath);});
 await test('depth64-shortnames-reject65',()=>{const id=parse(base).querySelector('#math').getAttribute('data-object-id');let s=base;for(let i=0;i<64;i++)s=edit.pushFigureGroup(s,[id],'G'+i);assert.equal(edit.readGroupStack(parse(s).querySelector('#math').getAttribute('data-group-stack')).length,64);assert.throws(()=>edit.pushFigureGroup(s,[id],'overflow'));for(let i=0;i<64;i++)s=edit.popFigureGroup(s,[id]);assert.equal(parse(s).querySelector('#math').getAttribute('data-group'),null);assert.deepEqual(ordinary(s),oldMath);});
 await test('current-insert-numbered-commit-resume',()=>{const out=edit.addFigureAsset(base,asset,body,'own-resume');const committed=edit.numberFigureObjects(out.svg);const numbers=[...edit.figureNumbers(committed).values()];const resumed=edit.numberFigureObjects(edit.prepareFigureSvg(committed));assert.deepEqual([...edit.figureNumbers(resumed).values()],numbers);assert.deepEqual(ordinary(resumed),oldMath);assert(geo.isFigureAssetLayer(parse(resumed).querySelector('[data-asset]')));return {objectNumbers:numbers,IDsMayReassignOnPrepare:true};});
 await test('asset-size-lock-blocks-rotation-mirror',()=>{const out=edit.addFigureAsset(base,asset,body,'own-locked'),s=edit.editFigureObject(edit.numberFigureObjects(out.svg),out.id,{'data-size-locked':'true'}),rot=rq(dir+'figureRotate.ts'),mir=rq(dir+'figureMirror.ts');assert.equal(rot.rotateFigureSelection(s,[out.id],'cw'),s);assert.equal(mir.mirrorFigureSelection(s,[out.id],'vertical'),s);assert.deepEqual(ordinary(s),oldMath);});
 for(const name of fixtures.badGroups)await test('reject-group-name:'+name.slice(0,20),()=>assert.throws(()=>edit.pushFigureGroup(base,[parse(base).querySelector('#math').getAttribute('data-object-id')],name)));
"""
s=s.replace(" for(const[f,h]of Object.entries(cfg.sourceHashes))assert.equal(hash(fs.readFileSync(f)),h);",extra+"\n for(const[f,h]of Object.entries(cfg.sourceHashes))assert.equal(hash(fs.readFileSync(f)),h);")
s=s.replace("fs.writeFileSync(path.join(P,'own-runtime-results.json')", "const imported={};for(const f of Object.keys(require.cache)){if(f.replaceAll('\\\\','/').startsWith(R+'/src/')){const expected=Object.keys(cfg.sourceHashes).find(p=>path.resolve(p)===path.resolve(f));assert(expected,'unbound Root source '+f);imported[f]=hash(fs.readFileSync(f));assert.equal(imported[f],cfg.sourceHashes[expected]);}};fs.writeFileSync(path.join(P,'own-runtime-results.json')")
s=s.replace("{NodeEnded:true,unique:results.length", "{NodeEnded:true,heapLimitBytes:require('node:v8').getHeapStatistics().heap_size_limit,actualRootImported:imported,unique:results.length")
(E/'own-runner.cjs').write_text(s,encoding='utf8')
(E/'own-delta.json').write_text(json.dumps({'RootChanges':{f:{'prepared':old[f],'now':h}for f,h in before.items()if old[f]!=h},'fixtureContractAdaptationBeforeFirstRun':['Use actual PointRef{x,y}, not own unexecuted array representation','Use numberFigureObjects actual commit path; prepare may reassign transient IDs on reimport, never require ID equality across reimport','Added partial/depth/lock/resume/name controls; long128-character stack expectation remains preserve-or-reject, no relaxation'],'preparedArtifactsUnchanged':True},indent=2),encoding='utf8')
(E/'own-probe.txt').write_text('UTF8 actual execution namespace · 준비 보존\n',encoding='utf8')
print(json.dumps({'executionPrepared':True,'sourceDelta':sum(old[f]!=h for f,h in before.items())}))
