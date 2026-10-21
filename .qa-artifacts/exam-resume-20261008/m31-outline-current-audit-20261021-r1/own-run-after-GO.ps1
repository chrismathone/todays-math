param([switch]$ParentGO)
$ErrorActionPreference='Stop'
if(-not $ParentGO){throw 'Parent GO required; do not execute while parent regression runs'}
$p=$PSScriptRoot
& python -B (Join-Path $p 'own-preflight.py')
if($LASTEXITCODE -ne 0){throw 'Pre-execution source hash mismatch'}
Add-Type -AssemblyName Microsoft.VisualBasic
$available=[Microsoft.VisualBasic.Devices.ComputerInfo]::new().AvailablePhysicalMemory
if($available -lt 1.5GB){throw 'Memory belowfloor; pending without polling'}
@{availablePhysicalMemoryBytes=$available;minimumBytes=1.5GB;maxOldSpaceMiB=192;maxSemiSpaceMiB=8;ParentGO=$true} | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $p 'own-runtime-memory.json')
$env:TSX_TSCONFIG_PATH=Join-Path $p 'own-tsconfig.json'
& node --max-old-space-size=192 --max-semi-space-size=8 --require (Join-Path $p 'own-guard.cjs') --import file:///C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/node_modules/tsx/dist/loader.mjs (Join-Path $p 'own-runner.ts')
if($LASTEXITCODE -ne 0){throw 'Actual API runner failed'}
& python -B (Join-Path $p 'own-check-outputs.py')
if($LASTEXITCODE -ne 0){throw 'Independent output checks failed'}
