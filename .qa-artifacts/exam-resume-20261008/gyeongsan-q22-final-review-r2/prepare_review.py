"""Owned post-exposure receipts, official clauses and bounded taxonomy evidence."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,re,struct,zlib,subprocess
import fitz,olefile
OUT=Path(__file__).resolve().parent;OWN=OUT.parents[2];ROOT=OWN.parent/'exam-extraction-resume-20261008'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p):return json.loads(Path(p).read_text('utf8'))
def canon(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def digest(v):return hashlib.sha256(canon(v).encode('utf8')).hexdigest()
def save(name,v):
 p=OUT/name;assert p.resolve().is_relative_to(OUT);assert not p.exists(),name
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
exposure=load(OUT/'exposure-input-hashes.json');binding=load(OUT/'inputs/binding-receipt.json')
for r in exposure['files']:assert sha(OUT/r['path'])==r['sha256']
raw=OWN/'.qa-artifacts/exam-resume-20261008/gyeongsan-q22-review-r2/solve/q22.json'
assert raw.read_bytes()==(OUT/'inputs/blind/solve/q22.json').read_bytes()
assert subprocess.check_output(['git','show',exposure['rawCommit']+':'+raw.relative_to(OWN).as_posix()],cwd=OWN)==raw.read_bytes()
candidate=load(OUT/'inputs/package/private/q22/candidate.json');student=load(OUT/'inputs/blind/student-problems.json')[0]
spec=OUT/'inputs/package/private/q22/figure-1.spec.json';svg=OUT/'inputs/package/private/q22/figure-1.svg'
asset=[{'role':'stem','specSha256':sha(spec),'svgSha256':sha(svg),'intendedWidthMm':70}]
assert digest(asset)==binding['assetDigest'];assert digest({'candidate':candidate,'assetBindings':asset})==binding['candidateDigest']
assert digest({k:v for k,v in student.items() if k!='studentDigest'})==binding['studentDigest']==student['studentDigest']
assert digest(load(raw))==binding['solveDigest'];assert sha(raw)==binding['rawSolveSha256'];assert sha(OUT/'inputs/package/private/q22/candidate.json')==binding['candidateFileSha256']
source=load(OUT/'inputs/source-question-only.json');assert digest(source)==binding['sourceQuestionCanonicalDigest']
verify=load(OUT/'inputs/review/verification-inputs.json')[0];assert verify['candidate']==candidate and verify['independentSolve']==load(raw)
save('binding-validation.json',{'utc':datetime.now(timezone.utc).isoformat(),'exposureManifestSha256':sha(OUT/'exposure-input-hashes.json'),
 'suppliedFileHashesMatched':17,'candidateDigest':binding['candidateDigest'],'studentDigest':binding['studentDigest'],
 'assetDigest':binding['assetDigest'],'solveDigest':binding['solveDigest'],'candidateFileSha256':binding['candidateFileSha256'],
 'rawSolveFileSha256':sha(raw),'rawGitBlobUneditedBeforeAndAfterExposure':True,'sourceQuestionCanonicalDigest':digest(source),
 'sourceProvidedContentDigestPreserved':source['sourceContentDigest'],'sourcePacketSHAAsProvided':binding['sourcePacketSha256'],
 'firstAuthorExposureWasAfterRawCommit':'Recorded tool read after all17 hashes and copied raw Git blob passed on2026-10-12',
 'sourceContextPrePackageCandidateSHAExplained':'source-context references original authoredInput SHA740279...; package manifest maps it to current private candidate SHA5a4259...; current digests computed directly, no frozen rewrite.',
 'digestAsMathOrGradeApproval':False})
protected={}
for baseline in [OWN/'.qa-artifacts/exam-resume-20261008/gyeongsang-remaining-authoring-r1/preservation-baseline.json',OWN/'.qa-artifacts/exam-resume-20261008/gyeongsan-q22-review-r2/preservation-baseline.json']:
 for r in load(baseline)['ownPriorFiles']:
  assert sha(r['path'])==r['sha256'];protected[r['path']]=r['sha256']
for p in (OWN/'.qa-artifacts/exam-resume-20261008').rglob('*'):
 if p.is_file() and not p.is_relative_to(OUT) and '__pycache__' not in p.parts and 'no-hooks' not in p.parts:
  protected[p.as_posix()]=sha(p)
save('preservation-baseline.json',{'files':[{'path':p,'sha256':h} for p,h in sorted(protected.items())],
 'protectedInputFiles':exposure['files'],'protectedOriginalRawCommit':exposure['rawCommit'],
 'requiredPriorGitCommits':['c02838323307f69648124f837285503a53e99bd3','9b4828c3ff843b16947b0d6925e408f0aaa7f6e7','f6f59325cd636859e28d47972395dbeec3b03868','383a5f7634ce3dc8979afd35cc9e058dc0d4c4fa','940c2407345e5c3e0c6c0f42a552c638e7ffe587'],
 'oldRawCodeProofSolutionsNotEdited':True,'rootOtherWorkersNDBSharedDependenciesNotWritten':True})
basis=load(OWN/'.qa-artifacts/exam-resume-20261008/gyeongsang-remaining-authoring-r1/curriculum-author-basis.json')
ids=['9수04-01','9수04-02','9수04-05','9수04-10','9수04-17','9수04-18']
restriction_ids=['no_trig_ratio_relationships','angle_range','no_circle_proportionality','no_complex_geometry_measurement','no_formal_complex_justification']
old={p['id']:p for p in basis['provisions']};hp=Path(basis['primaryHwp2020_236']['path']);pp=Path(basis['primaryPdf']['path'])
assert sha(hp)==basis['primaryHwp2020_236']['sha256'] and sha(pp)==basis['primaryPdf']['sha256']
h=olefile.OleFileIO(hp);data=h.openstream('BodyText/Section0').read()
if struct.unpack_from('<I',h.openstream('FileHeader').read(),36)[0]&1:data=zlib.decompress(data,-15)
pdf=fitz.open(pp);clean=lambda s:re.sub(r'[\s\x00-\x1f]','',s);pages=[clean(p.get_text()) for p in pdf]
off=rec=para=0;provs=[]
while off<len(data):
 start=off;word=struct.unpack_from('<I',data,off)[0];off+=4;tag=word&1023;size=word>>20
 if size==4095:size=struct.unpack_from('<I',data,off)[0];off+=4
 v=data[off:off+size];off+=size;rec+=1
 if tag==66:para+=1
 if tag!=67:continue
 text=v.decode('utf-16le');keys=[k for k in ids if text.startswith('['+k+']')]+[k for k in restriction_ids if clean(text)==clean(old[k]['hwp']['text'])]
 if not keys:continue
 assert len(keys)==1;match=[i+1 for i,p in enumerate(pages) if clean(text) in p];assert len(match)==1
 provs.append({'id':keys[0],'hwp':{'stream':'BodyText/Section0','tag':tag,'record1based':rec,'paragraph1based':para,'offset':start,'text':text},
 'pdfPhysicalPage1based':match[0],'pdfPrintedPage':match[0]-4,'wholeClausePDFMatch':True})
assert {p['id'] for p in provs}==set(ids+restriction_ids)
seed=OWN/'prisma/seed-data/units.ts';st=seed.read_text('utf8');seedrows=[]
for m in re.finditer(r'\{[^{}]*\bgrade:\s*"[^"]+"[^{}]*\bsection:\s*"([^"]+)"[^{}]*\}',st):
 if any(k in m[1] for k in ['평행선','삼각형의 내각','이등변삼각형','삼각비']):
  seedrows.append({'path':seed.as_posix(),'sha256':sha(seed),'startLine1based':st[:m.start()].count('\n')+1,'endLine1based':st[:m.end()].count('\n')+1,'section':m[1],'text':m[0]})
save('curriculum-evidence.json',{'primaryHwp':basis['primaryHwp2020_236'],'primaryPDF':basis['primaryPdf'],'provisions':provs,
 'rollout':basis['rollout'],'rolloutOfficialLinks':basis['rolloutOfficialLinks'],'rolloutLiveRecheckedDate':'2026-10-12',
 'liveRolloutObserved':'2015 middle3 starts2020;2022 middle3 starts2027;2025/2026 middle3 uses2015',
 'boundedAmendmentEvidence':basis['boundedAmendmentEvidence'],'identifiedMaterial2025MathProvisionUncertainty':basis['identifiedMaterial2025MathProvisionUncertainty'],
 'policyLimits':'Only material definitions/prerequisites/restrictions checked; not whole amendment-history completeness. Future2027 republication needs2022 review.',
 'actualPrerequisiteSeedRecords':seedrows,'sourceSchoolOrModelConfidenceAsAllowance':False,'newAuthorSolutionInWholeSevenSurfaceReview':True})
bank=load(OUT/'inputs/evidence/bank-read-fresh-r3-20261008.json')
rule=OWN/'src/lib/middle/m3Trig.ts';rt=rule.read_text('utf8');m=re.search(r'def\(\s*"삼각비",\s*"12",',rt);assert m
nextdef=rt.find('\n  def(',m.end());assert nextdef>m.end();block=rt[m.start():nextdef]
helper=rt[rt.index('function figQuadrant('):rt.index('\n/**',rt.index('function figQuadrant('))]
family=[f for f in bank['liveFamilies'] if f['family_key']=='mid:3-2|삼각비|12'];assert len(family)==1
units=[u for u in bank['units'] if u['orderIndex'] in [481,482,483]];assert len(units)==3
save('taxonomy-evidence.json',{'snapshot':{'path':'inputs/evidence/bank-read-fresh-r3-20261008.json','sha256':sha(OUT/'inputs/evidence/bank-read-fresh-r3-20261008.json'),'capturedAt':bank['capturedAt'],'isCurrentDatabase':False},
 'candidateFrozenAssignment':candidate['metadata']['assignment'],'candidateBankR2TimestampDiffersFromSuppliedR3':True,
 'actualCapturedTrigUnits':units,'nearbyFamily12CapturedRecord':family[0],
 'actualSourceRule':{'path':rule.as_posix(),'sha256':sha(rule),'startLine1based':rt[:m.start()].count('\n')+1,'endLine1based':rt[:nextdef].count('\n')+1,'text':block,'quadrantHelperText':helper},
 'purposeComparison':'family12 uses unit-radius quadrant, numeric ang25..65, given rounded BH/OH/AT, and numeric one-ratio or two-ratio sum at the center angle. This candidate uses radius2, no numeric alpha, parallel-angle transfer atT and a symbolic length expression for beta. Shared figure/concept is observed, whole assessed procedure/output branch is not present.',
 'unitRecommendation':'삼각비의 값 (historical UUID3b9f9110-2b31-4ed7-a44f-f5d2e8a1f4e7) is the nearest quadrant branch; 뜻 is also a plausible definition-focused axis. Frozen candidate has no Unit and no classification decision is promoted.',
 'exactUnitFamilyFitStatus':'pending','unitFamilyFit':False,'familyKeyAssigned':None,
 'specificHold':'Select actual target Unit and prove an exact whole-purpose live family/rule mapping, or separately approve a new family. Inverse helper existence/title/numeric proximity is not sufficient. No currentDB read required by this scoped review.',
 'difficultyNotInferredFromRegistryDescriptor':True,'databaseQueries':0})
save('instruction-receipt.json',{'AGENTS':{'path':'D:/todays-math/AGENTS.md','sha256':sha('D:/todays-math/AGENTS.md')},
 'typesafeSkill':{'path':(OWN/'.agents/skills/typesafe-ai/SKILL.md').as_posix(),'sha256':sha(OWN/'.agents/skills/typesafe-ai/SKILL.md')},
 'liveDocsReadOn20261012':['https://docs.typesafe.ai/llms.txt','https://docs.typesafe.ai/confidence','https://docs.typesafe.ai/cookbooks/citation_check'],
 'judgmentDesign':'Separate exact citation correspondence from contextual whole-item assessment; unknown fit remains held. Deterministic math in code, no model probabilities or inference APIs.',
 'inferenceApiCalls':0,'independentMethod':'independent-solve-then-review','rightsCustodyNativeLoadApprovals':0})
print(json.dumps({'inputHashesChecked':17,'rawGitBlobUnedited':True,'priorFilesBaseline':len(protected),'officialProvisionsReextracted':len(provs),'familyHeld':True}))
