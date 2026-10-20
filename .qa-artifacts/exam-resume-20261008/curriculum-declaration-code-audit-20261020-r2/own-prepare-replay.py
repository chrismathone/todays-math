from pathlib import Path
import json
P=Path('.qa-artifacts/exam-resume-20261008/curriculum-declaration-code-audit-20261020-r2');O=P.with_name('curriculum-declaration-code-audit-20261020-r1')
for name in ['own-prepare.py','own-bind-additional-inputs.py','own-controls.mjs']:
 (P/name).write_text((O/name).read_text(encoding='utf-8-sig'),encoding='utf-8')
t=(O/'own-empty-bracket-repro.mjs').read_text(encoding='utf-8-sig');start=t.index("classification:'");end=t.index(",limits:",start);t=t[:start]+"classification:'R2 replay of preserved R1 empty-wrapper counterexample. Expected conflict/grade hold/CLI rejection unchanged. Actual current results, not old R1 outcomes, determine verdict.'"+t[end:];(P/'own-empty-bracket-repro.mjs').write_text(t,encoding='utf-8')
