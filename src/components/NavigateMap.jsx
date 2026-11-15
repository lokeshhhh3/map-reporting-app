/* ===========================================================================
 * NavigateMap.jsx  --  the big interactive map on the new "Navigate" page.
 *
 * WHY A SECOND MAP COMPONENT?
 *   MapView.jsx is the map used by the report form (click to drop a pin)
 *   and by the reports browser. It is small and does one job.
 *   This one is different: it draws a route line, a start pin, a destination
 *   pin, the "you are here" dot, place markers and event markers.
 *   Keeping them apart means nothing you already have can break.
 *
 * It uses the SAME Leaflet + OpenStreetMap tiles as the rest of the app,
 * and the SAME pin styling (.mrp-pin), so it looks like the same website.
 *
 * THE PROPS CONTRACT
 *   reports        community reports -> normal pins (same as the old map)
 *   events         events -> event pins
 *   places         discovered places -> place pins
 *   origin         { lat, lng } -> the green "A" pin
 *   destination    { lat, lng } -> the red "B" pin
 *   userLocation   { lat, lng } -> the blue "you are here" dot
 *   routeLine      [[lat, lng], ...] -> the route the user picked
 *   routeOptions   [[ [lat,lng], ... ], ...] -> the other route options
 *   fitKey         change this STRING and the map re-frames itself
 *   onReportClick / onPlaceClick / onEventClick / onMapClick  callbacks
 * =========================================================================== */

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { TYPE_ICONS } from '../utils/constants.js'
import { slugify } from '../utils/mapMath.js'

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'

// Hyderabad - where the college is. The map opens here.
const DEFAULT_CENTER = [17.385, 78.4867]
const DEFAULT_ZOOM = 12

// Every marker is drawn as our own HTML, so it uses the app's CSS colours.
function pinIcon(kind, glyph, extraClass = '') {
  return L.divIcon({
    className: `nm-pin nm-pin--${kind} ${extraClass}`.trim(),
    html:
      `<span class="nm-pin__bubble"><span class="nm-pin__glyph">${glyph}</span></span>` +
      '<span class="nm-pin__tail"></span>',
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    tooltipAnchor: [0, -36],
  })
}

