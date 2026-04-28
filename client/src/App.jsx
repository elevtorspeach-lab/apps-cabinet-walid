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

const LEGACY_LOADER_PROMISE_KEY = '__cabinetLegacyScriptsPromise'
const LEGACY_LOADER_DONE_KEY = '__cabinetLegacyScriptsLoaded'

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-legacy-src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.dataset.legacySrc = src
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      resolve()
    }, { once: true })
    script.addEventListener('error', reject, { once: true })
    document.body.appendChild(script)
  })
}

function ensureLegacyScriptsLoaded() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window[LEGACY_LOADER_DONE_KEY] === true) {
    return Promise.resolve()
  }
  if (window[LEGACY_LOADER_PROMISE_KEY]) {
    return window[LEGACY_LOADER_PROMISE_KEY]
  }
  window[LEGACY_LOADER_PROMISE_KEY] = (async () => {
    for (const src of LEGACY_SCRIPTS) {
      await loadScript(src)
    }
    window[LEGACY_LOADER_DONE_KEY] = true
  })()
    .catch((error) => {
      window[LEGACY_LOADER_PROMISE_KEY] = null
      throw error
    })
  return window[LEGACY_LOADER_PROMISE_KEY]
}

function App() {
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await ensureLegacyScriptsLoaded()
      } catch (error) {
        if (!cancelled) {
          console.error('Echec du chargement legacy', error)
        }
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
