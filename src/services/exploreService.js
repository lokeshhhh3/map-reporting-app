/* ===========================================================================
 * exploreService.js  --  "Smart Route Discovery".
 *
 * THE IDEA
 *   When you have a route, the useful question is not "what is near my
 *   house?" but "what is ON THE WAY?". This file finds the places that are
 *   actually beside the road you are driving on.
 *
 * HOW WE SEARCH THE CORRIDOR (the important bit)
 *   1. The route is a long line of points. We chop it into 3-4 shorter
 *      "tiles" and give each tile its own small bounding box.
 *   2. For every tile we ask the free ArcGIS geocoder for the places of each
 *      category inside that small box. Small boxes mean the answers are
 *      genuinely beside your route instead of scattered across the city.
 *   3. Every answer is measured against the route line, and anything more
 *      than `radius` metres away from the road is thrown away.
 *
 * WHY TWO DIFFERENT FREE SERVICES
 *   ArcGIS World Geocoding   fast (0.2s), knows the TYPE of every place
 *                            ("Coffee Shop", "Gas Station"), gives phone
 *                            and website. No key, no account, no card.
 *   OpenStreetMap Nominatim  slower (1 request/second allowed) but it knows
 *                            OPENING HOURS and the CUISINE. So we use it as
 *                            a second pass for the closest places only, and
 *                            the details arrive a moment later.
 *
 * ABOUT RATINGS AND PHOTOS
 *   Neither of the free services carries star ratings or photos. The data
 *   model below has `rating`, `ratingCount` and `photoUrl` fields, and if
 *   you ever add a keyed provider (OpenTripMap is free, but it wants an
 *   account) it drops straight in - see loadRatings() at the bottom.
 *   Until then the UI says "no rating yet" instead of inventing one.
 * =========================================================================== */

const ARCGIS_BASE = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates'
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'

// We also use the routing engine to work out how long a detour really is.
import { getRoute } from './routeService.js'

// The 9 groups of places we look for, exactly as the feature list asks for.
export const EXPLORE_CATEGORIES = [
  {
    id: 'restaurants',
    label: 'Restaurants',
    icon: '🍽️',
    color: '#ef4444',
    query: 'restaurant',
    types: ['Restaurant', 'Fast Food', 'Indian Food', 'Chinese Food', 'Continental Food', 'Sandwich Shop', 'Snacks', 'Pizza', 'Ice Cream Shop', 'Bar or Pub'],
  },
  {
    id: 'cafes',
    label: 'Cafés',
    icon: '☕',
    color: '#a16207',
    query: 'coffee',
    types: ['Coffee Shop', 'Tea House'],
  },
  {
    id: 'bakeries',
    label: 'Bakeries',
    icon: '🥐',
    color: '#d97706',
    query: 'bakery',
    types: ['Bakery'],
  },
  {
    id: 'shopping',
    label: 'Shopping',
    icon: '🛍️',
    color: '#7c3aed',
    query: 'shopping center',
    types: ['Shopping Center', 'Clothing Store', 'Department Store', 'Specialty Store', 'Grocery', 'Consumer Electronics Store', 'Footwear', 'Beauty Salon', 'Jewelry Store', 'Pet Store'],
  },
  {
    id: 'attractions',
    label: 'Attractions',
    icon: '🎟️',
    color: '#0891b2',
    query: 'tourist attraction',
    types: ['Tourist Attraction', 'Museum', 'Historical Monument', 'Monument', 'Zoo', 'Aquarium', 'Art Gallery', 'Landmark'],
  },
  {
    id: 'parks',
    label: 'Parks',
    icon: '🌳',
    color: '#16a34a',
    query: 'park',
    types: ['Park', 'Plaza', 'Garden', 'Playground'],
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    icon: '🎬',
    color: '#db2777',
    query: 'cinema',
    types: ['Cinema', 'Performing Arts', 'Theater', 'Night Club', 'Arcade', 'Amusement Park'],
  },
  {
    id: 'hospitals',
    label: 'Hospitals',
    icon: '🏥',
    color: '#dc2626',
    query: 'hospital',
    types: ['Hospital', 'Medical Clinic', 'Medical Center', 'Urgent Care'],
  },
  {
    id: 'atms',
    label: 'ATMs',
    icon: '🏧',
    color: '#0284c7',
    query: 'atm',
    types: ['ATM'],
  },
  {
    id: 'fuel',
    label: 'Fuel',
    icon: '⛽',
    color: '#ea580c',
    query: 'gas station',
    types: ['Gas Station'],
  },
]

