// A small "please wait" block shown while we fetch data from the backend.
export default function Loader({ text = 'Loading…' }) {
  return (
    <div className="loader" role="status">
      <span className="loader__spinner" aria-hidden="true" />
      <span>{text}</span>
    </div>
  )
}
