import { Link } from 'react-router-dom'

// Footer -- the bottom strip. Simple on purpose.
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div>
          <p className="footer__title">📍 Map Reporting App</p>
          <p className="footer__text">
            A shared map where people report and view what is happening in their area.
          </p>
        </div>

        <div className="footer__links">
          <Link to="/map">Map</Link>
          <Link to="/reports">Reports</Link>
          <Link to="/news">News</Link>
          <Link to="/events">Events</Link>
          <Link to="/report">Create Report</Link>
        </div>

        <p className="footer__note">
          Frontend build · {year} · Maps by Maps Team · Data by Backend Team
        </p>
      </div>
    </footer>
  )
}
