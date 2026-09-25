/* ===========================================================================
 * MapView.jsx  --  THE PLACE WHERE THE MAPS TEAM'S COMPONENT GOES
 * ===========================================================================
 *
 * RIGHT NOW this file draws a simple PLACEHOLDER map with HTML + CSS + SVG.
 * It already behaves like a real map:
 *   - it shows one pin for every report (using that report's lat/lng)
 *   - clicking it can hand back a latitude/longitude (for "Select on Map")
 *   - it has zoom buttons and a legend
 *
 * WHY: so the frontend team can finish the whole website today, without
 * waiting for a Google Maps API key.
 *
 * ---------------------------------------------------------------------------
 * STEP 5 OF THE PLAN - HOW TO PLUG IN THE MAPS TEAM'S COMPONENT
 * ---------------------------------------------------------------------------
 * The Maps Team will hand you a component. Ask them to accept EXACTLY these
 * props, and then you just delete the placeholder <div> below and drop their
 * component in (see the marked comment "SWAP HERE" further down):
 *
 *   <MapComponent
 *      reports={[...]}            // array of reports, each with lat + lng
 *      selectedLocation={loc}     // { lat, lng } or null  -> they draw the pin
 *      onMapClick={(lat,lng)=>…}  // user clicked/picked a point on the map
 *      onMarkerClick={(report)=>…}// user clicked a pin
 *      activeId="r-1001"          // which pin should be highlighted (optional)
 *      height="520px"
 *   />
 *
 * WHAT WE SEND THEM  → reports (with lat/lng) and selectedLocation
 * WHAT THEY SEND US  → onMapClick(lat, lng) and onMarkerClick(report)
 *
 * ---------------------------------------------------------------------------
 * IMPORTANT: no page talks to Google Maps directly. Every page uses <MapView/>
 * or <MiniMap/>. That is why replacing the placeholder is a 10-line job.
 * ===========================================================================
 */

import { useMemo, useState } from 'react'
import {
  DEFAULT_BOUNDS,
  formatLatLng,
  isInside,
  projectPoint,
  slugify,
  unprojectPoint,
  zoomBounds,
} from '../utils/mapMath.js'
import { TYPE_ICONS } from '../utils/constants.js'

