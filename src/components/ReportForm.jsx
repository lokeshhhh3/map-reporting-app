import { useRef, useState } from 'react'
import { REPORT_TYPES } from '../utils/constants.js'
import { formatLatLng } from '../utils/mapMath.js'

// ---------------------------------------------------------------------------
// ReportForm  --  Step 3/4 of the plan: the form users fill in.
//
// Props:
//   onSubmit(values)        -> parent saves it through services/api.js
//   submitting (boolean)    -> shows "Submitting…" on the button
//   location ({lat,lng}|null) -> comes from the MAP component (Step 5)
//   onClearLocation()       -> "change location" button
//   errorMessage (string)   -> shown in a red box
//
// IMPORTANT: this form NEVER tries to find the location itself. It only reads
// the lat/lng that the map component handed to the page. That is the deal
// between the Frontend Team and the Maps Team.
// ---------------------------------------------------------------------------
export default function ReportForm({
  onSubmit,
  submitting = false,
  location = null,
  onClearLocation,
  errorMessage = '',
  submitLabel = 'Submit Report',
}) {
  const [values, setValues] = useState({
    title: '',
    type: 'Complaint',
    description: '',
    locationName: '',
    reportedBy: '',
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [errors, setErrors] = useState({})

  const photoInputRef = useRef(null)
  const mapSectionRef = useRef(null)

  function update(field, value) {
    setValues((previous) => ({ ...previous, [field]: value }))
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file)) // instant preview, no upload yet
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoPreview('')
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  /** Small validation so we never send an empty report to the backend. */
  function validate() {
    const next = {}
    if (!values.title.trim()) next.title = 'Please write a short title.'
    if (values.description.trim().length < 10) next.description = 'Please describe it in at least 10 characters.'
    if (!location) next.location = 'Please pick the exact spot on the map.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return

    await onSubmit({
      title: values.title,
      type: values.type,
      description: values.description,
      locationName: values.locationName,
      reportedBy: values.reportedBy,
      lat: location.lat, // <-- from the map
      lng: location.lng, // <-- from the map
      photoFile,
    })
  }

  return (
    <form className="report-form" onSubmit={handleSubmit} noValidate>
      {errorMessage ? <p className="alert alert--error">{errorMessage}</p> : null}

      {/* 1. Report type */}
      <div className="field">
        <label htmlFor="report-type">Report Type</label>
        <select id="report-type" value={values.type} onChange={(event) => update('type', event.target.value)}>
          {REPORT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Title */}
      <div className="field">
        <label htmlFor="report-title">Title</label>
        <input
          id="report-title"
          type="text"
          maxLength={80}
          placeholder="e.g. Broken road near college gate"
          value={values.title}
          onChange={(event) => update('title', event.target.value)}
        />
        {errors.title ? <span className="field__error">{errors.title}</span> : null}
      </div>

      {/* 3. Description */}
      <div className="field">
        <label htmlFor="report-description">Description</label>
        <textarea
          id="report-description"
          rows={5}
          maxLength={600}
          placeholder="What is happening? Add any detail that will help others understand."
          value={values.description}
          onChange={(event) => update('description', event.target.value)}
        />
        <div className="field__row">
          {errors.description ? <span className="field__error">{errors.description}</span> : <span />}
          <span className="field__hint">{values.description.length}/600</span>
        </div>
      </div>

      {/* 4. Photo (Step 7) */}
      <div className="field">
        <label htmlFor="report-photo">Photo (optional)</label>
        <div className="photo-input">
          <input
            id="report-photo"
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
          />
          {photoPreview ? (
            <div className="photo-preview">
              <img src={photoPreview} alt="Preview of the photo you chose" />
              <button type="button" className="btn btn--ghost btn--small" onClick={removePhoto}>
                Remove photo
              </button>
            </div>
          ) : (
            <span className="field__hint">JPG or PNG. It is uploaded when you submit (Backend Team handles storage).</span>
          )}
        </div>
      </div>

      {/* 5. Location -- comes from the map */}
      <div className="field" ref={mapSectionRef}>
        <label>Location</label>
        <div className={`location-box ${location ? 'is-set' : ''}`}>
          {location ? (
            <>
              <p className="location-box__coords">
                <strong>Pin placed</strong>
                <code>{formatLatLng(location.lat, location.lng)}</code>
              </p>
              <button type="button" className="btn btn--ghost btn--small" onClick={onClearLocation}>
                Choose a different point
              </button>
            </>
          ) : (
            <p className="location-box__empty">👈 Click a point on the map to set the exact location.</p>
          )}
        </div>
        {errors.location ? <span className="field__error">{errors.location}</span> : null}
      </div>

      {/* 6. Extra fields */}
      <div className="field-grid">
        <div className="field">
          <label htmlFor="report-place">Place name (optional)</label>
          <input
            id="report-place"
            type="text"
            placeholder="e.g. College Main Gate, Gachibowli"
            value={values.locationName}
            onChange={(event) => update('locationName', event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="report-by">Your name (optional)</label>
          <input
            id="report-by"
            type="text"
            placeholder="Leave blank to stay anonymous"
            value={values.reportedBy}
            onChange={(event) => update('reportedBy', event.target.value)}
          />
        </div>
      </div>

      <div className="report-form__actions">
        <button type="submit" className="btn btn--primary btn--large" disabled={submitting}>
          {submitting ? 'Submitting…' : submitLabel}
        </button>
        <p className="field__hint">
          Your report is saved with the coordinates from the map, so it appears as a pin for everyone.
        </p>
      </div>
    </form>
  )
}
