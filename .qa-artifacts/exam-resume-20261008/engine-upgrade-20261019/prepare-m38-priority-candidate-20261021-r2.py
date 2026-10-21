"""Correct proposal-only JS string escaping, preserving the first preparation."""
from pathlib import Path

folder = Path(__file__).resolve().parent
prior = (folder / 'prepare-m38-priority-candidate-20261021-r1.py').read_text(encoding='utf-8')
start = prior.index("    new = r'''      // Exponent unknowns")
end = prior.index("    # A raw Python string", start)
block = prior[start:end]
corrected = block.replace(chr(92) * 2, chr(92))
assert corrected != block
assert chr(92) * 4 not in corrected
assert 'content:' in corrected and chr(92) + 'n$' in corrected
script = prior[:start] + corrected + prior[end:]
script = script.replace('m38-candidate-code-20261021-r1', 'm38-candidate-code-20261021-r2')
script = script.replace('kind=\'m38-priority-engine-candidate/v1\'', 'kind=\'m38-priority-engine-candidate/v2\'')
target = folder / 'prepare-m38-priority-candidate-20261021-r2-generated.py'
assert not target.exists()
target.write_text(script, encoding='utf-8')
exec(compile(script, str(target), 'exec'), {'__name__': '__main__'})
