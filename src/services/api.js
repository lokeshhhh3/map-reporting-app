// ===========================================================================
// api.js  --  *** THE SINGLE FILE WHERE THE BACKEND TEAM PLUGS IN ***
// ===========================================================================
//
// Every page of this website talks to the backend ONLY through the functions
// below. No page imports Firebase directly. That means:
//
//   1. Your pages already work today (they read dummy data).
//   2. In Step 6 you do NOT touch any page or component.
//      You only replace the body of these 6 functions with the Backend
//      Team's Firebase code. The function names never change.
//
// THE CONTRACT (agree on this with the Backend Team):
//
//   getReports()                -> Promise<Report[]>
//   getReportById(id)           -> Promise<Report | null>
//   createReport(input)         -> Promise<Report>
//   getNews()                   -> Promise<NewsItem[]>
//   getEvents()                 -> Promise<EventItem[]>
//   uploadReportPhoto(file)     -> Promise<string>   (a photo URL)
//
// THE Report SHAPE (one object looks exactly like this):
//
//   {
//     id:           'r-1001',                       // string, from backend
//     title:        'Broken Road',
//     type:         'Complaint',                    // Complaint|Incident|Announcement|Event|Other
//     description:  'Large pothole near the gate.',
//     lat:          17.3871,                        // <-- comes from the MAP component
//     lng:          78.4891,                        // <-- comes from the MAP component
//     locationName: 'College Main Gate, Gachibowli',
//     photoUrl:     'https://...',                  // '' if the user added no photo
//     status:       'Unverified',                   // Unverified|In Progress|Resolved|Verified
//     reportedBy:   'Sai Teja',
//     reportedAt:   '2026-09-12T10:30:00+05:30'     // ISO date-time TEXT
//   }
//
// ===========================================================================

import { sampleEvents, sampleNews, sampleReports } from '../data/sampleData.js'
import { readStore, writeStore } from './storage.js'
import { uploadPhoto } from './photoUpload.js'
import { DEFAULT_STATUS } from '../utils/constants.js'

const REPORTS_KEY = 'mra.reports.local'
const NEWS_KEY = 'mra.news.local'
const EVENTS_KEY = 'mra.events.local'

/** Pretend the network is slow so we can test our loading states. */
const fakeNetworkDelay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))

/** Small unique id. The Backend Team will use Firebase's own ids instead. */
function makeId(prefix = 'r') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** Newest first. */
function byNewest(dateField) {
  return (a, b) => new Date(b[dateField] || 0) - new Date(a[dateField] || 0)
}

// ---------------------------------------------------------------------------
// REPORTS
// ---------------------------------------------------------------------------

/**
 * STEP 6: replace the body with something like
 *   const snapshot = await getDocs(collection(db, 'reports'))
 *   return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
 */
export async function getReports() {
  await fakeNetworkDelay()
  const saved = readStore(REPORTS_KEY, [])
  return [...saved, ...sampleReports].sort(byNewest('reportedAt'))
}

export async function getReportById(id) {
  const all = await getReports()
  return all.find((report) => report.id === id) || null
}

/**
 * input = { title, type, description, lat, lng, locationName, photoFile, reportedBy }
 *
 * NOTE: the location (lat/lng) always arrives from the map component,
 * so the frontend never has to guess where the pin is.
 */
export async function createReport(input) {
  await fakeNetworkDelay(400)

  if (typeof input?.lat !== 'number' || typeof input?.lng !== 'number') {
    throw new Error('A location is required. Please pick a point on the map.')
  }

  // Photo first (Step 7), then the report with its URL inside.
  const photoUrl = input.photoFile ? await uploadPhoto(input.photoFile) : ''

  const report = {
    id: makeId('r'),
    title: (input.title || 'Untitled report').trim(),
    type: input.type || 'Other',
    description: (input.description || '').trim(),
    lat: input.lat,
    lng: input.lng,
    locationName: input.locationName || 'Location selected on map',
    photoUrl,
    status: DEFAULT_STATUS, // the backend/app decides the first status
    reportedBy: input.reportedBy || 'Anonymous',
    reportedAt: new Date().toISOString(),
  }

  const saved = readStore(REPORTS_KEY, [])
  writeStore(REPORTS_KEY, [report, ...saved])
  return report
}

/** Handy while testing: empty the local demo data. */
export function clearLocalReports() {
  writeStore(REPORTS_KEY, [])
}

// ---------------------------------------------------------------------------
// NEWS
// ---------------------------------------------------------------------------

/** STEP 6: replace with  getDocs(collection(db, 'news'))  */
export async function getNews() {
  await fakeNetworkDelay()
  const saved = readStore(NEWS_KEY, [])
  const news = saved.length ? saved : sampleNews
  return [...news].sort(byNewest('date'))
}

// ---------------------------------------------------------------------------
// EVENTS
// ---------------------------------------------------------------------------

/** STEP 6: replace with  getDocs(collection(db, 'events'))  */
export async function getEvents() {
  await fakeNetworkDelay()
  const saved = readStore(EVENTS_KEY, [])
  const events = saved.length ? saved : sampleEvents
  return [...events].sort(byNewest('date'))
}

// ---------------------------------------------------------------------------
// PHOTOS  (Step 7 - the Backend Team owns the real version)
// ---------------------------------------------------------------------------

/** STEP 7: replace with the Firebase Storage upload function. */
export async function uploadReportPhoto(file) {
  return uploadPhoto(file)
}
