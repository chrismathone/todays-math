$ErrorActionPreference='Stop'
Add-Type -AssemblyName Microsoft.VisualBasic
$auditAvailable=[Microsoft.VisualBasic.Devices.ComputerInfo]::new().AvailablePhysicalMemory
if($auditAvailable -lt 1.5GB){throw 'Audit memory floor below1.5GiB; no execution'}
$auditFolder=$PSScriptRoot
@{availablePhysicalMemoryBytes=$auditAvailable;minimumBytes=1.5GB;maxOldSpaceMiB=192;maxSemiSpaceMiB=8;nodeVersion=(& node --version);cwd=(Get-Location).Path} | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $auditFolder 'own-execution-environment.json')
$env:TSX_TSCONFIG_PATH=Join-Path $auditFolder 'own-tsconfig.json'
$env:DATABASE_URL='postgresql://audit:audit@127.0.0.1:1/audit'
$env:DIRECT_URL=$env:DATABASE_URL
Remove-Item Env:AUDIT_FIXTURES_ONLY -ErrorAction SilentlyContinue
& node --max-old-space-size=192 --max-semi-space-size=8 --require (Join-Path $auditFolder 'own-guard.cjs') --import file:///C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/node_modules/tsx/dist/loader.mjs (Join-Path $auditFolder 'own-runtime-controls.ts')
if($LASTEXITCODE -ne 0){throw "Runtime controls failed: $LASTEXITCODE"}
& python -B (Join-Path $auditFolder 'own-hash-after.py')
if($LASTEXITCODE -ne 0){throw 'Source hash check failed'}

$auditAvailable=[Microsoft.VisualBasic.Devices.ComputerInfo]::new().AvailablePhysicalMemory
if($auditAvailable -lt 1.5GB){throw 'Extra controls memory floor'}
$env:AUDIT_FIXTURES_ONLY='1'
& node --max-old-space-size=192 --max-semi-space-size=8 --require (Join-Path $auditFolder 'own-guard.cjs') --import file:///C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/node_modules/tsx/dist/loader.mjs (Join-Path $auditFolder 'own-extra-controls.ts')
if($LASTEXITCODE -ne 0){throw 'Extra controls failed'}
Remove-Item Env:AUDIT_FIXTURES_ONLY -ErrorAction SilentlyContinue
