// ===========================================================================
// firebase.js  --  starts the connection to Firebase
// ===========================================================================
//
// This file reads your Firebase project settings from the .env file and
// opens the connection. Nothing else in the app imports Firebase directly.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE IS WRITTEN DEFENSIVELY
// ---------------------------------------------------------------------------
// If the .env file is missing or incomplete, this file does NOT crash the app.
// It simply reports that Firebase is not configured, and api.js falls back to
// the demo data. That means:
//
//   * before you set up Firebase  -> the app works on demo data
//   * after you set up Firebase   -> the app uses the database
//   * if you forget the .env file -> the app still works on demo data
//
// So you can never break the running site by editing these files.
// ===========================================================================

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Vite only exposes variables that start with VITE_ to the browser.
// These names must match the ones in your .env file exactly.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/**
 * true  -> the .env file has real values, so we use the database
 * false -> no .env file, so we use the demo data
 */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

let db = null

if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    console.info('🔥 Firebase connected to project:', firebaseConfig.projectId)
  } catch (error) {
    console.warn('🔥 Firebase could not start. Falling back to demo data.', error?.message)
    db = null
  }
} else {
  console.info('🔥 No Firebase settings found (.env missing). Using demo data — this is fine.')
}

export { db }
