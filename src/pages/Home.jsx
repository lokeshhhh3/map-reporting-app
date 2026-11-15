import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import HeroScene from '../components/HeroScene.jsx'
import MapView from '../components/MapView.jsx'
import ReportCard from '../components/ReportCard.jsx'
import NewsCard from '../components/NewsCard.jsx'
import EventCard from '../components/EventCard.jsx'
import Loader from '../components/Loader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import useReports from '../hooks/useReports.js'
import useAsyncData from '../hooks/useAsyncData.js'
import { getEvents, getNews } from '../services/api.js'
import { REPORT_TYPES } from '../utils/constants.js'
import { formatDateTime, slugify } from '../utils/mapMath.js'

// ---------------------------------------------------------------------------
// HOME PAGE
// An illustrated stage with floating cards (search, types, live counts, the
// newest report), then the live map, the route planner band, latest reports,
// news, events and a closing call to action.
// ---------------------------------------------------------------------------
export default function Home() {
  const navigate = useNavigate()
  const { reports, loading, error } = useReports()
  const { data: news, loading: newsLoading, error: newsError } = useAsyncData(getNews)
  const { data: events, loading: eventsLoading, error: eventsError } = useAsyncData(getEvents)
  const [query, setQuery] = useState('')

  const stats = useMemo(() => {
    const open = reports.filter((report) => report.status !== 'Resolved').length
    const resolved = reports.filter((report) => report.status === 'Resolved').length
    const upcoming = events.filter((event) => String(event.status).toLowerCase() !== 'past').length
    return { total: reports.length, open, resolved, upcoming }
  }, [reports, events])

  const newest = reports[0] || null

  function handleSearch(event) {
    event.preventDefault()
    const text = query.trim()
    navigate(text ? `/reports?q=${encodeURIComponent(text)}` : '/reports')
  }

  return (
    <div className="home">
      {/* ---------- illustrated stage with floating cards ---------- */}
      <section className="hero-stage">
        <HeroScene />
        <div className="hero-stage__scrim" aria-hidden="true" />

        <p className="hero-live">
          <span className="hero-live__dot" aria-hidden="true" />
          {loading ? 'Loading map…' : error ? 'Map unavailable' : `Live map · ${stats.total} reports`}
        </p>

        <div className="hero-stage__body">
          <div className="hero-cards">
            <div className="hero-card hero-card--title">
              <p className="hero-eyebrow">Shared map · College + neighbourhood</p>
              <h1 className="hero-title">
                See what&rsquo;s happening
                <span>around you.</span>
              </h1>

              <form className="hero-search" onSubmit={handleSearch} role="search">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search reports, places, issues"
                  aria-label="Search reports"
                />
                <button type="submit" aria-label="Search reports">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m16.5 16.5 4 4" />
                  </svg>
                </button>
              </form>
            </div>

            <div className="hero-card">
              <p className="hero-card__label">What&rsquo;s on the map</p>
              <div className="hero-chips">
                {REPORT_TYPES.map((type) => (
                  <Link key={type} to={`/reports?type=${encodeURIComponent(type)}`} className="type-chip">
                    <span className={`type-chip__dot type-chip__dot--${slugify(type)}`} aria-hidden="true" />
                    {type}
                  </Link>
                ))}
              </div>
            </div>

            <div className="hero-card">
              <p className="hero-card__label">Right now</p>
              <div className="hero-stats">
                <div className="stat-tile">
                  <StatValue value={stats.total} loading={loading} error={error} />
                  <span>Reports</span>
                </div>
                <div className="stat-tile">
                  <StatValue value={stats.open} loading={loading} error={error} />
                  <span>Open</span>
                </div>
                <div className="stat-tile">
                  <StatValue value={stats.resolved} loading={loading} error={error} />
                  <span>Resolved</span>
                </div>
                <div className="stat-tile">
                  <StatValue value={stats.upcoming} loading={eventsLoading} error={eventsError} />
                  <span>Events</span>
                </div>
              </div>
            </div>
          </div>

          <Link to={newest ? `/reports/${newest.id}` : '/reports'} className="hero-latest">
            <div className="hero-latest__text">
              <p className="hero-latest__label">Latest on the map</p>
              <p className="hero-latest__title">{newest ? newest.title : 'Be the first to report'}</p>
              <p className="hero-latest__meta">
                {newest ? `${newest.type} · ${formatDateTime(newest.reportedAt)}` : 'Nothing reported yet today'}
              </p>
            </div>
            <span className="hero-latest__thumb" aria-hidden="true">
              {newest && newest.photoUrl ? (
                <img src={newest.photoUrl} alt="" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="26" height="26">
                  <path d="M3 18 9 9l4 6 3-4 5 7z" />
                  <circle cx="8" cy="6" r="2" />
                </svg>
              )}
            </span>
          </Link>
        </div>
      </section>

      <div className="container">
        {/* ---------- the live map ---------- */}
        <section className="home-section">
          <div className="home-section__head">
            <div>
              <p className="home-section__eyebrow">The live map</p>
              <h2 className="home-section__title">Everything pinned, in one place.</h2>
            </div>
            <Link to="/map" className="link-arrow">
              Open the full map →
            </Link>
          </div>

          <div className="home-map-card">
            {loading ? <Loader text="Loading map pins…" /> : null}
            {error ? (
              <EmptyState icon="⚠️" title="Could not load reports" message={error} />
            ) : null}

            {!loading && !error ? (
              <div className="home__map-layout">
                <MapView
                  reports={reports}
                  height="470px"
                  clusterReports
                  onMarkerClick={(report) => navigate(`/reports/${report.id}`)}
                />

                <aside className="home__side">
                  <h3 className="card__title">Newest reports</h3>
                  <div className="home__side-list">
                    {reports.slice(0, 5).map((report) => (
                      <Link key={report.id} to={`/reports/${report.id}`} className="mini-report">
                        <span
                          className={`mini-report__dot dot--${slugify(report.type)}`}
                          aria-hidden="true"
                        />
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
            ) : null}
          </div>
        </section>

        {/* ---------- route planner band ---------- */}
        <section className="home-section">
          <div className="home-route">
            <div>
              <p className="home-route__eyebrow">More than a map</p>
              <h2>Find your way. See what&rsquo;s along it.</h2>
              <p>
                Plan a drive, walk or cycle across campus or the city, then check which reports and
                events sit on the way.
              </p>
            </div>
            <Link to="/navigate" className="btn btn--large">
              Plan a route →
            </Link>
          </div>
        </section>

        {/* ---------- latest reports ---------- */}
        <section className="home-section">
          <div className="home-section__head">
            <div>
              <p className="home-section__eyebrow">Recently reported</p>
              <h2 className="home-section__title">Latest reports</h2>
            </div>
            <Link to="/reports" className="link-arrow">
              All reports →
            </Link>
          </div>

          {!loading && !error && reports.length === 0 ? (
            <EmptyState
              icon="📍"
              title="No reports yet"
              message="Be the first to put something on the map."
              actionLabel="Create Report"
              actionTo="/report"
            />
          ) : null}

          <div className="card-grid">
            {reports.slice(0, 3).map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </section>

        {/* ---------- news + events ---------- */}
        <section className="home-section">
          <div className="two-column">
            <div>
              <div className="home-section__head">
                <div>
                  <p className="home-section__eyebrow">From the college</p>
                  <h2 className="home-section__title">News</h2>
                </div>
                <Link to="/news" className="link-arrow">
                  All news →
                </Link>
              </div>
              <div className="stack">
                {newsLoading ? <Loader text="Loading news…" /> : null}
                {newsError ? <EmptyState icon="⚠️" title="Could not load news" message={newsError} /> : null}
                {!newsLoading && !newsError && news.length === 0 ? <p className="muted">No news yet.</p> : null}
                {news.slice(0, 2).map((item) => (
                  <NewsCard key={item.id} item={item} />
                ))}
              </div>
            </div>

            <div>
              <div className="home-section__head">
                <div>
                  <p className="home-section__eyebrow">Coming up</p>
                  <h2 className="home-section__title">Events</h2>
                </div>
                <Link to="/events" className="link-arrow">
                  All events →
                </Link>
              </div>
              <div className="stack">
                {eventsLoading ? <Loader text="Loading events…" /> : null}
                {eventsError ? <EmptyState icon="⚠️" title="Could not load events" message={eventsError} /> : null}
                {!eventsLoading && !eventsError && events.length === 0 ? <p className="muted">No events yet.</p> : null}
                {events.slice(0, 2).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- closing action ---------- */}
        <section className="home-section">
          <div className="home-cta">
            <div>
              <h2>Spotted something worth fixing?</h2>
              <p>Drop a pin, add a description and share it with your community.</p>
            </div>
            <Link to="/report" className="btn btn--large">
              Report it
            </Link>
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
