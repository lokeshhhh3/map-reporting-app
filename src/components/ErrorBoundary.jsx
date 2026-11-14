/* ===========================================================================
 * ErrorBoundary.jsx  --  stops one broken part from blanking the whole page.
 *
 * WHAT HAPPENS WITHOUT IT
 *   If any component throws while it is drawing, React takes the whole page
 *   away and you get a white screen with no explanation. That is exactly
 *   what happened once when the map was given the wrong kind of padding.
 *
 * WHAT THIS DOES
 *   It catches the mistake and shows a friendly message with a Reload
 *   button, so the page is never blank and you can always get back to work.
 *
 * It is a "class" component because React only lets class components catch
 * errors this way.
 * =========================================================================== */

import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  // React calls this when a child throws.
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Something went wrong on this page.',
    }
  }

  // This one is only for the browser console, so you can see what happened.
  componentDidCatch(error, info) {
    console.error('The page ran into a problem:', error, info?.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-error">
          <h2>😕 This part of the page ran into a problem</h2>
          <p>
            Nothing is lost — your reports and events are safe in the database.
            Just press the button to reload and try again.
          </p>
          <p className="page-error__detail">{this.state.message}</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => window.location.reload()}
          >
            Reload the page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
