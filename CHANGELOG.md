# Changelog

All notable changes to CSS Tree Inspector are documented here.

This project follows [Semantic Versioning](https://semver.org/).

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

[1.1.0]: https://github.com/ext237/css-tree-inspector/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ext237/css-tree-inspector/releases/tag/v1.0.0
