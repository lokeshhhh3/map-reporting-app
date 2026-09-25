import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import ReportCard from '../components/ReportCard.jsx'
import ReportFilters from '../components/ReportFilters.jsx'
import Loader from '../components/Loader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import useReports from '../hooks/useReports.js'

// ---------------------------------------------------------------------------
// REPORTS PAGE  (Step 3 of the plan)
// A searchable, filterable list of every report. No map here on purpose,
// so the page still works fast on a phone.
// ---------------------------------------------------------------------------
export default function Reports() {
  const { reports, loading, error, reload } = useReports()

  const [search, setSearch] = useState('')
  const [type, setType] = useState('All')
  const [status, setStatus] = useState('All')
  const [sort, setSort] = useState('newest')

  const visibleReports = useMemo(() => {
    const text = search.trim().toLowerCase()

    const filtered = reports.filter((report) => {
      const matchesText =
        !text ||
        [report.title, report.description, report.locationName, report.reportedBy]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(text))

      return matchesText && (type === 'All' || report.type === type) && (status === 'All' || report.status === status)
    })

    const sorted = [...filtered]
    if (sort === 'oldest') sorted.sort((a, b) => new Date(a.reportedAt) - new Date(b.reportedAt))
    if (sort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title))
    return sorted
  }, [reports, search, type, status, sort])

  const counts = useMemo(
    () => ({
      all: reports.length,
      open: reports.filter((report) => report.status !== 'Resolved').length,
      resolved: reports.filter((report) => report.status === 'Resolved').length,
    }),
    [reports],
  )

  return (
    <section className="container page">
      <PageHeader
        eyebrow="Everything reported"
        title="Reports"
        subtitle="Search, filter and open any report. Each one has a type, a status and its exact location."
      >
        <Link to="/report" className="btn btn--primary">
          + Create Report
        </Link>
      </PageHeader>

      <div className="count-chips">
        <button type="button" className={status === 'All' ? 'chip is-active' : 'chip'} onClick={() => setStatus('All')}>
          All reports <strong>{counts.all}</strong>
        </button>
        <button
          type="button"
          className={status === 'Open' ? 'chip is-active' : 'chip'}
          onClick={() => {
            setStatus('All')
            setSearch('')
            setType('All')
            setSort('newest')
          }}
        >
          Open <strong>{counts.open}</strong>
        </button>
        <button type="button" className="chip" onClick={() => setStatus('Resolved')}>
          Resolved <strong>{counts.resolved}</strong>
        </button>
      </div>

      <ReportFilters
        search={search}
        onSearchChange={setSearch}
        type={type}
        onTypeChange={setType}
        status={status === 'Open' ? 'All' : status}
        onStatusChange={setStatus}
        resultCount={visibleReports.length}
        onReset={() => {
          setSearch('')
          setType('All')
          setStatus('All')
          setSort('newest')
        }}
      />

      <div className="toolbar">
        <label htmlFor="sort-by">
          Sort by
          <select id="sort-by" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </label>
      </div>

      {loading ? <Loader text="Loading reports…" /> : null}

      {error ? (
        <EmptyState
          icon="⚠️"
          title="Could not load reports"
          message={error}
          actionLabel="Try again"
          actionTo="/reports"
        />
      ) : null}

      {!loading && !error && visibleReports.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No reports match your search"
          message="Clear the filters, or be the first to report something here."
          actionLabel="Create Report"
          actionTo="/report"
        />
      ) : null}

      {!loading && !error && visibleReports.length > 0 ? (
        <>
          <div className="card-grid">
            {visibleReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
          <p className="muted">
            Showing {visibleReports.length} report{visibleReports.length === 1 ? '' : 's'}.{' '}
            <button type="button" className="link-button" onClick={reload}>
              Refresh
            </button>
          </p>
        </>
      ) : null}
    </section>
  )
}
