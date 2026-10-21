"""Prepare the byte-checked original escaping; r2 is a rejected proposal only."""
from pathlib import Path
import json
import re

folder = Path(__file__).resolve().parent
prior = (folder / 'prepare-m38-priority-candidate-20261021-r1.py').read_text(encoding='utf-8')
script = prior.replace('m38-candidate-code-20261021-r1', 'm38-candidate-code-20261021-r3')
script = script.replace('kind=\'m38-priority-engine-candidate/v1\'', 'kind=\'m38-priority-engine-candidate/v3\'')
exec(compile(script, str(__file__), 'exec'), {'__name__': '__main__'})
out = folder / 'm38-candidate-code-20261021-r3'
text = (out / 'src/lib/middle/m2Mono.ts').read_text(encoding='utf-8')
block = text[text.index('// Exponent unknowns'):text.index('// 05 ')]
assert all(len(run) == 2 for run in re.findall(r'(\\+)left', block))
assert all(len(run) == 1 for run in re.findall(r'(\\+)n', block))
(out / 'escaping-diagnostic.json').write_text(json.dumps({
    'r1ActualTexSourceBackslashes': 2, 'r1ActualNewlineSourceBackslashes': 1,
    'r1WasCorrect': True, 'r2ReductionRejected': True,
    'r3MatchesR1Escaping': True, 'productionChanged': False,
    'reason': 'Count source bytes, not JSON-escaped terminal presentation.',
}, indent=2) + '\n', encoding='utf-8')
