// ===========================================================================
// scripts/seed-firestore.js
// ===========================================================================
// Copies the demo data (8 reports, 5 news items, 5 events) into your Firestore
// database, so the map is not empty when you first connect Firebase.
//
// RUN IT WITH:   npm run seed
//
// It reads the same .env file the website uses, so set that up first.
//
// SAFE TO RUN MORE THAN ONCE. Before adding anything, it counts what is
// already in each collection and only fills in the ones that are empty.
// So if it stops halfway through, just run it again.
// ===========================================================================

import { readFileSync, existsSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  limit,
  query,
} from 'firebase/firestore'

import { sampleReports, sampleNews, sampleEvents } from '../src/data/sampleData.js'

const ENV_FILE = new URL('../.env', import.meta.url)

// --- 1. Read the .env file ------------------------------------------------
if (!existsSync(ENV_FILE)) {
  console.error('\n❌ No .env file found.')
  console.error('   Copy .env.example, rename the copy to ".env", and paste in')
  console.error('   your six Firebase values. Then run "npm run seed" again.\n')
  process.exit(1)
}

const env = {}
for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const equals = trimmed.indexOf('=')
  if (equals === -1) continue
  const key = trimmed.slice(0, equals).trim()
  const value = trimmed.slice(equals + 1).trim().replace(/^["']|["']$/g, '')
  env[key] = value
}

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

// --- 2. Check the values look real ---------------------------------------
const missing = Object.entries(config)
  .filter(([, value]) => !value || value.includes('your-') || value === '')
  .map(([key]) => key)

if (missing.length) {
  console.error('\n❌ Your .env file is missing values for:', missing.join(', '))
  console.error('   Open .env and paste in all six values from Firebase.')
  console.error('   Firebase console -> Project settings -> Your apps -> SDK setup.\n')
  process.exit(1)
}

console.log(`\n🔥 Connecting to Firebase project: ${config.projectId}`)
const app = initializeApp(config)
const db = getFirestore(app)

// --- 3. Helpers -----------------------------------------------------------

// Is this collection still empty? (Checks for 1 document, reads nothing more.)
async function isEmpty(name) {
  const snapshot = await getDocs(query(collection(db, name), limit(1)))
  return snapshot.empty
}

// Adds a list of documents one at a time, with a live counter.
async function addAll(name, emoji, label, items) {
  if (!items.length) {
    console.log(`\n${emoji} ${label}: nothing to add.`)
    return 0
  }

  if (!(await isEmpty(name))) {
    console.log(`\n${emoji} ${label}: already has data - skipped.`)
    console.log('   (Delete the documents in the Firebase console if you want to re-add them.)')
    return 0
  }

  console.log(`\n${emoji} ${label}...`)
  let added = 0
  for (const item of items) {
    await addDoc(collection(db, name), item)
    added++
    process.stdout.write(`\r   ${added}/${items.length} added`)
  }
  console.log('  ✅')
  return added
}

// --- 4. Write the data ----------------------------------------------------
// The demo data carries its own ids for the React lists; Firestore makes its
// own ids, so we drop the old one before saving.

// eslint-disable-next-line no-unused-vars
const stripId = ({ id, ...rest }) => rest

const reports = sampleReports.map(stripId)
const news = sampleNews.map(stripId)
const events = sampleEvents.map(stripId)

async function seed() {
  const reportCount = await addAll('reports', '📋', 'Adding reports', reports)
  const newsCount = await addAll('news', '📰', 'Adding news', news)
  const eventCount = await addAll('events', '🎉', 'Adding events', events)

  const total = reportCount + newsCount + eventCount

  if (total === 0) {
    console.log(`\n============================================
  Everything was already in the database.
  Nothing to do - your data is ready.
============================================\n`)
  } else {
    console.log(`\n============================================
  Done! Added:
    ${reportCount} reports
    ${newsCount} news items
    ${eventCount} events

  Check it worked: Firebase console -> Firestore Database -> Data
  Then open the website and go to the Map page.
============================================\n`)
  }
  process.exit(0)
}

seed().catch((error) => {
  const code = error?.code || ''
  console.error('\n❌ Something went wrong:\n', error?.message || error)

  if (code === 'permission-denied' || String(error?.message).includes('PERMISSION_DENIED')) {
    console.error(`
  This means your security rules blocked the write.

  News and events can only be written by you, from the Firebase console -
  the normal rules say "allow write: if false" for those two collections.
  To run this setup script, open them up for a minute:

    1. Firebase console -> Firestore Database -> Rules
    2. Replace the rules with the "TEMPORARY" version in
       BACKEND-TEAM-TASK.md  (Step 3b)
    3. Click Publish
    4. Run "npm run seed" again
    5. IMPORTANT: put the normal rules back and Publish again
`)
  } else {
    console.error(`
  Common causes:
    * The Firestore database was not created yet
      -> Firebase console -> Build -> Firestore Database -> Create database
    * Wrong values in .env
      -> re-copy them from Firebase console -> Project settings -> Your apps
    * No internet connection
`)
  }
  process.exit(1)
})
