"""Read-only final review inputs; old blind bytes stay fixed after answer exposure."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys
from PIL import Image, ImageChops

sys.stdout.reconfigure(encoding='utf-8')
OUT=Path(__file__).resolve().parent
OWN=OUT.parents[2]
PARENT=OWN.parent/'exam-extraction-resume-20261008'
QA=Path('.qa-artifacts/exam-resume-20261008')
OLD=OWN/QA/'gyeonggu-independent-r1'
BASE=PARENT/QA
PACK=BASE/'gyeonggu-review-r1'
AUTH=BASE/'gyeonggu-authoring-r1'

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def save(name,data):
    p=OUT/name;assert p.resolve().is_relative_to(OUT)
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def ref(p,**kw):return {'path':Path(p).as_posix(),'sha256':sha(p),**kw}
def diffs(a,b,p=''):
    if isinstance(a,dict) and isinstance(b,dict):
        return sum([diffs(a.get(k),b.get(k),p+'/'+k) for k in sorted(set(a)|set(b))],[])
    if isinstance(a,list) and isinstance(b,list) and len(a)==len(b):
        return sum([diffs(l,r,p+'/'+str(i)) for i,(l,r) in enumerate(zip(a,b))],[])
    return [] if a==b else [{'pointer':p,'author':a,'package':b}]


def collect():
    prior=load(OLD/'preservation-baseline.json')
    baseline={x['path']:x for x in prior['prior2089']+prior['newQ07Evidence']}
    oldpaths=subprocess.check_output(['git','diff-tree','--no-commit-id','--name-only','-r','-z',
        'c02838323307f69648124f837285503a53e99bd3'],cwd=OWN).decode().split('\0')
    raw=[]
    for rel in [x for x in oldpaths if x]:
        blob=subprocess.check_output(['git','show','c02838323307f69648124f837285503a53e99bd3:'+rel],cwd=OWN)
        expected=hashlib.sha256(blob).hexdigest()
        assert sha(OWN/rel)==expected
        raw.append({'path':(OWN/rel).as_posix(),'sha256':expected,'kind':'immutable_blind_commit123'})
    assert len(raw)==123 and len(baseline)==2111
    save('preservation-baseline.json',{'old2111':list(baseline.values()),'rawBlind123':raw,
        'runtimeProbesAreNewAuthorizedFilesNotRawBlindEdits':True})
    for probe in ['runtime-probe-resume.json','runtime-probe-resume-r2.json']:
        p=OLD/probe
        if p.exists():save('evidence/'+probe,{'original':ref(p),'reread':load(p)})
    inputs_path=PACK/'verification/verification-inputs.json';inputs=load(inputs_path)
    manifest=load(PACK/'verification/verification-manifest.json')
    assert sha(inputs_path)==manifest['verificationInputsSha256']
    given_raw={x['n']:x for x in manifest['originalSolveFileHashes']}
    join_path=BASE/'gyeonggu-source-author-join-r1.json';join=load(join_path)
    source_path=PARENT/join['sourceFinal']['path'];source=load(source_path)
    assert sha(source_path)==join['sourceFinal']['sha256']
    assert source['originalCorrectChoiceAndSolutionWithheld'] is True
    source_by={x['number']:x for x in source['questions']}
    joined={x['questionNumber']:x for x in join['rows']}
    freezes=load(AUTH/'author-freeze.json');freeze_by={x['questionNumber']:x for x in freezes['frozen']}
    author_index=load(AUTH/'candidate-index.json')
    assert sha(AUTH/'candidate-index.json')==freezes['candidateIndexSha256']
    result=[];views=[];rules=set()
    for row in inputs:
        c=row['candidate'];n=c['questionNumber'];tag=f'q{n:02}'
        raw_path=OLD/f'blind/solve/{tag}.json';root_solve=PARENT/given_raw[n]['path']
        assert sha(raw_path)==sha(root_solve)==given_raw[n]['sha256']
        assert load(raw_path)==row['independentSolve']
        author_path=AUTH/f'candidates/{tag}/{tag}.json';author=load(author_path)
        change=diffs(author,c)
        assert all(x['pointer'].startswith('/figureArtifacts/') and x['pointer'].rsplit('/',1)[-1] in ['specPath','svgPath'] for x in change)
        assert sha(author_path)==joined[n]['authorCandidate']['sha256']
        assert freeze_by[n]['studentDigest']==row['studentDigest']==joined[n]['studentDigest']
        assert freeze_by[n]['assetDigest']==row['assetDigest']==joined[n]['assetDigest']
        assert freeze_by[n]['candidateDigest']==joined[n]['candidateDigest']
        figs=[]
        for i,a in enumerate(row['assets'],1):
            spec=Path(a['sourceSpecPath']);svg=Path(a['sourceSvgPath'])
            assert sha(spec)==a['specSha256'] and sha(svg)==a['svgSha256']
            assert sha(OLD/'blind'/a['studentPath'])==a['svgSha256']
            figs.append({'role':a['role'],'spec':ref(spec),'svg':ref(svg),'intendedWidthMm':a['intendedWidthMm'],
                         'specContent':load(spec),'sameAsPreExposureStudentSvg':True})
        for suffix in ['student','author']:
            p=AUTH/f'qa/{tag}-{suffix}.png'
            image=Image.open(p).convert('RGB');views.append({**ref(p),'questionNumber':n,'role':suffix,'pixels':list(image.size),
                'viewed':False,'html':ref(AUTH/f'qa/{tag}-author.html')})
        student_img=Image.open(AUTH/f'qa/{tag}-student.png').convert('RGB')
        author_img=Image.open(AUTH/f'qa/{tag}-author.png').convert('RGB')
        assert student_img.width==author_img.width
        h=student_img.height
        # Full student pane is present at the top of the author solution layout.
        same=ImageChops.difference(student_img,author_img.crop((0,0,student_img.width,h))).getbbox() is None
        result.append({'questionNumber':n,'providedDigests':{k:row[k] for k in ['studentDigest','candidateDigest','assetDigest','solveDigest']},
            'rawBlindFile':ref(raw_path),'rootCanonicalRawCopy':ref(root_solve),
            'authorFrozenFile':ref(author_path),'authorFreezeEntry':freeze_by[n],
            'candidatePackageOnlyPathChanges':change,'candidateContentSolutionMetadataUnchangedByPackaging':True,
            'finalSourceQuestionOnly':source_by[n],
            'finalSourceJoinRow':joined[n],
            'newScore':c['score'],'sourceOriginalScore':source_by[n]['scoreEvidence']['originalPrintedParentScore'],
            'authorAssignment':c['metadata']['assignment'],'difficultyProposal':c['metadata']['difficultyProposal'],
            'figures':figs,'studentPaneExactlyEqualsPrefixOfAuthorLayout':same,
            'originalAnswerOrSolutionUsed':False})
        for x in c['metadata']['assignment']['evidence']['comparedRegistryEntries']:rules.add(x['key'])
    assert len(result)==22
    save('input-bindings.json',{'verificationInputs':ref(inputs_path),'verificationManifest':ref(PACK/'verification/verification-manifest.json'),
        'verifyBrief':ref(PACK/'verification/VERIFY-BRIEF.md'),
        'finalSourcePacketQuestionOnly':ref(source_path),'sourceJoin':ref(join_path),
        'authorFreeze':ref(AUTH/'author-freeze.json'),'authorIndex':ref(AUTH/'candidate-index.json'),
        'oldRawCommit':'c02838323307f69648124f837285503a53e99bd3',
        'answerExposureAuthorizedOnlyAfterRawCommit':True,'bindings':result,
        'sourceManifestLargePayloadNotUsedAsAnswerOracle':True})
    save('layout-view-manifest.json',views)
    bank_path=BASE/'bank-read-fresh-r2-20261008.json';registry_path=BASE/'registry-read-20261008.json'
    bank=load(bank_path);registry=load(registry_path)
    assert len(bank['liveFamilies'])==302
    selected=[]
    for key in sorted(rules):
        ri=next(i for i,x in enumerate(registry['entries']) if x['key']==key)
        family='mid:'+key
        matches=[{'pointer':f'/liveFamilies/{i}','record':x} for i,x in enumerate(bank['liveFamilies']) if x['family_key']==family]
        selected.append({'registryPointer':f'/entries/{ri}','registry':registry['entries'][ri],'liveMatches':matches})
    save('unit-family-snapshot.json',{'bank':ref(bank_path),'registry':ref(registry_path),
        'capturedAt':bank['capturedAt'],'liveFamilyRecords':302,'registryEntries':299,
        'units':bank['units'],'comparedFamilies':selected,'dbReadByReviewer':False,'currentDatabaseAssertion':False})
    print('Collected22 verified frozen input bindings,44 student/author views,302r2 metadata; blind bytes fixed')
    print('Student pane prefix identical:',[x['questionNumber'] for x in result if x['studentPaneExactlyEqualsPrefixOfAuthorLayout']],
          'differences:',[x['questionNumber'] for x in result if not x['studentPaneExactlyEqualsPrefixOfAuthorLayout']])


if __name__=='__main__':collect()
