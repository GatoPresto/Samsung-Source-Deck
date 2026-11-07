# Themes

A theme is a key in `THEMES` (`app/app.js`) plus CSS in `app/index.html`.

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
2. In `index.html` add `main[data-theme=KEY]{...variables...}` with optional `::before/::after`, and
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
Letterbox bars are `::after` gradient layers (top 11vh, bottom 15.5vh), so the theme adds top padding to `section` to keep the title below the top bar.
Selection: `button.cur` gets solid orange `#e08a3c` (like the game's highlighted row); tiles keep an orange outline. Title font falls back through
Snell Roundhand/Brush Script/Segoe Script/Apple Chancery/cursive, so on the TV it may render as the system cursive or plain italic (check on TV).
Auto-detected for source names matching `gta|grand theft`.

Note: the Retro look keeps the internal key `gta6classic` (label "GTA 6 Retro") so saved choices stay valid. GTA 6 theme text (`#meta`, `#detail`, `#scan`, `#status`) is white and bold with a hard 2px dark purple outline (8 offset text-shadows, no blur/glow) over the pastel sky.

## Edge fades and YouTube spacing
`#strip`, `#subs`, `#vids` use a CSS `mask-image` gradient (transparent at the ends, so the background shows through, no dark overlay). `fadeEdges()` in `app.js` sets `--fl`/`--fr`
(80px or 0) per row, so a side only fades when items are scrolled out of view there. It runs from `drawCursor()` and on resize. `#feedStatus` keeps a reserved line (`min-height`) so the avatar and video rows do not jump when the status text appears.
`#feed` has a 44px bottom margin to separate the video row from the source tiles.
