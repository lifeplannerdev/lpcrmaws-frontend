import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext';
import { PusherProvider } from './context/PusherContext';
import { PermissionsProvider } from './context/PermissionsContext';
import { ApiProvider } from './context/ApiContext';


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
