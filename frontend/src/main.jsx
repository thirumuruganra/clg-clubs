import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

const syncSystemTheme = () => {
  document.documentElement.classList.toggle('dark', darkQuery.matches)
}

syncSystemTheme()

if (typeof darkQuery.addEventListener === 'function') {
  darkQuery.addEventListener('change', syncSystemTheme)
} else if (typeof darkQuery.addListener === 'function') {
  darkQuery.addListener(syncSystemTheme)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
