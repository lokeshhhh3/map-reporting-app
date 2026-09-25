import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import MapPage from './pages/MapPage.jsx'
import Reports from './pages/Reports.jsx'
import ReportDetails from './pages/ReportDetails.jsx'
import ReportPage from './pages/ReportPage.jsx'
import News from './pages/News.jsx'
import Events from './pages/Events.jsx'
import NotFound from './pages/NotFound.jsx'

// App.jsx is the SHELL of the website: the parts that are always visible
// (Navbar + Footer) plus the list of pages (called "routes").
export default function App() {
  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<MapPage />} />

          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/:id" element={<ReportDetails />} />

          {/* the create-report page (form + location picker) */}
          <Route path="/report" element={<ReportPage />} />
          {/* a friendly alias in case someone types /create-report */}
          <Route path="/create-report" element={<Navigate to="/report" replace />} />

          <Route path="/news" element={<News />} />
          <Route path="/events" element={<Events />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}
