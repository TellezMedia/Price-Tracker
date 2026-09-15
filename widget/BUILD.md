# Building a Distributable

Once you've confirmed the app works with `npm start`, you can
package it into a standalone .exe that doesn't need Node or
Electron installed to run.

## 1. Build it

    npm run build

This produces a portable .exe (no installer, just double-click to
run) inside a new `dist` folder that gets created in this project.

## 2. Where to find it

Look inside `dist` for a file named something like:

    Price Tracker 0.1.0.exe

That single file is the whole app. You can move it anywhere, put it
in Startup so it launches with Windows, whatever you like.

## Notes

- The first build takes longer than later ones, electron-builder
  downloads some tooling the first time.
- If you want it to launch automatically when Windows starts,
  create a shortcut to the .exe and drop that shortcut into:

      shell:startup

  (Type that into the Windows Run dialog, Win+R, and it'll open the
  Startup folder directly.)
