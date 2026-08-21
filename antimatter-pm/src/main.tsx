import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import './index.css';
import App from './App';
import { useStore } from './store';
import { LogoutOnBackGuard } from './components/auth/LogoutOnBackGuard';

function Root() {
  const theme = useStore(s => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return (
    <>
      <App />
      <LogoutOnBackGuard />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: '12px',
            fontSize: '14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          },
        }}
        richColors
      />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>
);
