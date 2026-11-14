import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import MapView from '../components/MapView.jsx'
import ReportFilters from '../components/ReportFilters.jsx'
import Loader from '../components/Loader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { StatusBadge, TypeBadge } from '../components/Badge.jsx'
import useReports from '../hooks/useReports.js'
import { formatDateTime, isWithinDateRange } from '../utils/mapMath.js'
import { distanceKm, formatDistance, getBrowserLocation } from '../utils/geo.js'

// ---------------------------------------------------------------------------
// MAP PAGE  (Step 3 of the plan)
//
// The frontend owns everything AROUND the map: search, filters, the report
// button and the report information panel.
// The Maps Team owns the map itself, which we use through <MapView/>.
// ---------------------------------------------------------------------------
export default function MapPage() {
  const navigate = useNavigate()
  const { reports, loading, error } = useReports()

  const [search, setSearch] = useState('')
  const [type, setType] = useState('All')
  const [status, setStatus] = useState('All')
  const [dateRange, setDateRange] = useState('all')
  const [radius, setRadius] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)

  // Where the user is, if they shared it. null = "we don't know".
  const [userLocation, setUserLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')

  // "Filtering" = making a smaller array out of the big one. Same logic as the
  // Reports page, so open both and compare!
  const filteredReports = useMemo(() => {
    const text = search.trim().toLowerCase()
    const radiusKm = radius ? Number(radius) : null

    return reports
      .filter((report) => {
        const matchesText =
          !text ||
          [report.title, report.description, report.locationName]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(text))

        const matchesType = type === 'All' || report.type === type
        const matchesStatus = status === 'All' || report.status === status
        const matchesDate = isWithinDateRange(report.reportedAt, dateRange)

        // A distance filter with no known location would show nothing at all,
        // which looks broken. So we only apply it once we know where the user is.
        let matchesDistance = true
        if (radiusKm && userLocation) {
          matchesDistance = distanceKm(userLocation.lat, userLocation.lng, report.lat, report.lng) <= radiusKm
        }

        return matchesText && matchesType && matchesStatus && matchesDate && matchesDistance
      })
      .map((report) => ({
        ...report,
        // Attach the distance so the cards can show "3.4 km away".
        distanceKm: userLocation ? distanceKm(userLocation.lat, userLocation.lng, report.lat, report.lng) : null,
      }))
      .sort((a, b) => {
        // Once we know where the user is, "nearest first" is the useful order.
        if (userLocation) return a.distanceKm - b.distanceKm
        return 0
      })
  }, [reports, search, type, status, dateRange, radius, userLocation])

  /** The "📍 Near me" button in the filters. */
  async function handleUseMyLocation() {
    setLocating(true)
    setLocationError('')
    try {
      const position = await getBrowserLocation()
      setUserLocation({ lat: position.lat, lng: position.lng })
      if (!radius) setRadius('5') // a sensible default the moment we know where you are
    } catch (error) {
      setLocationError(error?.message || 'Could not get your location.')
    } finally {
      setLocating(false)
    }
  }

  function resetFilters() {
    setSearch('')
    setType('All')
    setStatus('All')
    setDateRange('all')
    setRadius('')
    setUserLocation(null)
    setLocationError('')
  }

  return (
    <section className="container page">
      <PageHeader
        eyebrow="Live view"
        title="Map"
        subtitle="Explore reports near you and select a pin for details."
      >
        <Link to="/report" className="btn btn--primary">
          + Report something here
        </Link>
      </PageHeader>

      <details className="map-filters">
        <summary>
          <strong>Search and filters</strong>
          {!loading && !error ? <span>{filteredReports.length} reports</span> : null}
        </summary>
      <ReportFilters
        search={search}
        onSearchChange={setSearch}
        type={type}
        onTypeChange={setType}
        status={status}
        onStatusChange={setStatus}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        showNearMe
        radius={radius}
        onRadiusChange={setRadius}
        onUseMyLocation={handleUseMyLocation}
        locating={locating}
        nearMeLabel={userLocation ? '📍 Near me · sorted' : '📍 Near me'}
        resultCount={filteredReports.length}
        onReset={resetFilters}
      />
      </details>

      {locationError ? <p className="alert alert--error">{locationError}</p> : null}

      {userLocation ? (
        <p className="muted small">
          Showing reports nearest you first
          {radius ? ` · within ${radius} km` : ''}
          {!radius ? ' · open search and filters to choose a distance' : ''}
        </p>
      ) : null}

      <div className="map-layout">
        <div className="map-layout__map">
          {loading ? <Loader text="Loading map…" /> : null}
          {error ? <EmptyState icon="⚠️" title="Could not load the map data" message={error} /> : null}

          {!loading && !error ? (
            <MapView
              reports={filteredReports}
              height="560px"
              activeId={selectedReport?.id ?? null}
              onMarkerClick={(report) => setSelectedReport(report)}
            />
          ) : null}

          {!loading && !error ? (
            <p className="muted small">Showing {filteredReports.length} of {reports.length} reports.</p>
          ) : null}
        </div>

        <aside className="map-layout__panel card">
          {selectedReport ? (
            <div className="report-preview">
              <button type="button" className="report-preview__close" onClick={() => setSelectedReport(null)}>
                ✕
              </button>

              <div className="report-card__badges">
                <TypeBadge type={selectedReport.type} />
                <StatusBadge status={selectedReport.status} />
              </div>

              <h3>{selectedReport.title}</h3>
              <p className="report-preview__text">{selectedReport.description}</p>

              {selectedReport.photoUrl ? (
                <img className="report-preview__photo" src={selectedReport.photoUrl} alt={`Photo for ${selectedReport.title}`} />
              ) : null}

              <dl className="detail-list">
                <div>
                  <dt>Location</dt>
                  <dd>{selectedReport.locationName}</dd>
                </div>
                <div>
                  <dt>Reported</dt>
                  <dd>{formatDateTime(selectedReport.reportedAt)}</dd>
                </div>
              </dl>

              <div className="report-preview__actions">
                <Link to={`/reports/${selectedReport.id}`} className="btn btn--primary">
                  Open full details
                </Link>
                <button type="button" className="btn btn--ghost" onClick={() => setSelectedReport(null)}>
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              <h3 className="card__title">Reports in this view</h3>
              <p className="muted small">Choose a pin or select a report below.</p>

              {loading ? <Loader text="Loading reports…" /> : null}

              {!loading && !error && filteredReports.length === 0 ? (
                <EmptyState
                  icon="🔍"
                  title="No reports match"
                  message="Try changing or clearing the filters."
                />
              ) : null}

              <div className="map-layout__panel-list">
                {filteredReports.map((report) => (
                  <button key={report.id} type="button" className="map-report-row" onClick={() => setSelectedReport(report)}>
                    <strong>{report.title}</strong>
                    <span>{report.type} · {report.status}
                      {report.distanceKm != null ? ` · ${formatDistance(report.distanceKm)} away` : ''}
                    </span>
                  </button>
                ))}
              </div>

              <button type="button" className="btn btn--outline btn--block" onClick={() => navigate('/report')}>
                + Add a report
              </button>
            </>
          )}
        </aside>
      </div>
    </section>
  )
}
