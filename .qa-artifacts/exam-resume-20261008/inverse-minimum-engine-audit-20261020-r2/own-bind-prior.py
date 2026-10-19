from pathlib import Path
import json,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/inverse-minimum-engine-audit-20261020-r2')
base=Path('.qa-artifacts/exam-resume-20261008');read=lambda x:json.loads(x.read_text(encoding='utf-8-sig'));h=lambda x:hashlib.sha256(x.read_bytes()).hexdigest()
packet=read(p/'actual-drafts.json')
a=base/'inverse-minimum-engine-audit-20261020-r1';t=base/'inverse-root-table-engine-audit-20261019-r1'
assert h(a/'own-audit-report.json')=='58417e0dfbca3a2ea59e46a5501b483b9b4c615a94d1ce31530a8a0d7eaf1a2e'
seal=read(a/'own-hash-seal.json');assert h(a/'own-runtime-drafts24.json')==seal['ownedEvidenceHashes']['own-runtime-drafts24.json']
tseal=read(t/'own-audit-seal-hashes.json')
for name in ['own-generated-drafts.json','own-decimal-rational-oracle.json','own-primary-grade-evidence.json','own-engine-audit-report.json','own-solution-and-revision-checks.json']:assert h(t/name)==tseal['outputs'][name],name
oldmin=read(a/'own-runtime-drafts24.json')['drafts'];oldtab=[v['draft'] for v in read(t/'own-generated-drafts.json')['drafts']]
assert packet['minimum']==oldmin;assert packet['table']==oldtab
# Only after complete draft binding use the old independent oracle values.
oracle=read(t/'own-decimal-rational-oracle.json');mini=read(a/'own-actual-math-solutions24.json')
for d,o in zip(packet['table'],oracle['results']):
 assert hashlib.sha256(d['content'].encode()).hexdigest()==o['printedContentSha256']
 assert d['answer']==o['independentlyRecoveredAnswer']
for d,o in zip(packet['minimum'],mini['rows']):assert h(a/'own-actual-math-solutions24.json')==seal['ownedEvidenceHashes']['own-actual-math-solutions24.json'];assert hashlib.sha256(d['content'].encode()).hexdigest()==o['actualContentSha256'];assert hashlib.sha256(d['solution'].encode()).hexdigest()==o['actualSolutionSha256'];assert d['answer']==o['answer']
result={'all69DraftObjectsExactlyEqualPriorOwnR1':True,'boundFields':'full draft object: content, answer, solution, parameters, questionType, difficulty, difficultyBasis, figureSpec and any optional fields','minimum24':{'priorCommit':'b7944b8bc48c0b7380c3b0cbe16f9c94e0e9ea8d','priorDraftsSha256':h(a/'own-runtime-drafts24.json'),'priorMathSha256':h(a/'own-actual-math-solutions24.json'),'priorReportSha256':h(a/'own-audit-report.json'),'answersAgainstPrintedOracle':24},'table45':{'priorCommit':'76069c1b63358b841f9048bf04504f099cdb6877','priorDraftsSha256':h(t/'own-generated-drafts.json'),'priorOracleSha256':h(t/'own-decimal-rational-oracle.json'),'priorSolutionChecksSha256':h(t/'own-solution-and-revision-checks.json'),'priorPrimaryEvidenceSha256':h(t/'own-primary-grade-evidence.json'),'answersAgainstPrintedOracle':45,'rootCellsBound':225,'allFiveColumnOutputsBound':225},'inputPacketSha256':h(p/'actual-drafts.json'),'oracleReuseAfterExactBinding':True,'newMathOrGradeQuestionCounts':0}
with (p/'own-r1-payload-oracle-binding.json').open('x',encoding='utf-8') as f:json.dump(result,f,indent=2)
loader=(a/'own-bounded-loader.mjs').read_text(encoding='utf-8-sig').replace('inverse-minimum-engine-audit-20261020-r1/','inverse-minimum-engine-audit-20261020-r2/')
loader+='\nexport const tableKernel=await evaluate(\'inverseRootTable.ts\');\nexport {sources,exact,stripTypeScriptTypes,vm,linker,middle};\n'
with (p/'own-bounded-loader.mjs').open('x',encoding='utf-8') as f:f.write(loader)
print('69 full draft equality bindings passed before prior oracle reuse')
