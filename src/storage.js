// Browser-local persistence (IndexedDB). Nothing leaves the machine.
// Stores: session (last map + view state), pdfs (exact bytes by SHA-256), notes (per project).
const DB = 'quick-reading-viewer', VERSION = 1;
let opening = null;

function open() {
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('Browser storage (IndexedDB) is unavailable.')); return; }
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of ['session', 'pdfs', 'notes']) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch(e => { opening = null; throw e; });
  return opening;
}

async function run(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode), s = tx.objectStore(store);
    let result;
    const req = fn(s);
    if (req) req.onsuccess = () => { result = req.result; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted'));
  });
}

export const storage = {
  get: (store, key) => run(store, 'readonly', s => s.get(key)),
  put: (store, key, value) => run(store, 'readwrite', s => s.put(value, key)),
  delete: (store, key) => run(store, 'readwrite', s => s.delete(key)),
  keys: store => run(store, 'readonly', s => s.getAllKeys()),
  clear: store => run(store, 'readwrite', s => s.clear())
};

export const isQuotaError = e => e?.name === 'QuotaExceededError' || /quota/i.test(e?.message || '');
