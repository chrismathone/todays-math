param([switch]$Once, [switch]$Loop, [switch]$InspectOnly, [switch]$SelfTest)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$controllerRoot = 'C:/Users/user/orca/artifacts/outputs/exam-continuation-watch-20261008'
$targetRoot = 'C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008'
$controlRoot = Join-Path $targetRoot '.qa-artifacts/exam-resume-20261008/continuation-watch'
$cliPath = 'C:/Users/user/AppData/Local/Programs/orca/resources/bin/orca.exe'
$sessionId = '01a11702-baf1-7343-b2bc-64cf304bbcc5'
$taskName = 'TodaysMath-ExamContinuation'
$utf8 = [System.Text.UTF8Encoding]::new($false)
$launchCommand = 'codex --no-daemon --sandbox danger-full-access --ask-for-approval never resume ' + $sessionId
$primaryPaneKey = '06ff420c-4178-4e64-b469-a11cc09c61af:4fb08203-bfb2-4eab-ba45-86c7d1451868'
$sessionLog = 'C:/Users/user/AppData/Roaming/orca/codex-accounts/caa5ed7f-0e22-43b8-ae7b-536b25a42a34/home/sessions/2026/10/08/rollout-2026-10-08T00-36-57-01a11702-baf1-7343-b2bc-64cf304bbcc5.jsonl'
$terminalRecordPath = Join-Path $controllerRoot 'session-terminal.json'
if (Test-Path -LiteralPath $terminalRecordPath) {
  $savedTerminal = Get-Content -LiteralPath $terminalRecordPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($savedTerminal.sessionId -eq $sessionId -and $savedTerminal.worktreePath -eq $targetRoot -and $savedTerminal.paneKey) {
    $primaryPaneKey = $savedTerminal.paneKey
  }
}

function Remember-PrimaryTerminal($Terminal) {
  $shown = Read-Orca @('terminal','show','--terminal',$Terminal.handle,'--json')
  $detail = $shown.terminal
  $key = $detail.recordedPaneKey
  if (-not $key -and $detail.tabId -and $detail.leafId) { $key = $detail.tabId + ':' + $detail.leafId }
  if (-not $key) { throw 'original-pane-unverifiable' }
  $script:primaryPaneKey = $key
  $record = [ordered]@{at=(Get-Date).ToUniversalTime().ToString('o');sessionId=$sessionId;worktreePath=$targetRoot;paneKey=$key;handle=$Terminal.handle}
  [System.IO.File]::WriteAllText($terminalRecordPath, ($record | ConvertTo-Json -Compress), $utf8)
}

function Read-Screen($Terminal) {
  $read = Read-Orca @('terminal','read','--terminal',$Terminal.handle,'--limit','100','--json')
  return ($read.terminal.tail -join [Environment]::NewLine)
}

function Parse-CodexStatus([string]$Screen) {
  $lastStatus = $Screen.LastIndexOf('/status')
  if ($lastStatus -ge 0) { $Screen = $Screen.Substring($lastStatus) }
  $ids = [regex]::Matches($Screen, 'Session:\s*([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})')
  if ($ids.Count -eq 0) { return $null }
  return [pscustomobject]@{
    sessionId=$ids[$ids.Count-1].Groups[1].Value
    fullAccess=($Screen -match 'Permissions:\s*Full Access')
    hasPriorContext=($Screen -match 'Context window:|Thread name:')
  }
}

function Is-RecognizedShell($Terminal, [string]$Screen) {
  if ($Terminal.recordedPaneKey -ne $primaryPaneKey) { return $false }
  $last = @($Screen -split '[\r\n]+' | Where-Object { $_.Trim() })[-1]
  $normalized = $last -replace '\\+', '/'
  return $normalized -match ('(?:^|\s)PS\s+' + [regex]::Escape($targetRoot) + '>\s*$')
}

