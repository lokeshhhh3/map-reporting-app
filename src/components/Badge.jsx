import { slugify } from '../utils/mapMath.js'
import { TYPE_ICONS } from '../utils/constants.js'

// ---------------------------------------------------------------------------
// Badge.jsx  --  two tiny reusable labels used inside report cards.
// ---------------------------------------------------------------------------

/** The coloured label showing Complaint / Incident / Announcement / Event / Other. */
export function TypeBadge({ type = 'Other' }) {
  return (
    <span className={`badge badge--type badge--${slugify(type)}`}>
      <span aria-hidden="true">{TYPE_ICONS[type] || '📍'}</span> {type}
    </span>
  )
}

/** The coloured label showing Unverified / In Progress / Resolved / Verified. */
export function StatusBadge({ status = 'Unverified' }) {
  return <span className={`badge badge--status badge--${slugify(status)}`}>{status}</span>
}
