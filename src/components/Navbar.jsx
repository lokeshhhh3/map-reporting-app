import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { NAV_LINKS } from '../utils/constants.js'

// ---------------------------------------------------------------------------
// Navbar  --  the header + navigation that appears on every page.
// NavLink automatically adds the class "active" to the current page's link,
// which is how we highlight it in the CSS.
// ---------------------------------------------------------------------------
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="navbar__brand" onClick={() => setMenuOpen(false)}>
          <span className="navbar__logo" aria-hidden="true">
            📍
          </span>
          <span>
            <strong>Map Reporting App</strong>
            <small>See what is happening around you</small>
          </span>
        </Link>

        {/* On phones the button below shows/hides the menu */}
        <button
          type="button"
          className="navbar__toggle"
          aria-expanded={menuOpen}
          aria-label="Toggle navigation menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <nav className={`navbar__nav ${menuOpen ? 'is-open' : ''}`}>
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `navbar__link ${isActive ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}

          <Link to="/report" className="btn btn--primary navbar__cta" onClick={() => setMenuOpen(false)}>
            + Create Report
          </Link>
        </nav>
      </div>
    </header>
  )
}
