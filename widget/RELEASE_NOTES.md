# Price Tracker Widget - Release Notes

## v0.1.5 (Beta)

Changed
- Switched back to a portable single-file exe instead of the NSIS
  installer. Simpler and matches the task widget's build process:
  two commands (npm install, npm run build), one file out, no
  install wizard, no code-signing tooling, no arch configuration to
  get wrong.
- Going forward, every version you get is a complete, self-contained
  zip. Unzip it over your existing project folder and overwrite
  everything, no more tracking which individual files changed.

## v0.1.4 (Beta)

Fixed
- The x64 arch setting was in the wrong place in package.json,
  electron-builder rejected it as an unknown property under win.
  Moved it into the nsis target definition where it actually
  belongs: win.target is now an array with the arch nested inside
  the target entry, not a sibling property.
- Added description and author fields to package.json, cleared two
  harmless but noisy warnings electron-builder was printing on
  every build.

## v0.1.3 (Beta)

Changed
- Build now explicitly targets x64 (64-bit Windows) instead of
  implicitly using whatever architecture the build machine happens
  to be. Covers the vast majority of Windows PCs, including yours.
- Installer filename now includes the version and architecture:
  Price-Tracker-Setup-0.1.3-x64.exe, so it's self-explanatory to
  anyone downloading it later.

## v0.1.2 (Beta)

Changed
- Switched packaging from a portable single-file exe to a proper
  NSIS installer (Setup.exe): install wizard, Start Menu shortcut,
  Desktop shortcut, and a normal uninstaller listed in Windows'
  "Add or Remove Programs." Run `npm run build`, the installer
  lands in the dist folder.

## v0.1.1 (Beta)

Added
- Product thumbnails: shows the product image in both the list row
  and the detail panel header, pulled from the worker's new
  imageUrl field (requires worker v0.1.4 or later)

## v0.1.0 (Beta)

Initial build of the Electron desktop widget.

Added
- Product list with current price and change since last check
- Detail panel per product: current price, lowest seen, target
  price, full price history chart (Chart.js)
- Add/Edit product modal: URL, nickname, target price, notify
  toggle, manual CSS selector override
- "Search other retailers" link, opens a Google Shopping search for
  the product in your default browser
- Dark/light theme toggle, saved between launches
- System tray presence: minimizes instead of closing, right-click
  menu for Open / Check Prices Now / Quit
- Native Windows notification when a tracked price hits its target,
  won't repeat-notify for the same drop, resets if price goes back
  above target and drops again later
- Polls the worker every hour while running, plus once on launch
- Settings screen for Worker URL and API key, saved locally

Depends on
- Price Tracker Worker v0.1.3 or later (needs the PATCH
  /products/:id endpoint added in that version for editing target
  price and manual selector after a product's been added)

Not yet built
- Auto-launch at Windows startup (manual shortcut method documented
  in BUILD.md for now)
- Any bundled default icon set beyond the generated placeholder
  icon, happy to swap in something custom if you want a different
  look
