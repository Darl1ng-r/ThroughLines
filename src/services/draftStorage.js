/**
 * Asynchronous Local Draft Persistence Engine (IndexedDB with LocalStorage Fallback)
 */

const DB_NAME = 'throughlines_drafts_db'
const STORE_NAME = 'drafts'

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null)
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

export async function saveDraft(key, data) {
  try {
    const db = await openDB()
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(data, key)
      return new Promise((resolve) => {
        tx.oncomplete = () => resolve(true)
        tx.onerror = () => resolve(false)
      })
    }
  } catch (_) {}
  // Fallback to localStorage
  try {
    if (data === null || data === undefined || data === '') {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data))
    }
  } catch (_) {}
}

export async function getDraft(key) {
  try {
    const db = await openDB()
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      return new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result !== undefined ? req.result : null)
        req.onerror = () => resolve(null)
      })
    }
  } catch (_) {}
  // Fallback to localStorage
  try {
    const val = localStorage.getItem(key)
    if (!val) return null
    try {
      return JSON.parse(val)
    } catch (_) {
      return val
    }
  } catch (_) {
    return null
  }
}

export async function removeDraft(key) {
  try {
    const db = await openDB()
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(key)
    }
  } catch (_) {}
  try {
    localStorage.removeItem(key)
  } catch (_) {}
}
