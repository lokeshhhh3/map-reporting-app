import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/index.css'

// main.jsx is the FIRST file the browser runs.
// It finds <div id="root"> in index.html and puts our React app inside it.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BrowserRouter gives the whole app the ability to use pages/URLs
        such as /map, /news, /reports/123 */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
