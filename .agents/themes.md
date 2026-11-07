# Themes

A theme is a key in `THEMES` (`app/js/themes.js`) plus one CSS file `app/css/themes/<name>.css` (linked in `index.html`).

| key | label | look of the whole screen |
|---|---|---|
| `default` | Generic | blue gradient |
| `ps` | PlayStation | deep blue, static pattern of △ ○ ✕ □, thin light title, pill buttons |
| `switch` | Nintendo Switch | Zelda-style Hyrule dusk: teal-to-gold sky, big Triforce with rings, stars, layered mountains and pines, Master-Sword-in-pedestal with glow, double gold frame with thin red/blue Joy-Con edge lines, gold serif uppercase title, gold-trimmed buttons |
| `xbox` | Xbox | black/green, glowing sphere, diagonal lines, sharp uppercase buttons |
| `stream` | Network media | teal, static wave pattern |
| `tv` | Live TV | purple with broadcast colour bars |
| `youtube` | YouTube | dark mode, red accent, faint grid of video-card outlines, pill buttons, white selection |
| `netflix` | Netflix | black, red cinematic light streaks with vignette, uppercase heavy title, red selection |
| `hbomax` | HBO Max | deep indigo gradient, violet glow and flowing ribbon lines, lilac selection |
| `primevideo` | Prime Video | dark navy, cyan glow and a large swoosh arc, cyan selection |
| `appletv` | Apple TV | near black, clean semibold white title, soft light and faint poster outlines, white selection |
| `applemusicglass` | Apple Music Liquid Glass | pearl-white world with faint ripples, a glass blue vinyl and a glass app-icon (music note) with cyan/magenta fringed edges at top right, dark bold type, frosted glass pills, blue selection; overlays stay light. Pick it in Change theme (never auto-detected) |
| `applemusic` | Apple Music | red-to-pink gradient, faint floating notes and rings, round buttons, white selection |
| `gta6` | GTA 6 | pastel Vice City sunset modelled on the game's menu UI: orange-pink-lavender gradient, muted palm silhouettes and birds, black letterbox bars top and bottom with pink/orange neon lines (header and footer sit inside the bars), translucent purple square buttons, orange selection highlight, script italic title |
| `gta6classic` | GTA 6 Retro | (the first GTA 6 look) Vice City neon sunset: purple-to-orange sky, striped sun, skyline with lit windows, palms, pink retro grid floor, cyan frame, italic pink-gradient uppercase title, neon-bordered buttons |

## How a theme is applied
- `render()` sets `main#deck[data-theme=KEY]` from `themeOf(card)` (saved choice, else `detectTheme`).
- `main[data-theme=KEY]` sets CSS variables (`--glow --base --accent --ink --radius --btn-* --title-*`) and
  `::before/::after` layers for the background. Buttons and the title read those variables, so a theme restyles
  buttons and heading for free.
- Each tile has `data-theme=KEY` of its own source and a `.tile[data-theme=KEY]` rule giving only its
  **background image** (and for Xbox its **outline colour**). The icon comes from `GLYPH` (derived from `THEMES[].glyph`).

## Rules
- Tiles must look uniform: same shape, size, font, text colour. Only background, icon and outline colour differ.
  `.tile,.tile *` forces font family, no text-transform, no letter-spacing (except icon), white text, no shadow,
  because tiles are `<button>`s and `small` has global letter-spacing/uppercase/accent colour that would leak in.
- Selection: `.cur` = white outline (cursor), `.tile.sel` = selected tile (bright). Switch theme recolours `.cur`.
- Performance: no animated backgrounds, no scale/rotate on focus, no large shadows. Only a 0.25 s title fade
  (opacity) on card change.
- Bottom anchoring: `main>section{flex:1}` and `footer.nav{height:68px}` keep tiles from moving between themes.

## Adding a theme
1. Add `{key, label, glyph}` to `THEMES` (and extend `detectTheme` if it should auto-apply).
2. Create `css/themes/<name>.css`, link it in `index.html`, and add `main[data-theme=KEY]{...variables...}` with optional `::before/::after`, and
   `.tile[data-theme=KEY]{background:...}`.
