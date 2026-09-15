# Building a Distributable

`npm run build` packages the app into a proper Windows installer,
the same kind of experience as installing any normal desktop
software: an install wizard, a Start Menu shortcut, a Desktop
shortcut, and a clean uninstaller listed in Windows' "Add or
Remove Programs."

## 1. Build it

    npm run build

The first build takes longer than later ones, electron-builder
downloads some packaging tools the first time.

## 2. Where to find it

Look inside the `dist` folder that gets created in this project.
You'll see a file named something like:

    Price Tracker Setup 0.1.2.exe

That's the installer. Anyone who runs it gets a normal install
experience, click through the wizard, choose an install location
(or accept the default), and it's installed like any other app.

## 3. Publishing it as a GitHub Release

Once you've built and tested the installer, here's how to put it on
the repo's Releases page so it's easy to find and share later.

1. Go to https://github.com/TellezMedia/Price-Tracker/releases
2. Click "Draft a new release"
3. In the "Choose a tag" box, type a version tag like `widget-v0.1.2`
   and choose "Create new tag"
4. Give the release a title, something like "Price Tracker Widget
   v0.1.2"
5. In the description box, you can paste the relevant section from
   `widget/RELEASE_NOTES.md`
6. Drag the `.exe` file from your `dist` folder into the box at the
   bottom that says "Attach binaries by dropping them here"
7. Click "Publish release"

That's it, the installer is now attached to a permanent, versioned
release on GitHub, downloadable by anyone with the link, separate
from the source code itself.

## Notes

- If you want the app to launch automatically when Windows starts,
  the installer can optionally add that, or you can do it manually
  afterward with a shortcut in:

      shell:startup

  (Type that into the Windows Run dialog, Win+R, and it opens the
  Startup folder directly.)
- The old portable single-file build method still works if you ever
  want it back, that's just a different `target` setting in
  `package.json`, ask and I can switch it or offer both.
