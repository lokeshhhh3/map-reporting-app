import { formatDate } from '../utils/mapMath.js'

// NewsCard -- one college news / announcement item.
export default function NewsCard({ item }) {
  return (
    <article className="news-card">
      <div className="news-card__top">
        <span className="pill">{item.category || 'News'}</span>
        <time dateTime={item.date}>{formatDate(item.date)}</time>
      </div>
      <h3 className="news-card__title">{item.title}</h3>
      <p className="news-card__text">{item.description}</p>
      {item.author ? <p className="news-card__author">— {item.author}</p> : null}
    </article>
  )
}
