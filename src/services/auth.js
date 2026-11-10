// ===========================================================================
// auth.js  --  who is using the app right now?
// ===========================================================================
//
// We use Firebase ANONYMOUS auth. Read this before you worry about it:
//
//   * There is NO login screen and NO password. The user never types anything.
//   * Firebase quietly gives each BROWSER its own private id (a "uid").
//   * The id is saved in the browser, so it stays the same next time.
//   * Two different people therefore get two different uids.
//
// Why we need it:
//
//   1. So you can edit or delete a report YOU posted, and not someone
//      else's. The security rules compare your uid with the report's ownerUid.
//   2. So the moderator (you) can change any report's status. Your uid is
//      written into the rules, so only you get those powers.
//
// What it is NOT: this is not a real account system. Anonymous users are
// per-browser, so clearing your browser data loses ownership of your old
// reports. That is fine for a campus map - the alternative is making people
// sign up, and then far fewer of them would report anything.
//
// If anonymous auth has not been switched on in the Firebase console yet,
// every function here returns null instead of crashing, and the app keeps
// working - you simply do not get the edit or moderate buttons.
// ===========================================================================

import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { isFirebaseConfigured, app } from './firebase.js'

/**
 * The moderator's uid, from your .env file:
 *
 *   VITE_ADMIN_UID=abc123...
 *
 * Leave it empty and nobody is a moderator - the app still works, you just
 * cannot change report statuses from inside the app (the Firebase console
 * always works, because it ignores the rules).
 */
export const ADMIN_UID = import.meta.env.VITE_ADMIN_UID || ''

let auth = null
let signInPromise = null
let currentUser = null
const listeners = new Set()

if (isFirebaseConfigured && app) {
  try {
    auth = getAuth(app)

    // Firebase remembers the user by itself, so this fires straight away
    // with the existing uid (or null if this browser is brand new).
    onAuthStateChanged(auth, (user) => {
      currentUser = user
      if (user) {
        // Handy when setting up moderation: copy this id into VITE_ADMIN_UID.
        console.info('🔥 Signed in anonymously. Your uid is:', user.uid)
      }
      listeners.forEach((listener) => listener(user))
    })
  } catch (error) {
    console.warn('🔥 Anonymous sign-in is unavailable:', error?.message || error)
  }
}

/** The user object right now, or null. */
export function getCurrentUser() {
  return currentUser
}

/** The uid right now, or '' if we do not have one yet. */
export function getCurrentUid() {
  return currentUser?.uid || ''
}

/** Is this uid the moderator? */
export function isAdminUid(uid) {
  return Boolean(ADMIN_UID) && uid === ADMIN_UID
}

/** Is the person using the app the moderator? */
export function isCurrentUserAdmin() {
  return isAdminUid(getCurrentUid())
}

/**
 * Make sure we have an identity, and give it back.
 *
 * Safe to call as often as you like - it only signs in once, then returns
 * the same user. Resolves to null if auth is unavailable, so callers can
 * carry on in a degraded way rather than crashing.
 */
export function ensureSignedIn() {
  if (!auth) return Promise.resolve(null)
  if (currentUser) return Promise.resolve(currentUser)
  if (signInPromise) return signInPromise

  signInPromise = signInAnonymously(auth)
    .then((credential) => credential.user)
    .catch((error) => {
      // The usual cause: Anonymous sign-in is not enabled in the console.
      console.warn(
        '🔥 Could not sign in anonymously. Reports will still be created, but you will not be able to edit them.' +
          ' To fix: Firebase console -> Authentication -> Sign-in method -> Anonymous -> Enable.',
        error?.code || error?.message || error,
      )
      return null
    })
    .finally(() => {
      signInPromise = null
    })

  return signInPromise
}

/**
 * Watch for the uid becoming known. The details page uses this so the
 * Edit button appears a moment after the page loads rather than never.
 * Returns an "unsubscribe" function - call it when the component unmounts.
 */
export function watchUser(listener) {
  if (!auth) {
    listener(null)
    return () => {}
  }

  listeners.add(listener)
  listener(currentUser) // send the current value immediately
  return () => listeners.delete(listener)
}
