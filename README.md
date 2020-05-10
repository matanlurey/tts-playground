# tts-playground

A demo mod for Tabletop Simulator that uses a home-built advanced editor.

## Getting started

Clone this repository, and initialize it:

```bash
$ npm install
```

You can then start building and running the mod:

```bash
$ npm start
```

This builds a save file, and places it in `dist/` (e.g. `dist/Playground.json`).

It then adds a symbolic link to your `Tabletop Simulator/Saves` folder, launches
Tabletop Simulator, and automatically loads the mod. You can continue developing
by editing files in the `mod/` folder, and interactively hitting `r` key in
order to reload (this is similar to `"Save and Play"` in the mod and in the Atom
editor).

To do a full-refresh, exit to the main menu. This will automatically reload the
mod.
