import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Privacy } from './components/Privacy';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {location.pathname.replace(/\/$/, '') === '/privacy' ? <Privacy /> : <App />}
  </StrictMode>,
);
