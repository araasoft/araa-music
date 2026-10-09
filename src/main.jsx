import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { APIProvider } from './context/APIContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { AuthProvider } from './hooks/useAuth.js'
import { PlayerProvider } from './context/PlayerContext.jsx'
import './index.css'

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("SW registered:", reg.scope))
      .catch((err) => console.error("SW registration failed:", err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <div>
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <APIProvider>
            <PlayerProvider>
              <App />
            </PlayerProvider>
          </APIProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </div>
)
