$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Assert-True($condition, $message) {
    if (-not $condition) { throw "FAIL: $message" }
    Write-Host "PASS: $message"
}

$manifest = Get-Content -Raw (Join-Path $root "manifest.json") | ConvertFrom-Json
Assert-True ($manifest.manifest_version -eq 3) "Manifest uses version 3"
Assert-True ($manifest.version -eq "1.1.0") "Manifest version is 1.1.0"
Assert-True ($manifest.devtools_page -eq "devtools.html") "DevTools entry point is configured"
Assert-True (-not $manifest.permissions) "No extension permissions are requested"

$required = @(
    "manifest.json", "devtools.html", "devtools.js", "sidebar/sidebar.html",
    "sidebar/sidebar.css", "sidebar/sidebar.js", "lib/inspector-source.js",
    "README.md", "CHANGELOG.md", "LICENSE", "CONTRIBUTING.md", "PRIVACY.md"
)
foreach ($file in $required) {
    Assert-True (Test-Path (Join-Path $root $file)) "$file exists"
}

$inspector = Get-Content -Raw (Join-Path $root "lib/inspector-source.js")
Assert-True ($inspector.Contains('const VERSION = "1.1.0"')) "JSON metadata version matches manifest"
Assert-True ($inspector.Contains('getComputedStyle')) "Computed styles are inspected"
Assert-True ($inspector.Contains('getBoundingClientRect')) "Element dimensions are inspected"
Assert-True ($inspector.Contains('subTreeElements')) "Nested element output is implemented"
Assert-True ($inspector.Contains('Node.TEXT_NODE')) "Direct text nodes are inspected"
Assert-True ($inspector.Contains('"textarea"')) "Form-control text is excluded"
Assert-True ($inspector.Contains('::before') -and $inspector.Contains('::after')) "Pseudo-elements are inspected"
Assert-True ($inspector.Contains('outerHTML: selected.outerHTML')) "JSON includes exact selected-element outerHTML"

$rootElementPosition = $inspector.IndexOf('rootElement: inspectElement(selected, selected)')
$outerHtmlPosition = $inspector.IndexOf('outerHTML: selected.outerHTML')
Assert-True ($outerHtmlPosition -gt $rootElementPosition) "outerHTML is the final top-level JSON property"

$gitignore = Get-Content -Raw (Join-Path $root ".gitignore")
Assert-True ($gitignore.Contains('/test-result.txt')) "Local test-result.txt is ignored"

$changelog = Get-Content -Raw (Join-Path $root "CHANGELOG.md")
Assert-True ($changelog.Contains('## [1.1.0]') -and $changelog.Contains('## [1.0.0]')) "Changelog contains 1.1.0 and 1.0.0 releases"

Write-Host "All static tests passed."
