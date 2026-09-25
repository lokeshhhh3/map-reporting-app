import { Link } from 'react-router-dom'
import { StatusBadge, TypeBadge } from './Badge.jsx'
import { formatDateTime } from '../utils/mapMath.js'
import { TYPE_ICONS } from '../utils/constants.js'

// ---------------------------------------------------------------------------
// ReportCard  --  one report shown as a card in a list.
// Props: report (object), onSelect (optional function, used on the Map page)
// ---------------------------------------------------------------------------
export default function ReportCard({ report, onSelect, compact = false }) {
  const content = (
    <>
      {report.photoUrl ? (
        <img className="report-card__photo" src={report.photoUrl} alt={`Photo for ${report.title}`} loading="lazy" />
      ) : (
        <div className="report-card__photo report-card__photo--empty" aria-hidden="true">
          <span>{TYPE_ICONS[report.type] || '📍'}</span>
          <small>No photo</small>
        </div>
      )}

      <div className="report-card__body">
        <div className="report-card__badges">
          <TypeBadge type={report.type} />
          <StatusBadge status={report.status} />
        </div>

        <h3 className="report-card__title">{report.title}</h3>

        {!compact && report.description ? (
          <p className="report-card__text">{report.description}</p>
        ) : null}

        <ul className="report-card__meta">
          <li>📍 {report.locationName || 'Location on map'}</li>
          <li>🕒 {formatDateTime(report.reportedAt)}</li>
          {report.reportedBy ? <li>👤 {report.reportedBy}</li> : null}
        </ul>

        <span className="link-arrow">View details →</span>
      </div>
    </>
  )

  // If a parent gives us onSelect (Map page side panel), use a button.
  if (onSelect) {
    return (
      <article className={`report-card ${compact ? 'report-card--compact' : ''}`}>
        <button type="button" className="report-card__clickable" onClick={() => onSelect(report)}>
          {content}
        </button>
      </article>
    )
  }

  return (
    <article className={`report-card ${compact ? 'report-card--compact' : ''}`}>
      <Link to={`/reports/${report.id}`} className="report-card__clickable">
        {content}
      </Link>
    </article>
  )
}
