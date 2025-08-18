import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './utils/fontawesome';

// Use React.StrictMode conditionally - disable in dev to prevent WebSocket connection doubling
const AppWrapper = import.meta.env.DEV
  ? // In development, skip StrictMode to prevent WebSocket connection issues
    ({ children }: { children: React.ReactNode }) => <>{children}</>
  : // In production, use StrictMode
    React.StrictMode;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppWrapper>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </AppWrapper>,
);
