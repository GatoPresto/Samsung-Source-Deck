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