3. It shows up in "Change theme" automatically. Test on the TV for lag.

## Switch theme details
Background is one inline SVG data-URI on `main[data-theme=switch]::before` (static, `cover`, anchored bottom), original artwork drawn for this
project (no copyrighted images). Gold accent `#f6dc8e`, serif title (Palatino/Georgia), frame + header rule on `::after`. Tile: teal-to-gold gradient with gold outline.

## GTA 6 Retro theme details
Original SVG artwork (inline data-URI on `::before`, static). Pick it in Change theme.
Palette: hot pink `#ff3d9a`, cyan `#38e8ff`, deep purple `#2b0b5a`, sun yellow-to-pink. The title uses `background-clip:text` (static gradient).

## GTA 6 theme details
Based on a user-supplied screenshot of the in-game settings menu (palette and layout only; the palms/birds are original SVG, no game assets).
Letterbox bars are `::after` gradient layers (top 8vh, bottom 15.5vh). The theme sets `main` padding-top to 3vh (header sits inside the bar) and `section` padding-top to 3vh, so the meta/title/detail text lands at the same y as in every other theme (verified: 107/141/300 px tops at 1080p). Keep that equality if you change the bars.
Selection: `button.cur` gets solid orange `#e08a3c` (like the game's highlighted row); tiles keep an orange outline. Title font falls back through
Snell Roundhand/Brush Script/Segoe Script/Apple Chancery/cursive, so on the TV it may render as the system cursive or plain italic (check on TV).
Auto-detected for source names matching `gta|grand theft`.

Note: the Retro look keeps the internal key `gta6classic` (label "GTA 6 Retro") so saved choices stay valid. GTA 6 theme text (`#meta`, `#detail`, `#scan`, `#status`) is white and bold with a hard 2px dark purple outline (8 offset text-shadows, no blur/glow) over the pastel sky.

## Edge fades and YouTube spacing
`#strip`, `#subs`, `#vids` use a CSS `mask-image` gradient (transparent at the ends, so the background shows through, no dark overlay). `fadeEdges()` in `app.js` sets `--fl`/`--fr`
(80px or 0) per row, so a side only fades when items are scrolled out of view there. It runs from `drawCursor()` and on resize. `#feedStatus` keeps a reserved line (`min-height`) so the avatar and video rows do not jump when the status text appears.
`#feed` has a 44px bottom margin to separate the video row from the source tiles.

## Liquid Glass theme notes (`applemusicglass`)
Technique from liquidglass.dev (MIT, `liquid-glass.js`), re-implemented compactly in `js/glass.js`: a displacement map is painted into a canvas from the glass shape (rounded rectangle). Inside the rim (`bezel`) the surface slope gives a Snell's-law refraction,
so R/G hold how far the content is bent, B holds a specular rim highlight, alpha is coverage. An SVG filter applies it with `feDisplacementMap` (3 channel-shifted passes = chromatic fringe when `chroma > 0`, 1 pass otherwise), adds the rim, and is used in one of two ways:
- **backdrop** (`backdrop-filter: url(#id)`): bends what is *behind* a translucent element: footer buttons, "Open in Apple Music", the tab chips, and the big lens `#glassLens` (300x300 at left 1380 / top 120 px, over the static vinyl).
- **own** (`filter: url(#id)`, region padded 24 px): bends an element's *own pixels* at the rim. The code path (`setGlass(..., "own")`) still exists but is currently unused: music cards (`.vid`) and tiles were made plain on request, so they get no filter, only their CSS shadow/tint.
Quality vs cost (`glass` in sources.js): `"quality"` (default) = every visible button and tab chip gets the full 3-pass effect (music cards and tiles are plain, not glass: the user removed it); `"focus"` = only the highlighted button/chip; `"lens"` = only the big lens. The big lens and the focus bubble are always live.
Why quality mode can stay smooth: with ~35 filters that all re-ran on every cursor move the S95C lagged badly (D37/D38). A filter only re-runs when the element it is on repaints, so in this theme **moving focus repaints no glass element**:
the highlight is the floating `#focusRing` (an absolutely positioned div placed by `placeRing()` in glass.js, one transform per move), and the cursor/selection never change an element's own look (CSS block at the end of applemusicglass.css:
no outline, tiles keep one opacity/border, `.vid.cur`/`.chan.cur` borders stay transparent). Verified in the preview: the computed style of all filtered elements is identical after a series of focus moves. Filters redraw only when the content changes (scroll jumps, play/pause, list reload).
**Focus bubble:** `#focusRing` is a glass bubble (translucent fill, bright rim, cyan/magenta fringe, soft shadow) 7 px larger than the focused element. It glides there with a springy CSS transition (transform/width/height) and refracts what is under it with its own
live `backdrop-filter: url(#lg-N)` (kind `"ring"`, one filter per size, cached). Only one element ever moves on a focus change.
**No hidden writes on focus moves** (found by watching DOM mutations while moving focus; each write repaints and re-runs filters): `fadeEdges()` writes `--fl/--fr` only when the value changes, the "Open in Apple Music" label is rewritten only when its text changes, `setGlass` only
writes `data-lg`/filters when different, `placeRing` skips unchanged properties. Over 13 focus moves the only mutations are the ring's style (and the open button's label when the card changes). Keep it that way: never write to the DOM unconditionally from `cursorHooks`.
**Shadows:** the rows clip (`overflow:hidden`), which cut the cards'/tiles'/chips' box-shadows. In this theme `#strip`, `#vids` and `#subs` get padding for the shadow and an equal negative margin (layout unchanged: tile top 807, footer 947), and the shadows were made smaller.
`will-change: transform` promotes each glass element to its own layer so cached results are reused. Filters are cached per size/kind (`filterId`); only on-screen elements get one (`visibleIn`). Leaving the theme clears every inline filter and hides the ring.
Backdrop-root caveat: a parent with `mask-image` (the row fades) isolates its children's `backdrop-filter` from the page, so `#subs` has no fade mask in this theme (chips must see the background). Cards/tiles use "own" refraction and keep their fades.
The background (a static SVG) was made busy on purpose so refraction is visible: colour blobs (cyan, magenta, blue, orange), a fine grid, dots and wavy lines over the pearl gradient, plus ripples and the glass vinyl. Controls/chips are only ~10-30 % white so the grid shows through and bends.
It is a light theme, so it overrides dark defaults explicitly: `main` text colour, `button` colour (guarded with `:not(.tile):not(.vid)` so tiles keep white text), chips, skeletons, overlays and the cursor outline (blue).
Verified layout: title/strip/footer tops 141/797/947, `#deck` 1080 px, same as the other slides. Tune with `optionsFor` (refraction, bezel, chroma, specular) in glass.js.

