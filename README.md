# CSS Tree Inspector

CSS Tree Inspector is a privacy-friendly Chrome DevTools extension that exports the final computed CSS and nested DOM description of the element selected in the Elements panel.

Current version: **1.1.0** · [Changelog](CHANGELOG.md)

## Features

- Generates readable computed CSS for a selected element and every descendant.
- Produces valid, nested JSON with attributes, dimensions, direct text nodes, computed CSS, `::before`/`::after` data, and the selected subtree's exact outer HTML.
- Keeps reports visible when the selection changes and clearly marks them stale.
- Copies a report only when you click **Copy**.
- Supports Chrome DevTools light and dark themes.
- Runs entirely within the local DevTools session with no analytics or network access.

## Screenshots

Screenshots will be added before the Chrome Web Store release.

## Install from the Chrome Web Store

Not yet published. This section will link to the listing when available.

## Install as an unpacked extension

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this project directory.
5. Open or reload DevTools on a page, choose **Elements**, and open the **CSS Tree Inspector** sidebar.

After changing extension files, click **Reload** on the extension card and reopen DevTools.

## Usage

1. Select an ordinary element in the DevTools Elements tree.
2. Click **View CSS Tree From This Node** or **View CSS and Elements Tree as JSON**.
3. Review the result directly in the sidebar.
4. Use **Copy**, **Refresh**, or **Clear** as needed.

CSS output contains alphabetically sorted computed properties. JSON output wraps the selected element in metadata, preserves direct descendants under `subTreeElements`, and ends with an `outerHTML` string equivalent to Chrome Elements' **Copy outerHTML** result.

## Development

The project uses plain JavaScript, HTML, and CSS and requires no build step or runtime dependencies. Run the lightweight structural checks in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\static-tests.ps1
```

Regenerate icons when needed:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\generate-icons.ps1
```

Create a versioned Chrome Web Store archive in `dist/`:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\package-release.ps1
```

## Privacy

All inspection happens locally. CSS Tree Inspector does not transmit or remotely store inspected page data and requests no browsing, host, cookie, history, or network permissions. See [PRIVACY.md](PRIVACY.md).

## Known limitations

- The extension captures computed state, not stylesheet provenance or overridden declarations.
- Shadow DOM contents are not traversed in version 1.0; an encountered open shadow root is noted in JSON.
- Inspection inside unusual iframe execution contexts may depend on Chrome DevTools behavior.
- Very large subtrees can take time and produce large reports.
- CSS selectors are readable paths relative to the selected root, not guaranteed globally unique production selectors.

## Contributing

Bug reports and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history and notable changes.

## License

MIT © 2026 24Moves / Joe Lippeatt / 24moves.com
