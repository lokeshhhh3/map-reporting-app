// ===========================================================================
// routeService.js  --  turn two points into a real road route.
//
// We use Valhalla (valhalla.openstreetmap.de), a free open-source routing
// engine. No API key, no account, no credit card, no billing.
//
// It gives us:
//   * the REAL road network (not a straight line between two dots)
//   * travel time and distance
//   * turn-by-turn instructions
//   * a genuinely different network for driving, walking and cycling
//     (a foot route uses footpaths, a bike route uses cycle lanes)
//
// ---------------------------------------------------------------------------
// WHY NOT OSRM? Its public demo server ignores the profile: it answers
// "foot" and "bike" with the car network, so a walking route would come back
// with a car journey time. Valhalla gives different real answers for each
// mode, which is the whole point of the travel-mode buttons.
//
// ---------------------------------------------------------------------------
// ALTERNATIVE ROUTES: Valhalla's free public instance does not serve the
// "alternates" option. So we build our own alternatives the way real routers
// do it: we ask for the same journey but forced through a point a little to
// the left and a little to the right of the direct line. Each answer is a
// real, drivable road route - just a different one. We then throw away any
// candidate that is basically the same as the direct route.
// ===========================================================================

const ENDPOINT = import.meta.env.VITE_VALHALLA_URL || 'https://valhalla1.openstreetmap.de/route'

// Which engine profile matches which of our travel modes.
export const COSTING = {
  driving: 'auto',
  walking: 'pedestrian',
  cycling: 'bicycle',
}

export const MODE_LABELS = {
  driving: 'Driving',
  walking: 'Walking',
  cycling: 'Cycling',
}

/**
 * Decode Google's "encoded polyline" format into a list of [lat, lng] pairs.
 *
 * Valhalla sends the shape of the route as one long string where every
 * character packs part of a latitude or longitude. This is the standard
 * algorithm for unpacking it - about 20 lines, and it saves us adding a
 * polyline package to the project.
 *
 * @param {string} encoded
 * @param {number} precision 6 for lat/lng, 5 for other formats
 * @returns {Array<[number, number]>}  [lat, lng] pairs
 */
export function decodePolyline(encoded, precision = 6) {
  const points = []
  if (!encoded) return points

  const factor = 10 ** precision
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    lat += result & 1 ? ~(result >> 1) : result >> 1

    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    lng += result & 1 ? ~(result >> 1) : result >> 1

    points.push([lat / factor, lng / factor])
  }

  return points
}

/** Ask Valhalla for one route. Returns the raw answer from the server. */
async function askValhalla({ origin, destination, mode, vias = [] }) {
  const costing = COSTING[mode] || COSTING.driving

  // A "via" point is a place the route must go through. Valhalla gives us
  // a separate leg for each one, which is exactly what we want for a stop.
  const viaLocations = vias.map((via) => ({ lat: via.lat, lon: via.lng, type: 1 }))

  const locations = [
    { lat: origin.lat, lon: origin.lng },
    ...viaLocations,
    { lat: destination.lat, lon: destination.lng },
  ]

  const payload = {
    locations,
    costing,
    directions_options: { units: 'kilometers' },
  }

  const url = `${ENDPOINT}?json=${encodeURIComponent(JSON.stringify(payload))}`

  const response = await fetch(url, { headers: { Accept: 'application/json' } })

  if (!response.ok) {
    throw new Error(`The routing service did not answer (${response.status}). Please try again.`)
  }

  const data = await response.json()
  if (data.error) throw new Error(data.error)

  return data
}

