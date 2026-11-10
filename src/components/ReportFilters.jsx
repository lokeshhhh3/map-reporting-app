import { REPORT_STATUSES, REPORT_TYPES } from '../utils/constants.js'
import { NEAR_ME_RADII } from '../utils/geo.js'

// ---------------------------------------------------------------------------
// ReportFilters  --  the search box + dropdowns used on the Reports and Map
// pages. It is a "dumb" component: it only shows what it is given and calls
// the functions its parent gives back.
//
// Everything here is optional. A parent that passes no handlers simply gets
// fewer controls - that is why every control is wrapped in a `? :` check.
// ---------------------------------------------------------------------------

/** The date choices. `value` is what the parent filters on. */
export const DATE_RANGES = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '365', label: 'Last year' },
]

export default function ReportFilters({
  search,
  onSearchChange,
  type = 'All',
  onTypeChange,
  status = 'All',
  onStatusChange,
  showStatus = true,

  // --- date range ---
  dateRange = 'all',
  onDateRangeChange,

  // --- "near me" ---
  radius = '',
  onRadiusChange,
  onUseMyLocation,
  locating = false,
  nearMeLabel = '',
  showNearMe = false,

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

      {onDateRangeChange ? (
        <div className="filters__field">
          <label htmlFor="filter-date">Reported</label>
          <select id="filter-date" value={dateRange} onChange={(event) => onDateRangeChange(event.target.value)}>
            {DATE_RANGES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showNearMe && onRadiusChange ? (
        <div className="filters__field">
          <label htmlFor="filter-radius">Distance</label>
          <select
            id="filter-radius"
            value={radius}
            onChange={(event) => onRadiusChange(event.target.value)}
          >
            <option value="">Any distance</option>
            {NEAR_ME_RADII.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="filters__actions">
        {typeof resultCount === 'number' ? <span className="filters__count">{resultCount} found</span> : null}

        {showNearMe && onUseMyLocation ? (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={onUseMyLocation}
            disabled={locating}
            title="Uses your device location to sort and filter reports by distance"
          >
            {locating ? '📍 Locating…' : nearMeLabel || '📍 Near me'}
          </button>
        ) : null}

        {onReset ? (
          <button type="button" className="btn btn--ghost" onClick={onReset}>
            Reset
          </button>
        ) : null}
      </div>
    </div>
  )
}
