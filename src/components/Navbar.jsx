import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { NAV_LINKS } from '../utils/constants.js'

// ---------------------------------------------------------------------------
// Navbar  --  the floating cream bar that sits on every page.
// The mark is a simple four-point star in a lime tile, matching the reference.
// ---------------------------------------------------------------------------
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand" onClick={() => setMenuOpen(false)}>
          <span className="navbar__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 2c3.9 0 7 3 7 6.8 0 4.7-7 13.2-7 13.2S5 13.5 5 8.8C5 5 8.1 2 12 2Z" />
              <circle cx="12" cy="8.6" r="2.4" />
            </svg>
          </span>
          <span>
            <strong>Map Report</strong>
            <small>Campus + neighbourhood</small>
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

          <Link to="/report" className="btn navbar__cta" onClick={() => setMenuOpen(false)}>
            + Report
          </Link>
        </nav>
      </div>
    </header>
  )
}
