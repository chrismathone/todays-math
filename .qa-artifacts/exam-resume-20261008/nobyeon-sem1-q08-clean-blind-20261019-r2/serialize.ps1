$ErrorActionPreference = 'Stop'
$utf8 = [Text.UTF8Encoding]::new($false, $true)
$r1 = Join-Path (Split-Path $PSScriptRoot -Parent) 'nobyeon-sem1-q08-clean-blind-20261019-r1'
$sourcePath = Join-Path $r1 'solve/q08.json'
$beforeHash = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($beforeHash -ne '1eb7e1eeb9b542fb57f53fce6103ce61d7bf5156415eca6504f1ae5f1e7a27fe') { throw 'r1 raw hash mismatch' }
$raw = [IO.File]::ReadAllText($sourcePath, $utf8) | ConvertFrom-Json
if ($raw.answer.choice -ne 4 -or $raw.answer.value -ne 4) { throw 'Unexpected original answer shape' }
$raw.answer = '④ 4 (가능한 x는 1과 3이며, 그 합은 4)'
$raw.solution = [string]::Join("`n`n", [string[]]$raw.solution)
$raw.evidence.exposure = 'exposure-declaration.json'
$raw.evidence.computationScript = 'calculate.ps1'
$raw.evidence.computationResult = 'calculations.json'
function Write-ReadableJson($path, $value) {
    $json = ($value | ConvertTo-Json -Depth 20).Replace('\u003c','<').Replace('\u003e','>')
    if ($json.Contains([char]0xfffd)) { throw 'Replacement character detected' }
    [IO.File]::WriteAllText($path, $json+"`n", $utf8)
}
[IO.Directory]::CreateDirectory((Join-Path $PSScriptRoot 'solve')) | Out-Null
Write-ReadableJson (Join-Path $PSScriptRoot 'solve/q08.json') $raw
foreach ($name in @('exposure-declaration.json','calculations.json')) {
    $ownEvidence = [IO.File]::ReadAllText((Join-Path $r1 $name), $utf8) | ConvertFrom-Json
    Write-ReadableJson (Join-Path $PSScriptRoot $name) $ownEvidence
}
[IO.File]::WriteAllBytes((Join-Path $PSScriptRoot 'calculate.ps1'), [IO.File]::ReadAllBytes((Join-Path $r1 'calculate.ps1')))
$result = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'solve/q08.json'), $utf8) | ConvertFrom-Json
if ($result.answer -isnot [string] -or $result.solution -isnot [string] -or -not $result.answer.StartsWith('④')) { throw 'String serialization validation failed' }
$afterHash = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($beforeHash -ne $afterHash) { throw 'r1 changed' }
$receipt = [ordered]@{
    correctionOnly = $true
    additionalIndependentSolverCount = 0
    authorExposure = $false
    sourceRawSha256 = $beforeHash
    sourceRawUnchanged = ($beforeHash -eq $afterHash)
    studentDigest = $result.studentDigest
    solverId = $result.solverId
    changes = @('answer object serialized as readable choice string', 'solution array joined as readable Korean string', 'literal Unicode inequality escapes decoded in r2 JSON only', 'own evidence references copied into r2')
    rawSha256 = (Get-FileHash -LiteralPath (Join-Path $PSScriptRoot 'solve/q08.json') -Algorithm SHA256).Hash.ToLowerInvariant()
    readScope = 'Only own r1 raw proof and own exposure/calculation evidence; no author answers, root sources, original papers, or other sessions read.'
}
Write-ReadableJson (Join-Path $PSScriptRoot 'serialization-receipt.json') $receipt
$receipt | ConvertTo-Json -Depth 10
