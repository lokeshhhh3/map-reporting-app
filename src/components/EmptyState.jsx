import { Link } from 'react-router-dom'

// Shown when a list is empty, or when the backend returns an error.
export default function EmptyState({
  icon = '🗂️',
  title = 'Nothing here yet',
  message = 'Try changing the filters or come back later.',
  actionLabel,
  actionTo,
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      <h3>{title}</h3>
      <p>{message}</p>
      {actionLabel && actionTo ? (
        <Link to={actionTo} className="btn btn--primary">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}
