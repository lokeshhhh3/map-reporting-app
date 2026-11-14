/* ===========================================================================
 * SmartExplorePanel.jsx  --  the "what is on the way?" panel.
 *
 * It lives on the right of the map on a computer and as a bottom sheet on a
 * phone. It shows:
 *   - a chip for every kind of place, so you can switch groups on and off
 *   - a slider for "how far from the road is still on the way"
 *   - a sort button
 *   - the list of places, each one with its name, kind, address, how far it
 *     is from the route and how many extra minutes stopping there would add
 *   - buttons to ADD THE PLACE AS A STOP or to GO THERE DIRECTLY
 *
 * It never shows a rating unless a rating provider is really configured,
 * and it never shows opening hours unless OpenStreetMap actually knows them.
 * =========================================================================== */

import { useMemo } from 'react'
import {
  EXPLORE_CATEGORIES,
  formatDistance,
} from '../services/exploreService.js'

// The three ways of ordering the list.
const SORT_OPTIONS = [
  { id: 'nearest', label: 'Closest to the route' },
  { id: 'detour', label: 'Smallest detour' },
  { id: 'name', label: 'Name A–Z' },
]

// How far from the road we are willing to look.
const RADIUS_OPTIONS = [
  { value: 500, label: 'Within 500 m' },
  { value: 1000, label: 'Within 1 km' },
  { value: 1500, label: 'Within 1.5 km' },
]