// The blue dot that shows where the user is. No tail - it is a circle.
function userIcon() {
  return L.divIcon({
    className: 'nm-user',
    html: '<span class="nm-user__dot"></span><span class="nm-user__halo"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

// Place pins use simple, fixed SVGs and the site's softer palette. The
// category ID is looked up in this local table rather than inserted into HTML.
const PLACE_PIN_ICONS = {
  restaurants: '<path d="M5 3v5M8 3v5M5 6h3M6.5 8v8M12 3v13M12 3c2 1 3 3 3 6h-3"/>',
  cafes: '<path d="M3 5h9v5a4.5 4.5 0 0 1-9 0V5Zm9 1h1a2 2 0 0 1 0 4h-1M3 16h10"/>',
  bakeries: '<path d="M9 16V4M9 8C5 8 5 5 5 4c2 0 4 1 4 4Zm0 3c4 0 4-3 4-4-2 0-4 1-4 4ZM6 16h6"/>',
  shopping: '<path d="M4 7h10l1 9H3l1-9Zm3 0V5a2 2 0 0 1 4 0v2"/>',
  attractions: '<path d="m2 15 5-8 3 4 2-3 4 7H2ZM12 3h.01"/>',
  parks: '<path d="M9 16v-5M5 11h8L9 4l-4 7ZM6 16h6"/>',
  entertainment: '<rect x="3" y="3" width="12" height="12" rx="3"/><path d="m7 6 5 3-5 3V6Z"/>',
  hospitals: '<path d="M7 3h4v4h4v4h-4v4H7v-4H3V7h4V3Z"/>',
  atms: '<rect x="2.5" y="4" width="13" height="10" rx="2"/><path d="M3 7h12M5 11h3"/>',
  fuel: '<path d="M4 16V4h7v12M3 16h9M5 6h5v3H5zM11 8h2l1 2v4a1 1 0 0 0 2 0v-4l-1-2"/>',
  other: '<circle cx="9" cy="9" r="3"/><path d="M9 2v2M9 14v2M2 9h2M14 9h2"/>',
}

function placeIcon(place, isSelected) {
  const category = Object.prototype.hasOwnProperty.call(PLACE_PIN_ICONS, place.categoryId)
    ? place.categoryId : 'other'
  const svg = `<svg viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${PLACE_PIN_ICONS[category]}</svg>`

  return L.divIcon({
    className: `nm-place-pin nm-place-pin--${category}${isSelected ? ' is-selected' : ''}`,
    html: `<span class="nm-place-pin__bubble">${svg}</span>`,
    iconSize: [36, 42],
    iconAnchor: [18, 41],
    tooltipAnchor: [0, -38],
  })
}

function hasPosition(item) {
  return item && typeof item.lat === 'number' && typeof item.lng === 'number'
}

export default function NavigateMap({
  reports = [],
  events = [],
  places = [],
  origin = null,
  destination = null,
  userLocation = null,
  routeLine = null,
  routeOptions = [],
  fitKey = '',
  selectedPlaceId = '',
  mapPadding = null,
  focusPoint = null,
  onReportClick,
  onPlaceClick,
  onEventClick,
  onMapClick,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  const reportLayerRef = useRef(null)
  const eventLayerRef = useRef(null)
  const placeLayerRef = useRef(null)
  const routeRef = useRef(null)
  const originRef = useRef(null)
  const destinationRef = useRef(null)
  const userRef = useRef(null)

  // Leaflet's event handlers are made once, so they would keep seeing old
  // versions of our functions. This ref always holds the newest ones.
  const handlersRef = useRef({ onReportClick, onPlaceClick, onEventClick, onMapClick })
  useEffect(() => {
    handlersRef.current = { onReportClick, onPlaceClick, onEventClick, onMapClick }
  }, [onReportClick, onPlaceClick, onEventClick, onMapClick])

  // ------------------------------------------------------------------
  // 1. Build the map. Runs once.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
    })

    map.attributionControl.setPosition('topright')
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map)
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)

    reportLayerRef.current = L.layerGroup().addTo(map)
    eventLayerRef.current = L.layerGroup().addTo(map)
    placeLayerRef.current = L.layerGroup().addTo(map)

    map.on('click', (event) => {
      const handler = handlersRef.current.onMapClick
      if (!handler) return
      handler(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)))
    })

    mapRef.current = map

    // The map is created while the panel is still being laid out, so Leaflet
    // may measure the wrong size. This makes it measure again.
    const timer = setTimeout(() => map.invalidateSize(), 300)

    return () => {
      clearTimeout(timer)
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ------------------------------------------------------------------
  // 2. Report pins - the same look as the existing map.
  // ------------------------------------------------------------------
  useEffect(() => {
    const layer = reportLayerRef.current
    if (!layer) return
    layer.clearLayers()

    reports.forEach((report) => {
      if (!hasPosition(report)) return
      const glyph = TYPE_ICONS[report.type] || '📍'
      const marker = L.marker([report.lat, report.lng], {
        icon: pinIcon('report', glyph, `nm-pin--${slugify(report.type)}`),
        riseOnHover: true,
      })
      marker.bindTooltip(report.title, { direction: 'top', className: 'mrp-tooltip' })
      marker.on('click', (event) => {
        L.DomEvent.stopPropagation(event)
        const handler = handlersRef.current.onReportClick
        if (handler) handler(report)
      })
      marker.addTo(layer)
    })
  }, [reports])

  // ------------------------------------------------------------------
  // 3. Event pins and place pins.
  // ------------------------------------------------------------------
  useEffect(() => {
    const layer = eventLayerRef.current
    if (!layer) return
    layer.clearLayers()

    events.forEach((event) => {
      if (!hasPosition(event)) return
      const marker = L.marker([event.lat, event.lng], { icon: pinIcon('event', '🎉') })
      marker.bindTooltip(event.name || 'Event', { direction: 'top', className: 'mrp-tooltip' })
      marker.on('click', (clickEvent) => {
        L.DomEvent.stopPropagation(clickEvent)
        const handler = handlersRef.current.onEventClick
        if (handler) handler(event)
      })
      marker.addTo(layer)
    })
  }, [events])

  useEffect(() => {
    const layer = placeLayerRef.current
    if (!layer) return
    layer.clearLayers()

    places.forEach((place) => {
      if (!hasPosition(place)) return
      const isSelected = place.id === selectedPlaceId
      const marker = L.marker([place.lat, place.lng], {
        icon: placeIcon(place, isSelected),
        title: place.name || 'Place',
        alt: place.name || 'Place',
        zIndexOffset: isSelected ? 500 : 0,
      })
      marker.bindTooltip(
        `<strong>${place.name || 'Place'}</strong>${place.distanceFromRoute ? `<br>${Math.round(place.distanceFromRoute)} m from the route` : ''}`,
        { direction: 'top', className: 'mrp-tooltip' },
      )
      marker.on('click', (clickEvent) => {
        L.DomEvent.stopPropagation(clickEvent)
        const handler = handlersRef.current.onPlaceClick
        if (handler) handler(place)
      })
      marker.addTo(layer)
    })
  }, [places, selectedPlaceId])

  // ------------------------------------------------------------------
  // 4. Start pin, destination pin and the "you are here" dot.
  // ------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!hasPosition(origin)) {
      if (originRef.current) {
        originRef.current.remove()
        originRef.current = null
      }
      return
    }

    if (originRef.current) {
      originRef.current.setLatLng([origin.lat, origin.lng])
    } else {
      const marker = L.marker([origin.lat, origin.lng], {
        icon: pinIcon('origin', 'A'),
        zIndexOffset: 900,
      }).addTo(map)
      marker.bindTooltip('Start', { direction: 'top', className: 'mrp-tooltip' })
      originRef.current = marker
    }
  }, [origin])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!hasPosition(destination)) {
      if (destinationRef.current) {
        destinationRef.current.remove()
        destinationRef.current = null
      }
      return
    }

    if (destinationRef.current) {
      destinationRef.current.setLatLng([destination.lat, destination.lng])
    } else {
      const marker = L.marker([destination.lat, destination.lng], {
        icon: pinIcon('destination', 'B'),
        zIndexOffset: 900,
      }).addTo(map)
      marker.bindTooltip('Destination', { direction: 'top', className: 'mrp-tooltip' })
      destinationRef.current = marker
    }
  }, [destination])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!hasPosition(userLocation)) {
      if (userRef.current) {
        userRef.current.remove()
        userRef.current = null
      }
      return
    }

    if (userRef.current) {
      userRef.current.setLatLng([userLocation.lat, userLocation.lng])
    } else {
      userRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon(),
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(map)
    }
  }, [userLocation])

  // ------------------------------------------------------------------
  // 5. The route lines.
  //    The routes the user did NOT pick are drawn thin and grey.
  //    The route they DID pick is drawn thick, with a white casing under
  //    it, which is what makes it look like a real navigation map.
  // ------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (routeRef.current) {
      routeRef.current.forEach((line) => line.remove())
      routeRef.current = null
    }

    const drawn = []

    // The alternatives, underneath.
    routeOptions.forEach((geometry) => {
      if (!Array.isArray(geometry) || geometry.length < 2) return
      const points = geometry.map((point) => [point[0], point[1]])
      const grey = L.polyline(points, {
        color: '#94a3b8',
        weight: 3,
        opacity: 0.8,
        dashArray: '2 7',
        lineCap: 'round',
      }).addTo(map)
      drawn.push(grey)
    })

    // The chosen route, on top.
    if (Array.isArray(routeLine) && routeLine.length >= 2) {
      const points = routeLine.map((point) => [point[0], point[1]])
      const casing = L.polyline(points, {
        color: '#145bb8',
        weight: 9,
        opacity: 0.9,
        lineCap: 'round',
      }).addTo(map)
      const line = L.polyline(points, {
        color: '#087cf0',
        weight: 5,
        opacity: 1,
        lineCap: 'round',
      }).addTo(map)
      drawn.push(casing, line)
    }

    routeRef.current = drawn
  }, [routeLine, routeOptions])

  // ------------------------------------------------------------------
  // 6. Re-frame the map when the page says the view changed.
  //    The page changes fitKey whenever start/destination/route change.
  // ------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // If the page wants us to look at one particular place, do that first.
    if (focusPoint && hasPosition(focusPoint)) {
      map.setView([focusPoint.lat, focusPoint.lng], focusPoint.zoom || 15, { animate: true })
      return
    }

    if (!fitKey) return

    const points = []
    if (hasPosition(origin)) points.push([origin.lat, origin.lng])
    if (hasPosition(destination)) points.push([destination.lat, destination.lng])
    if (Array.isArray(routeLine) && routeLine.length > 1) {
      routeLine.forEach((point) => points.push([point[0], point[1]]))
    }

    if (points.length > 1) {
      // Leaflet wants the padding as TWO separate options, and each one has
      // to be a real Leaflet point. If you hand it anything else it turns
      // the zoom into NaN and the whole map goes blank, so we build the
      // options carefully and fall back to a plain fit if anything is odd.
      const fitOptions = { animate: true }

      try {
        if (mapPadding?.paddingTopLeft) {
          fitOptions.paddingTopLeft = L.point(mapPadding.paddingTopLeft)
        }
        if (mapPadding?.paddingBottomRight) {
          fitOptions.paddingBottomRight = L.point(mapPadding.paddingBottomRight)
        }
      } catch {
        // If the padding is not usable we just fit the route normally.
      }

      try {
        map.fitBounds(L.latLngBounds(points).pad(0.15), fitOptions)
      } catch {
        // Never let a map problem blank the whole page.
        map.setView(points[0], 13, { animate: true })
      }
    } else if (points.length === 1) {
      map.setView(points[0], 14, { animate: true })
    } else if (hasPosition(userLocation)) {
      map.setView([userLocation.lat, userLocation.lng], 14, { animate: true })
    }
  }, [fitKey, origin, destination, routeLine, focusPoint, mapPadding, userLocation])

  return (
    <div className="nm-map">
      <div ref={containerRef} className="nm-map__canvas" aria-label="Interactive map" />

      <div className="nm-map__controls">
        <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
          +
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
          −
        </button>
      </div>

    </div>
  )
}
