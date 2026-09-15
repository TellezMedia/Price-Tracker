# Using Price Tracker

This covers day to day use of the app once it's installed and
connected to your worker. For installing or building the app
itself, see SETUP.md and BUILD.md.

## First launch

The first time you open the app, it asks for two things:

1. Worker URL, the address of your deployed Price Tracker Worker,
   something like `https://price-tracker-worker.tcghunters.workers.dev`
2. API Key, the secret you set when you ran
   `wrangler secret put API_KEY` on the worker

Both of these come from the worker project, not from anything in
the widget itself. Once entered, click Save and the app connects.

You can change either of these later from the gear icon in the top
right.

## Adding a product to track

1. Click "+ Add Product" in the top right
2. Paste the product's page URL, the same link you'd visit in a
   browser to see the item
3. Give it a nickname, this is just for your own reference, it
   doesn't need to match the retailer's product name exactly
4. Optionally set a target price, if you leave this blank, the app
   still tracks the price and shows you the lowest it's seen, it
   just won't send a notification
5. "Notify me when the price hits target" is checked by default,
   uncheck it if you want to track a product silently
6. Click Save

The app immediately checks the price once, so you should see a
number show up within a few seconds rather than waiting for the
next scheduled check.

## What "target price" actually does

Target price only controls the Windows notification. It's the
number you're hoping the price drops to. When the worker's daily
check sees the price at or below that number, you get a
notification. It has no effect on the price history or the lowest
price shown, those track automatically regardless of whether a
target is set.

## Reading the product list

Each row shows the product's nickname, current price, and whether
the price went up or down since the last check (green arrow down is
a price drop, red arrow up is an increase). If a product shows
"Price unreadable," the worker couldn't find a price on that page
automatically, see the Troubleshooting section below.

## The detail panel

Click any product to see its full detail panel on the right:

- Current price, lowest price ever seen, and target price
- A full price history chart
- "Search other retailers," opens a Google Shopping search for the
  product name in your default browser, this does not automatically
  compare prices across sites, it just gives you a quick way to
  check manually
- Edit, change the nickname, target price, notification toggle, or
  add a manual CSS selector
- Check Now, forces an immediate price check instead of waiting for
  the next scheduled one
- Delete, stops tracking the product entirely

## Editing a product

Click Edit in the detail panel to change a product's nickname,
target price, notification toggle, or manual selector. The URL
itself can't be changed after a product's been added, if you want
to track a different link, add it as a new product instead.

## When a price hits target

You'll get a native Windows notification. Clicking the notification
brings the app window to the front. The app won't notify you again
for the same drop, but if the price goes back above target and later
drops again, you'll get notified again.

## Closing vs quitting

Closing the window (the X button) doesn't quit the app, it
minimizes to the system tray near your clock. The app keeps running
in the background so it can keep checking in with the worker and
notify you. To fully quit, right-click the tray icon and choose
Quit.

## Troubleshooting

**A product shows "Price unreadable"**
The worker's automatic price detection couldn't find a price on
that page. Click Edit on the product and add a manual CSS selector
if you know one (this requires looking at the page's source code to
find the right element), or let me know which site it is and the
worker's extraction logic can likely be improved for it.

**Prices aren't updating**
The worker checks once every 24 hours on its own schedule. The
widget itself only checks in with the worker (not the retailer
sites directly) once an hour while it's running, plus once when you
launch it. If you want to force a check on a specific product right
now, use "Check Now" in its detail panel.

**No notification even though the price dropped below target**
Make sure "Notify me when the price hits target" was checked when
you added or last edited the product. Also confirm the app was
actually running (even minimized to tray) at the time the worker did
its scheduled check, if the app was fully quit, it can't fire a
notification until you open it again, though it will still show the
correct price and hitTarget status once you do.
