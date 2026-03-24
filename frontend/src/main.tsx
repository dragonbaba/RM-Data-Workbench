import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  import.meta.env.DEV ? (
    <App />
  ) : (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
);
