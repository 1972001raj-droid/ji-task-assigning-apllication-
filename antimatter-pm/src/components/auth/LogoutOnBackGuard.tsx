import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { logout } from '../../lib/logout';
import { ConfirmDialog } from '../common/ConfirmDialog';

const PUBLIC_ROUTES = new Set([
  '/login',
  '/activate',
  '/forgot-password',
  '/reset-password',
]);

/**
 * Keeps a signed-in user in the workspace when Back would leave it.
 * When Back navigates to a public auth route, restore the protected page
 * and prompt the user to confirm logout.
 */
export function LogoutOnBackGuard() {
  const currentUserId = useStore(s => s.currentUserId);
  const navigate = useNavigate();
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const restoringWorkspace = useRef(false);

  useEffect(() => {
    if (!currentUserId) return;

    const handlePopState = () => {
      if (restoringWorkspace.current || !PUBLIC_ROUTES.has(window.location.pathname)) {
        return;
      }

      // A popstate happens after the browser has changed the URL to an auth route.
      // Move forward to restore the protected workspace page first.
      restoringWorkspace.current = true;
      window.history.go(1);
      window.setTimeout(() => {
        restoringWorkspace.current = false;
        setConfirmationOpen(true);
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUserId]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // Replace the protected history entry with /login so Forward cannot restore an authenticated UI
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
      setConfirmationOpen(false);
    }
  };

  return (
    <ConfirmDialog
      open={confirmationOpen}
      title="Log Out of Workspace"
      message="Are you sure you want to log out?"
      confirmLabel={isLoggingOut ? 'Logging out...' : 'Log Out'}
      onConfirm={handleLogout}
      onCancel={() => setConfirmationOpen(false)}
      danger
    />
  );
}

