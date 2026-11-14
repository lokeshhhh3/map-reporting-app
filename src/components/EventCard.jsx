import { useState } from 'react'
import { formatDate } from '../utils/mapMath.js'
import { downloadEventIcs } from '../utils/calendar.js'

// EventCard -- one event. "Past" events look slightly faded (see the CSS).
export default function EventCard({ event }) {
  const isPast = String(event.status || '').toLowerCase() === 'past'
  const [calendarNote, setCalendarNote] = useState('')

  /** Save this event to the phone's own calendar. */
  function handleAddToCalendar() {
    const ok = downloadEventIcs(event)
    setCalendarNote(ok ? 'Downloaded — open the file to save it.' : 'Could not make the file.')
    setTimeout(() => setCalendarNote(''), 4000)
  }

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

        {!isPast ? (
          <div className="event-card__calendar">
            <button type="button" className="btn btn--outline btn--small" onClick={handleAddToCalendar}>
              📅 Add to calendar
            </button>
            {calendarNote ? <small className="event-card__calendar-note">{calendarNote}</small> : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
