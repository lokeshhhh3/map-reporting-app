import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import MapView from '../components/MapView.jsx'
import ReportForm from '../components/ReportForm.jsx'
import { StatusBadge, TypeBadge } from '../components/Badge.jsx'
import useReports from '../hooks/useReports.js'
import { formatLatLng } from '../utils/mapMath.js'

// ---------------------------------------------------------------------------
// REPORT PAGE  (Step 3 of the plan - "Report Form" page)
//
// This page is the "glue". It does exactly three things:
//   1. keeps the location that the MAP gave us  (selectedLocation)
//   2. puts the map and the form side by side on the screen
//   3. when the form is submitted, saves it through useReports -> services/api.js
//
// NOTE: this page contains NO Google Maps code and NO Firebase code.
// The map comes from MapView (Maps Team) and the saving comes from api.js
// (Backend Team). We only connect them.
// ---------------------------------------------------------------------------
export default function ReportPage() {
  const navigate = useNavigate()
  const { addReport } = useReports()

  const [selectedLocation, setSelectedLocation] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [lastSubmitted, setLastSubmitted] = useState(null)

  /** The map calls this with (lat, lng) — this is the Maps Team contract. */
  function handleMapClick(lat, lng) {
    setSelectedLocation({ lat, lng })
    setErrorMessage('')
  }

  /** The form calls this with all the field values. */
  async function handleSubmit(values) {
    try {
      setSubmitting(true)
      setErrorMessage('')

      // values already contains lat and lng, put there by the form from
      // the location we got from the map.
      const saved = await addReport(values)

      setLastSubmitted(saved)
      setSubmitting(false)

      // Show the new report's own page, the same as clicking a pin.
      navigate(`/reports/${saved.id}`)
    } catch (error) {
      setSubmitting(false)
      setErrorMessage(error?.message || 'Could not save your report. Please try again.')
    }
  }

  return (
    <section className="container page">
      <PageHeader
        eyebrow="Add to the map"
        title="Create a Report"
        subtitle="Click the exact spot on the map, describe what is happening, add a photo if you have one, then submit."
      />

      <div className="report-layout">
        {/* ------------- LEFT: the map used for choosing a location ------------- */}
        <div className="report-layout__map">
          <div className="card__title-row">
            <h2 className="card__title">1. Pick the location</h2>
            {selectedLocation ? <span className="pill pill--live">Pin placed</span> : <span className="pill">Not selected</span>}
          </div>

          <MapView
            reports={[]}                          /* no existing pins here, so the new pin is clear */
            selectedLocation={selectedLocation}    /* the Maps Team draws this pin */
            onMapClick={handleMapClick}            /* the Maps Team gives us lat/lng back */
            height="420px"
          />

          <div className="location-readout">
            {selectedLocation ? (
              <>
                <span className="pill pill--live">📍 Latitude &amp; Longitude</span>
                <code>{formatLatLng(selectedLocation.lat, selectedLocation.lng)}</code>
              </>
            ) : (
              <p className="muted">
                Tap or click anywhere on the map above. Those two numbers are what gets saved with your report.
              </p>
            )}
          </div>
        </div>

        {/* ------------- RIGHT: the form ------------- */}
        <div className="report-layout__form">
          <div className="card">
            <h2 className="card__title">2. Describe it</h2>
            <ReportForm
              onSubmit={handleSubmit}
              submitting={submitting}
              location={selectedLocation}
              onClearLocation={() => setSelectedLocation(null)}
              errorMessage={errorMessage}
            />
          </div>

          {lastSubmitted ? (
            <div className="card success-card">
              <h3 className="card__title">✅ Report submitted</h3>
              <p>It was saved with these details:</p>
              <ul className="success-card__list">
                <li>
                  <strong>{lastSubmitted.title}</strong>
                </li>
                <li>
                  <TypeBadge type={lastSubmitted.type} /> <StatusBadge status={lastSubmitted.status} />
                </li>
                <li>
                  <code>{formatLatLng(lastSubmitted.lat, lastSubmitted.lng)}</code>
                </li>
              </ul>
            </div>
          ) : null}

          <div className="card tips-card">
            <h3 className="card__title">Tips for a good report</h3>
            <ul className="tips-card__list">
              <li>Put the pin on the exact spot, not the whole street.</li>
              <li>Say what someone walking past should look for.</li>
              <li>A photo from the spot helps the concerned team a lot.</li>
              <li>Do not post personal details of other people.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
