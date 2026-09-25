import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import EventCard from '../components/EventCard.jsx'
import Loader from '../components/Loader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import useAsyncData from '../hooks/useAsyncData.js'
import { getEvents } from '../services/api.js'

// ---------------------------------------------------------------------------
// EVENTS PAGE  (Step 3 of the plan)
// Upcoming and past events, with a simple tab switch between them.
// ---------------------------------------------------------------------------
export default function Events() {
  const { data: events, loading, error } = useAsyncData(getEvents)
  const [tab, setTab] = useState('Upcoming') // 'Upcoming' | 'Past'

  const { upcoming, past } = useMemo(() => {
    const isPast = (event) => String(event.status || '').toLowerCase() === 'past'
    return {
      upcoming: events.filter((event) => !isPast(event)),
      past: events.filter(isPast),
    }
  }, [events])

  const visibleEvents = tab === 'Past' ? past : upcoming

  return (
    <section className="container page">
      <PageHeader
        eyebrow="What's coming up"
        title="College Events"
        subtitle="Technical fests, sports meets, cultural nights and social drives."
      />

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'Upcoming'}
          className={tab === 'Upcoming' ? 'tab is-active' : 'tab'}
          onClick={() => setTab('Upcoming')}
        >
          Upcoming <strong>{upcoming.length}</strong>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'Past'}
          className={tab === 'Past' ? 'tab is-active' : 'tab'}
          onClick={() => setTab('Past')}
        >
          Past <strong>{past.length}</strong>
        </button>
      </div>

      {loading ? <Loader text="Loading events…" /> : null}

      {error ? <EmptyState icon="⚠️" title="Could not load events" message={error} /> : null}

      {!loading && !error && visibleEvents.length === 0 ? (
        <EmptyState
          icon="🎉"
          title={tab === 'Past' ? 'No past events' : 'No upcoming events'}
          message={tab === 'Past' ? 'Events that finish will appear here.' : 'Check back soon for new events.'}
        />
      ) : null}

      {!loading && !error && visibleEvents.length > 0 ? (
        <div className="card-grid card-grid--events">
          {visibleEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