function Can-ReplaceEmptyDefault([string]$BeforeStatus, $Status) {
  if (-not $Status -or $Status.sessionId -eq $sessionId -or $Status.hasPriorContext) { return $false }
  if ($BeforeStatus -notmatch 'OpenAI Codex|>_ Codex' -or $BeforeStatus -notmatch 'Ask Codex to do anything') { return $false }
  if ($BeforeStatus -match '(?m)^\s*[\u2022\u25a0]|Working\s*\(|Conversation interrupted|Thread name:|Context window:') { return $false }
  $userLines = @($BeforeStatus -split '[\r\n]+' | Where-Object { $_ -match '^\s*\u203a' -and $_ -notmatch 'Ask Codex to do anything' })
  return $userLines.Count -eq 0
}

function Session-ProgressSince([string]$At) {
  if (-not $At -or -not (Test-Path -LiteralPath $sessionLog)) { return $false }
  $since = [DateTimeOffset]::Parse($At)
  foreach ($line in (Get-Content -LiteralPath $sessionLog -Encoding UTF8 -Tail 200)) {
    try { $item = $line | ConvertFrom-Json } catch { continue }
    if (-not $item.timestamp -or [DateTimeOffset]::Parse($item.timestamp) -lt $since) { continue }
    if (($item.type -eq 'event_msg' -and $item.payload.type -eq 'task_started') -or
        ($item.type -eq 'response_item' -and $item.payload.type -in @('custom_tool_call','function_call'))) { return $true }
  }
  return $false
}

function Get-CodexStatus($Terminal) {
  $sent = Read-Orca @('terminal','send','--terminal',$Terminal.handle,'--text','/status','--enter','--json')
  if (-not $sent.send.accepted) { return $null }
  for ($attempt=0; $attempt -lt 5; $attempt++) {
    Start-Sleep -Milliseconds 400
    $status = Parse-CodexStatus (Read-Screen $Terminal)
    if ($status) { return $status }
  }
  return $null
}

function Resume-RecognizedShell($Inventory) {
  $matches = @($Inventory.terminals | Where-Object { $_.connected -and $_.writable -and $_.recordedPaneKey -eq $primaryPaneKey })
  if ($matches.Count -ne 1) { return $null }
  $shell = $matches[0]
  if (-not (Is-RecognizedShell $shell (Read-Screen $shell))) { return $null }
  if (Is-Busy (Get-Workspace)) { return $null }
  $sent = Read-Orca @('terminal','send','--terminal',$shell.handle,'--text',$launchCommand,'--enter','--json')
  if (-not $sent.send.accepted) { return $null }
  Record-Check 'restored-original-shell' @{handle=$shell.handle} | Out-Null
  return $shell
}

function Read-Orca([string[]]$CliArgs) {
  $raw = & $cliPath @CliArgs
  if (-not $raw) { throw 'orca-empty-output' }
  $value = (($raw -join [Environment]::NewLine).TrimStart([char]0xFEFF)) | ConvertFrom-Json
  if (-not $value.ok) { throw ('orca-' + $value.error.code) }
  return $value.result
}

function Record-Check([string]$Outcome, [hashtable]$Details = @{}) {
  $record = [ordered]@{at=(Get-Date).ToUniversalTime().ToString('o');outcome=$Outcome;pid=$PID;sessionId=$sessionId}
  foreach ($key in $Details.Keys) { $record[$key] = $Details[$key] }
  $serialized = $record | ConvertTo-Json -Depth 8 -Compress
  [System.IO.File]::WriteAllText((Join-Path $controllerRoot 'last-check.json'), $serialized, $utf8)
  [System.IO.File]::AppendAllText((Join-Path $controllerRoot 'checks.ndjson'), $serialized + [Environment]::NewLine, $utf8)
  Write-Output $serialized
}

