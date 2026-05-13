import { useState } from 'react'
import WorkoutTracker from './WorkoutTracker'
import SplashScreen from './components/SplashScreen'
import AdminApp from './admin/AdminApp'
import ExerciseGraphicsDemo from './components/exercise/ExerciseGraphicsDemo'
import ExerciseEditor from './components/exercise/ExerciseEditor'

// Decide once per page load whether the splash should run. sessionStorage
// survives reloads (pull-to-refresh, F5, Ctrl+Shift+R) but is cleared when
// the tab is closed — so the splash plays only on the first visit of a
// browser session. Snapshotting at module scope (rather than inside the
// component) keeps the answer stable across React StrictMode's dev-only
// double-mount.
const SPLASH_KEY = 'gamgee_splash_shown'
const splashOnFirstLoad = (() => {
  const altRoute = ['/admin', '/exercise-graphics', '/exercise-editor']
    .some(p => window.location.pathname.startsWith(p))
  if (altRoute) return false
  if (sessionStorage.getItem(SPLASH_KEY)) return false
  sessionStorage.setItem(SPLASH_KEY, '1')
  return true
})()

function App() {
  const [showSplash, setShowSplash] = useState(splashOnFirstLoad)

  if (window.location.pathname.startsWith('/admin')) {
    return <AdminApp />
  }

  if (window.location.pathname.startsWith('/exercise-graphics')) {
    return <ExerciseGraphicsDemo />
  }

  if (window.location.pathname.startsWith('/exercise-editor')) {
    return <ExerciseEditor />
  }

  // Deep-link from password-reset / email-verification emails.
  const path  = window.location.pathname
  const qp    = new URLSearchParams(window.location.search)
  const token = qp.get('token') ?? undefined
  const emailLink: { view: 'reset' | 'verify'; token?: string } | null =
    path === '/reset-password' ? { view: 'reset',  token } :
    path === '/verify-email'   ? { view: 'verify', token } :
    null

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <WorkoutTracker
        initialAuthView={emailLink?.view}
        initialAuthToken={emailLink?.token}
        forceAuthScreen={!!emailLink}
      />
    </>
  )
}

export default App
