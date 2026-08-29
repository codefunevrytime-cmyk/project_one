import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/global.css'
import './styles/auth.css'
import App from './App.jsx'

// API sessions use HttpOnly cookies. Keep credentials on every same-app request
// so tokens never need to be exposed to component code or localStorage.
const nativeFetch = window.fetch.bind(window)
window.fetch = (input, init = {}) => nativeFetch(input, { ...init, credentials: init.credentials ?? 'include' })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)