$ErrorActionPreference='Stop'
Add-Type -AssemblyName Microsoft.VisualBasic
$auditMemory=[Microsoft.VisualBasic.Devices.ComputerInfo]::new().AvailablePhysicalMemory
if($auditMemory -lt 1.5GB){throw 'Memory floor below1.5GiB: no Node execution'}
$p=$PSScriptRoot
@{availablePhysicalMemoryBytes=$auditMemory;minimumBytes=1.5GB;maxOldSpaceMiB=192;maxSemiSpaceMiB=8;nodeVersion=(& node --version)} | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $p 'own-runtime-environment.json')
$env:TSX_TSCONFIG_PATH=Join-Path $p 'own-tsconfig.json'
$env:DATABASE_URL='postgresql://audit:audit@127.0.0.1:1/audit';$env:DIRECT_URL=$env:DATABASE_URL
& node --max-old-space-size=192 --max-semi-space-size=8 --require (Join-Path $p 'own-guard.cjs') --import file:///C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/node_modules/tsx/dist/loader.mjs (Join-Path $p 'own-runner.ts')
if($LASTEXITCODE -ne 0){throw 'Runner failed'}