export default function SmartExplorePanel({
  places = [],
  loading = false,
  progress = null,
  error = '',
  activeCategoryIds = [],
  onToggleCategory,
  radius = 1000,
  onRadiusChange,
  sort = 'nearest',
  onSortChange,
  selectedPlace = null,
  onSelectPlace,
  onAddStop,
  onGoHere,
  onClose,
  stops = [],
  onRemoveStop,
  stopExtraMinutes = null,
  mode = 'driving',
}) {
  // Only the groups the user has switched on, and only the ones that are
  // close enough to the road.
  const visible = useMemo(
    () =>
      places.filter(
        (place) =>
          activeCategoryIds.includes(place.categoryId) &&
          (place.distanceFromRoute || 0) <= radius,
      ),
    [places, activeCategoryIds, radius],
  )

  // How many of each kind we found, for the little number on each chip.
  const counts = useMemo(() => {
    const tally = {}
    places.forEach((place) => {
      if ((place.distanceFromRoute || 0) > radius) return
      tally[place.categoryId] = (tally[place.categoryId] || 0) + 1
    })
    return tally
  }, [places, radius])

  const sorted = useMemo(() => {
    const list = [...visible]
    if (sort === 'detour') {
      list.sort((a, b) => (a.detourMinutes || 0) - (b.detourMinutes || 0))
    } else if (sort === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      list.sort((a, b) => (a.distanceFromRoute || 0) - (b.distanceFromRoute || 0))
    }
    return list
  }, [visible, sort])

  const stopIds = new Set(stops.map((stop) => stop.id))

  return (
    <aside className="nm-explore" aria-label="Places along your route">
      <header className="nm-explore__head">
        <div>
          <h2>🔍 Along your route</h2>
          <p className="nm-explore__sub">
            {loading
              ? `Searching… ${progress ? `${progress.done} of ${progress.total}` : ''}`
              : `${visible.length} ${visible.length === 1 ? 'place' : 'places'} near your road`}
          </p>
        </div>
        <button type="button" className="nm-explore__close" onClick={onClose} aria-label="Close the places panel">
          ✕
        </button>
      </header>

      {loading && progress ? (
        <div className="nm-explore__progress" role="status">
          <div className="nm-explore__bar">
            <span style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} />
          </div>
          <small>
            Looking for {progress.categoryLabel.toLowerCase()}… you can already use the ones below.
          </small>
        </div>
      ) : null}

      {error ? <p className="nm-note nm-note--warn nm-explore__error">{error}</p> : null}

      {/* ---- the filters ---- */}
      <div className="nm-explore__filters">
        <div className="nm-explore__chips">
          {EXPLORE_CATEGORIES.map((category) => {
            const isOn = activeCategoryIds.includes(category.id)
            const count = counts[category.id] || 0
            return (
              <button
                key={category.id}
                type="button"
                className={`nm-chip ${isOn ? 'is-on' : ''}`}
                style={isOn ? { borderColor: category.color, color: category.color } : undefined}
                onClick={() => onToggleCategory(category.id)}
                aria-pressed={isOn}
              >
                <span aria-hidden="true">{category.icon}</span> {category.label}
                {count ? <small>{count}</small> : null}
              </button>
            )
          })}
        </div>

        <div className="nm-explore__row">
          <label className="nm-explore__select">
            <span>How far off the road</span>
            <select value={radius} onChange={(event) => onRadiusChange(Number(event.target.value))}>
              {RADIUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="nm-explore__select">
            <span>Sort by</span>
            <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* ---- stops the user has added ---- */}
      {stops.length ? (
        <div className="nm-explore__stops">
          <strong>
            Your stops
            {stopExtraMinutes !== null ? ` · route is now ${stopExtraMinutes} min longer` : ''}
          </strong>
          <ul>
            {stops.map((stop) => (
              <li key={stop.id}>
                <span aria-hidden="true">{stop.categoryIcon || '📍'}</span>
                <span className="nm-explore__stop-name">{stop.name}</span>
                <button type="button" onClick={() => onRemoveStop(stop.id)} aria-label={`Remove ${stop.name}`}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ---- the list ---- */}
      <div className="nm-explore__list">
        {!loading && sorted.length === 0 ? (
          <div className="nm-explore__empty">
            <p>
              {places.length
                ? 'No places of these kinds near the road. Turn on more groups above.'
                : 'Nothing found yet along this road.'}
            </p>
          </div>
        ) : null}

        {sorted.map((place) => {
          const isSelected = selectedPlace?.id === place.id
          const isStop = stopIds.has(place.id)

          return (
            <article
              key={place.id}
              className={`nm-place ${isSelected ? 'is-selected' : ''}`}
              style={{ '--place-color': place.categoryColor }}
            >
              <button
                type="button"
                className="nm-place__main"
                onClick={() => onSelectPlace(isSelected ? null : place)}
                aria-expanded={isSelected}
              >
                <span className="nm-place__icon" aria-hidden="true">
                  {place.categoryIcon}
                </span>
                <span className="nm-place__text">
                  <strong>{place.name}</strong>
                  <small>
                    {place.type}
                    {place.cuisine ? ` · ${place.cuisine.replace(/_/g, ' ')}` : ''}
                  </small>
                  <small className="nm-place__address">{place.address}</small>
                </span>
                <span className="nm-place__numbers">
                  <em>{formatDistance(place.distanceFromRoute)}</em>
                  <small>off the route</small>
                  <small
                    className={`nm-place__detour ${place.detourIsMeasured ? 'is-measured' : ''}`}
                    title={
                      place.detourIsMeasured
                        ? 'Measured on the real road network'
                        : 'A rough guess until we measure it on the road network'
                    }
                  >
                    {place.detourIsMeasured ? '+' : '≈ +'}{place.detourMinutes} min
                  </small>
                </span>
              </button>

              {isSelected ? (
                <div className="nm-place__details">
                  <dl>
                    <div>
                      <dt>Category</dt>
                      <dd>{place.categoryLabel}</dd>
                    </div>
                    <div>
                      <dt>Opening hours</dt>
                      <dd>{place.openingHours || 'Not published for this place yet.'}</dd>
                    </div>
                    {place.phone ? (
                      <div>
                        <dt>Phone</dt>
                        <dd>{place.phone}</dd>
                      </div>
                    ) : null}
                    {place.website ? (
                      <div>
                        <dt>Website</dt>
                        <dd>
                          <a href={place.website} target="_blank" rel="noopener noreferrer">
                            {place.website}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>Rating</dt>
                      <dd>
                        {place.rating
                          ? `★ ${place.rating} (${place.ratingCount} reviews)`
                          : 'No rating yet — be the first to review it.'}
                      </dd>
                    </div>
                    <div>
                      <dt>Extra time</dt>
                      <dd>
                        {isStop && stopExtraMinutes !== null
                          ? `The route now takes ${stopExtraMinutes} min longer than before.`
                          : `About ${place.detourMinutes} min if you stop here (${mode === 'walking' ? 'on foot' : mode}). ${
                              place.detourIsMeasured
                                ? 'Measured on the real road network.'
                                : 'A rough guess for now - the exact time appears once you add it as a stop.'
                            }`}
                      </dd>
                    </div>
                    {place.detourKm ? (
                      <div>
                        <dt>Extra distance</dt>
                        <dd>About {place.detourKm.toFixed(1)} km there and back</dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="nm-place__actions">
                    <button type="button" className="btn btn--primary" onClick={() => onAddStop(place)} disabled={isStop}>
                      {isStop ? '✓ Added as a stop' : '+ Add as a stop'}
                    </button>
                    <button type="button" className="btn btn--outline" onClick={() => onGoHere(place)}>
                      Navigate here
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </aside>
  )
}
