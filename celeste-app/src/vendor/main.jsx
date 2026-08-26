import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import VendorApp from './VendorApp.jsx'

createRoot(document.getElementById('vendor-root')).render(
  <StrictMode>
    <VendorApp />
  </StrictMode>,
)