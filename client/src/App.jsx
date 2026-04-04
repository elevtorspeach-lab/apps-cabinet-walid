import { useEffect } from 'react'
import LoginScreen from './components/LoginScreen'
import AppContent from './components/AppContent'
import DossierModal from './components/modals/DossierModal'
import ImportResultModal from './components/modals/ImportResultModal'
import ExportPreviewModal from './components/modals/ExportPreviewModal'
import ImportProgressModal from './components/modals/ImportProgressModal'
import PasswordSetupModal from './components/modals/PasswordSetupModal'

const LEGACY_SCRIPTS = [
  '/legacy/state-persistence.js',
  '/legacy/audience-ui-helpers.js',
  '/legacy/render-audience-suivi.js',
  '/legacy/render-diligence.js',
  '/legacy/render-dashboard.js',
  '/legacy/app.js',
]

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = resolve
    script.onerror = reject
    document.body.appendChild(script)
  })
}

function App() {
  useEffect(() => {
    // Load legacy scripts sequentially after React has rendered the DOM
    let cancelled = false
    ;(async () => {
      for (const src of LEGACY_SCRIPTS) {
        if (cancelled) return
        await loadScript(src)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <LoginScreen />
      <AppContent />
      <DossierModal />
      <ImportResultModal />
      <ExportPreviewModal />
      <ImportProgressModal />
      <PasswordSetupModal />
    </>
  )
}

export default App
