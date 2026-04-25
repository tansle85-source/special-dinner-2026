$path = "src\components\Admin.jsx"
$lines = Get-Content $path
$newLines = $lines[0..964] + $lines[1105..($lines.Length - 1)]
Set-Content -Path $path -Value $newLines -Encoding UTF8
Write-Host "Done. Lines remaining: $($newLines.Length)"
