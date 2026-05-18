import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// Belt-and-braces orientation lock: the manifest declares portrait-primary, but
// some Android builds still let the PWA flip when the system rotation lock is
// off — or, conversely, miss the manifest hint entirely. The Screen Orientation
// API enforces it at runtime when the page is displayed in a standalone PWA.
const orientation = (screen as Screen & { orientation?: ScreenOrientation }).orientation
if (orientation && typeof (orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock === 'function') {
  (orientation as ScreenOrientation & { lock: (o: string) => Promise<void> })
    .lock('portrait-primary')
    .catch(() => { /* lock() rejects in browser tabs and on iOS; ignore. */ })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
