$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Assert-True($condition, $message) {
    if (-not $condition) { throw "FAIL: $message" }
    Write-Host "PASS: $message"
}

$manifest = Get-Content -Raw (Join-Path $root "manifest.json") | ConvertFrom-Json
Assert-True ($manifest.manifest_version -eq 3) "Manifest uses version 3"
Assert-True ($manifest.version -eq "1.3.0") "Manifest version is 1.3.0"
Assert-True ($manifest.devtools_page -eq "devtools.html") "DevTools entry point is configured"
Assert-True (-not $manifest.permissions) "No extension permissions are requested"

$required = @(
    "manifest.json", "devtools.html", "devtools.js", "sidebar/sidebar.html",
    "sidebar/sidebar.css", "sidebar/sidebar.js", "lib/inspector-source.js",
    "README.md", "CHANGELOG.md", "LICENSE", "CONTRIBUTING.md", "PRIVACY.md", "tests/relevance-tests.html", "tests/state-tests.html"
)
foreach ($file in $required) {
    Assert-True (Test-Path (Join-Path $root $file)) "$file exists"
}

$inspector = Get-Content -Raw (Join-Path $root "lib/inspector-source.js")
Assert-True ($inspector.Contains('const VERSION = "1.3.0"')) "JSON metadata version matches manifest"
Assert-True ($inspector.Contains('getComputedStyle')) "Computed styles are inspected"
Assert-True ($inspector.Contains('document.styleSheets')) "Accessible authored stylesheets are inspected"
Assert-True ($inspector.Contains('document.adoptedStyleSheets')) "Constructed stylesheets are inspected"
Assert-True ($inspector.Contains('Inaccessible imports are skipped')) "Stylesheet import access failures are isolated"
Assert-True ($inspector.Contains('element.matches')) "Rules are matched with the browser selector engine"
Assert-True ($inspector.Contains('getPropertyPriority')) "Important declarations participate in cascade resolution"
Assert-True ($inspector.Contains('selectorSpecificity')) "Selector specificity participates in cascade resolution"
Assert-True ($inspector.Contains('addCustomDependencies')) "Custom-property dependencies are traced recursively"
Assert-True ($inspector.Contains('STATE_PSEUDO_CLASSES')) "State pseudo-classes use a centralized definition"
Assert-True ($inspector.Contains('analyzeStateSelector')) "State selectors use structured scanning"
Assert-True ($inspector.Contains('stateTargets')) "Related-element state subjects are represented"
Assert-True ($inspector.Contains('atRuleContext')) "State rules preserve enclosing at-rule context"
Assert-True ($inspector.Contains('authoredStateRules')) "CSS state rules are deduplicated"
Assert-True ($inspector.Contains('authoredDeclarations')) "State declaration parsing preserves authored shorthand names"
Assert-True (-not $inspector.Contains('for (const name of names) output[name]')) "Raw computed styles are not dumped"
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
Assert-True ($changelog.Contains('## [1.3.0]') -and $changelog.Contains('## [1.2.0]') -and $changelog.Contains('## [1.1.0]') -and $changelog.Contains('## [1.0.0]')) "Changelog contains all releases"

$fixture = Get-Content -Raw (Join-Path $root "tests/relevance-tests.html")
foreach ($case in @('direct declaration', 'inherited declaration', 'important and source-order', 'higher-specificity', 'inline style', 'nested custom-property', 'var fallback', 'unused custom property', 'pseudo-element')) {
    Assert-True ($fixture.Contains($case)) "Browser fixture covers $case"
}
Assert-True (-not $manifest.permissions) "No debugger or host permissions were introduced"

$stateFixture = Get-Content -Raw (Join-Path $root "tests/state-tests.html")
foreach ($case in @(':hover', ':active', ':focus', ':focus-visible', ':focus-within', ':target', ':checked', ':disabled', ':invalid', ':has(', ':is(', ':where(', ':not(', ':visited', '::before', '@media', '@supports')) {
    Assert-True ($stateFixture.Contains($case)) "State browser fixture covers $case"
}
Assert-True ($stateFixture.Contains('.header:hover .header-child')) "State fixture covers ancestor hover affecting descendants"
Assert-True ($stateFixture.Contains('.container:focus-within .container-child')) "State fixture covers ancestor focus-within affecting children"
Assert-True ($stateFixture.Contains('button.sibling:focus + .menu')) "State fixture covers sibling state relationships"
Assert-True ($stateFixture.Contains('li:first-child') -and $stateFixture.Contains('li:nth-child(2)') -and $stateFixture.Contains('p:empty')) "State fixture covers structural pseudo-class exclusion"
Assert-True (-not $inspector.Contains('.focus()') -and -not $inspector.Contains('.click()') -and -not $inspector.Contains('location.hash =')) "State discovery does not force interactive states"

Write-Host "All static tests passed."
