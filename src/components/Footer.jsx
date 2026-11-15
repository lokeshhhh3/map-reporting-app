import { Link } from 'react-router-dom'

// Footer -- cream block with the brand, three link columns and a quiet legal row.
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div>
          <p className="footer__title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M12 2c3.9 0 7 3 7 6.8 0 4.7-7 13.2-7 13.2S5 13.5 5 8.8C5 5 8.1 2 12 2Z" />
              <circle cx="12" cy="8.6" r="2.4" />
            </svg>
            Map Report
          </p>
          <p className="footer__text">
            A shared map where people report and follow what is happening around their campus and
            neighbourhood.
          </p>
        </div>

        <div className="footer__col">
          <h4>Explore</h4>
          <div className="footer__links">
            <Link to="/map">Map</Link>
            <Link to="/reports">Reports</Link>
            <Link to="/navigate">Plan a route</Link>
          </div>
        </div>

        <div className="footer__col">
          <h4>Community</h4>
          <div className="footer__links">
            <Link to="/report">Report something</Link>
            <Link to="/news">News</Link>
            <Link to="/events">Events</Link>
          </div>
        </div>

        <div className="footer__col">
          <h4>Map data</h4>
          <div className="footer__links">
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              OpenStreetMap contributors
            </a>
            <a href="https://leafletjs.com" target="_blank" rel="noreferrer">
              Leaflet
            </a>
          </div>
        </div>

        <p className="footer__note">
          © {year} Map Report · Map data © OpenStreetMap contributors
        </p>
      </div>
    </footer>
  )
}