export const DEFAULT_CATEGORY_IDS = EXPLORE_CATEGORIES.map((category) => category.id)

// Average speed we use to guess how long the detour would take.
const SPEED_KMH = { driving: 28, walking: 4.5, cycling: 12 }

/* -------------------------------------------------------------------------- */
/* Small maths helpers                                                        */
/* -------------------------------------------------------------------------- */

const EARTH_RADIUS_M = 6371000

export function haversineMetres(a, b) {
  const toRad = (value) => (value * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * How far is this point from the route line? We measure to every little
 * segment of the route and keep the smallest answer.
 */
export function distanceToRouteMetres(lat, lng, geometry) {
  if (!Array.isArray(geometry) || geometry.length === 0) return Infinity
  if (geometry.length === 1) {
    return haversineMetres({ lat, lng }, { lat: geometry[0][0], lng: geometry[0][1] })
  }

  let best = Infinity

  for (let index = 0; index < geometry.length - 1; index += 1) {
    const [lat1, lng1] = geometry[index]
    const [lat2, lng2] = geometry[index + 1]

    const toRad = (value) => (value * Math.PI) / 180
    const meanLat = toRad((lat1 + lat2) / 2)

    // Work in metres so the maths is simple.
    const dx = toRad(lng2 - lng1) * EARTH_RADIUS_M * Math.cos(meanLat)
    const dy = toRad(lat2 - lat1) * EARTH_RADIUS_M

    const px = toRad(lng - lng1) * EARTH_RADIUS_M * Math.cos(meanLat)
    const py = toRad(lat - lat1) * EARTH_RADIUS_M

    const lengthSquared = dx * dx + dy * dy
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared))

    const distance = Math.hypot(px - t * dx, py - t * dy)
    if (distance < best) best = distance
  }

  return best
}

/** "350 m" / "1.2 km" */
export function formatDistance(metres) {
  const value = Number(metres) || 0
  if (value < 950) return `${Math.round(value / 10) * 10} m`
  return `${(value / 1000).toFixed(1)} km`
}

/**
 * Which point of the route is closest to this place? We need that point
 * so we can ask the routing engine "how long does it take to get from the
 * road to this place?".
 */
export function nearestRouteIndex(lat, lng, geometry) {
  if (!Array.isArray(geometry) || geometry.length === 0) return { index: 0, metres: Infinity }

  let bestIndex = 0
  let bestMetres = Infinity

  for (let index = 0; index < geometry.length; index += 1) {
    const metres = haversineMetres(
      { lat, lng },
      { lat: geometry[index][0], lng: geometry[index][1] },
    )
    if (metres < bestMetres) {
      bestMetres = metres
      bestIndex = index
    }
  }

  return { index: bestIndex, metres: bestMetres }
}

/**
 * The QUICK guess of the extra time, used while the list is still loading.
 * The real number arrives later - see measureRealDetours() below.
 */
export function estimateDetourMinutes(distanceMetres, mode = 'driving') {
  const speed = SPEED_KMH[mode] || SPEED_KMH.driving
  return Math.max(1, Math.round(((distanceMetres * 2) / 1000 / speed) * 60))
}

