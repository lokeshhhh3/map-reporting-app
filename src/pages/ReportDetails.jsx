import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Loader from '../components/Loader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import MiniMap from '../components/MiniMap.jsx'
import MapView from '../components/MapView.jsx'
import ReportCard from '../components/ReportCard.jsx'
import ReportForm from '../components/ReportForm.jsx'
import { StatusBadge, TypeBadge } from '../components/Badge.jsx'
import useAuth from '../hooks/useAuth.js'
import {
  canEditReport,
  canModerate,
  deleteReport,
  getReportById,
  getReports,
  setReportStatus,
  updateReport,
  getReportConfirmationCount,
  hasConfirmedReport,
  toggleReportConfirmation,
  toggleFollowReport,
  isFollowingReport,
} from '../services/api.js'
import { REPORT_STATUSES } from '../utils/constants.js'
import { formatDateTime, formatLatLng } from '../utils/mapMath.js'

// ---------------------------------------------------------------------------
// REPORT DETAILS PAGE  (Step 3 of the plan)
//
// useParams() reads the ":id" part of the URL /reports/r-1003  ->  "r-1003".
// The page then asks the backend for that one report.
// ---------------------------------------------------------------------------
export default function ReportDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Re-renders this page once we know which browser identity we are, so the
  // Edit / Delete buttons appear for the person who posted the report.
  useAuth()

  const [report, setReport] = useState(null)
  const [nearby, setNearby] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // --- editing ---
  const [editing, setEditing] = useState(false)
  const [editLocation, setEditLocation] = useState(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  // --- moderator ---
  const [moderating, setModerating] = useState(false)

  // --- neighbours: confirmations and following ---
  const [confirmCount, setConfirmCount] = useState(0)
  const [confirmedByMe, setConfirmedByMe] = useState(false)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [following, setFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)

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
          // How many neighbours have confirmed it, and has this browser?
          const [count, mine, follow] = await Promise.all([
            getReportConfirmationCount(found.id),
            hasConfirmedReport(found.id),
            isFollowingReport(found.id),
          ])
          if (!active) return
          setConfirmCount(count)
          setConfirmedByMe(Boolean(mine))
          setFollowing(Boolean(follow))

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

  /** Open the edit form, starting it at the report's current pin. */
  function startEditing() {
    setEditLocation({ lat: report.lat, lng: report.lng })
    setActionError('')
    setEditing(true)
  }

  /** Save the edits through api.js. */
  async function handleSaveEdits(values) {
    try {
      setSaving(true)
      setActionError('')
      const updated = await updateReport(report.id, {
        ...values,
        lat: editLocation?.lat ?? report.lat,
        lng: editLocation?.lng ?? report.lng,
      })
      setReport(updated)
      setEditing(false)
    } catch (err) {
      setActionError(err?.message || 'Could not save your changes.')
    } finally {
      setSaving(false)
    }
  }

  /** Delete, after asking. Deleting cannot be undone. */
  async function handleDelete() {
    const sure = window.confirm(
      `Delete "${report.title}"?\n\nThis removes the report and its pin for everyone. It cannot be undone.`,
    )
    if (!sure) return

    try {
      setSaving(true)
      setActionError('')
      await deleteReport(report.id)
      navigate('/reports')
    } catch (err) {
      setActionError(err?.message || 'Could not delete this report.')
      setSaving(false)
    }
  }

  /** Moderator: change the status. */
  async function handleStatusChange(nextStatus) {
    try {
      setModerating(true)
      setActionError('')
      const updated = await setReportStatus(report.id, nextStatus)
      setReport(updated)
    } catch (err) {
      setActionError(err?.message || 'Could not change the status.')
    } finally {
      setModerating(false)
    }
  }

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

  // Who may do what. The rules enforce this for real - these flags only
  // decide which buttons to draw.
  const iAmOwner = canEditReport(report)
  const iAmModerator = canModerate()
  const showEditControls = iAmOwner || iAmModerator

  /** "I saw this too" - confirm (or un-confirm) this report. */
  async function handleConfirm() {
    setConfirmBusy(true)
    setActionError('')
    try {
      const result = await toggleReportConfirmation(report.id)
      setConfirmedByMe(result.confirmed)
      setConfirmCount(result.count)
    } catch (err) {
      setActionError(err?.message || 'Could not confirm this report.')
    } finally {
      setConfirmBusy(false)
    }
  }

  /** Follow this report so it is easy to find again. */
  async function handleFollow() {
    setFollowBusy(true)
    setActionError('')
    try {
      const result = await toggleFollowReport(report.id)
      setFollowing(result.following)
    } catch (err) {
      setActionError(err?.message || 'Could not follow this report.')
    } finally {
      setFollowBusy(false)
    }
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
          {editing ? (
            /* ============ EDIT MODE ============ */
            <div className="edit-panel">
              <header className="details-main__head">
                <div className="report-card__badges">
                  <TypeBadge type={report.type} />
                  <StatusBadge status={report.status} />
                </div>
                <h1>Edit this report</h1>
                <p className="muted">
                  Change the words below, and click the map if the pin is in the wrong place.
                </p>
              </header>

              {actionError ? <p className="alert alert--error">{actionError}</p> : null}

              <MapView
                reports={[]}
                selectedLocation={editLocation}
                onMapClick={(lat, lng) => setEditLocation({ lat, lng })}
                height="300px"
                showLegend={false}
              />

              <ReportForm
                onSubmit={handleSaveEdits}
                submitting={saving}
                location={editLocation}
                onClearLocation={() => setEditLocation(null)}
                initialValues={report}
                submitLabel="Save changes"
                errorMessage=""
              />

              <div className="edit-panel__cancel">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setEditing(false)
                    setActionError('')
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <p className="field__hint">
                  The status and the original report date are not changed by an edit.
                </p>
              </div>
            </div>
          ) : (
          <>
          <header className="details-main__head">
            <div className="report-card__badges">
              <TypeBadge type={report.type} />
              <StatusBadge status={report.status} />
            </div>
            <h1>{report.title}</h1>
            <p className="muted">
              Reported {formatDateTime(report.reportedAt)}
              {report.updatedAt ? ` · edited ${formatDateTime(report.updatedAt)}` : ''}
            </p>
          </header>

          {actionError ? <p className="alert alert--error">{actionError}</p> : null}

          {/* ---------- You are the moderator: change the status ---------- */}
          {iAmModerator ? (
            <div className="moderator-bar">
              <span className="moderator-bar__label">🛡️ Moderator</span>
              <label htmlFor="moderate-status" className="sr-only">
                Change status
              </label>
              <select
                id="moderate-status"
                value={report.status}
                onChange={(event) => handleStatusChange(event.target.value)}
                disabled={moderating}
              >
                {REPORT_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn--danger btn--small" onClick={handleDelete} disabled={saving}>
                Delete report
              </button>
            </div>
          ) : null}

          {/* ---------- You posted this report: edit it ---------- */}
          {!iAmModerator && iAmOwner ? (
            <div className="owner-bar">
              <span className="owner-bar__label">✍️ You posted this report</span>
              <button type="button" className="btn btn--outline btn--small" onClick={startEditing} disabled={editing}>
                Edit report
              </button>
              <button type="button" className="btn btn--danger btn--small" onClick={handleDelete} disabled={saving}>
                Delete
              </button>
            </div>
          ) : null}

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
            <h2>Progress</h2>
            {report.statusHistory && report.statusHistory.length ? (
              <ol className="timeline">
                {report.statusHistory.map((entry, index) => (
                  <li key={`${entry.at}-${index}`} className="timeline__item">
                    <span className="timeline__dot" aria-hidden="true" />
                    <div className="timeline__body">
                      <StatusBadge status={entry.status} />
                      <small>{formatDateTime(entry.at)}</small>
                      {entry.note ? <p>{entry.note}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">
                No progress has been recorded for this report yet.
              </p>
            )}
          </section>

          <section className="details-section">
            <h2>Neighbours</h2>
            <div className="confirm-box">
              <p>
                <strong>{confirmCount}</strong>{' '}
                {confirmCount === 1 ? 'neighbour has' : 'neighbours have'} confirmed this report.
              </p>
              <div className="confirm-box__actions">
                <button
                  type="button"
                  className="btn btn--outline btn--small"
                  onClick={handleConfirm}
                  disabled={confirmBusy}
                >
                  {confirmedByMe ? '✓ You confirmed this' : '✓ I saw this too'}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={handleFollow}
                  disabled={followBusy}
                >
                  {following ? '🔔 Following' : '🔔 Follow this report'}
                </button>
              </div>
            </div>
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

          </>
          )}

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
