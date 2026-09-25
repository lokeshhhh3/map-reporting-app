// ---------------------------------------------------------------------------
// constants.js  --  values that many files need.
// Change them here once and the whole website follows.
// ---------------------------------------------------------------------------

// The 5 report types the Backend Team stores.
export const REPORT_TYPES = ['Complaint', 'Incident', 'Announcement', 'Event', 'Other']

// The status values the Backend Team returns.
export const REPORT_STATUSES = ['Unverified', 'In Progress', 'Resolved', 'Verified']

// Emoji used as pin icons (keeps the project simple - no icon library needed).
export const TYPE_ICONS = {
  Complaint: '⚠️',
  Incident: '🚨',
  Announcement: '📢',
  Event: '🎉',
  Other: '📍',
}

// A report that no one has confirmed yet.
export const DEFAULT_STATUS = 'Unverified'

// Main menu, used by the Navbar (and the mobile menu).
export const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/map', label: 'Map' },
  { to: '/reports', label: 'Reports' },
  { to: '/news', label: 'News' },
  { to: '/events', label: 'Events' },
]

// Sample photos are stored as data/images URLs. The Backend Team will replace
// this with Firebase Storage URLs - the frontend code does not change.
export const MAX_PHOTO_MB = 5
