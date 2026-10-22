# ratsep.org

The personal site of Mikk Rätsep: fifteen years of Objective‑C, Swift and Elixir, told as three eras,
each with a small live drawing of the work.

Live at <https://ratsep.org>.

## Files

```
index.html            the whole page, including the four inline SVG drawings
style.css             fonts, light and dark colours, layout, drawing states and animations
script.js             theme toggle and the drawing controller (ES module)
lib.js                small pure helpers, shared with the tests
fonts/                Schibsted Grotesk and IBM Plex Mono (latin woff2) with their OFL licences
favicon.svg/.png      icon, apple-touch-icon.png, og.png (link preview)
tests/                Node's built-in test runner, no dependencies
CNAME                 the custom domain for GitHub Pages
.nojekyll             serve the files as they are, without Jekyll
```

Plain HTML, CSS and a little JavaScript. There is no build step and nothing to install.

## Working on it

Serve the folder and open <http://localhost:8765>:

```sh
python3 -m http.server 8765
```

Run the tests (Node 22 or newer):

```sh
node --test 'tests/*.test.mjs'
```

They check the copy, the links, that no client or internal names slipped in, colour contrast for
text, local fonts only, and the drawing markup.

## Theme

The page follows the system light/dark setting until someone presses the toggle; the choice is
kept in `localStorage`. A small inline script in `<head>` sets `data-theme` before the first paint.

## Drawings

Each drawing is a `<figure class="showcase">` with an inline SVG and a list of buttons:

- `data-sel` holds the selected id; the HTML ships with the first one selected, so it reads
  without JavaScript.
- Elements with `data-part="id …"` get the class `on` while one of their ids is selected;
  groups with `data-dim="id …"` get `dim`. CSS does the rest (`.st`, `.fl`, `.fa`, `.glow`,
  `.grp`, `.grp-sel`).
- `data-cycle` lists the ids that advance on their own every `data-interval` ms. Hovering or
  focusing the drawing pauses it, and so does `prefers-reduced-motion`.
- The Obj‑C drawing also uses `data-swap-delay`, `data-morph-ids` and `data-hover-select` for
  its Mac ↔ iPhone morph.

## Colours changed for contrast

Two note colours from the design sketch were darkened slightly so the text meets WCAG AA:

| Where | Sketch | Now |
|---|---|---|
| Swift list notes, light | `#7A6A63` | `#766660` |
| Elixir list notes, light | `#7A6F80` | `#6F6574` |
