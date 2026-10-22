from pathlib import Path
import gzip,hashlib,json,shutil,subprocess,sys,uuid
out=Path(__file__).resolve().parent;root=out.parents[2]
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
digest=lambda raw:hashlib.sha256(raw).hexdigest()
m=read(out/'wip-manifest-r1.json');summary=read(out/'local-preservation-summary-r1.json')
raw=gzip.decompress((out/'ignored-files-manifest-r1.json.gz').read_bytes());assert digest(raw)==summary['manifestSHA256']
backup=json.loads(raw);assert len(backup['records'])==14185 and sum(r['bytes']for r in backup['records'])==3713577148
for r in m['files']:
    assert digest((root/r['stored']).read_bytes())==r['sha256']
    if r['baseLF_SHA256']is not None:assert digest((out/'baselines'/r['owner']/r['path']).read_bytes().replace(b'\r\n',b'\n'))==r['baseLF_SHA256']
checks=[]
for owner in ['parent','worker']:
    target=Path(m['vault'])/'restore-checks'/str(uuid.uuid4())/owner;target.mkdir(parents=True)
    subprocess.run(['git','init','--quiet',str(target)],check=True)
    for r in m['files']:
        if r['owner']==owner and r['baseLF_SHA256']is not None:
            p=target/r['path'];p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(out/'baselines'/owner/r['path'],p)
    command=[sys.executable,'-X','utf8','-B',str(out/'restore_wip.py'),'--owner',owner,'--target',str(target)]
    for args in [[],['--restore'],['--restore']]:
        result=subprocess.run(command+args,capture_output=True,text=True,encoding='utf-8');assert result.returncode==0,result.stderr;checks.append(json.loads(result.stdout))
    for r in m['files']:
        if r['owner']==owner:assert digest((target/r['path']).read_bytes())==r['sha256']
    r=next(r for r in m['files']if r['owner']==owner)
    (target/r['path']).write_bytes(b'coauthor change: do not overwrite\n')
    result=subprocess.run(command+['--restore'],capture_output=True)
    assert result.returncode!=0 and(target/r['path']).read_bytes()==b'coauthor change: do not overwrite\n'
current=read(root/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/editor-final-20261022-r1/final-validation-r1.json')
for r in current['code']:assert digest((root/r['path']).read_bytes())==r['sha256'],r['path']
ack=read(out/'source-ack-a32662c.json')
for r in ack['files']:assert digest((out/'source-ack-a32662c'/r['path']).read_bytes())==r['sha256']
r2=root/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m5-scatter-final-20261022-r2'
seal=read(r2/'capture-seal.json')
assert digest((r2/'student-inputs-sealed.json').read_bytes())==seal['studentSHA256']
assert digest((r2/'actual-current-private.json').read_bytes())==seal['privateSHA256']
assert len(list(r2.glob('actual-*.svg')))==144
result={'wipFilesVerified':len(m['files']),'restoreCheckAndRoundTripResults':checks,'coauthorPreimageMismatchRejectedForBothOwners':True,'ignoredEvidenceFiles':len(backup['records']),'ignoredEvidenceBytes':backup['bytes'],'verifiedEditorFilesUnchanged':len(current['code']),'M5StudentAndPrivateSealHashesMatch':True,'M5CapturedSVGFiles':144,'sourceAckCommit':ack['sourceCommit'],'newEngineTestsRun':0,'newQuestionApprovals':0,'dbWrites':0,'wholeEngineComplete':False,'handoffDocument':'docs/handoff/exam-engine-other-pc-20261022.md'}
(out/'verification-r1.json').write_bytes((json.dumps(result,indent=2)+'\n').encode());print(json.dumps(result))
