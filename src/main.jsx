import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/index.css'

// main.jsx is the FIRST file the browser runs.
// It finds <div id="root"> in index.html and puts our React app inside it.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/*
      HashRouter vs BrowserRouter
      ---------------------------
      Both give the whole app the ability to use pages/URLs such as /map and
      /news. The difference is what the address bar looks like:

        BrowserRouter ->  example.com/map
        HashRouter    ->  example.com/#/map

      We use HashRouter because the site is published on GitHub Pages, which
      is a plain file server. It has no idea that /map should serve our app,
      so with BrowserRouter a direct visit or a refresh on that address gives
      a 404. With HashRouter the part after the # never leaves the browser, so
      every address works: links, refreshes, bookmarks and shared links.

      Everything else about routing works exactly the same.
    */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
