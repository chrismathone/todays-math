from pathlib import Path
P=Path('.qa-artifacts/exam-resume-20261008/m3-method-grade-gate-code-audit-20261020-r2');O=P.parent/'m3-method-grade-gate-prechange-audit-20261020-r1'
s=(O/'own-policy-controls.ts').read_text(encoding='utf-8-sig');s=s.replace("const result={kind:","const originalControls=controls.map(x=>({...x}));const changed=controls.find(x=>x.name==='four-current-rely-on-release');changed.pass=!changed.pass;changed.name='expected-old-release-only-predicate-now-false';\nconst result={originalControls,kind:")
s=s.replace('prechange actual-current-generator counterexamples, NOT post-fix pass or publicbypass','postchange exact860-route replay; no release approval')
(P/'own-policy-controls.ts').write_text(s,encoding='utf-8')
for n in ['own-guard.cjs','own-tsconfig.json']:(P/n).write_bytes((O/n).read_bytes())
