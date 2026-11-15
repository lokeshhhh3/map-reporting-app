import { Link, NavLink } from 'react-router-dom'
import { NAV_LINKS } from '../utils/constants.js'

const icons = { '/': '⌂', '/map': '◇', '/navigate': '➤', '/reports': '▤', '/news': '▧', '/events': '▦' }

export default function Navbar() {
  return (
    <header className="site-sidebar">
      <Link to="/" className="site-brand" aria-label="Map Reporting App home">
        <span className="site-brand__mark" aria-hidden="true">✳</span>
        <span className="site-brand__name">Map Reporting<br />App</span>
      </Link>
      <div className="site-sidebar__label">Explore</div>
      <nav className="site-nav" aria-label="Main navigation">
        {NAV_LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'} title={link.label}
            className={({ isActive }) => `site-nav__link${isActive ? ' is-active' : ''}`}>
            <span className="site-nav__icon" aria-hidden="true">{icons[link.to]}</span>
            <span className="site-nav__text">{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="site-sidebar__note">A clearer view of<br />your community.</div>
      <Link to="/report" className="site-mobile-create">+ Report</Link>
    </header>
  )
}
