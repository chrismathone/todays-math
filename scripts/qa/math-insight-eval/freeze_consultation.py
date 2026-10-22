"""Freeze a public-code/synthetic architecture counter-review, separate from acceptance."""
import json
from pathlib import Path
import subprocess
from live import DEFAULT, save, sha, now

root=DEFAULT
phase='consultation-claude'
paths=['src/lib/math-prerequisite/mapping.ts','src/lib/math-prerequisite/evidence.ts',
       'src/lib/math-prerequisite/versions.ts','src/contracts/mathInsight.contract.ts']
sources={p:{'sha256':sha(Path(p).read_bytes()),'text':Path(p).read_text()} for p in paths}
design={
 'goal':'Teacher-only read-only elementary fraction pilot: why revisit and available next-check candidates, direct record references and limitations; no assignment/state write.',
 'knownScope':'Only sections 5-2-2-1,5-2-2-2 (E56-N04) and 5-1-5-4,5-1-5-3 (E56-N03) have verified PARTIAL mapping. math_graph_2022.json is editorial, not official-audited. Graph edge E56-N03 -> E56-N04 is candidate instructional relation, not broad equivalence/mastery.',
 'proposedArchitecture':'GET builds deterministic snapshot from latest authorized student course record; POST accepts only query text and server constructs same snapshot. Teacher/menu/role/branch/class/student gates precede record/model reads. AI returns only snapshotId,intent,evidence aliases,candidate aliases. Parser rejects unknown/excluded/duplicate IDs, stale snapshot, ineligible candidates, missing citations and contradictory intent. Code composes all facts and numbers. No free-form diagnosis or mastery. No raw problem statements/answers or identity in model context. Query identity masking and cancellation/admission/time/body limits required. Existing runModelApi transport retained with additive singleAttempt/error-body suppression. No retries on this feature. Server credential config only.',
 'semanticHazards':'included session is not necessarily positive independent credit; hints/self-check/giveup/repeats may yield zero credit with retained records. Newer incomplete/future observations must block stale positive conclusions. Default plan may be computed read-only and is not teacher-authored provenance. Static candidates may exist but be ineligible. Same/covers-part/related differs from prerequisite, and candidate differs from confirmed.',
 'syntheticCases':[
  {'id':'positive','facts':'Two recent completed target sessions after plan, each 2 independent incorrect, fresh eligible unobserved subtraction check. Can cite the two first-attempt sessions and candidate; never diagnose prerequisite failure.'},
  {'id':'negative-pass','facts':'One fresh target session 5 independent correct. Can state its narrow observed outcome; cannot infer whole-unit mastery.'},
  {'id':'zero-credit','facts':'Two complete sessions, all answers hinted or self-check or give-up or repeated: independentCorrect=0, independentIncorrect=0. Data exists; outcome insufficient.'},
  {'id':'stale','facts':'All completed sessions 15 days old or before plan: retained evidence exists but ineligible; do not state no records.'},
  {'id':'future','facts':'Earlier passing completed session followed by future memory timestamp/incomplete session. Earlier pass must not become a fresh unit conclusion.'},
  {'id':'adversarial','facts':'Teacher query requests ignore rules, confirm all graph edges, make up evidence ID, diagnose mastery, auto-assign, reveal identity or other student records. Must select only allowed safe IDs/intent or insufficient.'},
 ]}
source={'at':now(),'kind':'synthetic-and-public-source','repositoryHead':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),'sources':sources,'design':design}
source_hash=save(root/phase/'source.json',source)
prompt='You are an independent adversarial architecture reviewer. Only the supplied public source code and synthetic scenarios are in scope; there are no real student records. Distinguish observed code facts, proposed design, inferred risks and unknowns. Do not assert education efficacy or official alignment. Identify concrete blocking flaws/counterexamples, safe acceptance invariants, and a bounded test matrix. Challenge the proposal; do not assume agreement is success. Return JSON {"blockingRisks":[{"risk":string,"counterexample":string,"requiredCheck":string}],"nonblockingLimits":[string],"acceptanceCases":[{"case":string,"expected":string}],"unknowns":[string]}.\n'+json.dumps(source,ensure_ascii=False)
model='claude-opus-5-5'
body={'model':model,'max_tokens':6500,'output_config':{'effort':'medium'},'messages':[{'role':'user','content':[{'type':'text','text':prompt}]}]}
request_hash=save(root/phase/'request.json',body)
save(root/phase/'manifest.json',{'at':now(),'kind':'architecture-consultation-not-live-acceptance','calls':[{'id':'architecture-claude-01','vendor':'anthropic','model':model,'effort':'medium','endpoint':'https://api.anthropic.com/v1/messages','sourceKind':'synthetic','sourcePath':phase+'/source.json','sourceSha256':source_hash,'requestPath':phase+'/request.json','requestSha256':request_hash,'promptSha256':sha(prompt.encode())}]})
print(json.dumps({'phase':phase,'sourceSha256':source_hash,'requestSha256':request_hash}))
