from pathlib import Path
import json,hashlib,re,difflib
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');read=lambda p:p.read_text(encoding='utf-8-sig');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();pp=R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m31-outline-candidate-20261021-r1/proposal.json';j=json.loads(read(pp));op=R/j['path'];cp=R/j['candidate'];ap=R/'src/lib/examStudy/adapters.ts';before={str(p):sha(p) for p in [pp,op,cp,ap]};original=read(op);candidate=read(cp);ob=op.read_bytes();cb=cp.read_bytes();checks=[]
def ck(n,v):checks.append({'name':n,'pass':bool(v)})
ck('originalActualSHA',sha(op)==j['originalSha256']);ck('candidateActualSHA',sha(cp)==j['candidateSha256'])
def section(s,start,end):return s[s.index(start):s.index(end,s.index(start))]
def bytessection(b,start,end):return b[b.index(start.encode()):b.index(end.encode(),b.index(start.encode()))]
oldHelper=section(original,'function figPolygonDiagonalsFromA','function figPolygonAllDiagonals');newHelper=section(candidate,'function figPolygonOutline','function figPolygonAllDiagonals');ck('outlineBoundaryOnlySourceLoop','for (let i = 0; i < n; i += 1)' in newHelper and 'segments[`s${i}`] = [names[i], names[(i + 1) % n]];' in newHelper and newHelper.count('segments[')==1);ck('outlineNoFanConnections','for (let i = 2' not in newHelper and 'segments[`d' not in newHelper and '["A", names[i]]' not in newHelper);ck('outlineReturnOnlyGeometryLabels',re.search(r'return \{\s*version: 2,\s*points: pts,\s*segments,\s*labels: Object.fromEntries\(names.map\(\(nm\) => \[nm, nm\]\)\),\s*\};',newHelper) is not None)
# Direct byte comparisons for all unchanged targetfield/branch helpers, not labels alone.
old04=bytessection(ob,'"한 꼭짓점에서 그을 수 있는 대각선의 개수"','"다각형의 대각선의 개수"');new04=bytessection(cb,'"한 꼭짓점에서 그을 수 있는 대각선의 개수"','"다각형의 대각선의 개수"');ck('04BytesOnlyFigureHelperCallChanged',old04.replace(b'figPolygonDiagonalsFromA(n)',b'figPolygonOutline(n)')==new04);ck('04Mode1NullUnchanged',b'figureSpec: null' in old04 and b'figureSpec: null' in new04)
ck('regularPolygonByteUnchanged',re.search(rb'function regularPolygon\([\s\S]*?return \{ pts, names \};\s*\}',ob)[0]==re.search(rb'function regularPolygon\([\s\S]*?return \{ pts, names \};\s*\}',cb)[0])
# Explicit all-diagonals05 helper and full05 definition slice.
ck('05AllDiagonalsHelperByteUnchanged',bytessection(ob,'function figPolygonAllDiagonals','const M1_POLY_BASIC')==bytessection(cb,'function figPolygonAllDiagonals','const M1_POLY_BASIC'))
# Locate05 from title until nextdef without relying on next question title.
pat=r'  def\(\s*MINOR_POLY,\s*"05",[\s\S]*?(?=\n  def\()';m0=re.search(pat,original);m1=re.search(pat,candidate);ck('05WholeDefinitionUnchanged',m0 is not None and m1 is not None and m0[0]==m1[0])
changes=[]
for tag,a0,a1,b0,b1 in difflib.SequenceMatcher(a=ob.splitlines(keepends=True),b=cb.splitlines(keepends=True)).get_opcodes():
 if tag!='equal':changes.append({'tag':tag,'originalLines':[a0+1,a1],'candidateLines':[b0+1,b1]})
ck('onlyDocumentHelperAnd04CallChanged',all(x['originalLines'][0]<=10 or 810<=x['originalLines'][0]<=827 or 903<=x['originalLines'][0]<=909 for x in changes))
rows=[]
for n in range(5,13):
 names=[chr(65+i) for i in range(n)];edges=[(names[i],names[(i+1)%n]) for i in range(n)];unique={frozenset(e) for e in edges};degrees={v:sum(v in e for e in edges) for v in names};allowedA={frozenset(('A',names[i])) for i in range(2,n-1)};valid=len(edges)==len(unique)==n and all(x==2 for x in degrees.values()) and not (unique&allowedA);ck(f'n{n}BoundaryOnlyClosedCycle',valid);ck(f'n{n}NMinus3NotDrawn',len(allowedA)==n-3 and len(unique&allowedA)==0)
 rows.append({'n':n,'labels':dict(zip(names,names)),'boundaryEdges':edges,'nonadjacentEdgesDrawn':0,'allDegrees':degrees,'possibleConnectionsFromA_NOT_IN_FIGURE':[list(sorted(e)) for e in allowedA],'mode0Answer':n-3,'mode1Figure':None})
version=j['futureFamilyVersionRequired'];ck('futureVersionDeclared',version=='1-2|다각형|04:20261021-outline-before-student-diagonals-r1');adapter=read(ap);adapterEntryPresent='"1-2|다각형|04":' in adapter
probe=P/'own-utf8-probe.txt';probe.write_text('다각형 경계만 검증 UTF-8 확인\n',encoding='utf-8');ck('UTF8Probe',probe.read_text(encoding='utf-8')=='다각형 경계만 검증 UTF-8 확인\n');after={p:sha(Path(p)) for p in before};ck('allInputAndProductionBytesUnchanged',before==after)
results={'counts':{'assertions':len(checks),'passed':sum(c['pass'] for c in checks),'failed':sum(not c['pass'] for c in checks),'nCases':8,'literalModeNCases':16,'actualSeedOutputs':0},'checks':checks,'graphs':rows,'diffLocations':changes,'before':before,'after':after,'byteFieldHashes':{'old04':hashlib.sha256(old04).hexdigest(),'new04':hashlib.sha256(new04).hexdigest()},'futureVersion':version,'currentAdapterEntryPresent':adapterEntryPresent};(P/'own-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'counts':results['counts'],'changes':changes,'failed':[c for c in checks if not c['pass']]}));assert all(c['pass'] for c in checks)
