param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = "Stop"
$manifest = Get-Content -Raw (Join-Path $ProjectRoot "manifest.json") | ConvertFrom-Json
$distDirectory = Join-Path $ProjectRoot "dist"
$archivePath = Join-Path $distDirectory "css-tree-inspector-$($manifest.version).zip"
$stagingDirectory = Join-Path $distDirectory ".package-$($manifest.version)"

New-Item -ItemType Directory -Force -Path $distDirectory | Out-Null
if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath }
if (Test-Path -LiteralPath $stagingDirectory) { Remove-Item -LiteralPath $stagingDirectory -Recurse -Force }
New-Item -ItemType Directory -Path $stagingDirectory | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stagingDirectory "icons") | Out-Null

foreach ($file in @("manifest.json", "devtools.html", "devtools.js")) {
    Copy-Item -LiteralPath (Join-Path $ProjectRoot $file) -Destination $stagingDirectory
}
foreach ($directory in @("sidebar", "lib")) {
    Copy-Item -LiteralPath (Join-Path $ProjectRoot $directory) -Destination $stagingDirectory -Recurse
}
foreach ($icon in @("icon16.png", "icon32.png", "icon48.png", "icon128.png")) {
    Copy-Item -LiteralPath (Join-Path $ProjectRoot "icons/$icon") -Destination (Join-Path $stagingDirectory "icons")
}

try {
    Compress-Archive -Path (Join-Path $stagingDirectory "*") -DestinationPath $archivePath -CompressionLevel Optimal
} finally {
    Remove-Item -LiteralPath $stagingDirectory -Recurse -Force
}
Write-Host "Created $archivePath"
