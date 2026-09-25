import { Link } from 'react-router-dom'

// NotFound -- shown for any URL we don't have a page for, e.g. /hello
// The "*" route in App.jsx sends every unknown address here.
export default function NotFound() {
  return (
    <section className="container page not-found">
      <span className="not-found__icon" aria-hidden="true">
        🧭
      </span>
      <h1>Page not found</h1>
      <p>That address does not exist in this app. Maybe you typed it by mistake?</p>
      <div className="not-found__actions">
        <Link to="/" className="btn btn--primary">
          Back to Home
        </Link>
        <Link to="/map" className="btn btn--outline">
          Open the Map
        </Link>
      </div>
    </section>
  )
}
