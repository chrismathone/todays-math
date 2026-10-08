param([switch]$InspectOnly)
$ErrorActionPreference = 'Stop'
$examWatchTarget = 'C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008'
$examWatchControlDirectory = Join-Path $examWatchTarget '.qa-artifacts/exam-resume-20261008/continuation-watch'
function Stop-ExamWatch([int]$Code, [string]$Reason) {
  [PSCustomObject]@{resumeNeeded=$false;reason=$Reason} | ConvertTo-Json -Compress
  if ($InspectOnly) { exit 0 }
  exit $Code
}
function Disable-ExamWatchAutomation {
  $examWatchConfigPath = Join-Path $examWatchControlDirectory 'automation-config.json'
  if (-not (Test-Path -LiteralPath $examWatchConfigPath)) { return }
  $examWatchConfig = Get-Content -LiteralPath $examWatchConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($examWatchConfig.automationId -ne '358474c8-24be-49ee-b3c9-55fbebf68de4') { return }
  $examWatchDisableRaw = & orca automations edit $examWatchConfig.automationId --disabled --json
  if ($LASTEXITCODE -ne 0) { throw 'Could not disable this continuation automation.' }
  $examWatchDisableResult = ($examWatchDisableRaw -join [Environment]::NewLine) | ConvertFrom-Json
  if (-not $examWatchDisableResult.ok) { throw 'Could not disable this continuation automation.' }
}
try {
  if (-not (Test-Path -LiteralPath $examWatchTarget)) { Stop-ExamWatch 2 'workspace-missing' }
  foreach ($examWatchMarker in @('STOP','PAUSED','COMPLETE','BLOCKED')) {
    if (Test-Path -LiteralPath (Join-Path $examWatchControlDirectory $examWatchMarker)) { if (-not $InspectOnly) { Disable-ExamWatchAutomation }; Stop-ExamWatch 2 ('control-marker-' + $examWatchMarker.ToLowerInvariant()) }
  }
  $examWatchRaw = & orca worktree ps --json
  if ($LASTEXITCODE -ne 0) { Stop-ExamWatch 3 'orca-state-unavailable' }
  $examWatchSnapshot = ($examWatchRaw -join [Environment]::NewLine) | ConvertFrom-Json
  if (-not $examWatchSnapshot.ok) { Stop-ExamWatch 3 'orca-state-unavailable' }
  $examWatchWorkspace = @($examWatchSnapshot.result.worktrees | Where-Object { $_.path.Replace('\','/').TrimEnd('/') -eq $examWatchTarget })
  if ($examWatchWorkspace.Count -ne 1) { Stop-ExamWatch 3 'workspace-state-unverifiable' }
  $examWatchWorkspace = $examWatchWorkspace[0]
  if ($examWatchWorkspace.isArchived) { Stop-ExamWatch 2 'workspace-archived' }
  if ($examWatchWorkspace.status -eq 'working') { Stop-ExamWatch 1 'work-in-progress' }
  $examWatchAgents = @($examWatchWorkspace.agents | Where-Object { $_ })
  $examWatchBusy = @($examWatchAgents | Where-Object { $_.state -notin @('done','idle','inactive','stopped','interrupted') })
  if ($examWatchBusy.Count -gt 0) { Stop-ExamWatch 1 'agent-not-idle' }
  [PSCustomObject]@{resumeNeeded=$true;reason='no-working-agent';workspace=$examWatchTarget;liveTerminals=$examWatchWorkspace.liveTerminalCount} | ConvertTo-Json -Compress
  exit 0
} catch {
  Stop-ExamWatch 3 'precheck-failed'
}