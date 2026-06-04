import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext';
import { PusherProvider } from './context/PusherContext';
import { PermissionsProvider } from './context/PermissionsContext';


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <PermissionsProvider>
        <PusherProvider>
          <App />
        </PusherProvider>
      </PermissionsProvider>
    </AuthProvider>
  </StrictMode>,
)
