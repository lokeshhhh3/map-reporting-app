import { useEffect, useState } from 'react'
import { ensureSignedIn, watchUser, isAdminUid } from '../services/auth.js'

// ---------------------------------------------------------------------------
// useAuth  --  tells a component who is using the app.
//
// Returns:
//   uid     -> this browser's private id, or '' if we do not have one
//   ready   -> false until we know either way, so the UI can wait instead of
//              flashing the wrong buttons
//   isAdmin -> is this the moderator?
//   user    -> the whole Firebase user object, if you need it
//
// The details page uses it to decide whether to show Edit / Delete / the
// status dropdown. Nothing secret is in here - the real safety is in the
// Firestore security rules. This only decides what to DRAW.
// ---------------------------------------------------------------------------
export default function useAuth() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true

    // watchUser sends the current value immediately, and again whenever it
    // changes (for example, a moment after we sign in).
    const stopWatching = watchUser((nextUser) => {
      if (!alive) return
      setUser(nextUser)
      setReady(true)
    })

    // Ask for an identity. Safe to call repeatedly - it only signs in once.
    ensureSignedIn().catch(() => {
      if (alive) setReady(true)
    })

    return () => {
      alive = false
      stopWatching()
    }
  }, [])

  return {
    user,
    uid: user?.uid || '',
    ready,
    isAdmin: isAdminUid(user?.uid),
  }
}
