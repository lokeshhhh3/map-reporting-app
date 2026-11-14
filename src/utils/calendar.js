/* ===========================================================================
 * calendar.js  --  turn one event into an .ics file the phone can save.
 *
 * WHAT AN .ICS FILE IS
 *   It is a small plain-text file that every phone and computer calendar
 *   understands. When you open it, the event appears in your calendar.
 *
 * THE TRICKY PART: TIME ZONES
 *   An event has a date ("2026-11-20") and a time ("10:30 AM"). A calendar
 *   file needs a real moment in time, and it needs to say which time zone
 *   that is. This app only covers India, so we use IST (UTC+05:30) and say
 *   so in the file, which means the time shows up correctly even if you
 *   open the file in another country.
 *
 * The event is treated as ONE HOUR long, because the app does not store an
 * end time.
 * =========================================================================== */

// India Standard Time, in hours ahead of UTC.
const INDIA_UTC_OFFSET_HOURS = 5.5

/** "2026-11-20" + "10:30 AM"  ->  a real Date (in UTC). */
export function parseEventDateTime(dateText, timeText) {
  const date = String(dateText || '').trim()
  const time = String(timeText || '').trim()

  if (!date) return null

  const parts = date.split('-').map((part) => Number(part))
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null

  const [year, month, day] = parts

  let hours = 0
  let minutes = 0

  const match = time.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i)
  if (match) {
    hours = Number(match[1])
    minutes = Number(match[2] || 0)
    const meridiem = (match[3] || '').toUpperCase()
    if (meridiem === 'PM' && hours < 12) hours += 12
    if (meridiem === 'AM' && hours === 12) hours = 0
  }

  // Move the local India time back to UTC.
  const utc = new Date(Date.UTC(year, month - 1, day, hours, minutes))
  utc.setTime(utc.getTime() - INDIA_UTC_OFFSET_HOURS * 60 * 60 * 1000)

  return utc
}

/** "2026-11-20T10:30:00Z" - the format an .ics file wants. */
function toIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Put a comma, a full stop or a new line into the file as a backslash. */
function escapeText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/**
 * Build the .ics text for one event.
 * Returns a string, or null if the event has no usable date.
 */
export function buildEventIcs(event) {
  if (!event) return null

  const start = parseEventDateTime(event.date, event.time)
  if (!start) return null

  const end = new Date(start.getTime() + 60 * 60 * 1000) // one hour long

  const name = escapeText(event.name || 'Community event')
  const description = escapeText(event.description || '')
  const location = escapeText(event.location || '')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Map Reporting App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id || name.replace(/\s+/g, '-')}@map-reporting-app`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${name}`,
  ]

  if (location) lines.push(`LOCATION:${location}`)
  if (description) lines.push(`DESCRIPTION:${description}`)

  lines.push('END:VEVENT', 'END:VCALENDAR')

  // The .ics format wants CRLF line endings.
  return lines.join('\r\n')
}

/**
 * Download the .ics file for an event.
 * Returns true when the download started.
 */
export function downloadEventIcs(event) {
  const ics = buildEventIcs(event)
  if (!ics) return false

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  const safeName = String(event.name || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  link.href = url
  link.download = `${safeName || 'event'}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Give the browser a moment to start the download before cleaning up.
  setTimeout(() => URL.revokeObjectURL(url), 1000)

  return true
}
