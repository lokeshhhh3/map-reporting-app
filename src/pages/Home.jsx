import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MapView from '../components/MapView.jsx'
import NewsCard from '../components/NewsCard.jsx'
import EventCard from '../components/EventCard.jsx'
import Loader from '../components/Loader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import useReports from '../hooks/useReports.js'
import useAsyncData from '../hooks/useAsyncData.js'
import { getEvents, getNews } from '../services/api.js'

// ---------------------------------------------------------------------------
// HOME PAGE  (Step 3 of the plan)
// An introduction, route planner callout, map preview, and community updates.
// ---------------------------------------------------------------------------
export default function Home() {
  const navigate = useNavigate()
  const { reports, loading, error } = useReports()
  const { data: news } = useAsyncData(getNews)
  const { data: events, loading: eventsLoading, error: eventsError } = useAsyncData(getEvents)

  // A few numbers for the small statistics strip.
  const stats = useMemo(() => {
    const open = reports.filter((report) => report.status !== 'Resolved').length
    const resolved = reports.filter((report) => report.status === 'Resolved').length
    const upcoming = events.filter((event) => String(event.status).toLowerCase() !== 'past').length
    return { total: reports.length, open, resolved, upcoming }
  }, [reports, events])

  return (
    <div className="home">
      {/* ---------- hero ---------- */}
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__text">
            <p className="hero__eyebrow">📍 Shared map · College + neighbourhood</p>
            <h1>See what is happening around you.</h1>
            <p className="hero__subtitle">
              Report a damaged road, a water problem, an incident, a college event — put a pin on the exact
              spot and everyone can see it on one shared map.
            </p>
            <div className="hero__actions">
              <Link to="/map" className="btn btn--primary btn--large">
                Open the Map
              </Link>
            </div>
          </div>

          <ul className="stat-strip">
            <li>
              <StatValue value={stats.total} loading={loading} error={error} />
              <span>Total reports</span>
            </li>
            <li>
              <StatValue value={stats.open} loading={loading} error={error} />
              <span>Open / in progress</span>
            </li>
            <li>
              <StatValue value={stats.resolved} loading={loading} error={error} />
              <span>Resolved</span>
            </li>
            <li>
              <StatValue value={stats.upcoming} loading={eventsLoading} error={eventsError} />
              <span>Upcoming events</span>
            </li>
          </ul>
        </div>
      </section>

      <div className="container">
        {/* Show the route planner without repeating the navigation menu. */}
        <section className="section home-route" aria-labelledby="home-route-title">
          <div>
            <p className="home-route__eyebrow">MORE THAN A MAP</p>
            <h2 id="home-route-title">Find your way. Discover what’s along it.</h2>
            <p>Plan a drive, walk or cycle, see directions and explore places near your route.</p>
          </div>
          <Link to="/navigate" className="btn btn--primary btn--large">Plan a route →</Link>
        </section>

        {/* ---------- map + nearby ---------- */}
        <section className="section">
          <div className="section__head">
            <div>
              <h2 className="section__title">Main map</h2>
              <p className="section__subtitle">Click a pin to open that report.</p>
            </div>
            <Link to="/map" className="link-arrow">
              Go to full map →
            </Link>
          </div>

          <div className="home__map-layout">
            {loading ? <Loader text="Loading map pins…" /> : null}
            {error ? <EmptyState icon="⚠️" title="Could not load reports" message={error} /> : null}

            {!loading && !error ? (
              <MapView
                reports={reports}
                height="440px"
                onMarkerClick={(report) => navigate(`/reports/${report.id}`)}
              />
            ) : null}

            <aside className="home__side card">
              <h3 className="card__title">Latest reports</h3>
              {loading ? <Loader /> : null}
              {!loading && !error && reports.length === 0 ? (
                <EmptyState icon="📍" title="No reports yet" message="Be the first to report something." actionLabel="Create Report" actionTo="/report" />
              ) : null}
              <div className="home__side-list">
                {reports.slice(0, 5).map((report) => (
                  <Link key={report.id} to={`/reports/${report.id}`} className="mini-report">
                    <span className={`mini-report__dot dot--${String(report.type).toLowerCase()}`} aria-hidden="true" />
                    <span>
                      <strong>{report.title}</strong>
                      <small>
                        {report.type} · {report.status}
                      </small>
                    </span>
                  </Link>
                ))}
              </div>
              <Link to="/reports" className="btn btn--ghost btn--block">
                See all reports
              </Link>
            </aside>
          </div>
        </section>

        {/* ---------- news + events preview ---------- */}
        <section className="section">
          <div className="two-column">
            <div>
              <div className="section__head">
                <h2 className="section__title">News &amp; Announcements</h2>
                <Link to="/news" className="link-arrow">
                  All news →
                </Link>
              </div>
              <div className="stack">
                {news.slice(0, 2).map((item) => (
                  <NewsCard key={item.id} item={item} />
                ))}
              </div>
            </div>

            <div>
              <div className="section__head">
                <h2 className="section__title">Events</h2>
                <Link to="/events" className="link-arrow">
                  All events →
                </Link>
              </div>
              <div className="stack">
                {events.slice(0, 2).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

// Loading is different from a genuine count of zero or an unavailable count.
function StatValue({ value, loading, error }) {
  if (loading) {
    return (
      <strong aria-label="Loading count">
        <span className="stat-strip__skeleton" aria-hidden="true" />
      </strong>
    )
  }
  if (error) return <strong aria-label="Count unavailable">—</strong>
  return <strong>{value}</strong>
}
