import React from 'react'
import { createRoot } from 'react-dom/client'
import { StoreProvider } from './store.jsx'
import { ConfirmProvider } from './components/confirm.jsx'
import App from './App.jsx'
import { AuthGate, AuthProvider } from './auth/AuthContext.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AuthGate>
        <StoreProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </StoreProvider>
      </AuthGate>
    </AuthProvider>
  </React.StrictMode>
)
