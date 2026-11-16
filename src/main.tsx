import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Privacy } from './components/Privacy';
import { Team } from './components/Team';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {{ '/privacy': <Privacy />, '/team': <Team /> }[location.pathname.replace(/\/$/, '')] ?? <App />}
  </StrictMode>,
);
