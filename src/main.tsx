import {createRoot} from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';
// import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with automatic background updates
// registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
