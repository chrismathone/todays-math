from pathlib import Path
import json,re,hashlib,shutil,datetime
P=Path(__file__).resolve().parent;E=P/'own-execution-r1';E.mkdir(exist_ok=True);R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
roots=['src/components/unified/figure-editor/'+x for x in ['figureAssetGeometry.ts','figureSvgEditing.ts','figureRotate.ts','figureMirror.ts','figureEditElements.ts','figureBake.ts','figureSizeLock.ts']]+['src/lib/figure/assetCatalog.ts','src/lib/figure/mathjaxLabel.ts','src/components/unified/figure-editor/mathjaxLabel.ts'];todo=[R/x for x in roots];files=set();unresolved=[]
while todo:
 f=todo.pop().resolve()
 if f in files:continue
 files.add(f)
 if f.suffix not in ['.ts','.tsx','.js','.jsx','.mjs','.cjs']:continue
 text=f.read_text(encoding='utf-8-sig')
 for spec in re.findall(r'''(?:from\s*|import\s*\(\s*)["']([^"']+)["']''',text):
  if spec.startswith('@/'):base=R/'src'/spec[2:]
  elif spec.startswith('.'):base=f.parent/spec
  else:continue
  found=next((x for x in [base,Path(str(base)+'.ts'),Path(str(base)+'.tsx'),Path(str(base)+'.json'),Path(str(base)+'.js'),base/'index.ts',base/'index.tsx'] if x.is_file()),None)
  if found:todo.append(found)
  else:unresolved.append({'from':str(f),'specifier':spec})
files.update((R/'vendor/figure-engine').rglob('*.py'));files.update((R/'scripts/figure').glob('*.py'));files.update((R/'scripts/figure/assets').glob('*.svg'));files.update((R/'scripts/figure/assets').glob('*.json'));files.update([R/'tsconfig.json',R/'package.json',R/'src/lib/figure/asset-editor-geometry.json',R/'node_modules/jsdom/package.json',R/'node_modules/tsx/package.json'])
expected={str(f):sha(f) for f in sorted(files)};(E/'own-before.json').write_text(json.dumps(expected,indent=2),encoding='utf-8');cfg={'go':True,'root':str(R),'availablePhysicalMemoryBytes':0,'memoryMeasuredUTC':None,'expectedHashes':expected,'allowUnitTypeset':False,'authorization':'latest explicit user GO; parent frozen; native prep allowed, Node only after fresh memory floor'};(E/'own-go-freeze.json').write_text(json.dumps(cfg,indent=2),encoding='utf-8')
for name in ['own-pending-native.py','own-pending-dom.cjs','own-pending-units.cjs','own-cohort-inputs.json']:shutil.copyfile(P/name,E/name)
f=E/'own-pending-dom.cjs';s=f.read_text(encoding='utf-8-sig');s=s.replace("registry.assets[item.slug].sourceSHA256===hash(raw)","registry.sourceDigestKind==='sha256-utf8-lf'&&registry.assets[item.slug].sourceSHA256===hash(Buffer.from(raw.toString('utf8').replace(/\\r\\n/g,'\\n')))");f.write_text(s,encoding='utf-8')
(P/'own-execution-lineage.json').write_text(json.dumps({'preparedCommit':'f282a0e500690d81f56b715b04831b0e7a5db734','executionNamespace':'own-execution-r1','preparationPreserved':True,'newUserContract':'registry.sourceDigestKind sha256-utf8-lf; normalize CRLF before sourceSHA comparison','expectedBeforeRunChangedOnlyForNewExplicitContract':True,'unresolvedStaticImports':unresolved,'freezeHashFiles':len(expected),'NodeExecutedYet':False},indent=2),encoding='utf-8');(E/'own-write-probe.txt').write_text('GO 후 현재소스 실검수: 기존 준비본 보존\n',encoding='utf-8');assert '현재' in (E/'own-write-probe.txt').read_text(encoding='utf-8');print('freezeHashFiles='+str(len(expected)));print('unresolved='+str(unresolved))
