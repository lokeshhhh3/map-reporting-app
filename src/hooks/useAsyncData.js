import { useCallback, useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// useAsyncData  --  the same idea as useReports, but reusable for News and
// Events (and anything else the Backend Team adds later).
//
//   const { data: news, loading, error } = useAsyncData(getNews, [])
// ---------------------------------------------------------------------------
export default function useAsyncData(loader, deps = []) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps)

  useEffect(() => {
    let active = true

    async function fetchData() {
      try {
        setLoading(true)
        setError('')
        const result = await run()
        if (active) setData(result)
      } catch (err) {
        if (active) setError(err?.message || 'Something went wrong.')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchData()
    return () => {
      active = false
    }
  }, [run])

  return { data, loading, error }
}
