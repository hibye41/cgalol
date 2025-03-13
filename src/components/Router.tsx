import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { checkAuthAtom } from '../lib/auth-store';
import App from '../App';
import TestChatPage from '../pages/TestChatPage';

const Router: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [, checkAuth] = useAtom(checkAuthAtom);

  // Check for auth token on initial load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Simple navigation function
  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Make navigate available globally
  (window as any).navigate = navigate;

  // Simple routing
  switch (currentPath) {
    case '/test-chat':
      return <TestChatPage />;
    default:
      return <App />;
  }
};

export default Router; 