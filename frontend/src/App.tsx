import { useState } from 'react'
import WorkoutTracker from './WorkoutTracker'
import SplashScreen from './components/SplashScreen'

function App() {
  const [showSplash, setShowSplash] = useState(true)
  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <WorkoutTracker />
    </>
  )
}

export default App
