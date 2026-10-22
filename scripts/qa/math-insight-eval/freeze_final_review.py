"""Distinct final-source counter-review; this is not a route-runtime probe/retry."""
from pathlib import Path
import json
import subprocess
from live import DEFAULT, save, sha, now

root=DEFAULT;phase='final-source-review'
commit='6f78cfaa7f13ca855aefb592434aa130ca969a3a'
paths=['src/lib/math-insight/snapshot.ts','src/lib/math-insight/inference.ts',
 'src/lib/math-insight/routes.ts','src/lib/math-insight/config.ts','src/lib/math-insight/admission.ts',
 'src/lib/math-prerequisite/policy.ts','src/contracts/mathInsight.contract.ts',
 'src/lib/errorLog/withErrorLog.ts','src/lib/math-srs/courseTeacherRoutes.ts',
 'src/lib/math-srs/teacherScope.ts']
sources={}
for p in paths:
 raw=subprocess.check_output(['git','show',f'{commit}:{p}'])
 sources[p]={'sha256':sha(raw),'text':raw.decode()}
# Store exact upstream storage validation, rather than treating arbitrary malformed
# timestamps/duplicate/misaligned sessions as production counterexamples.
p='src/lib/math-srs/courseAutomation.ts'
raw=subprocess.check_output(['git','show',f'{commit}:{p}'])
text=raw.decode();start=text.index('export const storedCourseSchema');end=text.index('export type StoredCourse')
sources[p]={'sha256':sha(raw),'excerpt':text[start:end]}
p='src/lib/math-explorers/expedition.ts'
raw=subprocess.check_output(['git','show',f'{commit}:{p}']);text=raw.decode()
start=text.index('/** Read-only candidate pool');end=text.index('export function expeditionInitialPrerequisiteDecision',start)
sources[p]={'sha256':sha(raw),'excerpt':text[start:end]}
snapshots={}
for ident in ['two-failures','fresh-pass','hints-zero-credit','future-session','cooldown']:
 source=json.loads((root/'pilot-claude-final/sources'/f'{ident}.json').read_bytes())
 snapshots[ident]={'snapshot':source['snapshot'],'expected':source['expected'],'query':source['query']}
source={'at':now(),'repositoryCommit':commit,'scope':'public code and synthetic generated source snapshots only',
 'sources':sources,'syntheticSnapshots':snapshots,
 'context':[
  'This is final implementation, distinct from prior design review. Prior truncated review was held and is not evidence of passing.',
  'No migrations, real student records, DB reads/writes, credential values or production model requests are supplied.',
  'Only four fraction sections have verified partial mapping. Editorial prerequisite, partial mapping, candidate instructional relevance and mastery are distinct.',
  'Teacher/role/menu/branch/class/student gates run before record/model. Existing requireOwnedStudent/InClass enforce class membership and branch capability; these helpers are not reproduced here.',
  'readSrsState strictly parses full SRS + storedCourseSchema and ISO timestamp contracts before this feature consumes records. Source snapshots supplied here pass storedCourseSchema. Do not allege undefined/malformed fields, duplicate IDs or arbitrary retry-in-first-attempt-array issues without showing a valid stored record.',
  'Existing prerequisiteStep extraction parity has been independently checked for 180 full decisions/held results vs exact base1939eb621. Personalized candidates use shared gate and frozen mission/course quota; source caveats disclose no generation/supply check.',
  'Snapshot payload/context is returned only to the authorized teacher. Model context uses aliases, aggregate counts and a snapshot hash; known identity is masked, email/phone/UUID rejected. Other unknown personal names cannot be categorically guaranteed anonymous.',
  'POST reads current snapshot at request time and returns that asOf snapshot. Browser refresh/scope changes abort/ignore stale responses; same-student concurrent unseen external edits are an asOf/freshness limitation to evaluate, not an unproven data corruption.',
  'SingleAttempt and suppressUpstreamDetails are implemented additively in existing transport; defaults for other callers preserved. Feature exact runtime is max700/deadline20s and model selection-only. This source review uses a larger output budget and is not a runtime acceptance claim.',
  'No student-learning-state mutation; error observability may store sanitized metadata. No official alignment, diagnosis, mastery or measured efficacy claims allowed.',
 ]}
source_hash=save(root/phase/'source.json',source)
prompt=('Independently audit the exact final teacher-only read-only fraction pilot source below. Look for concrete current correctness, authorization, privacy, evidence/candidate semantic or stale-response problems. Return only JSON, no Markdown fences, with schema {"currentIssues":[{"severity":"blocking"|"nonblocking","file":string,"symbol":string,"counterexample":string,"whyValidStoredInput":string,"requiredCheck":string}],"limits":[string],"verifiedInvariants":[string],"needsMoreSource":[string]}. '
 'At most 3 issues and 6 entries per other array; each entry under 120 words. Only call something blocking when you can trace the supplied exact code and a schema-valid input to the bad observable outcome. Distinguish unknown external helper behavior from observed defects. Do not treat all stored mappings as confirmed, zero credit as no records, structural candidates as available supply, or typed output as truth. Honest no-current-issue/insufficient-source results are acceptable.\n'+json.dumps(source,ensure_ascii=False))
model='claude-opus-5-5';body={'model':model,'max_tokens':12000,'output_config':{'effort':'medium'},'messages':[{'role':'user','content':[{'type':'text','text':prompt}]}]}
request_hash=save(root/phase/'request.json',body)
save(root/phase/'manifest.json',{'at':now(),'kind':'distinct-final-source-counter-review-not-runtime-certification','calls':[{
 'id':'final-source-claude-01','vendor':'anthropic','model':model,'effort':'medium','endpoint':'https://api.anthropic.com/v1/messages',
 'sourceKind':'synthetic','sourcePath':phase+'/source.json','sourceSha256':source_hash,'requestPath':phase+'/request.json','requestSha256':request_hash,'promptSha256':sha(prompt.encode())}]})
print(json.dumps({'phase':phase,'repositoryCommit':commit,'sourceSha256':source_hash,'requestSha256':request_hash}))
