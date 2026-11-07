import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          borderRadius: '12px',
          background: '#0f172a',
          color: '#f8fafc',
          fontSize: '14px',
        },
        success: { iconTheme: { primary: '#10b981', secondary: '#f8fafc' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#f8fafc' } },
      }}
    />
  </StrictMode>
);
