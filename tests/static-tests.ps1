$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Assert-True($condition, $message) {
    if (-not $condition) { throw "FAIL: $message" }
    Write-Host "PASS: $message"
}

$manifest = Get-Content -Raw (Join-Path $root "manifest.json") | ConvertFrom-Json
Assert-True ($manifest.manifest_version -eq 3) "Manifest uses version 3"
Assert-True ($manifest.version -eq "1.6.0") "Manifest version is 1.6.0"
Assert-True ($manifest.devtools_page -eq "devtools.html") "DevTools entry point is configured"
Assert-True (-not $manifest.permissions) "No extension permissions are requested"

$required = @(
    "manifest.json", "devtools.html", "devtools.js", "sidebar/sidebar.html",
    "sidebar/sidebar.css", "sidebar/sidebar.js", "lib/inspector-source.js",
    "README.md", "CHANGELOG.md", "LICENSE", "CONTRIBUTING.md", "PRIVACY.md", "tests/relevance-tests.html", "tests/state-tests.html", "tests/conditional-tests.html", "tests/tree-cleanup-tests.html", "tests/json-format-tests.html"
)
foreach ($file in $required) {
    Assert-True (Test-Path (Join-Path $root $file)) "$file exists"
}

$inspector = Get-Content -Raw (Join-Path $root "lib/inspector-source.js")
Assert-True ($inspector.Contains('const VERSION = "1.6.0"')) "JSON metadata version matches manifest"
Assert-True ($inspector.Contains('getComputedStyle')) "Computed styles are inspected"
Assert-True ($inspector.Contains('document.styleSheets')) "Accessible authored stylesheets are inspected"
Assert-True ($inspector.Contains('document.adoptedStyleSheets')) "Constructed stylesheets are inspected"
Assert-True ($inspector.Contains('recordAccessIssue(rule.styleSheet')) "Stylesheet import access failures are isolated"
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
Assert-True ($inspector.Contains('conditionalCSS')) "Elements expose conditional CSS"
Assert-True ($inspector.Contains('currentlyMatches')) "Media applicability is recorded"
Assert-True ($inspector.Contains('recordAccessIssue')) "Stylesheet access failures are collected once"
Assert-True ($inspector.Contains('recoveredStyleSheets') -and $inspector.Contains('recoveredRules')) "Blocked stylesheet resources are recovered"
Assert-True ($inspector.Contains('cleanTextNode')) "Text-node boundary cleanup is implemented"
Assert-True ($inspector.Contains('preservesWhitespace')) "Whitespace-sensitive contexts are detected"
Assert-True ($inspector.Contains('NON_RENDERING_ELEMENTS')) "Infrastructure elements use a centralized exclusion set"
Assert-True (-not $inspector.Contains('for (const name of names) output[name]')) "Raw computed styles are not dumped"
Assert-True ($inspector.Contains('getBoundingClientRect')) "Element dimensions are inspected"
Assert-True ($inspector.Contains('subTreeElements')) "Nested element output is implemented"
Assert-True ($inspector.Contains('Node.TEXT_NODE')) "Direct text nodes are inspected"
Assert-True ($inspector.Contains('["input", "select", "option"]')) "Input and select text is excluded"
Assert-True ($inspector.Contains('tagName === "pre" || tagName === "textarea"')) "Textarea whitespace is preserved"
Assert-True ($inspector.Contains('::before') -and $inspector.Contains('::after')) "Pseudo-elements are inspected"
Assert-True ($inspector.Contains('outerHTML: selected.outerHTML')) "JSON includes exact selected-element outerHTML"
Assert-True ($inspector.Contains('combineStyleDefinitions') -and $inspector.Contains('computedCSSRef')) "Repeated JSON styles can use definitions"
Assert-True ($inspector.Contains('_about:')) "JSON includes a concise report description"
Assert-True ($inspector.Contains('CSS Tree Inspector by 24Moves.com')) "JSON identifies the report generator"
Assert-True ($inspector.Contains('Math.round(value * 1000) / 1000')) "Dimensions are rounded to three decimal places"

