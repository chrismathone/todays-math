from pathlib import Path
import datetime,hashlib,json,subprocess
OUT=Path(__file__).resolve().parent
SOURCE=Path('D:/math-figure-editor')
commit=subprocess.check_output(['git','-C',str(SOURCE),'rev-parse','129207f'],text=True).strip()
original=json.loads((OUT/'source-snapshot-manifest-r1.json').read_text(encoding='utf-8'))
sha=lambda b:hashlib.sha256(b).hexdigest()
records=[]
for prior in original['files']:
    rel=prior['path']
    if rel in ['package.json','package-lock.json']:continue
    raw=subprocess.check_output(['git','-C',str(SOURCE),'show',commit+':'+rel])
    target=OUT/'source-final'/rel;target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes(raw)
    records.append({'path':rel,'commitSHA256':sha(raw),'bytes':len(raw),'workingCopyLFMatchesCommit':sha((SOURCE/rel).read_bytes().replace(b'\r\n',b'\n'))==sha(raw.replace(b'\r\n',b'\n'))})
fonts=[]
for target in sorted(Path('public/mathlive').rglob('*')):
    if not target.is_file():continue
    rel=target.as_posix();raw=subprocess.check_output(['git','-C',str(SOURCE),'show',commit+':'+rel])
    assert raw==target.read_bytes(),rel
    private=OUT/'independent-deps/node_modules/mathlive'/('LICENSE.txt' if target.name=='LICENSE.txt' else 'fonts/'+target.name)
    assert private.read_bytes()==raw,rel
    fonts.append({'path':rel,'sha256':sha(raw),'bytes':len(raw),'sourceCommitAndIntegrityCheckedPackageEqual':True})
assert len(fonts)==21
report={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceRepo':str(SOURCE),'sharedSourceCommit':commit,'followingAppOnlyMiddlewareCommit':'b4d6a19 (excluded)','sourceRepoWrites':0,'sourceFiles':records,'fontFiles':fonts,'installedJunctionMathLive':json.loads(Path('node_modules/mathlive/package.json').read_text(encoding='utf-8'))['version'],'declaredAndTestedPrivateMathLive':'0.111.1','finalPNGExportEventIncluded':True,'scopeExcludes':['root admin console','server storage','IP blocking','public recent work','source app autosave or close confirmation'],'sourceSourceLiteralEqualityNotWholeHostEquality':True}
(OUT/'source-final-manifest-r2.json').write_bytes((json.dumps(report,ensure_ascii=False,indent=2)+'\n').encode())
print(json.dumps({'sourceCommit':commit,'sharedFiles':len(records),'fontsAndLicense':len(fonts),'allWorkingSharedLFMatches':all(r['workingCopyLFMatchesCommit']for r in records)}))
