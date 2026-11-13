# Third-party notices

Source Deck itself is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). It includes or builds on the following third-party work, which keeps its own license.

## QR code generator (`app/vendor/qrcode.js`)

qrcode-generator 1.4.4, QR Code Generator for JavaScript, http://www.d-project.com/

```
The MIT License

Copyright (c) 2009 Kazuhiko Arase

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

"QR Code" is a registered trademark of DENSO WAVE INCORPORATED.

## Settings gear icon (`app/index.html`, button `#settings`)

The gear is the "settings" icon of Google's Material Design icons, Copyright Google LLC, licensed under the Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0).

## Liquid Glass (`app/js/glass.js`)

The refraction optics follow the technique of the open-source "liquid-glass.js" (https://liquidglass.dev, MIT). The code in this repository is a re-implementation for the TV, not a copy.

## Services and content shown by the app

The Outages widget reads the public API of Yasno (app.yasno.ua); the endpoints and the data format were taken from the documentation and code of the MIT-licensed [ha-yasno-outages](https://github.com/denysdovhan/ha-yasno-outages) project by Denys Dovhan (no code was copied). Ternopil schedules come from the website API of Тернопільобленерго (poweron.toe.com.ua), whose format was read from the site's code and from the community projects fastiuk/ukraine-energy-monitor and Sn1kls/lyampochka-bot; it is an unofficial interface of the operator's site and can change without notice. The app reads public data from Open-Meteo (weather), ExchangeRate-API (exchange rates, attribution shown in the widget), ESPN's public scoreboard, Unsplash and Wallhaven (pictures, credit shown on screen), Apple's iTunes feeds, Google's YouTube API and the news feeds of the publishers listed in the News widget. The pictures, headlines and data belong to their owners and stay under their terms. The source names, game and brand names used for the themes (PlayStation, Xbox, Nintendo, Netflix, GTA and others) belong to their owners; this project is not affiliated with them.

## Fonts (`app/fonts/`, `app/css/fonts.css`, `app/js/fonts.js`)

Widget fonts (the Clock widget's **Font** option). The woff2 files come from [Fontsource](https://fontsource.org) (Google Fonts, unmodified except that each font is split by script, as Fontsource ships it, and only some weights and scripts are included). The fonts are used as embedded web fonts and are not sold on their own. All are licensed under the SIL Open Font License 1.1 (full text in `app/fonts/OFL.txt`), except Kosugi Maru, which is licensed under the Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0). Reserved Font Names are kept: the fonts are not renamed or modified.

| Font | License | Copyright |
|---|---|---|
| Montserrat | OFL-1.1 | Copyright 2011 The Montserrat Project Authors |
| Oswald | OFL-1.1 | Copyright 2016 The Oswald Project Authors |
| Roboto Mono | OFL-1.1 | Copyright 2015 The Roboto Mono Project Authors |
| Russo One | OFL-1.1 | Copyright (c) 2011-2012, Jovanny Lemonad, with Reserved Font Name "Russo" |
| Exo 2 | OFL-1.1 | Copyright 2013 The Exo 2 Project Authors |
| Unbounded | OFL-1.1 | Copyright 2022 The Unbounded Project Authors |
| Playfair Display | OFL-1.1 | Copyright 2017 The Playfair Display Project Authors, with Reserved Font Name "Playfair Display" |
| Press Start 2P | OFL-1.1 | Copyright 2012 The Press Start 2P Project Authors, with Reserved Font Name "Press Start 2P" |
| Pacifico | OFL-1.1 | Copyright 2018 The Pacifico Project Authors |
| Caveat | OFL-1.1 | Copyright 2014 The Caveat Project Authors |
| Rubik Mono One | OFL-1.1 | Copyright 2015 The Rubik Project Authors |
| Orbitron | OFL-1.1 | Copyright 2018 The Orbitron Project Authors |
| Bebas Neue | OFL-1.1 | Copyright 2019 The Bebas Neue Project Authors |
| Share Tech Mono | OFL-1.1 | Copyright (c) 2012, Carrois Type Design, Ralph du Carrois, with Reserved Font Name "Share" |
| Audiowide | OFL-1.1 | Copyright (c) 2012 by Brian J. Bonislawsky DBA Astigmatic (AOETI), with Reserved Font Name "Audiowide" |
| VT323 | OFL-1.1 | Copyright 2011, The VT323 Project Authors |
| Kosugi Maru | Apache-2.0 | Copyright 2010 The Kosugi Maru Project Authors |
| DotGothic16 | OFL-1.1 | Copyright 2020 The DotGothic16 Project Authors |
| Zen Maru Gothic | OFL-1.1 | Copyright 2021 The Zen Maru Gothic Authors |
| Black Han Sans | OFL-1.1 | Copyright 2015 The Black Han Sans Project Authors |
| Do Hyeon | OFL-1.1 | Copyright 2018 The Do Hyeon Project Authors |
| Jua | OFL-1.1 | Copyright 2018 The BM JUA Project Authors |