$rootElementPosition = $inspector.IndexOf('rootElement,')
$outerHtmlPosition = $inspector.IndexOf('outerHTML: selected.outerHTML')
Assert-True ($outerHtmlPosition -gt $rootElementPosition) "outerHTML is the final top-level JSON property"

$gitignore = Get-Content -Raw (Join-Path $root ".gitignore")
Assert-True ($gitignore.Contains('/test-result.txt')) "Local test-result.txt is ignored"

$changelog = Get-Content -Raw (Join-Path $root "CHANGELOG.md")
Assert-True ($changelog.Contains('## [1.5.0]') -and $changelog.Contains('## [1.4.0]') -and $changelog.Contains('## [1.3.0]') -and $changelog.Contains('## [1.2.0]') -and $changelog.Contains('## [1.1.0]') -and $changelog.Contains('## [1.0.0]')) "Changelog contains all releases"

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

$conditionalFixture = Get-Content -Raw (Join-Path $root "tests/conditional-tests.html")
foreach ($case in @('(max-width: 800px)', '(min-width: 1200px)', '@media print', '(orientation: portrait)', '(prefers-color-scheme: dark)', '(prefers-reduced-motion: reduce)', '(hover: hover)', '(pointer: coarse)', '@container sidebar', 'media,container', 'container,media')) {
    Assert-True ($conditionalFixture.Contains($case)) "Conditional browser fixture covers $case"
}

$sidebarHtml = Get-Content -Raw (Join-Path $root "sidebar/sidebar.html")
$sidebarCss = Get-Content -Raw (Join-Path $root "sidebar/sidebar.css")
Assert-True ($sidebarHtml.IndexOf('id="jsonAction"') -lt $sidebarHtml.IndexOf('id="cssAction"')) "JSON action appears before CSS action"
Assert-True ($sidebarHtml.Contains('Generate Tree JSON') -and $sidebarHtml.Contains('Generate Tree CSS')) "Action labels are updated"
Assert-True ($sidebarHtml.Contains('Include HTML Attributes')) "Attribute inclusion option is available"
Assert-True ($sidebarHtml.Contains('value="embed" checked') -and $sidebarHtml.Contains('value="definitions"')) "JSON CSS format options are available"
Assert-True ($sidebarHtml.Contains('Easier to read, larger report') -and $sidebarHtml.Contains('Compact, fewer tokens')) "JSON CSS format tradeoffs are explained"
Assert-True ($sidebarHtml.Contains('<legend>JSON Options</legend>') -and $sidebarHtml.IndexOf('<fieldset class="options-group">') -lt $sidebarHtml.IndexOf('<div class="actions">')) "JSON options appear above generation actions"
Assert-True ($sidebarHtml.Contains('id="resultViewer"') -and $sidebarHtml.Contains('hidden')) "Result controls start hidden"
Assert-True ($sidebarCss.Contains('.actions { display: flex')) "Primary actions use side-by-side flex layout"
Assert-True ($sidebarHtml.Contains('<span class="label">Selected:</span>') -and $sidebarCss.Contains('.selection-current')) "Selected label and node share one line"
Assert-True ($sidebarHtml.Contains('id="workingOverlay"') -and $sidebarCss.Contains('.working-overlay.is-visible') -and $sidebarCss.Contains('@keyframes spin')) "Generation overlay and spinner are implemented"

$jsonFormatFixture = Get-Content -Raw (Join-Path $root "tests/json-format-tests.html")
foreach ($case in @('includeAllAttributes: false', 'includeAllAttributes: true', 'combineStyles: true', 'computedCSSRef', 'three decimal places')) {
    Assert-True ($jsonFormatFixture.Contains($case)) "JSON format fixture covers $case"
}

Write-Host "All static tests passed."
