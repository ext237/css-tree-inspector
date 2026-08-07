# CSS Tree Inspector

[![Version](https://img.shields.io/badge/version-1.5.0-blue)](CHANGELOG.md)
![Chrome DevTools](https://img.shields.io/badge/Chrome-DevTools-4285F4?logo=googlechrome\&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-5f6368)
[![License: MIT](https://img.shields.io/github/license/ext237/css-tree-inspector)](LICENSE)

**A Chrome DevTools extension for extracting the HTML and CSS context needed to diagnose styling problems or share focused context with AI.**

## Why CSS Tree Inspector?

AI can only troubleshoot the code it can see.

Providing an AI assistant with an element's HTML alone can lead to bad CSS recommendations because the element's appearance may also depend on inherited styles, custom properties, media queries, pseudo-classes such as `:hover`, pseudo-elements, and surrounding DOM relationships.

Providing the entire page and every stylesheet solves that problem by creating another one: huge, noisy prompts that waste tokens and make the relevant code harder to identify.

CSS Tree Inspector extracts the selected DOM subtree and the CSS information most useful for diagnosis. It can generate a readable CSS report or a structured JSON report that can be reviewed directly or provided to an AI assistant.

All inspection happens locally inside Chrome DevTools.

## Features

* Generates readable, relevant computed CSS for a selected element and its descendants instead of dumping the complete `getComputedStyle()` namespace.
* Produces valid nested JSON containing attributes, dimensions, direct text nodes, computed CSS, pseudo-element data, and the selected subtree's exact outer HTML.
* Captures authored state rules such as `:hover`, `:focus-visible`, and `:focus-within`, including states involving ancestors, siblings, and related descendants.
* Preserves available `@media`, `@supports`, `@container`, `@layer`, and similar grouping context for captured state rules.
* Captures relevant active and inactive media and container-query rules in each element's `conditionalCSS` array.
* Cleans source-formatting whitespace from text nodes while preserving meaningful inline and whitespace-sensitive content.
* Excludes non-rendering infrastructure elements from the inspection tree while retaining hidden ordinary elements and unchanged `outerHTML`.
* Keeps reports visible when the DevTools selection changes and marks them as stale.
* Copies reports only when you click **Copy**.
* Supports Chrome DevTools light and dark themes.
* Uses no analytics and makes no network requests.

## Known Limitations

* CSS Tree Inspector captures computed values and relevant authored rules, but does not provide complete stylesheet provenance or every overridden declaration.
* Shadow DOM contents are not currently traversed. An encountered open shadow root is noted in JSON.
* Inspection inside unusual iframe execution contexts may depend on Chrome DevTools behavior.
* Cross-origin stylesheets whose `cssRules` Chrome does not expose cannot be analyzed at the source-rule level.
* Cascade layers, complex selector specificity, animations, transitions, and browser or user styles can affect computed values in ways that standard page APIs cannot always attribute precisely.
* Selectors unsupported by the current browser, or selectors that cannot be safely analyzed, are skipped rather than forced.
* Very large DOM subtrees can produce large reports and require additional processing time.
* Generated CSS selectors are readable paths relative to the selected root and are not guaranteed to be globally unique production selectors.

## Installation

### Install as an unpacked extension

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the project directory.
5. Open or reload Chrome DevTools.
6. Select **Elements**, then open the **CSS Tree Inspector** sidebar.

After modifying extension files, click **Reload** on the extension card and reopen DevTools.

A Chrome Web Store installation link will be added after publication.

## Usage

1. Select an element in the DevTools **Elements** panel.
2. Open the **CSS Tree Inspector** sidebar.
3. Click **View CSS Tree From This Node** or **View CSS and Elements Tree as JSON**.
4. Review the report or click **Copy** to place it on the clipboard.

Use **Refresh** to regenerate the report or **Clear** to remove it.

## CSS Output

CSS output contains alphabetically sorted computed properties for the selected element and its descendants.

CSS Tree Inspector examines accessible stylesheet rules and inline declarations that match each element, resolves ordinary cascade priority, and exports final browser-computed values only for properties determined to be relevant.

Inherited declarations are retained when their computed values affect the inspected element.

When a relevant declaration uses `var()`, CSS Tree Inspector retains the authored custom property and recursively referenced custom properties while omitting unrelated global custom properties.

## JSON Output

JSON output describes the selected DOM subtree and includes:

* Element names and attributes
* Dimensions
* Direct text nodes
* Relevant computed CSS
* Stateful CSS rules
* `::before` and `::after` pseudo-element information
* Nested descendants under `subTreeElements`
* The selected subtree's exact `outerHTML`

The `outerHTML` value is equivalent to Chrome Elements' **Copy outerHTML** result.

## Stateful CSS

Each JSON element includes a `stateCSS` array.

`computedCSS` describes the element's current rendered state. `stateCSS` contains authored declarations that could apply under pseudo-class conditions without requiring CSS Tree Inspector to activate those states.

For example:

```css
.header:hover .title {
    color: red;
}
```

The `.title` element can receive this rule in its `stateCSS` data even though the `:hover` state was not active during inspection.

State analysis supports relationships involving ancestors, siblings, descendants, `:has()`, multiple simultaneous states, and states inside selectors such as `:is()`, `:where()`, and `:not()`.

Pseudo-element state rules are stored under the corresponding `pseudoElements.before.stateCSS` or `pseudoElements.after.stateCSS` array.

CSS Tree Inspector does not hover, focus, click, toggle, or otherwise modify the inspected page. Authored `:visited` rules may be reported, but the extension never attempts to determine browsing history.

## Conditional CSS

Each element includes a `conditionalCSS` array containing relevant authored rules nested under `@media` or `@container`. Inactive media rules are retained, and `currentlyMatches` reports current `matchMedia()` applicability. Container-query applicability is left as `null` because standard page APIs do not expose a reliable equivalent. Nested media/container contexts and conditional state selectors are preserved without flattening them into unconditional CSS.

Stylesheets blocked by browser cross-origin protections are reported once in `corsIssues`; CSS export includes the same diagnostic as a comment. CSS Tree Inspector does not bypass those protections.

## Privacy

All inspection happens locally.

CSS Tree Inspector does not transmit or remotely store inspected page data and requests no browsing, host, cookie, history, or network permissions.

It does not require Chrome's `debugger` permission.

See [PRIVACY.md](PRIVACY.md) for details.

CSS Tree Inspector uses plain JavaScript, HTML, and CSS. It has no build step or runtime dependencies.

Run the structural tests in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\static-tests.ps1
```

Browser-level tests are available in:

```text
tests/relevance-tests.html
tests/state-tests.html
tests/conditional-tests.html
```

These tests cover CSS relevance, direct and related state selectors, pseudo-elements, at-rules, structural exclusions, visited links, deduplication, and `outerHTML` behavior.

Regenerate extension icons:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\generate-icons.ps1
```

Create a versioned Chrome Web Store archive in `dist/`:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\package-release.ps1
```



## Contributing

Bug reports and pull requests are welcome.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history and notable changes.

## License

Licensed under the [MIT License](LICENSE).

© 2026 24Moves / Joe Lippeatt / [24moves.com](https://24moves.com)
