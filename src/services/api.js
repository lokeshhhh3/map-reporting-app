// ===========================================================================
// api.js  --  *** THE ONE FILE THAT TALKS TO THE DATABASE ***
// ===========================================================================
//
// Every page of this website gets its data through the six functions below.
// No page imports Firebase directly. That means:
//
//   1. The app works today, on the demo data in src/data/sampleData.js
//   2. When the .env file has Firebase settings, it uses Firestore instead
//   3. If the .env file is missing, it quietly falls back to demo data
//
// You never have to edit any page or component to switch between the two.
//
// ---------------------------------------------------------------------------
// THE CONTRACT
// ---------------------------------------------------------------------------
//
//   getReports()              -> Promise<Report[]>
//   getReportById(id)         -> Promise<Report | null>
//   createReport(input)       -> Promise<Report>
//   updateReport(id, input)   -> Promise<Report>      (own report, or moderator)
//   deleteReport(id)          -> Promise<void>        (own report, or moderator)
//   setReportStatus(id, s)    -> Promise<Report>      (moderator only)
//   getNews()                 -> Promise<NewsItem[]>
//   getEvents()               -> Promise<EventItem[]>
//   uploadReportPhoto(file)   -> Promise<string>   (a photo URL)
//
// THE Report SHAPE (one object looks exactly like this):
//
//   {
//     id:           'r-1001',                       // string, from Firestore
//     title:        'Broken Road',
//     type:         'Complaint',                    // Complaint|Incident|Announcement|Event|Other
//     description:  'Large pothole near the gate.',
//     lat:          17.3871,                        // NUMBER (not a string!)
//     lng:          78.4891,                        // NUMBER (not a string!)
//     locationName: 'College Main Gate, Gachibowli',
//     photoUrl:     'https://...',                  // '' if the user added no photo
//     status:       'Unverified',                   // Unverified|In Progress|Resolved|Verified
//     reportedBy:   'Sai Teja',
//     reportedAt:   '2026-09-12T10:30:00+05:30',    // ISO date-time TEXT (not a Timestamp)
//     ownerUid:     'abc123...',                    // who posted it ('' for the seeded demo rows)
//     updatedAt:    ''                              // when it was last edited, '' if never
//   }
//
// ===========================================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  arrayUnion,
} from 'firebase/firestore'

import { db, isFirebaseConfigured } from './firebase.js'
import { ensureSignedIn, getCurrentUid, isCurrentUserAdmin } from './auth.js'
import { sampleEvents, sampleNews, sampleReports } from '../data/sampleData.js'
import { readStore, writeStore } from './storage.js'
import { uploadPhoto } from './photoUpload.js'
import { DEFAULT_STATUS } from '../utils/constants.js'

const REPORTS_KEY = 'mra.reports.local'
const NEWS_KEY = 'mra.news.local'
const EVENTS_KEY = 'mra.events.local'

/** Pretend the network is slow so we can test our loading states. */
const fakeNetworkDelay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))

/** Small unique id. Firestore makes its own ids, this is only for demo data. */
function makeId(prefix = 'r') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** Newest first. */
function byNewest(dateField) {
  return (a, b) => new Date(b[dateField] || 0) - new Date(a[dateField] || 0)
}

/**
 * Normalise a date coming out of Firestore into an ISO text string.
 *
 * Firestore hands back dates in more than one shape, depending on how they
 * were written:
 *   * a plain text date  - "2026-09-12T10:30:00+05:30"
 *     (what the seed script and createReport() save)
 *   * a Timestamp object - has a .toDate() method
 *     (what serverTimestamp() saves)
 *   * { seconds, nanoseconds } - a Timestamp that has been through JSON
 *
 * Every page expects text, because they format dates with new Date(value).
 * If we skip this step, a text date silently turns into today's date and the
 * whole list shows the wrong day.
 */
