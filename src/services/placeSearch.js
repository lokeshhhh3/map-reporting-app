// Place search for Navigate. Photon is an OpenStreetMap-based geocoder that
// supports search-as-you-type. Its public endpoint is a demo service with no
// availability guarantee; VITE_PLACE_SEARCH_URL can point to another Photon
// instance. Keep results in memory only, and never cache failures.
const ENDPOINT = (import.meta.env.VITE_PLACE_SEARCH_URL || 'https://photon.komoot.io').replace(/\/+$/, '')
const CACHE_LIMIT = 40
const REQUEST_TIMEOUT_MS = 10000
const cache = new Map()

function toPlace(feature) {
  if (feature?.geometry?.type !== 'Point') return null
  const coordinates = feature.geometry.coordinates
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null
  const [lng, lat] = coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const details = feature.properties || {}
  // Keep the existing India-only scope when country information is present.
  if (details.countrycode && String(details.countrycode).toUpperCase() !== 'IN') return null
  const name = details.name || details.street || details.city || details.district
  if (!name) return null
  const addressParts = [details.street, details.locality, details.district, details.city, details.county, details.state, details.postcode, details.country]
  const address = [...new Set(addressParts.filter((part) => part && part !== name))].join(', ')
  return {
    id: details.osm_id != null ? `${details.osm_type || 'osm'}-${details.osm_id}` : `${lat},${lng},${name}`,
    name,
    address: address || 'India',
    lat,
    lng,
    kind: details.osm_value || details.type || 'place',
  }
}

/** Search for a place in India. A failed service is not an empty result. */
export async function searchPlaces(query, { limit = 6 } = {}) {
  const text = String(query || '').trim()
  if (text.length < 3) return []

  const cacheKey = `${text.toLowerCase()}|${limit}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  const params = new URLSearchParams({
    q: text,
    limit: String(limit),
    lang: 'en',
    // Rank results near Hyderabad higher, without pretending the user is there.
    lat: '17.385',
    lon: '78.4867',
    bbox: '68,6,98,38',
  })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let response
  try {
    response = await fetch(`${ENDPOINT}/api/?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) {
      if (response.status === 429) throw new Error('Place search is busy. Wait a moment and try again.')
      throw new Error('Place search is temporarily unavailable. Please try again.')
    }
    const data = await response.json()
    if (!data || !Array.isArray(data.features)) {
      throw new Error('Place search returned an unexpected response. Please try again.')
    }
    const results = data.features.map(toPlace).filter(Boolean)
    cache.set(cacheKey, results)
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value)
    return results
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Place search timed out. Check your connection and try again.')
    if (error instanceof TypeError) throw new Error('Could not connect to place search. Check your connection and try again.')
    if (error instanceof SyntaxError) throw new Error('Place search returned an unexpected response. Please try again.')
    throw error
  } finally {
    clearTimeout(timer)
  }
}
