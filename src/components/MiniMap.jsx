import MapView from './MapView.jsx'
import { formatLatLng } from '../utils/mapMath.js'

// ---------------------------------------------------------------------------
// MiniMap  --  the small non-clickable map used on the Report Details page.
// It is a thin wrapper around MapView:
//   * a very small "window" (bounds) so the pin appears in the middle
//   * no zoom buttons, no legend, no click-to-pick
//
// The Maps Team also provides a Mini Map component. When you get it, replace
// the <MapView/> below with theirs, keeping the same two props: lat and lng.
// ---------------------------------------------------------------------------
export default function MiniMap({ lat, lng, report = null, height = '220px', title = 'Report location' }) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return <p className="mini-map__error">No location was saved for this report.</p>
  }

  // A small box around the point: about 2 km across.
  const span = 0.012
  const initialBounds = {
    north: lat + span,
    south: lat - span,
    west: lng - span,
    east: lng + span,
  }

  return (
    <figure className="mini-map">
      <MapView
        reports={report ? [report] : []}
        height={height}
        showLegend={false}
        showZoom={false}
        initialBounds={initialBounds}
      />
      <figcaption>
        {title} · <code>{formatLatLng(lat, lng)}</code>
      </figcaption>
    </figure>
  )
}
