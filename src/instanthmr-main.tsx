import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import InstantHMRViewer from './components/InstantHMRViewer'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InstantHMRViewer />
  </StrictMode>,
)
