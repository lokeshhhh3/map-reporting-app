import { REPORT_STATUSES, REPORT_TYPES } from '../utils/constants.js'

// ---------------------------------------------------------------------------
// ReportFilters  --  the search box + dropdowns used on the Reports and Map
// pages. It is a "dumb" component: it only shows what it is given and calls
// the functions its parent gives back.
// ---------------------------------------------------------------------------
export default function ReportFilters({
  search,
  onSearchChange,
  type = 'All',
  onTypeChange,
  status = 'All',
  onStatusChange,
  showStatus = true,
  resultCount,
  onReset,
}) {
  return (
    <div className="filters">
      <div className="filters__field filters__field--grow">
        <label htmlFor="filter-search">Search</label>
        <input
          id="filter-search"
          type="search"
          placeholder="Search by title, description or place…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      {onTypeChange ? (
        <div className="filters__field">
          <label htmlFor="filter-type">Type</label>
          <select id="filter-type" value={type} onChange={(event) => onTypeChange(event.target.value)}>
            <option value="All">All types</option>
            {REPORT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showStatus && onStatusChange ? (
        <div className="filters__field">
          <label htmlFor="filter-status">Status</label>
          <select id="filter-status" value={status} onChange={(event) => onStatusChange(event.target.value)}>
            <option value="All">All statuses</option>
            {REPORT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="filters__actions">
        {typeof resultCount === 'number' ? <span className="filters__count">{resultCount} found</span> : null}
        {onReset ? (
          <button type="button" className="btn btn--ghost" onClick={onReset}>
            Reset
          </button>
        ) : null}
      </div>
    </div>
  )
}
