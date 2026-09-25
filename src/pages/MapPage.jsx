import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import MapView from '../components/MapView.jsx'
import ReportCard from '../components/ReportCard.jsx'
import ReportFilters from '../components/ReportFilters.jsx'
import Loader from '../components/Loader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { StatusBadge, TypeBadge } from '../components/Badge.jsx'
import useReports from '../hooks/useReports.js'
import { formatDateTime } from '../utils/mapMath.js'

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
  const [selectedReport, setSelectedReport] = useState(null)

  // "Filtering" = making a smaller array out of the big one. Same logic as the
  // Reports page, so open both and compare!
  const filteredReports = useMemo(() => {
    const text = search.trim().toLowerCase()

    return reports.filter((report) => {
      const matchesText =
        !text ||
        [report.title, report.description, report.locationName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(text))

      const matchesType = type === 'All' || report.type === type
      const matchesStatus = status === 'All' || report.status === status
      return matchesText && matchesType && matchesStatus
    })
  }, [reports, search, type, status])

  function resetFilters() {
    setSearch('')
    setType('All')
    setStatus('All')
  }

  return (
    <section className="container page">
      <PageHeader
        eyebrow="Live view"
        title="Map"
        subtitle="Every pin is a report placed at the exact latitude and longitude chosen on the map."
      >
        <Link to="/report" className="btn btn--primary">
          + Report something here
        </Link>
      </PageHeader>

      <ReportFilters
        search={search}
        onSearchChange={setSearch}
        type={type}
        onTypeChange={setType}
        status={status}
        onStatusChange={setStatus}
        resultCount={filteredReports.length}
        onReset={resetFilters}
      />

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

          <p className="muted">
            Showing {filteredReports.length} of {reports.length} reports. Use the filters above to narrow it down.
          </p>
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
                  <dt>Coordinates</dt>
                  <dd>
                    <code>
                      {selectedReport.lat.toFixed(5)}, {selectedReport.lng.toFixed(5)}
                    </code>
                  </dd>
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
              <p className="muted small">Click a pin on the map, or a card below.</p>

              {loading ? <Loader text="Loading reports…" /> : null}

              {!loading && filteredReports.length === 0 ? (
                <EmptyState
                  icon="🔍"
                  title="No reports match"
                  message="Try clearing the filters or moving to another part of the map."
                />
              ) : null}

              <div className="map-layout__panel-list">
                {filteredReports.map((report) => (
                  <ReportCard key={report.id} report={report} compact onSelect={setSelectedReport} />
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
