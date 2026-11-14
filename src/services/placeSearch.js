// ===========================================================================
// placeSearch.js  --  "type a place name"  ->  latitude / longitude
//
// We use OpenStreetMap's Nominatim service. It is FREE, needs no API key,
// no account, no credit card and no billing.
//
// Nominatim's rules (we must follow them, or our IP gets blocked):
//   * At most 1 request per second.
//   * Results must be cached, not re-fetched for the same text.
//   * The app must identify itself - the browser sends the page address
//     automatically, which is enough.
//
// There is also a small in-memory cache here, so typing "Uppal" three times
// does not hit the network three times.
// ===========================================================================

const ENDPOINT = import.meta.env.VITE_NOMINAT_URL || 'https://nominatim.openstreetmap.org'

// Only look inside India, because our college is in Hyderabad.
// Change this to '' if you ever want to search the whole world.
const COUNTRY_CODES = 'in'

// Nominatim allows 1 request per second. We use 1.1s to be safe.
const MIN_GAP_MS = 1100

// How many searches we keep in memory.
const CACHE_LIMIT = 40

const cache = new Map()
let lastRequestAt = 0

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Waits until at least MIN_GAP_MS has passed since our previous request.
async function waitForTurn() {
  const now = Date.now()
  const wait = Math.max(0, lastRequestAt + MIN_GAP_MS - now)
  lastRequestAt = now + wait
  if (wait > 0) await sleep(wait)
}

// Turns one raw Nominatim result into the small, clean object our app uses.
function toPlace(item) {
  const parts = String(item.display_name || '').split(',')
  return {
    id: String(item.place_id),
    name: item.name || parts[0] || 'Unnamed place',
    address: parts.slice(1).join(',').trim() || item.display_name || '',
    lat: Number(item.lat),
    lng: Number(item.lon),
    kind: item.addresstype || item.category || item.type || 'place',
  }
}

/**
 * Search for places, addresses and landmarks.
 *
 * @param  {string} query               what the user typed
 * @param  {object} [options]
 * @param  {number} [options.limit]     how many suggestions to return
 * @returns {Promise<Array>}            [] when the query is too short
 * @throws  {Error}                     when the network call fails
 */
export async function searchPlaces(query, { limit = 6 } = {}) {
  const text = String(query || '').trim()
  if (text.length < 3) return []

  const cacheKey = `${text.toLowerCase()}|${limit}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    namedetails: '1',
    limit: String(limit),
    q: text,
  })
  if (COUNTRY_CODES) params.set('countrycodes', COUNTRY_CODES)

  await waitForTurn()

  const response = await fetch(`${ENDPOINT}/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Place search failed (${response.status}). Please try again.`)
  }

  const data = await response.json()
  const results = Array.isArray(data)
    ? data.map(toPlace).filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng))
    : []

  cache.set(cacheKey, results)
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value)

  return results
}
