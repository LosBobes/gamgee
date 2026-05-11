import { useState } from 'react'
import WorkoutTracker from './WorkoutTracker'
import SplashScreen from './components/SplashScreen'
import AdminApp from './admin/AdminApp'

function App() {
  const [showSplash, setShowSplash] = useState(true)

  if (window.location.pathname.startsWith('/admin')) {
    return <AdminApp />
  }

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <WorkoutTracker />
    </>
  )
}

export default App
