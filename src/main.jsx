import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext';
import { PusherProvider } from './context/PusherContext';
import { PermissionsProvider } from './context/PermissionsContext';
import { ApiProvider } from './context/ApiContext';


// Unregister any rogue/legacy service workers to prevent cache pollution
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <PermissionsProvider>
        <ApiProvider>
          <PusherProvider>
            <App />
          </PusherProvider>
        </ApiProvider>
      </PermissionsProvider>
    </AuthProvider>
  </StrictMode>,
)
