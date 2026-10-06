# Local listening retirement audit

`inventory-local.mjs` inventories actual files and writes a **dry-run plan only**.
It has no delete/apply mode, database/storage calls, network operations, or branch
mutations. Run it from any checkout with Node; pass MAIN as an absolute path:

```powershell
node scripts/qa/english-listening/retirement/inventory-local.mjs --dry-run --main C:/Creative/testautocreator
node --test scripts/qa/english-listening/retirement/inventory-local.test.mjs
```

Add `--audit-root <absolute-known-worktree>` once per known Orca worktree. Each
must share MAIN's Git common directory. Obtain known paths with Orca's worktree
list; this script never searches the user's home or other projects.

The required inputs are `corpus-private.json`, `retirement-private.json`, and
`quarantine-summary.json` in MAIN's `.qa-artifacts/listening-retirement-20261006`.
The only writes are `local-deletion-plan-private.json` and `summary.json` there.
The private plan contains exact absolute paths, verified bytes/stat metadata,
reasons, source-path coverage, protected paths, ambiguities and limitations. Keep
it private and dispose of it after root completes retirement. The summary and
bounded CLI stdout contain only counts, byte totals and reason categories.

Main output material, external task artifacts and frozen path references are
classified file by file. Long exact sequences from the private corpus identify
copied text in tracked fixtures/docs/code. References and identities without
confirmed copied text in retained code receive a separate review. Short generic
phrases alone do not prove a copy; the audit is not a semantic copyright test.
Unknown associated task artifacts, oversized/unreadable text and absent frozen
paths remain explicit limitations/ambiguities. Frozen JSON inventories can add
references, but never expand the declared traversal scope.
References to excluded runtimes/models and existing directories are reported
separately from genuinely absent or out-of-scope file references. Media in
associated tasks needs evidence in the same immediate directory; a corpus record
in another task subdirectory does not prove ownership of a synthetic screenshot.

Deletion candidates contain only untracked material in MAIN. Tracked copies are
in `trackedSourceReview`; material in every other worktree is in
`worktreeMaterialReview` and remains preserved for root review. Neither list
authorizes worktree removal, branch removal, or Git history rewriting.

The traversal rejects sibling/root escapes and symbolic links/junctions, including
linked ancestors. It skips `.git`, `node_modules`, virtual environments, public
model directories and weights. Skipped directories explicitly state that their
descendants were not enumerated. Synthetic/TTS samples and unrelated scratch work
survive unless exact corpus text proves a particular sample file is contaminated.
Production pattern outputs survive and copied text detected in them is flagged.
The live retirement control directory is excluded from immediate disposal.
Report targets that are links or share a hardlink with another file are rejected
before writing; material files with additional hardlinks require alias review.

This is a filesystem snapshot, not an atomic deletion authorization. Root must
seal the abstract production patterns, review classifications, resolve relevant
ambiguities, and reverify every candidate's root, real path, link status, size
and modification time immediately before deleting it. Existing archives are
catalogued as files; their members are not extracted or claimed as independently
enumerated. Public model/runtime descendants are outside material coverage.
