"""Resume the already identified worker thread; never create or fork a thread."""
import os,subprocess
from pathlib import Path

account=Path('C:/Users/user/AppData/Roaming/orca/codex-accounts/6b4ba40f-7ed9-4c14-b21f-a7d5c8911e96/home')
worktree=Path('C:/Users/user/orca/workspaces/todays-math/exam-twin-source-identity-20261008')
assert worktree.is_dir() and account.is_dir()
cmd=['C:/Users/user/AppData/Roaming/npm/codex.cmd',
     '--no-daemon','--sandbox','danger-full-access','--ask-for-approval','never',
     'resume','01a15422-578b-7c71-a957-2440f33f6e49']
# Use its existing Orca account home, not a new home or copied credentials.
raise SystemExit(subprocess.call(cmd,cwd=worktree,env={**os.environ,'CODEX_HOME':str(account)}))
