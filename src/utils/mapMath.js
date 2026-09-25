// ---------------------------------------------------------------------------
// mapMath.js  --  small math helpers used by MapView and MiniMap.
//
// WHY THIS FILE EXISTS:
// The Google Maps component (Maps Team) will do this job for real, using
// latitude/longitude. Our temporary placeholder map also needs to convert
// lat/lng <-> screen position, so we keep that math in ONE place.
// When the Maps Team gives you their component, this file stays untouched
// and you can keep using it for the MiniMap if you like.
// ---------------------------------------------------------------------------

// The area our placeholder map shows by default (Hyderabad city centre).
export const DEFAULT_BOUNDS = {
  north: 17.46,
  south: 17.31,
  west: 78.4,
  east: 78.58,
}

/** Keep latitude/longitude numbers valid. */
export function clampLat(lat) {
  return Math.max(-90, Math.min(90, lat))
}
export function clampLng(lng) {
  return Math.max(-180, Math.min(180, lng))
}

/**
 * Turn a latitude/longitude into a percentage position inside the map box.
 * Returns { x: 0..100, y: 0..100 } where 0% is left/top of the box.
 */
export function projectPoint(lat, lng, bounds = DEFAULT_BOUNDS) {
  const lngSpan = bounds.east - bounds.west
  const latSpan = bounds.north - bounds.south

  const x = ((lng - bounds.west) / lngSpan) * 100
  const y = ((bounds.north - lat) / latSpan) * 100 // latitude grows upwards

  return { x, y }
}

/** The opposite of projectPoint: screen percentage -> latitude/longitude. */
export function unprojectPoint(xPercent, yPercent, bounds = DEFAULT_BOUNDS) {
  const lngSpan = bounds.east - bounds.west
  const latSpan = bounds.north - bounds.south

  return {
    lat: bounds.north - (yPercent / 100) * latSpan,
    lng: bounds.west + (xPercent / 100) * lngSpan,
  }
}

/** Is this point inside the visible map area? */
export function isInside(lat, lng, bounds = DEFAULT_BOUNDS) {
  const { x, y } = projectPoint(lat, lng, bounds)
  return x >= 0 && x <= 100 && y >= 0 && y <= 100
}

/** Zoom in (factor < 1) or out (factor > 1) while keeping the same centre. */
export function zoomBounds(bounds, factor) {
  const centerLat = (bounds.north + bounds.south) / 2
  const centerLng = (bounds.east + bounds.west) / 2
  const halfLat = ((bounds.north - bounds.south) / 2) * factor
  const halfLng = ((bounds.east - bounds.west) / 2) * factor

  return {
    north: Math.min(90, centerLat + halfLat),
    south: Math.max(-90, centerLat - halfLat),
    west: Math.max(-180, centerLng - halfLng),
    east: Math.min(180, centerLng + halfLng),
  }
}

/** Nice short text for coordinates, e.g. "17.38710, 78.48910". */
export function formatLatLng(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return 'Not selected'
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

/** Human friendly date + time, e.g. "12 Sep 2026, 10:30 am". */
export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Date only, e.g. "12 Sep 2026". */
export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Small helper used all over the UI: "Complaint" -> "complaint". */
export function slugify(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}
