import { useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader.jsx'
import NewsCard from '../components/NewsCard.jsx'
import Loader from '../components/Loader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import useAsyncData from '../hooks/useAsyncData.js'
import { getNews } from '../services/api.js'

// ---------------------------------------------------------------------------
// NEWS PAGE  (Step 3 of the plan)
// College news and announcements. Same pattern as the Reports page:
// ask the service file for data, then filter it in this file.
// ---------------------------------------------------------------------------
export default function News() {
  const { data: news, loading, error } = useAsyncData(getNews)
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')

  // Collect the category names that actually exist in the data.
  const categories = useMemo(() => ['All', ...new Set(news.map((item) => item.category).filter(Boolean))], [news])

  const visibleNews = useMemo(() => {
    const text = search.trim().toLowerCase()
    return news.filter((item) => {
      const matchesCategory = category === 'All' || item.category === category
      const matchesText =
        !text ||
        [item.title, item.description, item.author]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(text))
      return matchesCategory && matchesText
    })
  }, [news, category, search])

  return (
    <section className="container page">
      <PageHeader
        eyebrow="From the college"
        title="College News &amp; Announcements"
        subtitle="Exam notices, campus updates, placement drives and other announcements."
      />

      <div className="filters">
        <div className="filters__field filters__field--grow">
          <label htmlFor="news-search">Search news</label>
          <input
            id="news-search"
            type="search"
            placeholder="Search by title or description…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="filters__field">
          <label htmlFor="news-category">Category</label>
          <select id="news-category" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === 'All' ? 'All categories' : item}
              </option>
            ))}
          </select>
        </div>

        <div className="filters__actions">
          <span className="filters__count">{visibleNews.length} found</span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setCategory('All')
              setSearch('')
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {loading ? <Loader text="Loading news…" /> : null}

      {error ? (
        <EmptyState icon="⚠️" title="Could not load news" message={error} />
      ) : null}

      {!loading && !error && visibleNews.length === 0 ? (
        <EmptyState
          icon="📰"
          title="No news found"
          message="Try a different category or clear the search box."
        />
      ) : null}

      {!loading && !error && visibleNews.length > 0 ? (
        <div className="card-grid card-grid--news">
          {visibleNews.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
