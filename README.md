# Price Tracker

A price tracking system with two parts:

1. `worker/`, a Cloudflare Worker that checks product prices on a
   schedule and stores their history
2. `widget/`, a Windows desktop app for adding products, viewing
   price history, and getting notified when a price hits your
   target

## Getting started

1. Deploy the worker first, see `worker/SETUP.md`
2. Then set up the widget, see `widget/SETUP.md`
3. Once both are running, see `widget/USAGE.md` for how to actually
   track a product day to day

## Building an installer

To package the widget into a distributable Windows installer
instead of running it in dev mode, see `widget/BUILD.md`.

## How it works

The worker does the actual price checking, once every 24 hours on
its own schedule, using a few fallback strategies to find a price
on a given product page (structured page data first, then a couple
of more general scans). It stores price history and a product
thumbnail image, and exposes a small REST API.

The widget is a thin client on top of that API. It doesn't check
prices itself, it just polls the worker for updates (once an hour
while running, plus once on launch) and shows you what the worker
found, including firing a Windows notification when a tracked
price hits its target.