/**
 * The REAL extra time, measured with the routing engine.
 *
 * "400 m from the road" sounds like nothing, but the path to the door can
 * be a long winding road inside a big compound. So we ask the routing
 * engine how long it takes to get from the road to the place, and then
 * double it, because you have to come back to the road as well.
 *
 * One extra request per place, so we only do it for the closest ones.
 */
export async function measureRealDetours(places, geometry, mode = 'driving', { limit = 8, onUpdate } = {}) {
  const targets = places.slice(0, limit)

  for (const place of targets) {
    try {
      const { index } = nearestRouteIndex(place.lat, place.lng, geometry)
      const roadPoint = geometry[Math.max(0, Math.min(geometry.length - 1, index))]

      const leg = await getRoute({
        origin: { lat: roadPoint[0], lng: roadPoint[1] },
        destination: { lat: place.lat, lng: place.lng },
        mode,
      })

      place.detourKm = Number((leg.distanceKm * 2).toFixed(2))
      place.detourMinutes = Math.max(1, leg.durationMin * 2)
      place.detourIsMeasured = true
    } catch {
      // If the measurement fails we keep the quick guess.
    }

    if (onUpdate) onUpdate(place)
  }

  return places
}

/* -------------------------------------------------------------------------- */
/* Chopping the route into tiles                                              */
/* -------------------------------------------------------------------------- */

function boundingBox(points, marginMetres = 1200) {
  const lats = points.map((point) => point[0])
  const lngs = points.map((point) => point[1])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const latMargin = marginMetres / 111320
  const lngMargin = marginMetres / (111320 * Math.cos(((minLat + maxLat) / 2 * Math.PI) / 180) || 1)

  return {
    minLat: minLat - latMargin,
    maxLat: maxLat + latMargin,
    minLng: minLng - lngMargin,
    maxLng: maxLng + lngMargin,
  }
}

/**
 * Cut the route into a few short pieces so each search is done over a small
 * area. A short route is one tile; a long one is up to four.
 */
export function buildCorridorTiles(geometry) {
  if (!Array.isArray(geometry) || geometry.length < 2) return []

  const tileCount = Math.max(1, Math.min(4, Math.round(geometry.length / 90)))

  if (tileCount === 1) {
    return [{ bbox: boundingBox(geometry), points: geometry }]
  }

  const tiles = []
  const perTile = Math.ceil(geometry.length / tileCount)

  for (let index = 0; index < tileCount; index += 1) {
    const slice = geometry.slice(index * perTile, (index + 1) * perTile)
    if (slice.length < 2) continue
    tiles.push({ bbox: boundingBox(slice), points: slice })
  }

  return tiles
}

/* -------------------------------------------------------------------------- */
/* Asking ArcGIS for the places inside one tile                              */
/* -------------------------------------------------------------------------- */

// We remember the answer for each little search, so pressing the button a
// second time is instant instead of waiting again.
const searchCache = new Map()

function cacheKey(categoryId, bbox) {
  const round = (value) => value.toFixed(3)
  return `${categoryId}|${round(bbox.minLat)},${round(bbox.minLng)},${round(bbox.maxLat)},${round(bbox.maxLng)}`
}

