"""Read-only parent safe packet -> owned byte-exact snapshot. No raw source pages/keys."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import hashlib,json,subprocess
ROOT=Path(__file__).resolve().parent
REPO=ROOT.parents[2]
PARENT=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
SOURCE=PARENT/'.qa-artifacts/exam-resume-20261008/next-five-extraction-r1/gyeongam'
def sha(b):return hashlib.sha256(b).hexdigest()
def put(p,x):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
assert not (ROOT/'evidence/source-final').exists(),'Do not overwrite a copied source.'
files=list((SOURCE/'packet').rglob('*'))
assert all(p.name in ['questions.json','index.html'] or p.parent.name=='images' and p.suffix=='.png' for p in files if p.is_file())
copied=[]
for src in files:
    if not src.is_file():continue
    rel=src.relative_to(SOURCE/'packet');data=src.read_bytes();dest=ROOT/'evidence/source-final'/rel
    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
    assert dest.read_bytes()==data==src.read_bytes(),'Source changed during copy.'
    copied.append(dict(path=str(dest.relative_to(ROOT)).replace('\\','/'),sha256=sha(data),bytes=len(data),parentPath=str(src),readScope='root final safe question-only packet'))
assert len(copied)==21
data=json.loads((ROOT/'evidence/source-final/questions.json').read_text(encoding='utf-8'))
assert data['examId']=='2025-gyeongam-3-2-mid' and len(data['questions'])==19 and data['originalCorrectChoiceAndSolutionWithheld']
# Project metadata only. Do not inspect manifest question/endnote/raw page collections.
raw=(SOURCE/'source-manifest.json').read_bytes();m=json.loads(raw.decode('utf-8'))
identity=m['identity']
meta={k:m.get(k) for k in ['version','createdAt','examId','inventoryExamId','school','nominalYear','grade','semester','round','sourceFiles','counts','entireExamPairCertification','rightsCertification','originalAnswersSolutionsExported']}
meta['identityMetadata']={k:identity.get(k) for k in ['status','yearConfirmed','originalScanYearObserved','decision','preparationFooterYearIsNotExamYear','scanComparisonStatus']}
meta['manifestSha256']=sha(raw);meta['readBoundary']='metadata projection only; no raw source pages, old draft, answers, solutions, or endnotes input'
put(ROOT/'evidence/source-manifest-metadata.json',meta)
old=json.loads((REPO/'.qa-artifacts/exam-resume-20261008/gyeonggu-authoring-r1/checks/preservation.json').read_text(encoding='utf-8'))
gye=subprocess.check_output(['git','ls-tree','-r','--name-only','-z','bf8b132fb1e78bbdb8f1b6e55e1db99d1321147d','--','.qa-artifacts/exam-resume-20261008/gyeonggu-authoring-r1','docs/planning/tracks/reports/gyeonggu-authoring-r1-20261008.md'],cwd=REPO).decode('utf-8').split('\0')
protected=sorted(set([r['path'] for r in old['files']]+[p for p in gye if p]))
assert len(protected)==322
rows=[]
for rel in protected:
    current=(REPO/rel).read_bytes();committed=subprocess.check_output(['git','show','bf8b132fb1e78bbdb8f1b6e55e1db99d1321147d:'+rel],cwd=REPO)
    # The new report's standard checkout may use CRLF; protect its actual starting bytes.
    assert current.replace(b'\r\n',b'\n')==committed.replace(b'\r\n',b'\n')
    rows.append(dict(path=rel,sha256=sha(current),gitBlobSha256=sha(committed),status='unchanged-at-task-start'))
put(ROOT/'evidence/preservation-baseline.json',dict(priorCommit='bf8b132fb1e78bbdb8f1b6e55e1db99d1321147d',sealedGyeongguFiles=247,priorFiles=75,protectedCount=len(rows),files=rows))
put(ROOT/'evidence/source-copy-receipt.json',dict(parentSourceCommit='4cc9278da',examId=data['examId'],sourceFinalSafePacket=True,sourceOnly=True,copyUnchanged=True,entries=copied,manifestProjectionOnly=True))
snap=[]
for rel in ['bank-read-fresh-r2-20261008.json','registry-read-20261008.json','curriculum-evidence.json']:
    src=PARENT/'.qa-artifacts/exam-resume-20261008'/rel
    # Curriculum evidence is stored under the project's established evidence directory.
    if not src.exists():src=REPO/'.qa-artifacts/exam-resume-20261008/gyeonggu-authoring-r1/evidence/reference-snapshots'/rel
    dest=ROOT/'evidence/reference-snapshots'/rel;b=src.read_bytes();dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(b)
    snap.append(dict(source=str(src),copyPath=str(dest.relative_to(ROOT)).replace('\\','/'),sha256=sha(b)))
put(ROOT/'evidence/reference-snapshots/receipt.json',snap)
print('Exact safe snapshot:21 files/19 source parents/20 leaves;322 previous files protected; no Gyeongsanyeo input.')
