// ===========================================================================
// geo.js  --  location helpers (browser GPS + distance maths)
// ===========================================================================
//
// Two jobs:
//
//   1. getBrowserLocation()  - ask the phone/laptop where it is.
//      This is the WEB BROWSER's own location API. No Google Maps key, no
//      signup, no billing - the browser does it for free.
//
//   2. distanceKm()          - how far apart two points are, in kilometres.
//      Uses the "haversine" formula, which is the standard way to measure
//      distance on a sphere. Your phone does not send this - we work it out
//      ourselves from the two pairs of coordinates.
//
// ⚠️ IMPORTANT: the browser only gives your location on a SECURE page.
//    That means https:// or localhost. It works on
//      - https://lokeshhhh3.github.io/...   ✅
//      - http://localhost:5173              ✅
//    but NOT on plain http:// for any other address.
// ===========================================================================

/** How long we wait for the browser to answer, in milliseconds. */
const TIMEOUT_MS = 12000

/**
 * Ask the browser for the user's current position.
 *
 * Returns a Promise that resolves to { lat, lng, accuracy }.
 * Throws an Error with a message you can show to the user.
 *
 * The browser will pop up its own "Allow location?" question the first time.
 */
export function getBrowserLocation({ timeout = TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    // 1. Is the API even there? (Older browsers, or a non-secure page.)
    if (!('geolocation' in navigator)) {
      reject(new Error('This browser cannot share your location. Please pick the point on the map instead.'))
      return
    }

    // 2. Ask. The callback below runs once, either way.
    navigator.geolocation.getCurrentPosition(
      // ---- success ----
      (position) => {
        resolve({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          accuracy: position.coords.accuracy || 0, // metres, roughly
        })
      },
      // ---- failure ----
      (error) => {
        reject(new Error(explainGeoError(error)))
      },
      {
        enableHighAccuracy: true, // use GPS rather than wifi guessing, if available
        timeout, // give up after this long
        maximumAge: 30000, // a reading from the last 30s is good enough
      },
    )
  })
}

/**
 * Turn the browser's error code into a sentence a normal person understands.
 * The codes are defined by the browser, not by us:
 *   1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
 */
function explainGeoError(error) {
  switch (error?.code) {
    case 1:
      return 'You blocked location access. Either allow it in the address bar (the padlock icon) or pick the point on the map instead.'
    case 2:
      return 'Your device could not work out where it is. Pick the point on the map instead.'
    case 3:
      return 'Finding your location took too long. Try again, or pick the point on the map.'
    default:
      return 'Could not get your location. Please pick the point on the map instead.'
  }
}

// ---------------------------------------------------------------------------
// DISTANCE
// ---------------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371
const toRadians = (degrees) => (degrees * Math.PI) / 180

/**
 * distanceKm(lat1, lng1, lat2, lng2) -> number of kilometres (straight line)
 *
 * The haversine formula:
 *   1. Work out how different the two latitudes are, and the two longitudes.
 *   2. Convert those differences into "how much of a circle" (radians).
 *   3. Feed them through the formula to get the angle between the two points
 *      as seen from the centre of the Earth.
 *   4. Multiply by the Earth's radius to turn an angle into kilometres.
 *
 * It treats the Earth as a smooth ball, so it can be off by up to ~0.5%.
 * For "is this report within 5 km of me?" that is more than good enough.
 */
export function distanceKm(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const angle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * angle
}

/** "350 m" or "4.2 km" - short enough for a badge on a card. */
export function formatDistance(km) {
  if (!Number.isFinite(km)) return ''
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

/**
 * The radius choices offered in the filters.
 * Keep this list small - a long dropdown on a phone is annoying.
 */
export const NEAR_ME_RADII = [
  { value: '1', label: 'Within 1 km' },
  { value: '5', label: 'Within 5 km' },
  { value: '10', label: 'Within 10 km' },
  { value: '25', label: 'Within 25 km' },
]
