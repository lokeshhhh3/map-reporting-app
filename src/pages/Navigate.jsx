/* ===========================================================================
 * Navigate.jsx  --  the new "Navigate" page.
 *
 * This is the Google-Maps-style experience: a big map, a search bar at the
 * top, and a side panel on the left (a bottom sheet on a phone).
 *
 * It reuses what you already built:
 *   useReports()            -> the same community reports
 *   getBrowserLocation()    -> the same "use my location" helper
 *   NavigateMap.jsx         -> the map (Stage 2a)
 *   searchPlaces()          -> free place search (Stage 2a)
 *   routeService.js         -> the real road route (Stage 3)
 *
 * HOW THE TWO TEXT BOXES WORK
 *   There is really only ONE search box. The Start and Destination boxes in
 *   the panel and the search bar at the top all show the same text and all
 *   write to the same place. Whichever one you click becomes the active box,
 *   and the suggestions drop down under it.
 *
 * Stage 4 will add the places along the route.
 * =========================================================================== */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import NavigateMap from '../components/NavigateMap.jsx'
import SmartExplorePanel from '../components/SmartExplorePanel.jsx'
import useReports from '../hooks/useReports.js'
import { searchPlaces } from '../services/placeSearch.js'
import { getRouteOptions, formatDuration, formatKm } from '../services/routeService.js'
import {
  exploreAlongRoute,
  enrichWithOpeningHours,
  measureRealDetours,
  loadRatings,
  DEFAULT_CATEGORY_IDS,
} from '../services/exploreService.js'
import { getBrowserLocation } from '../utils/geo.js'
import { formatDateTime } from '../utils/mapMath.js'

// The travel modes. The free routing engine can do these three.
// Public transport is NOT available without a paid Google Maps key, so it is
// shown as disabled with an explanation instead of pretending to work.
const TRAVEL_MODES = [
  { id: 'driving', label: 'Driving', icon: 'car' },
  { id: 'walking', label: 'Walking', icon: 'walk' },
  { id: 'cycling', label: 'Cycling', icon: 'bike' },
]


function ModeIcon({ kind }) {
  if (kind === 'car') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15v-3l2-5h12l2 5v3M4 15h16M4 15v2m16-2v2M6 12h12M7 15h.01M17 15h.01" /></svg>
  if (kind === 'walk') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="14" cy="4" r="1.6" /><path d="m10 21 2-6-2-3 2-5 3 2 2 3h3M12 7l-3 2-2 3M12 15l4 2 1 4" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="17" r="3.5"/><circle cx="19" cy="17" r="3.5"/><path d="m5 17 4-7 4 7H5m8 0 3-7h-3m-5-2h3m5 2 3 7"/></svg>
}

