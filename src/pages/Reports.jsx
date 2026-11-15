import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import ReportCard from '../components/ReportCard.jsx'
import ReportFilters from '../components/ReportFilters.jsx'
import Loader from '../components/Loader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import useReports from '../hooks/useReports.js'
import { isWithinDateRange } from '../utils/mapMath.js'
import { REPORT_TYPES } from '../utils/constants.js'

// ---------------------------------------------------------------------------
// REPORTS PAGE  (Step 3 of the plan)
// A searchable, filterable list of every report. No map here on purpose,
// so the page still works fast on a phone.
// ---------------------------------------------------------------------------
export default function Reports() {
  const { reports, loading, error, reload } = useReports()

  // The homepage search box and type chips link here with ?q= and ?type=,
  // so the page can open already filtered.
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [type, setType] = useState(searchParams.get('type') || 'All')
  const [status, setStatus] = useState('All')
  const [dateRange, setDateRange] = useState('all')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    setSearch(searchParams.get('q') || '')
    setType(searchParams.get('type') || 'All')
  }, [searchParams])

  const visibleReports = useMemo(() => {
    const text = search.trim().toLowerCase()

    const filtered = reports.filter((report) => {
      const matchesText =
        !text ||
        [report.title, report.description, report.locationName, report.reportedBy]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(text))

      const matchesDate = isWithinDateRange(report.reportedAt, dateRange)

      return (
        matchesText &&
        (type === 'All' || report.type === type) &&
        (status === 'All' || (status === 'Open' ? report.status !== 'Resolved' : report.status === status)) &&
        matchesDate
      )
    })

    const sorted = [...filtered]
    if (sort === 'oldest') sorted.sort((a, b) => new Date(a.reportedAt) - new Date(b.reportedAt))
    if (sort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title))
    return sorted
  }, [reports, search, type, status, dateRange, sort])

  const counts = useMemo(
    () => ({
      all: reports.length,
      open: reports.filter((report) => report.status !== 'Resolved').length,
      resolved: reports.filter((report) => report.status === 'Resolved').length,
    }),
    [reports],
  )

  return (
    <section className="container page design-page">
      <PageHeader
        eyebrow="Everything reported"
        title="Reports"
        subtitle="Search, filter and open any report. Each one has a type, a status and its exact location."
      >
        <Link to="/report" className="btn btn--primary">
          + Create Report
        </Link>
      </PageHeader>

      <div className="design-section-title"><h2>Report types</h2><span>Choose a category</span></div>
      <div className="design-folders" aria-label="Filter reports by type">
        {REPORT_TYPES.map((item, index) => (
          <button type="button" key={item} className={`design-folder design-folder--${index % 3} ${type === item ? 'is-selected' : ''}`}
            onClick={() => setType(type === item ? 'All' : item)} aria-pressed={type === item}>
            <strong>{item}</strong><span>{loading ? 'Loading…' : error ? 'Unavailable' : `${reports.filter((report) => report.type === item).length} reports`}</span>
          </button>
        ))}
      </div>
      <div className="count-chips">
        <button type="button" className={status === 'All' ? 'chip is-active' : 'chip'} onClick={() => setStatus('All')}>All reports <strong>{loading || error ? '—' : counts.all}</strong></button>
        <button type="button" className={status === 'Open' ? 'chip is-active' : 'chip'} onClick={() => setStatus('Open')}>Open <strong>{loading || error ? '—' : counts.open}</strong></button>
        <button type="button" className={status === 'Resolved' ? 'chip is-active' : 'chip'} onClick={() => setStatus('Resolved')}>Resolved <strong>{loading || error ? '—' : counts.resolved}</strong></button>
      </div>
      <ReportFilters
        search={search}
        onSearchChange={setSearch}
        type={type}
        onTypeChange={setType}
        status={status}
        showOpenOption
        onStatusChange={setStatus}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        resultCount={!loading && !error ? visibleReports.length : undefined}
        onReset={() => {
          setSearch('')
          setType('All')
          setStatus('All')
          setDateRange('all')
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

      <div className="design-section-title"><h2>Community reports</h2></div>
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
