import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Loader from '../components/Loader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import MiniMap from '../components/MiniMap.jsx'
import ReportCard from '../components/ReportCard.jsx'
import { StatusBadge, TypeBadge } from '../components/Badge.jsx'
import { getReportById, getReports } from '../services/api.js'
import { formatDateTime, formatLatLng } from '../utils/mapMath.js'

// ---------------------------------------------------------------------------
// REPORT DETAILS PAGE  (Step 3 of the plan)
//
// useParams() reads the ":id" part of the URL /reports/r-1003  ->  "r-1003".
// The page then asks the backend for that one report.
// ---------------------------------------------------------------------------
export default function ReportDetails() {
  const { id } = useParams()

  const [report, setReport] = useState(null)
  const [nearby, setNearby] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        setError('')

        const found = await getReportById(id)
        if (!active) return
        setReport(found)

        if (found) {
          // "Nearby" = other reports within roughly 2 km of this one.
          // About 0.018 degrees of latitude is ~2 km.
          const all = await getReports()
          const close = all
            .filter((item) => item.id !== found.id)
            .filter(
              (item) =>
                Math.abs(item.lat - found.lat) < 0.018 && Math.abs(item.lng - found.lng) < 0.018,
            )
            .slice(0, 3)
          if (active) setNearby(close)
        }
      } catch (err) {
        if (active) setError(err?.message || 'Could not load this report.')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <section className="container page">
        <Loader text="Loading report…" />
      </section>
    )
  }

  if (error) {
    return (
      <section className="container page">
        <EmptyState icon="⚠️" title="Something went wrong" message={error} actionLabel="Back to reports" actionTo="/reports" />
      </section>
    )
  }

  if (!report) {
    return (
      <section className="container page">
        <EmptyState
          icon="🔍"
          title="Report not found"
          message="This report may have been removed, or the link is wrong."
          actionLabel="See all reports"
          actionTo="/reports"
        />
      </section>
    )
  }

  return (
    <section className="container page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/reports">Reports</Link>
        <span aria-hidden="true">/</span>
        <span>{report.title}</span>
      </nav>

      <div className="details-layout">
        <article className="card details-main">
          <header className="details-main__head">
            <div className="report-card__badges">
              <TypeBadge type={report.type} />
              <StatusBadge status={report.status} />
            </div>
            <h1>{report.title}</h1>
            <p className="muted">Reported {formatDateTime(report.reportedAt)}</p>
          </header>

          {report.photoUrl ? (
            <img className="details-main__photo" src={report.photoUrl} alt={`Photo for ${report.title}`} />
          ) : (
            <div className="details-main__photo details-main__photo--empty">
              No photo was added to this report.
            </div>
          )}

          <section className="details-section">
            <h2>Description</h2>
            <p className="details-text">{report.description}</p>
          </section>

          <section className="details-section">
            <h2>Location</h2>
            {/* The Maps Team's mini-map comes in here (see MiniMap.jsx) */}
            <MiniMap lat={report.lat} lng={report.lng} report={report} />
          </section>

          <section className="details-section">
            <h2>Report information</h2>
            <dl className="detail-list detail-list--rows">
              <div>
                <dt>Type</dt>
                <dd>{report.type}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={report.status} />
                </dd>
              </div>
              <div>
                <dt>Place</dt>
                <dd>{report.locationName || '—'}</dd>
              </div>
              <div>
                <dt>Coordinates</dt>
                <dd>
                  <code>{formatLatLng(report.lat, report.lng)}</code>
                </dd>
              </div>
              <div>
                <dt>Reported by</dt>
                <dd>{report.reportedBy || 'Anonymous'}</dd>
              </div>
              <div>
                <dt>Report ID</dt>
                <dd>
                  <code>{report.id}</code>
                </dd>
              </div>
            </dl>
          </section>

          <footer className="details-main__actions">
            <Link to="/map" className="btn btn--primary">
              View on map
            </Link>
            <Link to="/report" className="btn btn--outline">
              + Report something else
            </Link>
          </footer>
        </article>

        <aside className="details-side">
          <div className="card">
            <h3 className="card__title">Status legend</h3>
            <ul className="legend-list">
              <li>
                <StatusBadge status="Unverified" /> nobody has confirmed it yet
              </li>
              <li>
                <StatusBadge status="In Progress" /> the concerned team is working on it
              </li>
              <li>
                <StatusBadge status="Resolved" /> fixed / attended
              </li>
              <li>
                <StatusBadge status="Verified" /> checked and confirmed
              </li>
            </ul>
            <p className="muted small">Status is stored and updated by the Backend Team.</p>
          </div>

          <div className="card">
            <h3 className="card__title">Nearby reports</h3>
            {nearby.length === 0 ? (
              <p className="muted small">No other reports close by.</p>
            ) : (
              <div className="stack">
                {nearby.map((item) => (
                  <ReportCard key={item.id} report={item} compact />
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
