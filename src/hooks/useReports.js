import { useCallback, useEffect, useState } from 'react'
import { createReport, getReports } from '../services/api.js'

// ---------------------------------------------------------------------------
// useReports  --  a "custom hook".
//
// A hook is just a JavaScript function whose name starts with "use" and which
// uses React's useState/useEffect. It lets several pages share the same logic
// instead of copying it. Here: load reports once, and add a new one.
//
// It talks ONLY to services/api.js, so when the Backend Team swaps in Firebase
// this file does not change at all.
// ---------------------------------------------------------------------------
export default function useReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getReports()
      setReports(data)
    } catch (err) {
      setError(err?.message || 'Could not load reports.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /** Save a new report and show it on the map immediately. */
  const addReport = useCallback(async (values) => {
    const saved = await createReport(values)
    setReports((previous) => [saved, ...previous])
    return saved
  }, [])

  return { reports, loading, error, reload: load, addReport }
}
