/* ===========================================================================
 * MapView.jsx  --  THE MAP COMPONENT  (Leaflet + OpenStreetMap)
 * ===========================================================================
 *
 * This is the real map. It shows a pin per report at the report's latitude and
 * longitude, and it can hand back coordinates when the user clicks it.
 *
 * WHY LEAFLET AND NOT GOOGLE MAPS:
 *   * No API key, no Google Cloud account, no credit card, no billing.
 *   * Free for this kind of use, forever.
 *   * It looks and behaves like a normal map to your users.
 *
 * ---------------------------------------------------------------------------
 * THE PROPS CONTRACT (this is what every page uses)
 * ---------------------------------------------------------------------------
 *   reports            array of reports, each with lat + lng -> one pin each
 *   selectedLocation   { lat, lng } or null -> the pin the user just picked
 *   onMapClick         called with (lat, lng) when the user clicks the map
 *   onMarkerClick      called with the report when a pin is clicked
 *   activeId           which pin to highlight
 *   height             how tall the map box should be, e.g. '520px'
 *
 * Nothing outside this file imports Leaflet. Every page uses <MapView /> or
 * <MiniMap />. If you ever switch to Google Maps, you rewrite ONLY this file.
 *
 * ---------------------------------------------------------------------------
 * HOW THE MAP IS BUILT (so you can explain it)
 * ---------------------------------------------------------------------------
 * Leaflet draws the map inside a normal <div>. We give it:
 *   1. a tile layer  -- the pictures of streets, downloaded from
 *                       OpenStreetMap (the "© OpenStreetMap contributors" text
 *                       you see in the corner is required by their licence)
 *   2. markers       -- one Leaflet marker per report. We use a custom
 *                       "divIcon", which means the pin is our own HTML using
 *                       our own CSS classes (.mrp-pin), so it matches the
 *                       colours used everywhere else in the app.
 * ===========================================================================
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { DEFAULT_BOUNDS, formatLatLng, slugify } from '../utils/mapMath.js'
import { TYPE_ICONS } from '../utils/constants.js'

// The map pictures come from OpenStreetMap's public tile servers.
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'

/** Are these two numbers usable as a map position? */
function hasPosition(item) {
  return item && typeof item.lat === 'number' && typeof item.lng === 'number'
}

/** The HTML for one report pin. Leaflet drops this inside our icon wrapper. */
function pinMarkup(report) {
  const icon = TYPE_ICONS[report.type] || '📍'
  return `<span class="mrp-pin__bubble"><span class="mrp-pin__glyph">${icon}</span></span><span class="mrp-pin__tail"></span>`
}

/** The HTML for the pin the user just picked on the report form. */
const PICKED_MARKUP =
  '<span class="mrp-picked__pulse"></span><span class="mrp-picked__dot"></span>'

/**
 * Leaflet needs an icon object, not just HTML. A "divIcon" means:
 * "draw this HTML, positioned so its bottom point sits on the coordinate."
 */
function reportIcon(report) {
  return L.divIcon({
    className: `mrp-pin mrp-pin--${slugify(report.type)}`,
    html: pinMarkup(report),
    iconSize: [34, 44],
    iconAnchor: [17, 42], // the tip of the pin, in pixels from its top-left
    tooltipAnchor: [0, -38],
  })
}