export default function NavigatePage() {
  const { reports, loading, error } = useReports()

  // ---- the two ends of the journey ----
  const [origin, setOrigin] = useState(null) // { name, address, lat, lng }
  const [destination, setDestination] = useState(null)

  // Which box is being typed in right now: 'origin' or 'destination'
  const [activeField, setActiveField] = useState('origin')

  // The text in each box. These are the real inputs.
  const [originText, setOriginText] = useState('')
  const [destinationText, setDestinationText] = useState('')

  // ---- the search ----
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchComplete, setSearchComplete] = useState(false)
  const [searchError, setSearchError] = useState('')

  // ---- the route ----
  const [routes, setRoutes] = useState([]) // every route option we found
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState('')
  const [showAllSteps, setShowAllSteps] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(true)

  // ---- everything else ----
  const [mode, setMode] = useState('driving')
  const [userLocation, setUserLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [fitKey, setFitKey] = useState('')

  // ---- Stage 4: the places that are on the way ----
  const [exploreOpen, setExploreOpen] = useState(false)
  const [places, setPlaces] = useState([])
  const [exploreLoading, setExploreLoading] = useState(false)
  const [exploreProgress, setExploreProgress] = useState(null)
  const [exploreError, setExploreError] = useState('')
  const [activeCategoryIds, setActiveCategoryIds] = useState(DEFAULT_CATEGORY_IDS)
  const [exploreRadius, setExploreRadius] = useState(1000)
  const [exploreSort, setExploreSort] = useState('nearest')
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [stops, setStops] = useState([])
  const [focusPoint, setFocusPoint] = useState(null)
  // How long the journey took BEFORE we added any stop. With that number we
  // can show the real extra time a stop adds.
  const [baseDurationMin, setBaseDurationMin] = useState(null)

  // A text version of the stops, so the route is only recalculated when a
  // stop really changes and not on every single render.
  const stopsKey = stops.map((stop) => stop.id).join('|')

  // On a computer the places panel sits on the right of the map, so the map
  // has to leave room for it. On a phone the panel is a bottom sheet, so it
  // does not.
  const [wideScreen, setWideScreen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 901px)').matches,
  )
  useEffect(() => {
    const query = window.matchMedia('(min-width: 901px)')
    const onChange = (event) => setWideScreen(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // Lets us ignore the reply of a search that is no longer wanted.
  const requestId = useRef(0)
  // Lets us put the cursor back in the search box.
  const searchRef = useRef(null)

  // ONE search text, whichever box is active.
  const query = activeField === 'origin' ? originText : destinationText

  // ------------------------------------------------------------------
  // PLACE SEARCH - waits until the user stops typing, then searches.
  // ------------------------------------------------------------------
  useEffect(() => {
    const text = query.trim()
    const chosen = activeField === 'origin' ? origin : destination
    const id = ++requestId.current
    setSuggestions([])
    setSearchError('')
    setSearchComplete(false)

    // A selected place is not a new search, even when its field is active.
    if (text.length < 3 || (chosen && text === chosen.name)) {
      setSearching(false)
      return undefined
    }

    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const found = await searchPlaces(text)
        if (id !== requestId.current) return
        setSuggestions(found)
        setSearchComplete(true)
      } catch (err) {
        if (id !== requestId.current) return
        setSearchError(err?.message || 'Place search failed. Please try again.')
      } finally {
        if (id === requestId.current) setSearching(false)
      }
    }, 450)

    return () => {
      clearTimeout(timer)
      // Invalidate a request already in flight when the query changes or clears.
      if (requestId.current === id) requestId.current += 1
    }
  }, [query, activeField, origin?.name, destination?.name])

  // ------------------------------------------------------------------
  // THE ROUTE - recalculated whenever a point or the travel mode changes.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!origin || !destination) {
      setRoutes([])
      setSelectedRouteId('')
      setRouteError('')
      setRouteLoading(false)
      return undefined
    }

    let cancelled = false
    setRouteLoading(true)
    setRouteError('')

    // Any stop the user added has to be on the route.
    const vias = stops.map((stop) => ({ lat: stop.lat, lng: stop.lng }))

    getRouteOptions({ origin, destination, mode, vias })
      .then((found) => {
        if (cancelled) return
        setRoutes(found)
        setSelectedRouteId(found[0]?.id || '')
        // Remember the journey time without any stop, so we can work out
        // exactly how much a stop adds.
        if (!stopsKey) setBaseDurationMin(found[0]?.durationMin ?? null)
        // Make the map show the new route.
        setFitKey((key) => `${key}|route-${mode}-${stopsKey}`)
      })
      .catch((err) => {
        if (cancelled) return
        setRoutes([])
        setRouteError(err?.message || 'Could not calculate a route.')
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false)
      })

    return () => {
      cancelled = true
    }
    // stopsKey changes only when a stop is added or removed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, mode, stopsKey])

  // The route the user has chosen.
  const activeRoute = routes.find((route) => route.id === selectedRouteId) || routes[0] || null

  // The shapes of every route we found. This is remembered so the map is not
  // redrawn on every single render.
  const routeGeometries = useMemo(() => routes.map((route) => route.geometry), [routes])

  // ------------------------------------------------------------------
  // The user picked one of the suggestions.
  // ------------------------------------------------------------------
  function pickSuggestion(place) {
    const chosen = {
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    }

    if (activeField === 'origin') {
      setOrigin(chosen)
      setOriginText(place.name)
    } else {
      setDestination(chosen)
      setDestinationText(place.name)
    }

    setSuggestions([])
    setSearchError('')
    setFocusPoint(null)

    // Move on to the other box, like a booking form does.
    setActiveField(activeField === 'origin' ? 'destination' : 'origin')

    // Tell the map to move to the new point.
    setFitKey((key) => `${key}|${place.id}`)
  }

  // Clear one of the boxes completely.
  function clearField(field) {
    if (field === 'origin') {
      setOrigin(null)
      setOriginText('')
    } else {
      setDestination(null)
      setDestinationText('')
    }
    setSuggestions([])
    setSearchError('')
    setFitKey((key) => `${key}|clear-${field}`)
  }

  // ------------------------------------------------------------------
  // Swap start and destination.
  // ------------------------------------------------------------------
  function swapEnds() {
    setOrigin(destination)
    setDestination(origin)
    setOriginText(destinationText)
    setDestinationText(originText)
    setFitKey((key) => `${key}|swap`)
  }

  // ------------------------------------------------------------------
  // "Use my location" - reuses the helper the report form already uses.
  // ------------------------------------------------------------------
  async function handleLocate() {
    setLocating(true)
    setLocationError('')
    try {
      const position = await getBrowserLocation()
      setUserLocation(position)
      setFocusPoint({ lat: position.lat, lng: position.lng, zoom: 14 })
      setFitKey((key) => `${key}|locate`)
    } catch (err) {
      setLocationError(err?.message || 'Could not get your location.')
      setSheetOpen(true)
    } finally {
      setLocating(false)
    }
  }

  function useMyLocationAsStart() {
    if (!userLocation) return
    setOrigin({
      name: 'My location',
      address: 'Current position',
      lat: userLocation.lat,
      lng: userLocation.lng,
    })
    setOriginText('My location')
    setFocusPoint(null)
    setFitKey((key) => `${key}|start-from-locate`)
  }

  // ------------------------------------------------------------------
  // STAGE 4 - find the places that are beside the route.
  // ------------------------------------------------------------------

  /** Do the actual search. The results arrive little by little. */
  async function runExplore(geometry, travelMode) {
    setExploreLoading(true)
    setExploreError('')

    try {
      const found = await exploreAlongRoute({
        geometry,
        mode: travelMode,
        categoryIds: activeCategoryIds,
        // We always look a little wider and let the user narrow it down
        // afterwards, so moving the slider is instant.
        radius: 1500,
        onProgress: (info) => {
          setExploreProgress(info)
          setPlaces(info.places)
        },
      })

      setPlaces(found.places)
      setExploreProgress(null)

      // Work out the REAL detour time for the closest places, using the
      // routing engine. This replaces the rough guess.
      measureRealDetours(found.places, geometry, travelMode, {
        limit: 8,
        onUpdate: (updated) => {
          setPlaces((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
        },
      })

      // Opening hours take a moment - they come from a slower service.
      enrichWithOpeningHours(found.places, {
        limit: 8,
        onUpdate: (updated) => {
          setPlaces((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
        },
      })

      // Star ratings only exist if a rating provider has been set up.
      loadRatings(found.places, { limit: 12 }).then(() => {
        setPlaces((prev) => prev.map((item) => ({ ...item })))
      })
    } catch (err) {
      setExploreError(err?.message || 'Could not look for places along the route.')
      setExploreProgress(null)
    } finally {
      setExploreLoading(false)
    }
  }

  /** The user pressed "Explore along this route". */
  function handleExplore() {
    if (!activeRoute) return
    setExploreOpen(true)
    setFocusPoint(null)
    runExplore(activeRoute.geometry, mode)
  }

  // If the route changes while the panel is open, look again.
  useEffect(() => {
    if (!exploreOpen || !activeRoute) return undefined
    let cancelled = false
    const timer = setTimeout(() => {
      if (!cancelled) runExplore(activeRoute.geometry, mode)
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploreOpen, activeRoute?.id, mode])

  function toggleCategory(categoryId) {
    setActiveCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  function handleSelectPlace(place) {
    setSelectedPlace(place)
    setFocusPoint(place ? { lat: place.lat, lng: place.lng, zoom: 16 } : null)
  }

  function handleAddStop(place) {
    setStops((prev) => (prev.some((stop) => stop.id === place.id) ? prev : [...prev, place]))
  }

  function handleRemoveStop(stopId) {
    setStops((prev) => prev.filter((stop) => stop.id !== stopId))
  }

  /** "Navigate here" - make this place the destination. */
  function handleGoHere(place) {
    setDestination({ name: place.name, address: place.address, lat: place.lat, lng: place.lng })
    setDestinationText(place.name)
    setActiveField('destination')
    setFocusPoint(null)
  }

  const mapPadding = useMemo(() => wideScreen
    ? { paddingTopLeft: [sheetOpen ? 410 : 30, 35], paddingBottomRight: [exploreOpen ? 405 : 30, 35] }
    : { paddingTopLeft: [25, 35], paddingBottomRight: [25, sheetOpen ? Math.round(window.innerHeight * 0.45) : 50] },
    [wideScreen, sheetOpen, exploreOpen])

  // The exact extra time the stops add, once the route has been recalculated.
  const stopExtraMinutes =
    baseDurationMin !== null && activeRoute ? activeRoute.durationMin - baseDurationMin : null
  const activeMode = TRAVEL_MODES.find((item) => item.id === mode)
  const activeSelection = activeField === 'origin' ? origin : destination
  const showSuggestions = query.trim().length >= 3 &&
    !(activeSelection && query.trim() === activeSelection.name) &&
    (searching || Boolean(searchError) || searchComplete)

  const visibleSteps = activeRoute
    ? showAllSteps
      ? activeRoute.steps
      : activeRoute.steps.slice(0, 6)
    : []

  return (
    <div className="nav-page">
      <div className="nav-page__body">
        {sheetOpen ? <aside className="nav-page__panel" aria-label="Directions">
          <div className="nav-sheet__handle" aria-hidden="true" />
          <div className="nav-sheet__heading">
            <h1 className="nav-page__title">Navigate</h1>
            <button type="button" className="nav-sheet__close" onClick={() => setSheetOpen(false)} aria-label="Close directions">×</button>
          </div>
          <div className="nm-modes" role="group" aria-label="Travel mode">
            {TRAVEL_MODES.map((item) => (
              <button key={item.id} type="button" className={`nm-mode ${mode === item.id ? 'is-active' : ''}`}
                title={item.label} onClick={() => { setMode(item.id); setFocusPoint(null) }} aria-label={item.label} aria-pressed={mode === item.id}>
                <ModeIcon kind={item.icon} />
              </button>
            ))}
          </div>
          <div className="nav-sheet__fields">
            {['origin', 'destination'].map((field) => {
              const isOrigin = field === 'origin'
              const value = isOrigin ? originText : destinationText
              const chosen = isOrigin ? origin : destination
              return <div className="nav-sheet__field" key={field}>
                <span className={`nav-sheet__field-icon ${isOrigin ? 'is-origin' : 'is-destination'}`} aria-hidden="true">{isOrigin ? '➤' : '●'}</span>
                <input ref={activeField === field ? searchRef : null} type="search" value={value}
                  aria-label={isOrigin ? 'Search for a start' : 'Search for a destination'}
                  placeholder={isOrigin ? 'Your location or starting point' : 'Choose destination'}
                  onFocus={() => setActiveField(field)}
                  onChange={(event) => {
                    setActiveField(field)
                    if (isOrigin) { setOriginText(event.target.value); if (origin && event.target.value !== origin.name) setOrigin(null) }
                    else { setDestinationText(event.target.value); if (destination && event.target.value !== destination.name) setDestination(null) }
                  }} />
                {value ? <button type="button" className="nav-sheet__clear" onClick={() => clearField(field)} aria-label={isOrigin ? 'Clear the starting point' : 'Clear the destination'}>×</button> : null}
                {chosen ? <span className="nav-sheet__chosen" aria-label="Location selected">✓</span> : null}
              </div>
            })}
          </div>
          {showSuggestions ? <ul className="nm-suggestions" aria-label="Place search results">
            {searching ? <li className="nm-suggestions__empty" role="status">Searching…</li> : null}
            {searchError ? <li className="nm-suggestions__error">{searchError}</li> : null}
            {suggestions.map((place) => <li key={place.id}><button type="button" onClick={() => { pickSuggestion(place); window.setTimeout(() => searchRef.current?.focus(), 0) }}><strong>{place.name}</strong><span>{place.address}</span></button></li>)}
            {!searching && !searchError && searchComplete && suggestions.length === 0 ? <li className="nm-suggestions__empty">No place found. Try a bigger name, like “Uppal, Hyderabad”.</li> : null}
          </ul> : null}
          <div className="nav-sheet__quick-actions">
            <button type="button" onClick={swapEnds}>⇅ Swap</button>
            <button type="button" onClick={async () => { if (userLocation) { useMyLocationAsStart(); return } setLocating(true); setLocationError(''); try { const position = await getBrowserLocation(); setUserLocation(position); setOrigin({ name: 'My location', address: 'Current position', lat: position.lat, lng: position.lng }); setOriginText('My location'); setFocusPoint(null); setFitKey((key) => `${key}|locate-start`) } catch (err) { setLocationError(err?.message || 'Could not get your location.') } finally { setLocating(false) } }} disabled={locating}>{locating ? 'Finding you…' : '➤ Use my location'}</button>
          </div>
          {locationError ? <p className="nm-note nm-note--warn" role="alert">{locationError}</p> : null}
          {/* ---- THE ROUTE ---- */}
          <div className="nm-route-card">
            {routeLoading ? (
              <>
                <strong>Route</strong>
                <p>Finding the best road route…</p>
              </>
            ) : null}

            {!routeLoading && routeError ? (
              <>
                <strong>Route</strong>
                <p className="nm-note nm-note--warn">{routeError}</p>
              </>
            ) : null}

            {!routeLoading && !routeError && !activeRoute ? (
              <>
                <strong>Route</strong>
                <p>Pick a start and a destination to see the route.</p>
              </>
            ) : null}

            {!routeLoading && !routeError && activeRoute ? (
              <>
                <div className="nm-route-card__head">
                  <strong>
                    {formatDuration(activeRoute.durationMin)} · {formatKm(activeRoute.distanceKm)}
                  </strong>
                  <span>{activeMode?.label || 'Route'}</span>
                </div>

                {stops.length ? (
                  <p className="nm-route-card__stops">
                    📍 {stops.length} {stops.length === 1 ? 'stop' : 'stops'} added:
                    {stops.map((stop) => stop.name).join(', ')}
                  </p>
                ) : null}

                <button type="button" className="btn btn--primary btn--block nm-explore-btn" onClick={handleExplore}>
                  🔍 Explore along this route
                </button>

                {routes.length > 1 ? (
                  <div className="nm-route-options">
                    {routes.map((route, index) => (
                      <button
                        key={route.id}
                        type="button"
                        className={`nm-route-option ${route.id === activeRoute.id ? 'is-active' : ''}`}
                        onClick={() => setSelectedRouteId(route.id)}
                      >
                        <strong>{index === 0 ? 'Fastest' : `Option ${index + 1}`}</strong>
                        <span>
                          {formatDuration(route.durationMin)} · {formatKm(route.distanceKm)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {activeRoute.steps.length ? (
                  <ol className="nm-steps">
                    {visibleSteps.map((step, index) => (
                      <li key={`${step.instruction}-${index}`}>
                        <span className="nm-steps__icon" aria-hidden="true">
                          {step.type === 1 ? '🟢' : step.type === 4 ? '🏁' : '➡️'}
                        </span>
                        <span className="nm-steps__text">
                          <strong>{step.instruction}</strong>
                          <small>
                            {step.distanceKm ? `${step.distanceKm.toFixed(1)} km` : ''}
                            {step.street ? ` · ${step.street}` : ''}
                          </small>
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : null}

                {activeRoute.steps.length > 6 ? (
                  <button type="button" className="link-button" onClick={() => setShowAllSteps((value) => !value)}>
                    {showAllSteps ? 'Show fewer steps' : `Show all ${activeRoute.steps.length} steps`}
                  </button>
                ) : null}
              </>
            ) : null}
          </div>

          {selectedReport ? (
            <div className="nm-report-card">
              {selectedReport.photoUrl ? (
                <img src={selectedReport.photoUrl} alt="" className="nm-report-card__photo" />
              ) : null}
              <strong>{selectedReport.title}</strong>
              <span className="nm-report-card__meta">
                {selectedReport.type} · {selectedReport.status}
              </span>
              <p>{selectedReport.description}</p>
              <span className="nm-report-card__meta">{selectedReport.locationName}</span>
              <span className="nm-report-card__meta">{formatDateTime(selectedReport.reportedAt)}</span>
              <Link to={`/reports/${selectedReport.id}`} className="btn btn--primary btn--block">
                Open full report
              </Link>
            </div>
          ) : null}

          <div className="nm-panel-foot">
            {loading ? <p className="nm-note">Loading community reports…</p> : null}
            {error ? <p className="nm-note nm-note--warn">Could not load reports: {error}</p> : null}
            {!loading && !error ? (
              <p className="nm-note">{reports.length} community reports on the map</p>
            ) : null}
          </div>
        </aside> : null}

        <div className="nav-page__map">
          {!sheetOpen ? <button type="button" className="nav-sheet__open" onClick={() => setSheetOpen(true)}>Directions</button> : null}
          <NavigateMap
            reports={reports}
            origin={origin}
            destination={destination}
            userLocation={userLocation}
            routeLine={activeRoute ? activeRoute.geometry : null}
            routeOptions={routeGeometries}
            places={places}
            selectedPlaceId={selectedPlace ? selectedPlace.id : ''}
            focusPoint={focusPoint}
            mapPadding={mapPadding}
            fitKey={fitKey}
            onReportClick={(report) => { setSelectedReport(report); setSheetOpen(true) }}
            onPlaceClick={(place) => handleSelectPlace(place)}
          />
          {!routeLoading && !routeError && activeRoute ? <div className="nav-map-summary"><div><strong>{formatDuration(activeRoute.durationMin)} · {formatKm(activeRoute.distanceKm)}</strong><span>{activeMode?.label} route</span></div><button type="button" className="btn btn--primary" onClick={handleExplore}>Explore along route</button></div> : null}
          <button
            type="button"
            className="nav-page__locate"
            onClick={handleLocate}
            aria-label="Use my current location"
            title="Use my current location"
          >
            🎯
          </button>

          {exploreOpen ? (
            <SmartExplorePanel
              places={places}
              loading={exploreLoading}
              progress={exploreProgress}
              error={exploreError}
              activeCategoryIds={activeCategoryIds}
              onToggleCategory={toggleCategory}
              radius={exploreRadius}
              onRadiusChange={setExploreRadius}
              sort={exploreSort}
              onSortChange={setExploreSort}
              selectedPlace={selectedPlace}
              onSelectPlace={handleSelectPlace}
              onAddStop={handleAddStop}
              onGoHere={handleGoHere}
              onClose={() => {
                setExploreOpen(false)
                setSelectedPlace(null)
                setFocusPoint(null)
              }}
              stops={stops}
              onRemoveStop={handleRemoveStop}
              stopExtraMinutes={stopExtraMinutes}
              mode={mode}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
