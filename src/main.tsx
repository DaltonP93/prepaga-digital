
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeThemePreference } from './lib/theme';

initializeThemePreference();

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);

// Render with proper React import
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
