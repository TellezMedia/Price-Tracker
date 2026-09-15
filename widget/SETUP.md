# Price Tracker Widget Setup

## 1. Install dependencies

In this folder, open PowerShell (same way you did for the worker
project, right-click inside the folder and choose Open in Terminal
or Open PowerShell window here) and run:

    npm install

This takes a minute or two the first time.

## 2. Run it in dev mode

    npm start

A window should open. On first launch, it'll ask for your Worker
URL and API key, the same two values from the worker's setup
(`https://price-tracker-worker.tcghunters.workers.dev` and your
`API_KEY` secret). Paste those in and click Save.

## 3. Try it out

Click "+ Add Product", paste a product URL, give it a nickname and
a target price, and click Save. It'll show up in the list on the
left with its current price. Click it to see the detail panel and
price history chart on the right.

The app checks in with your worker once an hour while it's open,
plus once immediately when you launch it. The worker itself still
does the actual price checking once every 24 hours on its own
schedule, the widget is just polling to see what the worker found
and to fire a Windows notification if a target price was hit.

Closing the window doesn't quit the app, it minimizes to the system
tray (bottom right, near the clock). Right-click the tray icon for
Open, Check Prices Now, or Quit.

## Notes

- The "Search other retailers" link on a product's detail panel
  opens a Google Shopping search for that product's name in your
  default browser, it doesn't automatically find or compare prices
  across sites itself.
- If a product shows "Price unreadable," the worker couldn't find a
  price on that page automatically. Click Edit on that product and
  add a manual CSS selector if you know one, otherwise let me know
  which site it is and I can improve the worker's extraction logic
  for it.
