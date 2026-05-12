import { useState } from 'react'
import WorkoutTracker from './WorkoutTracker'
import SplashScreen from './components/SplashScreen'
import AdminApp from './admin/AdminApp'
import ExerciseGraphicsDemo from './components/exercise/ExerciseGraphicsDemo'
import ExerciseEditor from './components/exercise/ExerciseEditor'

function App() {
  const [showSplash, setShowSplash] = useState(true)

  if (window.location.pathname.startsWith('/admin')) {
    return <AdminApp />
  }

  if (window.location.pathname.startsWith('/exercise-graphics')) {
    return <ExerciseGraphicsDemo />
  }

  if (window.location.pathname.startsWith('/exercise-editor')) {
    return <ExerciseEditor />
  }

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <WorkoutTracker />
    </>
  )
}

export default App
