import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ArcPayProvider } from '@arcpay/react-sdk';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ArcPayProvider>
      <App />
    </ArcPayProvider>
  </StrictMode>
);
