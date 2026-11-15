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
import landscape from '../assets/community-landscape.jpg'

export default function Home() {
  const navigate = useNavigate()
  const { reports, loading, error } = useReports()
  const { data: news, loading: newsLoading, error: newsError } = useAsyncData(getNews)
  const { data: events, loading: eventsLoading, error: eventsError } = useAsyncData(getEvents)
  const stats = useMemo(() => ({
    total: reports.length,
    open: reports.filter((report) => report.status !== 'Resolved').length,
    resolved: reports.filter((report) => report.status === 'Resolved').length,
    upcoming: events.filter((event) => String(event.status).toLowerCase() !== 'past').length,
  }), [reports, events])

  return <div className="new-home">
    <section className="new-home__hero" style={{ backgroundImage: `url(${landscape})` }} aria-label="Welcome">
      <span className="new-home__brand">✳ &nbsp; MAP REPORTING APP</span>
      <div className="new-home__pin new-home__pin--one" aria-hidden="true">⚑</div>
      <div className="new-home__pin new-home__pin--two" aria-hidden="true">⌁</div>
      <div className="new-home__intro"><h1>Know your<br /><strong>neighbourhood.</strong></h1><p>Explore the map, share a report and keep up with what’s happening around you.</p><Link className="btn btn--primary" to="/map">Explore the map ↗</Link></div>
      <div className="new-home__route"><small>✳ &nbsp; FIND YOUR WAY</small><strong>Go somewhere<br />good.</strong><Link to="/navigate">Open Navigate →</Link></div>
    </section>
    <div className="new-home__content">
      <div className="new-home__shortcuts">
        <Link to="/map"><span>⌖</span><div><strong>Explore your map</strong><small>See what’s happening nearby.</small></div></Link>
        <Link to="/report"><span>⚑</span><div><strong>Share a report</strong><small>Let your community know.</small></div></Link>
        <Link to="/navigate"><span>➤</span><div><strong>Find a route</strong><small>Discover places along the way.</small></div></Link>
      </div>
      <section className="new-home__section" aria-label="Community statistics"><div className="new-home__stats">
        <Stat label="Total reports" value={stats.total} loading={loading} error={error} />
        <Stat label="Open / in progress" value={stats.open} loading={loading} error={error} />
        <Stat label="Resolved" value={stats.resolved} loading={loading} error={error} />
        <Stat label="Events not marked past" value={stats.upcoming} loading={eventsLoading} error={eventsError} />
      </div></section>
      <section className="new-home__section"><div className="new-home__heading"><div><h2>Explore the map</h2><p>Click a pin to open a report.</p></div><Link to="/map">Full map →</Link></div>
        <div className="new-home__map-layout"><div>{loading ? <Loader text="Loading map pins…" /> : null}{error ? <EmptyState icon="⚠️" title="Could not load reports" message={error} /> : null}{!loading && !error ? <MapView reports={reports} height="400px" onMarkerClick={(report) => navigate(`/reports/${report.id}`)} /> : null}</div>
        <aside className="new-home__latest"><h3>Latest reports</h3>{loading ? <Loader text="Loading reports…" /> : null}{error ? <p role="alert">Reports are unavailable.</p> : null}{!loading && !error && !reports.length ? <p>No reports yet.</p> : null}{!loading && !error ? reports.slice(0, 5).map((report) => <Link key={report.id} to={`/reports/${report.id}`}><strong>{report.title}</strong><small>{report.type} · {report.status}</small></Link>) : null}<Link className="new-home__more" to="/reports">All reports →</Link></aside></div>
      </section>
      <section className="new-home__section new-home__updates"><div><div className="new-home__heading"><h2>News &amp; announcements</h2><Link to="/news">All news →</Link></div>{newsLoading ? <Loader text="Loading news…" /> : null}{newsError ? <p role="alert">Could not load news: {newsError}</p> : null}{!newsLoading && !newsError && !news.length ? <p>No news available.</p> : null}<div className="stack">{!newsLoading && !newsError ? news.slice(0, 2).map((item) => <NewsCard key={item.id} item={item} />) : null}</div></div>
      <div><div className="new-home__heading"><h2>Events</h2><Link to="/events">All events →</Link></div>{eventsLoading ? <Loader text="Loading events…" /> : null}{eventsError ? <p role="alert">Could not load events: {eventsError}</p> : null}{!eventsLoading && !eventsError && !events.length ? <p>No events available.</p> : null}<div className="stack">{!eventsLoading && !eventsError ? events.slice(0, 2).map((event) => <EventCard key={event.id} event={event} />) : null}</div></div></section>
    </div>
  </div>
}
function Stat({ label, value, loading, error }) {
  return <div><strong>{loading ? '…' : error ? '—' : value}</strong><span>{label}</span></div>
}