async function fetchArcGisCategory(category, bbox) {
  const key = cacheKey(category.id, bbox)
  if (searchCache.has(key)) return searchCache.get(key)

  const extent = `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`

  const params = new URLSearchParams({
    f: 'json',
    SingleLine: category.query,
    searchExtent: extent,
    maxLocations: '40',
    outFields: 'Type,PlaceName,Place_addr,Phone,URL,City,Postal,Sector,Neighborhood,Match_addr',
  })

  const response = await fetch(`${ARCGIS_BASE}?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`Place search failed (${response.status}).`)
  }

  const data = await response.json()
  if (data.error) throw new Error(data.error.message || 'Place search failed.')

  const candidates = data.candidates || []
  searchCache.set(key, candidates)
  return candidates
}

/** Turn one ArcGIS answer into the shape our page uses. */
function toPlace(candidate, category) {
  const attributes = candidate.attributes || {}
  const x = attributes.X ?? candidate.location?.x
  const y = attributes.Y ?? candidate.location?.y

  if (typeof x !== 'number' || typeof y !== 'number') return null

  const name = attributes.PlaceName || attributes.Match_addr || attributes.ShortLabel
  if (!name) return null

  const type = attributes.Type || category.label

  return {
    id: `${category.id}-${name}-${x.toFixed(4)}-${y.toFixed(4)}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    categoryId: category.id,
    categoryLabel: category.label,
    categoryIcon: category.icon,
    categoryColor: category.color,
    type,
    lat: y,
    lng: x,
    address: attributes.Place_addr || attributes.Match_addr || attributes.Sector || '',
    phone: attributes.Phone || '',
    website: attributes.URL || '',
    openingHours: '',
    cuisine: '',
    rating: null,
    ratingCount: null,
    photoUrl: '',
    distanceFromRoute: null,
    detourMinutes: null,
    detourKm: null,
    detourIsMeasured: false,
  }
}

/* -------------------------------------------------------------------------- */
/* The main search                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Find the places that sit beside the route.
 *
 * @param {object} options
 * @param {Array<[number,number]>} options.geometry  the route line
 * @param {string} [options.mode] 'driving' | 'walking' | 'cycling'
 * @param {string[]} [options.categoryIds] which groups to look for
 * @param {number} [options.radius] how far from the road is still "on the way"
 * @param {(info:object)=>void} [options.onProgress] called as results arrive
 */
export async function exploreAlongRoute({
  geometry,
  mode = 'driving',
  categoryIds = DEFAULT_CATEGORY_IDS,
  radius = 1200,
  onProgress,
} = {}) {
  if (!Array.isArray(geometry) || geometry.length < 2) {
    return { places: [], tiles: 0 }
  }

  const wanted = EXPLORE_CATEGORIES.filter((category) => categoryIds.includes(category.id))
  const tiles = buildCorridorTiles(geometry)

  const found = new Map()
  let done = 0
  const total = wanted.length * tiles.length

  // All the little searches we have to do, one per group per tile.
  // The order matters: we do EVERY group for the first piece of the route
  // before moving to the next piece. That way the list is useful after
  // about ten searches instead of only at the very end.
  const jobs = []
  tiles.forEach((tile) => {
    wanted.forEach((category) => jobs.push({ category, tile }))
  })

  // We run a few at the same time so the whole thing finishes quickly.
  const RUNNING_AT_ONCE = 4
  let cursor = 0

  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor]
      cursor += 1

      try {
        const candidates = await fetchArcGisCategory(job.category, job.tile.bbox)

        candidates.forEach((candidate) => {
          const type = candidate.attributes?.Type || ''
          // Keep only the places that really belong to this group.
          if (!job.category.types.includes(type)) return

          const place = toPlace(candidate, job.category)
          if (!place) return

          const key = `${place.name.toLowerCase()}|${place.lat.toFixed(3)}|${place.lng.toFixed(3)}`
          if (found.has(key)) return

          const distance = distanceToRouteMetres(place.lat, place.lng, geometry)
          if (distance > radius) return

          found.set(key, {
            ...place,
            distanceFromRoute: Math.round(distance),
            detourMinutes: estimateDetourMinutes(distance, mode),
          })
        })
      } catch {
        // One failed search must not break the whole thing.
      }

      done += 1
      if (onProgress) {
        onProgress({
          done,
          total,
          categoryLabel: job.category.label,
          places: Array.from(found.values()),
        })
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(RUNNING_AT_ONCE, jobs.length) }, () => worker()),
  )

  const places = Array.from(found.values()).sort(
    (a, b) => a.distanceFromRoute - b.distanceFromRoute,
  )

  return { places, tiles: tiles.length }
}

