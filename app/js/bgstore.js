// Downloaded background images, kept in the app's own IndexedDB (not in localStorage: too small, text only).
// A record: {key, blob, source, title, credit, creditUrl, size, usedAt, starred?, starredAt?, thumb?}. Starred pictures are kept even when no source uses them; `thumb` is a small JPEG for the Starred grid. `key` looks like "unsplash:<id>", "wallhaven:<id>", "router:<url>", "usb:<path>".
const DB = "deck-bg", STORE = "images";
let dbPromise = null;

const openAt = version => new Promise((resolve, reject) => {
  const request = version ? indexedDB.open(DB, version) : indexedDB.open(DB);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, {keyPath: "key"});
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

function open() {
  if (!dbPromise) {
    // If an old database exists without the store (version 1 but empty), reopen one version higher to create it.
    dbPromise = openAt().then(db => {
      if (db.objectStoreNames.contains(STORE)) return db;
      const next = db.version + 1;
      db.close();
      return openAt(next);
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

const run = (mode, fn) => open().then(db => new Promise((resolve, reject) => {
  const tx = db.transaction(STORE, mode);
  const result = fn(tx.objectStore(STORE));
  tx.oncomplete = () => resolve(result && "result" in result ? result.result : undefined);
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error);
}));

/** Store a picture; keeps the star flag and thumbnail of an existing record (the new fields win when given). */
export const bgPut = record => open().then(db => new Promise((resolve, reject) => {
  const tx = db.transaction(STORE, "readwrite"), store = tx.objectStore(STORE);
  const read = store.get(record.key);
  read.onsuccess = () => {
    const old = read.result || {};
    const keep = {}; for (const f of ["starred", "starredAt", "thumb"]) if (old[f] !== undefined) keep[f] = old[f];
    store.put({...keep, ...record, size: record.blob.size, usedAt: Date.now()});
  };
  tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(tx.error);
}));
/** Star or unstar a stored picture (a thumbnail blob can be given when starring). Resolves false when the picture is not stored. */
export const bgSetStar = (key, starred, thumb) => open().then(db => new Promise((resolve, reject) => {
  const tx = db.transaction(STORE, "readwrite"), store = tx.objectStore(STORE);
  let found = false;
  const read = store.get(key);
  read.onsuccess = () => {
    const record = read.result;
    if (!record) return;
    found = true;
    if (starred) { record.starred = true; record.starredAt = Date.now(); if (thumb) record.thumb = thumb; }
    else { delete record.starred; delete record.starredAt; }
    store.put(record);
  };
  tx.oncomplete = () => resolve(found); tx.onerror = tx.onabort = () => reject(tx.error);
}));
export const bgGet = key => run("readonly", store => store.get(key));
export const bgDelete = key => run("readwrite", store => store.delete(key));
export const bgAll = () => run("readonly", store => store.getAll());
export const bgTouch = async key => { const record = await bgGet(key); if (record) await bgPut({...record}); };
