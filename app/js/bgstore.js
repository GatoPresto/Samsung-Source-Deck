// Downloaded background images, kept in the app's own IndexedDB (not in localStorage: too small, text only).
// A record: {key, blob, source, title, credit, creditUrl, size, usedAt}. `key` looks like "unsplash:<id>", "wallhaven:<id>", "router:<url>", "usb:<path>".
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

export const bgPut = record => run("readwrite", store => store.put({...record, size: record.blob.size, usedAt: Date.now()}));
export const bgGet = key => run("readonly", store => store.get(key));
export const bgDelete = key => run("readwrite", store => store.delete(key));
export const bgAll = () => run("readonly", store => store.getAll());
export const bgTouch = async key => { const record = await bgGet(key); if (record) await bgPut({...record}); };
