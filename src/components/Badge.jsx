import { slugify } from '../utils/mapMath.js'

// ---------------------------------------------------------------------------
// Badge.jsx  --  two tiny reusable labels used inside report cards.
// The reference style keeps labels as quiet pastel pills, so the type badge
// uses a small colour dot instead of an emoji.
// ---------------------------------------------------------------------------

/** The coloured label showing Complaint / Incident / Announcement / Event / Other. */
export function TypeBadge({ type = 'Other' }) {
  return (
    <span className={`badge badge--type badge--${slugify(type)}`}>
      <span className={`type-chip__dot type-chip__dot--${slugify(type)}`} aria-hidden="true" />
      {type}
    </span>
  )
}

/** The coloured label showing Unverified / In Progress / Resolved / Verified. */
export function StatusBadge({ status = 'Unverified' }) {
  return <span className={`badge badge--status badge--${slugify(status)}`}>{status}</span>
}