/** Turn the raw Valhalla answer into the small object our page uses. */
function toRoute(data, id, label) {
  const trip = data.trip
  if (!trip || !trip.legs || !trip.legs.length) {
    throw new Error('No road route was found between those two points.')
  }

  const geometry = []
  const steps = []

  trip.legs.forEach((leg) => {
    leg.maneuvers.forEach((maneuver) => {
      steps.push({
        instruction: maneuver.instruction || 'Continue',
        street: Array.isArray(maneuver.street_names) ? maneuver.street_names.join(', ') : '',
        distanceKm: Number(maneuver.length || 0),
        durationMin: Math.round(Number(maneuver.time || 0) / 60),
        type: maneuver.type,
        travelMode: maneuver.travel_mode || '',
      })
    })
    const shape = decodePolyline(leg.shape)
    geometry.push(...shape)
  })

  return {
    id,
    label,
    distanceKm: Number(trip.summary?.length || 0),
    durationMin: Math.round(Number(trip.summary?.time || 0) / 60),
    geometry,
    steps,
  }
}

/**
 * One route, the fastest way from A to B.
 *
 * @param {object} options
 * @param {{lat:number,lng:number}} options.origin
 * @param {{lat:number,lng:number}} options.destination
 * @param {string} [options.mode] 'driving' | 'walking' | 'cycling'
 * @param {{lat:number,lng:number}} [options.via] one place the route must pass
 * @param {Array<{lat:number,lng:number}>} [options.vias] several such places
 */
export async function getRoute({ origin, destination, mode = 'driving', via = null, vias = [] }) {
  const allVias = vias.length ? vias : via ? [via] : []
  const data = await askValhalla({ origin, destination, mode, vias: allVias })
  return toRoute(data, 'direct', 'Direct')
}

/**
 * A point a little to the side of the straight line between A and B.
 * Used to force Valhalla to pick a different road.
 */
function offsetPoint(a, b, metres, side) {
  const midLat = (a.lat + b.lat) / 2
  const midLng = (a.lng + b.lng) / 2

  // A vector at right angles to the A -> B line.
  let pLat = -(b.lng - a.lng)
  let pLng = b.lat - a.lat

  const length = Math.hypot(pLat, pLng) || 1
  pLat = (pLat / length) * side
  pLng = (pLng / length) * side

  const metresPerDegreeLat = 111320
  const metresPerDegreeLng = 111320 * Math.cos((midLat * Math.PI) / 180) || 1

  return {
    lat: midLat + (pLat * metres) / metresPerDegreeLat,
    lng: midLng + (pLng * metres) / metresPerDegreeLng,
  }
}

/**
 * The route, plus a couple of different ways to do the same journey.
 * Returns them sorted fastest first.
 *
 * If the user has added stops, every option goes through those stops too.
 */
export async function getRouteOptions({ origin, destination, mode = 'driving', vias = [] }) {
  const direct = await getRoute({ origin, destination, mode, vias })
  const options = [direct]

  const sideRoutes = [
    offsetPoint(origin, destination, 450, 1),
    offsetPoint(origin, destination, 800, -1),
  ]

  for (let index = 0; index < sideRoutes.length; index += 1) {
    try {
      const candidate = await getRoute({
        origin,
        destination,
        mode,
        vias: [...vias, sideRoutes[index]],
      })

      // Throw away anything that is basically the same road as the direct one.
      const tooSimilar =
        Math.abs(candidate.distanceKm - direct.distanceKm) < Math.max(0.15, direct.distanceKm * 0.03)

      if (!tooSimilar) {
        options.push({
          ...candidate,
          id: `alt-${index + 1}`,
          label: `Via ${index + 1}`,
        })
      }
    } catch {
      // A missing alternative is not a problem - we still have the direct one.
    }
  }

  return options.sort((a, b) => a.durationMin - b.durationMin)
}

/** "1 h 24 min" / "48 min" - a nicer way to show a duration. */
export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (!hours) return `${mins} min`
  if (!mins) return `${hours} h`
  return `${hours} h ${mins} min`
}

/** "10.8 km" */
export function formatKm(km) {
  const value = Number(km) || 0
  return value < 10 ? `${value.toFixed(1)} km` : `${Math.round(value)} km`
}
