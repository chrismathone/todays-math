$ErrorActionPreference='Stop'
$p=$PSScriptRoot
& python -B (Join-Path $p 'own-preflight.py')
if($LASTEXITCODE -ne 0){throw 'Preflight failed'}
Add-Type -AssemblyName Microsoft.VisualBasic
$available=[Microsoft.VisualBasic.Devices.ComputerInfo]::new().AvailablePhysicalMemory
@{availablePhysicalMemoryBytes=$available;minimumBytes=1.5GB;maxOldMiB=192;semiMiB=8;singleProbe=$true} | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $p 'own-memory-probe.json')
if($available -lt 1.5GB){Write-Output 'PENDING: memory below1.5GiB; Node not started';exit 3}
$prior=$env:TSX_TSCONFIG_PATH
try {
 $env:TSX_TSCONFIG_PATH=Join-Path $p 'own-tsconfig.json'
 & node --max-old-space-size=192 --max-semi-space-size=8 --require (Join-Path $p 'own-guard.cjs') --import file:///C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/node_modules/tsx/dist/loader.mjs (Join-Path $p 'own-runner.ts')
 if($LASTEXITCODE -ne 0){throw 'ActualAPI Node failed'}
 Write-Output 'NODE ENDED'
} finally {$env:TSX_TSCONFIG_PATH=$prior}