function Get-Workspace {
  $fleet = Read-Orca @('worktree','ps','--json')
  $matches = @($fleet.worktrees | Where-Object {
    $_.path -and ([string]$_.path).Replace('\','/').TrimEnd('/') -eq $targetRoot
  })
  if ($matches.Count -ne 1) { throw 'workspace-state-unverifiable' }
  return $matches[0]
}

function Is-Busy($Workspace) {
  if ($Workspace.status -eq 'working') { return $true }
  $busy = @($Workspace.agents | Where-Object {
    $_ -and $_.state -notin @('done','idle','inactive','stopped','interrupted')
  })
  return $busy.Count -gt 0
}

function Disable-Controller {
  if ($InspectOnly) { return }
  $null = & "$env:SystemRoot/System32/schtasks.exe" /Change /TN $taskName /DISABLE
  if ($LASTEXITCODE -ne 0) { throw 'scheduler-disable-failed' }
}

function Check-Once {
  if (-not (Test-Path -LiteralPath $targetRoot)) {
    Disable-Controller
    Record-Check 'stopped-workspace-missing'
    return $false
  }
  foreach ($marker in @('STOP','PAUSED','COMPLETE','BLOCKED')) {
    if (Test-Path -LiteralPath (Join-Path $controlRoot $marker)) {
      Disable-Controller
      Record-Check 'stopped-control-marker' @{marker=$marker}
      return $false
    }
  }
  $workspace = Get-Workspace
  if ($workspace.isArchived) {
    Disable-Controller
    Record-Check 'stopped-workspace-archived'
    return $false
  }
  if (Is-Busy $workspace) {
    Record-Check 'skipped-working'
    return $true
  }
  if ($InspectOnly) {
    Record-Check 'resume-needed-inspection'
    return $true
  }
  $inventory = Read-Orca @('terminal','list','--worktree',('path:'+$targetRoot),'--json')
  $terminals = @($inventory.terminals | Where-Object {
    $_.agentIdentity -eq 'codex' -and $_.connected -and $_.writable
  })
  if ($terminals.Count -gt 1) {
    Record-Check 'skipped-ambiguous-terminals' @{count=$terminals.Count}
    return $true
  }
  if ($terminals.Count -eq 1) {
    $extras = @($inventory.terminals | Where-Object { $_.connected -and $_.writable -and $_.handle -ne $terminals[0].handle })
    foreach ($extra in $extras) {
      if (-not (Is-RecognizedShell $extra (Read-Screen $extra))) {
        Record-Check 'skipped-other-terminal-in-workspace' @{handle=$extra.handle}
        return $true
      }
    }
  }
  if ($terminals.Count -eq 1) {
    $terminal = $terminals[0]
  } else {
    if (@($inventory.terminals).Count -gt 0) {
      $terminal = Resume-RecognizedShell $inventory
      if (-not $terminal) {
        Record-Check 'skipped-unknown-terminal'
        return $true
      }
    } else {
      if (Is-Busy (Get-Workspace)) {
        Record-Check 'skipped-working-before-create'
        return $true
      }
      $created = Read-Orca @('terminal','create','--worktree',('path:'+$targetRoot),'--title','기출 계속 실행','--command',$launchCommand,'--json')
      $terminal = $created.terminal
      Record-Check 'restored-session' @{handle=$terminal.handle}
    }
  }
  $read = Read-Orca @('terminal','read','--terminal',$terminal.handle,'--limit','25','--json')
  $screen = $read.terminal.tail -join [Environment]::NewLine
  $wait = Read-Orca @('terminal','wait','--terminal',$terminal.handle,'--for','tui-idle','--timeout-ms','10000','--json')
  if (-not $wait.wait.satisfied -and $wait.wait.blockedReason -eq 'agent-update-prompt') {
    if ($screen -match 'Update available' -and $screen -match 'Skip') {
      $null = Read-Orca @('terminal','send','--terminal',$terminal.handle,'--text',([string][char]27),'--json')
      Start-Sleep -Milliseconds 400
      $wait = Read-Orca @('terminal','wait','--terminal',$terminal.handle,'--for','tui-idle','--timeout-ms','10000','--json')
    }
  }
  if (-not $wait.wait.satisfied) {
    Record-Check 'skipped-terminal-not-idle' @{handle=$terminal.handle;reason=$wait.wait.blockedReason}
    return $true
  }
  if (Is-Busy (Get-Workspace)) {
    Record-Check 'skipped-working-before-send'
    return $true
  }
  $beforeStatus = Read-Screen $terminal
  $status = Get-CodexStatus $terminal
  if (-not $status) {
    Record-Check 'skipped-session-unverifiable' @{handle=$terminal.handle}
    return $true
  }
  if ($status.sessionId -ne $sessionId) {
    if (-not (Can-ReplaceEmptyDefault $beforeStatus $status)) {
      Record-Check 'skipped-other-session' @{handle=$terminal.handle;otherSessionId=$status.sessionId}
      return $true
    }
    $otherShells = @($inventory.terminals | Where-Object { $_.handle -ne $terminal.handle })
    if ($otherShells.Count -ne 1 -or -not (Is-RecognizedShell $otherShells[0] (Read-Screen $otherShells[0]))) {
      Record-Check 'skipped-empty-default-without-original-shell' @{handle=$terminal.handle}
      return $true
    }
    $closed = Read-Orca @('terminal','close','--terminal',$terminal.handle,'--json')
    if (-not $closed.close.ptyKilled) { throw 'empty-default-close-unverifiable' }
    Record-Check 'closed-empty-default' @{otherSessionId=$status.sessionId}
    $inventory = Read-Orca @('terminal','list','--worktree',('path:'+$targetRoot),'--json')
    $terminal = Resume-RecognizedShell $inventory
    if (-not $terminal) { throw 'original-shell-restore-unverifiable' }
    $ready = Read-Orca @('terminal','wait','--terminal',$terminal.handle,'--for','tui-idle','--timeout-ms','10000','--json')
    if (-not $ready.wait.satisfied) {
      Record-Check 'skipped-restored-session-not-idle' @{handle=$terminal.handle}
      return $true
    }
    $status = Get-CodexStatus $terminal
  }
  if (-not $status -or $status.sessionId -ne $sessionId -or -not $status.fullAccess) {
    Record-Check 'skipped-original-session-settings-unverifiable' @{handle=$terminal.handle}
    return $true
  }
  Remember-PrimaryTerminal $terminal
  $read = Read-Orca @('terminal','read','--terminal',$terminal.handle,'--limit','25','--json')
  if (($read.terminal.tail -join [Environment]::NewLine) -notmatch 'Ask Codex to do anything') {
    Record-Check 'skipped-composer-unverifiable' @{handle=$terminal.handle}
    return $true
  }
  $text = [System.IO.File]::ReadAllText((Join-Path $controllerRoot 'continue-prompt.txt'), [System.Text.Encoding]::UTF8).Replace([string][char]34,[string][char]0x2019)
  $receiptPath = Join-Path $controllerRoot 'last-send.json'
  $retry = $null
  if (Test-Path -LiteralPath $receiptPath) {
    $previous = Get-Content -LiteralPath $receiptPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($previous.accepted -and -not $previous.turnStarted -and -not (Session-ProgressSince $previous.at)) {
      if ($previous.handle -ne $terminal.handle) {
        Record-Check 'skipped-unproven-prior-send-after-restart' @{priorRequestId=$previous.requestId}
        return $true
      }
      $retry = $previous.requestId
      $text = $previous.text
    }
  }
  $sendAt = (Get-Date).ToUniversalTime().ToString('o')
  $proofAt = $sendAt
  if ($retry) { $proofAt = $previous.at }
  $sendArgs = @('terminal','send','--terminal',$terminal.handle,'--text',$text,'--enter','--wait-submit','3','--json')
  if ($retry) { $sendArgs += @('--retry-request',$retry) }
  $sent = Read-Orca $sendArgs
  $nativeProof = $sent.send.prompt.stages -contains 'turn_started'
  $historyProof = Session-ProgressSince $proofAt
  $receipt = [ordered]@{at=$proofAt;observedAt=$sendAt;sessionId=$sessionId;handle=$terminal.handle;accepted=[bool]$sent.send.accepted;turnStarted=($nativeProof -or $historyProof);nativeReceiptProof=$nativeProof;localHistoryProof=$historyProof;requestId=$sent.send.prompt.requestId;text=$text}
  [System.IO.File]::WriteAllText($receiptPath,($receipt | ConvertTo-Json -Depth 5),$utf8)
  Record-Check 'resume-receipt' @{handle=$terminal.handle;accepted=$receipt.accepted;turnStarted=$receipt.turnStarted;requestId=$receipt.requestId;replayed=[bool]$retry}
  return $true
}

if ($SelfTest) {
  $original = Parse-CodexStatus ('Permissions: Full Access' + "`nSession: " + $sessionId + "`nContext window: 29% left")
  $empty = Parse-CodexStatus "Permissions: Full Access`nSession: 01a11b45-913e-7d70-9a6e-95c7dece6f6b"
  $newScreen = "  >_ OpenAI Codex (v0.161.0)`n  permissions: YOLO mode`n› Ask Codex to do anything"
  $shell = [pscustomobject]@{recordedPaneKey=$primaryPaneKey}
  $foreign = [pscustomobject]@{recordedPaneKey='another-tab:another-pane'}
  $staleAccess = Parse-CodexStatus ("/status`nPermissions: Full Access`nSession: " + $sessionId + "`n/status`nPermissions: Read Only`nSession: " + $sessionId)
  $staleContext = Parse-CodexStatus ("/status`nThread name: old task`nSession: " + $sessionId + "`n/status`nPermissions: Full Access`nSession: 01a11b45-913e-7d70-9a6e-95c7dece6f6b")
  $checks = @(
    ($original.sessionId -eq $sessionId -and $original.fullAccess -and $original.hasPriorContext),
    ($null -eq (Parse-CodexStatus 'startup still loading')),
    (Can-ReplaceEmptyDefault $newScreen $empty),
    (-not (Can-ReplaceEmptyDefault $newScreen $original)),
    (-not (Can-ReplaceEmptyDefault ($newScreen + "`n• Working (2m)") $empty)),
    (-not (Can-ReplaceEmptyDefault ($newScreen + "`n› unrelated user task") $empty)),
    (Is-RecognizedShell $shell ('PS ' + $targetRoot.Replace('/','\') + '>')),
    (-not (Is-RecognizedShell $foreign ('PS ' + $targetRoot + '>'))),
    (-not (Is-RecognizedShell $shell 'PS D:/another-repo>')),
    (-not (Is-RecognizedShell $shell 'building files, please wait')),
    (-not $staleAccess.fullAccess),
    (-not $staleContext.hasPriorContext)
  )
  if ($checks -contains $false) { throw 'continuation-policy-self-test-failed' }
  [pscustomobject]@{passed=$checks.Count;mutations=0;modelCalls=0} | ConvertTo-Json -Compress
  exit 0
}

$lease = $null
try {
  $lease = [System.IO.File]::Open((Join-Path $controllerRoot 'controller.lock'),[System.IO.FileMode]::OpenOrCreate,[System.IO.FileAccess]::ReadWrite,[System.IO.FileShare]::None)
} catch { exit 0 }
try {
  do {
    $keepGoing = $true
    try {
      $results = @(Check-Once)
      $keepGoing = $results[-1] -eq $true
      $results | Where-Object { $_ -is [string] } | Write-Output
    } catch {
      Record-Check 'check-failed' @{errorType=$_.Exception.GetType().FullName;errorCode=$_.FullyQualifiedErrorId}
    }
    if (-not $Loop -or -not $keepGoing) { break }
    Start-Sleep -Seconds 900
  } while ($true)
} finally { if ($lease) { $lease.Dispose() } }
