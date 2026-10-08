"""Independent source-angle adjudication; no original answer agreement."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,shutil
OUT=Path(__file__).resolve().parent
PARENT=OUT.parents[2].parent/'exam-extraction-resume-20261008'
BASE=Path('.qa-artifacts/exam-resume-20261008')
CORR=PARENT/BASE/'gyeonggu-q13-source-correction-r2'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def ref(p):return {'path':Path(p).as_posix(),'sha256':sha(p)}
def load(p):return json.loads(Path(p).read_text(encoding='utf8'))
correction=load(CORR/'correction.json');receipt=load(CORR/'copy-receipt.json')
binding=next(x for x in load(OUT/'input-bindings.json')['bindings'] if x['questionNumber']==13)
assert binding['finalSourceQuestionOnly']['figureGivenObservation']==correction['before']
packet=PARENT/correction['immutablePacket']['path']
assert sha(packet)==correction['immutablePacket']['sha256']
views=[]
for row in correction['observationBasis']:
    p=PARENT/row['path'];assert sha(p)==row['sha256']
    views.append({**ref(p),'independentlyViewed':True,'viewMethod':'view_image','reading':
        'Clean HWP bitmap visibly attaches the105° leader to the arc DA–DC inside shadedADC; original printed q13 retains the same arc/point order but handwriting partly overlays it; completed question-only crop agrees.'})
dest=OUT/'source-question-only/q13-hwp-BIN0001.png';dest.parent.mkdir(parents=True,exist_ok=True)
shutil.copyfile(CORR/'hwp-BIN0001.png',dest);assert sha(dest)==receipt['hwp']['streamRawSha256']
evidence={
 'questionNumber':13,'reviewerId':'orca-codex-exam-twin-source-identity-20261008',
 'utc':datetime.now(timezone.utc).isoformat(),'status':'confirmed','sourceCoreStatus':'passed',
 'parentCorrection':ref(CORR/'correction.json'),'copyReceipt':ref(CORR/'copy-receipt.json'),
 'oldImmutablePacket':ref(packet),'oldObservation':correction['before'],
 'correctedObservation':correction['after'],'oldDraftNotesPreserved':ref(OUT/'review_notes.json'),
 'newQuestionOnlyCopy':ref(dest),'directViews':views,
 'originalBindingsAsReportedByParentReceipt':{'hwp':receipt['hwp'],'original':receipt['original'],'completedCrop':receipt['completedCrop']},
 'independentReading':'The105° printed leader terminates at the arc bounded by DA andDC within ADC. A,D,B are collinear in the shown point order, so the other angleBDC is75°. This agrees with the frozen new candidate ADC105 condition.',
 'sourceDeltaFinal':'Confirmed correctedsource ADC105, equilateralABC,D onAB,BD10√2, asksareaADC. FrozennewcandidateADC105 givesarea18√3 andasksBD withfeetE/F. The equilateral-angle/perpendicular/special-triangle/partial-area core is retained, with scale recovered by inverse area. No original numericalanswer was consulted or recomputed.',
 'supersedesDraftSourceHoldOnly':True,
 'answerExposureDisclosure':'The authorized original printed page03 contains handwritten workings and circled choices, incidentally visible during this source-only inspection, including neighboring questions. These are not cited, transcribed, tested or reused as new answers, solutions, grade permission or approval. The22 raw independent solves were committed c028 before author exposure; the22 exact-equivalence evidence was already written before this original-scan inspection.',
 'newMathEvidenceBeforeThisView':ref(OUT/'answer-equivalence-evidence.json'),
 'candidateStudentSolveBytesChanged':False,'sourceBytesChanged':False,
 'nativeRightsLoadingAuthority':False,
 'reopenIf':'An actual HWP/PDF/original printed leader, arc endpoint or A-D-B point order contradicts the ADC reading, or a new corrected source/candidate digest differs from this bound evidence.'
}
(OUT/'q13-source-correction-review.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('q13 source core confirmed from direct leader/arc reading; old packet/annotation preserved. No frozen bytes changed.')
