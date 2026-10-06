[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ManifestPath,
  [Parameter(Mandatory=$true)][string]$ManifestSha256,
  [Parameter(Mandatory=$true)][string]$PatternsSha256,
  [switch]$Apply,
  [switch]$Resume
)
$ErrorActionPreference = 'Stop'
$taskRoot = 'C:\Creative\testautocreator'
$taskPrivateRoot = Join-Path $taskRoot '.qa-artifacts\listening-retirement-20261006'
$taskManifest = (Resolve-Path -LiteralPath $ManifestPath).Path
if ($taskManifest -ne (Join-Path $taskPrivateRoot 'local-deletion-plan-private.json')) { throw 'Unexpected private plan path' }
if ((Get-FileHash -LiteralPath $taskManifest -Algorithm SHA256).Hash -ne $ManifestSha256) { throw 'Reviewed plan changed' }
$taskPattern = Join-Path $taskRoot 'src\lib\english\listening\creation\assessment-patterns.json'
if ((Get-FileHash -LiteralPath $taskPattern -Algorithm SHA256).Hash -ne $PatternsSha256) { throw 'Reviewed abstract patterns changed' }
$taskPlan = Get-Content -LiteralPath $taskManifest -Raw | ConvertFrom-Json -Depth 100
if ($taskPlan.main -ne $taskRoot -or $taskPlan.inputCounts.externalSources -ne 193) { throw 'Unexpected plan population/root' }
$taskSeen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
$taskTracked = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($taskEntry in (& git -C $taskRoot ls-files)) { [void]$taskTracked.Add($taskEntry) }
if ($LASTEXITCODE -ne 0) { throw 'Cannot verify tracked file protection' }
$taskBytes = [long]0
function Assert-ReviewedFile($taskCandidate) {
  $taskPath = [System.IO.Path]::GetFullPath($taskCandidate.path)
  if (-not $taskPath.StartsWith($taskRoot+'\',[System.StringComparison]::OrdinalIgnoreCase) -or $taskCandidate.root -ne $taskRoot -or $taskCandidate.worktree -or $taskCandidate.tracked) { throw 'Candidate escaped MAIN untracked scope' }
  $taskRelative = [System.IO.Path]::GetRelativePath($taskRoot,$taskPath).Replace('\','/')
  if ($taskRelative -ne $taskCandidate.relative -or $taskTracked.Contains($taskRelative)) { throw 'Tracked or changed relative target prohibited' }
  if ($taskRelative -notmatch '^(output/listening-assessments/|\.qa-artifacts/(assemblyai-seek-|whole-audio-seek-|listening-(ebs/|import/|bank-visual-|original-preservation/|seek-research-|storage-check/|storage-migration-backup/|style/)))') { throw 'Candidate is outside reviewed external-material directories' }
  $taskDirectory = [System.IO.Path]::GetDirectoryName($taskRelative).Replace('\','/')
  if ($taskDirectory -match '(^|/)(node_modules|\.git|[^/]*venv[^/]*|site-packages|models?[^/]*)(/|$)' -or $taskRelative -match '\.(safetensors|onnx|pt|pth)$') { throw 'Protected model/runtime target' }
  if (-not (Test-Path -LiteralPath $taskPath)) {
    if ($Resume -and $Apply) { return $taskPath }
    throw 'Reviewed file missing before deletion'
  }
  $taskItem = Get-Item -LiteralPath $taskPath
  if ($taskItem.PSIsContainer -or $taskItem.Length -ne $taskCandidate.bytes) { throw 'Candidate type/size changed' }
  $taskStamp = ([DateTimeOffset]$taskItem.LastWriteTimeUtc).ToUnixTimeMilliseconds()
  # Windows/Node and DateTimeOffset can differ by one millisecond at the integer boundary.
  if ([Math]::Abs($taskStamp-[double]$taskCandidate.mtimeMs) -gt 1.01) { throw 'Candidate modification time changed' }
  $taskAncestor = $taskItem
  while ($null -ne $taskAncestor -and $taskAncestor.FullName.StartsWith($taskRoot,[System.StringComparison]::OrdinalIgnoreCase)) {
    if ($taskAncestor.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw 'Linked file/ancestor prohibited' }
    $taskAncestor = if ($taskAncestor.PSIsContainer) { $taskAncestor.Parent } else { $taskAncestor.Directory }
  }
  return $taskPath
}
foreach ($taskCandidate in $taskPlan.deletionCandidates) {
  $taskPath = Assert-ReviewedFile $taskCandidate
  if (-not $taskSeen.Add($taskPath)) { throw 'Duplicate deletion candidate' }
  $taskBytes += [long]$taskCandidate.bytes
}
if (-not $Apply) { [pscustomobject]@{Apply=$false;ReviewedFiles=$taskSeen.Count;Bytes=$taskBytes} | ConvertTo-Json -Compress; exit 0 }
$taskRemoved = 0
foreach ($taskCandidate in $taskPlan.deletionCandidates) {
  $taskPath = Assert-ReviewedFile $taskCandidate
  if (Test-Path -LiteralPath $taskPath) { Remove-Item -LiteralPath $taskPath -Force }
  $taskRemoved++
  if ($taskRemoved % 1000 -eq 0) { [pscustomobject]@{Removed=$taskRemoved;Total=$taskSeen.Count} | ConvertTo-Json -Compress }
}
foreach ($taskPath in $taskSeen) { if (Test-Path -LiteralPath $taskPath) { throw 'A retired local file remains' } }
$taskSummary = [pscustomobject]@{RemovedFiles=$taskRemoved;RemovedBytes=$taskBytes;ReadbackAbsent=$taskRemoved;PatternHashVerified=$true;ModelsAndOwnSamplesProtected=$true}
$taskSummary | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskPrivateRoot 'local-purge-summary.json') -Encoding utf8
$taskSummary | ConvertTo-Json -Compress