export default function MapView({
  reports = [],
  selectedLocation = null,
  onMapClick,
  onMarkerClick,
  activeId = null,
  height = '520px',
  showLegend = true,
  showZoom = true,
  initialBounds = DEFAULT_BOUNDS,
  showNote = true,
}) {
  // "bounds" = the area of the world we are currently showing.
  // Zooming just makes this box smaller; nothing else changes.
  const [bounds, setBounds] = useState(initialBounds)

  // Which pins are inside the visible box right now?
  const visibleReports = useMemo(
    () => reports.filter((report) => isInside(report.lat, report.lng, bounds)),
    [reports, bounds],
  )

  const selectedPosition = selectedLocation && isInside(selectedLocation.lat, selectedLocation.lng, bounds)
    ? projectPoint(selectedLocation.lat, selectedLocation.lng, bounds)
    : null

  // Click anywhere on the map -> convert screen position to lat/lng.
  function handleCanvasClick(event) {
    if (!onMapClick) return
    const rect = event.currentTarget.getBoundingClientRect()
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100
    const { lat, lng } = unprojectPoint(xPercent, yPercent, bounds)
    onMapClick(Number(lat.toFixed(6)), Number(lng.toFixed(6)))
  }

  return (
    <div className={`map-view ${onMapClick ? 'map-view--pickable' : ''}`} style={{ height }}>
      {/* ================================================================ */}
      {/* SWAP HERE (Step 5): replace the whole <div className="map-view__canvas">
          block with the Maps Team's component and keep the props listed above. */}
      {/* ================================================================ */}
      <div
        className="map-view__canvas"
        onClick={handleCanvasClick}
        role={onMapClick ? 'button' : undefined}
        tabIndex={onMapClick ? 0 : undefined}
        aria-label={onMapClick ? 'Map. Click a point to choose a location.' : 'Map of reports'}
      >
        {/* Decorative "streets / river / park" background. It is only drawing -
            pointer-events are switched off in the CSS so clicks reach the map. */}
        <svg className="map-view__decor" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <rect width="100" height="100" fill="#eef2f7" />
          <path d="M0 68 C 18 60, 30 74, 46 66 S 74 50, 100 58 L100 72 C 72 64, 60 80, 44 80 S 16 74, 0 80 Z" fill="#cfe4f7" opacity="0.9" />
          <g stroke="#dbe3ec" strokeWidth="0.6">
            <path d="M0 12 H100" /> <path d="M0 30 H100" /> <path d="M0 47 H100" /> <path d="M0 88 H100" />
            <path d="M14 0 V100" /> <path d="M33 0 V100" /> <path d="M52 0 V100" /> <path d="M71 0 V100" /> <path d="M88 0 V100" />
          </g>
          <g stroke="#ffffff" strokeWidth="2.4" fill="none" opacity="0.95">
            <path d="M0 30 C 22 30, 30 22, 52 22 S 82 30, 100 26" />
            <path d="M14 0 C 16 30, 10 62, 18 100" />
            <path d="M52 0 C 50 34, 58 70, 52 100" />
            <path d="M0 47 C 30 44, 62 52, 100 47" />
          </g>
          <g fill="#d8ecd4">
            <rect x="56" y="8" width="12" height="9" rx="1.5" />
            <rect x="74" y="52" width="12" height="10" rx="1.5" />
            <rect x="20" y="52" width="10" height="8" rx="1.5" />
          </g>
        </svg>

        {/* One pin per report */}
        {visibleReports.map((report) => {
          const { x, y } = projectPoint(report.lat, report.lng, bounds)
          const isActive = activeId && activeId === report.id
          return (
            <button
              key={report.id}
              type="button"
              className={`map-pin map-pin--${slugify(report.type)} ${isActive ? 'is-active' : ''}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              title={`${report.title} (${report.status})`}
              aria-label={`${report.title}, ${report.type}, status ${report.status}`}
              onClick={(event) => {
                event.stopPropagation() // don't also trigger "pick a location"
                if (onMarkerClick) onMarkerClick(report)
              }}
            >
              <span className="map-pin__bubble" aria-hidden="true">
                {TYPE_ICONS[report.type] || '📍'}
              </span>
              <span className="map-pin__tail" aria-hidden="true" />
              <span className="map-pin__label">{report.title}</span>
            </button>
          )
        })}

        {/* The point the user just selected (comes from the Report form) */}
        {selectedPosition ? (
          <div className="map-picked" style={{ left: `${selectedPosition.x}%`, top: `${selectedPosition.y}%` }}>
            <span className="map-picked__pulse" aria-hidden="true" />
            <span className="map-picked__dot" aria-hidden="true" />
            <span className="map-picked__label">Selected location</span>
          </div>
        ) : null}

        {onMapClick ? <p className="map-view__hint">Click anywhere on the map to drop the pin</p> : null}
      </div>

      {/* ---- controls ---- */}
      {showZoom ? (
        <div className="map-view__controls">
          <button type="button" aria-label="Zoom in" onClick={() => setBounds((b) => zoomBounds(b, 0.6))}>
            +
          </button>
          <button type="button" aria-label="Zoom out" onClick={() => setBounds((b) => zoomBounds(b, 1.6))}>
            −
          </button>
          <button type="button" aria-label="Reset view" onClick={() => setBounds(initialBounds)}>
            ⟲
          </button>
        </div>
      ) : null}

      <div className={`map-view__footer ${showLegend ? '' : 'map-view__footer--plain'}`}>
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
          {selectedLocation
            ? `📍 ${formatLatLng(selectedLocation.lat, selectedLocation.lng)}`
            : `${visibleReports.length} of ${reports.length} pins in view`}
        </span>
      </div>

      {showNote ? (
        <p className="map-view__note">
          Placeholder map (frontend team) · replaced by the Maps Team&apos;s Google Maps component in Step 5
        </p>
      ) : null}
    </div>
  )
}
