# Source Deck: demo

Source Deck is a home screen for a Samsung TV. It puts everything you can watch in one row of thumbnails (Live TV, every HDMI port, apps, network streams and the media servers on your network), restyles the whole screen for the source you select, and adds a **Home slide with widgets**. Everything is driven by the TV remote: **Left/Right** picks a source, **OK** opens it, **Back** goes back.

<p align="center"><img width="800" alt="Source Deck running on a real Samsung TV" src="https://github.com/user-attachments/assets/d2f2aa40-e946-4410-89df-b49722642e27" /></p>

<p align="center"><em>Source Deck running on a real Samsung S95C.</em></p>

> The screenshots below were taken in the browser demo mode at 1920 x 1080 with sample HDMI devices (PS5, Switch, Xbox). On the TV the sources, names and signal state come from the TV itself.

**Contents**

1. [The Home slide and widgets](#1-the-home-slide-and-widgets)
2. [Every source has its own look](#2-every-source-has-its-own-look)
3. [Themes and accent colors](#3-themes-and-accent-colors)
4. [Your own backgrounds](#4-your-own-backgrounds)
5. [Widgets on any slide, and the widget editor](#5-widgets-on-any-slide-and-the-widget-editor)
6. [Arrange, Settings and languages](#6-arrange-settings-and-languages)
7. [Also in the app](#7-also-in-the-app)

---

## 1. The Home slide and widgets

The first slide is **Home**: a 12 x 6 grid of widgets. Out of the box it shows the time, the date and the weather; you can add more and place them where you like.

![Home slide with clock, date, weather, news, currency, sports scores and inputs](https://github.com/user-attachments/assets/b597c9c3-130b-4f75-bd46-49859b1fbf48)

Available widgets:

| Widget | What it shows |
|---|---|
| **Clock** | Time in 12 or 24 hour format, with or without seconds |
| **Date** | Weekday and date (long, short or numeric) in your language |
| **Weather** | Current conditions, feels-like, high/low and wind for a city you choose (free [Open-Meteo](https://open-meteo.com), no account) |
| **Inputs** | Your HDMI ports with the device name and whether a device is connected, refreshed every few seconds |
| **News** | Headlines of an RSS feed: BBC, DW, Al Jazeera, NPR, The Verge, Ars Technica, Hacker News, NASA, gaming sites (PlayStation Blog, Xbox Wire, Nintendo Life, IGN and more), Ukrainian news, or any feed address you type |
| **Currency** | Exchange rates for up to three currencies against a base currency (18 currencies, incl. UAH) |
| **News cards** | The same feeds as cards with pictures. Press **Up** from the thumbnails to focus it, **Left/Right** to choose a card and **OK** to open the article in the TV browser |
| **Outages** | Planned electricity outages in Ukraine (Kyiv and Dnipro, from Yasno): the state right now with a countdown, an hourly grid, day bars, the next outages and the probable week. Pick your group from a list or find it by address |
| **Sports scores** | Today's matches for a football league, NBA, NFL, NHL or MLB, live first; optional team filter |

Each widget has a **Card** style (a panel in the theme colours, none, or the accent colour) and options of its own. Text scales with the widget size, so a widget can be small or fill half the screen.

The whole Home slide follows an accent color of your choice:

![Home slide in the purple accent color](https://github.com/user-attachments/assets/9470d700-2658-4e25-830b-b5470c088c31)

## 2. Every source has its own look

Selecting a source restyles the whole screen: colors, title font, tile outlines. The tiles keep the same size and position on every slide, so the buttons never jump.

| | |
|---|---|
| ![PlayStation theme](https://github.com/user-attachments/assets/0f98d415-cf88-435a-ae05-0f92e1a618b1) | ![Nintendo Switch theme](https://github.com/user-attachments/assets/47d3bc30-a527-42c4-a085-805b6926809e) |
| **PS5** on HDMI 1 (PlayStation theme) | **Switch** on HDMI 2 (Nintendo Switch theme) |
| ![Xbox theme](https://github.com/user-attachments/assets/50fe98d8-8ee8-419d-a0c8-7fb106ece3d2) | ![Netflix theme](https://github.com/user-attachments/assets/8ee90918-d288-48a1-aed5-070be16d8067) |
| **Xbox** on HDMI 3 (Xbox theme) | **Netflix** app (Netflix theme) |

Themes are picked automatically from what the source is called (a port named "PS5" gets the PlayStation look), and you can override it for any source. There are also two GTA 6 looks:

| | |
|---|---|
| ![GTA 6 Retro theme](https://github.com/user-attachments/assets/2bc00a33-cab3-498c-86bb-ace65ca26a87) | ![GTA 6 theme](https://github.com/user-attachments/assets/73e2abc8-7d26-405a-8382-472392a241da) |
| **GTA 6 Retro** | **GTA 6** |

Apps with their own content show it in the deck. The **Apple Music** slide has charts, search and 30-second previews, with the original red theme or the **Liquid Glass** theme (live glass refraction on the buttons and lists):

| | |
|---|---|
| ![Apple Music slide](https://github.com/user-attachments/assets/ec506627-73d5-4452-8b8b-e945c085e75a) | ![Apple Music in the Liquid Glass theme](https://github.com/user-attachments/assets/d1241beb-452d-4e02-9b41-a7cecead136a) |
| Apple Music charts and previews | The Liquid Glass theme |

## 3. Themes and accent colors

**Change theme** shows two lists: the themes on the left and the accent colors of the highlighted theme on the right. Press **Right** to move to the accents and **OK** to apply theme and color together. Today the **Home** theme offers nine accents (Blue, Purple, Pink, Red, Orange, Yellow, Green, Teal, Graphite); other themes can get their own list.

![Change theme: themes on the left, accent colors on the right](https://github.com/user-attachments/assets/0ce7087a-75ce-41e5-a8bf-38fad1c311fa)

## 4. Your own backgrounds

**Change background** puts a picture behind any slide, with any theme. Pictures can come from:

- **Unsplash** and **Wallhaven** (search by text; Unsplash needs a free API key, Wallhaven needs none),
- your **router or NAS** through its media server (pictures only),
- a **USB drive**.

![Change background drawer](https://github.com/user-attachments/assets/c57c0e28-63e4-42b6-a5f8-c3a1f850d524)

Search results are a grid of pictures. Press **OK** on one to open a small sheet:

![Wallhaven search results with the picture sheet open](https://github.com/user-attachments/assets/3a717c1b-fb7f-4577-b29b-afe1d2f65890)

![A grid of wallpapers from a Wallhaven search](https://github.com/user-attachments/assets/491cea8f-a6fd-4f00-9e1e-86bac6f9a5be)

The picture is downloaded once, shrunk to 1920 x 1080 and kept on the TV only while something uses it. The drawer stays transparent, so **Apply to** (this source or all sources) and **Dimming** (None to Strong) show their effect immediately:

![A wallpaper applied to the PS5 slide, with its credit in the corner](https://github.com/user-attachments/assets/d950750c-3094-4255-8dcc-5dcf814bc791)

![The drawer over the applied wallpaper: apply to, dimming, star, remove](https://github.com/user-attachments/assets/ad0e4e14-ee5a-46a2-82fe-eb19132bdf47)

**Starred backgrounds** survive "Remove the background": star a picture you like, and apply it again later from the Starred list without downloading it again.

![The Starred backgrounds list](https://github.com/user-attachments/assets/32ab5d51-24ba-4ae5-bf05-76b8c6b1e4ff)

## 5. Widgets on any slide, and the widget editor

Widgets are not only for Home. Any slide with free space can have its own (the HDMI inputs, Netflix, and so on). Slides that draw their own feed, such as YouTube and Apple Music, have no widgets and no **Widgets** button.

![The PS5 slide with a transparent clock and a weather widget over a wallpaper](https://github.com/user-attachments/assets/42001783-5914-49c1-a4b9-9fd3a488d77c)

**Widgets** opens the editor, a drawer like the background one. Add a widget, then open it to **Move**, **Resize**, change its options or remove it. The widget you highlight is outlined on the slide.

![The widget editor listing the widgets of a slide](https://github.com/user-attachments/assets/783d5ae1-5b29-4256-9620-be0dae061a48)

Options change with OK or the Left/Right keys (text options such as a news feed address or a team filter open the TV keyboard):

![Options of a Clock widget](https://github.com/user-attachments/assets/13500ea9-35f9-41b6-bf8f-b6ef024dd425)

Moving and resizing hide the drawer and use the arrow keys, one grid cell at a time. Widgets cannot overlap or leave the grid.

![Moving a widget: dashed outline and a hint bar](https://github.com/user-attachments/assets/4950e667-61dd-4baf-8432-c12418f7119a)

## 6. Arrange, Settings and languages

**Arrange** has two lists. The left one is what the deck shows, in order (reorder, hide, remove). The right one holds every other source the TV knows, including **all installed apps**, to add with one press.

![Arrange: the deck on the left, available sources on the right](https://github.com/user-attachments/assets/67ef733a-3053-4f14-8512-df5eb059481d)

The **gear** at the right end of the footer opens **Settings**:

![Settings drawer](https://github.com/user-attachments/assets/4b49b099-d740-4802-9637-23a96f1d9573)

**Language**: follow the TV's language (falling back to English) or pick one of 15: English, Ukrainian, Spanish, French, German, Italian, Portuguese, Polish, Dutch, Czech, Swedish, Turkish, Japanese, Korean and Simplified Chinese. The change applies at once.

![Language list](https://github.com/user-attachments/assets/2c108fcb-b3cb-4446-af0f-8f1c415ac357)

![The Home slide in Ukrainian](https://github.com/user-attachments/assets/eadba14f-74af-4525-ba56-1875123f3b6f)

**About the developer** has the author's bio, a button that opens the LinkedIn profile in the TV browser, and a QR code for the same address.

![About the developer](https://github.com/user-attachments/assets/c2b397ee-ab77-42f7-94d8-8f22ad4c6698)

## 7. Also in the app

Not shown above:

- **Opens the real thing**: OK on an HDMI source switches the TV to that input through the TV's own viewer (full resolution, no in-app window); apps are launched on the TV.
- **Media servers**: the TV's network is scanned for UPnP/DLNA servers (a router, a NAS); browse folders and play files in the TV's native player.
- **YouTube** feed: log in once with a QR code on your phone and see the latest videos of your subscriptions (read-only access).
- **Rescan sources** re-reads the inputs, apps and media servers.
- **Light on purpose**: plain HTML/CSS/JS with no framework and no build step, no big animations; the layout never shifts between slides.
- **Private**: no server of its own, no analytics. See [PRIVACY.md](PRIVACY.md) for exactly what is stored and which services are contacted.

To install it on your own TV see the [README](README.md) and `.agents/build-and-deploy.md`.
