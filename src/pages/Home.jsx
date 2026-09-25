import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MapView from '../components/MapView.jsx'
import ReportCard from '../components/ReportCard.jsx'
import NewsCard from '../components/NewsCard.jsx'
import EventCard from '../components/EventCard.jsx'
import Loader from '../components/Loader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import useReports from '../hooks/useReports.js'
import useAsyncData from '../hooks/useAsyncData.js'
import { getEvents, getNews } from '../services/api.js'

// ---------------------------------------------------------------------------
// HOME PAGE  (Step 3 of the plan)
// Quick access to Map / Reports / News / Events / Create Report, a map preview
// with pins, the latest nearby reports, and the newest news + events.
// ---------------------------------------------------------------------------
export default function Home() {
  const navigate = useNavigate()
  const { reports, loading, error } = useReports()
  const { data: news } = useAsyncData(getNews)
  const { data: events } = useAsyncData(getEvents)

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
              <Link to="/report" className="btn btn--outline btn--large">
                + Create Report
              </Link>
            </div>
          </div>

          <ul className="stat-strip">
            <li>
              <strong>{stats.total}</strong>
              <span>Total reports</span>
            </li>
            <li>
              <strong>{stats.open}</strong>
              <span>Open / in progress</span>
            </li>
            <li>
              <strong>{stats.resolved}</strong>
              <span>Resolved</span>
            </li>
            <li>
              <strong>{stats.upcoming}</strong>
              <span>Upcoming events</span>
            </li>
          </ul>
        </div>
      </section>

      <div className="container">
        {/* ---------- quick access tiles ---------- */}
        <section className="section">
          <h2 className="section__title">Quick access</h2>
          <div className="tile-grid">
            <Link to="/map" className="tile">
              <span className="tile__icon" aria-hidden="true">🗺️</span>
              <h3>Map</h3>
              <p>All the pins in your area on one screen.</p>
            </Link>
            <Link to="/reports" className="tile">
              <span className="tile__icon" aria-hidden="true">📋</span>
              <h3>Reports</h3>
              <p>Search and filter every report.</p>
            </Link>
            <Link to="/news" className="tile">
              <span className="tile__icon" aria-hidden="true">📰</span>
              <h3>News</h3>
              <p>College news and announcements.</p>
            </Link>
            <Link to="/events" className="tile">
              <span className="tile__icon" aria-hidden="true">🎉</span>
              <h3>Events</h3>
              <p>Upcoming and past events.</p>
            </Link>
            <Link to="/report" className="tile tile--accent">
              <span className="tile__icon" aria-hidden="true">➕</span>
              <h3>Create Report</h3>
              <p>Add a pin with a description and a photo.</p>
            </Link>
          </div>
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
              {!loading && reports.length === 0 ? (
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
                {news.slice(0, 3).map((item) => (
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
                {events.slice(0, 3).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- how it works ---------- */}
        <section className="section">
          <h2 className="section__title">How it works</h2>
          <ol className="steps">
            <li>
              <strong>Open the map</strong>
              <span>See every pin that others have reported.</span>
            </li>
            <li>
              <strong>Pick the exact spot</strong>
              <span>Click the place on the map — that gives us latitude and longitude.</span>
            </li>
            <li>
              <strong>Describe it and add a photo</strong>
              <span>Complaint, incident, announcement, event or other.</span>
            </li>
            <li>
              <strong>Submit</strong>
              <span>The report is stored and instantly appears as a new pin.</span>
            </li>
          </ol>
          <div className="cta-banner">
            <div>
              <h3>Spotted something in your area?</h3>
              <p>It takes less than a minute to put it on the map.</p>
            </div>
            <Link to="/report" className="btn btn--primary btn--large">
              + Create Report
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
