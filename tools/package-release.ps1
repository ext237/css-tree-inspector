param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = "Stop"
$manifest = Get-Content -Raw (Join-Path $ProjectRoot "manifest.json") | ConvertFrom-Json
$distDirectory = Join-Path $ProjectRoot "dist"
$archivePath = Join-Path $distDirectory "css-tree-inspector-$($manifest.version).zip"

New-Item -ItemType Directory -Force -Path $distDirectory | Out-Null
if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath }

$releaseFiles = @(
    "manifest.json", "devtools.html", "devtools.js", "sidebar", "lib", "icons"
) | ForEach-Object { Join-Path $ProjectRoot $_ }

Compress-Archive -Path $releaseFiles -DestinationPath $archivePath -CompressionLevel Optimal
Write-Host "Created $archivePath"