function toIsoString(value) {
  if (!value) return ''

  // Firestore Timestamp object
  if (typeof value.toDate === 'function') {
    const date = value.toDate()
    return Number.isNaN(date.getTime()) ? '' : date.toISOString()
  }

  // A Timestamp that has travelled through JSON
  if (typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString()
  }

  // Plain text date, or a number of milliseconds
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

/**
 * Turn a Firestore document into the exact shape the pages expect.
 *
 * Two things matter here:
 *   * lat and lng MUST be numbers. Firestore can return them as strings if
 *     they were saved as text, and the map would then draw nothing at all.
 *   * reportedAt MUST be text. The pages format dates with new Date(...),
 *     which needs a string - see toIsoString() above.
 */
function toReport(snapshot) {
  const data = snapshot.data() || {}

  return {
    id: snapshot.id,
    title: data.title || 'Untitled report',
    type: data.type || 'Other',
    description: data.description || '',
    lat: Number(data.lat),
    lng: Number(data.lng),
    locationName: data.locationName || 'Location selected on map',
    photoUrl: data.photoUrl || '',
    status: data.status || DEFAULT_STATUS,
    statusHistory: Array.isArray(data.statusHistory) ? data.statusHistory : [],
    reportedBy: data.reportedBy || 'Anonymous',
    reportedAt: toIsoString(data.reportedAt),
    ownerUid: data.ownerUid || '',
    updatedAt: toIsoString(data.updatedAt),
  }
}

// ===========================================================================
// REPORTS
// ===========================================================================

export async function getReports() {
  // -------------------------------------------------------------------------
  // DEMO MODE — no .env file yet
  // -------------------------------------------------------------------------
  if (!isFirebaseConfigured || !db) {
    await fakeNetworkDelay()
    const saved = readStore(REPORTS_KEY, [])
    return [...saved, ...sampleReports].sort(byNewest('reportedAt'))
  }

  // -------------------------------------------------------------------------
  // FIREBASE MODE
  // -------------------------------------------------------------------------
  // Note: we deliberately do NOT fetch photos here. The map asks for every
  // report, so pulling photos in would make it slow. Only getReportById()
  // fetches the photo, because that page shows just one report.
  const q = query(collection(db, 'reports'), orderBy('reportedAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(toReport)
}

export async function getReportById(id) {
  if (!isFirebaseConfigured || !db) {
    const all = await getReports()
    return all.find((report) => report.id === id) || null
  }

  const snapshot = await getDoc(doc(db, 'reports', id))
  if (!snapshot.exists()) return null

  const report = toReport(snapshot)

  // One report only, so we can afford to fetch its photo.
  const photo = await getDoc(doc(db, 'reportPhotos', id))
  if (photo.exists()) report.photoUrl = photo.data().dataUrl || ''

  return report
}

/**
 * input = { title, type, description, lat, lng, locationName, photoFile, reportedBy }
 *
 * The location (lat/lng) always arrives from the map component, so this
 * function never has to guess where the pin is.
 */
export async function createReport(input) {
  if (typeof input?.lat !== 'number' || typeof input?.lng !== 'number') {
    throw new Error('A location is required. Please pick a point on the map.')
  }

  // -------------------------------------------------------------------------
  // DEMO MODE
  // -------------------------------------------------------------------------
  if (!isFirebaseConfigured || !db) {
    await fakeNetworkDelay(400)

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
      status: DEFAULT_STATUS,
      statusHistory: [{
  status: DEFAULT_STATUS,
  at: reportedAt,
  note: 'Report submitted',
}],
      reportedBy: input.reportedBy || 'Anonymous',
      reportedAt: new Date().toISOString(),
      ownerUid: DEMO_OWNER_UID,
      updatedAt: '',
    }

    const saved = readStore(REPORTS_KEY, [])
    writeStore(REPORTS_KEY, [report, ...saved])
    return report
  }

  // -------------------------------------------------------------------------
  // FIREBASE MODE
  // -------------------------------------------------------------------------

  // 0. Give this browser an identity (silently - no login screen). We store
  //    the uid on the report so the rules can later tell "the person who
  //    posted this" apart from everybody else.
  const user = await ensureSignedIn()
  const ownerUid = user?.uid || ''
  const reportedAt = new Date().toISOString()

  // 1. Save the report itself.
  //    reportedAt is saved as TEXT, not serverTimestamp(), on purpose:
  //    the 8 seeded reports are text too, and Firestore sorts a mixture of
  //    text and Timestamps in two separate blocks - a new report would jump
  //    to the bottom of the list instead of the top.
  const created = await addDoc(collection(db, 'reports'), {
    title: (input.title || 'Untitled report').trim(),
    type: input.type || 'Other',
    description: (input.description || '').trim(),
    lat: Number(input.lat),
    lng: Number(input.lng),
    locationName: input.locationName || 'Location selected on map',
    photoUrl: '',
    status: DEFAULT_STATUS,
    reportedBy: input.reportedBy || 'Anonymous',
    reportedAt,
    ownerUid,
  })

  // 2. Save the photo separately, under the same document id.
  //    Why separate? A base64 photo can be 100-200 KB. If it lived inside the
  //    report document, loading the map would download every photo. Keeping it
  //    in its own collection means the map stays fast and only the details
  //    page - which loads one report - pulls a photo down.
  let photoUrl = ''
  if (input.photoFile) {
    try {
      photoUrl = await uploadReportPhoto(input.photoFile)
      if (photoUrl) {
        await setDoc(doc(db, 'reportPhotos', created.id), { dataUrl: photoUrl })
      }
    } catch (error) {
      // The report is already saved. A failed photo should not lose it.
      console.warn('Photo could not be saved:', error?.message)
    }
  }

  // 3. Return the finished report, in the same shape as everything else.
  return {
    id: created.id,
    title: (input.title || 'Untitled report').trim(),
    type: input.type || 'Other',
    description: (input.description || '').trim(),
    lat: Number(input.lat),
    lng: Number(input.lng),
    locationName: input.locationName || 'Location selected on map',
    photoUrl,
    status: DEFAULT_STATUS,
    reportedBy: input.reportedBy || 'Anonymous',
    reportedAt,
    ownerUid,
    updatedAt: '',
  }
}

// ===========================================================================
// EDITING, DELETING AND MODERATING
// ===========================================================================
//
// WHO IS ALLOWED TO DO WHAT is decided by the Firestore security rules, not
// by this file. The functions below simply try; if the rules say no, Firebase
// throws "Missing or insufficient permissions" and we turn that into a
// friendly sentence. The buttons in the UI are hidden from people who cannot
// use them, but the real protection lives in the rules.
//
//   you posted it      -> update, delete
//   you are the admin  -> update, delete, change status
//   everyone else      -> read only
// ===========================================================================

/** In demo mode there is no Firebase, so locally-created reports belong to us. */
const DEMO_OWNER_UID = 'demo-owner'

/** Did the person at this browser post this report? */
export function isReportOwner(report) {
  if (!report) return false
  if (!isFirebaseConfigured || !db) return report.ownerUid === DEMO_OWNER_UID
  const uid = getCurrentUid()
  return Boolean(uid) && report.ownerUid === uid
}

/** Is the person at this browser the moderator? */
export function canModerate() {
  if (!isFirebaseConfigured || !db) return false // demo mode has no accounts
  return isCurrentUserAdmin()
}

/** May this browser edit or delete this report at all? */
export function canEditReport(report) {
  return isReportOwner(report) || canModerate()
}

/**
 * Turn a raw Firebase error into a sentence worth showing a person.
 */
function explainWriteError(error) {
  const code = error?.code || ''
  if (code === 'permission-denied' || String(error?.message).includes('PERMISSION_DENIED')) {
    return new Error(
      'You are not allowed to change this report. You can only edit or delete a report you posted yourself.',
    )
  }
  if (code === 'unavailable') {
    return new Error('You appear to be offline. Check your internet connection and try again.')
  }
  return new Error(error?.message || 'Could not save the change. Please try again.')
}

/**
 * updateReport(id, input) -> Promise<Report>
 *
 * Changes the words and the photo of a report. It deliberately does NOT
 * change:
 *   * status   - that is the moderator's job
 *   * ownerUid - so nobody can claim someone else's report
 *   * reportedAt - so the "reported" date stays the truth about when it
 *     first arrived. The edit time goes into `updatedAt` instead.
 */
export async function updateReport(id, input = {}) {
  const changes = {
    title: (input.title || 'Untitled report').trim(),
    type: input.type || 'Other',
    description: (input.description || '').trim(),
    locationName: input.locationName || 'Location selected on map',
    updatedAt: new Date().toISOString(),
  }

  // Only move the pin if the caller actually sent a new position.
  if (typeof input.lat === 'number' && typeof input.lng === 'number') {
    changes.lat = Number(input.lat)
    changes.lng = Number(input.lng)
  }

  // -------------------------------------------------------------------------
  // DEMO MODE
  // -------------------------------------------------------------------------
  if (!isFirebaseConfigured || !db) {
    await fakeNetworkDelay(300)
    const saved = readStore(REPORTS_KEY, [])
    let updated = null

    const next = saved.map((report) => {
      if (report.id !== id) return report
      updated = { ...report, ...changes }
      return updated
    })

    if (!updated) throw new Error('That report is not stored in this browser, so it cannot be edited.')
    writeStore(REPORTS_KEY, next)
    return updated
  }

  // -------------------------------------------------------------------------
  // FIREBASE MODE
  // -------------------------------------------------------------------------
  try {
    await updateDoc(doc(db, 'reports', id), changes)
  } catch (error) {
    throw explainWriteError(error)
  }

  return getReportById(id)
}

/**
 * setReportStatus(id, status) -> Promise<Report>
 *
 * Moderator only. This is the function behind the status dropdown on the
 * report details page.
 */
export async function setReportStatus(id, status) {
  if (!status) throw new Error('Pick a status first.')

  if (!isFirebaseConfigured || !db) {
    await fakeNetworkDelay(200)
    const saved = readStore(REPORTS_KEY, [])
    let updated = null
    const next = saved.map((report) => {
      if (report.id !== id) return report
      updated = { ...report, status }
      return updated
    })
    if (!updated) throw new Error('That report is not stored in this browser.')
    writeStore(REPORTS_KEY, next)
    return updated
  }

  try {
    await updateDoc(doc(db, 'reports', id), { status })
  } catch (error) {
    throw explainWriteError(error)
  }

  return getReportById(id)
}

/**
 * deleteReport(id) -> Promise<void>
 *
 * Removes the report and its photo. Allowed for the person who posted it,
 * and for the moderator.
 */
export async function deleteReport(id) {
  if (!isFirebaseConfigured || !db) {
    await fakeNetworkDelay(300)
    const saved = readStore(REPORTS_KEY, [])
    writeStore(
      REPORTS_KEY,
      saved.filter((report) => report.id !== id),
    )
    return
  }

  try {
    // The PHOTO goes first, on purpose. The security rule for deleting a
    // photo looks up the report to check that you own it - so the report
    // must still exist at that moment.
    try {
      await deleteDoc(doc(db, 'reportPhotos', id))
    } catch {
      /* no photo on this report, or the rules refused - carry on */
    }

    await deleteDoc(doc(db, 'reports', id))
  } catch (error) {
    throw explainWriteError(error)
  }
}

/** Handy while testing: empties the demo data (does nothing in Firebase mode). */
export function clearLocalReports() {
  writeStore(REPORTS_KEY, [])
}

// ===========================================================================
// NEWS
// ===========================================================================

export async function getNews() {
  if (!isFirebaseConfigured || !db) {
    await fakeNetworkDelay()
    const saved = readStore(NEWS_KEY, [])
    const news = saved.length ? saved : sampleNews
    return [...news].sort(byNewest('date'))
  }

  const q = query(collection(db, 'news'), orderBy('date', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

// ===========================================================================
// EVENTS
// ===========================================================================

export async function getEvents() {
  if (!isFirebaseConfigured || !db) {
    await fakeNetworkDelay()
    const saved = readStore(EVENTS_KEY, [])
    const events = saved.length ? saved : sampleEvents
    return [...events].sort(byNewest('date'))
  }

  const q = query(collection(db, 'events'), orderBy('date', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

// ===========================================================================
// PHOTOS
// ===========================================================================
//
// This hands work to photoUpload.js, which shrinks the photo in the browser
// and returns it as a text string ("data URL"). That string is what gets
// stored, either in the browser's localStorage (demo mode) or in Firestore.
//
// If you ever move to Firebase Cloud Storage, change photoUpload.js and
// nothing else.
// ===========================================================================

export async function uploadReportPhoto(file) {
  return uploadPhoto(file)
}