/* -------------------------------------------------------------------------- */
/* Second pass: opening hours from OpenStreetMap                             */
/* -------------------------------------------------------------------------- */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Nominatim lets us have only one request per second, so we only ask it
 * about the closest places and we do it slowly in the background. The list
 * appears straight away; the opening hours fill in as they arrive.
 */
export async function enrichWithOpeningHours(places, { limit = 8, onUpdate } = {}) {
  const targets = places.slice(0, limit)

  for (const place of targets) {
    // First try: look for the name inside a small box around the place.
    // Second try: look for the name anywhere in India.
    const attempts = [
      {
        q: place.name,
        viewbox: `${(place.lng - 0.02).toFixed(4)},${(place.lat + 0.02).toFixed(4)},${(place.lng + 0.02).toFixed(4)},${(place.lat - 0.02).toFixed(4)}`,
      },
      { q: `${place.name}, India` },
    ]

    for (const attempt of attempts) {
      try {
        const params = new URLSearchParams({
          q: attempt.q,
          format: 'jsonv2',
          limit: '5',
          extratags: '1',
          namedetails: '1',
          addressdetails: '1',
          countrycodes: 'in',
        })
        if (attempt.viewbox) params.set('viewbox', attempt.viewbox)
        params.set('bounded', '0')

        const response = await fetch(`${NOMINATIM_BASE}?${params.toString()}`)
        if (!response.ok) throw new Error('nominatim failed')

        const results = await response.json()
        if (!Array.isArray(results)) break

        const match = results.find((item) => {
          const itemName = item.name || item.namedetails?.name || ''
          const sameName = itemName.toLowerCase() === place.name.toLowerCase()
          const close =
            haversineMetres(
              { lat: place.lat, lng: place.lng },
              { lat: Number(item.lat), lng: Number(item.lon) },
            ) < 300
          return sameName || (close && itemName.length > 3)
        })

        if (match) {
          const extra = match.extratags || {}
          place.openingHours = extra.opening_hours || place.openingHours
          place.cuisine = extra.cuisine || place.cuisine
          if (!place.website) place.website = extra.website || extra['contact:website'] || ''
          if (!place.phone) place.phone = extra.phone || extra['contact:phone'] || ''
          break
        }
      } catch {
        // Try the next way of looking it up.
      }

      await sleep(400)
    }

    if (onUpdate) onUpdate(place)
    await sleep(1050) // Nominatim allows one request per second.
  }

  return places
}

/* -------------------------------------------------------------------------- */
/* Optional: star ratings and photos                                         */
/* -------------------------------------------------------------------------- */

/**
 * OpenTripMap is free and needs no credit card, but it does need an account,
 * so it stays switched off until you put a key in your .env file:
 *
 *   VITE_OPENTRIPMAP_KEY=your_key_here
 *
 * Without a key this function does nothing at all and the UI shows
 * "no rating yet" - it never makes up a number.
 */
export async function loadRatings(places, { limit = 12 } = {}) {
  const key = import.meta.env.VITE_OPENTRIPMAP_KEY
  if (!key) return places

  const targets = places.slice(0, limit)

  for (const place of targets) {
    try {
      const params = new URLSearchParams({
        apikey: key,
        lat: String(place.lat),
        lon: String(place.lng),
        radius: '300',
        limit: '3',
        format: 'json',
      })

      const response = await fetch(`https://api.opentripmap.com/0.1/en/places/nearby?${params.toString()}`)
      if (!response.ok) continue

      const data = await response.json()
      const hit = (data.features || []).find((feature) => {
        const name = feature.properties?.name || ''
        return name.toLowerCase() === place.name.toLowerCase()
      })

      if (hit) {
        place.rating = Number(hit.properties?.rate) || null
        place.ratingCount = Number(hit.properties?.rate_count) || null
        place.photoUrl = hit.properties?.image || ''
      }
    } catch {
      // Ignore - the place is still useful without a rating.
    }
  }

  return places
}
