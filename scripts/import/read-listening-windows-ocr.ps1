# Run with Windows PowerShell 5.1, which projects Windows Runtime APIs.
# Local image recognition only. This script never writes a native question or DB.
# References:
# https://learn.microsoft.com/en-us/uwp/api/windows.media.ocr.ocrengine
# https://learn.microsoft.com/en-us/uwp/api/windows.media.ocr.ocrengine.recognizeasync
# https://github.com/microsoft/Windows-universal-samples/tree/main/Samples/OCR
param(
    [Parameter(Mandatory = $true)][string]$ManifestPath,
    [Parameter(Mandatory = $true)][string]$OutputDirectory,
    [string]$Language = 'ko',
    [ValidateRange(1, 1000)][int]$Limit = 1000
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType = WindowsRuntime]
$awaitMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1
} | Select-Object -First 1
function Wait-WinRt($Operation, [Type]$ResultType) {
    $task = $awaitMethod.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    if (!$task.Wait(60000)) { throw 'Windows OCR operation exceeded 60 seconds' }
    return $task.GetAwaiter().GetResult()
}
function Get-ImageSha256([string]$Path) {
    $hash = [Security.Cryptography.SHA256]::Create()
    $inputStream = [IO.File]::OpenRead($Path)
    try { return [BitConverter]::ToString($hash.ComputeHash($inputStream)).Replace('-', '').ToLowerInvariant() }
    finally { $inputStream.Dispose(); $hash.Dispose() }
}
$languageObject = [Windows.Globalization.Language]::new($Language)
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($languageObject)
if ($null -eq $engine) { throw "OCR language unavailable: $Language" }
$manifest = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $ManifestPath).Path) | ConvertFrom-Json
$outputPath = [IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($outputPath) | Out-Null
$encoding = [Text.UTF8Encoding]::new($false)
$completed = 0
foreach ($item in @($manifest.items) | Select-Object -First $Limit) {
    if ($item.key -notmatch '^[A-Za-z0-9_-]+$') { throw 'Invalid evidence key' }
    $imagePath = (Resolve-Path -LiteralPath $item.imagePath).Path
    $fileInfo = Get-Item -LiteralPath $imagePath
    if ($fileInfo.Length -gt 20971520) { throw 'Evidence image exceeds 20 MiB' }
    $beforeHash = Get-ImageSha256 $imagePath
    if ($beforeHash -cne $item.imageSha256) { throw "Source image checksum mismatch: $($item.key)" }
    $stream = $null
    $bitmap = $null
    try {
        $file = Wait-WinRt ([Windows.Storage.StorageFile]::GetFileFromPathAsync($imagePath)) ([Windows.Storage.StorageFile])
        $stream = Wait-WinRt ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
        $decoder = Wait-WinRt ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $bitmap = Wait-WinRt ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        $maximum = [Windows.Media.Ocr.OcrEngine]::MaxImageDimension
        if ($bitmap.PixelWidth -gt $maximum -or $bitmap.PixelHeight -gt $maximum) { throw "Image exceeds OCR MaxImageDimension: $maximum" }
        if ($bitmap.PixelWidth -ne $item.width -or $bitmap.PixelHeight -ne $item.height) { throw 'Image dimensions differ from manifest' }
        $result = Wait-WinRt ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
        $lines = @($result.Lines | ForEach-Object {
            [ordered]@{
                text = $_.Text
                words = @($_.Words | ForEach-Object {
                    [ordered]@{ text = $_.Text; bounds = @($_.BoundingRect.X, $_.BoundingRect.Y, $_.BoundingRect.Width, $_.BoundingRect.Height) }
                })
            }
        })
        $afterHash = Get-ImageSha256 $imagePath
        if ($afterHash -cne $beforeHash) { throw 'Image changed during recognition' }
        $evidence = [ordered]@{
            schemaVersion = 1; key = $item.key; sourceRecordId = $item.sourceRecordId
            sourceNumber = $item.sourceNumber; questionId = $item.questionId
            engine = 'Windows.Media.Ocr'; language = $engine.RecognizerLanguage.LanguageTag
            imagePath = $imagePath; imageSha256 = $beforeHash; width = $bitmap.PixelWidth; height = $bitmap.PixelHeight
            maxImageDimension = $maximum; textAngle = $result.TextAngle; text = $result.Text; lines = $lines
            decision = 'unreviewed'; databaseWritten = $false
        }
        $json = ConvertTo-Json -InputObject $evidence -Depth 12
        [IO.File]::WriteAllText((Join-Path $outputPath ($item.key + '.json')), $json, $encoding)
        $completed += 1
        if ($completed % 20 -eq 0) { Write-Output "Recognized $completed original images" }
    } finally {
        if ($null -ne $bitmap) { $bitmap.Dispose() }
        if ($null -ne $stream) { $stream.Dispose() }
    }
}
Write-Output "Recognized $completed images; results remain unreviewed; databaseWritten=false"
