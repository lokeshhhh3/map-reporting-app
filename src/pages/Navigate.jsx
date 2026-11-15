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
  { id: 'driving', label: 'Driving', icon: '🚗' },
  { id: 'walking', label: 'Walking', icon: '🚶' },
  { id: 'cycling', label: 'Cycling', icon: '🚲' },
]

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
  const [searchAttempt, setSearchAttempt] = useState(0)

  // ---- the route ----
  const [routes, setRoutes] = useState([]) // every route option we found
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState('')
  const [showAllSteps, setShowAllSteps] = useState(false)

  // ---- everything else ----
  const [mode, setMode] = useState('driving')
  const [userLocation, setUserLocation] = useState(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [fitKey, setFitKey] = useState('')
  // which tab of the side panel is open: the route list or the turn-by-turn steps
  const [panelView, setPanelView] = useState('routes')

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

  function setQuery(value) {
    if (activeField === 'origin') {
      setOriginText(value)
      if (origin && value !== origin.name) setOrigin(null)
    } else {
      setDestinationText(value)
      if (destination && value !== destination.name) setDestination(null)
    }
  }

  // Make a box active AND put the cursor in it.
  function focusField(field) {
    setActiveField(field)
    // The browser needs the field to be active before we can focus it.
    window.setTimeout(() => searchRef.current?.focus(), 0)
  }

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
    }, 900)

    return () => {
      clearTimeout(timer)
      // Invalidate a request already in flight when the query changes or clears.
      if (requestId.current === id) requestId.current += 1
    }
  }, [query, activeField, origin?.name, destination?.name, searchAttempt])

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
  async function handleLocate(asStart = false) {
    setLocating(true)
    setLocationError('')
    try {
      const position = await getBrowserLocation()
      setUserLocation(position)
      if (asStart) {
        setOrigin({ name: 'My location', address: 'Current position', lat: position.lat, lng: position.lng })
        setOriginText('My location')
        setActiveField('destination')
        setFocusPoint(null)
      } else {
        setFocusPoint({ lat: position.lat, lng: position.lng, zoom: 14 })
      }
      setFitKey((key) => `${key}|locate`)
    } catch (err) {
      setLocationError(err?.message || 'Could not get your location.')
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
    ? { paddingTopLeft: [375, 30], paddingBottomRight: [exploreOpen ? 405 : 30, 95] }
    : { paddingTopLeft: [20, 30], paddingBottomRight: [20, 100] },
    [wideScreen, exploreOpen])

  const targetLabel = activeField === 'origin' ? 'Start' : 'Destination'

  // The exact extra time the stops add, once the route has been recalculated.
  const stopExtraMinutes =
    baseDurationMin !== null && activeRoute ? activeRoute.durationMin - baseDurationMin : null
  const activeMode = TRAVEL_MODES.find((item) => item.id === mode)
  const activeSelection = activeField === 'origin' ? origin : destination
  const showSuggestions = query.trim().length >= 3 &&
    !(activeSelection && query.trim() === activeSelection.name) &&
    (searching || Boolean(searchError) || searchComplete)

  // What a field shows right now.
  function fieldValue(field) {
    if (field === activeField && query.trim()) return query
    const chosen = field === 'origin' ? origin : destination
    return chosen ? chosen.name : ''
  }

  function fieldAddress(field) {
    const chosen = field === 'origin' ? origin : destination
    if (chosen) return chosen.address || 'Selected location'
    if (field === activeField && query.trim()) return 'Choose a matching place above'
    return ''
  }

  const visibleSteps = activeRoute
    ? showAllSteps
      ? activeRoute.steps
      : activeRoute.steps.slice(0, 6)
    : []

  const firstStep = activeRoute?.steps?.[0] || null

  return (
    <div className="nav-page">
      <div className="nav-page__body">
        {/* ---------------- THE MAP ---------------- */}
        <div className="nav-page__map">
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
            onReportClick={(report) => setSelectedReport(report)}
            onPlaceClick={(place) => handleSelectPlace(place)}
          />

          <button
            type="button"
            className="nav-page__locate"
            onClick={() => handleLocate()}
            aria-label="Use my current location"
            title="Use my current location"
          >
            🎯
          </button>

          <h2 className="nav-map-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 2c3.9 0 7 3 7 6.8 0 4.7-7 13.2-7 13.2S5 13.5 5 8.8C5 5 8.1 2 12 2Z" />
              <circle cx="12" cy="8.6" r="2.4" />
            </svg>
            {destination?.name || origin?.name || 'Hyderabad'}
          </h2>

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

          {/* ---------------- BOTTOM ROUTE BAR ---------------- */}
          <div className="nav-summary">
            <div className="nav-summary__top">
              <span className="nav-summary__id">
                Route
                <span className={`nav-summary__chip ${activeRoute ? 'is-ready' : ''}`}>
                  {activeRoute ? 'READY' : 'NEW'}
                </span>
              </span>
              <button
                type="button"
                className="nav-summary__cta"
                onClick={handleExplore}
                disabled={!activeRoute}
              >
                Explore along route
              </button>
            </div>
            <div className="nav-summary__meta">
              <div>
                <span>From</span>
                <strong>{origin?.name || '—'}</strong>
              </div>
              <div>
                <span>To</span>
                <strong>{destination?.name || '—'}</strong>
              </div>
              <div>
                <span>Distance</span>
                <strong>{activeRoute ? formatKm(activeRoute.distanceKm) : '—'}</strong>
              </div>
              <div>
                <span>Duration</span>
                <strong>{activeRoute ? formatDuration(activeRoute.durationMin) : '—'}</strong>
              </div>
              <div>
                <span>Mode</span>
                <strong>{activeMode?.label || '—'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- THE ROUTES PANEL ---------------- */}
        <aside className="nav-page__panel">
          <header className="nav-panel__head">
            <span className="nav-panel__mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M3.5 12h17M12 3.5c3 3.2 3 13.8 0 17M12 3.5c-3 3.2-3 13.8 0 17" />
              </svg>
            </span>
            <h1 className="nav-panel__title">Routes</h1>
            <span className="nav-panel__count">
              {!loading && !error ? `${reports.length} pins` : ''}
            </span>
          </header>

          {/* search box */}
          <div className="nav-panel__search">
            <span className="nav-page__search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <circle cx="11" cy="11" r="7" />
                <path d="m16.5 16.5 4 4" />
              </svg>
            </span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search the ${targetLabel.toLowerCase()}…`}
              aria-label={`Search for a ${targetLabel.toLowerCase()}`}
            />
            {searching ? <span className="nav-page__search-state">Searching…</span> : null}
            {showSuggestions ? (
              <ul className="nm-suggestions" aria-label="Place search results">
                {searchError ? <li className="nm-suggestions__error" role="alert">{searchError} <button type="button" className="link-button" onClick={() => setSearchAttempt((attempt) => attempt + 1)}>Try again</button></li> : null}
                {suggestions.map((place) => (
                  <li key={place.id}>
                    <button type="button" onClick={() => pickSuggestion(place)}>
                      <strong>{place.name}</strong>
                      <span>{place.address}</span>
                    </button>
                  </li>
                ))}
                {!searching && !searchError && searchComplete && suggestions.length === 0 ? (
                  <li className="nm-suggestions__empty">
                    No place found. Try a bigger name, like “Uppal, Hyderabad”.
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>

          {/* start + destination */}
          <div className="nav-endpoints">
            <div
              className={`nav-endpoint ${activeField === 'origin' ? 'is-active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => focusField('origin')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  focusField('origin')
                }
              }}
            >
              <span className="nav-endpoint__dot nav-endpoint__dot--start" aria-hidden="true" />
              <span className="nav-endpoint__text">
                <span>From</span>
                <strong>{fieldValue('origin') || 'Choose a starting point'}</strong>
              </span>
              {origin ? (
                <button
                  type="button"
                  className="nav-endpoint__clear"
                  aria-label="Clear the starting point"
                  onClick={(event) => {
                    event.stopPropagation()
                    clearField('origin')
                  }}
                >
                  ✕
                </button>
              ) : null}
            </div>

            <button type="button" className="nav-endpoints__swap" onClick={swapEnds} aria-label="Swap start and destination">
              ⇅
            </button>

            <div
              className={`nav-endpoint ${activeField === 'destination' ? 'is-active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => focusField('destination')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  focusField('destination')
                }
              }}
            >
              <span className="nav-endpoint__dot nav-endpoint__dot--end" aria-hidden="true" />
              <span className="nav-endpoint__text">
                <span>To</span>
                <strong>{fieldValue('destination') || 'Choose a destination'}</strong>
              </span>
              {destination ? (
                <button
                  type="button"
                  className="nav-endpoint__clear"
                  aria-label="Clear the destination"
                  onClick={(event) => {
                    event.stopPropagation()
                    clearField('destination')
                  }}
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>

          <div className="nav-modes" role="group" aria-label="Travel mode">
            {TRAVEL_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-mode ${mode === item.id ? 'is-active' : ''}`}
                disabled={item.disabled}
                title={item.note || item.label}
                onClick={() => setMode(item.id)}
                aria-pressed={mode === item.id}
              >
                <span aria-hidden="true">{item.icon}</span> {item.label}
              </button>
            ))}
          </div>

          <button type="button" className="nav-locate-row" onClick={() => handleLocate(true)} disabled={locating}>
            {locating ? 'Finding you…' : 'Use my current location'}
          </button>
          {userLocation ? (
            <button type="button" className="link-button nav-locate-link" onClick={useMyLocationAsStart}>
              Use my location as the start
            </button>
          ) : null}
          {locationError ? <p className="nm-note nm-note--warn">{locationError}</p> : null}

          <div className="nav-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={panelView === 'routes'}
              className={panelView === 'routes' ? 'is-active' : ''}
              onClick={() => setPanelView('routes')}
            >
              Routes <span>{routes.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={panelView === 'directions'}
              className={panelView === 'directions' ? 'is-active' : ''}
              onClick={() => setPanelView('directions')}
            >
              Directions
            </button>
          </div>

          {panelView === 'routes' ? (
            <div className="nav-route-list">
              {routeLoading ? <p className="nav-note">Finding the best road route…</p> : null}
              {!routeLoading && routeError ? <p className="nm-note nm-note--warn">{routeError}</p> : null}
              {!routeLoading && !routeError && routes.length === 0 ? (
                <div className="nav-empty">
                  <strong>No route yet</strong>
                  <p>Search for a start and a destination above.</p>
                </div>
              ) : null}

              {routes.map((route, index) => {
                const isOpen = Boolean(activeRoute && route.id === activeRoute.id)
                return (
                  <article key={route.id} className={`route-card ${isOpen ? 'is-open' : ''}`}>
                    <div className="route-card__top">
                      <div className="route-card__names">
                        <strong className="route-card__title">
                          {origin?.name || 'Start'} → {destination?.name || 'Destination'}
                        </strong>
                      </div>
                      <span className={`route-card__chip route-card__chip--${index === 0 ? 'fast' : 'alt'}`}>
                        {index === 0 ? 'FASTEST' : 'ALTERNATE'}
                      </span>
                    </div>

                    {isOpen ? (
                      <>
                        <span className="route-card__pill">
                          {activeMode?.label} · {formatDuration(route.durationMin)}
                        </span>

                        <div className="route-card__meta">
                          <div>
                            <span>Distance</span>
                            <strong>{formatKm(route.distanceKm)}</strong>
                          </div>
                          <div>
                            <span>Duration</span>
                            <strong>{formatDuration(route.durationMin)}</strong>
                          </div>
                          <div>
                            <span>Mode</span>
                            <strong>{activeMode?.label}</strong>
                          </div>
                          <div>
                            <span>Stops</span>
                            <strong>{stops.length}</strong>
                          </div>
                        </div>

                        <div className="route-card__extra">
                          <span className="route-card__avatar" aria-hidden="true">
                            🧭
                          </span>
                          <span className="route-card__extra-text">
                            <span>First turn</span>
                            <strong>{firstStep ? firstStep.instruction : 'Start on the road'}</strong>
                          </span>
                          <button
                            type="button"
                            className="route-card__icon"
                            onClick={handleExplore}
                            title="Explore places along this route"
                            aria-label="Explore places along this route"
                          >
                            🔍
                          </button>
                        </div>

                        <button
                          type="button"
                          className="route-card__foot"
                          onClick={() => setPanelView('directions')}
                        >
                          Turn-by-turn directions <span aria-hidden="true">▾</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="route-card__expand"
                        onClick={() => setSelectedRouteId(route.id)}
                      >
                        {formatDuration(route.durationMin)} · {formatKm(route.distanceKm)}
                      </button>
                    )}
                  </article>
                )
              })}

              {stops.length ? (
                <div className="nav-stops">
                  <span className="nav-stops__label">Stops ({stops.length})</span>
                  <div className="nav-stops__list">
                    {stops.map((stop) => (
                      <span key={stop.id} className="nav-stop">
                        {stop.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveStop(stop.id)}
                          aria-label={`Remove ${stop.name}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="nav-directions">
              {activeRoute ? (
                <>
                  <div className="nav-directions__head">
                    <strong>
                      {formatDuration(activeRoute.durationMin)} · {formatKm(activeRoute.distanceKm)}
                    </strong>
                    <span>
                      {activeRoute.steps.length} steps · {activeMode?.label}
                    </span>
                  </div>

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

                  {activeRoute.steps.length > 6 ? (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => setShowAllSteps((value) => !value)}
                    >
                      {showAllSteps ? 'Show fewer steps' : `Show all ${activeRoute.steps.length} steps`}
                    </button>
                  ) : null}
                </>
              ) : (
                <div className="nav-empty">
                  <strong>No directions yet</strong>
                  <p>Choose a route first, then its steps appear here.</p>
                </div>
              )}
            </div>
          )}

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
          </div>
        </aside>
      </div>
    </div>
  )
}
