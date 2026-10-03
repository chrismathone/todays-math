# All-answer regeneration

The legacy batch still extracts original answers and fills missing multiple choice
solutions. The opt-in path below replaces **both answer and solution for every
question**, including essay and short-answer questions. Existing import metadata,
source figures, unit/family checks and exam synchronization still use the existing
loader.

```powershell
node node_modules/tsx/dist/cli.mjs scripts/import/exam-paper/regenerate-exam.ts prepare <exam-dir> <blind-dir>
# Run an independent solver using blind-dir/BRIEF.md and problems.json.
node node_modules/tsx/dist/cli.mjs scripts/import/exam-paper/regenerate-exam.ts verify-pack <exam-dir>
# Run a different solver/reviewer using VERIFY-BRIEF.md and verification-problems.json.
node node_modules/tsx/dist/cli.mjs scripts/import/exam-paper/regenerate-exam.ts collect <exam-dir>
node node_modules/tsx/dist/cli.mjs scripts/import/exam-paper/regenerate-exam.ts check <exam-dir>
node node_modules/tsx/dist/cli.mjs scripts/import/exam-paper/load-exam-paper.ts <exam-dir> --regenerate-all
```

The blind folder must be disjoint from the repository and the source exam folder.
All question types are included, even if an original solution exists. Only source
problem content, question format, grade/subject, score and original figure copies
are exposed. Graph choice figures have `choice: 0` for the stem and `1..5` for the
corresponding choice.

The solver writes each `out/qNN.json`:

```json
{
  "answer": "①",
  "solution": "한국어 풀이와 $...$ 수식",
  "solverId": "solving-session-id"
}
```

The separate verifier independently solves the source problem, checks the candidate
solution step by step and writes each `verify/qNN.json`:

```json
{
  "status": "verified",
  "sourceDigest": "64-character SHA256 from the verifier pack",
  "candidateDigest": "64-character SHA256 from the verifier pack",
  "method": "independent-solve",
  "verifierId": "different-verification-session-id",
  "independentAnswer": "①",
  "checks": {
    "answerCorrect": true,
    "solutionCorrect": true,
    "sourceFaithful": true,
    "curriculumAppropriate": true
  },
  "evidence": "Specific independent computation and step-by-step checking evidence"
}
```

These records are **external verification reports**. Hashes, render success, a
different identifier, or agreement with the original answer do not establish
mathematical correctness. The driver makes no model calls and does not manufacture
verification reports. An unavailable or uncertain verifier must leave the record
`pending`; a demonstrated error is `rejected`. Unresolved candidates can have empty
answers/solutions and a `note`; they remain pending.

Collection checks source/candidate hashes, figure-copy fidelity, external checks,
the independently computed answer, question coverage and the product math renderer.
The existing middle school method restrictions apply only to middle school grades;
other grades still require an explicit curriculum check by the verifier. A complete
`regeneration-results.json` is required by `--regenerate-all`. Missing, invalid,
rejected or stale results stop the paper; the loader never falls back to an original
answer/solution or legacy `sol_ai` in this mode.

Source hashes include `exam.json` except its `units` assignment table, `drafts.json`,
figure index and figure bytes. Unit/family assignments may be filled after solving;
the loader still checks the current assignments against actual database units and
families. Identity, grade/subject, graph mappings, source repairs and every other
configuration field remain bound. Changes to those sources require preparation and
current verification again. The source
answers may be retained in source artifacts for audit but are never solver inputs
or the acceptance oracle.

`--apply` still uses the existing shared-import write gate and ledger. This workflow
does not change extraction selection, exam deduplication, year resolution or the
default legacy import behavior. TypeSafe/Jev can later provide narrow semantic
checks using the existing project client; no TypeSafe check is claimed by this
offline driver. Its API key and domain validation would be prerequisites for that
integration.
