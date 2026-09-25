// ---------------------------------------------------------------------------
// storage.js  --  a very small "safe" wrapper around the browser's localStorage.
//
// Why not use localStorage directly?
//   * In some browsers/preview windows localStorage is blocked and throws.
//   * This file catches that error and falls back to keeping data in memory,
//     so your demo never crashes.
// The Backend Team will replace this with Firebase, so nothing here is final.
// ---------------------------------------------------------------------------

const memory = new Map()

function hasLocalStorage() {
  try {
    const key = '__mra_test__'
    window.localStorage.setItem(key, '1')
    window.localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

const canUseLocalStorage = typeof window !== 'undefined' && hasLocalStorage()

export function readStore(key, fallback) {
  try {
    if (!canUseLocalStorage) {
      return memory.has(key) ? memory.get(key) : fallback
    }
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writeStore(key, value) {
  try {
    if (canUseLocalStorage) {
      window.localStorage.setItem(key, JSON.stringify(value))
    } else {
      memory.set(key, value)
    }
  } catch {
    // Storage full or blocked -> keep it in memory only. Not a crash.
    memory.set(key, value)
  }
}

export function removeStore(key) {
  try {
    if (canUseLocalStorage) window.localStorage.removeItem(key)
    memory.delete(key)
  } catch {
    memory.delete(key)
  }
}