**Overlay screens in the glass theme** (Change theme picker, media-server file browser, Arrange + Source list, search, login): same busy background (the theme's SVG without the vinyl), glass pill rows (translucent fill, bright rim, cyan/magenta fringe, small shadow, CSS only, no per-row filters), blue headings, and the same liquid focus bubble.
`#focusRing` now follows the overlay's `.cur` row: `ringTarget()` in glass.js looks inside whichever overlay is open (`themeView`, `browser`, `arrangeView`, `searchView`) before the main screen, `z-index: 7` puts it above the overlays, and the overlay draw functions (`drawPicker`, `drawBrowserCursor`, `drawArrange`, `drawSearchCursor`)
call `syncRing()` because they do not go through `drawCursor`. The ring jumps (no glide) when it appears or switches between the main screen and an overlay. Rows have `scroll-margin` so `scrollIntoView` keeps the focused row fully visible. A row's own `.cur` look is only bold blue text: the bubble is the highlight.

Gotcha (glass theme): a theme rule like `main[data-theme=…] small{color:…}` is more specific than the tiles' own `.tile *{color:#fff}`, so it also recolours the small labels on tiles and cards. The glass theme therefore re-sets `.tile small`, `.tile span/b` and `.vid small/span` to white explicitly. Any light theme must do the same.
