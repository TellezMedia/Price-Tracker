# Price Tracker Widget - Release Notes

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
