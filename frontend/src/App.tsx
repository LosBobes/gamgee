import { useState } from 'react'
import WorkoutTracker from './WorkoutTracker'
import SplashScreen from './components/SplashScreen'
import AdminApp from './admin/AdminApp'

function App() {
  const [showSplash, setShowSplash] = useState(true)

  if (window.location.pathname.startsWith('/admin')) {
    return <AdminApp />
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
