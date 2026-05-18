import { useState } from 'react'
import WorkoutTracker from './WorkoutTracker'
import SplashScreen from './components/SplashScreen'
import BarWeightQuestion from './components/BarWeightQuestion'
import { ToneProvider } from './context/ToneContext'
import type { ToneMode } from './context/ToneContext'
import AdminApp from './admin/AdminApp'
import ExerciseGraphicsDemo from './components/exercise/ExerciseGraphicsDemo'
import ExerciseEditor from './components/exercise/ExerciseEditor'
import { readCountsBar } from './data/barbell'

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

// Pop the bar-weight joke once, after the splash, on the main app only.
// Module-scope snapshot mirrors the splash logic so StrictMode's dev-only
// double-mount doesn't re-trigger the modal once it's been answered.
const askBarQuestionOnFirstLoad = (() => {
  const altRoute = ['/admin', '/exercise-graphics', '/exercise-editor', '/reset-password', '/verify-email']
    .some(p => window.location.pathname.startsWith(p))
  if (altRoute) return false
  return readCountsBar() === null
})()

function App() {
  const [showSplash, setShowSplash] = useState(splashOnFirstLoad)
  const [showBarQuestion, setShowBarQuestion] = useState(askBarQuestionOnFirstLoad)

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

  // The bar-question modal uses ToneContext for its copy. The main app
  // renders its own ToneProvider downstream, but App.tsx is above that
  // tree, so we read the persisted tone here and wrap the modal in its
  // own provider. Defaults match WorkoutTracker.
  const toneMode = (localStorage.getItem('gamgee_tone') ?? 'pro') as ToneMode

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      {!showSplash && showBarQuestion && (
        <ToneProvider value={toneMode}>
          <BarWeightQuestion onAnswered={() => setShowBarQuestion(false)} />
        </ToneProvider>
      )}
      <WorkoutTracker
        initialAuthView={emailLink?.view}
        initialAuthToken={emailLink?.token}
        forceAuthScreen={!!emailLink}
      />
    </>
  )
}

export default App
