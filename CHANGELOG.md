# Changelog

## 1.1.2 — 2026-11-26

- **Fixed on Windows:** LUNA on Windows sizes the page to the window's outer size, title bar and frame included, so the bottom 39 px and the right 16 px were hidden. The page now leaves that space out on Windows, so everything at the bottom and right edges shows in full.
  the part you can see, so the controls at the bottom were hidden. The page now fits itself to
  the window size LUNA reports; nothing changes where the two match.
- **Report copy:** Alt-click on the version now always says in the status bar that the report was copied. Where the system clipboard is blocked (seen on some Windows set-ups) it uses a fallback, and if that fails too it shows the report selected so you can copy it by hand.

## 1.1.1 — 2026-11-25

- A short getting-started guide: the first time it opens it asks for your language, then walks
  you through the window in it. The **?** button brings it back.

## 1.1.0 — 2026-11-24

- New look, in line with the newer add-ons: rounded panels and gradient controls.
- Cleaner plug-in list: recent and favourite plug-ins on top, then every manufacturer folded
  with its count; click one to unfold its plug-ins. A search opens every group with a match.
  Arrow keys and Enter to add, double-click still works.
- Pick the add-on's colour from the swatch at the top: yellow, orange, red, green, blue, pink or
  purple. It is remembered, like the theme and the language.
- Every time LunaSuite opens it starts clean: no plug-ins in the chain and the default options.
  The recent plug-ins are still remembered.

## 1.0.0 — 2026-11-22

- First release: AudioSuite-style rendering of a selection through a chain of up to three
  plug-ins with presets, on one or several audio tracks.
- Tempo-synced tail (1/16 to 4 bars, straight, dotted or triplet) that covers what follows or
  goes on its own track.
- Edge fades, optional muted copy of the original, recent and favourite plug-ins.
- Dark and grey themes, 7 languages, Alt-click the version for a support report.
