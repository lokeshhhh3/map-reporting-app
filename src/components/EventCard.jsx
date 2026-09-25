import { formatDate } from '../utils/mapMath.js'

// EventCard -- one event. "Past" events look slightly faded (see the CSS).
export default function EventCard({ event }) {
  const isPast = String(event.status || '').toLowerCase() === 'past'

  return (
    <article className={`event-card ${isPast ? 'event-card--past' : ''}`}>
      <div className="event-card__date" aria-hidden="true">
        <strong>{new Date(event.date).getDate()}</strong>
        <span>{new Date(event.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
      </div>

      <div className="event-card__body">
        <div className="event-card__top">
          <span className="pill">{event.category || 'General'}</span>
          <span className={`pill pill--${isPast ? 'muted' : 'live'}`}>{isPast ? 'Past' : 'Upcoming'}</span>
        </div>

        <h3 className="event-card__title">{event.name}</h3>

        <ul className="event-card__meta">
          <li>📍 {event.location}</li>
          <li>🗓️ {formatDate(event.date)}</li>
          <li>⏰ {event.time}</li>
        </ul>

        <p className="event-card__text">{event.description}</p>
      </div>
    </article>
  )
}
