# CSS Tree Inspector

![CSS Tree Inspector](icons/CSS%20Tree%20Inspector.png)

[![Version](https://img.shields.io/badge/version-1.6.1-blue)](CHANGELOG.md)
![Chrome DevTools](https://img.shields.io/badge/Chrome-DevTools-4285F4?logo=googlechrome\&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-5f6368)
[![License: MIT](https://img.shields.io/github/license/ext237/css-tree-inspector)](LICENSE)

**A Chrome DevTools extension for extracting the HTML and CSS context needed to diagnose styling problems or share focused context with AI.**

## Download

**[Download the latest Chrome-ready release](https://github.com/ext237/css-tree-inspector/releases)**

See [INSTALLATION.md](INSTALLATION.md) for the brief installation instructions.

## Why CSS Tree Inspector?

AI can only troubleshoot the code it can see.

Providing an AI assistant with an element's HTML alone can lead to bad CSS recommendations because the element's appearance may also depend on inherited styles, custom properties, media queries, pseudo-classes such as `:hover`, pseudo-elements, and surrounding DOM relationships.

Providing the entire page and every stylesheet solves that problem by creating another one: huge, noisy prompts that waste tokens and make the relevant code harder to identify.

CSS Tree Inspector extracts the selected DOM subtree and the CSS information most useful for diagnosis. It can generate a readable CSS report or a structured JSON report that can be reviewed directly or provided to an AI assistant.

All inspection happens locally inside Chrome DevTools.

## Features

* Generates readable, relevant computed CSS for a selected element and its descendants instead of dumping the complete `getComputedStyle()` namespace.
* Produces valid nested JSON containing attributes, dimensions, direct text nodes, computed CSS, pseudo-element data, and the selected subtree's exact outer HTML.
* Prioritizes direct text in each JSON element and omits empty optional fields for a more compact report.
* Includes visual and state-related HTML attributes by default, with an option to include all HTML attributes.
* Captures authored state rules such as `:hover`, `:focus-visible`, and `:focus-within`, including states involving ancestors, siblings, and related descendants.
* Preserves available `@media`, `@supports`, `@container`, `@layer`, and similar grouping context for captured state rules.
* Captures relevant active and inactive media and container-query rules in each element's `conditionalCSS` array.
* Recovers available cross-origin stylesheet content through Chrome DevTools and applies the same focused selector and cascade analysis without requesting host or debugger permissions, including inactive media-query rules.
* Cleans source-formatting whitespace from text nodes while preserving meaningful inline and whitespace-sensitive content.
* Excludes non-rendering infrastructure elements from the inspection tree while retaining hidden ordinary elements and unchanged `outerHTML`.
* Keeps reports visible when the DevTools selection changes and marks them as stale.
* Copies reports only when you click **Copy**.
* Supports Chrome DevTools light and dark themes.
* Uses no analytics and makes no network requests.

## Known Limitations

* CSS Tree Inspector captures computed values and relevant authored rules, but does not provide complete stylesheet provenance or every overridden declaration.
  * **Mitigation (v1.2.0):** Matches accessible authored rules, resolves ordinary cascade priority, and reports final browser-computed values only for relevant properties.
* Shadow DOM contents are not currently traversed. An encountered open shadow root is noted in JSON.
  * **Mitigation (v1.0.0):** Detects encountered open shadow roots and explicitly marks them as unsupported instead of silently presenting an incomplete subtree.
* Inspection inside unusual iframe execution contexts may depend on Chrome DevTools behavior.
  * **Mitigation (v1.0.0):** Runs through Chrome's inspected-window context and follows the active Elements-panel selection when Chrome exposes that context.
* Cross-origin stylesheet recovery depends on the stylesheet being available as a Chrome DevTools resource. Unavailable, unsupported, or unparseable resources are reported rather than replaced with a large computed-style dump.
  * **Mitigation (v1.6.0):** Recovers already-loaded stylesheet content through Chrome DevTools, then reruns focused selector, cascade, state, and conditional-rule analysis without host or debugger permissions.
* Cascade layers, complex selector specificity, animations, transitions, and browser or user styles can affect computed values in ways that standard page APIs cannot always attribute precisely.
  * **Mitigation (v1.2.0-v1.4.0):** Resolves ordinary importance, specificity, source order, inheritance, and custom-property dependencies while preserving available state and conditional at-rule context.
* Selectors unsupported by the current browser, or selectors that cannot be safely analyzed, are skipped rather than forced.
  * **Mitigation (v1.3.0):** Uses the browser selector engine, structured state-selector analysis, and non-mutating potential matching; unsafe branches are isolated so inspection can continue.
* Very large DOM subtrees can produce large reports and require additional processing time.
  * **Mitigation (v1.2.0 and v1.6.0):** Limits output to relevant CSS, omits empty JSON fields, optionally replaces exact duplicate styles with shared `styleDefinitions` references, and displays a processing indicator while generation is underway. Inspection remains complete; CSS Tree Inspector does not truncate the subtree or impose node/depth limits for performance.
* Generated CSS selectors are readable paths relative to the selected root and are not guaranteed to be globally unique production selectors.
  * **Mitigation (v1.0.0):** Builds deterministic root-relative paths using tag names, IDs, and classes to keep generated reports readable and internally consistent.

## Installation

See [INSTALLATION.md](INSTALLATION.md) to install a Chrome-ready release as an unpacked extension.

## Usage

1. Select an element in the DevTools **Elements** panel.
2. Open the **CSS Tree Inspector** sidebar.
3. Click **Generate Tree JSON** or **Generate Tree CSS**.
4. Review the report or click **Copy** to place it on the clipboard.

Use **Refresh** to regenerate the report or **Clear** to remove it.

Enable **Include HTML Attributes** before generating or refreshing JSON to include all attributes. When unchecked, the report retains common visual/state attributes and `name`, while omitting unrelated metadata such as most `data-*` attributes. `id` and `class` remain available through their dedicated fields in either mode.

Choose **Embed CSS in each DOM node** for an easier-to-read but larger report. Choose **Combine duplicate CSS into definitions** for a compact report that moves repeated computed, state, and conditional CSS into top-level `styleDefinitions`, reducing token use. Unique CSS remains inline.

Both JSON-specific controls are grouped under **JSON Options** above the generation buttons.

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

When present, `textNodes` is the first property in an element object. Empty optional properties—including text, attributes, computed CSS, state CSS, conditional CSS, pseudo-elements, shadow-root data, and descendant arrays—are omitted rather than emitted with empty or null values.

In combined mode, exact duplicate styles use `computedCSSRef`, `stateCSSRef`, or `conditionalCSSRef`. Definitions receive stable names such as `computed-1` in DOM encounter order. Embedded mode remains the default.

Combined reports instruct readers to resolve `*CSSRef` values through `styleDefinitions`.

## CSS Output

CSS output follows document order for the selected element and its descendants. Within each generated rule, computed properties are sorted alphabetically. Captured authored state and conditional rules retain stylesheet source order.

CSS Tree Inspector examines accessible stylesheet rules and inline declarations that match each element, resolves ordinary cascade priority, and exports final browser-computed values only for properties determined to be relevant.

Inherited declarations are retained when their computed values affect the inspected element.

When a relevant declaration uses `var()`, CSS Tree Inspector retains the authored custom property and recursively referenced custom properties while omitting unrelated global custom properties.

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

When page-level CSSOM blocks a stylesheet, CSS Tree Inspector attempts to recover its already-loaded content through Chrome DevTools and reruns the same focused matching and cascade analysis. Stylesheets that remain unavailable are reported once in `corsIssues`; CSS export includes the same diagnostic as a comment.

Recovered stylesheets retain active and inactive `@media` rules. Relevant inactive rules remain in `conditionalCSS` with `currentlyMatches: false`; they do not alter the element's current `computedCSS`.

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
