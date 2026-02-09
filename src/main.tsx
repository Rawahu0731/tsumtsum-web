import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// モバイルでのピンチズーム（拡大縮小）を抑止
const touchHandler = (event: any) => {
  if (event.touches && event.touches.length > 1) {
    event.preventDefault();
  }
};
document.addEventListener('touchstart', touchHandler, { passive: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
