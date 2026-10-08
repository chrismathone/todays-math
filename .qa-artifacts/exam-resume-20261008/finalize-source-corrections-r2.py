import pathlib, json, hashlib, subprocess, datetime
base=pathlib.Path('.qa-artifacts/exam-resume-20261008')
hash_bytes=lambda b:hashlib.sha256(b).hexdigest()
qbase=base/'gyeonggu-q13-source-correction-r2'
receipt=json.loads((qbase/'copy-receipt.json').read_text('utf-8'))
packet=base/'next-five-extraction-r1/gyeonggu/packet/questions.json'
old=json.loads(packet.read_text('utf-8-sig'))
question=next(q for q in old['questions'] if q['number']==13)
record={
 'kind':'source-observation-correction/v1','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'examId':'2025-gyeonggu-3-2-mid','questionNumber':13,
 'immutablePacket':{'path':packet.as_posix(),'sha256':hash_bytes(packet.read_bytes())},
 'immutableManifest':receipt['sourceManifest'],
 'correctedFields':['figureGivenObservation','reviewObservation.givenFigureConditions'],
 'before':question['figureGivenObservation'],
 'after':'정삼각형 ABC; D∈AB; BD=10√2, ∠ADC=105°; 음영 ADC. A,D,B는 한 직선 위에 있으므로 ∠BDC=75°.',
 'scope':'Reviewer-inferred vertex name only; no printed stem/choice/figure/score or frozen candidate changed.',
 'observationBasis':[
  {'path':(qbase/'hwp-BIN0001.png').as_posix(),'sha256':receipt['hwp']['decompressedPngSha256'],'viewed':True,'reading':'Printed 105° leader joins the arc between DA and DC inside the shaded ADC region; no pixel angle measurement.'},
  {'path':(qbase/'original-page-03.webp').as_posix(),'sha256':receipt['original']['renderSha256'],'viewed':True,'reading':'Original printed q13 has the same shaded triangle and arc. Handwriting obstructs part of the page; clean HWP counterpart is used to read the printed leader.'},
  {'path':(base/'next-five-extraction-r1/gyeonggu/packet/images/q13-part1.png').as_posix(),'sha256':receipt['completedCrop']['sha256'],'viewed':True,'reading':'Completed PDF crop shows the same angle marker; correspondence is semantic/positional, not image-byte equality.'},
 ],
 'originalAnswerExposureDisclosure':'Original scan contains handwriting and circled choices, incidentally visible during source inspection. These marks were not used as new answer, independent solve, grade evidence or approval.',
 'sourceCorrectionAuthor':'root-codex-exam-extraction-resume-20261008',
 'independentSourceCorrectionReview':'pending',
 'newQuestionMathApproval':False,'wholeGradeApproval':False,'rightsApproval':False,
 'studentMethodRestriction':'Do not use sin/cos/tan105°, general sine/cosine laws or upper-grade tools. A within-grade perpendicular/special-angle procedure requires its own independent review.',
 'reopenIf':'Reopen if an actual original/HWP/PDF printed arc/leader or point order contradicts the ADC reading.',
 'oldEvidencePreserved':True,'dbWrites':0,
}
(qbase/'correction.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Restore the report's exact author-captured bytes, retaining the checkout-normalized copy.
integration=base/'gyeongam-parent-integration-r1';integration.mkdir(exist_ok=False)
report=pathlib.Path('docs/planning/tracks/reports/gyeongam-authoring-r1-20261008.md')
parent=report.read_bytes();worker=(pathlib.Path('../exam-twin-author-geometry-20261008')/report).read_bytes()
freeze=json.loads((base/'gyeongam-authoring-r1/author-freeze.json').read_text('utf-8'))
assert parent.replace(b'\r\n',b'\n')==worker.replace(b'\r\n',b'\n')
assert hash_bytes(worker)==freeze['reportBinding']['sha256']
(integration/'report-checkout-before.md').write_bytes(parent)
git_blob=subprocess.check_output(['git','show','a73e881c11c31ad23d97f4d61a4b8f0559370a9d:'+report.as_posix()])
(integration/'report-worker-commit-blob.md').write_bytes(git_blob)
report.write_bytes(worker)
audit={'kind':'frozen-report-byte-preservation/v1','path':report.as_posix(),'beforeCheckoutSha256':hash_bytes(parent),'originalCommitBlobSha256':hash_bytes(git_blob),'restoredCapturedSha256':hash_bytes(worker),'freezeExpectedSha256':freeze['reportBinding']['sha256'],'canonicalTextEqual':True,'contentsChanged':False,'scopedGitAttribute':'-text','newQuestionApproval':False,'workerOriginalPreserved':True}
(integration/'byte-preservation.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'sourceCorrection':'ADC105; independent source review pending','reportCaptureRestored':hash_bytes(worker),'originalInputsUnchanged':True}))
