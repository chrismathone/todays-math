<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Orca — default parallel workflow

If work can be split into independent sessions, do that with Orca by default
(worktrees), then merge completed sessions into `main`. Sequential solo work
is only for tasks that cannot be split.

# Codex workers

Launch Orca worktree workers with Codex. The user's standing preference is to
use Codex for future worktree execution and transfer unfinished Claude work to
Codex while preserving its files, branches, and evidence.

# Check the remote before every push

Immediately before every push, fetch the target remote branch and compare it
with the local branch. Integrate any newer remote commits, resolve conflicts
without discarding others' work, and rerun the relevant checks before pushing.
Never force-push over newer commits. This is the user's explicit standing rule.

# Orca session cleanup

When an Orca-managed task is fully complete, its changes have been merged into
`main`, its worktree is clean, and it has no running work, remove the Orca
worktree so the finished session no longer appears in the workspace list.
Preserve its Git branch by default. Never remove an unmerged, dirty, or active
worktree.

# TypeSafe skill

Use the project-installed [TypeSafe skill](.agents/skills/typesafe-ai/SKILL.md)
for TypeSafe/Jev work and relevant AI judgment design in this project, including
grading, verification, and routing. Read the skill and the relevant live TypeSafe
documentation before designing or changing an integration. Preserve the project's
chosen stack and keep deterministic rules and calculations in code.