function pickedIcon() {
  return L.divIcon({
    className: 'mrp-picked',
    html: PICKED_MARKUP,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

export default function MapView({
  reports = [],
  selectedLocation = null,
  onMapClick,
  onMarkerClick,
  activeId = null,
  height = '520px',
  showLegend = true,
  showZoom = true,
  initialBounds = null,
}) {
  const containerRef = useRef(null) // the <div> Leaflet draws into
  const mapRef = useRef(null) // the Leaflet map object
  const markersRef = useRef(new Map()) // report id -> Leaflet marker
  const pickedRef = useRef(null) // the "just picked" marker
  const reportsByIdRef = useRef(new Map()) // report id -> newest report object
  const hasFramedRef = useRef(false) // have we set the initial view yet?
  const [mapReady, setMapReady] = useState(false)
  const [zoom, setZoom] = useState(12)

  // Leaflet event handlers are created ONCE, so they would otherwise keep
  // seeing old versions of our functions. This ref always holds the newest.
  const handlersRef = useRef({ onMapClick, onMarkerClick })
  useEffect(() => {
    handlersRef.current = { onMapClick, onMarkerClick }
  }, [onMapClick, onMarkerClick])

  // The area to show if nobody told us what to show:
  // a caller-provided window (MiniMap) wins, otherwise we frame the pins.
  const fallbackBounds = useMemo(() => initialBounds || DEFAULT_BOUNDS, [initialBounds])

  // -------------------------------------------------------------------------
  // 1. Create the map. Runs once.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: false, // we draw our own + / - buttons
      attributionControl: true, // required by OpenStreetMap's licence
      scrollWheelZoom: false, // stops the map stealing the page scroll
    })

    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map)

    const start = fallbackBounds
    map.setView([(start.north + start.south) / 2, (start.east + start.west) / 2], 12)

    // Clicking the map gives the page the latitude and longitude.
    map.on('click', (event) => {
      const handler = handlersRef.current.onMapClick
      if (!handler) return
      handler(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)))
    })

    // Standard Leaflet trick: the page keeps scrolling normally until the user
    // deliberately clicks the map, then the wheel starts zooming.
    map.on('click', () => map.scrollWheelZoom.enable())
    map.on('mouseout', () => map.scrollWheelZoom.disable())

    map.on('zoomend', () => setZoom(map.getZoom()))

    mapRef.current = map
    setZoom(map.getZoom())
    setMapReady(true)

    // If the container was still being laid out when the map was created,
    // Leaflet measured the wrong size. This makes it measure again.
    const timer = setTimeout(() => map.invalidateSize(), 250)

    return () => {
      clearTimeout(timer)
      map.remove() // Leaflet requires this or the <div> stays "used"
      mapRef.current = null
      markersRef.current.clear()
      pickedRef.current = null
      hasFramedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -------------------------------------------------------------------------
  // 2. Set the first view: the caller's window, or all the pins, once.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || hasFramedRef.current) return

    if (initialBounds) {
      map.fitBounds(
        [
          [initialBounds.south, initialBounds.west],
          [initialBounds.north, initialBounds.east],
        ],
        { animate: false },
      )
      hasFramedRef.current = true
      return
    }

    const points = reports.filter(hasPosition).map((report) => [report.lat, report.lng])
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points).pad(0.2), { animate: false, maxZoom: 15 })
      hasFramedRef.current = true
    } else if (points.length === 1) {
      map.setView(points[0], 14, { animate: false })
      hasFramedRef.current = true
    }
  }, [reports, initialBounds])

  // -------------------------------------------------------------------------
  // 3. Keep one marker per report. Runs whenever the list changes
  //    (for example when the user types in the search box).
  // -------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remember the newest version of every report, so a pin click always
    // reports current information even if the list was filtered since.
    const byId = new Map()
    reports.forEach((report) => byId.set(report.id, report))
    reportsByIdRef.current = byId

    const markers = markersRef.current
    const seen = new Set()

    reports.forEach((report) => {
      if (!hasPosition(report)) return
      seen.add(report.id)

      const position = [report.lat, report.lng]
      let marker = markers.get(report.id)

      if (marker) {
        // Already drawn: just move it if the coordinates changed.
        marker.setLatLng(position)
        return
      }

      marker = L.marker(position, {
        icon: reportIcon(report),
        // No `title:` here on purpose. Leaflet's own tooltip below already
        // shows the report name on hover, and a `title` would make the
        // browser draw a second, black tooltip on top of it.
        riseOnHover: true,
      })

      marker.bindTooltip(report.title, {
        direction: 'top',
        className: 'mrp-tooltip',
      })

      marker.on('click', (event) => {
        L.DomEvent.stopPropagation(event) // don't also fire "user clicked map"
        const handler = handlersRef.current.onMarkerClick
        if (!handler) return
        handler(reportsByIdRef.current.get(report.id) || report)
      })

      marker.addTo(map)

      // Because the pin is a <div> (a "divIcon"), Leaflet ignores `alt`, so
      // we give it its name for screen readers ourselves.
      const pinElement = marker.getElement()
      if (pinElement) pinElement.setAttribute('aria-label', report.title)

      markers.set(report.id, marker)
    })

    // Remove pins for reports that are no longer being shown.
    markers.forEach((marker, id) => {
      if (!seen.has(id)) {
        marker.remove()
        markers.delete(id)
      }
    })
  }, [reports])

  // -------------------------------------------------------------------------
  // 4. Draw the pin the user picked on the report form.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!hasPosition(selectedLocation)) {
      if (pickedRef.current) {
        pickedRef.current.remove()
        pickedRef.current = null
      }
      return
    }

    const position = [selectedLocation.lat, selectedLocation.lng]

    if (pickedRef.current) {
      pickedRef.current.setLatLng(position)
    } else {
      pickedRef.current = L.marker(position, {
        icon: pickedIcon(),
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(map)
    }

    map.panTo(position, { animate: true, duration: 0.4 })
  }, [selectedLocation])

  // -------------------------------------------------------------------------
  // 5. Highlight the pin the page says is active.
  // -------------------------------------------------------------------------
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const element = marker.getElement()
      if (element) element.classList.toggle('is-active', id === activeId)
    })
  }, [activeId, reports, mapReady])

  /** Re-frame the map on whatever it should be showing. */
  function resetView() {
    const map = mapRef.current
    if (!map) return

    if (initialBounds) {
      map.fitBounds([
        [initialBounds.south, initialBounds.west],
        [initialBounds.north, initialBounds.east],
      ])
      return
    }

    const points = reports.filter(hasPosition).map((report) => [report.lat, report.lng])
    if (points.length) {
      map.fitBounds(L.latLngBounds(points).pad(0.2), { maxZoom: 15 })
    } else {
      map.setView([(DEFAULT_BOUNDS.north + DEFAULT_BOUNDS.south) / 2, (DEFAULT_BOUNDS.east + DEFAULT_BOUNDS.west) / 2], 12)
    }
  }

  const pinsInView = reports.filter(hasPosition).length

  return (
    <div className="map-view" style={{ height }}>
      {/* Leaflet draws the whole map inside this one <div> */}
      <div
        ref={containerRef}
        className={`map-view__canvas ${onMapClick ? 'map-view__canvas--pickable' : ''}`}
        aria-label={onMapClick ? 'Map. Click a point to choose a location.' : 'Map of reports'}
      />

      {showZoom ? (
        <div className="map-view__controls">
          <button type="button" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
            +
          </button>
          <button type="button" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
            −
          </button>
          <button type="button" aria-label="Reset view" onClick={resetView}>
            ⟲
          </button>
        </div>
      ) : null}

      {onMapClick ? <p className="map-view__hint">Click anywhere on the map to drop the pin</p> : null}

      <div className="map-view__footer">
        {showLegend ? (
          <ul className="map-legend">
            {['Complaint', 'Incident', 'Announcement', 'Event', 'Other'].map((type) => (
              <li key={type}>
                <span className={`map-legend__dot map-legend__dot--${slugify(type)}`} aria-hidden="true" />
                {type}
              </li>
            ))}
          </ul>
        ) : null}

        <span className="map-view__coords">
          {hasPosition(selectedLocation)
            ? `📍 ${formatLatLng(selectedLocation.lat, selectedLocation.lng)}`
            : `${pinsInView} pin${pinsInView === 1 ? '' : 's'} · zoom ${zoom}`}
        </span>
      </div>
    </div>
  )
}
