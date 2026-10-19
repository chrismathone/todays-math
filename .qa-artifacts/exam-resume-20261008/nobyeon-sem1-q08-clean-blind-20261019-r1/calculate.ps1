$ErrorActionPreference = 'Stop'
# Printed algebra only; no image-coordinate or pixel measurements.
# A=(x+2)^2, B=(2x-3)^2. Positive sides are abs(x+2), abs(2x-3).
# Solve each linear equation on every interval separated by -2 and 3/2.
$cases = @(
    @{interval='x < -2'; aSlope=-1; aIntercept=-2; bSlope=-2; bIntercept=3},
    @{interval='-2 < x < 3/2'; aSlope=1; aIntercept=2; bSlope=-2; bIntercept=3},
    @{interval='x > 3/2'; aSlope=1; aIntercept=2; bSlope=2; bIntercept=-3}
)
$rows = foreach ($case in $cases) {
    $x = (2 + $case.bIntercept - $case.aIntercept) / ($case.aSlope - $case.bSlope)
    $inInterval = switch ($case.interval) {
        'x < -2' { $x -lt -2 }
        '-2 < x < 3/2' { $x -gt -2 -and $x -lt 1.5 }
        'x > 3/2' { $x -gt 1.5 }
    }
    $a = [Math]::Abs($x+2)
    $b = [Math]::Abs(2*$x-3)
    [ordered]@{interval=$case.interval; candidate=$x; inInterval=$inInterval; aCm=$a; bCm=$b; areaA=$x*$x+4*$x+4; areaB=4*$x*$x-12*$x+9; positive=($a -gt 0 -and $b -gt 0); differenceCm=($a-$b); accepted=($inInterval -and $a -gt 0 -and $b -gt 0 -and $a-$b -eq 2)}
}
$roots = @($rows | Where-Object {$_.accepted} | ForEach-Object {$_.candidate})
$sum = ($roots | Measure-Object -Sum).Sum
$choices = for ($i=0; $i -lt 5; $i++) { $v=@(1,2,3,4,6)[$i]; [ordered]@{choice=$i+1; value=$v; matchesSum=($v -eq $sum)} }
$result = [ordered]@{method='Piecewise linear equations from positive square roots of printed areas'; excludedBoundaryPoints=@(-2,1.5); cases=@($rows); roots=$roots; sum=$sum; choices=@($choices)}
if ($roots.Count -ne 2 -or $sum -ne 4) { throw 'Independent calculation failed' }
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'calculations.json'), ($result | ConvertTo-Json -Depth 12)+"`n", [Text.UTF8Encoding]::new($false))
$result | ConvertTo-Json -Depth 12
