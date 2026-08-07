# Changelog

All notable changes to CSS Tree Inspector are documented here.

This project follows [Semantic Versioning](https://semver.org/).

Chrome-ready packages and release notes are available on the [GitHub Releases page](https://github.com/ext237/css-tree-inspector/releases).

## Unreleased

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

[1.5.0]: https://github.com/ext237/css-tree-inspector/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/ext237/css-tree-inspector/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/ext237/css-tree-inspector/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/ext237/css-tree-inspector/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/ext237/css-tree-inspector/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ext237/css-tree-inspector/releases/tag/v1.0.0
