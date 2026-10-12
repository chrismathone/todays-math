"""Deterministic whole-scope validation; no sources/answers/DB/network calls."""
import collections, hashlib, json, pathlib, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT=pathlib.Path(__file__).resolve().parent
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def digest(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf-8')).hexdigest()
index=read(ROOT/'review-index.json');white=read(ROOT/'question-only-whitelist.json')
assert len(index['itemReports'])==67
counts=collections.Counter(x['schoolKey'] for x in index['itemReports']);assert counts=={'gyeongilyeo':22,'gyeseong':23,'nobyeon':22}
assert len(white['selected'])==white['selectedQuestionCount']==42
assert white['authoringReleasedCount']==0
assert collections.Counter(x['schoolKey'] for x in white['selected'])=={'gyeseong':21,'nobyeon':21}
assert len(white['excluded'])==25
all_reports=[]
for r in index['itemReports']:
    p=ROOT/r['path'];assert sha(p)==r['sha256'];d=read(p);all_reports.append(d)
    assert not any(d['gates'].values())
    assert d['componentComparison']['allAnchorChecksPass']
    assert len(d['curriculumCoreMethodProposal']['sevenStudentSurfaces'])==7
    assert d['metadataProposal']['familyKey'] is None
    assert d['curriculumCoreMethodProposal']['edition']=='2015'
    assert d['originalKeysUsed'] is False
    q=read(ROOT/'question-only-staged'/r['schoolKey']/f'q{r["questionNumber"]:02d}.json')
    assert digest(q)==d['bindings']['reviewQuestionOnlyDigest']
    assert 'answer' not in q and 'solution' not in q and not q['authoringRelease']
    assert len(q['choices'])==(5 if q['questionType']=='multiple-choice' else 0)
    assert q['score']['parentScore']==d['metadataProposal']['score']
    for source in d['bindings']['originalPrintedComparisons']:
        assert source['reviewerOnly'] and not source['answerSheetPageUsed']
        assert sha(ROOT/source['preview']['path'])==source['preview']['sha256']
for r in white['selected']:
    assert sha(ROOT/r['path'])==r['sha256']
    assert r['schoolKey']!='gyeongilyeo' and not r['authoringRelease'] and not r['directUseAllowed']
    assert r['answer'] is None and r['solution'] is None
assert {(d['schoolKey'],d['questionNumber']) for d in all_reports if d['curriculumCoreMethodProposal']['status']=='hard-exclude-proposed'}=={('gyeongilyeo',18),('gyeseong',2),('gyeseong',8),('nobyeon',3)}
ki20=next(d for d in all_reports if d['schoolKey']=='gyeongilyeo' and d['questionNumber']==20)
assert sum(x['score'] for x in ki20['componentComparison']['score']['parts'])==ki20['metadataProposal']['score']==7
ki17=next(d for d in all_reports if d['schoolKey']=='gyeongilyeo' and d['questionNumber']==17);assert ki17['metadataProposal']['unit'] is None
nb22=next(d for d in all_reports if d['schoolKey']=='nobyeon' and d['questionNumber']==22)
assert nb22['metadataProposal']['score']==11 and nb22['componentComparison']['providedScaffold']['perBlankScores'] is None
nb15=read(ROOT/'question-only-staged/nobyeon/q15.json');assert '[16~17]' not in nb15['choices'][4]
for n in [16,17]:assert read(ROOT/f'question-only-staged/nobyeon/q{n}.json')['sharedSourceContext']['contentDigest']==read(ROOT/'shared-context-review.json')['nobyeon16_17']['contentDigest']
for b in index['manifestBindings']:assert sha(pathlib.Path(b['path']))==b['sha256']
for s in ['gyeongilyeo','gyeseong','nobyeon']:
    d=read(ROOT/f'schools/{s}.json');assert d['scores']['printedParentScoreSumCalculated']==100
    assert d['scores']['completedParentScoreSumCalculated']==100
assert read(ROOT/'schools/gyeongilyeo.json')['scores']['priorRootReportedRawScoreSum']==96
print(json.dumps({'reports':67,'parentsUnique':len({(d['schoolKey'],d['questionNumber']) for d in all_reports}),'questionOnlyPlanningWhitelist':42,'hardExclusionProposals':4,'allBindingsValid':True,'gradeFamilyRightsNativeFullApprovals':0,'sourceCertifiedParents':0}))
