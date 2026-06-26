import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/global.css'
import './styles/auth.css'
import App from './App.jsx'
import { syncUserFromUrl } from './context/authStorage.js'

syncUserFromUrl()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)