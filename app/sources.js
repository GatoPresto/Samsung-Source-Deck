window.sourceDeck = {
  // Apple Music Liquid Glass theme quality: "quality" (default) = full refraction on every visible element, redrawn only on scroll/content change; "focus" = only the highlighted item + the big lens; "lens" = only the big lens.
  // glass: "quality",
  dlna: [],
  // Media servers (DLNA/UPnP) are found automatically. To force one, add: dlna: [{ name: "My NAS", control: "http://192.168.1.5:8200/ctl/ContentDir" }],
  streams: [
    // { name: "Router media", url: "http://192.168.1.1:8080/live.m3u8" },
  ]
};
