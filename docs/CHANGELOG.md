# Changelog

All notable changes to CSS Tree Inspector are documented here.

This project follows [Semantic Versioning](https://semver.org/).

Chrome-ready packages and release notes are available on the [GitHub Releases page](https://github.com/ext237/css-tree-inspector/releases).

## [1.6.1] - 2026-08-07

### Documentation

- Expanded each known limitation with versioned notes describing the mitigation already implemented.
- Clarified that large-subtree mitigation preserves complete traversal and uses the v1.6 processing indicator rather than node or depth limits.

### Fixed

- Reset the sidebar to its default state after the inspected page refreshes or navigates, and prevented an interrupted generation from restoring obsolete output.

## [1.6.0] - 2026-08-07

### Added

- Added an unchecked **Include HTML Attributes** option. Default JSON retains common visual/state attributes and `name`; enabling the option includes all attributes except duplicated `id` and `class` fields.
- Added focused recovery of CSSOM-blocked stylesheet content through Chrome DevTools resources, including relevant inactive media-query rules and current match status, without adding host or debugger permissions.
- Added a JSON formatting option that can move exact duplicate computed, state, and conditional CSS into top-level `styleDefinitions` with stable per-node references; embedded CSS remains the default.

### Changed

- Moved `textNodes` to the first property of each element when text is present.
- Omitted empty optional JSON fields, including attributes, computed/state/conditional CSS, pseudo-elements, shadow-root data, and descendant arrays.
- Removed the redundant pseudo-element `exists` field; the presence of `before` or `after` now indicates a visible pseudo-element.
- Added a short top-level `_about` description explaining the report's nested DOM structure and visual-debugging purpose.
- Rounded element dimension values to a maximum of three decimal places.
- Omitted empty `atRuleContext` and `conditions` metadata from state rules while retaining populated conditional context.
- Grouped JSON-only controls under **JSON Options** above the generation buttons.
- Added combined-report instructions for resolving `*CSSRef` values and identified the generator as **CSS Tree Inspector by 24Moves.com**.
- Clarified the JSON CSS-format tradeoffs in the interface and top-aligned wrapped option labels with their radio controls.
- Placed the selected-node label and value on one line and added a subtle animated processing overlay for report generation.

### Documentation

- Added the project image to the top of the README.
- Moved unpacked-extension instructions to a dedicated installation guide.
- Prioritized JSON documentation and clarified CSS rule and property ordering.

## [1.5.0] - 2026-08-07

### Changed

- Removed surrounding source-formatting whitespace from ordinary text nodes without collapsing meaningful internal or inline-boundary spaces.
- Preserved text verbatim in `pre`, `textarea`, and computed whitespace-preserving contexts.
- Excluded non-rendering infrastructure elements from JSON traversal and CSS generation while retaining hidden ordinary elements and original `outerHTML`.

## [1.4.0] - 2026-08-07

### Added

- Added per-element `conditionalCSS` for relevant active and inactive media queries, container queries, nested conditions, and conditional state selectors.
- Added `currentlyMatches` for media conditions and non-fatal deduplicated stylesheet-access diagnostics.
- Added preserved conditional structure to CSS export.
- Added a compact two-column action layout, clearer secondary controls, and hidden result controls until generation begins.

### Changed

- Renamed and reordered the primary actions to **Generate Tree JSON** and **Generate Tree CSS**.

### Security

- No debugger, host, or broad permissions were added.

## [1.3.0] - 2026-08-07

### Added

- Added separate authored `stateCSS` arrays for elements and `::before`/`::after` pseudo-elements.
- Added non-mutating detection for direct, ancestor, sibling, descendant, functional, multiple, form, link, and related-element pseudo-class states.
- Added preservation of state subjects, `!important`, custom-property dependencies, and enclosing at-rule context.
- Added deduplicated state rules to CSS export mode.
- Added browser regression coverage emphasizing `.header:hover .child` and `.container:focus-within .child` relationships.

### Security and privacy

- State discovery does not force browser states or inspect visited-link history.
- No debugger, host, or broad permissions were added.

## [1.2.0] - 2026-08-07

### Changed

- Replaced raw computed-style dumps with per-element relevance analysis based on matching authored rules, inline declarations, cascade priority, inheritance, and final computed values.
- Reduced report size by omitting unrelated global and inherited custom properties.

### Added

- Added recursive `var()` dependency tracing that preserves useful authored custom-property chains and fallbacks.
- Added browser regression coverage for cascade, inheritance, inline styles, custom properties, pseudo-elements, and exact outer HTML.

### Security and compatibility

- Continued operating without `debugger`, host, or other broad permissions.
- Inaccessible cross-origin stylesheets are skipped without aborting inspection.

## [1.1.0] - 2026-08-07

### Added

- Added `outerHTML` as the final top-level property in exported JSON reports.
- The property contains the selected element's exact outer HTML, equivalent to Chrome Elements' **Copy outerHTML** command.

### Privacy

- Documented that exact outer HTML can contain sensitive information already present in the selected markup.

## [1.0.0] - 2026-08-07

### Added

- Initial release of the Manifest V3 Chrome DevTools extension.
- Added an Elements-panel sidebar that follows the currently selected node.
- Added recursive computed-CSS export for the selected element and its descendants.
- Added nested JSON export with metadata, attributes, dimensions, direct text nodes, computed CSS, and pseudo-elements.
- Added copy, refresh, clear, stale-report, processing, light-theme, and dark-theme behavior.
- Added local-only privacy documentation, tests, generated icons, and reproducible release packaging.

[1.6.1]: https://github.com/ext237/css-tree-inspector/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/ext237/css-tree-inspector/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/ext237/css-tree-inspector/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/ext237/css-tree-inspector/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/ext237/css-tree-inspector/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/ext237/css-tree-inspector/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/ext237/css-tree-inspector/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ext237/css-tree-inspector/releases/tag/v1.0.0
