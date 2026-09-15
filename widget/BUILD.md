# Building a Distributable

Two commands, same as the task widget.

    npm install
    npm run build

That's it. Look in the `dist` folder for:

    Price Tracker-0.1.5-portable.exe

That single file is the whole app, no installer, no wizard, just
double-click it to run. Move it anywhere, put it in Startup if you
want it to launch with Windows, whatever you like.

## Updating to a new version

Each new version you get from me is a full, self-contained zip, not
a partial patch. To update:

1. Unzip the new version over the same project folder you've
   already been using (overwrite everything when asked)
2. Run the same two commands again

    npm install
    npm run build

You don't need to track individual changed files or juggle
multiple version folders, the new zip always has everything.
